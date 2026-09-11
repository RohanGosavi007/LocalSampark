-- Migration 067 (PostgreSQL): reconcile marketplace_listings and add region scope
--
-- Two problems this fixes.
--
-- 1. marketplace_listings drifted badly between the two drivers. The SQLite DDL
--    carries 15 columns Postgres never had (zone, views_count, flash_deal_until,
--    listing_type, ...), so code written and tested against SQLite fails on
--    Postgres. This brings Postgres up to parity.
--
-- 2. latitude/longitude exist in NEITHER live schema. Migration 064 declares
--    them, but only inside a `CREATE TABLE IF NOT EXISTS` for a table that
--    already existed — so that CREATE is a silent no-op and no ALTER ever adds
--    them. Consequences already in production code:
--      * POST /marketplace inserts into latitude/longitude -> fails outright.
--      * The browse endpoint's distance filter reads l.latitude, always gets
--        undefined, and its `if (!l.latitude) return true` passes every row —
--        the radius parameter has never filtered anything.
--
-- region_id is added as an FK to regions, matching how local_shops already
-- scopes itself, so marketplace listings can finally be restricted to a zone.

-- ── Parity with the SQLite schema ───────────────────────────────────────────
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS latitude REAL;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS longitude REAL;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS seller_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS listing_type VARCHAR(30) DEFAULT 'product';
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS delivery_available BOOLEAN DEFAULT FALSE;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS flash_deal_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS zone VARCHAR(100);
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS contact_masked VARCHAR(30);
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2);
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS sold_to UUID;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS listing_mode VARCHAR(20) DEFAULT 'fixed';
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS boost_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS exchange_for TEXT;

-- ── Zone scope ─────────────────────────────────────────────────────────────
ALTER TABLE marketplace_listings
  ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id) ON DELETE SET NULL;

-- Backfill: a listing belongs to the region its seller belongs to.
--
-- That is the only attribution the existing data supports — the coordinate
-- column is a PostGIS geography with no region mapping, and `zone` is free
-- text. ON DELETE SET NULL rather than CASCADE: removing a region must not
-- delete a user's listings.
--
-- Rows whose seller has no region stay NULL and are treated as unscoped; they
-- are reported below rather than guessed at.
UPDATE marketplace_listings ml
   SET region_id = u.region_id
  FROM users u
 WHERE ml.seller_id = u.id
   AND ml.region_id IS NULL
   AND u.region_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_region
  ON marketplace_listings(region_id, status);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_geo
  ON marketplace_listings(latitude, longitude);

-- Surfaces any listing the backfill could not attribute, so it is a visible
-- number rather than silent data.
DO $$
DECLARE orphaned INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned FROM marketplace_listings WHERE region_id IS NULL;
  IF orphaned > 0 THEN
    RAISE NOTICE '067: % marketplace listing(s) have no region_id (seller had none). They will not appear in zone-scoped queries.', orphaned;
  END IF;
END $$;
