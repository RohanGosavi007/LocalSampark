const request = require('supertest');
const express = require('express');
const crypto = require('crypto');
const { query } = require('../../config/database');
const { pointSql } = require('../../utils/sqlPoint');
const cartRouter = require('../../modules/ecommerce/routes/cart.routes');
const jwt = require('jsonwebtoken');

const { getJwtSecret } = require('../../config/secrets');

describe('C6 Server-Side Multi-Shop Cart & D6 Per-Shop Grouping', () => {
  let app;
  const TEST_SHOP_1 = crypto.randomUUID();
  const TEST_SHOP_2 = crypto.randomUUID();
  const TEST_PRODUCT_1 = crypto.randomUUID();
  const TEST_PRODUCT_2 = crypto.randomUUID();
  const TEST_USER_ID = crypto.randomUUID();
  const GUEST_SESSION_ID = 'test-guest-session-' + Date.now();

  const userToken = jwt.sign(
    { userId: TEST_USER_ID, id: TEST_USER_ID, role: 'customer', email: 'cartuser@example.com', tokenVersion: 0 },
    getJwtSecret(),
    { expiresIn: '1h' }
  );

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/cart', cartRouter);

    // Seed test user, 2 shops and 2 products
    await query('DELETE FROM cart_items WHERE session_id = $1 OR user_id = $2', [GUEST_SESSION_ID, TEST_USER_ID]);
    await query('DELETE FROM shop_products WHERE id IN ($1, $2)', [TEST_PRODUCT_1, TEST_PRODUCT_2]);
    await query('DELETE FROM local_shops WHERE id IN ($1, $2)', [TEST_SHOP_1, TEST_SHOP_2]);
    await query('DELETE FROM users WHERE id = $1', [TEST_USER_ID]);

    await query(
      `INSERT INTO users (id, phone_number, email, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, true)`,
      [TEST_USER_ID, '9999900001', 'cartuser@example.com', 'Cart Test User', 'user']
    );

    await query(
      `INSERT INTO local_shops (id, name, description, category, address, is_active, latitude, longitude, coordinate, delivery_fee, min_order_amount)
       VALUES ($1, $2, $3, $4, $5, true, 18.5793, 73.8796, ${pointSql(18.5793, 73.8796)}, 25.00, 150.00)`,
      [TEST_SHOP_1, 'Dhanori Supermart', 'Groceries & Staples', 'groceries', 'Dhanori Main Rd']
    );

    await query(
      `INSERT INTO local_shops (id, name, description, category, address, is_active, latitude, longitude, coordinate, delivery_fee, min_order_amount)
       VALUES ($1, $2, $3, $4, $5, true, 18.5793, 73.8796, ${pointSql(18.5793, 73.8796)}, 0.00, 50.00)`,
      [TEST_SHOP_2, 'Pune Bakery & Sweets', 'Fresh baked goods', 'bakery', 'Dhanori Road']
    );

    await query(
      `INSERT INTO shop_products (id, shop_id, name, price, stock, inventory_count, track_inventory)
       VALUES ($1, $2, $3, $4, 10, 10, 1)`,
      [TEST_PRODUCT_1, TEST_SHOP_1, 'Organic Wheat Flour 5kg', 220.00]
    );

    await query(
      `INSERT INTO shop_products (id, shop_id, name, price, stock, inventory_count, track_inventory)
       VALUES ($1, $2, $3, $4, 2, 2, 1)`,
      [TEST_PRODUCT_2, TEST_SHOP_2, 'Artisan Sourdough Loaf', 80.00]
    );
  });

  afterAll(async () => {
    await query('DELETE FROM cart_items WHERE session_id = $1 OR user_id = $2', [GUEST_SESSION_ID, TEST_USER_ID]);
    await query('DELETE FROM shop_products WHERE id IN ($1, $2)', [TEST_PRODUCT_1, TEST_PRODUCT_2]);
    await query('DELETE FROM local_shops WHERE id IN ($1, $2)', [TEST_SHOP_1, TEST_SHOP_2]);
    await query('DELETE FROM users WHERE id = $1', [TEST_USER_ID]);
  });

  test('[C6.1] adds items to guest cart with inventory validation', async () => {
    // Add product 1 with quantity 1
    const res = await request(app)
      .post('/cart')
      .set('x-session-id', GUEST_SESSION_ID)
      .send({ productId: TEST_PRODUCT_1, quantity: 1 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.cartItem.productId).toBe(TEST_PRODUCT_1);

    // Attempt to add quantity beyond inventory (10 available, request 20)
    const overstock = await request(app)
      .post('/cart')
      .set('x-session-id', GUEST_SESSION_ID)
      .send({ productId: TEST_PRODUCT_1, quantity: 20 });

    expect(overstock.status).toBe(400);
    expect(overstock.body.error).toContain('Insufficient inventory');
  });

  test('[C6.2] multi-shop cart groups items by shop with min order & delivery fees (D6)', async () => {
    // Add item from Shop 2
    await request(app)
      .post('/cart')
      .set('x-session-id', GUEST_SESSION_ID)
      .send({ productId: TEST_PRODUCT_2, quantity: 1 });

    const res = await request(app)
      .get('/cart')
      .set('x-session-id', GUEST_SESSION_ID);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.cartItems.length).toBe(2);

    // Check multi-shop grouping
    expect(res.body.shops.length).toBe(2);

    const shop1Group = res.body.shops.find((s) => s.shop.id === TEST_SHOP_1);
    expect(shop1Group).toBeDefined();
    expect(shop1Group.subtotal).toBe(220); // 1 * 220
    expect(shop1Group.meetsMinOrder).toBe(true); // 220 >= 150
    expect(shop1Group.deliveryFee).toBe(25);
    expect(shop1Group.total).toBe(245);

    const shop2Group = res.body.shops.find((s) => s.shop.id === TEST_SHOP_2);
    expect(shop2Group).toBeDefined();
    expect(shop2Group.subtotal).toBe(80);
    expect(shop2Group.meetsMinOrder).toBe(true); // 80 >= 50
    expect(shop2Group.deliveryFee).toBe(0);

    // Summary calculation
    expect(res.body.summary.totalItems).toBe(2);
    expect(res.body.summary.subtotal).toBe(300); // 220 + 80
    expect(res.body.summary.deliveryFeeTotal).toBe(25);
    expect(res.body.summary.grandTotal).toBe(325);
  });

  test('[C6.3] merges guest cart into user account on login', async () => {
    // Merge guest cart into authenticated user
    const mergeRes = await request(app)
      .post('/cart/merge')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ sessionId: GUEST_SESSION_ID });

    expect(mergeRes.status).toBe(200);
    expect(mergeRes.body.success).toBe(true);
    expect(mergeRes.body.mergedCount).toBeGreaterThan(0);

    // Guest cart should now be empty
    const guestCart = await request(app)
      .get('/cart')
      .set('x-session-id', GUEST_SESSION_ID);
    expect(guestCart.body.cartItems.length).toBe(0);

    // User cart now holds the items
    const userCart = await request(app)
      .get('/cart')
      .set('Authorization', `Bearer ${userToken}`);
    expect(userCart.body.cartItems.length).toBe(2);
    expect(userCart.body.summary.totalItems).toBe(2);
  });

  test('[C6.4] clears cart when requested', async () => {
    const clearRes = await request(app)
      .delete('/cart')
      .set('Authorization', `Bearer ${userToken}`);

    expect(clearRes.status).toBe(200);
    expect(clearRes.body.success).toBe(true);

    const userCart = await request(app)
      .get('/cart')
      .set('Authorization', `Bearer ${userToken}`);
    expect(userCart.body.cartItems.length).toBe(0);
  });
});
