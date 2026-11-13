/**
 * The Razorpay payment flow, end to end against the real routes and tables.
 *
 * Razorpay itself is replaced by a stand-in that records what it was asked to
 * create; signatures are computed with the same HMAC Razorpay uses, from a
 * test secret. What is under test is everything on this side of the gateway —
 * which is where every hole was:
 *
 *   - the amount came from the client;
 *   - a genuine signature could be replayed to settle a different order;
 *   - a wallet could be topped up with no payment at all;
 *   - webhooks could never verify, because the body had already been parsed;
 *   - with no keys set, clients were built with mock credentials instead of
 *     the feature being off.
 */

const { fx, fxLike } = require('../helpers/fixtureIds');
process.env.RAZORPAY_KEY_ID = 'rzp_test_unitTestKey';
process.env.RAZORPAY_KEY_SECRET = 'unit-test-key-secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'unit-test-webhook-secret';

const crypto = require('crypto');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryOne, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const razorpay = require('../../services/razorpay.service');

const BUYER = fx('rzp-buyer');
const OTHER = fx('rzp-other');
const OWNER = fx('rzp-owner');
const SHOP = fx('rzp-shop');

const token = (userId) => jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' });
const as = (userId) => ({ Authorization: `Bearer ${token(userId)}` });

/** What Razorpay Checkout would hand back for a successful payment. */
const checkoutSignature = (orderId, paymentId) =>
  crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
const webhookSignature = (raw) =>
  crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex');

let gatewayOrders;
let gatewayPayments;
let app;

function installFakeGateway() {
  gatewayOrders = [];
  gatewayPayments = new Map();
  razorpay._setClientForTests({
    orders: {
      create: async (params) => {
        const order = { id: `order_${crypto.randomBytes(7).toString('hex')}`, ...params, status: 'created' };
        gatewayOrders.push(order);
        return order;
      },
    },
    payments: {
      fetch: async (id) => {
        if (!gatewayPayments.has(id)) throw new Error('not found at gateway');
        return gatewayPayments.get(id);
      },
    },
  });
}

async function cleanup() {
  await query(`DELETE FROM wallet_transactions WHERE CAST(wallet_id AS TEXT) LIKE '${fxLike('rzp')}'`);
  await query(`DELETE FROM payments WHERE CAST(user_id AS TEXT) LIKE '${fxLike('rzp')}'`);
  await query('DELETE FROM vendor_subscriptions WHERE shop_id = $1', [SHOP]);
  await query(`DELETE FROM saas_plans WHERE CAST(id AS TEXT) LIKE '${fxLike('rzp')}'`);
  await query(`DELETE FROM shop_orders WHERE CAST(id AS TEXT) LIKE '${fxLike('rzp')}'`);
  await query(`DELETE FROM wallets WHERE CAST(id AS TEXT) LIKE '${fxLike('rzp')}'`);
  await query('DELETE FROM local_shops WHERE id = $1', [SHOP]);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('rzp')}'`);
}

async function newShopOrder(id, userId, total) {
  await query(
    `INSERT INTO shop_orders (id, shop_id, user_id, total_amount, items, payment_method, status, payment_status)
     VALUES ($1, $2, $3, $4, '[]', 'RAZORPAY', 'pending', 'pending')`,
    [id, SHOP, userId, total]
  );
}

beforeAll(async () => {
  await cleanup();
  for (const [id, name, phone, role] of [
    [BUYER, 'Rzp Buyer', '9833666001', 'user'],
    [OTHER, 'Rzp Other', '9833666002', 'user'],
    [OWNER, 'Rzp Owner', '9833666003', 'shop_owner'],
  ]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, name, phone, role]);
  }
  await query(`INSERT INTO wallets (id, user_id, balance) VALUES ('${fx('rzp-wallet-buyer')}', $1, '0')`, [BUYER]);
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude)
     VALUES ($1, $2, 'Rzp Test Shop', 'Grocery', 'Test Address', 'POINT(73.87 18.53)', 18.53, 73.87)`,
    [SHOP, OWNER]
  );

  // Mounted the way server.js mounts them: one JSON parser for everything,
  // keeping the raw bytes for webhook paths.
  app = express();
  app.use(express.json({
    verify: (req, _res, buf) => { if (/\/webhooks?(\/|$)/.test(req.originalUrl)) req.rawBody = buf; },
  }));
  app.use('/payments', require('../../modules/ecommerce/routes/payment.routes'));
  app.use('/checkout', require('../../modules/ecommerce/routes/checkout.routes'));
  app.use('/wallet', require('../../modules/ecommerce/routes/wallet.routes'));
  app.use('/webhooks', require('../../modules/core/routes/webhooks.routes'));
  app.use('/shops', require('../../modules/ecommerce/routes/shop.routes'));
  app.use('/saas', require('../../modules/crm/routes/saas.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use(require('../../middleware/error.middleware').errorHandler);
});

beforeEach(installFakeGateway);
afterAll(async () => {
  razorpay._setClientForTests(null);
  await cleanup();
});

const startPayment = (userId, body) => request(app).post('/payments/razorpay/order').set(as(userId)).send(body);
const verifyPayment = (userId, body) => request(app).post('/payments/razorpay/verify').set(as(userId)).send(body);

describe('starting a payment', () => {
  test('the amount comes from the order, whatever the client sends', async () => {
    await newShopOrder(fx('rzp-order-amount'), BUYER, 349.5);

    const res = await startPayment(BUYER, { purpose: 'shop_order', referenceId: fx('rzp-order-amount'), amount: 1 });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(34950);
    expect(res.body.keyId).toBe('rzp_test_unitTestKey');
    expect(gatewayOrders).toHaveLength(1);
    expect(gatewayOrders[0].amount).toBe(34950);
    expect(res.body.razorpayOrderId).toBe(gatewayOrders[0].id);

    const row = await queryOne('SELECT * FROM payments WHERE gateway_order_id = $1', [gatewayOrders[0].id]);
    expect(row.purpose).toBe('shop_order');
    expect(row.order_id).toBe(fx('rzp-order-amount'));
    expect(row.user_id).toBe(BUYER);
    expect(Number(row.amount_paise)).toBe(34950);
    expect(row.status).toBe('created');
  });

  test("someone else's order cannot be paid for, and is indistinguishable from a missing one", async () => {
    await newShopOrder(fx('rzp-order-foreign'), BUYER, 100);

    const theirs = await startPayment(OTHER, { purpose: 'shop_order', referenceId: fx('rzp-order-foreign') });
    const missing = await startPayment(OTHER, { purpose: 'shop_order', referenceId: fx('rzp-order-nope') });

    expect(theirs.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(theirs.body.error).toBe(missing.body.error);
    expect(gatewayOrders).toHaveLength(0);
  });

  test('pressing Pay again reuses the open gateway order', async () => {
    await newShopOrder(fx('rzp-order-retry'), BUYER, 80);

    const first = await startPayment(BUYER, { purpose: 'shop_order', referenceId: fx('rzp-order-retry') });
    const second = await startPayment(BUYER, { purpose: 'shop_order', referenceId: fx('rzp-order-retry') });

    expect(second.body.razorpayOrderId).toBe(first.body.razorpayOrderId);
    expect(gatewayOrders).toHaveLength(1);
  });

  test('needs a session, a known purpose and a reference', async () => {
    const anonymous = await request(app).post('/payments/razorpay/order').send({ purpose: 'shop_order', referenceId: 'x' });
    expect(anonymous.status).toBe(401);
    expect((await startPayment(BUYER, { purpose: 'free_money', referenceId: 'x' })).status).toBe(400);
    expect((await startPayment(BUYER, { purpose: 'shop_order' })).status).toBe(400);
  });

  test('the older /checkout/create-order path runs the same rules', async () => {
    await newShopOrder(fx('rzp-order-alias'), BUYER, 120);
    const anonymous = await request(app).post('/checkout/create-order').send({ amount: 1 });
    expect(anonymous.status).toBe(401);

    const res = await request(app).post('/checkout/create-order').set(as(BUYER))
      .send({ purpose: 'shop_order', referenceId: fx('rzp-order-alias'), amount: 1 });
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(12000);
  });
});

describe('confirming a payment', () => {
  async function paid(orderId, total) {
    await newShopOrder(orderId, BUYER, total);
    const start = await startPayment(BUYER, { purpose: 'shop_order', referenceId: orderId });
    return start.body.razorpayOrderId;
  }

  test('[P2.1] a genuine result marks that order paid, once', async () => {
    const rzpOrder = await paid(fx('rzp-order-good'), 250);
    const body = {
      razorpay_order_id: rzpOrder,
      razorpay_payment_id: 'pay_good0001',
      razorpay_signature: checkoutSignature(rzpOrder, 'pay_good0001'),
    };

    const first = await verifyPayment(BUYER, body);
    expect(first.status).toBe(200);
    expect(first.body.settled).toBe(true);

    const order = await queryOne('SELECT payment_status, payment_gateway_ref FROM shop_orders WHERE id = $1', [fx('rzp-order-good')]);
    expect(order).toEqual({ payment_status: 'paid', payment_gateway_ref: 'pay_good0001' });

    const again = await verifyPayment(BUYER, body);
    expect(again.status).toBe(200);
    expect(again.body.alreadyPaid).toBe(true);
  });

  test('[P2.1] a forged signature settles nothing', async () => {
    const rzpOrder = await paid(fx('rzp-order-forged'), 250);

    const res = await verifyPayment(BUYER, {
      razorpay_order_id: rzpOrder, razorpay_payment_id: 'pay_forged01', razorpay_signature: 'a'.repeat(64),
    });

    expect(res.status).toBe(400);
    const order = await queryOne('SELECT payment_status FROM shop_orders WHERE id = $1', [fx('rzp-order-forged')]);
    expect(order.payment_status).toBe('pending');
  });

  test('[P2.1] a genuine payment for one order cannot be replayed onto another', async () => {
    // The hole this closes: verification used to check the signature and then
    // mark paid whichever order_id the request named.
    const cheap = await paid(fx('rzp-order-cheap'), 1);
    await paid(fx('rzp-order-dear'), 9999);
    const genuine = {
      razorpay_order_id: cheap,
      razorpay_payment_id: 'pay_cheap001',
      razorpay_signature: checkoutSignature(cheap, 'pay_cheap001'),
    };

    const res = await verifyPayment(BUYER, { ...genuine, order_id: fx('rzp-order-dear'), referenceId: fx('rzp-order-dear') });

    expect(res.status).toBe(200);
    expect(res.body.referenceId).toBe(fx('rzp-order-cheap'));
    const dear = await queryOne('SELECT payment_status FROM shop_orders WHERE id = $1', [fx('rzp-order-dear')]);
    expect(dear.payment_status).toBe('pending');
  });

  test("another user cannot confirm someone's payment", async () => {
    const rzpOrder = await paid(fx('rzp-order-notmine'), 60);
    const res = await verifyPayment(OTHER, {
      razorpay_order_id: rzpOrder, razorpay_payment_id: 'pay_x', razorpay_signature: checkoutSignature(rzpOrder, 'pay_x'),
    });
    expect(res.status).toBe(404);
  });

  test('a payment the gateway reports for a different amount is refused', async () => {
    const rzpOrder = await paid(fx('rzp-order-short'), 500);
    gatewayPayments.set('pay_short001', { id: 'pay_short001', order_id: rzpOrder, amount: 100, status: 'captured' });

    const res = await verifyPayment(BUYER, {
      razorpay_order_id: rzpOrder, razorpay_payment_id: 'pay_short001', razorpay_signature: checkoutSignature(rzpOrder, 'pay_short001'),
    });

    expect(res.status).toBe(400);
    const order = await queryOne('SELECT payment_status FROM shop_orders WHERE id = $1', [fx('rzp-order-short')]);
    expect(order.payment_status).toBe('pending');
  });

  test('camelCase field names from the web client are accepted', async () => {
    const rzpOrder = await paid(fx('rzp-order-camel'), 75);
    const res = await request(app).post('/checkout/verify').set(as(BUYER)).send({
      razorpayOrderId: rzpOrder,
      razorpayPaymentId: 'pay_camel001',
      razorpaySignature: checkoutSignature(rzpOrder, 'pay_camel001'),
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('wallet top-up', () => {
  const balance = async () => Number((await queryOne('SELECT balance FROM wallets WHERE user_id = $1', [BUYER])).balance);

  test('creating a top-up order credits nothing', async () => {
    const before = await balance();
    const res = await request(app).post('/wallet/create-topup-order').set(as(BUYER)).send({ amount: 500 });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(50000);
    expect(res.body.token).toBeUndefined();
    expect(await balance()).toBe(before);
  });

  test('the old self-signed token no longer credits a wallet', async () => {
    // What used to work: ask for a token, hand it back, receive the money.
    const before = await balance();
    const token = crypto.createHmac('sha256', getJwtSecret()).update(`${BUYER}:100000:W_ORD_x`).digest('hex');

    const res = await request(app).post('/wallet/verify-topup').set(as(BUYER))
      .send({ amount: 100000, orderId: 'W_ORD_x', token });

    expect(res.status).toBe(400);
    expect(await balance()).toBe(before);
  });

  test('a verified payment credits the wallet exactly once', async () => {
    const before = await balance();
    const start = await request(app).post('/wallet/create-topup-order').set(as(BUYER)).send({ amount: 200 });
    const rzpOrder = start.body.razorpayOrderId;
    const body = {
      razorpay_order_id: rzpOrder,
      razorpay_payment_id: 'pay_topup001',
      razorpay_signature: checkoutSignature(rzpOrder, 'pay_topup001'),
    };

    const first = await request(app).post('/wallet/verify-topup').set(as(BUYER)).send(body);
    expect(first.status).toBe(200);
    expect(first.body.data.balance).toBe(before + 200);

    await request(app).post('/wallet/verify-topup').set(as(BUYER)).send(body);
    await request(app).post('/wallet/topup').set(as(BUYER)).send(body);
    expect(await balance()).toBe(before + 200);

    const ledger = await queryMany(
      `SELECT amount, type FROM wallet_transactions WHERE wallet_id = '${fx('rzp-wallet-buyer')}' AND purpose = 'wallet_topup'`
    );
    expect(ledger).toEqual([{ amount: 200, type: 'credit' }]);
  });

  test('the amount has limits', async () => {
    for (const amount of [0, -50, 5, 10000000, 'lots']) {
      const res = await request(app).post('/wallet/create-topup-order').set(as(BUYER)).send({ amount });
      expect(res.status).toBe(400);
    }
  });

  test('a direct top-up is refused outside development and test', async () => {
    const env = process.env.NODE_ENV;
    const before = await balance();
    try {
      for (const value of ['production', 'staging']) {
        process.env.NODE_ENV = value;
        const res = await request(app).post('/wallet/topup').set(as(BUYER)).send({ amount: 500 });
        expect(res.status).toBe(400);
      }
    } finally {
      process.env.NODE_ENV = env;
    }
    expect(await balance()).toBe(before);
  });
});

describe('the webhook', () => {
  const deliver = (payload, signature) => {
    const raw = JSON.stringify(payload);
    return request(app).post('/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature === undefined ? webhookSignature(raw) : signature)
      .send(raw);
  };
  const captured = (rzpOrder, paymentId, amount) => ({
    event: 'payment.captured',
    payload: { payment: { entity: { id: paymentId, order_id: rzpOrder, amount, status: 'captured' } } },
  });

  test('[P2.1] a signed delivery settles the order, though the body was parsed before the route saw it', async () => {
    await newShopOrder(fx('rzp-order-hook'), BUYER, 150);
    const start = await startPayment(BUYER, { purpose: 'shop_order', referenceId: fx('rzp-order-hook') });

    const res = await deliver(captured(start.body.razorpayOrderId, 'pay_hook0001', 15000));

    expect(res.status).toBe(200);
    const order = await queryOne('SELECT payment_status FROM shop_orders WHERE id = $1', [fx('rzp-order-hook')]);
    expect(order.payment_status).toBe('paid');
  });

  test('[P2.1] an unsigned or wrongly signed delivery is refused', async () => {
    await newShopOrder(fx('rzp-order-hookbad'), BUYER, 150);
    const start = await startPayment(BUYER, { purpose: 'shop_order', referenceId: fx('rzp-order-hookbad') });
    const event = captured(start.body.razorpayOrderId, 'pay_hookbad1', 15000);

    expect((await deliver(event, 'f'.repeat(64))).status).toBe(401);
    expect((await deliver(event, '')).status).toBe(401);

    const order = await queryOne('SELECT payment_status FROM shop_orders WHERE id = $1', [fx('rzp-order-hookbad')]);
    expect(order.payment_status).toBe('pending');
  });

  test('a delivery for the wrong amount does not settle', async () => {
    await newShopOrder(fx('rzp-order-hookamt'), BUYER, 150);
    const start = await startPayment(BUYER, { purpose: 'shop_order', referenceId: fx('rzp-order-hookamt') });

    const res = await deliver(captured(start.body.razorpayOrderId, 'pay_hookamt1', 100));

    expect(res.status).toBe(200);
    const order = await queryOne('SELECT payment_status FROM shop_orders WHERE id = $1', [fx('rzp-order-hookamt')]);
    expect(order.payment_status).toBe('pending');
  });

  test('[P2.1] a top-up settled by the webhook and then by the browser is credited once', async () => {
    const before = Number((await queryOne('SELECT balance FROM wallets WHERE user_id = $1', [BUYER])).balance);
    const start = await request(app).post('/wallet/create-topup-order').set(as(BUYER)).send({ amount: 300 });
    const rzpOrder = start.body.razorpayOrderId;

    await deliver(captured(rzpOrder, 'pay_both0001', 30000));
    await deliver(captured(rzpOrder, 'pay_both0001', 30000));
    await request(app).post('/wallet/verify-topup').set(as(BUYER)).send({
      razorpay_order_id: rzpOrder, razorpay_payment_id: 'pay_both0001', razorpay_signature: checkoutSignature(rzpOrder, 'pay_both0001'),
    });

    const after = Number((await queryOne('SELECT balance FROM wallets WHERE user_id = $1', [BUYER])).balance);
    expect(after).toBe(before + 300);
  });

  test('a failed payment is recorded and leaves the order unpaid', async () => {
    await newShopOrder(fx('rzp-order-hookfail'), BUYER, 90);
    const start = await startPayment(BUYER, { purpose: 'shop_order', referenceId: fx('rzp-order-hookfail') });

    await deliver({
      event: 'payment.failed',
      payload: { payment: { entity: { id: 'pay_fail0001', order_id: start.body.razorpayOrderId, amount: 9000, error_description: 'Card declined' } } },
    });

    const row = await queryOne('SELECT status, failure_reason FROM payments WHERE gateway_order_id = $1', [start.body.razorpayOrderId]);
    expect(row).toEqual({ status: 'failed', failure_reason: 'Card declined' });
  });

  test('[P2.1] without a webhook secret every delivery is refused', async () => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    try {
      const res = await request(app).post('/webhooks/razorpay').set('Content-Type', 'application/json')
        .set('x-razorpay-signature', 'anything').send('{}');
      expect(res.status).toBe(503);
    } finally {
      process.env.RAZORPAY_WEBHOOK_SECRET = secret;
    }
  });
});

describe('with no keys configured', () => {
  const saved = {};
  beforeEach(() => {
    razorpay._setClientForTests(null);
    for (const key of ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']) { saved[key] = process.env[key]; delete process.env[key]; }
  });
  afterEach(() => { Object.assign(process.env, saved); });

  test('the feature reports itself off, and nothing pretends otherwise', async () => {
    const config = await request(app).get('/payments/razorpay/config');
    expect(config.body).toEqual(expect.objectContaining({ enabled: false, keyId: null }));

    await newShopOrder(fx('rzp-order-nokeys'), BUYER, 100);
    const start = await startPayment(BUYER, { purpose: 'shop_order', referenceId: fx('rzp-order-nokeys') });
    expect(start.status).toBe(503);
    expect(start.body.code).toBe('PAYMENTS_UNAVAILABLE');

    const topup = await request(app).post('/wallet/create-topup-order').set(as(BUYER)).send({ amount: 100 });
    expect(topup.status).toBe(503);
  });

  test('the placeholders this repository has shipped do not count as keys', () => {
    for (const [id, secret] of [['rzp_test_mockkey', 'mocksecret'], ['rzp_test_mock', 'mock_secret'], ['YOUR_RAZORPAY_LIVE_KEY', 'YOUR_SECRET'], ['<razorpay-key-id>', '<razorpay-key-secret>']]) {
      process.env.RAZORPAY_KEY_ID = id;
      process.env.RAZORPAY_KEY_SECRET = secret;
      expect(razorpay.isConfigured()).toBe(false);
    }
  });
});

// The legacy route now proxies the order pipeline (P1.2), so it acts on the
// `orders` table that checkout writes, not the retired shop_orders.
describe('PUT /shops/orders/:id/status', () => {
  const setStatus = (userId, id, status) => request(app).put(`/shops/orders/${id}/status`).set(as(userId)).send({ status });
  const codOrder = (id) => query(
    `INSERT INTO orders (id, user_id, shop_id, total_amount, subtotal, delivery_fee, status, order_status, payment_method, payment_status, fulfillment_method)
     VALUES ($1, $2, $3, 100, 100, 0, 'pending', 'pending', 'COD', 'unpaid', 'delivery')`,
    [id, BUYER, SHOP]
  );
  const statusOf = async (id) => (await queryOne('SELECT order_status FROM orders WHERE id = $1', [id])).order_status;

  test('a stranger cannot move an order; the owner can, by its old status names too', async () => {
    await codOrder(fx('rzp-order-status'));

    expect((await setStatus(OTHER, fx('rzp-order-status'), 'delivered')).status).toBeGreaterThanOrEqual(400);
    expect(await statusOf(fx('rzp-order-status'))).toBe('pending');

    const res = await setStatus(OWNER, fx('rzp-order-status'), 'accepted');
    expect(res.status).toBe(200);
    expect(await statusOf(fx('rzp-order-status'))).toBe('confirmed');
  });

  test('the customer may cancel a pending order, and nothing else', async () => {
    await codOrder(fx('rzp-order-cancel'));

    expect((await setStatus(BUYER, fx('rzp-order-cancel'), 'delivered')).status).toBeGreaterThanOrEqual(400);
    expect((await setStatus(BUYER, fx('rzp-order-cancel'), 'cancelled')).status).toBe(200);

    await codOrder(fx('rzp-order-toolate'));
    await setStatus(OWNER, fx('rzp-order-toolate'), 'accepted');
    await setStatus(OWNER, fx('rzp-order-toolate'), 'preparing');
    expect((await setStatus(BUYER, fx('rzp-order-toolate'), 'cancelled')).status).toBeGreaterThanOrEqual(400);
    expect(await statusOf(fx('rzp-order-toolate'))).toBe('preparing');
  });
});

describe('buying a plan (POST /saas/subscribe)', () => {
  beforeAll(async () => {
    await query(`INSERT INTO saas_plans (id, name, price_monthly, is_active) VALUES ('${fx('rzp-plan-pro')}', 'Pro', 499, '1')`);
    await query(`INSERT INTO saas_plans (id, name, price_monthly, is_active) VALUES ('${fx('rzp-plan-free')}', 'Free', '0', '1')`);
  });

  const subscribe = (userId, planId) => request(app).post('/saas/subscribe').set(as(userId)).send({ planId });

  test('opens a payment for the plan price; nothing is active until it is paid', async () => {
    const res = await subscribe(OWNER, fx('rzp-plan-pro'));

    expect(res.status).toBe(201);
    expect(res.body.payment).toEqual(expect.objectContaining({ amount: 49900, purpose: 'saas_subscription' }));
    expect(gatewayOrders[0].amount).toBe(49900);

    const sub = await queryOne('SELECT status, current_period_end FROM vendor_subscriptions WHERE id = $1', [res.body.subscriptionId]);
    expect(sub).toEqual({ status: 'pending', current_period_end: null });

    // Pressing Subscribe again does not open a second subscription or payment.
    const again = await subscribe(OWNER, fx('rzp-plan-pro'));
    expect(again.body.subscriptionId).toBe(res.body.subscriptionId);
    expect(again.body.payment.razorpayOrderId).toBe(res.body.payment.razorpayOrderId);
  });

  test('a verified payment activates it for 30 days and upgrades the shop', async () => {
    const start = await subscribe(OWNER, fx('rzp-plan-pro'));
    const rzpOrder = start.body.payment.razorpayOrderId;

    const res = await verifyPayment(OWNER, {
      razorpay_order_id: rzpOrder,
      razorpay_payment_id: 'pay_plan0001',
      razorpay_signature: checkoutSignature(rzpOrder, 'pay_plan0001'),
    });
    expect(res.status).toBe(200);

    const sub = await queryOne('SELECT status, current_period_end FROM vendor_subscriptions WHERE id = $1', [start.body.subscriptionId]);
    expect(sub.status).toBe('active');
    const days = (new Date(sub.current_period_end).getTime() - Date.now()) / 86400000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);

    const shop = await queryOne('SELECT crm_tier FROM local_shops WHERE id = $1', [SHOP]);
    expect(shop.crm_tier).toBe('premium');
  });

  test('someone without a shop cannot subscribe, and a free plan is not sold', async () => {
    expect((await subscribe(BUYER, fx('rzp-plan-pro'))).status).toBe(403);
    expect((await subscribe(OWNER, fx('rzp-plan-free'))).status).toBe(400);
    expect((await subscribe(OWNER, fx('rzp-plan-nope'))).status).toBe(404);
  });
});
