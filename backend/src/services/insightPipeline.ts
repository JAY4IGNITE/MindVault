import { db } from './firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as gemini from './gemini';
import { logger } from '../utils/logger';

const getDateDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

export const runInsightPipeline = async (uid: string): Promise<void> => {
  logger.info({ uid }, 'Starting longitudinal insight pipeline');
  const userRef = db.collection('users').doc(uid);

  const lookbackDays = 60;
  const cutoffDate = Timestamp.fromDate(getDateDaysAgo(lookbackDays));

  try {
    const memoriesSnap = await userRef
      .collection('memories')
      .where('createdAt', '>=', cutoffDate)
      .orderBy('createdAt', 'desc')
      .get();

    if (memoriesSnap.size < 2) {
      logger.info({ uid, count: memoriesSnap.size }, 'Not enough memories to generate insights (minimum 2 needed)');
      return;
    }

    const memories = memoriesSnap.docs.map((doc) => ({
      id: doc.id,
      content: doc.data().title ? `${doc.data().title}: ${doc.data().content || doc.data().fact}` : (doc.data().content || doc.data().fact),
      createdAt: doc.data().createdAt as Timestamp,
    }));

    const memoriesJson = JSON.stringify(memories.map((m) => ({ id: m.id, content: m.content })));
    const groupingResult = await gemini.groupMemoriesByTheme(memoriesJson);

    const topTheme = groupingResult.themes[0];
    if (!topTheme) {
      logger.info({ uid }, 'No recurring theme detected.');
      return;
    }

    const supportingMemories = memories.filter((m) => topTheme.memoryIds.includes(m.id));
    const supportingText = supportingMemories
      .map(
        (m) =>
          `- [${m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString() : 'recent'}] ${m.content}`
      )
      .join('\n');

    const insightData = await gemini.generateThemeInsight(topTheme.theme, supportingText);

    const insightId = `theme_${topTheme.theme.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30)}`;
    const insightRef = userRef.collection('insights').doc(insightId);

    await insightRef.set({
      type: 'recurring_theme',
      theme: topTheme.theme,
      frequency: topTheme.frequency,
      supportingMemoryIds: topTheme.memoryIds,
      timeRange: 'Past 60 days',
      ...insightData,
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info({ uid, insightId, theme: topTheme.theme }, 'Saved longitudinal insight successfully');
  } catch (error) {
    logger.error({ err: error, uid }, 'Longitudinal insight pipeline failed');
  }
};
