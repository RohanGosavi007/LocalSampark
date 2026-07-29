/**
 * Detox Jest Configuration for Mobile E2E Tests
 */
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.test.js'],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '../../test-results/mobile',
      outputName: 'mobile-e2e-results.xml',
    }],
  ],
  verbose: true,
};
