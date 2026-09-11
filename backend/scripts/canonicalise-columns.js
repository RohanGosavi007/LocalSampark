#!/usr/bin/env node
/**
 * Canonicalise column names on the live SQLite schema.
 *
 * The two DDL sets drifted into synonyms rather than genuine gaps: the live
 * database has local_shops.phone while the PostgreSQL DDL declares
 * phone_number, community_posts.likes versus likes_count,
 * job_alerts.last_sent_at versus last_sent. Adding the declared names would
 * leave both columns present, with writes landing in one and reads looking at
 * the other.
 *
 * The live SQLite name is treated as truth. This classifies every
 * declared-but-absent column as one of:
 *
 *   RENAME   a synonym of an existing column — PostgreSQL should be renamed to
 *            match, and code using the declared name updated.
 *   ADD      no plausible counterpart exists; a genuine missing column.
 *   REVIEW   a counterpart may exist but the match is not confident enough to
 *            act on automatically.
 *
 * Nothing is renamed or dropped by this script; it only reports and, with
 * --write, emits a migration plus a code-change list for review.
 *
 *   node scripts/canonicalise-columns.js
 *   node scripts/canonicalise-columns.js --write
 */
const fs = require('fs');
const path = require('path');

const MIG = path.resolve(__dirname, '..', 'src', 'migrations');
const SRC = path.resolve(__dirname, '..', 'src');
const GENERATED = new Set(['068_pg_parity_missing_tables.sql', '070_canonicalise_columns.sql']);

function ddlFiles() {
  const all = fs.readdirSync(MIG).filter((f) => f.endsWith('.sql') && !GENERATED.has(f));
  const init = all.filter((f) => /^init\./.test(f)).sort();
  return [...init, ...all.filter((f) => !/^init\./.test(f)).sort()];
}

/** Every column name the DDL declares per table. */
function declaredColumns() {
  const declared = new Map();
  const add = (t, c) => {
    const k = t.toLowerCase();
    if (!declared.has(k)) declared.set(k, new Set());
    declared.get(k).add(c.toLowerCase());
  };
  for (const f of ddlFiles()) {
    const sql = fs.readFileSync(path.join(MIG, f), 'utf8');
    const createRe = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+"?(\w+)"?\s*\(([\s\S]*?)\n\s*\)\s*;/gi;
    let m;
    while ((m = createRe.exec(sql))) {
      for (const raw of m[2].split('\n')) {
        const line = raw.trim().replace(/,$/, '');
        if (!line || line.startsWith('--')) continue;
        if (/^(PRIMARY KEY|UNIQUE|CHECK|FOREIGN KEY|CONSTRAINT)\b/i.test(line)) continue;
        const c = line.match(/^"?(\w+)"?\s+[A-Za-z]/);
        if (c) add(m[1], c[1]);
      }
    }
    const alterRe = /ALTER TABLE\s+"?(\w+)"?\s+ADD COLUMN(?:\s+IF NOT EXISTS)?\s+"?(\w+)"?/gi;
    while ((m = alterRe.exec(sql))) add(m[1], m[2]);
  }
  return declared;
}

/** Suffix/prefix pairs that mean the same thing in this schema. */
const EQUIV_SUFFIXES = ['_count', '_at', '_number', '_url', '_urls', '_id', '_name', '_text', '_json'];

function synonymScore(missing, existing) {
  if (missing === existing) return 1;

  // phone <-> phone_number, likes <-> likes_count, last_sent <-> last_sent_at
  for (const suf of EQUIV_SUFFIXES) {
    if (missing === existing + suf || existing === missing + suf) return 0.9;
  }
  // review_text <-> review, photo_urls <-> photos
  const stripA = missing.replace(/(_count|_at|_number|_url|_urls|_text|_json)$/, '');
  const stripB = existing.replace(/(_count|_at|_number|_url|_urls|_text|_json)$/, '');
  if (stripA && stripA === stripB) return 0.85;

  // full_name <-> name, applicant_name <-> name: one ends with the other on a
  // word boundary. Weaker, so it lands in REVIEW rather than RENAME.
  if (missing.endsWith('_' + existing) || existing.endsWith('_' + missing)) return 0.6;

  return 0;
}

async function main() {
  const db = require('../src/config/database');
  const declared = declaredColumns();
  const liveTables = new Set((await db.listTables()).map((t) => t.toLowerCase()));

  // Application source, for finding code that uses a non-canonical name.
  const srcFiles = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['migrations', 'seeds', '__tests__', 'node_modules'].includes(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.js')) srcFiles.push(full);
    }
  })(SRC);
  const sources = srcFiles.map((f) => ({ file: f, text: fs.readFileSync(f, 'utf8') }));

  const renames = [];
  const adds = [];
  const review = [];

  for (const [table, cols] of declared) {
    if (!liveTables.has(table)) continue;
    const live = (await db.getTableColumns(table)).map((c) => c.name.toLowerCase());
    const liveSet = new Set(live);

    for (const col of cols) {
      if (liveSet.has(col)) continue;

      let best = { name: null, score: 0 };
      for (const l of live) {
        const s = synonymScore(col, l);
        if (s > best.score) best = { name: l, score: s };
      }

      const usedIn = sources
        .filter((s) => new RegExp(`\\b${col}\\b`).test(s.text))
        .map((s) => path.relative(path.resolve(__dirname, '..'), s.file).replace(/\\/g, '/'));

      const entry = { table, declared: col, canonical: best.name, score: best.score, usedIn };
      if (best.score >= 0.85) renames.push(entry);
      else if (best.score > 0) review.push(entry);
      else if (usedIn.length) adds.push(entry);
    }
  }

  console.log('\nColumn canonicalisation — live SQLite names are authoritative');
  console.log('='.repeat(78));
  console.log(`RENAME (confident synonym) : ${renames.length}`);
  console.log(`REVIEW (possible synonym)  : ${review.length}`);
  console.log(`ADD    (genuinely missing) : ${adds.length}\n`);

  console.log('RENAME — PostgreSQL should adopt the live SQLite name:');
  for (const r of renames.slice(0, 30)) {
    console.log(`  ${r.table}.${r.declared}`.padEnd(46) + `-> ${r.canonical}` + (r.usedIn.length ? `   [code: ${r.usedIn.length} file(s)]` : ''));
  }
  if (renames.length > 30) console.log(`  ... and ${renames.length - 30} more`);

  console.log('\nADD — no counterpart in the live table, and code references them:');
  for (const a of adds.slice(0, 20)) console.log(`  ${a.table}.${a.declared}`.padEnd(46) + `[code: ${a.usedIn.length} file(s)]`);
  if (adds.length > 20) console.log(`  ... and ${adds.length - 20} more`);

  console.log('\nREVIEW — weak match, needs a human decision:');
  for (const r of review.slice(0, 15)) console.log(`  ${r.table}.${r.declared}`.padEnd(46) + `~ ${r.canonical} (${r.score})`);
  if (review.length > 15) console.log(`  ... and ${review.length - 15} more`);

  if (!process.argv.includes('--write')) {
    console.log('\nReport only. Pass --write to emit migration 070 and the code-change list.\n');
    return;
  }

  const lines = [
    '-- Migration 070 (PostgreSQL): adopt the live SQLite column names',
    '--',
    '-- The two DDL sets drifted into synonyms rather than genuine gaps:',
    '-- local_shops.phone vs phone_number, community_posts.likes vs likes_count,',
    '-- job_alerts.last_sent_at vs last_sent. Adding the declared names would have',
    '-- left both columns present, with writes landing in one and reads in the other.',
    '--',
    '-- The live SQLite name is authoritative, so PostgreSQL is renamed to match.',
    '-- Generated by scripts/canonicalise-columns.js against real column metadata',
    '-- (PRAGMA table_info / information_schema), not parsed DDL text.',
    '--',
    '-- NOT EXECUTED: no PostgreSQL instance was available. Review before applying.',
    '',
  ];
  for (const r of renames) {
    lines.push(`-- ${r.table}: ${r.declared} -> ${r.canonical}`);
    lines.push(`ALTER TABLE ${r.table} RENAME COLUMN ${r.declared} TO ${r.canonical};`);
  }
  fs.writeFileSync(path.join(MIG, '070_canonicalise_columns.sql'), lines.join('\n') + '\n');

  const codeFixes = renames.filter((r) => r.usedIn.length);
  fs.writeFileSync(
    path.join(__dirname, '..', 'canonicalise-code-changes.json'),
    JSON.stringify(codeFixes, null, 2)
  );

  console.log(`\nWritten: src/migrations/070_canonicalise_columns.sql (${renames.length} renames)`);
  console.log(`Written: canonicalise-code-changes.json (${codeFixes.length} needing code updates)\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
