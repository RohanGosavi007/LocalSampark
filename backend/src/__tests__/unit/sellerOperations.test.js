const request = require('supertest');
const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');
const { pointSql } = require('../../utils/sqlPoint');
const { getJwtSecret } = require('../../config/secrets');
const shopRouter = require('../../modules/ecommerce/routes/shop.routes');
const orderRouter = require('../../modules/ecommerce/routes/order.routes');
const kycRouter = require('../../modules/ecommerce/routes/vendor-kyc.routes');
const payoutRouter = require('../../modules/ecommerce/routes/payout.routes');
const platformConfig = require('../../services/platformConfig.service');
const ledgerService = require('../../services/ledger.service');

describe('Milestone M4.1: Seller Operations Hub (S1, S2, S3, S4)', () => {
  let app;
  const TEST_SHOP_ID = crypto.randomUUID();
  const TEST_SELLER_ID = crypto.randomUUID();
  const TEST_ADMIN_ID = crypto.randomUUID();
  const TEST_CUSTOMER_ID = crypto.randomUUID();
  const TEST_PRODUCT_ID = crypto.randomUUID();
  const TEST_ORDER_PENDING_ID = crypto.randomUUID();
  const TEST_ORDER_DELIVERED_ID = crypto.randomUUID();

  let sellerToken;
  let adminToken;
  let customerToken;
  let kycId;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/shops', shopRouter);
    app.use('/shops', kycRouter);
    app.use('/shops', payoutRouter);
    app.use('/admin/kyc', kycRouter);
    app.use('/orders', orderRouter);

    sellerToken = jwt.sign(
      { userId: TEST_SELLER_ID, id: TEST_SELLER_ID, role: 'shop_owner', email: 'seller@example.com', tokenVersion: 0 },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { userId: TEST_ADMIN_ID, id: TEST_ADMIN_ID, role: 'super_admin', isSuperAdmin: true, email: 'admin@example.com', tokenVersion: 0 },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    customerToken = jwt.sign(
      { userId: TEST_CUSTOMER_ID, id: TEST_CUSTOMER_ID, role: 'customer', email: 'customer@example.com', tokenVersion: 0 },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    // Clean up
    await query('DELETE FROM order_items WHERE order_id IN ($1, $2)', [TEST_ORDER_PENDING_ID, TEST_ORDER_DELIVERED_ID]);
    await query('DELETE FROM orders WHERE id IN ($1, $2)', [TEST_ORDER_PENDING_ID, TEST_ORDER_DELIVERED_ID]);
    await query('DELETE FROM vendor_kyc WHERE shop_id = $1', [TEST_SHOP_ID]);
    await query('DELETE FROM product_variants WHERE product_id = $1', [TEST_PRODUCT_ID]);
    await query('DELETE FROM shop_products WHERE id = $1', [TEST_PRODUCT_ID]);
    await query('DELETE FROM local_shops WHERE id = $1', [TEST_SHOP_ID]);
    await query('DELETE FROM users WHERE id IN ($1, $2, $3)', [TEST_SELLER_ID, TEST_ADMIN_ID, TEST_CUSTOMER_ID]);

    // Seed users
    await query(
      `INSERT INTO users (id, phone_number, email, full_name, role, is_active)
       VALUES ($1, '9999988881', 'seller@example.com', 'Dhanori Shop Owner', 'shop_owner', true)`,
      [TEST_SELLER_ID]
    );

    await query(
      `INSERT INTO users (id, phone_number, email, full_name, role, is_active)
       VALUES ($1, '9999988882', 'admin@example.com', 'System Admin', 'super_admin', true)`,
      [TEST_ADMIN_ID]
    );

    await query(
      `INSERT INTO users (id, phone_number, email, full_name, role, is_active)
       VALUES ($1, '9999988883', 'customer@example.com', 'Dhanori Resident', 'customer', true)`,
      [TEST_CUSTOMER_ID]
    );

    // Seed shop (initially unverified)
    await query(
      `INSERT INTO local_shops (id, owner_id, name, description, category, address, is_active, is_verified, latitude, longitude, coordinate, gstin, fssai_license_number)
       VALUES ($1, $2, 'Dhanori Kitchen Ops', 'Hyperlocal meals and groceries', 'restaurant', 'Plot 10, Dhanori', true, false, 18.5793, 73.8796, ${pointSql(18.5793, 73.8796)}, '27AADCB2230M1Z2', '11521034000123')`,
      [TEST_SHOP_ID, TEST_SELLER_ID]
    );

    // Seed product
    await query(
      `INSERT INTO shop_products (id, shop_id, name, price, stock, inventory_count, is_active)
       VALUES ($1, $2, 'Special Thali', 150.00, 15, 15, 1)`,
      [TEST_PRODUCT_ID, TEST_SHOP_ID]
    );

    // Seed pending order (for kitchen display accept/reject)
    await query(
      `INSERT INTO orders (id, user_id, shop_id, total_amount, subtotal, delivery_fee, status, order_status, payment_method, payment_status, fulfillment_method)
       VALUES ($1, $2, $3, 180.00, 150.00, 30.00, 'pending', 'pending', 'COD', 'unpaid', 'delivery')`,
      [TEST_ORDER_PENDING_ID, TEST_CUSTOMER_ID, TEST_SHOP_ID]
    );

    await query(
      `INSERT INTO order_items (id, order_id, product_id, name, quantity, price)
       VALUES ($1, $2, $3, 'Special Thali', 1, 150.00)`,
      [crypto.randomUUID(), TEST_ORDER_PENDING_ID, TEST_PRODUCT_ID]
    );

    // Seed delivered order (for settlement statement)
    await query(
      `INSERT INTO orders (id, user_id, shop_id, total_amount, subtotal, delivery_fee, status, order_status, payment_method, payment_status, fulfillment_method, delivered_at)
       VALUES ($1, $2, $3, 330.00, 300.00, 30.00, 'delivered', 'delivered', 'COD', 'paid', 'delivery', CURRENT_TIMESTAMP)`,
      [TEST_ORDER_DELIVERED_ID, TEST_CUSTOMER_ID, TEST_SHOP_ID]
    );

    await query(
      `INSERT INTO order_items (id, order_id, product_id, name, quantity, price)
       VALUES ($1, $2, $3, 'Special Thali', 2, 150.00)`,
      [crypto.randomUUID(), TEST_ORDER_DELIVERED_ID, TEST_PRODUCT_ID]
    );
  });

  afterAll(async () => {
    await query('DELETE FROM order_items WHERE order_id IN ($1, $2)', [TEST_ORDER_PENDING_ID, TEST_ORDER_DELIVERED_ID]);
    await query('DELETE FROM orders WHERE id IN ($1, $2)', [TEST_ORDER_PENDING_ID, TEST_ORDER_DELIVERED_ID]);
    await query('DELETE FROM vendor_kyc WHERE shop_id = $1', [TEST_SHOP_ID]);
    await query('DELETE FROM product_variants WHERE product_id = $1', [TEST_PRODUCT_ID]);
    await query('DELETE FROM shop_products WHERE id = $1', [TEST_PRODUCT_ID]);
    await query('DELETE FROM local_shops WHERE id = $1', [TEST_SHOP_ID]);
    await query('DELETE FROM users WHERE id IN ($1, $2, $3)', [TEST_SELLER_ID, TEST_ADMIN_ID, TEST_CUSTOMER_ID]);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // S1: SELLER ONBOARDING & DIGITAL KYC
  // ═════════════════════════════════════════════════════════════════════════
  describe('[S1.1] Seller KYC Submission, Storage Isolation & Admin Review', () => {
    it('submits KYC documents for review and saves statutory details', async () => {
      const res = await request(app)
        .post(`/shops/${TEST_SHOP_ID}/kyc`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          pan_number: 'ABCDE1234F',
          pan_url: 'private/documents/pan-card-dhanori.pdf',
          gst_number: '27AADCB2230M1Z2',
          fssai_number: '11521034000123',
          fssai_url: 'private/documents/fssai-cert.pdf',
          bank_account_number: '987654321012',
          bank_ifsc: 'HDFC0001234',
          bank_name: 'HDFC Bank',
          bank_branch: 'Dhanori Pune',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('submitted');
      expect(res.body.kycId).toBeDefined();
      kycId = res.body.kycId;
    });

    it('retrieves KYC record with short-lived signed URLs for private docs', async () => {
      const res = await request(app)
        .get(`/shops/${TEST_SHOP_ID}/kyc`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.kyc.kyc_status).toBe('submitted');
      expect(res.body.kyc.pan_number).toBe('ABCDE1234F');
      expect(res.body.kyc.pan_url_signed).toBeDefined();
      expect(res.body.kyc.fssai_url_signed).toBeDefined();
    });

    it('allows admin to request resubmission with a mandatory reason', async () => {
      const res = await request(app)
        .put(`/admin/kyc/${kycId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'resubmission',
          rejection_reason: 'FSSAI certificate copy is blurred, please re-upload clear scan',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('resubmission');

      // Verify status in KYC record
      const statusRes = await request(app)
        .get(`/shops/${TEST_SHOP_ID}/kyc`)
        .set('Authorization', `Bearer ${sellerToken}`);
      expect(statusRes.body.kyc.kyc_status).toBe('resubmission');
      expect(statusRes.body.kyc.rejection_reason).toContain('blurred');
    });

    it('allows admin to verify KYC and automatically activate the shop', async () => {
      const res = await request(app)
        .put(`/shops/admin/${kycId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'verified' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('verified');

      // Verify local_shops is now verified and active
      const shopRes = await request(app).get(`/shops/${TEST_SHOP_ID}`);
      expect(shopRes.status).toBe(200);
      expect(Boolean(shopRes.body.is_verified)).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // S2: CATALOG INVENTORY AVAILABILITY & LOW-STOCK ALERTS
  // ═════════════════════════════════════════════════════════════════════════
  describe('[S2.1] Catalog Inventory Availability & Low-Stock Alerts', () => {
    it('updates product availability toggle and inventory count', async () => {
      const res = await request(app)
        .patch(`/shops/${TEST_SHOP_ID}/products/${TEST_PRODUCT_ID}/availability`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ is_active: true, inventory_count: 3 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Boolean(res.body.is_active)).toBe(true);
      expect(res.body.inventory_count).toBe(3);
    });

    it('identifies products below low-stock threshold', async () => {
      const res = await request(app)
        .get(`/shops/${TEST_SHOP_ID}/products/low-stock?threshold=5`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(1);
      const item = res.body.products.find(p => p.id === TEST_PRODUCT_ID);
      expect(item).toBeDefined();
      expect(item.inventory_count).toBe(3);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // S3: KITCHEN DISPLAY ORDER HANDLING & PACKING SLIP
  // ═════════════════════════════════════════════════════════════════════════
  describe('[S3.1] Kitchen Display Order Acceptance & Rejection', () => {
    it('rejects order rejection when mandatory reason is missing', async () => {
      const res = await request(app)
        .put(`/orders/${TEST_ORDER_PENDING_ID}/reject`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Rejection reason is required');
    });

    it('accepts incoming order from kitchen display (pending -> confirmed)', async () => {
      const res = await request(app)
        .put(`/orders/${TEST_ORDER_PENDING_ID}/accept`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('confirmed');
    });

    it('rejects order with reason when item runs out of stock (confirmed -> cancelled)', async () => {
      const res = await request(app)
        .put(`/orders/${TEST_ORDER_PENDING_ID}/reject`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ reason: 'Kitchen ran out of fresh ingredients' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('cancelled');
      expect(res.body.reason).toContain('Kitchen ran out');
    });
  });

  describe('[S3.2] 80mm ESC/POS Monospace Thermal Packing Slip Generation', () => {
    it('generates 80mm monospace thermal slip text', async () => {
      const res = await request(app)
        .get(`/orders/${TEST_ORDER_DELIVERED_ID}/packing-slip`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('LOCAL SAMPARK');
      expect(res.text).toContain('KITCHEN PACKING SLIP');
      expect(res.text).toContain('Special Thali');
      expect(res.text).toContain('GRAND TOTAL');
      expect(res.text).toContain('CASH ON DELIVERY');
    });

    it('generates structured JSON packing slip when requested', async () => {
      const res = await request(app)
        .get(`/orders/${TEST_ORDER_DELIVERED_ID}/packing-slip?format=json`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.orderId).toBe(TEST_ORDER_DELIVERED_ID);
      expect(res.body.metadata.isCod).toBe(true);
      expect(res.body.metadata.totalAmount).toBe(330);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // S4: SELLER FINANCIALS & 0% LAUNCH COMMISSION
  // ═════════════════════════════════════════════════════════════════════════
  describe('[S4.1] Seller Financials, 0% Commission & Settlement Statement', () => {
    it('verifies 0% platform commission default in platform configuration', async () => {
      const defaultCommission = await platformConfig.get('default_commission_percent');
      expect(defaultCommission).toBe(0);
    });

    it('generates daily settlement statement with 0% launch commission breakdown', async () => {
      // Record a test transaction in the double-entry ledger
      await ledgerService.recordTransaction({
        referenceType: 'ORDER_PAYMENT',
        referenceId: TEST_ORDER_DELIVERED_ID,
        description: 'Delivered order test payout credit',
        entries: [
          {
            entryType: 'DEBIT',
            accountType: 'CUSTOMER_CASH',
            accountId: TEST_CUSTOMER_ID,
            amountPaise: 33000,
          },
          {
            entryType: 'CREDIT',
            accountType: 'SELLER_PAYABLE',
            accountId: TEST_SHOP_ID,
            amountPaise: 33000,
          }
        ]
      });

      const res = await request(app)
        .get(`/shops/${TEST_SHOP_ID}/settlements/statement`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.summary.shopId).toBe(TEST_SHOP_ID);
      expect(res.body.summary.commissionPercent).toBe(0);
      expect(res.body.summary.totalCommission).toBe(0);
      expect(res.body.summary.ledgerBalancePaise).toBe(33000);
      expect(res.body.summary.ledgerBalanceRupees).toBe(330);
    });

    it('exports downloadable CSV settlement statement', async () => {
      const res = await request(app)
        .get(`/shops/${TEST_SHOP_ID}/settlements/statement/csv`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('.csv');
      expect(res.text).toContain('Date,OrderId,PaymentMethod,GrossSales,Commission,GST,GatewayFee,CODCollectedByShop,NetPayable');
      expect(res.text).toContain(TEST_ORDER_DELIVERED_ID);
    });
  });
});
