/**
 * POST /earnings/withdraw, and reading earnings.
 *
 * The withdrawal took the account to debit from the request body, accepted a
 * negative amount (which added to the balance), and reported the withdrawal
 * "processed successfully" with no payout of any kind behind it.
 */

process.env.USE_SQLITE = 'true';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryOne, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const EARNER = 'wdr-earner';
const VICTIM = 'wdr-victim';
const ADMIN = 'wdr-admin';

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
const balance = async (userId) => Number((await queryOne('SELECT balance FROM wallets WHERE user_id = $1', [userId])).balance);

let app;

async function cleanup() {
  await query("DELETE FROM payout_requests WHERE requested_by LIKE 'wdr-%'");
  await query("DELETE FROM user_earnings WHERE user_id LIKE 'wdr-%'");
  await query("DELETE FROM delivery_agents WHERE user_id LIKE 'wdr-%'");
  await query("DELETE FROM wallet_transactions WHERE wallet_id LIKE 'wdr-%'");
  await query("DELETE FROM wallets WHERE id LIKE 'wdr-%'");
  await query("DELETE FROM users WHERE id LIKE 'wdr-%'");
}

beforeAll(async () => {
  await cleanup();
  for (const [id, phone, role] of [[EARNER, '9811400001', 'user'], [VICTIM, '9811400002', 'user'], [ADMIN, '9811400003', 'super_admin']]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, `WDR ${id}`, phone, role]);
    await query('INSERT INTO wallets (id, user_id, balance) VALUES ($1, $2, 1000)', [`wdr-wallet-${id}`, id]);
  }
  await query("INSERT INTO user_earnings (id, user_id, earning_type, amount) VALUES ('wdr-earning-1', $1, 'referral', 250)", [VICTIM]);

  app = express();
  app.use(express.json());
  app.use('/earnings', require('../../modules/crm/routes/earnings.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
});

afterAll(cleanup);

const withdraw = (userId, body) => request(app).post('/earnings/withdraw').set(as(userId)).send(body);
const settle = (userId, id, body) => request(app).put(`/earnings/withdrawals/${id}`).set(as(userId)).send(body);

test("a withdrawal comes out of the caller's own wallet, whoever the request names", async () => {
  const res = await withdraw(EARNER, { userId: VICTIM, amount: 300, upiId: 'earner@upi' });

  expect(res.status).toBe(201);
  expect(res.body.status).toBe('pending');
  expect(await balance(VICTIM)).toBe(1000);
  expect(await balance(EARNER)).toBe(700);

  const row = await queryOne('SELECT requested_by, amount, status FROM payout_requests WHERE id = $1', [res.body.requestId]);
  expect(row).toEqual({ requested_by: EARNER, amount: 300, status: 'pending' });
});

test('a negative, tiny, oversized or unaddressed withdrawal is refused and moves nothing', async () => {
  const before = await balance(EARNER);

  // -5000 used to pass the balance check and add ₹5000 to the wallet.
  expect((await withdraw(EARNER, { amount: -5000, upiId: 'earner@upi' })).status).toBe(400);
  expect((await withdraw(EARNER, { amount: 5, upiId: 'earner@upi' })).status).toBe(400);
  expect((await withdraw(EARNER, { amount: 'all of it', upiId: 'earner@upi' })).status).toBe(400);
  expect((await withdraw(EARNER, { amount: 99999, upiId: 'earner@upi' })).status).toBe(400);
  expect((await withdraw(EARNER, { amount: 200 })).status).toBe(400);
  expect((await withdraw(EARNER, { amount: 200, upiId: 'not a upi id' })).status).toBe(400);

  expect(await balance(EARNER)).toBe(before);
});

test('an administrator marks a request paid, or rejects it and the money returns — once', async () => {
  const first = await withdraw(EARNER, { amount: 200, upiId: 'earner@upi' });
  const second = await withdraw(EARNER, { amount: 100, upiId: 'earner@upi' });
  const afterRequests = await balance(EARNER);

  // Not for the requester to settle.
  expect((await settle(EARNER, first.body.requestId, { action: 'paid', upiReference: 'X' })).status).toBe(403);

  expect((await settle(ADMIN, first.body.requestId, { action: 'paid' })).status).toBe(400);
  expect((await settle(ADMIN, first.body.requestId, { action: 'paid', upiReference: 'UTR123456' })).status).toBe(200);
  expect(await balance(EARNER)).toBe(afterRequests);
  expect((await queryOne('SELECT status, upi_reference FROM payout_requests WHERE id = $1', [first.body.requestId])))
    .toEqual({ status: 'paid', upi_reference: 'UTR123456' });

  const rejections = await Promise.all([
    settle(ADMIN, second.body.requestId, { action: 'rejected', reason: 'Name mismatch' }),
    settle(ADMIN, second.body.requestId, { action: 'rejected', reason: 'Name mismatch' }),
  ]);
  expect(rejections.filter((r) => r.status === 200)).toHaveLength(1);
  expect(await balance(EARNER)).toBe(afterRequests + 100);

  // A paid request cannot afterwards be rejected and refunded as well.
  expect((await settle(ADMIN, first.body.requestId, { action: 'rejected' })).status).toBe(409);
  expect(await balance(EARNER)).toBe(afterRequests + 100);
});

test('earnings are read by the person who earned them', async () => {
  expect((await request(app).get(`/earnings/user/${VICTIM}`).set(as(EARNER))).status).toBe(403);
  expect((await request(app).get(`/earnings/summary/${VICTIM}`).set(as(EARNER))).status).toBe(403);

  const own = await request(app).get(`/earnings/user/${VICTIM}`).set(as(VICTIM));
  expect(own.status).toBe(200);
  expect(own.body).toHaveLength(1);
  expect((await request(app).get(`/earnings/summary/${VICTIM}`).set(as(ADMIN))).status).toBe(200);

  // A user lists their own requests; they never see anyone else's.
  const mine = await request(app).get('/earnings/withdrawals').set(as(VICTIM));
  expect(mine.body.withdrawals).toEqual([]);
  expect((await queryMany("SELECT id FROM payout_requests WHERE requested_by = $1", [EARNER])).length).toBeGreaterThan(0);
});

test('a rider holding cash from deliveries can withdraw only what is left over it', async () => {
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ('wdr-rider', 'WDR Rider', '9811400004', 'delivery_agent')");
  await query("INSERT INTO wallets (id, user_id, balance) VALUES ('wdr-wallet-rider', 'wdr-rider', 500)");
  await query("INSERT INTO delivery_agents (id, user_id, vehicle_type, kyc_status, cash_in_hand) VALUES ('wdr-agent', 'wdr-rider', 'motorcycle', 'active', 350)");

  const refused = await withdraw('wdr-rider', { amount: 200, upiId: 'rider@upi' });
  expect(refused.status).toBe(409);
  expect(refused.body).toMatchObject({ code: 'CASH_TO_DEPOSIT', cashInHand: 350, withdrawable: 150 });
  expect(await balance('wdr-rider')).toBe(500);

  expect((await withdraw('wdr-rider', { amount: 150, upiId: 'rider@upi' })).status).toBe(201);
  expect(await balance('wdr-rider')).toBe(350);
});
