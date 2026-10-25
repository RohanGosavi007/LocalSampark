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
- **Fix:** Normalize storage key to `'auth_token'` across web, and migrate unmanaged fetch calls to centralized client.
- **Test:** Web suite test checking that no source file reads `localStorage.getItem('token')` and all calls attach Bearer tokens.
- **Evidence:** Grep search in `apps/web/src` for `getItem('token')`.
- **Commit:** Pending
- **Status:** OPEN

---

### Lead L4: Inconsistent Role Spelling Across Backend and Mobile
- **ID:** RBAC-004 (L4)
- **Severity:** P1 (Security / Functional)
- **Platform:** Backend (`backend`), Mobile (`apps/mobile`)
- **Module:** RBAC & Authorization
- **Location:** Backend (~68 files `'super_admin'`, 7 files `'superadmin'`), Mobile events/townsquare admin checks
- **Symptom:** Admin checks fail silently because `'superadmin'` does not match `'super_admin'`, locking out legitimate administrators or bypassing checks.
- **Root Cause:** Absence of centralized role enum shared between database, JWT payload, and frontend/mobile guards.
- **Fix:** Define canonical role constants in `@localsampark/shared` / `packages/types` and normalize across all routes and client guards.
- **Test:** Unit test scanning all route middleware to ensure role arguments match canonical enum.
- **Evidence:** Grep search for `'superadmin'` vs `'super_admin'`.
- **Commit:** Pending
- **Status:** OPEN

---

### Lead L5: PostgreSQL Dialect Auto-Heal Shim Hiding Query Defects
- **ID:** DB-005 (L5)
- **Severity:** P1 (Reliability)
- **Platform:** Backend (`backend`)
- **Module:** Database Adapter
- **Location:** `backend/src/config/database.js:L210-216`
- **Symptom:** Database adapter intercepts Postgres error `42883` and rewrites `= 1` / `= 0` to `= true` / `= false` for six column names at runtime.
- **Root Cause:** SQL queries written with SQLite integer booleans rather than standard parameterized booleans.
- **Fix:** Fix SQL queries at source to use `$n` parameters with boolean types, log when auto-heal fires during Postgres testing, and retire the shim.
- **Test:** Suite execution against PostgreSQL without auto-heal interception.
- **Evidence:** Inspect `backend/src/config/database.js`.
- **Commit:** Pending
- **Status:** OPEN

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
- **Fix:** Set up local PostgreSQL test pipeline and create concurrent request integration tests.
- **Test:** Parallel request integration test in Jest executing concurrent deductions.
- **Evidence:** Code inspection of `database.sqlite.js`.
- **Commit:** Pending
- **Status:** OPEN

---

### Lead L8: Default Weak Secrets and Compose Environment Drift
- **ID:** SEC-008 (L8)
- **Severity:** P1 (Security)
- **Platform:** Infrastructure (`docker-compose.yml`, `render.yaml`, `backend/src/config/envValidator.js`)
- **Module:** Security & Configuration
- **Location:** `docker-compose.yml` (`JWT_SECRET=production_super_secret`)
- **Symptom:** Potential deployment of known default secrets; unvalidated environment variables.
- **Root Cause:** Hardcoded fallback values in docker compose and template drift.
- **Fix:** Remove hardcoded fallback secrets; enforce strong secret generation in `envValidator.js`.
- **Test:** Validation test asserting server refuses boot in production if default secrets are detected.
- **Evidence:** Code inspection of `docker-compose.yml`.
- **Commit:** Pending
- **Status:** OPEN

---

### Lead L9: Swallowed Errors in Try/Catch and Console Logging
- **ID:** CODE-009 (L9)
- **Severity:** P1 (Observability)
- **Platform:** All Platforms
- **Module:** Core Services & Clients
- **Location:** Monorepo-wide (~140 empty catch blocks, ~317 `console.log` in backend)
- **Symptom:** Failures are silently suppressed without user notification or structured log tracing.
- **Root Cause:** Ad-hoc debugging blocks left unmigrated to winston logger or structured error boundaries.
- **Fix:** Replace empty catch blocks with error dispatch / user toast / winston logger.
- **Test:** Lint rule flagging empty catch blocks.
- **Evidence:** Grep search for `catch\s*\([a-zA-Z0-9_]*\)\s*\{\s*\}`.
- **Commit:** Pending
- **Status:** OPEN

---

### Lead L10: Fabricated or Placeholder UI Behaviour
- **ID:** UX-010 (L10)
- **Severity:** P1 (Integrity)
- **Platform:** Mobile (`apps/mobile`), Web (`apps/web`)
- **Module:** Multiple Modules
- **Location:** `VisitorsTab.js`, `confirmation.js`, `subscriptions/index.js`, `JobsScreen.js`, `rewards/page.js`
- **Symptom:** UI displays synthetic `Math.random()` numbers or "Coming soon" buttons without real API wiring.
- **Root Cause:** Prototype screens never connected to real backend tables.
- **Fix:** Wire screens to live API endpoints with genuine loading, empty, and error states.
- **Test:** Expand `noFabricatedData.test.js` to assert zero synthetic data across these screens.
- **Evidence:** Grep search for `Math.random` and "Coming soon".
- **Commit:** Pending
- **Status:** OPEN

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
- **Fix:** Ensure release builds strictly resolve to production domain and fail-fast if pointing to LAN or localhost; configure emulator to `10.0.2.2`.
- **Test:** Mobile test asserting `process.env.NODE_ENV === 'production'` never yields an IP address.
- **Evidence:** `apps/mobile/app.json` extra configuration.
- **Commit:** Pending
- **Status:** OPEN

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


