# LocalSampark Audit — Initial Baseline Measurements (Phase 1)

This document records the forensic execution results, exit codes, durations, pass/fail/skip counts, and exact error outputs for all baseline commands executed in Phase 1 on branch `audit/deep-debug-2026-10`.

---

## 1. Backend Baseline Measurements

### Command: `npm run lint --workspace=backend`
- **Exit Code:** 0
- **Duration:** 14.2s
- **Results:** 39 problems (0 errors, 39 warnings)
- **Primary Warnings:**
  - `no-empty`: Empty block/catch statements in `src/config/database.js` (lines 113, 156), `src/config/redis.js` (line 68), `src/jobs/overstay-monitor.job.js`, `src/modules/core/routes/user.routes.js`, `src/modules/crm/controllers/admin-fraud.controller.js`, `src/modules/services/routes/advanced-b.routes.js`, `src/server.js` (line 218).
  - `no-useless-escape`: Unnecessary escape characters in `src/modules/services/routes/jobs.routes.js`, `src/scripts/robust_path_fix.js`, `src/utils/cron.js`.

### Command: `npm run test:unit`
- **Exit Code:** 1
- **Duration:** 86.18s
- **Suites:** 101 passed, 21 failed, 122 total
- **Tests:** 1,273 passed, 215 failed, 1,488 total
- **Root Failure Cause:**
  - **Remote Database Dependency (Lead L6 confirmation):** Tests that query tables (e.g. `tests/endpoint-queries.test.js`, `src/__tests__/integration/ecommerce.routes.test.js`) failed with `self-signed certificate in certificate chain`.
  - When Jest spawns child worker threads, `dotenv` loads `backend/.env`. If `USE_SQLITE=true` is not hard-pinned in the test harness or environment, the database connector defaults to remote PostgreSQL / Supabase URLs whose self-signed certificate is rejected by Node.js, simultaneously violating test isolation against remote infrastructure.

### Command: `npm run test:api`
- **Exit Code:** 0
- **Duration:** 27.67s
- **Suites:** 50 passed, 50 total
- **Tests:** 507 passed, 507 total
- **Coverage Summary:** 50 API integration test suites passed with 0 failures under the integration runner configuration.

### SQLite Fresh DB: Migrate & Seed Demo Verify
- **Commands:**
  1. `npm run db:migrate` (`USE_SQLITE=true`): **Exit Code 0**
     - Successfully executed all migrations: `001_add_region_hierarchy.sqlite.sql` through `127_pos_sales.sqlite.sql` plus JS migration runners (`098`, `109`, `114`, `116`, `118`, `120`, `125`).
  2. `npm run db:seed`: **Exit Code 0**
     - Seeded delivery fees, demo personas, super admin, Rajesh Sharma shop, Amit Patil wallet, products, and categories (14 created, 17 present).
  3. `npm run seed:demo:verify`: **Exit Code 0**
     - Verified 17/17 checks:
       - ✓ users (demo personas): 32 / 12
       - ✓ local_shops: 15 / 15
       - ✓ shop_products: 138 / 138
       - ✓ shops in category: 15 / 15
       - ✓ admin_jobs: 10 / 10
       - ✓ job_vacancies: 10 / 10
       - ✓ job board postings: 10 / 10
       - ✓ job_applications: 30 / 30
       - ✓ properties: 8 / 8
       - ✓ carpool_rides: 7 / 7
       - ✓ orders: 6 / 6
       - ✓ approved rider: 1 / 1
       - ✓ society members: 26 / 26
       - ✓ guards on roster: 5 / 5
       - ✓ gate passes: 10 / 10
       - ✓ gate register: 8 / 8
       - ✓ society events: 3 / 3

### PostgreSQL Local DB: Service Status
- **Status:** Local Windows service `postgresql-x64-18` is running on port 5432 (`127.0.0.1:5432` connection verified). Local Redis is not running (falls back to in-memory).

### Server Health Check (`GET http://127.0.0.1:5000/health`)
- **HTTP Code:** 200 OK
- **Payload:**
```json
{
  "status": "ok",
  "app": "LocalSampark API",
  "version": "1.0.0",
  "commit": "unknown",
  "timestamp": "2026-10-25T03:07:42.276Z",
  "environment": "development",
  "uptime": "2799s",
  "database": "connected",
  "redis": "fallback (in-memory)",
  "firebase": "connected",
  "memory": {
    "rss": "70MB",
    "heapTotal": "80MB",
    "heapUsed": "76MB"
  }
}
```

---

## 2. Frontend Web Baseline Measurements (`apps/web`)

### Command: `npm test --workspace=@localsampark/web`
- **Exit Code:** 0
- **Duration:** 901ms
- **Pass/Fail:** 29 passed, 0 failed, 29 total
- **Key Invariants Tested:**
  - CSV catalog import/export parser invariants
  - Zero hard-coded API hosts (`no source file carries its own API host`)
  - Server components import `apiUrl`, not client modules
  - Zero fabricated rows or random numbers in UI
  - Token refresh, session rotation, and keep-alive handling

---

## 3. Admin Console Baseline Measurements (`apps/admin`)

### Command: `npm test --workspace=@localsampark/admin`
- **Exit Code:** 0
- **Duration:** 162ms
- **Pass/Fail:** 2 passed, 0 failed, 2 total
- **Key Invariants Tested:**
  - Zero console pages or tabs calling `fetch` directly
  - Zero hard-coded production API hosts

---

## 4. Mobile Baseline Measurements (`apps/mobile`)

### Command: `npx jest --config jest.config.js`
- **Exit Code:** 0
- **Duration:** 13.31s
- **Suites:** 10 passed, 10 total
- **Tests:** 228 passed, 0 failed, 228 total
- **Passing Suites:** `sessionTrail`, `edgeRanker`, `theme`, `roleParity`, `tokenRefresh`, `geofenceMonitor`, `territoryResolution`, `cartIsolation`, `gateQueue`, `noFabricatedData`.

### Command: `npx expo-doctor`
- **Exit Code:** 1 (6 checks failed out of 18)
- **Issues Detected:**
  1. Direct installation of `@expo/config-plugins` instead of `expo/config-plugins` sub-export.
  2. Missing peer dependency `expo-asset` required by `expo-audio`.
  3. Duplicate React native dependency: `react@19.1.0` in `apps/mobile/node_modules` vs `react@18.3.1` in root `node_modules`.
  4. Non-CNG project warning: native `android/` and `ios/` folders present with prebuild config.
  5. Untested New Architecture libraries: `@nozbe/watermelondb`, `react-native-callkeep`, `react-native-webrtc`.
  6. Version mismatch on `@expo/config-plugins` (`57.0.7` found vs `~54.0.4` expected).

### Command: `npx eslint .`
- **Exit Code:** 1
- **Problems:** 692 problems (48 errors, 644 warnings)
- **Critical Root Cause:**
  - `apps/mobile/src/context/AuthContext.js:578`: `Parsing error: 'import' and 'export' may only appear at the top level`.
  - Cause: Incomplete try/catch block in `initSupabaseRealtime` (line 453) unclosed prior to `const verifyOtp = async ...` definition, resulting in two unclosed curly braces (`{`) and breaking `export function useAuth()`.
  - Consequence: Cascaded 48 import parse errors across every mobile screen importing `useAuth`.

### Command: `npx expo export --platform android`
- **Exit Code:** 1
- **Duration:** 85.4s (5,546 modules bundled before failure)
- **Failure:** SyntaxError in `apps/mobile/src/context/AuthContext.js:578: 'import' and 'export' may only appear at the top level`.
- **Verdict:** Blocking release bundle compilation.

### Toolchain: Android Gradle & Java
- **Gradle Version:** Gradle 8.14.3 (build time 2025-07-04)
- **Kotlin:** 2.0.21
- **Launcher JVM:** Microsoft OpenJDK 17.0.20+8-LTS
- **SDK Path:** `C:\Users\Rohan\AppData\Local\Android\Sdk` (`adb` verified and running)

---

## 5. Security & Dependency Audits

### Command: `npm audit --omit=dev` (Monorepo Root)
- **Exit Code:** 1
- **Total Vulnerabilities:** 52 (2 low, 30 moderate, 17 high, 3 critical)
- **Critical CVEs:**
  - `next`: Cache poisoning and SSR SSG unauthenticated RCE (GHSA-4jqv-mc3x-m676, GHSA-2464-fhr4-w9xw)
  - `proxy-addr`: IP spoofing via IPv4-mapped IPv6 trust subnet (GHSA-jqcg-44mw-7w3h)
  - `shell-quote`: Command injection via line terminator (GHSA-pqg4-j6r4-53mv)
- **High Severity:** `multer` (DoS via orphaned disk writes), `nodemailer` (DNS cache TLS credential disclosure, nested array DoS), `sharp` (librsvg CVE), `undici` (EventSource DoS), `follow-redirects` (cross-origin credential stripping).

### Command: `npm audit --omit=dev` (`apps/mobile`)
- **Exit Code:** 1
- **Total Vulnerabilities:** 24 (10 moderate, 13 high, 1 critical)
- **Critical CVE:** `shell-quote` command injection (GHSA-pqg4-j6r4-53mv)
- **High Severity:** `compression`, `fast-uri`, `image-size`, `js-yaml`, `node-forge`, `postcss`, `source-map-js`, `undici`.
