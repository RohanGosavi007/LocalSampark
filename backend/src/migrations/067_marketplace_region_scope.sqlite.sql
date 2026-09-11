-- Migration 067 (SQLite): add the columns migration 064 intended, plus region scope
--
-- 064 declares latitude/longitude inside `CREATE TABLE IF NOT EXISTS
-- marketplace_listings`, but init.sqlite.sql had already created that table, so
-- the CREATE was a no-op and those two columns were never added. Its sibling
-- ALTER TABLE statements did run, which is why `zone` and `views_count` exist
-- while `latitude` does not — a confusing half-applied state.
--
-- Effects still live in the code:
--   * POST /marketplace inserts into latitude/longitude and therefore fails.
--   * The browse endpoint's radius filter reads l.latitude, gets undefined, and
--     its `if (!l.latitude) return true` lets every listing through.
--
-- SQLite has no ADD COLUMN IF NOT EXISTS; the migration runner already ignores
-- "duplicate column" errors, so re-running this is safe.

ALTER TABLE marketplace_listings ADD COLUMN latitude REAL;
ALTER TABLE marketplace_listings ADD COLUMN longitude REAL;

-- Zone scope, mirroring how local_shops scopes itself.
ALTER TABLE marketplace_listings ADD COLUMN region_id TEXT REFERENCES regions(id) ON DELETE SET NULL;

-- Backfill: a listing belongs to its seller's region. That is the only
-- attribution the existing rows support — `coordinate` is free-form TEXT and
-- `zone` is an unconstrained string. Listings whose seller has no region stay
-- NULL and are treated as unscoped rather than guessed at.
UPDATE marketplace_listings
   SET region_id = (SELECT u.region_id FROM users u WHERE u.id = marketplace_listings.seller_id)
 WHERE region_id IS NULL
   AND EXISTS (SELECT 1 FROM users u WHERE u.id = marketplace_listings.seller_id AND u.region_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_region ON marketplace_listings(region_id, status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_geo ON marketplace_listings(latitude, longitude);
