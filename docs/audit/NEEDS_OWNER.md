# LocalSampark Audit — Owner Action Required (NEEDS_OWNER)

This document tracks items that strictly require the project owner's credentials, authorization, external dashboard actions, or product decisions.

---

### Item 1: Supabase Anonymous Key in Tracked Mobile Configuration
- **Context:** `apps/mobile/app.json` contains a tracked `SUPABASE_ANON_KEY` JWT string in `.expo.extra.SUPABASE_ANON_KEY`.
- **Risk:** While anonymous Supabase keys are designed for client usage, committing project keys to git allows anyone with repo access to connect to the Supabase client API directly.
- **Action Required by Owner:**
  1. In Supabase Dashboard → Project Settings → API, verify if Row Level Security (RLS) is enabled on every table.
  2. Consider moving `SUPABASE_ANON_KEY` to `.env` or EAS secrets during release builds instead of hardcoding in `app.json`.

---

### Item 2: Google Play App Signing & Digital Asset Links (SHA-256)
- **Context:** `apps/web/public/.well-known/assetlinks.json` specifies a SHA-256 certificate fingerprint for Android App Links (`in.localsampark.app`).
- **Risk:** If the release APK is signed by Google Play App Signing, Google replaces the upload keystore certificate with its own managed key. App Links auto-verification will fail unless Google's SHA-256 fingerprint is included in `assetlinks.json`.
- **Action Required by Owner:**
  1. Go to Google Play Console → Select LocalSampark → Setup → App Signing.
  2. Copy the "App signing key certificate" SHA-256 fingerprint.
  3. Provide this fingerprint so we can add it to `apps/web/public/.well-known/assetlinks.json`.

---

### Item 3: Production SMS & WhatsApp Gateway Configuration
- **Context:** The application currently supports console fallback and Fast2SMS for free OTP delivery. Real commercial launch with high volume requires MSG91 DLT credentials or Meta WhatsApp Business API tokens.
- **Action Required by Owner:**
  1. **For SMS (MSG91):** Obtain DLT entity ID, approved Sender ID (e.g. `LSAMPR`), and Template ID. Populate `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, and `MSG91_SENDER_ID` in production environment.
  2. **For WhatsApp:** Obtain Meta Cloud API System User token, Phone Number ID, and approved `auth_otp` template. Populate `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and `WHATSAPP_OTP_TEMPLATE`.

---

### Item 4: Product Decision — Emergency SOS Route Unification
- **Context:** The web app provides an emergency flow under `/emergency` (`apps/web/src/app/emergency`), while the mobile app triggers alerts via `/sos` (`apps/mobile/app/modules/sos`), calling `/api/v1/sos`.
- **Decision Required by Owner:**
  - Option A: Unify entirely on `/sos` across Web, Mobile, and Admin (Recommended for consistency with backend `src/modules/core/routes/sos.routes.js`).
  - Option B: Maintain `/emergency` as a public web redirect to `/sos`.

---

### Item 5: Product Decision — Inactive Shop Category Managers
- **Context:** In `apps/web/src/app/shop-manager/[category]/page.js`, 13 vertical category managers (e.g., beauty, doctor, pharmacy, garage) exist in varying states of implementation.
- **Decision Required by Owner:**
  - Decide whether to hide unready category managers from the public navigation until Phase 4 audits them, or keep them accessible in pilot beta mode.
