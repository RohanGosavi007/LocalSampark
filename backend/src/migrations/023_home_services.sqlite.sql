-- Migration: 023_home_services.sqlite.sql

-- Feature Interest Leads (Logged when users tap 'Notify Me' on ComingSoonModal)
CREATE TABLE IF NOT EXISTS feature_interest_leads (
    id TEXT PRIMARY KEY,
    feature_key TEXT NOT NULL,
    pincode TEXT,
    user_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Home Service Categories (Plumbing, Electrical, AC Repair, Cleaning, Carpentry)
CREATE TABLE IF NOT EXISTS home_service_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    base_inspection_fee REAL DEFAULT 199.00,
    is_active INTEGER DEFAULT 1
);

-- Service Technicians / Providers
CREATE TABLE IF NOT EXISTS home_service_providers (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    shop_id TEXT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    category_id TEXT NOT NULL,
    experience_years INTEGER DEFAULT 1,
    hourly_rate REAL NOT NULL,
    rating REAL DEFAULT 5.0,
    total_jobs INTEGER DEFAULT 0,
    serviced_pincodes_json TEXT DEFAULT '[]',
    is_verified INTEGER DEFAULT 0,
    is_available INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(category_id) REFERENCES home_service_categories(id)
);

-- Home Service Bookings
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
    status TEXT DEFAULT 'pending',
    inspection_fee REAL NOT NULL,
    total_amount REAL,
    payment_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(provider_id) REFERENCES home_service_providers(id),
    FOREIGN KEY(category_id) REFERENCES home_service_categories(id)
);

-- Seed Default Categories
INSERT OR IGNORE INTO home_service_categories (id, name, icon, description, base_inspection_fee) VALUES
('cat_plumbing', 'Plumbing & Pipe Repair', 'wrench', 'Fix leaks, blockages, taps, and sanitary fittings', 199.00),
('cat_electrical', 'Electrical Repair & Wiring', 'zap', 'Short circuits, fan installation, wiring, and switchboards', 199.00),
('cat_ac_service', 'AC Repair & Servicing', 'wind', 'Filter cleaning, gas refill, and cooling troubleshooting', 349.00),
('cat_deep_cleaning', 'Home & Sofa Cleaning', 'sparkles', 'Full home deep cleaning, sofa, and kitchen sanitization', 499.00),
('cat_carpentry', 'Carpentry & Furniture', 'hammer', 'Door repair, furniture assembly, and wooden locks', 249.00);
