/**
 * The landing page's numbers are counted, not animated up to a target.
 */

const { fx, fxLike } = require('../helpers/fixtureIds');
const express = require('express');
const request = require('supertest');
const { query } = require('../../config/database');

let app;
let router;
beforeAll(async () => {
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('pst')}'`);
  await query(`INSERT INTO users (id, full_name, phone_number, role) VALUES ('${fx('pst-1')}', 'A', '9865000001', 'user')`);
  await query(`INSERT INTO users (id, full_name, phone_number, role) VALUES ('${fx('pst-2')}', 'B', '9865000002', 'user')`);
  router = require('../../modules/core/routes/public.routes');
  app = express();
  app.use('/public', router);
  // eslint-disable-next-line no-unused-vars
  app.use(require('../../middleware/error.middleware').errorHandler);
});
afterAll(async () => { await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('pst')}'`); });

test('reports counts that follow the database', async () => {
  router.__resetCache();
  const before = await request(app).get('/public/stats');
  expect(before.status).toBe(200);
  expect(Number.isInteger(before.body.neighbors)).toBe(true);
  expect(before.body.neighbors).toBeGreaterThanOrEqual(2);
  expect(Array.isArray(before.body.zones)).toBe(true);

  await query(`INSERT INTO users (id, full_name, phone_number, role) VALUES ('${fx('pst-3')}', 'C', '9865000003', 'user')`);
  router.__resetCache();
  const after = await request(app).get('/public/stats');
  expect(after.body.neighbors).toBe(before.body.neighbors + 1);
});

test('is served from a short cache between requests', async () => {
  router.__resetCache();
  const first = await request(app).get('/public/stats');
  await query(`INSERT INTO users (id, full_name, phone_number, role) VALUES ('${fx('pst-4')}', 'D', '9865000004', 'user')`);
  const second = await request(app).get('/public/stats');
  expect(second.body.neighbors).toBe(first.body.neighbors);
});
