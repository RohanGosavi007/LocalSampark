# LocalSampark — Production Launch & Operational Runbook

*Version: 1.0.0 (October 2026)*  
*Target Environment: Production (Render.com + Supabase/Neon PostgreSQL + Cloudflare R2)*

---

## 1. Pre-Flight Account & Platform Provisioning

Complete these steps in each cloud console before initiating the first production deployment:

### 1.1 Database Provisioning (Supabase Free or Neon Free)
1. **Create Project**:
   - Region: `ap-southeast-1` (Singapore) or `ap-south-1` (Mumbai) for minimal latency to Pune pilot users.
   - Note the generated master database password.
2. **Enable PostGIS Extension**:
   - In Supabase SQL Editor:
     ```sql
     CREATE EXTENSION IF NOT EXISTS postgis;
     CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
     CREATE EXTENSION IF NOT EXISTS pg_trgm;
     ```
3. **Retrieve Connection String**:
   - Use the **Transaction Pooler** connection string (Supavisor on port `6543`) for production API processes:
     `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require`

### 1.2 Object Storage Provisioning (Cloudflare R2)
1. **Create R2 Bucket**:
   - Bucket Name: `localsampark-production`
   - Location: `Asia Pacific (APAC)`
2. **Generate S3 API Credentials**:
   - Go to **R2 → Manage R2 API Tokens → Create API Token**.
   - Permissions: `Object Read & Write`.
   - Copy `Access Key ID`, `Secret Access Key`, and the S3 endpoint URL (`https://<account-id>.r2.cloudflarestorage.com`).
3. **Public Access Domain (Optional for public catalog)**:
   - Connect Custom Domain: `media.localsampark.com`.

### 1.3 Firebase Cloud Messaging (FCM)
1. Go to Firebase Console → Project Settings → **Service Accounts**.
2. Click **Generate New Private Key**.
3. Note `project_id`, `client_email`, and `private_key` for environment variable injection.

### 1.4 Error Tracking (Sentry)
1. Create project `localsampark-api` on Sentry (free Developer plan).
2. Copy client DSN (`https://<key>@o<org>.ingest.sentry.io/<project>`).

---

## 2. Environment Variables Injection Guide

Configure these variables in your hosting dashboard (e.g. Render Web Service Dashboard).

| Variable Name | Production Value / Generation Rule | Required? | Purpose |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `production` | **YES** | Activates security middleware, disables dev bypasses |
| `USE_SQLITE` | `false` | **YES** | Enforces PostgreSQL engine |
| `PORT` | `5000` | **YES** | Express HTTP listener port |
| `TRUST_PROXY_HOPS` | `1` | **YES** | Accurate client IP resolution behind Cloudflare/Render |
| `SHUTDOWN_DRAIN_MS` | `5000` | **YES** | Graceful connection draining window |
| `SHUTDOWN_DEADLINE_MS` | `25000`| **YES** | Force-kill safety cutoff inside SIGTERM window |
| `DATABASE_URL` | `postgresql://...` (Supabase pooled URI) | **YES** | Main database connection |
| `JWT_SECRET` | Generate via `openssl rand -hex 64` | **YES** | Signs customer and admin access JWTs |
| `JWT_REFRESH_SECRET` | Generate via `openssl rand -hex 64` | **YES** | Signs persistent 30-day refresh tokens |
| `JWT_EXPIRES_IN` | `1h` | **YES** | Short-lived access token expiry |
| `JWT_REFRESH_EXPIRES_IN`| `30d` | **YES** | Refresh token renewal window |
| `CLIENT_URL` | `https://localsampark.com` | **YES** | CORS origin validation & web auth redirects |
| `FRONTEND_URL` | `https://localsampark.com` | **YES** | Public web store address |
| `STORAGE_PROVIDER` | `s3` | **YES** | Enables Cloudflare R2 / S3 adapter (N3) |
| `STORAGE_ENDPOINT` | `https://<id>.r2.cloudflarestorage.com` | **YES** | Cloudflare R2 endpoint |
| `STORAGE_BUCKET` | `localsampark-production` | **YES** | Target storage bucket |
| `STORAGE_ACCESS_KEY_ID`| `<r2-access-key-id>` | **YES** | S3 SigV4 authentication |
| `STORAGE_SECRET_ACCESS_KEY`| `<r2-secret-access-key>` | **YES** | S3 SigV4 signing key |
| `BACKUP_ENCRYPTION_KEY`| Generate via `openssl rand -hex 32` | **YES** | AES-256-GCM database backup encryption (P10) |
| `SENTRY_DSN` | `https://...` | NO | Ingests unhandled runtime exceptions |
| `RAZORPAY_KEY_ID` | Leave blank or set real key | NO (D4) | Unset = COD active, online payment 503 |
| `RAZORPAY_KEY_SECRET` | Leave blank or set real secret | NO (D4) | Payment verification |
| `RAZORPAY_WEBHOOK_SECRET`| Leave blank or set webhook secret | NO (D4) | Webhook payload authentication |

---

## 3. Initial Database Migration & Admin Provisioning

Before routing live traffic, execute migrations and create the initial Super-Admin user.

### Step 3.1: Apply Schema Migrations
From a secure deployment machine with database network access:
```bash
DATABASE_URL="postgresql://<user>:<password>@<host>:5432/localsampark?sslmode=require" \
NODE_ENV="production" \
USE_SQLITE="false" \
node backend/scripts/migrate.js
```
*Expected Output*: `✅ Applied migrations 002 through 133 successfully. Current schema version: 133.`

### Step 3.2: Provision Initial Super-Admin
Run the idempotent admin provisioning script:
```bash
DATABASE_URL="postgresql://<user>:<password>@<host>:5432/localsampark?sslmode=require" \
node backend/scripts/provision-admin.js \
  --email "admin@localsampark.com" \
  --name "Platform Super Admin" \
  --phone "+919876543210" \
  --role "superadmin"
```
*Expected Output*: `✅ Super-admin account provisioned successfully. Temporary credentials emitted to secure prompt.`

---

## 4. Production Smoke Test Protocol

Immediately after deploy, verify system health using these probe endpoints:

1. **Liveness & Version Check**:
   ```bash
   curl -i https://api.localsampark.com/health
   ```
   *Verify*: HTTP `200 OK`, `status: "ok"`, `database: "connected"`, memory usage $\le 300\text{MB}$.
2. **Readiness Probe**:
   ```bash
   curl -i https://api.localsampark.com/ready
   ```
   *Verify*: HTTP `200 OK`, `ready: true`, `checks.schema: "ready"`, `checks.database: "connected"`.
3. **Public Catalog Endpoint**:
   ```bash
   curl -i https://api.localsampark.com/api/v1/shops?limit=5
   ```
   *Verify*: HTTP `200 OK`, returns JSON array of verified shops in Pune pilot zone.
4. **Web SSR & SEO Check**:
   ```bash
   curl -i https://localsampark.com/sitemap.xml
   ```
   *Verify*: HTTP `200 OK`, XML containing `<loc>` entries for homepage and legal routes.
5. **Account Deletion Portal Compliance**:
   ```bash
   curl -i https://localsampark.com/account-deletion
   ```
   *Verify*: HTTP `200 OK`, renders Google Play compliant deletion form.

---

## 5. Zero-Downtime Rolling Update & Rollback Procedures

### 5.1 Rolling Update Architecture
1. Render deploys a new container instance running the updated git commit.
2. Render sends HTTP requests to the new instance's `/ready` path.
3. Once the new instance reports `ready: true`, Render switches router traffic to the new instance.
4. Render sends `SIGTERM` to the old instance.
5. **Graceful Draining**:
   - Old instance sets `isShuttingDown = true`.
   - Subsequent calls to `/health` and `/ready` on the old instance return HTTP `503 Service Unavailable`, dropping it from the load balancer pool.
   - Active in-flight HTTP requests and Socket.IO connections are given `SHUTDOWN_DRAIN_MS=5000` (5 seconds) to cleanly complete.
   - Process exits cleanly before `SHUTDOWN_DEADLINE_MS=25000`.

### 5.2 Rollback Runbook (Deploy Failure)
If a release exhibits critical regressions or `/ready` fails health checks:
1. Open **Render Dashboard → localsampark-api → Deploys**.
2. Locate the previous green deployment.
3. Click the kebab menu `...` → **Rollback to this deploy**.
4. The load balancer instantly switches traffic back to the prior stable container.
5. Verify restoration via:
   ```bash
   curl https://api.localsampark.com/health | jq '.commit'
   ```

---

## 6. Automated Disaster Recovery & Database Backups (P10)

### 6.1 Scheduled Backup Routine
Automated backups run nightly via scheduled cron or GitHub Action:
```bash
BACKUP_ENCRYPTION_KEY="<32-byte-hex-key>" \
DATABASE_URL="postgresql://..." \
node scripts/backup/pg_dump_backup.js
```
- Archive produced: `backups/backup_YYYY-MM-DDTHH-mm-ss.dump.enc`
- Integrity checksum: `backups/backup_YYYY-MM-DDTHH-mm-ss.sha256`
- Backups older than 7 days are automatically pruned.

### 6.2 Emergency Restoration Procedure
If database corruption or catastrophic data loss occurs:
1. **Dry-Run Integrity Verification**:
   ```bash
   node scripts/backup/restore_backup.js backups/backup_2026-10-25.dump.enc
   ```
   *Validates SHA-256 checksum, verifies AES-256-GCM authentication tag, and decrypts dump stream without modifying database.*
2. **Full Production Database Restoration**:
   ```bash
   DATABASE_URL="postgresql://..." \
   node scripts/backup/restore_backup.js backups/backup_2026-10-25.dump.enc --execute
   ```
3. Run readiness verification:
   ```bash
   curl https://api.localsampark.com/ready
   ```

---

## 7. Emergency Incident Playbook

### Scenario A: Rogue Store or Malicious Catalog Content
1. Log in to Admin Console: `https://admin.localsampark.com/commerce/shops`.
2. Locate the offending store → click **Suspend Store**.
3. API instantly flips `local_shops.is_active = false` and terminates live dispatch orders.

### Scenario B: Payment Gateway Outage (Razorpay Degraded)
1. The platform automatically catches Razorpay connection errors and marks online checkout unavailable (`503 PAYMENTS_UNAVAILABLE`).
2. Customers continue shopping uninterrupted using **Cash on Delivery (COD)**.

### Scenario C: Database Connection Limit Exceeded
1. Verify Supabase connection count in Supabase Dashboard → Database → Connections.
2. Confirm API uses the Supavisor connection pooler URL on port `6543` (not direct port `5432`).
3. Reduce `DB_POOL_MAX` in Render environment variables from `5` to `2` per instance and restart.

## 8. Pre-Release Verification (Gates G1–G18)

The only gate runner is `node scripts/verify/verify-all.mjs` (there is no `run-all-gates.mjs`; older audit notes that name it, or quote "142 suites", are out of date). A release is signed off only by **one full run** on the release commit — `--only` runs are for development and never regenerate `docs/launch/STATUS.md`.

| Gate | What it runs | Manual equivalent (local only, rule L6) |
| --- | --- | --- |
| G1 | Backend ESLint | `cd backend && npx eslint src` |
| G2 | Backend Jest on SQLite (`backend/src/data/test.db`) | `cd backend && npx jest --forceExit` |
| G3 | Backend Jest on local PostgreSQL | `cd backend && TEST_USE_POSTGRES=1 USE_SQLITE=false DB_SSL=false DATABASE_URL=postgres://postgres:password@127.0.0.1:5432/localsampark_test npx jest --forceExit` |
| G4 | Migrations + seed idempotency, both engines | `node backend/src/migrations/run.js` with the G3 variables |
| G5 | Route-auth matrix | `node scripts/verify/route-auth-matrix.mjs` |
| G7 / G8 | Web / admin unit tests + production build | `npm --prefix apps/web run build`, `npm --prefix apps/admin run build` |
| G11 | Playwright web + admin E2E | `npx playwright test --project=web-chromium --project=admin-chromium` |
| G14 | Secret scan | `node scripts/verify/secret-scanner.mjs` |
| G15 | Launch policy + harness self-tests | `node --test scripts/verify/__tests__/harness.test.mjs` |
| G18 | Feature verification from real test reports | full run only |

Never point any of these at the Supabase host in `backend/.env`: `jest.globalSetup.js` refuses any database that is not local and named `*_test`. Run one verification at a time on a machine — the SQLite suites share `test.db`.
