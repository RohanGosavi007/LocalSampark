-- 097: mark territory and region coordinates as unverified.
--
-- The latitude/longitude on `regions` and the centroid_lat/centroid_lng on
-- `territories` are not real. They are uniform random noise over a bounding box
-- roughly covering Maharashtra, attached to genuine place names and genuine
-- pincodes — which is what makes them dangerous: everything around them looks
-- correct.
--
-- The evidence, which needs no external dataset to reproduce:
--
--   * "Chinchwad East", pincode 411019, a suburb of Pune at roughly
--     18.63, 73.80, is recorded at 15.54, 74.64 — about 350 km away.
--   * "Botanical Garden (Pune)", 411020, is recorded at 15.05, 78.31, which is
--     in Andhra Pradesh.
--   * Territories sharing a pincode prefix belong to one postal sorting
--     district and in reality span well under 60 km. Here the mean maximum
--     spread across 22 prefixes with five or more territories is 899 km, and
--     every large prefix exceeds 900 km. Real centroids cluster; these do not.
--
-- What this migration does NOT do is invent replacements. Plausible-looking
-- coordinates would be indistinguishable from the ones already here and would
-- remove the only signal that the data is wrong. Correcting 1,578 rows requires
-- a real pincode-centroid source.
--
-- What it does is make "unknown" representable, so code can tell the difference
-- between a coordinate and a guess. A wrong coordinate is worse than a missing
-- one: spatial.repository.nearestTerritory() picks the closest territory by
-- centroid distance, and territory assignment decides which shops a user sees
-- and which admin manages them. With this data it would assign a user in Pune
-- to an arbitrary territory 400 km away, confidently, with nothing logged.
--
-- Anything verified later — by import or by hand — sets the flag to true and
-- becomes usable again, without this file needing to change.

BEGIN;

ALTER TABLE territories ADD COLUMN IF NOT EXISTS centroid_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE regions     ADD COLUMN IF NOT EXISTS coordinates_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Explicit rather than relying on the column default, so the intent is recorded
-- for rows that already existed.
UPDATE territories SET centroid_verified = FALSE WHERE centroid_verified IS NULL;
UPDATE regions     SET coordinates_verified = FALSE WHERE coordinates_verified IS NULL;

-- Spatial lookups filter on the flag, so it is worth an index.
CREATE INDEX IF NOT EXISTS idx_territories_centroid_verified
    ON territories(centroid_verified);

COMMIT;
