/**
 * Rebuilding a SQLite table whose definition has to change.
 *
 * SQLite cannot alter a column's constraints or a foreign key's action in
 * place; the table has to be created again under a new name, filled, and
 * swapped in. Three migrations need that (098 predates this file and carries
 * its own copy), and the details are easy to get subtly wrong, so they live
 * here once.
 *
 * The new table is made by editing the original CREATE TABLE text from
 * sqlite_master, not by reconstructing one from PRAGMA table_info. The pragma
 * reports columns and nothing else: a table rebuilt from it comes back without
 * its UNIQUE and CHECK constraints, without composite keys, and without ON
 * UPDATE actions, and none of that shows until a duplicate row that should have
 * been refused is accepted.
 *
 * Indexes and triggers belong to the table and go when it is dropped, so both
 * are recorded first and recreated after. Views that mention the table are
 * dropped for the swap and put back, because SQLite validates every view when a
 * table is renamed and fails the rename if one refers to a table that is
 * momentarily absent.
 *
 * The swap is one transaction: if the copy comes up short or anything throws,
 * it rolls back and the original table is untouched.
 */

/** Quotes an identifier for SQLite. */
function q(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

/**
 * Splits a CREATE TABLE body into its top-level, comma-separated definitions.
 * Commas inside parentheses (DECIMAL(10,2), CHECK (...)), inside quoted
 * strings and inside line comments are part of a definition, not a separator.
 */
function splitDefinitions(body) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = '';
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; current += ch; continue; }
    if (ch === '-' && body[i + 1] === '-') {
      const end = body.indexOf('\n', i);
      const stop = end === -1 ? body.length : end;
      current += body.slice(i, stop);
      i = stop - 1;
      continue;
    }
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) { parts.push(current); current = ''; continue; }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/** The column a definition declares, lower-cased, or null for a table constraint. */
function columnNameOf(definition) {
  // Leading whitespace and any comment lines above the definition are set aside.
  const code = definition.replace(/^(\s*--[^\n]*\n)*/, '');
  const name = (code.match(/^\s*["`[]?(\w+)["`\]]?/) || [])[1];
  if (!name) return null;
  if (/^(primary|foreign|unique|check|constraint)$/i.test(name)) return null;
  return name.toLowerCase();
}

/**
 * The CREATE TABLE statement for `table`, renamed to `newName`, with each
 * definition passed through `edit(definition, columnName)`. `edit` returns the
 * definition to use. Returns null if the text cannot be read safely.
 */
function rewriteDefinition(createSql, table, newName, edit) {
  const open = createSql.indexOf('(');
  const close = createSql.lastIndexOf(')');
  if (open === -1 || close <= open) return null;

  const definitions = splitDefinitions(createSql.slice(open + 1, close))
    .map((definition) => edit(definition, columnNameOf(definition)));

  const header = createSql.slice(0, open).replace(
    new RegExp(`(CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?)["\`\\[]?${table}["\`\\]]?`, 'i'),
    `$1${q(newName)}`
  );
  if (!header.includes(q(newName))) return null;

  return `${header}(${definitions.join(',')}${createSql.slice(close)}`;
}

/**
 * Replaces `table` with a copy built from `newSql`, which must create a table
 * called `tmp` with the same columns. Returns what was carried across.
 */
async function swapTable(db, table, tmp, newSql) {
  const info = await db.queryMany(`PRAGMA table_info(${q(table)})`);
  const indexes = await db.queryMany(
    `SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = '${table}' AND sql IS NOT NULL`
  );
  const triggers = await db.queryMany(
    `SELECT name, sql FROM sqlite_master WHERE type = 'trigger' AND tbl_name = '${table}' AND sql IS NOT NULL`
  );
  const views = (await db.queryMany(
    "SELECT name, sql FROM sqlite_master WHERE type = 'view' AND sql IS NOT NULL"
  )).filter((v) => new RegExp('\\b' + table + '\\b', 'i').test(v.sql));

  const columnList = info.map((c) => q(c.name)).join(', ');

  await db.query('BEGIN');
  try {
    for (const view of views) await db.query(`DROP VIEW IF EXISTS ${q(view.name)}`);

    await db.query(`DROP TABLE IF EXISTS ${q(tmp)}`);
    await db.query(newSql);
    await db.query(`INSERT INTO ${q(tmp)} (${columnList}) SELECT ${columnList} FROM ${q(table)}`);

    const before = await db.queryMany(`SELECT COUNT(*) AS n FROM ${q(table)}`);
    const after = await db.queryMany(`SELECT COUNT(*) AS n FROM ${q(tmp)}`);
    if (Number(before[0].n) !== Number(after[0].n)) {
      throw new Error(`copy mismatch on ${table}: ${before[0].n} row(s), ${after[0].n} copied`);
    }

    await db.query(`DROP TABLE ${q(table)}`);
    await db.query(`ALTER TABLE ${q(tmp)} RENAME TO ${q(table)}`);

    for (const index of indexes) await db.query(index.sql);
    for (const trigger of triggers) await db.query(trigger.sql);
    for (const view of views) await db.query(view.sql);

    await db.query('COMMIT');
  } catch (err) {
    try { await db.query('ROLLBACK'); } catch { /* the original error is the one worth reporting */ }
    throw err;
  }

  return { indexes: indexes.length, triggers: triggers.length, views: views.length };
}

/** The stored CREATE TABLE text for a table, or null. */
async function createSqlOf(db, table) {
  const rows = await db.queryMany(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = '${table}'`);
  return rows[0] ? rows[0].sql : null;
}

/**
 * Runs `work` with foreign keys off, then confirms none of `tables` was left
 * with a dangling reference. The pragma has to be set outside any transaction:
 * SQLite ignores it while one is open.
 */
async function withForeignKeysOff(db, tables, work) {
  await db.query('PRAGMA foreign_keys = OFF');
  try {
    const result = await work();
    const violations = await db.queryMany('PRAGMA foreign_key_check');
    const mine = (violations || []).filter((v) => tables.includes(v.table));
    if (mine.length > 0) {
      throw new Error(`rebuild left ${mine.length} dangling foreign-key reference(s); first: ${JSON.stringify(mine[0])}`);
    }
    return result;
  } finally {
    await db.query('PRAGMA foreign_keys = ON');
  }
}

module.exports = { q, splitDefinitions, columnNameOf, rewriteDefinition, swapTable, createSqlOf, withForeignKeysOff };
