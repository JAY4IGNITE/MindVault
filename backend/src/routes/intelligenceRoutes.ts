import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { verifyAuth } from '../middleware/auth';
import { runPipeline } from '../services/intelligencePipeline';
import { runInsightPipeline } from '../services/insightPipeline';
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
}
