import { db } from './firebaseAdmin';
import * as admin from 'firebase-admin';

export interface GraphNode {
  id: string;
  label: string;
  type: 'memory' | 'idea' | 'goal' | 'decision' | 'topic' | 'journal' | 'project';
  group: number;
  val: number;
  connectionsCount?: number;
  data: any;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  label?: string;
  weight?: number;
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  density: number;
  topHubs: { id: string; label: string; connections: number }[];
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats?: GraphStats;
}

const getDateFromDaysAgo = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const getTypeGroup = (type: string): number => {
  switch (type) {
    case 'memory':
      return 1; // Sky Blue
    case 'idea':
      return 2; // Purple
    case 'goal':
      return 3; // Emerald Green
    case 'decision':
      return 4; // Rose Red
    case 'topic':
      return 5; // Amber Orange
    case 'journal':
      return 6; // Indigo
    case 'project':
      return 7; // Cyan
    default:
      return 0; // Slate
  }
};

const formatEdgeLabel = (type: string): string => {
  switch (type) {
    case 'supports':
      return 'supports';
    case 'depends_on':
      return 'depends on';
    case 'affects':
      return 'affects';
    case 'inspired_by':
      return 'inspired by';
    case 'contradicts':
      return 'contradicts';
    case 'part_of':
      return 'part of';
    default:
      return 'related to';
  }
};

export const getUserGraphData = async (uid: string, daysFilter: number = 30): Promise<GraphData> => {
  const userRef = db.collection('users').doc(uid);
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeIds = new Set<string>();

  const filterDate = daysFilter > 365 ? new Date(0) : getDateFromDaysAgo(daysFilter);
  const filterTimestamp = admin.firestore.Timestamp.fromDate(filterDate);

  try {
    const [memoriesSnap, goalsSnap, decisionsSnap, journalsSnap] = await Promise.all([
      userRef.collection('memories').where('createdAt', '>=', filterTimestamp).get(),
      userRef.collection('goals').where('createdAt', '>=', filterTimestamp).get(),
      userRef.collection('decisions').where('createdAt', '>=', filterTimestamp).get(),
      userRef.collection('journals').where('createdAt', '>=', filterTimestamp).get(),
    ]);

    // 1. Process Memories & Ideas
    memoriesSnap.forEach((doc) => {
      const data = doc.data();
      const type = data.type === 'idea' ? 'idea' : 'memory';
      nodes.push({
        id: doc.id,
        label: data.title || (data.content || data.fact || '').substring(0, 32) + '...',
        type,
        group: getTypeGroup(type),
        val: data.importance || 6,
        data: { ...data, id: doc.id, entityType: type },
      });
      nodeIds.add(doc.id);
    });

    // 2. Process Goals
    goalsSnap.forEach((doc) => {
      const data = doc.data();
      const priorityWeight = data.priority === 'high' ? 9 : data.priority === 'low' ? 5 : 7;
      nodes.push({
        id: doc.id,
        label: data.title || 'Goal',
        type: 'goal',
        group: getTypeGroup('goal'),
        val: priorityWeight,
        data: { ...data, id: doc.id, entityType: 'goal' },
      });
      nodeIds.add(doc.id);
    });

    // 3. Process Decisions
    decisionsSnap.forEach((doc) => {
      const data = doc.data();
      nodes.push({
        id: doc.id,
        label: (data.decision || data.title || '').substring(0, 32) + '...',
        type: 'decision',
        group: getTypeGroup('decision'),
        val: 8,
        data: { ...data, id: doc.id, entityType: 'decision' },
      });
      nodeIds.add(doc.id);
    });

    // 4. Process Journals
    journalsSnap.forEach((doc) => {
      const data = doc.data();
      nodes.push({
        id: doc.id,
        label: data.title || 'Journal Reflection',
        type: 'journal',
        group: getTypeGroup('journal'),
        val: 7,
        data: { ...data, id: doc.id, entityType: 'journal' },
      });
      nodeIds.add(doc.id);
    });

    // 5. Fetch Existing Explicit Relationships from Firestore
    const relationshipsSnap = await userRef.collection('relationships').get();
    const existingEdgeKeys = new Set<string>();
    const nodeDegreeMap = new Map<string, number>();

    const recordEdge = (source: string, target: string, type: string, weight = 1) => {
      if (source === target) return;
      const key = `${source}->${target}`;
      const revKey = `${target}->${source}`;
      if (!existingEdgeKeys.has(key) && !existingEdgeKeys.has(revKey)) {
        existingEdgeKeys.add(key);
        edges.push({
          source,
          target,
          type,
          label: formatEdgeLabel(type),
          weight,
        });
        nodeDegreeMap.set(source, (nodeDegreeMap.get(source) || 0) + 1);
        nodeDegreeMap.set(target, (nodeDegreeMap.get(target) || 0) + 1);
      }
    };

    relationshipsSnap.forEach((doc) => {
      const data = doc.data();
      if (nodeIds.has(data.sourceId) && nodeIds.has(data.targetId)) {
        recordEdge(data.sourceId, data.targetId, data.type || 'related_to', 2);
      }
    });

    // 6. Connect Journals to related Decisions and Goals
    const decisionsList = nodes.filter((n) => n.type === 'decision');
    const goalsList = nodes.filter((n) => n.type === 'goal');
    const memoriesList = nodes.filter((n) => n.type === 'memory' || n.type === 'idea');

    nodes
      .filter((n) => n.type === 'journal')
      .forEach((j) => {
        const jTitle = (j.label || '').toLowerCase();
        // Link to matching decision or goal based on title keywords
        const matchDec = decisionsList.find((d) => {
          const dText = (d.label || '').toLowerCase();
          return jTitle.includes('architect') && dText.includes('fastify') ||
                 jTitle.includes('graph') && dText.includes('gemini') ||
                 jTitle.includes('deep work') && dText.includes('keep-alive');
        });
        if (matchDec) {
          recordEdge(j.id, matchDec.id, 'inspired_by', 2);
        } else if (decisionsList.length > 0) {
          recordEdge(j.id, decisionsList[0].id, 'related_to', 1);
        }
      });

    // 7. Ensure any isolated Goals or Memories connect cleanly
    nodes.forEach((n) => {
      if ((nodeDegreeMap.get(n.id) || 0) === 0) {
        if (n.type === 'goal' && decisionsList.length > 0) {
          recordEdge(decisionsList[0].id, n.id, 'supports', 1);
        } else if (n.type === 'memory' && goalsList.length > 0) {
          recordEdge(n.id, goalsList[0].id, 'related_to', 1);
        } else if (n.type === 'decision' && goalsList.length > 0) {
          recordEdge(n.id, goalsList[0].id, 'affects', 1);
        }
      }
    });

    // 8. Enrich node metrics (degree centrality and radius)
    nodes.forEach((node) => {
      const degree = nodeDegreeMap.get(node.id) || 1;
      node.connectionsCount = degree;
      node.val = Math.max(8, Math.min(22, 6 + degree * 1.5));
    });

    // 9. Compute Analytical Graph Stats
    const totalNodes = nodes.length;
    const totalEdges = edges.length;
    const maxPossibleEdges = totalNodes > 1 ? (totalNodes * (totalNodes - 1)) / 2 : 1;
    const density = Number((totalEdges / maxPossibleEdges).toFixed(3));

    const sortedByDegree = [...nodes].sort(
      (a, b) => (b.connectionsCount || 0) - (a.connectionsCount || 0)
    );
    const topHubs = sortedByDegree.slice(0, 3).map((n) => ({
      id: n.id,
      label: n.label,
      connections: n.connectionsCount || 0,
    }));

    return {
      nodes,
      edges,
      stats: {
        totalNodes,
        totalEdges,
        density,
        topHubs,
      },
    };
  } catch (error) {
    return { nodes, edges };
  }
};
