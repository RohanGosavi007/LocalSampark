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
};
