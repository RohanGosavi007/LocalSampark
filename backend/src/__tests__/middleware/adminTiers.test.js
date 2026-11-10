/**
 * Who counts as an administrator.
 *
 * requireAdmin admitted any admin_roles grant and gave one with no permissions
 * {"all": true}, so a moderator grant made its holder a full administrator.
 * Now: ADMIN and SUPER_ADMIN are administrators; any other grant is scoped
 * staff, admitted by requireStaff and limited by requirePermission to what the
 * grant lists.
 */


const { fx, fxLike } = require('../helpers/fixtureIds');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const { authenticate, requireAdmin, requireStaff, requireSuperAdmin } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/rbac.middleware');

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;

async function cleanup() {
  await query(`DELETE FROM admin_roles WHERE CAST(user_id AS TEXT) LIKE '${fxLike('tier')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('tier')}'`);
}

beforeAll(async () => {
  await cleanup();
  for (const [id, phone, role] of [
    [fx('tier-admin'), '9850600001', 'admin'], [fx('tier-super'), '9850600002', 'super_admin'],
    [fx('tier-mod'), '9850600003', 'user'], [fx('tier-finance'), '9850600004', 'user'], [fx('tier-user'), '9850600005', 'user'],
  ]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $4, $2, $3)', [id, phone, role, id]);
  }
  await query(`INSERT INTO admin_roles (id, user_id, role) VALUES ('${fx('tier-g1')}', '${fx('tier-mod')}', 'moderator')`);
  await query(`INSERT INTO admin_roles (id, user_id, role, permissions) VALUES ('${fx('tier-g2')}', '${fx('tier-finance')}', 'finance', '{"finance": ["read"]}')`);

  app = express();
  app.get('/admin-only', authenticate, requireAdmin, (req, res) => res.json({ ok: true }));
  app.get('/super-only', authenticate, requireAdmin, requireSuperAdmin, (req, res) => res.json({ ok: true }));
  app.get('/finance-read', authenticate, requireStaff, requirePermission('finance', 'read'), (req, res) => res.json({ ok: true }));
  app.get('/finance-write', authenticate, requireStaff, requirePermission('finance', 'write'), (req, res) => res.json({ ok: true }));
});

afterAll(cleanup);

const status = async (path, who) => (await request(app).get(path).set(as(who))).status;

test('administrators are admins; a moderator grant is not', async () => {
  expect(await status('/admin-only', fx('tier-admin'))).toBe(200);
  expect(await status('/admin-only', fx('tier-super'))).toBe(200);
  expect(await status('/admin-only', fx('tier-mod'))).toBe(403);
  expect(await status('/admin-only', fx('tier-finance'))).toBe(403);
  expect(await status('/admin-only', fx('tier-user'))).toBe(403);
});

test('only a super admin passes the super-admin gate', async () => {
  expect(await status('/super-only', fx('tier-super'))).toBe(200);
  expect(await status('/super-only', fx('tier-admin'))).toBe(403);
});

test('scoped staff can do exactly what their grant lists', async () => {
  expect(await status('/finance-read', fx('tier-finance'))).toBe(200);
  expect(await status('/finance-write', fx('tier-finance'))).toBe(403);
  // A grant with no permissions has none.
  expect(await status('/finance-read', fx('tier-mod'))).toBe(403);
  expect(await status('/finance-read', fx('tier-user'))).toBe(403);
  // Administrators keep everything.
  expect(await status('/finance-write', fx('tier-admin'))).toBe(200);
});
