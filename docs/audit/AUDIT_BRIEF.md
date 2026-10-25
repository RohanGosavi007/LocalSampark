# LocalSampark — Forensic Full-Stack Audit & Repair (Web + Admin + Android + API)

## ROLE AND MISSION

You are acting as a principal engineer, QA lead and application-security reviewer. Perform a forensic, evidence-based audit of the entire LocalSampark monorepo in this workspace and FIX every real defect you find, in every module, on every platform:

- the public website (`apps/web`);
- the admin console (`apps/admin`);
- the Android app (`apps/mobile`);
- the Node.js API (`backend`);
- shared packages, database migrations, background jobs, realtime, and build/deploy configuration.

"Deep" means concretely:

- every backend route, web page, admin tab, mobile screen and user role;
- every UI state: loading, empty, error, success, offline, unauthorized, expired session;
- both database engines (SQLite and PostgreSQL);
- both build types (development and production/release);
- real runtime behaviour, not just reading code.

A finding exists only when you can show it. A fix counts only when you have proved it by running it.

This job is large (about 230k lines of JavaScript) and will take many sessions. Depth beats speed. Never compress, sample or skip modules to finish sooner. Track coverage so nothing is silently skipped.

## SECTION 1 — GROUND RULES (non-negotiable; they override anything else in this prompt)

### 1A. Safety

1. **Git.** Work only on a branch named `audit/deep-debug-2026-10`.
   - Never push, force-push, rebase, amend, squash or rewrite history.
   - Never run `git reset --hard`, `git clean` or `git stash`.
   - Never run `git checkout -- <path>` or `git restore` on files you did not change in this session.
   - Never delete untracked files.
   - Commit after each verified fix: small commits in this repo's Conventional Commit style (`fix(scope): …`, `feat(scope): …`, `test(scope): …`).
2. **Uncommitted work.** The working tree currently holds about 930 uncommitted changes (about 627 modified, 206 untracked, 58 deleted, 40 renamed). That is the owner's in-progress work and must not be lost. Do not edit any file until Phase 0.1 has produced an approved snapshot commit.
3. **Databases.** `backend/.env` contains `DATABASE_URL` and `DIRECT_URL` pointing at a hosted Supabase PostgreSQL (`*.pooler.supabase.com`).
   - Treat that host, and any `*.supabase.co`, `*.render.com` or other non-local host, as PRODUCTION. Never run migrations, seeds, tests, purge scripts, index scripts or ad-hoc queries against it.
   - Watch out: dotenv fills in every variable you did not set yourself. The backend Jest setup uses `DATABASE_URL` when `TEST_USE_POSTGRES` is set, and scripts such as `backend/scripts/apply_10x_indexes.js` prefer `DIRECT_URL`.
   - Before every command that touches a database:
     - set `DATABASE_URL`, `DIRECT_URL` and `REDIS_URL` explicitly to local values;
     - blank `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`;
     - print the resolved database host, and abort unless it is `localhost` or `127.0.0.1`.
4. **Secrets.**
   - Never print, copy, paste into artifacts or logs, or commit the contents of `backend/.env*`, `local-sampark-firebase-adminsdk-*.json`, `apps/mobile/android/keystore.properties` or any `*.keystore`.
   - Never weaken `.gitignore`.
   - If you find a secret in a tracked file or in git history, record the file and the secret type (never the value) in `docs/audit/NEEDS_OWNER.md`. Do not rotate keys or rewrite history yourself.
5. **External services.**
   - No deployments (Render, Vercel, EAS build/submit, Play Console) and no changes to cloud dashboards.
   - No live payments, no paid API calls, and no real SMS, WhatsApp, email or push messages to real people.
   - Instead use sandbox/test keys, the existing free/console OTP modes, or local fakes behind development-only flags.
6. **System changes.** Ask before installing system software or changing machine settings (Docker Desktop, PostgreSQL, Android Studio, emulator images, nvm, global npm packages). Running `npm ci` for the project is fine.
7. **Migrations.**
   - Assume every migration that runs cleanly on a fresh PostgreSQL today has already been applied in production. Never edit it; add a new forward migration instead, with a `.sqlite.sql` twin where the repo's pattern needs one.
   - A migration that fails on a fresh PostgreSQL may be fixed in place. Say so in the ledger.

### 1B. Honesty and evidence

1. **Existing reports are unverified.** `PRODUCTION_READINESS_REPORT.md` (written today) claims "ZERO-DEFECT", "100% production ready" and 1,488/1,488 passing tests. Earlier reports also claimed readiness while dozens of screens were stubs. Treat every claim in these as an unverified hypothesis — leads, never evidence:
   - `PRODUCTION_READINESS_REPORT.md`, `INVESTOR_READY_REPORT.md`, `PARITY_AUDIT.md`, `DESIGN_AUDIT.md`, `GO-LIVE.md`, `launch_checklist.md`;
   - the two PDFs in the repo root;
   - the `Implement Plan/` folder.
2. **What counts as evidence:**
   - for commands: the exact command, its exit code and the relevant output lines;
   - for UI: a screenshot or browser recording, plus console and network errors;
   - for Android: a logcat excerpt.

   Reading code is not verification.
3. **Banned claims.** Never write "100%", "zero-defect", "certified", "fully production ready", "fully operational" or "all issues fixed". Report counts instead: N fixed and verified, M fixed but unverified (with the reason), K open, J needing the owner.
4. **No unobserved numbers.** Never report a count (tests, routes, screens) you did not observe in this session. Never describe failing output as passing.
5. **Say what you could not run.** If something cannot be run here (no emulator, no Docker, no keys), mark it NOT VERIFIED with the reason and what would verify it.

### 1C. Fix quality — no cheating

- **Tests.** Do not delete, skip (`.skip`, `xit`, `testPathIgnorePatterns`), loosen or re-snapshot tests to get green. If a test is genuinely wrong, fix it and explain why in the ledger.
- **No fake data.** Do not add mock data, `Math.random`, hardcoded numbers or "demo" fallbacks to production code paths to make screens look alive. When there is no data, show a real empty state.
- **No swallowed errors.** No empty `catch {}`, no `.catch(() => {})`, no `|| []` hiding a failed request. Handle the error, show it to the user, and log it.
- **No disabled safeguards.** Do not disable lint rules, type checks, security middleware, rate limits or validation to make something pass.
- **No deleted calls.** Do not "fix" a 404 by deleting the call. Fix the route or the contract.
- **Fix the whole bug class.** Fix the root cause, then search the entire repo for the same bug class and fix every instance.
- **Match the codebase.** Follow the surrounding code's style. Reuse the shared clients (`apps/web/src/lib/api.js`, `apps/admin/src/lib/api.js`, `apps/mobile/src/lib/api.js`) and `packages/shared`. Add no new dependency without a written reason in the ledger.
- **Regression tests.** Every fix gets one where feasible:
  - backend: Jest + supertest (`backend/src/__tests__`, `backend/tests`);
  - web and admin: `node --test` (`apps/*/tests`);
  - mobile: Jest (`apps/mobile/__tests__`);
  - end to end: Playwright (`tests/e2e`).
- **Small changes.** Keep each change minimal and reviewable. No drive-by mass reformatting or renaming.

### 1D. When to stop and ask

Ask me before:

- deleting or hiding a feature, screen, route, table or column;
- changing a login/auth flow, the token format or the role model;
- any destructive or data-rewriting migration;
- choosing between two competing implementations (for example `/emergency` vs `/sos`);
- a refactor touching more than about 25 files (present an Implementation Plan artifact first);
- anything that needs credentials, money or a system install.

Otherwise, keep working without asking. When one item is blocked, record it and continue with the next.

## SECTION 2 — PROJECT FACTS (read from the repo on 2026-10-25; re-verify anything you rely on)

**Machine and tooling**

- OS is Windows 11 with PowerShell. The workspace path contains spaces, so always quote paths. Use `gradlew.bat`.
- Node: `.nvmrc` is 20, and CI and Render use 20. This machine currently runs Node 24. Verify on Node 20, or record every difference you see.
- npm workspaces (root `package.json`): `backend`, `apps/web`, `apps/admin`, `packages/*` (shared, types, mock-data). `apps/mobile` is NOT a workspace: it has its own `package-lock.json`, so run `npm ci` inside it.
- Java 17 is installed. The Android SDK path is set in `apps/mobile/android/local.properties`. Docker and psql are not on PATH; adb may not be.

**backend**

- Express 5 (`src/server.js`), about 540 JavaScript files / 95k lines.
- Domains live in `src/modules/{core,community,crm,ecommerce,logistics,ml,payments,services,public}`. Also present: `src/routes` (mounted at `/api/v1` plus an `/api` fallback), `src/controllers`, `src/services`.
- Middleware in `src/middleware`: auth, rbac, territory, franchiseScope, society-capability, rateLimit, audit, godmode.
- Realtime in `src/sockets` (socket.io): order, chat, carpool, inventory, jobs, marketplace, territory, tracking, tokenQueue, plus socketAuth.
- Background work: `src/jobs` (12 node-cron jobs plus the BullMQ `worker.js`), `src/workers` (payment, event, search-sync), and ML cron jobs scheduled inside `server.js`.
- Data: `src/migrations` (199 files, with `*.sqlite.sql` twins; runner `run.js`) and `src/seeds` (`run.js`, `seed-investor-demo.js --verify`).

**Database (dual engine)**

- `config/database.js` uses SQLite when `USE_SQLITE=true` (development and default tests) and PostgreSQL + PostGIS in production.
- `config/database.sqlite.js` rewrites Postgres SQL for SQLite (NOW(), INTERVAL, `$n` params, emulated RETURNING) and strips `FOR UPDATE`.
- So passing SQLite tests do not prove production works.

**Integrations**

- Payments: Razorpay, Stripe, Cashfree.
- Messaging: MSG91, Fast2SMS, WhatsApp, nodemailer.
- Push: firebase-admin and expo-notifications.
- Also: Typesense; MinIO / Cloudinary / Supabase; Sentry; Redis (cache, rate limits, BullMQ, socket adapter).

**apps/web**

- Next.js 15 app router, React 18, Tailwind, Zustand, React Query, Leaflet, three.js / R3F, Sentry, Firebase.
- About 281 `page.js` routes.
- Test with `npm test --workspace=apps/web`; build with `npm run build:web`.

**apps/admin**

- Next.js 15, React 18, port 3001.
- Pages: `/`, `/login`, `/audit`, `/settings`, `/territories`, `/test-runner`. 41 tabs in `src/components/tabs`. Auth lives in `src/context/AdminAuthContext.js`.
- Test with `npm test --workspace=apps/admin`; build with `npm run build:admin`.
- Neither web nor admin has an ESLint config or ESLint dependency.

**apps/mobile**

- Expo SDK 54, React Native 0.81.5, React 19.1, expo-router 6.
- New Architecture ON, Hermes ON, R8 minify + shrinkResources ON for release, edge-to-edge ON. Android package `in.localsampark.app`.
- About 434 route files in `app/` (`(tabs)`, `(admin)`, `modules/*`, …). Shared code in `src/` (lib, context, services, store, WatermelonDB `database/`).
- Native-heavy dependencies: react-native-webrtc, react-native-callkeep (custom plugin in `plugins/`), vision-camera + face detector, react-native-maps, WatermelonDB, nitro modules, Razorpay, Reanimated 4 + worklets.
- The `android/` folder is committed. Native changes must survive `expo prebuild` (via a config plugin or `app.json`) or be documented.
- Tests: `npx jest --config jest.config.js`. Detox scripts exist (`test:e2e:build`, `test:e2e:test`, configuration `android.emu.debug`).

**End-to-end tests, CI and deployment**

- Root `playwright.config.js` defines projects web-chromium/firefox/webkit, admin-chromium, mobile-chrome/safari, visual, api and a11y. Its webServer starts the backend (`/health` on :5000) and the web dev server (:3000).
- Scripts: `test:e2e:web`, `test:e2e:admin`, `test:a11y`, `test:api:contract`, `test:visual`.
- CI: six overlapping workflows in `.github/workflows` (build, ci, deploy, main, mobile-release, test).
- Deployment: `render.yaml`, `apps/*/vercel.json`, `docker-compose*.yml`, `nginx*.conf`, Dockerfiles.

**Demo personas**

- The twelve demo logins (see commit e05301d) are created by `backend/src/seeds`. Use them, locally only, for role-based testing.

## SECTION 3 — KNOWN LEADS (found by reading the code on 2026-10-25)

These are starting points, not the full list. Confirm each one at runtime, fix the whole bug class, and log it.

**L1 (P0, security) — admin login bypass**
- The admin login page always renders "⚡ DEV: Bypass via Quick Login" (`apps/admin/src/app/login/page.js`: `handleQuickLogin` around L59-69, the button around L242-258).
- It signs in with the hardcoded phone `+919999999991` and code `123456`, and nothing gates it to development.
- Fix:
  - remove it from production builds;
  - make the backend reject demo/test credentials when `NODE_ENV=production`;
  - check `apps/mobile/src/components/DevLoginScreen.js`, `apps/mobile/src/config/devMode.js` and the web app for the same pattern.

**L2 (P0) — mobile token key mismatch**
- `apps/mobile/src/lib/api.js` stores tokens through `SecureTokenStorage` (`authToken`, `refreshToken`; see `src/lib/secureStorage.js`).
- But these screens read `AsyncStorage.getItem('token')`, which nothing writes: `app/modules/{admin-dashboard,blood-bank,carpool,delivery-dashboard,events,jobs,properties,referral,services,townsquare}/index.js`.
- Effect: they act logged out. They send no Authorization header, admin features never appear, and their raw `fetch` calls skip refresh and 401 handling.
- Fix: move them all onto the shared client.

**L3 (P0) — web token key mismatch**
- `SESSION_KEYS.token` is `'auth_token'` (`apps/web/src/lib/api.js`, around L43-48), yet about 12 places read `localStorage.getItem('token')`, which nothing in apps/web writes.
- apps/admin also reads `'token'` in 2 places, next to `'admin_token'`.
- About 306 direct `fetch(` call sites in `apps/web/src` (9 in admin, about 71 in mobile) bypass the shared clients.
- Fix: audit every one for the storage key, the auth header, token refresh and error handling.

**L4 (P1) — role names spelled inconsistently**
- The same role is spelled several ways:
  - `'super_admin'` in about 68 backend files;
  - `'superadmin'` in 7 backend files and in the mobile events/townsquare admin checks, which therefore never match `super_admin`;
  - uppercase sets such as `FULL_ADMIN_ROLES` (`backend/src/middleware/auth.middleware.js`, around L165) and `EVENT_MODERATOR_ROLES` (`backend/src/modules/community/routes/event.routes.js`, around L104).
- Fix: find the canonical values stored in the database and issued in JWTs, put them in one shared constant, and normalize every comparison.
- Mobile also gates UI by decoding the JWT with `atob()`. Confirm the server enforces each of those permissions.

**L5 (P1) — Postgres "auto-heal" shim hides bugs**
- `backend/src/config/database.js` (around L210-216) catches Postgres error 42883, regex-rewrites `= 1` / `= 0` to `= true` / `= false` for six column names, and retries.
- That hides SQL dialect bugs and misses every other column.
- Fix: log each time it fires while running the suite on Postgres, fix the offending queries at their source, then remove or shrink the shim.

**L6 (P0, safety) — tests can hit the hosted database**
- With `TEST_USE_POSTGRES` set, `backend/jest.globalSetup.js` (around L158) runs the suite against whatever `DATABASE_URL` resolves to. Today that is the hosted Supabase database.
- Fix: add a guard to the test setup and to the migrate, seed, purge and index scripts that refuses non-local hosts unless an explicit override flag is set.

**L7 (P1) — concurrency is never tested**
- Tests default to SQLite, and the SQLite adapter strips `FOR UPDATE`. So locking and concurrency in checkout, wallet, inventory, bookings and payouts are never exercised.
- Fix: also run the full backend suite on local PostgreSQL + PostGIS, and add parallel-request tests for the money and stock paths there.

**L8 (P1) — weak default secrets and environment drift**
- `docker-compose.yml` hardcodes `JWT_SECRET=production_super_secret`.
- Check every compose file, `render.yaml`, every Dockerfile and nginx config, and `config/envValidator.js` for default or weak secrets and missing required variables.
- Compare every `process.env.*`, `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` used in code against `.env.example`, `backend/.env.example`, the validator and the deploy configs.

**L9 (P1) — swallowed errors and stray logging**
- About 140 single-line empty catch blocks across the apps.
- About 317 `console.log` calls in `backend/src` (use the winston logger) and 32 in mobile.
- Fix: for each one, decide whether to handle, log or rethrow.

**L10 (P1) — fake or placeholder behaviour**
- "Coming soon" text remains in 5 mobile, 2 web and 1 admin file.
- `Math.random` appears in 20 client files. Classify each use: a legitimate ID or animation, or fabricated business data.
- Suspects:
  - `apps/mobile/app/modules/society/tabs/VisitorsTab.js`
  - `apps/mobile/app/modules/services/confirmation.js`
  - `apps/mobile/app/subscriptions/index.js`
  - `apps/mobile/src/screens/jobs/JobsScreen.js`
  - `apps/web/src/app/rewards/page.js`
- Extend `apps/mobile/__tests__/noFabricatedData.test.js` to cover what you find.

**L11 (P1) — open items from the 2026-10-14 PDF report**
- These come from `LocalSampark_Deep_Audit_and_Pending_Tasks_Report.pdf`; their current status is unknown:
  - simulated event tickets (`EventsScreen.js`);
  - hardcoded booking slots plus static mock services appended to live results (`HomeServicesScreen.js`);
  - Rewards "Convert to Wallet" not wired to `POST /loyalty/redeem`;
  - mobile carpool missing vehicle management and the ride-start OTP;
  - doctor booking shows "coming soon" and prescription upload has no file picker (`MedicalScreen.js`);
  - 13 category managers stubbed in `manager/[category].js`;
  - synthetic Maharashtra pincode centroids (migration 097, `fetch_real_pincodes.js`);
  - PostGIS migrations 125/126 on Postgres.
- Verify each one, then fix it or record why not.

**L12 (P1) — two SOS systems**
- `PARITY_AUDIT.md` §1.4 describes two parallel SOS systems: `/emergency` on web and `/sos` on mobile. An SOS raised on a phone may never reach the web/admin operator screen.
- Verify end to end across platforms. If they still diverge, propose a unification (a decision point).

**L13 (P2) — Android App Links**
- `app.json` declares autoVerify intent filters for `localsampark.in` and `www.localsampark.in`. `apps/web/public/.well-known/assetlinks.json` lists one SHA-256 fingerprint.
- Check that:
  - the fingerprint matches the actual release/upload certificate;
  - if Play App Signing is used, it also matches the Play signing key (record that in NEEDS_OWNER);
  - both hosts serve the file with the right content type and without redirects.

**L14 (P2) — development API address**
- The mobile development API base is a LAN IP (`192.168.1.7`) in `app.json` and in the `eas.json` development profile.
- Prove that:
  - a release build can never resolve to it or to localhost;
  - cleartext HTTP is off in release;
  - emulator development uses `10.0.2.2` or `adb reverse`.

**L15 (P2) — repo hygiene**
- The `backend/` root holds many one-off scripts (`fix_*.js`, `migrate_phase*.js`, `check*.js`, `temp_*.js`, `test_*.js`), empty `.db` files and a 0-byte `nul`. The repo root has more `fix_*` / `create_*` scripts.
- Classify each as needed or dead and list them for me. Delete nothing without approval.

## SECTION 4 — PHASES

[See prompt text in full]

## SECTION 5 — BUG-FIX PROTOCOL (every finding)

[See prompt text in full]

## SECTION 6 — LEDGER FILES (`docs/audit/`)

[See prompt text in full]

## SECTION 7 — HOW TO WORK IN ANTIGRAVITY

[See prompt text in full]

## SECTION 8 — DEFINITION OF DONE

[See prompt text in full]
