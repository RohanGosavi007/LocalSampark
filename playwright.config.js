// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * LocalSampark - Playwright E2E Test Configuration
 * Covers: Web App, Admin Panel, Visual Regression, API Testing
 */
module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],
  
  /* Shared settings for all projects */
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers and test types */
  projects: [
    // ── Web App Tests ──
    {
      name: 'web-chromium',
      testDir: './tests/e2e/web',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
      },
    },
    {
      name: 'web-firefox',
      testDir: './tests/e2e/web',
      use: { 
        ...devices['Desktop Firefox'],
        baseURL: 'http://localhost:3000',
      },
    },
    {
      name: 'web-webkit',
      testDir: './tests/e2e/web',
      use: { 
        ...devices['Desktop Safari'],
        baseURL: 'http://localhost:3000',
      },
    },

    // ── Admin Panel Tests ──
    {
      name: 'admin-chromium',
      testDir: './tests/e2e/admin',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3001',
      },
    },

    // ── Mobile Web Emulation ──
    {
      name: 'mobile-chrome',
      testDir: './tests/e2e/web',
      use: { 
        ...devices['Pixel 7'],
        baseURL: 'http://localhost:3000',
      },
    },
    {
      name: 'mobile-safari',
      testDir: './tests/e2e/web',
      use: { 
        ...devices['iPhone 14'],
        baseURL: 'http://localhost:3000',
      },
    },

    // ── Visual Regression Tests ──
    {
      name: 'visual',
      testDir: './tests/e2e/visual',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
      },
    },

    // ── API Contract Tests ──
    {
      name: 'api',
      testDir: './tests/e2e/api',
      use: {
        baseURL: 'http://localhost:5000/api/v1',
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
        },
      },
    },

    // ── Accessibility Tests ──
    {
      name: 'a11y',
      testDir: './tests/e2e/accessibility',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
      },
    },
  ],

  /* Web server configuration - auto-start backend and frontend servers before tests */
  webServer: [
    {
      command: 'node backend/src/server.js',
      url: 'http://localhost:5000/health',
      reuseExistingServer: true,
      timeout: 30000,
      env: {
        NODE_ENV: 'test',
        PORT: '5000',
        USE_SQLITE: 'false',
        DB_NAME: 'localsampark_test',
        JWT_SECRET: 'test-jwt-secret-key-localsampark-2026',
        JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-key-localsampark-2026',
      },
    },
    {
      command: 'cd apps/web && npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 60000,
      env: {
        NODE_ENV: 'test',
        PORT: '3000',
      },
    },
  ],
});
