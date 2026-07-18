# 🔍 LocalSampark — Complete 10x Deep Audit & Production-Ready Implementation Plan

## Application Overview

LocalSampark is a hyperlocal super-app connecting neighborhoods with local shops, services, deliveries, community features, and franchise management. The platform consists of:

| Component | Tech Stack | Location |
|-----------|-----------|----------|
| **Backend API** | Express 5, PostgreSQL/SQLite, Redis, Socket.io | [backend/](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/backend) |
| **Web App** | Next.js 14, TailwindCSS, Zustand, Framer Motion | [apps/web/](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web) |
| **Admin Panel** | Next.js, Inline styles (God Mode Dashboard) | [apps/admin/](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/admin) |
| **Mobile App** | Expo/React Native (Expo Router) | [apps/mobile/](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/mobile) |

---

## User Review Required

> [!IMPORTANT]
> This is a **massive** undertaking covering **14 major audit areas** across **4 application surfaces** (backend, web, admin, mobile). The plan is organized into **7 execution phases** by priority. Please review and confirm which phases to proceed with first. I recommend executing sequentially starting from Phase 1.

> [!WARNING]
> **Security Issue**: The [.env](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/backend/.env) file contains real Supabase database credentials and JWT secrets committed to the repository. These **MUST** be rotated before production deployment.

> [!CAUTION]
> **CORS Security**: The backend currently accepts **ALL origins** (`callback(null, true)`) in [server.js L119](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/backend/src/server.js#L118-L121). This is a critical production vulnerability.

---

## Open Questions

1. **Payment Gateway**: Razorpay keys are empty in both `.env` and `.env.production`. Do you have a live Razorpay account, or should I implement a mock payment flow for launch?
2. **Firebase / OTP**: Firebase credentials are empty. Do you have Firebase set up for SMS OTP? Or should I implement an alternative (e.g., MSG91 direct, email-based login)?
3. **Hosting Strategy**: You have `render.yaml` and `docker-compose.yml` configured. Are you deploying to Render, or your own VPS?
4. **Domain**: The code references `localsampark.in`, `localsampark.com`, and `admin.localsampark.in`. Which are your confirmed domains?
5. **Mobile App Signing**: Do you have Android signing keys (.keystore) ready for Google Play Store submission?

---

## 🔴 AUDIT AREA 1: CRITICAL "COMING SOON" PLACEHOLDER PAGES (37+ Pages Broken)

The deepest finding of this audit: **37+ web pages and multiple franchise sub-pages are non-functional placeholders** showing only "Coming Soon". These must be built out for production.

### Website Placeholder Pages (Full List)

| Page | File | Backend API Exists? | Priority |
|------|------|---------------------|----------|
| **Delivery** | [delivery/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/delivery/page.js) | ✅ `delivery.routes.js` | 🔴 CRITICAL |
| **Services** | [services/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/services/page.js) | ✅ `services.routes.js` | 🔴 CRITICAL |
| **Jobs** | [jobs/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/jobs/page.js) | ✅ `job.routes.js` | 🔴 CRITICAL |
| **Events** | [events/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/events/page.js) | ✅ `event.routes.js` | 🟡 HIGH |
| **Medical** | [medical/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/medical/page.js) | ✅ `medical.routes.js` | 🟡 HIGH |
| **Carpool** | [carpool/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/carpool/page.js) | ✅ `carpool.routes.js` | 🟡 HIGH |
| **Equipment** | [equipment/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/equipment/page.js) | ✅ `equipment.routes.js` | 🟡 HIGH |
| **Donations** | [donations/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/donations/page.js) | ✅ `donations.routes.js` | 🟡 HIGH |
| **Chef** | [chef/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/chef/page.js) | ✅ `chef.routes.js` | 🟡 HIGH |
| **Community Hub** | [community-hub/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/community-hub/page.js) | ✅ `community_hub.routes.js` | 🟡 HIGH |
| **CRM** | [crm/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/crm/page.js) | ✅ `crm.routes.js` | 🟢 MEDIUM |
| **Bills** | [bills/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/bills/page.js) | ✅ `bills.routes.js` | 🟢 MEDIUM |
| **Volunteer** | [volunteer/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/volunteer/page.js) | ✅ `volunteer.routes.js` | 🟢 MEDIUM |
| **Subscriptions** | [subscriptions/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/subscriptions/page.js) | ✅ `subscription.routes.js` | 🟢 MEDIUM |
| **Referral** | [referral/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/referral/page.js) | ✅ `referral.routes.js` | 🟢 MEDIUM |
| **Forgot Password** | [forgot-password/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/forgot-password/page.js) | ✅ `auth.routes.js` | 🔴 CRITICAL |
| **Franchise Dashboard** | [franchise-dashboard/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/franchise-dashboard/page.js) | ✅ `franchise.routes.js` | 🟡 HIGH |
| **Franchise Sub-pages** (7) | agents, approvals, dashboard, posts, providers, revenue, shops, users | Partial | 🟡 HIGH |
| **Admin Dashboard Sub-pages** (8) | users, franchises, settings, skilled-dispatch, revenue, shop-categories, approvals, payouts, revenue-models | ✅ `admin.routes.js` | 🟡 HIGH |
| **Admin Revenue** | [admin/revenue/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/admin/revenue/page.js) | ✅ | 🟡 HIGH |
| **Delivery Dashboard Onboarding** | [delivery-dashboard/onboarding/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/delivery-dashboard/onboarding/page.js) | Partial | 🟡 HIGH |

### Mobile Placeholder
| **Manager [category]** | [modules/manager/[category].js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/mobile/app/modules/manager/%5Bcategory%5D.js) | ✅ | 🟡 HIGH |

---

## 🔴 AUDIT AREA 2: SECURITY VULNERABILITIES (Production Blockers)

### 2.1 Credential Exposure
- **[.env](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/backend/.env)** — Real Supabase database URL with password `SarikaShilimkar` exposed in plaintext
- **[.env](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/backend/.env) L20-21** — JWT secrets are hardcoded hex strings, must be rotated
- `.env` should be in `.gitignore` and never committed

### 2.2 CORS Misconfiguration
- [server.js L118-121](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/backend/src/server.js#L118-L121): `origin: (origin, callback) => callback(null, true)` — accepts ALL origins. Must whitelist only `localsampark.in`, `admin.localsampark.in`, and mobile app user-agent.

### 2.3 Missing Input Validation
- No `express-validator` usage in most route handlers despite being a dependency
- [shop.routes.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/backend/src/routes/shop.routes.js) — 760 lines, raw query parameters directly interpolated
- SQL injection risk in some dynamically built queries

### 2.4 Rate Limiting
- Only one global rate limiter ([rateLimit.middleware.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/backend/src/middleware/rateLimit.middleware.js)) — no per-endpoint limits for auth, payments

### 2.5 Missing HTTPS Enforcement
- No HTTP→HTTPS redirect middleware for production

### 2.6 Admin Auth Weakness
- [admin.routes.js L13-18](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/backend/src/routes/admin.routes.js#L13-L18) defines its own `requireAdmin` middleware inline, duplicating [auth.middleware.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/backend/src/middleware/auth.middleware.js) — inconsistent admin check

---

## 🔴 AUDIT AREA 3: ROLE-BASED ACCESS MANAGEMENT SYSTEM

### Current Roles Defined in [auth.middleware.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/backend/src/middleware/auth.middleware.js#L152-L163)
```
USER, SHOP_OWNER, DELIVERY_AGENT, SERVICE_PROVIDER, FIELD_AGENT,
SECURITY_GUARD, AREA_AGENT, TERRITORY_ADMIN, MODERATOR, SUPER_ADMIN
```

### Issues Found
1. **No FRANCHISE_OWNER role** — franchise partners are tracked in `franchise_partners` table but have no dedicated role
2. **No VISITOR role** — everyone is "user", no guest browsing tracking
3. **Role switching** exists in web AuthContext but not connected to backend role validation
4. **Missing role-based dashboards** — `shop_owner` has a dashboard but `service_provider`, `delivery_agent`, `franchise_owner` dashboards are incomplete
5. **No RBAC permissions matrix** — `rbac.routes.js` exists but is minimal
6. **Society guards** have no dedicated dashboard — only guard reminder sockets exist

### Proposed Complete Role Flow Matrix

```
┌──────────────────────────────────────────────────────────────────────┐
│ VISITOR (Unauthenticated)                                           │
│  → Browse shops → View products → Search → View events              │
│  → Register as: User / Shop Owner / Service Provider / Delivery     │
├──────────────────────────────────────────────────────────────────────┤
│ USER (Authenticated)                                                │
│  → Place orders → Track delivery → Chat → Rate/Review               │
│  → Book services → Wallet → Referrals → Community → Subscriptions   │
├──────────────────────────────────────────────────────────────────────┤
│ SHOP_OWNER                                                          │
│  → Manage products → Accept/reject orders → KDS → Inventory         │
│  → View analytics → Manage returns/disputes → Staff management      │
├──────────────────────────────────────────────────────────────────────┤
│ DELIVERY_AGENT                                                      │
│  → Accept deliveries → Navigate → Update status → Earnings          │
│  → Vehicle management → Availability toggle                         │
├──────────────────────────────────────────────────────────────────────┤
│ SERVICE_PROVIDER                                                    │
│  → Manage bookings → Set availability → Portfolio → Reviews          │
├──────────────────────────────────────────────────────────────────────┤
│ FRANCHISE_OWNER (NEW)                                               │
│  → Territory management → Revenue split → Merchant onboarding       │
│  → User acquisition metrics → Payout tracking                       │
├──────────────────────────────────────────────────────────────────────┤
│ SUPER_ADMIN (God Mode)                                              │
│  → All of above + Territory ON/OFF + User ban + Revenue config       │
│  → Franchise assignment + Commission settings + System config        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔴 AUDIT AREA 4: SHOP CATEGORY MANAGEMENT SYSTEM

### Categories Found in DB (55+ categories across 3 business models)
- **Product**: Grocery, Pharmacy, Electronics, Bakery, Jewellery, Gas, Water...
- **Appointment**: Salon, Doctor, Legal, Travel, Wedding, Interior...  
- **Hybrid**: Restaurant, Tiffin, Mobile Repair, Printing, Security...

### Issues Found
1. **Shop Dashboard** has 13 category-specific manager components ([shop-dashboard/components/](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/shop-dashboard/components)) but 55+ categories exist — most categories have **no dedicated manager**
2. Missing manager components for: Tiffin, Mobile Repair, Printing, Security, Courier, Water, Gas, Jewellery, Travel, Locksmith, Packers, Wedding, Interior, Painting, Coaching, Astrologer
3. **[shop-management.controller.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/backend/src/controllers/shop-management.controller.js)** is a massive 46KB single file — needs modularization
4. Mobile [modules/manager/[category].js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/mobile/app/modules/manager/%5Bcategory%5D.js) shows "Coming Soon" — no category-specific management on mobile

---

## 🟡 AUDIT AREA 5: ORDER & DELIVERY FLOW (End-to-End)

### Current Flow Gaps
1. **Checkout** ([checkout/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/checkout/page.js)) — has a "fallback simulate success" (L49-50) meaning failed orders still show as placed
2. **No cart context/store** shared between web pages — cart relies on `localStorage` only
3. **Order Tracking** page exists but real-time socket updates partially wired
4. **Delivery Agent Assignment** — `autoCreateShopDelivery` exists but the automated dispatch algorithm only broadcasts, no intelligent closest-agent matching
5. **OTP Verification for Delivery** — `otp_code` field exists in `orders` table but no OTP verification endpoint
6. **Returns/Refunds** — `shop_disputes` table exists in migration 016 but no API endpoints for customer-initiated returns
7. **Payment Integration** — Razorpay is initialized with mock keys, Wallet payment works but no real payment gateway connected

---

## 🟡 AUDIT AREA 6: ADMIN PANEL (GOD MODE) AUDIT

### Admin Panel Structure
The admin lives in [apps/admin/src/app/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/admin/src/app/page.js) — an **81KB monolithic file** with 1217 lines.

### Tab Components Found (12 tabs)
JobsTab, DeliveryTab, WalletTab, CommunityTab, SocietyTab, EventsTab, MarketplaceTab, MedicalTab, SubscriptionsTab, PremiumTab, SOSTab, CRMTab

### Missing Admin Tabs/Features
1. **No Shop Categories Manager** — cannot add/edit/disable categories from admin
2. **No Service Providers Management** — services.routes.js exists but no admin UI
3. **No Franchise Dashboard in Admin** — franchise CRUD exists in API but no dedicated admin tab
4. **No Scrap/Equipment Management** tab
5. **No Chef/Tiffin Management** tab
6. **No Volunteer/Donations Management** tab
7. **No Bills Management** tab
8. **No Pet Community Management** tab
9. **No Carpool Management** tab
10. **No Property/Real Estate Management** tab  
11. **No Referral Campaign Management** tab
12. **No Ad Campaign Management** tab (ad_campaigns table exists)
13. **No Audit Log Viewer** (admin_audit_logs table exists)
14. **Revenue Models page** exists in web admin-dashboard but is a placeholder
15. **No real-time analytics dashboard** — current stats are basic counts

---

## 🟡 AUDIT AREA 7: MOBILE APPLICATION AUDIT

### Mobile Architecture
- **76 module directories** in [apps/mobile/app/modules/](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/mobile/app/modules)
- **20 tab screens** in [apps/mobile/app/(tabs)/](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/mobile/app/(tabs))
- Uses Expo Router with file-based routing

### Issues Found
1. **API URL Config**: [config/api.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/mobile/app/config/api.js) uses `10.0.2.2` for Android emulator — production URL `localsampark-api.onrender.com` but no build-time switching
2. **Missing `src/` directory imports**: `_layout.js` imports from `../src/context/AuthContext` but some contexts are in `app/context/` — inconsistent paths
3. **Duplicate directories**: Both `community-hub/` and `community_hub/` exist in modules
4. **Shop detail page** [app/shop/index.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/mobile/app/shop/index.js) is only 1784 bytes — very minimal
5. **Manager category module** shows "Coming Soon"
6. **No offline data sync** — `offline/` directory exists but likely placeholder
7. **No deep linking configuration** for order tracking, shop sharing
8. **Build System**: Multiple build batch files exist but no CI/CD pipeline

---

## 🟡 AUDIT AREA 8: DATABASE & BACKEND ARCHITECTURE

### Issues Found
1. **Dual Database Support Complexity**: SQLite & PostgreSQL maintained in parallel — production should commit to PostgreSQL only
2. **Missing Indexes**: No index on `orders.user_id`, `orders.shop_id`, `deliveries.agent_id`, `wallet_transactions.wallet_id`
3. **No Database Migrations Runner for Production**: `run.js` runs all migrations sequentially but no version tracking
4. **Duplicate Tables**: Both `property_listings` (init.sql L192) and `properties` (init.sql L710) exist — data confusion
5. **No connection pooling optimization** for production load
6. **Background job** in server.js runs every hour via `setInterval` — should use BullMQ (already a dependency but unused)
7. **Guard reminder check** runs every 30 seconds — should be event-driven, not polling

---

## 🟡 AUDIT AREA 9: FRONTEND-BACKEND INTEGRATION GAPS

### Disconnected Routes (API exists, no UI)
| Backend Route | API | Web UI | Mobile UI |
|---|---|---|---|
| `services.routes.js` | ✅ | ❌ Placeholder | Partial |
| `delivery.routes.js` | ✅ | ❌ Placeholder | Partial |
| `bills.routes.js` | ✅ | ❌ Placeholder | Partial |
| `care.routes.js` | ✅ | ❌ Placeholder | Partial |
| `volunteer.routes.js` | ✅ | ❌ Placeholder | Partial |
| `donations.routes.js` | ✅ | ❌ Placeholder | Partial |
| `scrap.routes.js` | ✅ | ❌ Placeholder | Partial |
| `equipment.routes.js` | ✅ | ❌ Placeholder | Partial |
| `chef.routes.js` | ✅ | ❌ Placeholder | Partial |

### API Exists but Not Used by Any Frontend
- `engagement.routes.js` (5.5KB of gamification APIs — unused)
- `rbac.routes.js` (role-based access — unused)
- `settings.routes.js` (platform settings — partially used)

---

## 🟢 AUDIT AREA 10: PERFORMANCE & OPTIMIZATION

1. **Admin page.js is 81KB** — should be split into lazy-loaded tab modules
2. **No image optimization** — Next.js Image component not used consistently
3. **No API response caching** on frontend (SWR configured but underutilized)
4. **No code splitting** for heavy pages (shops listing is 30KB)
5. **Mobile app bundle size** — lucide-react-native + phosphor-react-native = duplicate icon libraries
6. **No service worker** for web PWA (ServiceWorkerRegistrar component exists in layout but no sw.js)
7. **WebSocket reconnection** — no exponential backoff or health checks

---

## 🟢 AUDIT AREA 11: DEPLOYMENT READINESS

### Missing for Production
1. **No `.env.production` for frontend** — web app needs `NEXT_PUBLIC_API_URL` configured
2. **No SSL/TLS** configuration in nginx.conf for HTTPS
3. **No health check monitoring** (Uptime Robot, etc.)
4. **No error tracking** — Sentry stub exists but not configured
5. **No CI/CD pipeline** (`.github/` directory exists but likely empty/incomplete)
6. **No database backup strategy**
7. **No log rotation** (winston configured but logs directory grows unbounded)
8. **Docker setup** needs review — docker-compose.yml exists but may need updates
9. **No Google Play Store listing assets** (screenshots, descriptions)

---

## 🟢 AUDIT AREA 12: UI/UX GAPS

1. **No global loading states** — many pages fetch data without skeleton loaders
2. **No empty state designs** — when no shops/orders/events exist
3. **No error boundaries** per page section
4. **No toast notifications** for user actions (ToastProvider exists but underutilized)
5. **No dark mode toggle** on mobile (web has it)
6. **No accessibility** (ARIA labels, keyboard navigation)
7. **No responsive design testing** — some pages may break on tablet/desktop

---

## 🟢 AUDIT AREA 13: MISSING PRODUCTION FEATURES

1. **No Invoice/Receipt Generation** for orders
2. **No Email Notifications** (SMTP configured but no transactional emails sent)
3. **No WhatsApp Order Updates** (whatsapp.service.js exists but not connected)
4. **No Push Notification** triggers from backend (firebase.js configured but unused by order flow)
5. **No Customer Support Chat** between user and shop owner
6. **No Cancellation/Refund Policy Engine**
7. **No GST/Tax Calculation** in order totals
8. **No Multi-language Support** on web (mobile has LanguageContext)
9. **No Analytics Dashboard** with charts (recharts dependency exists but unused)

---

## 🟢 AUDIT AREA 14: SOCIETY MANAGEMENT MODULE

The society-visitor controller is massive (60KB, [society-visitor.controller.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/backend/src/controllers/society-visitor.controller.js)) with extensive features. Issues:
1. **Guard dashboard** partially wired — reminders work via socket but no dedicated guard UI
2. **Maintenance billing** exists in DB but no payment integration
3. **Complaint resolution workflow** incomplete — no notification to complainant when resolved
4. **No visitor photo capture** at gate entry

---

## Proposed Changes — Execution Phases

### Phase 1: 🔴 Critical Security & Stability Fixes (Est: 2-3 hours)

#### [MODIFY] [server.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/backend/src/server.js)
- Fix CORS to whitelist only allowed origins
- Add HTTPS redirect middleware for production
- Add per-route rate limiting for auth/payment endpoints
- Remove `allowedOrigins` variable that's defined but never used

#### [MODIFY] [.env](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/backend/.env)
- Add `.env` to `.gitignore`
- Rotate JWT secrets and document rotation process

#### [MODIFY] [.env.production](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/backend/.env.production)
- Add all missing env vars (`ALLOWED_ORIGINS`, Sentry DSN, etc.)
- Fix `JWT_REFRESH_SECRET` key name mismatch (uses `REFRESH_SECRET` vs `JWT_REFRESH_SECRET`)

#### [MODIFY] [envValidator.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/backend/src/config/envValidator.js)
- Add validation for `JWT_REFRESH_SECRET`, `RAZORPAY_KEY_ID`, `FIREBASE_PROJECT_ID`
- Add warnings for empty optional vars

#### [MODIFY] [error.middleware.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/backend/src/middleware/error.middleware.js)
- Add structured error logging with winston
- Sanitize error messages for production (no stack traces)

#### [MODIFY] [admin.routes.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/backend/src/routes/admin.routes.js)
- Remove inline `requireAdmin` — use centralized one from auth.middleware.js

#### [NEW] `.gitignore` update
- Ensure `.env`, `*.log`, `database.sqlite`, `*.idsig`, `hs_err_*`, `replay_*` are ignored

---

### Phase 2: 🔴 Build Out Critical Placeholder Pages (Est: 8-10 hours)

#### Web — Build Full Pages (Replacing "Coming Soon")

#### [MODIFY] [delivery/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/delivery/page.js)
- Build delivery request form: pickup/drop location, item details, payment preference
- Show nearby delivery agents
- Connect to `delivery.routes.js` API

#### [MODIFY] [services/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/services/page.js)
- Build service provider directory with categories (plumber, electrician, salon, etc.)
- Search, filter, booking flow
- Connect to `services.routes.js` API

#### [MODIFY] [jobs/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/jobs/page.js)
- Build job listing page with filters (type, salary, location)
- Application flow for users
- Connect to `job.routes.js` API

#### [MODIFY] [events/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/events/page.js)
- Build event listing with calendar view
- Ticket booking flow
- Connect to `event.routes.js` API

#### [MODIFY] [medical/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/medical/page.js)
- Build health provider directory
- Emergency contacts, nearby hospitals
- Connect to `medical.routes.js` + `health.routes.js` API

#### [MODIFY] [forgot-password/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/forgot-password/page.js)
- Build OTP-based password reset flow
- Connect to auth API

#### [MODIFY] All remaining placeholder pages (carpool, equipment, donations, chef, community-hub, CRM, bills, volunteer, subscriptions, referral)

---

### Phase 3: 🟡 Role-Based Access & Dashboard System (Est: 6-8 hours)

#### [MODIFY] [auth.middleware.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/backend/src/middleware/auth.middleware.js)
- Add `FRANCHISE_OWNER` role
- Add `SOCIETY_GUARD`, `SOCIETY_ADMIN` roles
- Implement permission matrix per role

#### [MODIFY] [AuthContext.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/context/AuthContext.js) (Web)
- Complete role-switching with backend validation
- Route protection per role
- Auto-redirect to role-specific dashboard after login

#### [MODIFY] Franchise Dashboard pages (7 sub-pages)
- Build out all franchise sub-pages: agents, approvals, dashboard, posts, providers, revenue, shops, users
- Connect to `franchise.routes.js` + `territory.routes.js` APIs

#### [MODIFY] Web Admin Dashboard sub-pages (8 sub-pages)
- Build out all admin-dashboard sub-pages

#### [MODIFY] Service Provider Dashboard
- Build service dashboard at [service-dashboard/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/service-dashboard/page.js)
- Booking management, availability, earnings

---

### Phase 4: 🟡 Shop Category Management & Order Flow (Est: 6-8 hours)

#### [NEW] Missing Shop Dashboard Manager Components
- Create manager components for all 55 categories (templated approach based on business_model)
- Product categories → Inventory + Cart + Order management
- Appointment categories → Booking slots + Calendar management
- Hybrid categories → Both above

#### [MODIFY] [checkout/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/app/checkout/page.js)
- Remove "fallback simulate success" hack
- Implement proper error handling for failed orders
- Add Razorpay payment integration
- Add wallet payment flow
- Add coupon/promo code validation via API

#### [MODIFY] [cartStore.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/web/src/store/cartStore.js)
- Enhance cart with shop-level grouping
- Add quantity limits, stock validation
- Sync cart state with backend for logged-in users

#### [NEW] Returns & Disputes API endpoints
- POST `/api/v1/shops/:shopId/disputes` — Create dispute
- GET `/api/v1/shops/:shopId/disputes` — List disputes
- PUT `/api/v1/shops/:shopId/disputes/:id` — Resolve dispute

#### [NEW] OTP Delivery Verification
- POST `/api/v1/delivery/:orderId/verify-otp` — Customer verifies delivery with OTP

---

### Phase 5: 🟡 Admin Panel Enhancement (God Mode) (Est: 6-8 hours)

#### [MODIFY] [apps/admin/src/app/page.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/admin/src/app/page.js)
- **Split 81KB monolith** into lazy-loaded tab components
- Extract each tab into its own component file

#### [NEW] Admin Tab Components (Missing)
- FranchiseTab.js — Full franchise management
- ShopCategoriesTab.js — Category CRUD with icons
- ScrapTab.js — Scrap pickup management
- ChefTab.js — Tiffin/meal service management
- VolunteerTab.js — Volunteer management
- DonationsTab.js — Donation tracking
- BillsTab.js — Bill payment management
- PetTab.js — Pet community management
- CarpoolTab.js — Ride sharing management
- PropertiesTab.js — Real estate listings
- ReferralTab.js — Referral campaigns
- AdCampaignsTab.js — Ad management
- AuditLogTab.js — System audit logs viewer
- AnalyticsTab.js — Charts and graphs (using recharts)

---

### Phase 6: 🟡 Mobile Application Fixes (Est: 8-10 hours)

#### [MODIFY] [config/api.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/mobile/app/config/api.js)
- Add environment-based URL switching via expo-constants
- Add request retry logic with exponential backoff

#### [MODIFY] [_layout.js](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/apps/mobile/app/_layout.js)
- Fix import path inconsistencies (../src/context vs ./context)
- Add error boundary wrapper

#### [MODIFY] Mobile shop detail page
- Expand from 1784 bytes to full shop detail with products, reviews, booking

#### [MODIFY] Mobile manager module
- Replace "Coming Soon" with category-specific management screens

#### [DELETE] Duplicate directories
- Remove `community_hub/` (keep `community-hub/`)

#### [NEW] Deep linking configuration
- Configure linking for order tracking, shop sharing, referrals

#### [NEW] Offline mode implementation
- Cache critical data (shop list, user profile) with AsyncStorage
- Queue offline orders for sync when online

---

### Phase 7: 🟢 Production Deployment Preparation (Est: 4-6 hours)

#### [NEW] `.github/workflows/deploy.yml`
- CI/CD pipeline: lint → test → build → deploy

#### [MODIFY] [docker-compose.yml](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/docker-compose.yml)
- Add health checks
- Configure proper volumes for uploads
- Add Redis persistence

#### [MODIFY] [nginx.conf](file:///c:/localsampark%2017-07-2026/localsampark%2017-07-2026/nginx.conf)
- Add SSL termination
- Add gzip compression
- Add proper proxy headers

#### [NEW] Web app `.env.production`
- `NEXT_PUBLIC_API_URL=https://api.localsampark.in`

#### [NEW] Sentry error tracking integration
- Configure real Sentry DSN in backend
- Add Sentry to web app

#### [NEW] Database migration version tracking
- Add migrations tracking table
- Prevent re-running already applied migrations

#### [MODIFY] Background jobs
- Move `setInterval` jobs to BullMQ worker queues
- Add job monitoring dashboard

---

## Verification Plan

### Automated Tests
```bash
# Backend API tests
cd backend && npm test

# Check for syntax errors across all JS files
npx eslint apps/web/src --ext .js --no-eslintrc --rule '{"no-undef":"error","no-unused-vars":"warn"}'

# Build verification
cd apps/web && npm run build
cd apps/admin && npm run build
```

### Manual Verification
1. Start backend server and verify `/health` endpoint returns all services connected
2. Test complete user flow: Register → Browse shops → Add to cart → Checkout → Track delivery
3. Test admin panel: Login → Dashboard stats → Approve shop → Ban user → Toggle territory
4. Test mobile app: Build APK → Install → Login → Browse → Place order
5. Test all role dashboards: Shop owner, Delivery agent, Service provider, Franchise owner
6. Test real-time features: Order notifications via WebSocket, chat, delivery tracking
7. Verify all 37+ placeholder pages are replaced with functional UIs

### Production Readiness Checklist
- [ ] All environment variables configured
- [ ] CORS locked to production domains
- [ ] JWT secrets rotated
- [ ] SSL/HTTPS configured
- [ ] Database backed up
- [ ] Error tracking live
- [ ] Rate limiting per-endpoint
- [ ] Mobile APK signed for Play Store
- [ ] All "Coming Soon" pages replaced
