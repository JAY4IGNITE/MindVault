import supertest from 'supertest';
import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

describe('LAYER 2: Backend API Integration & Security', () => {
  let app: FastifyInstance;
  let request: any;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await buildApp({ logger: false });
    await app.ready();
    request = supertest(app.server);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('returns status ok on public /health endpoint', async () => {
      const res = await request.get('/health').expect(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('Authentication Gatekeeper', () => {
    it('rejects requests with missing Authorization header (401)', async () => {
      const res = await request.post('/api/v1/chat/message').send({ message: 'Hello' }).expect(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('rejects requests with invalid authorization format (401)', async () => {
      const res = await request
        .post('/api/v1/chat/message')
        .set('Authorization', 'Basic invalidcredentials')
        .send({ message: 'Hello' })
        .expect(401);
      expect(res.body.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation & DoS Protection', () => {
    it('rejects empty message payloads (400)', async () => {
      const res = await request
        .post('/api/v1/chat/message')
        .set('Authorization', 'Bearer TEST_TOKEN_user_alice')
        .send({ message: '' })
        .expect(400);
      expect(res.body.error).toBe('Bad Request');
    });

    it('rejects oversized chat messages exceeding 4000 characters (400)', async () => {
      const oversized = 'a'.repeat(4500);
      const res = await request
        .post('/api/v1/chat/message')
        .set('Authorization', 'Bearer TEST_TOKEN_user_alice')
        .send({ message: oversized })
        .expect(400);
      expect(res.body.error).toBe('Bad Request');
    });

    it('rejects query exceeding max length on ask endpoint (400)', async () => {
      const res = await request
        .post('/api/v1/ask')
        .set('Authorization', 'Bearer TEST_TOKEN_user_alice')
        .send({ question: 'a' }) // min 3 required
        .expect(400);
      expect(res.body.error).toBe('Bad Request');
    });
  });

  describe('Decision API CRUD Scoping', () => {
    it('accepts and creates a valid decision document under user session', async () => {
      const res = await request
        .post('/api/v1/decisions')
        .set('Authorization', 'Bearer TEST_TOKEN_user_alice')
        .send({
          decision: 'Migrate to Fastify architecture',
          reasoning: 'Lower latency, strict schema enforcement, and built-in rate limiting.',
          date: new Date().toISOString(),
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe('active');
    });
  });
});
