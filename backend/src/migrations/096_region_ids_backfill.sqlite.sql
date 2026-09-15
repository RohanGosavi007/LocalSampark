-- 096 (SQLite only): give every region a primary key.
--
-- Every row in `regions` had a NULL id — all 1,578 of them.
--
-- `regions.id` is declared `TEXT PRIMARY KEY` with no default, and SQLite is
-- alone among engines in permitting NULL in a primary key column: it treats the
-- PK as a UNIQUE index, and SQL's rule that NULLs are never equal means any
-- number of NULL "keys" can coexist. So a seeder that omitted the id inserted
-- happily, and the table looks fine until something tries to join on it.
--
-- The consequences run through the whole app, not just the ML module:
--
--   * local_shops.region_id was NULL for all 124 seeded shops, because it was
--     copied from a region row whose id was NULL.
--   * Every territory-scoped query — `WHERE region_id = $1`, the X-Territory-ID
--     header, enforceMultiTenancy, the territory-admin RBAC boundary — matched
--     nothing, silently. A territory admin scoped to their own region would see
--     an empty result set rather than an error.
--   * The `REFERENCES regions(id)` foreign keys on local_shops, admin_config,
--     ml_interaction_events and others were unenforceable.
--
-- Postgres is unaffected: init.sql declares `id UUID PRIMARY KEY DEFAULT
-- uuid_generate_v4()`, so the id was always populated there. This is a
-- SQLite-path repair, which is the path local development and the CI suite both
-- run on.
--
-- Ids are derived from the rowid so they are stable across re-runs and so a
-- second execution is a no-op. They are not RFC-4122 uuids — inventing a
-- version-4 uuid per row in pure SQL is not worth the expression — but they are
-- unique, stable TEXT keys, which is all the schema requires.

UPDATE regions
   SET id = 'region-' || printf('%08x', rowid)
 WHERE id IS NULL;

-- Territories mirror the same shape and were seeded the same way.
UPDATE territories
   SET id = 'territory-' || printf('%08x', rowid)
 WHERE id IS NULL;

CREATE INDEX IF NOT EXISTS idx_regions_lat_lng ON regions(latitude, longitude);
