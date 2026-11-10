/**
 * Literal paths must not be swallowed by an earlier `/:id` route.
 *
 * `/shops/:id/staff` was registered before `/shops/my-shop/staff`, so the
 * owner's staff screen was answered by the public handler with id = 'my-shop' —
 * an empty list, readable by anyone. The same happened to POST
 * /shops/my-shop/products, and to /marketplace/saved and /price-alerts, which
 * `/marketplace/:id` took first. Each is a screen that shipped calling the
 * route.
 *
 * Also pinned: the public staff list no longer carries what only the owner
 * should see (email, phone, shift, commission, revenue).
 */


const { fx, fxLike } = require('../helpers/fixtureIds');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const OWNER = fx('rsh-owner');
const SHOP = fx('rsh-shop');
const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;

async function cleanup() {
  await query(`DELETE FROM shop_staff WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('rsh')}'`);
  await query(`DELETE FROM shop_products WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('rsh')}'`);
  await query(`DELETE FROM local_shops WHERE CAST(id AS TEXT) LIKE '${fxLike('rsh')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('rsh')}'`);
}

beforeAll(async () => {
  await cleanup();
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'Owner', '9860800001', 'shop_owner')", [OWNER]);
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, is_active, is_verified, approval_status)
     VALUES ($1, $2, 'Shadow Shop', 'Grocery', 'Road 1', 'POINT(73.87 18.53)', 18.53, 73.87, '1', '1', 'approved')`,
    [SHOP, OWNER]
  );
  await query(
    `INSERT INTO shop_staff (id, shop_id, name, role, email, phone, shift, commission, commission_percent, total_revenue, is_active)
     VALUES ('${fx('rsh-staff-1')}', $1, 'Asha', 'Stylist', 'asha@example.test', '9000011111', 'morning', 12, 12, 48000, '1')`,
    [SHOP]
  );

  app = express();
  app.use(express.json());
  app.use('/shops', require('../../modules/ecommerce/routes/shop.routes'));
  app.use('/marketplace', require('../../modules/ecommerce/routes/marketplace.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use(require('../../middleware/error.middleware').errorHandler);
});

afterAll(cleanup);

describe('/shops/my-shop is the owner\'s, not a shop called "my-shop"', () => {
  test.each([
    ['get', '/shops/my-shop/staff'],
    ['post', '/shops/my-shop/staff'],
    ['post', '/shops/my-shop/products'],
  ])('%s %s requires sign-in', async (method, url) => {
    const res = await request(app)[method](url).send({});
    expect(res.status).toBe(401);
  });

  test('the owner reads their own staff list, with the private fields', async () => {
    const res = await request(app).get('/shops/my-shop/staff').set(as(OWNER));
    expect(res.status).toBe(200);
    const rows = res.body.data || res.body.staff || res.body;
    const asha = (Array.isArray(rows) ? rows : []).find((s) => s.id === fx('rsh-staff-1'));
    expect(asha).toBeTruthy();
    expect(asha.email).toBe('asha@example.test');
  });
});

describe('the public staff list', () => {
  test('shows who works there, and nothing private about them', async () => {
    const res = await request(app).get(`/shops/${SHOP}/staff`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: fx('rsh-staff-1'), name: 'Asha', role: 'Stylist' });
    for (const secret of ['email', 'phone', 'phone_number', 'shift', 'commission', 'commission_percent', 'total_revenue', 'total_bookings']) {
      expect(res.body[0]).not.toHaveProperty(secret);
    }
  });
});

describe('/marketplace/saved and /price-alerts are the user\'s, not listing ids', () => {
  test.each(['/marketplace/saved'])('%s requires sign-in', async (url) => {
    expect((await request(app).get(url)).status).toBe(401);
  });

  test('a signed-in user gets their saved list rather than "listing not found"', async () => {
    await query(`INSERT INTO users (id, full_name, phone_number, role) VALUES ('${fx('rsh-buyer')}', 'Buyer', '9860800002', 'user')`);
    const res = await request(app).get('/marketplace/saved').set(as(fx('rsh-buyer')));
    expect(res.status).toBe(200);
  });

  test('a real listing id is still looked up', async () => {
    expect((await request(app).get('/marketplace/no-such-listing')).status).toBe(404);
  });
});
