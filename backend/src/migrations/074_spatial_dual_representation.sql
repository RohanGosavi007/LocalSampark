-- Migration 074 (PostgreSQL): flat lat/lng plus a derived PostGIS geography
--
-- Counterpart to 074_spatial_dual_representation.sqlite.sql. Same contract:
--
--   latitude / longitude   source of truth. Plain columns, identical on both
--                          engines, so ordinary application code is portable.
--   coordinate             derived GEOGRAPHY(Point,4326), maintained by trigger
--                          and never written by application code, with a GiST
--                          index for real distance queries. SQLite's equivalent
--                          is an R*Tree virtual table.
--
-- PostgreSQL previously stored only `coordinate` while SQLite stored only
-- latitude/longitude, so queries written against one engine failed on the
-- other. Here the existing coordinate values are read back into latitude and
-- longitude first, so nothing is lost, and from then on the derivation runs one
-- way: lat/lng in, geography out.
--
-- Everything is guarded on PostGIS being installed. Without it the geography
-- half is skipped and the flat columns still work, rather than the migration
-- failing outright.
--
-- NOT EXECUTED: no PostgreSQL instance was available. Review before applying.

-- ── local_shops ────────────────────────────────────────────────────────────
ALTER TABLE local_shops ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE local_shops ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    -- Recover flat values from any geography already stored, so the backfill
    -- direction is geography -> lat/lng exactly once.
    EXECUTE $q$
      UPDATE local_shops
         SET latitude  = ST_Y(coordinate::geometry),
             longitude = ST_X(coordinate::geometry)
       WHERE coordinate IS NOT NULL AND (latitude IS NULL OR longitude IS NULL)
    $q$;

    EXECUTE $q$
      CREATE OR REPLACE FUNCTION sync_coordinate_from_latlng() RETURNS trigger AS $fn$
      BEGIN
        IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
          NEW.coordinate := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
        END IF;
        RETURN NEW;
      END;
      $fn$ LANGUAGE plpgsql
    $q$;

    DROP TRIGGER IF EXISTS local_shops_sync_coordinate ON local_shops;
    EXECUTE $q$
      CREATE TRIGGER local_shops_sync_coordinate
      BEFORE INSERT OR UPDATE OF latitude, longitude ON local_shops
      FOR EACH ROW EXECUTE FUNCTION sync_coordinate_from_latlng()
    $q$;

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_local_shops_geo ON local_shops USING GIST (coordinate)';
  ELSE
    RAISE NOTICE '074: PostGIS not installed — geography sync skipped; latitude/longitude still added.';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_local_shops_latlng ON local_shops(latitude, longitude);

-- ── marketplace_listings ───────────────────────────────────────────────────
-- latitude/longitude were added by migration 067.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    EXECUTE $q$
      UPDATE marketplace_listings
         SET latitude  = ST_Y(coordinate::geometry),
             longitude = ST_X(coordinate::geometry)
       WHERE coordinate IS NOT NULL AND (latitude IS NULL OR longitude IS NULL)
    $q$;

    DROP TRIGGER IF EXISTS marketplace_sync_coordinate ON marketplace_listings;
    EXECUTE $q$
      CREATE TRIGGER marketplace_sync_coordinate
      BEFORE INSERT OR UPDATE OF latitude, longitude ON marketplace_listings
      FOR EACH ROW EXECUTE FUNCTION sync_coordinate_from_latlng()
    $q$;

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_marketplace_geo ON marketplace_listings USING GIST (coordinate)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_marketplace_latlng ON marketplace_listings(latitude, longitude);

-- ── orders ─────────────────────────────────────────────────────────────────
-- delivery_lat / delivery_lng were added by migration 071. delivery_coordinate
-- has its own column name, so it needs its own trigger function.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    EXECUTE $q$
      UPDATE orders
         SET delivery_lat = ST_Y(delivery_coordinate::geometry),
             delivery_lng = ST_X(delivery_coordinate::geometry)
       WHERE delivery_coordinate IS NOT NULL AND (delivery_lat IS NULL OR delivery_lng IS NULL)
    $q$;

    EXECUTE $q$
      CREATE OR REPLACE FUNCTION sync_delivery_coordinate() RETURNS trigger AS $fn$
      BEGIN
        IF NEW.delivery_lat IS NOT NULL AND NEW.delivery_lng IS NOT NULL THEN
          NEW.delivery_coordinate := ST_SetSRID(ST_MakePoint(NEW.delivery_lng, NEW.delivery_lat), 4326)::geography;
        END IF;
        RETURN NEW;
      END;
      $fn$ LANGUAGE plpgsql
    $q$;

    DROP TRIGGER IF EXISTS orders_sync_delivery_coordinate ON orders;
    EXECUTE $q$
      CREATE TRIGGER orders_sync_delivery_coordinate
      BEFORE INSERT OR UPDATE OF delivery_lat, delivery_lng ON orders
      FOR EACH ROW EXECUTE FUNCTION sync_delivery_coordinate()
    $q$;

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_orders_delivery_geo ON orders USING GIST (delivery_coordinate)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_delivery_latlng ON orders(delivery_lat, delivery_lng);
