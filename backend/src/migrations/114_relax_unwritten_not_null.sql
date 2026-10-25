-- ─────────────────────────────────────────────────────────────────────────────
-- 114: NOT NULL columns the application has no value for
--
-- Most inserts that omitted a required column were fixed in the code, by
-- writing the value the statement already had under another name. These are
-- the ones where there is no value to write, so the constraint is what has to
-- give:
--
--   carpool_rides.from_coordinate, to_coordinate
--       A ride is offered by place name; coordinates are optional in the API
--       and absent whenever the driver types an address instead of picking a
--       point. Both are set when the request carries them.
--
--   marketplace_listings.coordinate
--       Likewise optional: a listing is placed by region, and latitude /
--       longitude are sent only when the seller shares a location.
--
--   franchise_payouts.period_start, period_end, total_territory_revenue
--       Written for a settlement over a period. A payout *claim* — a partner
--       withdrawing from their wallet — is recorded in the same table and has
--       no period and no territory revenue to report.
--
-- In each case the insert failed on the constraint: no ride could be offered,
-- no listing published without coordinates, no payout claimed.
--
-- DROP NOT NULL on a column that is already nullable is a no-op.
--
-- NOT EXECUTED: no PostgreSQL instance was available in this environment.
-- Review before applying to production. The SQLite counterpart is
-- 114_relax_unwritten_not_null.js.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE carpool_rides ALTER COLUMN from_coordinate DROP NOT NULL;
ALTER TABLE carpool_rides ALTER COLUMN to_coordinate DROP NOT NULL;

ALTER TABLE marketplace_listings ALTER COLUMN coordinate DROP NOT NULL;

ALTER TABLE franchise_payouts ALTER COLUMN period_start DROP NOT NULL;
ALTER TABLE franchise_payouts ALTER COLUMN period_end DROP NOT NULL;
ALTER TABLE franchise_payouts ALTER COLUMN total_territory_revenue DROP NOT NULL;
