const request = require('supertest');
const { app } = require('../../server');

describe('Milestone M8 — Health & Readiness Probes (P8 Observability)', () => {
  test('[P8.1] GET /health returns 200 and operational liveness metadata', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('app', 'LocalSampark API');
    expect(res.body).toHaveProperty('database');
    expect(res.body).toHaveProperty('memory');
    expect(res.body.memory).toHaveProperty('rss');
    expect(res.body.memory).toHaveProperty('heapUsed');
  });

  test('[P8.2] GET /ready returns 200 and verifies database & schema readiness', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ready');
    expect(res.body).toHaveProperty('ready', true);
    expect(res.body).toHaveProperty('checks');
    expect(res.body.checks.database).toBe('connected');
    expect(res.body.checks.schema).toBe('ready');
  });

  test('[P8.3] GET /metrics returns Prometheus formatted process metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('node_memory_usage_bytes');
    expect(res.text).toContain('node_uptime_seconds');
  });
});
