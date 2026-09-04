import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { verifyAuth } from '../middleware/auth';
import { getUserContext } from '../services/retrievalService';
import * as geminiService from '../services/gemini';
import { logger } from '../utils/logger';
import { redisService } from '../services/redisService';

const askRequestSchema = z.object({
  question: z.string().min(3).max(1000),
});

export async function askRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/',
    {
      preHandler: verifyAuth,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
          keyGenerator: (request: FastifyRequest) => request.user?.uid || request.ip,
        },
      },
    },
    async (request, reply) => {
      const parseResult = askRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          error: 'Bad Request',
          details: parseResult.error.issues,
        });
      }

      const { question } = parseResult.data;
      const uid = request.user.uid;
      const normalizedQ = question.trim().toLowerCase();
      const cacheKey = `ask:${uid}:${Buffer.from(normalizedQ).toString('base64').slice(0, 32)}`;

      try {
        const cached = await redisService.get(cacheKey);
        if (cached) {
          return reply.code(200).send(cached);
        }

        const contextItems = await getUserContext(uid, 20);

        if (contextItems.length === 0) {
          return reply.code(200).send({
            answer:
              "You don't have enough recorded memories or journals in your vault yet for me to answer that. Try adding more entries first!",
            sources: [],
            isPartial: true,
          });
        }

        const generatedResponse = await geminiService.generateAskAnswer(question, contextItems);

        const supportingSources = contextItems.filter((item) =>
          generatedResponse.supportingSourceIds.includes(item.id)
        );

        const responsePayload = {
          answer: generatedResponse.answer,
          sources: supportingSources.length > 0 ? supportingSources : contextItems.slice(0, 3),
          isPartial: generatedResponse.hasInsufficientEvidence,
        };

        await redisService.set(cacheKey, responsePayload, 600); // 10-minute cache

        return reply.code(200).send(responsePayload);
      } catch (error: any) {
        logger.error({ err: error, uid }, 'Ask memory route error');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'An error occurred while searching your memory vault.',
        });
      }
    }
  );
}
