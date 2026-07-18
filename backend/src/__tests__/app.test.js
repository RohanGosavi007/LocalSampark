const request = require('supertest');
const express = require('express');

describe('LocalSampark API Smoke Tests', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', version: '1.0.0' });
    });
  });

  it('GET /health should return 200 and ok status', async () => {
    const res = await request(app)
      .get('/health')
      .expect(200);
    
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBe('1.0.0');
  });
});
