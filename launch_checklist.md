# LocalSampark — Production Launch Checklist

Everything below is a **manual action you must take**, because it needs a
credential, a dashboard click, or a human approval that no script in this
repository can perform. Items already handled in code are listed at the bottom
so you can see what is *not* on your plate.

Ordered by what blocks the launch soonest.

---

## 0. Blockers — the deploy is wrong or unverifiable without these

- [ ] **Set `JWT_SECRET` in the Render dashboard to a real 32+ character secret.**
      `backend/src/config/envValidator.js` now refuses to boot in production if
      it is shorter than 32 characters or matches a known placeholder
      (`test-secret`, `changeme`, …). Generate one with:
      `openssl rand -base64 48`
      Also set `JWT_REFRESH_SECRET` to a *different* value.

- [ ] **Confirm `RENDER_DEPLOY_HOOK_URL` is set in the GitHub `production`
      environment.** The deploy step now fails loudly on a missing or rejected
      hook. Previously a bad hook produced a green "Deployment triggered!" for a
      deploy that never happened.

- [ ] **Confirm `PRODUCTION_DATABASE_URL` is set in the GitHub `production`
      environment.** `deploy.yml` runs both migration systems (Prisma *and* the
      raw-SQL runner) against it before the deploy hook fires.

- [ ] **Approve the `production` environment on the first run.** `deploy.yml`'s
      `deploy-to-render` job is gated on GitHub Environments. The run will sit
      waiting until a reviewer clicks **Approve and deploy** — this is the
      "click approve" step, and it is intentional: it is the last gate before
      migrations touch the live database.

- [ ] **Re-test the website login end to end after deploying.** `/login` was a
      role picker that called `mockLogin()` — a function that returns false
      without doing anything when `NODE_ENV=production`, which `next build`
      always sets. It still redirected to the chosen dashboard, where the route
      guards bounced the visitor back to `/login`: an unbreakable redirect loop
      in which **nobody, including existing account holders, could sign in to
      the deployed site.** The page now uses the real `loginEmail` / `sendOtp` /
      `verifyOtp` flows that already existed in `AuthContext` and were only ever
      wired up on `/register`. Confirm both paths against production:
      - phone OTP sign-in (depends on `MSG91_AUTH_KEY` below)
      - email + password sign-in
      The developer role picker is retained for local builds only and is
      dead-code-eliminated from production bundles.

- [ ] **Verify `RENDER_GIT_COMMIT` reaches the service.** Render injects it
      automatically, and `/health` now reports it as `commit`. Check after the
      first deploy:
      `curl -s https://localsampark-api.onrender.com/health | jq .commit`
      If it returns `"unknown"`, set `GIT_COMMIT` manually in the Render
      dashboard. Until it resolves, the deploy workflow can only confirm that
      *something* is healthy — not that the new build is live — and it emits a
      workflow warning saying so.

---

## 1. Database

- [ ] **Provide the database CA certificate.** `backend/src/config/database.js`
      now verifies the server certificate by default; it previously accepted any
      certificate, which left the connection encrypted but unauthenticated.
      Download your provider's CA and set `DB_SSL_CA` (PEM, `\n`-escaped).
      If your provider cannot supply one, set
      `DB_SSL_REJECT_UNAUTHORIZED=false` — the server will boot and log a
      SECURITY warning on every start, so the tradeoff stays visible.

- [ ] **Check `DATABASE_URL` points at the POOLED endpoint** (PgBouncer /
      Supabase pooler, usually port 6543 or 6432), and `DIRECT_URL` at the
      unpooled one. Runtime now uses `DATABASE_URL`; migrations use `DIRECT_URL`.
      This was previously inverted, sending all application traffic to the
      endpoint with the lowest connection ceiling.

- [ ] **Take a backup before the first production migration run.** The raw-SQL
      runner applies ~30 pending numbered migrations on first execution.

- [ ] **Create the first Super Admin account.** No script does this; the demo
      `God Developer` account exists only in the local SQLite database.

- [ ] **Run the data purge against production — dry run first.**
      ```
      cd backend
      node src/scripts/purge_test_data.js            # shows the plan, writes nothing
      node src/scripts/purge_test_data.js --execute  # applies it, in one transaction
      ```
      Read the plan before passing `--execute`. It preserves Mock Shops, their
      owners, categories and regions, and verifies referential integrity before
      committing.

---

## 2. Third-party credentials (each one fails closed until set)

`envValidator.js` reports these individually at boot with the exact consequence.

- [ ] `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — live keys, not test keys.
- [ ] `PAYMENT_WEBHOOK_SECRET` — without it `POST /payments/webhook/:provider`
      returns 400 and **no payment is ever confirmed**.
- [ ] `SAAS_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET` — same pattern.
- [ ] `MSG91_AUTH_KEY` / `MSG91_TEMPLATE_ID` — without these, OTPs are written
      to the log instead of sent, so **nobody can sign up**. Verify the DLT
      template is approved on the MSG91 side.
- [ ] `FIREBASE_PROJECT_ID` / `FIREBASE_PRIVATE_KEY` / `FIREBASE_CLIENT_EMAIL`
      — push notifications.
- [ ] `SENTRY_DSN` — error tracking. Only initialised when `NODE_ENV=production`.
- [ ] `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` — transactional email.
- [ ] `GOOGLE_MAPS_API_KEY` — restrict it by HTTP referrer and Android app
      signing certificate before going live.

---

## 3. Domains, SSL and CORS

- [ ] **Add the custom domains in Render** and let it issue certificates.
- [ ] **Set `CLIENT_URL` and `ADMIN_URL` to the exact production origins.**
      This now matters more than before: the CORS whitelist no longer trusts
      every `*.onrender.com` host in production. That wildcard, combined with
      `credentials: true`, meant any other tenant on onrender.com could make
      authenticated cross-origin calls. Non-production deploys keep the
      convenience.
- [ ] **Verify the HTTPS redirect.** It now returns **308** (not 301), so a POST
      arriving over HTTP keeps its method and body, and it skips `/health` and
      `/metrics` so platform probes are not redirected.
- [ ] **Confirm HSTS.** `Strict-Transport-Security` is sent in production with a
      1-year max-age, `includeSubDomains` and `preload`. Only submit to the
      preload list once you are certain every subdomain serves HTTPS — it is
      slow to reverse.

---

## 4. Mobile release

- [ ] **Set the `EXPO_TOKEN` repository secret.** `mobile-release.yml` now
      checks for it up front instead of failing minutes later at `eas build`.
- [ ] **Create the Sentry EAS secrets** — the build runs on Expo's servers, so
      GitHub secrets never reach it:
      ```
      eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value <token>
      eas secret:create --scope project --name SENTRY_ORG        --value <org>
      eas secret:create --scope project --name SENTRY_PROJECT    --value <project>
      ```
      Without these, release crashes arrive as unsymbolicated Hermes offsets.
- [ ] **Set `EXPO_PUBLIC_API_URL` to the production API** in the EAS build
      profile. If you have used `start-live-tunnel.ps1`, restore the file first:
      `Copy-Item apps/mobile/.env.backup apps/mobile/.env -Force`
      Shipping a build that points at a dead tunnel URL is the easiest mistake
      to make here.
- [ ] **Generate and back up the Android keystore.** Lose it and you can never
      update the listing.
- [ ] **Push a `v*` tag to trigger the release build.** Nothing else triggers it.
- [ ] **Google Play Console:** complete the Data Safety questionnaire, the
      privacy policy URL, and the content rating. Ship to Internal Testing
      before production.

---

## 5. Pre-demo verification

- [ ] `curl -s https://<api-domain>/health | jq` — `status` is `ok`, `database`
      is `connected`, `commit` matches the deployed SHA.
- [ ] Sign up with a real phone number and confirm the OTP SMS arrives.
- [ ] Complete one real ₹1 payment end to end and confirm the webhook marks it
      paid.
- [ ] Open the shop directory and confirm the seeded shops render with products
      and offers.
- [ ] Trigger a redeploy and watch for zero dropped requests during the swap.

---

## Already handled in code — no action needed

| Area | What changed |
|---|---|
| Graceful shutdown | `/health` reports `draining` and returns 503 on SIGTERM, polling timers stop, Socket.io and the HTTP server close, the DB pool and Redis are released, with a hard deadline so a stuck socket cannot cause a SIGKILL. Verified: healthy → 503 draining → clean exit 0. |
| Background timers | Four `setInterval` calls were keeping the event loop alive forever and could overlap themselves under load. Now tracked, unref'd, re-entrancy guarded, and cleared on shutdown. |
| DB pool | Certificate verification on by default, production pool sizing, `statement_timeout` and `query_timeout` so a hung query cannot exhaust the pool, and `ROLLBACK` failures no longer mask the original error. |
| Deploy verification | The health poll waits for the deployed commit instead of exiting on the first 200 from the *old* instance. |
| Deploy safety | `concurrency: production-deploy` prevents two overlapping migration runs; the deploy hook fails on a bad or missing secret. |
| Workflow permissions | `permissions: contents: read` on all three workflows. |
| Schema | `cart_items` referenced a non-existent `products` table on SQLite, which broke `DELETE FROM users` outright. Repaired, and the source migration corrected so fresh dev/CI databases are right. |
| Data purge | Rewritten: transactional, dry-run by default, preserves Mock Shops and their owners, sweeps dependent rows generically, and verifies referential integrity before committing. |
| Website login | `/login` no longer depends on the production-disabled `mockLogin()`. Real phone-OTP and email sign-in, with the dev role picker compiled out of production. |
| Services page | `060_local_services.sql` had no `.sqlite.sql` counterpart, so `local_services` and `service_bookings` existed in production and in no local or CI environment. `/services/nearby` failed on every call there and the page rendered an empty state rather than an error. Ported. |
| Live testing | `start-live-tunnel.ps1` opens the tunnel, rewrites `apps/mobile/.env` and starts Expo, instead of printing instructions. |
