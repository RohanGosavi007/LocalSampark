const request = require('supertest');
const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const ordersRouter = require('../../modules/ecommerce/routes/order.routes');
const returnsRouter = require('../../modules/ecommerce/routes/return.routes');
const trustReviewsRouter = require('../../modules/ecommerce/routes/trust-reviews.routes');
const trackingRouter = require('../../modules/services/routes/tracking.routes');
const supportRouter = require('../../modules/core/routes/support.routes');

const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';

// Feature ids follow docs/launch/features.json. This file was written to an
// older numbering and credited tracking to C10, returns to C11, reviews to C12
// and invoices to C13, so each feature was counted with another's tests (F-153).
describe('Milestone M5: After-Order Experience (C9–C11, C14, S5–S7)', () => {
  let app;
  const TEST_CUSTOMER_ID = crypto.randomUUID();
  const TEST_SHOP_OWNER_ID = crypto.randomUUID();
  const TEST_ADMIN_ID = crypto.randomUUID();
  const TEST_TERRITORY_ADMIN_ID = crypto.randomUUID();
  const TEST_OTHER_USER_ID = crypto.randomUUID();
  const TEST_RIDER_USER_ID = crypto.randomUUID();

  const TEST_SHOP_ID = crypto.randomUUID();
  const TEST_DELIVERED_COD_ORDER_ID = crypto.randomUUID();
  const TEST_DELIVERED_ONLINE_ORDER_ID = crypto.randomUUID();
  const TEST_ACTIVE_ORDER_ID = crypto.randomUUID();
  const TEST_EXPIRED_ORDER_ID = crypto.randomUUID();
  const TEST_AGENT_ID = crypto.randomUUID();
  const TEST_REVIEW_ID = crypto.randomUUID();

  let customerToken;
  let shopOwnerToken;
  let adminToken;
  let territoryAdminToken;
  let otherUserToken;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/orders/returns', returnsRouter);
    app.use('/orders', ordersRouter);
    app.use('/trust-reviews', trustReviewsRouter);
    app.use('/tracking', trackingRouter);
    app.use('/support', supportRouter);

    customerToken = jwt.sign(
      { userId: TEST_CUSTOMER_ID, id: TEST_CUSTOMER_ID, role: 'user', email: 'customer@example.com', tokenVersion: 0 },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    shopOwnerToken = jwt.sign(
      { userId: TEST_SHOP_OWNER_ID, id: TEST_SHOP_OWNER_ID, role: 'shop_owner', email: 'owner@example.com', tokenVersion: 0 },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { userId: TEST_ADMIN_ID, id: TEST_ADMIN_ID, role: 'super_admin', isSuperAdmin: true, email: 'superadmin@example.com', tokenVersion: 0 },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    territoryAdminToken = jwt.sign(
      { userId: TEST_TERRITORY_ADMIN_ID, id: TEST_TERRITORY_ADMIN_ID, role: 'territory_admin', email: 'territory@example.com', tokenVersion: 0 },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    otherUserToken = jwt.sign(
      { userId: TEST_OTHER_USER_ID, id: TEST_OTHER_USER_ID, role: 'user', email: 'other@example.com', tokenVersion: 0 },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    // Clean up test data
    await query("DELETE FROM order_returns WHERE order_id IN ($1, $2, $3, $4)", [
      TEST_DELIVERED_COD_ORDER_ID, TEST_DELIVERED_ONLINE_ORDER_ID, TEST_ACTIVE_ORDER_ID, TEST_EXPIRED_ORDER_ID
    ]);
    await query("DELETE FROM trust_reviews WHERE shop_id = $1", [TEST_SHOP_ID]);
    await query("DELETE FROM support_tickets WHERE user_id IN ($1, $2)", [TEST_CUSTOMER_ID, TEST_OTHER_USER_ID]);
    await query("DELETE FROM shop_invoices WHERE order_id IN ($1, $2)", [TEST_DELIVERED_COD_ORDER_ID, TEST_DELIVERED_ONLINE_ORDER_ID]);
    await query("DELETE FROM order_items WHERE order_id IN ($1, $2, $3, $4)", [
      TEST_DELIVERED_COD_ORDER_ID, TEST_DELIVERED_ONLINE_ORDER_ID, TEST_ACTIVE_ORDER_ID, TEST_EXPIRED_ORDER_ID
    ]);
    await query("DELETE FROM orders WHERE id IN ($1, $2, $3, $4)", [
      TEST_DELIVERED_COD_ORDER_ID, TEST_DELIVERED_ONLINE_ORDER_ID, TEST_ACTIVE_ORDER_ID, TEST_EXPIRED_ORDER_ID
    ]);
    await query("DELETE FROM delivery_agents WHERE id = $1", [TEST_AGENT_ID]);
    await query("DELETE FROM local_shops WHERE id = $1", [TEST_SHOP_ID]);
    await query("DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = $1)", [TEST_CUSTOMER_ID]);
    await query("DELETE FROM wallets WHERE user_id = $1", [TEST_CUSTOMER_ID]);
    await query("DELETE FROM users WHERE id IN ($1, $2, $3, $4, $5, $6)", [
      TEST_CUSTOMER_ID, TEST_SHOP_OWNER_ID, TEST_ADMIN_ID, TEST_TERRITORY_ADMIN_ID, TEST_OTHER_USER_ID, TEST_RIDER_USER_ID
    ]);

    // Seed test users
    const users = [
      [TEST_CUSTOMER_ID, 'Verified Customer', '+919999111101', 'customer@example.com', 'user'],
      [TEST_SHOP_OWNER_ID, 'Merchant Owner', '+919999111102', 'owner@example.com', 'shop_owner'],
      [TEST_ADMIN_ID, 'Super Administrator', '+919999111103', 'superadmin@example.com', 'super_admin'],
      [TEST_TERRITORY_ADMIN_ID, 'Territory Lead', '+919999111104', 'territory@example.com', 'territory_admin'],
      [TEST_OTHER_USER_ID, 'Unrelated Shopper', '+919999111105', 'other@example.com', 'user'],
      [TEST_RIDER_USER_ID, 'Express Fleet Partner', '+919999111106', 'rider@example.com', 'delivery_agent']
    ];

    for (const u of users) {
      await query(
        `INSERT INTO users (id, full_name, phone_number, email, role, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        u
      );
    }

    // Seed test shop
    await query(
      `INSERT INTO local_shops (
         id, name, owner_id, phone, category, address, latitude, longitude,
         coordinate, pincode, is_active, is_verified, approval_status, gstin, fssai_license_number, rating
       ) VALUES (
         $1, 'Dhanori Fresh Bakers', $2, '+919999111120', 'bakery', 'Shop 4, Dhanori Main Road, Pune', 18.5833, 73.8833,
         'POINT(73.8833 18.5833)', '411015', true, true, 'approved', '27ABCDE1234F1Z5', '11521034000123', 4.5
       )`,
      [TEST_SHOP_ID, TEST_SHOP_OWNER_ID]
    );

    // Seed test delivery agent
    await query(
      `INSERT INTO delivery_agents (id, user_id, vehicle_type, vehicle_number, kyc_status, status, is_online, current_lat, current_lng)
       VALUES ($1, $2, 'motorcycle', 'MH-12-AB-1234', 'approved', 'available', true, 18.5840, 73.8840)`,
      [TEST_AGENT_ID, TEST_RIDER_USER_ID]
    );

    // Seed Delivered COD Order
    await query(
      `INSERT INTO orders (
         id, user_id, shop_id, subtotal, total_amount, delivery_fee,
         delivery_address, delivery_coordinate, delivery_lat, delivery_lng,
         payment_method, payment_status, order_status, status,
         assigned_agent_id, delivered_at, created_at, updated_at
       ) VALUES (
         $1, $2, $3, 300, 340, 40,
         'Apartment 202, Dhanori, Pune', 'POINT(73.8850 18.5850)', 18.5850, 73.8850,
         'cod', 'paid', 'delivered', 'delivered',
         $4, ${NOW}, ${NOW}, ${NOW}
       )`,
      [TEST_DELIVERED_COD_ORDER_ID, TEST_CUSTOMER_ID, TEST_SHOP_ID, TEST_RIDER_USER_ID]
    );

    await query(
      `INSERT INTO order_items (id, order_id, name, price, quantity)
       VALUES ($1, $2, 'Artisan Sourdough Loaf', 150, 2)`,
      [crypto.randomUUID(), TEST_DELIVERED_COD_ORDER_ID]
    );

    // Seed Delivered Online Order
    await query(
      `INSERT INTO orders (
         id, user_id, shop_id, subtotal, total_amount, delivery_fee,
         delivery_address, delivery_coordinate, delivery_lat, delivery_lng,
         payment_method, payment_status, order_status, status,
         assigned_agent_id, delivered_at, created_at, updated_at
       ) VALUES (
         $1, $2, $3, 500, 540, 40,
         'Apartment 202, Dhanori, Pune', 'POINT(73.8850 18.5850)', 18.5850, 73.8850,
         'razorpay', 'paid', 'delivered', 'delivered',
         $4, ${NOW}, ${NOW}, ${NOW}
       )`,
      [TEST_DELIVERED_ONLINE_ORDER_ID, TEST_CUSTOMER_ID, TEST_SHOP_ID, TEST_RIDER_USER_ID]
    );

    // Seed Active / Out-for-Delivery Order
    await query(
      `INSERT INTO orders (
         id, user_id, shop_id, subtotal, total_amount, delivery_fee,
         delivery_address, delivery_coordinate, delivery_lat, delivery_lng,
         payment_method, payment_status, order_status, status,
         assigned_agent_id, created_at, updated_at
       ) VALUES (
         $1, $2, $3, 200, 240, 40,
         'Apartment 202, Dhanori, Pune', 'POINT(73.8850 18.5850)', 18.5850, 73.8850,
         'razorpay', 'paid', 'out_for_delivery', 'out_for_delivery',
         $4, ${NOW}, ${NOW}
       )`,
      [TEST_ACTIVE_ORDER_ID, TEST_CUSTOMER_ID, TEST_SHOP_ID, TEST_RIDER_USER_ID]
    );

    // Seed Expired Delivered Order (> 72 hours ago)
    const pastTimestamp = process.env.USE_SQLITE === 'true'
      ? "datetime('now', '-4 days')"
      : "NOW() - INTERVAL '4 days'";

    await query(
      `INSERT INTO orders (
         id, user_id, shop_id, subtotal, total_amount, delivery_fee,
         delivery_address, delivery_coordinate, delivery_lat, delivery_lng,
         payment_method, payment_status, order_status, status,
         delivered_at, created_at, updated_at
       ) VALUES (
         $1, $2, $3, 100, 140, 40,
         'Apartment 202, Dhanori, Pune', 'POINT(73.8850 18.5850)', 18.5850, 73.8850,
         'cod', 'paid', 'delivered', 'delivered',
         ${pastTimestamp}, ${pastTimestamp}, ${pastTimestamp}
       )`,
      [TEST_EXPIRED_ORDER_ID, TEST_CUSTOMER_ID, TEST_SHOP_ID]
    );
  });

  afterAll(async () => {
    await query("DELETE FROM order_returns WHERE order_id IN ($1, $2, $3, $4)", [
      TEST_DELIVERED_COD_ORDER_ID, TEST_DELIVERED_ONLINE_ORDER_ID, TEST_ACTIVE_ORDER_ID, TEST_EXPIRED_ORDER_ID
    ]);
    await query("DELETE FROM trust_reviews WHERE shop_id = $1", [TEST_SHOP_ID]);
    await query("DELETE FROM support_tickets WHERE user_id IN ($1, $2)", [TEST_CUSTOMER_ID, TEST_OTHER_USER_ID]);
    await query("DELETE FROM shop_invoices WHERE order_id IN ($1, $2)", [TEST_DELIVERED_COD_ORDER_ID, TEST_DELIVERED_ONLINE_ORDER_ID]);
    await query("DELETE FROM order_items WHERE order_id IN ($1, $2, $3, $4)", [
      TEST_DELIVERED_COD_ORDER_ID, TEST_DELIVERED_ONLINE_ORDER_ID, TEST_ACTIVE_ORDER_ID, TEST_EXPIRED_ORDER_ID
    ]);
    await query("DELETE FROM orders WHERE id IN ($1, $2, $3, $4)", [
      TEST_DELIVERED_COD_ORDER_ID, TEST_DELIVERED_ONLINE_ORDER_ID, TEST_ACTIVE_ORDER_ID, TEST_EXPIRED_ORDER_ID
    ]);
    await query("DELETE FROM delivery_agents WHERE id = $1", [TEST_AGENT_ID]);
    await query("DELETE FROM local_shops WHERE id = $1", [TEST_SHOP_ID]);
    await query("DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = $1)", [TEST_CUSTOMER_ID]);
    await query("DELETE FROM wallets WHERE user_id = $1", [TEST_CUSTOMER_ID]);
    await query("DELETE FROM users WHERE id IN ($1, $2, $3, $4, $5, $6)", [
      TEST_CUSTOMER_ID, TEST_SHOP_OWNER_ID, TEST_ADMIN_ID, TEST_TERRITORY_ADMIN_ID, TEST_OTHER_USER_ID, TEST_RIDER_USER_ID
    ]);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // C10 / S5: Real-Time Delivery Tracking & Live Milestones
  // ───────────────────────────────────────────────────────────────────────────
  describe('C9 / S5: Real-Time Delivery Tracking & Milestones', () => {
    it('[C9.41] should reject unauthenticated tracking requests with 401', async () => {
      const res = await request(app).get(`/orders/${TEST_ACTIVE_ORDER_ID}/tracking`);
      expect(res.status).toBe(401);
    });

    it('[C9.42] should reject unauthorized user attempting to track another user order with 403', async () => {
      const res = await request(app)
        .get(`/orders/${TEST_ACTIVE_ORDER_ID}/tracking`)
        .set('Authorization', `Bearer ${otherUserToken}`);
      expect(res.status).toBe(403);
    });

    it('[C9.43] should return live tracking with milestones, rider GPS fix, and ETA for customer', async () => {
      const res = await request(app)
        .get(`/orders/${TEST_ACTIVE_ORDER_ID}/tracking`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.tracking.orderId).toBe(TEST_ACTIVE_ORDER_ID);
      expect(res.body.tracking.status).toBe('out_for_delivery');
      expect(Array.isArray(res.body.tracking.milestones)).toBe(true);

      // Verify milestones progression
      const placed = res.body.tracking.milestones.find((m) => m.key === 'placed');
      expect(placed.completed).toBe(true);
      const outForDelivery = res.body.tracking.milestones.find((m) => m.key === 'out_for_delivery');
      expect(outForDelivery.completed).toBe(true);

      // Verify rider details and ETA
      expect(res.body.tracking.rider).toBeTruthy();
      expect(res.body.tracking.rider.vehicleType).toBe('motorcycle');
      expect(res.body.tracking.rider.currentLat).toBe(18.5840);
      expect(res.body.tracking.etaMinutes).toBeGreaterThan(0);
    });

    it('[C9.44] should support legacy /tracking/:orderId endpoint with identical payload', async () => {
      const res = await request(app)
        .get(`/tracking/${TEST_ACTIVE_ORDER_ID}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tracking.orderId).toBe(TEST_ACTIVE_ORDER_ID);
      expect(res.body.tracking.destination.address).toContain('Dhanori');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // C11 / S6: Post-Delivery Returns, Replacements & Multi-Tier Refund Approval
  // ───────────────────────────────────────────────────────────────────────────
  describe('C10 / S6: Returns & Multi-Tier Refund Approval', () => {
    let returnCodId;
    let returnOnlineId;

    it('[C10.21] should reject return request on an active non-delivered order with 400', async () => {
      const res = await request(app)
        .post(`/orders/${TEST_ACTIVE_ORDER_ID}/returns`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Changed my mind', returnType: 'return' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/must be delivered/i);
    });

    it('[C10.22] should reject return request when window has expired (>48h for bakery) with 400', async () => {
      const res = await request(app)
        .post(`/orders/${TEST_EXPIRED_ORDER_ID}/returns`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Item was stale', returnType: 'return' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/window of 48 hours has expired/i);
    });

    it('[C10.23] should successfully submit return request for delivered COD order within 48h', async () => {
      const res = await request(app)
        .post(`/orders/${TEST_DELIVERED_COD_ORDER_ID}/returns`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reason: 'Quality issue: Bread was burnt on the edges',
          returnType: 'return',
          evidenceUrls: ['https://storage.localsampark.com/returns/burnt_bread.jpg']
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('pending_review');
      expect(res.body.data.refundAmount).toBe(340);
      returnCodId = res.body.data.id;
    });

    it('[C10.24] should submit return request for delivered Online order', async () => {
      const res = await request(app)
        .post(`/orders/${TEST_DELIVERED_ONLINE_ORDER_ID}/returns`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reason: 'Missing item from bundle package',
          returnType: 'cancellation_refund'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      returnOnlineId = res.body.data.id;
    });

    it('[C10.25] should prevent duplicate return submission on the same order', async () => {
      const res = await request(app)
        .post(`/orders/${TEST_DELIVERED_COD_ORDER_ID}/returns`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Duplicate attempt' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already on file/i);
    });

    it('[C10.26] should restrict pending-review queue from regular shoppers with 403', async () => {
      const res = await request(app)
        .get('/orders/returns/pending-review')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it('[C10.27] should allow Territory Admin to inspect pending returns review queue', async () => {
      const res = await request(app)
        .get('/orders/returns/pending-review')
        .set('Authorization', `Bearer ${territoryAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((r) => r.id === returnCodId);
      expect(found).toBeTruthy();
      expect(found.shop_name).toBe('Dhanori Fresh Bakers');
      expect(found.evidence_urls).toContain('https://storage.localsampark.com/returns/burnt_bread.jpg');
    });

    it('[C10.28] should execute hybrid refund: COD order approved by Territory Admin credits wallet balance', async () => {
      const res = await request(app)
        .put(`/orders/returns/${returnCodId}/verify`)
        .set('Authorization', `Bearer ${territoryAdminToken}`)
        .send({ action: 'approve', notes: 'Customer photos verified by Territory Lead' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('refund_completed');
      expect(res.body.refundChannel).toBe('wallet');
      expect(res.body.refundAmount).toBe(340);

      // Verify wallet balance was credited
      const wallet = await queryOne('SELECT balance FROM wallets WHERE user_id = $1', [TEST_CUSTOMER_ID]);
      expect(Number(wallet.balance)).toBe(340);

      // Verify order status updated to refunded
      const order = await queryOne('SELECT return_status, payment_status FROM orders WHERE id = $1', [TEST_DELIVERED_COD_ORDER_ID]);
      expect(order.return_status).toBe('refunded');
      expect(order.payment_status).toBe('refunded');
    });

    it('[C10.29] should execute hybrid refund: Online order approved by Super Admin triggers gateway refund', async () => {
      const res = await request(app)
        .put(`/orders/returns/${returnOnlineId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'approve', notes: 'Approved for source payment refund' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.refundChannel).toBe('source_gateway');
      expect(res.body.refundReferenceId).toMatch(/^GW-RFND-/);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // C12 / S7: Verified Buyer Review Engine & Seller Replies
  // ───────────────────────────────────────────────────────────────────────────
  describe('C11 / S7: Verified Buyer Reviews & Seller Replies', () => {
    let createdReviewId;

    it('[C11.21] should reject review from non-purchaser user with 403', async () => {
      const res = await request(app)
        .post(`/trust-reviews/${TEST_SHOP_ID}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ rating: 5, review_text: 'I have never bought anything here but looks good' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/only verified buyers/i);
    });

    it('[C11.22] should accept review from verified buyer and recalculate shop rating', async () => {
      const res = await request(app)
        .post(`/trust-reviews/${TEST_SHOP_ID}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rating: 5,
          review_text: 'Fresh bread delivered hot and crisp, loved the sourdough!',
          orderId: TEST_DELIVERED_COD_ORDER_ID
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.review.rating).toBe(5);
      expect(res.body.review.is_verified_buyer).toBeTruthy();
      createdReviewId = res.body.review.id;

      // Verify shop rating updated
      const shop = await queryOne('SELECT rating FROM local_shops WHERE id = $1', [TEST_SHOP_ID]);
      expect(Number(shop.rating)).toBe(5);
    });

    it('[C11.23] should prevent duplicate review for the same delivered order', async () => {
      const res = await request(app)
        .post(`/trust-reviews/${TEST_SHOP_ID}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rating: 4,
          review_text: 'Trying to post second review',
          orderId: TEST_DELIVERED_COD_ORDER_ID
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already reviewed/i);
    });

    it('[C11.24] should reject seller reply from unrelated user with 403', async () => {
      const res = await request(app)
        .post(`/trust-reviews/${createdReviewId}/reply`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ replyText: 'Random user trying to reply' });

      expect(res.status).toBe(403);
    });

    it('[C11.25] should allow verified shop owner to post official response', async () => {
      const res = await request(app)
        .post(`/trust-reviews/${createdReviewId}/reply`)
        .set('Authorization', `Bearer ${shopOwnerToken}`)
        .send({ replyText: 'Thank you for your kind words! We bake fresh every morning at 6 AM.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sellerReplyText).toContain('We bake fresh');

      // Verify persisted in DB
      const updated = await queryOne('SELECT seller_reply_text, seller_replied_at FROM trust_reviews WHERE id = $1', [createdReviewId]);
      expect(updated.seller_reply_text).toContain('We bake fresh');
      expect(updated.seller_replied_at).toBeTruthy();
    });

    it('[C11.26] should list shop reviews including seller replies and buyer names', async () => {
      const res = await request(app).get(`/trust-reviews/shop/${TEST_SHOP_ID}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.reviews)).toBe(true);
      const found = res.body.reviews.find((r) => r.id === createdReviewId);
      expect(found).toBeTruthy();
      expect(found.customer_name).toBe('Verified Customer');
      expect(found.seller_reply_text).toContain('We bake fresh');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // C13 / N7: GST Section 31 Tax Invoice Download
  // ───────────────────────────────────────────────────────────────────────────
  describe('C9 / N7: GST Section 31 Tax Invoice Download', () => {
    it('[C9.45] should reject invoice download from unauthorized caller with 403', async () => {
      const res = await request(app)
        .get(`/orders/${TEST_DELIVERED_COD_ORDER_ID}/invoice`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.status).toBe(403);
    });

    it('[C9.46] should return structured JSON invoice with GSTIN & FSSAI details for customer', async () => {
      const res = await request(app)
        .get(`/orders/${TEST_DELIVERED_COD_ORDER_ID}/invoice`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.invoice.shop_name).toBe('Dhanori Fresh Bakers');
      expect(res.body.invoice.gstin).toBe('27ABCDE1234F1Z5');
      expect(res.body.invoice.fssai_license_number).toBe('11521034000123');
      expect(res.body.invoice.total_amount).toBe(340);
    });

    it('[C9.47] should stream valid A4 PDF tax invoice with correct Content-Type', async () => {
      const res = await request(app)
        .get(`/orders/${TEST_DELIVERED_COD_ORDER_ID}/invoice/pdf`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('Invoice-');
      expect(res.body.length).toBeGreaterThan(100);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // C14: In-App Support & Statutory Grievance Redressal
  // ───────────────────────────────────────────────────────────────────────────
  describe('C14: In-App Support & Statutory Grievance Redressal', () => {
    let statutoryTicketId;

    it('[C14.1] should expose public statutory Grievance Officer details under 2020 Rules', async () => {
      const res = await request(app).get('/support/grievance-officer');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.grievanceOfficer.name).toBe('Rohan Gosavi');
      expect(res.body.grievanceOfficer.slaHoursAcknowledgement).toBe(48);
      expect(res.body.grievanceOfficer.slaDaysResolution).toBe(30);
    });

    it('[C14.2] should register statutory grievance linked to order with 48h acknowledgement SLA', async () => {
      const res = await request(app)
        .post('/support/tickets')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: TEST_DELIVERED_COD_ORDER_ID,
          subject: 'Statutory Grievance: Damaged food packaging hygiene issue',
          description: 'Food seal was broken upon receipt, violating food safety standards',
          category: 'safety_statutory',
          isStatutory: true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.ticket.isStatutory).toBe(true);
      expect(res.body.ticket.priority).toBe('high');
      expect(res.body.ticket.acknowledgedAt).toBeTruthy();
      expect(res.body.ticket.grievanceOfficer).toContain('Grievance Officer');
      expect(res.body.ticket.slaDueAt).toBeTruthy();
      statutoryTicketId = res.body.ticket.id;
    });

    it('[C14.3] should inspect ticket details and verify 30-day statutory resolution countdown', async () => {
      const res = await request(app)
        .get(`/support/tickets/${statutoryTicketId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.ticket.id).toBe(statutoryTicketId);
      expect(res.body.ticket.isStatutory).toBe(true);
      expect(res.body.ticket.isAcknowledged).toBe(true);

      const due = new Date(res.body.ticket.slaDueAt).getTime();
      const created = new Date(res.body.ticket.created_at).getTime();
      const diffDays = Math.round((due - created) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(30);
    });

    it('[C14.4] should submit support ticket directly through order endpoint /orders/:id/support', async () => {
      const res = await request(app)
        .post(`/orders/${TEST_DELIVERED_COD_ORDER_ID}/support`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          subject: 'Delivery inquiry',
          description: 'Rider was polite and handled delivery properly',
          category: 'feedback'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.ticket.orderId).toBe(TEST_DELIVERED_COD_ORDER_ID);
    });
  });
});
