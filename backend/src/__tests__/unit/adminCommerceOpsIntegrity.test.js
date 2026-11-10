/**
 * Admin commerce ops: behaviour the console relied on but the handlers did not
 * deliver (F-140). Each test fails against the previous implementation:
 *
 *   A1  no return rate in the KPIs
 *   A4  refunds uncapped and repeatable; search ignored customer and shop;
 *       timeline never showed admin actions or refunds
 *   A9  no waitlist export
 *   A11 the resolution was dropped; nothing reached the customer
 *   A12 the kill switch wrote FEATURE_KRISHI_ENABLED, which nothing reads
 *   A13 no seller reconciliation; CSV cells could carry spreadsheet formulas
 *   A14 "queued successfully" while sending nothing and ignoring consent
 */
const request = require('supertest');
const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const adminCommerceRouter = require('../../modules/crm/routes/admin-commerce.routes');
const { requireFeature } = require('../../middleware/featureFlag.middleware');

const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';
const id = () => crypto.randomUUID();

const ADMIN = id();
const ZONE = id();
const OTHER_ZONE = id();
const SELLER = id();
const SHOP = id();
const ORDER = id();
const DELIVERED = id();
const TICKET = id();
const WAIT = id();
// Customers in ZONE: consented, never asked, revoked. One consented elsewhere.
const C_YES = id();
const C_NONE = id();
const C_REVOKED = id();
const C_ELSEWHERE = id();
const USERS = [ADMIN, SELLER, C_YES, C_NONE, C_REVOKED, C_ELSEWHERE];
const TAG = ADMIN.slice(0, 8);

let app;
let token;

const api = (method, path) => request(app)[method](`/admin/commerce${path}`).set('Authorization', `Bearer ${token}`);

async function cleanup() {
  await query(`DELETE FROM admin_config WHERE config_category = 'feature_flag'`);
  await query('DELETE FROM shop_notifications WHERE recipient_id IN ($1, $2, $3, $4, $5)', [C_YES, C_NONE, C_REVOKED, C_ELSEWHERE, SELLER]);
  await query('DELETE FROM admin_broadcasts WHERE admin_id = $1', [ADMIN]);
  await query('DELETE FROM admin_audit_log WHERE admin_id = $1', [ADMIN]);
  await query('DELETE FROM user_consents WHERE user_id IN ($1, $2, $3, $4)', [C_YES, C_NONE, C_REVOKED, C_ELSEWHERE]);
  await query('DELETE FROM unserviceable_waitlist WHERE id = $1', [WAIT]);
  await query('DELETE FROM support_tickets WHERE id = $1', [TICKET]);
  await query('DELETE FROM order_returns WHERE order_id = $1', [DELIVERED]);
  await query('DELETE FROM orders WHERE id IN ($1, $2)', [ORDER, DELIVERED]);
  await query('DELETE FROM local_shops WHERE id = $1', [SHOP]);
  await query(`DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id IN (${USERS.map((_, i) => `$${i + 1}`).join(', ')}))`, USERS);
  await query(`DELETE FROM wallets WHERE user_id IN (${USERS.map((_, i) => `$${i + 1}`).join(', ')})`, USERS);
  await query(`DELETE FROM users WHERE id IN (${USERS.map((_, i) => `$${i + 1}`).join(', ')})`, USERS);
  await query('DELETE FROM regions WHERE id IN ($1, $2)', [ZONE, OTHER_ZONE]);
}

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use('/admin/commerce', adminCommerceRouter);
  app.get('/gated/krishi', requireFeature('krishi'), (req, res) => res.json({ ok: true }));
  token = jwt.sign(
    { userId: ADMIN, id: ADMIN, role: 'super_admin', isSuperAdmin: true, tokenVersion: 0 },
    getJwtSecret(),
    { expiresIn: '1h' }
  );

  await cleanup();
  for (const [zone, name] of [[ZONE, `Integrity Zone ${TAG}`], [OTHER_ZONE, `Integrity Other ${TAG}`]]) {
    await query(
      `INSERT INTO regions (id, name, state, country, latitude, longitude, is_active)
       VALUES ($1, $2, 'Maharashtra', 'India', 18.58, 73.89, '1')`,
      [zone, name]
    );
  }
  const people = [
    [ADMIN, 'Integrity Admin', '+917700000001', 'super_admin', null],
    [SELLER, 'Integrity Seller', '+917700000002', 'shop_owner', ZONE],
    [C_YES, 'Consenting Customer', '+917700000003', 'user', ZONE],
    [C_NONE, 'Silent Customer', '+917700000004', 'user', ZONE],
    [C_REVOKED, 'Revoked Customer', '+917700000005', 'user', ZONE],
    [C_ELSEWHERE, 'Elsewhere Customer', '+917700000006', 'user', OTHER_ZONE],
  ];
  for (const [uid, name, phone, role, region] of people) {
    await query(
      'INSERT INTO users (id, full_name, phone_number, role, is_active, region_id) VALUES ($1, $2, $3, $4, true, $5)',
      [uid, name, phone, role, region]
    );
  }
  for (const [uid, granted, revoked] of [[C_YES, 1, false], [C_REVOKED, 1, true], [C_ELSEWHERE, 1, false]]) {
    await query(
      `INSERT INTO user_consents (id, user_id, consent_type, consent_purpose, granted, granted_at, revoked_at, consent_version)
       VALUES ($1, $2, 'marketing', 'Promotional communications', $3, ${NOW}, ${revoked ? NOW : 'NULL'}, '1.0')`,
      [id(), uid, granted]
    );
  }
  await query(
    `INSERT INTO local_shops (id, name, owner_id, phone, category, address, latitude, longitude, coordinate, pincode, is_active, is_verified, approval_status, gstin, commission_rate)
     VALUES ($1, $2, $3, '+917700000010', 'grocery', 'Integrity Road', 18.58, 73.89, 'POINT(73.89 18.58)', '411015', true, true, 'approved', '27AAAAA0000A1Z5', 5)`,
    [SHOP, `Integrity Kirana ${TAG}`, SELLER]
  );
  await query(
    `INSERT INTO orders (id, user_id, shop_id, subtotal, total_amount, delivery_fee, delivery_address, payment_method, payment_status, order_status, status, fulfillment_method, created_at)
     VALUES ($1, $2, $3, 270, 300, 30, 'Flat 7, Integrity Heights', 'razorpay', 'paid', 'confirmed', 'confirmed', 'delivery', ${NOW})`,
    [ORDER, C_YES, SHOP]
  );
  await query(
    `INSERT INTO orders (id, user_id, shop_id, subtotal, total_amount, delivery_fee, delivery_address, payment_method, payment_status, order_status, status, fulfillment_method, delivered_at, created_at)
     VALUES ($1, $2, $3, 500, 500, 0, 'Flat 7, Integrity Heights', 'cod', 'paid', 'delivered', 'delivered', 'delivery', ${NOW}, ${NOW})`,
    [DELIVERED, C_YES, SHOP]
  );
  await query(
    `INSERT INTO order_returns (id, order_id, user_id, shop_id, return_type, reason, refund_amount, status)
     VALUES ($1, $2, $3, $4, 'return', 'Damaged packet', 120, 'pending_review')`,
    [id(), DELIVERED, C_YES, SHOP]
  );
  await query(
    `INSERT INTO support_tickets (id, user_id, subject, description, category, priority, status, is_statutory, created_at)
     VALUES ($1, $2, 'Overcharged', 'Charged above MRP', 'billing', 'high', 'open', true, ${NOW})`,
    [TICKET, C_YES]
  );
  await query(
    `INSERT INTO unserviceable_waitlist (id, phone_number, email, pincode, address, latitude, longitude)
     VALUES ($1, '=HYPERLINK("http://evil")', 'w@example.com', '411001', '@SUM(1,1)', 18.5, 73.8)`,
    [WAIT]
  );
});

afterAll(async () => {
  delete process.env.FEATURE_KRISHI;
  await cleanup();
});

describe('A1 KPIs', () => {
  it('[A1.2] reports returned orders and the return rate', async () => {
    const res = await api('get', '/kpis');
    expect(res.status).toBe(200);
    expect(res.body.data.returnedOrders).toBeGreaterThanOrEqual(1);
    expect(typeof res.body.data.returnRate).toBe('number');
    expect(res.body.data.returnRate).toBeGreaterThan(0);
  });
});

describe('A4 order interventions', () => {
  it('[A4.6] finds an order by customer name and by shop name', async () => {
    const byCustomer = await api('get', `/orders?q=${encodeURIComponent('Consenting Customer')}`);
    expect(byCustomer.body.data.map((o) => o.id)).toEqual(expect.arrayContaining([ORDER, DELIVERED]));
    const byShop = await api('get', `/orders?q=${encodeURIComponent(`Integrity Kirana ${TAG}`)}`);
    expect(byShop.body.data.map((o) => o.id)).toEqual(expect.arrayContaining([ORDER]));
  });

  it('[A4.7] a refund needs a reason', async () => {
    const res = await api('post', `/orders/${ORDER}/refund`).send({ amount: 50 });
    expect(res.status).toBe(400);
  });

  it('[A4.8] refunds are capped at what the order is still owed and cannot repeat', async () => {
    const first = await api('post', `/orders/${ORDER}/refund`).send({ amount: 100, reason: 'Late delivery' });
    expect(first.status).toBe(200);
    expect(first.body.refundable).toBe(200);

    const tooMuch = await api('post', `/orders/${ORDER}/refund`).send({ amount: 250, reason: 'Again' });
    expect(tooMuch.status).toBe(400);
    expect(tooMuch.body.refundable).toBe(200);

    const rest = await api('post', `/orders/${ORDER}/refund`).send({ reason: 'Balance' });
    expect(rest.status).toBe(200);
    expect(rest.body.refundAmount).toBe(200);

    const again = await api('post', `/orders/${ORDER}/refund`).send({ amount: 1, reason: 'Once more' });
    expect(again.status).toBe(409);

    const total = await queryOne(
      "SELECT COALESCE(SUM(amount), 0) AS t FROM wallet_transactions WHERE reference_id = $1 AND purpose = 'order_refund'",
      [ORDER]
    );
    expect(Number(total.t)).toBe(300);
  });

  it('[A4.9] the timeline shows admin actions and refunds', async () => {
    const res = await api('get', `/orders/${ORDER}/timeline`);
    expect(res.status).toBe(200);
    const sources = res.body.data.timeline.map((e) => e.source);
    expect(sources).toEqual(expect.arrayContaining(['order', 'admin', 'wallet']));
    expect(res.body.data.timeline.filter((e) => e.status === 'refunded')).toHaveLength(2);
  });
});

describe('A9 waitlist', () => {
  it('[A9.3] exports the waitlist as CSV with formulas neutralised', async () => {
    const res = await api('get', '/zones/waitlist?format=csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('Pincode');
    expect(res.text).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(res.text).toContain(`"'@SUM(1,1)"`);
    expect(res.text).not.toMatch(/(^|,)"=HYPERLINK/m);
  });
});

describe('A11 grievances', () => {
  it('[A11.3] resolving needs a resolution', async () => {
    const res = await api('put', `/grievances/${TICKET}`).send({ status: 'resolved' });
    expect(res.status).toBe(400);
  });

  it('[A11.4] the resolution is stored on the ticket and sent to the customer', async () => {
    const reply = 'Refund of the excess has been credited to your wallet.';
    const res = await api('put', `/grievances/${TICKET}`).send({ status: 'resolved', resolution: reply });
    expect(res.status).toBe(200);
    const ticket = await queryOne('SELECT status, resolution, resolved_at, acknowledged_at FROM support_tickets WHERE id = $1', [TICKET]);
    expect(ticket.status).toBe('resolved');
    expect(ticket.resolution).toBe(reply);
    expect(ticket.resolved_at).toBeTruthy();
    expect(ticket.acknowledged_at).toBeTruthy();
    const note = await queryOne('SELECT body FROM shop_notifications WHERE recipient_id = $1 AND body = $2', [C_YES, reply]);
    expect(note).toBeTruthy();
  });
});

describe('A12 kill switches', () => {
  it('[A12.2] refuses unknown features and switching the platform off', async () => {
    expect((await api('put', '/feature-flags').send({ NOT_A_FEATURE: true })).status).toBe(400);
    expect((await api('put', '/feature-flags').send({ features: { commerce_core: false } })).status).toBe(400);
    expect((await api('put', '/feature-flags').send({})).status).toBe(400);
  });

  it('[A12.3] a switch persists, is what route gating reads, and shows in the registry', async () => {
    // jest.setup.js turns gating off for the whole suite; this test is about
    // the gate, so it runs with the bypass lifted.
    const bypass = process.env.BYPASS_FEATURE_FLAGS;
    delete process.env.BYPASS_FEATURE_FLAGS;
    try {
      await assertSwitchIsReal();
    } finally {
      if (bypass !== undefined) process.env.BYPASS_FEATURE_FLAGS = bypass;
    }
  });

  async function assertSwitchIsReal() {
    const off = await api('put', '/feature-flags').send({ features: { krishi: false } });
    expect(off.status).toBe(200);
    expect((await request(app).get('/gated/krishi')).status).toBe(403);

    // The legacy console key now reaches the variable isFeatureEnabled reads.
    const on = await api('put', '/feature-flags').send({ KRISHI_ENABLED: true });
    expect(on.status).toBe(200);
    expect(process.env.FEATURE_KRISHI).toBe('true');
    expect((await request(app).get('/gated/krishi')).status).toBe(200);

    const stored = await queryOne(
      "SELECT config_value FROM admin_config WHERE config_category = 'feature_flag' AND config_key = 'FEATURE_KRISHI'"
    );
    expect(String(stored.config_value)).toMatch(/true/);

    // Survives a restart: drop the in-process value and reload from the DB.
    delete process.env.FEATURE_KRISHI;
    await require('../../services/featureOverrides.service').load();
    expect(process.env.FEATURE_KRISHI).toBe('true');

    const registry = (await api('get', '/feature-flags')).body.data.registry;
    const krishi = registry.find((f) => f.key === 'krishi');
    expect(krishi).toMatchObject({ enabled: true, switchable: true });
    expect(registry.find((f) => f.key === 'commerce_core').switchable).toBe(false);

    await api('put', '/feature-flags').send({ features: { krishi: false } });
  }
});

describe('A6 payouts', () => {
  it('[A6.3] lists seller payout batches with their shop and status', async () => {
    const payoutId = id();
    await query(
      `INSERT INTO shop_payouts (id, shop_id, period_start, period_end, gross_gmv, total_orders, net_payout, payout_status, commission_rate)
       VALUES ($1, $2, '2026-11-01', '2026-11-07', 500, 1, 475, 'pending', 5)`,
      [payoutId, SHOP]
    );
    try {
      const res = await api('get', '/payouts');
      expect(res.status).toBe(200);
      const row = res.body.data.find((p) => p.id === payoutId);
      expect(row).toMatchObject({ shop_name: `Integrity Kirana ${TAG}`, payout_status: 'pending' });
      expect(Number(row.net_payout)).toBe(475);
      const pendingOnly = await api('get', '/payouts?status=paid');
      expect(pendingOnly.body.data.find((p) => p.id === payoutId)).toBeUndefined();
    } finally {
      await query('DELETE FROM shop_payouts WHERE id = $1', [payoutId]);
    }
  });
});

describe('A13 exports', () => {
  it('[A13.3] seller-wise sales and payout reconciliation', async () => {
    const res = await api('get', '/reports/export?format=seller_reconciliation');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Pending Payout (INR)');
    const line = res.text.split('\n').find((l) => l.includes(SHOP));
    expect(line).toBeDefined();
    // One delivered order of 500 at 5% commission.
    expect(line).toContain('"500.00"');
    expect(line).toContain('"25.00"');
  });

  it('[A13.4] an unknown report format is refused', async () => {
    expect((await api('get', '/reports/export?format=everything')).status).toBe(400);
  });
});

describe('A14 broadcasts', () => {
  it('[A14.3] reaches only consenting users in the targeted zone and role', async () => {
    const res = await api('post', '/broadcasts').send({
      title: 'Integrity offer', body: 'Free delivery today', targetZoneId: ZONE, targetRole: 'customer',
    });
    expect(res.status).toBe(200);
    expect(res.body.broadcast).toMatchObject({ eligible: 3, consented: 1, delivered: 1, skippedNoConsent: 2 });

    const reached = await query("SELECT recipient_id FROM shop_notifications WHERE title = 'Integrity offer'");
    expect((reached.rows || []).map((r) => r.recipient_id)).toEqual([C_YES]);
  });

  it('[A14.4] keeps a history with delivery counts', async () => {
    const res = await api('get', '/broadcasts');
    expect(res.status).toBe(200);
    const mine = res.body.data.find((b) => b.title === 'Integrity offer');
    expect(mine).toBeDefined();
    expect(Number(mine.success_count)).toBe(1);
    expect(mine.audience).toMatchObject({ role: 'customer', zoneId: ZONE, skippedNoConsent: 2 });
  });

  it('[A14.5] refuses an unknown zone or audience', async () => {
    expect((await api('post', '/broadcasts').send({ title: 't', body: 'b', targetZoneId: id() })).status).toBe(400);
    expect((await api('post', '/broadcasts').send({ title: 't', body: 'b', targetRole: 'everyone' })).status).toBe(400);
  });
});
