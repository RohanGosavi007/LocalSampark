# Technical Design Specification: Milestone M5 (After-Order Experience)

- **Date:** 2026-10-25
- **Branch:** `launch/ecommerce-v1`
- **Milestone:** M5 (After-Order Experience)
- **Target Capabilities:** `C10 / S5`, `C11 / S6`, `C12 / S7`, `C13 / N7`, `C14`

---

## 1. Problem Statement & Scope

Following order placement, preparation, and delivery (Milestones M3 and M4), customers and sellers require a robust, transparent, and legally compliant post-delivery operational hub:
1. **`C10 / S5` Real-Time Delivery Tracking & Milestone Progression:** Customers must track the progression of their order with live delivery status and rider geolocation sync across both WebSocket connections and resilient REST polling.
2. **`C11 / S6` Post-Delivery Returns, Replacements & Multi-Tier Refund Approval:** Customers must be able to initiate returns or report damaged/missing items within a category-aware return window (48h default for food/grocery/perishables; up to 7 days for general retail). Approved refunds must follow a verified multi-tier workflow where Admin, Territory Admin, or Franchise Owner review evidence and authorize disbursal:
   - **Online payments (Razorpay):** Refunded to source payment instrument.
   - **COD orders:** Refunded immediately to the customer's LocalSampark Wallet.
   - All movements recorded in the double-entry platform payments ledger.
3. **`C12 / S7` Verified Buyer Review Engine & Seller Reply Workflows:** Review submissions must be restricted strictly to authenticated customers who have a confirmed `delivered` order from that shop (compliance with Consumer Protection E-Commerce Rules 2020 prohibiting fake/unverified reviews). Shop ratings must update automatically as an average of approved reviews, and shop owners must be able to post official seller responses.
4. **`C13 / N7` GST Section 31 Tax Invoice Download:** Customers and sellers must be able to view and download a GST-compliant tax invoice in PDF format featuring shop details, customer details, itemized HSN/SAC breakdowns, taxes (CGST, SGST, IGST), delivery fees, and statutory legal disclaimers.
5. **`C14` In-App Support & Statutory Grievance Redressal:** In-app ticket creation linked to orders, featuring automatic 48-hour statutory acknowledgement tracking and a 30-day resolution countdown with designated Grievance Officer attribution.

---

## 2. System Architecture & Component Interactions

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    actor Seller
    actor Admin as Admin / Territory / Franchise
    participant API as Express Router (/orders, /trust-reviews, /support)
    participant Svc as AfterOrder Services
    participant DB as Postgres / SQLite
    participant WS as WebSocket Rooms
    participant Ledger as Double-Entry Ledger

    %% Tracking
    Customer->>API: GET /orders/:id/tracking
    API->>DB: Query order status & rider current_lat/current_lng
    API-->>Customer: Return milestones, ETA, and rider coordinates
    Note over Customer,WS: Also listens to RIDER_LOCATION_UPDATE over WebSocket

    %% Returns & Refunds
    Customer->>API: POST /orders/:id/returns (reason, items, photos)
    API->>DB: Validate order is DELIVERED and within 48h/7d window
    API->>DB: Insert into order_returns (status: pending_review)
    API-->>Customer: Return request submitted (Pending Review)

    Admin->>API: GET /orders/returns/pending-review
    API->>DB: Fetch pending returns with photo proof & order details
    Admin->>API: PUT /orders/returns/:returnId/verify (action: approve/reject)
    API->>Svc: Process Verified Refund
    alt Online Order (Razorpay)
        Svc->>API: Trigger Source Gateway Refund
    else COD Order
        Svc->>DB: Credit Customer Wallet Balance
    end
    Svc->>Ledger: Record Double-Entry Refund Transaction
    Svc->>DB: Update order_returns status -> verified_approved / refund_completed

    %% Reviews
    Customer->>API: POST /orders/:id/review (rating 1-5, comment, media)
    API->>DB: Verify customer has delivered order
    API->>DB: Insert into trust_reviews
    API->>DB: Recalculate local_shops.rating average
    Seller->>API: POST /trust-reviews/:id/reply (comment)
    API->>DB: Record seller_reply_text & seller_replied_at

    %% Invoice
    Customer->>API: GET /orders/:id/invoice/pdf
    API->>Svc: streamInvoicePdf(orderId, res)
    Svc-->>Customer: Stream A4 Tax Invoice PDF (pdfkit)
```

---

## 3. Database Schema Design (Migration 133)

### 3.1 Migration File: `133_after_order_experience.sql` (PostgreSQL)
```sql
-- 1. Order Returns & Refunds Table
CREATE TABLE IF NOT EXISTS order_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES local_shops(id) ON DELETE CASCADE,
    return_type TEXT NOT NULL DEFAULT 'return', -- 'return', 'replacement', 'cancellation_refund'
    reason TEXT NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    evidence_urls JSONB DEFAULT '[]'::jsonb,
    refund_amount NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_review', -- 'pending_review', 'verified_approved', 'rejected', 'refund_completed'
    rejection_reason TEXT,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_role TEXT,
    verification_notes TEXT,
    verified_at TIMESTAMPTZ,
    refund_channel TEXT, -- 'wallet', 'source_gateway'
    refund_reference_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_returns_order ON order_returns(order_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_shop ON order_returns(shop_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_status ON order_returns(status, created_at DESC);

-- 2. Extend trust_reviews with order_id and seller reply
ALTER TABLE trust_reviews ADD COLUMN IF NOT EXISTS order_id TEXT REFERENCES orders(id) ON DELETE SET NULL;
ALTER TABLE trust_reviews ADD COLUMN IF NOT EXISTS seller_reply_text TEXT;
ALTER TABLE trust_reviews ADD COLUMN IF NOT EXISTS seller_replied_at TIMESTAMPTZ;

-- 3. Extend orders with return status tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_status TEXT DEFAULT NULL;
```

### 3.2 Migration File: `133_after_order_experience.sqlite.sql` (SQLite Twin)
```sql
CREATE TABLE IF NOT EXISTS order_returns (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_id TEXT NOT NULL REFERENCES local_shops(id) ON DELETE CASCADE,
    return_type TEXT NOT NULL DEFAULT 'return',
    reason TEXT NOT NULL,
    items TEXT DEFAULT '[]',
    evidence_urls TEXT DEFAULT '[]',
    refund_amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_review',
    rejection_reason TEXT,
    verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    verified_role TEXT,
    verification_notes TEXT,
    verified_at TEXT,
    refund_channel TEXT,
    refund_reference_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_returns_order ON order_returns(order_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_shop ON order_returns(shop_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_status ON order_returns(status, created_at);

ALTER TABLE trust_reviews ADD COLUMN order_id TEXT;
ALTER TABLE trust_reviews ADD COLUMN seller_reply_text TEXT;
ALTER TABLE trust_reviews ADD COLUMN seller_replied_at TEXT;

ALTER TABLE orders ADD COLUMN return_status TEXT;
```

---

## 4. API Endpoints Specification

### 4.1 Real-Time Delivery Tracking (`C10 / S5`)
- `GET /orders/:id/tracking`:
  - **Auth:** Authenticated customer who owns the order, assigned rider, or admin staff.
  - **Response:**
    - `milestones`: ordered list with timestamp and status (`confirmed`, `preparing`, `assigned`, `out_for_delivery`, `delivered`).
    - `currentStatus`: latest order status.
    - `rider`: `{ name, phone, vehicleType, vehicleNumber, currentLat, currentLng, lastUpdated }` (only populated once assigned).
    - `destination`: `{ address, lat, lng }`.
    - `etaMinutes`: estimated delivery arrival minutes based on distance.

### 4.2 Returns & Refunds (`C11 / S6`)
- `POST /orders/:id/returns`:
  - **Auth:** Customer who owns the order.
  - **Validation:** Order must be `delivered`; current time must be within return window (48h for perishable/grocery, 7d for non-perishable). Mandatory reason string and photo evidence URLs.
  - **Action:** Inserts `order_returns` in `pending_review` state; updates `orders.return_status = 'return_requested'`.
- `GET /orders/returns/pending-review`:
  - **Auth:** Super Admin, Territory Admin, or Franchise Owner.
  - **Query Params:** `status`, `shopId`, `limit`, `offset`.
  - **Response:** List of return cases with photo evidence, order items, customer details, and seller notes.
- `PUT /orders/returns/:returnId/verify`:
  - **Auth:** Super Admin, Territory Admin, or Franchise Owner.
  - **Body:** `{ action: 'approve' | 'reject', rejectionReason, notes }`.
  - **Action on Approve:** 
    - Online orders: refund source transaction.
    - COD orders: credit customer wallet (`wallets.balance = balance + refund_amount`).
    - Records double-entry platform ledger entry (`platform_ledger_entries`).
    - Updates `order_returns.status = 'verified_approved'`, `orders.return_status = 'refunded'`, `orders.payment_status = 'refunded'`.

### 4.3 Verified Buyer Reviews (`C12 / S7`)
- `POST /orders/:id/review`:
  - **Auth:** Authenticated customer who placed the order.
  - **Validation:** Order must be `delivered`. Rating must be integer 1 to 5. Check duplicate review for same order.
  - **Action:** Inserts into `trust_reviews` with `is_verified_buyer = true`. Recomputes `local_shops.rating = AVG(rating)`.
- `POST /trust-reviews/:reviewId/reply`:
  - **Auth:** Owner of the shop reviewed or Admin.
  - **Body:** `{ replyText }`.
  - **Action:** Sets `seller_reply_text = replyText` and `seller_replied_at = NOW()`.

### 4.4 Tax Invoices (`C13 / N7`)
- `GET /orders/:id/invoice`:
  - **Auth:** Customer who placed the order, shop owner, or Admin.
  - **Response:** Structured JSON tax invoice data from `shop_invoices`.
- `GET /orders/:id/invoice/pdf`:
  - **Auth:** Customer who placed the order, shop owner, or Admin.
  - **Response:** Binary streaming response (`Content-Type: application/pdf`) streaming A4 Tax Invoice PDF rendered with `pdfkit`.

### 4.5 In-App Support & Statutory Grievance (`C14`)
- `POST /orders/:id/support`:
  - **Auth:** Authenticated customer.
  - **Body:** `{ subject, description, category, isStatutory }`.
  - **Action:** Creates `support_tickets` row linked to order. If `isStatutory=true`, automatically sets statutory 48h acknowledgement SLA and calculates 30-day resolution due date.
- `GET /support/tickets/:id`:
  - **Auth:** Ticket creator or Admin.
  - **Response:** Ticket details, statutory acknowledgement status, grievance officer name, and timeline log.

---

## 5. Verification Strategy & Dual-Engine Parity

- Test file: `backend/src/__tests__/unit/afterOrderExperience.test.js`.
- All tests run against:
  1. Local SQLite (`localsampark.db` / `test.db`).
  2. Local PostgreSQL 18.6 (`postgresql://postgres:postgres@127.0.0.1:5432/localsampark`).
- Verification harness:
  - Gate G1 (Backend ESLint)
  - Gate G4 (Migrations & Seed Idempotency)
  - Gate G5 (Route-Auth Matrix)
  - Gate G6 (Concurrency & Idempotency)
  - Gate G15 (Launch Policy Verification)
