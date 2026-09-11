-- Migration 070 (PostgreSQL): adopt SQLite's column names where SQLite is authoritative
--
-- Counterpart to 070_canonicalise_local_shops.sqlite.sql. Where PostgreSQL has
-- the column the application actually needs, SQLite adopts it (that file). Where
-- the two engines simply spell the same thing differently, the live SQLite name
-- wins and PostgreSQL is renamed — that is this file.
--
-- local_shops.phone_number vs phone is the confirmed case: the live SQLite table
-- has `phone`, the PostgreSQL DDL declares `phone_number`, and six source files
-- reference the PostgreSQL spelling. Keeping both would leave writes landing in
-- one column and reads looking at the other.
--
-- Guarded so it is safe to re-run and safe on a database that already matches.
--
-- NOT EXECUTED: no PostgreSQL instance or Docker was available in this
-- environment. Review before applying to production.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'local_shops' AND column_name = 'phone_number'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'local_shops' AND column_name = 'phone'
  ) THEN
    ALTER TABLE local_shops RENAME COLUMN phone_number TO phone;
    RAISE NOTICE '070: renamed local_shops.phone_number -> phone';
  END IF;
END $$;

-- Columns SQLite is gaining in the paired migration, ensured present here too so
-- the two schemas end up identical rather than merely closer.
ALTER TABLE local_shops ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE local_shops ADD COLUMN IF NOT EXISTS opening_hours TEXT;
ALTER TABLE local_shops ADD COLUMN IF NOT EXISTS photo_urls JSONB DEFAULT '[]';
ALTER TABLE local_shops ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_local_shops_active ON local_shops(is_active, region_id);
