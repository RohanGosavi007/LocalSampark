/**
 * Builds the database the Playwright backend runs against: a fresh SQLite
 * file, every migration, the standard seed, then the E2E fixtures.
 *
 * Run by the backend webServer command in playwright.config.js, immediately
 * before the server starts, so ordering does not depend on when Playwright
 * runs globalSetup relative to webServer.
 *
 * Rule L6: this must never touch the remote database configured in
 * backend/.env. It refuses to run unless USE_SQLITE=true and SQLITE_DB_PATH
 * names an e2e*.db file under backend/src/data/, and it clears every remote
 * connection variable before loading any backend module (dotenv does not
 * override variables that are already set, even to '').
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DATA_DIR = path.join(ROOT, 'backend', 'src', 'data');

function guard() {
  if (process.env.USE_SQLITE !== 'true') {
    throw new Error('prepare-db: USE_SQLITE must be "true" (rule L6)');
  }
  const target = process.env.SQLITE_DB_PATH && path.resolve(process.env.SQLITE_DB_PATH);
  if (!target || path.dirname(target) !== DATA_DIR || !/^e2e[\w-]*\.db$/.test(path.basename(target))) {
    throw new Error(`prepare-db: SQLITE_DB_PATH must be backend/src/data/e2e*.db (got ${process.env.SQLITE_DB_PATH || 'nothing'})`);
  }
  for (const key of ['DATABASE_URL', 'DIRECT_URL', 'PRISMA_DATABASE_URL', 'DB_HOST']) {
    if (process.env[key]) throw new Error(`prepare-db: ${key} is set; refusing to run next to a remote database (rule L6)`);
  }
  return target;
}

async function main() {
  const target = guard();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  // The file is generated, git-ignored and owned by this script; start clean
  // so every run sees exactly the fixtures below.
  for (const f of [target, `${target}-wal`, `${target}-shm`, `${target}-journal`]) {
    if (fs.existsSync(f)) fs.rmSync(f);
  }

  const { runMigration } = require(path.join(ROOT, 'backend/src/migrations/run'));
  await runMigration();
  const { runSeed } = require(path.join(ROOT, 'backend/src/seeds/run'));
  const seeded = await runSeed({ demo: true });
  const { seedE2eFixtures } = require('./fixtures');
  const fixtures = await seedE2eFixtures();
  console.log(`[e2e] ${path.relative(ROOT, target)} ready: seed ${seeded.created} rows, fixtures ${fixtures.created} rows`);
}

main().then(() => process.exit(0), (err) => {
  console.error('[e2e] prepare-db failed:', err && err.stack || err);
  process.exit(1);
});
