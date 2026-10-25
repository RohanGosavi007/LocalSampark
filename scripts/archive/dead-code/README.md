Files removed from `backend/src` because nothing imports them and their SQL names
columns the tables do not have (found by `backend/scripts/verify-column-usage.js`).
Kept, not deleted, in case the intent is wanted back.

- `equipment.controller.js` — the live rental routes are in
  `modules/services/routes/equipment.routes.js` and use `listing_id`,
  `deposit_held`, `coins_used`. This wrote `equipment_id`, `rent_paid_fiat` …,
  which `equipment_rentals` has never had. It also carried uncommitted edits at
  the time it was moved.
- `price.comparison.js` — `getCheapestNearbyShops()` has no caller. It selects
  `local_shops.lat` / `.lng` (the columns are `latitude` / `longitude`) and uses
  `acos`/`radians`, which SQLite does not have without a build option.

- `checkout.service.js` and `PricingEngine.js` — the pre-`orderPlacement.service`
  checkout. Nothing in `backend/src` imports either (only the manual script
  `scripts/test_enterprise_engine.js` does). Both selected columns that do not
  exist (`shop_categories.allowed_payment_methods`,
  `franchise_partners.commission_share_percent`), so calling them failed.

- `cron_saas_expiries.js` — superseded by `jobs/subscription-expiry.job.js`, which runs hourly
  from server.js and does the same expiry with a guard on the row it just read.
  Its require path was also wrong (`../../config/database`).

- `campaignScheduler.js` — never started; needed Redis (BullMQ) and used `NOW()`. Replaced by
  `jobs/campaign-schedule.job.js` (node-cron, portable SQL, registered in server.js).

- `admin.routes.before-dedupe.js` — `modules/crm/routes/admin.routes.js` as it was before 86 shadowed
  registrations were removed (221 -> 135 routes, 2992 -> 1429 lines). Express serves the FIRST
  registration of a method+path, so the later copies - older inline versions of routes that had
  since moved to controllers - never ran. A snapshot of every route's handler source was taken
  before and after and is identical. Kept for reference only; not loaded by anything.
