#!/usr/bin/env node
/**
 * A model of the schema `npm run migrate` builds on an EMPTY PostgreSQL database.
 *
 * The suite runs on SQLite and nothing in CI has a PostgreSQL to migrate, so
 * the production schema is never actually constructed before a deploy. This
 * reads the PostgreSQL migration set the way src/migrations/run.js applies it
 * — init.sql, then every numbered non-SQLite file from 054 up; earlier ones are
 * baselined, which is to say never executed — and reports the tables and
 * columns that would result.
 *
 * It exists because that reading turned up what no test could: four auth
 * tables and users.password_hash that only a never-executed file defined, and
 * some fifty columns that only SQLite's migrations had ever added.
 *
 * It is a parser, not a database. DDL inside DO $$ … $$ blocks is read
 * wherever it appears literally, conditional branches are assumed to take the
 * path that changes the schema, and a statement that only an EXECUTE with a
 * computed string would produce is not seen at all. Treat a clean result as
 * "nothing known to be wrong", and run the migrations against a real
 * PostgreSQL before relying on it.
 *
 *   node scripts/pg-schema-model.js            # JSON on stdout
 *   node scripts/pg-schema-model.js users      # one table, readable
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS = path.resolve(__dirname, '..', 'src', 'migrations');
// Must match BASELINE_BEFORE in src/migrations/run.js.
const BASELINE_BEFORE = '054';

function stripComments(sql) {
  return sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Splits on commas that are not inside parentheses or a quoted string. */
function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let current = '';
  let quote = null;
  for (const ch of body) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'") { quote = ch; current += ch; continue; }
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) { parts.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

const NOT_A_COLUMN = new Set(['primary', 'foreign', 'unique', 'constraint', 'check', 'exclude', 'like']);

function parseColumn(definition) {
  const match = definition.match(/^"?(\w+)"?\s+(.*)$/s);
  if (!match) return null;
  const name = match[1].toLowerCase();
  if (NOT_A_COLUMN.has(name)) return null;

  const rest = match[2];
  const type = (rest.match(/^([A-Za-z_]+(?:\s+(?:PRECISION|VARYING|WITH(?:OUT)? TIME ZONE))?(?:\s*\([^)]*\))?(?:\[\])?)/i) || [null, ''])[1]
    .replace(/\s+/g, ' ')
    .toUpperCase();
  const serial = /^(BIG|SMALL)?SERIAL/i.test(type);

  return {
    name,
    type,
    notnull: /\bNOT\s+NULL\b/i.test(rest),
    hasDefault: serial || /\bDEFAULT\b/i.test(rest) || /\bGENERATED\b/i.test(rest),
    pk: /\bPRIMARY\s+KEY\b/i.test(rest),
  };
}

function buildPgModel() {
  const numbered = fs.readdirSync(MIGRATIONS)
    .filter((f) => /^\d{3}_.*\.sql$/.test(f) && !f.includes('.sqlite.'))
    .sort();
  const applied = ['init.sql', ...numbered.filter((f) => f.slice(0, 3) >= BASELINE_BEFORE)];
  const baselined = numbered.filter((f) => f.slice(0, 3) < BASELINE_BEFORE);

  const tables = {};
  const indexes = {}; // index name -> table

  /** The foreign key a definition declares, as { column, table, onDelete }, or null. */
  const foreignKeyIn = (definition, columnName) => {
    const tableLevel = definition.match(/FOREIGN\s+KEY\s*\(\s*"?(\w+)"?\s*\)\s*REFERENCES\s+(?:public\.)?"?(\w+)"?/i);
    const inline = definition.match(/\bREFERENCES\s+(?:public\.)?"?(\w+)"?/i);
    const column = tableLevel ? tableLevel[1].toLowerCase() : columnName;
    const target = tableLevel ? tableLevel[2] : inline && inline[1];
    if (!column || !target) return null;
    const action = definition.match(/ON\s+DELETE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION)/i);
    return { column, table: target.toLowerCase(), onDelete: action ? action[1].replace(/\s+/g, ' ').toUpperCase() : 'NO ACTION' };
  };

  const createTable = (name, body, file) => {
    if (tables[name]) return; // IF NOT EXISTS against an existing table changes nothing
    const columns = {};
    const fks = [];
    for (const part of splitTopLevel(body)) {
      const key = part.match(/^(?:CONSTRAINT\s+\w+\s+)?PRIMARY\s+KEY\s*\(([^)]*)\)/i);
      if (key) {
        for (const col of key[1].split(',').map((s) => s.trim().replace(/"/g, '').toLowerCase())) {
          if (columns[col]) columns[col].pk = true;
        }
        continue;
      }
      if (/^(?:CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY/i.test(part)) {
        const fk = foreignKeyIn(part, null);
        if (fk) fks.push(fk);
        continue;
      }
      const column = parseColumn(part);
      if (column) {
        columns[column.name] = column;
        const fk = foreignKeyIn(part, column.name);
        if (fk) fks.push(fk);
      }
    }
    tables[name] = { columns, fks, from: file };
  };

  const alterTable = (name, body) => {
    if (!tables[name]) return;
    const columns = tables[name].columns;
    for (const clause of splitTopLevel(body)) {
      let m;
      if ((m = clause.match(/^ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?(.+)$/is))) {
        if (/^(CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY/i.test(m[1].trim())) {
          const fk = foreignKeyIn(m[1], null);
          if (fk) tables[name].fks.push(fk);
          continue;
        }
        if (/^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK)\b/i.test(m[1].trim())) continue;
        const column = parseColumn(m[1].trim());
        if (column && !columns[column.name]) {
          columns[column.name] = column;
          const fk = foreignKeyIn(m[1], column.name);
          if (fk) tables[name].fks.push(fk);
        }
      } else if ((m = clause.match(/^RENAME\s+(?:COLUMN\s+)?"?(\w+)"?\s+TO\s+"?(\w+)"?/i))) {
        const from = m[1].toLowerCase();
        const to = m[2].toLowerCase();
        if (columns[from] && !columns[to]) { columns[to] = { ...columns[from], name: to }; delete columns[from]; }
      } else if ((m = clause.match(/^DROP\s+CONSTRAINT\s+(?:IF\s+EXISTS\s+)?"?(\w+)"?/i))) {
        // A foreign key declared inline, or added without a name, is called
        // <table>_<column>_fkey by PostgreSQL; dropping that name removes it.
        // The model ignored DROP CONSTRAINT, so a foreign key a migration had
        // removed was still reported as present.
        const dropped = m[1].toLowerCase();
        tables[name].fks = tables[name].fks.filter(
          (fk) => `${name}_${fk.column}_fkey`.toLowerCase() !== dropped && String(fk.name || '').toLowerCase() !== dropped
        );
      } else if ((m = clause.match(/^DROP\s+(?:COLUMN\s+)?(?:IF\s+EXISTS\s+)?"?(\w+)"?/i))) {
        if (!/^CONSTRAINT$/i.test(m[1])) delete columns[m[1].toLowerCase()];
      } else if ((m = clause.match(/^ALTER\s+(?:COLUMN\s+)?"?(\w+)"?\s+(.*)$/is))) {
        const column = columns[m[1].toLowerCase()];
        if (!column) continue;
        if (/DROP\s+NOT\s+NULL/i.test(m[2])) column.notnull = false;
        if (/SET\s+NOT\s+NULL/i.test(m[2])) column.notnull = true;
        if (/SET\s+DEFAULT/i.test(m[2])) column.hasDefault = true;
        if (/DROP\s+DEFAULT/i.test(m[2])) column.hasDefault = false;
        const retype = m[2].match(/TYPE\s+([A-Za-z_]+(?:\s*\([^)]*\))?)/i);
        if (retype) column.type = retype[1].toUpperCase();
      }
    }
  };

  for (const file of applied) {
    const sql = stripComments(fs.readFileSync(path.join(MIGRATIONS, file), 'utf8'));
    const events = [];
    let m;

    const createStart = /CREATE\s+(?:UNLOGGED\s+)?TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:public\.)?"?(\w+)"?\s*\(/gi;
    while ((m = createStart.exec(sql))) {
      let i = createStart.lastIndex;
      let depth = 1;
      let quote = null;
      while (i < sql.length && depth > 0) {
        const ch = sql[i];
        if (quote) { if (ch === quote) quote = null; } else if (ch === "'") quote = ch; else if (ch === '(') depth += 1; else if (ch === ')') depth -= 1;
        i += 1;
      }
      events.push({ at: m.index, kind: 'create', name: m[1].toLowerCase(), body: sql.slice(createStart.lastIndex, i - 1) });
    }

    const alter = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?(?:public\.)?"?(\w+)"?\s+([^;]*?)(?:;|\$q\$|'\s*;|$)/gi;
    while ((m = alter.exec(sql))) events.push({ at: m.index, kind: 'alter', name: m[1].toLowerCase(), body: m[2] });

    const drop = /DROP\s+TABLE(?:\s+IF\s+EXISTS)?\s+(?:public\.)?"?(\w+)"?/gi;
    while ((m = drop.exec(sql))) events.push({ at: m.index, kind: 'drop', name: m[1].toLowerCase() });

    const rename = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?"?(\w+)"?\s+RENAME\s+TO\s+"?(\w+)"?/gi;
    while ((m = rename.exec(sql))) events.push({ at: m.index, kind: 'rename', name: m[1].toLowerCase(), to: m[2].toLowerCase() });

    // In textual order, so a CREATE followed by an ALTER in one file works.
    events.sort((a, b) => a.at - b.at);
    for (const event of events) {
      if (event.kind === 'create') createTable(event.name, event.body, file);
      else if (event.kind === 'drop') delete tables[event.name];
      else if (event.kind === 'rename') {
        if (tables[event.name] && !tables[event.to]) { tables[event.to] = tables[event.name]; delete tables[event.name]; }
      } else alterTable(event.name, event.body);
    }

    const createIndex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?\s+ON\s+(?:ONLY\s+)?(?:public\.)?"?(\w+)"?/gi;
    while ((m = createIndex.exec(sql))) indexes[m[1].toLowerCase()] = m[2].toLowerCase();
  }

  const model = { applied, baselined, tables: {}, indexes };
  for (const [name, table] of Object.entries(tables)) {
    // A column dropped or renamed after its foreign key was declared takes the
    // key with it.
    const fks = table.fks.filter((fk) => table.columns[fk.column]);
    model.tables[name] = { from: table.from, cols: Object.values(table.columns), fks };
  }
  return model;
}

if (require.main === module) {
  const model = buildPgModel();
  const wanted = process.argv.slice(2);
  if (wanted.length === 0) {
    process.stdout.write(JSON.stringify(model));
  } else {
    for (const name of wanted) {
      const table = model.tables[name.toLowerCase()];
      if (!table) { console.log(`${name}: not created by the PostgreSQL migrations`); continue; }
      console.log(`${name}  (created by ${table.from})`);
      for (const c of table.cols) {
        console.log(`  ${c.name.padEnd(30)} ${c.type}${c.pk ? ' PRIMARY KEY' : ''}${c.notnull ? ' NOT NULL' : ''}${c.hasDefault ? ' (default)' : ''}`);
      }
    }
  }
}

module.exports = { buildPgModel };
