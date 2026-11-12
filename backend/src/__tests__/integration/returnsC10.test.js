/**
 * C10: returns and refunds (modules/ecommerce/services/return.service.js).
 *
 *   - a request carries a reason code from a fixed list and photo links;
 *   - the seller reviews their own shop's returns; an administrator any;
 *   - an approved return on an online order is refunded through Razorpay
 *     (it used to be marked refunded with a made-up reference and nothing
 *     sent); a cash or wallet order is credited to the wallet;
 *   - two reviewers approving at once refund once;
 *   - the customer sees their returns, and is told of each decision.
 */
process.env.RAZORPAY_KEY_ID = 'rzp_test_unitTestKey';
process.env.RAZORPAY_KEY_SECRET = 'unit-test-key-secret';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { fx, fxLike } = require('../helpers/fixtureIds');
const { query, queryOne, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const razorpay = require('../../services/razorpay.service');

const CUSTOMER = fx('c10x-customer');
const SELLER = fx('c10x-seller');
const OTHER_SELLER = fx('c10x-other-seller');
const ADMIN = fx('c10x-admin');
const SHOP = fx('c10x-shop');
const OTHER_SHOP = fx('c10x-other-shop');
const COD = fx('c10x-cod');
const WALLET = fx('c10x-wallet-order');
const ONLINE = fx('c10x-online');
const RACE = fx('c10x-race');
const OTHERS = fx('c10x-others-order');
const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;
let refunds;

async function cleanup() {
  await query(`DELETE FROM shop_notifications WHERE CAST(recipient_id AS TEXT) LIKE '${fxLike('c10x')}'`);
  await query(`DELETE FROM order_returns WHERE CAST(order_id AS TEXT) LIKE '${fxLike('c10x')}'`);
  await query(`DELETE FROM payments WHERE CAST(order_id AS TEXT) LIKE '${fxLike('c10x')}'`);
  await query(`DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c10x')}')`);
  await query(`DELETE FROM wallets WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c10x')}'`);
  await query(`DELETE FROM orders WHERE CAST(id AS TEXT) LIKE '${fxLike('c10x')}'`);
  await query(`DELETE FROM local_shops WHERE CAST(id AS TEXT) LIKE '${fxLike('c10x')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('c10x')}'`);
}

const balance = async () => {
  const w = await queryOne('SELECT balance FROM wallets WHERE user_id = $1', [CUSTOMER]);
  return w ? Number(w.balance) : 0;
};

beforeAll(async () => {
  await cleanup();
  for (const [id, phone, role] of [[CUSTOMER, '9833000101', 'user'], [SELLER, '9833000102', 'shop_owner'], [OTHER_SELLER, '9833000103', 'shop_owner'], [ADMIN, '9833000104', 'super_admin']]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, `C10 ${role}`, phone, role]);
  }
  for (const [id, owner] of [[SHOP, SELLER], [OTHER_SHOP, OTHER_SELLER]]) {
    await query(
      `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude)
       VALUES ($1, $2, 'C10 Shop', 'Electronics', 'Road', 'POINT(73.87 18.53)', 18.53, 73.87)`,
      [id, owner]
    );
  }
  const now = new Date().toISOString();
  for (const [id, shop, method, total] of [[COD, SHOP, 'cod', 300], [WALLET, SHOP, 'wallet', 150], [ONLINE, SHOP, 'razorpay', 500], [RACE, SHOP, 'cod', 200], [OTHERS, OTHER_SHOP, 'cod', 90]]) {
    await query(
      `INSERT INTO orders (id, user_id, shop_id, subtotal, total_amount, delivery_fee, payment_method, payment_status, order_status, status, fulfillment_method, delivered_at)
       VALUES ($1, $2, $3, $4, $4, 0, $5, 'paid', 'delivered', 'delivered', 'pickup', $6)`,
      [id, CUSTOMER, shop, total, method, now]
    );
  }
  await query(
    `INSERT INTO payments (id, user_id, order_id, amount, amount_paise, status, payment_id, purpose, paid_at)
     VALUES ($1, $2, $3, 500, 50000, 'paid', 'pay_c10_online', 'order', $4)`,
    [fx('c10x-payment'), CUSTOMER, ONLINE, now]
  );
  app = express();
  app.use(express.json());
  app.use('/orders/returns', require('../../modules/ecommerce/routes/return.routes'));
  app.use('/orders', require('../../modules/ecommerce/routes/order.routes'));
  app.use(require('../../middleware/error.middleware').errorHandler);
});

beforeEach(() => {
  refunds = [];
  razorpay._setClientForTests({
    payments: {
      refund: async (paymentId, params) => { refunds.push({ paymentId, ...params }); return { id: `rfnd_${refunds.length}`, ...params }; },
      fetch: async () => { throw new Error('not used'); },
    },
    orders: { create: async () => { throw new Error('not used'); } },
  });
});

afterAll(async () => {
  razorpay._setClientForTests(null);
  await cleanup();
});

const submit = (orderId, body) => request(app).post(`/orders/${orderId}/returns`).set(as(CUSTOMER)).send(body);
const decide = (who, returnId, body) => request(app).put(`/orders/returns/${returnId}/verify`).set(as(who)).send(body);

test('[C10.1] a return needs a reason code from the list and photo links; it is filed under the code', async () => {
  expect((await submit(COD, { reasonCode: 'broken-ish', reason: 'x' })).status).toBe(400);
  expect((await submit(COD, { reasonCode: 'other' })).status).toBe(400); // 'other' needs the customer's words
  expect((await submit(COD, { reasonCode: 'damaged', evidenceUrls: ['javascript:alert(1)'] })).status).toBe(400);
  expect((await submit(COD, { reasonCode: 'damaged', evidenceUrls: Array(6).fill('https://img.example/p.jpg') })).status).toBe(400);
  expect((await submit(COD, { reasonCode: 'damaged', evidenceUrls: ['/uploads/../../etc/passwd'] })).status).toBe(400);

  const ok = await submit(COD, { reasonCode: 'damaged', reason: 'Screen cracked on arrival', evidenceUrls: ['https://img.example/crack.jpg', '/uploads/returns/crack-2.jpg'] });
  expect(ok.status).toBe(201);
  expect(ok.body.data).toMatchObject({ reasonCode: 'damaged', status: 'pending_review', refundAmount: 300 });
  const row = await queryOne('SELECT reason, reason_code FROM order_returns WHERE id = $1', [ok.body.data.id]);
  expect(row).toMatchObject({ reason: 'Screen cracked on arrival', reason_code: 'damaged' });
  // The shop is told.
  const told = await queryMany("SELECT title FROM shop_notifications WHERE recipient_id = $1 AND title = 'Return requested'", [SELLER]);
  expect(told.length).toBeGreaterThan(0);
});

test('[C10.2] the seller reviews their own shop\'s returns; another seller cannot', async () => {
  const others = await submit(OTHERS, { reasonCode: 'missing_items', reason: 'Charger missing' });
  expect(others.status).toBe(201);

  const queue = await request(app).get('/orders/returns/pending-review').set(as(SELLER));
  expect(queue.status).toBe(200);
  expect(new Set(queue.body.data.map((r) => r.shop_id))).toEqual(new Set([SHOP]));
  expect((await request(app).get('/orders/returns/pending-review').set(as(CUSTOMER))).status).toBe(403);

  const cod = await queryOne('SELECT id FROM order_returns WHERE order_id = $1', [COD]);
  expect((await decide(OTHER_SELLER, cod.id, { action: 'approve' })).status).toBe(403);

  const before = await balance();
  const approved = await decide(SELLER, cod.id, { action: 'approve', notes: 'Photo shows the crack' });
  expect(approved.status).toBe(200);
  expect(approved.body).toMatchObject({ status: 'refund_completed', refundChannel: 'wallet', refundAmount: 300, verifiedRole: 'shop_owner' });
  expect(await balance()).toBe(before + 300);
});

test('[C10.3] an approved return on an online order is refunded through Razorpay, and only then called refunded', async () => {
  const filed = await submit(ONLINE, { reasonCode: 'not_as_described', reason: 'Different model' });
  const res = await decide(ADMIN, filed.body.data.id, { action: 'approve' });
  expect(res.status).toBe(200);
  expect(refunds).toEqual([expect.objectContaining({ paymentId: 'pay_c10_online', amount: 50000 })]);
  expect(res.body).toMatchObject({ status: 'refund_completed', refundChannel: 'source_gateway', refundReferenceId: 'rfnd_1' });
  const order = await queryOne('SELECT return_status, payment_status FROM orders WHERE id = $1', [ONLINE]);
  expect(order).toEqual({ return_status: 'refunded', payment_status: 'refunded' });
  expect((await queryOne('SELECT refund_reference_id FROM order_returns WHERE id = $1', [filed.body.data.id])).refund_reference_id).toBe('rfnd_1');
});

test('[C10.4] a wallet-paid order is refunded to the wallet, not "sent to the gateway"', async () => {
  const filed = await submit(WALLET, { reasonCode: 'spoiled_or_expired', reason: 'Expired pack' });
  const before = await balance();
  const res = await decide(ADMIN, filed.body.data.id, { action: 'approve' });
  expect(res.body).toMatchObject({ status: 'refund_completed', refundChannel: 'wallet' });
  expect(refunds).toEqual([]);
  expect(await balance()).toBe(before + 150);
});

test('[C10.5] two reviewers approving at once refund once', async () => {
  const filed = await submit(RACE, { reasonCode: 'wrong_item', reason: 'Wrong colour' });
  const before = await balance();
  const results = await Promise.all([
    decide(ADMIN, filed.body.data.id, { action: 'approve' }),
    decide(SELLER, filed.body.data.id, { action: 'approve' }),
  ]);
  expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
  expect(await balance()).toBe(before + 200);
  const credits = await queryMany(
    "SELECT wt.id FROM wallet_transactions wt JOIN wallets w ON w.id = wt.wallet_id WHERE w.user_id = $1 AND wt.reference_id = $2",
    [CUSTOMER, RACE]
  );
  expect(credits).toHaveLength(1);
});

test('[C10.6] the customer follows their returns and is told of each decision', async () => {
  const mine = await request(app).get('/orders/returns/mine').set(as(CUSTOMER));
  expect(mine.status).toBe(200);
  const byOrder = Object.fromEntries(mine.body.data.map((r) => [r.order_id, r.status]));
  expect(byOrder[COD]).toBe('verified_approved');
  expect(byOrder[OTHERS]).toBe('pending_review');
  expect(mine.body.reasons).toContain('damaged');
  // Rejecting needs a reason, which the customer is told.
  const others = await queryOne('SELECT id FROM order_returns WHERE order_id = $1', [OTHERS]);
  expect((await decide(OTHER_SELLER, others.id, { action: 'reject' })).status).toBe(400);
  expect((await decide(OTHER_SELLER, others.id, { action: 'reject', rejectionReason: 'Charger was in the box (photo of packing).' })).status).toBe(200);
  const notes = await queryMany('SELECT title, body FROM shop_notifications WHERE recipient_id = $1 ORDER BY created_at', [CUSTOMER]);
  expect(notes.map((n) => n.title)).toEqual(expect.arrayContaining(['Return accepted: refunded to your wallet', 'Return accepted: refund sent', 'Return not accepted']));
  expect(notes.find((n) => n.title === 'Return not accepted').body).toMatch(/Charger was in the box/);
});
