// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const DEV = process.env.E2E_DEV === '1';

/**
 * LocalSampark - Playwright E2E Test Configuration
 * Covers: Web App, Admin Panel, Visual Regression, API Testing
 */
module.exports = defineConfig({
  testDir: './tests/e2e',
  // Budgets for the Next dev servers, which compile a route on its first hit.
  // With web and admin specs running in parallel, several workers can wait on
  // the same cold compile of / at once; on 2026-11-10 that took longer than
  // the 30 s defaults and failed the homepage specs (each loads in ~3 s warm).
  // These are time budgets, not assertions.
  timeout: 120000,
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
    navigationTimeout: 90000,
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
      // prepare-db builds backend/src/data/e2e.db from scratch (migrations,
      // seed, fixtures in scripts/e2e/fixtures.js) right before the server
      // starts, so every run sees the same data and never a developer's DB.
      command: 'node scripts/e2e/prepare-db.js && node backend/src/server.js',
      url: 'http://localhost:5000/health',
      // Never attach to a server that is already running: it could be a dev
      // backend pointed at the remote database (rule L6), and its data would
      // not be the fixtures the specs expect. A busy port fails the run.
      reuseExistingServer: false,
      timeout: 180000,
      env: {
        SQLITE_DB_PATH: 'backend/src/data/e2e.db',
        // dotenv (backend/src/server.js) fills in anything not already set
        // from backend/.env, which holds live credentials. Setting each to ''
        // keeps the E2E backend off the remote database and off every real
        // SMS, e-mail, WhatsApp, push, payment and storage provider.
        ...Object.fromEntries([
          'DATABASE_URL', 'DIRECT_URL', 'PRISMA_DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY',
          'SUPABASE_SERVICE_ROLE_KEY', 'REDIS_HOST', 'REDIS_PASSWORD', 'FIREBASE_PROJECT_ID',
          'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_SERVICE_ACCOUNT_JSON',
          'MSG91_AUTH_KEY', 'MSG91_TEMPLATE_ID', 'MSG91_SENDER_ID', 'FAST2SMS_API_KEY',
          'WHATSAPP_API_KEY', 'WHATSAPP_SENDER_NUMBER', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS',
          'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'MINIO_ENDPOINT', 'MINIO_ACCESS_KEY',
          'MINIO_SECRET_KEY', 'OPENAI_API_KEY', 'GOOGLE_MAPS_API_KEY', 'SENTRY_DSN',
        ].map((k) => [k, ''])),
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
        // send-otp returns the code it issued, so specs can register new
        // customers through the real verify-otp path. envValidator refuses this
        // flag in production.
        ALLOW_FREE_OTP_MODE: 'true',
        JWT_SECRET: 'test-jwt-secret-key-localsampark-2026',
        JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-key-localsampark-2026',
      },
    },
    {
      // A production build by default: what ships, and fast per request.
      // Under `next dev` every first visit to a route compiled it, and with
      // parallel workers the compiles queued behind each other: plain page
      // loads took 15-18 s and request timeouts failed specs that pass in
      // ~3 s (2026-11-10). E2E_DEV=1 keeps dev mode for local iteration.
      command: DEV ? 'npm run dev --workspace=apps/web' : 'npm run build --workspace=apps/web && npm run start --workspace=apps/web',
      url: 'http://localhost:3000',
      reuseExistingServer: false,
      timeout: 600000,
      env: {
        // `next dev` manages NODE_ENV itself; pinning it to 'test' here made
        // Next warn about a non-standard value on every boot.
        PORT: '3000',
        // apps/web/src/lib/api.js appends /api/v1 to this origin.
        NEXT_PUBLIC_API_URL: 'http://localhost:5000',
        // apps/web/.env holds a live Firebase project; with it the login page
        // put a real Google reCAPTCHA in front of every E2E sign-in. Set to ''
        // (Next does not override a variable that is already set), so the
        // page uses the server OTP the E2E backend issues.
        ...Object.fromEntries([
          'NEXT_PUBLIC_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
          'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
          'NEXT_PUBLIC_FIREBASE_APP_ID', 'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
        ].map((k) => [k, ''])),
      },
    },
    {
      // The 'admin-chromium' project has baseURL http://localhost:3001, but
      // nothing ever started the admin app — tests/e2e/admin could only fail
      // with ERR_CONNECTION_REFUSED. apps/admin's dev script already binds
      // 3001.
      command: DEV ? 'npm run dev --workspace=apps/admin' : 'npm run build --workspace=apps/admin && npm run start --workspace=apps/admin',
      url: 'http://localhost:3001',
      reuseExistingServer: false,
      timeout: 600000,
      env: {
        NEXT_PUBLIC_API_URL: 'http://localhost:5000',
      },
    },
  ],
});
