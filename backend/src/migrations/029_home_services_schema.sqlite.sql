-- Migration: Home Services Schema

CREATE TABLE IF NOT EXISTS home_service_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    base_inspection_fee REAL DEFAULT 199.0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS home_service_providers (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    category_id TEXT NOT NULL,
    experience_years INTEGER DEFAULT 3,
    rating REAL DEFAULT 4.8,
    is_available INTEGER DEFAULT 1,
    serviced_pincodes_json TEXT DEFAULT '[]',
    geohash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS home_service_bookings (
    id TEXT PRIMARY KEY,
    booking_ref TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    booking_date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    service_address TEXT NOT NULL,
    pincode TEXT NOT NULL,
    problem_description TEXT,
    inspection_fee REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hs_providers_category ON home_service_providers(category_id);
CREATE INDEX IF NOT EXISTS idx_hs_bookings_user ON home_service_bookings(user_id);
