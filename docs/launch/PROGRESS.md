**Next action:** Milestone M4: Operations (Phase M4.2: Rider Fleet R1–R5, Phase M4.3: Admin Commerce Ops A1–A14).

---

## 1. Milestone Status Overview

| Milestone | Title | Status | Completion Date | Evidence Directory |
|---|---|:---:|:---:|---|
| **M0** | Honesty Reset & Verification Harness | **VERIFIED** | 2026-10-25 | `docs/audit/evidence/verify-2026-10-25T07-27-57/` |
| **M1** | P0 Security & Launch Blockers | **VERIFIED** | 2026-10-25 | `docs/audit/evidence/verify-2026-10-25T08-42-54/` |
| **M2** | Open Leads & Platform Hygiene | **VERIFIED** | 2026-10-25 | `docs/audit/evidence/verify-2026-10-25T09-21-12/` |
| **M3** | Commerce Core (Catalog, Cart, Coupons, Checkout, Orders) | **VERIFIED** | 2026-10-25 | `docs/audit/evidence/verify-2026-10-25T10-14-20/` |
| **M4** | Operations (M4.1 Seller Hub, M4.2 Rider Fleet, M4.3 Admin Hub) | **IN PROGRESS (M4.1 VERIFIED)** | 2026-10-25 | `docs/audit/evidence/verify-2026-10-25T10-42-48/` |
| **M5** | After-Order Experience (Returns, Reviews, Support, Invoices) | NOT STARTED | — | — |
| **M6** | Web Quality, SEO, Performance & Legal Compliance | NOT STARTED | — | — |
| **M7** | Android Release Hardening, Permissions & E2E Smoke | NOT STARTED | — | — |
| **M8** | Zero-Cost Deployment Package & Runbook | NOT STARTED | — | — |
| **M9** | Final Regression & Launch Readiness Report | NOT STARTED | — | — |

---

## 2. Milestone Detail Tasks

### Milestone 0: Honesty Reset & Verification Harness
- [x] Create branch `launch/ecommerce-v1` from HEAD of `audit/deep-debug-2026-10`
- [x] Prepend SUPERSEDED notices to `docs/audit/FINAL_REPORT.md`, `PROGRESS.md`, `INVENTORY.md`
- [x] Reset all 21 module statuses to NOT VERIFIED in `docs/audit/INVENTORY.md` and `PROGRESS.md`
- [x] Save `LAUNCH_BRIEF.md`, `NEEDS_OWNER.md`, `DECISIONS.md`
- [x] Create `features.json` with all Target Capabilities (C1-C14, S1-S7, R1-R5, A1-A14, P1-P13)
- [x] Create `scripts/verify/verify-all.mjs` orchestrating gates G1-G18
- [x] Implement G15 launch policy test runner (`scripts/verify/launch-policy.mjs`)
- [x] Execute baseline verify-all run and generate initial `docs/launch/STATUS.md` (Pass Rate: 6/18 [33.3%], Features Verified: 0/53 [0.0%])
- [x] Log baseline evidence and commit M0 checkpoint

### Milestone 1: P0 Security & Launch Blockers
- [x] **N1 (P0):** Gated free OTP code generation in `auth.routes.js`; added hard boot block in `envValidator.js` rejecting `ALLOW_FREE_OTP_MODE=true` when `NODE_ENV=production`; verified via regression suite `authSecurity.test.js` (4/4 passed).
- [x] **N2 (P0):** Reverted token bridge in mobile `secureStorage.js` to strictly write to native `SecureStore`; added legacy AsyncStorage token cleanup routine on startup; verified via `secureStorage.test.js` (5/5 passed, 233/233 mobile tests pass).
- [x] **N4 (P0):** Completed production dependency security audit; eliminated 100% of critical vulnerabilities across root and mobile workspaces; documented residual non-critical exceptions in `NEEDS_OWNER.md`.
- [x] **N3 (P0):** Architected unified pluggable storage abstraction (`StorageProvider`, `LocalStorageProvider`, `S3StorageProvider`) with AWS SigV4 signed URL generation and ephemeral disk protection; verified via unit tests and `uploads.test.js` integration suite.
- [x] **N11 (P1):** Implemented runtime route-auth matrix testing harness `route-auth-matrix.mjs` (Gate G5); tested 1,164 write endpoints against live Express router, verifying 100% protection (401/403) outside approved public allowlist.
- [x] **L1:** Implemented production mode test `adminAuthBypass.test.js` verifying demo admin credentials (+919999999991) are rejected with 401/503 in production.
- [x] **N8 (P1):** Protected startup database migrations in `server.js` with PostgreSQL advisory lock (`pg_try_advisory_lock(7429104)`) and non-zero process exit on failure; added `npm run migrate:up` alias.
- [x] **PostgreSQL Toolchain & Migrations:** Verified local PostgreSQL 18.6 connection; patched `127_pos_sales.sql` UUID foreign key compatibility; applied migrations 002-127 cleanly; verified seed idempotency (Gate G4 green).
- [x] **L7 / G6:** Implemented PostgreSQL Concurrency & Idempotency suite `concurrency.test.js` verifying stock depletion races, idempotency-key deduplication, webhook replay safety, coupon limits, and idempotent payouts (Gate G6 green, 5/5 passed).
- [x] **Demo Data Safety:** Verified production seeding skips demo personas; verified `purge_demo_credentials.js` defaults to dry-run; implemented read-only production audit script `check_prod_credentials.js`.

### Milestone 2: Open Leads & Platform Hygiene
- [x] **N14 & POL-08:** Stripped UTF-8 Byte Order Marks (BOM) from 177 files across backend and web; corrected mojibake currency symbols (`â‚¹` -> `₹`) across 11 files; added `.editorconfig` and `.gitattributes` enforcing UTF-8 without BOM and LF line endings; Gate G15 policy test `POL-08` passes.
- [x] **L14 & POL-06:** Removed hardcoded LAN IP (`192.168.1.7`) from `apps/mobile/app.json`; configured emulator loopback `10.0.2.2` and strict production locking; Gate G15 policy test `POL-06` passes.
- [x] **L3 (Storage Cleanup):** Removed legacy `localStorage.setItem('token', ...)` bridge in `AuthContext.js`; migrated all readers in `apps/web/src` to `auth_token`; added automatic legacy token key purging on startup.
- [x] **L4 (Role Canonicalization):** Established single source of truth in `packages/shared/src/roles.js` with `ROLES`, `normalizeRole`, and `isFullAdmin`; integrated normalization into token generation and `verifyRole` in `auth.middleware.js`.
- [x] **L5 (Auto-Heal Shim Removal):** Removed regex query-rewriting shim from `backend/src/config/database.js`; normalized boolean queries across backend codebase to standard `true` / `false` literals natively supported by both PostgreSQL and SQLite.
- [x] **N13 (Resource Controls):** Added `ENABLE_WORKERS=false` and `ENABLE_ML_JOBS=false` flags in `backend/src/server.js` and `.env.example` to prevent CPU and memory spikes on 512MB free-tier containers.
- [x] **L9 & POL-07 (Structured Logging):** Migrated 32 backend files from raw `console.log` to structured Winston `logger.info`/`logger.warn`; triaged empty catch blocks with logging; Gate G15 policy test `POL-07` passes (0 `console.log` calls in backend `src`).
- [x] **L10 (Placeholders & Math.random):** Removed `Math.random` from `shop-management.controller.js` and `shop.routes.js`; replaced "coming soon" placeholders in `RestaurantVisitorView.js` and `RetailVisitorView.js` with proper empty states; Gate G15 policy tests `POL-04` and `POL-05` pass.
- [x] **N10 & Gate G9 (Mobile Toolchain):** Aligned `@expo/config-plugins` to `~54.0.6` matching Expo SDK 54; added `expo-asset` dependency; configured Metro bundler with `extraNodeModules` binding React to `mobile/node_modules/react` to eliminate duplicate React 18 resolution; added owner-accepted exclusions in `apps/mobile/package.json`; mobile ESLint reports 0 errors (`--quiet`); all 233 Jest unit tests pass; `npx expo export --platform android` compiles 5,551 modules into Hermes bytecode bundle.
- [x] **Verification Gate Execution:** Gates G1, G4, G5, G6, G9 all PASS cleanly in verify-all runner.

### Milestone 3: Commerce Core
- [x] **P6 & Launch Scope D1 (Module Registry & Feature Flags):** Single source of truth in `packages/shared/src/features.js`; Express middleware `featureFlag.middleware.js` returning 404 for off-scope verticals while keeping commerce core open; client helper `apps/web/src/lib/features.js` and `Header.js` navigation gating; verified via `featureFlags.test.js` (7/7 pass).
- [x] **C7 & N5 & POL-03 (Database-Backed Coupon Engine):** Applied migration 128 creating `coupons` and `coupon_redemptions`; implemented `coupon.service.js` with minimum order, validity windows, percentage caps, total/per-user limits, and atomic race-safe redemption; integrated into `orderPlacement.service.js` and `order.routes.js`; verified via `couponEngine.test.js` (6/6 pass on SQLite and PostgreSQL) and Gate G15 policy test `POL-03` (0 violations).
- [x] **C5 (Full-Text Search Engine):** PostgreSQL `to_tsvector` + `plainto_tsquery` + `ts_rank` with fallback and SQLite FTS5; normalized boolean checks; verified via `searchEngine.test.js` (4/4 pass on both SQLite and PostgreSQL).
- [x] **P3 (Double-Entry Platform Payments Ledger):** Applied migration 129 creating `platform_ledger_entries`; implemented `ledger.service.js` guaranteeing strict debit/credit balance equality and mathematical balance reproducibility; verified via `ledgerEngine.test.js` (5/5 pass on both SQLite and PostgreSQL).
- [x] **C6 & D6 (Server-Side Multi-Shop Cart):** Applied migration 130 creating shop-level commerce columns (`delivery_fee`, `min_order_amount`, etc.); implemented server-side cart with inventory revalidation, multi-shop item grouping per Decision D6, and guest-to-user cart merge on login; verified via `cartEngine.test.js` (4/4 pass on both SQLite and PostgreSQL).
- [x] **S2 & C9 & N7 (Product Variants & GST Tax Invoice Generation):** Implemented product variants CRUD API (`/shops/:shopId/products/:productId/variants`); implemented `invoice.service.js` with `generateOrderInvoice` and `streamInvoicePdf` generating GST-compliant tax invoices with shop GSTIN, FSSAI, itemized breakup, delivery fee, and totals via `pdfkit`; verified via `variantAndInvoice.test.js` (6/6 pass on both SQLite and PostgreSQL).
- [x] **Verification Gate Execution:** Gates G1, G4, G5, G6, G15 all PASS cleanly in verify-all runner.

### Milestone 4: Operations
#### Phase M4.1: Seller Operations Hub (S1, S2, S3, S4)
- [x] **S1 & N3 (Seller Onboarding & KYC):** Private storage isolation for KYC documents (PAN, Aadhaar, FSSAI, bank cheque); short-lived signed URLs (10m) via `getStorageProvider().getSignedUrl(key)`; multi-state admin review (`pending`, `submitted`, `verified`, `rejected`, `resubmission`); automatic shop verification and activation on approval; sync of statutory compliance (`gstin`, `fssai_license_number`, `pan`) to `local_shops`; dual-mounted endpoints `/shops/...` and `/admin/kyc/...`.
- [x] **S2 (Seller Catalog & Inventory Availability):** One-tap availability toggle `PATCH /shops/:shopId/products/:productId/availability` (`is_active`, `inventory_count`); real-time low-stock alert query `GET /shops/:shopId/products/low-stock?threshold=5` aggregating products and variants below safety stock levels.
- [x] **S3 (Kitchen Display & Order Handling):** Acceptance endpoint `PUT /orders/:orderId/accept` (`pending` -> `confirmed`) broadcasting socket events; rejection endpoint `PUT /orders/:orderId/reject` (`pending` -> `cancelled`) with strict validation of mandatory rejection reason and automated refund triggers; 80mm ESC/POS monospace thermal packing slip endpoint `GET /orders/:orderId/packing-slip` supporting plaintext and structured JSON with itemized variant breakdowns, delivery instructions, and COD alerts.
- [x] **S4 (Seller Financials & 0% Launch Commission):** 0% platform commission enforced as default in `platformConfig.service.js` (launch zero-commission model, configurable for future up to 50%); periodic/daily settlement statement endpoint `GET /shops/:shopId/settlements/statement` reconciling gross sales, COD cash collected by shop, gateway fees, and net balance from double-entry ledger `platform_ledger_entries`; downloadable CSV statement export `GET /shops/:shopId/settlements/statement/csv`.
- [x] **Verification:** Verified via `sellerOperations.test.js` (14/14 pass on both SQLite and PostgreSQL); Gates G1, G4, G5, G6, G15 all PASS cleanly.

---

## 3. Session Log

- **2026-10-25 (Session 1 — M0 Kickoff & Verification Harness):**
  - Switched from `audit/deep-debug-2026-10` to `launch/ecommerce-v1`.
  - Audited previous report claims against evidence; superseded `FINAL_REPORT.md`, `docs/audit/PROGRESS.md`, and `docs/audit/INVENTORY.md`.
  - Initialized `docs/launch/` directory: saved `LAUNCH_BRIEF.md`, compiled consolidated `NEEDS_OWNER.md`, and formulated `DECISIONS.md` with default paths for D1-D8.
  - Specified all 53 target capabilities (C1-C14, S1-S7, R1-R5, A1-A14, P1-P13) in `docs/launch/features.json`.
  - Built machine verification gate orchestrator `scripts/verify/verify-all.mjs` and G15 launch policy suite `scripts/verify/launch-policy.mjs`.
  - Executed baseline verification run generating `docs/launch/STATUS.md`: 6/18 gates passed (33.3%), 0/53 features verified (0.0%), proving truthful starting baseline.

- **2026-10-25 (Session 2 — M1 P0 Security & Launch Blockers):**
  - Closed N1 vulnerability: OTP never leaks in production responses; server refuses to boot if `ALLOW_FREE_OTP_MODE=true` in production; regression tested.
  - Closed N2 security regression: removed AsyncStorage token bridge on native mobile; tokens stored exclusively in SecureStore; purge legacy keys on start; tested.
  - Addressed N4 dependency vulnerabilities: `npm audit fix --omit=dev` ran; 0 criticals across root and mobile.
  - Built pluggable storage provider abstraction (N3) with S3/R2 SigV4 adapter and local fallback.
  - Implemented Gate G5 Route-Auth Matrix test: verified all 1,164 write routes enforce authentication.
  - Verified local PostgreSQL database: applied migrations 002-127; confirmed idempotent seeds.
  - Implemented Gate G6 Concurrency suite on Postgres: verified atomic stock decrement, idempotency-key deduplication, duplicate payment webhooks, coupon limits, and payout idempotency.
  - Verified demo-data safety: created read-only audit script `check_prod_credentials.js`.
  - Verified Gates G1, G4, G5, G6 all PASS cleanly. Committed M1 milestone.

- **2026-10-25 (Session 3 — M2 Open Leads & Platform Hygiene):**
  - Resolved N14/POL-08: stripped BOM from 177 files, fixed mojibake currency symbols in 11 files, added `.editorconfig` & `.gitattributes`.
  - Resolved L14/POL-06: purged LAN IP `192.168.1.7` from `apps/mobile/app.json`.
  - Resolved L3: eliminated `localStorage.setItem('token')` bridge in web AuthContext, normalized all web readers to `auth_token`, and added startup purge.
  - Resolved L4: authored canonical role constants and normalization in `packages/shared/src/roles.js` and wired into `auth.middleware.js`.
  - Resolved L5: retired Postgres auto-heal regex query shim from `database.js` and normalized boolean queries to native `true`/`false`.
  - Resolved N13: added `ENABLE_WORKERS=false` and `ENABLE_ML_JOBS=false` flags in `server.js` and `.env.example`.
  - Resolved L9/POL-07: migrated 32 backend files from raw `console.log` to Winston `logger.info`, triaged empty catches.
  - Resolved L10/POL-04/POL-05: removed `Math.random` from shop analytics/slots, replaced "coming soon" placeholders with genuine empty states.
  - Resolved N10 & Gate G9: aligned config-plugins to `~54.0.6`, added `expo-asset`, bound React in Metro config to eliminate duplicate React 18, verified 233/233 mobile tests, verified 0 ESLint errors, and verified full Android Hermes export.
  - Executed targeted verify-all run: Gates G1, G4, G5, G6, G9 all PASS cleanly.

- **2026-10-25 (Session 4 — M3 Commerce Core):**
  - Resolved P6 & Scope D1: established single source of truth in `packages/shared/src/features.js`, created `featureFlag.middleware.js` returning 404 for off-scope verticals while keeping commerce core open, updated web navigation and `Header.js`; verified via `featureFlags.test.js` (7/7 pass).
  - Resolved C7, N5 & POL-03: created migration 128 (`coupons`, `coupon_redemptions`), implemented `coupon.service.js` with limits, caps, and atomic race-safe redemptions, replaced mock coupon handlers in `order.routes.js` and `orderPlacement.service.js`; verified via `couponEngine.test.js` (6/6 pass on SQLite and PostgreSQL) and Gate G15 policy test POL-03 (0 violations).
  - Resolved C5: implemented full-text search with PostgreSQL `to_tsvector` + `plainto_tsquery` + `ts_rank` and SQLite FTS5 fallback; verified via `searchEngine.test.js` (4/4 pass on SQLite and PostgreSQL).
  - Resolved P3: created migration 129 (`platform_ledger_entries`), implemented double-entry `ledger.service.js` with debit/credit balance equality and historical balance reproducibility; verified via `ledgerEngine.test.js` (5/5 pass on SQLite and PostgreSQL).
  - Resolved C6 & D6: created migration 130 (`delivery_fee`, `min_order_amount`, etc. on `local_shops`), implemented server-side cart with stock/price revalidation, multi-shop item grouping per D6, and guest-to-user cart merge on login; verified via `cartEngine.test.js` (4/4 pass on SQLite and PostgreSQL).
  - Resolved S2, C9 & N7: implemented product variants CRUD API (`/shops/:shopId/products/:productId/variants`), implemented `invoice.service.js` with `generateOrderInvoice` and `streamInvoicePdf` generating GST-compliant tax invoices with shop GSTIN, FSSAI, itemized breakup, delivery fee, and totals via `pdfkit`; verified via `variantAndInvoice.test.js` (6/6 pass on SQLite and PostgreSQL).
  - Executed verification harness: Gates G1, G4, G5, G6, G15 all PASS cleanly.

- **2026-10-25 (Session 5 — Phase M4.1 Seller Operations Hub):**
  - Designed and authored technical specification `docs/launch/specs/2026-10-25-seller-operations-design.md` and implementation plan `plan_m4_1.md`.
  - Implemented S1 (KYC & Private Storage): enhanced `vendor-kyc.routes.js` with signed URLs via `LocalStorageProvider`/`S3StorageProvider`, resubmission workflow, statutory fields sync, and dual `/admin/kyc` mounting.
  - Implemented S2 (Catalog Inventory): added availability toggle `PATCH /shops/:shopId/products/:productId/availability` and low-stock alerts `GET /shops/:shopId/products/low-stock` in `shop.routes.js`.
  - Implemented S3 (Kitchen Display & Thermal Slips): added order accept `PUT /orders/:orderId/accept`, order reject with mandatory reason `PUT /orders/:orderId/reject`, and 80mm ESC/POS thermal packing slip generator `GET /orders/:orderId/packing-slip` in `order.routes.js`.
  - Implemented S4 (Financials & 0% Launch Commission): updated `default_commission_percent` default to 0 in `platformConfig.service.js`; added settlement statement and CSV export endpoints in `payout.routes.js` integrated with `platform_ledger_entries`.
  - Resolved PostgreSQL parameter type deduction and dialect compatibility in `orderLifecycle.service.js` and `shop.routes.js`.
  - Created unit test suite `backend/src/__tests__/unit/sellerOperations.test.js` (14/14 pass on both SQLite and local PostgreSQL).
  - Executed verification harness: Gates G1 (ESLint 0 errors), G4 (migrations/seed verify), G5 (1,156 write routes protected), G6 (5/5 concurrency tests), G15 (8/8 policy checks, 0 violations) all PASS cleanly.



