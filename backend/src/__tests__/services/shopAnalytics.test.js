/**
 * Shop analytics reports.
 *
 * These were written in SQLite's dialect — strftime(), datetime('now', '-N
 * days') — and so failed outright on PostgreSQL, the engine production runs.
 * They are now computed from the window's rows, which is the same code on
 * either engine; these pin what each report says against known orders.
 *
 * Timestamps are placed relative to now so the 30-day window always contains
 * them, and the bucket keys are derived from the same instants rather than
 * written out, so the suite does not start failing on a particular date.
 */

process.env.USE_SQLITE = 'true';

const { query } = require('../../config/database');
const analytics = require('../../services/shopAnalytics.service');

const SHOP = 'analytics-test-shop';
const ALICE = 'analytics-user-alice';
const BILAL = 'analytics-user-bilal';

const HOUR = 3600000;
const DAY = 24 * HOUR;
const stored = (date) => date.toISOString().slice(0, 19).replace('T', ' ');
const dayKey = (date) => date.toISOString().slice(0, 10);

// Three orders inside the window and one well outside it.
const t1 = new Date(Date.now() - 2 * DAY);
const t2 = new Date(Date.now() - 2 * DAY + HOUR);
const t3 = new Date(Date.now() - 5 * DAY);
const old = new Date(Date.now() - 90 * DAY);

const ORDERS = [
  { id: 'analytics-order-1', user: ALICE, amount: 100, status: 'delivered', at: t1 },
  { id: 'analytics-order-2', user: ALICE, amount: 300, status: 'delivered', at: t2 },
  { id: 'analytics-order-3', user: BILAL, amount: 50, status: 'cancelled', at: t3 },
  { id: 'analytics-order-4', user: BILAL, amount: 999, status: 'delivered', at: old },
];

async function cleanup() {
  await query("DELETE FROM orders WHERE id LIKE 'analytics-order-%'");
  await query("DELETE FROM users WHERE id LIKE 'analytics-user-%'");
}

beforeAll(async () => {
  await cleanup();
  for (const [id, name, phone] of [[ALICE, 'Alice Analytics', '9833222001'], [BILAL, 'Bilal Analytics', '9833222002']]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, name, phone, 'user']);
  }
  for (const o of ORDERS) {
    // shop_id carries no row behind it on purpose: these reports read orders
    // alone, and a shop fixture would only add cleanup.
    await query('PRAGMA foreign_keys = OFF');
    await query(
      `INSERT INTO orders (id, user_id, shop_id, total_amount, delivery_fee, payment_method, order_status,
                           delivery_address, delivery_coordinate, created_at)
       VALUES ($1, $2, $3, $4, 0, 'cod', $5, 'Test address', '18.53,73.87', $6)`,
      [o.id, o.user, SHOP, o.amount, o.status, stored(o.at)]
    );
    await query('PRAGMA foreign_keys = ON');
  }
});

afterAll(cleanup);

describe('revenue trend', () => {
  test('daily buckets count every order and total only delivered ones', async () => {
    const out = await analytics.getRevenueTrend(SHOP, 'daily', 30);
    expect(out.period).toBe('day');

    const byDay = new Map(out.data.map((row) => [row.period, row]));
    const expected = new Map();
    for (const o of ORDERS.slice(0, 3)) {
      const key = dayKey(o.at);
      const e = expected.get(key) || { total: 0, completed: 0, revenue: 0 };
      e.total += 1;
      if (o.status === 'delivered') { e.completed += 1; e.revenue += o.amount; }
      expected.set(key, e);
    }

    expect(byDay.size).toBe(expected.size);
    for (const [key, e] of expected) {
      expect(byDay.get(key)).toEqual(expect.objectContaining({
        total_orders: e.total,
        completed_orders: e.completed,
        revenue: e.revenue,
        avg_order_value: e.completed ? e.revenue / e.completed : 0,
      }));
    }
    // Newest first.
    const periods = out.data.map((row) => row.period);
    expect(periods).toEqual([...periods].sort().reverse());
  });

  test('the order outside the window is not counted', async () => {
    const out = await analytics.getRevenueTrend(SHOP, 'monthly', 30);
    const revenue = out.data.reduce((sum, row) => sum + row.revenue, 0);
    expect(revenue).toBe(400);
  });

  test('a nonsense window falls back to thirty days instead of reaching the query', async () => {
    const out = await analytics.getRevenueTrend(SHOP, 'daily', "1; DROP TABLE orders");
    expect(out.days).toBe(30);
    expect(out.data.reduce((sum, row) => sum + row.total_orders, 0)).toBe(3);
  });
});

test('order breakdown groups by status and by hour', async () => {
  const out = await analytics.getOrderBreakdown(SHOP, 30);

  expect(out.statusBreakdown).toEqual([
    { status: 'delivered', count: 2, total_amount: 400 },
    { status: 'cancelled', count: 1, total_amount: 50 },
  ]);

  const hours = new Map();
  for (const o of ORDERS.slice(0, 3)) hours.set(o.at.getUTCHours(), (hours.get(o.at.getUTCHours()) || 0) + 1);
  expect(out.hourlyDistribution).toEqual(
    [...hours.entries()].map(([hour, count]) => ({ hour, count })).sort((a, b) => a.hour - b.hour)
  );
});

test('customer analytics separates repeat from new and names the top spenders', async () => {
  const out = await analytics.getCustomerAnalytics(SHOP, 30);

  expect(out.totalCustomers).toBe(2);
  expect(out.repeatCustomers).toBe(1);
  expect(out.newCustomers).toBe(1);
  expect(out.retentionRate).toBe(50);
  expect(out.topCustomers.map((c) => [c.name, c.order_count, c.total_spent])).toEqual([
    ['Alice Analytics', 2, 400],
    ['Bilal Analytics', 1, 50],
  ]);
});

test('peak hours places each order in its weekday and hour', async () => {
  const out = await analytics.getPeakHours(SHOP, 30);

  expect(out.heatmap).toHaveLength(7);
  expect(out.heatmap.every((row) => row.length === 24)).toBe(true);
  expect(out.heatmap.flat().reduce((a, b) => a + b, 0)).toBe(3);
  expect(out.heatmap[t1.getUTCDay()][t1.getUTCHours()]).toBeGreaterThanOrEqual(1);
  expect(out.heatmap[t3.getUTCDay()][t3.getUTCHours()]).toBeGreaterThanOrEqual(1);
});

test('week numbering starts a new week on Monday, as strftime %W does', () => {
  // 1 Jan 2026 is a Thursday: the days before the first Monday are week 0.
  expect(analytics.weekOfYear(new Date('2026-01-04T12:00:00Z'))).toBe(0);
  expect(analytics.weekOfYear(new Date('2026-01-05T12:00:00Z'))).toBe(1);
  // 1 Jan 2024 is itself a Monday.
  expect(analytics.weekOfYear(new Date('2024-01-01T12:00:00Z'))).toBe(1);
});
