# LocalSampark Launch Program v2 — Architecture & Product Decisions (DECISIONS.md)

This ledger tracks the eight key decision points (D1-D8) defined in Ground Rules Section 2D. Work proceeds immediately using the specified defaults while awaiting explicit owner overrides.

---

### Decision D1: Launch Scope & Active Verticals
- **Question:** Which verticals and business models are active at launch?
- **Default (Applied):**
  - **Model:** Hyperlocal multi-vendor marketplace. Local neighbourhood shops sell to nearby residents. 0% commission, 0 platform fees, 0 ads, free seller listing, per-shop delivery fees (default 0).
  - **Pilot Zone:** Dhanori, Pune.
  - **In-Scope:** Customer (Web & Android), Seller (Web & Android seller mode), Rider delivery flow (Android), Admin console (commerce ops).
  - **Hidden / Flagged Off:** Society management (gate/intercom/bills), carpool, jobs, real estate, medical/pharmacy/blood, SOS/emergency, krishi, scrap, rentals, townsquare/community feed/chat, wallet coins/spin, subscriptions, experimental ML admin features.
  - **Restricted Goods:** Medicines, alcohol, tobacco, weapons blocked.
- **Status:** **DEFAULT ADOPTED (2026-10-25)**. Awaiting owner confirmation or adjustments.

---

### Decision D2: Zero-Cost Free Hosting Architecture
- **Question:** Which free-tier cloud hosting configuration should run the production environment?
- **Default (Applied):** Write host-agnostic, 12-factor code that runs on any container/node host (Render, Cloud Run, Koyeb, or Oracle VM). Do not alter deploy manifests (`render.yaml`, `docker-compose.production.yml`) until the owner selects an option from `docs/launch/ZERO_COST_ARCHITECTURE.md`.
- **Status:** **DEFAULT ADOPTED (2026-10-25)**. Research and options documented in M8.

---

### Decision D3: Customer Login Methods at Launch
- **Question:** What authentication methods should be enabled at launch given SMS cost/DLT constraints and free OTP vulnerabilities (N1)?
- **Default (Applied):**
  - Google Sign-In and Email OTP enabled.
  - Phone OTP code-complete in backend and mobile, but kept behind an environment flag (`ENABLE_PHONE_OTP=false`) until DLT registration and gateway credentials (Item 6) are active.
  - Free OTP response bypass completely disabled and rejected in production.
- **Status:** **DEFAULT ADOPTED (2026-10-25)**.

---

### Decision D4: Payment Model at Launch
- **Question:** What payment methods are accepted at launch?
- **Default (Applied):**
  - Cash on Delivery (COD) enabled and active by default.
  - Online Prepaid (Razorpay) code-complete behind `ENABLE_ONLINE_PAYMENTS=false` until owner completes Razorpay KYC and provides API keys.
  - Optional "Pay Seller via UPI on Delivery" toggle enabled per shop.
- **Status:** **DEFAULT ADOPTED (2026-10-25)**.

---

### Decision D5: Canonical Order & Payment Pipeline Consolidation
- **Question:** How should the fragmented order creation routes (`/checkout`, `/checkout/create-order`, `/payments/create-order`, `/payments/razorpay/order`, `/shops/:id/orders`, `/shops/cart/batch-checkout`) and duplicate order tables be consolidated?
- **Default (Applied):** Prepare a detailed consolidation plan touching no more than 25 files at once, present it in M3, and pause for approval before executing. Continue other independent milestone tasks while waiting.
- **Status:** **PENDING CONSOLIDATION PLAN (M3)**.

---

### Decision D6: Multi-Shop Cart Handling
- **Question:** How does checkout work when a customer adds products from multiple neighbourhood shops into a single cart?
- **Default (Applied):** Single checkout experience with unified quote; the backend automatically splits into separate child orders per shop (each shop gets its own order lifecycle, fulfillment, and packing slip), paid via a single payment transaction.
- **Status:** **DEFAULT ADOPTED (2026-10-25)**.

---

### Decision D7: SOS / Emergency Unification
- **Question:** Should `/emergency` and `/sos` routes and pages be unified?
- **Default (Applied):** SOS/Emergency is flagged off at launch per D1. When enabled in a later phase, all callers and interfaces will unify on canonical `/sos`.
- **Status:** **DEFAULT ADOPTED (2026-10-25)**.

---

### Decision D8: Data Deletions, Role Modifications & Monetary Operations
- **Question:** Any operation that deletes data, alters user roles, or expends money?
- **Default (Applied):** Strictly ask the owner before executing any destructive migration, table drop, role removal, or live financial transaction. Never perform these autonomously.
- **Status:** **ENFORCED (2026-10-25)**.
