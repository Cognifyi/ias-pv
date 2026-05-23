import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import Database from 'better-sqlite3';
import request from 'supertest';
import { UserService } from '../src/auth/user.service.js';
import { createAuthRouter } from '../src/auth/auth.routes.js';
import { requireAuth, requireAdmin } from '../src/auth/auth.middleware.js';

describe('Auth routes', () => {
  let db: Database.Database;
  let userService: UserService;
  let app: express.Express;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
    db = new Database(':memory:');
    userService = new UserService(db);
    userService.init();
    userService.createUser({ username: 'admin', password: 'admin123', role: 'admin' });
    userService.createUser({ username: 'user1', password: 'user123', role: 'user' });

    app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRouter(userService));
  });

  afterAll(() => {
    db.close();
  });

  it('POST /api/auth/login returns 400 on missing body', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login returns 401 on wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/login returns 401 on non-existent user', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'nobody', password: 'pass' });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/login returns token and user on success', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe('admin');
    expect(res.body.user.role).toBe('admin');
    expect(res.body.user.password).toBeUndefined();
  });

  it('returned JWT can be used for authenticated requests', async () => {
    const login = await request(app).post('/api/auth/login').send({ username: 'user1', password: 'user123' });
    const token = login.body.token;

    const authApp = express();
    authApp.use(express.json());
    authApp.get('/api/protected', requireAuth, (req, res) => {
      res.json({ userId: (req as any).user!.id, role: (req as any).user!.role });
    });

    const res = await request(authApp)
      .get('/api/protected')
      .set('Authorization', `Bearer ${token}`);
    if (res.status !== 200) console.error('FAIL:', res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBeDefined();
    expect(res.body.role).toBe('user');
  });

  it('requireAuth returns 401 without token', async () => {
    const authApp = express();
    authApp.get('/api/protected', requireAuth, (_req, res) => res.json({ ok: true }));

    const res = await request(authApp).get('/api/protected');
    expect(res.status).toBe(401);
  });

  it('requireAuth returns 401 with invalid token', async () => {
    const authApp = express();
    authApp.get('/api/protected', requireAuth, (_req, res) => res.json({ ok: true }));

    const res = await request(authApp)
      .get('/api/protected')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });

  it('requireAuth returns 401 with expired token', async () => {
    const authApp = express();
    authApp.get('/api/protected', requireAuth, (_req, res) => res.json({ ok: true }));

    const res = await request(authApp)
      .get('/api/protected')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjB9.ZcQqA7r6X_TKQqA7r6X_TKQ');
    expect(res.status).toBe(401);
  });

  it('requireAdmin returns 403 for non-admin user', async () => {
    const login = await request(app).post('/api/auth/login').send({ username: 'user1', password: 'user123' });
    const token = login.body.token;

    const authApp = express();
    authApp.use(express.json());
    authApp.get('/api/admin', requireAuth, requireAdmin, (_req, res) => res.json({ ok: true }));

    const res = await request(authApp)
      .get('/api/admin')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('requireAdmin allows admin user', async () => {
    const login = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
    const token = login.body.token;

    const authApp = express();
    authApp.use(express.json());
    authApp.get('/api/admin', requireAuth, requireAdmin, (_req, res) => res.json({ ok: true }));

    const res = await request(authApp)
      .get('/api/admin')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

});
