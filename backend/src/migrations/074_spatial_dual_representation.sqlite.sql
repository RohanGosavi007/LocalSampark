-- Migration 074 (SQLite): flat lat/lng plus an R*Tree spatial index
--
-- The two engines disagreed on how a location is stored: PostgreSQL used
-- GEOGRAPHY(Point,4326) while SQLite had latitude/longitude, and application
-- code referenced both. Queries written against one silently failed on the
-- other, and marketplace's radius filter matched every listing because
-- l.latitude was undefined on every row.
--
-- Both representations are kept, but only one is writable:
--
--   latitude / longitude   source of truth. Plain REAL columns, identical on
--                          both engines, so ordinary application code is
--                          portable and needs no spatial functions.
--   spatial index          derived. R*Tree here, PostGIS GEOGRAPHY + GiST on
--                          PostgreSQL. Maintained by triggers, never written
--                          directly, so the two cannot drift apart.
--
-- Deriving rather than dual-writing is the point: a nullable second copy that
-- application code also writes is exactly how these two got out of step.
--
-- R*Tree availability was verified against this build before relying on it.

-- ── local_shops ────────────────────────────────────────────────────────────
-- latitude/longitude already exist here; only the index is missing.
CREATE VIRTUAL TABLE IF NOT EXISTS local_shops_rtree USING rtree(
  id,                 -- rowid alias, joined back to local_shops.rowid
  min_lat, max_lat,
  min_lng, max_lng
);

-- Seed from existing rows.
INSERT OR REPLACE INTO local_shops_rtree (id, min_lat, max_lat, min_lng, max_lng)
SELECT rowid, latitude, latitude, longitude, longitude
  FROM local_shops
 WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS local_shops_rtree_ai AFTER INSERT ON local_shops
WHEN NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL
BEGIN
  INSERT OR REPLACE INTO local_shops_rtree VALUES (NEW.rowid, NEW.latitude, NEW.latitude, NEW.longitude, NEW.longitude);
END;

CREATE TRIGGER IF NOT EXISTS local_shops_rtree_au AFTER UPDATE OF latitude, longitude ON local_shops
BEGIN
  DELETE FROM local_shops_rtree WHERE id = OLD.rowid;
  INSERT INTO local_shops_rtree
  SELECT NEW.rowid, NEW.latitude, NEW.latitude, NEW.longitude, NEW.longitude
   WHERE NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS local_shops_rtree_ad AFTER DELETE ON local_shops
BEGIN
  DELETE FROM local_shops_rtree WHERE id = OLD.rowid;
END;

-- ── marketplace_listings ───────────────────────────────────────────────────
-- latitude/longitude were added by migration 067 after 064's
-- CREATE TABLE IF NOT EXISTS silently failed to create them.
CREATE VIRTUAL TABLE IF NOT EXISTS marketplace_listings_rtree USING rtree(
  id, min_lat, max_lat, min_lng, max_lng
);

INSERT OR REPLACE INTO marketplace_listings_rtree (id, min_lat, max_lat, min_lng, max_lng)
SELECT rowid, latitude, latitude, longitude, longitude
  FROM marketplace_listings
 WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS marketplace_rtree_ai AFTER INSERT ON marketplace_listings
WHEN NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL
BEGIN
  INSERT OR REPLACE INTO marketplace_listings_rtree VALUES (NEW.rowid, NEW.latitude, NEW.latitude, NEW.longitude, NEW.longitude);
END;

CREATE TRIGGER IF NOT EXISTS marketplace_rtree_au AFTER UPDATE OF latitude, longitude ON marketplace_listings
BEGIN
  DELETE FROM marketplace_listings_rtree WHERE id = OLD.rowid;
  INSERT INTO marketplace_listings_rtree
  SELECT NEW.rowid, NEW.latitude, NEW.latitude, NEW.longitude, NEW.longitude
   WHERE NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS marketplace_rtree_ad AFTER DELETE ON marketplace_listings
BEGIN
  DELETE FROM marketplace_listings_rtree WHERE id = OLD.rowid;
END;

-- ── orders ─────────────────────────────────────────────────────────────────
-- delivery_lat / delivery_lng were added by migration 071; the table also has
-- an unused delivery_coordinate, which nothing populates.
CREATE VIRTUAL TABLE IF NOT EXISTS orders_delivery_rtree USING rtree(
  id, min_lat, max_lat, min_lng, max_lng
);

INSERT OR REPLACE INTO orders_delivery_rtree (id, min_lat, max_lat, min_lng, max_lng)
SELECT rowid, delivery_lat, delivery_lat, delivery_lng, delivery_lng
  FROM orders
 WHERE delivery_lat IS NOT NULL AND delivery_lng IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS orders_rtree_ai AFTER INSERT ON orders
WHEN NEW.delivery_lat IS NOT NULL AND NEW.delivery_lng IS NOT NULL
BEGIN
  INSERT OR REPLACE INTO orders_delivery_rtree VALUES (NEW.rowid, NEW.delivery_lat, NEW.delivery_lat, NEW.delivery_lng, NEW.delivery_lng);
END;

CREATE TRIGGER IF NOT EXISTS orders_rtree_au AFTER UPDATE OF delivery_lat, delivery_lng ON orders
BEGIN
  DELETE FROM orders_delivery_rtree WHERE id = OLD.rowid;
  INSERT INTO orders_delivery_rtree
  SELECT NEW.rowid, NEW.delivery_lat, NEW.delivery_lat, NEW.delivery_lng, NEW.delivery_lng
   WHERE NEW.delivery_lat IS NOT NULL AND NEW.delivery_lng IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS orders_rtree_ad AFTER DELETE ON orders
BEGIN
  DELETE FROM orders_delivery_rtree WHERE id = OLD.rowid;
END;
