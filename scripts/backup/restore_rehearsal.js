#!/usr/bin/env node
/**
 * Restore rehearsal (P10): proves a backup can actually be restored.
 *
 * A backup that has never been restored is a hope. This takes a real
 * `pg_dump` of a local database, encrypts it the way production backups are,
 * restores it into a brand-new scratch database, and compares the two:
 * every table's row count and a content checksum, plus the number of triggers
 * (the order-history triggers of migration 148 must survive a restore).
 *
 *   node scripts/backup/restore_rehearsal.js                 build a populated database first (migrate + demo seed), then rehearse
 *   node scripts/backup/restore_rehearsal.js --source <url>  rehearse an existing local database as it is
 *
 * Local only: the source must be on this machine, and the scratch database is
 * always named *_rehearsal, created fresh and dropped at the end. It never
 * touches a remote database (rule L6). Evidence is written to
 * docs/audit/evidence/restore-rehearsal-<time>/rehearsal.json (no secrets).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { runBackup } = require('./pg_dump_backup');
const { runRestore } = require('./restore_backup');
const { parseDatabaseUrl, redactUrl } = require('./pgTools');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_SOURCE = 'postgresql://postgres:password@127.0.0.1:5432/localsampark_test';
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const HASH_ROW_LIMIT = 200000;

/** The differences between two snapshots ({ tables: { name: { rows, md5 } }, triggers }). Empty means identical. */
function compareSnapshots(source, restored) {
  const problems = [];
  const names = new Set([...Object.keys(source.tables), ...Object.keys(restored.tables)]);
  for (const name of [...names].sort()) {
    const a = source.tables[name];
    const b = restored.tables[name];
    if (!a) problems.push(`table ${name} exists only in the restored database`);
    else if (!b) problems.push(`table ${name} is missing from the restored database`);
    else {
      if (a.rows !== b.rows) problems.push(`table ${name}: ${a.rows} rows in the source, ${b.rows} restored`);
      else if (a.md5 && b.md5 && a.md5 !== b.md5) problems.push(`table ${name}: same row count (${a.rows}) but the content differs`);
    }
  }
  if (source.triggers !== restored.triggers) problems.push(`triggers: ${source.triggers} in the source, ${restored.triggers} restored`);
  return problems;
}

/** Row count and content checksum of every table in the public schema, plus the trigger count. */
async function snapshot(client) {
  const tables = {};
  const list = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  for (const { tablename } of list.rows) {
    if (tablename === 'spatial_ref_sys') continue; // PostGIS's own reference data
    const quoted = `"${tablename.replace(/"/g, '""')}"`;
    const rows = Number((await client.query(`SELECT count(*) AS n FROM ${quoted}`)).rows[0].n);
    let md5 = null;
    if (rows > 0 && rows <= HASH_ROW_LIMIT) {
      md5 = (await client.query(`SELECT md5(COALESCE(string_agg(t::text, '|' ORDER BY t::text), '')) AS h FROM ${quoted} t`)).rows[0].h;
    }
    tables[tablename] = { rows, md5 };
  }
  const triggers = Number((await client.query(
    "SELECT count(*) AS n FROM pg_trigger tg JOIN pg_class c ON c.oid = tg.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE NOT tg.tgisinternal AND n.nspname = 'public'"
  )).rows[0].n);
  return { tables, triggers };
}

/**
 * Creates a fresh local database, applies every migration and the demo seed, and
 * returns its URL. The test database is emptied by the test suites, and a
 * rehearsal of an empty database proves very little.
 */
async function buildPopulatedSource(adminClient, base) {
  const name = `${base.database}_rehearsal_source`.slice(0, 63);
  await adminClient.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await adminClient.query(`CREATE DATABASE "${name}"`);
  const url = `postgresql://${encodeURIComponent(base.user)}:${encodeURIComponent(base.password)}@${base.host}:${base.port}/${name}`;
  const env = {
    ...process.env, NODE_ENV: 'test', USE_SQLITE: 'false', TEST_USE_POSTGRES: '1', DB_SSL: 'false', SUPABASE_URL: '',
    DB_HOST: base.host, DB_PORT: base.port, DB_NAME: name, DB_USER: base.user, DB_PASSWORD: base.password,
    DATABASE_URL: url, DIRECT_URL: url,
  };
  const run = (args) => execFileSync(process.execPath, args, { cwd: path.join(ROOT, 'backend'), env, stdio: 'pipe', timeout: 600000 });
  run(['src/migrations/run.js']);
  run(['src/seeds/seed-investor-demo.js']);
  return { name, url };
}

async function rehearse({ source = null, evidenceRoot = path.join(ROOT, 'docs', 'audit', 'evidence') } = {}) {
  const { Client } = require('pg');
  const base = parseDatabaseUrl(source || DEFAULT_SOURCE);
  let builtSource = null;
  if (!LOCAL_HOSTS.has(base.host)) {
    throw new Error(`The rehearsal only runs against a database on this machine (got ${base.host}).`);
  }
  if (!source) {
    const bootstrap = new Client({ connectionString: `postgresql://${encodeURIComponent(base.user)}:${encodeURIComponent(base.password)}@${base.host}:${base.port}/postgres` });
    await bootstrap.connect();
    try { builtSource = await buildPopulatedSource(bootstrap, base); } finally { await bootstrap.end(); }
    source = builtSource.url;
  }
  const src = parseDatabaseUrl(source);
  if (!LOCAL_HOSTS.has(src.host)) {
    throw new Error(`The rehearsal only runs against a database on this machine (got ${src.host}).`);
  }
  const scratchName = `${src.database}_restore_rehearsal`.slice(0, 63);
  const adminUrl = `postgresql://${encodeURIComponent(src.user)}:${encodeURIComponent(src.password)}@${src.host}:${src.port}/postgres`;
  const scratchUrl = `postgresql://${encodeURIComponent(src.user)}:${encodeURIComponent(src.password)}@${src.host}:${src.port}/${scratchName}`;

  const startedAt = new Date();
  const stamp = startedAt.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const evidenceDir = path.join(evidenceRoot, `restore-rehearsal-${stamp}`);
  fs.mkdirSync(evidenceDir, { recursive: true });
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-rehearsal-'));
  // The key production uses, if it is set here; otherwise a throwaway one.
  const usingRealKey = Boolean(process.env.BACKUP_ENCRYPTION_KEY);
  const key = process.env.BACKUP_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

  const steps = [];
  const step = async (name, fn) => {
    const t0 = Date.now();
    const result = await fn();
    steps.push({ step: name, ms: Date.now() - t0 });
    return result;
  };

  const admin = new Client({ connectionString: adminUrl });
  const evidence = {
    kind: 'restore-rehearsal',
    startedAt: startedAt.toISOString(),
    source: redactUrl(source),
    scratch: scratchName,
    populatedBy: builtSource ? 'all migrations + the demo seed (backend/src/seeds/seed-investor-demo.js)' : 'an existing database, as it was',
    encryptionKey: usingRealKey ? 'BACKUP_ENCRYPTION_KEY (production key)' : 'throwaway key for this run',
  };
  let outcome = 'FAIL';
  try {
    await admin.connect();

    const backup = await step('pg_dump + encrypt (AES-256-GCM) + SHA-256', () => runBackup({ databaseUrl: source, backupDir: workDir, encryptionKey: key }));
    evidence.archive = { bytes: backup.sizeBytes, sha256: backup.checksum, simulated: backup.isSimulated };
    if (backup.isSimulated) throw new Error('The backup was simulated, not a real dump.');

    await step('dry-run: checksum and decryption', () => runRestore({ archivePath: backup.archivePath, encryptionKey: key, dryRun: true }));

    await step('a tampered archive is refused', async () => {
      const bytes = fs.readFileSync(backup.archivePath);
      bytes[bytes.length - 1] ^= 0xff;
      const tampered = path.join(workDir, 'tampered.dump.enc');
      fs.writeFileSync(tampered, bytes);
      let refused = false;
      try { await runRestore({ archivePath: tampered, encryptionKey: key, dryRun: true }); } catch { refused = true; }
      if (!refused) throw new Error('A tampered archive was accepted.');
    });

    await step('a wrong key is refused', async () => {
      let refused = false;
      try { await runRestore({ archivePath: backup.archivePath, encryptionKey: crypto.randomBytes(32).toString('hex'), dryRun: true }); } catch { refused = true; }
      if (!refused) throw new Error('A wrong key was accepted.');
    });

    await step('create an empty scratch database', async () => {
      await admin.query(`DROP DATABASE IF EXISTS "${scratchName}" WITH (FORCE)`);
      await admin.query(`CREATE DATABASE "${scratchName}"`);
    });

    await step('restore into the scratch database', () => runRestore({
      archivePath: backup.archivePath, encryptionKey: key, dryRun: false, databaseUrl: scratchUrl, confirmDatabase: scratchName,
    }));

    const [before, after] = await step('compare every table and the triggers', async () => {
      const a = new Client({ connectionString: source });
      const b = new Client({ connectionString: scratchUrl });
      await Promise.all([a.connect(), b.connect()]);
      try { return [await snapshot(a), await snapshot(b)]; } finally { await Promise.all([a.end(), b.end()]); }
    });
    const problems = compareSnapshots(before, after);
    evidence.tables = Object.keys(before.tables).length;
    evidence.rows = Object.values(before.tables).reduce((n, t) => n + t.rows, 0);
    evidence.triggers = { source: before.triggers, restored: after.triggers };
    evidence.mismatches = problems;
    if (problems.length) throw new Error(`The restored database differs from the source: ${problems.slice(0, 5).join('; ')}`);
    outcome = 'PASS';
  } catch (error) {
    evidence.error = error.message;
  } finally {
    try { await admin.query(`DROP DATABASE IF EXISTS "${scratchName}" WITH (FORCE)`); } catch { /* best effort */ }
    if (builtSource) { try { await admin.query(`DROP DATABASE IF EXISTS "${builtSource.name}" WITH (FORCE)`); } catch { /* best effort */ } }
    await admin.end().catch(() => {});
    fs.rmSync(workDir, { recursive: true, force: true });
    evidence.outcome = outcome;
    evidence.steps = steps;
    evidence.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(evidenceDir, 'rehearsal.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  }
  return { outcome, evidence, evidenceDir };
}

if (require.main === module) {
  const i = process.argv.indexOf('--source');
  rehearse({ source: i >= 0 ? process.argv[i + 1] : null })
    .then(({ outcome, evidence, evidenceDir }) => {
      console.log(JSON.stringify(evidence, null, 2));
      console.log(`[REHEARSAL] ${outcome}. Evidence: ${path.relative(ROOT, evidenceDir)}`);
      process.exit(outcome === 'PASS' ? 0 : 1);
    })
    .catch((error) => { console.error(`[REHEARSAL] ERROR: ${error.message}`); process.exit(1); });
}

module.exports = { rehearse, compareSnapshots, snapshot };
