import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { verifyAuth } from '../middleware/auth';
import { db } from '../services/firebaseAdmin';
import * as geminiService from '../services/gemini';
import { FieldValue } from 'firebase-admin/firestore';
import { Content } from '@google/generative-ai';
import { logger } from '../utils/logger';
import { redisService } from '../services/redisService';

const chatMessageSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.string().optional(),
});

export async function chatRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/message',
    {
      preHandler: verifyAuth,
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
          keyGenerator: (request: FastifyRequest) => request.user?.uid || request.ip,
        },
      },
    },
    async (request, reply) => {
      const parseResult = chatMessageSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          details: parseResult.error.issues,
        });
      }

      const { message: userMessageContent, conversationId: requestedConvId } = parseResult.data;
      const uid = request.user.uid;
      const userDocRef = db.collection('users').doc(uid);

      let conversationId = requestedConvId;
      let conversationRef;

      try {
        let history: Content[] | null = null;
        const cacheKey = conversationId ? `chat:${uid}:${conversationId}:history` : null;

        if (conversationId) {
          conversationRef = userDocRef.collection('conversations').doc(conversationId);

          // Fast path: Load conversation history from Redis cache (<5ms)
          if (cacheKey) {
            history = await redisService.get<Content[]>(cacheKey);
          }

          if (!history) {
            const convDoc = await conversationRef.get();
            if (!convDoc.exists) {
              return reply.code(404).send({
                error: 'Not Found',
                message: 'Conversation not found.',
              });
            }

            const messagesSnapshot = await conversationRef
              .collection('messages')
              .orderBy('timestamp', 'desc')
              .limit(20)
              .get();

            history = messagesSnapshot.docs
              .reverse()
              .map((doc) => {
                const data = doc.data();
                return {
                  role: data.role === 'model' ? 'model' : 'user',
                  parts: [{ text: data.content }],
                };
              });

            if (cacheKey) {
              await redisService.set(cacheKey, history, 3600);
            }
          }
        } else {
          conversationRef = userDocRef.collection('conversations').doc();
          conversationId = conversationRef.id;
          history = [];
          await conversationRef.set({
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            topic: userMessageContent.substring(0, 47) + '...',
          });
        }

        const modelResponseContent = await geminiService.generateChatResponse(
          history || [],
          userMessageContent
        );

        // Update Redis cache with the latest turn to accelerate follow-up messages
        const updatedHistory: Content[] = [
          ...(history || []),
          { role: 'user', parts: [{ text: userMessageContent }] },
          { role: 'model', parts: [{ text: modelResponseContent }] },
        ].slice(-20);

        const updatedCacheKey = `chat:${uid}:${conversationId}:history`;
        await redisService.set(updatedCacheKey, updatedHistory, 3600);

        // Persist to Firestore in batch
        const batch = db.batch();
        const messagesRef = conversationRef.collection('messages');

        const userMsgRef = messagesRef.doc();
        batch.set(userMsgRef, {
          role: 'user',
          content: userMessageContent,
          timestamp: FieldValue.serverTimestamp(),
        });

        const modelMsgRef = messagesRef.doc();
        batch.set(modelMsgRef, {
          role: 'model',
          content: modelResponseContent,
          timestamp: FieldValue.serverTimestamp(),
        });

        batch.update(conversationRef, {
          updatedAt: FieldValue.serverTimestamp(),
        });

        await batch.commit();

        return reply.code(200).send({
          conversationId,
          messageId: modelMsgRef.id,
          content: modelResponseContent,
        });
      } catch (error: any) {
        logger.error({ err: error, uid }, 'Chat route error');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: error.message || 'An unexpected error occurred during the AI request.',
        });
      }
    }
  );
}
