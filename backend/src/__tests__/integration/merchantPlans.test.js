/**
 * Buying a merchant plan from the wallet, and the plan ending.
 *
 * POST /subscriptions/vendor-saas/subscribe took the price from the request
 * (a negative one paid the caller), took the shop from the request without
 * asking whose it was, marked that shop verified, and nothing ever ended the
 * plan it started.
 */

process.env.USE_SQLITE = 'true';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryOne, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const { expireSubscriptions } = require('../../jobs/subscription-expiry.job');

const OWNER = 'mpl-owner';
const OTHER = 'mpl-other';
const SHOP = 'mpl-shop';
const OTHER_SHOP = 'mpl-shop-other';

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
const balance = async (userId) => Number((await queryOne('SELECT balance FROM wallets WHERE user_id = $1', [userId])).balance);
const shop = (id) => queryOne('SELECT is_verified, is_premium, crm_tier, commission_override_percent, premium_expires_at FROM local_shops WHERE id = $1', [id]);

let app;

async function cleanup() {
  await query("DELETE FROM vendor_subscriptions WHERE shop_id LIKE 'mpl-%'");
  await query("DELETE FROM wallet_transactions WHERE wallet_id LIKE 'mpl-%'");
  await query("DELETE FROM wallets WHERE id LIKE 'mpl-%'");
  await query("DELETE FROM local_shops WHERE id LIKE 'mpl-%'");
  await query("DELETE FROM saas_plans WHERE id LIKE 'mpl-%'");
  await query("DELETE FROM users WHERE id LIKE 'mpl-%'");
}

beforeAll(async () => {
  await cleanup();
  for (const [id, phone] of [[OWNER, '9899000001'], [OTHER, '9899000002']]) {
    await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, 'shop_owner')", [id, `MPL ${id}`, phone]);
    await query('INSERT INTO wallets (id, user_id, balance) VALUES ($1, $2, 2000)', [`mpl-wallet-${id}`, id]);
  }
  for (const [id, owner] of [[SHOP, OWNER], [OTHER_SHOP, OTHER]]) {
    await query(
      `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, is_verified)
       VALUES ($1, $2, 'MPL Shop', 'Grocery', 'Test Address', 'POINT(73.87 18.53)', 18.53, 73.87, '0')`,
      [id, owner]
    );
  }
  await query("INSERT INTO saas_plans (id, name, price_monthly, is_active) VALUES ('mpl-plan-pro', 'MPL Pro', 999, '1')");
  await query("INSERT INTO saas_plans (id, name, price_monthly, is_active) VALUES ('mpl-plan-free', 'MPL Free', 0, '1')");

  app = express();
  app.use(express.json());
  app.use('/subscriptions', require('../../modules/ecommerce/routes/subscription.routes'));
  app.use('/saas', require('../../modules/crm/routes/saas.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
});

afterAll(cleanup);

const subscribe = (userId, body) => request(app).post('/subscriptions/vendor-saas/subscribe').set(as(userId)).send(body);

test('the price is the one on the plan, whatever the request says', async () => {
  const before = await balance(OWNER);

  // What used to work: name your own price. Zero was free; negative paid out.
  const res = await subscribe(OWNER, { shopId: SHOP, planId: 'mpl-plan-pro', price: -5000 });

  expect(res.status).toBe(200);
  expect(res.body.fee_deducted).toBe(999);
  expect(await balance(OWNER)).toBe(before - 999);

  const state = await shop(SHOP);
  expect(state.is_premium).toBe(1);
  expect(state.crm_tier).toBe('premium');
  expect(state.commission_override_percent).toBe(0);
  // Buying a plan is not passing KYC.
  expect(state.is_verified).toBe(0);

  const sub = await queryOne('SELECT status, current_period_end FROM vendor_subscriptions WHERE id = $1', [res.body.subscriptionId]);
  expect(sub.status).toBe('active');
  const days = (new Date(sub.current_period_end).getTime() - Date.now()) / 86400000;
  expect(days).toBeGreaterThan(29.9);
  expect(days).toBeLessThan(30.1);
});

test('a plan cannot be bought for, or charged against, a shop that belongs to someone else', async () => {
  const before = await balance(OWNER);
  const res = await subscribe(OWNER, { shopId: OTHER_SHOP, planId: 'mpl-plan-pro' });

  expect(res.status).toBe(403);
  expect(await balance(OWNER)).toBe(before);
  const state = await shop(OTHER_SHOP);
  expect(state.is_premium).not.toBe(1);
  expect(state.is_verified).toBe(0);
});

test('without the balance nothing changes; a free or unknown plan is not sold', async () => {
  await query('UPDATE wallets SET balance = 100 WHERE user_id = $1', [OTHER]);
  const poor = await subscribe(OTHER, { shopId: OTHER_SHOP, planId: 'mpl-plan-pro' });
  expect(poor.status).toBe(402);
  expect(await balance(OTHER)).toBe(100);
  expect(await queryMany('SELECT id FROM vendor_subscriptions WHERE shop_id = $1', [OTHER_SHOP])).toEqual([]);

  expect((await subscribe(OWNER, { shopId: SHOP, planId: 'mpl-plan-free' })).status).toBe(400);
  expect((await subscribe(OWNER, { shopId: SHOP, planId: 'mpl-plan-nope' })).status).toBe(404);
  expect((await subscribe(OWNER, { shopId: SHOP })).status).toBe(400);
});

test('a plan ends when its period does, and not before', async () => {
  // Still within the period: untouched.
  await expireSubscriptions();
  expect((await shop(SHOP)).is_premium).toBe(1);

  // Thirty-one days on.
  const result = await expireSubscriptions(new Date(Date.now() + 31 * 86400000));
  expect(result.shops).toBeGreaterThanOrEqual(1);

  const state = await shop(SHOP);
  expect(state.is_premium).toBe(0);
  expect(state.crm_tier).toBe('free');
  expect(state.commission_override_percent).toBeNull();
  const subs = await queryMany('SELECT status FROM vendor_subscriptions WHERE shop_id = $1', [SHOP]);
  expect(subs.every((s) => s.status === 'expired')).toBe(true);
});

test('a commission rate set by an administrator survives the plan lapsing', async () => {
  await query(
    "UPDATE local_shops SET is_premium = '1', crm_tier = 'premium', commission_override_percent = 4.5, premium_expires_at = $1 WHERE id = $2",
    [new Date(Date.now() - 86400000).toISOString(), OTHER_SHOP]
  );
  await expireSubscriptions();
  const state = await shop(OTHER_SHOP);
  expect(state.is_premium).toBe(0);
  expect(state.commission_override_percent).toBe(4.5);
});

test('the plan list is what is in the table, not a set of invented plans', async () => {
  const res = await request(app).get('/saas/plans');
  expect(res.status).toBe(200);
  const ids = res.body.plans.map((p) => p.id);
  expect(ids).toContain('mpl-plan-pro');
  expect(ids).not.toContain('plan_growth');
  expect(ids).not.toContain('plan_enterprise');
});
