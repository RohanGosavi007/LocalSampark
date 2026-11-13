/**
 * S5 Shop-Level Coupons & Offers — API proof.
 *
 * A seller runs coupons for their own shop (GET/POST/PATCH /shops/:id/coupons),
 * and such a coupon only ever discounts that shop's orders.
 */
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { fx, fxLike } = require('../helpers/fixtureIds');
const { query, queryOne } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const { pointSql } = require('../../utils/sqlPoint');
const shopRouter = require('../../modules/ecommerce/routes/shop.routes');
const orderRouter = require('../../modules/ecommerce/routes/order.routes');

const OWNER_A = fx('s5x-owner-a');
const OWNER_B = fx('s5x-owner-b');
const BUYER = fx('s5x-buyer');
const SHOP_A = fx('s5x-shop-a');
const SHOP_B = fx('s5x-shop-b');

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;

async function cleanup() {
  await query("DELETE FROM coupons WHERE code LIKE 'S5X%'");
  await query(`DELETE FROM local_shops WHERE CAST(id AS TEXT) LIKE '${fxLike('s5x')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('s5x')}'`);
}

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use('/shops', shopRouter);
  app.use('/orders', orderRouter);

  await cleanup();
  for (const [id, name, phone, role] of [
    [OWNER_A, 'S5 Owner A', '9833555001', 'shop_owner'],
    [OWNER_B, 'S5 Owner B', '9833555002', 'shop_owner'],
    [BUYER, 'S5 Buyer', '9833555003', 'user'],
  ]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, name, phone, role]);
  }
  for (const [id, owner, name] of [[SHOP_A, OWNER_A, 'S5 Shop A'], [SHOP_B, OWNER_B, 'S5 Shop B']]) {
    await query(
      `INSERT INTO local_shops (id, owner_id, name, category, address, is_active, is_verified, latitude, longitude, coordinate)
       VALUES ($1, $2, $3, 'grocery', 'S5 Road', true, true, 18.53, 73.87, ${pointSql(18.53, 73.87)})`,
      [id, owner, name]
    );
  }
});

afterAll(cleanup);

const newCoupon = (overrides = {}) => ({
  code: 's5xten', discount_type: 'percentage', discount_value: 10, min_order_amount: 200, max_discount_amount: 80, ...overrides,
});

describe('[S5.1] shop-coupon: shop-specific scope validation', () => {
  let couponId;

  test('[S5.1] a seller creates a coupon for their own shop; it is pinned to that shop', async () => {
    const res = await request(app).post(`/shops/${SHOP_A}/coupons`).set(as(OWNER_A))
      .send(newCoupon({ shop_id: SHOP_B })); // a smuggled shop_id is ignored
    expect(res.status).toBe(201);
    expect(res.body.data.code).toBe('S5XTEN');
    expect(String(res.body.data.shop_id)).toBe(SHOP_A);
    couponId = res.body.data.id;
  });

  test('[S5.1] the coupon discounts an order at its own shop', async () => {
    const res = await request(app).post('/orders/validate-coupon').set(as(BUYER))
      .send({ code: 'S5XTEN', cartTotal: 500, shopId: SHOP_A });
    expect(res.status).toBe(200);
    expect(Number(res.body.coupon.discount)).toBe(50); // 10% of 500, under the ₹80 cap
  });

  test('[S5.1] the same coupon is refused at another shop', async () => {
    const res = await request(app).post('/orders/validate-coupon').set(as(BUYER))
      .send({ code: 'S5XTEN', cartTotal: 500, shopId: SHOP_B });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SHOP_MISMATCH');
  });

  test('[S5.1] the shop\'s minimum order still applies', async () => {
    const res = await request(app).post('/orders/validate-coupon').set(as(BUYER))
      .send({ code: 'S5XTEN', cartTotal: 150, shopId: SHOP_A });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MIN_ORDER_NOT_MET');
  });

  test('[S5.1] another seller cannot create, list or change coupons for a shop they do not own', async () => {
    const create = await request(app).post(`/shops/${SHOP_A}/coupons`).set(as(OWNER_B)).send(newCoupon({ code: 's5xsteal' }));
    expect(create.status).toBe(403);
    const list = await request(app).get(`/shops/${SHOP_A}/coupons`).set(as(OWNER_B));
    expect(list.status).toBe(403);
    const patch = await request(app).patch(`/shops/${SHOP_A}/coupons/${couponId}`).set(as(OWNER_B)).send({ is_active: false });
    expect(patch.status).toBe(403);
    expect(await queryOne("SELECT id FROM coupons WHERE code = 'S5XSTEAL'")).toBeFalsy();
  });

  test('[S5.1] a seller cannot reach another shop\'s coupon through their own shop', async () => {
    const res = await request(app).patch(`/shops/${SHOP_B}/coupons/${couponId}`).set(as(OWNER_B)).send({ is_active: false });
    expect(res.status).toBe(404);
    const row = await queryOne('SELECT is_active FROM coupons WHERE id = $1', [couponId]);
    expect([true, 1, '1', 't']).toContain(row.is_active);
  });

  test('[S5.1] signed-out requests are refused', async () => {
    expect((await request(app).get(`/shops/${SHOP_A}/coupons`)).status).toBe(401);
    expect((await request(app).post(`/shops/${SHOP_A}/coupons`).send(newCoupon({ code: 's5xanon' }))).status).toBe(401);
  });

  test('[S5.1] the owner lists only their shop\'s coupons', async () => {
    await request(app).post(`/shops/${SHOP_B}/coupons`).set(as(OWNER_B)).send(newCoupon({ code: 's5xbee' }));
    const res = await request(app).get(`/shops/${SHOP_A}/coupons`).set(as(OWNER_A));
    expect(res.status).toBe(200);
    expect(res.body.data.map((c) => c.code)).toEqual(['S5XTEN']);
  });

  test('[S5.1] switching the coupon off stops it being accepted', async () => {
    const off = await request(app).patch(`/shops/${SHOP_A}/coupons/${couponId}`).set(as(OWNER_A)).send({ is_active: false, code: 'S5XRENAMED' });
    expect(off.status).toBe(200);
    expect(off.body.data.code).toBe('S5XTEN'); // the code cannot be changed once issued
    const res = await request(app).post('/orders/validate-coupon').set(as(BUYER))
      .send({ code: 'S5XTEN', cartTotal: 500, shopId: SHOP_A });
    expect(res.status).not.toBe(200);
  });

  test.each([
    ['a percentage over 100', { code: 's5xbad1', discount_value: 150 }],
    ['a negative minimum order', { code: 's5xbad2', min_order_amount: -1 }],
    ['an end before the start', { code: 's5xbad3', start_date: '2026-12-10', end_date: '2026-12-01' }],
  ])('[S5.1] terms nobody can honour are refused: %s', async (_label, fields) => {
    const res = await request(app).post(`/shops/${SHOP_A}/coupons`).set(as(OWNER_A)).send(newCoupon(fields));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_DATA');
  });

  test('[S5.1] a code already in use is refused', async () => {
    const res = await request(app).post(`/shops/${SHOP_A}/coupons`).set(as(OWNER_A)).send(newCoupon({ code: 'S5XBEE' }));
    expect(res.status).toBe(409);
  });
});
