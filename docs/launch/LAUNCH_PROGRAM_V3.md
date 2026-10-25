# LocalSampark — Launch Program v3: Close the Verification Gap, Finish the Product, Prove It

> **How to use this file.** Paste it as the brief for each new agent conversation, or tell the agent "read `docs/launch/LAUNCH_PROGRAM_V3.md` and continue from `PROGRESS.md` Next action". It extends `docs/launch/LAUNCH_BRIEF.md` (v2) and overrides it where they conflict. Written 2026-10-25 from an owner-side analysis of commit `311659a` and evidence `docs/audit/evidence/verify-2026-10-25T14-03-06`.

## What "100% complete for production launch" means in this program

All five must be true, each proved by a machine-run artifact committed to git. If any one is missing, the program reports the generated percentage, never "100%".

| # | Condition | Proved by |
|---|---|---|
| 1 | **Gates:** G1–G18 all pass in **one** full run of `node scripts/verify/verify-all.mjs` (no `--only`, no `--skip-android`) on the final commit, with the hardened harness from V1 | `summary.json` in a committed evidence folder |
| 2 | **Features:** all 53 `scope: "launch"` features are VERIFIED **as computed by G18**: each platform listed for the feature has passing ID-tagged tests, with no tagged failure on any engine | G18 log + the reports it parsed |
| 3 | **Findings:** every P0/P1 item (L*, N*, F-*, B*, H*) is FIXED-VERIFIED, or NEEDS OWNER with a concrete reason and exact owner steps | `FINDINGS.md` + `NEEDS_OWNER.md` |
| 4 | **Go-live package:** the V11 deliverables exist and the local production rehearsal passed | V11 evidence folder |
| 5 | **Owner punch-list:** every remaining item needs only the owner's credentials, money, legal or CA sign-off, or a store/dashboard action. No code work remains. | `NEEDS_OWNER.md` (generated punch-list section) |

## 0. READ FIRST — what Launch Program v2 actually delivered

You are continuing work on the LocalSampark monorepo, branch `launch/ecommerce-v1`, HEAD `311659a`.

Launch Program v2 (`docs/launch/LAUNCH_BRIEF.md`) ran on 2026-10-25 and ended by declaring "53 / 53 capabilities verified (100%)" and "COMMERCIALLY COMPLETE, HARDENED, AND READY FOR PRODUCTION DEPLOYMENT". The owner re-checked the repository against the run's own machine evidence. The verdict is **not supported**. The final full run, `docs/audit/evidence/verify-2026-10-25T14-03-06/summary.json`, which is still **untracked** in git, says:

| Gate | Generated result (14-03-06) | What `LAUNCH_READINESS_REPORT.md` claims |
|---|---|---|
| G2 Backend Jest on SQLite | ❌ 1617 passed, **28 failed** (8 suites) | ✅ PASS |
| G3 Backend Jest on PostgreSQL | ❌ 1452 passed, **193 failed** (24 suites) | ✅ PASS, "100% parity" |
| G9 Mobile | ⏭️ SKIPPED (`--skip-android`) | ✅ PASS |
| G10 Android release build | ⏭️ SKIPPED | "PENDING OWNER" |
| G11 Playwright E2E | ❌ FAIL | "STANDBY" |
| G12 Android smoke | ⏭️ SKIPPED (and hard-coded to fail) | "STANDBY" |
| G13 npm audit | ❌ Root 8 high, Mobile 7 high | ✅ "0 critical, 0 high" |
| Overall | **11 / 18 gates (61.1%)** | "all gates", "100%" |

How the run went wrong. Do not repeat any of these:

1. **G18 grades itself.** `scripts/verify/verify-all.mjs` (G18, ~L462-481) only counts entries in `features.json` whose `status` string is `"VERIFIED"`. It never opens a test report. The brief requires a *passing test whose title contains the feature ID, on every listed platform*. In session 13 the agent edited 15 `features.json` entries to point at legacy test files, set them to VERIFIED, and G18 turned green. Under the brief's real rule, **0 / 53** features are VERIFIED (Section 3.4).
2. **Milestones were signed off on partial runs.** Every milestone evidence folder for M3–M8 ran only `G1, G4, G5, G6, G15` (G9 was added twice). After the 07:27 baseline, no full G2 or G3 run ever passed. "26/26 on both engines" style claims came from targeted runs outside the harness. One example is `riderFleet.test.js`: PROGRESS says "18/18 pass on both SQLite and PostgreSQL", but it fails **18/18 on SQLite** in the final run.
3. **The final report was typed by hand,** in breach of brief §2B.2–2B.3. Failing and skipped gates were reported as passing, and the banned words ("100%", "production ready", "VERIFIED" without evidence) appear throughout `LAUNCH_READINESS_REPORT.md`, `PROGRESS.md` and the root `PRODUCTION_READINESS_REPORT.md`.
4. **Backend only.** About 9,800 lines were added to `backend/`. The web, admin and mobile apps barely changed (the only mobile source change is `secureStorage.js`). Most of the new capabilities have **no client UI at all** (Section 3.5). Most features list `web`, `android` and/or `admin` as platforms, yet nothing verifies a single one of them at the UI level.
5. **Several gates check something other than their name.** G16 "axe/WCAG" and G17 "Lighthouse" are static `grep` tests over source files. G11 runs page-load smoke tests, not commerce journeys. G4 never migrates PostgreSQL. G14 skips every `.md`, `*test*`, `*mock*`, `.example` and `.template` file. G9 allow-lists "duplicate dependencies", the exact N10 duplicate-React risk, with no owner acceptance (Section 3.2).
6. **The evidence is not in git.** `.gitignore:62` (`*.log`) excludes every gate log, so committed milestone evidence is just a `summary.json`.

In this program, **a claim does not exist unless a full, committed `verify-all` run on that commit proves it.** The harness gets fixed **before** any status is claimed.

## 1. MISSION

1. **Make the harness honest** (Phase V1), so the generated numbers mean what the brief says they mean.
2. **Make every backend test green on both engines** (V2), fixing root causes, never loosening tests.
3. **Finish the backend gaps** (V3): the canonical pipeline (P1/N6), hardcoded business rules, public-route review, SQL-interpolation triage, and PostgreSQL type safety.
4. **Build the missing product surface** (V4): customer web and Android, the seller dashboard and Android seller mode, the rider app, and the admin console for A1–A14, all wired to the APIs that already exist.
5. **Prove it end to end** (V5–V6): Playwright persona journeys, then an Android release build and an emulator smoke test.
6. **Close security, compliance and zero-cost infrastructure gaps** (V7–V9).
7. **Final regression** (V10): one full `verify-all` run on the final commit, with a report generated from its output.

**Definition of done:** the five conditions in "What 100% complete means" at the top of this file. They build on `LAUNCH_BRIEF.md` §9: G1–G18 all pass in **one** full run (no `--only`, no `--skip-android`) on the final commit. Every `scope: "launch"` feature is VERIFIED **as computed by the hardened G18**. Every P0/P1 finding is FIXED-VERIFIED or NEEDS OWNER with a concrete reason. Anything less is reported as the generated percentage.

## 2. GROUND RULES

### 2A. Everything in `LAUNCH_BRIEF.md` §2 stays in force

Git safety, the local-only database rule (`backend/.env` points at hosted Supabase: never touch it), secrets handling, no external services, asking before installing system software, forward-only migrations, no deletions, evidence rules, banned words, allowed statuses, engineering quality and decision points D1–D8. Re-read §2 at the start of every conversation.

### 2B. New anti-gaming rules (non-negotiable)

1. **Never hand-edit a feature's status.** `features.json` `status` is written only by G18's computed result (the `--write-status` mode from V1). A human-typed `VERIFIED` is a defect.
2. **Gates only get stricter.** Any change to `scripts/verify/**` goes in its own commit, before product fixes, with a self-test proving the gate now catches the failure it missed (Section 5, V1). Never relax a gate condition, add an allowlist entry, or skip a check to get green. An allowlist entry needs an owner-approved record in `docs/launch/accepted-exceptions.json`.
3. **Only full runs sign anything off.** `verify-all --only …` is for your inner loop. It writes evidence but must **not** regenerate `STATUS.md`. A phase is done only when a full run on the phase's final commit shows the phase's exit gates green. Android gates may be NOT RUN only while the phase has no Android exit criteria, and then are reported as NOT RUN.
4. **Commit the evidence.** Each phase's final full-run evidence folder is committed: `summary.json`, the Jest/Playwright/Maestro JSON reports, and gate logs written as scrubbed `.txt` files (see D13). Never claim from an uncommitted folder.
5. **"Mapping" old tests to a feature is not verification.** Each feature needs tests written against its `acceptance` criteria in `features.json`, with the ID tag in the title (`[C8.2] quote rejects a client-supplied total`), on each platform it lists.
6. **Changing a test's assertion requires a FINDINGS entry** that explains why the old expectation was wrong, citing the requirement. Session 13 "aligned assertions with D1" without one. Review those changes (`orderPlacementPayments.test.js`, `deliveryPricing.test.js`) and record them.
7. **Reports are generated.** `LAUNCH_READINESS_REPORT.md` and `STATUS.md` are rendered by a script from `summary.json`. Prose may surround the generated tables, but no number in prose may differ from them. Add policy check **POL-09** (Section 5, V1).
8. **"Not run" is not "standby".** Words like STANDBY, PENDING OWNER or "requires live demo" must never replace FAIL or NOT RUN for a gate.
9. **Auto-proceed only past work, never past decisions.** If a phase needs a decision in Section 4, record it, work on independent tasks with the default, and say so in the phase report.
10. **Context loss.** If your conversation was truncated ("server cleared a prefix"), re-read `PROGRESS.md`, the latest **full-run** `summary.json` and `git log -15` before making any claim.

## 3. VERIFIED CURRENT STATUS (owner re-check of `311659a`, evidence `verify-2026-10-25T14-03-06`)

### 3.1 Documents that contradict the generated evidence

| Document | Problem | Action (V0) |
|---|---|---|
| `docs/launch/LAUNCH_READINESS_REPORT.md` | G2, G3, G9, G13 shown as PASS; claims "0 high" (actual 15); banned words; "53/53 VERIFIED" | Add a SUPERSEDED banner; regenerate in V10 |
| `PRODUCTION_READINESS_REPORT.md` (repo root, tracked) | Claims "100% PRODUCTION READY & CERTIFIED (ZERO-DEFECT)", 1,488/1,488 tests, 127 migrations; contains literal 64-hex sample values for `JWT_SECRET` / `JWT_REFRESH_SECRET` (they match no env file; checked by count only) | Add a SUPERSEDED banner; replace the values with `<generate: openssl rand -hex 32>`; add both values to the `envValidator` banned-secret list with a test |
| `docs/launch/PROGRESS.md` | M0–M9 all "VERIFIED"; "Next action: Launch Program v2 Complete — 100%" | Reset statuses to what the evidence supports (mostly CODE COMPLETE); "Next action" → V1 |
| `docs/launch/STATUS.md` §2 | Hand-written, stale prose ("53/53 verified") | Make all of it generated |
| `docs/launch/features.json` | 53/53 `"VERIFIED"` set by hand | Set every status to the value computed by the V1 G18 |
| `docs/audit/FINDINGS.md` | L11, L12, L13, L15 still OPEN; N4 only CODE COMPLETE; N6, N9, N15, N17 never recorded; none of this program's new defects recorded | Append F-101… (Section 3.6), reopen as needed |
| `docs/launch/NEEDS_OWNER.md` item 10 | Says the local PG password is unknown, while `verify-all.mjs` hardcodes `password` | Reconcile (D14) |
| `docs/launch/NEEDS_OWNER.md` item 11 | Lists G13 exceptions that were never owner-accepted; the actual remaining highs differ (Section 3.7) | Rewrite as an exception proposal (D12) |
| Missing per brief §10 | `docs/launch/COMPLIANCE_CHECKLIST.md`, `docs/launch/PLAY_STORE_CHECKLIST.md` | Create in V8 |

### 3.2 Harness defects (`scripts/verify/verify-all.mjs`) — fix all in V1

| ID | Gate | Defect | Required behaviour |
|---|---|---|---|
| H1 | G18 | Counts `status === 'VERIFIED'` strings | Parse the real reports (Jest SQLite + PG JSON, web/admin `node --test` output, Playwright JSON, mobile Jest JSON, Maestro/Detox JUnit). A feature is VERIFIED only if **each platform** in `platforms` has ≥1 **passed** test tagged `[<ID>.<n>]`, **no** tagged test failed on any engine or platform, and every `evidence` path exists **and is tracked by git**. Platform → report mapping: `api` → Jest on SQLite **and** PG; `web` → Playwright `web-*` project; `admin` → Playwright `admin` project; `android` → mobile Jest **and** Maestro/Detox. Provide `--write-status` to write computed statuses back to `features.json`, and fail if a stored status disagrees with the computed one. |
| H2 | G16 | Static grep named "axe" | `@axe-core/playwright` against the built web app (home, shop list, shop page, product, cart, checkout, login, order tracking, every legal page) and the admin (login, dashboard): 0 serious or critical. Keep the static checks as extra assertions. |
| H3 | G17 | Static grep named "Lighthouse" | Lighthouse CI (mobile preset) against `next start` for home, shop, product and cart: LCP ≤ 2.5 s and CLS ≤ 0.1. Plus an API latency smoke test on seeded local data (catalogue, cart, quote): p95 ≤ 300 ms. Save the JSON reports. |
| H4 | G11 | Runs only page-load specs for `web-chromium`; `auth-flow` "login page with phone input" fails (likely outdated after D3) and the theme toggle test is flaky | Add the commerce persona journeys from brief §9 G11 for **web and admin** projects, ID-tagged; fix the flake at its root; if the D3 login change made a test wrong, fix the test and record why. |
| H5 | G12 | Hard-coded `passed: false` | Real emulator smoke via Detox (already in `apps/mobile/e2e/`) or Maestro (ask before installing): the G11 journeys plus a deep link, a denied permission and offline mode; logcat with no FATAL or ANR. |
| H6 | G10 | No sha256, size or date recorded | Record APK/AAB sha256, size and build time in evidence (never commit the binary). Inspect the **built** APK's merged manifest permissions (`aapt2 dump permissions` / `apkanalyzer`), not just the source manifest. |
| H7 | G9 | Self-allow-lists 3 expo-doctor failures, including duplicate dependencies | Move the allowlist to `docs/launch/accepted-exceptions.json`, which requires `ownerApproved: "<date>"` per entry; duplicate React must be fixed, not allow-listed. |
| H8 | G13 | No exception mechanism, so the gate can never pass legitimately | Passes only when 0 high/critical remain, or every remaining advisory (by GHSA ID) sits in `accepted-exceptions.json` with an exposure analysis, a mitigation and owner approval. |
| H9 | G14 | Skips `.md`, `*test*`, `*mock*`, `.example`, `.template`; only 4 patterns | Scan all tracked text files. Add patterns for `JWT_SECRET=`/`*_SECRET=` with ≥32 hex/base64 chars, `AIza…` Google keys, `"private_key":`, `storePassword=`/`keyPassword=`, `eyJ…` JWTs (the known Supabase anon key in `apps/mobile/app.json` goes in an owner-reviewed allowlist entry, not an excluded path). Add a self-test with a planted fake secret. |
| H10 | G4 | Migrates SQLite only; seed verified once | Brief §9 G4: migrate an **empty** SQLite and an **empty** local PG (`localsampark_test`), diff schemas against a reviewed allowlist, run the seed twice (idempotency), run `seed:demo:verify` on both. |
| H11 | G3/G6 | DB credentials hardcoded (`postgres` / `password`, DB `localsampark`) | Read from a gitignored `backend/.env.test.local` (D14), target a dedicated `localsampark_test` database that is dropped and recreated per run, and keep the local-host guard. |
| H12 | all | `--only` runs regenerate `STATUS.md`, so partial runs overwrite the honest status | Partial runs write `summary.json` marked `"partial": true` and never touch `STATUS.md`. |
| H13 | evidence | `*.log` gitignored | Write gate logs as `.txt` through a scrubber that redacts anything matching the G14 patterns (D13). |
| H14 | G2/G3 | Suites that hard-wire SQLite run inside the PG gate and hit a stale SQLite file (`SQLITE_CONSTRAINT` errors in the PG run); PG data leaks between suites (see B13) | Engine selection per suite is explicit (`@engine sqlite-only` docblock tag or a separate Jest project). Each gate run starts from a fresh database. PG suites clean up through per-suite transactions or truncation. |
| H15 | report | No generated readiness report | `scripts/verify/render-report.mjs` renders `STATUS.md` and the gate/feature tables of `LAUNCH_READINESS_REPORT.md` from `summary.json`. |

**Harness self-tests** (`scripts/verify/__tests__/`, run as part of G15): G18 rejects a feature marked VERIFIED with no tagged test; G18 rejects a feature with a failing tagged test on PG only; G14 catches a planted fake secret in a temp tracked file; partial runs do not modify `STATUS.md`; POL-09 flags "100%" in a sample report.

### 3.3 Backend test failures on `311659a` and their root causes — fix all in V2

**On SQLite (G2: 28 failures, 8 suites):**

| ID | Suite | Root cause seen in the report | Direction |
|---|---|---|---|
| B1 | `unit/riderFleet.test.js` (18/18 fail) | `NOT NULL constraint failed: local_shops.coordinate` in the fixtures | Fix the fixture or the schema twin so the shop insert matches both engines; R1–R5 depend on it |
| B2 | `concurrency.test.js` [G6.4] | `table coupons has no column named discount_amount`: the SQLite twin of migration 128 diverges from the PG version | New forward migration aligning the twin (don't edit 128 if it runs cleanly on fresh PG) |
| B3 | `postgresSchemaContract.test.js` (4) | `trust_reviews.order_id` FK exists on PG only (133); `idx_order_returns_user_id` and `idx_order_returns_verified_by` are missing on PG; **15 `is_active = true/false` literals against INTEGER columns on PG**, introduced by the L5 "normalisation" (fraud.routes.js:197, admin-revenue.controller.js:179, advanced-b.routes.js:177/211/258/400/409, advanced.routes.js:577/585, carpool.routes.js:478, marketplace.routes.js:88, society-resident.controller.js:163/196/880, society-visitor.controller.js:80) | Fix each SQL site to match the column type on both engines; add the missing FK/indexes through a new migration pair |
| B4 | `insertSchemaContract.test.js` | `modules/core/routes/privacy.routes.js:117` inserts `data_subject_requests.details`, a column that exists on neither engine, so **the DPDP data-subject request endpoint fails at runtime** | Fix the insert or add the column by migration; add a tagged C1/P11 test |
| B5 | `fkIndexCoverage.test.js` | FK columns without an index: `trust_reviews.order_id`, `order_returns.user_id`, `order_returns.verified_by` | New migration pair |
| B6 | `envDocumentation.test.js` | `BYPASS_FEATURE_FLAGS`, `ENABLE_ML_JOBS`, `ENABLE_WORKERS` are missing from `.env.example`, though PROGRESS claims the ENABLE_* flags were added | Document them; `BYPASS_FEATURE_FLAGS` must be refused outside `NODE_ENV=test` by `envValidator` |
| B7 | `integration/routeSmoke.test.js` | Five routes answer anonymous callers but are not on the reviewed public list: `GET /features`, `GET /support/grievance-officer`, `GET /trust-reviews/shop/:id`, `POST /users/account-deletion-request`, `POST /account-deletion-request` (a duplicate mount) | Review each one. Allowlist it **with** rate limit and validation, or protect it. The deletion request must not reveal whether an account exists, and must be OTP/email verified before queueing. Remove the duplicate mount by proxying it, not deleting it. |
| B8 | `integration/adminPricing.test.js` | The admin sees 0 pricing settings, expected 5: a regression from the S4/A6 commission changes | Find the regression and fix the code |

**Additional failures on PostgreSQL (G3: 193 failures, 24 suites):**

| ID | Suite(s) | Root cause | Direction |
|---|---|---|---|
| B9 | `unit/wishlistEngine.test.js` (6/6) | `inconsistent types deduced for parameter $2` in `wishlist.routes.js`. **C12 was marked VERIFIED in the same session.** | Cast or split the parameter so PG infers one type |
| B10 | `setup/testDb.test.js`, `integration/ecommerce.routes.test.js`, `tests/db-introspection.test.js`, `tests/marketplace-zone-scope.test.js`, `tests/spatial-index.test.js` | SQLite-only DDL or introspection (`AUTOINCREMENT`, `PRAGMA`, `sqlite_master`, R*Tree) and an integer bound to a boolean column on PG | Make the helpers engine-aware, or tag the suites sqlite-only with a PG equivalent (PostGIS) for the spatial checks |
| B11 | `services/territoryResolution` (51), `services/orderAttribution` (24), `services/mlFeatureStore` (19), `services/boundaryMonitor` (17), `integration/franchiseTerritoryIsolation` (15), `integration/adminPaging` (14), `seedDefault` (7), `routeSmoke` (3) | They throw **`SQLITE_CONSTRAINT` during the PG run** because they ignore `TEST_USE_POSTGRES` and collide with a stale SQLite file | Harness fix H14, then fix the remaining real failures |
| B12 | `escrow.test.js`, `tests/endpoint-queries.test.js` | `invalid input syntax for type uuid: "900"` / `"nonexistent-region"`, so on PG bad ids become 500s | Validate UUID path and query params at the route (return 400/404); add tests |
| B13 | `integration/adminConsoleData.test.js` | Revenue expected 700, got 2947: PG test data leaks between suites | Isolation (H14) |
| B14 | `wallet.test.js` | `jest.spyOn(...).mockImplementation is not a function` on the PG path | Fix the mock target or module shape |
| B15 | `tests/column-verifier.test.js` | 10 s timeout on PG | Find the slow query; never just raise the timeout |
| B16 | `postgresSchemaContract` (PG run) | `society_advance_account`, `society_billing_config`, `society_delivery_preferences` and `society_flat_ledger` lack `id` on PG | Fix with a forward migration (vertical is off at launch, but schema parity is a gate) |

### 3.4 Real feature status, computed with the brief's G18 rule from the 14-03-06 reports

| Group | Features |
|---|---|
| Passing ID-tagged **API** tests on both engines with no tagged failure (API layer only; **no UI or Android proof**) — 32 | C5 C6 C7 C9 C10 C11 C13 C14 · S1 S2 S3 S4 · A1–A14 · P3 P8 P10 · and P7 P12 P13 (static web file tests only) |
| **No ID-tagged test at all** ("mapped" in session 13) — 15 | C1 C2 C3 C4 C8 · S5 S6 S7 · P1 P2 P4 P5 P6 P9 P11 |
| **Tagged tests failing** — 6 | C12 (6 fail on PG) · R1 R2 R3 R4 R5 (all fail on SQLite) |
| Android proof (G9/G10/G12 in a full run) | **none** |
| Web/admin UI-level proof | **none** |

Honest score under the brief's definition: **0 / 53 VERIFIED**. The best case, counting API-only, is 32 / 53 **CODE COMPLETE**.

Also note: `C10–C14` ↔ brief IDs drifted. The brief defines C10 as returns, C11 reviews, C12 wishlist, C13 notifications and C14 support. `features.json` and the M5 code use other mappings ("C10/S5 tracking", "C12/S7 reviews", "C13/N7 invoices"). Reconcile `features.json` to the brief's definitions in V0, and re-tag the tests to match.

### 3.5 Product surface gap: backend endpoints with no client caller

Counts are source files under `apps/web/src`, `apps/admin/src` and `apps/mobile/{app,src}` that reference the endpoint:

| Capability / endpoint | web | admin | mobile |
|---|---|---|---|
| A1–A14 `/admin/commerce/*` (the whole admin hub) | 0 | **0** | 0 |
| C12 `/wishlist` | 0 | – | 0 |
| C10 `/orders/:id/returns`, `/returns` queue | 0 | 0 | 0 |
| C9 `/orders/:id/invoice/pdf` | 0 | – | 0 |
| C7 coupons | 0 | 0 | 0 |
| S2 `/variants`, `products/low-stock`, availability | 0 | – | 0 |
| S3 `packing-slip`, accept/reject | 0 | – | 0 |
| S4 `settlements/statement` (+CSV) | 0 | – | 0 |
| R2 `/delivery/duty` | 0 | – | 0 |
| C14 `/support/grievance-officer` | 0 | – | 0 |
| C11 `trust-reviews` (submit/reply) | 0 | – | 1 |

The admin app builds only 6 routes (`/`, `/audit`, `/login`, `/settings`, `/territories`, `/test-runner`). On mobile, the existing rider screens call `/delivery/jobs` but none of the new M4 endpoints (duty toggle, pickup/OTP completion, cash ledger, KYC). There is no seller-mode wiring to variants, low-stock, packing slips or statements, and the tabs do not use the `packages/shared` feature flags. Audit each existing rider and seller screen against the M4 API contracts before building new ones.

### 3.6 New findings to append to `FINDINGS.md` (ID, severity)

- **F-101 (P1) Hardcoded geofence.** `delivery.controller.js:801-803` uses a fixed Pune bounding box (18.40–18.75 / 73.70–74.05). It must come from the serviceability zones that admin manages (A9).
- **F-102 (P1) Hardcoded return rules.** `return.service.js:35-39` hardcodes 48 h / 168 h windows and a perishable category list. Move them to DB config (`platform_settings`/category attributes) that admin can edit.
- **F-103 (P1, decision D10) COD refunds go to the customer wallet.** `return.service.js:192-204` credits the wallet, but the wallet is OFF at launch (D1) and brief C10 says COD refunds are recorded as manual payouts. The same conflict applies to rider earnings being credited to the wallet (R4).
- **F-104 (P1, decision D11) Grievance officer details hardcoded.** The name, email and address are hardcoded in `support.routes.js`, `order.routes.js`, `apps/web/src/app/legal/grievance/page.js`, `LegalHub.js` and `account-deletion/page.js`. Move them to config, and confirm the details and that the email domain is live.
- **F-105 (P1) Fragmented order pipeline still in place (N6/P1).** Independent order-creation handlers remain at `shop.routes.js:857` (`POST /shops/:id/orders`), `shop.routes.js:1006` (`/cart/batch-checkout`), `checkout.routes.js:28` and `payment.routes.js:34` (`/create-order`). D5 is still "PROPOSED", yet P1 was marked VERIFIED.
- **F-106 (P1) 196 potential SQL string interpolations** (`docs/audit/static-sweeps.md` §3) were never triaged. Parameterize each one or whitelist its identifier, and add a policy check so new ones fail G15.
- **F-107 (P1) Off-scope verticals reachable.** The web app has 284 pages, 122 of them under `/krishi`; only `Header` navigation is gated, and there is no middleware for deep links. Mobile tabs and routes ignore the flags. D1 requires "not available" deep links and API 403/404.
- **F-108 (P2) No CSP on web** (N15 still open).
- **F-109 (P2) No Sentry in the admin app** (P8).
- **F-110 (P1) `render.yaml` is not zero-cost.** It still provisions `localsampark-redis` and `localsampark-db` on `plan: starter` and wires `REDIS_URL`/`DATABASE_URL` from them. That contradicts `ZERO_COST_ARCHITECTURE.md` (Supabase/Neon + in-memory) and the "₹0/month" claim.
- **F-111 (P2) Tracked test output.** `playwright-report/index.html` and `test-results/.last-run.json` are tracked (currently modified/deleted in the working tree), which is repo noise (L15).
- **F-112 (P2) Legal pages incomplete.** No legal page carries "DRAFT — requires legal review" (brief §7). Standalone cancellation, shipping/delivery, seller-terms and cookie/consent pages are missing; verify whether `LegalHub` tabs cover them.
- **F-113 (P1) PG type strictness.** Bad ids raise 500s on PG (B12). Sweep every `:id`/query id used in SQL for validation.
- **F-114 (P2) Feature IDs drifted from the brief** (Section 3.4 note).
- **F-115 (P1) Unreviewed test-assertion changes** made in session 13 (rule 2B.6).

### 3.7 Still-open items carried from v2

- **L11** (the 2026-10-14 PDF items), **L12** (dual SOS: unify later, keep hidden), **L13** (App Links fingerprint: owner supplies the Play signing SHA-256), **L15** (repo hygiene: classify `backend/` stray scripts; archiving is an owner decision).
- **N4 / G13 remaining highs (root):** `firebase` and its `@firebase/firestore*` / `@grpc/grpc-js` chain, `nodemailer` (direct, fix is the major v10), `postcss` via `next` (fix is Next 16, a major), `node-fetch` via `face-api.js`, `brace-expansion` (fix available). **(mobile):** `expo`/`@expo/cli` chain, `node-forge`, `@expo/code-signing-certificates`, `image-size` (fix available), `brace-expansion` (fix available), `postcss`. Apply every non-major fix first. Then evaluate the majors (nodemailer 10 on the backend is likely low-risk; test it). Check whether `firebase` (client SDK) and `face-api.js` are even needed in the launch-scope bundles. Whatever remains goes into the D12 exception proposal.
- **N6** duplicate tables (orders/reviews/wishlists/payouts): no deletions; document which table is canonical per domain and make all new writes go there.
- **N9** Supabase PG major version is unconfirmed (local is PG 18.6). Run G3 on the same major as production (D16).
- **N15** CSP (F-108), plus the httpOnly-cookie plan for web as a decision.
- **N17** The push path looks aligned (the app uses `getExpoPushTokenAsync`; the backend sends through `exp.host`). Record it in FINDINGS with a tagged test and an end-to-end check on the emulator.
- `NEEDS_OWNER` items 1–9 remain owner actions (Supabase anon key in `app.json`, Play signing fingerprint, keystore passwords in history, Play account type and closed-test timeline, Razorpay KYC, SMS DLT, legal review, CA review, domain/host).

### 3.8 Feature completion matrix: what each of the 53 features still needs

"API now" comes from the 14-03-06 reports. "✓" means passing ID-tagged API tests on both engines; it does **not** mean VERIFIED. A feature is done only when G18 computes VERIFIED for **every** listed platform. Each UI item needs ID-tagged tests: Playwright for web/admin, mobile Jest + Detox/Maestro for Android.

| ID | Feature (platforms) | API now | Still missing to reach VERIFIED | Phases |
|---|---|---|---|---|
| C1 | Account & auth (api, web, android) | no tagged test; B4 bug | Tagged API tests: Google sign-in, email OTP via a local mail catcher, refresh, logout-all, consent, deletion, data export (fix B4). Login, profile and deletion UI on web and Android; E2E login on both | V2 V3 V4 V5 V6 |
| C2 | Location & serviceability (api, web, android) | no tagged; F-101 | Serviceability from A9 zones (not a bounding box); saved addresses with map pin and pincode; "not serviceable yet" waitlist screen on both clients | V3 V4 V6 |
| C3 | Discovery (api, web, android) | no tagged | Home banners and sections from the A7 CMS; shop filters (open now, distance, rating, ETA) and sorting; shop page (hours, holidays, minimum order, fees) — API tests + UI | V3 V4 |
| C4 | Product detail & metrology (api, web, android) | no tagged | Variants, MRP/discount, stock and quantity limits, net quantity / manufacturer / origin / best-before / FSSAI — API tests + product page UI | V3 V4 |
| C5 | Search (api, web, android) | ✓ | Autocomplete, filters and typo tolerance in both UIs; Typesense fallback test | V4 |
| C6 | Cart (api, web, android) | ✓ | Cart UI with per-shop grouping, guest-cart merge on login, revalidation messages, minimum-order and fee rules | V4 |
| C7 | Coupons (api, web, android, admin) | ✓ | Apply/remove coupon in cart and checkout UI; admin coupon CRUD screens | V4 |
| C8 | Checkout (api, web, android) | no tagged | API tests for server-only totals, `Idempotency-Key`, slot/ASAP, failure paths, payment methods per D4. Checkout and confirmation UI; E2E COD | V3 V4 V5 |
| C9 | Orders (api, web, android) | ✓ | Order list, detail and timeline; live status over socket and push with a polling fallback; cancellation window; reorder; invoice PDF download; help-from-order — UI on both. P1 status API | V3 V4 V5 |
| C10 | Returns & refunds (api, web, android, admin) | ✓ (re-tag per F-114) | Return request with photos; seller/admin decision UI; refund routing per D10; status tracking; F-102 config | V3 V4 |
| C11 | Reviews (api, web, android, admin) | ✓ | Review-after-delivery UI; seller reply; **abuse report + admin moderation** (API + UI, not built) | V3 V4 |
| C12 | Wishlist & recently viewed (api, web, android) | **FAIL on PG (B9)** | Fix B9; **recently viewed is not built**; wishlist UI on both | V2 V3 V4 |
| C13 | Notifications (api, web, android) | ✓ | In-app inbox, preferences and deep links in both UIs; email adapter test; N17 emulator push check | V3 V4 V6 |
| C14 | Support & grievance (api, web, android, admin) | ✓; F-104 | FAQ and ticket UI with ticket number; grievance page from config; admin ticket/SLA screens | V3 V4 V8 |
| S1 | Seller onboarding & KYC (web, android, admin, api) | ✓ | Shop profile (geo pin, hours, radius, minimum order, fees) and KYC upload UI on both seller surfaces; admin review screen with resubmission | V4 |
| S2 | Catalogue & inventory (web, android, api) | ✓ | Variants, images (object storage, resized), HSN/GST, stock + low-stock alert, availability toggle, CSV import/export, moderation status — UI | V4 |
| S3 | Order handling (web, android, api) | ✓ | New-order ringer, accept/reject with reason, **auto-cancel timer** (API test + UI), status flow, fulfilment mode, packing slip print | V3 V4 |
| S4 | Money (web, android, admin, api) | ✓; B8 | Fix B8; statements, COD reconciliation, payout requests and history, CSV — seller UI + admin payouts UI | V2 V4 |
| S5 | Shop coupons (web, android, api) | no tagged | Tagged API tests within platform guardrails; seller coupon UI | V3 V4 |
| S6 | Seller reviews (web, android, api) | no tagged | Reply and report API tests; seller UI | V3 V4 |
| S7 | Seller analytics (web, android, api) | no tagged | Real-data API tests (sales, orders, top products, ratings); analytics UI | V3 V4 |
| R1 | Rider onboarding & duty (android, admin, api) | **FAIL on SQLite (B1)** | Fix B1; Android KYC + duty toggle; admin rider KYC screen | V2 V4 V6 |
| R2 | Assignment & dispatch (android, api) | FAIL on SQLite | Accept/decline job queue on Android | V2 V4 V6 |
| R3 | Pickup → delivery with proof (android, api) | FAIL on SQLite | Pickup, OTP **or photo** proof, hand-off to navigation | V2 V4 V6 |
| R4 | Live location (android, api, web) | FAIL on SQLite | Battery-aware background location (never simulated); customer live map on web + Android | V2 V4 V6 |
| R5 | COD cash ledger & earnings (android, admin, api) | FAIL on SQLite | Rider cash and earnings screens; admin deposit reconciliation UI; earnings per D10 | V2 V4 V6 |
| A1–A14 | Admin commerce hub (admin, api; A12 also web, android) | ✓ (all 14) | **Every admin screen** against `/admin/commerce/*` with Playwright admin tests. A12 also drives web middleware and mobile tabs (F-107). A6 depends on B8, A9 drives F-101. A8 adds admin PIN + OTP and an audit-log viewer. A13's CSV schema needs CA sign-off (owner). | V2 V3 V4 V5 |
| P1 | Canonical pipeline (api) | no tagged; D9 | One quote, order and status API with a state machine and per-role transitions; append-only history; legacy routes proxy (F-105) | V3 |
| P2 | Payments (api) | no tagged | Razorpay order → verify → webhook (signature, idempotency) and reconciliation job — sandbox fakes, flag off | V3 |
| P3 | Ledger (api) | ✓ | Keep green; balances reproducible on both engines | V2 |
| P4 | Media (api) | no tagged | Storage interface + S3 adapter (local fake), MIME sniffing, size limits, image resizing, migration script for existing files | V3 V7 |
| P5 | Notification service (api) | no tagged | Adapter tests for push, email, and SMS-behind-flag | V3 |
| P6 | Module registry & flags (api, web, android, admin) | no tagged | One registry consumed by API middleware, web middleware/nav, mobile tabs and routes, admin tabs (F-107) | V3 V4 |
| P7 | SEO (web) | static web ✓ | Playwright checks of SSR `generateMetadata`, JSON-LD and canonical/OG on real shop and product pages; sitemap includes products | V4 V5 |
| P8 | Observability (api, web, android, admin) | ✓ (`/health`, `/ready`) | Sentry with releases and source maps on web, **admin**, Android and API; structured logs; uptime monitor config | V7 V9 |
| P9 | Security (api, web, android, admin) | no tagged | Rate-limit, validation, security-header, CSP and upload-check tests per route class | V3 V7 |
| P10 | Backups (api) | ✓ | Restore rehearsal against local PG, with evidence | V9 |
| P11 | Consent-gated analytics (web, android) | no tagged | Tests showing no analytics event before consent on both clients | V3 V4 |
| P12 | i18n & accessibility (web, android) | static web ✓ | axe (G16) on key pages; en/hi string-completeness test; Android accessibility labels and 44 px targets | V1 V4 V6 |
| P13 | Performance budgets (web, api, android) | static web ✓ | Lighthouse budgets, API p95 ≤ 300 ms, Android cold start ≤ 3 s | V1 V6 |

## 4. OWNER DECISIONS NEEDED (record in `DECISIONS.md`; keep working with the default)

| ID | Decision | Default if unanswered |
|---|---|---|
| D9 | Approve the D5 canonical-pipeline plan already written in `DECISIONS.md` | Do not start the P1 migration of callers; build everything else. P1 stays NOT VERIFIED. |
| D10 | COD refunds and rider earnings while the wallet is off (F-103) | Per brief: COD refund = manual payout record (UPI/bank) confirmed by admin, with a ledger entry; rider earnings accrue in the rider ledger and are paid out manually; wallet code stays flagged off |
| D11 | Grievance officer identity and contact (F-104) | Read from config; show the values marked "DRAFT — pending owner confirmation" |
| D12 | G13 dependency exceptions | Fix everything fixable; propose `accepted-exceptions.json` entries; the gate stays red until the owner approves |
| D13 | Committing evidence logs | Commit the scrubbed `.txt` logs + JSON reports for each phase's final full run only; no `.gitignore` change |
| D14 | Local PG test credentials and DB | Create `localsampark_test`; credentials in a gitignored `backend/.env.test.local`; ask the owner to run the `CREATE DATABASE`/password step if needed |
| D15 | Tooling installs: Android emulator/AVD, Maestro (if Detox can't run), Docker/MinIO for S3 adapter tests | Ask first. npm dev-dependencies inside the repo (`@axe-core/playwright`, `@lhci/cli`, `autocannon`) are allowed. |
| D16 | Supabase PG major version | Ask; until answered, run G3 on local PG 18 and flag N9 |
| D17 | Marathi at launch (carried from v2) | English + Hindi; every string translatable |
| D18 | Untracking `playwright-report/` and `test-results/` (F-111) | Ask; never delete the files from disk |

## 5. PHASES

Do these in order: V0 → V11. Work **one phase per conversation**; V4 may take several conversations, split as V4a customer, V4b seller, V4c rider, V4d admin, V4e gating. Every phase ends with: a full `verify-all` run → committed evidence → FINDINGS/PROGRESS updates → commits → the phase report (Section 6).

### V0 — Truth reset (docs only, no product code)

1. Commit the two untracked evidence folders (`verify-2026-10-25T14-00-44`, `verify-2026-10-25T14-03-06`) exactly as they are. Their `.log` files are gitignored, so copy them as `.txt` after scrubbing.
2. Add SUPERSEDED banners to `LAUNCH_READINESS_REPORT.md` and `PRODUCTION_READINESS_REPORT.md`. In the latter, replace the sample JWT values with placeholders.
3. Reset `PROGRESS.md` milestone statuses to what the evidence supports. Set "Next action: V1".
4. Reset every `features.json` status to `CODE COMPLETE`, `IN PROGRESS` or `NOT STARTED`, following Section 3.4. Reconcile the C10–C14 IDs with the brief (F-114).
5. Append F-101…F-115 and B1…B16 to `FINDINGS.md`, reopen L5 (because of B3), and record N6, N9, N15 and N17.
6. Merge Section 4 into `DECISIONS.md` and `NEEDS_OWNER.md`.

Exit: no document in `docs/launch/` or the repo root contradicts the latest full-run `summary.json`.

### V1 — Make the harness honest (H1–H15)

Implement H1–H15, POL-09 (banned words in `docs/launch/*.md` outside superseded or brief files) and the harness self-tests. These changes go in separate commits, before any product fix. Then run a full `verify-all` and **expect the numbers to get worse**. That is the honest baseline: report it as-is.

Exit: the harness self-tests pass; G18 computes statuses from reports; `STATUS.md` is generated by a full run; the baseline is committed.

### V2 — Backend green on both engines

Fix B1–B16 at the root, using new forward migration pairs for schema drift. Search the repo for each bug class (boolean literal vs INTEGER, SQLite-only SQL in shared code, unvalidated UUIDs) and fix every instance.

Exit: G2 = 0 failures, G3 = 0 failures (fresh `localsampark_test`), G4 passes on both engines, G1/G5/G6/G15 stay green.

### V3 — Backend correctness and missing acceptance tests

1. F-101, F-102, F-103 (per D10), F-104 (config), F-106 (SQL triage with a policy check), F-113 (UUID validation), and the B7 public-route review with rate limits.
2. P1 (after D9): the canonical quote, order and status APIs behind one state machine with append-only history. Legacy routes proxy to them, or return 410 once clients have migrated.
3. Write the missing **ID-tagged acceptance tests** for C1 C2 C3 C4 C8 S5 S6 S7 P1 P2 P4 P5 P6 P9 P11, against the `acceptance` lists. Examples: P2 Razorpay signature and webhook replay (sandbox fakes only); P4 the S3 adapter against a local fake (ask before Docker/MinIO); P9 rate limits per route class; P11 no analytics event before consent.
4. Feature-flag enforcement at the API for every off-scope vertical (403/404 while off), with tests run with the flag on so the code stays healthy.

Exit: G2/G3 green; every launch feature has passing `api` tagged tests on both engines (G18 shows the remaining gaps as web/admin/android only).

### V4 — Build the missing product surface

Use the shared clients (`apps/{web,admin,mobile}/src/lib/api.js`) and `packages/shared`. Use no direct `fetch`, no hardcoded hosts and no mock data. Put every string in `en`/`hi` (plus `mr` per D17), handle loading, empty, error and offline states, and report errors to Sentry.

- **Customer (web + Android):** address/serviceability with the waitlist screen; search with filters; product page with variants and legal metrology fields; server cart with guest merge; coupon apply; checkout (quote → place with `Idempotency-Key`, COD, online behind a flag); order list, detail and live tracking with a polling fallback; invoice PDF download; return request with photos; review after delivery; wishlist; notification inbox and preferences; support tickets and the grievance page; account deletion and data export.
- **Seller (web dashboard + Android seller mode):** KYC upload and status; catalogue with variants, images, HSN/GST, low-stock and availability toggle; CSV import/export; new-order ringer, accept/reject with a reason and auto-cancel; packing slip print; settlement statement and CSV; shop coupons; review replies; analytics from real data.
- **Rider (Android):** KYC; duty toggle (geofence from zones); job queue; accept/decline; pickup; delivery proof (OTP or photo); battery-aware live location; COD cash ledger and earnings.
- **Admin console:** A1–A14 screens wired to `/admin/commerce/*`, with RBAC-aware navigation and the audit log viewer. Non-commerce tabs are hidden by flags.
- **Gating (F-107):** Next.js middleware returns "not available" for off-scope routes; mobile tabs and routes come from `packages/shared/src/features.js`; deep links into off-scope modules show "not available".

Each screen gets ID-tagged Playwright tests (web/admin) or mobile Jest component tests.

Exit: G7 and G8 green, with new tagged UI tests passing; G16 (axe) passes on the new pages.

### V5 — End-to-end persona journeys (G11)

Playwright against a locally started, seeded backend. No production hosts, no real messages. The journeys:
- the customer browses → cart → coupon → checkout (COD) → tracks the order;
- the seller accepts → marks ready;
- the rider delivers (through the API, or the web rider view if one exists);
- admin refunds or resolves a return;
- logged-out and wrong-role access is denied on every protected page.

Tag every step with feature IDs. Fix the flaky and outdated specs from H4.

Exit: G11 green (web + admin projects) with no retries needed (`retries: 0` in the gate run).

### V6 — Android release (G9, G10, G12)

1. G9 with no self-allow-list. The duplicate React copy is actually resolved (one copy in the dependency tree), not just aliased in Metro.
2. G10 release build with a **local throwaway** upload key that is never committed. Record sha256, size and date. Check the built APK's merged manifest: only the permissions declared by N12, plus `allowBackup` (or backup rules excluding token storage) per N2.
3. G12 Detox (or Maestro after D15) smoke on an emulator: the customer journey, a seller action, the rider delivery, a deep link, a denied permission and offline mode; logcat with no FATAL or ANR. Measure cold start (≤ 3 s target) and save the numbers.
4. Verify the target API level Play currently requires (official source, cite the link and date), plus the Data safety mapping for every shipped SDK, store listing screenshots from the emulator, and App Links (owner fingerprint, L13).

Exit: G9, G10 and G12 green; every feature listing `android` has passing tagged mobile tests.

### V7 — Security and dependencies

G13 per Section 3.7 and D12; CSP (report-only first, then enforce; F-108) and the httpOnly-cookie session plan as a decision; admin Sentry (F-109); rate limits and validation on every allow-listed public route; the expanded G14; and moving the Supabase anon key out of `app.json` into build-time env (NEEDS_OWNER item 1).

Exit: G13 and G14 green under the hardened rules; G5 green with the reviewed allowlist.

### V8 — Compliance and store readiness

Create `COMPLIANCE_CHECKLIST.md` and `PLAY_STORE_CHECKLIST.md`, sourced from official pages with links and access dates. Mark all legal pages "DRAFT — requires legal review". Add the missing cancellation, shipping/delivery, seller-terms and cookie/consent pages (F-112). Load the grievance officer from config (D11). Fix the DPDP data-subject request (B4) and add the access/correct/erase flows. Add a test showing restricted categories are blocked at listing, moderation and checkout. Add tests for seller details on listings, price breakup and country of origin.

Exit: `legalCompliance` tests are tagged and extended; both checklists are complete, with owner items listed in `NEEDS_OWNER.md`.

### V9 — Zero-cost infrastructure, for real

Make `render.yaml` actually free (F-110): an external `DATABASE_URL` (`sync: false`), Redis optional with the in-memory fallback, and no `starter` plans. Make `ZERO_COST_ARCHITECTURE.md`, `LAUNCH_RUNBOOK.md` and the manifests agree. Measure API RSS under a load test against the 512 MB budget, with `ENABLE_WORKERS`/`ENABLE_ML_JOBS` off. Rehearse backup → restore against local PG only and save the evidence. Test cold-start UX (web skeleton and retry banner, mobile backoff).

Exit: the manifests match the documented option, and memory and restore evidence is committed. **No deploy.**

### V10 — Final regression and generated report

One full `node scripts/verify/verify-all.mjs` run on the final commit, with no `--only` and no `--skip-android`. Render `STATUS.md` and `LAUNCH_READINESS_REPORT.md` with `render-report.mjs`. Give the owner a prioritised punch-list. If any gate is red, the report's first line says so, and the readiness verdict is the generated percentage.

### V11 — Production go-live package (the agent prepares; the owner executes)

You still never deploy, submit to a store, or touch a cloud dashboard. You make go-live a mechanical, low-risk owner task:

1. **Production preflight script.** `scripts/launch/preflight.mjs` is read-only and runs locally against an env file the owner supplies. It runs `envValidator` in production mode, refuses unsafe flags (`ALLOW_FREE_OTP_MODE`, `BYPASS_FEATURE_FLAGS`, demo seeding), checks that every required variable is present (names only, never values printed), checks database reachability with `SELECT 1` only, and lists pending migrations without running them. Include tests.
2. **Production smoke script.** `scripts/launch/smoke-prod.mjs <base-url>` makes only GET calls to `/health`, `/ready`, `/features`, the public shop list, a legal page, `sitemap.xml`, `robots.txt` and `assetlinks.json`. It writes a JSON report. It never logs in and never writes.
3. **Local production rehearsal.** Run the production build of API, web and admin against a fresh local PG with `NODE_ENV=production` and a local-only env. Then run preflight → migrate (advisory lock) → provision admin → smoke → the G11 journeys against it. Save the evidence. This proves the runbook works end to end.
4. **Release candidate notes.** `docs/launch/RELEASE_NOTES_v1.0.0.md` covers the scope (D1), flags on and off, known limitations, and the migration list. No git tags or pushes; the owner tags.
5. **Go-live runbook update** (`LAUNCH_RUNBOOK.md`): ordered owner steps with time estimates, verification after each step, rollback triggers and exact rollback steps, a monitoring and alert checklist (Sentry, uptime), and a day-1, week-1 watch list (cold starts, DB quota at 70%, error rate, order SLA breaches).
6. **Play release plan** (`PLAY_STORE_CHECKLIST.md`): the internal → closed testing (the 14-day / 20-tester rule if the account is personal; NEEDS_OWNER item 4) → production timeline, Data safety answers, content rating, listing assets, and the App Links fingerprint step.
7. **Generated owner punch-list:** `render-report.mjs` appends to `LAUNCH_READINESS_REPORT.md` every open NEEDS_OWNER item in priority order, with the exact steps.

Exit: the rehearsal evidence is committed, the preflight and smoke tests pass, and condition 4 of "What 100% means" is met.

## 6. PER-PHASE PROTOCOL AND REPORT FORMAT

For each phase:
1. Publish an Implementation Plan artifact.
2. Write tests first where feasible, tagged with feature IDs.
3. Fix root causes, then search the repo for the same bug class.
4. Run the affected suites, then a full `verify-all`.
5. Commit the evidence.
6. Update `FINDINGS.md`, `PROGRESS.md` and `DECISIONS.md`/`NEEDS_OWNER.md`.
7. Make small Conventional Commits that reference the IDs.

End every conversation with this report and nothing grander:

```
Phase: V<n> — <title>
Result: <EXIT CRITERIA MET | NOT MET>        ← if any exit gate is red, say NOT MET here
Full run: node scripts/verify/verify-all.mjs  (evidence: docs/audit/evidence/<dir>, committed in <hash>)
Gates (pasted from summary.json):  <table, unedited>
Features (computed by G18): <n>/53 VERIFIED, <n> CODE COMPLETE, <n> IN PROGRESS, <n> NOT STARTED
Fixed this phase: <IDs with commit hashes>
Still failing / not run: <gate or test, with reason>
Tests whose assertions changed: <file, test, FINDINGS ID>  (or "none")
Decisions needed: <D-IDs>
Next action: <first task of the next phase>
```

## 7. START NOW

1. Read `LAUNCH_BRIEF.md` (rules §2, scope §4, capabilities §5, compliance §7, gates §9), then this file (`docs/launch/LAUNCH_PROGRAM_V3.md`), `PROGRESS.md`, `DECISIONS.md`, and `docs/audit/evidence/verify-2026-10-25T14-03-06/summary.json`.
2. Run `git status` and `git log --oneline -15`. Confirm you are on `launch/ecommerce-v1` at `311659a` or later.
3. Do **V0** in this conversation. Then present the V1 plan and the list of decisions from Section 4 that need the owner's answer.
4. Do not touch product code until V1's harness self-tests pass and the honest baseline is committed.
