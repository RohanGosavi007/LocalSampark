/**
 * PUT /auth/switch-role.
 *
 * This endpoint wrote whatever role the request named onto the caller's own
 * account and returned a signed token for it. Only "shop_owner" was checked.
 * `{ "targetRole": "super_admin" }` from any signed-in account produced a
 * super administrator.
 */


const { fx, fxLike } = require('../helpers/fixtureIds');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const CITIZEN = fx('swr-citizen');
const OWNER = fx('swr-owner');
const STAFF = fx('swr-staff');

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
const roleOf = async (id) => (await queryOne('SELECT role FROM users WHERE id = $1', [id])).role;

let app;

async function cleanup() {
  await query(`DELETE FROM local_shops WHERE id = '${fx('swr-shop')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('swr')}'`);
}

beforeAll(async () => {
  await cleanup();
  for (const [id, phone, role] of [[CITIZEN, '9888000001', 'user'], [OWNER, '9888000002', 'user'], [STAFF, '9888000003', 'admin']]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, `SWR ${id}`, phone, role]);
  }
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude)
     VALUES ('${fx('swr-shop')}', $1, 'SWR Shop', 'Grocery', 'Test Address', 'POINT(73.87 18.53)', 18.53, 73.87)`,
    [OWNER]
  );

  app = express();
  app.use(express.json());
  app.use('/auth', require('../../modules/core/routes/auth.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use(require('../../middleware/error.middleware').errorHandler);
});

afterAll(cleanup);

const switchTo = (userId, targetRole) => request(app).put('/auth/switch-role').set(as(userId)).send({ targetRole });

test('no account can make itself an administrator', async () => {
  for (const role of ['super_admin', 'SUPER_ADMIN', 'admin', 'territory_admin', 'moderator', 'society_admin', 'franchise_owner', 'support_admin']) {
    for (const who of [CITIZEN, OWNER]) {
      const res = await switchTo(who, role);
      expect(res.status).toBe(403);
      expect(res.body.accessToken).toBeUndefined();
    }
  }
  expect(await roleOf(CITIZEN)).toBe('user');
  expect(await roleOf(OWNER)).toBe('user');
});

test('a role is switched to only by an account that holds it', async () => {
  expect((await switchTo(CITIZEN, 'shop_owner')).status).toBe(403);
  expect((await switchTo(CITIZEN, 'delivery_agent')).status).toBe(403);

  const res = await switchTo(OWNER, 'shop_owner');
  expect(res.status).toBe(200);
  expect(res.body.role).toBe('shop_owner');
  expect(await roleOf(OWNER)).toBe('shop_owner');
  const claims = jwt.verify(res.body.accessToken, getJwtSecret());
  expect(String(claims.role).toLowerCase()).toBe('shop_owner');

  // And back again.
  expect((await switchTo(OWNER, 'user')).status).toBe(200);
  expect(await roleOf(OWNER)).toBe('user');
});

test('an administrator\'s role is not changed from here', async () => {
  const res = await switchTo(STAFF, 'user');
  expect(res.status).toBe(403);
  expect(await roleOf(STAFF)).toBe('admin');
});

test('needs a session and a target', async () => {
  expect((await request(app).put('/auth/switch-role').send({ targetRole: 'user' })).status).toBe(401);
  expect((await switchTo(CITIZEN, '')).status).toBe(400);
});
