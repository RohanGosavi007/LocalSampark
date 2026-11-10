const fs = require('fs');
const path = require('path');

// Engine selection is explicit (H14). A suite that only makes sense on SQLite
// carries an `@engine sqlite-only` docblock tag; the PostgreSQL run leaves it
// out instead of letting it pin itself to SQLite and be counted as a
// PostgreSQL pass, which is how 84 suites quietly ran on SQLite in the
// "PostgreSQL" gate (F-127). engineSelection.test.js keeps tags and pins in step.
const usePg = process.env.TEST_USE_POSTGRES === '1' || process.env.TEST_USE_POSTGRES === 'true';
function sqliteOnlySuites() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); }
      else if (/\.test\.js$/.test(e.name) && /^\s*\*\s*@engine sqlite-only/m.test(fs.readFileSync(p, 'utf8'))) out.push(p);
    }
  };
  for (const d of ['src', 'tests']) if (fs.existsSync(path.join(__dirname, d))) walk(path.join(__dirname, d));
  return out;
}
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = {
  testEnvironment: 'node',
  // Without an explicit testMatch, Jest's default sweeps every .js file under
  // __tests__, which picks up shared helpers such as setup/testDb.js and fails
  // them with "Your test suite must contain at least one test".
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  testTimeout: 10000,

  // Builds an isolated test database from the real migrations, once, before any
  // suite runs. Without it the suite ran against src/data/localsampark.db —
  // the shared development database — and every write-heavy test mutated real
  // data that the demo then displayed.
  globalSetup: '<rootDir>/jest.globalSetup.js',

  // Points SQLITE_DB_PATH at that database before any test file's imports are
  // resolved. config/database.js reads the variable at module load, so setting
  // it inside a test only works while that test is the first thing to require
  // the database — true right up until someone adds an import above it.
  setupFiles: ['<rootDir>/jest.setup.js'],

  // Serial execution prevents SQLite write collisions (UNIQUE constraints on pincode/phone)
  // across parallel worker processes.
  maxWorkers: 1,
  testPathIgnorePatterns: ['/node_modules/', ...(usePg ? sqliteOnlySuites().map((p) => escape(p)) : [])],
  moduleNameMapper: {
    '^@localsampark/shared$': '<rootDir>/../packages/shared/index.js',
    '^@localsampark/shared/(.*)$': '<rootDir>/../packages/shared/$1',
  },
};

