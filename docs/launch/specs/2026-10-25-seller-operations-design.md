# Specification: Phase M4.1 Seller Operations Hub (S1, S2, S3, S4)

**Status:** APPROVED FOR IMPLEMENTATION  
**Branch:** `launch/ecommerce-v1`  
**Milestone:** M4 (Operations) — Phase M4.1  
**Scope:** Hyperlocal Multi-Vendor E-Commerce Platform (Dhanori, Pune Pilot)  
**Author:** Antigravity Agent  
**Date:** 2026-10-25  

---

## 1. Executive Summary

Phase M4.1 establishes the core operations hub for local sellers on LocalSampark, covering:
1. **S1: Seller Onboarding & Digital KYC:** Identity verification (PAN, Aadhaar), statutory trade compliance (FSSAI for food shops, GSTIN), bank/UPI payout credentials, secure private storage isolation with signed URL access (N3), and admin approval lifecycle (`pending`, `submitted`, `verified`, `rejected`, `resubmission`).
2. **S2: Seller Catalog & Inventory Availability:** Real-time one-tap product/variant availability toggles, stock quantity adjustments, and low-stock alert monitoring for kitchen/store managers.
3. **S3: Seller Kitchen Display & Order Handling:** Kitchen display order workflow (`pending` -> `confirmed` / `cancelled` with mandatory reason code -> `preparing` -> `ready` -> `out_for_delivery` / `delivered`), real-time socket events, and 80mm ESC/POS monospace thermal packing slip generation.
4. **S4: Seller Financials & Launch Settlements:** 0% launch commission enforcement in platform configuration, daily settlement reconciliation (gross item sales, delivery fees, COD cash reconciliation), double-entry ledger integration (`platform_ledger_entries`), and downloadable CSV statements.

---

## 2. Architecture & Detailed Design

### 2.1 S1: Seller Digital KYC & Storage Architecture
- **Data Model:** `vendor_kyc` table backing all merchant compliance records with foreign keys to `local_shops(id)` and `users(id)`.
- **Private Document Storage (N3):**
  - KYC documents (PAN card, Aadhaar, FSSAI certificate, bank cheque) are stored in private storage (`private_uploads/documents/` or S3 private bucket).
  - Public URLs are never exposed for KYC records. When queried by authorized shop owners or administrators, short-lived signed URLs (10-minute expiry) are generated via `storage.getSignedUrl(key)` / `upload.service.js signedLink()`.
- **Status Lifecycle:**
  ```mermaid
  stateDiagram-v2
    [*] --> pending
    pending --> submitted: Vendor uploads docs & bank details
    submitted --> verified: Admin approves
    submitted --> rejected: Admin rejects with reason
    submitted --> resubmission: Admin requests corrections
    rejected --> submitted: Vendor re-uploads documents
    resubmission --> submitted: Vendor updates flagged fields
    verified --> [*]: Shop activated (is_verified = true)
  ```
- **Endpoints:**
  - `POST /shops/:shopId/kyc`: Submit/resubmit KYC details.
  - `GET /shops/:shopId/kyc`: Fetch status with signed document URLs (owner/admin only).
  - `PUT /shops/admin/:kycId/review` & `PUT /admin/kyc/:kycId/review`: Approve (`verified`), reject (`rejected`), or request resubmission (`resubmission`).
  - `GET /shops/admin/pending` & `GET /admin/kyc/pending`: Paginated queue of pending submissions.

---

### 2.2 S2: Catalog Inventory Availability & Low-Stock Alerts
- **One-Tap Availability Toggle:**
  - `PATCH /shops/:shopId/products/:productId/availability`
  - Body: `{ is_active: boolean, inventory_count?: number }`
  - Synchronously updates product state and emits event or returns updated payload.
- **Low-Stock Alert Feed:**
  - `GET /shops/:shopId/products/low-stock?threshold=5`
  - Identifies active catalog products and variants where `inventory_count <= threshold`.
  - Enables instant replenishment alerts on the seller dashboard.

---

### 2.3 S3: Kitchen Display Order Flow & Thermal Packing Slip
- **Order Handling Actions:**
  - `PUT /orders/:orderId/accept`:
    - Moves order from `pending` -> `confirmed`.
    - Broadcasts `ORDER_STATUS_UPDATED` event to socket rooms.
  - `PUT /orders/:orderId/reject`:
    - Validates mandatory `reason` or `reason_code` in request body.
    - Transitions order from `pending` -> `cancelled`.
    - If paid online, triggers refund flow via `orderLifecycle.service.js`.
  - `PUT /orders/:orderId/status`:
    - Existing milestone progression (`preparing` -> `ready` -> `out_for_delivery` / `delivered`).
- **80mm ESC/POS Thermal Packing Slip:**
  - `GET /orders/:orderId/packing-slip?format=text|json|html`
  - Generates standardized monospace 48-column thermal slip containing:
    - Shop Name, Address, Contact, FSSAI / GSTIN
    - Order ID, Date & Time, Customer Name, Address, Phone
    - Line Items with variant details, quantities, unit prices, and amounts
    - Subtotal, Delivery Fee, Taxes, Total Amount Due
    - Payment Mode (COD / Paid Online) with prominent COD cash collection warning

---

### 2.4 S4: Seller Financials & 0% Launch Commission
- **0% Commission Enforcement:**
  - In `backend/src/services/platformConfig.service.js`, `default_commission_percent` default is changed from `5` to `0`.
  - Configurable in future via `admin_config` (range: 0% to 50%).
- **Settlement Statement Endpoint:**
  - `GET /shops/:shopId/settlements/statement`:
    - Computes net balance from double-entry ledger `platform_ledger_entries` for `account_type = 'SELLER_PAYABLE'` and `account_id = shopId`.
    - Aggregates completed/delivered orders:
      - Total Gross Sales (paise & rupees)
      - Delivery Fees (allocated based on self-delivery vs platform rider)
      - Platform Commission (0.00)
      - Payment Gateway Fees
      - COD Cash Collected by Shop (deducted from payout)
      - Net Settlement Amount
  - `GET /shops/:shopId/settlements/statement/csv`:
    - Downloadable CSV format for accounting and tax reconciliation.

---

## 3. Verification Plan & Test Matrix

| ID | Test Case | Target Service / Endpoint | Verification Criteria |
|---|---|---|---|
| `[S1.1]` | KYC submission & signed doc URLs | `vendor-kyc.routes.js` | Docs stored, signed URLs generated, admin review state transitions |
| `[S2.1]` | Inventory availability & alerts | `shop.routes.js` | Availability toggle updates active status; low-stock query returns items below threshold |
| `[S3.1]` | Kitchen display accept/reject | `order.routes.js` | Order accept confirms; reject requires mandatory reason and cancels |
| `[S3.2]` | 80mm thermal packing slip | `order.routes.js` | Formats 48-char monospace ESC/POS slip with itemized details |
| `[S4.1]` | 0% commission & settlement statement | `payout.routes.js` / `ledger.service.js` | Verifies 0% commission default, aggregates ledger balance and exports CSV |

All tests will run against both SQLite (`test.db`) and local PostgreSQL (`127.0.0.1:5432/localsampark`).
