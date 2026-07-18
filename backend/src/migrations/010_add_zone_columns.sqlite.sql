-- Migration: Add remaining Phase 3 columns for Zone/Region System

ALTER TABLE regions ADD COLUMN district TEXT;
ALTER TABLE regions ADD COLUMN city TEXT;
ALTER TABLE regions ADD COLUMN is_active INTEGER DEFAULT 0;
ALTER TABLE regions ADD COLUMN launch_date TEXT;
ALTER TABLE regions ADD COLUMN population_estimate INTEGER;
ALTER TABLE regions ADD COLUMN tier TEXT DEFAULT 'tier3';
ALTER TABLE regions ADD COLUMN zone_type TEXT DEFAULT 'urban';
ALTER TABLE regions ADD COLUMN local_language TEXT DEFAULT 'mr';

CREATE INDEX IF NOT EXISTS idx_regions_district ON regions (district);
CREATE INDEX IF NOT EXISTS idx_regions_pincode ON regions (pincode);
CREATE INDEX IF NOT EXISTS idx_regions_state ON regions (state);
CREATE INDEX IF NOT EXISTS idx_regions_active ON regions (is_active);

ALTER TABLE users ADD COLUMN active_zone_id TEXT REFERENCES regions(id);

CREATE TABLE IF NOT EXISTS user_saved_zones (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  region_id TEXT REFERENCES regions(id) ON DELETE CASCADE,
  label TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, region_id)
);
