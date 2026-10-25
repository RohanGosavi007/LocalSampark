# Implementation Plan — Milestone M1: P0 Security & Launch Blockers

This plan details the technical approach and step-by-step execution for Milestone M1 on branch `launch/ecommerce-v1` to eliminate critical security vulnerabilities, implement the route-auth matrix test, establish zero-cost cloud storage abstractions, secure boot migrations, and bring the local PostgreSQL suite to green.

---

## 1. Scope & Action Items

| ID | Priority | Description | Target Files |
|---|:---:|---|---|
| **N1** | P0 (Security) | Never return OTP in responses outside dev/test; prevent server boot if `NODE_ENV=production` and `ALLOW_FREE_OTP_MODE=true`; add regression tests | `backend/src/modules/core/routes/auth.routes.js`<br>`backend/src/config/envValidator.js`<br>`backend/src/__tests__/authSecurity.test.js` |
| **N2** | P0 (Security Regression) | Revert token bridge in mobile; store tokens solely in SecureStore on native; delete legacy plain tokens on boot; add unit tests proving native `setToken` never writes to AsyncStorage | `apps/mobile/src/lib/secureStorage.js`<br>`apps/mobile/__tests__/secureStorage.test.js` |
| **N3** | P0 (Free Tier Launch Blocker) | Create unified storage provider (`StorageService`) with local disk adapter (dev) and S3-compatible adapter (Cloudflare R2/Supabase Storage); separate public catalog from private KYC bucket with signed URLs | `backend/src/services/storage/`<br>`backend/src/modules/core/services/upload.service.js` |
| **N4** | P0 (Security) | Upgrade critical/high production dependencies in root and mobile (`npm audit --omit=dev`); document non-fixable items in `NEEDS_OWNER.md` | `package.json`<br>`apps/mobile/package.json`<br>`docs/launch/NEEDS_OWNER.md` |
| **N8** | P1 (Data Integrity) | Add PostgreSQL advisory lock during boot migrations; abort process non-zero if migration fails in production | `backend/src/server.js`<br>`backend/src/config/database.js` |
| **N11** | P1 (Security Audit) | Implement live route-auth matrix test (Gate G5); dynamically sweep Express router write routes without token to enforce 401/403 against a reviewed public allowlist | `scripts/verify/route-auth-matrix.mjs` |
| **L1** | P1 (Access Control) | Add integration test proving admin quick-login dev bypass is strictly rejected when `NODE_ENV=production` | `backend/src/__tests__/adminAuthBypass.test.js` |
| **L7** | P1 (Concurrency) | PostgreSQL concurrency & idempotency test suite (Gate G6): stock exhaustion race, coupon usage limit race, duplicate webhook idempotency, duplicate `Idempotency-Key` order creation | `backend/src/__tests__/concurrencyPostgres.test.js` |
| **G3 Fixes** | P1 (Postgres Parity) | Fix 209 failing tests on local PostgreSQL (column type casts, case sensitivity, schema differences, date comparisons) | `backend/src/modules/**` |
| **Demo Safety** | P1 (Hygiene) | Ensure production seeding never injects demo credentials; ensure `purge_demo_credentials.js` defaults to dry-run | `backend/src/scripts/seed.js`<br>`backend/scripts/purge_demo_credentials.js` |

---

## 2. Technical Execution Steps

### Step 1: N1 — Free OTP Leaks & Production Boot Guard
1. In `backend/src/modules/core/routes/auth.routes.js`:
   - In `POST /auth/send-otp` (~L206–236) and `POST /auth/send-whatsapp-otp` (~L640–668): Gate `response.otp = otp` behind `process.env.NODE_ENV === 'development' && process.env.ALLOW_FREE_OTP_MODE === 'true'`. Outside development, never attach `.otp`.
2. In `backend/src/config/envValidator.js`:
   - If `process.env.NODE_ENV === 'production'` and `process.env.ALLOW_FREE_OTP_MODE === 'true'`, throw Fatal Config Error refusing to start the server.
3. Write `backend/src/__tests__/authSecurity.test.js`:
   - Test that calling `send-otp` with `NODE_ENV=production` never returns `otp` field.
   - Test that `envValidator` throws when production + free OTP mode is configured.

### Step 2: N2 — Mobile Secure Storage Regression
1. In `apps/mobile/src/lib/secureStorage.js`:
   - On native platforms (`Platform.OS !== 'web'`), write ONLY to `SecureStore`.
   - Remove unconditional fallback to `AsyncStorage.setItem('token', ...)` and `sec_<key>`.
   - On initialization / first launch, execute cleanup of legacy `token` and `sec_*` keys from `AsyncStorage`.
2. Add unit test `apps/mobile/__tests__/secureStorage.test.js` proving native `setToken` writes strictly to SecureStore and leaves AsyncStorage untouched.

### Step 3: N11 — Route-Auth Matrix Test (Gate G5)
1. Write `scripts/verify/route-auth-matrix.mjs`:
   - Dynamically inspect Express router stack to collect every write route (`POST`, `PUT`, `PATCH`, `DELETE`).
   - Define strict public allowlist (`/auth/login`, `/auth/register`, `/auth/send-otp`, `/auth/verify-otp`, `/auth/google`, `/payments/webhook`, `/delivery/quote`, `/health`, `/ready`).
   - For every non-allowlisted endpoint, send an unauthenticated request and assert status is `401` or `403`.
2. Connect to `verify-all.mjs` Gate G5.

### Step 4: L1 & N8 — Admin Bypass Test & Postgres Advisory Lock
1. Add `backend/src/__tests__/adminAuthBypass.test.js` testing `POST /crm/admin/auth/dev-bypass` with `NODE_ENV=production` returns 403 / 404.
2. In `backend/src/server.js`, wrap boot migration execution with `pg_try_advisory_lock` when on PostgreSQL, and exit with code 1 if any migration fails in production.

### Step 5: N3 — Zero-Cost Storage Abstraction
1. Create `backend/src/services/storage/` with:
   - `StorageProvider.js` interface: `uploadFile()`, `getPublicUrl()`, `getSignedUrl()`, `deleteFile()`.
   - `LocalStorageProvider.js`: Dev local disk storage (`public/uploads`).
   - `S3StorageProvider.js`: Standard S3 API compatible with Cloudflare R2 (10 GB free) and Supabase Storage.
2. Wire up `backend/src/modules/core/services/upload.service.js` to dispatch to the active provider based on environment configuration (`STORAGE_DRIVER=local|s3`).

### Step 6: G3 — Fix Failing Postgres Test Suites
1. Inspect `docs/audit/evidence/verify-2026-10-25T07-27-57/G3.log` and `jest-postgres.json` to identify the 209 failing test cases.
2. Group the failures by root cause (e.g. SQLite vs Postgres date syntax, JSON column operators, raw SQL differences, table quote conventions).
3. Fix root causes so G3 passes with 0 failures on local PostgreSQL.

### Step 7: L7 — Concurrency Suite on PostgreSQL (Gate G6)
1. Implement `backend/src/__tests__/concurrencyPostgres.test.js`:
   - Stock exhaustion race with concurrent checkout requests.
   - Coupon usage limit race (`max_uses_per_user` and `total_uses`).
   - Payment webhook idempotency.
   - `Idempotency-Key` order creation deduplication.
2. Connect to Gate G6 in `verify-all.mjs`.

### Step 8: Gate Verification, Evidence & Commit
1. Run `node scripts/verify/verify-all.mjs --only G1,G2,G3,G4,G5,G6,G14,G15`.
2. Verify all affected gates pass.
3. Update `docs/launch/PROGRESS.md` and `docs/audit/FINDINGS.md`.
4. Commit M1 changes with Conventional Commit.
