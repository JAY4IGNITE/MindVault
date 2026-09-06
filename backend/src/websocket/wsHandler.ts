import { WebSocket } from 'ws';
import { FastifyRequest } from 'fastify';
import { auth, db } from '../services/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { Content } from '@google/generative-ai';
import { logger } from '../utils/logger';
import { connectionManager } from './connectionManager';
import {
  InboundMessageSchema,
  ChatSendMessage,
  ChatCancelMessage,
  IntelligenceStartMessage,
} from './eventTypes';
import * as geminiService from '../services/gemini';
import { runPipeline } from '../services/intelligencePipeline';
import { redisService } from '../services/redisService';

// Per-user rate-limiting for WebSocket chat messages
const userMessageTimestamps = new Map<string, number[]>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function isRateLimited(uid: string): boolean {
  const now = Date.now();
  const timestamps = userMessageTimestamps.get(uid) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= RATE_LIMIT_MAX) {
    userMessageTimestamps.set(uid, validTimestamps);
    return true;
  }

  validTimestamps.push(now);
  userMessageTimestamps.set(uid, validTimestamps);
  return false;
}

async function verifyToken(idToken: string): Promise<string | null> {
  if (!idToken) return null;

  // Support local test mock tokens if enabled for emulator/mock tests
  if (process.env.NODE_ENV === 'test' && idToken.startsWith('TEST_TOKEN_')) {
    return idToken.replace('TEST_TOKEN_', '');
  }

  try {
    const decoded = await auth.verifyIdToken(idToken);
    return decoded.uid;
  } catch (error) {
    logger.warn({ err: error }, 'WebSocket auth token verification failed');
    return null;
  }
}

export function handleWebSocketConnection(socket: WebSocket, req: FastifyRequest) {
  let authenticatedUid: string | null = null;
  let authTimeoutHandle: NodeJS.Timeout | null = null;

  const cleanup = () => {
    if (authTimeoutHandle) {
      clearTimeout(authTimeoutHandle);
      authTimeoutHandle = null;
    }
    connectionManager.removeConnection(socket);
  };

  socket.on('close', cleanup);
  socket.on('error', (err) => {
    logger.warn({ err }, 'WebSocket encountered socket-level error');
    cleanup();
  });

  const setupAuthenticatedSocket = (uid: string) => {
    authenticatedUid = uid;
    if (authTimeoutHandle) {
      clearTimeout(authTimeoutHandle);
      authTimeoutHandle = null;
    }
    connectionManager.addConnection(uid, socket);
    connectionManager.send(socket, { type: 'auth.success', uid });
  };

  // Check if token was provided in query string (?token=...)
  const queryToken = (req.query as any)?.token;
  if (queryToken) {
    verifyToken(queryToken).then((uid) => {
      if (uid) {
        setupAuthenticatedSocket(uid);
      } else {
        connectionManager.send(socket, {
          type: 'auth.error',
          message: 'Invalid or expired token',
        });
        socket.close(4401, 'Unauthorized');
      }
    });
  } else {
    // Wait up to 5 seconds for client to send { type: 'auth', token: '...' } message
    authTimeoutHandle = setTimeout(() => {
      if (!authenticatedUid) {
        logger.warn('WebSocket authentication timed out waiting for auth message');
        connectionManager.send(socket, {
          type: 'auth.error',
          message: 'Authentication timed out. Disconnecting.',
        });
        socket.close(4401, 'Auth Timeout');
      }
    }, 5000);
  }

  socket.on('message', async (data) => {
    try {
      const rawString = data.toString('utf8');
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(rawString);
      } catch {
        connectionManager.send(socket, {
          type: 'error',
          code: 'INVALID_JSON',
          message: 'Malformed JSON payload',
        });
        return;
      }

      // Handle unauthenticated state: accept only 'auth' or 'ping'
      if (!authenticatedUid) {
        if (parsedJson.type === 'auth' && typeof parsedJson.token === 'string') {
          const uid = await verifyToken(parsedJson.token);
          if (uid) {
            setupAuthenticatedSocket(uid);
          } else {
            connectionManager.send(socket, {
              type: 'auth.error',
              message: 'Invalid or expired authentication token',
            });
            socket.close(4401, 'Unauthorized');
          }
        } else if (parsedJson.type === 'ping') {
          connectionManager.send(socket, { type: 'pong' });
        } else {
          connectionManager.send(socket, {
            type: 'auth.error',
            message: 'Must authenticate first with valid token',
          });
          socket.close(4401, 'Unauthorized');
        }
        return;
      }

      // Validate schema for authenticated user message
      const parseResult = InboundMessageSchema.safeParse(parsedJson);
      if (!parseResult.success) {
        connectionManager.send(socket, {
          type: 'error',
          code: 'SCHEMA_VALIDATION_FAILED',
          message: parseResult.error.issues[0]?.message || 'Invalid message structure',
        });
        return;
      }

      const message = parseResult.data;

      switch (message.type) {
        case 'ping': {
          connectionManager.send(socket, { type: 'pong' });
          break;
        }

        case 'chat.send': {
          await handleChatSend(socket, authenticatedUid, message);
          break;
        }

        case 'chat.cancel': {
          handleChatCancel(authenticatedUid, message);
          break;
        }

        case 'intelligence.start': {
          await handleIntelligenceStart(socket, authenticatedUid, message);
          break;
        }

        default:
          break;
      }
    } catch (err: any) {
      logger.error({ err, uid: authenticatedUid }, 'Unexpected error processing WebSocket message');
      connectionManager.send(socket, {
        type: 'error',
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred processing your request.',
      });
    }
  });
}

async function handleChatSend(socket: WebSocket, uid: string, msg: ChatSendMessage) {
  const { requestId, message: userMessageContent, conversationId: requestedConvId } = msg;

  if (isRateLimited(uid)) {
    connectionManager.send(socket, {
      type: 'ai.stream.error',
      requestId,
      code: 'RATE_LIMITED',
      message: 'Too many messages sent. Please pause a moment.',
    });
    return;
  }

  const userDocRef = db.collection('users').doc(uid);
  const isNew = !requestedConvId;
  const conversationRef = requestedConvId
    ? userDocRef.collection('conversations').doc(requestedConvId)
    : userDocRef.collection('conversations').doc();
  const conversationId = conversationRef.id;

  const abortController = new AbortController();
  connectionManager.registerRequest(requestId, abortController);

  try {
    let history: Content[] | null = null;
    const cacheKey = requestedConvId ? `chat:${uid}:${requestedConvId}:history` : null;

    if (requestedConvId) {
      if (cacheKey) {
        history = await redisService.get<Content[]>(cacheKey);
      }

      if (!history) {
        const convDoc = await conversationRef.get();
        if (!convDoc.exists) {
          connectionManager.finishRequest(requestId);
          connectionManager.send(socket, {
            type: 'ai.stream.error',
            requestId,
            code: 'NOT_FOUND',
            message: 'Conversation not found.',
          });
          return;
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

    // Signal start of stream
    connectionManager.send(socket, {
      type: 'ai.stream.start',
      requestId,
      conversationId,
    });

    // Stream generation
    const modelResponseContent = await geminiService.generateChatResponseStream(
      history || [],
      userMessageContent,
      (delta) => {
        if (!abortController.signal.aborted) {
          connectionManager.send(socket, {
            type: 'ai.stream.chunk',
            requestId,
            content: delta,
          });
        }
      },
      abortController.signal
    );

    // If canceled mid-stream by client
    if (abortController.signal.aborted) {
      connectionManager.finishRequest(requestId);
      return;
    }

    // Update Redis cache
    const updatedHistory: Content[] = [
      ...(history || []),
      { role: 'user', parts: [{ text: userMessageContent }] },
      { role: 'model', parts: [{ text: modelResponseContent }] },
    ].slice(-20);
    const updatedCacheKey = `chat:${uid}:${conversationId}:history`;
    await redisService.set(updatedCacheKey, updatedHistory, 3600);

    // Persist conversation and messages to Firestore atomically
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

    connectionManager.send(socket, {
      type: 'ai.stream.complete',
      requestId,
      conversationId,
      messageId: modelMsgRef.id,
      content: modelResponseContent,
    });
  } catch (error: any) {
    if (abortController.signal.aborted) {
      logger.info({ requestId, uid }, 'AI stream aborted by client');
    } else {
      logger.error({ err: error, uid, requestId }, 'Error during AI streaming generation');
      connectionManager.send(socket, {
        type: 'ai.stream.error',
        requestId,
        code: 'AI_STREAM_FAILED',
        message: error.message || 'An error occurred during AI generation.',
      });
    }
  } finally {
    connectionManager.finishRequest(requestId);
  }
}

function handleChatCancel(uid: string, msg: ChatCancelMessage) {
  const { requestId } = msg;
  const canceled = connectionManager.cancelRequest(requestId);
  logger.info({ requestId, uid, canceled }, 'Processed chat cancel request');
}

async function handleIntelligenceStart(
  socket: WebSocket,
  uid: string,
  msg: IntelligenceStartMessage
) {
  const { requestId, conversationId } = msg;

  try {
    const result = await runPipeline(uid, conversationId, (stage, progress, message) => {
      connectionManager.send(socket, {
        type: 'intelligence.progress',
        requestId,
        stage,
        progress,
        message,
      });
    });

    if (result) {
      connectionManager.send(socket, {
        type: 'intelligence.completed',
        requestId,
        summaryId: result.summaryId,
        counts: result.counts,
      });

      // Notify all tabs for this user of vault updates so dashboard/metrics can revalidate
      connectionManager.sendToUser(uid, {
        type: 'vault.updated',
        entity: 'intelligence',
        count: result.counts.memories,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err: any) {
    logger.error({ err, uid, conversationId }, 'Intelligence pipeline execution error via WS');
    connectionManager.send(socket, {
      type: 'intelligence.error',
      requestId,
      message: err.message || 'Pipeline processing failed.',
    });
  }
}
