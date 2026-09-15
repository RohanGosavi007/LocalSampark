-- SQLite variant of 097_centroid_trust.sql. See that file for the evidence that
-- these coordinates are fabricated and why they are flagged rather than
-- replaced.
--
-- SQLite has no ADD COLUMN IF NOT EXISTS. The runner in src/migrations/run.js
-- executes each statement independently and logs a duplicate-column error
-- without aborting the file, so a re-run is harmless; the UPDATEs below are
-- idempotent regardless.

ALTER TABLE territories ADD COLUMN centroid_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE regions ADD COLUMN coordinates_verified INTEGER NOT NULL DEFAULT 0;

UPDATE territories SET centroid_verified = 0 WHERE centroid_verified IS NULL;
UPDATE regions SET coordinates_verified = 0 WHERE coordinates_verified IS NULL;

CREATE INDEX IF NOT EXISTS idx_territories_centroid_verified
    ON territories(centroid_verified);
