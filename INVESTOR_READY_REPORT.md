# LocalSampark — Investor Readiness Report

**Date:** 2026-09-18
**Scope:** `apps/web`, `apps/admin`, `apps/mobile`, `backend`
**Companion documents:** [`PARITY_AUDIT.md`](PARITY_AUDIT.md) (feature parity matrix), [`DESIGN_AUDIT.md`](DESIGN_AUDIT.md) (UI/UX audit)

---

## 1. The three defects that would have ended the demo

Each was found by running the system, not by reading it, and each is fixed and verified.

### 1.1 None of the twelve demo logins worked

`/auth/verify-otp` short-circuits the `+9190000000NN` numbers and **synthesised** a user object with an id like `mock-user-1789749865283` that it never persisted. `auth.middleware.js` then ran:

```js
queryOne('SELECT * FROM users WHERE id = $1', [decoded.userId])
```

…found nothing, and returned `401 User not found.` A persona could sign in and then call **nothing**. Probed against a running server, all twelve were rejected by every authenticated route.

**Fixed.** The demo branch now resolves the seeded row through the same query layer the middleware reads, and falls back to the synthesised object only when the database has not been seeded — logging a warning that names the seed command when it does.

Measured before and after, all twelve personas:

| | before | after |
|---|---|---|
| token subject | `mock-user-<timestamp>` | `demo-user-NN` |
| `GET /users/me` | `401` | `200` |

### 1.2 `/users/me` queried a different database than the one that authenticated the request

`config/prisma.js` builds a real `PrismaClient` **even when `USE_SQLITE=true`**, and Prisma's datasource is `DATABASE_URL` — a Supabase PostgreSQL instance. So in the local and demo configuration the middleware authenticated against SQLite and the handler then queried Supabase. Observed, on every call:

```
FATAL: (ENOIDENTIFIER) no tenant identifier provided (external_id or sni_hostname required)
→ 500
```

`/users/me` is the first call both clients make after login, so this single split broke the opening screen of the web app and the Android app.

**Fixed.** `GET` and `PUT /users/me` now use `config/database`, matching the rest of the file, which already did. A `presentUser()` mapper serves both the snake_case row and the camelCase keys Prisma used, so no client breaks on the change.

**Not fixed, and it is the largest remaining risk — see §5.1.** Thirteen other modules still call Prisma and will 500 the same way under `USE_SQLITE=true`.

### 1.3 Deployed to Vercel, every API call from both web apps 404s

| Target | `NEXT_PUBLIC_API_URL` | `api.js` computed | Result |
|---|---|---|---|
| Render | `RENDER_EXTERNAL_URL` (a bare origin) | `+ /api/v1` | correct |
| Vercel | `https://…onrender.com/api/v1` | `+ /api/v1` | `/api/v1/api/v1/…` → **404 on everything** |
| Mobile | its own constant, already includes `/api/v1` | used as-is | correct |

Three consumers held three different conventions for one variable.

**Fixed.** Both `apps/web/src/lib/api.js` and `apps/admin/src/lib/api.js` strip a trailing `/api/v{n}` and any trailing slash before appending the version segment, so either form resolves to the same base. Five input shapes are covered by a test.

---

## 2. Demo seeding

`backend/src/seeds/seed-investor-demo.js` — new, idempotent, and self-verifying.

```bash
npm run seed:demo --workspace=backend          # seed
npm run seed:demo:verify --workspace=backend   # check without writing
```

Run twice back to back: **193 rows both times, zero failed inserts, all eight checks green.** Idempotency is by construction — every row carries a deterministic `demo-` id and the run tears its own rows down first, children before parents.

| Dataset | Seeded |
|---|---:|
| Demo personas (real `users` rows) | 12 |
| Shops, one per live category | 7 |
| Catalogue items, priced with MRP and stock | 70 |
| Job postings (`job_vacancies` + `admin_jobs`) | 10 + 10 |
| Applicants across Applied → Screening → Interview → Offered | 30 |
| Properties (1/2/3 BHK, commercial, rent and sale) | 8 |
| Carpool routes with real coordinates and seat pricing | 5 |
| Society: members, bills, complaints, amenities, notices, polls, packages, parking, staff, pre-approved visitors | 6/6/4/4/3/1/4/6/4/3 |

Three things the seeder does that matter for a live demo:

- **Bills are a mix of paid and pending**, and complaints span open / in-progress / resolved, so no screen is uniformly green.
- **Shop hours vary by category** — the pharmacy is 24×7, the farm store opens at 06:00 — because the urgent-intent path filters on "open now", and a catalogue that all closes at 21:00 goes empty after 21:00.
- **It reports what it could not write** rather than swallowing it. That is how the four schema mismatches in the first run were found (`job_applications.job_id` points at `job_vacancies`, not `admin_jobs`; `society_parking_slots.assigned_to` at `society_members`, not `users`; `carpool_rides` requires WKT coordinates; `society_members` is unique per user).

### Demo personas

OTP is always `123456`. The short-circuit is gated to non-production — a test asserts it stays that way, because an ungated fixed OTP on `+919000000012` is an unauthenticated path to a super-admin token.

| Phone | Role | Name |
|---|---|---|
| +919000000001 | user | Sunita Bhosale |
| +919000000002 | resident_member | Abhijeet Kulkarni |
| +919000000003 | society_admin | Meera Joshi |
| +919000000004 | security_guard | Ramesh Yadav |
| +919000000005 | shop_owner | Vikas Sharma |
| +919000000006 | service_provider | Imran Shaikh |
| +919000000007 | delivery_agent | Rohan Patil |
| +919000000008 | field_agent | Kiran More |
| +919000000009 | area_agent | Snehal Pawar |
| +919000000010 | territory_admin | Sunil Deshmukh |
| +919000000011 | moderator | Anjali Nair |
| +919000000012 | super_admin | Platform Admin |

---

## 3. Other defects found and fixed

| # | Defect | Evidence |
|---|---|---|
| 1 | **20 of the 23 endpoints the web `/society` page calls return 404.** The page was written against an API surface never implemented on `/society-management`; the features live on sibling routers (`/society-billing`, `/societies`, `/society-compliance`, `/society-analytics`, `/society-forum`). | Probed with a real `society_admin` token |
| 2 | The society page's `api()` helper swallowed non-2xx responses, so a 404 parsed into `{error}` and collapsed to `[]` — a missing route looked exactly like an empty list | code read |
| 3 | The notices tab read `localStorage['token']` while every other call on the page reads `'auth_token'`, so it was unauthenticated even when signed in | code read |
| 4 | `GET /society-management/staff/attendance/today` returned 500 on every call: `TO_CHAR` is PostgreSQL-only and SQLite has no such function | server log |
| 5 | `apps/mobile/app/config` and `app/components` sat inside the Expo Router tree, making `config/api.js` addressable as a route, and `LanguageToggle` existed twice | failing test, 43 assertions |

**Fixes.** The society helper now recognises sibling router prefixes and resolves them absolutely, and throws on non-2xx so a failed tab renders the error state added in the UI pass rather than an empty table. The notices call goes through the helper. `TO_CHAR` is replaced with a bound parameter (portable and index-friendly) — `500 → 200`. The two mobile directories were moved to `src/`, 34 importers rewritten and verified to resolve, and the duplicate `LanguageToggle` deleted.

---

## 4. Verification

Everything below was executed, not inspected.

| Suite | Result |
|---|---|
| `backend` unit + integration (`npm run test:unit`) | **892 passed, 53/53 suites** |
| `apps/mobile` jest | **211 passed, 10/10 suites** |
| `apps/web` production build | **300 routes, clean** |
| `apps/admin` production build | **clean** |
| Theme regression (`tests/e2e/web/theme.spec.js`) | **6 passed** |
| Touch targets (`tests/e2e/accessibility/touch-targets.spec.js`) | **5 passed** — 0% under 44px on all four routes |
| Pre-existing a11y suite | **22 passed** (was 4 failing) |
| Demo personas + API base (`backend/src/__tests__/demo-personas.test.js`) | **11 passed**, new |
| Seeder idempotency | 193 rows, identical on re-run, 8/8 checks |

Both backend suites that were failing before this work now pass. `categoryRouterParity` was fixed by the directory move; `mlRanker` passes in isolation and in the full run — it had been failing only as a cross-suite state leak.

New regression guards added this pass: theme (6), touch targets (5), mobile design tokens (35), demo personas and API base (11).

---

## 5. What is **not** done

Stated plainly, because a demo is not the place to discover these.

### 5.1 Thirteen modules still read a second database — highest remaining risk

`config/prisma.js` returns `null` under `USE_SQLITE=true`, but `getSharedPrisma()` then constructs a `PrismaClient` anyway, so these modules talk to Supabase PostgreSQL while the other 294 files talk to SQLite:

```
core/routes/auth.routes.js (24 call sites)     ecommerce/routes/cart.routes.js (6)
ecommerce/controllers/shop-management (9)      services/controllers/delivery.controller.js (5)
ecommerce/controllers/unified-superapp (8)     ecommerce/routes/shop.routes.js (5)
crm/controllers/admin-revenue (7)              crm/controllers/admin-krishi (4)
core/services/upload.service.js (3)            tenant/tenant-module.controller.js (2)
services/routes/tracking.routes.js (2)         ecommerce/controllers/pincode-directory (1)
crm/controllers/admin-health.controller.js (1)
```

Under `USE_SQLITE=true` every endpoint in that list returns 500. **Two options:**

- **Run the demo on PostgreSQL** (`USE_SQLITE=false`), which is the production configuration and the only one where both layers agree. This needs working Supabase credentials — the value in `backend/.env` is redacted here, so I could not verify it.
- **Migrate those thirteen modules** to `config/database`, as `/users/me` now is. Roughly 77 call sites.

I did not choose between these because the first is a credentials question only you can answer. If the demo runs on SQLite, treat this list as the set of screens that will fail.

### 5.2 Real-time sync is still not working on either platform

Documented in `PARITY_AUDIT.md` §2 and unchanged by this pass. The backend's socket.io server is live with ten namespaces. The web app's `SocketProvider` is imported into `layout.js` and never mounted, and `useSocket` has zero consumers; nine pages instead open their own ad-hoc connections. The mobile app's complete `socketService` has **zero importers**, and `OrderTrackingView` renders a `MockSocket` that invents driver positions with `Math.random()` every three seconds.

Nothing in the brief's "action on web appears on mobile without a refresh" works today. `ConfigProvider` and `ToastProvider` are also imported and never mounted, so every toast in the web app is inert.

### 5.3 Mobile society module is still largely static

Eleven of sixteen society tabs make no API call; five are `"Feature coming soon..."` placeholders. `VisitorsTab` holds pre-approvals in React state and never sends them, so a resident can pre-approve a visitor and the guard will not see it — the seeder now creates three real pre-approvals so the gate console has something to check against, but the mobile write path is still local-only.

### 5.4 Not started from the brief

Phase 4 in full (Zod/Yup schema validation across forms, offline retry queues, image fallbacks, React 18/19 hook modernisation), the consumer shop gaps (reviews, Q&A, offers, global search), and carpool OTP verification on mobile.

---

## 6. Running the demo

```bash
# 1. Backend (SQLite — see §5.1 before choosing this)
USE_SQLITE=true NODE_ENV=development PORT=5000 node backend/src/server.js

# 2. Seed
npm run seed:demo --workspace=backend

# 3. Apps
npm run dev:web     # localhost:3000
npm run dev:admin   # localhost:3001

# 4. Sign in with any persona from §2, OTP 123456
```

The web app takes over a minute to compile its first route on a cold `next dev`. Warm it before anyone is watching.

One operational note: **do not run `npm run build:web` while a dev server is serving the same directory.** Both write `apps/web/.next`, and the build replaces chunks the running server still references — the dev server then serves pages with no CSS at all (`Cannot find module './9479.js'`). It cost an hour of chasing phantom test failures during this work.
