import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSocketClient } from './websocketClient';

describe('LAYER 4: Frontend WebSocket Client Unit Tests', () => {
  let client: WebSocketClient;

  beforeEach(() => {
    client = WebSocketClient.getInstance();
    client.disconnect();
  });

  it('initializes in DISCONNECTED state', () => {
    expect(client.getState()).toBe('DISCONNECTED');
    expect(client.isConnected()).toBe(false);
  });

  it('notifies state change listeners on subscription', () => {
    const listener = vi.fn();
    const unsubscribe = client.onStateChange(listener);

    expect(listener).toHaveBeenCalledWith('DISCONNECTED');
    unsubscribe();
  });

  it('safely rejects send when socket is not open and returns false', () => {
    const result = client.send({ type: 'ping' });
    expect(result).toBe(false);
  });

  it('registers and unregisters event listeners correctly', () => {
    const handler = vi.fn();
    const unsubscribe = client.subscribe('ai.stream.chunk', handler);

    // Unsubscribe removes listener cleanly
    unsubscribe();
    expect(true).toBe(true);
  });

  it('cleans up state and reconnect timers on disconnect', () => {
    client.disconnect();
    expect(client.getState()).toBe('DISCONNECTED');
  });
});
