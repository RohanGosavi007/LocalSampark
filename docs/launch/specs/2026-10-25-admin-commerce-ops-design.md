# Phase M4.3: Admin Commerce Ops Technical Specification (A1–A14)

**Status:** DRAFT (Under Review)  
**Author:** AI Pair Programmer & Lead Engineer  
**Date:** 2026-10-25  
**Branch:** `launch/ecommerce-v1`  
**Target Milestone:** M4 Operations (Phase M4.3)

---

## 1. Executive Summary & Architectural Goals

Phase M4.3 delivers the administrative commerce command center (`admin-commerce.routes.js`), consolidating operations into a modular architecture mounted under `/admin/commerce` with RBAC protection, dual-engine PostgreSQL + SQLite parity, and statutory compliance (India E-Commerce Rules 2020 & GST Section 52 TCS).

The design satisfies all 14 target capabilities:
- **`A1`**: Admin Commerce KPI Dashboard (live aggregations: GMV, order volume, AOV, cancellations, active shops/riders).
- **`A2`**: Admin Store & Seller Governance (KYC queue, statutory review, emergency store suspension).
- **`A3`**: Admin Catalog Moderation & Categories (global taxonomy CRUD, restricted goods rules: alcohol/tobacco/weapons).
- **`A4`**: Admin Order Operations & Interventions (multi-filter search, timeline, force-cancel, refund, reassign, SLA breach alerts).
- **`A5`**: Admin Returns & Dispute Resolution Queue (customer photo review, seller statement, double-entry ledger adjustment).
- **`A6`**: Admin Payouts & Commission Configuration (0% launch commission default, per-shop overrides, payout batches).
- **`A7`**: Admin Promotions, Campaigns & CMS (coupons, homepage banner CMS, featured placement).
- **`A8`**: Admin RBAC & Immutable Audit Log (least privilege guards, `admin_audit_log` records with IP and diff).
- **`A9`**: Admin Serviceability Zones (geofences, pilot zone toggle, unserviceable waitlist export).
- **`A10`**: Admin Delivery Fleet & Cash Reconciliation (live fleet monitor, COD cash summary, hub deposit reconciliation).
- **`A11`**: Admin Grievance & Support Management (hybrid: standard support tickets + statutory grievance register with 48h acknowledgement SLA and 30-day resolution tracking).
- **`A12`**: Admin Feature Flags & Vertical Kill Switches (`platformConfig` database persistence and runtime middleware sync).
- **`A13`**: Admin Financial & Tax Report Exports (hybrid format: standard CSV orders vs GST Section 52 TCS 1% CA audit report).
- **`A14`**: Admin Broadcast Notifications (zone/role-targeted push announcements).

---

## 2. Router & Controller Modular Architecture

Instead of bloating the existing legacy `admin.routes.js`, all commerce operations are housed in a dedicated modular router:
```
backend/src/modules/crm/
├── routes/
│   ├── admin-commerce.routes.js     # Unified entry point mounted at /admin/commerce
│   └── ...
├── controllers/
│   └── admin-commerce.controller.js # Cohesive operational controller handling A1–A14
└── services/
    ├── adminAudit.service.js        # Helper for immutable admin_audit_log entries
    └── adminReporting.service.js    # Generates standard & statutory GST TCS CSV streams
```

Mounted on Express in `backend/src/server.js`:
```javascript
app.use('/admin/commerce', authenticate, requireAdmin, adminCommerceRouter);
```

---

## 3. Subsystem Breakdown (A1–A14)

### A1: Admin Commerce KPI Dashboard
- **Route:** `GET /admin/commerce/kpis`
- **Data Source:** Live database queries across `orders`, `local_shops`, `delivery_agents`, `users`.
- **Calculations:**
  - `gmv`: `SUM(total_amount)` where `order_status != 'cancelled'`.
  - `total_orders`: Count of all orders.
  - `completed_orders`: Count of orders with `order_status = 'delivered'`.
  - `cancelled_orders`: Count of orders with `order_status = 'cancelled'`.
  - `cancellation_rate`: `cancelled_orders / total_orders` (0 if total is 0).
  - `aov`: `gmv / non_cancelled_orders`.
  - `active_shops`: `COUNT(*)` from `local_shops` where `is_active = true` and `is_verified = true`.
  - `active_riders`: `COUNT(*)` from `delivery_agents` where `is_online = true`.
  - `total_customers`: `COUNT(*)` from `users` where `role = 'user'`.

### A2: Admin Store & Seller Governance
- **Routes:**
  - `GET /admin/commerce/shops`: List shops with filters (`approval_status`, `is_active`, search).
  - `PUT /admin/commerce/shops/:id/status`: Update status (`approval_status: 'approved'|'rejected'`, `is_active: true|false`, `reason`).
  - `PUT /admin/commerce/shops/:id/suspend`: Emergency kill-switch suspending shop and deactivating listings.
  - `GET /admin/commerce/kyc/pending`: Pending seller KYC reviews with signed document URLs (10m TTL).
  - `PUT /admin/commerce/kyc/:id/review`: Approve, reject, or request resubmission.

### A3: Admin Catalog Moderation & Categories
- **Routes:**
  - `GET /admin/commerce/categories`: List category taxonomy.
  - `POST /admin/commerce/categories`: Create category (validates slug, name, icon).
  - `PUT /admin/commerce/categories/:id`: Update category details.
  - `DELETE /admin/commerce/categories/:id`: Soft-delete / deactivate category.
  - `GET /admin/commerce/products/moderation`: Moderation queue for flagged items.
  - `PUT /admin/commerce/products/:id/moderation`: Approve or reject product listing with reason.
- **Restricted Goods Engine:**
  - Server-side validation rule blocking prohibited keywords and categories (e.g., alcohol, tobacco, weapons, controlled pharmaceuticals).

### A4: Admin Order Operations & Emergency Interventions
- **Routes:**
  - `GET /admin/commerce/orders`: Multi-parameter search (query, status, shopId, customerId, date range, pagination).
  - `GET /admin/commerce/orders/:id/timeline`: Chronological timeline (order created -> accepted -> ready -> assigned -> out_for_delivery -> delivered/cancelled) with assigned rider.
  - `POST /admin/commerce/orders/:id/cancel`: Force cancel with mandatory reason. Triggers stock restitution via `restoreStock` and customer refund.
  - `POST /admin/commerce/orders/:id/refund`: Admin manual refund executing wallet credit / payment refund and double-entry ledger adjustment.
  - `POST /admin/commerce/orders/:id/reassign`: Reassign order to specific rider or reset to ready pool.
  - `GET /admin/commerce/orders/sla-breaches`: Lists orders exceeding operational SLAs:
    - Kitchen prep SLA: `confirmed` > 30 minutes without moving to `ready`.
    - Delivery dispatch SLA: `ready` > 15 minutes without rider assignment.
    - Delivery transit SLA: `out_for_delivery` > 45 minutes without completion.

### A5: Admin Returns & Dispute Resolution Queue
- **Routes:**
  - `GET /admin/commerce/disputes`: List disputes with status filter (`open`, `investigating`, `resolved`, `rejected`).
  - `GET /admin/commerce/disputes/:id`: Dispute details with order snapshot, customer proof photos, shop statements.
  - `PUT /admin/commerce/disputes/:id/resolve`: Resolve dispute (`resolution: 'refund_customer'|'reject'|'merchant_compensated'`).
    - If refund: executes `payments.creditWallet` and records `platform_ledger_entries`.

### A6: Admin Payouts & Commission Configuration
- **Routes:**
  - `GET /admin/commerce/commission`: Returns global commission rate (`platformConfig.get('default_commission_percent')`).
  - `PUT /admin/commerce/commission`: Updates global rate (validates 0–50%).
  - `PUT /admin/commerce/shops/:id/commission`: Sets per-shop custom commission override.
  - `GET /admin/commerce/payouts/pending`: Pending merchant payout balances calculated from double-entry ledger.
  - `POST /admin/commerce/payouts/batch-process`: Processes payout batch with idempotent transaction tracking.

### A7: Admin Promotions, Campaigns & CMS
- **Routes:**
  - `GET /admin/commerce/coupons`: List all platform coupons.
  - `POST /admin/commerce/coupons`: Create new coupon with discount type, cap, min order amount, start/end dates.
  - `PUT /admin/commerce/coupons/:id/toggle`: Enable / disable coupon.
  - `GET /admin/commerce/banners`: List active homepage banners.
  - `POST /admin/commerce/banners`: Create promotional banner with image URL, title, link, priority.
  - `DELETE /admin/commerce/banners/:id`: Remove banner.
  - `PUT /admin/commerce/shops/:id/featured`: Toggle featured shop placement.

### A8: Admin RBAC & Immutable Audit Log
- **Middleware:** `requirePermission(perm)` / Role-Based Access Control enforcing least privilege across roles (`super_admin`, `admin`, `support`, `finance`).
- **Audit Logger:** `recordAudit(req, { action, targetType, targetId, details })` inserting into `admin_audit_log` with IP address, timestamp, and details JSON.
- **Route:** `GET /admin/commerce/audit-logs`: Paged audit trail queryable by admin ID, action, or date range.

### A9: Admin Serviceability Zones
- **Routes:**
  - `GET /admin/commerce/zones`: List operational zones (including Dhanori/Pune pilot zone).
  - `POST /admin/commerce/zones`: Create zone with center coordinates, radius (km), or polygon boundaries.
  - `PUT /admin/commerce/zones/:id/toggle`: Activate/deactivate zone.
  - `GET /admin/commerce/zones/waitlist`: View unserviceable customer waitlist signups.
  - `GET /admin/commerce/zones/waitlist/export`: CSV export of waitlist leads for geographical expansion planning.

### A10: Admin Delivery Fleet & Cash Reconciliation
- **Routes:**
  - `GET /admin/commerce/fleet/live`: Live fleet map feed with rider GPS coordinates, battery levels, online status, and active delivery jobs.
  - `GET /admin/commerce/fleet/cash-summary`: Reconciles total cash held across all riders vs floating limit thresholds.
  - `POST /admin/commerce/fleet/:riderId/deposit-cash`: Admin hub cash deposit reconciliation.

### A11: Admin Grievance & Support Management (Hybrid)
- **Routes:**
  - `GET /admin/commerce/grievances`: Paged list with filter `type: 'all' | 'support' | 'statutory_grievance'`.
  - `POST /admin/commerce/grievances`: Create ticket with statutory classification.
  - `PUT /admin/commerce/grievances/:id`: Update ticket status, resolution, or assign Grievance Officer.
  - `GET /admin/commerce/grievances/statutory-register`: Statutory report with 48-hour acknowledgement SLA status and 30-day resolution tracking complying with India Consumer Protection (E-Commerce) Rules 2020.

### A12: Admin Feature Flags & Vertical Kill Switches
- **Routes:**
  - `GET /admin/commerce/feature-flags`: Returns all system feature flags (`COMMERCE_ENABLED`, `SOCIETY_ENABLED`, `CARPOOL_ENABLED`, `JOBS_ENABLED`, `KRISHI_ENABLED`, `SOS_ENABLED`).
  - `PUT /admin/commerce/feature-flags`: Atomically updates flag state in `platformConfig` and synchronizes runtime middleware.

### A13: Admin Financial & Tax Report Exports (Dual Format)
- **Routes:**
  - `GET /admin/commerce/reports/orders/export`: Query parameter `format`:
    - `format=standard`: Standard CSV export with Order ID, Date, Shop, Customer, Subtotal, Delivery Fee, Total, Payment Method, Status.
    - `format=tcs_statutory`: GST Section 52 Tax Collected at Source (TCS) CSV export for Chartered Accountants:
      - Shop Name, Shop Legal Name, GSTIN, PAN.
      - Gross Value of Taxable Supplies (₹).
      - Value of Returned Supplies (₹).
      - Net Taxable Value of Supplies (₹).
      - TCS Rate (1% total: 0.5% CGST + 0.5% SGST or 1% IGST).
      - TCS Amount Collected (₹).

### A14: Admin Broadcast Notifications
- **Route:** `POST /admin/commerce/broadcasts`:
  - Payload: `{ title, body, targetZoneId, targetRole, actionUrl }`.
  - Queries target users within the geofenced region and dispatches push notifications via Firebase Admin SDK / WebSocket notifications room.

---

## 4. Database Migrations & Schemas

To support A9 (waitlist signups) and A7 (CMS banners), migration `132_admin_commerce_ops.sql` (and SQLite twin `132_admin_commerce_ops.sqlite.sql`) adds:
```sql
CREATE TABLE IF NOT EXISTS platform_banners (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    action_url TEXT,
    placement TEXT DEFAULT 'home_top',
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS unserviceable_waitlist (
    id TEXT PRIMARY KEY,
    phone_number TEXT,
    email TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    pincode TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE support_tickets ADD COLUMN is_statutory BOOLEAN DEFAULT false;
ALTER TABLE support_tickets ADD COLUMN acknowledged_at TIMESTAMPTZ;
ALTER TABLE support_tickets ADD COLUMN grievance_officer TEXT;
```

---

## 5. Verification Plan

A comprehensive test suite `backend/src/__tests__/unit/adminCommerceOps.test.js` covering all 14 capabilities:
- `[A1.1]` KPI Dashboard: live aggregations matching actual orders and shops, zero placeholders.
- `[A2.1]` Store Governance: store suspension and approval toggle.
- `[A3.1]` Category & Catalog: category taxonomy CRUD and restricted goods validation rule.
- `[A4.1]` Order Operations: multi-filter search, timeline, and SLA breach alert detection.
- `[A4.2]` Emergency Interventions: force cancellation with reason and manual refund.
- `[A5.1]` Dispute Resolution: dispute adjudication and refund ledger adjustment.
- `[A6.1]` Commission & Payouts: global 0% launch rate, per-shop override, and payout batch review.
- `[A7.1]` Promotions & CMS: coupon creation and homepage banner management.
- `[A8.1]` RBAC & Audit Logs: role protection and immutable audit trail verification.
- `[A9.1]` Serviceability Zones: geofence zone activation and waitlist capture/export.
- `[A10.1]` Fleet & Cash Reconciliation: live fleet status and daily cash summary.
- `[A11.1]` Grievance Management: hybrid support & statutory 48h acknowledgement SLA tracking.
- `[A12.1]` Feature Flags: platform feature flag updates and kill-switch verification.
- `[A13.1]` Reports & Tax Exports: dual-format export (standard CSV and GST TCS Section 52).
- `[A14.1]` Broadcasts: geo-targeted notification dispatch.

Dual-engine verification: 100% pass on both SQLite (`test.db`) and local PostgreSQL.
Verification gates: G1, G4, G5, G6, G15 clean pass.
