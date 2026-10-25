# LocalSampark Audit — Monorepo Module & Contract Inventory

This document serves as the master matrix driving Phase 2 and Phase 4. Every row will be audited across backend routes, web pages, admin tabs, and mobile screens.

---

## 1. Master Module Matrix

| Module ID | Module Domain | Primary Routes | Web Pages | Admin Tabs | Mobile Screens | Database Tables | Sockets & Jobs | Audit Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MOD-01** | **Auth & Identity** | `/auth`, `/users`, `/admin-auth` | `/login`, `/register`, `/auth/*` | Auth guards | `/login`, `/register`, `(tabs)/profile` | `users`, `admin_roles`, `used_refresh_tokens`, `wallets` | `auth.socket` | **PASSED** (55/55 unit/int tests pass, L1/L2/L3/L4/L16 resolved) |
| **MOD-02** | **Location & Territory** | `/zones`, `/territories`, `/user-zones` | `/zones/*`, location picker | Territories tab | Location selector, geofence manager | `regions`, `territory_assignments`, `user_zones` | `territory.socket` | **PASSED** (134/134 unit/int tests pass across backend & mobile) |
| **MOD-03** | **Home & Discovery** | `/feed`, `/public`, `/stories` | `/` (homepage), `/feed`, `/search` | Analytics, Feeds | `(tabs)/index`, feed viewer | `posts`, `stories`, `search_index` | `feed.socket` | PENDING |
| **MOD-04** | **Shops & Catalog** | `/shops`, `/products`, `/categories` | `/shops`, `/shops/[id]`, `/categories` | Shops tab | `(tabs)/shops`, shop details | `local_shops`, `shop_products`, `shop_categories` | `inventory.socket` | PENDING |
| **MOD-05** | **Cart, Checkout & Orders** | `/cart`, `/checkout`, `/orders` | `/cart`, `/checkout`, `/orders/*` | Orders, Disputes | `(tabs)/cart`, order details | `cart_items`, `orders`, `order_items` | `order.socket`, order-expiry job | PENDING |
| **MOD-06** | **Wallet, Rewards & Coins** | `/wallet`, `/rewards`, `/loyalty` | `/wallet`, `/rewards`, `/coins` | Financials | `(tabs)/wallet`, rewards screen | `wallets`, `wallet_transactions`, `loyalty_points` | None | PENDING |
| **MOD-07** | **Merchant Tools & KDS** | `/shops/analytics`, `/payout` | `/shop-dashboard`, `/shop-manager` | Vendor KYC, Payouts | `(admin)/vendor-dashboard` | `shop_analytics_snapshots`, `shop_payouts` | `kds.socket` | PENDING |
| **MOD-08** | **Delivery & Logistics** | `/delivery`, `/logistics/*` | `/delivery`, `/tracking` | Delivery Fleet | Rider console, live tracking | `delivery_agents`, `delivery_tasks` | `tracking.socket` | PENDING |
| **MOD-09** | **Home Services** | `/services`, `/home-services`, `/job-cards` | `/services`, `/service-booking` | Service Bookings | `modules/services/*` | `service_categories`, `service_bookings`, `job_cards` | None | PENDING |
| **MOD-10** | **Jobs & Recruitment** | `/jobs`, `/jobs-board` | `/jobs`, `/jobs/[id]` | Job Postings | `modules/jobs/*` | `admin_jobs`, `job_applications`, `resumes` | `jobs.socket` | PENDING |
| **MOD-11** | **Real Estate / Properties** | `/properties` | `/properties`, `/properties/[id]` | Properties Tab | `modules/properties/*` | `properties`, `property_inquiries` | None | PENDING |
| **MOD-12** | **Carpool & Mobility** | `/carpool` | `/carpool`, `/carpool/[id]` | Carpool Tab | `modules/carpool/*` | `carpool_rides`, `carpool_bookings` | `carpool.socket` | PENDING |
| **MOD-13** | **Society Management & Gate** | `/societies`, `/society-guard`, `/society-billing` | `/society`, `/society-admin` | Society Desk | Gate console, visitor log, bills | `societies`, `society_members`, `society_guard_shifts` | Intercom WebRTC, gate queue | PENDING |
| **MOD-14** | **Community & Townsquare** | `/townsquare`, `/community-hub`, `/chat` | `/townsquare`, `/chat` | Moderation | `modules/townsquare/*` | `townsquare_posts`, `chat_messages` | `chat.socket` | PENDING |
| **MOD-15** | **Safety & Health (SOS)** | `/sos`, `/emergency`, `/medical` | `/emergency`, `/medical` | SOS Console | `modules/sos/*` | `sos_alerts`, `emergency_contacts` | `sos.socket` | PENDING |
| **MOD-16** | **Other Verticals** | `/krishi`, `/scrap`, `/equipment` | `/krishi`, `/scrap` | Verticals Tab | `modules/krishi/*`, `modules/scrap/*` | `scrap_pickups`, `equipment_rentals` | None | PENDING |
| **MOD-17** | **Field & Franchise Ops** | `/franchise`, `/leads-crm` | `/crm`, `/franchise` | CRM Pipeline | `(admin)/field-dashboard` | `crm_leads`, `franchise_territories` | None | PENDING |
| **MOD-18** | **Admin Console (41 Tabs)** | `/admin/*`, `/finance`, `/gtm` | None | All 41 Admin Tabs | None | `admin_config`, `audit_logs` | Admin metrics | PENDING |
| **MOD-19** | **Notifications & Push** | `/notifications` | Notification tray | Broadcast Tab | In-app alerts, push tokens | `notifications`, `push_subscriptions` | FCM / Expo push | PENDING |
| **MOD-20** | **Platform (Theming, i18n)** | `/multilingual`, `/sync` | Layouts, i18n switcher | System Settings | WatermelonDB, theme toggles | Offline sync tables | None | PENDING |
| **MOD-21** | **Background Jobs & ML** | `/ml/*` | None | ML Control Tab | None | `ml_events`, `ml_models` | 12 node-cron jobs, BullMQ | PENDING |

---

## 2. Cross-Module Contract Diff Summary (Phase 2 Output)

Automated extraction completed via `scripts/audit/extract-routes.js` and `scripts/audit/extract-client-calls.js`.

- **Total Backend Endpoints Declared:** 1,092
- **Total Client API Call Sites Discovered:** 814
- **Verified Contract Matches:** 805 (98.8%)
- **Method Mismatches:** 0
- **Unmatched Client Calls (Potential 404s):** 1 (dynamic `${exportDef.path}` in `apps/web/src/app/society-admin/components/SocietyDataExport.js`)
- **Backend Write Endpoints Without Explicit Auth Guard:** 114

Detailed reports and breakdown are preserved in:
- Route registry: [`docs/audit/routes.json`](file:///c:/localsampark%2004-09-2026/localsampark%2004-10-2026/docs/audit/routes.json)
- Client network calls: [`docs/audit/client-calls.json`](file:///c:/localsampark%2004-09-2026/localsampark%2004-10-2026/docs/audit/client-calls.json)
- Contract parity diff report: [`docs/audit/contracts-diff.md`](file:///c:/localsampark%2004-09-2026/localsampark%2004-10-2026/docs/audit/contracts-diff.md)
