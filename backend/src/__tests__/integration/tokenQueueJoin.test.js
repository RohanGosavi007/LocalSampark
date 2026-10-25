/**
 * Joining a shop's queue.
 *
 *   - the visitor is the signed-in caller (a `userId` in the body used to be trusted)
 *   - joining twice on one day returns the first token instead of taking a second place
 */

process.env.USE_SQLITE = 'true';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const ME = 'tq-me';
const OTHER = 'tq-other';
const SHOP = 'tq-shop';
const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId, tokenVersion: 0 }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;

async function cleanup() {
  await query("DELETE FROM token_queue_visitors WHERE shop_id = 'tq-shop'");
  await query("DELETE FROM token_queues WHERE shop_id = 'tq-shop'");
  await query("DELETE FROM local_shops WHERE id = 'tq-shop'");
  await query("DELETE FROM users WHERE id LIKE 'tq-%'");
}

beforeAll(async () => {
  await cleanup();
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'Me', '9864000001', 'user')", [ME]);
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'Other', '9864000002', 'user')", [OTHER]);
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, is_active)
     VALUES ($1, $2, 'TQ Clinic', 'Clinic', 'Road 1', 'POINT(73.8 18.5)', 18.5, 73.8, 1)`,
    [SHOP, OTHER]
  );
  app = express();
  app.use(express.json());
  app.use('/token-queue', require('../../modules/core/routes/token-queue.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
});

afterAll(cleanup);

test('joining needs a signed-in user', async () => {
  const res = await request(app).post(`/token-queue/${SHOP}/join`).send({});
  expect(res.status).toBe(401);
});

test('the place is taken in the caller\'s name, not the body\'s, and joining twice returns the same token', async () => {
  const first = await request(app).post(`/token-queue/${SHOP}/join`).set(as(ME)).send({ userId: OTHER });
  expect(first.status).toBe(201);
  expect(first.body.tokenNumber).toBe(1);

  const rows = await query("SELECT user_id FROM token_queue_visitors WHERE shop_id = 'tq-shop'");
  expect((rows.rows || rows).map((r) => r.user_id)).toEqual([ME]);

  const again = await request(app).post(`/token-queue/${SHOP}/join`).set(as(ME)).send({});
  expect(again.status).toBe(200);
  expect(again.body.tokenNumber).toBe(1);
  expect(again.body.alreadyJoined).toBe(true);

  const other = await request(app).post(`/token-queue/${SHOP}/join`).set(as(OTHER)).send({});
  expect(other.body.tokenNumber).toBe(2);
});

test('the public queue state reports the people waiting', async () => {
  const res = await request(app).get(`/token-queue/${SHOP}`);
  expect(res.status).toBe(200);
  expect(res.body.waitingCount).toBe(2);
});
