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

### Item 10: Local PostgreSQL Test Database & Credentials (D14, Gate G3 / G6)
- **Context:** Gate G3 (PostgreSQL Jest suite) and Gate G6 (Postgres Concurrency suite) require a dedicated, isolated test database named `localsampark_test` running on the local PostgreSQL service (`postgresql-x64-18` on `127.0.0.1:5432`). Test runs must never share or mutate development databases.
- **Action Required by Owner:**
  Provide credentials via a local uncommitted `backend/.env.test.local` file (or set the password for `postgres` user). Run the following in `psql`:
  ```sql
  ALTER USER postgres WITH PASSWORD 'password';
  CREATE DATABASE localsampark_test;
  ```
  Once created, Gate G3 and G6 execute isolated dual-engine tests against `localsampark_test`.

---

### Item 11: Dependency Vulnerability Audit Exceptions (D12, Gate G13)
- **Context:** All fixable dependencies have been updated. Residual non-fixable sub-dependencies require breaking major framework migrations:
  1. Root: `postcss` in `next@15` (requires breaking migration to Next.js 16).
  2. Root: `node-fetch` in `face-api.js` (sub-dependency of TensorFlow face model).
  3. Mobile: `decode-uri-component` in `expo-router` / `query-string` (requires Expo 55).
  4. Mobile: `node-forge` in `@expo/cli` build toolchain.
  Per Decision D12, these exceptions are proposed in `docs/audit/accepted-exceptions.json` with vulnerability justifications. Gate G13 will remain flagged until the owner approves this list.
- **Action Required by Owner:**
  Review `docs/audit/accepted-exceptions.json` and confirm formal acceptance of these 4 sub-dependency exceptions.

---

### Item 12: Canonical Pipeline Plan Approval (D9)
- **Context:** Decision D5 proposes a unified order and payment pipeline (`POST /checkout/quote`, `POST /checkout`, `PUT /orders/:orderId/status`) with an append-only state ledger and backward-compatible route proxies.
- **Action Required by Owner:**
  Approve the D5 plan so caller migration can begin under capability P1. Until approved, P1 remains `NOT VERIFIED`.

---

### Item 13: System Tooling & Emulator Authorization (D15, Gates G10 / G12)
- **Context:** Android release verification (G10/G12) requires an Android Virtual Device (AVD) / emulator and Detox or Maestro runner.
- **Action Required by Owner:**
  Confirm authorization before any system-level Android emulator or Maestro CLI is installed or configured on the host machine.

---

### Item 14: Supabase PostgreSQL Major Version Confirmation (D16)
- **Context:** Local testing executes against PostgreSQL 18 (`postgresql-x64-18`). Supabase cloud instances typically deploy on PostgreSQL 15.x or 16.x.
- **Action Required by Owner:**
  Verify the exact PostgreSQL major version running in Supabase Dashboard → Project Settings → Database.


---

### Item 15: Rider location while the app is in the background (R4)
- **Context:** The rider app now shares the rider's position with the customer during an active delivery, but only while the app is open on screen. The R4 acceptance text asks for tracking in the background. That needs `ACCESS_BACKGROUND_LOCATION` and a location foreground service, which M7 deliberately removed from the manifest, and Google Play only allows it after a Permissions Declaration (with a video of the feature) is approved for the listing.
- **Action Required by Owner:**
  Decide whether to apply for the background-location declaration. If yes, the app change is small (a foreground service around `startTracking` in `apps/mobile/src/services/rider.js`); until then riders should keep the app open during deliveries.

---

### Item 16: KYC encryption key for sellers' bank details (S1)
- **Context:** A seller's bank account number (submitted with KYC) is now encrypted at rest with AES-256-GCM. It was previously stored as base64, which is an encoding, not encryption. Production **refuses** bank details (HTTP 503, "Bank details cannot be stored until KYC_ENCRYPTION_KEY is configured") until a key is set, rather than storing them weakly. Rows written before this change remain base64 and are still readable by `utils/fieldCrypto.decrypt`.
- **Action Required by Owner:**
  1. Generate a key once: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
  2. Set it as `KYC_ENCRYPTION_KEY` in the production API environment (Render), and keep a copy in your password manager — losing it makes stored account numbers unreadable.
  3. Never commit it, and never change it without a re-encryption step (not built yet; ask before rotating).

---

### Item 17: Hindi and Marathi wording needs a native-speaker review (P12)
- **Context:** The web dictionary was missing the 19 strings the gatekeeper page asks for (it showed raw keys such as `gatekeeper.title`), and the Android dictionary was missing the 11 labels on the merchant dashboard tabs (it showed `[missing "en.nav_retail" translation]`). I added all of them in English, Hindi and Marathi. The Hindi and Marathi are my own translations and have not been reviewed by a native speaker.
- **Action Required by Owner:** Have someone fluent read `gatekeeper.*` in `apps/web/src/app/data/translations.js` and the `nav_*` entries in `apps/mobile/src/i18n/index.js`, and correct anything that reads oddly. Tests only check that every key exists and is in Devanagari, not that the wording is good.

### Item 18: How much of the Android app should be translated? (P12)
- **Context:** The web interface is fully translated into Hindi and Marathi (apart from the Krishi module, which is off at launch). The Android app has **25 translated strings in total**; every other label, button and message in its screens is English text written directly into the code. The More tab offers "Regional Languages", so a Hindi- or Marathi-speaking user will see that the language changes only a handful of labels.
- **Action Required by Owner:** Decide whether launch needs a translated Android app. If yes, it is a separate piece of work: move several hundred strings out of the screens into the dictionary, then translate and review them. If no, consider hiding the language chooser on Android until then so it does not promise more than it does.

### Item 19: Two oversized images in the Android app (P13)
- **Context:** `apps/mobile/assets/favicon.png` and `splash.png` are about 1.6 MB each (the whole `assets/` folder is 4.3 MB). I did not change them: recompressing or resizing artwork can change how it looks, and the splash screen is the first thing a user sees. The web logo, by comparison, was shrunk from 528 KB to 11 KB with no visible difference (done in this change).
- **Action Required by Owner:** Ask whoever made the artwork to export both at sensible sizes (the splash at the largest phone screen size, the favicon at 48 to 192 px). A test caps any single image at 2 MB and all images at 6 MB, so they cannot grow further.

---

### Item 20: Accounting rules for the ledger's missing postings (P3)
- **Context:** The double-entry ledger now books every delivered order (the customer's payment split into what the shop is owed, the platform's earning, the rider's pay and the delivery margin) and every refund, and is append-only. Three money movements are **not** posted yet, because each needs an accounting decision, not just code: seller payouts (money leaving the platform's bank), rider payouts, and wallet top-ups. The ledger's account list has no bank/cash account, so a payout cannot be balanced; adding one means rebuilding a table constraint on SQLite and is a change to your books.
- **Action Required by Owner:** Decide (with whoever keeps the books) the account for money held at the bank, and whether a platform-funded coupon or loyalty discount should be recorded against the platform's commission revenue (what is done now) or in an account of its own. Then ask for the payout postings.

### Item 21: Switching on online payments (P2, decision D4)
- **Context:** Online payment is now off in production until you switch it on, even if Razorpay keys are present. A reconciliation job (every 10 minutes) asks Razorpay about payments whose result never reached us, and settles or refunds them.
- **Action Required by Owner:** When Razorpay KYC is complete: set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` and `ENABLE_ONLINE_PAYMENTS=true` in the production API environment. Do not set the switch before the live keys are in place.

### Item 22: An email carrier (P5)
- **Context:** Email can go through Resend, Brevo or any SMTP server. With none configured, production sends nothing and says so (the reset-password and verification emails will not arrive).
- **Action Required by Owner:** Pick one and set its key in the production API environment: `RESEND_API_KEY` or `BREVO_API_KEY` (both have free tiers), or `SMTP_USER`/`SMTP_PASS`. Set `SMTP_FROM` to an address on a domain you have verified with the carrier.

### Item 23: Moving uploads to object storage (P4)
- **Context:** Uploads are stored on the server's disk unless object storage is configured. A Render disk is not a safe place for KYC documents. `scripts/storage/migrate_uploads.js` copies existing files to S3 / Cloudflare R2 (a dry run by default; it never deletes anything).
- **Action Required by Owner:** Create an R2 or S3 bucket, set `STORAGE_DRIVER=s3`, `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` (and `STORAGE_PUBLIC_URL` for public images), run the script without `--execute` to see the plan, then with it, check the app, and only then remove the local copies yourself.

### Item 24: Error-reporting projects (P8)
- **Context:** Sentry now reports errors from the API, web app, admin console and Android app, with personal data scrubbed first. Each stays off until it has a DSN.
- **Action Required by Owner:** Create the Sentry projects (free tier) and set `SENTRY_DSN` (API), `NEXT_PUBLIC_SENTRY_DSN` (web and admin builds) and `EXPO_PUBLIC_SENTRY_DSN` (Android release build). Optionally set `SENTRY_AUTH_TOKEN` at build time to upload source maps.
