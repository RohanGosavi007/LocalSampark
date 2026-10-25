# Phase M4.2: Rider Fleet Design Specification (R1–R5)

**Date:** 2026-10-25  
**Milestone:** M4 (Operations)  
**Status:** Approved & Implementing  
**Branch:** `launch/ecommerce-v1`  

---

## 1. Overview & Objectives

Phase M4.2 establishes the delivery fleet operations subsystem for LocalSampark in Dhanori, Pune:
1. **R1: Rider Onboarding & KYC**: Comprehensive identity, vehicle RC, driving license, and bank account registration with private storage isolation (`StorageProvider`), short-lived signed URLs, and administrative verification with automatic role promotion.
2. **R2: Rider Duty Toggle & Live Geolocation**: Dynamic online/offline duty availability state machine, geofence validation against the Dhanori/Pune pilot zone, and real-time battery-aware GPS tracking with WebSocket broadcast.
3. **R3: Dispatch Queue & Auto-Assignment**: Spatial proximity-based dispatch queue (`geo.distanceKm`), atomic single-winner job acceptance, and floating cash limit lockouts.
4. **R4: Pickup & Delivery Verification**: State transitions (`assigned` -> `out_for_delivery` -> `delivered`), timing-safe handover OTP verification (`crypto.timingSafeEqual`), and rate-limited attempts.
5. **R5: COD Cash Ledger & Floating Cash Limits**: Real-time cash-in-hand tracking, double-sided ledger reconciliation (`rider_cash_ledger`), wallet self-settlement, and hub physical cash deposit logging.

---

## 2. Database Schema (Migration 131)

### `delivery_agents` extensions:
```sql
ALTER TABLE delivery_agents ADD COLUMN bank_account_number TEXT;
ALTER TABLE delivery_agents ADD COLUMN bank_ifsc TEXT;
ALTER TABLE delivery_agents ADD COLUMN bank_account_name TEXT;
ALTER TABLE delivery_agents ADD COLUMN aadhaar_image_url TEXT;
ALTER TABLE delivery_agents ADD COLUMN rejection_reason TEXT;
```

---

## 3. Detailed Component Architecture

### 3.1 R1: Onboarding, KYC & Profile
- `POST /delivery/onboarding`:
  - Accepts: `vehicleType`, `vehicleNumber`, `dlNumber`, `aadharNumber`, `rcNumber`, `bankAccountNumber`, `bankIfsc`, `bankAccountName`, `profileImageUrl`, `dlImageUrl`, `rcImageUrl`, `aadhaarImageUrl`.
  - Format validation: Aadhaar (12 digits), DL, RC, IFSC (`/^[A-Z]{4}0[A-Z0-9]{6}$/`), vehicle type.
  - Inserts or updates `delivery_agents` with `kyc_status = 'pending'`.
- `GET /delivery/profile`:
  - Returns agent profile, masked bank details, `kyc_status`, `cash_in_hand`, and duty status.
- `PUT /admin/delivery/agents/:id/kyc`:
  - Admin review: `approved`, `rejected`, `resubmission`.
  - On `approved`: sets `kyc_status = 'approved'` and updates `users.role = 'delivery_agent'`.
  - On `rejected`/`resubmission`: records `rejection_reason`.

### 3.2 R2: Duty Toggle & Location Tracking
- `PUT /delivery/duty`:
  - Validates `req.rider.kyc_status` is approved (`['active', 'approved', 'verified']`).
  - Cash limit check: if `is_online = true` and `cash_in_hand >= rider_cash_limit`, rejects with 409 `CASH_LIMIT_REACHED`.
  - Geofence check: verifies `lat` (~18.45 to 18.70) and `lng` (~73.75 to 74.00) are within pilot boundary.
  - Updates `is_online = true/false`, `status = 'available'/'offline'`.
- `POST /delivery/location`:
  - Ingests `{ latitude, longitude, batteryLevel, orderId }`.
  - Updates `delivery_agents.current_lat`, `current_lng`, and `coordinate`.
  - Records into `live_tracking` and emits `RIDER_LOCATION_UPDATE` to WebSocket room.

### 3.3 R3: Spatial Dispatch & Job Acceptance
- `GET /delivery/jobs`:
  - Available query: `LOWER(order_status) = 'ready' AND assigned_agent_id IS NULL AND LOWER(fulfillment_method) = 'delivery'`.
  - Proximity sort: calculates Haversine distance from rider coordinates to pickup shop.
- `POST /delivery/jobs/:jobId/accept`:
  - Checks if COD: verifies rider cash limit.
  - Atomic update: `UPDATE orders SET assigned_agent_id = $1, order_status = 'assigned' WHERE id = $2 AND assigned_agent_id IS NULL AND LOWER(order_status) = 'ready'`.
  - Updates rider status `delivery_agents.status = 'on_delivery'`.
- `POST /delivery/jobs/:jobId/reject`:
  - Releases order back to pool (`assigned_agent_id = NULL, order_status = 'ready'`).

### 3.4 R4: Pickup & Timing-Safe Handover
- `POST /delivery/jobs/:jobId/pickup`:
  - Transitions `assigned` -> `out_for_delivery`.
- `POST /delivery/jobs/:jobId/complete`:
  - Verifies handover code against `orders.otp_code` with `crypto.timingSafeEqual`.
  - Atomic transition `orders.order_status = 'delivered'`.
  - Executes `lifecycle.recordDelivery`: credits rider earnings to wallet, and if COD, adds cash to `delivery_agents.cash_in_hand` and logs `rider_cash_ledger` entry.
  - Updates rider status back to `'available'`.

### 3.5 R5: COD Cash Management & Hub Reconciliation
- `GET /delivery/cash`:
  - Returns `cashInHand`, `limit`, and recent ledger history.
- `POST /delivery/cash/settle`:
  - Debits wallet balance and reduces `cash_in_hand`.
- `POST /admin/delivery/agents/:id/cash-deposit`:
  - Hub manager records physical cash deposit, decrements `cash_in_hand`, and inserts `deposited` entry into `rider_cash_ledger`.

---

## 4. Verification Plan
- Author unit/integration test suite: `backend/src/__tests__/unit/riderFleet.test.js`.
- Execute on both SQLite and PostgreSQL.
- Run verify-all gates: G1, G4, G5, G6, G15.
