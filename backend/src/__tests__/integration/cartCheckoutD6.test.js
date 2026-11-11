/**
 * C6 / D6: the cart a customer carries between devices, and checking out a
 * cart from several shops.
 *
 *   - POST /shops/cart/batch-quote prices a multi-shop cart exactly as
 *     POST /shops/cart/batch-checkout charges it, and writes nothing;
 *   - a pickup cart from several shops is not charged for delivery (it was
 *     charged the extra-pickup fee for every shop after the first);
 *   - a guest's session id reaches only rows nobody owns: it used to read and
 *     clear a signed-in customer's cart rows that carried the same session id;
 *   - merging a guest cart leaves the customer's own rows alone (an owned row
 *     was doubled and then deleted);
 *   - the cart reports stock and price as they are now, and never calls an
 *     untracked product out of stock.
 */
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { fx, fxLike } = require('../helpers/fixtureIds');
const { query, queryOne, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const BUYER = fx('c6x-buyer');
const OWNER = fx('c6x-owner');
const SHOP_A = fx('c6x-shop-a');
const SHOP_B = fx('c6x-shop-b');
const RICE = fx('c6x-rice');
const SOAP = fx('c6x-soap');
const NEAR = { lat: 18.535, lng: 73.875 }; // 1 km from both shops by road: ₹20

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;

async function cleanup() {
  await query(`DELETE FROM cart_items WHERE CAST(product_id AS TEXT) LIKE '${fxLike('c6x')}'`);
  await query(`DELETE FROM loyalty_transactions WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c6x')}'`);
  await query(`DELETE FROM loyalty_accounts WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c6x')}'`);
  await query(`DELETE FROM wallet_transactions WHERE CAST(wallet_id AS TEXT) LIKE '${fxLike('c6x')}'`);
  await query(`DELETE FROM shop_commissions WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('c6x')}'`);
  await query(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c6x')}')`);
  await query(`DELETE FROM orders WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c6x')}'`);
  await query(`DELETE FROM batch_orders WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c6x')}'`);
  await query(`DELETE FROM shop_products WHERE CAST(id AS TEXT) LIKE '${fxLike('c6x')}'`);
  await query(`DELETE FROM wallets WHERE CAST(id AS TEXT) LIKE '${fxLike('c6x')}'`);
  await query(`DELETE FROM local_shops WHERE CAST(id AS TEXT) LIKE '${fxLike('c6x')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('c6x')}'`);
}

const setStock = (id, n) => query('UPDATE shop_products SET inventory_count = $1, stock_quantity = $1, stock = $1 WHERE id = $2', [n, id]);

beforeAll(async () => {
  await cleanup();
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'C6 Buyer', '9833666001', 'user')", [BUYER]);
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'C6 Owner', '9833666002', 'shop_owner')", [OWNER]);
  await query(`INSERT INTO wallets (id, user_id, balance) VALUES ('${fx('c6x-wallet')}', $1, '1000')`, [BUYER]);
  for (const [id, name] of [[SHOP_A, 'C6 Grocer'], [SHOP_B, 'C6 Chemist']]) {
    await query(
      `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, delivery_available)
       VALUES ($1, $2, $3, 'Grocery', 'Test Address', 'POINT(73.87 18.53)', 18.53, 73.87, '1')`,
      [id, OWNER, name]
    );
  }
  for (const [id, shop, name, price, inventory, tracked] of [
    [RICE, SHOP_A, 'C6 Rice', 120, 50, 1],
    [SOAP, SHOP_B, 'C6 Soap', 45, 0, 0],
  ]) {
    await query(
      `INSERT INTO shop_products (id, shop_id, name, price, inventory_count, stock_quantity, stock, track_inventory)
       VALUES ($1, $2, $3, $4, $5, $5, $5, $6)`,
      [id, shop, name, price, inventory, tracked]
    );
  }

  app = express();
  app.use(express.json());
  app.use('/cart', require('../../modules/ecommerce/routes/cart.routes'));
  app.use('/shops', require('../../modules/ecommerce/routes/shop.routes'));
  app.use(require('../../middleware/error.middleware').errorHandler);
});

beforeEach(async () => {
  await query(`DELETE FROM cart_items WHERE CAST(product_id AS TEXT) LIKE '${fxLike('c6x')}'`);
  await setStock(RICE, 50);
  await query('UPDATE shop_products SET price = 120 WHERE id = $1', [RICE]);
});

afterAll(cleanup);

const cart = [
  { shop_id: SHOP_A, product_id: RICE, quantity: 2 },
  { shop_id: SHOP_B, product_id: SOAP, quantity: 1 },
];
// 2 × 120 + 45 = 285; delivery once: the dearest leg (₹20) plus ₹10 for the
// second shop; platform fee once: ₹5.
const TOTAL = 285 + 30 + 5;

describe('multi-shop checkout (D6)', () => {
  test('[C6.8] the batch quote is what the batch checkout charges, and writes nothing', async () => {
    const batchesBefore = (await queryMany('SELECT id FROM batch_orders WHERE user_id = $1', [BUYER])).length;
    const quote = await request(app).post('/shops/cart/batch-quote').set(as(BUYER))
      .send({ items: cart, deliveryCoordinate: NEAR });
    expect(quote.status).toBe(200);
    expect(quote.body.bill).toMatchObject({ subtotal: 285, deliveryFee: 30, platformFee: 5, total: TOTAL });
    expect(quote.body.paymentMethods).toEqual({ cod: true, wallet: true, razorpay: false });
    expect(quote.body.shops.map((s) => [s.shopName, s.total]).sort()).toEqual([['C6 Chemist', 55], ['C6 Grocer', 265]]);
    expect((await queryMany('SELECT id FROM batch_orders WHERE user_id = $1', [BUYER])).length).toBe(batchesBefore);

    const placed = await request(app).post('/shops/cart/batch-checkout').set(as(BUYER))
      .send({ items: cart, deliveryCoordinate: NEAR, address: 'Flat 4', paymentMethod: 'wallet' });
    expect(placed.status).toBe(200);
    expect(placed.body.finalAmount).toBe(quote.body.bill.total);
    expect(placed.body.orderIds).toHaveLength(2);

    // No location: the same refusal the single-shop quote gives.
    const noWhere = await request(app).post('/shops/cart/batch-quote').send({ items: cart });
    expect(noWhere.status).toBe(400);
    expect(noWhere.body.code).toBe('LOCATION_REQUIRED');
    expect((await request(app).post('/shops/cart/batch-quote').send({ items: [] })).status).toBe(400);
  });

  test('[C6.9] collecting from several shops is not charged for delivery', async () => {
    const quote = await request(app).post('/shops/cart/batch-quote').send({ items: cart, deliveryMode: 'pickup' });
    expect(quote.status).toBe(200);
    expect(quote.body.bill.deliveryFee).toBe(0);
    expect(quote.body.bill.total).toBe(285 + 5);

    const placed = await request(app).post('/shops/cart/batch-checkout').set(as(BUYER))
      .send({ items: cart, deliveryMode: 'pickup', paymentMethod: 'cod' });
    expect(placed.status).toBe(200);
    const fees = await queryMany('SELECT delivery_fee FROM orders WHERE batch_id = $1', [placed.body.batch_id]);
    expect(fees.map((o) => Number(o.delivery_fee))).toEqual([0, 0]);
  });
});

describe('whose cart it is', () => {
  const SESSION = 'c6x-session-shared';

  test('[C6.10] a session id does not reach a signed-in customer\'s rows', async () => {
    const add = await request(app).post('/cart').set(as(BUYER)).set('x-session-id', SESSION)
      .send({ sessionId: SESSION, productId: RICE, quantity: 2 });
    expect(add.status).toBe(200);

    const guest = await request(app).get('/cart').set('x-session-id', SESSION);
    expect(guest.body.cartItems).toHaveLength(0);

    const rowId = (await queryOne('SELECT id FROM cart_items WHERE user_id = $1 AND product_id = $2', [BUYER, RICE])).id;
    await request(app).delete(`/cart/${rowId}`).set('x-session-id', SESSION);
    await request(app).delete('/cart').set('x-session-id', SESSION);
    await request(app).post('/cart').set('x-session-id', SESSION).send({ sessionId: SESSION, productId: RICE, quantity: 0 });

    const mine = await request(app).get('/cart').set(as(BUYER));
    expect(mine.body.cartItems.map((i) => [i.product.id, i.quantity])).toEqual([[RICE, 2]]);
  });

  test('[C6.11] merging a guest cart adds the guest\'s lines and leaves the customer\'s own alone', async () => {
    await request(app).post('/cart').set(as(BUYER)).set('x-session-id', SESSION)
      .send({ sessionId: SESSION, productId: RICE, quantity: 2 });
    await request(app).post('/cart').set('x-session-id', SESSION)
      .send({ sessionId: SESSION, productId: SOAP, quantity: 1 });

    const merged = await request(app).post('/cart/merge').set(as(BUYER)).send({ sessionId: SESSION });
    expect(merged.status).toBe(200);
    expect(merged.body.mergedCount).toBe(1);

    const mine = await request(app).get('/cart').set(as(BUYER));
    const lines = Object.fromEntries(mine.body.cartItems.map((i) => [i.product.id, i.quantity]));
    expect(lines).toEqual({ [RICE]: 2, [SOAP]: 1 });
    expect(mine.body.shops).toHaveLength(2);
  });
});

describe('revalidation', () => {
  test('[C6.12] the cart shows stock and price as they are now; an untracked product is never out of stock', async () => {
    await request(app).post('/cart').set(as(BUYER)).send({ productId: RICE, quantity: 5 });
    await request(app).post('/cart').set(as(BUYER)).send({ productId: SOAP, quantity: 3 });

    await setStock(RICE, 2);
    await query('UPDATE shop_products SET price = 130 WHERE id = $1', [RICE]);

    const res = await request(app).get('/cart').set(as(BUYER));
    const rice = res.body.cartItems.find((i) => i.product.id === RICE);
    const soap = res.body.cartItems.find((i) => i.product.id === SOAP);
    expect(rice).toMatchObject({ price: 130, availableStock: 2, isOutOfStock: true });
    expect(soap.isOutOfStock).toBe(false);

    // And the shortfall is refused when the quantity is set again.
    const over = await request(app).post('/cart').set(as(BUYER)).send({ productId: RICE, quantity: 5 });
    expect(over.status).toBe(400);
    expect(over.body.available).toBe(2);
  });
});
