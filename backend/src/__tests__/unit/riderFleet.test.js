const request = require('supertest');
const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../../config/database');
const { pointSql } = require('../../utils/sqlPoint');
const { getJwtSecret } = require('../../config/secrets');
const deliveryRouter = require('../../modules/services/routes/delivery.routes');
const adminRouter = require('../../modules/crm/routes/admin.routes');
const adminPricingRouter = require('../../modules/crm/routes/admin-pricing.routes');
const platformConfig = require('../../services/platformConfig.service');

const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';

describe('Milestone M4.2: Rider Fleet Operations Hub (R1, R2, R3, R4, R5)', () => {
  let app;
  const TEST_RIDER_ID = crypto.randomUUID();
  const TEST_RIDER2_ID = crypto.randomUUID();
  const TEST_ADMIN_ID = crypto.randomUUID();
  const TEST_CUSTOMER_ID = crypto.randomUUID();
  const TEST_SHOP_NEAR_ID = crypto.randomUUID();
  const TEST_SHOP_FAR_ID = crypto.randomUUID();
  const TEST_ORDER_PREPAID_ID = crypto.randomUUID();
  const TEST_ORDER_COD_ID = crypto.randomUUID();

  let riderToken;
  let rider2Token;
  let adminToken;
  let customerToken;
  let agentRecordId;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/delivery', deliveryRouter);
    app.use('/admin', adminRouter);
    app.use('/admin', adminPricingRouter);

    riderToken = jwt.sign(
      { userId: TEST_RIDER_ID, id: TEST_RIDER_ID, role: 'delivery_agent', email: 'rider1@example.com', tokenVersion: 0 },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    rider2Token = jwt.sign(
      { userId: TEST_RIDER2_ID, id: TEST_RIDER2_ID, role: 'delivery_agent', email: 'rider2@example.com', tokenVersion: 0 },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { userId: TEST_ADMIN_ID, id: TEST_ADMIN_ID, role: 'super_admin', isSuperAdmin: true, email: 'admin@example.com', tokenVersion: 0 },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    customerToken = jwt.sign(
      { userId: TEST_CUSTOMER_ID, id: TEST_CUSTOMER_ID, role: 'user', email: 'customer@example.com', tokenVersion: 0 },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    // Clean up any stale data
    await query("DELETE FROM rider_cash_ledger WHERE rider_user_id IN ($1, $2)", [TEST_RIDER_ID, TEST_RIDER2_ID]);
    await query("DELETE FROM live_tracking WHERE rider_id IN (SELECT CAST(id AS TEXT) FROM delivery_agents WHERE user_id IN ($1, $2))", [TEST_RIDER_ID, TEST_RIDER2_ID]);
    await query("DELETE FROM delivery_riders WHERE user_id IN ($1, $2)", [TEST_RIDER_ID, TEST_RIDER2_ID]);
    await query("DELETE FROM delivery_agents WHERE user_id IN ($1, $2)", [TEST_RIDER_ID, TEST_RIDER2_ID]);
    await query("DELETE FROM orders WHERE id IN ($1, $2)", [TEST_ORDER_PREPAID_ID, TEST_ORDER_COD_ID]);
    await query("DELETE FROM local_shops WHERE id IN ($1, $2)", [TEST_SHOP_NEAR_ID, TEST_SHOP_FAR_ID]);
    await query("DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id IN ($1, $2, $3, $4))", [TEST_RIDER_ID, TEST_RIDER2_ID, TEST_ADMIN_ID, TEST_CUSTOMER_ID]);
    await query("DELETE FROM wallets WHERE user_id IN ($1, $2, $3, $4)", [TEST_RIDER_ID, TEST_RIDER2_ID, TEST_ADMIN_ID, TEST_CUSTOMER_ID]);
    await query("DELETE FROM users WHERE id IN ($1, $2, $3, $4) OR phone_number IN ('+918888888801', '+918888888802', '+918888888803', '+918888888804')", [TEST_RIDER_ID, TEST_RIDER2_ID, TEST_ADMIN_ID, TEST_CUSTOMER_ID]);

    // Seed users
    await query(
      `INSERT INTO users (id, full_name, phone_number, email, role, is_active)
       VALUES ($1, 'Rider One', '+918888888801', 'rider1@example.com', 'user', true)`,
      [TEST_RIDER_ID]
    );

    await query(
      `INSERT INTO users (id, full_name, phone_number, email, role, is_active)
       VALUES ($1, 'Rider Two', '+918888888802', 'rider2@example.com', 'delivery_agent', true)`,
      [TEST_RIDER2_ID]
    );

    await query(
      `INSERT INTO users (id, full_name, phone_number, email, role, is_active)
       VALUES ($1, 'Admin User', '+918888888803', 'admin@example.com', 'super_admin', true)`,
      [TEST_ADMIN_ID]
    );

    await query(
      `INSERT INTO users (id, full_name, phone_number, email, role, is_active)
       VALUES ($1, 'Test Customer', '+918888888804', 'customer@example.com', 'user', true)`,
      [TEST_CUSTOMER_ID]
    );

    // Seed shops in Dhanori area
    // Near shop: Dhanori center (18.5833, 73.8833)
    await query(
      `INSERT INTO local_shops (id, name, owner_id, phone, category, address, latitude, longitude, coordinate, pincode, is_active, is_verified)
       VALUES ($1, 'Dhanori Fresh Bakers', $2, '+919876543210', 'bakery', 'Dhanori Road, Pune', 18.5833, 73.8833, 'POINT(73.8833 18.5833)', '411015', true, true)`,
      [TEST_SHOP_NEAR_ID, TEST_ADMIN_ID]
    );

    // Far shop: Viman Nagar / outskirts (18.5679, 73.9143) ~4.5 km away
    await query(
      `INSERT INTO local_shops (id, name, owner_id, phone, category, address, latitude, longitude, coordinate, pincode, is_active, is_verified)
       VALUES ($1, 'Viman Nagar Gourmet', $2, '+919876543211', 'restaurant', 'Viman Nagar, Pune', 18.5679, 73.9143, 'POINT(73.9143 18.5679)', '411014', true, true)`,
      [TEST_SHOP_FAR_ID, TEST_ADMIN_ID]
    );

    // Seed approved agent for Rider Two
    await query(
      `INSERT INTO delivery_agents (id, user_id, vehicle_type, vehicle_number, kyc_status, status, is_online, cash_in_hand, current_lat, current_lng)
       VALUES ($1, $2, 'motorcycle', 'MH-12-AB-9999', 'approved', 'available', true, 0, 18.5830, 73.8830)`,
      [crypto.randomUUID(), TEST_RIDER2_ID]
    );

    // Set floating cash limit to ₹3,000
    await platformConfig.update({ rider_cash_limit: 3000 });
  });

  afterAll(async () => {
    await query("DELETE FROM rider_cash_ledger WHERE rider_user_id IN ($1, $2)", [TEST_RIDER_ID, TEST_RIDER2_ID]);
    await query("DELETE FROM live_tracking WHERE rider_id IN (SELECT CAST(id AS TEXT) FROM delivery_agents WHERE user_id IN ($1, $2))", [TEST_RIDER_ID, TEST_RIDER2_ID]);
    await query("DELETE FROM delivery_riders WHERE user_id IN ($1, $2)", [TEST_RIDER_ID, TEST_RIDER2_ID]);
    await query("DELETE FROM delivery_agents WHERE user_id IN ($1, $2)", [TEST_RIDER_ID, TEST_RIDER2_ID]);
    await query("DELETE FROM orders WHERE id IN ($1, $2)", [TEST_ORDER_PREPAID_ID, TEST_ORDER_COD_ID]);
    await query("DELETE FROM local_shops WHERE id IN ($1, $2)", [TEST_SHOP_NEAR_ID, TEST_SHOP_FAR_ID]);
    await query("DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id IN ($1, $2, $3, $4))", [TEST_RIDER_ID, TEST_RIDER2_ID, TEST_ADMIN_ID, TEST_CUSTOMER_ID]);
    await query("DELETE FROM wallets WHERE user_id IN ($1, $2, $3, $4)", [TEST_RIDER_ID, TEST_RIDER2_ID, TEST_ADMIN_ID, TEST_CUSTOMER_ID]);
    await query("DELETE FROM users WHERE id IN ($1, $2, $3, $4)", [TEST_RIDER_ID, TEST_RIDER2_ID, TEST_ADMIN_ID, TEST_CUSTOMER_ID]);
  });

  describe('R1: Rider Onboarding & KYC Verification', () => {
    it('[R1.1] should reject invalid Aadhaar format during onboarding', async () => {
      const res = await request(app)
        .post('/delivery/onboarding')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          vehicleType: 'motorcycle',
          vehicleNumber: 'MH-12-CD-1234',
          aadharNumber: '12345', // invalid length
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Aadhaar number');
    });

    it('[R1.2] should submit valid rider onboarding application and set kyc_status to pending', async () => {
      const res = await request(app)
        .post('/delivery/onboarding')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          fullName: 'Rider One',
          vehicleType: 'motorcycle',
          vehicleNumber: 'MH-12-CD-1234',
          dlNumber: 'MH1220200012345',
          aadharNumber: '123456789012',
          rcNumber: 'RC-MH12-1234',
          bankAccountNumber: '987654321098',
          bankIfsc: 'HDFC0001234',
          bankAccountName: 'Rider One',
          dlImageUrl: 'kyc/riders/dl_test.jpg',
          rcImageUrl: 'kyc/riders/rc_test.jpg',
          aadhaarImageUrl: 'kyc/riders/aadhaar_test.jpg',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.kycStatus).toBe('pending');

      const agent = await queryOne('SELECT * FROM delivery_agents WHERE user_id = $1', [TEST_RIDER_ID]);
      expect(agent).toBeDefined();
      expect(agent.kyc_status).toBe('pending');
      expect(agent.vehicle_number).toBe('MH-12-CD-1234');
      agentRecordId = agent.id;
    });

    it('[R1.3] should return rider profile with masked bank account and pending status', async () => {
      const res = await request(app)
        .get('/delivery/profile')
        .set('Authorization', `Bearer ${riderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profile.kycStatus).toBe('pending');
      expect(res.body.profile.bankAccountNumber).toBe('XXXXXXXX1098');
      expect(res.body.profile.aadharNumber).toBe('XXXX-XXXX-9012');
    });

    it('[R1.4] should allow admin to view pending KYC queue and approve the rider', async () => {
      const listRes = await request(app)
        .get('/admin/delivery/pending-kyc')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      const pendingRider = listRes.body.agents.find((a) => String(a.user_id) === String(TEST_RIDER_ID));
      expect(pendingRider).toBeDefined();

      const approveRes = await request(app)
        .put(`/admin/delivery/agents/${agentRecordId}/kyc`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.success).toBe(true);
      expect(approveRes.body.kycStatus).toBe('approved');

      // Verify delivery_agents kyc_status and user role promotion
      const agent = await queryOne('SELECT kyc_status FROM delivery_agents WHERE id = $1', [agentRecordId]);
      expect(agent.kyc_status).toBe('approved');

      const user = await queryOne('SELECT role FROM users WHERE id = $1', [TEST_RIDER_ID]);
      expect(user.role).toBe('delivery_agent');
    });
  });

  describe('R2: Rider Duty Toggle & Live Geolocation', () => {
    it('[R2.1] should reject duty toggle if rider coordinates are outside Pune/Dhanori pilot zone', async () => {
      const res = await request(app)
        .put('/delivery/duty')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          isOnline: true,
          latitude: 28.6139, // New Delhi
          longitude: 77.2090,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('OUT_OF_SERVICE_AREA');
    });

    it('[R2.2] should allow duty toggle online when within Dhanori pilot zone', async () => {
      const res = await request(app)
        .put('/delivery/duty')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          isOnline: true,
          latitude: 18.5833, // Dhanori, Pune
          longitude: 73.8833,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isOnline).toBe(true);
      expect(res.body.status).toBe('available');

      const agent = await queryOne('SELECT is_online, status, current_lat, current_lng FROM delivery_agents WHERE user_id = $1', [TEST_RIDER_ID]);
      expect(Boolean(agent.is_online)).toBe(true);
      expect(agent.status).toBe('available');
    });

    it('[R2.3] should ingest GPS heartbeat update and record live tracking history', async () => {
      const res = await request(app)
        .post('/delivery/location')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          latitude: 18.5840,
          longitude: 73.8845,
          batteryLevel: 88,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.latitude).toBe(18.584);

      const tracking = await queryOne(
        'SELECT * FROM live_tracking WHERE rider_id IN (SELECT id FROM delivery_riders WHERE user_id = $1) ORDER BY timestamp DESC LIMIT 1',
        [TEST_RIDER_ID]
      );
      expect(tracking).toBeDefined();
      expect(Number(tracking.latitude)).toBeCloseTo(18.5840, 3);
    });
  });

  describe('R3: Dispatch Queue & Auto-Assignment', () => {
    beforeAll(async () => {
      // Seed a prepaid ready order at near shop (Dhanori)
      await query(
        `INSERT INTO orders (
           id, user_id, shop_id, subtotal, total_amount, delivery_fee, rider_payout,
           delivery_address, payment_method, payment_status, order_status, status,
           fulfillment_method, otp_code, created_at
         ) VALUES (
           $1, $2, $3, 300, 340, 40, 40,
           'Flat 402, Ganga Aria, Dhanori', 'razorpay', 'paid', 'ready', 'ready',
           'delivery', '445566', ${NOW}
         )`,
        [TEST_ORDER_PREPAID_ID, TEST_CUSTOMER_ID, TEST_SHOP_NEAR_ID]
      );

      // Seed a COD ready order at far shop (Viman Nagar)
      await query(
        `INSERT INTO orders (
           id, user_id, shop_id, subtotal, total_amount, delivery_fee, rider_payout,
           delivery_address, payment_method, payment_status, order_status, status,
           fulfillment_method, otp_code, created_at
         ) VALUES (
           $1, $2, $3, 500, 560, 60, 60,
           'Bungalow 12, Tingre Nagar, Pune', 'cod', 'pending', 'ready', 'ready',
           'delivery', '998877', ${NOW}
         )`,
        [TEST_ORDER_COD_ID, TEST_CUSTOMER_ID, TEST_SHOP_FAR_ID]
      );
    });

    it('[R3.1] should list available jobs sorted by proximity to the rider', async () => {
      const res = await request(app)
        .get('/delivery/jobs?lat=18.5833&lng=73.8833')
        .set('Authorization', `Bearer ${riderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const jobIds = res.body.data.map((j) => j.id);
      expect(jobIds).toContain(TEST_ORDER_PREPAID_ID);
      expect(jobIds).toContain(TEST_ORDER_COD_ID);

      // Near job (Dhanori) should precede Far job (Viman Nagar)
      const nearIdx = jobIds.indexOf(TEST_ORDER_PREPAID_ID);
      const farIdx = jobIds.indexOf(TEST_ORDER_COD_ID);
      expect(nearIdx).toBeLessThan(farIdx);
    });

    it('[R3.2] should atomically accept a job and transition order to assigned and rider to on_delivery', async () => {
      const res = await request(app)
        .post(`/delivery/jobs/${TEST_ORDER_PREPAID_ID}/accept`)
        .set('Authorization', `Bearer ${riderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('assigned');

      // Rider status should be on_delivery
      const agent = await queryOne('SELECT status FROM delivery_agents WHERE user_id = $1', [TEST_RIDER_ID]);
      expect(agent.status).toBe('on_delivery');
    });

    it('[R3.3] should prevent another rider from accepting the already claimed job', async () => {
      const res = await request(app)
        .post(`/delivery/jobs/${TEST_ORDER_PREPAID_ID}/accept`)
        .set('Authorization', `Bearer ${rider2Token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already been accepted');
    });

    it('[R3.4] should allow rider to release/reject assigned job back to ready pool', async () => {
      const res = await request(app)
        .post(`/delivery/jobs/${TEST_ORDER_PREPAID_ID}/reject`)
        .set('Authorization', `Bearer ${riderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const order = await queryOne('SELECT order_status, assigned_agent_id FROM orders WHERE id = $1', [TEST_ORDER_PREPAID_ID]);
      expect(order.order_status).toBe('ready');
      expect(order.assigned_agent_id).toBeNull();

      const agent = await queryOne('SELECT status FROM delivery_agents WHERE user_id = $1', [TEST_RIDER_ID]);
      expect(agent.status).toBe('available');
    });
  });

  describe('R4: Pickup & Timing-Safe Handover Verification', () => {
    beforeAll(async () => {
      // Re-claim order for pickup testing
      await request(app)
        .post(`/delivery/jobs/${TEST_ORDER_PREPAID_ID}/accept`)
        .set('Authorization', `Bearer ${riderToken}`);
    });

    it('[R4.1] should confirm pickup and transition order to out_for_delivery', async () => {
      const res = await request(app)
        .post(`/delivery/jobs/${TEST_ORDER_PREPAID_ID}/pickup`)
        .set('Authorization', `Bearer ${riderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('out_for_delivery');

      const order = await queryOne('SELECT order_status FROM orders WHERE id = $1', [TEST_ORDER_PREPAID_ID]);
      expect(order.order_status).toBe('out_for_delivery');
    });

    it('[R4.2] should reject completion with invalid OTP code using timing-safe comparison', async () => {
      const res = await request(app)
        .post(`/delivery/jobs/${TEST_ORDER_PREPAID_ID}/complete`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({ otp: '000000' }); // Expected is 445566

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Incorrect handover code');
    });

    it('[R4.3] should complete delivery with valid OTP, credit rider earnings, and reset rider to available', async () => {
      const res = await request(app)
        .post(`/delivery/jobs/${TEST_ORDER_PREPAID_ID}/complete`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({ otp: '445566' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('DELIVERED');
      expect(res.body.data.earnings).toBe(40);

      const order = await queryOne('SELECT order_status, delivered_at FROM orders WHERE id = $1', [TEST_ORDER_PREPAID_ID]);
      expect(order.order_status).toBe('delivered');
      expect(order.delivered_at).not.toBeNull();

      const agent = await queryOne('SELECT status FROM delivery_agents WHERE user_id = $1', [TEST_RIDER_ID]);
      expect(agent.status).toBe('available');
    });
  });

  describe('R5: COD Cash Ledger & Floating Cash Limits', () => {
    beforeAll(async () => {
      // Rider accepts and delivers the COD order (total ₹560)
      await request(app)
        .post(`/delivery/jobs/${TEST_ORDER_COD_ID}/accept`)
        .set('Authorization', `Bearer ${riderToken}`);

      await request(app)
        .post(`/delivery/jobs/${TEST_ORDER_COD_ID}/pickup`)
        .set('Authorization', `Bearer ${riderToken}`);

      await request(app)
        .post(`/delivery/jobs/${TEST_ORDER_COD_ID}/complete`)
        .set('Authorization', `Bearer ${riderToken}`)
        .send({ otp: '998877' });
    });

    it('[R5.1] should record cash collection in delivery_agents and rider_cash_ledger', async () => {
      const agent = await queryOne('SELECT cash_in_hand FROM delivery_agents WHERE user_id = $1', [TEST_RIDER_ID]);
      expect(Number(agent.cash_in_hand)).toBe(560);

      const ledger = await queryOne(
        `SELECT * FROM rider_cash_ledger WHERE rider_user_id = $1 AND order_id = $2`,
        [TEST_RIDER_ID, TEST_ORDER_COD_ID]
      );
      expect(ledger).toBeDefined();
      expect(ledger.entry_type).toBe('collected');
      expect(Number(ledger.amount)).toBe(560);
    });

    it('[R5.2] should report cash in hand, limit, and unblocked status', async () => {
      const res = await request(app)
        .get('/delivery/cash')
        .set('Authorization', `Bearer ${riderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cashInHand).toBe(560);
      expect(res.body.data.limit).toBe(3000);
      expect(res.body.data.isBlocked).toBe(false);
      expect(res.body.data.ledger.length).toBeGreaterThanOrEqual(1);
    });

    it('[R5.3] should block rider from going online when cash in hand exceeds threshold', async () => {
      // Artificially simulate rider cash in hand at ₹3,200 (over limit ₹3,000)
      await query('UPDATE delivery_agents SET cash_in_hand = 3200 WHERE user_id = $1', [TEST_RIDER_ID]);

      const res = await request(app)
        .put('/delivery/duty')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          isOnline: true,
          latitude: 18.5833,
          longitude: 73.8833,
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CASH_LIMIT_REACHED');
      expect(res.body.cashInHand).toBe(3200);
    });

    it('[R5.4] should record physical cash deposit at admin hub and unblock the rider', async () => {
      const depositRes = await request(app)
        .post(`/admin/delivery/agents/${agentRecordId}/cash-deposit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 3000,
          note: 'Dhanori Hub Physical Cash Deposit',
        });

      expect(depositRes.status).toBe(200);
      expect(depositRes.body.success).toBe(true);
      expect(depositRes.body.cashInHand).toBe(200);

      const agent = await queryOne('SELECT cash_in_hand FROM delivery_agents WHERE user_id = $1', [TEST_RIDER_ID]);
      expect(Number(agent.cash_in_hand)).toBe(200);

      // Verify deposited ledger entry
      const depositEntry = await queryOne(
        `SELECT * FROM rider_cash_ledger WHERE rider_user_id = $1 AND entry_type = 'deposited' ORDER BY created_at DESC LIMIT 1`,
        [TEST_RIDER_ID]
      );
      expect(depositEntry).toBeDefined();
      expect(Number(depositEntry.amount)).toBe(3000);

      // Now rider can go online cleanly
      const dutyRes = await request(app)
        .put('/delivery/duty')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          isOnline: true,
          latitude: 18.5833,
          longitude: 73.8833,
        });

      expect(dutyRes.status).toBe(200);
      expect(dutyRes.body.isOnline).toBe(true);
    });
  });
});
