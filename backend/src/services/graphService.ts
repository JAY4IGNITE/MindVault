import { db } from './firebaseAdmin';
import * as admin from 'firebase-admin';

export interface GraphNode {
  id: string;
  label: string;
  type: 'memory' | 'idea' | 'goal' | 'decision' | 'topic' | 'project';
  group: number;
  val: number;
  data: any;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const getDateFromDaysAgo = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const getTypeGroup = (type: string): number => {
  switch (type) {
    case 'memory':
      return 1; // Sky/Blue
    case 'idea':
      return 2; // Purple
    case 'goal':
      return 3; // Emerald/Green
    case 'decision':
      return 4; // Red/Rose
    case 'topic':
      return 5; // Amber/Orange
    case 'project':
      return 6; // Cyan
    default:
      return 0; // Slate
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
    const [memoriesSnap, goalsSnap, decisionsSnap] = await Promise.all([
      userRef.collection('memories').where('createdAt', '>=', filterTimestamp).get(),
      userRef.collection('goals').where('createdAt', '>=', filterTimestamp).get(),
      userRef.collection('decisions').where('createdAt', '>=', filterTimestamp).get(),
    ]);

    memoriesSnap.forEach((doc) => {
      const data = doc.data();
      const type = data.type === 'idea' ? 'idea' : 'memory';
      nodes.push({
        id: doc.id,
        label: data.title || (data.content || data.fact || '').substring(0, 30) + '...',
        type,
        group: getTypeGroup(type),
        val: data.importance || 5,
        data: { ...data, id: doc.id, entityType: type },
      });
      nodeIds.add(doc.id);
    });

    goalsSnap.forEach((doc) => {
      const data = doc.data();
      nodes.push({
        id: doc.id,
        label: data.title || 'Goal',
        type: 'goal',
        group: getTypeGroup('goal'),
        val: data.priority === 'high' ? 8 : data.priority === 'low' ? 4 : 6,
        data: { ...data, id: doc.id, entityType: 'goal' },
      });
      nodeIds.add(doc.id);
    });

    decisionsSnap.forEach((doc) => {
      const data = doc.data();
      nodes.push({
        id: doc.id,
        label: (data.decision || data.title || '').substring(0, 30) + '...',
        type: 'decision',
        group: getTypeGroup('decision'),
        val: 7,
        data: { ...data, id: doc.id, entityType: 'decision' },
      });
      nodeIds.add(doc.id);
    });

    const relationshipsSnap = await userRef
      .collection('relationships')
      .where('createdAt', '>=', filterTimestamp)
      .get();

    relationshipsSnap.forEach((doc) => {
      const data = doc.data();
      if (nodeIds.has(data.sourceId) && nodeIds.has(data.targetId)) {
        edges.push({
          source: data.sourceId,
          target: data.targetId,
          type: data.type || 'related_to',
        });
      }
    });
  } catch (error) {
    // If no collections created yet, return empty graph
  }

  return { nodes, edges };
};
