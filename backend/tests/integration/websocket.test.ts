import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { AddressInfo } from 'net';
import { connectionManager } from '../../src/websocket/connectionManager';

describe('LAYER 4: WebSocket Real-Time Infrastructure & Security', () => {
  let app: FastifyInstance;
  let port: number;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await buildApp({ logger: false });
    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address() as AddressInfo;
    port = address.port;
    baseUrl = `ws://127.0.0.1:${port}/ws`;
  });

  afterAll(async () => {
    connectionManager.cleanup();
    await app.close();
  });

  describe('Authentication Handshake Gatekeeper', () => {
    it('closes unauthenticated connection that fails to provide token within timeout', (done) => {
      const ws = new WebSocket(baseUrl);
      ws.on('close', (code) => {
        expect([4401, 1006]).toContain(code);
        done();
      });
    }, 10000);

    it('rejects connection with invalid token query parameter (4401)', (done) => {
      const ws = new WebSocket(`${baseUrl}?token=INVALID_EXPIRED_TOKEN`);
      let receivedAuthError = false;

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'auth.error') {
          receivedAuthError = true;
        }
      });

      ws.on('close', (code) => {
        expect(receivedAuthError).toBe(true);
        expect(code).toBe(4401);
        done();
      });
    }, 10000);

    it('accepts valid authentication token via query string and emits auth.success', (done) => {
      const ws = new WebSocket(`${baseUrl}?token=TEST_TOKEN_user_alice`);

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'auth.success') {
          expect(msg.uid).toBe('user_alice');
          ws.close();
          done();
        }
      });

      ws.on('error', (err) => done(err));
    }, 10000);

    it('accepts authentication via initial auth message over socket', (done) => {
      const ws = new WebSocket(baseUrl);

      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'auth', token: 'TEST_TOKEN_user_bob' }));
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'auth.success') {
          expect(msg.uid).toBe('user_bob');
          ws.close();
          done();
        }
      });

      ws.on('error', (err) => done(err));
    }, 10000);
  });

  describe('Heartbeat & Protocol Handling', () => {
    it('replies with pong when ping event is sent', (done) => {
      const ws = new WebSocket(`${baseUrl}?token=TEST_TOKEN_user_alice`);

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'auth.success') {
          ws.send(JSON.stringify({ type: 'ping' }));
        } else if (msg.type === 'pong') {
          ws.close();
          done();
        }
      });

      ws.on('error', (err) => done(err));
    }, 10000);

    it('handles malformed JSON payload safely without crashing server', (done) => {
      const ws = new WebSocket(`${baseUrl}?token=TEST_TOKEN_user_alice`);

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'auth.success') {
          ws.send('invalid-non-json-string');
        } else if (msg.type === 'error') {
          expect(msg.code).toBe('INVALID_JSON');
          ws.close();
          done();
        }
      });

      ws.on('error', (err) => done(err));
    }, 10000);
  });

  describe('AI Response Streaming', () => {
    it('streams chat response chunks progressively and completes', (done) => {
      const ws = new WebSocket(`${baseUrl}?token=TEST_TOKEN_user_alice`);
      const chunks: string[] = [];
      const testRequestId = 'req_stream_test_123';

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'auth.success') {
          ws.send(
            JSON.stringify({
              type: 'chat.send',
              requestId: testRequestId,
              message: 'How do I organize my daily reflection habits?',
            })
          );
        } else if (msg.type === 'ai.stream.start') {
          expect(msg.requestId).toBe(testRequestId);
          expect(msg.conversationId).toBeDefined();
        } else if (msg.type === 'ai.stream.chunk') {
          expect(msg.requestId).toBe(testRequestId);
          expect(typeof msg.content).toBe('string');
          chunks.push(msg.content);
        } else if (msg.type === 'ai.stream.complete') {
          expect(msg.requestId).toBe(testRequestId);
          expect(chunks.length).toBeGreaterThan(0);
          expect(msg.content).toBeDefined();
          ws.close();
          done();
        }
      });

      ws.on('error', (err) => done(err));
    }, 15000);

    it('supports cancellation of in-flight stream via chat.cancel', (done) => {
      const ws = new WebSocket(`${baseUrl}?token=TEST_TOKEN_user_alice`);
      const cancelRequestId = 'req_cancel_test_456';

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'auth.success') {
          ws.send(
            JSON.stringify({
              type: 'chat.send',
              requestId: cancelRequestId,
              message: 'Long query to cancel mid-flight',
            })
          );
        } else if (msg.type === 'ai.stream.chunk') {
          // Immediately send cancel upon receiving first chunk
          ws.send(JSON.stringify({ type: 'chat.cancel', requestId: cancelRequestId }));
          setTimeout(() => {
            ws.close();
            done();
          }, 200);
        }
      });

      ws.on('error', (err) => done(err));
    }, 15000);
  });

  describe('Multi-Tenant Privacy & User Isolation', () => {
    it('guarantees User B receives zero events targeted at User A', (done) => {
      const wsAlice = new WebSocket(`${baseUrl}?token=TEST_TOKEN_user_alice`);
      const wsBob = new WebSocket(`${baseUrl}?token=TEST_TOKEN_user_bob`);
      let bobReceivedAnyData = false;

      wsBob.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type !== 'auth.success') {
          bobReceivedAnyData = true;
        }
      });

      wsAlice.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'auth.success') {
          // Emit a targeted vault update to Alice
          connectionManager.sendToUser('user_alice', {
            type: 'vault.updated',
            entity: 'intelligence',
            timestamp: new Date().toISOString(),
          });

          setTimeout(() => {
            expect(bobReceivedAnyData).toBe(false);
            wsAlice.close();
            wsBob.close();
            done();
          }, 300);
        }
      });
    }, 10000);
  });
});
