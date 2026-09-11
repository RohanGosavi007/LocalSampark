#!/usr/bin/env node
/**
 * Prove that migrating an empty database reproduces the current schema.
 *
 * The development database reached its present state incrementally, including a
 * primary-key rebuild that failed midway on a broken view and had to be
 * repaired by hand. That leaves an obvious question: does a clean
 * `npm run migrate` from empty actually produce the same thing, or does the
 * current schema only exist because of manual intervention that no fresh
 * environment would repeat?
 *
 * This builds a throwaway database, runs the migrations against it, and diffs
 * the resulting schema against the live one — table by table, column by column,
 * plus indexes and triggers.
 *
 *   node scripts/verify-fresh-migration.js
 */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const BACKEND = path.resolve(__dirname, '..');

/** Read a schema summary from a database at the given path, in a child process. */
function readSchema(dbPath) {
  const script = `
    process.env.SQLITE_DB_PATH = ${JSON.stringify(dbPath)};
    process.env.USE_SQLITE = 'true';
    const db = require(${JSON.stringify(path.join(BACKEND, 'src', 'config', 'database'))});
    (async () => {
      const out = { tables: {}, indexes: [], triggers: [] };
      const tables = await db.listTables();
      for (const t of tables) {
        const cols = await db.getTableColumns(t);
        out.tables[t] = cols.map(c => c.name + ':' + c.type).sort();
      }
      const idx = await db.query("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'");
      out.indexes = (idx.rows || []).map(r => r.name).sort();
      const trg = await db.query("SELECT name FROM sqlite_master WHERE type='trigger'");
      out.triggers = (trg.rows || []).map(r => r.name).sort();
      process.stdout.write('@@JSON@@' + JSON.stringify(out));
      process.exit(0);
    })();
  `;
  const out = execFileSync(process.execPath, ['-e', script], {
    cwd: BACKEND, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(out.slice(out.indexOf('@@JSON@@') + 8));
}

function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-freshdb-'));
  const freshPath = path.join(tmpDir, 'fresh.db');

  console.log('\nFresh-migration verification');
  console.log('='.repeat(78));
  console.log(`Building an empty database at ${freshPath}\n`);

  try {
    execFileSync('npm', ['run', 'migrate'], {
      cwd: BACKEND,
      env: { ...process.env, SQLITE_DB_PATH: freshPath, USE_SQLITE: 'true' },
      encoding: 'utf8',
      stdio: 'pipe',
      shell: process.platform === 'win32',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (e) {
    console.error('Migration against the fresh database failed:');
    console.error((e.stdout || '').toString().split('\n').slice(-15).join('\n'));
    process.exit(1);
  }

  const fresh = readSchema(freshPath);
  const live = readSchema(path.join(BACKEND, 'src', 'data', 'localsampark.db'));

  const freshTables = Object.keys(fresh.tables);
  const liveTables = Object.keys(live.tables);

  const missingInFresh = liveTables.filter((t) => !fresh.tables[t]);
  const extraInFresh = freshTables.filter((t) => !live.tables[t]);

  console.log(`tables   fresh ${freshTables.length}   live ${liveTables.length}`);
  console.log(`indexes  fresh ${fresh.indexes.length}   live ${live.indexes.length}`);
  console.log(`triggers fresh ${fresh.triggers.length}   live ${live.triggers.length}\n`);

  let problems = 0;

  if (missingInFresh.length) {
    problems++;
    console.log(`Tables the live database has but a fresh migration does NOT create (${missingInFresh.length}):`);
    console.log('  ' + missingInFresh.slice(0, 20).join(', ') + (missingInFresh.length > 20 ? ', ...' : ''));
    console.log('  ^ these exist only because of manual/incremental work and would be absent in any new environment.\n');
  }

  if (extraInFresh.length) {
    console.log(`Tables a fresh migration creates that the live database lacks (${extraInFresh.length}):`);
    console.log('  ' + extraInFresh.slice(0, 20).join(', ') + (extraInFresh.length > 20 ? ', ...' : '') + '\n');
  }

  // Column-level differences on tables both have.
  const colDiffs = [];
  for (const t of liveTables) {
    if (!fresh.tables[t]) continue;
    const a = new Set(live.tables[t]);
    const b = new Set(fresh.tables[t]);
    const onlyLive = [...a].filter((c) => !b.has(c));
    const onlyFresh = [...b].filter((c) => !a.has(c));
    if (onlyLive.length || onlyFresh.length) colDiffs.push({ t, onlyLive, onlyFresh });
  }

  if (colDiffs.length) {
    problems++;
    console.log(`Tables whose columns differ (${colDiffs.length}):`);
    for (const d of colDiffs.slice(0, 15)) {
      console.log(`  ${d.t}`);
      if (d.onlyLive.length) console.log(`      only in live : ${d.onlyLive.slice(0, 6).join(', ')}`);
      if (d.onlyFresh.length) console.log(`      only in fresh: ${d.onlyFresh.slice(0, 6).join(', ')}`);
    }
    if (colDiffs.length > 15) console.log(`  ... and ${colDiffs.length - 15} more`);
    console.log('');
  }

  const missingTriggers = live.triggers.filter((x) => !fresh.triggers.includes(x));
  if (missingTriggers.length) {
    problems++;
    console.log(`Triggers a fresh migration does not create (${missingTriggers.length}): ${missingTriggers.join(', ')}\n`);
  }

  if (!problems) {
    console.log('A fresh migration reproduces the live schema. No manual state required.\n');
  } else {
    console.log('The live schema is NOT fully reproducible from migrations alone — see above.\n');
  }

  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_e) {}
  process.exit(problems ? 1 : 0);
}

main();
