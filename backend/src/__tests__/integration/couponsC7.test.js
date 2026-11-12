/**
 * C7: coupons at checkout, for one shop's order and for a cart from several
 * shops (Decision D6).
 *
 *   - the bill showed no discount: the quote applied a coupon and then left
 *     the discount out of what it sent back;
 *   - a coupon that did not apply failed the whole quote, so the checkout
 *     lost its bill over a typo in the code;
 *   - a multi-shop cart checked the coupon against each shop separately,
 *     then overwrote its discount with the coins discount and redeemed it once
 *     per order;
 *   - the per-customer limit was checked only when pricing, so two orders
 *     placed at once both used a once-per-customer coupon;
 *   - a coupon could be made with terms nobody could honour (150%, ending
 *     before it starts).
 */
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { fx, fxLike } = require('../helpers/fixtureIds');
const { query, queryOne, queryMany, withTransaction } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const coupons = require('../../services/coupon.service');

const BUYER = fx('c7x-buyer');
const OTHER = fx('c7x-other');
const OWNER = fx('c7x-owner');
const ADMIN = fx('c7x-admin');
const SHOP_A = fx('c7x-shop-a');
const SHOP_B = fx('c7x-shop-b');
const RICE = fx('c7x-rice');
const SOAP = fx('c7x-soap');
const NEAR = { lat: 18.535, lng: 73.875 }; // ₹20 delivery from either shop

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;

async function cleanup() {
  await query("DELETE FROM coupon_redemptions WHERE coupon_id IN (SELECT id FROM coupons WHERE code LIKE 'C7X%')");
  await query("DELETE FROM coupons WHERE code LIKE 'C7X%'");
  await query(`DELETE FROM admin_audit_log WHERE CAST(admin_id AS TEXT) LIKE '${fxLike('c7x')}'`);
  await query(`DELETE FROM shop_commissions WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('c7x')}'`);
  await query(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c7x')}')`);
  await query(`DELETE FROM orders WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c7x')}'`);
  await query(`DELETE FROM batch_orders WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c7x')}'`);
  await query(`DELETE FROM idempotency_keys WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c7x')}'`);
  await query(`DELETE FROM shop_products WHERE CAST(id AS TEXT) LIKE '${fxLike('c7x')}'`);
  await query(`DELETE FROM local_shops WHERE CAST(id AS TEXT) LIKE '${fxLike('c7x')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('c7x')}'`);
}

async function coupon(code, fields = {}) {
  return coupons.createCoupon({ code, discount_type: 'fixed', discount_value: 50, min_order_amount: 0, max_uses: 100, per_user_limit: 5, ...fields });
}

beforeAll(async () => {
  await cleanup();
  for (const [id, name, phone, role] of [[BUYER, 'C7 Buyer', '9833777001', 'user'], [OTHER, 'C7 Other', '9833777003', 'user'], [OWNER, 'C7 Owner', '9833777002', 'shop_owner'], [ADMIN, 'C7 Admin', '9833777004', 'super_admin']]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, name, phone, role]);
  }
  for (const [id, name] of [[SHOP_A, 'C7 Grocer'], [SHOP_B, 'C7 Chemist']]) {
    await query(
      `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, delivery_available)
       VALUES ($1, $2, $3, 'Grocery', 'Test Address', 'POINT(73.87 18.53)', 18.53, 73.87, '1')`,
      [id, OWNER, name]
    );
  }
  for (const [id, shop, name, price] of [[RICE, SHOP_A, 'C7 Rice', 300], [SOAP, SHOP_B, 'C7 Soap', 100]]) {
    await query(
      `INSERT INTO shop_products (id, shop_id, name, price, inventory_count, stock_quantity, stock, track_inventory)
       VALUES ($1, $2, $3, $4, 0, 0, 0, 0)`,
      [id, shop, name, price]
    );
  }
  app = express();
  app.use(express.json());
  app.use('/checkout', require('../../modules/ecommerce/routes/checkout.routes'));
  app.use('/shops', require('../../modules/ecommerce/routes/shop.routes'));
  app.use('/admin/commerce', require('../../modules/crm/routes/admin-commerce.routes'));
  app.use(require('../../middleware/error.middleware').errorHandler);
});

afterAll(cleanup);

const single = (extra) => ({ shopId: SHOP_A, items: [{ productId: RICE, quantity: 1 }], deliveryCoordinate: NEAR, deliveryAddress: 'Flat 7', ...extra });
const cart = [{ shop_id: SHOP_A, product_id: RICE, quantity: 1 }, { shop_id: SHOP_B, product_id: SOAP, quantity: 1 }];
const redemptions = async (code) => queryMany('SELECT r.* FROM coupon_redemptions r JOIN coupons c ON c.id = r.coupon_id WHERE c.code = $1', [code]);

describe('one shop', () => {
  test('[C7.7] the bill shows what a coupon takes off, the order is charged it, and the coupon is used once', async () => {
    await coupon('C7XFLAT', { discount_value: 50, min_order_amount: 200 });
    const quote = await request(app).post('/checkout/quote').set(as(BUYER)).send(single({ couponCode: 'c7xflat' }));
    expect(quote.status).toBe(200);
    // ₹300 + ₹20 delivery + ₹5 platform fee − ₹50.
    expect(quote.body.bill).toMatchObject({ subtotal: 300, deliveryFee: 20, discount: 50, total: 275, coupon: { code: 'C7XFLAT', discount: 50 }, couponError: null });

    const placed = await request(app).post('/checkout').set(as(BUYER)).send(single({ couponCode: 'C7XFLAT', paymentMethod: 'cod' }));
    expect(placed.status).toBe(201);
    const order = await queryOne('SELECT total_amount, discount FROM orders WHERE id = $1', [placed.body.order.id]);
    expect(Number(order.total_amount)).toBe(275);
    expect(Number(order.discount)).toBe(50);
    const used = await redemptions('C7XFLAT');
    expect(used.map((r) => [String(r.order_id), Number(r.discount_applied)])).toEqual([[String(placed.body.order.id), 50]]);
    expect(Number((await queryOne("SELECT current_uses FROM coupons WHERE code = 'C7XFLAT'")).current_uses)).toBe(1);
  });

  test('[C7.8] a coupon that does not apply keeps the bill and says why; the order with it is refused, nothing written', async () => {
    await coupon('C7XBIGMIN', { min_order_amount: 1000 });
    const quote = await request(app).post('/checkout/quote').set(as(BUYER)).send(single({ couponCode: 'C7XBIGMIN' }));
    expect(quote.status).toBe(200);
    expect(quote.body.bill).toMatchObject({ total: 325, discount: 0, coupon: null, couponError: { code: 'MIN_ORDER_NOT_MET' } });
    const unknown = await request(app).post('/checkout/quote').set(as(BUYER)).send(single({ couponCode: 'NOPE-C7X' }));
    expect(unknown.body.bill.couponError.code).toBe('COUPON_NOT_FOUND');

    const before = (await queryMany('SELECT id FROM orders WHERE user_id = $1', [BUYER])).length;
    const refused = await request(app).post('/checkout').set(as(BUYER)).send(single({ couponCode: 'C7XBIGMIN', paymentMethod: 'cod' }));
    expect(refused.status).toBe(400);
    expect(refused.body.code).toBe('MIN_ORDER_NOT_MET');
    expect((await queryMany('SELECT id FROM orders WHERE user_id = $1', [BUYER])).length).toBe(before);
  });

  test('[C7.9] free delivery waives the delivery charge; a percentage is capped; another shop\'s coupon does not apply', async () => {
    await coupon('C7XSHIP', { discount_type: 'free_delivery', discount_value: 0 });
    const ship = await request(app).post('/checkout/quote').set(as(BUYER)).send(single({ couponCode: 'C7XSHIP' }));
    expect(ship.body.bill).toMatchObject({ deliveryFee: 0, discount: 0, total: 305, coupon: { type: 'free_delivery', deliveryWaived: 20 } });

    await coupon('C7XPCT', { discount_type: 'percentage', discount_value: 20, max_discount_amount: 40 });
    const pct = await request(app).post('/checkout/quote').set(as(BUYER)).send(single({ couponCode: 'C7XPCT' }));
    expect(pct.body.bill).toMatchObject({ discount: 40, total: 285 }); // 20% of ₹300 is ₹60, capped at ₹40

    await coupon('C7XCHEMIST', { shop_id: SHOP_B });
    const other = await request(app).post('/checkout/quote').set(as(BUYER)).send(single({ couponCode: 'C7XCHEMIST' }));
    expect(other.body.bill.couponError.code).toBe('SHOP_MISMATCH');
  });
});

describe('a cart from several shops (D6)', () => {
  test('[C7.10] a platform coupon is priced once for the cart and shared between the orders; it is used once', async () => {
    await coupon('C7XCART', { discount_value: 80, min_order_amount: 350 }); // ₹350: more than either shop's items alone
    const quote = await request(app).post('/shops/cart/batch-quote').set(as(BUYER))
      .send({ items: cart, deliveryCoordinate: NEAR, couponCode: 'C7XCART' });
    expect(quote.status).toBe(200);
    // ₹400 items, ₹30 delivery (₹20 + ₹10 second pickup), ₹5 platform fee, −₹80.
    expect(quote.body.bill).toMatchObject({ subtotal: 400, deliveryFee: 30, discount: 80, total: 355, coupon: { code: 'C7XCART' } });
    // Shared by items: ₹300 of ₹400 → ₹60, ₹100 → ₹20.
    const shares = Object.fromEntries(quote.body.shops.map((s) => [s.shopName, s.discount]));
    expect(shares).toEqual({ 'C7 Grocer': 60, 'C7 Chemist': 20 });

    const placed = await request(app).post('/shops/cart/batch-checkout').set(as(BUYER))
      .send({ items: cart, deliveryCoordinate: NEAR, address: 'Flat 7', paymentMethod: 'cod', couponCode: 'C7XCART' });
    expect(placed.status).toBe(200);
    expect(placed.body.discount).toBe(80);
    const orders = await queryMany(`SELECT shop_id, discount, total_amount FROM orders WHERE id IN (${placed.body.orderIds.map((_, i) => `$${i + 1}`).join(', ')})`, placed.body.orderIds);
    expect(orders.reduce((sum, o) => sum + Number(o.discount), 0)).toBe(80);
    expect(orders.reduce((sum, o) => sum + Number(o.total_amount), 0)).toBe(355);
    const used = await redemptions('C7XCART');
    expect(used).toHaveLength(1);
    expect(Number(used[0].discount_applied)).toBe(80);
  });

  test('[C7.11] a shop\'s coupon in a multi-shop cart comes off that shop\'s order only, judged on its items', async () => {
    await coupon('C7XGROCER', { shop_id: SHOP_A, discount_value: 25, min_order_amount: 250 });
    const quote = await request(app).post('/shops/cart/batch-quote').set(as(BUYER))
      .send({ items: cart, deliveryCoordinate: NEAR, couponCode: 'C7XGROCER' });
    expect(Object.fromEntries(quote.body.shops.map((s) => [s.shopName, s.discount]))).toEqual({ 'C7 Grocer': 25, 'C7 Chemist': 0 });
    expect(quote.body.bill.total).toBe(410);

    await coupon('C7XCHEMMIN', { shop_id: SHOP_B, min_order_amount: 150 }); // the chemist's items are ₹100
    const short = await request(app).post('/shops/cart/batch-quote').set(as(BUYER))
      .send({ items: cart, deliveryCoordinate: NEAR, couponCode: 'C7XCHEMMIN' });
    expect(short.body.bill).toMatchObject({ discount: 0, couponError: { code: 'MIN_ORDER_NOT_MET' } });
    const refused = await request(app).post('/shops/cart/batch-checkout').set(as(BUYER))
      .send({ items: cart, deliveryCoordinate: NEAR, address: 'Flat 7', paymentMethod: 'cod', couponCode: 'C7XCHEMMIN' });
    expect(refused.status).toBe(400);
    expect(refused.body.code).toBe('MIN_ORDER_NOT_MET');
  });
});

describe('limits', () => {
  test('[C7.12] a once-per-customer coupon used by two orders at once is redeemed once', async () => {
    const c = await coupon('C7XONCE', { per_user_limit: 1, max_uses: 100 });
    const attempt = () => withTransaction((client) => coupons.redeemCoupon({ couponId: c.id, userId: OTHER, orderId: null, discountApplied: 50, client }));
    const results = await Promise.allSettled([attempt(), attempt()]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected').reason).toMatchObject({ code: 'USER_LIMIT_REACHED' });
    expect(await redemptions('C7XONCE')).toHaveLength(1);
    expect(Number((await queryOne("SELECT current_uses FROM coupons WHERE code = 'C7XONCE'")).current_uses)).toBe(1);
  });

  test('[C7.13] terms that cannot be honoured are refused when the coupon is made', async () => {
    for (const [fields, message] of [
      [{ discount_type: 'percentage', discount_value: 150 }, /between 1 and 100/],
      [{ discount_type: 'fixed', discount_value: -5 }, /more than ₹0/],
      [{ discount_type: 'bogus' }, /type must be/],
      [{ start_date: '2026-12-10', end_date: '2026-12-01' }, /end after it starts/],
      [{ per_user_limit: -1 }, /at least 1/],
    ]) {
      await expect(coupon(`C7XBAD${Math.random().toString(36).slice(2, 7).toUpperCase()}`, fields)).rejects.toThrow(message);
    }
  });
});

describe('the admin console (A7)', () => {
  test('[C7.14] a "₹ off" coupon made in the console takes money off; impossible terms are refused; a paused coupon stops working', async () => {
    const admin = as(ADMIN);
    const made = await request(app).post('/admin/commerce/coupons').set(admin)
      .send({ code: 'c7xconsole', discountType: 'flat', discountValue: '30', minOrderAmount: '', usageLimit: '', perUserLimit: '2', firstOrderOnly: false, endDate: '' });
    expect(made.status).toBe(201);
    const row = await queryOne("SELECT discount_type, per_user_limit, max_uses FROM coupons WHERE code = 'C7XCONSOLE'");
    expect(row).toMatchObject({ discount_type: 'fixed' });
    expect(Number(row.per_user_limit)).toBe(2);
    const quote = await request(app).post('/checkout/quote').set(as(BUYER)).send(single({ couponCode: 'C7XCONSOLE' }));
    expect(quote.body.bill).toMatchObject({ discount: 30, total: 295 });

    const bad = await request(app).post('/admin/commerce/coupons').set(admin).send({ code: 'C7XHUGE', discountType: 'percentage', discountValue: 150 });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('INVALID_DATA');
    const ship = await request(app).post('/admin/commerce/coupons').set(admin).send({ code: 'C7XFREESHIP', discountType: 'free_delivery' });
    expect(ship.status).toBe(201);

    const paused = await request(app).put(`/admin/commerce/coupons/${made.body.data.id}`).set(admin).send({ isActive: false });
    expect(paused.status).toBe(200);
    const after = await request(app).post('/checkout/quote').set(as(BUYER)).send(single({ couponCode: 'C7XCONSOLE' }));
    expect(after.body.bill).toMatchObject({ discount: 0, couponError: { code: 'COUPON_NOT_FOUND' } });
    expect((await request(app).put(`/admin/commerce/coupons/${made.body.data.id}`).set(as(BUYER)).send({ isActive: true })).status).toBe(403);
  });
});
