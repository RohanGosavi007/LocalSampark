/**
 * The support dashboard's queue and settings are the database's.
 *
 *   GET /admin/support/tickets          a failed read was an empty queue; `domain` (what the
 *                                       dashboard filters on) did not exist on the table
 *   PUT /admin/support/tickets/:id/status  said "marked as <anything>" for any status and
 *                                       for tickets that do not exist
 *   GET /admin/support/auto-reply       did not exist, so the page showed its own defaults
 *                                       after every reload whatever had been saved
 */


const { fx, fxLike } = require('../helpers/fixtureIds');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const ADMIN = fx('asp-admin');
const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId, tokenVersion: 0 }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;

async function cleanup() {
  await query(`DELETE FROM support_tickets WHERE CAST(id AS TEXT) LIKE '${fxLike('asp')}'`);
  await query("DELETE FROM admin_config WHERE config_key = 'support_auto_reply'");
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('asp')}'`);
}

beforeAll(async () => {
  await cleanup();
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'Admin', '9862000001', 'super_admin')", [ADMIN]);
  await query(`INSERT INTO support_tickets (id, subject, description, category, status) VALUES ('${fx('asp-t1')}', 'Refund', 'Where is it', 'payments', 'open')`);
  await query(`INSERT INTO support_tickets (id, subject, description, status) VALUES ('${fx('asp-t2')}', 'Other', 'Help', 'open')`);

  app = express();
  app.use(express.json());
  app.use('/admin', require('../../modules/crm/routes/admin.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use(require('../../middleware/error.middleware').errorHandler);
});

afterAll(cleanup);

test('tickets are listed with the domain the dashboard filters on', async () => {
  const res = await request(app).get('/admin/support/tickets').set(as(ADMIN));
  expect(res.status).toBe(200);
  const byId = Object.fromEntries(res.body.data.map((t) => [t.id, t]));
  expect(byId[fx('asp-t1')].domain).toBe('payments');
  expect(byId[fx('asp-t2')].domain).toBe('general');
});

test('a status change is applied, validated, and refused for an unknown ticket', async () => {
  const ok = await request(app).put(`/admin/support/tickets/${fx('asp-t1')}/status`).set(as(ADMIN)).send({ status: 'resolved' });
  expect(ok.status).toBe(200);
  const row = await query(`SELECT status FROM support_tickets WHERE id = '${fx('asp-t1')}'`);
  expect((row.rows || row)[0].status).toBe('resolved');

  const bad = await request(app).put(`/admin/support/tickets/${fx('asp-t1')}/status`).set(as(ADMIN)).send({ status: 'banana' });
  expect(bad.status).toBe(400);

  const missing = await request(app).put(`/admin/support/tickets/${fx('asp-nope')}/status`).set(as(ADMIN)).send({ status: 'resolved' });
  expect(missing.status).toBe(404);
});

test('the auto-reply setting reads back what was saved', async () => {
  const before = await request(app).get('/admin/support/auto-reply').set(as(ADMIN));
  expect(before.status).toBe(200);
  expect(before.body.data.enabled).toBe(false);

  const bad = await request(app).post('/admin/support/auto-reply').set(as(ADMIN)).send({ enabled: 'yes', message: 'hi' });
  expect(bad.status).toBe(400);

  const save = await request(app).post('/admin/support/auto-reply').set(as(ADMIN)).send({ enabled: true, message: 'We reply within a day.' });
  expect(save.status).toBe(200);

  const after = await request(app).get('/admin/support/auto-reply').set(as(ADMIN));
  expect(after.body.data).toEqual({ enabled: true, message: 'We reply within a day.' });
});
