/**
 * P1 Canonical Commerce Pipeline — the order's history and who may move it.
 *
 * P1.3  every status change is recorded by the database itself, append-only,
 *       with who made it and why (migration 148).
 * P1.4  how a cancelled order ended is named: CANCELLED_BY_CUSTOMER,
 *       REJECTED_BY_SELLER, CANCELLED_BY_ADMIN, EXPIRED, PAYMENT_FAILED.
 * P1.5  an administrator's force-cancel is the same cancellation as anyone's:
 *       money back, stock back, rider freed. It was a copy that did half of it.
 * P1.6  a rider can be given only an order that is ready. Any order in any
 *       status could be, delivered ones included.
 * P1.7  who may read an order's history.
 * P1.8  nothing writes orders.order_status without saying who is doing it.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { fx, fxLike } = require('../helpers/fixtureIds');
const { query, queryOne, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const { pointSql } = require('../../utils/sqlPoint');
const lifecycle = require('../../services/orderLifecycle.service');

const BUYER = fx('p1h-buyer');
const OWNER = fx('p1h-owner');
const RIDER = fx('p1h-rider');
const RIDER2 = fx('p1h-rider2');
const ADMIN = fx('p1h-admin');
const STRANGER = fx('p1h-stranger');
const SHOP = fx('p1h-shop');
const PRODUCT = fx('p1h-product');

const as = (userId, role) => ({ Authorization: `Bearer ${jwt.sign({ userId, id: userId, role: role || 'user' }, getJwtSecret(), { expiresIn: '5m' })}` });
const U = (id, role) => ({ id, role });
let app;

async function cleanup() {
  await query(`DELETE FROM order_tracking WHERE order_id IN (SELECT id FROM orders WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('p1h')}')`);
  await query(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('p1h')}')`);
  await query(`DELETE FROM orders WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('p1h')}'`);
  await query(`DELETE FROM shop_products WHERE CAST(id AS TEXT) LIKE '${fxLike('p1h')}'`);
  await query(`DELETE FROM delivery_agents WHERE CAST(user_id AS TEXT) LIKE '${fxLike('p1h')}'`);
  await query(`DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE CAST(user_id AS TEXT) LIKE '${fxLike('p1h')}')`);
  await query(`DELETE FROM wallets WHERE CAST(user_id AS TEXT) LIKE '${fxLike('p1h')}'`);
  await query(`DELETE FROM local_shops WHERE CAST(id AS TEXT) LIKE '${fxLike('p1h')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('p1h')}'`);
}

/** An order in `status`. A fresh id each time: the history keeps rows for ever. */
async function orderIn(status, { method = 'COD', paid = 'unpaid', fulfillment = 'delivery', rider = null, total = 100 } = {}) {
  const id = crypto.randomUUID();
  // One parameter per column: PostgreSQL refuses a reused one across types.
  await query(
    `INSERT INTO orders (id, user_id, shop_id, total_amount, subtotal, delivery_fee, status, order_status, payment_method, payment_status, fulfillment_method, assigned_agent_id)
     VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9, $10, $11)`,
    [id, BUYER, SHOP, total, total, status, status, method, paid, fulfillment, rider]
  );
  return id;
}
const rowOf = (id) => queryOne('SELECT order_status, status, assigned_agent_id, status_changed_by, status_changed_role, status_change_reason FROM orders WHERE id = $1', [id]);
const historyOf = (id) => lifecycle.historyFor(id);
const agentStatus = async (userId) => (await queryOne('SELECT status FROM delivery_agents WHERE user_id = $1', [userId])).status;

beforeAll(async () => {
  await cleanup();
  for (const [id, phone, role] of [
    [BUYER, '9844200001', 'user'], [OWNER, '9844200002', 'shop_owner'], [RIDER, '9844200003', 'delivery_agent'],
    [RIDER2, '9844200004', 'delivery_agent'], [ADMIN, '9844200005', 'admin'], [STRANGER, '9844200006', 'user'],
  ]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, `P1h ${role}`, phone, role]);
  }
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, delivery_available, is_verified)
     VALUES ($1, $2, 'P1h Shop', 'Grocery', 'Shop Road', ${pointSql(18.53, 73.87)}, 18.53, 73.87, '1', '1')`,
    [SHOP, OWNER]
  );
  await query(
    `INSERT INTO shop_products (id, shop_id, name, price, inventory_count, stock_quantity, track_inventory)
     VALUES ($1, $2, 'Rice', 120, 100, 100, '1')`,
    [PRODUCT, SHOP]
  );
  for (const [agent, user] of [['p1h-agent', RIDER], ['p1h-agent2', RIDER2]]) {
    await query(
      `INSERT INTO delivery_agents (id, user_id, vehicle_type, kyc_status, cash_in_hand, status) VALUES ($1, $2, 'motorcycle', 'active', '0', 'available')`,
      [fx(agent), user]
    );
  }
  await query('INSERT INTO wallets (id, user_id, balance) VALUES ($1, $2, 0)', [fx('p1h-wallet'), BUYER]);

  app = express();
  app.use(express.json());
  app.use('/shops', require('../../modules/ecommerce/routes/shop.routes'));
  app.use('/orders', require('../../modules/ecommerce/routes/order.routes'));
  app.use(require('../../middleware/error.middleware').errorHandler);
});

afterAll(cleanup);

describe('[P1.3] the order history is written by the database and cannot be changed', () => {
  test('[P1.3] a new order starts with one row: placed, by its customer', async () => {
    const id = await orderIn('pending');
    const rows = await historyOf(id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ from_status: null, to_status: 'pending', actor_user_id: BUYER, actor_role: 'customer' });
  });

  test('[P1.3] the shop walks an order to delivered; every step is a row, in order, with who made it', async () => {
    const id = await orderIn('pending');
    for (const to of ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']) {
      await lifecycle.changeStatus({ orderId: id, to, user: U(OWNER, 'shop_owner') });
    }
    const rows = await historyOf(id);
    expect(rows.map((r) => `${r.from_status}>${r.to_status}`)).toEqual([
      'null>pending', 'pending>confirmed', 'confirmed>preparing', 'preparing>ready', 'ready>out_for_delivery', 'out_for_delivery>delivered',
    ]);
    for (const r of rows.slice(1)) expect(r).toMatchObject({ actor_user_id: OWNER, actor_role: 'shop' });
    expect(rows.map((r) => r.id)).toEqual([...rows.map((r) => r.id)].sort((a, b) => Number(a) - Number(b)));
  });

  test('[P1.3] the reason for a cancellation is kept with the row', async () => {
    const id = await orderIn('pending');
    await lifecycle.changeStatus({ orderId: id, to: 'cancelled', user: U(BUYER), reason: 'Ordered by mistake' });
    const last = (await historyOf(id)).pop();
    expect(last).toMatchObject({ to_status: 'cancelled', actor_role: 'customer', reason: 'Ordered by mistake' });
  });

  test('[P1.3] the actor is a one-shot: a later change by a writer that names nobody is "system", not the previous actor', async () => {
    const id = await orderIn('pending');
    await lifecycle.changeStatus({ orderId: id, to: 'confirmed', user: U(OWNER, 'shop_owner') });
    expect(await rowOf(id)).toMatchObject({ status_changed_by: null, status_changed_role: null, status_change_reason: null });

    await query("UPDATE orders SET order_status = 'preparing' WHERE id = $1", [id]); // an old code path that names nobody
    const last = (await historyOf(id)).pop();
    expect(last).toMatchObject({ from_status: 'confirmed', to_status: 'preparing', actor_user_id: null, actor_role: 'system' });
  });

  test('[P1.3] a write that does not change the status adds no row', async () => {
    const id = await orderIn('pending');
    await query("UPDATE orders SET delivery_fee = 5, order_status = 'pending' WHERE id = $1", [id]);
    expect(await historyOf(id)).toHaveLength(1);
  });

  test('[P1.3] a row cannot be changed or deleted, by anyone', async () => {
    const id = await orderIn('pending');
    const [row] = await historyOf(id);
    await expect(query('UPDATE order_status_history SET to_status = $1 WHERE id = $2', ['delivered', row.id])).rejects.toThrow(/append-only/i);
    await expect(query('DELETE FROM order_status_history WHERE id = $1', [row.id])).rejects.toThrow(/append-only/i);
    expect(await historyOf(id)).toHaveLength(1);
  });

  test('[P1.3] deleting an order does not take its history with it', async () => {
    const id = await orderIn('pending');
    await query('DELETE FROM orders WHERE id = $1', [id]);
    expect(await historyOf(id)).toHaveLength(1);
  });
});

describe('[P1.4] a cancelled order says how it ended', () => {
  const ended = async (user, status = 'pending') => {
    const id = await orderIn(status);
    await lifecycle.changeStatus({ orderId: id, to: 'cancelled', user, reason: 'test' });
    return lifecycle.terminalState(await historyOf(id));
  };

  test('[P1.4] the customer cancels: CANCELLED_BY_CUSTOMER', async () => {
    expect(await ended(U(BUYER))).toBe('CANCELLED_BY_CUSTOMER');
  });
  test('[P1.4] the shop cancels: REJECTED_BY_SELLER', async () => {
    expect(await ended(U(OWNER, 'shop_owner'))).toBe('REJECTED_BY_SELLER');
  });
  test('[P1.4] an administrator cancels: CANCELLED_BY_ADMIN', async () => {
    expect(await ended(U(ADMIN, 'admin'), 'preparing')).toBe('CANCELLED_BY_ADMIN');
  });
  test('[P1.4] an online payment that never arrived is EXPIRED, and a failed one PAYMENT_FAILED', () => {
    const row = (reason) => [{ to_status: 'cancelled', actor_role: 'system', reason }];
    expect(lifecycle.terminalState(row('payment_expired'))).toBe('EXPIRED');
    expect(lifecycle.terminalState(row('payment_failed'))).toBe('PAYMENT_FAILED');
  });
  test('[P1.4] the unpaid-order job records itself as the system with the reason payment_expired', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../services/orderLifecycle.service.js'), 'utf8');
    expect(src).toMatch(/status_changed_role = 'system', status_change_reason = 'payment_expired'/);
  });
  test('[P1.4] an order that is not cancelled has no terminal state', async () => {
    const id = await orderIn('pending');
    expect(lifecycle.terminalState(await historyOf(id))).toBeNull();
  });
});

describe('[P1.5] an administrator’s force-cancel is the same cancellation as anyone’s', () => {
  test('[P1.5] a paid wallet order is refunded, its stock returns to both counters, the rider is freed, and the history names the admin', async () => {
    await query('UPDATE wallets SET balance = 0 WHERE user_id = $1', [BUYER]);
    await query('UPDATE shop_products SET inventory_count = 98, stock_quantity = 98 WHERE id = $1', [PRODUCT]);
    const id = await orderIn('assigned', { method: 'wallet', paid: 'paid', rider: RIDER, total: 250 });
    await query(
      'INSERT INTO order_items (id, order_id, product_id, name, price, quantity) VALUES ($1, $2, $3, $4, $5, $6)',
      [crypto.randomUUID(), id, PRODUCT, 'Rice', 120, 2]
    );
    await query("UPDATE delivery_agents SET status = 'on_delivery' WHERE user_id = $1", [RIDER]);

    const out = await lifecycle.changeStatus({ orderId: id, to: 'cancelled', user: U(ADMIN, 'super_admin'), reason: 'Customer called' });

    expect(out.refund).toBe('wallet');
    expect(Number((await queryOne('SELECT balance FROM wallets WHERE user_id = $1', [BUYER])).balance)).toBe(250);
    const stock = await queryOne('SELECT inventory_count, stock_quantity FROM shop_products WHERE id = $1', [PRODUCT]);
    expect([Number(stock.inventory_count), Number(stock.stock_quantity)]).toEqual([100, 100]);
    expect(await agentStatus(RIDER)).toBe('available');
    expect((await queryOne('SELECT cancellation_reason FROM orders WHERE id = $1', [id])).cancellation_reason).toBe('Customer called');
    expect((await historyOf(id)).pop()).toMatchObject({ to_status: 'cancelled', actor_user_id: ADMIN, actor_role: 'admin' });
  });

  test('[P1.5] the admin route uses it, and says what happened to the money', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../modules/crm/controllers/admin-commerce.controller.js'), 'utf8');
    const cancel = src.slice(src.indexOf('const cancelOrder'), src.indexOf('const refundOrder'));
    expect(cancel).toMatch(/lifecycle\.changeStatus\(\{ orderId: id, to: 'cancelled'/);
    expect(cancel).not.toMatch(/UPDATE orders/);
  });
});

describe('[P1.6] a rider can be given only an order that is ready', () => {
  const assign = (orderId, riderUserId, user) => lifecycle.assignRider({ orderId, riderUserId, user });

  test('[P1.6] a ready order is given to a rider: assigned, rider on delivery, one history row', async () => {
    const id = await orderIn('ready');
    const out = await assign(id, RIDER, U(OWNER, 'shop_owner'));
    expect(out).toMatchObject({ from: 'ready', to: 'assigned' });
    expect(await rowOf(id)).toMatchObject({ order_status: 'assigned', status: 'assigned', assigned_agent_id: RIDER });
    expect(await agentStatus(RIDER)).toBe('on_delivery');
    expect((await historyOf(id)).pop()).toMatchObject({ from_status: 'ready', to_status: 'assigned', actor_role: 'shop', reason: 'rider_assigned' });
  });

  test.each(['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'returned'])(
    '[P1.6] an order that is %s is refused, and nothing changes',
    async (status) => {
      const id = await orderIn(status);
      const before = (await historyOf(id)).length;
      await expect(assign(id, RIDER, U(OWNER, 'shop_owner'))).rejects.toMatchObject({ status: 409, code: 'NOT_ASSIGNABLE' });
      expect(await rowOf(id)).toMatchObject({ order_status: status, assigned_agent_id: null });
      expect(await historyOf(id)).toHaveLength(before);
    }
  );

  test('[P1.6] reassigning swaps the rider: the first is freed, the second is on delivery', async () => {
    const id = await orderIn('ready');
    await assign(id, RIDER, U(ADMIN, 'admin'));
    await assign(id, RIDER2, U(ADMIN, 'admin'));
    expect(await rowOf(id)).toMatchObject({ order_status: 'assigned', assigned_agent_id: RIDER2 });
    expect(await agentStatus(RIDER)).toBe('available');
    expect(await agentStatus(RIDER2)).toBe('on_delivery');
    await assign(id, null, U(ADMIN, 'admin'));
    expect(await rowOf(id)).toMatchObject({ order_status: 'ready', assigned_agent_id: null });
    expect(await agentStatus(RIDER2)).toBe('available');
  });

  test('[P1.6] taking a rider off an order that has none is refused', async () => {
    const id = await orderIn('ready');
    await expect(assign(id, null, U(OWNER, 'shop_owner'))).rejects.toMatchObject({ status: 409, code: 'NOT_ASSIGNABLE' });
  });

  test('[P1.6] only the order’s shop or an administrator may; the customer and a stranger may not', async () => {
    const id = await orderIn('ready');
    await expect(assign(id, RIDER, U(BUYER))).rejects.toMatchObject({ status: 403 });
    await expect(assign(id, RIDER, U(STRANGER))).rejects.toMatchObject({ status: 403 });
    expect((await rowOf(id)).order_status).toBe('ready');
  });

  test('[P1.6] a pickup order needs no rider, and an unpaid online order waits for its payment', async () => {
    const pickup = await orderIn('ready', { fulfillment: 'pickup' });
    await expect(assign(pickup, RIDER, U(OWNER, 'shop_owner'))).rejects.toMatchObject({ status: 409, code: 'NOT_ASSIGNABLE' });
    const unpaid = await orderIn('ready', { method: 'razorpay', paid: 'pending' });
    await expect(assign(unpaid, RIDER, U(OWNER, 'shop_owner'))).rejects.toMatchObject({ status: 409, code: 'PAYMENT_PENDING' });
  });

  test('[P1.6] over HTTP, PUT /shops/:id/orders/:orderId/assign-rider refuses a delivered order and leaves it delivered', async () => {
    const id = await orderIn('delivered');
    const res = await request(app).put(`/shops/${SHOP}/orders/${id}/assign-rider`).set(as(OWNER, 'shop_owner')).send({ riderId: RIDER });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('NOT_ASSIGNABLE');
    expect(await rowOf(id)).toMatchObject({ order_status: 'delivered', assigned_agent_id: null });
    expect(await queryMany('SELECT 1 FROM order_tracking WHERE order_id = $1', [id])).toHaveLength(0);
  });

  test('[P1.6] over HTTP, a ready order is assigned and tracked', async () => {
    const id = await orderIn('ready');
    // order_tracking holds one row per order, created at checkout.
    const res = await request(app).put(`/shops/${SHOP}/orders/${id}/assign-rider`).set(as(OWNER, 'shop_owner')).send({ riderId: RIDER2 });
    expect(res.status).toBe(200);
    expect(await rowOf(id)).toMatchObject({ order_status: 'assigned', assigned_agent_id: RIDER2 });
    await lifecycle.assignRider({ orderId: id, riderUserId: null, user: U(OWNER, 'shop_owner') });
  });
});

describe('[P1.7] who may read an order’s history', () => {
  test('[P1.7] the customer and the shop see it, with how it ended; a stranger is told the order does not exist', async () => {
    const id = await orderIn('pending');
    await lifecycle.changeStatus({ orderId: id, to: 'cancelled', user: U(OWNER, 'shop_owner'), reason: 'Out of stock' });

    for (const [who, role] of [[BUYER, 'user'], [OWNER, 'shop_owner'], [ADMIN, 'admin']]) {
      const res = await request(app).get(`/orders/${id}/history`).set(as(who, role));
      expect(res.status).toBe(200);
      expect(res.body.history.map((h) => h.to_status)).toEqual(['pending', 'cancelled']);
      expect(res.body.terminalState).toBe('REJECTED_BY_SELLER');
    }
    const stranger = await request(app).get(`/orders/${id}/history`).set(as(STRANGER, 'user'));
    expect(stranger.status).toBe(404);
    expect((await request(app).get(`/orders/${id}/history`)).status).toBe(401);
  });
});

describe('[P1.8] nothing writes an order’s status without saying who is doing it', () => {
  const ROOT = path.join(__dirname, '../..');
  function* sources(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['__tests__', 'migrations', 'node_modules', 'data'].includes(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) yield* sources(p);
      else if (e.name.endsWith('.js')) yield p;
    }
  }
  /** The SET clause of every UPDATE orders that names order_status, and whether it names its actor. */
  function writers(text) {
    const found = [];
    for (const m of text.matchAll(/UPDATE\s+orders\s+SET\b/gi)) {
      const rest = text.slice(m.index, m.index + 900);
      const clause = rest.split(/\bWHERE\b/i)[0];
      if (/\border_status\s*=/.test(clause)) found.push({ at: text.slice(0, m.index).split('\n').length, actor: /status_changed_role/.test(clause) });
    }
    return found;
  }

  test('[P1.8] every UPDATE orders that sets order_status also sets status_changed_role', () => {
    const missing = [];
    let seen = 0;
    for (const file of sources(ROOT)) {
      for (const w of writers(fs.readFileSync(file, 'utf8'))) {
        seen += 1;
        if (!w.actor) missing.push(`${path.relative(ROOT, file)}:${w.at}`);
      }
    }
    expect(seen).toBeGreaterThan(5);
    expect(missing).toEqual([]);
  });

  test('[P1.8] the scanner sees a writer that names nobody (so a clean result means something)', () => {
    expect(writers("query(`UPDATE orders SET order_status = 'x' WHERE id = $1`)")).toEqual([{ at: 1, actor: false }]);
    expect(writers("query(`UPDATE orders SET order_status = 'x', status_changed_role = 'rider' WHERE id = $1`)")).toEqual([{ at: 1, actor: true }]);
  });
});

describe('[P1.9] retired legacy routes refuse with 410 and name the canonical route', () => {
  test('[P1.9] POST /shops/returns (it read the table checkout no longer writes) points to POST /orders/:orderId/returns', async () => {
    const res = await request(app).post('/shops/returns').set(as(BUYER, 'user')).send({ orderId: crypto.randomUUID(), reason: 'damaged' });
    expect(res.status).toBe(410);
    expect(res.body.error).toMatch(/POST \/api\/v1\/orders\/:orderId\/returns/);
  });

  test('[P1.9] PUT /shops/my-shop/orders/:id/assign-rider points to the canonical assign-rider route', async () => {
    const id = await orderIn('ready');
    const res = await request(app).put(`/shops/my-shop/orders/${id}/assign-rider`).set(as(OWNER, 'shop_owner')).send({ riderId: RIDER });
    expect(res.status).toBe(410);
    expect(res.body.error).toMatch(/assign-rider/);
    expect(await rowOf(id)).toMatchObject({ order_status: 'ready', assigned_agent_id: null });
  });
});
