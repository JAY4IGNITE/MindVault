import { ConnectionState, EventHandler, ServerEvent } from './types';

export class WebSocketClient {
  private static instance: WebSocketClient;
  private socket: WebSocket | null = null;
  private state: ConnectionState = 'DISCONNECTED';
  private tokenProvider: (() => Promise<string | null>) | null = null;

  private listeners: Map<string, Set<EventHandler>> = new Map();
  private stateListeners: Set<(state: ConnectionState) => void> = new Set();

  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 8;
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private explicitlyClosed = false;

  private constructor() {}

  public static getInstance(): WebSocketClient {
    if (!WebSocketClient.instance) {
      WebSocketClient.instance = new WebSocketClient();
    }
    return WebSocketClient.instance;
  }

  public getState(): ConnectionState {
    return this.state;
  }

  public isConnected(): boolean {
    return this.state === 'CONNECTED' && this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Subscribe to connection state updates (CONNECTING, CONNECTED, DISCONNECTED, etc.)
   */
  public onStateChange(handler: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(handler);
    handler(this.state);
    return () => this.stateListeners.delete(handler);
  }

  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      for (const listener of this.stateListeners) {
        try {
          listener(newState);
        } catch (e) {
          console.warn('Error in WebSocket state listener:', e);
        }
      }
    }
  }

  /**
   * Determine WebSocket URL dynamically based on environment or backend URL
   */
  private getUrl(token?: string): string {
    const customWs = import.meta.env.VITE_WS_URL;
    let base = customWs;

    if (!base) {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      const isHttps = backendUrl.startsWith('https://') || window.location.protocol === 'https:';
      const cleanHost = backendUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      base = `${isHttps ? 'wss://' : 'ws://'}${cleanHost}/ws`;
    }

    if (token) {
      const separator = base.includes('?') ? '&' : '?';
      return `${base}${separator}token=${encodeURIComponent(token)}`;
    }
    return base;
  }

  /**
   * Connect to WebSocket server using current auth token
   */
  public async connect(tokenProvider: () => Promise<string | null>): Promise<void> {
    this.tokenProvider = tokenProvider;
    this.explicitlyClosed = false;

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setState(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING');

    try {
      const token = await tokenProvider();
      if (!token && !sessionStorage.getItem('mindvault_dev_token')) {
        this.setState('DISCONNECTED');
        return;
      }

      const effectiveToken = token || sessionStorage.getItem('mindvault_dev_token') || '';
      const url = this.getUrl(effectiveToken);

      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.setState('CONNECTED');
        this.reconnectAttempts = 0;
        this.startHeartbeat();

        // Also emit an auth message as secondary assurance
        if (effectiveToken && this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: 'auth', token: effectiveToken }));
        }
      };

      this.socket.onmessage = (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data) as ServerEvent;
          this.dispatch(parsed.type, parsed);
          // Also dispatch wildcard
          this.dispatch('*', parsed);
        } catch (err) {
          console.warn('Failed to parse WebSocket incoming frame:', event.data);
        }
      };

      this.socket.onerror = (err) => {
        console.warn('WebSocket encountered transport error');
        this.setState('ERROR');
      };

      this.socket.onclose = (event: CloseEvent) => {
        this.stopHeartbeat();
        this.socket = null;

        if (this.explicitlyClosed) {
          this.setState('DISCONNECTED');
          return;
        }

        // Do not auto-reconnect if unauthorized (4401)
        if (event.code === 4401) {
          this.setState('DISCONNECTED');
          return;
        }

        this.scheduleReconnect();
      };
    } catch (error) {
      console.warn('Failed to initiate WebSocket connection:', error);
      this.setState('ERROR');
      this.scheduleReconnect();
    }
  }

  /**
   * Cleanly disconnect and prevent auto-reconnection
   */
  public disconnect(): void {
    this.explicitlyClosed = true;
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.reconnectAttempts = 0;
    this.setState('DISCONNECTED');
  }

  /**
   * Schedule exponential backoff reconnection
   */
  private scheduleReconnect(): void {
    if (this.explicitlyClosed) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('WebSocket maximum reconnect attempts reached. Staying in offline fallback mode.');
      this.setState('DISCONNECTED');
      return;
    }

    this.reconnectAttempts++;
    this.setState('RECONNECTING');

    // Exponential backoff: 1s, 1.5s, 2.25s, ... capped at 15s with jitter
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts - 1), 15000) + Math.random() * 500;

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.tokenProvider && !this.explicitlyClosed) {
        this.connect(this.tokenProvider);
      }
    }, delay);
  }

  /**
   * Send strongly-typed JSON message over socket
   */
  public send(data: any): boolean {
    if (this.isConnected() && this.socket) {
      try {
        this.socket.send(JSON.stringify(data));
        return true;
      } catch (err) {
        console.error('Failed to send WebSocket payload', err);
        return false;
      }
    }
    return false;
  }

  /**
   * Subscribe to specific event type
   */
  public subscribe<T = any>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    return () => this.unsubscribe(eventType, handler);
  }

  /**
   * Unsubscribe from event type
   */
  public unsubscribe<T = any>(eventType: string, handler: EventHandler<T>): void {
    const set = this.listeners.get(eventType);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  private dispatch(eventType: string, payload: any): void {
    const set = this.listeners.get(eventType);
    if (set) {
      for (const handler of set) {
        try {
          handler(payload);
        } catch (e) {
          console.error(`Error in WebSocket event listener for ${eventType}:`, e);
        }
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping' });
      }
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

export const wsClient = WebSocketClient.getInstance();
