-- ─────────────────────────────────────────────────────────────────────────────
-- 132: Admin Commerce Ops (A1–A14) [SQLite Twin]
--
-- Supports promotions CMS banners (A7), unserviceable waitlist (A9),
-- statutory grievance tracking (A11), and custom shop commission rates (A6).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS platform_banners (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    action_url TEXT,
    placement TEXT DEFAULT 'home_top',
    priority INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    start_date TEXT,
    end_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS unserviceable_waitlist (
    id TEXT PRIMARY KEY,
    phone_number TEXT,
    email TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    pincode TEXT,
    address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE support_tickets ADD COLUMN is_statutory INTEGER DEFAULT 0;
ALTER TABLE support_tickets ADD COLUMN acknowledged_at TEXT;
ALTER TABLE support_tickets ADD COLUMN grievance_officer TEXT;
ALTER TABLE local_shops ADD COLUMN commission_rate REAL DEFAULT NULL;
ALTER TABLE orders ADD COLUMN cancellation_reason TEXT;
