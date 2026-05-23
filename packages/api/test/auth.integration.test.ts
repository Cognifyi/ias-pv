import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createApp } from '../src/app.js';
import { UserService } from '../src/auth/user.service.js';
import type { Express } from 'express';

let app: Express;
let userService: UserService;
let adminToken: string;
let userToken: string;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  const db = new Database(':memory:');
  userService = new UserService(db);
  userService.init();
  userService.createUser({ username: 'admin', password: 'admin123', role: 'admin' });
  userService.createUser({ username: 'user', password: 'user123', role: 'user' });

  const result = createApp({ db, userService, enableAuth: true });
  app = result.app;

  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  adminToken = adminRes.body.token;

  const userRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'user', password: 'user123' });
  userToken = userRes.body.token;
});

describe('RBAC: Channel endpoints', () => {
  const channelPayload = {
    name: 'Test Channel',
    url: 'https://example.com/stream.m3u8',
    group: 'Test',
  };

  const createdChannelId = 'ch_rbac_test';

  it('user cannot create a channel', async () => {
    const res = await request(app)
      .post('/api/channels')
      .set('Authorization', `Bearer ${userToken}`)
      .send(channelPayload);
    expect(res.status).toBe(403);
  });

  it('admin can create a channel', async () => {
    const res = await request(app)
      .post('/api/channels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(channelPayload);
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Channel');
  });

  it('user cannot update a channel', async () => {
    const res = await request(app)
      .put(`/api/channels/${createdChannelId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Hacked' });
    expect(res.status).toBe(403);
  });

  it('user cannot delete a channel', async () => {
    const res = await request(app)
      .delete(`/api/channels/${createdChannelId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('user can list channels', async () => {
    const res = await request(app)
      .get('/api/channels')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('user can get a channel by id', async () => {
    const res = await request(app)
      .get('/api/channels')
      .set('Authorization', `Bearer ${userToken}`);
    const channels = res.body;
    if (channels.length > 0) {
      const getRes = await request(app)
        .get(`/api/channels/${channels[0].id}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(getRes.status).toBe(200);
    }
  });
});

describe('RBAC: Probe endpoint', () => {
  it('user cannot probe a channel', async () => {
    const res = await request(app)
      .post('/api/channels/nonexistent/probe')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});

describe('RBAC: Recording endpoints', () => {
  it('user cannot create a recording', async () => {
    const res = await request(app)
      .post('/api/recordings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ channelId: 'ch_test', duration: 60, cronExpression: '* * * * *' });
    expect(res.status).toBe(403);
  });

  it('admin can create a recording', async () => {
    const channelRes = await request(app)
      .post('/api/channels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'RBAC Test', url: 'https://example.com/rbac.m3u8', group: 'Test' });
    expect(channelRes.status).toBe(201);

    const res = await request(app)
      .post('/api/recordings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ channelId: channelRes.body.id, duration: 60, cronExpression: '* * * * *' });
    expect(res.status).toBe(201);
    expect(res.body.channelId).toBe(channelRes.body.id);
  });

  it('user can list recordings', async () => {
    const res = await request(app)
      .get('/api/recordings')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('user cannot delete a recording', async () => {
    const res = await request(app)
      .delete('/api/recordings/rec_test')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});

describe('RBAC: Health endpoint', () => {
  it('user can access health', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Auth edge cases', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/channels');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/channels')
      .set('Authorization', 'Bearer invalidtoken');
    expect(res.status).toBe(401);
  });

  it('returns 401 with malformed auth header', async () => {
    const res = await request(app)
      .get('/api/channels')
      .set('Authorization', 'Basic credentials');
    expect(res.status).toBe(401);
  });

  it('admin can manage users', async () => {
    const createRes = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'newuser', password: 'newpass123', role: 'user' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.username).toBe('newuser');

    const listRes = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBeGreaterThanOrEqual(3);
  });

  it('non-admin cannot manage users', async () => {
    const createRes = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ username: 'shouldnotwork', password: 'test123' });
    expect(createRes.status).toBe(403);

    const listRes = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${userToken}`);
    expect(listRes.status).toBe(403);
  });
});
