import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('API', () => {
  const { app } = createApp();

  describe('Channel API', () => {
    it('GET /api/channels returns empty array initially', async () => {
      const res = await request(app).get('/api/channels');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('POST /api/channels creates a channel', async () => {
      const res = await request(app)
        .post('/api/channels')
        .send({ name: 'Test', url: 'https://example.com/test.m3u8', group: 'Test' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Test');
      expect(res.body.id).toBeDefined();
    });

    it('POST /api/channels returns 400 for invalid input', async () => {
      const res = await request(app)
        .post('/api/channels')
        .send({ name: '', url: 'bad', group: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('GET /api/channels/:id returns a channel', async () => {
      const created = await request(app)
        .post('/api/channels')
        .send({ name: 'CNN', url: 'https://example.com/cnn.m3u8', group: 'News' });

      const res = await request(app).get(`/api/channels/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('CNN');
    });

    it('GET /api/channels/:id returns 404 for missing', async () => {
      const res = await request(app).get('/api/channels/non-existent');
      expect(res.status).toBe(404);
    });

    it('PUT /api/channels/:id updates a channel', async () => {
      const created = await request(app)
        .post('/api/channels')
        .send({ name: 'Old', url: 'https://example.com/old.m3u8', group: 'A' });

      const res = await request(app)
        .put(`/api/channels/${created.body.id}`)
        .send({ name: 'New' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('New');
    });

    it('PUT /api/channels/:id returns 404 for missing', async () => {
      const res = await request(app)
        .put('/api/channels/nope')
        .send({ name: 'x' });
      expect(res.status).toBe(404);
    });

    it('DELETE /api/channels/:id removes a channel', async () => {
      const created = await request(app)
        .post('/api/channels')
        .send({ name: 'DeleteMe', url: 'https://x.com/d.m3u8', group: 'X' });

      const res = await request(app).delete(`/api/channels/${created.body.id}`);
      expect(res.status).toBe(204);

      const getRes = await request(app).get(`/api/channels/${created.body.id}`);
      expect(getRes.status).toBe(404);
    });

    it('DELETE /api/channels/:id returns 404 for missing', async () => {
      const res = await request(app).delete('/api/channels/nope');
      expect(res.status).toBe(404);
    });

    it('GET /undefined-route returns 404', async () => {
      const res = await request(app).get('/api/undefined');
      expect(res.status).toBe(404);
    });

    describe('POST /api/channels/:id/probe', () => {
      it('returns 202 with jobId for existing channel', async () => {
        const created = await request(app)
          .post('/api/channels')
          .send({ name: 'ProbeMe', url: 'https://example.com/p.m3u8', group: 'News' });

        const res = await request(app).post(`/api/channels/${created.body.id}/probe`);
        expect(res.status).toBe(202);
        expect(res.body.jobId).toBeDefined();
      });

      it('returns 404 for non-existent channel', async () => {
        const res = await request(app).post('/api/channels/nope/probe');
        expect(res.status).toBe(404);
      });
    });
  });

  describe('Health API', () => {
    it('GET /api/health returns system status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(typeof res.body.uptime).toBe('number');
    });
  });

  describe('Swagger UI', () => {
    it('GET /api/docs returns HTML page', async () => {
      const res = await request(app).get('/api/docs/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('swagger');
    });
  });

  describe('Recording API', () => {
    it('GET /api/recordings returns empty array initially', async () => {
      const res = await request(app).get('/api/recordings');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('POST /api/recordings creates a recording', async () => {
      // First create a channel
      const ch = await request(app)
        .post('/api/channels')
        .send({ name: 'Test', url: 'https://example.com/t.m3u8', group: 'News' });

      const res = await request(app)
        .post('/api/recordings')
        .send({
          channelId: ch.body.id,
          cronExpression: '0 * * * *',
          duration: 60,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending');
      expect(res.body.channelName).toBe('Test');
      expect(res.body.duration).toBe(60);
    });

    it('POST /api/recordings returns 400 for invalid input', async () => {
      const res = await request(app)
        .post('/api/recordings')
        .send({ channelId: 'nope', cronExpression: '', duration: 0 });
      expect(res.status).toBe(400);
    });

    it('GET /api/recordings/:id returns a recording', async () => {
      const ch = await request(app)
        .post('/api/channels')
        .send({ name: 'Ch', url: 'https://example.com/c.m3u8', group: 'G' });

      const created = await request(app)
        .post('/api/recordings')
        .send({ channelId: ch.body.id, cronExpression: '30 * * * *', duration: 30 });

      const res = await request(app).get(`/api/recordings/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.cronExpression).toBe('30 * * * *');
    });

    it('GET /api/recordings/:id returns 404 for missing', async () => {
      const res = await request(app).get('/api/recordings/nope');
      expect(res.status).toBe(404);
    });

    it('DELETE /api/recordings/:id cancels a recording', async () => {
      const ch = await request(app)
        .post('/api/channels')
        .send({ name: 'Del', url: 'https://example.com/d.m3u8', group: 'G' });

      const created = await request(app)
        .post('/api/recordings')
        .send({ channelId: ch.body.id, cronExpression: '0 * * * *', duration: 30 });

      const res = await request(app).delete(`/api/recordings/${created.body.id}`);
      expect(res.status).toBe(204);
    });
  });
});
