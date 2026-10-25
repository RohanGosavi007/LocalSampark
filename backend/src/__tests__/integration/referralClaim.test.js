/**
 * POST /engagement/referral/claim pays coins to two accounts.
 *
 * It checked for an earlier claim, then inserted and paid in five separate
 * statements. Two requests sent together both passed the check and both paid.
 */

process.env.USE_SQLITE = 'true';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryOne, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const REFERRER = 'rfc-referrer';
const NEWCOMER = 'rfc-newcomer';

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
// The one coin balance (services/coins.service.js), which the apps show.
const coins = async (id) => Number((await queryOne('SELECT sampark_coins_balance FROM loyalty_accounts WHERE user_id = $1', [id]))?.sampark_coins_balance || 0);

let app;

async function cleanup() {
  await query("DELETE FROM loyalty_transactions WHERE user_id LIKE 'rfc-%'");
  await query("DELETE FROM loyalty_accounts WHERE user_id LIKE 'rfc-%'");
  await query("DELETE FROM referrals WHERE referee_id LIKE 'rfc-%' OR referrer_id LIKE 'rfc-%'");
  await query("DELETE FROM users WHERE id LIKE 'rfc-%'");
}

beforeAll(async () => {
  await cleanup();
  await query("INSERT INTO users (id, full_name, phone_number, role, my_referral_code, total_coins) VALUES ($1, 'RFC Referrer', '9811300001', 'user', 'RFCCODE1', 0)", [REFERRER]);
  await query("INSERT INTO users (id, full_name, phone_number, role, my_referral_code, total_coins) VALUES ($1, 'RFC Newcomer', '9811300002', 'user', 'RFCCODE2', 0)", [NEWCOMER]);

  app = express();
  app.use(express.json());
  app.use('/engagement', require('../../modules/crm/routes/engagement.routes'));
});

afterAll(cleanup);

const claim = (userId, referralCode) => request(app).post('/engagement/referral/claim').set(as(userId)).send({ referralCode });

test('a code is claimed once, however the requests arrive', async () => {
  const results = await Promise.all([claim(NEWCOMER, 'RFCCODE1'), claim(NEWCOMER, 'RFCCODE1'), claim(NEWCOMER, 'RFCCODE1')]);

  expect(results.filter((r) => r.status === 200)).toHaveLength(1);
  expect(results.filter((r) => r.status === 400)).toHaveLength(2);

  expect(await coins(REFERRER)).toBe(500);
  expect(await coins(NEWCOMER)).toBe(200);
  expect(await queryMany('SELECT id FROM referrals WHERE referee_id = $1', [NEWCOMER])).toHaveLength(1);
  expect(await queryMany("SELECT id FROM loyalty_transactions WHERE user_id LIKE 'rfc-%'")).toHaveLength(2);

  // And not again later, with this code or another.
  expect((await claim(NEWCOMER, 'RFCCODE1')).status).toBe(400);
  expect(await coins(REFERRER)).toBe(500);
});

test('your own code, a made-up code and no code are refused', async () => {
  expect((await claim(REFERRER, 'RFCCODE1')).status).toBe(400);
  expect((await claim(REFERRER, 'NO-SUCH-CODE')).status).toBe(404);
  expect((await claim(REFERRER, '')).status).toBe(400);
  expect(await coins(REFERRER)).toBe(500);
});

test('the table itself allows one claim per account', async () => {
  let message = null;
  try {
    await query(
      "INSERT INTO referrals (id, referrer_id, referee_id, referral_code, status, reward_issued) VALUES ('rfc-second', $1, $2, 'RFCCODE1', 'completed', 1)",
      [REFERRER, NEWCOMER]
    );
  } catch (err) {
    message = err.message;
  }
  expect(message).toMatch(/UNIQUE/i);
});
