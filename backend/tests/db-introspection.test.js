/**
 * Database wrapper: row-returning statements and schema introspection.
 *
 * The SQLite wrapper routed a statement to db.all() only when it began with
 * SELECT or contained RETURNING. Everything else went to db.run(), which
 * executes the statement but discards its result set — so `PRAGMA table_info`
 * resolved to zero rows, and there was no way to ask the database what columns
 * a table has. Schema tooling fell back to parsing DDL text and was wrong four
 * times over before the cause was found.
 *
 * These tests run against the real SQLite database, not a mock: the whole point
 * is that introspection reflects the engine.
 */
const db = require('../src/config/database');

describe('row-returning statement dispatch', () => {
  it('PRAGMA returns rows rather than an empty result', async () => {
    const res = await db.query('PRAGMA table_info(users)');
    expect(Array.isArray(res.rows)).toBe(true);
    expect(res.rows.length).toBeGreaterThan(0);
    expect(res.rows[0]).toHaveProperty('name');
  });

  it('SELECT still works', async () => {
    const res = await db.query('SELECT 1 AS ok');
    expect((res.rows[0] || {}).ok).toBe(1);
  });

  it('a CTE (WITH ...) returns rows', async () => {
    const res = await db.query('WITH t(x) AS (SELECT 42) SELECT x FROM t');
    expect((res.rows[0] || {}).x).toBe(42);
  });

  it('VALUES returns rows', async () => {
    const res = await db.query('VALUES (1), (2)');
    expect(res.rows.length).toBe(2);
  });
});

describe('getTableColumns', () => {
  it('returns real column metadata', async () => {
    const cols = await db.getTableColumns('users');
    expect(cols.length).toBeGreaterThan(0);
    const names = cols.map((c) => c.name);
    expect(names).toContain('id');
    const id = cols.find((c) => c.name === 'id');
    expect(id).toHaveProperty('type');
    expect(id).toHaveProperty('notNull');
    expect(id).toHaveProperty('primaryKey');
  });

  it('reflects columns added by migration 067', async () => {
    // Guards the marketplace fix: 064 declared latitude/longitude inside a
    // CREATE TABLE IF NOT EXISTS for an existing table, so they were never
    // created and POST /marketplace inserted into columns that did not exist.
    const names = (await db.getTableColumns('marketplace_listings')).map((c) => c.name);
    expect(names).toContain('latitude');
    expect(names).toContain('longitude');
    expect(names).toContain('region_id');
  });

  it('rejects a non-identifier table name instead of interpolating it', async () => {
    // PRAGMA cannot bind parameters, so the name is validated rather than bound.
    await expect(db.getTableColumns('users; DROP TABLE users')).rejects.toThrow(/Invalid table name/);
    await expect(db.getTableColumns('users--')).rejects.toThrow(/Invalid table name/);
  });

  it('returns an empty list for a table that does not exist', async () => {
    const cols = await db.getTableColumns('definitely_not_a_table_xyz');
    expect(cols).toEqual([]);
  });
});

describe('listTables', () => {
  it('enumerates user tables and excludes sqlite internals', async () => {
    const tables = await db.listTables();
    expect(tables.length).toBeGreaterThan(100);
    expect(tables).toContain('users');
    expect(tables.some((t) => t.startsWith('sqlite_'))).toBe(false);
  });
});
