-- 003_shop_expansion.sqlite.sql

-- 1. Add new columns to local_shops (SQLite requires separate ALTER statements)
ALTER TABLE local_shops ADD COLUMN shop_type TEXT DEFAULT 'retail';
ALTER TABLE local_shops ADD COLUMN approval_status TEXT DEFAULT 'pending';

-- 2. Create new tables
CREATE TABLE IF NOT EXISTS shop_staff (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    profile_image TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_appointments (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    staff_id TEXT REFERENCES shop_staff(id) ON DELETE SET NULL,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    appointment_date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_orders (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    items TEXT NOT NULL,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_offers (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    discount_percentage INTEGER DEFAULT 0,
    valid_until TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
