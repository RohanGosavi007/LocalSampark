-- ─────────────────────────────────────────────────────────────────────────────
-- 132: Admin Commerce Ops (A1–A14)
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
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS unserviceable_waitlist (
    id TEXT PRIMARY KEY,
    phone_number TEXT,
    email TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    pincode TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS is_statutory BOOLEAN DEFAULT false;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS grievance_officer TEXT;
ALTER TABLE local_shops ADD COLUMN IF NOT EXISTS commission_rate REAL DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
