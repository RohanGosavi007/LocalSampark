/**
 * P2 Payment gateway — the switch that keeps online payment off until KYC is
 * done (D4), and the reconciliation job that finds payments whose outcome was
 * never heard.
 *
 * P2.2  keys alone do not turn online payment on: ENABLE_ONLINE_PAYMENTS does.
 * P2.3  a payment Razorpay captured but whose webhook and verify call were both
 *       lost is found and settled, exactly once. Before, the order was
 *       cancelled after 30 minutes and the customer, already charged, was never
 *       refunded.
 */
const crypto = require('crypto');
const { fx, fxLike } = require('../helpers/fixtureIds');

process.env.RAZORPAY_KEY_ID = 'rzp_test_unitTestKey';
process.env.RAZORPAY_KEY_SECRET = 'unit-test-key-secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'unit-test-webhook-secret';

const express = require('express');
const request = require('supertest');
const { query, queryOne } = require('../../config/database');
const razorpay = require('../../services/razorpay.service');
const payments = require('../../services/payments.service');
const { reconcilePayments } = require('../../services/paymentReconciliation.service');
const job = require('../../jobs/payment-reconciliation.job');

const BUYER = fx('p2r-buyer');
const OWNER = fx('p2r-owner');
const SHOP = fx('p2r-shop');
const WALLET = fx('p2r-wallet');

let gateway; // gateway order id -> list of payments Razorpay holds for it (or an Error to throw)
let refunds;
const NOW = new Date();
const minutesAgo = (m) => new Date(NOW.getTime() - m * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

function installFakeGateway() {
  gateway = new Map();
  refunds = [];
  razorpay._setClientForTests({
    orders: {
      fetchPayments: async (orderId) => {
        const held = gateway.get(orderId);
        if (held instanceof Error) throw held;
        return { items: held || [] };
      },
    },
    payments: {
      refund: async (paymentId, params) => {
        refunds.push({ paymentId, ...params });
        return { id: `rfnd_${crypto.randomBytes(5).toString('hex')}` };
      },
    },
  });
}

async function cleanup() {
  await query(`DELETE FROM wallet_transactions WHERE CAST(wallet_id AS TEXT) LIKE '${fxLike('p2r')}'`);
  await query(`DELETE FROM payments WHERE CAST(user_id AS TEXT) LIKE '${fxLike('p2r')}'`);
  await query(`DELETE FROM orders WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('p2r')}'`);
  await query(`DELETE FROM wallets WHERE CAST(id AS TEXT) LIKE '${fxLike('p2r')}'`);
  await query(`DELETE FROM local_shops WHERE CAST(id AS TEXT) LIKE '${fxLike('p2r')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('p2r')}'`);
}

/** A wallet top-up payment still "created", started `ageMinutes` ago. */
async function pendingTopup({ ageMinutes, paise = 50000 }) {
  const id = crypto.randomUUID();
  const gatewayOrder = `order_${crypto.randomBytes(6).toString('hex')}`;
  await query(
    `INSERT INTO payments (id, user_id, order_id, amount, amount_paise, currency, status, gateway_order_id, receipt, purpose, created_at)
     VALUES ($1, $2, NULL, $3, $4, 'INR', 'created', $5, $6, 'wallet_topup', $7)`,
    [id, BUYER, paise / 100, paise, gatewayOrder, id, minutesAgo(ageMinutes)]
  );
  return { id, gatewayOrder, paise };
}
const captured = (id, paise) => ({ id, status: 'captured', amount: paise });
const status = async (id) => (await queryOne('SELECT status, payment_id, failure_reason FROM payments WHERE id = $1', [id]));
const balance = async () => Number((await queryOne('SELECT balance FROM wallets WHERE id = $1', [WALLET])).balance);

beforeAll(async () => {
  await cleanup();
  for (const [id, phone, role] of [[BUYER, '9833777001', 'user'], [OWNER, '9833777002', 'shop_owner']]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, `P2r ${role}`, phone, role]);
  }
  await query('INSERT INTO wallets (id, user_id, balance) VALUES ($1, $2, 0)', [WALLET, BUYER]);
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude)
     VALUES ($1, $2, 'P2r Shop', 'Grocery', 'Test Address', 'POINT(73.87 18.53)', 18.53, 73.87)`,
    [SHOP, OWNER]
  );
});
beforeEach(async () => {
  installFakeGateway();
  await query('UPDATE wallets SET balance = 0 WHERE id = $1', [WALLET]);
  // Only this suite's payments may be asked about: older strays would be too.
  await query(`UPDATE payments SET status = 'failed' WHERE status = 'created' AND CAST(user_id AS TEXT) LIKE '${fxLike('p2r')}'`);
});
afterAll(async () => {
  razorpay._setClientForTests(null);
  await cleanup();
});

describe('[P2.2] online payment is a switch, not a side effect of having keys', () => {
  test('[P2.2] off in production unless ENABLE_ONLINE_PAYMENTS=true; on in development and test; "false" always wins', () => {
    expect(razorpay.onlinePaymentsEnabled({ NODE_ENV: 'production' })).toBe(false);
    expect(razorpay.onlinePaymentsEnabled({ NODE_ENV: 'production', ENABLE_ONLINE_PAYMENTS: 'true' })).toBe(true);
    expect(razorpay.onlinePaymentsEnabled({ NODE_ENV: 'production', ENABLE_ONLINE_PAYMENTS: 'yes' })).toBe(false);
    expect(razorpay.onlinePaymentsEnabled({ NODE_ENV: 'development' })).toBe(true);
    expect(razorpay.onlinePaymentsEnabled({ NODE_ENV: 'test' })).toBe(true);
    expect(razorpay.onlinePaymentsEnabled({ NODE_ENV: 'test', ENABLE_ONLINE_PAYMENTS: 'false' })).toBe(false);
  });

  describe('with keys set and the switch off', () => {
    const saved = process.env.ENABLE_ONLINE_PAYMENTS;
    beforeAll(() => { process.env.ENABLE_ONLINE_PAYMENTS = 'false'; });
    afterAll(() => { if (saved === undefined) delete process.env.ENABLE_ONLINE_PAYMENTS; else process.env.ENABLE_ONLINE_PAYMENTS = saved; });

    test('[P2.2] a new payment is refused, checkout does not offer online payment, and the config says so', async () => {
      expect(razorpay.isConfigured()).toBe(true); // keys are there
      expect(razorpay.acceptingPayments()).toBe(false);
      expect(payments.onlinePaymentAvailable()).toBe(false);
      await expect(payments.createPayment({ user: { id: BUYER }, purpose: 'wallet_topup', amount: 500 }))
        .rejects.toMatchObject({ code: 'PAYMENTS_UNAVAILABLE', status: 503 });

      const app = express();
      app.use('/payments/razorpay', require('../../modules/payments/routes/razorpay.routes'));
      const config = await request(app).get('/payments/razorpay/config');
      expect(config.body.enabled).toBe(false);
      expect(config.body.keyId).toBeNull();
    });

    test('[P2.2] money already taken is still settled and returned: reconciliation and refunds are not behind the switch', async () => {
      const p = await pendingTopup({ ageMinutes: 30 });
      gateway.set(p.gatewayOrder, [captured('pay_late1', p.paise)]);
      const out = await reconcilePayments({ now: NOW });
      expect(out.settled).toBe(1);
      expect((await status(p.id)).status).toBe('paid');
    });
  });
});

describe('[P2.3] reconciliation finds payments whose outcome was never heard', () => {
  test('[P2.3] captured at the gateway, webhook and verify both lost: settled, and the wallet is credited exactly once', async () => {
    const p = await pendingTopup({ ageMinutes: 20 });
    gateway.set(p.gatewayOrder, [captured('pay_abc', p.paise)]);

    const first = await reconcilePayments({ now: NOW });
    expect(first).toMatchObject({ checked: 1, settled: 1 });
    expect(await status(p.id)).toMatchObject({ status: 'paid', payment_id: 'pay_abc' });
    expect(await balance()).toBe(500);

    // Again, and the webhook that finally arrives: nothing is paid twice.
    expect((await reconcilePayments({ now: NOW })).settled).toBe(0);
    expect(await payments.settle({ ...(await queryOne('SELECT * FROM payments WHERE id = $1', [p.id])) }, 'pay_abc')).toMatchObject({ settled: false, alreadyPaid: true });
    expect(await balance()).toBe(500);
  });

  test('[P2.3] a payment that is too new is left alone: the customer may still be on the payment page', async () => {
    const p = await pendingTopup({ ageMinutes: 3 });
    gateway.set(p.gatewayOrder, [captured('pay_new', p.paise)]);
    expect((await reconcilePayments({ now: NOW })).checked).toBe(0);
    expect((await status(p.id)).status).toBe('created');
  });

  test('[P2.3] captured for a different amount than ours: never settled, and reported', async () => {
    const p = await pendingTopup({ ageMinutes: 30, paise: 50000 });
    gateway.set(p.gatewayOrder, [captured('pay_odd', 100)]);
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    const out = await reconcilePayments({ now: NOW });
    err.mockRestore();
    expect(out).toMatchObject({ mismatched: 1, settled: 0 });
    expect((await status(p.id)).status).toBe('created');
    expect(await balance()).toBe(0);
  });

  test('[P2.3] failed at the gateway: marked failed, with Razorpay’s reason', async () => {
    const p = await pendingTopup({ ageMinutes: 30 });
    gateway.set(p.gatewayOrder, [{ id: 'pay_bad', status: 'failed', amount: p.paise, error_description: 'Card declined by the bank' }]);
    expect(await reconcilePayments({ now: NOW })).toMatchObject({ failed: 1, settled: 0 });
    expect(await status(p.id)).toMatchObject({ status: 'failed', failure_reason: 'Card declined by the bank' });
  });

  test('[P2.3] nothing paid: left for a day, then closed as abandoned', async () => {
    const recent = await pendingTopup({ ageMinutes: 60 });
    const old = await pendingTopup({ ageMinutes: 60 * 25 });
    const out = await reconcilePayments({ now: NOW });
    expect(out).toMatchObject({ checked: 2, abandoned: 1, settled: 0 });
    expect((await status(recent.id)).status).toBe('created');
    expect(await status(old.id)).toMatchObject({ status: 'failed', failure_reason: expect.stringMatching(/abandoned/) });
  });

  test('[P2.3] the gateway being unreachable changes nothing and is tried again; "no such order" closes only an old one', async () => {
    const down = await pendingTopup({ ageMinutes: 45 });
    gateway.set(down.gatewayOrder, Object.assign(new Error('socket hang up'), { statusCode: undefined }));
    const unknownRecent = await pendingTopup({ ageMinutes: 45 });
    gateway.set(unknownRecent.gatewayOrder, Object.assign(new Error('not found'), { statusCode: 400 }));
    const unknownOld = await pendingTopup({ ageMinutes: 60 * 30 });
    gateway.set(unknownOld.gatewayOrder, Object.assign(new Error('not found'), { statusCode: 400 }));

    const out = await reconcilePayments({ now: NOW });
    expect(out).toMatchObject({ checked: 3, errors: 2, abandoned: 1 });
    expect((await status(down.id)).status).toBe('created');
    expect((await status(unknownRecent.id)).status).toBe('created');
    expect((await status(unknownOld.id)).status).toBe('failed');
  });

  test('[P2.3] the charged customer of a cancelled order is refunded: settled as refund_pending, then sent back through the gateway', async () => {
    const orderId = crypto.randomUUID();
    await query(
      `INSERT INTO orders (id, user_id, shop_id, total_amount, subtotal, delivery_fee, status, order_status, payment_method, payment_status, fulfillment_method)
       VALUES ($1, $2, $3, 250, 250, 0, 'cancelled', 'cancelled', 'razorpay', 'pending', 'delivery')`,
      [orderId, BUYER, SHOP]
    );
    const paymentId = crypto.randomUUID();
    const gatewayOrder = `order_${crypto.randomBytes(6).toString('hex')}`;
    await query(
      `INSERT INTO payments (id, user_id, order_id, amount, amount_paise, currency, status, gateway_order_id, receipt, purpose, created_at)
       VALUES ($1, $2, $3, 250, 25000, 'INR', 'created', $4, $5, 'order', $6)`,
      [paymentId, BUYER, orderId, gatewayOrder, paymentId, minutesAgo(45)]
    );
    gateway.set(gatewayOrder, [captured('pay_charged', 25000)]);

    const out = await job.run(NOW);

    expect(out.settled).toBe(1);
    expect(refunds).toEqual([expect.objectContaining({ paymentId: 'pay_charged', amount: 25000 })]);
    expect((await queryOne('SELECT payment_status FROM orders WHERE id = $1', [orderId])).payment_status).toBe('refunded');
  });
});

describe('[P2.4] the job runs in production', () => {
  test('[P2.4] server.js starts it beside the unpaid-order job, and it is not scheduled under test', () => {
    const fs = require('fs');
    const path = require('path');
    const server = fs.readFileSync(path.join(__dirname, '../../server.js'), 'utf8');
    expect(server).toMatch(/require\('\.\/jobs\/payment-reconciliation\.job'\)/);
    expect(fs.readFileSync(path.join(__dirname, '../../jobs/payment-reconciliation.job.js'), 'utf8')).toMatch(/NODE_ENV !== 'test'/);
  });

  test('[P2.4] with no keys configured it asks nobody and does nothing', async () => {
    const keys = [process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET];
    delete process.env.RAZORPAY_KEY_ID; delete process.env.RAZORPAY_KEY_SECRET;
    try {
      expect(await reconcilePayments({ now: NOW })).toEqual({ checked: 0, settled: 0, failed: 0, abandoned: 0, mismatched: 0, errors: 0 });
    } finally {
      [process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET] = keys;
    }
  });
});
