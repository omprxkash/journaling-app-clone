import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import app from '../src/server';

const request = supertest(app);

describe('Auth + Entries API', () => {
  const email = `test_${Date.now()}@example.com`;
  const password = 'password123';

  it('registers a new user', async () => {
    const res = await request
      .post('/api/auth/register')
      .send({ email, password });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
  });

  it('rejects duplicate registration', async () => {
    const res = await request
      .post('/api/auth/register')
      .send({ email, password });
    expect(res.status).toBe(409);
  });

  it('logs in with valid credentials', async () => {
    const res = await request
      .post('/api/auth/login')
      .send({ email, password });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  describe('with auth cookie', () => {
    let cookie: string;
    let entryId: string;

    beforeAll(async () => {
      const res = await request
        .post('/api/auth/login')
        .send({ email, password });
      cookie = res.headers['set-cookie'][0];
    });

    it('creates an entry', async () => {
      const res = await request
        .post('/api/entries')
        .set('Cookie', cookie)
        .send({ title: 'Test entry', body: '# Hello\nThis is a test.', tags: ['test'], mood: 'happy' });
      expect(res.status).toBe(201);
      expect(res.body.entry.title).toBe('Test entry');
      entryId = res.body.entry.id;
    });

    it('lists entries', async () => {
      const res = await request
        .get('/api/entries')
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.entries)).toBe(true);
    });

    it('gets a single entry', async () => {
      const res = await request
        .get(`/api/entries/${entryId}`)
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.entry.id).toBe(entryId);
    });

    it('updates an entry', async () => {
      const res = await request
        .put(`/api/entries/${entryId}`)
        .set('Cookie', cookie)
        .send({ title: 'Updated', body: 'Updated body', tags: ['test'], mood: 'neutral' });
      expect(res.status).toBe(200);
      expect(res.body.entry.title).toBe('Updated');
    });

    it('filters by tag', async () => {
      const res = await request
        .get('/api/entries?tag=test')
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.entries.length).toBeGreaterThan(0);
    });

    it('lists tags', async () => {
      const res = await request
        .get('/api/tags')
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.tags.some((t: { name: string }) => t.name === 'test')).toBe(true);
    });

    it('gets stats', async () => {
      const res = await request
        .get('/api/entries/stats')
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(typeof res.body.totalEntries).toBe('number');
    });

    it('soft-deletes an entry', async () => {
      const res = await request
        .delete(`/api/entries/${entryId}`)
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
    });

    it('does not return deleted entries', async () => {
      const res = await request
        .get(`/api/entries/${entryId}`)
        .set('Cookie', cookie);
      expect(res.status).toBe(404);
    });

    it('logs out', async () => {
      const res = await request
        .post('/api/auth/logout')
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
    });
  });
});
