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
        // NOT 'test'. server.js ends with
        //     if (process.env.NODE_ENV !== 'test') { startServer()... }
        // — the usual guard so Jest/Supertest can import `app` without
        // binding a port. Launching this webServer with NODE_ENV=test meant
        // startServer() was never called, nothing ever listened on 5000, and
        // Playwright sat on http://localhost:5000/health until it timed out.
        // Every e2e/visual/a11y/api job failed there, before any spec ran.
        //
        // 'development' keeps the SQLite branch (selected by USE_SQLITE
        // below) while leaving the guard untouched for the unit tests.
        NODE_ENV: 'development',
        PORT: '5000',
        // Was 'false', which pointed the query layer at a PostgreSQL
        // instance that CI never provisions (.github/workflows/test.yml
        // declares no postgres service for the e2e jobs), so the backend
        // never came up and every Playwright job died waiting on /health.
        //
        // It was also self-contradictory: server.js already takes the SQLite
        // branch whenever NODE_ENV === 'test', while src/config/database.js
        // keys purely off USE_SQLITE — so the server booted SQLite while the
        // repositories loaded a Postgres pool.
        USE_SQLITE: 'true',
        DB_NAME: 'localsampark_test',
        JWT_SECRET: 'test-jwt-secret-key-localsampark-2026',
        JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-key-localsampark-2026',
      },
    },
    {
      command: 'npm run dev --workspace=apps/web',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 60000,
      env: {
        // `next dev` manages NODE_ENV itself; pinning it to 'test' here made
        // Next warn about a non-standard value on every boot.
        PORT: '3000',
        // apps/web/src/lib/api.js appends /api/v1 to this origin.
        NEXT_PUBLIC_API_URL: 'http://localhost:5000',
      },
    },
    {
      // The 'admin-chromium' project has baseURL http://localhost:3001, but
      // nothing ever started the admin app — tests/e2e/admin could only fail
      // with ERR_CONNECTION_REFUSED. apps/admin's dev script already binds
      // 3001.
      command: 'npm run dev --workspace=apps/admin',
      url: 'http://localhost:3001',
      reuseExistingServer: true,
      timeout: 60000,
      env: {
        NEXT_PUBLIC_API_URL: 'http://localhost:5000',
      },
    },
  ],
});
