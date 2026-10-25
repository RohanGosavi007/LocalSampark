/**
 * The shop routes every client opens a shop with.
 *
 * GET /shops/:id, /shops/nearby and /shops/my-shop were deleted by accident on
 * 2026-09-17 and answered 404 until they were restored. Nothing tested them,
 * so the suite stayed green throughout. These pin them, and that the public
 * page does not carry the shop's bank details.
 */

process.env.USE_SQLITE = 'true';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const OWNER = 'sdr-owner';
const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;

async function cleanup() {
  await query("DELETE FROM shop_products WHERE shop_id LIKE 'sdr-%'");
  await query("DELETE FROM local_shops WHERE id LIKE 'sdr-%'");
  await query("DELETE FROM users WHERE id LIKE 'sdr-%'");
}

beforeAll(async () => {
  await cleanup();
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'Owner', '9860700001', 'shop_owner')", [OWNER]);
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, bank_account, commission_override_percent, is_active, is_premium)
     VALUES ('sdr-near', $1, 'Near Shop', 'Grocery', 'Road 1', 'POINT(73.87 18.53)', 18.53, 73.87, '{"account":"123456789"}', 2, 1, 0)`,
    [OWNER]
  );
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, is_active)
     VALUES ('sdr-far', 'sdr-owner', 'Far Shop', 'Grocery', 'Road 2', 'POINT(74.5 19.2)', 19.2, 74.5, 1)`
  );
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, is_active)
     VALUES ('sdr-closed', 'sdr-owner', 'Closed Shop', 'Grocery', 'Road 3', 'POINT(73.87 18.53)', 18.53, 73.87, 0)`
  );
  await query("INSERT INTO shop_products (id, shop_id, name, price) VALUES ('sdr-p1', 'sdr-near', 'Rice', 50)");

  app = express();
  app.use(express.json());
  app.use('/shops', require('../../modules/ecommerce/routes/shop.routes'));
});

afterAll(cleanup);

test('a shop page loads, without the shop\'s bank details or commission terms', async () => {
  const res = await request(app).get('/shops/sdr-near');
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ id: 'sdr-near', name: 'Near Shop' });
  expect(res.body).toHaveProperty('category_details');
  expect(res.body).not.toHaveProperty('bank_account');
  expect(res.body).not.toHaveProperty('commission_override_percent');
  expect(res.body).not.toHaveProperty('registration_metadata');
});

test('a closed or unknown shop is not found', async () => {
  expect((await request(app).get('/shops/sdr-closed')).status).toBe(404);
  expect((await request(app).get('/shops/no-such-shop')).status).toBe(404);
});

test('literal paths are still matched before the shop id', async () => {
  const categories = await request(app).get('/shops/categories');
  expect(categories.status).toBe(200);
  expect(categories.body.error).toBeUndefined();
});

test('nearby is by distance with a location, and says so without one', async () => {
  const located = await request(app).get('/shops/nearby').query({ lat: 18.531, lng: 73.871, radius: 5 });
  expect(located.status).toBe(200);
  const ids = located.body.shops.map((s) => s.id);
  expect(ids).toContain('sdr-near');
  expect(ids).not.toContain('sdr-far');
  expect(ids).not.toContain('sdr-closed');
  expect(located.body.shops.find((s) => s.id === 'sdr-near').distance_km).toBeLessThan(1);
  expect(located.body.fallbackUsed).toBe(false);
  expect(located.body.shops[0]).not.toHaveProperty('bank_account');

  const anywhere = await request(app).get('/shops/nearby');
  expect(anywhere.body).toMatchObject({ fallbackUsed: true, userLocation: null });
  expect(anywhere.body.shops.map((s) => s.id)).toEqual(expect.arrayContaining(['sdr-near', 'sdr-far']));
});

test('the owner gets their own shop and its catalogue; others get nothing', async () => {
  const mine = await request(app).get('/shops/my-shop').set(as(OWNER));
  expect(mine.status).toBe(200);
  expect(mine.body.shop.id).toBeDefined();
  expect(Array.isArray(mine.body.products)).toBe(true);

  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ('sdr-nobody', 'Nobody', '9860700002', 'user')");
  expect((await request(app).get('/shops/my-shop').set(as('sdr-nobody'))).status).toBe(404);
  expect((await request(app).get('/shops/my-shop')).status).toBe(401);
});
