/**
 * Decision D10 (F-158): while the consumer wallet is off — the launch default —
 * a refund that does not go back through the gateway is a manual payout an
 * administrator pays and confirms, never a wallet credit the customer cannot
 * see; and the wallet is not offered as a way to pay.
 *
 * The suites run with feature flags bypassed (jest.setup.js); these switch the
 * bypass off and the wallet off, as production runs, and put both back.
 */
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { fx, fxLike } = require('../helpers/fixtureIds');
const { query, queryOne, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const CUSTOMER = fx('d10x-customer');
const ADMIN = fx('d10x-admin');
const OWNER = fx('d10x-owner');
const SHOP = fx('d10x-shop');
const RETURNED = fx('d10x-returned');
const REFUNDED = fx('d10x-refunded');
const DISPUTED = fx('d10x-disputed');
const DISPUTE = fx('d10x-dispute');
const RICE = fx('d10x-rice');
const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;
const saved = {};

async function cleanup() {
  await query(`DELETE FROM shop_notifications WHERE CAST(recipient_id AS TEXT) LIKE '${fxLike('d10x')}'`);
  await query(`DELETE FROM refund_payouts WHERE CAST(order_id AS TEXT) LIKE '${fxLike('d10x')}'`);
  await query(`DELETE FROM order_returns WHERE CAST(order_id AS TEXT) LIKE '${fxLike('d10x')}'`);
  await query(`DELETE FROM disputes WHERE CAST(id AS TEXT) LIKE '${fxLike('d10x')}'`);
  await query(`DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE CAST(user_id AS TEXT) LIKE '${fxLike('d10x')}')`);
  await query(`DELETE FROM wallets WHERE CAST(user_id AS TEXT) LIKE '${fxLike('d10x')}'`);
  await query(`DELETE FROM shop_commissions WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('d10x')}'`);
  await query(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('d10x')}')`);
  await query(`DELETE FROM orders WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('d10x')}'`);
  await query(`DELETE FROM shop_products WHERE CAST(id AS TEXT) LIKE '${fxLike('d10x')}'`);
  await query(`DELETE FROM local_shops WHERE CAST(id AS TEXT) LIKE '${fxLike('d10x')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('d10x')}'`);
}

const walletCredits = async () => (await queryMany(
  'SELECT wt.amount FROM wallet_transactions wt JOIN wallets w ON w.id = wt.wallet_id WHERE w.user_id = $1', [CUSTOMER]
)).length;

beforeAll(async () => {
  saved.bypass = process.env.BYPASS_FEATURE_FLAGS;
  saved.wallet = process.env.FEATURE_WALLET_COINS;
  process.env.BYPASS_FEATURE_FLAGS = '';
  process.env.FEATURE_WALLET_COINS = 'false';

  await cleanup();
  for (const [id, phone, role] of [[CUSTOMER, '9833010101', 'user'], [ADMIN, '9833010102', 'super_admin'], [OWNER, '9833010103', 'shop_owner']]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, `D10 ${role}`, phone, role]);
  }
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, delivery_available)
     VALUES ($1, $2, 'D10 Shop', 'Electronics', 'Road', 'POINT(73.87 18.53)', 18.53, 73.87, '1')`,
    [SHOP, OWNER]
  );
  await query(
    `INSERT INTO shop_products (id, shop_id, name, price, inventory_count, stock_quantity, track_inventory) VALUES ($1, $2, 'D10 Rice', 100, 0, 0, 0)`,
    [RICE, SHOP]
  );
  const now = new Date().toISOString();
  for (const [id, total] of [[RETURNED, 250], [REFUNDED, 400], [DISPUTED, 300]]) {
    await query(
      `INSERT INTO orders (id, user_id, shop_id, subtotal, total_amount, delivery_fee, payment_method, payment_status, order_status, status, fulfillment_method, delivered_at)
       VALUES ($1, $2, $3, $4, $4, 0, 'cod', 'paid', 'delivered', 'delivered', 'pickup', $5)`,
      [id, CUSTOMER, SHOP, total, now]
    );
  }
  await query(
    `INSERT INTO disputes (id, user_id, order_id, shop_id, type, description, status, created_at)
     VALUES ($1, $2, $3, $4, 'quality_issue', 'Wrong size', 'open', $5)`,
    [DISPUTE, CUSTOMER, DISPUTED, SHOP, now]
  );
  app = express();
  app.use(express.json());
  app.use('/orders/returns', require('../../modules/ecommerce/routes/return.routes'));
  app.use('/orders', require('../../modules/ecommerce/routes/order.routes'));
  app.use('/admin/commerce', require('../../modules/crm/routes/admin-commerce.routes'));
  app.use('/checkout', require('../../modules/ecommerce/routes/checkout.routes'));
  app.use('/shops', require('../../modules/ecommerce/routes/shop.routes'));
  app.use(require('../../middleware/error.middleware').errorHandler);
});

afterAll(async () => {
  await cleanup();
  if (saved.bypass === undefined) delete process.env.BYPASS_FEATURE_FLAGS; else process.env.BYPASS_FEATURE_FLAGS = saved.bypass;
  if (saved.wallet === undefined) delete process.env.FEATURE_WALLET_COINS; else process.env.FEATURE_WALLET_COINS = saved.wallet;
});

const payoutsFor = (orderId) => queryMany('SELECT * FROM refund_payouts WHERE order_id = $1', [orderId]);

test('[C10.12] with the wallet off, an accepted cash return is a payout the admin pays and confirms; the customer is told', async () => {
  expect((await request(app).post(`/orders/${RETURNED}/returns`).set(as(CUSTOMER)).send({ reasonCode: 'damaged', refundUpi: 'not a upi' })).status).toBe(400);
  const filed = await request(app).post(`/orders/${RETURNED}/returns`).set(as(CUSTOMER)).send({ reasonCode: 'damaged', reason: 'Bent', refundUpi: 'meera@okbank' });
  expect(filed.status).toBe(201);

  const approved = await request(app).put(`/orders/returns/${filed.body.data.id}/verify`).set(as(ADMIN)).send({ action: 'approve' });
  expect(approved.body).toMatchObject({ status: 'refund_pending', refundChannel: 'manual_payout', refundAmount: 250 });
  expect(await walletCredits()).toBe(0);
  const [payout] = await payoutsFor(RETURNED);
  expect(payout).toMatchObject({ status: 'pending', payee_upi: 'meera@okbank', source_type: 'return' });
  expect(Number(payout.amount)).toBe(250);

  let mine = (await request(app).get('/orders/returns/mine').set(as(CUSTOMER))).body.data.find((r) => r.order_id === RETURNED);
  expect(mine).toMatchObject({ refund_channel: 'manual_payout', payout_status: 'pending', refund_upi: 'meera@okbank' });

  const queue = await request(app).get('/admin/commerce/refund-payouts').set(as(ADMIN));
  expect(queue.body.data.map((p) => p.id)).toContain(payout.id);
  expect((await request(app).get('/admin/commerce/refund-payouts').set(as(CUSTOMER))).status).toBe(403);

  expect((await request(app).post(`/admin/commerce/refund-payouts/${payout.id}/paid`).set(as(ADMIN)).send({ reference: 'x' })).status).toBe(400);
  const paid = await request(app).post(`/admin/commerce/refund-payouts/${payout.id}/paid`).set(as(ADMIN)).send({ reference: 'UPI123456789' });
  expect(paid.body).toMatchObject({ status: 'paid', reference: 'UPI123456789', amount: 250 });
  expect((await request(app).post(`/admin/commerce/refund-payouts/${payout.id}/paid`).set(as(ADMIN)).send({ reference: 'UPI999999999' })).status).toBe(409);

  mine = (await request(app).get('/orders/returns/mine').set(as(CUSTOMER))).body.data.find((r) => r.order_id === RETURNED);
  expect(mine).toMatchObject({ payout_status: 'paid', payout_reference: 'UPI123456789' });
  expect((await queryOne('SELECT payment_status, return_status FROM orders WHERE id = $1', [RETURNED]))).toEqual({ payment_status: 'refunded', return_status: 'refunded' });
  const notes = await queryMany('SELECT title, body FROM shop_notifications WHERE recipient_id = $1', [CUSTOMER]);
  expect(notes.find((n) => n.title === 'Refund sent').body).toMatch(/meera@okbank.*UPI123456789/);
  const ledger = await queryMany("SELECT account_type, entry_type, amount_paise FROM platform_ledger_entries WHERE reference_id = $1 AND description LIKE 'Manual refund payout%'", [RETURNED]);
  expect(ledger.map((e) => [e.entry_type, e.account_type, Number(e.amount_paise)]).sort()).toEqual([['CREDIT', 'CUSTOMER_CASH', 25000], ['DEBIT', 'REFUND_PAYABLE', 25000]]);
});

test('[A4.20] with the wallet off, an admin order refund is queued for payout, and payouts count against the order', async () => {
  const first = await request(app).post(`/admin/commerce/orders/${REFUNDED}/refund`).set(as(ADMIN)).send({ amount: 300, reason: 'Late delivery' });
  expect(first.status).toBe(200);
  expect(first.body).toMatchObject({ channel: 'manual_payout', refundAmount: 300, refundable: 100 });
  expect(first.body.message).toMatch(/queued for payout/);
  expect(await walletCredits()).toBe(0);
  const over = await request(app).post(`/admin/commerce/orders/${REFUNDED}/refund`).set(as(ADMIN)).send({ amount: 150, reason: 'More' });
  expect(over.status).toBe(400);
  expect(over.body.refundable).toBe(100);
});

test('[A5.10] a dispute is refunded once, within what the order can still refund', async () => {
  const tooMuch = await request(app).put(`/admin/commerce/disputes/${DISPUTE}/resolve`).set(as(ADMIN)).send({ resolution: 'refund_customer', refundAmount: 350 });
  expect(tooMuch.status).toBe(400);
  const ok = await request(app).put(`/admin/commerce/disputes/${DISPUTE}/resolve`).set(as(ADMIN)).send({ resolution: 'refund_customer', refundAmount: 120 });
  expect(ok.status).toBe(200);
  const again = await request(app).put(`/admin/commerce/disputes/${DISPUTE}/resolve`).set(as(ADMIN)).send({ resolution: 'refund_customer', refundAmount: 120 });
  expect(again.status).toBe(409);
  const payouts = await payoutsFor(DISPUTED);
  expect(payouts.map((p) => [p.source_type, Number(p.amount)])).toEqual([['dispute', 120]]);
  // The order refund now sees the dispute's refund.
  const rest = await request(app).post(`/admin/commerce/orders/${DISPUTED}/refund`).set(as(ADMIN)).send({ reason: 'Remainder' });
  expect(rest.body.refundAmount).toBe(180);
});

test('[C8.20] with the wallet off, checkout does not offer it and will not take it', async () => {
  const quote = await request(app).post('/checkout/quote').send({ shopId: SHOP, items: [{ productId: RICE, quantity: 1 }], deliveryMode: 'pickup' });
  expect(quote.body.paymentMethods.wallet).toBe(false);
  const single = await request(app).post('/checkout').set(as(CUSTOMER)).send({ shopId: SHOP, items: [{ productId: RICE, quantity: 1 }], paymentMethod: 'wallet', deliveryMode: 'pickup' });
  expect(single.status).toBe(400);
  expect(single.body.code).toBe('WALLET_UNAVAILABLE');
  const batch = await request(app).post('/shops/cart/batch-checkout').set(as(CUSTOMER))
    .send({ items: [{ shop_id: SHOP, product_id: RICE, quantity: 1 }], deliveryMode: 'pickup', paymentMethod: 'wallet' });
  expect(batch.status).toBe(400);
  expect(batch.body.code).toBe('WALLET_UNAVAILABLE');
  const cod = await request(app).post('/checkout').set(as(CUSTOMER)).send({ shopId: SHOP, items: [{ productId: RICE, quantity: 1 }], paymentMethod: 'cod', deliveryMode: 'pickup' });
  expect(cod.status).toBe(201);
});
