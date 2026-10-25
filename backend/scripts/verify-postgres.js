#!/usr/bin/env node
/**
 * Build the schema on a real PostgreSQL and exercise the application against it.
 *
 *   PG_VERIFY_URL=postgresql://user:pass@host:5432/dbname node scripts/verify-postgres.js
 *
 * Everything else in this repository that speaks about PostgreSQL is reading
 * migration files. This runs them. It exists because production is PostgreSQL
 * while the test suite, and every developer, is on SQLite — so the production
 * schema had never once been constructed before a deploy, and a fresh one
 * turned out to be missing the columns and tables that registration and admin
 * login need.
 *
 * What it does, in order, stopping at the first step that cannot continue:
 *
 *   1. connects, and refuses to go on unless the database is EMPTY
 *   2. runs the migrations, then runs them again to confirm the second run
 *      applies nothing
 *   3. compares the real catalog with scripts/pg-schema-model.js, so the model
 *      the contract tests rely on is itself checked against a database
 *   4. checks the specific gaps that were found by reading: the auth tables,
 *      users.password_hash, generated ids on text primary keys
 *   5. seeds twice (default seed, then the demo seed) and confirms nothing is
 *      duplicated
 *   6. drives the main flows through the real route handlers — register a
 *      shop, add a product, list nearby zones, publish a listing, offer a
 *      ride, post to the feed, provision an admin and sign in as one
 *
 * THE DATABASE MUST BE DISPOSABLE. Step 2 creates several hundred tables and
 * step 5 inserts demo accounts. The emptiness check in step 1 is there so that
 * pointing this at a database with real data in it stops before any of that;
 * --allow-existing overrides it, for re-running against the same scratch
 * database, and should never be used on anything else.
 *
 * The URL is read from PG_VERIFY_URL rather than DATABASE_URL on purpose:
 * backend/.env already defines DATABASE_URL for something else, and a script
 * that migrates whatever that happens to point at is a script that will one
 * day migrate the wrong database.
 *
 * Why not just run the Jest suite against PostgreSQL: the suite's fixtures use
 * readable ids such as 'test-owner-0001', which SQLite's text keys accept and
 * PostgreSQL's UUID keys reject. Making the suite portable is its own piece of
 * work; this script uses real UUIDs throughout and covers the flows directly.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * PG_VERIFY_URL from the environment, or from backend/.env.verify.local — one
 * line, `PG_VERIFY_URL=postgresql://…`. The file is covered by the
 * `.env.*.local` rule in .gitignore, so the password in the URL does not have
 * to be typed into a shell history or pasted anywhere it might be kept.
 */
function verifyUrl() {
  if (process.env.PG_VERIFY_URL) return process.env.PG_VERIFY_URL;
  const file = path.resolve(__dirname, '..', '.env.verify.local');
  if (!fs.existsSync(file)) return null;
  const line = fs.readFileSync(file, 'utf8').split(/\r?\n/).find((l) => /^\s*PG_VERIFY_URL\s*=/.test(l));
  return line ? line.replace(/^\s*PG_VERIFY_URL\s*=\s*/, '').trim().replace(/^["']|["']$/g, '') : null;
}

const url = verifyUrl();
const allowExisting = process.argv.includes('--allow-existing');
const keep = process.argv.includes('--keep');

if (!url) {
  console.error(
    'PG_VERIFY_URL is not set.\n\n' +
    'Either put one line in backend/.env.verify.local (git-ignored):\n' +
    '  PG_VERIFY_URL=postgresql://user:pass@host:5432/db\n' +
    'or pass it in the environment:\n' +
    '  PG_VERIFY_URL=postgresql://user:pass@host:5432/db node scripts/verify-postgres.js\n'
  );
  process.exit(2);
}

// Set before config/database is loaded: it chooses its engine at require time.
process.env.USE_SQLITE = 'false';
process.env.DATABASE_URL = url;
delete process.env.DIRECT_URL;
// Hosted databases (Render, Neon, Supabase) require TLS and present a
// certificate chain Node does not have a root for.
if (!process.env.DB_SSL && !/localhost|127\.0\.0\.1/.test(url)) process.env.DB_SSL_REJECT_UNAUTHORIZED = 'false';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'verify-postgres-not-a-real-secret';
process.env.NODE_ENV = 'test';

const results = [];
const pass = (name, detail = '') => { results.push({ ok: true, name }); console.log(`  ✓ ${name}${detail ? '  ' + detail : ''}`); };
const fail = (name, detail) => { results.push({ ok: false, name, detail }); console.log(`  ✗ ${name}\n      ${String(detail).split('\n')[0]}`); };

async function step(name, fn) {
  try {
    const detail = await fn();
    pass(name, typeof detail === 'string' ? detail : '');
    return true;
  } catch (err) {
    fail(name, err.message);
    return false;
  }
}

function describeTarget() {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.port ? ':' + u.port : ''}${u.pathname}`;
  } catch {
    return '(unparseable URL)';
  }
}

async function main() {
  console.log(`\nPostgreSQL verification against ${describeTarget()}\n`);

  const db = require('../src/config/database');
  const { query, queryOne, connectDB } = db;

  // ── 1. connect, and make sure this is a scratch database ─────────────────
  console.log('1. Connection');
  if (!(await step('connects', async () => { await connectDB(); const v = await queryOne('SELECT version() AS v'); return v.v.split(',')[0]; }))) return finish();

  const existing = await queryOne(
    "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
  );
  const tableCount = Number(existing.n);
  if (tableCount > 0 && !allowExisting) {
    fail('database is empty', `it already has ${tableCount} table(s). This script migrates and seeds; point it at an empty database, or pass --allow-existing to re-run against a scratch one.`);
    return finish();
  }
  pass(tableCount === 0 ? 'database is empty' : `database has ${tableCount} tables (--allow-existing)`);

  await step('PostGIS is available', async () => {
    const row = await queryOne("SELECT 1 AS ok FROM pg_available_extensions WHERE name = 'postgis'");
    if (!row) throw new Error('the postgis extension is not available on this server; init.sql requires it');
  });

  // ── 2. migrations ────────────────────────────────────────────────────────
  console.log('\n2. Migrations');
  const { runMigration } = require('../src/migrations/run');
  const quiet = async (fn) => {
    const log = console.log; const warn = console.warn; const lines = [];
    console.log = (...a) => lines.push(a.join(' ')); console.warn = (...a) => lines.push(a.join(' '));
    try { await fn(); } finally { console.log = log; console.warn = warn; }
    return lines;
  };

  let firstRun = [];
  if (!(await step('first run applies every migration', async () => {
    firstRun = await quiet(runMigration);
    const notice = firstRun.find((l) => /Base schema initialization notice/.test(l));
    if (notice) throw new Error(notice);
    return `${firstRun.filter((l) => /applied /.test(l)).length} applied`;
  }))) return finish();

  await step('second run applies nothing', async () => {
    const second = await quiet(runMigration);
    const applied = second.filter((l) => /Applying /.test(l));
    if (applied.length) throw new Error(`re-applied: ${applied.join('; ')}`);
  });

  // ── 3. the model against the catalog ─────────────────────────────────────
  console.log('\n3. Schema model vs. the real catalog');
  const { buildPgModel } = require('./pg-schema-model');
  const model = buildPgModel().tables;
  const actualRows = (await query(
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'"
  )).rows;
  const actual = {};
  for (const r of actualRows) (actual[r.table_name] = actual[r.table_name] || new Set()).add(r.column_name);
  const system = new Set(['schema_migrations', 'spatial_ref_sys', 'geography_columns', 'geometry_columns']);

  await step('every modelled table exists', async () => {
    const missing = Object.keys(model).filter((t) => !actual[t]);
    if (missing.length) throw new Error(`${missing.length} missing: ${missing.slice(0, 12).join(', ')}`);
    return `${Object.keys(model).length} tables`;
  });
  await step('no table exists that the model does not know', async () => {
    const extra = Object.keys(actual).filter((t) => !model[t] && !system.has(t));
    if (extra.length) throw new Error(`${extra.length} unmodelled: ${extra.slice(0, 12).join(', ')}`);
  });
  await step('every modelled column exists', async () => {
    const missing = [];
    for (const [t, def] of Object.entries(model)) {
      if (!actual[t]) continue;
      for (const c of def.cols) if (!actual[t].has(c.name)) missing.push(`${t}.${c.name}`);
    }
    if (missing.length) throw new Error(`${missing.length} missing: ${missing.slice(0, 12).join(', ')}`);
  });
  await step('no column exists that the model does not know', async () => {
    const extra = [];
    for (const [t, cols] of Object.entries(actual)) {
      if (!model[t]) continue;
      const known = new Set(model[t].cols.map((c) => c.name));
      for (const c of cols) if (!known.has(c)) extra.push(`${t}.${c}`);
    }
    if (extra.length) throw new Error(`${extra.length} unmodelled: ${extra.slice(0, 12).join(', ')}`);
  });

  // ── 4. the gaps found by reading ─────────────────────────────────────────
  console.log('\n4. Known gaps');
  for (const table of ['admin_ip_allowlist', 'admin_pins', 'password_reset_tokens', 'email_verification_tokens']) {
    await step(`table ${table} exists`, async () => { if (!actual[table]) throw new Error('missing'); });
  }
  await step('users.password_hash exists', async () => { if (!actual.users || !actual.users.has('password_hash')) throw new Error('missing'); });
  await step('every text primary key named id has a default', async () => {
    const rows = (await query(`
      SELECT c.table_name
        FROM information_schema.columns c
        JOIN information_schema.table_constraints tc
          ON tc.table_schema = c.table_schema AND tc.table_name = c.table_name AND tc.constraint_type = 'PRIMARY KEY'
        JOIN information_schema.key_column_usage k
          ON k.constraint_schema = tc.constraint_schema AND k.constraint_name = tc.constraint_name AND k.column_name = c.column_name
       WHERE c.table_schema = 'public' AND c.column_name = 'id'
         AND c.data_type IN ('text', 'character varying') AND c.column_default IS NULL
         AND (SELECT COUNT(*) FROM information_schema.key_column_usage k2
               WHERE k2.constraint_schema = tc.constraint_schema AND k2.constraint_name = tc.constraint_name) = 1`)).rows;
    if (rows.length) throw new Error(`${rows.length} without: ${rows.slice(0, 10).map((r) => r.table_name).join(', ')}`);
  });

  // ── 5. seeds ─────────────────────────────────────────────────────────────
  console.log('\n5. Seeds');
  const { runSeed } = require('../src/seeds/run');
  await step('default seed runs', async () => { const c = await runSeed({ demo: true }); return `${c.created} rows created`; });
  await step('default seed is idempotent', async () => {
    const c = await runSeed({ demo: true });
    if (c.created !== 0) throw new Error(`second run created ${c.created}: ${c.createdRows.slice(0, 5).join(', ')}`);
  });

  // ── 6. the main flows, through the real handlers ─────────────────────────
  console.log('\n6. Application flows');
  const express = require('express');
  const request = require('supertest');
  const jwt = require('jsonwebtoken');
  const { getJwtSecret } = require('../src/config/secrets');

  const app = express();
  app.use(express.json());
  app.use('/shops', require('../src/modules/ecommerce/routes/shop.routes'));
  app.use('/zones', require('../src/modules/core/routes/zone.routes'));
  app.use('/marketplace', require('../src/modules/ecommerce/routes/marketplace.routes'));
  app.use('/carpool', require('../src/modules/services/routes/carpool.routes'));
  app.use('/feed', require('../src/modules/community/routes/feed.routes'));
  app.use('/campaigns', require('../src/modules/crm/routes/campaigns.routes'));
  app.use('/admin-auth', require('../src/modules/crm/routes/admin-auth.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

  const region = await queryOne("SELECT id FROM regions WHERE name = 'Dhanori'");
  const ownerId = crypto.randomUUID();
  const buyerId = crypto.randomUUID();
  const made = { users: [ownerId, buyerId], shops: [], listings: [], rides: [], posts: [] };
  const phone = () => `+9198${String(crypto.randomInt(10000000, 99999999))}`;

  await step('create two users', async () => {
    for (const [id, name, role] of [[ownerId, 'Verify Owner', 'shop_owner'], [buyerId, 'Verify Buyer', 'user']]) {
      await query(
        "INSERT INTO users (id, phone_number, full_name, role, is_verified, is_active, region_id) VALUES ($1, $2, $3, $4, '1', '1', $5)",
        [id, phone(), name, role, region ? region.id : null]
      );
    }
    await query('INSERT INTO wallets (id, user_id, balance) VALUES ($1, $2, 1000)', [crypto.randomUUID(), ownerId]);
  });

  const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '10m' })}` });
  const expectStatus = (res, wanted) => {
    if (res.status !== wanted) throw new Error(`HTTP ${res.status}: ${JSON.stringify(res.body).slice(0, 200)}`);
  };

  let shopId;
  await step('POST /shops/register', async () => {
    const category = await queryOne('SELECT id FROM shop_categories LIMIT 1');
    const res = await request(app).post('/shops/register').set(as(ownerId)).send({
      name: 'Verify Kirana', address: '1 Test Road, Pune', latitude: 18.5786, longitude: 73.8967,
      phoneNumber: '9822001122', category_id: category.id,
    });
    expectStatus(res, 201);
    shopId = res.body.id; made.shops.push(shopId);
  });
  await step('POST /shops/:id/products', async () => {
    const res = await request(app).post(`/shops/${shopId}/products`).set(as(ownerId)).send({ name: 'Verify Milk', price: 56 });
    expectStatus(res, 201);
  });
  await step('POST /shops/:id/services refuses a non-owner', async () => {
    const res = await request(app).post(`/shops/${shopId}/services`).set(as(buyerId)).send({ name: 'Nope', price: 1 });
    expectStatus(res, 403);
  });
  await step('GET /zones/nearby', async () => {
    const res = await request(app).get('/zones/nearby?lat=18.58&lng=73.89');
    expectStatus(res, 200);
    if (!res.body.data.length) throw new Error('no zones returned');
    return `${res.body.data[0].name} at ${res.body.data[0].distance_km} km`;
  });
  await step('POST /marketplace (listing without coordinates)', async () => {
    const res = await request(app).post('/marketplace').set(as(ownerId)).send({ title: 'Verify cycle', price: 2500, category: 'Sports' });
    expectStatus(res, 201);
    made.listings.push(res.body.listingId);
  });
  await step('POST /carpool/rides', async () => {
    const res = await request(app).post('/carpool/rides').set(as(ownerId)).send({
      from_location: 'Dhanori', to_location: 'Hinjewadi', departure_time: '08:45', seats_available: 3,
      from_lat: 18.5913, from_lng: 73.8987, to_lat: 18.5912, to_lng: 73.7389,
    });
    expectStatus(res, 201);
    made.rides.push(res.body.rideId);
  });
  await step('POST /feed/posts', async () => {
    const res = await request(app).post('/feed/posts').set(as(buyerId)).send({ content: 'verify-postgres post', latitude: 18.58, longitude: 73.89 });
    if (res.status !== 200 && res.status !== 201) expectStatus(res, 201);
    const row = await queryOne("SELECT id FROM posts WHERE content = 'verify-postgres post' ORDER BY created_at DESC LIMIT 1");
    if (row) made.posts.push(row.id);
  });
  await step('POST /campaigns/purchase charges the owner', async () => {
    const res = await request(app).post('/campaigns/purchase').set(as(ownerId)).send({ shop_id: shopId, budget_amount: 200 });
    expectStatus(res, 201);
    const wallet = await queryOne('SELECT balance FROM wallets WHERE user_id = $1', [ownerId]);
    if (Number(wallet.balance) !== 800) throw new Error(`wallet balance is ${wallet.balance}, expected 800`);
  });
  await step('shop analytics dashboard', async () => {
    const analytics = require('../src/services/shopAnalytics.service');
    const shop = await queryOne('SELECT category, region_id FROM local_shops WHERE id = $1', [shopId]);
    const out = await analytics.getFullDashboard(shopId, shop);
    if (!out.revenue || !out.peakHours) throw new Error('incomplete dashboard');
  });

  const adminPhone = phone();
  await step('provision an admin and sign in (production rules)', async () => {
    const { provisionAdmin } = require('./provision-admin');
    await provisionAdmin({ phone: adminPhone, name: 'Verify Admin', pin: '482915' });
    const admin = await queryOne('SELECT id FROM users WHERE phone_number = $1', [adminPhone]);
    made.users.push(admin.id);

    const otpStore = require('../src/modules/core/services/otpStore.service');
    await otpStore.setOtp(`otp:${adminPhone}`, '774411');
    const reason = otpStore.unavailableReason;
    otpStore.unavailableReason = () => null;
    process.env.NODE_ENV = 'production';
    try {
      const res = await request(app).post('/admin-auth/login').send({ phoneNumber: adminPhone, pin: '482915', otp: '774411' });
      expectStatus(res, 200);
      if (!res.body.accessToken) throw new Error('no access token returned');
    } finally {
      process.env.NODE_ENV = 'test';
      otpStore.unavailableReason = reason;
    }
  });

  // ── clean up what step 6 made (the seed is left: it is idempotent) ───────
  if (!keep) {
    const del = async (sql, params) => { try { await query(sql, params); } catch { /* reported by the next run if it matters */ } };
    for (const id of made.posts) await del('DELETE FROM posts WHERE id = $1', [id]);
    for (const id of made.rides) await del('DELETE FROM carpool_rides WHERE id = $1', [id]);
    for (const id of made.listings) await del('DELETE FROM marketplace_listings WHERE id = $1', [id]);
    for (const id of made.shops) {
      await del('DELETE FROM ad_campaigns WHERE shop_id = $1', [id]);
      await del('DELETE FROM shop_qr_codes WHERE shop_id = $1', [id]);
      await del('DELETE FROM shop_products WHERE shop_id = $1', [id]);
      await del('DELETE FROM local_shops WHERE id = $1', [id]);
    }
    for (const id of made.users) {
      await del('DELETE FROM admin_pins WHERE user_id = $1', [id]);
      await del('DELETE FROM admin_roles WHERE user_id = $1', [id]);
      await del('DELETE FROM admin_audit_log WHERE admin_id = $1', [id]);
      await del('DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = $1)', [id]);
      await del('DELETE FROM wallets WHERE user_id = $1', [id]);
      await del('DELETE FROM users WHERE id = $1', [id]);
    }
  }

  return finish();
}

function finish() {
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed.`);
  if (failed.length) {
    console.log('\nFailures:');
    for (const f of failed) console.log(`  - ${f.name}: ${String(f.detail).split('\n')[0]}`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error('\nverify-postgres stopped: ' + err.message);
  process.exit(1);
});
