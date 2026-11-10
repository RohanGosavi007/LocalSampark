/**
 * Admin lists are bounded and filterable on the server.
 *
 *   GET /admin/shops   ignored ?limit and returned every shop
 *   GET /admin/audit   was a fixed LIMIT 100 with no way to see older entries
 *   GET /admin/community/posts  filtered on an alias (invalid in PostgreSQL)
 */


const { fx, fxLike } = require('../helpers/fixtureIds');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const ADMIN = fx('apg-admin');
const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId, tokenVersion: 0 }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;

async function cleanup() {
  await query(`DELETE FROM community_posts WHERE CAST(id AS TEXT) LIKE '${fxLike('apg')}'`);
  await query(`DELETE FROM admin_audit_log WHERE admin_id = '${fx('apg-admin')}'`);
  await query(`DELETE FROM local_shops WHERE CAST(id AS TEXT) LIKE '${fxLike('apg')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('apg')}'`);
}

beforeAll(async () => {
  await cleanup();
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'Pager Admin', '9863000001', 'super_admin')", [ADMIN]);
  for (let i = 1; i <= 7; i += 1) {
    await query(
      `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, is_active, approval_status)
       VALUES ($1, $2, $3, $4, 'Road 1', 'POINT(73.8 18.5)', 18.5, 73.8, '1', $5)`,
      [fx(`apg-s${i}`), ADMIN, `Pager Shop ${i}`, i % 2 ? 'Grocery' : 'Salon', i <= 3 ? 'pending' : 'approved']
    );
  }
  for (let i = 1; i <= 5; i += 1) {
    await query("INSERT INTO admin_audit_log (admin_id, admin_name, action, target_type) VALUES ($1, 'Pager Admin', $2, 'user')", [ADMIN, i % 2 ? 'ban_user' : 'update_user_role']);
  }
  await query(`INSERT INTO community_posts (id, author_id, author_name, type, content) VALUES ('${fx('apg-p1')}', $1, 'Pager', 'alert', 'a')`, [ADMIN]);
  await query(`INSERT INTO community_posts (id, author_id, author_name, type, content) VALUES ('${fx('apg-p2')}', $1, 'Pager', 'general', 'b')`, [ADMIN]);

  app = express();
  app.use(express.json());
  app.use('/admin', require('../../modules/crm/routes/admin.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use(require('../../middleware/error.middleware').errorHandler);
});

afterAll(cleanup);

describe('GET /admin/shops', () => {
  test('is paged, with a total', async () => {
    const p1 = await request(app).get('/admin/shops?search=Pager Shop&limit=3&page=1').set(as(ADMIN));
    expect(p1.status).toBe(200);
    expect(p1.body.total).toBe(7);
    expect(p1.body.shops).toHaveLength(3);
    const p3 = await request(app).get('/admin/shops?search=Pager Shop&limit=3&page=3').set(as(ADMIN));
    expect(p3.body.shops).toHaveLength(1);
    const ids = new Set([...p1.body.shops, ...p3.body.shops].map((s) => s.id));
    expect(ids.size).toBe(4); // no overlap between pages
  });

  test('filters by status and category', async () => {
    const pending = await request(app).get('/admin/shops?search=Pager Shop&status=pending').set(as(ADMIN));
    expect(pending.body.total).toBe(3);
    const salons = await request(app).get('/admin/shops?search=Pager Shop&category=salon').set(as(ADMIN));
    expect(salons.body.total).toBe(3);
  });

  test('search treats % and _ literally and the limit is capped', async () => {
    const wild = await request(app).get('/admin/shops?search=%25').set(as(ADMIN));
    expect(wild.body.total).toBe(0);
    const huge = await request(app).get('/admin/shops?limit=99999').set(as(ADMIN));
    expect(huge.body.limit).toBe(200);
  });
});

describe('GET /admin/audit', () => {
  test('pages and filters by action', async () => {
    const all = await request(app).get('/admin/audit?q=ban_user').set(as(ADMIN));
    expect(all.status).toBe(200);
    expect(all.body.rows.every((r) => r.action === 'ban_user')).toBe(true);
    expect(all.body.total).toBeGreaterThanOrEqual(3);
    const one = await request(app).get('/admin/audit?limit=1&page=2').set(as(ADMIN));
    expect(one.body.rows).toHaveLength(1);
    expect(one.body.page).toBe(2);
  });
});

describe('GET /admin/community/posts', () => {
  test('filters by category', async () => {
    const res = await request(app).get('/admin/community/posts?category=alert&limit=500').set(as(ADMIN));
    expect(res.status).toBe(200);
    const mine = res.body.posts.filter((p) => p.id.startsWith(fxLike('apg').replace('%', '')));
    expect(mine.map((p) => p.id)).toEqual([fx('apg-p1')]);
  });
});

describe('GET /admin/users', () => {
  beforeAll(async () => {
    await query(`INSERT INTO users (id, full_name, phone_number, email, role) VALUES ('${fx('apg-u1')}', 'Zed Findable', '9863000002', 'zed@example.test', 'user')`);
  });

  test('answers with users and a total the console reads, and searches name/phone/email', async () => {
    const byName = await request(app).get('/admin/users?search=Findable').set(as(ADMIN));
    expect(byName.body.error).toBeUndefined(); expect(byName.status).toBe(200);
    expect(byName.body.users.map((u) => u.id)).toEqual([fx('apg-u1')]);
    expect(byName.body.total).toBe(1);
    expect(byName.body.users[0].phone_number).toBe('9863000002');

    const byEmail = await request(app).get('/admin/users?search=zed@example').set(as(ADMIN));
    expect(byEmail.body.total).toBe(1);
    const byPhone = await request(app).get('/admin/users?search=9863000002').set(as(ADMIN));
    expect(byPhone.body.total).toBe(1);
  });

  test('the page size is capped', async () => {
    const res = await request(app).get('/admin/users?limit=100000').set(as(ADMIN));
    expect(res.body.limit).toBe(200);
  });
});

describe('console list endpoints that used to be missing', () => {
  test.each([
    ['/admin/crm/leads', 'data'],
    ['/admin/events', 'events'],
    ['/admin/marketplace/products', 'data'],
    ['/admin/medical/records', 'data'],
    ['/admin/properties', 'properties'],
    ['/admin/sos/active', 'data'],
    ['/admin/wallet/transactions/all', 'data'],
  ])('%s answers a paged list', async (url, key) => {
    const res = await request(app).get(`${url}?search=zzz-nothing&limit=5`).set(as(ADMIN));
    expect(res.body.error).toBeUndefined();
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body[key])).toBe(true);
    expect(res.body.total).toBe(0);
    const all = await request(app).get(`${url}?limit=5`).set(as(ADMIN));
    expect(all.status).toBe(200);
    expect(all.body.limit).toBe(5);
  });
});
