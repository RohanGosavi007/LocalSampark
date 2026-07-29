# Complete Automated Testing Implementation Plan for LocalSampark

> Full-stack test automation covering Backend API (94+ routes), Web App (63+ pages), Admin Panel (5 pages), and Mobile App (21+ screens).

---

## Current State Analysis

### What Exists Today

| Area | Status | Details |
|:-----|:-------|:--------|
| **Backend Unit Tests** | ⚠️ Minimal (4 files) | [app.test.js](file:///c:/localsampark%2024-07-2026/localsampark%2024-07-2026/localsampark%2023-07-2026/localsampark%2023-07-2026/backend/src/__tests__/app.test.js), [escrow.test.js](file:///c:/localsampark%2024-07-2026/localsampark%2024-07-2026/localsampark%2023-07-2026/localsampark%2023-07-2026/backend/src/__tests__/escrow.test.js), [rbac.test.js](file:///c:/localsampark%2024-07-2026/localsampark%2024-07-2026/localsampark%2023-07-2026/localsampark%2023-07-2026/backend/src/__tests__/rbac.test.js), [wallet.test.js](file:///c:/localsampark%2024-07-2026/localsampark%2024-07-2026/localsampark%2023-07-2026/localsampark%2023-07-2026/backend/src/__tests__/wallet.test.js) |
| **Load Testing** | ⚠️ Config only | Artillery is installed (`npm run test:load`) but no YAML flow files found |
| **E2E Web Tests** | ❌ None | No Playwright or Cypress configured |
| **E2E Admin Tests** | ❌ None | No automated testing for admin panel |
| **Mobile Tests** | ❌ None | No Detox/Appium configured for React Native |
| **CI/CD Pipeline** | ❌ None | `.github/` directory exists but no workflows found |
| **Test DB Isolation** | ❌ None | Tests hit the same dev database |

### Architecture Summary (What We're Testing)

```
┌─────────────────────────────────────────────────────────────────┐
│                     LocalSampark Monorepo                       │
├───────────────┬───────────────┬──────────────┬──────────────────┤
│  apps/web     │  apps/admin   │ apps/mobile  │    backend       │
│  Next.js      │  Next.js      │ Expo/RN      │    Express 5     │
│  63+ pages    │  5 pages      │ 21+ screens  │    94+ routes    │
│               │               │              │    7 modules     │
│               │               │              │    14 RBAC roles │
└───────┬───────┴───────┬───────┴──────┬───────┴────────┬─────────┘
        │               │              │                │
        └───────────────┴──────────────┴────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │  PostgreSQL + Redis    │
                    │  Socket.IO + Supabase  │
                    └───────────────────────┘
```

---

## Proposed Changes

### Testing Pyramid Strategy

We will implement **7 layers of automated testing**, ordered from fastest/cheapest to slowest/most comprehensive:

```
                    ┌─────────┐
                    │ Load &  │  ← Artillery (Performance under stress)
                    │ Perf    │
                   ┌┴─────────┴┐
                   │ Visual    │  ← Playwright Screenshots (Pixel regression)
                   │ Regression│
                  ┌┴───────────┴┐
                  │  E2E Browser │  ← Playwright (Full user journeys)
                  │  Tests       │
                 ┌┴──────────────┴┐
                 │  API Integration│  ← Supertest + Playwright API (Route tests)
                 │  Tests          │
                ┌┴────────────────┴┐
                │  Component Tests  │  ← React Testing Library (UI units)
                │                   │
               ┌┴──────────────────┴┐
               │  Unit Tests         │  ← Jest (Pure logic, middleware, utils)
               │                     │
              ┌┴────────────────────┴┐
              │  Static Analysis      │  ← ESLint + Type checking
              └───────────────────────┘
```

---

### Layer 1 — Backend Unit Tests (Jest)

> **Goal:** Test every middleware, utility, service, and worker function in isolation.

#### [NEW] `backend/src/__tests__/middleware/auth.middleware.test.js`

Tests for `authenticate`, `optionalAuth`, `requireAdmin`, `requireRole`, `requireTerritory`, `requireAreaAgent`, `hasAccess`, `enforceMultiTenancy`, and `generateTokens`. Covers all 14 RBAC roles.

#### [NEW] `backend/src/__tests__/middleware/rateLimit.middleware.test.js`

Validates that `rateLimiter`, `authLimiter`, `paymentLimiter`, `uploadLimiter`, `adminLimiter` enforce correct thresholds.

#### [NEW] `backend/src/__tests__/middleware/cache.middleware.test.js`

Tests Redis cache hit/miss/invalidation and the in-memory fallback path.

#### [NEW] `backend/src/__tests__/services/payment.gateway.test.js`

Unit tests for `PaymentGatewayEngine.createPaymentOrder()` (Razorpay, Cashfree, UPI) and `verifyWebhookSignature()` with valid/invalid/tampered payloads.

#### [NEW] `backend/src/__tests__/services/surge.engine.test.js`

Tests surge pricing calculations with varying `activeOrders`/`availableDrivers` ratios.

#### [NEW] `backend/src/__tests__/services/routing.service.test.js`

Tests Haversine distance calculation and OSRM route integration with mocked HTTP responses.

#### [NEW] `backend/src/__tests__/workers/paymentWorker.test.js`

Validates the escrow payout worker correctly credits technician wallets and marks bookings as settled.

#### [NEW] `backend/src/__tests__/workers/eventWorker.test.js`

Tests the event processing worker logic.

#### [NEW] `backend/src/__tests__/utils/sanitize.test.js`

Tests the XSS sanitization middleware with injection vectors (`<script>`, event handlers, nested objects, arrays).

#### [MODIFY] `backend/src/__tests__/rbac.test.js`

Expand from 2 tests to cover all 14 roles, `enforceMultiTenancy`, territory admin, and area agent middleware.

---

### Layer 2 — Backend API Integration Tests (Supertest)

> **Goal:** Test every API route end-to-end against a real test database.

#### [NEW] `backend/src/__tests__/setup/testDb.js`

A shared test database setup module that:
- Creates a dedicated `localsampark_test` PostgreSQL database (or uses SQLite for CI)
- Runs all migrations before the test suite
- Seeds baseline test data (test users for each of the 14 roles, a test shop, test products)
- Truncates all tables between test files
- Tears down after the suite

#### [NEW] `backend/src/__tests__/setup/testAuth.js`

Helper to generate valid JWT tokens for any role:
```javascript
// Usage: const token = getTokenForRole('shop_owner');
```

#### [NEW] `backend/src/__tests__/integration/auth.routes.test.js`

| Test Case | Method | Route |
|:----------|:-------|:------|
| Register new user with phone | POST | `/api/v1/auth/register` |
| Login with valid credentials | POST | `/api/v1/auth/login` |
| Reject expired JWT | GET | `/api/v1/users/me` |
| Refresh token flow | POST | `/api/v1/auth/refresh` |
| OTP verification | POST | `/api/v1/auth/verify-otp` |

#### [NEW] `backend/src/__tests__/integration/ecommerce.routes.test.js`

| Test Case | Method | Route |
|:----------|:-------|:------|
| List shops with cache | GET | `/api/v1/shops` |
| Create shop (shop_owner only) | POST | `/api/v1/shops` |
| Add product to shop | POST | `/api/v1/shops/:id/products` |
| Add to cart | POST | `/api/v1/cart/add` |
| Get cart | GET | `/api/v1/cart` |
| Checkout flow | POST | `/api/v1/checkout` |
| Place order | POST | `/api/v1/orders` |
| Payment webhook (Razorpay) | POST | `/api/v1/payments/webhook/razorpay` |
| Payment webhook (Cashfree) | POST | `/api/v1/payments/webhook/cashfree` |
| Wallet balance | GET | `/api/v1/wallet/balance` |
| Group buying create | POST | `/api/v1/group-buy` |
| Trust reviews | POST | `/api/v1/trust-reviews` |

#### [NEW] `backend/src/__tests__/integration/delivery.routes.test.js`

| Test Case | Method | Route |
|:----------|:-------|:------|
| Request P2P delivery | POST | `/api/v1/delivery/request` |
| List pending jobs | GET | `/api/v1/delivery/jobs` |
| Accept a job (first-come) | POST | `/api/v1/delivery/jobs/:id/accept` |
| Complete with OTP verification | POST | `/api/v1/delivery/jobs/:id/complete` |
| Agent onboarding/KYC | POST | `/api/v1/delivery/onboarding` |
| Agent analytics | GET | `/api/v1/delivery/analytics` |
| Concurrent accept race condition | POST×3 | `/api/v1/delivery/jobs/:id/accept` |

#### [NEW] `backend/src/__tests__/integration/community.routes.test.js`

Tests for `/feed`, `/chat`, `/societies`, `/events`, `/pets`, `/stories`, `/townsquare`, `/scrap`, `/community-hub`, `/volunteer`, `/donations`.

#### [NEW] `backend/src/__tests__/integration/services.routes.test.js`

Tests for `/jobs`, `/properties`, `/health-services`, `/rental`, `/carpool`, `/medical`, `/equipment`, `/chef`, `/tracking`, `/services`, `/care`, `/home-services`.

#### [NEW] `backend/src/__tests__/integration/crm.routes.test.js`

Tests for `/admin`, `/finance`, `/disputes`, `/franchise`, `/crm`, `/commissions`, `/territory`, `/earnings`, `/engagement`, `/fleet-assets`, `/leads-crm`, `/campaigns`, `/saas`, `/analytics`. All gated behind `requireAdmin`/`adminLimiter`.

#### [NEW] `backend/src/__tests__/integration/security.test.js`

| Test Case | Description |
|:----------|:------------|
| XSS injection in body | Send `<script>alert(1)</script>` in request body, verify sanitized |
| SQL injection attempt | Send `'; DROP TABLE users;--` in query params |
| CORS violation | Request from unauthorized origin, expect rejection |
| Rate limit enforcement | Send 100+ rapid requests, verify 429 response |
| HTTPS redirect | Verify redirect in production mode |
| Helmet headers | Verify CSP, HSTS, X-Frame-Options headers |
| JWT tampering | Modify token payload, verify 401 |
| Multi-tenancy isolation | Shop owner A cannot access Shop B's data |

---

### Layer 3 — E2E Browser Tests: Web App (Playwright)

> **Goal:** Simulate real users navigating the web app in Chrome, Firefox, and Safari.

#### [NEW] `tests/e2e/playwright.config.js`

```javascript
// Multi-project config: Chrome, Firefox, WebKit, Mobile Chrome, Mobile Safari
// baseURL: http://localhost:3000
// webServer: auto-starts backend + web dev servers
// Video recording on first retry
// HTML reporter for CI artifacts
```

#### [NEW] `tests/e2e/fixtures/auth.fixture.js`

Reusable Playwright fixture that provides pre-authenticated browser contexts for each role (resident, shop_owner, delivery_agent, admin, super_admin).

#### [NEW] `tests/e2e/web/homepage.spec.js`

| Test | What It Verifies |
|:-----|:-----------------|
| Page loads without errors | No console errors, status 200 |
| Hero section visible | Title, CTAs, gradient background |
| All 8 platform pillars render | Supermarket, Delivery, Community, etc. |
| SEO meta tags present | `<title>`, `<meta description>`, OG tags |
| Mobile responsive layout | Viewport 375×667 renders correctly |

#### [NEW] `tests/e2e/web/auth-flow.spec.js`

| Test | Journey |
|:-----|:--------|
| Login → Dashboard | Enter phone → OTP → Redirect to dashboard |
| Register new user | Fill form → Submit → Verify account created |
| Forgot password flow | Enter phone → Reset link → New password |
| Session persistence | Login → Close tab → Reopen → Still authenticated |
| Logout | Click logout → Verify redirect to login |

#### [NEW] `tests/e2e/web/shop-checkout.spec.js`

| Test | Journey |
|:-----|:--------|
| Browse shops | Navigate to `/shops` → Filter by category → Click shop |
| Add to cart | Click product → Select quantity → Add to cart |
| Cart management | Update quantity → Remove item → Verify totals |
| Checkout | Fill address → Select payment → Place order |
| Order tracking | Navigate to `/order-tracking` → Verify status timeline |

#### [NEW] `tests/e2e/web/delivery-dashboard.spec.js`

Tests the delivery agent dashboard: view available jobs, accept a job, mark as picked up, complete delivery with OTP.

#### [NEW] `tests/e2e/web/community.spec.js`

Tests the Townsquare feed, creating posts, voting on polls, lost & found, events.

#### [NEW] `tests/e2e/web/services.spec.js`

Tests booking a home service, chef service, equipment rental, carpool, medical.

#### [NEW] `tests/e2e/web/crm-dashboards.spec.js`

Tests the shop dashboard (`/shop-dashboard`), delivery dashboard (`/delivery-dashboard`), franchise dashboard, field dashboard, and CRM pages.

---

### Layer 4 — E2E Browser Tests: Admin Panel (Playwright)

#### [NEW] `tests/e2e/admin/login.spec.js`

| Test | Journey |
|:-----|:--------|
| Admin login | Navigate to `/login` → Enter credentials → Verify dashboard |
| Non-admin blocked | Login with `user` role → Verify 403 redirect |

#### [NEW] `tests/e2e/admin/dashboard.spec.js`

Tests the main admin dashboard page: stats cards, charts, recent activity, quick actions.

#### [NEW] `tests/e2e/admin/territories.spec.js`

Tests territory management: list, create, edit, delete territories.

#### [NEW] `tests/e2e/admin/audit.spec.js`

Tests the audit log page: filters, search, export.

#### [NEW] `tests/e2e/admin/settings.spec.js`

Tests admin settings: platform config, notification settings, feature flags.

---

### Layer 5 — Visual Regression Tests (Playwright Screenshots)

> **Goal:** Catch unintended CSS/layout changes by comparing screenshots pixel-by-pixel.

#### [NEW] `tests/visual/web-pages.spec.js`

Takes full-page screenshots of every major page and compares against golden baselines:
- Homepage, Login, Register, Shop listing, Shop detail, Cart, Checkout
- Community feed, Events, Services, Delivery dashboard
- Profile, Wallet, Rewards, Premium

#### [NEW] `tests/visual/admin-pages.spec.js`

Screenshots of admin dashboard, territories, audit, settings in both light and dark mode.

#### [NEW] `tests/visual/responsive.spec.js`

Screenshots at 4 breakpoints: 375px (mobile), 768px (tablet), 1280px (laptop), 1920px (desktop).

---

### Layer 6 — Load & Performance Tests (Artillery)

> **Goal:** Ensure the backend can handle production traffic without degradation.

#### [NEW] `backend/load-tests/critical-flow.yml`

```yaml
# Simulates 50 virtual users ramping to 200 over 5 minutes
# Flow: Login → Browse Shops → Add to Cart → Checkout → Track Order
# Thresholds:
#   - p95 response time < 500ms
#   - Error rate < 1%
#   - Throughput > 100 RPS
```

#### [NEW] `backend/load-tests/spike-test.yml`

Simulates a traffic spike (0 → 500 users in 30 seconds) to test auto-scaling and rate limiting.

#### [NEW] `backend/load-tests/soak-test.yml`

Sustained load of 100 users for 30 minutes to detect memory leaks and connection pool exhaustion.

#### [NEW] `backend/load-tests/webhook-stress.yml`

Fires 1000 concurrent payment webhook POSTs to test idempotency and database deadlock handling.

---

### Layer 7 — Mobile App Tests (Detox)

> **Goal:** Automated UI testing of the React Native / Expo mobile app.

#### [NEW] `apps/mobile/e2e/config.js`

Detox configuration for iOS Simulator and Android Emulator.

#### [NEW] `apps/mobile/e2e/login.test.js`

| Test | Journey |
|:-----|:--------|
| OTP Login | Launch → Enter phone → Enter OTP → Verify dashboard |
| Role-based routing | Login as resident → See resident dashboard. Login as shop owner → See shop dashboard |

#### [NEW] `apps/mobile/e2e/resident-dashboard.test.js`

Tests the resident dashboard: stories row, pillars navigation, quick tiles, Townsquare feed, SOS alert button, floating checkout bar.

#### [NEW] `apps/mobile/e2e/community.test.js`

Tests the community screen: view posts, create post modal, vote on polls.

#### [NEW] `apps/mobile/e2e/directory.test.js`

Tests the shop directory: search, filter by category, open shop detail.

---

### Infrastructure & CI/CD

#### [NEW] `tests/e2e/global-setup.js`

Global setup that:
1. Starts backend in test mode using a `localsampark_test` database
2. Runs all DB migrations and seeds
3. Starts web and admin dev servers
4. Waits for all health checks to pass

#### [NEW] `tests/e2e/global-teardown.js`

Kills all dev servers and drops the test database.

#### [NEW] `docker-compose.test.yml`

A lightweight test-specific Docker Compose that spins up only PostgreSQL and Redis for CI environments. No Nginx, no web/admin containers.

#### [NEW] `.github/workflows/test.yml`

GitHub Actions CI pipeline:
```yaml
# Triggers: On every push and PR to main/develop
# Jobs:
#   1. lint        - ESLint across all workspaces (2 min)
#   2. unit-tests  - Jest backend unit tests (3 min)
#   3. api-tests   - Supertest integration tests with test DB (5 min)
#   4. e2e-web     - Playwright web tests on Chrome+Firefox (10 min)
#   5. e2e-admin   - Playwright admin tests (5 min)
#   6. visual      - Playwright screenshot comparison (5 min)
#   7. load-test   - Artillery critical flow (5 min, main branch only)
# Artifacts: HTML reports, videos of failed tests, coverage reports
```

#### [MODIFY] `package.json` (Root)

Add new scripts:
```json
{
  "test:unit": "npm run test --workspace=backend",
  "test:api": "npm run test:integration --workspace=backend",
  "test:e2e": "npx playwright test --config=tests/e2e/playwright.config.js",
  "test:e2e:web": "npx playwright test --config=tests/e2e/playwright.config.js --project=web",
  "test:e2e:admin": "npx playwright test --config=tests/e2e/playwright.config.js --project=admin",
  "test:visual": "npx playwright test --config=tests/e2e/playwright.config.js --project=visual",
  "test:load": "npm run test:load --workspace=backend",
  "test:all": "npm run test:unit && npm run test:api && npm run test:e2e",
  "test:coverage": "npm run test -- --coverage --workspace=backend"
}
```

---

## Open Questions

> [!IMPORTANT]
> **Database for Testing:** Should we use a separate PostgreSQL database (`localsampark_test`) for integration tests, or should we use SQLite (which the backend already supports for dev mode)? PostgreSQL is more accurate but requires Docker. SQLite is faster for CI but may miss Postgres-specific behavior.

> [!IMPORTANT]
> **Mobile Testing Priority:** Detox requires either a macOS machine (for iOS Simulator) or an Android Emulator. Since your current CI is likely Linux/Windows-based, do you want to prioritize mobile testing now, or focus on backend + web first and add mobile later?

> [!IMPORTANT]
> **Visual Regression Baseline:** When we first run visual tests, they will generate baseline screenshots. These must be committed to the repository (~50-100 PNG files, ~5MB). Is that acceptable?

---

## Coverage Targets

| Layer | Test Count | Coverage Target | Runtime |
|:------|:-----------|:----------------|:--------|
| Unit Tests (Jest) | ~80 tests | 85% line coverage on `middleware/`, `services/`, `workers/`, `utils/` | ~15 seconds |
| API Integration (Supertest) | ~120 tests | 90%+ route coverage (all 94 routes) | ~60 seconds |
| E2E Web (Playwright) | ~50 tests | All critical user journeys across 15+ pages | ~3 minutes |
| E2E Admin (Playwright) | ~15 tests | All admin pages and CRUD operations | ~1 minute |
| Visual Regression | ~30 screenshots | All major pages at 2 breakpoints | ~2 minutes |
| Load Tests (Artillery) | 4 scenarios | p95 < 500ms, error rate < 1% | ~10 minutes |
| Mobile (Detox) | ~20 tests | Core flows: login, dashboard, directory, community | ~5 minutes |
| **Total** | **~315 tests** | **~90% application coverage** | **~35 minutes** |

---

## New Dependencies to Install

| Package | Purpose | Where |
|:--------|:--------|:------|
| `@playwright/test` | E2E browser testing for web + admin | Root `devDependencies` |
| `playwright` | Browser binaries (Chromium, Firefox, WebKit) | Root `devDependencies` |
| `@testing-library/react` | Component-level React testing | `apps/web` & `apps/admin` `devDependencies` |
| `@testing-library/jest-dom` | Custom Jest matchers for DOM assertions | `apps/web` & `apps/admin` `devDependencies` |
| `msw` (Mock Service Worker) | API mocking for component tests | `apps/web` `devDependencies` |
| `detox` | Native mobile app E2E testing | `apps/mobile` `devDependencies` |
| `artillery` | Already installed | Backend |
| `jest` | Already installed (v30) | Backend |
| `supertest` | Already installed (v7) | Backend |

---

## Directory Structure (New Files)

```
localsampark/
├── tests/
│   ├── e2e/
│   │   ├── playwright.config.js          # Main Playwright config
│   │   ├── global-setup.js               # Start servers before tests
│   │   ├── global-teardown.js            # Stop servers after tests
│   │   ├── fixtures/
│   │   │   └── auth.fixture.js           # Pre-authenticated contexts
│   │   ├── web/
│   │   │   ├── homepage.spec.js
│   │   │   ├── auth-flow.spec.js
│   │   │   ├── shop-checkout.spec.js
│   │   │   ├── delivery-dashboard.spec.js
│   │   │   ├── community.spec.js
│   │   │   ├── services.spec.js
│   │   │   └── crm-dashboards.spec.js
│   │   ├── admin/
│   │   │   ├── login.spec.js
│   │   │   ├── dashboard.spec.js
│   │   │   ├── territories.spec.js
│   │   │   ├── audit.spec.js
│   │   │   └── settings.spec.js
│   │   └── visual/
│   │       ├── web-pages.spec.js
│   │       ├── admin-pages.spec.js
│   │       └── responsive.spec.js
│
├── backend/
│   ├── src/__tests__/
│   │   ├── setup/
│   │   │   ├── testDb.js                 # Test DB lifecycle
│   │   │   └── testAuth.js               # JWT token generator for tests
│   │   ├── middleware/
│   │   │   ├── auth.middleware.test.js
│   │   │   ├── rateLimit.middleware.test.js
│   │   │   └── cache.middleware.test.js
│   │   ├── services/
│   │   │   ├── payment.gateway.test.js
│   │   │   ├── surge.engine.test.js
│   │   │   └── routing.service.test.js
│   │   ├── workers/
│   │   │   ├── paymentWorker.test.js
│   │   │   └── eventWorker.test.js
│   │   ├── utils/
│   │   │   └── sanitize.test.js
│   │   └── integration/
│   │       ├── auth.routes.test.js
│   │       ├── ecommerce.routes.test.js
│   │       ├── delivery.routes.test.js
│   │       ├── community.routes.test.js
│   │       ├── services.routes.test.js
│   │       ├── crm.routes.test.js
│   │       └── security.test.js
│   └── load-tests/
│       ├── critical-flow.yml
│       ├── spike-test.yml
│       ├── soak-test.yml
│       └── webhook-stress.yml
│
├── apps/mobile/e2e/
│   ├── config.js
│   ├── login.test.js
│   ├── resident-dashboard.test.js
│   ├── community.test.js
│   └── directory.test.js
│
├── docker-compose.test.yml
└── .github/workflows/test.yml
```

---

## Verification Plan

### Automated Tests
```bash
# Run all unit tests with coverage
npm run test:unit

# Run API integration tests
npm run test:api

# Run Playwright E2E tests (all browsers)
npm run test:e2e

# Run load tests
npm run test:load

# Run everything
npm run test:all
```

### Manual Verification
- Review Playwright HTML report for failed test screenshots and videos
- Review Jest coverage report (target: 85%+)
- Review Artillery performance report (target: p95 < 500ms)
- Verify CI pipeline runs successfully on a test PR

---

## Pros and Cons Summary

### ✅ Pros
| Benefit | Impact |
|:--------|:-------|
| **Catch regressions instantly** | Every PR is automatically validated against ~315 tests |
| **Confidence in deployments** | No more "did we break checkout?" anxiety |
| **Multi-browser validation** | Chrome, Firefox, Safari tested simultaneously |
| **Race condition detection** | Concurrent escrow/booking tests prevent double-spending bugs |
| **Performance baselines** | Artillery ensures APIs stay fast under load |
| **Visual consistency** | Screenshot diffs catch CSS regressions automatically |
| **Documentation as code** | Tests serve as living documentation of expected behavior |

### ⚠️ Cons
| Concern | Mitigation |
|:--------|:-----------|
| **Initial setup time (~2-3 weeks)** | We prioritize critical paths first (auth, checkout, delivery) |
| **CI runtime (~35 min total)** | Parallelized across jobs; unit tests gate fast |
| **Flaky E2E tests** | Playwright's auto-wait + data-testid selectors minimize flakiness |
| **Test database maintenance** | Automated migration + seed scripts keep test DB in sync |
| **Screenshot storage (~5MB)** | Acceptable; stored in Git LFS if needed |
| **Mobile testing requires emulator** | Deferred to Phase 2; focus on web + API first |

---

## Reliability Assessment

> **Is automated testing reliable?**

**Yes, with discipline.** Here is what makes tests reliable or unreliable:

| Factor | Reliable ✅ | Unreliable ❌ |
|:-------|:-----------|:-------------|
| Element selection | `data-testid="checkout-btn"` | `div.cls-42 > span:nth-child(3)` |
| Test data | Dedicated test DB with seeded data | Sharing dev database |
| Wait strategy | Playwright auto-wait / `expect().toBeVisible()` | `setTimeout(3000)` |
| Test isolation | Each test creates its own data | Tests depend on order of execution |
| Network | Mock external APIs (Razorpay, Cashfree) | Hit real payment gateways in tests |
| CI environment | Docker containers with fixed versions | Developer's local machine |

Our implementation follows **all the reliable patterns** above.
