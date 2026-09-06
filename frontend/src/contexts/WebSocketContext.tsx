import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { wsClient } from '../services/websocket/websocketClient';
import { ConnectionState, EventHandler } from '../services/websocket/types';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  connectionState: ConnectionState;
  isConnected: boolean;
  send: (data: any) => boolean;
  subscribe: <T = any>(eventType: string, handler: EventHandler<T>) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  connectionState: 'DISCONNECTED',
  isConnected: false,
  send: () => false,
  subscribe: () => () => {},
});

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [connectionState, setConnectionState] = useState<ConnectionState>(wsClient.getState());

  useEffect(() => {
    // Listen for connection state changes from singleton
    const unsubscribeState = wsClient.onStateChange((state) => {
      setConnectionState(state);
    });

    return () => {
      unsubscribeState();
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      // Connect when user logs in
      wsClient.connect(async () => {
        try {
          return await currentUser.getIdToken();
        } catch {
          return null;
        }
      });
    } else {
      // Disconnect when user logs out
      wsClient.disconnect();
    }
  }, [currentUser]);

  const send = useCallback((data: any) => {
    return wsClient.send(data);
  }, []);

  const subscribe = useCallback(<T = any,>(eventType: string, handler: EventHandler<T>) => {
    return wsClient.subscribe(eventType, handler);
  }, []);

  const value = useMemo(
    () => ({
      connectionState,
      isConnected: connectionState === 'CONNECTED',
      send,
      subscribe,
    }),
    [connectionState, send, subscribe]
  );

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
