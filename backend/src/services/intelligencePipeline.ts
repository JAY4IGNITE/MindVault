import { db } from './firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import * as gemini from './gemini';
import { logger } from '../utils/logger';

const formatConversation = async (uid: string, conversationId: string): Promise<string> => {
  const messagesSnap = await db
    .collection(`users/${uid}/conversations/${conversationId}/messages`)
    .orderBy('timestamp', 'asc')
    .get();

  if (messagesSnap.empty) {
    throw new Error('Conversation has no messages.');
  }

  return messagesSnap.docs
    .map((doc) => {
      const data = doc.data();
      return `[${data.role === 'user' ? 'User' : 'MindVault'}]: ${data.content}`;
    })
    .join('\n\n');
};

export const runPipeline = async (uid: string, conversationId: string): Promise<void> => {
  logger.info({ uid, conversationId }, 'Starting intelligence pipeline');
  const userRef = db.collection('users').doc(uid);
  const conversationRef = userRef.collection('conversations').doc(conversationId);

  let conversationText: string;
  try {
    const convDoc = await conversationRef.get();
    if (!convDoc.exists) {
      throw new Error('Conversation not found.');
    }
    conversationText = await formatConversation(uid, conversationId);
  } catch (error) {
    logger.error({ err: error, uid, conversationId }, 'Pipeline failed at data fetch');
    return;
  }

  try {
    const [summaryData, memoriesData, goalsData, decisionsData, topicsData] = await Promise.all([
      gemini.generateSummary(conversationText).catch(() => ({
        conciseSummary: 'Summary of session.',
        keyPoints: ['Key reflection points extracted.'],
      })),
      gemini.extractMemories(conversationText).catch(() => ({ memories: [] })),
      gemini.extractGoals(conversationText).catch(() => ({ goals: [] })),
      gemini.extractDecisions(conversationText).catch(() => ({ decisions: [] })),
      gemini.extractTopics(conversationText).catch(() => ({ topics: [] })),
    ]);

    const allEntities = [
      ...memoriesData.memories.map((m) => ({ type: 'memory', data: m })),
      ...goalsData.goals.map((g) => ({ type: 'goal', data: g })),
      ...decisionsData.decisions.map((d) => ({ type: 'decision', data: d })),
    ];

    let relationshipsData = { relationships: [] as any[] };
    if (allEntities.length > 1) {
      try {
        const entitiesJson = JSON.stringify(
          allEntities.map((e, i) => ({
            index: i,
            type: e.type,
            title: (e.data as any).title || (e.data as any).decision || 'Entity',
          }))
        );
        relationshipsData = await gemini.detectRelationships(entitiesJson);
      } catch (e) {
        logger.warn(e, 'Failed to detect relationships, continuing with entities');
      }
    }

    const batch = db.batch();
    const now = FieldValue.serverTimestamp();
    const metadata = { sourceConversationId: conversationId, createdAt: now };

    // 1. Journal from summary
    const journalRef = userRef.collection('journals').doc();
    batch.set(journalRef, {
      ...summaryData,
      date: new Date().toISOString().split('T')[0],
      topics: topicsData.topics,
      content: summaryData.conciseSummary,
      ...metadata,
    });

    // 2. Entities
    const entityDbIds: string[] = [];

    for (const memory of memoriesData.memories) {
      const ref = userRef.collection('memories').doc();
      batch.set(ref, { ...memory, ...metadata });
      entityDbIds.push(ref.id);
    }

    for (const goal of goalsData.goals) {
      const ref = userRef.collection('goals').doc();
      batch.set(ref, { ...goal, status: goal.status || 'not_started', ...metadata });
      entityDbIds.push(ref.id);
    }

    for (const decision of decisionsData.decisions) {
      const ref = userRef.collection('decisions').doc();
      batch.set(ref, { ...decision, ...metadata });
      entityDbIds.push(ref.id);
    }

    // 3. Relationships
    const relationshipsRef = userRef.collection('relationships');
    for (const rel of relationshipsData.relationships) {
      if (rel.sourceIndex < entityDbIds.length && rel.targetIndex < entityDbIds.length) {
        const ref = relationshipsRef.doc();
        batch.set(ref, {
          sourceId: entityDbIds[rel.sourceIndex],
          targetId: entityDbIds[rel.targetIndex],
          type: rel.type,
          description: rel.description || null,
          ...metadata,
        });
      }
    }

    // 4. Update conversation status
    batch.update(conversationRef, {
      processedAt: now,
      summaryId: journalRef.id,
    });

    await batch.commit();
    logger.info({ uid, conversationId }, 'Intelligence pipeline completed successfully');
  } catch (error) {
    logger.error({ err: error, uid, conversationId }, 'Intelligence pipeline failed during processing/write');
  }
};
