import Fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyWebsocket from '@fastify/websocket';
import { config } from './config';
import { logger } from './utils/logger';
import { chatRoutes } from './routes/chatRoutes';
import { askRoutes } from './routes/askRoutes';
import { intelligenceRoutes } from './routes/intelligenceRoutes';
import { graphRoutes } from './routes/graphRoutes';
import { decisionRoutes } from './routes/decisionRoutes';
import { handleWebSocketConnection } from './websocket/wsHandler';
import { connectionManager } from './websocket/connectionManager';

export async function buildApp(opts: FastifyServerOptions = {}): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: opts.logger !== undefined ? opts.logger : logger,
    ...opts,
  });

  // Security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  // CORS
  await fastify.register(cors, {
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global IP Rate Limiting (Baseline defense against volumetric DoS)
  await fastify.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    errorResponseBuilder: (request, context) => ({
      code: 429,
      error: 'Too Many Requests',
      message: 'You are sending too many requests. Please slow down and try again shortly.',
      date: Date.now(),
      expiresIn: context.ttl,
    }),
    allowList: (req) => req.url === '/health' || req.url === '/',
  });

  // Register Fastify WebSocket
  await fastify.register(fastifyWebsocket, {
    options: {
      maxPayload: 1048576, // 1MB payload ceiling
    },
  });

  // WebSocket real-time gateway endpoint
  fastify.get('/ws', { websocket: true }, (socket, req) => {
    handleWebSocketConnection(socket, req);
  });

  // Clean up connections on server shutdown
  fastify.addHook('onClose', async () => {
    connectionManager.cleanup();
  });

  // Public Root & Health check
  fastify.get('/', async () => {
    return {
      status: 'ok',
      service: 'mindvault-api',
      message: 'MindVault API is running',
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get('/health', async () => {
    return {
      status: 'ok',
      service: 'mindvault-api',
      timestamp: new Date().toISOString(),
    };
  });

  // Register API routes
  await fastify.register(chatRoutes, { prefix: '/api/v1/chat' });
  await fastify.register(askRoutes, { prefix: '/api/v1/ask' });
  await fastify.register(intelligenceRoutes, { prefix: '/api/v1/intelligence' });
  await fastify.register(graphRoutes, { prefix: '/api/v1/graph' });
  await fastify.register(decisionRoutes, { prefix: '/api/v1/decisions' });

  return fastify;
}

