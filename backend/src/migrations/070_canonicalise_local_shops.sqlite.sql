-- Migration 070 (SQLite): align local_shops with the PostgreSQL schema
--
-- The two engines disagree on local_shops, and code written against one fails
-- on the other. Verified with scripts/verify-column-usage.js, which attributes
-- a column to a table by parsing single-table SQL statements rather than
-- grepping for the bare word — `status` alone matches 196 files and tells you
-- nothing.
--
-- Confirmed live queries that fail on SQLite today:
--   SELECT COUNT(*) FROM local_shops WHERE is_active = true
--     src/modules/core/routes/dashboard.routes.js:24      (dashboard metrics)
--     src/modules/crm/routes/admin.routes.js:415,1124,1163 (god-mode, region summary)
--     src/jobs/analytics-snapshot.job.js                   (nightly snapshot)
--
-- PostgreSQL declares is_active, opening_hours and photo_urls; SQLite never got
-- them. Here PostgreSQL is the correct side, so SQLite adopts its columns.
-- (The reverse case — phone_number vs phone — is handled in the PostgreSQL
-- migration, where SQLite's name wins.)
--
-- `coordinate` is deliberately NOT added: PostgreSQL stores GEOGRAPHY(Point)
-- while SQLite has latitude/longitude. That is a structural difference, not a
-- naming one, and collapsing it needs a decision about which representation the
-- application should use.

ALTER TABLE local_shops ADD COLUMN is_active INTEGER DEFAULT 1;
ALTER TABLE local_shops ADD COLUMN opening_hours TEXT;
ALTER TABLE local_shops ADD COLUMN photo_urls TEXT DEFAULT '[]';
ALTER TABLE local_shops ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Existing shops are active unless explicitly unapproved, so the dashboard
-- counts stay meaningful the moment the column exists.
UPDATE local_shops
   SET is_active = CASE WHEN approval_status = 'rejected' THEN 0 ELSE 1 END
 WHERE is_active IS NULL;

CREATE INDEX IF NOT EXISTS idx_local_shops_active ON local_shops(is_active, region_id);
