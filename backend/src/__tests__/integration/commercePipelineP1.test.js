/**
 * P1 Canonical Commerce Pipeline — API proof.
 *
 * P1.1  one transition table (orderLifecycle.TRANSITIONS) decides every move.
 * P1.2  every older order-status route is a proxy for it: before the pipeline,
 *       PUT /orders/:id/status and PATCH /orders/:id/status took any status
 *       from any status. Each route below must refuse a skipped step and a
 *       move out of a final state, and must make a legal move.
 */
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { fx, fxLike } = require('../helpers/fixtureIds');
const { query, queryOne } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const { pointSql } = require('../../utils/sqlPoint');
const lifecycle = require('../../services/orderLifecycle.service');

const OWNER = fx('p1x-owner');
const BUYER = fx('p1x-buyer');
const STRANGER = fx('p1x-stranger');
const SHOP = fx('p1x-shop');

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;
let seq = 0;

async function cleanup() {
  await query(`DELETE FROM shop_commissions WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('p1x')}'`);
  await query(`DELETE FROM order_items WHERE CAST(order_id AS TEXT) LIKE '${fxLike('p1x')}'`);
  await query(`DELETE FROM orders WHERE CAST(id AS TEXT) LIKE '${fxLike('p1x')}'`);
  await query(`DELETE FROM local_shops WHERE CAST(id AS TEXT) LIKE '${fxLike('p1x')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('p1x')}'`);
}

/** A cash-on-delivery order in the given status. */
async function orderIn(status) {
  seq += 1;
  const id = fx(`p1x-order-${seq}`);
  await query(
    `INSERT INTO orders (id, user_id, shop_id, total_amount, subtotal, delivery_fee, status, order_status, payment_method, payment_status, fulfillment_method)
     VALUES ($1, $2, $3, 100, 100, 0, $4, $5, 'COD', 'unpaid', 'delivery')`,
    // One parameter per column: PostgreSQL refuses a reused one across types.
    [id, BUYER, SHOP, status, status]
  );
  return id;
}
const statusOf = async (id) => {
  const row = await queryOne('SELECT order_status, status FROM orders WHERE id = $1', [id]);
  return row.order_status || row.status;
};

beforeAll(async () => {
  await cleanup();
  for (const [id, phone, role] of [[OWNER, '9844111001', 'shop_owner'], [BUYER, '9844111002', 'user'], [STRANGER, '9844111003', 'user']]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, `P1 ${role}`, phone, role]);
  }
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, delivery_available, is_verified)
     VALUES ($1, $2, 'P1 Shop', 'Grocery', 'Shop Road', ${pointSql(18.53, 73.87)}, 18.53, 73.87, '1', '1')`,
    [SHOP, OWNER]
  );

  app = express();
  app.use(express.json());
  app.use('/shops', require('../../modules/ecommerce/routes/shop.routes'));
  app.use('/orders', require('../../modules/ecommerce/routes/order.routes'));
  app.use('/', require('../../modules/ecommerce/routes/unified-superapp.routes'));
  app.use(require('../../middleware/error.middleware').errorHandler);
});

afterAll(cleanup);

describe('[P1.1] pipeline: canonical state transitions', () => {
  test('[P1.1] the table runs forward only, and final states lead nowhere', () => {
    const T = lifecycle.TRANSITIONS;
    expect(T.pending).toEqual(expect.arrayContaining(['confirmed', 'cancelled']));
    expect(T.pending).not.toContain('delivered');
    expect(T.confirmed).not.toContain('pending');
    expect(T.cancelled).toEqual([]);
    expect(T.returned).toEqual([]);
    // Every target is itself a known state.
    for (const targets of Object.values(T)) for (const t of targets) expect(T).toHaveProperty(t);
  });

  test('[P1.1] the shop walks an order through every step in order', async () => {
    const id = await orderIn('pending');
    // A delivery order goes out for delivery before it is delivered.
    for (const to of ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']) {
      const out = await lifecycle.changeStatus({ orderId: id, to, user: { id: OWNER, role: 'shop_owner' }, shopId: SHOP });
      expect(out.to).toBe(to);
      expect(await statusOf(id)).toBe(to);
    }
  });

  test('[P1.1] a skipped step, a step back, and a move out of a final state are refused', async () => {
    const owner = { id: OWNER, role: 'shop_owner' };
    const pending = await orderIn('pending');
    await expect(lifecycle.changeStatus({ orderId: pending, to: 'delivered', user: owner, shopId: SHOP }))
      .rejects.toBeInstanceOf(lifecycle.LifecycleError);

    const preparing = await orderIn('preparing');
    await expect(lifecycle.changeStatus({ orderId: preparing, to: 'confirmed', user: owner, shopId: SHOP }))
      .rejects.toBeInstanceOf(lifecycle.LifecycleError);

    const cancelled = await orderIn('cancelled');
    await expect(lifecycle.changeStatus({ orderId: cancelled, to: 'confirmed', user: owner, shopId: SHOP }))
      .rejects.toBeInstanceOf(lifecycle.LifecycleError);

    expect(await statusOf(pending)).toBe('pending');
    expect(await statusOf(preparing)).toBe('preparing');
    expect(await statusOf(cancelled)).toBe('cancelled');
  });
});

// Every older route that changes an order's status, and how it is called.
const ROUTES = [
  ['PUT /orders/:id/status', (id, status) => request(app).put(`/orders/${id}/status`).send({ status })],
  ['PUT /shops/orders/:id/status', (id, status) => request(app).put(`/shops/orders/${id}/status`).send({ status })],
  ['PUT /shops/my-shop/orders/:id/status', (id, status) => request(app).put(`/shops/my-shop/orders/${id}/status`).send({ status })],
  ['PATCH /orders/:id/status', (id, status) => request(app).patch(`/orders/${id}/status`).send({ status })],
];

describe('[P1.2] pipeline: legacy order route proxies', () => {
  test.each(ROUTES)('[P1.2] %s makes a legal move through the pipeline', async (_name, call) => {
    const id = await orderIn('pending');
    const res = await call(id, 'confirmed').set(as(OWNER));
    expect(res.status).toBe(200);
    expect(await statusOf(id)).toBe('confirmed');
  });

  test.each(ROUTES)('[P1.2] %s refuses to skip from pending straight to delivered', async (_name, call) => {
    const id = await orderIn('pending');
    const res = await call(id, 'delivered').set(as(OWNER));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(await statusOf(id)).toBe('pending');
  });

  test.each(ROUTES)('[P1.2] %s cannot revive a cancelled order', async (_name, call) => {
    const id = await orderIn('cancelled');
    const res = await call(id, 'confirmed').set(as(OWNER));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(await statusOf(id)).toBe('cancelled');
  });

  test.each(ROUTES)('[P1.2] %s lets a stranger move nothing', async (_name, call) => {
    const id = await orderIn('pending');
    const res = await call(id, 'confirmed').set(as(STRANGER));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await statusOf(id)).toBe('pending');
  });

  test('[P1.2] PUT /orders/:id/accept and /reject are the same confirm and cancel steps', async () => {
    const a = await orderIn('pending');
    expect((await request(app).put(`/orders/${a}/accept`).set(as(OWNER))).status).toBe(200);
    expect(await statusOf(a)).toBe('confirmed');
    // Accepting twice is not a second transition into "confirmed".
    expect((await request(app).put(`/orders/${a}/accept`).set(as(OWNER))).status).not.toBe(500);
    expect(await statusOf(a)).toBe('confirmed');

    const r = await orderIn('pending');
    expect((await request(app).put(`/orders/${r}/reject`).set(as(OWNER)).send({ reason: 'Out of stock' })).status).toBe(200);
    expect(await statusOf(r)).toBe('cancelled');

    const done = await orderIn('delivered');
    const late = await request(app).put(`/orders/${done}/reject`).set(as(OWNER)).send({ reason: 'too late' });
    expect(late.status).toBeGreaterThanOrEqual(400);
    expect(await statusOf(done)).toBe('delivered');
  });
});
