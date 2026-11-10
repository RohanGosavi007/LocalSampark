/**
 * Builds the test database once, before any suite runs.
 *
 * The schema comes from the real migrations rather than from a hand-written
 * subset. setup/testDb.js previously created about a dozen tables by hand, and
 * they had already drifted — its `users.id` was an INTEGER while production and
 * every other migration use a TEXT uuid. A test schema that disagrees with the
 * real one gives false confidence in exactly the place tests are supposed to
 * provide it: a query that works against the fixture and fails in production.
 * Running `migrations/run.js` means the two cannot diverge, because there is
 * only one definition.
 *
 * Fixtures are the minimum the suites actually need — a region, a handful of
 * categories, a few shops with varied trading hours, and one user. Deliberately
 * small: a fixture set that mirrors the development catalogue would make tests
 * pass for reasons unrelated to what they assert, and would have to be
 * maintained alongside the seeder.
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const TEST_DB_PATH = path.join(__dirname, 'src', 'data', 'test.db');

/** Removes the database and its write-ahead log companions. */
function removeTestDb() {
  for (const suffix of ['', '-wal', '-shm']) {
    const file = TEST_DB_PATH + suffix;
    if (!fs.existsSync(file)) continue;
    try {
      fs.unlinkSync(file);
    } catch {
      // A lingering handle from an interrupted run is not fatal; the schema
      // creation below is idempotent.
    }
  }
}

/**
 * Trading hours by category, mirroring the seeder.
 *
 * Varied on purpose: the open-now filter is a real code path, and a fixture set
 * where every shop keeps identical hours cannot exercise it. `close <= open`
 * encodes a range that wraps past midnight.
 */
const FIXTURE_SHOPS = [
  { name: 'Test Pharmacy One', category: 'Pharmacy', hours: { open: '00:00', close: '00:00' }, lat: 18.5786, lng: 73.8967, rating: 4.5 },
  { name: 'Test Grocery Mart', category: 'Grocery', hours: { open: '08:00', close: '21:00' }, lat: 18.5800, lng: 73.9000, rating: 4.2 },
  { name: 'Test Grocery Corner', category: 'Grocery', hours: { open: '09:00', close: '20:00' }, lat: 18.5750, lng: 73.8900, rating: 3.9 },
  { name: 'Test Salon Studio', category: 'Salon', hours: { open: '10:00', close: '19:00' }, lat: 18.5820, lng: 73.8940, rating: 4.7 },
  { name: 'Test Hardware Depot', category: 'Hardware', hours: { open: '09:00', close: '21:00' }, lat: 18.5700, lng: 73.9050, rating: 3.5 },
];

async function seedFixtures(db) {
  const { query } = db;

  /**
   * Inserts one fixture, failing loudly.
   *
   * The first version of this file swallowed every insert error with
   * `.catch(() => {})`, which is how it came to seed nothing at all while
   * reporting success — the suites that needed a catalogue then failed with
   * "expected > 0, received 0" and pointed at the ranker rather than at the
   * fixtures. A setup step that cannot set up must say so.
   */
  // Note the shop insert below deliberately does NOT use OR IGNORE: the
  // database is rebuilt from scratch every run, so there is nothing to collide
  // with, and OR IGNORE would hide a broken fixture exactly as it did before.
  const insert = async (label, sql, params) => {
    try {
      await query(sql, params);
    } catch (err) {
      throw new Error(`Test fixture "${label}" could not be created: ${err.message}`);
    }
  };

  // Engine-neutral: the same fixtures seed SQLite and the PostgreSQL test
  // database (resetLocalPostgres). Ids are deterministic UUIDs (fx), flags are
  // quoted '1', and `ON CONFLICT DO NOTHING` replaces SQLite's OR IGNORE.
  const { fx } = require('./src/__tests__/helpers/fixtureIds');

  const regionId = fx('seed-region');
  await insert('region',
    `INSERT INTO regions (id, name, state, country, latitude, longitude, radius_km, pincode, is_active)
     VALUES ($1, 'Test Region', 'Maharashtra', 'India', 18.5786, 73.8967, 10, '411019', '1')
     ON CONFLICT DO NOTHING`,
    [regionId]
  );

  const ownerId = fx('seed-owner');
  await insert('owner',
    `INSERT INTO users (id, phone_number, full_name, role, is_verified, is_active, region_id)
     VALUES ($1, '+919000000000', 'Test Shop Owner', 'shop_owner', '1', '1', $2)
     ON CONFLICT DO NOTHING`,
    [ownerId, regionId]
  );

  const categoryIds = new Map();
  for (const name of [...new Set(FIXTURE_SHOPS.map((s) => s.category))]) {
    const slug = name.toLowerCase();
    await insert(`category ${name}`,
      `INSERT INTO shop_categories (id, name, slug, is_active)
       VALUES ($1, $2, $3, '1')
       ON CONFLICT DO NOTHING`,
      [fx(`seed-cat-${slug}`), name, slug]
    );
    // A migration may already have seeded this slug; use whichever row exists.
    const row = await db.queryOne('SELECT id FROM shop_categories WHERE slug = $1', [slug]);
    categoryIds.set(name, row ? row.id : fx(`seed-cat-${slug}`));
  }

  for (const shop of FIXTURE_SHOPS) {
    // Deterministic ids so a test can reference a fixture by name without
    // querying for it first, and so a re-run overwrites rather than duplicates.
    const id = fx(`seed-shop-${crypto.createHash('sha1').update(shop.name).digest('hex').slice(0, 12)}`);
    // `coordinate` is NOT NULL and is the column the seeder fills with
    // ST_GeomFromText. Omitting it is why the first version of this file seeded
    // nothing: INSERT OR IGNORE suppresses a constraint violation rather than
    // raising it, so every shop silently failed while setup reported success.
    // The suites that needed a catalogue then failed with "expected > 0,
    // received 0" and pointed at the ranker instead of at the fixtures.
    const coordinate = `POINT(${shop.lng} ${shop.lat})`;

    await insert(`shop ${shop.name}`,
      `INSERT INTO local_shops
         (id, owner_id, region_id, category_id, name, description, category, address,
          coordinate, latitude, longitude, opening_hours, rating, is_verified, is_active, approval_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Test Address, Pune', $8, $9, $10, $11, $12, '1', '1', 'approved')`,
      [id, ownerId, regionId, categoryIds.get(shop.category), shop.name,
        `A ${shop.category} fixture for tests.`, shop.category, coordinate,
        shop.lat, shop.lng, JSON.stringify(shop.hours), shop.rating]
    );
  }
}

/**
 * Clears the per-worker database copies from the previous run.
 *
 * jest.setup.js gives each worker its own copy of the migrated database so
 * parallel suites cannot collide. Those copies must not outlive the run that
 * made them: a stale one carries the previous run's schema, and a suite would
 * then fail against a migration that has since changed for reasons nothing in
 * the output would explain.
 */
function removeWorkerDbs() {
  const dir = path.dirname(TEST_DB_PATH);
  const base = path.basename(TEST_DB_PATH, '.db');
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir)) {
    // Matches the `.db` and its `-wal`/`-shm` sidecars alike.
    if (entry.startsWith(`${base}.worker`)) {
      try {
        fs.unlinkSync(path.join(dir, entry));
      } catch {
        // A locked file from a crashed run is not worth failing setup over; the
        // copy below will overwrite it or the worker will reuse it harmlessly.
      }
    }
  }
}

/**
 * Drops and recreates the public schema of the LOCAL test database, then runs
 * the PostgreSQL migrations into it. Refuses anything that is not a database
 * named *_test on localhost / 127.0.0.1 (rule L6): a wrong DATABASE_URL must
 * never be able to wipe a real database.
 */
async function resetLocalPostgres(dbUrl, { withFixtures = true } = {}) {
  if (!dbUrl) {
    throw new Error('TEST_USE_POSTGRES is set but DATABASE_URL is not: refusing to guess which database to reset (L6).');
  }
  const parsed = new URL(dbUrl);
  const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!['localhost', '127.0.0.1'].includes(parsed.hostname) || !/_test$/.test(dbName)) {
    throw new Error(`Refusing to reset '${dbName}' on '${parsed.hostname}': only a local database whose name ends in _test is reset (L6).`);
  }

  const { Client } = require('pg');
  const client = new Client({ connectionString: dbUrl, ssl: false });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO public');
  } finally {
    await client.end();
  }

  // A child process: the migration runner and config/database pick their
  // engine at module load, and this process is about to load them for SQLite.
  const { execFileSync } = require('child_process');
  execFileSync(process.execPath, [path.join(__dirname, 'src', 'migrations', 'run.js')], {
    cwd: __dirname,
    env: { ...process.env, USE_SQLITE: 'false', DATABASE_URL: dbUrl, DB_SSL: 'false', NODE_ENV: 'test' },
    stdio: 'ignore',
    timeout: 300000,
  });

  // The same catalogue fixtures the SQLite database gets, so suites that read
  // the live catalogue (ranking, search) have something to read on PostgreSQL.
  // G4 asks for an empty migrated database instead (withFixtures: false).
  if (!withFixtures) return;
  const seed = [
    "const db = require('./src/config/database');",
    "require('./jest.globalSetup.js').seedFixtures(db)",
    "  .then(() => process.exit(0))",
    "  .catch((e) => { console.error(e.message); process.exit(1); });",
  ].join('\n');
  execFileSync(process.execPath, ['-e', seed], {
    cwd: __dirname,
    env: { ...process.env, USE_SQLITE: 'false', DATABASE_URL: dbUrl, DB_SSL: 'false', NODE_ENV: 'test' },
    stdio: ['ignore', 'ignore', 'inherit'],
    timeout: 120000,
  });
}

module.exports = async function globalSetup() {
  // Must be set before config/database is first required, which the migration
  // runner does transitively.
  process.env.NODE_ENV = 'test';
  const usePg = process.env.TEST_USE_POSTGRES === '1' || process.env.TEST_USE_POSTGRES === 'true';
  process.env.USE_SQLITE = 'true';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-not-used-in-production';

  // L6 Safety Guard: Ensure test environment NEVER touches remote databases
  if (usePg) {
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl) {
      try {
        const parsed = new URL(dbUrl);
        if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
          throw new Error(`CRITICAL TEST SAFETY VIOLATION (L6): Tests attempted to connect to remote Postgres host '${parsed.hostname}'. Tests are strictly forbidden from running against non-local databases.`);
        }
      } catch (err) {
        if (err.message.includes('CRITICAL TEST SAFETY VIOLATION')) throw err;
      }
    }
    // A fresh PostgreSQL schema every run (H11). The suites used to share
    // whatever earlier runs left behind, so a fixture that a crashed run never
    // cleaned up failed the next run on a unique constraint, and figures read
    // across suites (revenue, counts) depended on run order.
    await resetLocalPostgres(dbUrl);
    // Continue to also prepare test.db so suites with explicit USE_SQLITE='true' have a clean SQLite fixture DB.
  }

  process.env.SQLITE_DB_PATH = TEST_DB_PATH;

  // From scratch every run. An incrementally-migrated test database
  // accumulates whatever a half-finished migration left behind, and that state
  // is invisible until a suite fails for a reason nobody can reproduce.
  removeTestDb();
  removeWorkerDbs();
  fs.mkdirSync(path.dirname(TEST_DB_PATH), { recursive: true });

  // The migration runner is chatty and its output would bury the test report.
  const originalLog = console.log;
  console.log = () => {};
  try {
    const { runMigration } = require('./src/migrations/run');
    await runMigration();
  } finally {
    console.log = originalLog;
  }

  const db = require('./src/config/database');
  await seedFixtures(db);
};

module.exports.TEST_DB_PATH = TEST_DB_PATH;
module.exports.FIXTURE_SHOPS = FIXTURE_SHOPS;

/**
 * Exported so a suite that wipes shared tables can put them back.
 *
 * setup/testDb.js#cleanTestData deletes local_shops and users to give the
 * e-commerce suites a blank slate, and never restored what it removed. Whether
 * that mattered depended entirely on whether it ran before or after a suite
 * that needs the catalogue — which Jest decides by its own scheduling — so the
 * run was order-dependent and adding any new test file could break an
 * unrelated one. It did: five new ML suites shifted the order and the content
 * vector tests in mlRanker began failing with "expected > 0, received 0",
 * pointing at the embedding index rather than at the fixture that was no
 * longer there.
 *
 * Re-seeding after the wipe removes the dependence rather than papering over
 * it in whichever suite happened to notice.
 */
module.exports.seedFixtures = seedFixtures;
module.exports.resetLocalPostgres = resetLocalPostgres;
