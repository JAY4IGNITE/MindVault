import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { verifyAuth } from '../middleware/auth';
import { runPipeline } from '../services/intelligencePipeline';
import { runInsightPipeline } from '../services/insightPipeline';
import { seedMockData, clearMockData } from '../services/mockDataService';
import { logger } from '../utils/logger';

const processSchema = z.object({
  conversationId: z.string().min(1),
});

export async function intelligenceRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/process',
    {
      preHandler: verifyAuth,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
          keyGenerator: (request: FastifyRequest) => request.user?.uid || request.ip,
        },
      },
    },
    async (request, reply) => {
      const parseResult = processSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          details: parseResult.error.issues,
        });
      }

      const { conversationId } = parseResult.data;
      const uid = request.user.uid;

      runPipeline(uid, conversationId).catch((err) => {
        logger.error({ err, uid, conversationId }, 'Unhandled error in background pipeline');
      });

      return reply.code(202).send({
        status: 'accepted',
        message: 'Conversation intelligence processing started.',
      });
    }
  );

  fastify.post(
    '/generate-insights',
    {
      preHandler: verifyAuth,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
          keyGenerator: (request: FastifyRequest) => request.user?.uid || request.ip,
        },
      },
    },
    async (request, reply) => {
      const uid = request.user.uid;

      runInsightPipeline(uid).catch((err) => {
        logger.error({ err, uid }, 'Unhandled error in background insight pipeline');
      });

      return reply.code(202).send({
        status: 'accepted',
        message: 'Longitudinal insight generation started.',
      });
    }
  );

  fastify.post(
    '/seed-demo',
    {
      preHandler: verifyAuth,
    },
    async (request, reply) => {
      const uid = request.user.uid;
      try {
        const result = await seedMockData(uid);
        return reply.code(200).send(result);
      } catch (err: any) {
        logger.error({ err, uid }, 'Failed to seed presentation mock data');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: err.message || 'Failed to seed demo data',
        });
      }
    }
  );

  fastify.post(
    '/clear-demo',
    {
      preHandler: verifyAuth,
    },
    async (request, reply) => {
      const uid = request.user.uid;
      try {
        const result = await clearMockData(uid);
        return reply.code(200).send(result);
      } catch (err: any) {
        logger.error({ err, uid }, 'Failed to clear mock data');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: err.message || 'Failed to clear demo data',
        });
      }
    }
  );
}
