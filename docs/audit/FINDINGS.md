# LocalSampark Audit Findings Ledger

This ledger tracks every defect identified across the monorepo. Every entry must include full forensic details, verification proof, and commit hashes.

---

### Lead L1: Admin Quick Login Bypass in Production
- **ID:** SEC-001 (L1)
- **Severity:** P0 (Security)
- **Platform:** Admin Console (`apps/admin`), Backend (`backend`)
- **Module:** Auth & Identity
- **Location:** `apps/admin/src/app/login/page.js:L59-69, L242-258`
- **Symptom:** Admin login screen renders a "⚡ DEV: Bypass via Quick Login" button that authenticates with hardcoded credentials (`+919999999991` / `123456`) without development environment gating.
- **Root Cause:** Quick login handler is unconditionally present in production bundles and backend demo credential verification lacks strict production refusal.
- **Fix:** Strictly gated `handleQuickLogin` handler and the quick login UI button to `process.env.NODE_ENV === 'development'`.
- **Test:** Added automated regression test in `apps/admin/tests/adminRequests.test.mjs` verifying development gating; verified `src/__tests__/integration/adminLoginBypass.test.js` passes all 7 tests.
- **Evidence:** Clean execution of `npm test --workspace=@localsampark/admin` and `npx jest src/__tests__/integration/adminLoginBypass.test.js`.
- **Commit:** `c258a63`
- **Status:** CLOSED

---

### Lead L2: Mobile AsyncStorage Auth Token Key Mismatch
- **ID:** AUTH-002 (L2)
- **Severity:** P0 (Functional)
- **Platform:** Mobile (`apps/mobile`)
- **Module:** Auth & Identity / Shared Modules
- **Location:** `apps/mobile/app/modules/{admin-dashboard,blood-bank,carpool,delivery-dashboard,events,jobs,properties,referral,services,townsquare}/index.js`
- **Symptom:** Mobile screens read `AsyncStorage.getItem('token')` which is never populated. Screens behave as logged-out, send no Authorization headers, and bypass 401 token refresh.
- **Root Cause:** `apps/mobile/src/lib/secureStorage.js` stores tokens under `authToken` / `refreshToken`, but screens read `token` directly from `AsyncStorage`.
- **Fix:** Migrated all 10 mobile module screens to use centralized `apiGet` and `apiPost`; implemented bidirectional token compatibility bridge in `SecureTokenStorage` and `clearSession()`.
- **Test:** `npx eslint . --quiet` exits with 0 errors; mobile Jest suite passes 10/10 suites and 228/228 tests; `npx expo export --platform android` bundles 5,550 modules into bytecode with exit code 0.
- **Evidence:** Grep confirmation showing zero unhandled `AsyncStorage.getItem('token')` in screens; clean test suite runs.
- **Commit:** `2e3419a`
- **Status:** CLOSED

---

### Lead L3: Web and Admin Direct Fetch & Storage Key Mismatch
- **ID:** AUTH-003 (L3)
- **Severity:** P0 (Functional / Security)
- **Platform:** Web (`apps/web`), Admin (`apps/admin`)
- **Module:** Auth & Identity / Core API Client
- **Location:** `apps/web/src/` (~306 raw `fetch(` calls), `apps/admin/src/` (9 raw `fetch(` calls)
- **Symptom:** Web client defines `SESSION_KEYS.token` as `'auth_token'`, but multiple files read `localStorage.getItem('token')`. Direct `fetch` calls bypass token refresh, leading to unexpected session drops.
- **Root Cause:** Ad-hoc fetch calls implemented without importing centralized `api` helper.
- **Fix:** Normalized storage key priority to `'auth_token'` across web components (`shop-manager`, `OrderHistory`, `ShopChat`, `LoyaltyGamification`, `scrap`), added bidirectional `'token'` compatibility bridge in `saveAuthSession` and `clearSession`, and updated admin `getAuthHeaders` and `test-runner` to check `admin_token` with `auth_token`/`token` fallbacks.
- **Test:** Created regression suite `apps/web/tests/authStorageKeys.test.mjs`; all 30 web tests and 3 admin tests pass with 0 failures.
- **Evidence:** Grep confirmation showing zero unhandled bare `localStorage.getItem('token')` in web and admin.
- **Commit:** `e055c49`
- **Status:** CLOSED

---

### Lead L4: Inconsistent Role Spelling Across Backend and Mobile
- **ID:** RBAC-004 (L4)
- **Severity:** P1 (Security / Functional)
- **Platform:** Backend (`backend`), Mobile (`apps/mobile`)
- **Module:** RBAC & Authorization
- **Location:** Backend (~68 files `'super_admin'`, 7 files `'superadmin'`), Mobile events/townsquare admin checks
- **Symptom:** Admin checks fail silently because `'superadmin'` does not match `'super_admin'`, locking out legitimate administrators or bypassing checks.
- **Root Cause:** Absence of centralized role enum shared between database, JWT payload, and frontend/mobile guards.
- **Fix:** Added bidirectional normalization in `auth.middleware.js` (`resolveAdminRole`, `requireRole`, `verifyRole`, `FULL_ADMIN_ROLES`) mapping `'SUPERADMIN'` and `'SUPER_ADMIN'` symmetrically. Updated route guards in `events.controller.js`, `sos.routes.js`, `finance.routes.js`, and `chef.controller.js`.
- **Test:** Executed `npx jest src/__tests__/rbac.test.js` and automated static sweeps in `scripts/audit/run-static-sweeps.js`.
- **Evidence:** Automated sweep report in `docs/audit/static-sweeps.md`.
- **Commit:** `8e2a8dd`
- **Status:** CLOSED

---

### Lead L5: PostgreSQL Dialect Auto-Heal Shim Hiding Query Defects
- **ID:** DB-005 (L5)
- **Severity:** P1 (Reliability)
- **Platform:** Backend (`backend`)
- **Module:** Database Adapter
- **Location:** `backend/src/config/database.js:L210-216`
- **Symptom:** Database adapter intercepts Postgres error `42883` and rewrites `= 1` / `= 0` to `= true` / `= false` for six column names at runtime.
- **Root Cause:** SQL queries written with SQLite integer booleans rather than standard parameterized booleans.
- **Fix:** Fixed SQL queries across backend codebase to use standard boolean `true` / `false` literals supported natively by both PostgreSQL and SQLite. Removed the auto-heal regex shim from `backend/src/config/database.js`.
- **Test:** Full PostgreSQL concurrency suite and Gate G4/G6 executions pass without auto-heal interception.
- **Evidence:** Clean execution of database.js query handler without retry; `backend/src/config/database.js`.
- **Commit:** `launch/ecommerce-v1 (M2)`
- **Status:** CLOSED

---

### Lead L6: Jest Test Suite Unrestricted Hosted Database Connection
- **ID:** SEC-006 (L6)
- **Severity:** P0 (Safety / Production Protection)
- **Platform:** Backend (`backend`)
- **Module:** Test Harness & Database Scripts
- **Location:** `backend/jest.globalSetup.js:L158`, `backend/scripts/*.js`
- **Symptom:** Running tests with `TEST_USE_POSTGRES=1` could target the hosted Supabase instance specified in `DATABASE_URL` instead of localhost.
- **Root Cause:** Missing runtime assertion confirming host is `localhost` or `127.0.0.1`.
- **Fix:** Added `maxWorkers: 1` to `backend/jest.config.js` to eliminate concurrent SQLite file collisions; added explicit host assertions in `jest.globalSetup.js` and `jest.setup.js` refusing any non-local database host.
- **Test:** Added `backend/src/__tests__/testSafetyGuard.test.js` asserting remote hosts are rejected; full backend test suite passes 122/122 suites and 1,488/1,488 unit tests cleanly.
- **Evidence:** Executed `npx jest src/__tests__/testSafetyGuard.test.js` and full backend unit test suite.
- **Commit:** `ecf9b4e`
- **Status:** CLOSED

---

### Lead L7: Concurrency & FOR UPDATE Locking Untested on SQLite
- **ID:** DB-007 (L7)
- **Severity:** P1 (Data Integrity / Money)
- **Platform:** Backend (`backend`)
- **Module:** Payments, Orders, Inventory, Bookings
- **Location:** `backend/src/config/database.sqlite.js:L31` (`cleanSql.replace(/\s+FOR\s+UPDATE\b/gi, "")`)
- **Symptom:** Race conditions in wallet balance top-up, checkout inventory deduction, and seat bookings cannot be caught on SQLite.
- **Root Cause:** SQLite strips `FOR UPDATE` queries.
- **Fix:** In `database.sqlite.js`, upgraded `withTransaction` from deferred `BEGIN TRANSACTION` to `BEGIN IMMEDIATE`, ensuring that write locks are acquired immediately at transaction start and serialized through `transactionQueue`. In PostgreSQL driver, native row-level locking via `SELECT ... FOR UPDATE` is fully retained.
- **Test:** Ran concurrency and financial test suites `escrow.test.js` (2/2 passed), `wallet.test.js` (2/2 passed), `orderLifecycle.test.js`, and `razorpayPayments.test.js` (49/49 tests passed).
- **Evidence:** Clean test runs with zero busy errors or lock contention failures.
- **Commit:** `2270f96`
- **Status:** CLOSED

---

### Lead L8: Default Weak Secrets and Compose Environment Drift
- **ID:** SEC-008 (L8)
- **Severity:** P1 (Security)
- **Platform:** Infrastructure (`docker-compose.yml`, `render.yaml`, `backend/src/config/envValidator.js`)
- **Module:** Security & Configuration
- **Location:** `docker-compose.yml` (`JWT_SECRET=production_super_secret`)
- **Symptom:** Potential deployment of known default secrets; unvalidated environment variables.
- **Root Cause:** Hardcoded fallback values in docker compose and template drift.
- **Fix:** Removed hardcoded `JWT_SECRET=production_super_secret` from `docker-compose.yml`, mapped to `${JWT_SECRET}`, and added `production_super_secret` to banned secret list in `backend/src/config/envValidator.js` which exits process on boot in production.
- **Test:** Tested envValidator with `NODE_ENV=production` and verified deployConfig tests pass (`npx jest src/__tests__/deployConfig.test.js`).
- **Evidence:** Verified clean execution of deployConfig.test.js.
- **Commit:** `3d4dc00`
- **Status:** CLOSED

---

### Lead L9: Swallowed Errors in Try/Catch and Console Logging
- **ID:** CODE-009 (L9)
- **Severity:** P1 (Observability)
- **Platform:** All Platforms
- **Module:** Core Services & Clients
- **Location:** Monorepo-wide (~140 empty catch blocks, ~317 `console.log` in backend)
- **Symptom:** Failures are silently suppressed without user notification or structured log tracing.
- **Root Cause:** Ad-hoc debugging blocks left unmigrated to winston logger or structured error boundaries.
- **Fix:** Migrated 32 backend service/controller files from `console.log` to structured Winston `logger.info`/`logger.warn` logging; triaged empty catch blocks with logging handlers. Added `POL-07` launch policy test.
- **Test:** Gate G15 policy test `POL-07` passes (0 `console.log` calls in backend `src`).
- **Evidence:** `node scripts/verify/launch-policy.mjs` Gate 15 report.
- **Commit:** `launch/ecommerce-v1 (M2)`
- **Status:** CLOSED

---

### Lead L10: Fabricated or Placeholder UI Behaviour
- **ID:** UX-010 (L10)
- **Severity:** P1 (Integrity)
- **Platform:** Mobile (`apps/mobile`), Web (`apps/web`), Backend (`backend`)
- **Module:** Multiple Modules
- **Location:** `shop-management.controller.js`, `shop.routes.js`, `RestaurantVisitorView.js`, `RetailVisitorView.js`
- **Symptom:** UI displays synthetic `Math.random()` numbers or "Coming soon" buttons without real API wiring.
- **Root Cause:** Prototype screens and controllers with stubbed random metrics.
- **Fix:** Removed all `Math.random()` business data from commerce endpoints; replaced "coming soon" placeholders in visitor views with genuine empty state components (`No menu items currently available for this shop`, `No products currently available for this shop`). Added `POL-04` and `POL-05` policy checks.
- **Test:** Gate G15 policy tests `POL-04` and `POL-05` pass cleanly with 0 violations.
- **Evidence:** `node scripts/verify/launch-policy.mjs` Gate 15 report.
- **Commit:** `launch/ecommerce-v1 (M2)`
- **Status:** CLOSED

---

### Lead L11: Unverified Open Items from 2026-10-14 Audit Report
- **ID:** MOD-011 (L11)
- **Severity:** P1 (Completeness)
- **Platform:** Mobile, Web, Backend
- **Module:** Events, Home Services, Loyalty, Carpool, Medical, Category Managers
- **Location:** `EventsScreen.js`, `HomeServicesScreen.js`, `MedicalScreen.js`, `manager/[category].js`, migration 097
- **Symptom:** Past audit report highlighted stubbed ticket inventory, fake doctor booking, and synthetic pincode centroids.
- **Root Cause:** Incomplete vertical implementations.
- **Fix:** Conduct forensic verification of each item; implement live APIs or formalize status.
- **Test:** Dedicated integration tests for each affected flow.
- **Evidence:** `LocalSampark_Deep_Audit_and_Pending_Tasks_Report.pdf`.
- **Commit:** Pending
- **Status:** OPEN

---

### Lead L12: Dual SOS Architectures (`/emergency` vs `/sos`)
- **ID:** ARCH-012 (L12)
- **Severity:** P1 (Safety / Architecture)
- **Platform:** Web, Mobile, Backend
- **Module:** Safety & Emergency
- **Location:** `backend/src/routes/emergency.routes.js`, `backend/src/modules/core/routes/sos.routes.js`, `apps/web/src/app/emergency`, `apps/mobile/app/modules/sos`
- **Symptom:** Web uses `/emergency` while mobile uses `/sos`, creating risk that mobile alerts are disconnected from operator dispatch consoles.
- **Root Cause:** Parallel development of emergency modules without canonical unification.
- **Fix:** Harmonize endpoints under a single canonical SOS/Emergency controller and socket room.
- **Test:** End-to-end socket test triggering SOS on mobile and verifying delivery on web/admin console.
- **Evidence:** Route mounts in `backend/src/routes/index.js` and `server.js`.
- **Commit:** Pending
- **Status:** OPEN

---

### Lead L13: Android App Links & AssetLinks SHA-256 Fingerprint
- **ID:** MOB-013 (L13)
- **Severity:** P2 (Mobile UX)
- **Platform:** Mobile (`apps/mobile`), Web (`apps/web`)
- **Module:** Deep Linking & Intent Filters
- **Location:** `apps/mobile/app.json`, `apps/web/public/.well-known/assetlinks.json`
- **Symptom:** Deep links to `localsampark.in` may open in browser instead of the Android app if fingerprint or intent filter is misaligned.
- **Root Cause:** Unverified SHA-256 certificate fingerprint in `assetlinks.json`.
- **Fix:** Match keystore SHA-256 with `assetlinks.json` and verify Content-Type header on web host.
- **Test:** `adb shell am start -a android.intent.action.VIEW -d "https://localsampark.in/shops"` test.
- **Evidence:** Inspect `apps/web/public/.well-known/assetlinks.json` and `apps/mobile/app.json`.
- **Commit:** Pending
- **Status:** OPEN

---

### Lead L14: Mobile Development LAN IP in Build Profiles
- **ID:** MOB-014 (L14)
- **Severity:** P2 (Configuration)
- **Platform:** Mobile (`apps/mobile`)
- **Module:** Environment Configuration
- **Location:** `apps/mobile/app.json`, `apps/mobile/eas.json`
- **Symptom:** Development API points to hardcoded LAN IP `192.168.1.7`.
- **Root Cause:** Local developer machine IP embedded in config.
- **Fix:** Removed hardcoded LAN IP `192.168.1.7` from `apps/mobile/app.json`. API resolution uses dynamic environment override `EXPO_PUBLIC_API_URL` or loopback `10.0.2.2` in dev, and strictly locks to `PRODUCTION_API` in release builds.
- **Test:** Gate G15 policy test `POL-06` passes with 0 LAN IPs in mobile release config.
- **Evidence:** `node scripts/verify/launch-policy.mjs` Gate 15 report.
- **Commit:** `launch/ecommerce-v1 (M2)`
- **Status:** CLOSED

---

### Lead L15: Repository Hygiene & Stray Script Triage
- **ID:** HYG-015 (L15)
- **Severity:** P2 (Hygiene)
- **Platform:** Backend, Root Workspace
- **Module:** Tooling & Scripts
- **Location:** `backend/` root (`fix_*.js`, `migrate_phase*.js`, `test_*.js`, empty `.db`), root `fix_*` scripts
- **Symptom:** Accumulation of ad-hoc scratch scripts and duplicate migration utilities causing confusion.
- **Root Cause:** Historical debugging scripts not moved to `scripts/archive/`.
- **Fix:** Audit all scripts, classify into active vs dead, and archive obsolete utilities with owner confirmation.
- **Test:** Verify build and migrate pipelines remain functional without stray scripts.
- **Evidence:** Directory listing of `backend/` and repository root.
- **Commit:** Pending
- **Status:** OPEN

---

### Lead L16: Mobile AuthContext Syntax Error Breaks Android Export & Linter
- **ID:** AUTH-004 (L16)
- **Severity:** P0 (Build Blocker)
- **Platform:** Mobile (`apps/mobile`)
- **Module:** Auth & Identity
- **Location:** `apps/mobile/src/context/AuthContext.js:L453-455, L578`
- **Symptom:** `npx expo export --platform android` fails with `SyntaxError: 'import' and 'export' may only appear at the top level (578:0)` after bundling 5,546 modules. `npx eslint .` fails across entire mobile app with 48 cascaded import errors.
- **Root Cause:** Incomplete `try { ... } catch (e) {` inside `initSupabaseRealtime` (line 453) was left unclosed before `const verifyOtp = async ...` was declared, leaving two unclosed curly braces (`{`) and causing `export function useAuth()` at line 578 to be treated as nested inside a block.
- **Fix:** Properly closed `catch (e)` and `initSupabaseRealtime` function in `AuthContext.js`; imported missing `ActivityIndicator` in `app/modules/services/index.js`.
- **Test:** `npx eslint . --quiet` exits with code 0 (0 errors); `npx expo export --platform android` bundles 5,550 modules into bytecode with exit code 0.
- **Evidence:** Executed baseline and post-fix runs of `npx eslint . --quiet` and `npx expo export --platform android`.
- **Commit:** `1604537`
- **Status:** CLOSED

---

### Finding N1: Free OTP Mode Hands Out Production Login Codes
- **ID:** SEC-N01 (N1)
- **Severity:** P0 (Security)
- **Platform:** Backend (`backend`)
- **Module:** Auth & Identity
- **Location:** `backend/src/modules/core/routes/auth.routes.js:L220-240`, `backend/src/config/envValidator.js`
- **Symptom:** With `ALLOW_FREE_OTP_MODE=true`, `POST /auth/send-otp` and `POST /auth/send-whatsapp-otp` leak the generated OTP in the HTTP JSON response body for any phone number.
- **Root Cause:** Free OTP debugging mode was not restricted to development and lacked production environment validator gating.
- **Fix:** Gated `response.otp = otp` behind `DEMO_LOGIN_ALLOWED() && ALLOW_FREE_OTP_MODE === 'true'`. Added fatal startup validator in `envValidator.js` that causes process exit if `NODE_ENV === 'production'` and `ALLOW_FREE_OTP_MODE === 'true'`.
- **Test:** `backend/src/__tests__/authSecurity.test.js` passes 4/4 tests (`[N1.1]`-`[N1.4]`).
- **Evidence:** `docs/audit/evidence/verify-2026-10-25T08-42-54/`
- **Status:** VERIFIED

---

### Finding N2: Mobile Plain AsyncStorage Token Storage Regression
- **ID:** SEC-N02 (N2)
- **Severity:** P0 (Security Regression)
- **Platform:** Mobile (`apps/mobile`)
- **Module:** Auth & Storage
- **Location:** `apps/mobile/src/lib/secureStorage.js`
- **Symptom:** L2 bridge was copying access and refresh tokens into plain `AsyncStorage` (`sec_<key>` and `token`) even on Android, exposing tokens to plain file inspection and Android backup leaks.
- **Root Cause:** Defensive fallback in L2 fix mirrored tokens into AsyncStorage unconditionally.
- **Fix:** Reverted native token storage in `secureStorage.js` to strictly write via `SecureStore.setItemAsync`. Only web falls back to AsyncStorage. Added `cleanupLegacyStorage()` purging legacy plain tokens on boot.
- **Test:** `apps/mobile/__tests__/secureStorage.test.js` passes 5/5 tests (`[N2.1]`-`[N2.5]`). All 233 mobile tests pass.
- **Evidence:** `docs/audit/evidence/verify-2026-10-25T08-42-54/`
- **Status:** VERIFIED

---

### Finding N3: Ephemeral Disk File Vanishing on Free Tiers
- **ID:** ARCH-N03 (N3)
- **Severity:** P0 (Launch Blocker)
- **Platform:** Backend (`backend`)
- **Module:** File Storage
- **Location:** `backend/src/services/storage/`, `backend/src/modules/core/services/upload.service.js`
- **Symptom:** Product images and KYC documents stored on local disk vanish on container restart on free ephemeral hosts.
- **Root Cause:** File upload service was coupled directly to local filesystem `public/uploads` and `private_uploads`.
- **Fix:** Architected pluggable storage provider abstraction (`StorageProvider`, `LocalStorageProvider`, `S3StorageProvider`). Public files routed to CDN prefix, private documents protected via AWS SigV4 signed URLs. Local filesystem retained for local development.
- **Test:** `backend/src/__tests__/storageService.test.js` (3/3 passed) and `backend/src/__tests__/integration/uploads.test.js` (15/15 passed).
- **Evidence:** `docs/audit/evidence/verify-2026-10-25T08-42-54/`
- **Status:** VERIFIED

---

### Finding N4: Monorepo Dependency Vulnerabilities
- **ID:** SEC-N04 (N4)
- **Severity:** P0 (Security)
- **Platform:** Root Workspace, Mobile Workspace
- **Module:** Dependencies
- **Location:** `package-lock.json`, `apps/mobile/package-lock.json`
- **Symptom:** Audit reported 52 vulnerabilities at root (3 critical) and 24 in mobile (1 critical).
- **Root Cause:** Outdated packages in lockfiles.
- **Fix:** Ran automated non-breaking dependency remediation (`npm audit fix --omit=dev`). Critical vulnerabilities dropped to 0 across both root and mobile workspaces. Residual non-critical vulnerabilities requiring major breaks catalogued in `NEEDS_OWNER.md`.
- **Status:** CODE COMPLETE

---

### Finding N8: Unsafe Migrations at Boot
- **ID:** REL-N08 (N8)
- **Severity:** P1 (Reliability)
- **Platform:** Backend (`backend`)
- **Module:** Database & Startup
- **Location:** `backend/src/server.js:L305-340`, `backend/package.json`
- **Symptom:** Server auto-runs migrations on boot with no advisory lock; if a migration fails, it logs a warning and serves requests with broken schema.
- **Root Cause:** Unlocked migration loop and swallowed errors in startup lifecycle.
- **Fix:** Wrapped boot migrations with PostgreSQL advisory lock `pg_try_advisory_lock(7429104)` with fallback `pg_advisory_lock`. Configured `process.exit(1)` on migration failure in production. Added `"migrate:up"` script alias in `backend/package.json`.
- **Status:** VERIFIED

---

### Finding N11: Route-Auth Matrix Runtime Enforcement
- **ID:** SEC-N11 (N11)
- **Severity:** P1 (Security)
- **Platform:** Backend (`backend`)
- **Module:** API & Security Gate G5
- **Location:** `scripts/verify/route-auth-matrix.mjs`
- **Symptom:** Audit extractor previously claimed "114 unauthenticated write endpoints" due to static AST parsing failure on Express 5 router stacks.
- **Root Cause:** Static analysis missed middleware spread (`...adminOnly`) and `router.use(authenticate)`.
- **Fix:** Implemented runtime route-auth matrix test that boots Express router in-memory and executes HTTP write requests against all 1,164 endpoints. 20 public endpoints validated on allowlist, 1,144 endpoints verified protected with 401/403.
- **Test:** Gate G5 passes 100%.
- **Evidence:** `docs/audit/evidence/verify-2026-10-25T08-42-54/G5.log`
- **Status:** VERIFIED

---

### Lead L1 (Follow-up): Admin Bypass Production Rejection Test
- **ID:** SEC-001 (L1 Follow-up)
- **Severity:** P0 (Security)
- **Platform:** Backend (`backend`)
- **Module:** Auth & CRM
- **Location:** `backend/src/__tests__/adminAuthBypass.test.js`
- **Fix:** Added production-mode test asserting that demo credentials (+919999999991) are strictly rejected with 401/503 when `NODE_ENV=production`.
- **Test:** `adminAuthBypass.test.js` passes 2/2 tests.
- **Status:** VERIFIED

### Lead L7 (Follow-up): Concurrency & Idempotency Suite on Postgres
- **ID:** CONC-007 (L7 Follow-up)
- **Severity:** P0 (Data Integrity Gate G6)
- **Platform:** Backend (`backend`)
- **Module:** Commerce & Payments
- **Location:** `backend/src/__tests__/concurrency.test.js`
- **Fix:** Created automated PostgreSQL concurrency suite testing 5 real race scenarios: stock unit race, duplicate idempotency key order deduplication, payment webhook duplicate idempotency, coupon limit race safety, and payout idempotency.
- **Test:** Gate G6 passes 5/5 tests on local PostgreSQL.
- **Evidence:** `docs/audit/evidence/verify-2026-10-25T08-42-54/G6.log`
- **Status:** VERIFIED

---

### Lead L3 (Follow-up): Web Token Storage Bridge Removal
- **ID:** AUTH-003 (L3 Follow-up)
- **Severity:** P1 (Security / Token Hygiene)
- **Platform:** Web (`apps/web`)
- **Module:** Authentication & Session Management
- **Fix:** Removed legacy `localStorage.setItem('token', ...)` compatibility bridge in `AuthContext.js`; migrated all readers across `apps/web/src` to canonical `auth_token`; added automatic legacy token key purging on startup.
- **Status:** CLOSED

---

### Lead L4 (Follow-up): Canonical Roles & Normalization
- **ID:** RBAC-004 (L4 Follow-up)
- **Severity:** P1 (Security / Role Hygiene)
- **Platform:** Shared (`packages/shared`), Backend (`backend`)
- **Module:** RBAC & Token Issuance
- **Fix:** Created canonical role definitions and `normalizeRole` / `isFullAdmin` utilities in `packages/shared/src/roles.js`. Integrated canonical normalization into `generateTokens` and `verifyRole` in `auth.middleware.js`.
- **Status:** CLOSED

---

### Finding N10: Mobile Toolchain, Duplicate React & Expo Doctor
- **ID:** MOB-N10
- **Severity:** P1 (Mobile Toolchain & Gate G9)
- **Platform:** Mobile (`apps/mobile`)
- **Module:** Toolchain & Bundling
- **Fix:** Fixed `@expo/config-plugins` version to `~54.0.6` matching Expo SDK 54; added missing `expo-asset` peer dependency; configured Metro bundler with `extraNodeModules` binding React to `mobile/node_modules/react` to eliminate duplicate React 18 resolution; added owner-accepted exclusions to `apps/mobile/package.json`.
- **Test:** Gate G9 passes (233/233 Jest tests pass, ESLint reports 0 errors, Android Hermes export succeeds).
- **Status:** VERIFIED

---

### Finding N13: Free-Tier Resource Controls
- **ID:** OPS-N13
- **Severity:** P2 (Free-Tier Operations)
- **Platform:** Backend (`backend`)
- **Module:** Worker & ML Resource Controls
- **Fix:** Added `ENABLE_WORKERS=false` and `ENABLE_ML_JOBS=false` flags to `server.js` and `.env.example`, preventing uncontrolled memory/CPU pressure on 512MB free-tier instances at boot.
- **Status:** CLOSED

---

### Finding N14: Text Encoding & Byte Order Mark (BOM) Cleanup
- **ID:** HYG-N14
- **Severity:** P2 (Encoding & Policy POL-08)
- **Platform:** Monorepo-wide
- **Module:** Source Code Hygiene
- **Fix:** Stripped UTF-8 Byte Order Marks from 177 source files; corrected mojibake currency symbols (`â‚¹` -> `₹`) across 11 files; created `.editorconfig` and `.gitattributes` to enforce UTF-8 without BOM and LF line endings.
- **Test:** Gate G15 policy test `POL-08` passes with 0 BOM or mojibake violations.
- **Status:** VERIFIED




