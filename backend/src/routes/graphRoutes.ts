import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifyAuth } from '../middleware/auth';
import { getUserGraphData } from '../services/graphService';
import { logger } from '../utils/logger';

const graphQuerySchema = z.object({
  days: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional()
    .default('30'),
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

    const { days } = parseResult.data;
    const uid = request.user.uid;

    try {
      const graphData = await getUserGraphData(uid, days);
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
