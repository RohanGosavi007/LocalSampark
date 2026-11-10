/**
 * SamparkCoins: one balance, and no way to make coins from nothing.
 *
 * Coins were spread over three tables (see services/coins.service.js). Earned
 * rewards never reached the balance the apps show; spending drew on a table
 * nothing ever credited; and several flows minted coins — a negative
 * lost-and-found bounty, a self-posted, self-claimed, self-completed
 * volunteering bounty, a resident collecting their own scrap donation, and a
 * burst of daily-wheel spins.
 */


const { fx, fxLike } = require('../helpers/fixtureIds');
const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryOne, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const coins = require('../../services/coins.service');

const ANNA = fx('coin-anna');
const BEN = fx('coin-ben');
const CARA = fx('coin-cara');
const ADMIN = fx('coin-admin');
const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });

let app;
const balanceOf = (userId) => coins.balance(userId);
const setCoins = async (userId, n) => {
  await query('INSERT INTO loyalty_accounts (user_id, sampark_coins_balance) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET sampark_coins_balance = $2', [userId, n]);
};

async function cleanup() {
  await query(`DELETE FROM user_badges WHERE CAST(user_id AS TEXT) LIKE '${fxLike('coin')}'`);
  await query("DELETE FROM volunteer_tasks WHERE CAST(poster_id AS TEXT) LIKE 'coin-%'");
  await query(`DELETE FROM scrap_pickups WHERE CAST(user_id AS TEXT) LIKE '${fxLike('coin')}'`);
  await query(`DELETE FROM garage_sale_items WHERE CAST(seller_id AS TEXT) LIKE '${fxLike('coin')}'`);
  await query(`DELETE FROM lost_found_alerts WHERE CAST(user_id AS TEXT) LIKE '${fxLike('coin')}'`);
  await query(`DELETE FROM referrals WHERE CAST(referee_id AS TEXT) LIKE '${fxLike('coin')}'`);
  await query(`DELETE FROM reward_coins_ledger WHERE CAST(user_id AS TEXT) LIKE '${fxLike('coin')}'`);
  await query("DELETE FROM loyalty_wallets WHERE CAST(user_id AS TEXT) LIKE 'coin-%'");
  await query(`DELETE FROM loyalty_transactions WHERE CAST(user_id AS TEXT) LIKE '${fxLike('coin')}'`);
  await query(`DELETE FROM loyalty_accounts WHERE CAST(user_id AS TEXT) LIKE '${fxLike('coin')}'`);
  await query(`DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE CAST(user_id AS TEXT) LIKE '${fxLike('coin')}')`);
  await query(`DELETE FROM wallets WHERE CAST(user_id AS TEXT) LIKE '${fxLike('coin')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('coin')}'`);
}

beforeAll(async () => {
  await cleanup();
  for (const [id, phone, role, code] of [
    [ANNA, '9810200001', 'user', 'COINANNA'], [BEN, '9810200002', 'user', null],
    [CARA, '9810200003', 'user', null], [ADMIN, '9810200004', 'admin', null],
  ]) {
    await query('INSERT INTO users (id, full_name, phone_number, role, my_referral_code) VALUES ($1, $5, $2, $3, $4)', [id, phone, role, code, id]);
  }

  app = express();
  app.use(express.json());
  app.use('/loyalty', require('../../modules/core/routes/loyalty.routes'));
  app.use('/community-hub', require('../../modules/community/routes/community_hub.routes'));
  app.use('/volunteer', require('../../modules/community/routes/volunteer.routes'));
  app.use('/engagement', require('../../modules/crm/routes/engagement.routes'));
  app.use('/scrap', require('../../modules/community/routes/scrap.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use(require('../../middleware/error.middleware').errorHandler);
});

afterAll(cleanup);

describe('the coin service', () => {
  test('credits, debits only what is there, and moves coins both ways or not at all', async () => {
    await setCoins(ANNA, 0);
    await coins.credit({ userId: ANNA, amount: 300, reason: 'test' });
    await expect(coins.debit({ userId: ANNA, amount: 500, reason: 'test' })).rejects.toMatchObject({ code: 'INSUFFICIENT_COINS' });
    expect(await balanceOf(ANNA)).toBe(300);

    await coins.transfer({ fromUserId: ANNA, toUserId: BEN, amount: 100, reason: 'test' });
    expect(await balanceOf(ANNA)).toBe(200);
    expect(await balanceOf(BEN)).toBe(100);

    for (const bad of [0, -5, 1.5, 'ten']) {
      await expect(coins.credit({ userId: ANNA, amount: bad, reason: 'test' })).rejects.toMatchObject({ code: 'INVALID_COINS' });
    }
  });
});

describe('the daily wheel', () => {
  test('a burst of spins wins once', async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => request(app).post('/loyalty/spin').set(as(CARA))));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 429)).toHaveLength(4);
    const spins = await queryMany("SELECT amount FROM loyalty_transactions WHERE user_id = $1 AND description = 'Fortune Wheel'", [CARA]);
    expect(spins).toHaveLength(1);
    expect(await balanceOf(CARA)).toBe(Number(spins[0].amount));
  });
});

describe('redeeming coins', () => {
  test('moves coins out and wallet money in, together', async () => {
    await setCoins(BEN, 250);
    const res = await request(app).post('/loyalty/redeem').set(as(BEN)).send({ amountToRedeem: 200 });
    expect(res.status).toBe(200);
    expect(await balanceOf(BEN)).toBe(50);
    expect(Number((await queryOne('SELECT balance FROM wallets WHERE user_id = $1', [BEN])).balance)).toBe(20);

    expect((await request(app).post('/loyalty/redeem').set(as(BEN)).send({ amountToRedeem: 100 })).status).toBe(400);
    expect(await balanceOf(BEN)).toBe(50);
  });
});

describe('lost and found', () => {
  test('a negative bounty is refused; a real one is held from the poster', async () => {
    await setCoins(ANNA, 1000);
    expect((await request(app).post('/community-hub/lost/post').set(as(ANNA)).send({ itemName: 'Cat', bountyCoins: -100000 })).status).toBe(400);
    expect(await balanceOf(ANNA)).toBe(1000);

    expect((await request(app).post('/community-hub/lost/post').set(as(ANNA)).send({ itemName: 'Dog', bountyCoins: 5000 })).status).toBe(402);

    const res = await request(app).post('/community-hub/lost/post').set(as(ANNA)).send({ itemName: 'Keys', bountyCoins: 300 });
    expect(res.status).toBe(201);
    expect(await balanceOf(ANNA)).toBe(700);

    const id = res.body.data.id;
    expect((await request(app).post(`/community-hub/lost/${id}/resolve`).set(as(ANNA)).send({ finderId: ANNA })).status).toBe(400);
    expect((await request(app).post(`/community-hub/lost/${id}/resolve`).set(as(BEN)).send({ finderId: BEN })).status).toBe(404);

    const before = await balanceOf(BEN);
    expect((await request(app).post(`/community-hub/lost/${id}/resolve`).set(as(ANNA)).send({ finderId: BEN })).status).toBe(200);
    expect(await balanceOf(BEN)).toBe(before + 300);
    expect((await request(app).post(`/community-hub/lost/${id}/resolve`).set(as(ANNA)).send({ finderId: BEN })).status).toBe(409);
    expect(await balanceOf(BEN)).toBe(before + 300);
  });
});

describe('garage sale', () => {
  test('coins move from buyer to seller once; nobody buys their own item or what they cannot afford', async () => {
    await setCoins(ANNA, 0);
    await setCoins(BEN, 100);
    await setCoins(CARA, 1000);
    const posted = await request(app).post('/community-hub/garage/post').set(as(ANNA)).send({ itemName: 'Lamp', priceCoins: 400 });
    expect(posted.status).toBe(201);
    const id = posted.body.data.id;

    expect((await request(app).post('/community-hub/garage/post').set(as(ANNA)).send({ itemName: 'Free money', priceCoins: -5 })).status).toBe(400);
    expect((await request(app).post(`/community-hub/garage/${id}/buy`).set(as(ANNA))).status).toBe(400);
    expect((await request(app).post(`/community-hub/garage/${id}/buy`).set(as(BEN))).status).toBe(402);
    expect((await queryOne('SELECT status FROM garage_sale_items WHERE id = $1', [id])).status).toBe('available');

    expect((await request(app).post(`/community-hub/garage/${id}/buy`).set(as(CARA))).status).toBe(200);
    expect(await balanceOf(CARA)).toBe(600);
    expect(await balanceOf(ANNA)).toBe(400);
    expect((await request(app).post(`/community-hub/garage/${id}/buy`).set(as(CARA))).status).toBe(404);
  });
});

describe('volunteering bounties', () => {
  test('held from the poster, never claimed by them, paid when the poster confirms', async () => {
    await setCoins(ANNA, 500);
    await setCoins(BEN, 0);

    expect((await request(app).post('/volunteer/post').set(as(ANNA)).send({ title: 'Too rich', bountyCoins: 9999 })).status).toBe(402);
    expect((await request(app).post('/volunteer/post').set(as(ANNA)).send({ title: 'Clean park', bountyCoins: 200 })).status).toBe(201);
    expect(await balanceOf(ANNA)).toBe(300);
    const task = await queryOne("SELECT id FROM volunteer_tasks WHERE CAST(poster_id AS TEXT) = $1 AND title = 'Clean park'", [ANNA]);

    expect((await request(app).post(`/volunteer/${task.id}/volunteer`).set(as(ANNA))).status).toBe(409);
    expect((await request(app).post(`/volunteer/${task.id}/volunteer`).set(as(BEN))).status).toBe(200);

    // The volunteer cannot pay themselves.
    expect((await request(app).post(`/volunteer/${task.id}/complete`).set(as(BEN))).status).toBe(403);
    expect(await balanceOf(BEN)).toBe(0);

    expect((await request(app).post(`/volunteer/${task.id}/complete`).set(as(ANNA))).status).toBe(200);
    expect(await balanceOf(BEN)).toBe(200);
    expect((await request(app).post(`/volunteer/${task.id}/complete`).set(as(ANNA))).status).toBe(409);
    expect(await balanceOf(BEN)).toBe(200);
  });

  test('an untaken task can be called off and the bounty comes back', async () => {
    await setCoins(ANNA, 100);
    await request(app).post('/volunteer/post').set(as(ANNA)).send({ title: 'Paint wall', bountyCoins: 100 });
    const task = await queryOne("SELECT id FROM volunteer_tasks WHERE CAST(poster_id AS TEXT) = $1 AND title = 'Paint wall'", [ANNA]);
    expect(await balanceOf(ANNA)).toBe(0);
    expect((await request(app).post(`/volunteer/${task.id}/cancel`).set(as(BEN))).status).toBe(404);
    expect((await request(app).post(`/volunteer/${task.id}/cancel`).set(as(ANNA))).status).toBe(200);
    expect(await balanceOf(ANNA)).toBe(100);
  });
});

describe('scrap donations', () => {
  test('a resident cannot collect their own pickup, and the reward is once a week', async () => {
    await setCoins(ANNA, 0);
    const schedule = () => request(app).post('/scrap/schedule').set(as(ANNA))
      .send({ address: '1 Test Road', preferred_time: 'morning', scrap_type: 'paper', payout_preference: 'donate', pincode: '411001' });
    expect((await schedule()).status).toBe(201);
    expect((await schedule()).status).toBe(201);
    const pickups = await queryMany('SELECT id FROM scrap_pickups WHERE user_id = $1 ORDER BY created_at', [ANNA]);

    expect((await request(app).post(`/scrap/${pickups[0].id}/accept`).set(as(ANNA))).status).toBe(409);

    for (const { id } of pickups) {
      expect((await request(app).post(`/scrap/${id}/accept`).set(as(BEN))).status).toBe(200);
      expect((await request(app).post(`/scrap/${id}/complete`).set(as(BEN))).status).toBe(200);
    }
    expect(await balanceOf(ANNA)).toBe(500);
  });
});

describe('referrals', () => {
  test('reward both people on the balance the app shows', async () => {
    await setCoins(ANNA, 0);
    await setCoins(CARA, 0);
    const before = await balanceOf(CARA);
    expect((await request(app).post('/engagement/referral/claim').set(as(CARA)).send({ referralCode: 'COINANNA' })).status).toBe(200);
    expect(await balanceOf(ANNA)).toBe(500);
    expect(await balanceOf(CARA)).toBe(before + 200);

    const shown = await request(app).get('/engagement/rewards/balance').set(as(CARA));
    expect(shown.body.coins).toBe(before + 200);
    const loyalty = await request(app).get('/loyalty/balance').set(as(CARA));
    expect(loyalty.body.data.totalCoins).toBe(before + 200);
  });
});

describe('migration 123', () => {
  test('carries old rewards and community-wallet coins across, once', async () => {
    await setCoins(BEN, 10);
    await query(`INSERT INTO reward_coins_ledger (id, user_id, amount, transaction_type, description) VALUES ('${fx('coin-r1')}', $1, 150, 'credit', 'old reward')`, [BEN]);
    await query(`INSERT INTO reward_coins_ledger (id, user_id, amount, transaction_type, description) VALUES ('${fx('coin-r2')}', $1, 50, 'credit', 'old reward')`, [BEN]);
    await query('INSERT INTO loyalty_wallets (user_id, total_coins) VALUES ($1, 40)', [BEN]);

    const sql = fs.readFileSync(path.join(__dirname, `../../migrations/123_merge_coin_ledgers${process.env.USE_SQLITE === 'true' ? '.sqlite' : ''}.sql`), 'utf8')
      .replace(/--.*$/gm, '')
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s && !/^(BEGIN|COMMIT)$/i.test(s));
    for (let run = 0; run < 2; run += 1) {
      for (const statement of sql) await query(statement);
    }

    expect(await balanceOf(BEN)).toBe(10 + 200 + 40);
    const markers = await queryMany("SELECT reference_id, amount FROM loyalty_transactions WHERE user_id = $1 AND reference_id LIKE 'merge:%' ORDER BY reference_id", [BEN]);
    expect(markers).toEqual([
      { reference_id: 'merge:loyalty_wallets', amount: 40 },
      { reference_id: 'merge:reward_coins_ledger', amount: 200 },
    ]);
  });
});
