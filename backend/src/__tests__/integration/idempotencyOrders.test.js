/**
 * C8: placing an order is idempotent under an Idempotency-Key
 * (middleware/idempotency.middleware.js, migration 138).
 *
 * Before, a double tap on Pay or a client retry after a timeout placed a second
 * order, and a wallet order charged the wallet twice.
 */
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { fx, fxLike } = require('../helpers/fixtureIds');
const { query, queryOne, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const { idempotent } = require('../../middleware/idempotency.middleware');

const BUYER = fx('c8x-buyer');
const OTHER = fx('c8x-other');
const OWNER = fx('c8x-owner');
const SHOP = fx('c8x-shop');
const SHOP_B = fx('c8x-shop-b');
const RICE = fx('c8x-rice');
const SOAP = fx('c8x-soap');

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
const balance = async (userId) => Number((await queryOne('SELECT balance FROM wallets WHERE user_id = $1', [userId])).balance);
const orders = (userId) => queryMany('SELECT id FROM orders WHERE user_id = $1', [userId]);
let app;

async function cleanup() {
  await query(`DELETE FROM idempotency_keys WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c8x')}' OR route LIKE 'c8x-%'`);
  await query(`DELETE FROM loyalty_transactions WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c8x')}'`);
  await query(`DELETE FROM loyalty_accounts WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c8x')}'`);
  await query(`DELETE FROM wallet_transactions WHERE CAST(wallet_id AS TEXT) LIKE '${fxLike('c8x')}'`);
  await query(`DELETE FROM shop_commissions WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('c8x')}'`);
  await query(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c8x')}')`);
  await query(`DELETE FROM orders WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c8x')}'`);
  await query(`DELETE FROM batch_orders WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c8x')}'`);
  await query(`DELETE FROM shop_products WHERE CAST(id AS TEXT) LIKE '${fxLike('c8x')}'`);
  await query(`DELETE FROM wallets WHERE CAST(id AS TEXT) LIKE '${fxLike('c8x')}'`);
  await query(`DELETE FROM local_shops WHERE CAST(id AS TEXT) LIKE '${fxLike('c8x')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('c8x')}'`);
}

beforeAll(async () => {
  await cleanup();
  for (const [id, phone, role] of [[BUYER, '9833555001', 'user'], [OTHER, '9833555003', 'user'], [OWNER, '9833555002', 'shop_owner']]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, `C8 ${role}`, phone, role]);
  }
  for (const [wallet, user] of [[fx('c8x-wallet'), BUYER], [fx('c8x-wallet-o'), OTHER]]) {
    await query(`INSERT INTO wallets (id, user_id, balance) VALUES ('${wallet}', $1, '1000')`, [user]);
  }
  for (const id of [SHOP, SHOP_B]) {
    await query(
      `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, delivery_available)
       VALUES ($1, $2, 'C8 Shop', 'Grocery', 'Test Address', 'POINT(73.87 18.53)', 18.53, 73.87, '1')`,
      [id, OWNER]
    );
  }
  for (const [id, shop, price] of [[RICE, SHOP, 120], [SOAP, SHOP_B, 45]]) {
    await query(
      `INSERT INTO shop_products (id, shop_id, name, price, inventory_count, stock_quantity, track_inventory)
       VALUES ($1, $2, $3, $4, 0, 0, 0)`,
      [id, shop, id, price]
    );
  }
  app = express();
  app.use(express.json());
  app.use('/checkout', require('../../modules/ecommerce/routes/checkout.routes'));
  app.use('/shops', require('../../modules/ecommerce/routes/shop.routes'));
  app.use(require('../../middleware/error.middleware').errorHandler);
});

beforeEach(async () => {
  await query("UPDATE wallets SET balance = '1000' WHERE CAST(user_id AS TEXT) LIKE $1", [fxLike('c8x')]);
});

afterAll(cleanup);

const pickupWallet = { shopId: SHOP, items: [{ productId: RICE, quantity: 1 }], paymentMethod: 'wallet', deliveryMode: 'pickup' };

describe('placing an order with an Idempotency-Key', () => {
  test('[C8.1] a retry with the same key gets the same order back; the wallet is charged once', async () => {
    const key = 'c8-retry-0001';
    const first = await request(app).post('/checkout').set(as(BUYER)).set('Idempotency-Key', key).send(pickupWallet);
    expect(first.status).toBe(201);
    const after = await balance(BUYER);
    expect(after).toBeLessThan(1000);

    const retry = await request(app).post('/checkout').set(as(BUYER)).set('Idempotency-Key', key).send(pickupWallet);
    expect(retry.status).toBe(201);
    expect(retry.headers['idempotent-replayed']).toBe('true');
    expect(retry.body.order.id).toBe(first.body.order.id);
    expect(await balance(BUYER)).toBe(after);
    expect((await orders(BUYER)).filter((o) => o.id === first.body.order.id)).toHaveLength(1);
  });

  test('[C8.2] the same key on a different request is refused, and nothing is placed', async () => {
    const key = 'c8-reuse-0001';
    await request(app).post('/checkout').set(as(BUYER)).set('Idempotency-Key', key).send(pickupWallet);
    const before = (await orders(BUYER)).length;
    const changed = await request(app).post('/checkout').set(as(BUYER)).set('Idempotency-Key', key)
      .send({ ...pickupWallet, items: [{ productId: RICE, quantity: 2 }] });
    expect(changed.status).toBe(422);
    expect(changed.body.code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect((await orders(BUYER)).length).toBe(before);
  });

  test('[C8.3] keys belong to one customer: another customer with the same key gets an order of their own', async () => {
    const key = 'c8-shared-0001';
    const mine = await request(app).post('/checkout').set(as(BUYER)).set('Idempotency-Key', key).send(pickupWallet);
    const theirs = await request(app).post('/checkout').set(as(OTHER)).set('Idempotency-Key', key).send(pickupWallet);
    expect(theirs.status).toBe(201);
    expect(theirs.headers['idempotent-replayed']).toBeUndefined();
    expect(theirs.body.order.id).not.toBe(mine.body.order.id);
    expect(theirs.body.order.user_id || OTHER).toBe(OTHER);
  });

  test('[C8.4] a multi-shop checkout retried with its key is one batch, charged once', async () => {
    const key = 'c8-batch-0001';
    const body = {
      items: [{ shop_id: SHOP, product_id: RICE, quantity: 1 }, { shop_id: SHOP_B, product_id: SOAP, quantity: 1 }],
      deliveryMode: 'pickup', paymentMethod: 'wallet',
    };
    const first = await request(app).post('/shops/cart/batch-checkout').set(as(BUYER)).set('Idempotency-Key', key).send(body);
    expect(first.status).toBe(200);
    const after = await balance(BUYER);
    const retry = await request(app).post('/shops/cart/batch-checkout').set(as(BUYER)).set('Idempotency-Key', key).send(body);
    expect(retry.body.batch_id).toBe(first.body.batch_id);
    expect(await balance(BUYER)).toBe(after);
    expect((await queryMany('SELECT id FROM batch_orders WHERE id = $1', [first.body.batch_id]))).toHaveLength(1);
  });

  test('[C8.5] without a key an order is placed as before; a malformed key is refused', async () => {
    const before = (await orders(BUYER)).length;
    expect((await request(app).post('/checkout').set(as(BUYER)).send(pickupWallet)).status).toBe(201);
    expect((await request(app).post('/checkout').set(as(BUYER)).send(pickupWallet)).status).toBe(201);
    expect((await orders(BUYER)).length).toBe(before + 2);

    const bad = await request(app).post('/checkout').set(as(BUYER)).set('Idempotency-Key', 'no spaces!').send(pickupWallet);
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('BAD_IDEMPOTENCY_KEY');
  });
});

describe('the ledger itself', () => {
  // A route under the middleware alone, with a handler the test controls.
  function harness(handler) {
    const a = express();
    a.use(express.json());
    a.use((req, res, next) => { req.user = { id: BUYER }; next(); });
    a.post('/place', idempotent('c8x-harness'), handler);
    return a;
  }

  test('[C8.6] a server error is not kept, so the same key can be retried', async () => {
    let calls = 0;
    const a = harness((req, res) => {
      calls += 1;
      if (calls === 1) return res.status(503).json({ error: 'busy' });
      return res.status(201).json({ placed: calls });
    });
    const first = await request(a).post('/place').set('Idempotency-Key', 'c8-5xx-0001').send({ x: 1 });
    expect(first.status).toBe(503);
    const retry = await request(a).post('/place').set('Idempotency-Key', 'c8-5xx-0001').send({ x: 1 });
    expect(retry.status).toBe(201);
    expect(calls).toBe(2);
    const again = await request(a).post('/place').set('Idempotency-Key', 'c8-5xx-0001').send({ x: 1 });
    expect(again.body).toEqual({ placed: 2 });
    expect(calls).toBe(2);
  });

  test('[C8.7] a second press while the first is still being placed is told to wait, not run twice', async () => {
    let release;
    const gate = new Promise((r) => { release = r; });
    let calls = 0;
    const a = harness(async (req, res) => {
      calls += 1;
      await gate;
      res.status(201).json({ placed: true });
    });
    const firstP = request(a).post('/place').set('Idempotency-Key', 'c8-busy-0001').send({ x: 1 }).then((r) => r);
    // Let the first request reach the handler.
    for (let i = 0; i < 50 && calls === 0; i++) await new Promise((r) => setTimeout(r, 20));
    const second = await request(a).post('/place').set('Idempotency-Key', 'c8-busy-0001').send({ x: 1 });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('IDEMPOTENCY_IN_PROGRESS');
    release();
    expect((await firstP).status).toBe(201);
    expect(calls).toBe(1);
  });
});
