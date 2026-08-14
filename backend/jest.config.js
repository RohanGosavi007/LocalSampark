module.exports = {
  testEnvironment: 'node',
  // Without an explicit testMatch, Jest's default sweeps every .js file under
  // __tests__, which picks up shared helpers such as setup/testDb.js and fails
  // them with "Your test suite must contain at least one test".
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  testTimeout: 10000,
};
