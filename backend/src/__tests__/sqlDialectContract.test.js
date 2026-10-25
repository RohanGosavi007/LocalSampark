/**
 * SQL in the application must be accepted by both engines.
 *
 * The suite runs on SQLite and production runs on PostgreSQL, and nothing
 * translates SQLite's dialect for PostgreSQL. (The reverse direction has a
 * small translator, in config/database.sqlite.js, for NOW(), INTERVAL
 * arithmetic and one PostGIS call.) So a statement written in SQLite's dialect
 * passes every test and every local run and then fails for the first real
 * user. Seventy-two lines of live code were like that: datetime('now', …),
 * strftime(), INSERT OR IGNORE, json_extract(), string literals in double
 * quotes. A further thirteen went the other way — ILIKE, `= ANY($1::uuid[])` —
 * and failed in development instead.
 *
 * Each has a spelling both engines take, and src/utils has the helpers:
 *
 *   datetime('now')               CURRENT_TIMESTAMP
 *   datetime('now', '-30 days')   bind sqlTimestamp(-30 * DAY_MS)     sqlTime.js
 *   date(col) = date('now', …)    `${dayOf('col')} = $1`, sqlDate(n)  sqlTime.js
 *   strftime(…) for bucketing     fetch the rows, bucket in JavaScript
 *   INSERT OR IGNORE              INSERT … ON CONFLICT DO NOTHING
 *   INSERT OR REPLACE             INSERT … ON CONFLICT (…) DO UPDATE SET …
 *   "literal"                     'literal'
 *   ILIKE                         LOWER(col) LIKE LOWER($1)
 *   = ANY($1::type[])             IN (${placeholders(n)})             sqlList.js
 *
 * This cannot prove a statement runs on PostgreSQL — only running it there
 * can — but it stops the known ways of writing one that will not.
 */

const fs = require('fs');
const { applicationFiles, label, sqlView } = require('./helpers/liveSource');

const SQLITE_ONLY = [
  ['INSERT OR IGNORE / REPLACE', /INSERT\s+OR\s+(IGNORE|REPLACE)\s+INTO/i],
  ["datetime('now') / date('now')", /\b(datetime|date)\(\s*\\?'now\\?'/i],
  // datetime(column) too: PostgreSQL has no datetime() function at all.
  ['datetime()', /\bdatetime\s*\(/i],
  // `?` is the SQLite driver's own placeholder. Appended to a query that
  // already uses $n it is bound to nothing on SQLite, so the filter silently
  // matches no rows, and PostgreSQL rejects it as a syntax error.
  ['a ? placeholder', /(=|<|>|\bLIKE|\bBETWEEN|\bAND|\bLIMIT|\bOFFSET|\bIN\s*\(|,|\()\s*\?(\s*(,|\)|AND\b|OR\b|$|`|'|"))/i],
  ['strftime()', /\bstrftime\s*\(/i],
  ['julianday()', /\bjulianday\s*\(/i],
  ['IFNULL()', /\bIFNULL\s*\(/i],
  ['GROUP_CONCAT()', /\bGROUP_CONCAT\s*\(/i],
  ['json_extract()', /\bjson_extract\s*\(/i],
  ['a double-quoted string literal', /(=|!=|<>|\bTHEN|\bELSE)\s*"[a-z_]+"\s*(,|\)|\bEND\b|\bWHERE\b|\bAND\b|\bOR\b|\bELSE\b|'|$)/],
];

const POSTGRES_ONLY = [
  ['ILIKE', /\bILIKE\b/],
  ['= ANY(array)', /=\s*ANY\s*\(/i],
  ['TO_CHAR()', /\bTO_CHAR\s*\(/i],
  ['DATE_TRUNC()', /\bDATE_TRUNC\s*\(/i],
  ['DISTINCT ON', /\bDISTINCT\s+ON\s*\(/i],
  ['FILTER (WHERE …)', /\bFILTER\s*\(\s*WHERE\b/i],
  ['GREATEST() / LEAST()', /\b(GREATEST|LEAST)\s*\(/i],
  // The earthdistance extension, which no migration installs: these fail on
  // PostgreSQL as well as on SQLite.
  ['earth_distance() / ll_to_earth()', /\b(earth_distance|ll_to_earth)\s*\(/i],
];

// A line is only examined if it reads as SQL, so that a JavaScript comparison
// with a double-quoted string, say, is not mistaken for one.
const LOOKS_LIKE_SQL = /\b(SELECT|INSERT|UPDATE|DELETE|WHERE|FROM|VALUES|SET|JOIN|GROUP BY|ORDER BY|CASE|WHEN|AND)\b/;

/**
 * file:line entries that are allowed to use one engine's syntax — a statement
 * chosen per engine by an explicit branch. Empty, and better kept that way: a
 * portable spelling exists for everything this test has met so far.
 */
const ALLOWED = new Set([]);

function scan(patterns) {
  const hits = [];
  for (const file of applicationFiles()) {
    const lines = sqlView(fs.readFileSync(file, 'utf8')).split('\n');
    lines.forEach((line, index) => {
      if (!LOOKS_LIKE_SQL.test(line)) return;
      for (const [name, pattern] of patterns) {
        if (!pattern.test(line)) continue;
        const where = `${label(file)}:${index + 1}`;
        if (ALLOWED.has(where)) continue;
        hits.push(`${where}  ${name}:  ${line.trim().slice(0, 110)}`);
      }
    });
  }
  return hits;
}

test('no SQLite-only syntax in reachable source (it fails on PostgreSQL, in production)', () => {
  expect(scan(SQLITE_ONLY)).toEqual([]);
});

test('no PostgreSQL-only syntax in reachable source (it fails on SQLite, in development and CI)', () => {
  expect(scan(POSTGRES_ONLY)).toEqual([]);
});

test('the scan is reading a meaningful amount of source', () => {
  // Guards against the reachability walk breaking and the two tests above
  // passing because they looked at nothing.
  expect(applicationFiles().length).toBeGreaterThan(200);
});
