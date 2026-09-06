import { z } from 'zod';

// Client to Server Event Schemas
export const AuthMessageSchema = z.object({
  type: z.literal('auth'),
  token: z.string().min(1),
});

export const ChatSendMessageSchema = z.object({
  type: z.literal('chat.send'),
  requestId: z.string().min(1),
  conversationId: z.string().optional(),
  message: z.string().min(1).max(4000),
});

export const ChatCancelMessageSchema = z.object({
  type: z.literal('chat.cancel'),
  requestId: z.string().min(1),
});

export const IntelligenceStartMessageSchema = z.object({
  type: z.literal('intelligence.start'),
  requestId: z.string().min(1),
  conversationId: z.string().min(1),
});

export const PingMessageSchema = z.object({
  type: z.literal('ping'),
});

export const InboundMessageSchema = z.discriminatedUnion('type', [
  AuthMessageSchema,
  ChatSendMessageSchema,
  ChatCancelMessageSchema,
  IntelligenceStartMessageSchema,
  PingMessageSchema,
]);

export type InboundMessage = z.infer<typeof InboundMessageSchema>;
export type AuthMessage = z.infer<typeof AuthMessageSchema>;
export type ChatSendMessage = z.infer<typeof ChatSendMessageSchema>;
export type ChatCancelMessage = z.infer<typeof ChatCancelMessageSchema>;
export type IntelligenceStartMessage = z.infer<typeof IntelligenceStartMessageSchema>;

// Server to Client Event Types
export type OutboundEvent =
  | { type: 'auth.success'; uid: string }
  | { type: 'auth.error'; message: string }
  | { type: 'ai.stream.start'; requestId: string; conversationId: string }
  | { type: 'ai.stream.chunk'; requestId: string; content: string }
  | {
      type: 'ai.stream.complete';
      requestId: string;
      conversationId: string;
      messageId: string;
      content: string;
    }
  | { type: 'ai.stream.error'; requestId: string; code: string; message: string }
  | {
      type: 'intelligence.progress';
      requestId: string;
      stage: 'ANALYSIS_STARTED' | 'EXTRACTING_ENTITIES' | 'DETECTING_RELATIONSHIPS' | 'FINALIZING' | 'COMPLETED';
      progress: number;
      message: string;
    }
  | {
      type: 'intelligence.completed';
      requestId: string;
      summaryId: string;
      counts: {
        memories: number;
        goals: number;
        decisions: number;
        relationships: number;
      };
    }
  | { type: 'intelligence.error'; requestId: string; message: string }
  | { type: 'vault.updated'; entity: string; count?: number; timestamp: string }
  | { type: 'pong' }
  | { type: 'error'; code: string; message: string };
