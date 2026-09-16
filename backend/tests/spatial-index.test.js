/**
 * Spatial dual representation.
 *
 * latitude/longitude are the writable source of truth on both engines; the
 * spatial structure (R*Tree here, PostGIS geography + GiST on PostgreSQL) is
 * derived by trigger and never written by application code.
 *
 * Deriving rather than dual-writing is the whole point. PostgreSQL previously
 * stored only a GEOGRAPHY coordinate while SQLite stored only latitude and
 * longitude, and code referenced both — so marketplace's radius filter read
 * l.latitude, got undefined on every row, and matched every listing. Anything
 * that lets the two copies disagree reintroduces that.
 *
 * These run against the real database: a trigger that does not fire is exactly
 * the failure being guarded against, and a mock cannot show that.
 */
const db = require('../src/config/database');
const crypto = require('crypto');

const PUNE = { lat: 18.5204, lng: 73.8567 };
const created = [];

async function insertShop(lat, lng) {
  // Supplies every NOT NULL column, and an explicit TEXT id.
  //
  // This used to insert only (name, latitude, longitude) and leave the id to
  // the engine, with a comment asserting that local_shops.id is INTEGER
  // PRIMARY KEY on SQLite. The migrations declare `id TEXT PRIMARY KEY`, and
  // `category`, `address` and `coordinate` are all NOT NULL. Both statements
  // were true of the development database this suite used to run against and
  // false of the schema the migrations actually produce — the dev file had
  // drifted, and the test documented the drift as though it were the contract.
  //
  // It is also where the stray `spatial-test-*` shops in the development
  // catalogue came from: the suite wrote into the shared database and its
  // cleanup did not always run.
  const id = crypto.randomUUID();
  const name = 'spatial-test-' + id.slice(0, 8);
  await db.query(
    `INSERT INTO local_shops (id, name, category, address, coordinate, latitude, longitude, is_active)
     VALUES ($1, $2, 'Test', 'Test Address', $3, $4, $5, 1)`,
    [id, name, `POINT(${lng} ${lat})`, lat, lng]
  );
  created.push(id);
  return id;
}

async function rtreeRowFor(id) {
  const res = await db.query(
    `SELECT r.min_lat, r.min_lng FROM local_shops_rtree r
      JOIN local_shops s ON s.rowid = r.id WHERE s.id = $1`,
    [id]
  );
  return (res.rows || [])[0] || null;
}

afterAll(async () => {
  for (const id of created) {
    await db.query('DELETE FROM local_shops WHERE id = $1', [id]).catch(() => {});
  }
});

describe('R*Tree availability', () => {
  it('the spatial index tables exist', async () => {
    const tables = await db.listTables();
    expect(tables).toContain('local_shops_rtree');
    expect(tables).toContain('marketplace_listings_rtree');
    expect(tables).toContain('orders_delivery_rtree');
  });
});

describe('index stays derived from lat/lng', () => {
  it('INSERT populates the spatial index', async () => {
    const id = await insertShop(PUNE.lat, PUNE.lng);
    const row = await rtreeRowFor(id);
    expect(row).not.toBeNull();
    expect(row.min_lat).toBeCloseTo(PUNE.lat, 4);
    expect(row.min_lng).toBeCloseTo(PUNE.lng, 4);
  });

  it('UPDATE moves the indexed point', async () => {
    const id = await insertShop(PUNE.lat, PUNE.lng);
    await db.query('UPDATE local_shops SET latitude = $1, longitude = $2 WHERE id = $3', [21.1458, 79.0882, id]); // Nagpur
    const row = await rtreeRowFor(id);
    expect(row.min_lat).toBeCloseTo(21.1458, 3);
    expect(row.min_lng).toBeCloseTo(79.0882, 3);
  });

  it('DELETE removes the index entry, leaving no orphan', async () => {
    const id = await insertShop(PUNE.lat, PUNE.lng);
    expect(await rtreeRowFor(id)).not.toBeNull();
    await db.query('DELETE FROM local_shops WHERE id = $1', [id]);
    expect(await rtreeRowFor(id)).toBeNull();
  });

  it('a row without coordinates is not indexed', async () => {
    const id = await insertShop(null, null);
    expect(await rtreeRowFor(id)).toBeNull();
  });

  it('a row later given coordinates becomes indexed', async () => {
    const id = await insertShop(null, null);
    expect(await rtreeRowFor(id)).toBeNull();
    await db.query('UPDATE local_shops SET latitude = $1, longitude = $2 WHERE id = $3', [PUNE.lat, PUNE.lng, id]);
    expect(await rtreeRowFor(id)).not.toBeNull();
  });
});

describe('bounding-box search', () => {
  it('finds shops inside the box and excludes those outside', async () => {
    const near = await insertShop(18.5250, 73.8600);   // ~1km from PUNE
    const far = await insertShop(21.1458, 79.0882);    // Nagpur, ~600km

    const d = 0.1; // ~11km
    const res = await db.query(
      `SELECT s.id FROM local_shops_rtree r
         JOIN local_shops s ON s.rowid = r.id
        WHERE r.min_lat >= $1 AND r.max_lat <= $2
          AND r.min_lng >= $3 AND r.max_lng <= $4`,
      [PUNE.lat - d, PUNE.lat + d, PUNE.lng - d, PUNE.lng + d]
    );
    const ids = (res.rows || []).map((r) => r.id);
    expect(ids).toContain(near);
    expect(ids).not.toContain(far);
  });
});
