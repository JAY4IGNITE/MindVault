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
      const isNew = !requestedConvId;
      const conversationRef = requestedConvId
        ? userDocRef.collection('conversations').doc(requestedConvId)
        : userDocRef.collection('conversations').doc();
      const conversationId = conversationRef.id;

      try {
        let history: Content[] | null = null;
        const cacheKey = requestedConvId ? `chat:${uid}:${requestedConvId}:history` : null;

        if (requestedConvId) {
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
          history = [];
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

        // Persist conversation and messages to Firestore in single atomic batch
        const batch = db.batch();
        if (isNew) {
          batch.set(conversationRef, {
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            topic: userMessageContent.substring(0, 47) + '...',
          });
        } else {
          batch.update(conversationRef, {
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

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

  // List all conversations for the authenticated user
  fastify.get(
    '/conversations',
    {
      preHandler: verifyAuth,
    },
    async (request, reply) => {
      const uid = request.user.uid;
      try {
        const snap = await db
          .collection('users')
          .doc(uid)
          .collection('conversations')
          .orderBy('updatedAt', 'desc')
          .limit(50)
          .get();

        const conversations = snap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            topic: data.topic || 'Untitled Conversation',
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
          };
        });

        return reply.code(200).send(conversations);
      } catch (error: any) {
        logger.error({ err: error, uid }, 'Failed to fetch conversations');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to retrieve conversation history.',
        });
      }
    }
  );

  // Get all messages for a specific conversation
  fastify.get(
    '/conversations/:id/messages',
    {
      preHandler: verifyAuth,
    },
    async (request, reply) => {
      const uid = request.user.uid;
      const { id } = request.params as { id: string };

      try {
        const convDoc = await db
          .collection('users')
          .doc(uid)
          .collection('conversations')
          .doc(id)
          .get();

        if (!convDoc.exists) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Conversation not found.',
          });
        }

        const messagesSnap = await convDoc.ref
          .collection('messages')
          .orderBy('timestamp', 'asc')
          .limit(100)
          .get();

        const messages = messagesSnap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            role: data.role,
            content: data.content,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp,
          };
        });

        return reply.code(200).send({
          id: convDoc.id,
          topic: convDoc.data()?.topic,
          messages,
        });
      } catch (error: any) {
        logger.error({ err: error, uid, convId: id }, 'Failed to fetch messages');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to retrieve messages.',
        });
      }
    }
  );

  // Delete a conversation and all its messages
  fastify.delete(
    '/conversations/:id',
    {
      preHandler: verifyAuth,
    },
    async (request, reply) => {
      const uid = request.user.uid;
      const { id } = request.params as { id: string };

      try {
        const convRef = db
          .collection('users')
          .doc(uid)
          .collection('conversations')
          .doc(id);

        const convDoc = await convRef.get();
        if (!convDoc.exists) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Conversation not found.',
          });
        }

        // Delete all messages subcollection
        const messagesSnap = await convRef.collection('messages').get();
        const batch = db.batch();
        messagesSnap.docs.forEach((doc) => batch.delete(doc.ref));
        batch.delete(convRef);
        await batch.commit();

        // Invalidate Redis cache
        const cacheKey = `chat:${uid}:${id}:history`;
        await redisService.del(cacheKey);

        return reply.code(200).send({
          success: true,
          message: 'Conversation deleted successfully.',
        });
      } catch (error: any) {
        logger.error({ err: error, uid, convId: id }, 'Failed to delete conversation');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete conversation.',
        });
      }
    }
  );
}
