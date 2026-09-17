/**
 * Runs before every test file, ahead of any module it imports.
 *
 * The ordering is the entire point. `config/database.js` reads SQLITE_DB_PATH
 * at module load, so setting it inside a test file only works if that file is
 * the first thing to require the database — which is true until someone adds an
 * import above it. Jest's `setupFiles` run before the test module graph is
 * built, so the path is fixed before anything can read it.
 *
 * Until this existed, the suite ran against src/data/localsampark.db — the
 * shared development database. Every write-heavy test mutated real data: a full
 * run left roughly 3,500 synthetic interaction events behind, which inflated
 * the demo's own click-through rate and fed fabricated pairs into the
 * collaborative matrix. A stray `spatial-test-*` shop from some earlier run was
 * still sitting in the catalogue months later.
 *
 * The path is kept identical to the one jest.globalSetup.js migrates, and both
 * derive it from the same helper so they cannot drift apart.
 */

const fs = require('fs');
const { TEST_DB_PATH } = require('./jest.globalSetup');

process.env.NODE_ENV = 'test';
process.env.USE_SQLITE = process.env.TEST_USE_POSTGRES ? 'false' : 'true';

if (!process.env.TEST_USE_POSTGRES) {
  // One database per jest worker.
  //
  // Jest runs suites in parallel across workers, and they all pointed at the
  // single migrated file. SQLite handles concurrent readers, but these suites
  // write: they insert territories, assign them, and delete by id prefix. Two
  // suites running at once would collide on `territories.pincode`, which is
  // UNIQUE, or one would delete fixtures the other was mid-way through using.
  //
  // The symptom was the worst kind — a suite that passed alone and failed
  // perhaps one run in three, with a different test each time. It had already
  // been worked around once by moving one suite onto different pincodes, which
  // fixes that collision and none of the others.
  //
  // Each worker copies the migrated database once and works on its own file.
  // Suites within a worker still share, but jest runs those sequentially, which
  // is the ordering they already assume and clean up for.
  const workerId = process.env.JEST_WORKER_ID || '1';
  const workerDbPath = TEST_DB_PATH.replace(/\.db$/, `.worker${workerId}.db`);

  if (!fs.existsSync(workerDbPath)) {
    // The sidecars come too. SQLite runs in WAL mode here, so a freshly
    // migrated and seeded database keeps recent writes in `-wal` until a
    // checkpoint folds them into the main file. Copying only the `.db` yields a
    // database that opens cleanly and is missing the fixtures — which reads as
    // "the catalogue is empty" rather than as a broken copy.
    fs.copyFileSync(TEST_DB_PATH, workerDbPath);
    for (const suffix of ['-wal', '-shm']) {
      if (fs.existsSync(TEST_DB_PATH + suffix)) {
        fs.copyFileSync(TEST_DB_PATH + suffix, workerDbPath + suffix);
      }
    }
  }

  process.env.SQLITE_DB_PATH = workerDbPath;
}

// Tests assert on behaviour, not on secrets. A fixed value keeps token-signing
// deterministic across runs without anyone needing a local .env.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-not-used-in-production';
