const request = require('supertest');
const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');
const { pointSql } = require('../../utils/sqlPoint');
const { getJwtSecret } = require('../../config/secrets');
const shopRouter = require('../../modules/ecommerce/routes/shop.routes');
const orderRouter = require('../../modules/ecommerce/routes/order.routes');
const invoiceService = require('../../services/invoice.service');

describe('S2 Product Variants & C9/N7 GST Tax Invoice Generation', () => {
  let app;
  const TEST_SHOP_ID = crypto.randomUUID();
  const TEST_SELLER_ID = crypto.randomUUID();
  const TEST_PRODUCT_ID = crypto.randomUUID();
  const TEST_ORDER_ID = crypto.randomUUID();

  let sellerToken;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/shops', shopRouter);
    app.use('/orders', orderRouter);

    sellerToken = jwt.sign(
      { userId: TEST_SELLER_ID, id: TEST_SELLER_ID, role: 'shop_owner', email: 'seller@example.com', tokenVersion: 0 },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    await query('DELETE FROM shop_invoices WHERE order_id = $1', [TEST_ORDER_ID]);
    await query('DELETE FROM orders WHERE id = $1', [TEST_ORDER_ID]);
    await query('DELETE FROM product_variants WHERE product_id = $1', [TEST_PRODUCT_ID]);
    await query('DELETE FROM shop_products WHERE id = $1', [TEST_PRODUCT_ID]);
    await query('DELETE FROM local_shops WHERE id = $1', [TEST_SHOP_ID]);
    await query('DELETE FROM users WHERE id = $1', [TEST_SELLER_ID]);

    // Seed seller user
    await query(
      `INSERT INTO users (id, phone_number, email, full_name, role, is_active)
       VALUES ($1, '9999988881', 'seller@example.com', 'Dhanori Shop Owner', 'shop_owner', true)`,
      [TEST_SELLER_ID]
    );

    // Seed shop owned by seller
    await query(
      `INSERT INTO local_shops (id, owner_id, name, description, category, address, is_active, latitude, longitude, coordinate, gstin, fssai_license_number)
       VALUES ($1, $2, 'Dhanori Fresh Bakers', 'Fresh bakery items', 'bakery', 'Shop 4, Dhanori Road', true, 18.5793, 73.8796, ${pointSql(18.5793, 73.8796)}, '27AADCB2230M1Z2', '11521034000123')`,
      [TEST_SHOP_ID, TEST_SELLER_ID]
    );

    // Seed product
    await query(
      `INSERT INTO shop_products (id, shop_id, name, price, stock, inventory_count, track_inventory)
       VALUES ($1, $2, 'Multigrain Bread', 50.00, 20, 20, 1)`,
      [TEST_PRODUCT_ID, TEST_SHOP_ID]
    );

    // Seed completed order
    await query(
      `INSERT INTO orders (id, user_id, shop_id, total_amount, subtotal, delivery_fee, status, order_status, payment_method, payment_status)
       VALUES ($1, $2, $3, 130.00, 100.00, 30.00, 'DELIVERED', 'DELIVERED', 'COD', 'paid')`,
      [TEST_ORDER_ID, TEST_SELLER_ID, TEST_SHOP_ID]
    );

    // Seed order items
    await query(
      `INSERT INTO order_items (id, order_id, product_id, name, quantity, price)
       VALUES ($1, $2, $3, 'Multigrain Bread 400g', 2, 50.00)`,
      [crypto.randomUUID(), TEST_ORDER_ID, TEST_PRODUCT_ID]
    );
  });

  afterAll(async () => {
    await query('DELETE FROM shop_invoices WHERE order_id = $1', [TEST_ORDER_ID]);
    await query('DELETE FROM order_items WHERE order_id = $1', [TEST_ORDER_ID]);
    await query('DELETE FROM orders WHERE id = $1', [TEST_ORDER_ID]);
    await query('DELETE FROM product_variants WHERE product_id = $1', [TEST_PRODUCT_ID]);
    await query('DELETE FROM shop_products WHERE id = $1', [TEST_PRODUCT_ID]);
    await query('DELETE FROM local_shops WHERE id = $1', [TEST_SHOP_ID]);
    await query('DELETE FROM users WHERE id = $1', [TEST_SELLER_ID]);
  });

  let createdVariantId;

  test('[S2.1] creates product variant with price modifier and inventory', async () => {
    const res = await request(app)
      .post(`/shops/${TEST_SHOP_ID}/products/${TEST_PRODUCT_ID}/variants`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        variant_name: 'Weight',
        variant_value: '800g Family Pack',
        sku: 'BREAD-800G',
        price_modifier: 40.00,
        inventory_count: 15
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.variant.id).toBeDefined();
    expect(res.body.variant.variant_value).toBe('800g Family Pack');
    expect(res.body.variant.price_modifier).toBe(40);
    expect(res.body.variant.inventory_count).toBe(15);
    createdVariantId = res.body.variant.id;
  });

  test('[S2.2] gets all variants for a product', async () => {
    const res = await request(app)
      .get(`/shops/${TEST_SHOP_ID}/products/${TEST_PRODUCT_ID}/variants`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.variants.length).toBeGreaterThanOrEqual(1);
    const found = res.body.variants.find((v) => v.id === createdVariantId);
    expect(found).toBeDefined();
    expect(found.sku).toBe('BREAD-800G');
  });

  test('[S2.3] updates product variant modifier and inventory count', async () => {
    const res = await request(app)
      .put(`/shops/${TEST_SHOP_ID}/products/${TEST_PRODUCT_ID}/variants/${createdVariantId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        price_modifier: 45.00,
        inventory_count: 25
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.variant.price_modifier).toBe(45);
    expect(res.body.variant.inventory_count).toBe(25);
  });

  test('[C9.1] generates order tax invoice with GST & FSSAI details', async () => {
    const res = await request(app)
      .get(`/orders/${TEST_ORDER_ID}/invoice`)
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const inv = res.body.invoice;
    expect(inv.invoice_number).toMatch(/^INV-\d{4}-/);
    expect(inv.shop_name).toBe('Dhanori Fresh Bakers');
    expect(inv.gstin).toBe('27AADCB2230M1Z2');
    expect(inv.fssai_license_number).toBe('11521034000123');
    expect(Number(inv.total_amount)).toBe(130);
    expect(Number(inv.subtotal)).toBe(100);
    expect(Number(inv.delivery_fee)).toBe(30);
  });

  test('[C9.2] streams generated GST tax invoice PDF', async () => {
    const res = await request(app)
      .get(`/orders/${TEST_ORDER_ID}/invoice/pdf`)
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    // PDF magic bytes: '%PDF-'
    expect(res.body.slice(0, 5).toString('ascii')).toBe('%PDF-');
  });

  test('[S2.4] deletes product variant', async () => {
    const res = await request(app)
      .delete(`/shops/${TEST_SHOP_ID}/products/${TEST_PRODUCT_ID}/variants/${createdVariantId}`)
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const listRes = await request(app)
      .get(`/shops/${TEST_SHOP_ID}/products/${TEST_PRODUCT_ID}/variants`);
    const found = listRes.body.variants.find((v) => v.id === createdVariantId);
    expect(found).toBeUndefined();
  });
});
