/**
 * /franchise/{territory-customers,zones,reports,waitlist,profile}: the data
 * behind the franchise dashboard's Users, Zones, Reports, Marketing and
 * Settings pages.
 *
 * Written as the attack, like franchiseTerritoryIsolation.test.js: partner B
 * asks and must not receive anything from partner A's pincodes.
 */
// Engine-agnostic: no SQLite pin. Ids are UUIDs where the Postgres column is.

const crypto = require('crypto');
const express = require('express');
const request = require('supertest');

let mockCurrentUser = null;
jest.mock('../../middleware/auth.middleware', () => ({
  authenticate: (req, res, next) => {
    if (!mockCurrentUser) return res.status(401).json({ error: 'unauthenticated' });
    req.user = mockCurrentUser;
    next();
  },
  requireAdmin: (req, res, next) => next(),
  requireRole: () => (req, res, next) => next(),
  optionalAuth: (req, res, next) => next(),
  ROLES: {},
  hasAccess: () => (req, res, next) => next(),
}));

const { query, queryOne } = require('../../config/database');
const svc = require('../../services/territoryResolution.service');

const PIN_A = '413021';
const PIN_B = '413022';
// Every fixture id is generated, kept here, and deleted by id afterwards.
const ids = {};
const P = (s) => (ids[s] = ids[s] || (s.startsWith('terr-') ? `fdd-${s}-${Date.now()}` : crypto.randomUUID()));
const all = (prefix) => Object.entries(ids).filter(([k]) => k.startsWith(prefix)).map(([, v]) => v);
const del = async (table, prefix, column = 'id') => {
  for (const id of all(prefix)) await query(`DELETE FROM ${table} WHERE ${column} = $1`, [id]);
};
let app;

async function cleanup() {
  await del('orders', 'order-');
  await del('feature_interest_leads', 'lead-');
  await del('local_shops', 'shop-');
  await del('territory_assignment_log', 'terr-', 'territory_id');
  await del('franchise_territories', 'terr-', 'territory_id');
  await del('franchise_partners', 'partner-');
  await del('territories', 'terr-');
  await del('users', 'cust-');
  await del('users', 'owner-');
  await query("DELETE FROM location_talukas WHERE id = 'fdd-taluka'");
  await query("DELETE FROM location_districts WHERE id = 'fdd-district'");
  await query("DELETE FROM location_states WHERE id = 'fdd-state'");
}

beforeAll(async () => {
  svc.invalidate();
  let taluka = await queryOne('SELECT id FROM location_talukas LIMIT 1');
  if (!taluka) {
    await query("INSERT INTO location_states (id, name, code) VALUES ('fdd-state', 'FDD State', 'FDD')");
    await query("INSERT INTO location_districts (id, state_id, name) VALUES ('fdd-district', 'fdd-state', 'FDD District')");
    await query("INSERT INTO location_talukas (id, district_id, name) VALUES ('fdd-taluka', 'fdd-district', 'FDD Taluka')");
    taluka = { id: 'fdd-taluka' };
  }

  for (const [k, pin, phone] of [['a', PIN_A, '9822220001'], ['b', PIN_B, '9822220002']]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [P(`owner-${k}`), `Owner ${k}`, `${phone.slice(0, 5)}${String(Date.now()).slice(-5)}`, 'franchise_owner']);
    await query(
      `INSERT INTO territories (id, name, pincode, taluka_id, centroid_lat, centroid_lng, is_active) VALUES ($1, $2, $3, $4, 18.53, 73.87, '1')`,
      [P(`terr-${k}`), `Area ${k.toUpperCase()}`, pin, taluka.id]
    );
    await query(
      'INSERT INTO franchise_partners (id, user_id, territory_name, territory_pincode, status, commission_rate) VALUES ($1, $2, $3, $4, $5, $6)',
      [P(`partner-${k}`), P(`owner-${k}`), `Area ${k.toUpperCase()}`, pin, 'active', 25]
    );
    await svc.assignTerritory({ franchisePartnerId: P(`partner-${k}`), territoryId: P(`terr-${k}`) });

    await query(
      `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, pincode, is_active)
       VALUES ($1, $2, $3, 'grocery', 'Addr', 'POINT(73.87 18.53)', 18.53, 73.87, $4, '1')`,
      [P(`shop-${k}`), P(`owner-${k}`), `Shop ${k}`, pin]
    );
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [P(`cust-${k}`), `Customer ${k.toUpperCase()}`, `+91983${String(Date.now()).slice(-5)}${k === 'a' ? '01' : '02'}`, 'user']);
    await query(
      `INSERT INTO orders (id, user_id, shop_id, total_amount, delivery_fee, payment_method, order_status)
       VALUES ($1, $2, $3, $4, 0, 'cod', 'delivered')`,
      [P(`order-${k}`), P(`cust-${k}`), P(`shop-${k}`), k === 'a' ? 500 : 900]
    );
    await query('INSERT INTO feature_interest_leads (id, feature_key, pincode) VALUES ($1, $2, $3)', [P(`lead-${k}`), 'krishi', pin]);
  }

  app = express();
  app.use(express.json());
  app.use('/franchise', require('../../modules/crm/routes/franchise.routes'));
});

afterAll(cleanup);
beforeEach(() => { mockCurrentUser = null; });

const asPartner = (k) => { mockCurrentUser = { id: P(`owner-${k}`), role: 'franchise_owner' }; };

test('territory customers are limited to the partner\'s pincodes, with phone numbers masked', async () => {
  asPartner('a');
  const res = await request(app).get('/franchise/territory-customers');
  expect(res.status).toBe(200);
  const ids = res.body.customers.map((c) => c.id);
  expect(ids).toContain(P('cust-a'));
  expect(ids).not.toContain(P('cust-b'));
  const a = res.body.customers.find((c) => c.id === P('cust-a'));
  expect(a).toMatchObject({ orders: 1, deliveredValue: 500 });
  expect(a.phone).toMatch(/^\+91\*+[0-9]{2}01$/);
});

test('shops are limited to the partner\'s pincodes', async () => {
  asPartner('a');
  const res = await request(app).get('/franchise/shops');
  expect(res.status).toBe(200);
  const ids = res.body.shops.map((s) => s.id);
  expect(ids).toContain(P('shop-a'));
  expect(ids).not.toContain(P('shop-b'));
  expect(res.body.shops.find((s) => s.id === P('shop-a'))).toMatchObject({ pincode: PIN_A, active: true });
});

test('zones list only the partner\'s own territories with live shop and waitlist counts', async () => {
  asPartner('b');
  const res = await request(app).get('/franchise/zones');
  expect(res.status).toBe(200);
  expect(res.body.zones.map((z) => z.pincode)).toEqual([PIN_B]);
  expect(res.body.zones[0]).toMatchObject({ name: 'Area B', shops: 1, waitlist: 1 });
});

test('reports count only orders and shops in the partner\'s pincodes', async () => {
  asPartner('a');
  const res = await request(app).get('/franchise/reports?months=3');
  expect(res.status).toBe(200);
  expect(res.body.months).toHaveLength(3);
  const total = res.body.months.reduce((acc, m) => ({
    orders: acc.orders + m.orders, value: acc.value + m.deliveredValue, shops: acc.shops + m.newShops,
  }), { orders: 0, value: 0, shops: 0 });
  expect(total).toEqual({ orders: 1, value: 500, shops: 1 });
});

test('waitlist sign-ups are scoped to the partner\'s pincodes', async () => {
  asPartner('a');
  const res = await request(app).get('/franchise/waitlist');
  expect(res.status).toBe(200);
  expect(res.body.waitlist).toEqual([expect.objectContaining({ feature: 'krishi', pincode: PIN_A, count: 1 })]);
});

test('profile returns the caller\'s own agreement, and 404 for a non-partner', async () => {
  asPartner('a');
  const res = await request(app).get('/franchise/profile');
  expect(res.status).toBe(200);
  expect(res.body.profile).toMatchObject({ territoryName: 'Area A', commissionRate: 25, territoryPincodes: [PIN_A] });

  mockCurrentUser = { id: P('cust-a'), role: 'user' };
  expect((await request(app).get('/franchise/profile')).status).toBe(404);
});

test('a non-partner is refused the scoped endpoints rather than given everything', async () => {
  mockCurrentUser = { id: P('cust-a'), role: 'user' };
  for (const path of ['territory-customers', 'shops', 'zones', 'reports', 'waitlist']) {
    expect((await request(app).get(`/franchise/${path}`)).status).toBe(403);
  }
});
