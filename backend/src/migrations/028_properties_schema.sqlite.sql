-- Migration: Properties & Real Estate Schema

CREATE TABLE IF NOT EXISTS local_property_listings (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    title TEXT NOT NULL,
    property_type TEXT NOT NULL,
    listing_type TEXT DEFAULT 'RENT',
    price REAL NOT NULL,
    deposit REAL DEFAULT 0,
    address TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    geohash TEXT,
    is_verified INTEGER DEFAULT 0,
    images_json TEXT,
    status TEXT DEFAULT 'available',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_properties_type ON local_property_listings(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_geohash ON local_property_listings(geohash);
