# Go-live checklist

Everything here needs an account, a device or a decision I do not have. Each
item is reduced to the commands to run.

---

## 0. URGENT — a GitHub token is sitting in plaintext on this machine

`.git/config` stores the `origin` remote as
`https://ghp_…@github.com/RohanGosavi007/LocalSampark.git`. That embeds a
GitHub **personal access token** in the URL.

It is **not** in the repository history — it is local only, so it has not been
published. But it is a long-lived credential in plaintext on disk: it leaks
through backups, screen shares, or anyone copying the `.git` directory, and it
is sent on every fetch and push.

Git Credential Manager is already configured for this repo
(`credential.helper=manager`), so the token in the URL is redundant — GCM can
hold it securely instead.

```bash
# 1. Strip the token from the remote
git remote set-url origin https://github.com/RohanGosavi007/LocalSampark.git

# 2. Verify it is gone
git remote -v

# 3. Revoke the old token at
#    https://github.com/settings/tokens  -> delete the ghp_iazs… token
#    Then push once; GCM will prompt and store a fresh credential securely.
```

I did not run this: it is your credential, and swapping auth mid-session could
interrupt a push. It is one command to undo if anything misbehaves.

---

## 1. P0 — Keystore password is on GitHub

Better news than expected. The password is in **exactly one commit**, `8730a11`,
which is `HEAD` and is already pushed to `origin/main`:

```
MYAPP_UPLOAD_STORE_PASSWORD=localsampark
MYAPP_UPLOAD_KEY_PASSWORD=localsampark
```

Because it is only the tip commit, this does not need a full history rewrite.

```bash
# The working tree is already clean (secrets moved to the gitignored
# android/keystore.properties). Commit that, then rewrite just the tip:
git add -A
git commit -m "Move signing credentials out of tracked gradle.properties"

# Squash the secret out of 8730a11 by rewriting the last two commits into one:
git reset --soft HEAD~2
git commit -m "Update mobile theme, workflows, web checkout, and townsquare moderation"
git push --force-with-lease origin main
```

`--force-with-lease` refuses if someone else pushed meanwhile. Anyone else with
a clone must re-clone; `git pull` will not discard the old object.

**Then change the passwords**, since they were public. This does *not* change
the certificate, so app updates keep working:

```bash
cd apps/mobile/android
keytool -storepasswd -keystore app/release.keystore
keytool -keypasswd  -keystore app/release.keystore -alias localsampark
# update android/keystore.properties with the new values
./gradlew :app:signingReport   # confirm the release variant still resolves
```

Whether to rotate the **key itself** depends on Play App Signing enrolment —
`apps/mobile/android/KEYSTORE.md` has that decision tree. Do not rotate blind.

---

## 2. P0 — Fill in the Render secrets

`render.yaml` now declares these `sync: false`, so Render prompts for each.
Until they are set, payment and billing webhooks **correctly reject** — that is
the fix working, but those endpoints stay closed.

Generate your own rather than reusing anything from a chat log:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

| Variable | Where it comes from |
|---|---|
| `JWT_SECRET` | generate (48 bytes) |
| `JWT_REFRESH_SECRET` | generate (48 bytes) |
| `PAYMENT_WEBHOOK_SECRET` | generate, then paste the same value into the Razorpay/Cashfree webhook config |
| `SAAS_WEBHOOK_SECRET` | generate, same again |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → signing secret (`whsec_…`) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay Dashboard → Account & Settings → API Keys |
| `MSG91_AUTH_KEY` / `MSG91_TEMPLATE_ID` | MSG91 Dashboard |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Firebase Console → Service accounts → Generate new private key |

Changing `JWT_SECRET` invalidates every existing session — expected, and a
reasonable thing to do once given everything above.

On boot the API now prints exactly which webhook secrets are missing and which
endpoint each one disables, so the logs will tell you if one was skipped.

---

## 3. P0 — Purge demo credentials from the production database

The `+919000000001`–`012` accounts map to the twelve platform roles, and the
sweep also found that `admin-auth.routes.js` still honours legacy
`mock_pin_<pin>` hashes from seed data — a seeded `mock_pin_123456` means that
admin's PIN is literally `123456`.

Both code paths are now gated, so this is defence in depth.

```bash
cd backend
# Reports what it would remove; changes nothing.
NODE_ENV=production DATABASE_URL=<prod-url> node src/scripts/purge_demo_credentials.js

# After taking a database backup:
NODE_ENV=production DATABASE_URL=<prod-url> node src/scripts/purge_demo_credentials.js --apply
```

Dry-run by default. Any admin whose PIN row is removed needs a new PIN issued
before they can sign in.

---

## 4. P0 — Smoke-test a release build on a device

R8 and resource shrinking are both on, and the ABI set changed to include
`armeabi-v7a`. Minification breakage only ever shows up in release.

```bash
cd apps/mobile
npm run build:android:release
# install on a physical device, then walk through:
```

- Wrong OTP → must show "Verification Failed", must **not** log in
- Airplane mode → must show a network error, must **not** log in
- Backend unreachable → same
- No "Quick Developer Preset Logins" panel anywhere on the login screen
- Wallet shows a real balance or ₹0.00 — never ₹750
- Razorpay checkout opens and completes
- Camera, location, push notification permission prompts
- A `localsampark://` deep link, and an `https://localsampark.in` link

The JS side of this is already verified — a production bundle was inspected and
contains none of the bypass strings. What a device adds is proof that the native
keep-rules hold at runtime.

---

## 5. P1 — Deploy the web app, then confirm App Links

`apps/web/public/.well-known/assetlinks.json` is committed but must be live on
the domain before Android will verify anything.

```bash
curl -s https://localsampark.in/.well-known/assetlinks.json   # 200, application/json, no redirect
adb shell pm get-app-links in.localsampark.app                # expect: verified
```

The fingerprint listed is the current upload keystore. If you enrol in Play App
Signing, or change the keystore per section 1, add the new fingerprint — see
`apps/web/public/.well-known/README.md`.

---

## 6. P1 — Sentry source maps

Correcting earlier guidance: `eas build` runs Gradle on Expo's servers, so a
GitHub Actions secret never reaches it. It has to be an EAS secret.

```bash
cd apps/mobile
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value <token>
eas secret:create --scope project --name SENTRY_ORG      --value <org-slug>
eas secret:create --scope project --name SENTRY_PROJECT  --value <project-slug>
```

`.github/workflows/mobile-release.yml` now warns when this is unset rather than
failing the release.

---

## 7. ✅ CLOSED — Rider ownership

Migration `089_delivery_riders_user_id` adds `delivery_riders.user_id`, indexes
it, and backfills it by matching the last ten digits of the phone number
(`delivery_riders.phone` is stored bare, `users.phone_number` carries +91).

`rider.controller.js` now resolves the rider by `req.params.id` and enforces
ownership through that column. It **fails closed** on an unlinked row rather
than falling open, so the migration has to be applied before rider status and
location updates work:

```bash
cd backend && npm run migrate
```

Two live bugs were fixed alongside it: `updateRiderStatus` and
`updateLocation` keyed their writes on `req.user?.id || req.params.id`, so once
the routes required authentication every update matched zero rows and still
replied "Status updated" — and every GPS fix was filed against a rider_id that
matched no rider. Rider status is also now validated against
`[offline, available, on_delivery]`; the column has no CHECK constraint, so any
string could previously be written and the dispatch engine's
`status = 'available'` filter would quietly stop matching that rider.

`POST /logistics/riders/register` stays public — it is the onboarding entry
point — but now runs under `optionalAuth`, so a rider onboarding from inside
the app is linked immediately instead of relying on the backfill. It still
accepts an unverified name and phone, so tying it to a verified OTP is worth
doing before launch.

10 tests.

---

## 8. ✅ CLOSED — Order status transitions are role-scoped

`PATCH /orders/:id/status` now checks who is asking, narrowest first:

| Actor | May set |
|---|---|
| Customer (own order) | `CANCELLED`, and only from `PENDING` or `ACCEPTED` |
| Assigned rider (`deliveryRoute.runnerId`) | `OUT_FOR_DELIVERY`, `DELIVERED` |
| Shop owner (`shop.ownerId`) | any status, own orders only |
| Admin roles | any status |

Anything else is a 403 whose message does not distinguish "not yours" from
"not allowed from here", so an unrelated caller cannot use it to discover
whether an order id exists or what state it is in.

This mattered because `DELIVERED` also writes `paymentStatus = 'PAID'`: before
the check, any signed-in user could mark any order paid. 13 tests.

---
## 9. P2 — Collapse the six duplicate category rows

`shop_categories` carries six pairs that mean the same trade:

```
pest-control       / pest-control-services
deep-cleaning      / deep-cleaning-services
physiotherapy      / physiotherapy-chiropractic
pathology-labs     / pathology-labs-diagnostics
ro-water-purifier  / ro-water-purifier-service
catering-party     / catering-party-services
```

Each pair splits one trade across two ids, so a resident filtering by "Pest
Control" sees only half the shops, and every routing map has to carry two
entries for one archetype. All three maps now handle both spellings, so the
behaviour is correct — but the data is still split.

```bash
cd backend
# Reports what it would re-point and delete; changes nothing.
NODE_ENV=production DATABASE_URL=<prod-url> node src/scripts/merge_duplicate_categories.js

# After a database backup:
NODE_ENV=production DATABASE_URL=<prod-url> node src/scripts/merge_duplicate_categories.js --apply
```

It re-points `local_shops`, `category_attributes`, `category_territory_matrix`
and the self-referential `parent_category_id`, then deletes the duplicate row.

`shop_products`, `home_service_bookings` and `home_service_providers` also carry
a `category_id` but declare no foreign key, so it is not certain they use this
taxonomy rather than one of their own. If any of their rows reference a
duplicate id, the script **refuses to apply** and names the table instead of
guessing.

Afterwards, drop the six duplicate keys from the three routing maps — the parity
test fails until all three agree again.

Left to you because it deletes rows from a live table.

---

## 10. P0 — Set `USE_MOCK_CATALOG` on every non-production deploy

`shop.routes.js` served fabricated shops, categories, products, services, staff
and appointment slots on any request where `NODE_ENV !== 'production'`. That is
not just a developer's laptop — staging, QA and every preview deploy matched it,
and the mobile storefront wires those records straight into the real cart.

It is now an explicit opt-in: `USE_MOCK_CATALOG=true`. **Do not set it** on any
environment a person other than a developer will open. Local development that
wants the sample catalog back sets it in `backend/.env`.

Nothing to do for production — the flag additionally refuses to apply when
`NODE_ENV === 'production'` — but confirm staging does not have it set.

---

## 11. P0 — Run migrations 091, 092 and 093 before go-live

`091_fleet_rentals.sql` — `fleet_assets`, `rental_bookings`,
`fleet_asset_logs`. All seven endpoints under `/api/v1/fleet-assets` queried
these and no migration created them, so the heavy-equipment and vehicle-rental
archetype answered 500 on every call.

`092_sos_alerts.sql` — `sos_alerts`, `emergency_contacts`. Every handler in
the SOS controller reads or writes one of them, and neither existed outside a
developer's local SQLite file. **This is the one not to forget**: the Medical
screen, the resident dashboard and the SOS dispatch board all raise real alerts
through it.

`093_missing_runtime_tables.sql` — the remaining 32, spanning payments, payouts,
franchise earnings, the CRM (leads, campaigns, tickets, disputes), the service
verticals (care, home chef, job cards, token queues), community and admin ops.
It also adds `orders.special_instructions`, which checkout collected and had
nowhere to put.

All three were executed against a scratch SQLite database using the migration
runner's own statement splitter before being committed — 65 statements, 32
tables, 32 indexes for 093 alone. Both dialect variants exist for each, and the
SQLite variant of 093 is generated from the PostgreSQL one so they cannot drift.

---

## 12. ✅ CLOSED — The shop-management dual-stack split

The backend ran two schemas over one domain. `requireShopOwner` resolved
`req.shop` from the Prisma `shops` table while 34 of the 37 handlers that read
it queried raw-SQL tables keyed by `local_shops` — a different id space, so
those queries matched nothing, silently, on every request.

Closed by moving the whole shop-management and unified-superapp surface onto the
raw-SQL stack, which is what the storefront, cart, checkout, analytics and seeds
already use:

| Handler | Was | Now |
| --- | --- | --- |
| `requireShopOwner` | `prisma.shop` (`shops`) | `local_shops` |
| product CRUD | `products` | `shop_products` |
| merchant order queue + status | `universal_orders` | `orders` |
| appointments + status | `appointments` (no such table) | `shop_appointments` |
| bookable services | `service_slots` (no such table) | `shop_services` |
| shop dashboard | Prisma, paise columns | raw SQL, rupee columns |
| KDS tickets | `prisma.kDSTicket` | `kds_tickets` |
| delivery jobs | `delivery_routes` (no such table) | `orders` |
| **customer checkout** | Prisma, paise columns | `orders` + `order_items` |
| **appointment booking** | `service_slots`/`appointments` | `shop_services`/`shop_appointments` |

Neither `shop-management.controller.js` nor `unified-superapp.controller.js`
imports Prisma any more.

Consequences worth knowing:

- The merchant order queue read `universal_orders`, whose only writer anywhere
  is `payments.controller.js`. Customer orders go to `orders`. **A merchant has
  never seen a real customer order in that queue.**
- The mobile app POSTs to `/checkout`, which resolves to the unified controller
  (mounted before `checkout.routes.js`). That handler wrote `prisma.order` with
  paise columns. **The live customer checkout could not complete an order** on a
  database built from the migrations.
- `completeJob` checked that the delivery OTP was four characters long and never
  compared it — its own comment read "If we had OTP stored in DB". It is stored,
  in `orders.otp_code`. Any four digits closed out any assigned delivery. It is
  now a constant-time comparison.
- `GET /shops/nearby` — the endpoint the Directory tab depends on — filtered on
  Prisma camelCase columns (`"isLive"`, `categoryId`, `"coverageRadiusKm"`) that
  `local_shops` does not have, used the PostgreSQL earthdistance extension, and
  interpolated `category`, `region_id` and `pincode` straight from the query
  string into the SQL on an unauthenticated route. Rewritten with bound
  parameters, real column names and a dialect-neutral distance.

`getShopById` in the unified controller was shadowed by `shop.routes.js` and
never ran; it now returns 410 and its route registration is commented out, so a
future change to mount order cannot silently make a broken handler live.

---

## 13. ✅ CLOSED — Tables the code queries that no migration creates

Started at 39. Six were name drift onto the Prisma half of the old dual schema
and were fixed by repointing the query rather than creating a table:

| Queried | Repointed to |
| --- | --- |
| `shops` | `local_shops` |
| `products` | `shop_products` |
| `appointments` | `shop_appointments` |
| `notifications` | `shop_notifications` (owner column `recipient_id`) |
| `franchises` | `franchise_partners` |
| `delivery_routes` | `orders` |

The other 33 are created by migrations 091–093.
`backend/src/__tests__/tablesExist.test.js` now asserts the set is empty, and a
regression injection confirms it catches a new one.

One repoint was also a money bug: `bills.routes.js` credited its 1% commission
to `SELECT id FROM franchises LIMIT 1` under a comment saying "we mock by
picking the first franchise". Had that table existed, every bill paid anywhere
would have credited whichever partner sorted first. It now matches the payer's
pincode to a partner's territory, and credits nobody if there is no match.

---

## 14. P2 — Screens that still render invented records

Two guards in `apps/mobile/__tests__/noFabricatedData.test.js`:

1. **By name** — a list of strings known to be fabrications. Down from 18 pinned
   files to one (`src/context/AuthContext.js`, whose two sites sit behind
   `__DEV__` and are stripped from a release build; it stays listed so the guard
   notices if that gating is removed).

2. **By shape** — an array of two or more objects that each read like a database
   row, in a screen that calls no API. This exists because the name list can only
   catch invented names somebody has already seen: three files found late in the
   previous round were found by grepping the release bundle, not by the test.

The shape check found 32 more screens on its first run and pins them; four were
fixed immediately because of what they were:

- **`app/modules/sos-dashboard/index.js`** — the board somebody watches to
  dispatch help, showing three permanent fake emergencies ("Medical, Rahul K.,
  Block A Dhanori, 2 min ago, critical"). A real alert arriving would have been
  indistinguishable from them.
- **`app/modules/health/index.js`** — three hospitals and three doctors with
  dialable phone numbers, including "Surya Mother & Child Care — NICU Available,
  1.5 km". Its SOS button announced "All neighbors within 5km radius alerted.
  Local ambulance dispatched" and called nothing.
- **`app/(admin)/payouts.js`** — ₹80,800 of invented withdrawal requests whose
  Approve button only changed React state.
- **`app/modules/franchise/index.js`** (previous round) — investment tiers paired
  with fabricated monthly returns.

The remaining ~28 are listed in `SEEDED` in that test file. None is a payment or
safety path. Work through them and delete each entry as its screen is wired.

The `UI_CONFIG` list beside it holds arrays that are legitimately hardcoded —
the tab bar, the UPI apps supported, onboarding slides, the fixed captions of a
status timeline. Those describe the app's own interface, not the world outside
it.

---

## 15. How to check a build for invented data

The single most effective check found in this work, and the one that kept
turning up screens the source-level tests missed:

```bash
cd apps/mobile
npx expo export:embed --platform android --dev false \
  --bundle-output /tmp/b/index.android.bundle --assets-dest /tmp/b/assets

grep -c "Sharma Grocery" /tmp/b/index.android.bundle
```

Anything that ships is in that file. Grep it for named people, branded products,
rupee amounts and phrases like "Successful", "Submitted", "Dispatched". A hit
inside a form `placeholder` is fine — "e.g. Sharma Grocery" is a hint, not a
record. A hit anywhere else is a claim the app is making to a user.

---

## Known and deliberately left alone

- **`modules/crm/routes/rbac.routes.js`** is not mounted in `routes/index.js`, so
  it is dead. Worth noting because every write endpoint in it returns success
  without doing anything — `POST /rbac/assign` replies "Role assigned
  successfully" and assigns nothing. If you ever mount it, implement it first.
- **APK, not AAB** — your call. Play requires `bundleRelease` if that changes.
- **`eas.json` production `buildType: "apk"`** left to match.
