-- Migration 078: society_vehicles parity
--
-- The SQLite side never declared society_vehicles at all; that is repaired in
-- 078_society_vehicles_sqlite.sqlite.sql. PostgreSQL already has the table from
-- init.sql, but is missing vehicle_photo_url -- migration 034 tried to add it to
-- a table it only assumed existed, so the column never landed on either engine.
-- Added here so both engines carry the same columns.

ALTER TABLE society_vehicles ADD COLUMN IF NOT EXISTS vehicle_photo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_society_vehicles_lookup
    ON society_vehicles (society_id, vehicle_number);
