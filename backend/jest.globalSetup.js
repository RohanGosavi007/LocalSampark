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

  const regionId = 'test-region-0001';
  await insert('region',
    `INSERT OR IGNORE INTO regions (id, name, state, country, latitude, longitude, radius_km, pincode, is_active)
     VALUES ($1, 'Test Region', 'Maharashtra', 'India', 18.5786, 73.8967, 10, '411019', 1)`,
    [regionId]
  );

  const ownerId = 'test-owner-0001';
  await insert('owner',
    `INSERT OR IGNORE INTO users (id, phone_number, full_name, role, is_verified, is_active, region_id)
     VALUES ($1, '+919000000000', 'Test Shop Owner', 'shop_owner', 1, 1, $2)`,
    [ownerId, regionId]
  );

  const categoryIds = new Map();
  for (const name of [...new Set(FIXTURE_SHOPS.map((s) => s.category))]) {
    const id = `test-cat-${name.toLowerCase()}`;
    categoryIds.set(name, id);
    await insert(`category ${name}`,
      `INSERT OR IGNORE INTO shop_categories (id, name, slug, is_active)
       VALUES ($1, $2, $3, 1)`,
      [id, name, name.toLowerCase()]
    );
  }

  for (const shop of FIXTURE_SHOPS) {
    // Deterministic ids so a test can reference a fixture by name without
    // querying for it first, and so a re-run overwrites rather than duplicates.
    const id = `test-shop-${crypto.createHash('sha1').update(shop.name).digest('hex').slice(0, 12)}`;
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
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Test Address, Pune', $8, $9, $10, $11, $12, 1, 1, 'approved')`,
      [id, ownerId, regionId, categoryIds.get(shop.category), shop.name,
        `A ${shop.category} fixture for tests.`, shop.category, coordinate,
        shop.lat, shop.lng, JSON.stringify(shop.hours), shop.rating]
    );
  }
}

module.exports = async function globalSetup() {
  // Must be set before config/database is first required, which the migration
  // runner does transitively.
  process.env.NODE_ENV = 'test';
  process.env.USE_SQLITE = process.env.TEST_USE_POSTGRES ? 'false' : 'true';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-not-used-in-production';

  if (process.env.TEST_USE_POSTGRES) return;

  process.env.SQLITE_DB_PATH = TEST_DB_PATH;

  // From scratch every run. An incrementally-migrated test database
  // accumulates whatever a half-finished migration left behind, and that state
  // is invisible until a suite fails for a reason nobody can reproduce.
  removeTestDb();
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
