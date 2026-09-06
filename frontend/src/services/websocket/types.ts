export type ConnectionState =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'RECONNECTING'
  | 'ERROR';

export interface StreamStartEvent {
  type: 'ai.stream.start';
  requestId: string;
  conversationId: string;
}

export interface StreamChunkEvent {
  type: 'ai.stream.chunk';
  requestId: string;
  content: string;
}

export interface StreamCompleteEvent {
  type: 'ai.stream.complete';
  requestId: string;
  conversationId: string;
  messageId: string;
  content: string;
}

export interface StreamErrorEvent {
  type: 'ai.stream.error';
  requestId: string;
  code: string;
  message: string;
}

export interface IntelligenceProgressEvent {
  type: 'intelligence.progress';
  requestId: string;
  stage: 'ANALYSIS_STARTED' | 'EXTRACTING_ENTITIES' | 'DETECTING_RELATIONSHIPS' | 'FINALIZING' | 'COMPLETED';
  progress: number;
  message: string;
}

export interface IntelligenceCompletedEvent {
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

export interface IntelligenceErrorEvent {
  type: 'intelligence.error';
  requestId: string;
  message: string;
}

export interface VaultUpdatedEvent {
  type: 'vault.updated';
  entity: string;
  count?: number;
  timestamp: string;
}

export interface AuthSuccessEvent {
  type: 'auth.success';
  uid: string;
}

export interface AuthErrorEvent {
  type: 'auth.error';
  message: string;
}

export interface GenericErrorEvent {
  type: 'error';
  code?: string;
  message: string;
}

export type ServerEvent =
  | StreamStartEvent
  | StreamChunkEvent
  | StreamCompleteEvent
  | StreamErrorEvent
  | IntelligenceProgressEvent
  | IntelligenceCompletedEvent
  | IntelligenceErrorEvent
  | VaultUpdatedEvent
  | AuthSuccessEvent
  | AuthErrorEvent
  | GenericErrorEvent
  | { type: 'pong' };

export type EventHandler<T = any> = (payload: T) => void;
