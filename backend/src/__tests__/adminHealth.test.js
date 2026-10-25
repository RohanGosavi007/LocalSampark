/**
 * The admin performance screen reports measurements, not constants.
 *
 * It used to return a database size of '24.5', twelve connections, a latency
 * drawn from Math.random(), and five fabricated log lines — and a "purge
 * cache" action that purged nothing and answered success.
 */

process.env.USE_SQLITE = 'true';

const express = require('express');
const request = require('supertest');
const requestMetrics = require('../utils/requestMetrics');
const CacheService = require('../services/cache.service');
const health = require('../modules/crm/controllers/admin-health.controller');
const { auditLogger } = require('../middleware/audit.middleware');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(auditLogger);
  app.use((req, _res, next) => { req.user = { id: null, role: 'super_admin' }; next(); });
  app.get('/ok', (_req, res) => res.json({ ok: true }));
  app.get('/boom', (_req, res) => res.status(500).json({ error: 'boom' }));
  app.get('/missing', (_req, res) => res.status(404).json({ error: 'nope' }));
  app.get('/admin/health', health.getHealthMetrics);
  app.post('/admin/health/clear-cache', health.clearGlobalCache);
  return app;
}

beforeEach(() => requestMetrics.reset());

describe('request metrics', () => {
  test('reports nothing rather than a guess before any request has been seen', () => {
    expect(requestMetrics.summary()).toEqual({
      samples: 0, avgLatencyMs: null, p95LatencyMs: null, errorRatePercent: null,
    });
    expect(requestMetrics.recentNotable()).toEqual([]);
  });

  test('averages what it was given and keeps the failures, newest first', () => {
    requestMetrics.record({ method: 'GET', path: '/a', statusCode: 200, responseTimeMs: 10 });
    requestMetrics.record({ method: 'GET', path: '/b?token=secret', statusCode: 500, responseTimeMs: 30 });
    requestMetrics.record({ method: 'POST', path: '/c', statusCode: 200, responseTimeMs: 900 });

    const summary = requestMetrics.summary();
    expect(summary.samples).toBe(3);
    expect(summary.avgLatencyMs).toBe(313);
    expect(summary.errorRatePercent).toBeCloseTo(33.3, 1);

    const notable = requestMetrics.recentNotable();
    expect(notable.map((n) => n.route)).toEqual(['POST /c', 'GET /b']);
    expect(notable[1].level).toBe('ERROR');
    // The query string is not carried into the dashboard.
    expect(JSON.stringify(notable)).not.toContain('secret');
  });
});

describe('GET /admin/health', () => {
  test('database figures are read from the database', async () => {
    const stats = await health.databaseStats();

    expect(stats.engine).toBe('sqlite');
    expect(typeof stats.sizeMB).toBe('number');
    expect(stats.sizeMB).toBeGreaterThan(0);
    expect(stats.activeConnections).toBe(1);
    expect(stats.pingMs).toBeGreaterThanOrEqual(0);
  });

  test('latency and the log panel come from the requests actually served', async () => {
    const app = buildApp();
    await request(app).get('/ok');
    await request(app).get('/boom');
    await request(app).get('/missing');

    const res = await request(app).get('/admin/health');
    expect(res.status).toBe(200);

    const { system, logs } = res.body;
    expect(system.api.sampleSize).toBe(3);
    expect(typeof system.api.avgLatencyMs).toBe('number');
    expect(system.api.errorRatePercent).toBeCloseTo(33.3, 1);

    expect(logs.map((l) => l.route).sort()).toEqual(['GET /boom', 'GET /missing']);
    expect(logs.find((l) => l.route === 'GET /boom').level).toBe('ERROR');
    // None of the lines the handler used to invent.
    expect(JSON.stringify(logs)).not.toMatch(/Stripe|Redis|Token verified/);
  });
});

describe('POST /admin/health/clear-cache', () => {
  test('empties the cache and reports how much it removed', async () => {
    await CacheService.set('analytics:test:one', { a: 1 }, 60);
    await CacheService.set('analytics:test:two', { b: 2 }, 60);
    expect(await CacheService.get('analytics:test:one')).toBeTruthy();

    const res = await request(buildApp()).post('/admin/health/clear-cache');

    expect(res.status).toBe(200);
    expect(res.body.purged.memoryEntriesCleared).toBeGreaterThanOrEqual(2);
    expect(await CacheService.get('analytics:test:one')).toBeFalsy();
    expect(await CacheService.get('analytics:test:two')).toBeFalsy();
  });
});
