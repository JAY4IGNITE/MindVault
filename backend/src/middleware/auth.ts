import { FastifyRequest, FastifyReply } from 'fastify';
import { auth } from '../services/firebaseAdmin';
import { logger } from '../utils/logger';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      uid: string;
      email?: string;
    };
  }
}

export const verifyAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header.',
    });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1].trim();
  if (!idToken) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Empty Bearer token.',
    });
    return;
  }

  // Support local test mock tokens if enabled for emulator/mock tests
  if (process.env.NODE_ENV === 'test' && idToken.startsWith('TEST_TOKEN_')) {
    const uid = idToken.replace('TEST_TOKEN_', '');
    request.user = { uid, email: `${uid}@test.local` };
    return;
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    request.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    logger.warn({ err: error }, 'Token verification failed');
    reply.code(403).send({
      error: 'Forbidden',
      message: 'Invalid or expired authentication token.',
    });
    return;
  }
};
