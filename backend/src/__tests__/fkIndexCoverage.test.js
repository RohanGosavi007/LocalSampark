/**
 * Every foreign-key column is indexed, on both engines.
 *
 * Neither PostgreSQL nor SQLite indexes the referencing side of a foreign key.
 * Without one, each ON DELETE on a parent table scans the child and every "rows
 * belonging to X" lookup is a sequential scan. At the size of a pilot that is
 * invisible; at the size of a city it is a stall. 116 and 125 backfilled the
 * ones that were missing; this keeps the next table from adding another.
 *
 * "Indexed" means the column leads an index, a UNIQUE or PRIMARY KEY constraint
 * (a composite index on (a, b) serves lookups on a, not on b).
 *
 * The SQLite half reads the schema the migrations just built. The PostgreSQL
 * half reads the same migration files the runner applies, so — like the other
 * PostgreSQL contracts — it says "nothing known to be wrong", not "this ran".
 */

process.env.USE_SQLITE = 'true';

const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const { buildPgModel } = require('../../scripts/pg-schema-model');

const MIGRATIONS = path.join(__dirname, '..', 'migrations');
const SCRATCH = /(_rebuilt|__rebuild_\w+)$/;

/** FK columns whose index would not earn its write cost, with the reason. Keep this short. */
const EXEMPT = {};

describe('SQLite', () => {
  test('every foreign-key column leads an index', async () => {
    const tables = (await db.queryMany(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
    )).map((t) => t.name).filter((n) => !SCRATCH.test(n));

    const missing = [];
    for (const table of tables) {
      const fks = await db.queryMany(`PRAGMA foreign_key_list("${table}")`);
      if (!fks.length) continue;
      const leading = new Set();
      for (const idx of await db.queryMany(`PRAGMA index_list("${table}")`)) {
        const first = (await db.queryMany(`PRAGMA index_info("${idx.name}")`))[0];
        if (first) leading.add(first.name);
      }
      const pk = (await db.queryMany(`PRAGMA table_info("${table}")`)).find((c) => c.pk);
      for (const fk of new Set(fks.map((f) => f.from))) {
        if (!leading.has(fk) && !(pk && pk.name === fk) && !EXEMPT[`${table}.${fk}`]) missing.push(`${table}.${fk}`);
      }
    }
    expect(missing).toEqual([]);
  }, 30000);
});

describe('PostgreSQL (migration files)', () => {
  test('every foreign-key column leads an index', () => {
    const model = buildPgModel();
    const files = ['init.sql', ...fs.readdirSync(MIGRATIONS)
      .filter((f) => /^\d{3}_.*\.sql$/.test(f) && !f.includes('.sqlite.') && f.slice(0, 3) >= '054').sort()];
    const sql = files.map((f) => fs.readFileSync(path.join(MIGRATIONS, f), 'utf8'))
      .join('\n').replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

    const leading = new Set();
    for (const m of sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?\S+\s+ON\s+(?:ONLY\s+)?(?:public\.)?"?(\w+)"?\s*(?:USING\s+\w+\s*)?\(\s*"?(\w+)"?/gi)) {
      leading.add(`${m[1].toLowerCase()}.${m[2].toLowerCase()}`);
    }
    for (const m of sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?"?(\w+)"?\s*\(([\s\S]*?)\n\);/gi)) {
      for (const u of m[2].matchAll(/(?:UNIQUE|PRIMARY\s+KEY)\s*\(\s*"?(\w+)"?/gi)) leading.add(`${m[1].toLowerCase()}.${u[1].toLowerCase()}`);
      for (const u of m[2].matchAll(/^\s*"?(\w+)"?\s+[A-Za-z]+[^,\n]*\b(?:UNIQUE|PRIMARY\s+KEY)\b/gim)) leading.add(`${m[1].toLowerCase()}.${u[1].toLowerCase()}`);
    }

    let seen = 0;
    const missing = [];
    for (const [table, def] of Object.entries(buildPgModel().tables)) {
      for (const fk of def.fks || []) {
        seen += 1;
        const key = `${table}.${fk.column}`.toLowerCase();
        if (!leading.has(key) && !EXEMPT[key]) missing.push(key);
      }
    }
    // Guard against the parser silently finding nothing and passing.
    expect(model).toBeTruthy();
    expect(seen).toBeGreaterThan(300);
    expect(leading.size).toBeGreaterThan(500);
    expect(missing).toEqual([]);
  });
});
