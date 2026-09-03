import { db } from './firebaseAdmin';

export interface ContextItem {
  id: string;
  type: 'memory' | 'goal' | 'decision' | 'journal_summary';
  content: string;
  createdAt: string;
  meta?: any;
}

const formatDocs = (
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
  type: ContextItem['type']
): ContextItem[] => {
  return docs.map((doc) => {
    const data = doc.data();
    let content = '';
    let meta: any = {};

    switch (type) {
      case 'memory':
        content = data.content || data.fact || '';
        meta = { title: data.title, category: data.type };
        break;
      case 'goal':
        content = `${data.title}: ${data.description || ''}`;
        meta = { status: data.status, priority: data.priority };
        break;
      case 'decision':
        content = `Decision: ${data.decision || data.title}. Reasoning: ${data.reasoning || ''}`;
        meta = { status: data.status };
        break;
      case 'journal_summary':
        content = data.conciseSummary || data.content || '';
        meta = { date: data.date };
        break;
    }

    return {
      id: doc.id,
      type,
      content,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      meta,
    };
  });
};

export const getUserContext = async (uid: string, limitPerType = 15): Promise<ContextItem[]> => {
  const userRef = db.collection('users').doc(uid);

  try {
    const [memoriesSnap, goalsSnap, decisionsSnap, journalsSnap] = await Promise.all([
      userRef.collection('memories').orderBy('createdAt', 'desc').limit(limitPerType).get(),
      userRef.collection('goals').orderBy('createdAt', 'desc').limit(limitPerType).get(),
      userRef.collection('decisions').orderBy('createdAt', 'desc').limit(limitPerType).get(),
      userRef.collection('journals').orderBy('createdAt', 'desc').limit(limitPerType).get(),
    ]);

    return [
      ...formatDocs(memoriesSnap.docs, 'memory'),
      ...formatDocs(goalsSnap.docs, 'goal'),
      ...formatDocs(decisionsSnap.docs, 'decision'),
      ...formatDocs(journalsSnap.docs, 'journal_summary'),
    ];
  } catch (error) {
    // If collections don't exist yet or index is building, return graceful empty array
    return [];
  }
};
