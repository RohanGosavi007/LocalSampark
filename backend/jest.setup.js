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

const { TEST_DB_PATH } = require('./jest.globalSetup');

process.env.NODE_ENV = 'test';
process.env.USE_SQLITE = process.env.TEST_USE_POSTGRES ? 'false' : 'true';

if (!process.env.TEST_USE_POSTGRES) {
  process.env.SQLITE_DB_PATH = TEST_DB_PATH;
}

// Tests assert on behaviour, not on secrets. A fixed value keeps token-signing
// deterministic across runs without anyone needing a local .env.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-not-used-in-production';
