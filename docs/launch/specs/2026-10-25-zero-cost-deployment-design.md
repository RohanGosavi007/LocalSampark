# Milestone M8: Zero-Cost Deployment Package & Runbook Design Spec

## 1. Executive Summary & Objective

Milestone M8 packages the full commercial production infrastructure for LocalSampark to operate at ₹0/month ongoing cloud infrastructure cost, while ensuring high availability, continuous security, automated backups, and an operational runbook:
- **Decision D2 (Hosting Architecture Evaluation)**: Documented evaluation of current free-tier terms (Render, Google Cloud Run, Koyeb, Oracle Cloud Always Free, Supabase, Neon, Cloudflare R2, Brevo, Resend, Sentry, FCM, Better Stack) in `docs/launch/ZERO_COST_ARCHITECTURE.md`.
- **Deployment Manifests & Environment Hardening**: Updated `render.yaml` with `plan: free` resource profiles, memory bounds (`NODE_OPTIONS="--max-old-space-size=440"`), and readiness probes (`/ready`). Authored sanitized `backend/.env.production.example`.
- **Automated Disaster Recovery & Database Backups (P10)**: Created `scripts/backup/pg_dump_backup.js` and `scripts/backup/restore_backup.js` with AES-256-GCM authenticated encryption, SHA-256 checksums, and 7-day retention pruning.
- **Observability & Probes (P8)**: Implemented `/ready` readiness check alongside `/health` in `backend/src/server.js`, verifying database connectivity and core schema tables.
- **Operational Launch Runbook**: Documented step-by-step account provisioning, environment variable injection, database migration, admin creation, rolling updates, and emergency recovery in `docs/launch/LAUNCH_RUNBOOK.md`.

---

## 2. Zero-Cost Infrastructure Architecture

### 2.1 Recommended Option A: Render + Supabase + Cloudflare R2
- **Compute (API)**: Render Free Web Service (750 free hrs/mo, 512MB RAM limit).
- **Compute (Web)**: Render Free Web Service (Next.js SSR standalone) or Cloudflare Pages.
- **Database**: Supabase Free PostgreSQL 15+ (500MB DB, PostGIS enabled, pooled via Supavisor port 6543).
- **Object Storage (N3)**: Cloudflare R2 (10GB free tier, 0 egress fees, S3 SigV4 compatible).
- **Disaster Recovery (P10)**: Automated AES-256-GCM encrypted database dumps to Cloudflare R2.
- **Edge CDN & WAF**: Cloudflare Free Zone with DDoS mitigation and SSL/TLS Full Strict.

### 2.2 Mandatory Non-Infrastructure Fees
- Google Play Console Developer Registration: $25 USD one-time (~₹2,100 INR).
- Custom Domain Name Registration: ~₹800 - ₹1,200 INR / year.
- Payment Gateway (Razorpay): 2.0% + GST per successful online transaction (COD incurs 0% fee).

---

## 3. Disaster Recovery & Backup Integrity (P10)

### 3.1 Encryption Format
Archives are encrypted using AES-256-GCM with authenticated tags:
- Bytes 0–11: Random 96-bit Initialization Vector (`IV`).
- Bytes 12–27: 128-bit Authentication Tag (`authTag`).
- Bytes 28+: Ciphertext.
- Accompanying `.sha256` digest file for immediate tamper detection.

### 3.2 Dual-Mode Restoration
- **Dry-Run Mode (`runRestore({ dryRun: true })`)**: Decrypts archive, validates authentication tag and checksum without touching the database.
- **Execute Mode (`runRestore({ dryRun: false })`)**: Safely streams decrypted payload to `pg_restore --clean --if-exists`.

---

## 4. Test Coverage & Verification Results

1. **Unit Test Coverage**:
   - `backend/src/__tests__/unit/healthReady.test.js`: 3 tests (`[P8.1]`, `[P8.2]`, `[P8.3]`).
   - `backend/src/__tests__/unit/backupRestore.test.js`: 5 tests (`[P10.1]` through `[P10.5]`).
   - **Total M8 Unit Tests**: 8 / 8 PASS.
2. **Dual-Engine Parity**:
   - Tested and verified under both local SQLite and PostgreSQL modes with 100% pass rate.
