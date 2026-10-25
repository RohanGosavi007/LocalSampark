/**
 * Two endpoints that recorded success without anything having happened.
 *
 *   POST /premium/subscribe  inserted a 'SamparkPlus' subscription for whoever
 *                            called it: free, repeatable, no price. It now opens a
 *                            Razorpay checkout at the server's price; the membership
 *                            starts when the verified payment settles.
 *   POST /bills/pay          marked a bill 'completed' on the client's say-so —
 *                            no money moved, no biller was told — and credited a
 *                            franchise 1% commission on the client's `amount`,
 *                            which was never validated.
 *
 * Neither had a payment or biller behind it. The first is now a paid checkout;
 * the second takes the money from the caller's wallet, atomically, before
 * recording anything, and records the bill as 'processing'.
 */

process.env.USE_SQLITE = 'true';

const crypto = require('crypto');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const USER = 'bp-user';
const PARTNER_USER = 'bp-partner';
const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;

const balance = async () => Number((await queryOne('SELECT balance FROM wallets WHERE user_id = $1', [USER])).balance);
const bills = async () => (await query('SELECT * FROM utility_bills WHERE user_id = $1', [USER])).rows;

async function cleanup() {
  await query("DELETE FROM franchise_earnings WHERE franchise_id LIKE 'bp-%'");
  await query("DELETE FROM franchise_partners WHERE id LIKE 'bp-%'");
  await query("DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id LIKE 'bp-%')");
  await query("DELETE FROM wallets WHERE user_id LIKE 'bp-%'");
  await query("DELETE FROM utility_bills WHERE user_id LIKE 'bp-%'");
  await query("DELETE FROM user_subscriptions WHERE user_id LIKE 'bp-%'");
  await query("DELETE FROM payments WHERE user_id LIKE 'bp-%'");
  await query("DELETE FROM users WHERE id LIKE 'bp-%'");
  await query("DELETE FROM regions WHERE id LIKE 'bp-%'");
}

beforeAll(async () => {
  await cleanup();
  await query(
    `INSERT INTO regions (id, name, state, country, latitude, longitude, pincode) VALUES ('bp-region', 'BP Region', 'MH', 'India', 18.5, 73.8, '411999')`
  );
  await query("INSERT INTO users (id, full_name, phone_number, role, region_id) VALUES ($1, 'Payer', '9860900001', 'user', 'bp-region')", [USER]);
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'Partner', '9860900002', 'user')", [PARTNER_USER]);

  app = express();
  app.use(express.json());
  app.use('/premium', require('../../modules/ecommerce/routes/premium.routes'));
  app.use('/bills', require('../../modules/ecommerce/routes/bills.routes'));
  app.use('/payments', require('../../modules/ecommerce/routes/payment.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
});

afterAll(async () => { delete process.env.BILL_PAY_ENABLED; await cleanup(); });

// The gateway is the only thing faked: orders are "created" without calling Razorpay.
jest.mock('../../services/razorpay.service', () => ({
  ...jest.requireActual('../../services/razorpay.service'),
  isConfigured: () => true,
  createOrder: jest.fn(async ({ amountPaise, receipt }) => ({ id: `order_${receipt}`, amount: amountPaise })),
}));
const paymentsService = require('../../services/payments.service');

describe('SamparkPlus', () => {
  const plusRows = async () => (await query("SELECT * FROM user_subscriptions WHERE user_id = $1 AND tier = 'SamparkPlus'", [USER])).rows;
  const status = async () => (await request(app).get('/premium/status').set(as(USER))).body;
  const toMs = (v) => Date.parse(String(v).replace(' ', 'T') + 'Z');
  const daysFromNow = (v) => (toMs(v) - Date.now()) / 86400000;
  const latestPayment = () => queryOne("SELECT * FROM payments WHERE user_id = $1 AND purpose = 'sampark_plus' ORDER BY created_at DESC, id DESC LIMIT 1", [USER]);

  async function pay() {
    // By the gateway order the checkout names, not "the latest row": two payments created
    // in the same second would otherwise be indistinguishable.
    const checkout = await paymentsService.createPayment({ user: { id: USER }, purpose: 'sampark_plus', amount: 1 });
    return queryOne('SELECT * FROM payments WHERE gateway_order_id = $1', [checkout.razorpayOrderId]);
  }

  test('the plan and its price come from the server', async () => {
    const res = await request(app).get('/premium/plan');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ tier: 'SamparkPlus', priceMonthly: 99, periodDays: 30, currency: 'INR' });
  });

  test('requires sign-in', async () => {
    expect((await request(app).post('/premium/subscribe').send({})).status).toBe(401);
  });

  test("subscribing opens a checkout at the SERVER's price and grants nothing yet", async () => {
    // The request tries to name its own price. It is ignored.
    const res = await request(app).post('/premium/subscribe').set(as(USER)).send({ amount: 1, price: 1, amount_paise: 100 });
    expect(res.status).toBe(201);
    const payment = await latestPayment();
    expect(Number(payment.amount_paise)).toBe(9900);
    expect(payment.status).toBe('created');
    expect(await plusRows()).toHaveLength(0);
    expect((await status()).isPremium).toBe(false);
  });

  test('through the apps endpoint, a request cannot name its price either', async () => {
    const res = await request(app).post('/payments/razorpay/order').set(as(USER)).send({ purpose: 'sampark_plus', amount: 1, amount_paise: 100 });
    expect(res.status).toBeLessThan(300);
    expect(JSON.stringify(res.body)).toContain('9900');
    expect(Number((await latestPayment()).amount_paise)).toBe(9900);
  });

  test('the membership starts when the payment settles, for 30 days', async () => {
    const payment = await pay();
    expect(await paymentsService.settle(payment, 'pay_test_1')).toEqual({ settled: true, alreadyPaid: false });

    const rows = await plusRows();
    expect(rows).toHaveLength(1);
    expect(daysFromNow(rows[0].tier_expires_at)).toBeGreaterThan(29.9);
    expect(daysFromNow(rows[0].tier_expires_at)).toBeLessThan(30.1);
    expect(await status()).toMatchObject({ isPremium: true, tier: 'SamparkPlus' });
  });

  test('a replayed webhook or verify call does not extend it twice', async () => {
    const [before] = await plusRows();
    const payment = await queryOne("SELECT * FROM payments WHERE status = 'paid' AND user_id = $1 AND purpose = 'sampark_plus'", [USER]);
    expect(await paymentsService.settle(payment, 'pay_test_1')).toEqual({ settled: false, alreadyPaid: true });
    const after = await plusRows();
    expect(after).toHaveLength(1);
    expect(after[0].tier_expires_at).toBe(before.tier_expires_at);
  });

  test('paying again while a membership runs adds a period to the end of it', async () => {
    const [before] = await plusRows();
    await paymentsService.settle(await pay(), 'pay_test_2');
    const rows = await plusRows();
    expect(rows).toHaveLength(1); // extended, not duplicated
    expect(daysFromNow(rows[0].tier_expires_at)).toBeGreaterThan(59.9);
    expect(toMs(rows[0].tier_expires_at)).toBeGreaterThan(toMs(before.tier_expires_at));
  });

  test('a lapsed membership is not premium, and the hourly job marks it expired', async () => {
    await query("UPDATE user_subscriptions SET tier_expires_at = '2000-01-01 00:00:00' WHERE user_id = $1 AND tier = 'SamparkPlus'", [USER]);
    expect((await status()).isPremium).toBe(false);
    const { expireSubscriptions } = require('../../jobs/subscription-expiry.job');
    const result = await expireSubscriptions();
    expect(result.memberships).toBeGreaterThanOrEqual(1);
    expect((await plusRows())[0].status).toBe('expired');
  });

  test('a free membership handed out by the old endpoint (no end date) is not premium and is lapsed', async () => {
    await query('DELETE FROM user_subscriptions WHERE user_id = $1', [USER]);
    await query("INSERT INTO user_subscriptions (id, user_id, tier, status, start_date) VALUES ($1, $2, 'SamparkPlus', 'active', CURRENT_TIMESTAMP)", [crypto.randomUUID(), USER]);
    expect((await status()).isPremium).toBe(false);
    const { expireSubscriptions } = require('../../jobs/subscription-expiry.job');
    await expireSubscriptions();
    expect((await plusRows())[0].status).toBe('expired');
  });

  test('a milk-delivery subscription does not make anyone premium', async () => {
    await query('DELETE FROM user_subscriptions WHERE user_id = $1', [USER]);
    await query("INSERT INTO user_subscriptions (id, user_id, status) VALUES ($1, $2, 'active')", [crypto.randomUUID(), USER]);
    expect((await status()).isPremium).toBe(false);
  });
});

describe('bill payment', () => {
  test('can be switched off, and then takes nothing', async () => {
    process.env.BILL_PAY_ENABLED = 'false';
    expect((await request(app).get('/bills/status')).body.available).toBe(false);
    const res = await request(app).post('/bills/pay').set(as(USER)).send({ provider: 'tata', amount: 500 });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('BILL_PAY_UNAVAILABLE');
    expect(await bills()).toHaveLength(0);
    delete process.env.BILL_PAY_ENABLED;
    expect((await request(app).get('/bills/status')).body.available).toBe(true); // open by default
  });

  describe('when open (the default)', () => {
    beforeAll(async () => {
      delete process.env.BILL_PAY_ENABLED;
      await query("INSERT INTO wallets (id, user_id, balance) VALUES ('bp-wallet', $1, 1000)", [USER]);
      await query(
        `INSERT INTO franchise_partners (id, user_id, region_id, territory_name, territory_pincode, status)
         VALUES ('bp-partner', $1, 'bp-region', 'BP Territory', '411999', 'active')`,
        [PARTNER_USER]
      );
    });

    test.each([
      ['a negative amount', { provider: 'tata', amount: -50 }],
      ['zero', { provider: 'tata', amount: 0 }],
      ['text', { provider: 'tata', amount: 'lots' }],
      ['more than the cap', { provider: 'tata', amount: 1e9 }],
      ['no amount', { provider: 'tata' }],
      ['no provider', { amount: 100 }],
    ])('rejects %s and touches nothing', async (_label, body) => {
      const before = await balance();
      const res = await request(app).post('/bills/pay').set(as(USER)).send(body);
      expect(res.status).toBe(400);
      expect(await balance()).toBe(before);
      expect(await bills()).toHaveLength(0);
      expect((await query("SELECT * FROM franchise_earnings WHERE franchise_id = 'bp-partner'")).rows).toHaveLength(0);
    });

    test('refuses when the wallet cannot cover it, and records nothing', async () => {
      const res = await request(app).post('/bills/pay').set(as(USER)).send({ provider: 'tata', amount: 5000 });
      expect(res.status).toBe(402);
      expect(res.body.code).toBe('INSUFFICIENT_BALANCE');
      expect(await balance()).toBe(1000);
      expect(await bills()).toHaveLength(0);
      expect((await query("SELECT * FROM franchise_earnings WHERE franchise_id = 'bp-partner'")).rows).toHaveLength(0);
    });

    test('takes the money, records a bill in progress (not completed), and credits the commission on the validated amount', async () => {
      const res = await request(app).post('/bills/pay').set(as(USER)).send({ provider: 'tata', amount: 333.337 });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('processing');

      expect(await balance()).toBeCloseTo(1000 - 333.34, 2);
      const [bill] = await bills();
      expect(bill).toMatchObject({ provider: 'tata', status: 'processing' });
      expect(Number(bill.amount)).toBeCloseTo(333.34, 2);

      const earning = await queryOne("SELECT * FROM franchise_earnings WHERE franchise_id = 'bp-partner'");
      expect(Number(earning.amount)).toBeCloseTo(3.33, 2); // 1% of 333.34, not of what the client typed
      expect(earning.reference_id).toBe(bill.id);

      const tx = await queryOne("SELECT * FROM wallet_transactions WHERE purpose = 'bill_payment' AND reference_id = $1", [bill.id]);
      expect(Number(tx.amount)).toBeCloseTo(333.34, 2);
    });
  });
});
