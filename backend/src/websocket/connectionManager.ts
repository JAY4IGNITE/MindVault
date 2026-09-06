import { WebSocket } from 'ws';
import { OutboundEvent } from './eventTypes';
import { logger } from '../utils/logger';

export class ConnectionManager {
  private static instance: ConnectionManager;
  // Map of uid -> Set of active WebSocket connections (multi-tab support)
  private userSockets: Map<string, Set<WebSocket>> = new Map();
  // Reverse lookup: socket -> uid
  private socketToUser: Map<WebSocket, string> = new Map();
  // Map of requestId -> AbortController for stream cancellation
  private activeRequests: Map<string, AbortController> = new Map();
  // Heartbeat interval handle
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startHeartbeat();
  }

  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  /**
   * Register an authenticated WebSocket for a specific user ID.
   */
  public addConnection(uid: string, socket: WebSocket): void {
    if (!this.userSockets.has(uid)) {
      this.userSockets.set(uid, new Set());
    }
    this.userSockets.get(uid)!.add(socket);
    this.socketToUser.set(socket, uid);

    (socket as any).isAlive = true;
    socket.on('pong', () => {
      (socket as any).isAlive = true;
    });

    logger.info(
      { uid, activeSessions: this.userSockets.get(uid)?.size },
      'WebSocket connected & authenticated'
    );
  }

  /**
   * Remove a WebSocket connection and clean up user map if no connections remain.
   */
  public removeConnection(socket: WebSocket): void {
    const uid = this.socketToUser.get(socket);
    if (uid) {
      const sockets = this.userSockets.get(uid);
      if (sockets) {
        sockets.delete(socket);
        if (sockets.size === 0) {
          this.userSockets.delete(uid);
        }
      }
      this.socketToUser.delete(socket);
      logger.info(
        { uid, remainingSessions: this.userSockets.get(uid)?.size || 0 },
        'WebSocket disconnected & cleaned up'
      );
    }
  }

  /**
   * Look up the authenticated user ID for a given socket.
   */
  public getUserId(socket: WebSocket): string | undefined {
    return this.socketToUser.get(socket);
  }

  /**
   * Send a strongly-typed event to a specific socket.
   */
  public send(socket: WebSocket, event: OutboundEvent): void {
    if (socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(event));
      } catch (err) {
        logger.error({ err }, 'Failed to send message on WebSocket');
      }
    }
  }

  /**
   * Broadcast an event to all open connections belonging strictly to a single user.
   * Zero cross-tenant leakage guaranteed.
   */
  public sendToUser(uid: string, event: OutboundEvent): void {
    const sockets = this.userSockets.get(uid);
    if (!sockets || sockets.size === 0) return;

    const payload = JSON.stringify(event);
    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(payload);
        } catch (err) {
          logger.warn({ err, uid }, 'Failed to send to user socket');
        }
      }
    }
  }

  /**
   * Register an AbortController for an in-flight AI stream.
   */
  public registerRequest(requestId: string, controller: AbortController): void {
    this.activeRequests.set(requestId, controller);
  }

  /**
   * Cancel an in-flight operation using its requestId.
   */
  public cancelRequest(requestId: string): boolean {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(requestId);
      logger.info({ requestId }, 'AI operation canceled by user request');
      return true;
    }
    return false;
  }

  /**
   * Mark request as completed/errored.
   */
  public finishRequest(requestId: string): void {
    this.activeRequests.delete(requestId);
  }

  /**
   * Ping/pong heartbeat to clean up silent zombie connections every 30 seconds.
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const [socket, uid] of this.socketToUser.entries()) {
        if ((socket as any).isAlive === false) {
          logger.warn({ uid }, 'Terminating unresponsive WebSocket (missed ping)');
          this.removeConnection(socket);
          socket.terminate();
          continue;
        }

        (socket as any).isAlive = false;
        if (socket.readyState === WebSocket.OPEN) {
          socket.ping();
        }
      }
    }, 30000);

    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }

  public cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    for (const [socket] of this.socketToUser.entries()) {
      try {
        socket.close();
      } catch {}
    }
    this.userSockets.clear();
    this.socketToUser.clear();
    this.activeRequests.clear();
  }
}

export const connectionManager = ConnectionManager.getInstance();
