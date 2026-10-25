/**
 * The admin console's numbers are the database's.
 *
 *   /admin/god-mode/metrics   revenue summed a column that does not exist, fell
 *                             back to `orders * 350`, drew the monthly chart as
 *                             a synthetic ramp over a fixed Jan–Aug, reported
 *                             active_sos as a literal 0, counted cancelled
 *                             orders as revenue, and turned any failed query
 *                             into a confident zero.
 *   /admin/finance/export     history was Math.random(); the breakdown selected
 *                             carpool_rides.price, which does not exist.
 *   /admin/crm/users          selected `name` and `phone` (Prisma-era names).
 *   /admin/shops/:id/full-details  TypeError, a 500, for an unknown id.
 *   /admin/fraud/*            compared the role with 'SUPER_ADMIN'; roles are
 *                             stored lower case, so nobody could open it.
 */

process.env.USE_SQLITE = 'true';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const ADMIN = 'acd-admin';
const CITIZEN = 'acd-citizen';
const SHOP = 'acd-shop';
const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId, tokenVersion: 0 }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;

const now = new Date();
const thisYear = now.getUTCFullYear();
const thisMonth = String(now.getUTCMonth() + 1).padStart(2, '0');

async function cleanup() {
  await query("DELETE FROM sos_alerts WHERE user_id LIKE 'acd-%'");
  await query("DELETE FROM shop_payouts WHERE id LIKE 'acd-%'");
  await query("DELETE FROM orders WHERE id LIKE 'acd-%'");
  await query("DELETE FROM local_shops WHERE id LIKE 'acd-%'");
  await query("DELETE FROM users WHERE id LIKE 'acd-%'");
}

async function order(id, total, status, createdAt) {
  await query(
    `INSERT INTO orders (id, user_id, shop_id, total_amount, delivery_fee, payment_method, order_status, delivery_address, delivery_coordinate, created_at)
     VALUES ($1, $2, $3, $4, 0, 'upi', $5, 'Road 1', 'POINT(73.8 18.5)', $6)`,
    [id, CITIZEN, SHOP, total, status, createdAt]
  );
}

beforeAll(async () => {
  await cleanup();
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'Admin', '9861000001', 'super_admin')", [ADMIN]);
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'Citizen', '9861000002', 'user')", [CITIZEN]);
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, is_active)
     VALUES ($1, $2, 'ACD Shop', 'Grocery', 'Road 1', 'POINT(73.8 18.5)', 18.5, 73.8, 1)`,
    [SHOP, CITIZEN]
  );

  await order('acd-o1', 500, 'delivered', `${thisYear}-01-15 10:00:00`);
  await order('acd-o2', 300, 'cancelled', `${thisYear}-01-16 10:00:00`); // must not count
  await order('acd-o3', 200, 'delivered', `${thisYear}-${thisMonth}-02 10:00:00`);
  await query("INSERT INTO sos_alerts (id, user_id, type, latitude, longitude, pincode, status) VALUES ('acd-sos1', $1, 'medical', 18.5, 73.8, '411015', 'active')", [CITIZEN]);
  await query("INSERT INTO sos_alerts (id, user_id, type, latitude, longitude, pincode, status) VALUES ('acd-sos2', $1, 'medical', 18.5, 73.8, '411015', 'resolved')", [CITIZEN]);

  await query(
    `INSERT INTO shop_payouts (id, shop_id, period_start, period_end, gross_gmv, platform_commission, net_payout, payout_status, paid_at)
     VALUES ('acd-p1', $1, $2, $3, 1000, 100, 850, 'completed', $4)`,
    [SHOP, `${thisYear}-${thisMonth}-01`, `${thisYear}-${thisMonth}-28`, `${thisYear}-${thisMonth}-29 09:00:00`]
  );
  await query(
    `INSERT INTO shop_payouts (id, shop_id, period_start, period_end, gross_gmv, platform_commission, net_payout, payout_status)
     VALUES ('acd-p2', $1, $2, $3, 5000, 500, 4250, 'dues')`,
    [SHOP, `${thisYear}-${thisMonth}-01`, `${thisYear}-${thisMonth}-28`]
  );

  app = express();
  app.use(express.json());
  app.use('/admin', require('../../modules/crm/routes/admin.routes'));
  app.use('/fraud', require('../../modules/crm/routes/fraud.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
});

afterAll(cleanup);

describe('/admin/god-mode/metrics', () => {
  let data;
  beforeAll(async () => {
    const res = await request(app).get('/admin/god-mode/metrics').set(as(ADMIN));
    expect(res.status).toBe(200);
    data = res.body.data;
  });

  test('revenue is the real, non-cancelled order value this year', () => {
    expect(data.revenueYTD).toBe(700);
    expect(data.revenue_ytd).toBe(700);
  });

  test('the chart runs January to the current month and each point is its own month', () => {
    expect(data.revenueOverTime).toHaveLength(now.getUTCMonth() + 1);
    expect(data.revenueOverTime[0].name).toBe('Jan');
    const total = data.revenueOverTime.reduce((t, p) => t + p.value, 0);
    expect(total).toBe(700);
    if (now.getUTCMonth() > 0) {
      expect(data.revenueOverTime[0].value).toBe(500); // January: the delivered one only
      expect(data.revenueOverTime[now.getUTCMonth()].value).toBe(200);
    }
  });

  test('active SOS counts the active alerts, not a literal zero', () => {
    expect(data.active_sos).toBeGreaterThanOrEqual(1);
  });

  test('a citizen cannot read it', async () => {
    expect((await request(app).get('/admin/god-mode/metrics').set(as(CITIZEN))).status).toBe(403);
  });
});

describe('/admin/finance/export', () => {
  test('is built from payouts and payments, not random numbers', async () => {
    const res = await request(app).get('/admin/finance/export?rangeType=months&limit=3').set(as(ADMIN));
    expect(res.status).toBe(200);
    const { history, revenueBreakdown } = res.body.data;
    expect(history).toHaveLength(3);

    const current = history[history.length - 1];
    expect(current.platform_commission).toBe(0 + 100 + 0); // 'dues' (500) is not owed yet
    expect(current.payouts).toBe(850);
    expect(current.revenue).toBe(100);
    expect(history.slice(0, -1).every((p) => p.payouts === 0 || p.key !== current.key)).toBe(true);

    expect(revenueBreakdown.find((r) => r.revenue_stream === 'Platform commission').revenue).toBe(100);
  });

  test('the same request twice gives the same answer (it used to be random)', async () => {
    const a = await request(app).get('/admin/finance/export?limit=6').set(as(ADMIN));
    const b = await request(app).get('/admin/finance/export?limit=6').set(as(ADMIN));
    expect(a.body.data.history).toEqual(b.body.data.history);
  });

  test('CSV export answers', async () => {
    const res = await request(app).get('/admin/finance/export?format=csv').set(as(ADMIN));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/csv/);
    expect(res.text).toContain('Platform commission');
  });

  test('periods are the last N months, oldest first, with no gaps', () => {
    const { buildPeriods } = require('../../modules/crm/controllers/finance.controller');
    const p = buildPeriods('months', 4, new Date(Date.UTC(2026, 1, 10)));
    expect(p.map((x) => x.key)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    expect(buildPeriods('years', 3, new Date(Date.UTC(2026, 5, 1))).map((x) => x.key)).toEqual(['2024', '2025', '2026']);
  });
});

describe('other admin reads', () => {
  test('the CRM user list loads real columns', async () => {
    const res = await request(app).get('/admin/crm/users').set(as(ADMIN));
    expect(res.status).toBe(200);
    const admin = res.body.data.find((u) => u.id === ADMIN);
    expect(admin).toMatchObject({ full_name: 'Admin', phone_number: '9861000001' });
  });

  test('an unknown shop is a 404, not a crash', async () => {
    expect((await request(app).get('/admin/shops/no-such-shop/full-details').set(as(ADMIN))).status).toBe(404);
    const found = await request(app).get(`/admin/shops/${SHOP}/full-details`).set(as(ADMIN));
    expect(found.status).toBe(200);
    expect(found.body.owner).toMatchObject({ full_name: 'Citizen' });
  });
});

describe('/admin/fraud (role casing)', () => {
  test('a super admin can open it; a citizen cannot', async () => {
    const asAdmin = await request(app).get('/fraud/dashboard').set(as(ADMIN));
    expect(asAdmin.status).toBe(200);
    expect((await request(app).get('/fraud/dashboard').set(as(CITIZEN))).status).toBe(403);
  });
});
