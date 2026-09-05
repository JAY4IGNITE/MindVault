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

    // 4. Process Journals & Extract Topic Hubs
    const topicMap = new Map<string, string[]>(); // topicName -> array of entityIds

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

      if (Array.isArray(data.topics)) {
        data.topics.forEach((t: string) => {
          const clean = t.trim();
          if (clean) {
            const list = topicMap.get(clean) || [];
            list.push(doc.id);
            topicMap.set(clean, list);
          }
        });
      }
    });

    // 5. Add Prominent Topic Hubs as connective tissue
    for (const [topicName, linkedEntityIds] of topicMap.entries()) {
      if (linkedEntityIds.length >= 1) {
        const topicNodeId = `topic_${topicName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        if (!nodeIds.has(topicNodeId)) {
          nodes.push({
            id: topicNodeId,
            label: topicName,
            type: 'topic',
            group: getTypeGroup('topic'),
            val: 7,
            data: { title: topicName, id: topicNodeId, entityType: 'topic' },
          });
          nodeIds.add(topicNodeId);
        }

        // Link topic to each journal that discusses it
        linkedEntityIds.forEach((jId) => {
          edges.push({
            source: jId,
            target: topicNodeId,
            type: 'part_of',
            label: 'part of',
            weight: 2,
          });
        });
      }
    }

    // 6. Fetch Existing Explicit Relationships from Firestore
    const relationshipsSnap = await userRef.collection('relationships').get();
    const existingEdgeKeys = new Set<string>();
    const nodeDegreeMap = new Map<string, number>();

    const recordEdge = (source: string, target: string, type: string, weight = 1) => {
      const key = `${source}->${target}`;
      if (!existingEdgeKeys.has(key)) {
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

    // 7. Intelligent Associative Bridging: Connect any isolated nodes to anchor hubs
    const anchorNodes = nodes.filter((n) => (nodeDegreeMap.get(n.id) || 0) > 0);
    const orphanNodes = nodes.filter((n) => (nodeDegreeMap.get(n.id) || 0) === 0);

    orphanNodes.forEach((orphan) => {
      if (orphan.type === 'goal') {
        // Connect goal to a relevant decision or memory
        const match =
          nodes.find((n) => n.type === 'decision' && n.id !== orphan.id) ||
          nodes.find((n) => n.type === 'topic' && n.id !== orphan.id) ||
          anchorNodes[0];
        if (match) recordEdge(orphan.id, match.id, 'supports', 1);
      } else if (orphan.type === 'decision') {
        // Connect decision to a relevant goal or memory
        const match =
          nodes.find((n) => n.type === 'goal' && n.id !== orphan.id) ||
          nodes.find((n) => n.type === 'memory' && n.id !== orphan.id) ||
          anchorNodes[0];
        if (match) recordEdge(orphan.id, match.id, 'affects', 1);
      } else if (orphan.type === 'memory' || orphan.type === 'idea') {
        // Connect memory to a decision or topic
        const match =
          nodes.find((n) => n.type === 'decision' && n.id !== orphan.id) ||
          nodes.find((n) => n.type === 'topic' && n.id !== orphan.id) ||
          anchorNodes[0];
        if (match) recordEdge(orphan.id, match.id, 'related_to', 1);
      } else if (orphan.type === 'journal') {
        const match =
          nodes.find((n) => n.type === 'topic' && n.id !== orphan.id) ||
          nodes.find((n) => n.type === 'memory' && n.id !== orphan.id) ||
          anchorNodes[0];
        if (match) recordEdge(orphan.id, match.id, 'inspired_by', 1);
      }
    });

    // 8. Enrich node metrics (degree centrality and radius)
    nodes.forEach((node) => {
      const degree = nodeDegreeMap.get(node.id) || 1;
      node.connectionsCount = degree;
      // Scale radius by centrality
      node.val = Math.max(7, Math.min(24, (node.val || 5) + degree * 0.8));
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
