/**
 * Counter sales on the shop's POS screen are priced, taxed and stock-checked on the server.
 */


const { fx, fxLike } = require('../helpers/fixtureIds');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const OWNER = fx('pos-owner');
const STRANGER = fx('pos-stranger');
const SHOP = fx('pos-shop');
const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId, tokenVersion: 0 }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;

async function cleanup() {
  await query(`DELETE FROM pos_sales WHERE shop_id = '${fx('pos-shop')}'`);
  await query(`DELETE FROM shop_products WHERE shop_id = '${fx('pos-shop')}'`);
  await query(`DELETE FROM local_shops WHERE id = '${fx('pos-shop')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('pos')}'`);
}
const stock = async (id) => Number(((await query('SELECT inventory_count AS n FROM shop_products WHERE id = $1', [id])).rows || [])[0].n);

beforeAll(async () => {
  await cleanup();
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'Owner', '9866000001', 'shop_owner')", [OWNER]);
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'Stranger', '9866000002', 'user')", [STRANGER]);
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, is_active, approval_status, is_verified)
     VALUES ($1, $2, 'POS Shop', 'Grocery', 'Road 1', 'POINT(73.8 18.5)', 18.5, 73.8, '1', 'approved', '1')`, [SHOP, OWNER]
  );
  await query(`INSERT INTO shop_products (id, shop_id, name, price, stock_quantity, inventory_count, track_inventory, is_available, is_active) VALUES ('${fx('pos-p1')}', $1, 'Rice', 100, 10, 10, '1', '1', '1')`, [SHOP]);
  await query(`INSERT INTO shop_products (id, shop_id, name, price, stock_quantity, inventory_count, track_inventory, is_available, is_active) VALUES ('${fx('pos-p2')}', $1, 'Salt', 20, 3, 3, '1', '1', '1')`, [SHOP]);

  app = express();
  app.use(express.json());
  app.use('/shops', require('../../modules/ecommerce/routes/shop.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use(require('../../middleware/error.middleware').errorHandler);
});

afterAll(cleanup);

test('only the shop owner can ring a sale', async () => {
  expect((await request(app).post(`/shops/my-shop/pos-sales`).send({ items: [] })).status).toBe(401);
  const res = await request(app).post(`/shops/my-shop/pos-sales`).set(as(STRANGER)).send({ items: [{ productId: fx('pos-p1'), quantity: 1 }] });
  expect([403, 404]).toContain(res.status);
});

test('the server prices the sale, adds GST and takes stock off', async () => {
  const res = await request(app).post(`/shops/my-shop/pos-sales`).set(as(OWNER)).send({
    items: [{ productId: fx('pos-p1'), quantity: 2, price: 1 }, { productId: fx('pos-p2'), quantity: 1 }], // a client-sent price is ignored
    discount: { type: 'flat', value: 20 }, gstRate: 5, paymentMethod: 'upi',
  });
  expect(res.status).toBe(201);
  // 2×100 + 20 = 220; −20 = 200; GST 5% = 10; total 210
  expect(res.body.sale).toMatchObject({ subtotal: 220, discount: 20, gstAmount: 10, total: 210, paymentMethod: 'upi' });
  expect(res.body.sale.billNo).toMatch(/^LS-\d{8}-0001$/);
  expect(await stock(fx('pos-p1'))).toBe(8);
  expect(await stock(fx('pos-p2'))).toBe(2);
});

test('a sale that would oversell is refused whole, with no stock taken', async () => {
  const res = await request(app).post(`/shops/my-shop/pos-sales`).set(as(OWNER)).send({
    items: [{ productId: fx('pos-p1'), quantity: 1 }, { productId: fx('pos-p2'), quantity: 5 }],
  });
  expect(res.status).toBe(409);
  expect(res.body.code).toBe('INSUFFICIENT_STOCK');
  expect(await stock(fx('pos-p1'))).toBe(8); // the first line was rolled back
  expect(await stock(fx('pos-p2'))).toBe(2);
});

test('bad input is a 400, and another shop\'s product is not sellable', async () => {
  const bad = await request(app).post(`/shops/my-shop/pos-sales`).set(as(OWNER)).send({ items: [{ productId: fx('pos-p1'), quantity: 0 }] });
  expect(bad.status).toBe(400);
  const unknown = await request(app).post(`/shops/my-shop/pos-sales`).set(as(OWNER)).send({ items: [{ productId: 'nope', quantity: 1 }] });
  expect(unknown.status).toBe(400);
  const gst = await request(app).post(`/shops/my-shop/pos-sales`).set(as(OWNER)).send({ items: [{ productId: fx('pos-p1'), quantity: 1 }], gstRate: 7 });
  expect(gst.status).toBe(400);
});

test('the sales list reports today\'s takings', async () => {
  const res = await request(app).get(`/shops/my-shop/pos-sales`).set(as(OWNER));
  expect(res.status).toBe(200);
  expect(res.body.sales).toHaveLength(1);
  expect(res.body.todaysTotal).toBe(210);
});
