-- Migration: Add geohash column and spatial B-Tree indexes for ultra-fast location filtering

-- 1. Add geohash column if it doesn't exist
ALTER TABLE local_shops ADD COLUMN geohash TEXT;

-- 2. Create spatial indexes for bounding box and geohash acceleration
CREATE INDEX IF NOT EXISTS idx_shops_lat_lng ON local_shops(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_shops_geohash ON local_shops(geohash);
CREATE INDEX IF NOT EXISTS idx_shops_approval_lat_lng ON local_shops(approval_status, is_active, latitude, longitude);
