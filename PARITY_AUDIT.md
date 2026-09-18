# LocalSampark — Web ↔ Mobile Feature Parity Audit

**Date:** 2026-09-18
**Scope:** `apps/web` (300 consumer routes), `apps/admin` (41-tab franchise console), `apps/mobile` (440 Expo route files), `backend` (119 route modules, 167 migrations, ~430 tables)
**Method:** every API path string in all three clients was extracted, normalised (interpolations → `:id`, query strings dropped, `/api/v1` prefix stripped) and bucketed by module, then compared set-wise. Numbers below are counts of *distinct endpoints a client actually calls*, not estimates.

---

## 0. Headline

Three findings dominate, and all three are demo-affecting:

1. **Neither platform has working real-time sync.** The web app's `SocketProvider` is imported into `layout.js` and never mounted; `useSocket` has zero consumers. The mobile app has a complete 102-line `socketService` that **nothing imports**, and its delivery tracker runs on a `MockSocket` that invents driver positions with `Math.random()`. The backend's socket.io server is initialised and has ten namespaces — it is the clients that never connected.

2. **Deployed to Vercel, every API call from both web apps 404s.** `vercel.json` sets `NEXT_PUBLIC_API_URL` to a value already ending in `/api/v1`, and both `api.js` files appended `/api/v1` again. On Render the same variable is a bare origin, so the two deploy targets disagreed about what the variable means. **Fixed in this pass** — see §3.1.

3. **Society is the one module with a real feature gap, and it is large.** 45 endpoints are called from web and from nothing on mobile. Eleven of sixteen mobile society tabs make zero API calls; five are literal `"Feature coming soon..."` placeholders. The resident visitor pre-approval screen holds its data in React state and never sends it anywhere, so a resident can pre-approve a visitor and the guard at the gate will never see it.

Jobs, Properties and Carpool are in far better shape than expected: all three call real endpoints from both platforms.

---

## 1. Parity matrix

Distinct endpoints called per client, per module.

| Module | web | admin | mobile | on web, not mobile | on mobile, not web |
|---|---:|---:|---:|---:|---:|
| Shops / catalogue / orders | 65 | 0 | 39 | **38** | 12 |
| Society & civic | 53 | 1 | 11 | **45** | 3 |
| Jobs | 19 | 1 | 13 | 8 | 2 |
| Carpool & mobility | 18 | 2 | 20 | 7 | 7 |
| Emergency & SOS | 11 | 3 | 11 | 11 | 8 |
| Properties / broker | 1 | 1 | 1 | 1 | 0 |

The admin column is low by design, not by omission: the console reads almost everything through `/admin/*` aggregate endpoints rather than the per-module ones.

### 1.1 Society & civic — the real gap

Called from web, absent from mobile:

```
visitors                    /visitors  /visitors/today  /visitors/all  /visitors/analytics
                            /visitors/:id/approve  /decline  /check-in  /check-out
bills                       /bills  /bills/summary  /bills/generate  /bills/pay  /bills/:id/pay
                            /admin/bills  /admin/bills/:id/status  /admin/bills/:id/clear
complaints                  /complaints  /complaints/all  /complaints/:id/assign  /:id/resolve
amenities                   /amenities  /amenities/:id/book
parking                     /parking  /parking/:id
packages                    /packages  /packages/pending  /packages/:id/collect
polls                       /polls  /polls/:id/vote  /polls/:id/close  /polls/:id/results
staff                       /staff  /staff/attendance/today  /staff/:id/attendance
members                     /members  /members/:id
notices                     /notices
governance                  /society-analytics/dashboard  /society-compliance/agm
                            /society-compliance/budget  /society-compliance/audit
                            /society-forum/topic
```

Mobile's society surface, measured:

| Screen / tab | Lines | API calls | State |
|---|---:|---:|---|
| `GateConsole.js` | 400 | 3 | **Real** — visitors today, pending packages, staff attendance |
| `SocietyDesk.js` | 346 | — | partial |
| `FlatPortal.js` | 313 | — | partial |
| `GuardDashboard.js` | 205 | 3 | **Real** |
| `AdminDashboard.js` | 84 | **0** | **Hardcoded** — `'840'` members, `'₹14.5 L'` collection, `'8'` guards, `'12'` tickets |
| `ResidentDashboard.js` | 83 | **0** | Static |
| `HousekeepingDashboard.js` | 70 | **0** | Static |
| `tabs/VisitorsTab.js` | 142 | **0** | **Local state only — never reaches the gate** |
| `tabs/EventsTab.js` | 136 | 3 | Real |
| `tabs/EmergencyTab.js` | 134 | **0** | Static |
| `tabs/NoticesTab.js` | 109 | 2 | Real |
| `tabs/BillsTab.js` | 108 | 2 | Real |
| `tabs/PackagesTab.js` | 108 | 2 | Real |
| `tabs/PollsTab.js` | 84 | **0** | Static |
| `tabs/AmenitiesTab.js` | 79 | **0** | Static |
| `tabs/ParkingTab.js` | 77 | **0** | Static |
| `tabs/ComplaintsTab.js` | 76 | **0** | Static |
| `tabs/DirectoryTab.js` | 59 | **0** | Static |
| `tabs/MembersTab.js` | 35 | **0** | **"Feature coming soon..."** |
| `tabs/MessagesTab.js` | 35 | **0** | **"Feature coming soon..."** |
| `tabs/RemindersTab.js` | 35 | **0** | **"Feature coming soon..."** |
| `tabs/SettingsTab.js` | 35 | **0** | **"Feature coming soon..."** |
| `tabs/StaffTab.js` | 35 | **0** | **"Feature coming soon..."** |

The five 35-line files are identical but for their title string — generated stubs that were never filled in.

**The worst of these is `VisitorsTab`.** Its own comment is candid: *"Pre-approvals are held in local state only — nothing is sent to the gate."* The backend endpoints this needs already exist (`/visitor-preapproval`, `/society-visitor`), so this is wiring, not new capability.

### 1.2 Shops — mostly merchant-side tooling

Of the 38 web-only shop endpoints, 30 are merchant back-office (`/shops/my-shop/kds`, `/tables`, `/staff`, `/ledger`, `/job-cards`, `/leads`, `/universal-catalog/*`). Those belong to the shop-owner web dashboard, and a merchant running a counter on a phone is a plausible gap but not a consumer-demo one.

The consumer-facing gaps that do matter:

| Endpoint | What is missing on mobile |
|---|---|
| `/shops/:id/reviews` | mobile can read a rating but cannot list or write reviews |
| `/shops/:id/qa` | shop Q&A absent |
| `/shops/:id/offers`, `/shops/:id/loyalty` | offers and loyalty absent |
| `/search` | no global search; mobile filters client-side |
| `/checkout/create-order`, `/checkout/verify` | payment verification path differs — worth confirming before a live payment demo |
| `/marketplace/flash-deals`, `/marketplace/saved` | flash deals and saved items absent |

Mobile has twelve endpoints web does not, all merchant-app features web has no equivalent for (`/shops/my-shop/live-status`, `/shops/my-shop/appointments`, `/shops/promotions`).

### 1.3 Jobs, Carpool, Properties — near parity

- **Jobs:** 8 web-only endpoints, all employer-side (`/jobs/employer/dashboard`, `/jobs/postings`, `/jobs/companies`, `/jobs/salary-insights`) plus `/jobs/resume-upload` and `/jobs/saved`. Seeker flow is present on both.
- **Carpool:** 7 web-only, of which three matter to a rider — `/carpool/rides/:id/verify-otp`, `/rate`, `/chat`. Without OTP verification the mobile ride-start flow cannot be completed the way web does it. `/carpool/vehicles` is also absent, so a mobile driver cannot manage vehicles.
- **Properties:** effectively at parity, but both sides call exactly **one** endpoint each. Schedule-viewing and broker-contact, which the brief asks about, appear to exist on neither.

### 1.4 SOS & emergency — two parallel systems

The platforms use different endpoints for the same capability:

| | web | mobile |
|---|---|---|
| trigger | `/emergency` | `/sos/trigger` |
| resolve | `/emergency/:id/resolve` | `/sos/:id/resolve` |
| list | `/emergency/active` | — |
| contacts | — | `/sos/contacts` |

Both backends exist (`core/routes/sos.routes.js` and the society emergency routes). An SOS raised from the mobile app therefore does **not** appear in the web `/emergency/active` list. For a demo where an investor triggers an SOS on a phone and expects it on the operator screen, this is the failure that will be noticed.

---

## 2. Real-time synchronisation

The brief asks that an action on web appear on mobile without a pull-to-refresh. Today that cannot happen on any screen.

| Layer | State |
|---|---|
| Backend | **Working.** `initSocketIO(server)` at `backend/src/server.js:54`, ten namespaces: order, chat, carpool, inventory, jobs, marketplace, territory, tracking, tokenQueue, socketAuth. |
| Web — shared provider | **Dead.** `SocketProvider` is imported at `layout.js:7` and never appears in the JSX tree. `useSocket` has **zero** consumers anywhere in 516 files. |
| Web — per-page | **Partial and duplicated.** Nine pages (`/chat`, `/tracking`, `/rider`, `/gatekeeper`, `/resident`, `/shop-dashboard`, `/shops/[id]`, `OrderManagementPanel`, `LogisticsMap`) each construct their own `io()` connection with their own URL derivation and auth handling. |
| Mobile | **None.** `src/services/socket.js` is complete and has **zero importers**. |
| Mobile — tracking | **Simulated.** `OrderTrackingView.js` defines a `MockSocket` whose `driver:location:update` handler emits `18.5913 + Math.random() * 0.001` every three seconds. A demo viewer watching that map is watching a random walk. |

Two further providers are imported into the web layout and never mounted: **`ConfigProvider`** and **`ToastProvider`**. The latter means every `<Toast>` in the app is inert.

---

## 3. Configuration & single source of truth

### 3.1 The doubled API path — fixed in this pass

| Target | `NEXT_PUBLIC_API_URL` | `api.js` computed | Result |
|---|---|---|---|
| Render | `RENDER_EXTERNAL_URL` (origin) | `+ /api/v1` | correct |
| Vercel | `https://…onrender.com/api/v1` | `+ /api/v1` | **`/api/v1/api/v1/…` → 404 on every call** |
| Mobile | its own `PRODUCTION_API`, already includes `/api/v1` | used as-is | correct |

Three consumers held three different conventions for one variable. Rather than pick one and hope every deploy target is updated, both `apps/web/src/lib/api.js` and `apps/admin/src/lib/api.js` now normalise: a trailing `/api/v{n}` and any trailing slash are stripped before the version segment is appended, so either form resolves to the same base.

### 3.2 Database

All three clients talk to one API service (`localsampark-api`), and that service owns the single database (`localsampark-db`, `render.yaml`). There is no second datastore and no client-side database divergence. The mobile app additionally keeps a WatermelonDB cache for offline reads, which is a cache rather than a second source of truth.

---

## 4. Code hygiene

| Check | web | admin | mobile app/ | mobile src/ |
|---|---:|---:|---:|---:|
| `TODO` / `FIXME` / `HACK:` | 0 | 0 | 0 | 0 |
| `console.log` | 9 | 0 | 6 | 26 |
| "coming soon" placeholders | 5 | — | 6 | — |

TODOs have already been cleared repo-wide. The remaining debt is the 41 `console.log` calls and the eleven placeholder screens.

---

## 5. Recommended order of work

Ranked by what an investor would actually notice.

1. **SOS endpoint unification.** A phone-triggered SOS not reaching the operator screen is the single most visible failure available in a demo. Small change: one pair of endpoints.
2. **Real-time.** Mount `SocketProvider`, give the nine ad-hoc `io()` pages one shared connection, import `socketService` on mobile and subscribe the screens that matter (orders, gate, SOS). Delete `MockSocket`.
3. **Society on mobile.** Wire the eleven static tabs to endpoints that already exist, starting with `VisitorsTab` — a pre-approval that never reaches the gate is a broken promise, not a missing feature.
4. **Investor seed data.** The current seeder is a 75-line SQL file. The brief's dataset (shops with catalogues, jobs with applicant states, properties, carpool routes, society bills and visitor logs, demo personas) needs a purpose-built idempotent seeder.
5. **Consumer shop gaps** — reviews, Q&A, offers, search.
6. **`ToastProvider` and `ConfigProvider`** — two lines, and it restores every toast in the app.

---

## 6. What this document is and is not

This is a measured inventory and a plan. It is Phase 1 of the brief; Phases 2–5 are implementation, and only item 3.1 above has been implemented so far.

The measurement is endpoint-level. Two clients calling the same endpoint is strong evidence of parity but not proof that both render it equally well — `AdminDashboard.js` would pass an endpoint check with zero calls and still be hardcoded, which is why §1.1 also counts lines and inspects state. Where a claim rests on reading a file rather than counting calls, the file and line are named so it can be checked.
