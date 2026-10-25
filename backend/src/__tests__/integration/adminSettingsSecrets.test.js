/**
 * Admin settings never hold, or hand out, a secret — and the table-status
 * update binds its values instead of splicing them into SQL.
 */

process.env.USE_SQLITE = 'true';

const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const SUPER = 'ass-super';
const TIER = 'ass-territory';
const OWNER = 'ass-owner';
const SHOP = 'ass-shop';

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });

let app;

async function cleanup() {
  await query("DELETE FROM restaurant_tables WHERE shop_id = 'ass-shop'");
  await query("DELETE FROM local_shops WHERE id = 'ass-shop'");
  await query("DELETE FROM admin_roles WHERE user_id LIKE 'ass-%'");
  await query("DELETE FROM admin_config WHERE config_key LIKE 'api_key_%'");
  await query("DELETE FROM users WHERE id LIKE 'ass-%'");
}

beforeAll(async () => {
  await cleanup();
  for (const [id, phone, role] of [[SUPER, '9811500001', 'super_admin'], [TIER, '9811500002', 'user'], [OWNER, '9811500003', 'shop_owner']]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, `ASS ${id}`, phone, role]);
  }
  // An administrative tier below super admin.
  await query(
    "INSERT INTO admin_roles (id, user_id, role, permissions, is_active) VALUES ('ass-role', $1, 'territory_admin', '{}', '1')",
    [TIER]
  );
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, is_verified)
     VALUES ($1, $2, 'ASS Cafe', 'Restaurant', 'Test Address', 'POINT(73.87 18.53)', 18.53, 73.87, '1')`,
    [SHOP, OWNER]
  );
  await query("INSERT INTO restaurant_tables (id, shop_id, table_number, status) VALUES ('ass-table-1', $1, '1', 'available')", [SHOP]);
  await query("INSERT INTO restaurant_tables (id, shop_id, table_number, status) VALUES ('ass-table-2', $1, '2', 'available')", [SHOP]);

  app = express();
  app.use(express.json());
  app.use('/admin', require('../../modules/crm/routes/admin.routes'));
  app.use('/shops', require('../../modules/ecommerce/routes/shop.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(err.statusCode || 500).json({ error: err.message }));
});

afterAll(cleanup);

describe('admin settings', () => {
  test('report whether an integration is configured, never its secret', async () => {
    const saved = { id: process.env.RAZORPAY_KEY_ID, secret: process.env.RAZORPAY_KEY_SECRET };
    process.env.RAZORPAY_KEY_ID = 'rzp_test_settingsPage';
    process.env.RAZORPAY_KEY_SECRET = 'do-not-send-this-anywhere';
    try {
      const res = await request(app).get('/admin/settings').set(as(SUPER));
      expect(res.status).toBe(200);
      expect(res.body.data.integrations.razorpay).toEqual(expect.objectContaining({ configured: true, keyId: 'rzp_test_settingsPage' }));
      const text = JSON.stringify(res.body);
      expect(text).not.toContain('do-not-send-this-anywhere');
      expect(text).not.toContain('api_key_');
    } finally {
      for (const [key, value] of [['RAZORPAY_KEY_ID', saved.id], ['RAZORPAY_KEY_SECRET', saved.secret]]) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
    }
  });

  test('do not accept an API key', async () => {
    const res = await request(app).put('/admin/settings').set(as(SUPER)).send({ api_key_razorpay: 'rzp_live_typedIntoAPage' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('KEYS_ARE_ENVIRONMENT_ONLY');
    expect(await queryOne("SELECT config_key FROM admin_config WHERE config_key = 'api_key_razorpay'")).toBeNull();
  });

  test('are changed by a super administrator, not by every administrative tier', async () => {
    expect((await request(app).put('/admin/settings').set(as(TIER)).send({ maintenance_mode: 'true' })).status).toBe(403);
    expect((await request(app).put('/admin/settings').set(as(SUPER)).send({ default_language: 'DROP TABLE' })).status).toBe(400);

    const ok = await request(app).put('/admin/settings').set(as(SUPER)).send({ pause_registrations: 'true' });
    expect(ok.status).toBe(200);
    expect((await request(app).get('/admin/settings').set(as(SUPER))).body.data.pause_registrations).toBe('true');
    await request(app).put('/admin/settings').set(as(SUPER)).send({ pause_registrations: 'false' });
  });

  test('no encryption key is written into the source', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../modules/crm/controllers/admin-settings.controller.js'), 'utf8');
    expect(source).not.toMatch(/scryptSync\(\s*['"]/);
    expect(source).not.toMatch(/createCipheriv/);
  });
});

describe('restaurant table status', () => {
  const setStatus = (body, table = 'ass-table-1') => request(app).put(`/shops/my-shop/tables/${table}`).set(as(OWNER)).send(body);

  test('a status is one of the table states, and nothing else reaches the statement', async () => {
    // The value used to be placed between quotes in the SQL text.
    const injected = await setStatus({ status: "available', table_number = 'pwned" });
    expect(injected.status).toBe(400);
    expect((await queryOne("SELECT table_number FROM restaurant_tables WHERE id = 'ass-table-1'")).table_number).toBe('1');

    const viaOrder = await setStatus({ status: 'occupied', currentOrderId: "x', status = 'reserved" });
    expect(viaOrder.status).toBe(200);
    const row = await queryOne("SELECT status, current_order_id FROM restaurant_tables WHERE id = 'ass-table-1'");
    expect(row.status).toBe('occupied');
    expect(row.current_order_id).toBe("x', status = 'reserved");
    // And the other table was not touched.
    expect((await queryOne("SELECT status FROM restaurant_tables WHERE id = 'ass-table-2'")).status).toBe('available');
  });

  test('freeing a table clears its order', async () => {
    const res = await setStatus({ status: 'available' });
    expect(res.status).toBe(200);
    expect(res.body.table).toEqual(expect.objectContaining({ status: 'available', current_order_id: null, occupied_at: null }));
  });
});
