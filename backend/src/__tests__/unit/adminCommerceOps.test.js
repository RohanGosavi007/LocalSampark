const request = require('supertest');
const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const adminCommerceRouter = require('../../modules/crm/routes/admin-commerce.routes');
const platformConfig = require('../../services/platformConfig.service');

const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';

describe('Milestone M4.3: Admin Commerce Ops Hub (A1–A14)', () => {
  let app;
  const TEST_ADMIN_ID = crypto.randomUUID();
  const TEST_CUSTOMER_ID = crypto.randomUUID();
  const TEST_RIDER_ID = crypto.randomUUID();
  const TEST_SHOP_ID = crypto.randomUUID();
  const TEST_ORDER_ID = crypto.randomUUID();
  const TEST_DISPUTE_ID = crypto.randomUUID();
  const TEST_CATEGORY_ID = crypto.randomUUID();
  const TEST_PRODUCT_ID = crypto.randomUUID();
  const TEST_TICKET_ID = crypto.randomUUID();

  let adminToken;
  let customerToken;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/admin/commerce', adminCommerceRouter);

    adminToken = jwt.sign(
      { userId: TEST_ADMIN_ID, id: TEST_ADMIN_ID, role: 'super_admin', isSuperAdmin: true, email: 'superadmin@example.com', tokenVersion: 0 },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    customerToken = jwt.sign(
      { userId: TEST_CUSTOMER_ID, id: TEST_CUSTOMER_ID, role: 'user', email: 'regularuser@example.com', tokenVersion: 0 },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    // Clean up stale test data
    await query("DELETE FROM admin_audit_log WHERE admin_id = $1", [TEST_ADMIN_ID]);
    await query("DELETE FROM support_tickets WHERE id = $1", [TEST_TICKET_ID]);
    await query("DELETE FROM disputes WHERE id = $1", [TEST_DISPUTE_ID]);
    await query("DELETE FROM platform_banners WHERE title = 'Diwali Mega Sale'");
    await query("DELETE FROM coupons WHERE code = 'ADMIN50'");
    await query("DELETE FROM order_items WHERE order_id = $1", [TEST_ORDER_ID]);
    await query("DELETE FROM orders WHERE id = $1", [TEST_ORDER_ID]);
    await query("DELETE FROM shop_products WHERE id = $1", [TEST_PRODUCT_ID]);
    await query("DELETE FROM shop_categories WHERE id = $1", [TEST_CATEGORY_ID]);
    await query("DELETE FROM local_shops WHERE id = $1", [TEST_SHOP_ID]);
    await query("DELETE FROM delivery_agents WHERE user_id = $1", [TEST_RIDER_ID]);
    await query("DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id IN ($1, $2, $3))", [TEST_ADMIN_ID, TEST_CUSTOMER_ID, TEST_RIDER_ID]);
    await query("DELETE FROM wallets WHERE user_id IN ($1, $2, $3)", [TEST_ADMIN_ID, TEST_CUSTOMER_ID, TEST_RIDER_ID]);
    await query("DELETE FROM users WHERE id IN ($1, $2, $3) OR phone_number IN ('+918888777701', '+918888777702', '+918888777703')", [TEST_ADMIN_ID, TEST_CUSTOMER_ID, TEST_RIDER_ID]);

    // Seed test users
    await query(
      `INSERT INTO users (id, full_name, phone_number, email, role, is_active)
       VALUES ($1, 'Admin Commander', '+918888777701', 'superadmin@example.com', 'super_admin', true)`,
      [TEST_ADMIN_ID]
    );

    await query(
      `INSERT INTO users (id, full_name, phone_number, email, role, is_active)
       VALUES ($1, 'Shopper One', '+918888777702', 'regularuser@example.com', 'user', true)`,
      [TEST_CUSTOMER_ID]
    );

    await query(
      `INSERT INTO users (id, full_name, phone_number, email, role, is_active)
       VALUES ($1, 'Fleet Rider', '+918888777703', 'fleet@example.com', 'delivery_agent', true)`,
      [TEST_RIDER_ID]
    );

    // Seed test shop
    await query(
      `INSERT INTO local_shops (id, name, owner_id, phone, category, address, latitude, longitude, coordinate, pincode, is_active, is_verified, approval_status, gstin, pan)
       VALUES ($1, 'Dhanori Gourmet Hub', $2, '+918888777710', 'restaurant', 'Main Road, Dhanori, Pune', 18.5833, 73.8833, 'POINT(73.8833 18.5833)', '411015', true, true, 'approved', '27ABCDE1234F1Z5', 'ABCDE1234F')`,
      [TEST_SHOP_ID, TEST_ADMIN_ID]
    );

    // Seed test delivery agent
    await query(
      `INSERT INTO delivery_agents (id, user_id, vehicle_type, vehicle_number, kyc_status, status, is_online, cash_in_hand, current_lat, current_lng)
       VALUES ($1, $2, 'motorcycle', 'MH-12-CD-5555', 'approved', 'available', true, 1200, 18.5830, 73.8830)`,
      [crypto.randomUUID(), TEST_RIDER_ID]
    );

    // Seed test order
    await query(
      `INSERT INTO orders (
         id, user_id, shop_id, subtotal, total_amount, delivery_fee, rider_payout,
         delivery_address, delivery_coordinate, payment_method, payment_status, order_status, status,
         fulfillment_method, otp_code, created_at
       ) VALUES (
         $1, $2, $3, 400, 440, 40, 40,
         'Apartment 101, Dhanori Heights, Pune', 'POINT(73.8833 18.5833)', 'razorpay', 'paid', 'confirmed', 'confirmed',
         'delivery', '654321', ${NOW}
       )`,
      [TEST_ORDER_ID, TEST_CUSTOMER_ID, TEST_SHOP_ID]
    );

    // Seed test product
    await query(
      `INSERT INTO shop_products (id, shop_id, name, description, price, is_active, inventory_count)
       VALUES ($1, $2, 'Special Herb Tea', 'Organic herbal blend with tobacco aroma note', 150, 1, 20)`,
      [TEST_PRODUCT_ID, TEST_SHOP_ID]
    );

    // Seed test dispute
    await query(
      `INSERT INTO disputes (id, user_id, order_id, shop_id, type, description, status, created_at)
       VALUES ($1, $2, $3, $4, 'quality_issue', 'Food arrived cold and spilled', 'open', ${NOW})`,
      [TEST_DISPUTE_ID, TEST_CUSTOMER_ID, TEST_ORDER_ID, TEST_SHOP_ID]
    );

    // Seed test statutory grievance
    await query(
      `INSERT INTO support_tickets (id, user_id, subject, description, category, priority, status, is_statutory, created_at)
       VALUES ($1, $2, 'Incorrect pricing on receipt', 'Charged higher than displayed MRP', 'billing', 'high', 'open', true, ${NOW})`,
      [TEST_TICKET_ID, TEST_CUSTOMER_ID]
    );

    // Ensure platformConfig defaults
    await platformConfig.update({ default_commission_percent: 0, rider_cash_limit: 3000 });
  });

  afterAll(async () => {
    await query("DELETE FROM admin_audit_log WHERE admin_id = $1", [TEST_ADMIN_ID]);
    await query("DELETE FROM support_tickets WHERE id = $1", [TEST_TICKET_ID]);
    await query("DELETE FROM disputes WHERE id = $1", [TEST_DISPUTE_ID]);
    await query("DELETE FROM platform_banners WHERE title = 'Diwali Mega Sale'");
    await query("DELETE FROM coupons WHERE code = 'ADMIN50'");
    await query("DELETE FROM order_items WHERE order_id = $1", [TEST_ORDER_ID]);
    await query("DELETE FROM orders WHERE id IN ($1, '00000000-0000-0000-0000-000000000099')", [TEST_ORDER_ID]);
    await query("DELETE FROM shop_products WHERE id = $1", [TEST_PRODUCT_ID]);
    await query("DELETE FROM shop_categories WHERE id = $1", [TEST_CATEGORY_ID]);
    await query("DELETE FROM local_shops WHERE id = $1", [TEST_SHOP_ID]);
    await query("DELETE FROM delivery_agents WHERE user_id = $1", [TEST_RIDER_ID]);
    await query("DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id IN ($1, $2, $3))", [TEST_ADMIN_ID, TEST_CUSTOMER_ID, TEST_RIDER_ID]);
    await query("DELETE FROM wallets WHERE user_id IN ($1, $2, $3)", [TEST_ADMIN_ID, TEST_CUSTOMER_ID, TEST_RIDER_ID]);
    await query("DELETE FROM users WHERE id IN ($1, $2, $3)", [TEST_ADMIN_ID, TEST_CUSTOMER_ID, TEST_RIDER_ID]);
  });

  describe('A8: RBAC & Route Protection', () => {
    it('[A8.1] should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/admin/commerce/kpis');
      expect(res.status).toBe(401);
    });

    it('[A8.2] should reject non-admin regular users with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/admin/commerce/kpis')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('A1: Admin Commerce KPI Dashboard', () => {
    it('[A1.1] should return live aggregated commerce operational metrics', async () => {
      const res = await request(app)
        .get('/admin/commerce/kpis')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const { data } = res.body;

      expect(data.gmv).toBeGreaterThanOrEqual(440);
      expect(data.totalOrders).toBeGreaterThanOrEqual(1);
      expect(data.activeShops).toBeGreaterThanOrEqual(1);
      expect(data.activeRiders).toBeGreaterThanOrEqual(1);
      expect(data.totalCustomers).toBeGreaterThanOrEqual(1);
      expect(Number.isFinite(data.aov)).toBe(true);
      expect(Number.isFinite(data.cancellationRate)).toBe(true);
    });
  });

  describe('A2: Store & Seller Governance', () => {
    it('[A2.1] should list registered shops with approval status', async () => {
      const res = await request(app)
        .get('/admin/commerce/shops')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const shop = res.body.data.find((s) => s.id === TEST_SHOP_ID);
      expect(shop).toBeDefined();
      expect(shop.name).toBe('Dhanori Gourmet Hub');
    });

    it('[A2.2] should reject emergency suspension without a mandatory reason', async () => {
      const res = await request(app)
        .put(`/admin/commerce/shops/${TEST_SHOP_ID}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/mandatory suspension reason/i);
    });

    it('[A2.3] should execute emergency store suspension kill-switch with reason and log audit trail', async () => {
      const res = await request(app)
        .put(`/admin/commerce/shops/${TEST_SHOP_ID}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Severe hygiene violation reported by food safety inspection' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isSuspended).toBe(true);

      const updatedShop = await queryOne('SELECT is_active, approval_status FROM local_shops WHERE id = $1', [TEST_SHOP_ID]);
      expect(Boolean(updatedShop.is_active)).toBe(false);
      expect(updatedShop.approval_status).toBe('suspended');

      // Restore shop to active for subsequent tests
      await query("UPDATE local_shops SET is_active = true, approval_status = 'approved' WHERE id = $1", [TEST_SHOP_ID]);
    });
  });

  describe('A3: Catalog Moderation & Categories', () => {
    it('[A3.1] should perform category taxonomy CRUD operations', async () => {
      // 1. Create
      const createRes = await request(app)
        .post('/admin/commerce/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Artisan Bakery', slug: 'artisan-bakery', displayOrder: 1 });

      expect(createRes.status).toBe(201);
      const catId = createRes.body.data.id;

      // 2. Read
      const listRes = await request(app)
        .get('/admin/commerce/categories')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(listRes.status).toBe(200);
      const found = listRes.body.data.find((c) => c.slug === 'artisan-bakery');
      expect(found).toBeDefined();

      // 3. Update
      const updateRes = await request(app)
        .put(`/admin/commerce/categories/${catId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Fresh Artisan Bakery' });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.name).toBe('Fresh Artisan Bakery');

      // 4. Deactivate
      const deleteRes = await request(app)
        .delete(`/admin/commerce/categories/${catId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(deleteRes.status).toBe(200);

      await query('DELETE FROM shop_categories WHERE id = $1', [catId]);
    });

    it('[A3.2] should flag restricted goods in product moderation queue', async () => {
      const res = await request(app)
        .get('/admin/commerce/products/moderation')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const item = res.body.data.find((p) => p.id === TEST_PRODUCT_ID);
      expect(item).toBeDefined();
      expect(item.isRestricted).toBe(true);
      expect(item.restrictedKeyword).toBe('tobacco');
    });

    it('[A3.3] should allow admin to moderate product status', async () => {
      const res = await request(app)
        .put(`/admin/commerce/products/${TEST_PRODUCT_ID}/moderation`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'flag', reason: 'Restricted keyword detected' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isActive).toBe(false);
    });
  });

  describe('A4: Order Operations & Interventions', () => {
    it('[A4.1] should search orders across filters and return results', async () => {
      const res = await request(app)
        .get(`/admin/commerce/orders?status=confirmed&shopId=${TEST_SHOP_ID}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((o) => o.id === TEST_ORDER_ID);
      expect(found).toBeDefined();
    });

    it('[A4.2] should retrieve full chronological order timeline and details', async () => {
      const res = await request(app)
        .get(`/admin/commerce/orders/${TEST_ORDER_ID}/timeline`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order.id).toBe(TEST_ORDER_ID);
      expect(Array.isArray(res.body.data.timeline)).toBe(true);
      expect(res.body.data.timeline.length).toBeGreaterThanOrEqual(1);
    });

    it('[A4.3] should allow emergency force-cancellation with mandatory reason', async () => {
      const res = await request(app)
        .post(`/admin/commerce/orders/${TEST_ORDER_ID}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Customer requested emergency cancellation due to accidental duplicate order' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.orderStatus).toBe('cancelled');

      const cancelled = await queryOne('SELECT order_status, cancellation_reason FROM orders WHERE id = $1', [TEST_ORDER_ID]);
      expect(cancelled.order_status).toBe('cancelled');
      expect(cancelled.cancellation_reason).toMatch(/accidental duplicate/i);
    });

    it('[A4.4] should issue manual administrative refund to customer wallet', async () => {
      const res = await request(app)
        .post(`/admin/commerce/orders/${TEST_ORDER_ID}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 440, reason: 'Full goodwill refund for delayed cancellation' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.refundAmount).toBe(440);

      const wallet = await queryOne('SELECT balance FROM wallets WHERE user_id = $1', [TEST_CUSTOMER_ID]);
      expect(Number(wallet.balance)).toBeGreaterThanOrEqual(440);
    });

    it('[A4.5] should list operational SLA breaches', async () => {
      const res = await request(app)
        .get('/admin/commerce/orders/sla-breaches')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('A5: Returns & Dispute Resolution Queue', () => {
    it('[A5.1] should list open customer disputes', async () => {
      const res = await request(app)
        .get('/admin/commerce/disputes?status=open')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const dispute = res.body.data.find((d) => d.id === TEST_DISPUTE_ID);
      expect(dispute).toBeDefined();
      expect(dispute.type).toBe('quality_issue');
    });

    it('[A5.2] should resolve dispute with customer refund and update status', async () => {
      const res = await request(app)
        .put(`/admin/commerce/disputes/${TEST_DISPUTE_ID}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolution: 'refund_customer', refundAmount: 200 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('resolved');

      const resolved = await queryOne('SELECT status, resolution FROM disputes WHERE id = $1', [TEST_DISPUTE_ID]);
      expect(resolved.status).toBe('resolved');
      expect(resolved.resolution).toBe('refund_customer');
    });
  });

  describe('A6: Payouts & Commission Configuration', () => {
    it('[A6.1] should verify 0% default commission and allow admin updates', async () => {
      const res = await request(app)
        .get('/admin/commerce/commission')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.defaultCommissionPercent).toBe(0); // 0% launch rate

      // Update rate
      const updateRes = await request(app)
        .put('/admin/commerce/commission')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ defaultCommissionPercent: 5 });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.defaultCommissionPercent).toBe(5);

      // Revert back to 0%
      await platformConfig.update({ default_commission_percent: 0 });
    });

    it('[A6.2] should allow setting shop-specific commission rate overrides', async () => {
      const res = await request(app)
        .put(`/admin/commerce/shops/${TEST_SHOP_ID}/commission`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ commissionRate: 2.5 });

      expect(res.status).toBe(200);
      expect(res.body.commissionRate).toBe(2.5);

      const shop = await queryOne('SELECT commission_rate FROM local_shops WHERE id = $1', [TEST_SHOP_ID]);
      expect(Number(shop.commission_rate)).toBe(2.5);
    });
  });

  describe('A7: Promotions, Coupons & Banner CMS', () => {
    it('[A7.1] should create platform-wide coupon', async () => {
      const res = await request(app)
        .post('/admin/commerce/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'ADMIN50',
          discountType: 'percentage',
          discountValue: 50,
          minOrderAmount: 200,
          maxDiscountAmount: 100,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('ADMIN50');
    });

    it('[A7.2] should create and list promotional banners', async () => {
      const createRes = await request(app)
        .post('/admin/commerce/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Diwali Mega Sale',
          imageUrl: 'https://cdn.example.com/banners/diwali.png',
          actionUrl: '/shops?category=sweets',
          priority: 1,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.title).toBe('Diwali Mega Sale');

      const listRes = await request(app)
        .get('/admin/commerce/banners')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      const found = listRes.body.data.find((b) => b.title === 'Diwali Mega Sale');
      expect(found).toBeDefined();
    });
  });

  describe('A8: Immutable Audit Logging', () => {
    it('[A8.3] should retrieve immutable administrative audit log records', async () => {
      const res = await request(app)
        .get('/admin/commerce/audit-logs?limit=20')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      // Verify that audit logs contain administrative actions executed above
      const actions = res.body.data.map((l) => l.action);
      expect(actions.some((a) => a.includes('order') || a.includes('shop') || a.includes('category'))).toBe(true);
    });
  });

  describe('A9: Serviceability Zones', () => {
    it('[A9.1] should list delivery serviceability zones and toggle active status', async () => {
      const listRes = await request(app)
        .get('/admin/commerce/zones')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.data)).toBe(true);

      if (listRes.body.data.length > 0) {
        const zoneId = listRes.body.data[0].id;
        const toggleRes = await request(app)
          .put(`/admin/commerce/zones/${zoneId}/toggle`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ isActive: true });

        expect(toggleRes.status).toBe(200);
        expect(toggleRes.body.isActive).toBe(true);
      }
    });

    it('[A9.2] should retrieve unserviceable waitlist inquiries', async () => {
      const res = await request(app)
        .get('/admin/commerce/zones/waitlist')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('A10: Delivery Fleet & Cash Reconciliation', () => {
    it('[A10.1] should return live fleet monitor status and locations', async () => {
      const res = await request(app)
        .get('/admin/commerce/fleet/live')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const rider = res.body.data.find((r) => r.user_id === TEST_RIDER_ID);
      expect(rider).toBeDefined();
      expect(rider.full_name).toBe('Fleet Rider');
    });

    it('[A10.2] should report fleet cash-in-hand summary and threshold adherence', async () => {
      const res = await request(app)
        .get('/admin/commerce/fleet/cash-summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalCashHeld).toBeGreaterThanOrEqual(1200);
      expect(res.body.data.floatingLimitThreshold).toBe(3000);
    });
  });

  describe('A11: Grievance & Support Management (Hybrid)', () => {
    it('[A11.1] should list statutory grievances with 48h acknowledgement SLA status', async () => {
      const res = await request(app)
        .get('/admin/commerce/grievances?type=statutory_grievance')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const ticket = res.body.data.find((t) => t.id === TEST_TICKET_ID);
      expect(ticket).toBeDefined();
      expect(ticket.subject).toBe('Incorrect pricing on receipt');
      expect(ticket).toHaveProperty('isAcknowledged');
      expect(ticket).toHaveProperty('isBreached48h');
    });

    it('[A11.2] should record statutory acknowledgement and update status', async () => {
      const res = await request(app)
        .put(`/admin/commerce/grievances/${TEST_TICKET_ID}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'in_progress', acknowledge: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.acknowledgedAt).toBeDefined();
    });
  });

  describe('A12: Feature Flags & Vertical Kill Switches', () => {
    it('[A12.1] should retrieve feature flags and support atomic administrative updates', async () => {
      const getRes = await request(app)
        .get('/admin/commerce/feature-flags')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.COMMERCE_ENABLED).toBe(true);

      const updateRes = await request(app)
        .put('/admin/commerce/feature-flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ KRISHI_ENABLED: false, SOS_ENABLED: false });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
    });
  });

  describe('A13: Financial & Tax Report Exports (Dual Format)', () => {
    it('[A13.1] should export standard orders CSV report', async () => {
      const res = await request(app)
        .get('/admin/commerce/reports/export?format=standard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.text).toContain('Order ID');
      expect(res.text).toContain('Subtotal (INR)');
      expect(res.text).toContain('Total Amount (INR)');
    });

    it('[A13.2] should export statutory GST Section 52 TCS 1% CA audit report', async () => {
      const res = await request(app)
        .get('/admin/commerce/reports/export?format=tcs_statutory')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.text).toContain('Seller GSTIN');
      expect(res.text).toContain('Gross Taxable Supplies (INR)');
      expect(res.text).toContain('Net Taxable Supplies (INR)');
      expect(res.text).toContain('TCS Rate (%)');
      expect(res.text).toContain('1.00%');
      expect(res.text).toContain('Total TCS Collected (INR)');
    });
  });

  describe('A14: Broadcast Notifications', () => {
    it('[A14.1] should reject broadcast without mandatory title and body', async () => {
      const res = await request(app)
        .post('/admin/commerce/broadcasts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title and body are required/i);
    });

    it('[A14.2] should queue geo-targeted broadcast announcement and record audit log', async () => {
      const res = await request(app)
        .post('/admin/commerce/broadcasts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Special Flash Delivery Window',
          body: 'Free delivery on all bakery orders for the next 2 hours in Dhanori!',
          targetZoneId: 'pune_dhanori',
          targetRole: 'customer',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.broadcast.title).toBe('Special Flash Delivery Window');
    });
  });
});
