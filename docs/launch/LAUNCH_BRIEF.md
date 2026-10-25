# LocalSampark — Launch Program v2: Close Every Pending Issue, Turn the App into a Launch-Ready Hyperlocal E-commerce Platform, Start at Zero Cost

## 0. READ FIRST — context, and what went wrong last time

You are continuing work on the LocalSampark monorepo in this workspace.

A previous audit run (branch `audit/deep-debug-2026-10`, 22 commits after its snapshot, about 100 minutes, 2026-10-25) produced `docs/audit/FINAL_REPORT.md`. That report declares the app "PRODUCTION READY" with "100% PASS" and all 21 modules "VERIFIED".

The owner then independently re-checked the repository. The verdict is not supported by the evidence:

1. The run's own `docs/audit/FINDINGS.md` still lists L5, L9, L10, L11, L12, L13, L14 and L15 as OPEN, and several of them are P1.
2. All 21 modules were marked VERIFIED, but the run changed code for only 8 leads. No module has runtime evidence.
3. Android was never built or run. The "toolchain proof" was `gradlew tasks --dry-run`, and the newest APK on disk is from 2026-10-03.
4. The Playwright E2E suites were never run. BASELINE.md has no E2E section.
5. PostgreSQL was never exercised. No migration or test run on Postgres is recorded.
6. The L2 "fix" introduced a security regression (Section 3.3, N2).
7. `npm audit` found 52 vulnerabilities at the root (3 critical, including `next`) and 24 in mobile (1 critical), and `expo-doctor` failed 6 checks. All of this was recorded; none of it was fixed.
8. The launch checklist tells the reader to run `npm run migrate:up`, which does not exist. The backend script is `migrate`.
9. The run's extractor reported "114 unauthenticated write endpoints", and nobody triaged the list. Most are false positives: the extractor misses `router.use(authenticate)` and spread middleware such as `...adminOnly`.

Do not repeat these failure modes. In this program, a claim does not exist unless a machine-run gate proves it (Section 9).

## 1. MISSION

1. **Fix every pending issue:** the open leads, the new findings in Section 3, and everything else you discover.
2. **Turn LocalSampark into a launch-ready hyperlocal multi-vendor e-commerce platform.** Neighbourhood shops sell to nearby customers. The platform has:
   - a customer web app and Android app;
   - seller tools;
   - a rider (delivery) flow;
   - an admin console.

   Scope is in Section 4; target capabilities are in Section 5.
3. **Make it launchable at zero monthly cost on free tiers,** with a documented, config-only upgrade path as it grows (Section 6).
4. **Make it compliant and store-ready** for India and Google Play (Section 7).
5. **Prove it.** "100% complete" means exactly this:
   - every gate in Section 9 passes; and
   - every launch-scope feature in `docs/launch/features.json` is VERIFIED by tagged, passing tests.

   Both percentages are computed by a script. You never type them.

Work through the milestones in Section 8, in order. This is many sessions of work. Depth and proof beat speed.

## 2. GROUND RULES (non-negotiable; they override everything else)

### 2A. Safety

1. **Git.**
   - Create the branch `launch/ecommerce-v1` from the current HEAD of `audit/deep-debug-2026-10` (`git switch -c launch/ecommerce-v1`) and work only there.
   - Never push, force-push, rebase, amend, squash or rewrite history. Never run `git reset --hard`, `git clean` or `git stash`, and never delete untracked files.
   - Make small commits in Conventional Commit style, each one referencing finding or feature IDs.
2. **Databases.**
   - `backend/.env` points `DATABASE_URL` and `DIRECT_URL` at a hosted Supabase Postgres, and sets `ALLOW_FREE_OTP_MODE=true`.
   - Treat every non-local database host as PRODUCTION: `*.supabase.com`, `*.supabase.co`, `*.render.com`, and anything that is not localhost or 127.0.0.1. Never migrate, seed, test, purge, index or query it.
   - Before every database command, run `scripts/audit/use-local-env.ps1` (or equivalent) and rely on the existing L6 host guards. Print the resolved host, and abort if it is not local.
3. **Secrets.**
   - Never print, copy into artifacts or logs, or commit the contents of: `backend/.env*`, `*firebase-adminsdk*.json`, `apps/mobile/android/keystore.properties`, `*.keystore`, or any service-role key.
   - Never weaken `.gitignore`.
   - When you discover a secret, record only the file and the secret type in `docs/launch/NEEDS_OWNER.md`.
4. **External services.**
   - Do not deploy, submit to a store, or change anything in a cloud dashboard.
   - No live payments, no paid API calls, and no real SMS, WhatsApp, email or push messages to real people.
   - Instead, use sandbox/test keys, local fakes behind development-only flags, or console delivery in development.
5. **System software.** Ask before installing system software or changing machine settings (Docker Desktop, PostgreSQL/PostGIS, Android Studio/AVDs, Maestro, nvm). Running `npm ci` / `npm install` inside the project is fine.
6. **Migrations are forward-only.**
   - Never edit a migration that runs cleanly on a fresh PostgreSQL. Add a new one, with a `.sqlite.sql` twin where the repo pattern requires it.
   - Data-changing or destructive migrations are decision points.
7. **No deletions.** Never delete a feature, screen, route, table or column. Hide out-of-scope verticals with feature flags (Section 4). Deleting anything is a later owner decision.

### 2B. Evidence and honesty (strengthened)

1. **Evidence files.** Every verification writes its raw output to `docs/audit/evidence/<YYYYMMDD-HHMM>-<ID>/`:
   - command logs (via `2>&1 | Tee-Object`, or captured by Node);
   - JSON test reports;
   - screenshots, at most 500 KB each;
   - logcat excerpts;
   - the APK's sha256 and size.

   Never commit APKs, AABs or videos. A claim without an evidence path is invalid.
2. **Generated numbers only.** Status, completion percentages and test counts in any report come from the output of `scripts/verify/verify-all.mjs` (Section 9), pasted or linked. Never type them by hand.
3. **Banned words.** Do not use these in any report or commit unless the gate output literally shows it: "production ready", "certified", "100%", "zero-defect", "fully operational", "all issues fixed", or "verified" as a status without gate evidence.
4. **Allowed statuses:**
   - NOT STARTED.
   - IN PROGRESS.
   - CODE COMPLETE: written and unit-tested.
   - VERIFIED: every acceptance test tagged with the feature's ID passes on each required platform, and evidence exists.
   - BLOCKED: with the reason and what would unblock it.
   - NEEDS OWNER.
5. **Don't rewrite history.** Leave previous findings as they are, and put a banner at the top of any superseded document. Your first action in M0 is to add this line to the top of `docs/audit/FINAL_REPORT.md`: "SUPERSEDED on <date>: this report contained unverified claims; see docs/launch/STATUS.md".
6. **Not run means not passed.** Never describe failing or skipped output as passing.

### 2C. Engineering quality

- **Fix root causes.** Then search the whole repo for the same bug class and fix every instance.
- **No security-weakening "compatibility bridges."** For example, never copy tokens into plain storage. Migrate the callers instead.
- **No fake data or hardcoded configuration.**
  - Enabled features must not contain mock data, `Math.random` business values, or "coming soon".
  - Business configuration (coupons, fees, commissions, slots, prices) lives in the database and is editable in the admin console, never hardcoded.
- **The server is the source of truth** for price, stock, discounts, fees, taxes and totals. Never trust amounts sent by the client.
- **Money and concurrency.**
  - Money is integer paise end to end, with explicit rounding rules.
  - Order creation, payment capture, refunds, payouts and coupon redemption are idempotent and safe under concurrency, and this is tested on PostgreSQL.
- **Every route has explicit authentication and authorization,** or is on a reviewed public allowlist with rate limiting and input validation.
- **Swallowed errors are bugs.** Handle the error, show the user something actionable, and log it: winston on the backend, Sentry on the clients.
- **Reuse what exists:**
  - the shared clients `apps/web/src/lib/api.js`, `apps/admin/src/lib/api.js` and `apps/mobile/src/lib/api.js`;
  - `packages/shared`;
  - the existing flag tables `feature_flags`, `platform_settings` and `admin_config`, and the region features;
  - existing tests.

  New dependencies need a reason in the ledger and must be free/open-source.
- **Tests.** Never delete, skip or loosen tests, or re-snapshot visual baselines, to get green. Fix the code. If a test is wrong, fix the test and explain why.
- **Files.** Normalize every file you touch to UTF-8 without BOM. Keep diffs minimal and reviewable.

### 2D. Decision points

Stop and ask only for these. Each has a default, so you can keep working elsewhere while you wait.

| Decision | Default if the owner hasn't answered |
|---|---|
| D1 Launch scope (Section 4) | Section 4 as written |
| D2 Free hosting architecture (Section 6) | Prepare all options and write host-agnostic code; don't change deploy manifests until the owner chooses |
| D3 Login methods at launch | Google Sign-In + email OTP; phone OTP code-complete behind a flag that is off |
| D4 Payment model at launch | COD on. Online prepaid (Razorpay) code-complete behind a flag, off until the owner finishes Razorpay KYC. Optional per-shop "pay seller by UPI" behind a flag |
| D5 Canonical order/payment model (a consolidation plan touching more than 25 files) | Present the plan and wait for approval; continue other milestones meanwhile |
| D6 Multi-shop cart | One checkout, split into per-shop orders, paid with one payment |
| D7 SOS unification (`/sos` vs `/emergency`) | SOS hidden at launch (Section 4); unify on `/sos` later |
| D8 Anything that deletes data, changes the role model, or needs money or credentials | Ask |

## 3. VERIFIED CURRENT STATUS (owner's re-check of commit 23c61fe, 2026-10-25)

### 3.1 Previous fixes, and their real status

| ID | Claimed | Actual | Action |
|---|---|---|---|
| L1 admin quick-login | Closed | The UI button is gated to `NODE_ENV==='development'`. The backend dev bypass is allowed only when `NODE_ENV` is development or test (`backend/src/modules/crm/routes/admin-auth.routes.js` ~L95-100). Looks right. | Add a production-mode integration test proving the bypass credentials are rejected. |
| L2 mobile token key | Closed | The screens were migrated. But `setToken` in `apps/mobile/src/lib/secureStorage.js` now writes every token, access and 30-day refresh alike, to plain AsyncStorage (`sec_<key>` and `token`) even on Android. The pre-audit code returned right after SecureStore. Also, `AndroidManifest.xml` has `allowBackup="true"`, and its backup rules exclude only SecureStore. | Regression: see N2. |
| L3 web token key | Closed | The readers were normalized, but a "bridge" also writes the legacy `localStorage 'token'` (`apps/web/src/context/AuthContext.js` ~L114). | Migrate the remaining readers, remove the bridge, and add a policy test. |
| L4 role spelling | Closed | `'superadmin'` was added to lists at each call site. There is still no canonical role constant. | Create one source of truth in `packages/shared`, check it against the database, and normalize roles when tokens are issued. |
| L6 test DB guard | Closed | The host guard is present in `backend/jest.globalSetup.js`, with `maxWorkers: 1`. | Keep it. Extend the guard to every script in `backend/scripts` and `backend/src/scripts` that connects to a database. |
| L7 concurrency | Closed | Only SQLite `BEGIN IMMEDIATE` was added. Nothing was tested on Postgres. | Reopen. Add concurrency tests on PostgreSQL (M1/M3). |
| L8 weak secret | Closed | `docker-compose.yml` is fixed, but the ledger still shows the commit as "Pending". | Correct the ledger (the commit is 3d4dc00). |
| L16 AuthContext syntax | Closed | Mobile ESLint reports 0 errors with `--quiet`. The baseline reported about 644 warnings. | Keep it. Triage the warnings in M2. |

### 3.2 Still open from the previous ledger

| ID | Issue |
|---|---|
| L5 | Postgres auto-heal shim (`backend/src/config/database.js` ~L210-216) |
| L9 | About 146 empty catch blocks and about 317 `console.log` calls in the backend |
| L10 | Fake or placeholder UI: 28 `Math.random` hits, "coming soon" text |
| L11 | Pending items from the 2026-10-14 PDF report |
| L12 | Two separate SOS systems |
| L13 | App Links fingerprint |
| L14 | LAN IP in the mobile config |
| L15 | Repo hygiene |

### 3.3 New findings

These were verified by reading the code. Confirm each one at runtime, then fix it.

- **N1 (P0, security) — free OTP mode hands out login codes.**
  - With `ALLOW_FREE_OTP_MODE=true`, `POST /auth/send-otp` puts the OTP in the JSON response, for any phone number (`backend/src/modules/core/routes/auth.routes.js` ~L206-236, `response.otp = otp`).
  - `POST /auth/send-whatsapp-otp` does the same (~L640-668).
  - The flag is set in `backend/.env`, and `backend/.env.example` advertises it for "100% free sandbox delivery".
  - In production, this means anyone can take over any account.
  - Free mode also gives the fixed code `123456` to `+919000*` and `+919999999991`. If seeded demo accounts exist in a production database, those accounts are open too.
  - Fix:
    - never return an OTP in a response outside development/test;
    - make `envValidator` refuse to boot when `NODE_ENV=production` and `ALLOW_FREE_OTP_MODE=true`;
    - add regression tests;
    - provide a zero-cost login path (D3).
- **N2 (P0, security regression) — revert the token "bridge" in `secureStorage.js`.**
  - On native platforms, store tokens only in SecureStore. Use AsyncStorage `sec_` only on web, or when SecureStore genuinely fails.
  - On app start, delete the legacy `token` and `sec_*` keys once.
  - Exclude AsyncStorage's database from backup rules, or set `allowBackup` to false, using a config plugin.
  - Add a test proving that native `setToken` never writes to AsyncStorage.
- **N3 (P0, launch blocker on free hosting) — uploads are written to local disk.**
  - `backend/src/modules/core/services/upload.service.js` writes to `public/uploads` and `private_uploads`.
  - Free hosts have ephemeral disks, so product images and KYC files vanish on every restart or deploy.
  - Fix:
    - put S3-compatible object storage behind a single storage interface;
    - public bucket plus CDN for catalogue images;
    - private bucket plus short-lived signed URLs for KYC files;
    - local disk for development only;
    - a migration script for existing files.
- **N4 (P0) — dependency vulnerabilities.**
  - 52 at the root (3 critical, including advisories for `next` 15.5.25) and 24 in `apps/mobile` (1 critical).
  - Upgrade within compatible ranges until `npm audit --omit=dev` reports 0 critical and 0 high.
  - Anything you can't fix goes in NEEDS_OWNER with the advisory, an exposure analysis and a mitigation.
- **N5 (P1) — coupons are fake.**
  - `backend/src/modules/ecommerce/routes/order.routes.js` ~L12-56 ("Mock validation logic") hardcodes WELCOME50, FREEDELIVERY and SAVE10.
  - It trusts the client's `cartTotal` and never enforces "first order only".
  - The checkout controller (`unified-superapp.controller.js`) never applies coupons. No other backend file references coupons.
  - There is no coupon table and no admin management.
  - Build a real coupon engine (C7/A7).
- **N6 (P1) — the commerce pipeline is fragmented.**
  - Six routes create orders: `POST /checkout`, `/checkout/create-order`, `/payments/create-order`, `/payments/razorpay/order`, `/shops/:id/orders`, `/shops/cart/batch-checkout`.
  - Four routes change order status: `PUT /orders/:orderId/status`, `PATCH /orders/:id/status`, `PUT /shops/orders/:id/status`, `PUT /shops/my-shop/orders/:orderId/status`.
  - Duplicate tables:
    - orders: `orders`, `shop_orders`, `universal_orders`, `universal_orders_new`, `batch_orders` and others;
    - reviews: `reviews`, `shop_reviews`, `trust_reviews`;
    - wishlists: `shop_wishlists`, `shop_favorites`, `marketplace_saved`;
    - payouts: `shop_payouts`, `shop_owner_payouts`, `payout_requests` and others.
  - Web and mobile already both call `POST /checkout` and `/checkout/quote`. Converge on one canonical pipeline (D5, Section 5 P1).
- **N7 (P1) — missing variant and invoice features.**
  - The `product_variants` and `shop_invoices` tables exist but have no API and no UI.
  - There is no tax-invoice PDF for orders. pdfkit is used only by society billing and documents.
- **N8 (P1) — unsafe migrations at boot.**
  - In production, `backend/src/server.js` (~L305-340) auto-runs migrations and seeds at boot.
  - If a migration fails, it only logs `logger.warn(...)` and keeps serving a possibly half-migrated schema. Concurrent instances can race each other.
  - Fix:
    - take a Postgres advisory lock;
    - exit non-zero if a migration fails;
    - keep a separate `npm run migrate` release step for hosts that support one.
- **N9 (P1) — PostgreSQL + PostGIS is unverified.**
  - A local `postgresql-x64-18` Windows service exists. Whether PostGIS is installed is unknown.
  - Production (Supabase) may run a different major version. Match it, and ask the owner if you don't know it.
- **N10 (P1) — Android is unverified.** There is no release build and no device run. `expo-doctor` fails 6 checks:
  - duplicate React: 19.1.0 in apps/mobile vs 18.3.1 at the root, which risks "Invalid hook call" errors through Metro resolution;
  - `@expo/config-plugins` 57.x where ~54 is expected;
  - `expo-asset`, a peer dependency of `expo-audio`, is missing;
  - a non-CNG warning;
  - libraries untested on the New Architecture: WatermelonDB, react-native-callkeep, react-native-webrtc.
- **N11 (P1) — the unauthenticated-endpoint list is unreliable.**
  - The "114 unauthenticated write endpoints" list (`docs/audit/contracts-diff.md` §4) can't be trusted.
  - Replace it with a runtime route-auth matrix test (M1). The test enumerates the live router and calls every write route without a token. Each call must get 401 or 403 unless the route is on a reviewed public allowlist.
  - The allowlist covers login, OTP send/verify, payment webhooks (with signature checks), delivery quote, interest leads and ML events.
  - Every public route needs rate limits and validation.
- **N12 (P1, Play policy) — trim Android permissions.**
  - The manifest requests `READ_MEDIA_IMAGES`, `SYSTEM_ALERT_WINDOW`, `RECORD_AUDIO`, `BIND_TELECOM_CONNECTION_SERVICE`, `FOREGROUND_SERVICE_MICROPHONE` and `MODIFY_AUDIO_SETTINGS`.
  - For a commerce launch, use the system Photo Picker instead of `READ_MEDIA_IMAGES`.
  - Remove the intercom, telephony and microphone permissions while those features are off. Do it with a config plugin so it survives prebuild.
- **N13 (P2) — paid plans and always-on jobs.**
  - `render.yaml` uses paid `starter` plans for the API, web, Redis and the database. That conflicts with a zero-cost launch.
  - ML cron jobs and workers always start in `server.js`, with no environment toggles, which adds memory and CPU pressure on free tiers.
  - Add flags such as `ENABLE_ML_JOBS` and `ENABLE_WORKERS`, off by default for launch.
- **N14 (P2) — broken text encoding.**
  - User-facing strings are garbled (₹ shows as "â‚¹") in `backend/src/modules/core/routes/auth.routes.js`, `backend/src/modules/crm/routes/earnings.routes.js` and `backend/src/modules/ecommerce/routes/order.routes.js`.
  - 177 source files start with a UTF-8 BOM (55 backend, 122 web).
  - Fix both, and add `.editorconfig` and `.gitattributes`.
- **N15 (P2) — web tokens in localStorage.** They are exposed to XSS. Add a strict CSP now. Write a plan for httpOnly cookie sessions on web, then raise it as a decision.
- **N16 (P2) — keystore passwords in git history.**
  - Commit 8730a11 (2026-08-23) contains the Android upload keystore passwords in `apps/mobile/android/gradle.properties`.
  - Record it in NEEDS_OWNER: create a fresh upload keystore before the first Play upload, and enrol in Play App Signing.
  - Do not rewrite history.
- **N17 (P2) — push token type must match the sender.**
  - The app uses expo-notifications and the backend uses firebase-admin.
  - Verify end to end whether the app registers Expo push tokens or native FCM tokens, and that the backend sends through the matching service. Fix any mismatch.

## 4. LAUNCH SCOPE (D1 — the owner may edit this section before pasting; if unchanged, it is approved)

**Product.** LocalSampark is a hyperlocal multi-vendor marketplace. Customers order from verified neighbourhood shops, for delivery or pickup, on the web and on the Android app.

**Pilot region.** The existing pilot zone: Dhanori, Pune according to earlier reports. The owner confirms.

**Business model at launch: free for everyone.**
- 0% commission.
- No seller subscription.
- No ads.
- No platform fee for customers.
- Delivery fee set per shop, and it may be 0.

Monetization code stays in place, switched off by configuration, so admin can enable it later.

**Languages.** English and Hindi, plus Marathi if the owner confirms. Every new string must be translatable.

**In scope at launch:**
- **Customer (web and Android):**
  - account, addresses and serviceability;
  - discovery, search, shop and product pages;
  - cart, coupons, checkout (COD plus flagged online payment);
  - orders and tracking, returns and refunds;
  - reviews, wishlist, notifications;
  - support and grievance, account deletion.
- **Seller (web dashboard and Android seller mode):**
  - onboarding and KYC;
  - catalogue with variants, inventory;
  - order handling, self-delivery or pickup;
  - statements and payouts (0% commission);
  - shop coupons, reviews, analytics.
- **Rider (Android):** assignment, pickup and delivery with proof, live location, COD cash ledger.
- **Admin:** commerce operations and configuration (Section 5, A1-A14), feature flags, RBAC, audit log.

**Off at launch.** These stay in the code but are hidden from navigation. Deep links show "not available", and the API returns 403/404 while the flag is off. Their tests run with the flag enabled, so the code stays healthy. P0/P1 security fixes still apply to them.
- Society management: gate, visitors, intercom, bills.
- Carpool, jobs, real estate/properties.
- Medical, pharmacy, blood bank, care.
- SOS/emergency.
- Krishi, scrap, chef/home-chef, equipment rentals, events.
- Townsquare, community feed, stories, chat (except order chat, if built).
- Donations, volunteer, pets, civic bills.
- Franchise and field-agent tools. Keep the territory data, but only for serviceability.
- Premium, subscriptions, ads, SaaS tiers; wallet, coins, spin.
- Experimental ML admin features. Simple ranking may stay if it is fast and tested.

**Restricted catalogue categories.** At launch, block listings for medicines/pharmacy, alcohol, tobacco, weapons and other regulated goods.

## 5. TARGET E-COMMERCE CAPABILITIES

Add every ID below to `docs/launch/features.json`. A feature is done when the acceptance tests tagged with its ID pass on every listed platform.

### Customer (web and Android)

- **C1 Account.**
  - Sign-in methods: Google Sign-In, email OTP (tested through a local mail catcher or file transport in dev/test), and phone OTP behind a flag.
  - Session refresh, logout and logout from all devices, profile, consent capture.
  - In-app account deletion, plus a public web deletion-request page (a Play requirement).
  - Data export request.
  - Done when:
    - no OTP ever appears in a production response;
    - tokens live only in SecureStore on Android, or in the chosen web mechanism;
    - E2E login passes on web and Android.
- **C2 Location and serviceability.**
  - Detect or choose a location.
  - Saved addresses with a map pin and pincode.
  - Serviceability check by zone or radius.
  - A clear "not serviceable yet" screen that captures a waitlist sign-up.
- **C3 Discovery.**
  - Home page with admin-managed banners and sections, categories, and nearby shops.
  - Shop list with filters (open now, distance, rating, delivery time) and sorting.
  - Shop page showing hours, holidays, minimum order, fees, ratings and the catalogue by section.
- **C4 Product detail.**
  - Image gallery and variants (size, weight, colour).
  - Price, MRP and discount; stock and quantity limits.
  - Seller info and return policy.
  - Legal metrology fields: net quantity, manufacturer/packer, country of origin, best-before date for food, FSSAI number for food sellers.
  - Verified-purchase reviews.
- **C5 Search.**
  - Autocomplete, typo tolerance, filters and sorting.
  - Zero-cost default: PostgreSQL full-text search plus `pg_trgm`.
  - Typesense stays optional behind config, with automatic fallback.
- **C6 Cart.**
  - Server-side cart, synced across devices.
  - Guest cart merges on login.
  - Stock and price are revalidated.
  - Items are grouped per shop, per D6.
  - Minimum order and delivery-fee rules apply.
- **C7 Coupons.**
  - A database-backed engine for platform and shop coupons.
  - Types: fixed amount, percentage, free delivery.
  - Rules: minimum order, maximum discount, validity window, total and per-user usage limits, first-order only, eligible shops and categories.
  - Applied server-side at both quote and order time.
  - Redemption is race-safe.
- **C8 Checkout.**
  - Address and delivery slot, or ASAP.
  - The server computes the quote: items, discounts, fees, taxes and total.
  - Payment methods per D4.
  - Order creation takes an `Idempotency-Key`.
  - Failures are handled clearly.
  - A confirmation screen and notifications.
- **C9 Orders.**
  - List, detail and timeline.
  - Live status through socket and push, with a polling fallback.
  - Cancellation window rules and reorder.
  - A GST-ready invoice PDF.
  - Help from inside an order.
- **C10 Returns and refunds.**
  - The customer requests a return with reasons and photos, within the rules.
  - The seller or admin decides.
  - Refunds go to the original payment method. COD refunds are recorded as manual payouts.
  - Status tracking.
- **C11 Reviews.**
  - Rating and review after delivery, for verified purchases only.
  - Seller reply, abuse reporting and moderation.
- **C12 Wishlist and recently viewed items.**
- **C13 Notifications.**
  - Push through the matched service (N17), an in-app inbox, and email.
  - Preferences.
  - Deep links into the right screen.
- **C14 Support and grievance.**
  - FAQ, and tickets with a ticket number.
  - A grievance officer page.
  - Acknowledgement within 48 hours, with resolution tracking (Consumer Protection (E-Commerce) Rules).

### Seller (web dashboard and Android seller mode)

- **S1 Onboarding and KYC.**
  - Shop profile: geo pin, hours and holidays, delivery radius, minimum order, fees.
  - Documents: PAN, optional GSTIN, FSSAI for food, bank or UPI details for payouts.
  - Private document storage.
  - Admin review states, and resubmission.
- **S2 Catalogue.**
  - Products with variants and images (object storage, resized and optimised).
  - Price and MRP, HSN code and GST rate.
  - Stock with low-stock alerts, and an availability toggle.
  - Mapping to the global categories.
  - Bulk CSV import/export, using the existing catalogCsv logic.
  - Moderation status.
- **S3 Order handling.**
  - New-order alert, using the existing OrderRingerContext.
  - Accept, or reject with a reason, plus an auto-cancel timer.
  - Status flow: preparing → ready → handed over.
  - Self-delivery, platform rider, or pickup.
  - Packing slip and invoice.
- **S4 Money.**
  - Settlement statements and COD reconciliation.
  - Commission: 0% at launch, configurable.
  - Payout requests and history.
  - CSV export.
- **S5 Shop coupons and offers,** within platform rules.
- **S6 Reviews:** view, reply, report.
- **S7 Analytics:** sales, orders, top products and ratings, from real data only.

### Rider (Android)

- **R1** Onboarding/KYC and an availability toggle.
- **R2** Assignments, with accept or decline.
- **R3** Pickup → delivery, with proof (customer OTP or photo) and a hand-off to navigation.
- **R4** Real live location shared with the customer: battery-aware, never simulated.
- **R5** COD cash collection and deposit ledger (the existing `rider_cash_ledger`), plus earnings.

### Admin console

- **A1** KPI dashboard from real data: GMV, orders, average order value, cancellation and refund rates, active shops and customers.
- **A2** Seller approvals and KYC review; suspend or ban.
- **A3** Catalogue moderation and the global category taxonomy, including restricted categories.
- **A4** Order operations: search, timeline, interventions (cancel, refund, reassign), SLA alerts.
- **A5** Queue for returns, refunds and disputes.
- **A6** Payouts, settlements, and commission and fee configuration.
- **A7** Coupons, campaigns, banners, and a CMS for the home layout.
- **A8** Users, least-privilege RBAC, admin PIN plus OTP, and an immutable audit log.
- **A9** Serviceability zones.
- **A10** Delivery fleet and COD reconciliation.
- **A11** Support tickets and the grievance SLA.
- **A12** Feature flags, module registry and kill switches. These drive web navigation, mobile tabs and API access.
- **A13** CSV report exports, including GST/TCS-ready data for a CA.
- **A14** Broadcast notifications that respect consent.

### Platform

- **P1 Canonical commerce pipeline.**
  - One quote API, one order-creation API, and one status-transition API, all enforced by a single state machine.
  - Draft state machine, to confirm against the code:
    - main path: PENDING_PAYMENT → PLACED → ACCEPTED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED;
    - returns: RETURN_REQUESTED → RETURN_APPROVED → RETURNED → REFUNDED;
    - terminal states: CANCELLED_BY_CUSTOMER, REJECTED_BY_SELLER, CANCELLED_BY_ADMIN, PAYMENT_FAILED, EXPIRED.
  - Append-only status history, and allowed transitions per role.
  - Once the clients have migrated, deprecated routes proxy to the canonical one or return 410.
- **P2 Payments.**
  - Razorpay order → verify → webhook, with signature verification, idempotency and a reconciliation job.
  - If the platform ever holds money on behalf of sellers, use a licensed payment aggregator's split-settlement product (for example Razorpay Route).
  - Never store card data.
- **P3 Ledger.**
  - Double-entry records for every money movement the platform records.
  - Balances must be reproducible from the entries.
- **P4 Media.**
  - Object storage plus a CDN, and image resizing.
  - Uploads checked by sniffing the file type and enforcing size limits (N3).
- **P5 Notifications service** with provider adapters: push, email, and SMS behind a flag.
- **P6 Module registry and feature flags.** One source of truth, used by API middleware, web navigation, and mobile tabs and routes.
- **P7 SEO (web).**
  - Server-rendered shop, product and category pages using `generateMetadata`.
  - JSON-LD for Product/Offer, LocalBusiness and BreadcrumbList.
  - A sitemap with shops and products.
  - Canonical URLs and Open Graph tags.
- **P8 Observability.**
  - Sentry free tier on web, admin, Android (with releases and source maps) and the API.
  - Structured logs.
  - Endpoints: `/health` for liveness, `/ready` for database and migration status.
  - Uptime monitoring.
- **P9 Security.**
  - Rate limits on auth, OTP, checkout and coupons.
  - Input validation, CSP and security headers, and upload checks.
  - Secrets only from the environment.
  - Dependency hygiene.
- **P10 Backups.**
  - Nightly encrypted `pg_dump` to object storage, with retention.
  - A documented restore, rehearsed locally only.
- **P11 Analytics.** Privacy-friendly product analytics on a free tier, collected only after consent.
- **P12 i18n and accessibility.**
  - Every string is translatable.
  - axe reports 0 serious or critical issues on key pages.
  - Touch targets are at least 44 px.
- **P13 Performance budgets.**
  - Web key pages (home, shop, product, cart): LCP ≤ 2.5 s and CLS ≤ 0.1 (Lighthouse, mobile).
  - Keep three.js and other heavy code off the critical path.
  - API p95 ≤ 300 ms on seeded data for catalogue, cart and quote.
  - Android release cold start ≤ 3 s on a mid-range emulator profile.

## 6. ZERO-COST LAUNCH ARCHITECTURE AND UPGRADE PATH (D2)

### 6.1 Research current free-tier terms

Read each provider's current official terms, and record the link and access date. Pricing changes often, so never rely on memory.

For each component, evaluate:
- limits;
- sleep and cold-start behaviour;
- RAM and CPU;
- WebSocket support;
- storage and egress caps;
- pausing on inactivity;
- whether commercial use is allowed;
- what forces an upgrade.

Candidates to evaluate. These are not endorsements.

| Component | Candidates |
|---|---|
| API | Render free web service; Google Cloud Run free tier; Koyeb free; an Oracle Cloud Always Free VM running the existing `docker-compose.production.yml` |
| Web (Next.js SSR) | Netlify free; Cloudflare via OpenNext (check worker size limits); Render free; self-hosting on the VM. Vercel Hobby only if its terms allow commercial use — they currently say non-commercial, so verify |
| Admin | A static export, if feasible, on any free static host |
| Database | Supabase free (check PostGIS, size cap, pause-on-inactivity, pooler modes, IPv4/IPv6); Neon free; Render free Postgres only if its expiry policy allows production use (verify); self-hosted on the VM |
| Cache and queue | In-memory for a single instance; Upstash free if needed |
| Object storage | Cloudflare R2 free tier; Supabase Storage; Cloudinary free |
| Email | Free tiers such as Brevo or Resend |
| Push | FCM |
| Monitoring | Sentry free; UptimeRobot or Better Stack free |
| DNS, CDN and WAF | Cloudflare free |
| Maps | Google Maps SDK for Android (check current pricing for mobile dynamic maps); Leaflet with a tile provider whose free terms allow commercial use (the `tile.openstreetmap.org` policy forbids heavy use) |
| Auth | Google Sign-In; free email OTP |
| Phone verification | SMS (paid, needs DLT); Firebase Phone Auth (check current pricing); Truecaller SDK; user-initiated WhatsApp verification (receiving is free; check current Meta pricing) |

### 6.2 Write `docs/launch/ZERO_COST_ARCHITECTURE.md`

Include:
- two or three complete options, each with a component table: service, free limits, risks, monthly cost in ₹;
- a recommended option, with reasons;
- known costs that aren't infrastructure: the one-time Google Play developer fee, domain renewal, payment-gateway fees per transaction;
- an upgrade path for each component: the trigger metric (e.g. database over 70% of quota, more than N cold starts a day, more than N orders a month), the paid step, and a cost estimate.

### 6.3 Make the app fit any free host now (no decision needed)

- **Stateless API.** Object storage per N3, and no state on local disk. OTP and rate-limit stores are pluggable, with an in-memory fallback for a single instance.
- **Lean memory at boot.** Lazy-load heavy modules, and put ML jobs and workers behind `ENABLE_*` flags that are off by default. Measure memory under load against a 512 MB budget.
- **Database connections.** A small pool sized for free-tier connection caps, and correct use of the pooler.
- **Safe migrations,** per N8.
- **Builds.** Next.js builds that fit the chosen host, or builds that run in CI.
- **Cold starts.** Handle them gracefully: skeletons and a retry banner on web, retry with backoff on mobile.
- **Health checks.** `/health` and `/ready` endpoints.
- **Environment variables.** Document every one in `.env.example` and validate it in `envValidator`, which refuses unsafe flags in production.

### 6.4 After the owner chooses

1. Update the deployment manifests (for example `plan: free` in `render.yaml`, or the chosen platform's files), env templates, the backup workflow and the monitoring config.
2. Write `docs/launch/LAUNCH_RUNBOOK.md`, step by step:
   - account setup;
   - environment variables (names only);
   - first deploy;
   - admin provisioning (`backend/scripts/provision-admin.js`);
   - a production smoke test;
   - rollback;
   - a go-live checklist.

You do not deploy.

## 7. COMPLIANCE AND STORE READINESS

Verify the current rules from official sources. Mark every drafted document "DRAFT — requires legal review" and list it in NEEDS_OWNER.

### 7.1 India e-commerce rules

- **Consumer Protection (E-Commerce) Rules 2020:**
  - entity details and a grievance officer;
  - seller details on listings;
  - return, refund, cancellation and delivery policies;
  - a full price breakup and the country of origin;
  - no fake reviews;
  - complaint tracking, with acknowledgement within 48 hours.
- **Legal Metrology (Packaged Commodities):** required listing fields.
- **FSSAI:** food sellers display their FSSAI number.
- **GST:** marketplace TCS under section 52, and seller GSTIN handling. Provide the data model and reports. Advice on registration and filing goes to a CA through NEEDS_OWNER.
- **DPDP Act 2023 and its Rules:**
  - notice and consent, and purpose limitation;
  - a retention schedule;
  - data-principal rights: access, correction, erasure, grievance;
  - a breach procedure;
  - rules for children's data.
- **IT Rules 2021:** a privacy policy, terms, and a grievance officer.
- **RBI payment rules:** never store cards; use a licensed payment aggregator for any money the platform holds.
- **Restricted goods** are blocked.

### 7.2 Web legal pages

Terms, privacy, refund/return, cancellation, shipping/delivery, seller terms, grievance, account deletion, and cookie/consent.

### 7.3 Google Play

- The target API level Play currently requires.
- AAB format, and Play App Signing with a fresh upload key (N16).
- Data safety answers that match every SDK actually shipped.
- A privacy policy URL, and account deletion both in the app and on the web.
- A content rating.
- Permission declarations (N12). No restricted permissions without a declared core use.
- Store listing assets: icon, feature graphic, and screenshots captured from the emulator.
- App Links: `assetlinks.json` must include the Play signing key fingerprint, which the owner supplies.
- The testing requirement for the owner's developer account type. Newer personal accounts must complete a closed test, with a minimum number of testers over a minimum period, before they get production access. Put the timeline impact in NEEDS_OWNER on day one, because it can delay launch by weeks.

## 8. MILESTONES

Do these in order. Each milestone ends with a verify-all run, saved evidence, commits, and a PROGRESS update.

- **M0 — Honesty reset and verification harness.**
  1. Create the branch.
  2. Mark `docs/audit/FINAL_REPORT.md` superseded. Correct the statuses in `docs/audit/PROGRESS.md` and `INVENTORY.md` to match the evidence: no module is VERIFIED yet.
  3. Create `docs/launch/` containing:
     - `STATUS.md` (generated);
     - `features.json`;
     - `NEEDS_OWNER.md` (merge in the old one);
     - `DECISIONS.md`;
     - `PROGRESS.md`, with "Next action:" at the top.
  4. Write `scripts/verify/verify-all.mjs` (Section 9) and the policy tests.
  5. Run verify-all once and record the honest starting numbers.
  6. Put the owner questions D1-D4, and the Play account-type question, in NEEDS_OWNER/DECISIONS. Then continue with the defaults.
- **M1 — P0 security and launch blockers.**
  - N1, N2 and N4.
  - N3: a storage interface, with a local adapter for development and an S3-compatible adapter.
  - N11: the route-auth matrix test.
  - The L1 production-mode test.
  - L7: concurrency tests on Postgres.
  - N8.
  - Local PostgreSQL + PostGIS, with gates G3 and G4 green.
  - Demo-data safety:
    - production seeding never creates demo personas;
    - `purge_demo_credentials.js` is guarded and runs as a dry run by default;
    - a read-only check script the owner can run against production.
- **M2 — Open leads and platform hygiene.**
  - L5, L9 and L10.
  - L11: for each item, decide whether to build it, flag it off, or list it for the owner.
  - L13, L14 and L15.
  - L3/L4 cleanup.
  - N10: expo-doctor clean, and a single React copy for mobile.
  - N13 flags, N14 encoding, N17 push path.
  - Triage the mobile ESLint warnings.
- **M3 — Commerce core.**
  1. The module registry and flags (P6), with the off-scope verticals hidden everywhere.
  2. Get the D5 consolidation plan approved, then build the canonical pipeline (P1).
  3. Variants and inventory, search (C5), cart (C6), coupons (C7) and checkout (C8).
  4. Payments (P2): COD, plus Razorpay behind a flag.
  5. Orders (C9) and the ledger (P3).
  6. Concurrency and idempotency tests on Postgres.
- **M4 — Operations.**
  - Seller S1-S7 and rider R1-R5.
  - Admin A1-A14: commerce tabs, with non-commerce tabs hidden by flags.
- **M5 — After the order.**
  - Returns and refunds (C10), reviews (C11), wishlist (C12).
  - Notifications (C13), support and grievance (C14).
  - Invoices (N7).
- **M6 — Web quality.**
  - SEO (P7), performance budgets (P13), accessibility (P12), i18n.
  - Legal pages (Section 7) and consent.
- **M7 — Android release hardening.**
  - The permissions trim (N12), backup rules (N2), App Links and deep links.
  - Behaviour offline and on poor networks.
  - Hermes + R8 keep rules.
  - A release build pointed at the local backend.
  - Maestro (or the existing Detox) smoke flows on both debug and release builds.
  - Store listing assets.
- **M8 — Zero-cost deployment package (Section 6).**
  1. Research document.
  2. Owner decision.
  3. Manifests, env templates, the backup workflow, monitoring, and the runbook.

  No deploy.
- **M9 — Final regression and launch-readiness report.**
  1. Run every gate.
  2. Generate STATUS.md.
  3. Write `docs/launch/LAUNCH_READINESS_REPORT.md` around the generated output.
  4. Give the owner a prioritised list of what remains.

For each milestone:
1. Publish an Implementation Plan artifact.
2. Proceed. Pause only for the Section 2D decisions.
3. Implement, writing tests first where feasible.
4. Run the affected suites and builds, then verify-all.
5. Save the evidence.
6. Update `docs/audit/FINDINGS.md` (new IDs N1… and F-xxx) and `docs/launch/features.json`.
7. Commit.

## 9. VERIFICATION GATES (`node scripts/verify/verify-all.mjs`)

Write this script in M0. It must:
- run on Windows and in CI;
- exit non-zero if any required gate fails or was not run;
- write `docs/audit/evidence/verify-<timestamp>/summary.json`, plus a log for each gate;
- regenerate `docs/launch/STATUS.md` with the gate table, the gate pass percentage, and the feature completion percentage;
- accept `--only G3,G7` and `--skip-android`. Skipped gates count as NOT RUN, which means not passed.

The owner will run this script to check your work. Early in the program many gates will fail. That is expected, and you report it as-is.

| Gate | Passes when |
|---|---|
| G1 | Backend ESLint reports 0 errors |
| G2 | Backend Jest on SQLite has 0 failures, and the JSON report is saved |
| G3 | Backend Jest on local PostgreSQL + PostGIS (`TEST_USE_POSTGRES=1`, with the guard confirming a local host) has 0 failures |
| G4 | Migrations from an empty database succeed on both SQLite and Postgres; the schema diff stays within a reviewed allowlist; the seed is idempotent; `seed:demo:verify` passes on both |
| G5 | Route-auth matrix test: every write route called without a token gets 401/403, except the reviewed public allowlist; a low-privilege token on admin routes gets 403 |
| G6 | Concurrency and idempotency suite on Postgres: in a race for the last stock unit exactly one buyer succeeds; coupon usage limits hold under a race; a duplicate webhook produces one capture and one ledger entry; a duplicate `Idempotency-Key` produces one order; payouts are idempotent |
| G7 | Web unit tests pass, and the production build succeeds |
| G8 | Admin tests pass, and the production build succeeds |
| G9 | Mobile: Jest passes; ESLint reports 0 errors; `expo-doctor` has 0 failed checks (or only an owner-accepted allowlist); `expo export --platform android` succeeds |
| G10 | Android `assembleRelease` produces an APK/AAB, and the evidence records its size, sha256 and date |
| G11 | Playwright E2E commerce suite (web and admin projects), per persona: customer browses → cart → coupon → checkout (COD) → tracks the order; seller accepts → marks ready; rider delivers; admin refunds; logged-out and wrong-role access is denied |
| G12 | Android release smoke test on an emulator via Maestro or Detox (whichever runs on this machine; ask before installing): the same journeys as G11, plus a deep link, a denied permission and offline mode, with no FATAL or ANR in logcat |
| G13 | `npm audit --omit=dev` (root and apps/mobile) reports 0 critical and 0 high, or every remaining one is listed in an owner-accepted exception file |
| G14 | Secret scan of tracked files finds nothing. Findings in history are listed in NEEDS_OWNER |
| G15 | Launch policy tests pass (see the list after this table) |
| G16 | Accessibility: axe on key web pages reports 0 serious or critical issues |
| G17 | Performance: Lighthouse budgets on key pages (P13), plus the API latency smoke test |
| G18 | Feature verification: every `scope: "launch"` feature in `features.json` with `status: "VERIFIED"` has at least one passing test whose title contains its ID (e.g. `[C7.3]`) on each listed platform, in the Jest, Playwright or Maestro JSON/JUnit reports, and its evidence paths exist |

The G15 launch policy tests check for none of the following:
- OTPs in production responses;
- plain AsyncStorage token writes on native;
- hardcoded coupons or fees;
- `Math.random` used for business data;
- "coming soon" in enabled modules;
- LAN IPs or localhost in the release config;
- `console.log` in backend `src`, outside tests;
- mojibake or a BOM in source files.

**Definition of done ("100% complete"):**
- G1-G18 all pass in a single verify-all run on the final commit;
- feature completion is 100%: every launch-scope feature is VERIFIED;
- every P0/P1 finding is FIXED-VERIFIED, or NEEDS OWNER with a concrete reason.

Anything less is reported as the generated percentage.

## 10. FILES AND LEDGERS

**`docs/launch/`**
- `STATUS.md` (generated).
- `features.json`.
- `PROGRESS.md`, with "Next action:" at the top and a session log.
- `DECISIONS.md`: D1-D8, with answers and dates.
- `NEEDS_OWNER.md`: consolidated, each item with exact steps.
- `ZERO_COST_ARCHITECTURE.md`, `LAUNCH_RUNBOOK.md`, `COMPLIANCE_CHECKLIST.md`, `PLAY_STORE_CHECKLIST.md`.
- `LAUNCH_READINESS_REPORT.md` (written in M9).

**`docs/audit/`**
- `FINDINGS.md`: append only, with new IDs.
- `evidence/`.

**`scripts/verify/`**
- `verify-all.mjs` and the gate helpers.

Each `features.json` entry has this shape:

```json
{
  "id": "C7",
  "title": "...",
  "scope": "launch|later|off",
  "platforms": ["api", "web", "android", "admin"],
  "acceptance": ["..."],
  "tests": ["[C7.1] ...", "..."],
  "status": "...",
  "evidence": ["docs/audit/evidence/..."],
  "notes": "..."
}
```

## 11. HOW TO WORK IN ANTIGRAVITY

- **Planning.** Use Planning mode. Keep the Task List artifact in sync with `docs/launch/PROGRESS.md`. Publish an Implementation Plan artifact for each milestone.
- **UI checks.** Use the browser, and save screenshots into the evidence folder.
- **Long tasks.** Run builds, emulators and E2E in background terminals, and read their real output.
- **Conversation size.** Cover at most one milestone per conversation. Your context is finite, so write findings and progress to files as you go.
- **Starting a new conversation:**
  1. Read this brief. In M0, save it verbatim as `docs/launch/LAUNCH_BRIEF.md`.
  2. Read `docs/launch/PROGRESS.md`, `DECISIONS.md` and the latest `STATUS.md`.
  3. Run `git status` and `git log --oneline -10`.
  4. Continue from "Next action".
- **Windows and PowerShell.**
  - Quote paths: the workspace path contains spaces.
  - Use `gradlew.bat`.
  - Write files as UTF-8 without BOM. The default encodings of `Set-Content` and `Out-File` corrupt text, so write files with the editor or with Node.

## 12. START NOW

Begin M0:
1. Create the branch.
2. Mark the superseded report, and correct the old trackers.
3. Create `docs/launch/` and save this brief.
4. Write verify-all and the policy tests.
5. Run verify-all.
6. Report the honest baseline numbers (generated by the script) and the list of owner decisions you need.
7. Continue straight into M1 using the defaults.
