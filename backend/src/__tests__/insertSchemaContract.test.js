/**
 * @engine sqlite-only — checks INSERT column lists against the live SQLite schema via PRAGMA table_info.
 * Excluded from the PostgreSQL run (jest.config.js); runs in the SQLite gate.
 */
/**
 * Every INSERT the server can run must fit the table it writes to.
 *
 * An audit of the running code found roughly a hundred that did not, in four
 * shapes, each of which fails only when the statement is finally executed:
 *
 *   - a column the table does not have (`transaction_type` on
 *     wallet_transactions, whose column is `type`);
 *   - a NOT NULL column with no default that the statement leaves out — the
 *     commonest by far, usually a table's original column sitting beside a
 *     newer one the code writes instead (`name` beside `asset_name`);
 *   - a table that does not exist on this engine;
 *   - and, behind all of them, a handler whose try/catch turned the failure
 *     into a 500 or swallowed it outright.
 *
 * None of that was visible to the suite, because no test happened to call the
 * routes involved: shop registration, ride offers, society assets, gates and
 * vendors, payment receipts, move passes and private messages had all been
 * unable to insert a row. This reads the statements instead of calling them,
 * so it covers the routes nobody has written a test for yet.
 *
 * The schema is the one the migrations just built, so the check and the
 * database cannot disagree about what a table looks like.
 *
 * Not checked: an omitted `id`. The SQLite driver generates one, and a column
 * default does the same on PostgreSQL (migration 112).
 */

process.env.USE_SQLITE = 'true';

const fs = require('fs');
const db = require('../config/database');
const { applicationFiles, label, sqlView, lineOf } = require('./helpers/liveSource');

const INSERT = /INSERT\s+(?:OR\s+\w+\s+)?INTO\s+"?(\w+)"?\s*\(([^)]*)\)\s*(?:VALUES|SELECT)/gi;

async function findProblems() {
  const tables = new Map();
  const columnsOf = async (table) => {
    if (!tables.has(table)) {
      const result = await db.query(`PRAGMA table_info("${table}")`);
      tables.set(table, result.rows || []);
    }
    return tables.get(table);
  };

  const problems = [];
  let statements = 0;

  for (const file of applicationFiles()) {
    const text = sqlView(fs.readFileSync(file, 'utf8'));
    INSERT.lastIndex = 0;
    let match;
    while ((match = INSERT.exec(text))) {
      const table = match[1].toLowerCase();
      const named = match[2].split(',').map((c) => c.trim().replace(/["`]/g, '').toLowerCase()).filter(Boolean);
      // A column list built at run time cannot be read here.
      if (table === '__js__' || named.some((c) => !/^\w+$/.test(c) || c.includes('__js__'))) continue;

      statements += 1;
      const where = `${label(file)}:${lineOf(text, match.index)}`;
      const columns = await columnsOf(table);

      if (columns.length === 0) {
        problems.push(`${where}  no such table: ${table}`);
        continue;
      }

      const known = new Set(columns.map((c) => c.name.toLowerCase()));
      const unknown = named.filter((c) => !known.has(c));
      if (unknown.length) {
        problems.push(`${where}  ${table} has no column: ${unknown.join(', ')}`);
      }

      const given = new Set(named);
      const required = columns
        .filter((c) => c.notnull && c.dflt_value === null && !c.pk && !given.has(c.name.toLowerCase()))
        .map((c) => c.name);
      if (required.length) {
        problems.push(`${where}  ${table} requires: ${required.join(', ')}`);
      }
    }
  }

  return { problems, statements };
}

test('every INSERT in reachable source names real columns and supplies the required ones', async () => {
  const { problems, statements } = await findProblems();

  // If the scan stops finding statements, it has broken, not the code improved.
  expect(statements).toBeGreaterThan(300);
  expect(problems).toEqual([]);
}, 60000);
