# LocalSampark Launch Program v2 — Owner Action Required (NEEDS_OWNER)

This document tracks items that strictly require the project owner's credentials, authorization, external dashboard actions, legal review, or product decisions.

---

### Item 1: Supabase Anonymous Key in Tracked Mobile Configuration
- **Context:** `apps/mobile/app.json` contains a tracked `SUPABASE_ANON_KEY` JWT string in `.expo.extra.SUPABASE_ANON_KEY`.
- **Risk:** While anonymous Supabase keys are designed for client usage, committing project keys to git allows anyone with repo access to connect to the Supabase client API directly.
- **Action Required by Owner:**
  1. In Supabase Dashboard → Project Settings → API, verify if Row Level Security (RLS) is enabled on every table.
  2. Move `SUPABASE_ANON_KEY` to environment variables or EAS secrets during release builds instead of hardcoding in `app.json`.

---

### Item 2: Google Play App Signing & Digital Asset Links (SHA-256)
- **Context:** `apps/web/public/.well-known/assetlinks.json` specifies a SHA-256 certificate fingerprint for Android App Links (`in.localsampark.app`).
- **Risk:** If the release APK/AAB is signed by Google Play App Signing, Google replaces the upload keystore certificate with its own managed key. App Links auto-verification will fail unless Google's SHA-256 fingerprint is included in `assetlinks.json`.
- **Action Required by Owner:**
  1. Go to Google Play Console → Select LocalSampark → Setup → App Signing.
  2. Copy the "App signing key certificate" SHA-256 fingerprint.
  3. Provide this fingerprint so we can add it to `apps/web/public/.well-known/assetlinks.json`.

---

### Item 3: Keystore Passwords in Git History (N16)
- **Context:** Commit `8730a11` (2026-08-23) committed Android upload keystore passwords in `apps/mobile/android/gradle.properties`.
- **Risk:** Anyone with repository access can extract the upload keystore password.
- **Action Required by Owner:**
  1. Generate a fresh upload keystore before the first Google Play upload.
  2. Enrol in Google Play App Signing so the upload key can be reset if compromised.
  3. Never commit passwords or keystore files to the repository.

---

### Item 4: Google Play Developer Account Type & Testing Requirement
- **Context:** Google Play policy changes mandate that personal developer accounts created after November 13, 2023 must run a closed test with at least 20 testers opted in for at least 14 days before applying for production access. Organization accounts are exempt from this requirement.
- **Risk:** If the owner has a personal account created after Nov 13, 2023, public production release will be delayed by at least 14-21 days for mandatory closed testing.
- **Action Required by Owner:**
  1. Clarify whether the Google Play Console account is an **Organization** account or a **Personal** account.
  2. If personal and post-Nov 2023, prepare a list of 20+ testers for the closed test track.

---

### Item 5: Razorpay KYC and API Credentials (D4)
- **Context:** Online prepaid payments via Razorpay are built and flagged off at launch. COD is active.
- **Action Required by Owner:**
  1. Complete business KYC on the Razorpay dashboard.
  2. If holding funds for multi-vendor settlements, apply for Razorpay Route / split settlement aggregator capability.
  3. Provide `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` for the production environment when ready to enable online payments.

---

### Item 6: Production SMS / WhatsApp Gateway Credentials (D3)
- **Context:** Free OTP mode is prohibited in production (N1). Launch uses Google Sign-In and email OTP (via Brevo/Resend free tier). Phone OTP is kept behind a flag.
- **Action Required by Owner:**
  1. **For SMS:** Complete DLT registration with telecom operators (e.g. Jio/Airtel/Vil DLT portal), register headers/sender IDs (e.g. `LSAMPR`), register message templates, and provide MSG91 credentials.
  2. **For WhatsApp:** Register Meta WhatsApp Business API account, create system user token, phone number ID, and approved templates.

---

### Item 7: Legal Document Review & Compliance Sign-Off (DRAFT Documents)
- **Context:** Consumer Protection (E-Commerce) Rules 2020, Legal Metrology, and DPDP Act 2023 mandate strict legal notices. All drafted legal templates are marked "DRAFT — requires legal review".
- **Action Required by Owner:**
  1. Have legal counsel review: Terms of Service, Privacy Policy, Return & Refund Policy, Cancellation Policy, Shipping & Delivery Policy, Grievance Redressal Policy, Seller Agreement, and Consent notices.
  2. Appoint and provide contact details for the statutory Grievance Officer (name, email, physical postal address, phone number).

---

### Item 8: Chartered Accountant (CA) Review for GST / TCS (Section 52)
- **Context:** Section 52 of the CGST Act requires e-commerce operators to collect Tax Collected at Source (TCS) on taxable supplies made through the platform.
- **Action Required by Owner:**
  1. Consult a CA to confirm GST registration status and TCS filing requirements for the marketplace entity.
  2. Verify the CSV export schema in `Admin > Reports` meets the CA's reconciliation needs.

---

### Item 9: Domain, DNS, and Production Host Decision (D2)
- **Context:** The launch architecture is prepared to be host-agnostic for zero monthly infrastructure cost (Render/Fly/Cloud Run/VM + Cloudflare + Supabase/Neon + Cloudflare R2).
- **Action Required by Owner:**
  1. Confirm the primary production domain name (e.g. `localsampark.in` or `localsampark.com`).
  2. Configure Cloudflare DNS nameservers for DDoS protection, SSL termination, and CDN caching.
  3. Select the preferred zero-cost hosting option from `docs/launch/ZERO_COST_ARCHITECTURE.md`.

---

### Item 10: Local PostgreSQL Superuser Password for Windows Service (G3 / G6)
- **Context:** The local Windows service `postgresql-x64-18` is running on `127.0.0.1:5432` (installed on 2026-10-25). Connecting with `user: 'postgres'`, `password: 'password'` returned `password authentication failed`.
- **Action Required by Owner:**
  Provide the password set during installation, or open `psql` and run:
  ```sql
  ALTER USER postgres WITH PASSWORD 'password';
  CREATE DATABASE localsampark;
  ```
  This allows Gate G3 (PostgreSQL Jest suite) and Gate G6 (Postgres Concurrency suite) to execute against your local database.

---

### Item 11: Dependency Vulnerability Audit Exceptions (N4, Gate G13)
- **Context:** Automated `npm audit fix --omit=dev` eliminated all 4 critical vulnerabilities (from 3 critical root and 1 critical mobile down to 0). Remaining non-fixable items require breaking framework upgrades:
  1. Root: `postcss` in `next` 15 (requires breaking upgrade to Next.js 16).
  2. Root: `node-fetch` in `face-api.js` (sub-dependency of TensorFlow face model).
  3. Mobile: `decode-uri-component` in `expo-router` / `query-string` (requires Expo 55).
  4. Mobile: `node-forge` in `@expo/cli` build tools.
  None of these allow remote code execution in our deployment architecture.
- **Action Required by Owner:**
  Confirm acceptance of these exceptions in `docs/launch/NEEDS_OWNER.md` so Gate G13 passes with the audited allowlist.
