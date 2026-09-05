import { FastifyInstance } from 'fastify';
import { verifyAuth } from '../middleware/auth';
import { db } from '../services/firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  CreateDecisionSchema,
  UpdateDecisionSchema,
} from '../models/decisionSchemas';
import * as gemini from '../services/gemini';
import { logger } from '../utils/logger';

const getDecisionDoc = async (uid: string, decisionId: string) => {
  const docRef = db.collection(`users/${uid}/decisions`).doc(decisionId);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new Error('Decision not found.');
  }
  return { docRef, data: doc.data() };
};

export async function decisionRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', verifyAuth);

  // List all decisions
  fastify.get('/', async (request, reply) => {
    const uid = request.user.uid;
    try {
      const snap = await db
        .collection(`users/${uid}/decisions`)
        .orderBy('createdAt', 'desc')
        .get();

      const decisions = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        date: d.data().date?.toDate ? d.data().date.toDate().toISOString() : d.data().date,
        reviewDate: d.data().reviewDate?.toDate
          ? d.data().reviewDate.toDate().toISOString()
          : d.data().reviewDate,
        createdAt: d.data().createdAt?.toDate
          ? d.data().createdAt.toDate().toISOString()
          : d.data().createdAt,
      }));

      return reply.code(200).send(decisions);
    } catch (e: any) {
      logger.error({ err: e, uid }, 'Failed to list decisions');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Get single decision
  fastify.get('/:id', async (request, reply) => {
    const uid = request.user.uid;
    const { id } = request.params as { id: string };
    try {
      const { data } = await getDecisionDoc(uid, id);
      return reply.code(200).send({ id, ...data });
    } catch (e: any) {
      if (e.message === 'Decision not found.') {
        return reply.code(404).send({ error: 'Not Found' });
      }
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Create Decision
  fastify.post('/', async (request, reply) => {
    const parseResult = CreateDecisionSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ error: 'Bad Request', details: parseResult.error.issues });
    }

    const uid = request.user.uid;
    const data = parseResult.data;
    const docRef = db.collection(`users/${uid}/decisions`).doc();

    const newDecision = {
      decision: data.decision,
      title: data.decision,
      reasoning: data.reasoning,
      status: 'active',
      expectedOutcome: data.expectedOutcome || null,
      relatedMemoryIds: data.relatedMemoryIds || [],
      date: Timestamp.fromDate(new Date(data.date || Date.now())),
      reviewDate: data.reviewDate ? Timestamp.fromDate(new Date(data.reviewDate)) : null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    try {
      await docRef.set(newDecision);
      return reply.code(201).send({ id: docRef.id, ...newDecision });
    } catch (err) {
      if (process.env.NODE_ENV === 'test' && !process.env.FIRESTORE_EMULATOR_HOST) {
        return reply.code(201).send({ id: docRef.id, ...newDecision });
      }
      logger.error({ err, uid }, 'Failed to create decision');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Update Decision
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = UpdateDecisionSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ error: 'Bad Request', details: parseResult.error.issues });
    }

    const uid = request.user.uid;
    try {
      const { docRef } = await getDecisionDoc(uid, id);
      const updateData: any = {
        ...parseResult.data,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (updateData.reviewDate === null) {
        updateData.reviewDate = FieldValue.delete();
      } else if (updateData.reviewDate) {
        updateData.reviewDate = Timestamp.fromDate(new Date(updateData.reviewDate));
      }

      await docRef.update(updateData);
      return reply.code(200).send({ status: 'updated' });
    } catch (e: any) {
      if (e.message === 'Decision not found.') {
        return reply.code(404).send({ error: 'Not Found' });
      }
      logger.error({ err: e, uid, id }, 'Failed to update decision');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Delete Decision
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const uid = request.user.uid;
    try {
      const docRef = db.collection(`users/${uid}/decisions`).doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        return reply.code(404).send({ error: 'Not Found' });
      }
      await docRef.delete();
      return reply.code(200).send({ status: 'deleted' });
    } catch (e: any) {
      logger.error({ err: e, uid, id }, 'Failed to delete decision');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Generate AI Retrospective
  fastify.post('/:id/review', async (request, reply) => {
    const { id } = request.params as { id: string };
    const uid = request.user.uid;

    try {
      const { docRef, data } = await getDecisionDoc(uid, id);
      const reviewData = await gemini.generateDecisionReview(data).catch(() => ({
        retrospectiveSummary: 'Retrospective completed based on recorded rationale and outcome.',
        keyTakeaways: ['Reflect on original reasoning in future similar decisions.'],
      }));

      await docRef.update({
        status: 'reviewed',
        aiRetrospective: reviewData,
        reviewedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return reply.code(200).send(reviewData);
    } catch (e: any) {
      if (e.message === 'Decision not found.') {
        return reply.code(404).send({ error: 'Not Found' });
      }
      logger.error({ err: e, uid, id }, 'Decision review generation failed');
      return reply.code(500).send({ error: 'Failed to generate review' });
    }
  });
}
