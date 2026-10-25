const request = require('supertest');
const express = require('express');
const crypto = require('crypto');
const { query, queryOne } = require('../../config/database');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../../config/secrets');
const wishlistRouter = require('../../modules/ecommerce/routes/wishlist.routes');

describe('Milestone M3/M4 Core — C12: Wishlist & Saved Items Engine', () => {
  let app;
  let userToken;
  const testUserId = 'test-user-wishlist-' + Date.now();
  const testShopId = 'test-shop-wishlist-' + Date.now();
  const testProductId = 'test-prod-wishlist-' + Date.now();
  const testProduct2Id = 'test-prod2-wishlist-' + Date.now();

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/wishlist', wishlistRouter);

    userToken = jwt.sign(
      { userId: testUserId, role: 'customer', tokenVersion: 0 },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    // Setup test user
    await query(
      `INSERT INTO users (id, phone, phone_number, full_name, role, is_active, token_version)
       VALUES ($1, $2, $2, $3, $4, true, 0)
       ON CONFLICT (id) DO NOTHING`,
      [testUserId, '+919988776655', 'Wishlist Test User', 'customer']
    );

    // Setup test shop
    await query(
      `INSERT INTO local_shops (id, name, owner_id, phone, category, address, coordinate, latitude, longitude, is_verified, is_active, delivery_fee)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, 1, 25)
       ON CONFLICT (id) DO NOTHING`,
      [testShopId, 'Dhanori Gourmet Groceries', testUserId, '+919988776655', 'Grocery', 'Main Road, Dhanori, Pune', '18.58,73.89', 18.58, 73.89]
    );

    // Setup test products
    await query(
      `INSERT INTO shop_products (id, shop_id, name, price, mrp, stock, inventory_count, track_inventory, is_available)
       VALUES ($1, $2, $3, $4, $5, 50, 50, 1, 1)
       ON CONFLICT (id) DO NOTHING`,
      [testProductId, testShopId, 'Organic Basmati Rice 5kg', 450, 550]
    );

    await query(
      `INSERT INTO shop_products (id, shop_id, name, price, mrp, stock, inventory_count, track_inventory, is_available)
       VALUES ($1, $2, $3, $4, $5, 20, 20, 1, 1)
       ON CONFLICT (id) DO NOTHING`,
      [testProduct2Id, testShopId, 'Cold Pressed Mustard Oil 1L', 190, 220]
    );
  });

  afterAll(async () => {
    try {
      await query('DELETE FROM shop_wishlists WHERE user_id = $1', [testUserId]);
      await query('DELETE FROM cart_items WHERE user_id = $1', [testUserId]);
      await query('DELETE FROM shop_products WHERE id IN ($1, $2)', [testProductId, testProduct2Id]);
      await query('DELETE FROM local_shops WHERE id = $1', [testShopId]);
      await query('DELETE FROM users WHERE id = $1', [testUserId]);
    } catch {}
  });

  test('[C12.1] unauthenticated request is rejected with 401', async () => {
    const res = await request(app).get('/wishlist');
    expect(res.status).toBe(401);
  });

  test('[C12.2] adds item to wishlist with shop association', async () => {
    const res = await request(app)
      .post(`/wishlist/${testProductId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.saved).toBe(true);

    const row = await queryOne(
      'SELECT * FROM shop_wishlists WHERE user_id = $1 AND product_id = $2',
      [testUserId, testProductId]
    );
    expect(row).toBeDefined();
    expect(row.shop_id).toBe(testShopId);
  });

  test('[C12.3] adding duplicate item is idempotent and returns saved: true', async () => {
    const res = await request(app)
      .post(`/wishlist/${testProductId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.saved).toBe(true);
  });

  test('[C12.4] lists saved wishlist items with prices, MRP, and shop details', async () => {
    // Add second product
    await request(app)
      .post(`/wishlist/${testProduct2Id}`)
      .set('Authorization', `Bearer ${userToken}`);

    const res = await request(app)
      .get('/wishlist')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
    expect(res.body.items).toHaveLength(2);

    const item1 = res.body.items.find(i => i.productId === testProductId);
    expect(item1).toMatchObject({
      productId: testProductId,
      shopId: testShopId,
      productName: 'Organic Basmati Rice 5kg',
      price: 450,
      mrp: 550,
      currentStock: 50,
      isAvailable: true,
      shopName: 'Dhanori Gourmet Groceries',
      deliveryFee: 25
    });
  });

  test('[C12.5] moves product from wishlist to shopping cart', async () => {
    const res = await request(app)
      .post(`/wishlist/${testProductId}/move-to-cart`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.productId).toBe(testProductId);

    // Verify it was inserted into cart_items
    const cartItem = await queryOne(
      'SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2',
      [testUserId, testProductId]
    );
    expect(cartItem).toBeDefined();
    expect(Number(cartItem.quantity)).toBe(1);

    // Verify it was deleted from wishlist
    const wishlistItem = await queryOne(
      'SELECT * FROM shop_wishlists WHERE user_id = $1 AND product_id = $2',
      [testUserId, testProductId]
    );
    expect(wishlistItem).toBeNull();
  });

  test('[C12.6] removes product from wishlist via DELETE', async () => {
    const res = await request(app)
      .delete(`/wishlist/${testProduct2Id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.saved).toBe(false);

    const remaining = await query(
      'SELECT * FROM shop_wishlists WHERE user_id = $1',
      [testUserId]
    ).then(r => r.rows || r || []);
    expect(remaining).toHaveLength(0);
  });
});
