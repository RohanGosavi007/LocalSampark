/**
 * Push notifications: phones register, notifications reach them, and only
 * administrators can send arbitrary pushes.
 */


const { fx, fxLike } = require('../helpers/fixtureIds');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const push = require('../../services/push.service');
const notificationService = require('../../modules/core/services/notification.service');

const ALICE = fx('psh-alice');
const BOB = fx('psh-bob');
const ADMIN = fx('psh-admin');
const TOKEN_A = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]';
const TOKEN_GONE = 'ExponentPushToken[uninstalledxxxxxxxxxxx]';
const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });

let app;
let delivered;

async function cleanup() {
  await query(`DELETE FROM user_fcm_tokens WHERE CAST(user_id AS TEXT) LIKE '${fxLike('psh')}'`);
  await query(`DELETE FROM shop_notifications WHERE CAST(recipient_id AS TEXT) LIKE '${fxLike('psh')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('psh')}'`);
}

beforeAll(async () => {
  await cleanup();
  for (const [id, phone, role] of [[ALICE, '9840500001', 'user'], [BOB, '9840500002', 'user'], [ADMIN, '9840500003', 'admin']]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $4, $2, $3)', [id, phone, role, id]);
  }
  app = express();
  app.use(express.json());
  app.use('/notifications', require('../../modules/core/routes/notification.routes'));
});

beforeEach(() => {
  delivered = [];
  push._setTransportForTests(async (messages) => {
    delivered.push(...messages);
    return messages.map((m) => (m.to === TOKEN_GONE
      ? { status: 'error', details: { error: 'DeviceNotRegistered' } }
      : { status: 'ok', id: 'ticket' }));
  });
});

afterAll(async () => {
  push._setTransportForTests(null);
  await cleanup();
});

const tokensOf = async (userId) => (await queryMany('SELECT fcm_token FROM user_fcm_tokens WHERE user_id = $1', [userId])).map((r) => r.fcm_token);

test('a phone registers its token; nonsense is refused', async () => {
  expect((await request(app).post('/notifications/register-token').set(as(ALICE)).send({ token: 'hello' })).status).toBe(400);
  expect((await request(app).post('/notifications/register-token').set(as(ALICE)).send({ token: TOKEN_A, platform: 'ios' })).status).toBe(200);
  expect(await tokensOf(ALICE)).toEqual([TOKEN_A]);
});

test('a phone signed in as someone else stops receiving the previous user\'s notifications', async () => {
  await request(app).post('/notifications/register-token').set(as(BOB)).send({ token: TOKEN_A });
  expect(await tokensOf(ALICE)).toEqual([]);
  expect(await tokensOf(BOB)).toEqual([TOKEN_A]);

  expect((await request(app).delete('/notifications/register-token').set(as(BOB)).send({ token: TOKEN_A })).status).toBe(200);
  expect(await tokensOf(BOB)).toEqual([]);
});

test('an in-app notification is pushed to the user\'s phones', async () => {
  await request(app).post('/notifications/register-token').set(as(ALICE)).send({ token: TOKEN_A });
  await notificationService.sendToUser(ALICE, { type: 'order_update', title: 'Order ready', body: 'Your order is ready' });

  expect(delivered).toEqual([expect.objectContaining({ to: TOKEN_A, title: 'Order ready', body: 'Your order is ready' })]);
  expect(delivered[0].data).toMatchObject({ type: 'order_update' });
});

test('a token Expo says is gone is forgotten', async () => {
  await request(app).post('/notifications/register-token').set(as(ALICE)).send({ token: TOKEN_GONE });
  const result = await push.sendToUser(ALICE, { title: 'Hi', body: 'There' });
  expect(result).toEqual({ sent: 1, failed: 1 });
  expect(await tokensOf(ALICE)).toEqual([TOKEN_A]);
});

test('only an administrator can push arbitrary messages', async () => {
  const message = { targetUserId: ALICE, title: 'Your account is locked', body: 'Verify at evil.example' };
  expect((await request(app).post('/notifications/send').set(as(BOB)).send(message)).status).toBe(403);
  expect((await request(app).post('/notifications/trigger-token-queue-update').set(as(BOB)).send({ targetUserId: ALICE })).status).toBe(403);
  expect(delivered).toHaveLength(0);

  const sent = await request(app).post('/notifications/send').set(as(ADMIN)).send({ targetUserId: ALICE, title: 'Maintenance', body: 'Tonight 2am' });
  expect(sent.status).toBe(200);
  expect(sent.body).toMatchObject({ success: true, sent: 1 });
});
