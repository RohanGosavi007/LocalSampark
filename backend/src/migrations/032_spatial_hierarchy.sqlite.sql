-- ═══════════════════════════════════════════════════════════════════════
-- Migration 032: Spatial 4-Tier Hierarchy
-- LocalSampark Enterprise Routing Engine
-- 
-- Hierarchy: State → District → Taluka → Territory (Pincode)
--
-- IMPORTANT: This file is SQLite. For PostgreSQL/PostGIS migration,
-- replace TEXT boundary_geojson columns with:
--   boundary geometry(Polygon, 4326)
-- and add GiST indexes:
--   CREATE INDEX USING GIST(boundary)
-- ═══════════════════════════════════════════════════════════════════════

-- ─── STATES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS location_states (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,          -- ISO code e.g. 'MH' for Maharashtra
    boundary_geojson TEXT,              -- GeoJSON Polygon as TEXT
    -- PostGIS: boundary geometry(Polygon, 4326)
    -- PostGIS: CREATE INDEX idx_states_boundary_gist ON location_states USING GIST(boundary);
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ─── DISTRICTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS location_districts (
    id TEXT PRIMARY KEY,
    state_id TEXT NOT NULL REFERENCES location_states(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    boundary_geojson TEXT,
    -- PostGIS: boundary geometry(Polygon, 4326)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(state_id, name)
);

CREATE INDEX IF NOT EXISTS idx_districts_state ON location_districts(state_id);

-- ─── TALUKAS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS location_talukas (
    id TEXT PRIMARY KEY,
    district_id TEXT NOT NULL REFERENCES location_districts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    boundary_geojson TEXT,
    -- PostGIS: boundary geometry(Polygon, 4326)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(district_id, name)
);

CREATE INDEX IF NOT EXISTS idx_talukas_district ON location_talukas(district_id);

-- ─── TERRITORIES (Pincode-level, the leaf node) ─────────────────────────
CREATE TABLE IF NOT EXISTS territories (
    id TEXT PRIMARY KEY,
    taluka_id TEXT NOT NULL REFERENCES location_talukas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                  -- Area name e.g. "Viman Nagar"
    pincode TEXT NOT NULL UNIQUE,        -- 6-digit Indian postal code
    centroid_lat REAL NOT NULL,
    centroid_lng REAL NOT NULL,
    boundary_geojson TEXT,               -- GeoJSON Polygon defining exact territory bounds
    -- PostGIS: boundary geometry(Polygon, 4326)
    -- PostGIS: centroid geometry(Point, 4326)
    -- PostGIS: CREATE INDEX idx_territories_boundary_gist ON territories USING GIST(boundary);
    -- PostGIS: CREATE INDEX idx_territories_centroid_gist ON territories USING GIST(centroid);
    radius_km REAL DEFAULT 5.0,
    tier TEXT DEFAULT 'tier3',           -- tier1 (metro) / tier2 (city) / tier3 (rural)
    zone_type TEXT DEFAULT 'urban',      -- urban / suburban / rural
    is_active INTEGER DEFAULT 1,
    launch_date TEXT,
    population_estimate INTEGER,
    local_language TEXT DEFAULT 'mr',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_territories_pincode ON territories(pincode);
CREATE INDEX IF NOT EXISTS idx_territories_active ON territories(is_active);
CREATE INDEX IF NOT EXISTS idx_territories_taluka ON territories(taluka_id);
CREATE INDEX IF NOT EXISTS idx_territories_centroid ON territories(centroid_lat, centroid_lng);

-- ─── CATEGORY-TERRITORY MATRIX (Phase 5 prep) ──────────────────────────
CREATE TABLE IF NOT EXISTS category_territory_matrix (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    territory_id TEXT NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
    is_active INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 0,          -- Higher = shown first
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, territory_id)
);

CREATE INDEX IF NOT EXISTS idx_cat_matrix_territory ON category_territory_matrix(territory_id);
CREATE INDEX IF NOT EXISTS idx_cat_matrix_category ON category_territory_matrix(category_id);

-- ─── LEGACY MAPPING TABLE ───────────────────────────────────────────────
-- Maps old regions.id → new territories.id for backward compatibility
CREATE TABLE IF NOT EXISTS legacy_region_territory_map (
    legacy_region_id TEXT PRIMARY KEY,
    territory_id TEXT NOT NULL REFERENCES territories(id) ON DELETE CASCADE
);
