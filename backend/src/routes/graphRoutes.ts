import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifyAuth } from '../middleware/auth';
import { getUserGraphData } from '../services/graphService';
import { logger } from '../utils/logger';
import { redisService } from '../services/redisService';

const graphQuerySchema = z.object({
  days: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional()
    .default('30'),
  refresh: z.string().optional(),
});

export async function graphRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: verifyAuth }, async (request, reply) => {
    const parseResult = graphQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'Bad Request',
        details: parseResult.error.issues,
      });
    }

    const { days, refresh } = parseResult.data;
    const uid = request.user.uid;
    const cacheKey = `graph:${uid}:${days}`;

    try {
      // Return cached graph immediately if available and not explicitly refreshing (<5ms)
      if (!refresh) {
        const cached = await redisService.get(cacheKey);
        if (cached) {
          return reply.code(200).send(cached);
        }
      }

      const graphData = await getUserGraphData(uid, days);
      await redisService.set(cacheKey, graphData, 300); // 5-minute cache
      return reply.code(200).send(graphData);
    } catch (error: any) {
      logger.error({ err: error, uid }, 'Graph route error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to generate memory graph.',
      });
    }
  });
}
