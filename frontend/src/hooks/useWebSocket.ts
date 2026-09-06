import { useEffect, useRef } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { EventHandler } from '../services/websocket/types';

export { useWebSocket };

/**
 * Hook to subscribe to a specific WebSocket event within a React component.
 * Lifecycle-safe: automatically registers on mount, updates callback without re-subscribing,
 * and cleans up on unmount.
 */
export function useWebSocketEvent<T = any>(eventType: string, handler: EventHandler<T>): void {
  const { subscribe } = useWebSocket();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const wrappedHandler: EventHandler<T> = (data) => {
      handlerRef.current(data);
    };

    const unsubscribe = subscribe<T>(eventType, wrappedHandler);
    return () => {
      unsubscribe();
    };
  }, [eventType, subscribe]);
}
