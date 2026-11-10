/**
 * C1 — public account deletion request is verified before it is queued.
 *
 * Runs on whichever engine the suite is started with (no SQLite pin): user ids
 * are UUIDs and the only table touched is data_subject_requests.
 */
const crypto = require('crypto');
const express = require('express');
const request = require('supertest');

const sent = [];
jest.mock('../../modules/core/services/sms.service', () => {
  const actual = jest.requireActual('../../modules/core/services/sms.service');
  return {
    ...actual,
    sendOTP: jest.fn(async (to, code) => { sent.push({ via: 'sms', to, code }); return { success: true, provider: 'test' }; }),
  };
});
jest.mock('../../modules/core/services/email.service', () => {
  const actual = jest.requireActual('../../modules/core/services/email.service');
  return {
    ...actual,
    sendEmail: jest.fn(async (to, subject, html) => {
      const m = /<strong>([0-9]{6})<\/strong>/.exec(html);
      sent.push({ via: 'email', to, code: m && m[1] });
      return { success: true };
    }),
  };
});

const { query, queryOne } = require('../../config/database');

const userId = crypto.randomUUID();
const suffix = String(Date.now()).slice(-7);
const phone = `+91987${suffix}`;
const email = `dsr-${suffix}@example.test`;

let app;
beforeAll(async () => {
  await query(
    'INSERT INTO users (id, phone_number, email, full_name, role) VALUES ($1, $2, $3, $4, $5)',
    [userId, phone, email, 'Deletion Test', 'user']
  );
  app = express();
  app.use(express.json());
  app.use('/users', require('../../modules/core/routes/privacy.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
});

afterAll(async () => {
  await query('DELETE FROM data_subject_requests WHERE user_id = $1', [userId]);
  await query('DELETE FROM users WHERE id = $1', [userId]);
});

beforeEach(() => { sent.length = 0; });

const queued = async () =>
  Number((await queryOne("SELECT COUNT(*) AS n FROM data_subject_requests WHERE user_id = $1 AND request_type = 'erasure'", [userId])).n);

test('[C1.1] the first step answers the same for a known and an unknown account and queues nothing', async () => {
  const known = await request(app).post('/users/account-deletion-request').send({ identifier: phone });
  const unknown = await request(app).post('/users/account-deletion-request').send({ identifier: '+919999000111' });

  expect(known.status).toBe(200);
  expect(unknown.status).toBe(200);
  expect(Object.keys(known.body).sort()).toEqual(Object.keys(unknown.body).sort());
  expect(known.body.message).toBe(unknown.body.message);
  expect(known.body.verificationRequired).toBe(true);
  expect(known.body.requestId).toMatch(/^[0-9a-f-]{36}$/);

  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatchObject({ via: 'sms', to: phone });
  expect(await queued()).toBe(0);
});

test('[C1.2] the correct code queues exactly one erasure request for that account', async () => {
  const start = await request(app).post('/users/account-deletion-request').send({ identifier: phone, reason: 'moving away' });
  const { code } = sent[0];

  const ok = await request(app).post('/users/account-deletion-request/verify').send({ requestId: start.body.requestId, code });
  expect(ok.status).toBe(200);
  expect(ok.body.success).toBe(true);
  expect(await queued()).toBe(1);

  const row = await queryOne('SELECT status, reason FROM data_subject_requests WHERE id = $1', [start.body.requestId]);
  expect(row.status).toBe('pending');
  expect(JSON.parse(row.reason)).toMatchObject({ reason: 'moving away', verified_via: 'phone' });

  // Single use: the same code cannot queue it again.
  const replay = await request(app).post('/users/account-deletion-request/verify').send({ requestId: start.body.requestId, code });
  expect(replay.status).toBe(400);
  expect(await queued()).toBe(1);
});

test('[C1.3] a wrong code, or a code for an unknown request, queues nothing', async () => {
  const before = await queued();
  const start = await request(app).post('/users/account-deletion-request').send({ identifier: phone });
  const wrongCode = sent[0].code === '000000' ? '111111' : '000000';

  const wrong = await request(app).post('/users/account-deletion-request/verify').send({ requestId: start.body.requestId, code: wrongCode });
  expect(wrong.status).toBe(400);

  const unknown = await request(app).post('/users/account-deletion-request/verify').send({ requestId: crypto.randomUUID(), code: '123456' });
  expect(unknown.status).toBe(400);
  expect(unknown.body.error).toBe(wrong.body.error);

  expect(await queued()).toBe(before);
});

test('[C1.4] an email identifier gets its code by email, case-insensitively', async () => {
  const start = await request(app).post('/users/account-deletion-request').send({ identifier: email.toUpperCase() });
  expect(start.status).toBe(200);
  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatchObject({ via: 'email', to: email });
  expect(sent[0].code).toMatch(/^[0-9]{6}$/);
});

test('[C1.5] malformed input is refused before any lookup', async () => {
  expect((await request(app).post('/users/account-deletion-request').send({})).status).toBe(400);
  expect((await request(app).post('/users/account-deletion-request').send({ identifier: 'not a contact' })).status).toBe(400);
  expect((await request(app).post('/users/account-deletion-request').send({ identifier: phone, reason: 'x'.repeat(1001) })).status).toBe(400);
  expect((await request(app).post('/users/account-deletion-request/verify').send({ requestId: 'abc', code: '123456' })).status).toBe(400);
  expect((await request(app).post('/users/account-deletion-request/verify').send({ requestId: crypto.randomUUID(), code: '12ab' })).status).toBe(400);
  expect(sent).toHaveLength(0);
});
