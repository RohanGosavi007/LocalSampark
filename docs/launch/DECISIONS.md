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
- **Plan Presented (2026-10-25):**
  1. **Canonical Pipeline Endpoints:**
     - Quote: `POST /checkout/quote` (calculates item totals, live distance delivery fees, taxes, and applied coupons from `orderPlacement.service.js`).
     - Order Creation: `POST /checkout` (handles single-shop and multi-shop split checkout, Idempotency-Key, inventory reservation, and atomic payment initialization).
     - Order Lifecycle: `PUT /orders/:orderId/status` (enforces strict actor-based state machine in `orderLifecycle.service.js`).
  2. **Backward-Compatible Route Proxies:**
     - `POST /shops/:id/orders` and `POST /checkout/create-order` forward to `orderPlacement.service.placeOrder`.
     - `PATCH /orders/:id/status`, `PUT /shops/orders/:id/status`, and `PUT /shops/my-shop/orders/:orderId/status` proxy directly to `orderLifecycle.service.changeStatus`.
  3. **Zero-Destruction Database Storage:**
     - All new transactions write to `orders`, `order_items`, and `payment_ledger`.
     - Legacy tables (`shop_orders`, `universal_orders`, `batch_orders`) are preserved without schema deletion (Rule 2A.7).
- **Status:** **PROPOSED & SUBMITTED FOR APPROVAL**. Proceeding with independent M3 deliverables (Feature flags, Coupon engine, Cart, Search, Ledger) while awaiting owner confirmation.

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

---

### Decision D9: Canonical Pipeline Plan Approval (D5)
- **Question:** Approve the D5 canonical-pipeline plan already written in `DECISIONS.md`?
- **Default (Applied):** Do not start the P1 migration of callers; build everything else. P1 stays `NOT VERIFIED` until approved.
- **Status:** **AWAITING OWNER CONFIRMATION**. Default applied.

---

### Decision D10: COD Refunds & Rider Earnings While Wallet is Flagged Off (F-103)
- **Question:** How are customer cash-on-delivery refunds and rider delivery earnings handled while the wallet vertical is disabled at launch?
- **Default (Applied):**
  - **COD Refunds:** Handled via manual payout records (UPI/bank transfer) confirmed by admin, accompanied by an explicit ledger audit entry in `payment_ledger`.
  - **Rider Earnings:** Accrue in the rider balance ledger and are settled via manual admin batch payouts.
  - Wallet engine and consumer wallet credits remain completely flagged off.
- **Status:** **DEFAULT ADOPTED (2026-10-25)**.

---

### Decision D11: Statutory Grievance Officer Identity and Contact (F-104)
- **Question:** What are the exact contact details for the statutory Grievance Officer required by India Consumer Protection (E-Commerce) Rules 2020?
- **Default (Applied):** Read officer details dynamically from configuration/environment; render on public grievance page with clear label: `"DRAFT — pending owner confirmation"`.
- **Status:** **DEFAULT ADOPTED (2026-10-25)**.

---

### Decision D12: Dependency Vulnerability Exceptions (Gate G13)
- **Question:** How should non-fixable sub-dependency vulnerabilities (e.g. Next.js 15 internal postcss, face-api node-fetch, Expo CLI node-forge) be managed?
- **Default (Applied):** Fix all directly resolvable packages; propose explicit entries in `docs/audit/accepted-exceptions.json` with vulnerability analysis; keep Gate G13 failing until the owner explicitly approves the exceptions.
- **Status:** **DEFAULT ADOPTED (2026-10-25)**.

---

### Decision D13: Machine Verification Evidence Logging
- **Question:** How should raw log outputs from verification gates be version-controlled without bloating repository history?
- **Default (Applied):** Commit scrubbed `.txt` logs alongside `summary.json` reports strictly for each phase's final full run. Do not modify gitignore rules for `.log` files.
- **Status:** **DEFAULT ADOPTED (2026-10-25)**.

---

### Decision D14: Dedicated Local PostgreSQL Test Database
- **Question:** What database instance should Gate G3 and G6 execute against locally without interfering with development data?
- **Default (Applied):** Use a dedicated test database named `localsampark_test`. Store local connection credentials in a gitignored `backend/.env.test.local`. Prompt owner if creation or password alteration is needed.
- **Status:** **DEFAULT ADOPTED (2026-10-25)**.

---

### Decision D15: System Tooling & Emulator Installs
- **Question:** May external system-level tooling (Android emulator / AVD, Maestro, Docker / MinIO) be installed on the host machine?
- **Default (Applied):** Strictly ask the platform owner before installing any system binaries, emulators, or system services. In-repo npm devDependencies (`@axe-core/playwright`, `@lhci/cli`, `autocannon`) are permitted without asking.
- **Status:** **ENFORCED (2026-10-25)**.

---

### Decision D16: Supabase PostgreSQL Major Version
- **Question:** What exact PostgreSQL version runs on the remote Supabase production instance?
- **Default (Applied):** Await owner confirmation. In the interim, execute Gate G3 and local validations against local PostgreSQL 18 and record finding N9.
- **Status:** **AWAITING OWNER CONFIRMATION**. Local PG 18 used for test harness.

---

### Decision D17: Marathi Language Localization Scope at Launch
- **Question:** Should Marathi (mr) localization be required for the initial production launch?
- **Default (Applied):** English (en) and Hindi (hi) are active and fully translated at launch. All UI strings are extracted into localization dictionaries so Marathi can be enabled post-launch without code refactoring.
- **Status:** **DEFAULT ADOPTED (2026-10-25)**.

---

### Decision D18: Untracking Ephemeral Test Results (F-111)
- **Question:** Should transient test artifacts (`playwright-report/` and `test-results/`) be committed to git?
- **Default (Applied):** Untrack from git index via `git rm --cached` while preserving local files on disk. Ensure `.gitignore` ignores all subsequent runs.
- **Status:** **RESOLVED & APPLIED (2026-10-25)**.

