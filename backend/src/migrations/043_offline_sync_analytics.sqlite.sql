-- ═══════════════════════════════════════════════════════════════════════
-- Migration 043: Offline Sync Tracking & Shop Analytics Cache
-- 10x Plan: Section 22.1 — Offline-First for Tier-3/4 India
-- ═══════════════════════════════════════════════════════════════════════

-- Sync watermarks per device
CREATE TABLE IF NOT EXISTS sync_watermarks (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    territory_id TEXT,
    last_synced_at TEXT NOT NULL,
    records_synced INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, device_id, table_name, territory_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_user_device ON sync_watermarks(user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_sync_territory ON sync_watermarks(territory_id);

-- Offline mutation queue (server-side record of pending mutations from devices)
CREATE TABLE IF NOT EXISTS offline_mutations (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    mutation_type TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT,
    payload TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    conflict_resolution TEXT,
    applied_at TEXT,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_offline_mut_user ON offline_mutations(user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_offline_mut_status ON offline_mutations(status);

-- Shop analytics daily snapshots (pre-computed for dashboard performance)
CREATE TABLE IF NOT EXISTS shop_analytics_daily (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    
    -- Order metrics
    total_orders INTEGER DEFAULT 0,
    completed_orders INTEGER DEFAULT 0,
    cancelled_orders INTEGER DEFAULT 0,
    avg_order_value REAL DEFAULT 0,
    
    -- Revenue
    gross_revenue REAL DEFAULT 0,
    net_revenue REAL DEFAULT 0,
    delivery_revenue REAL DEFAULT 0,
    
    -- Customer metrics
    unique_customers INTEGER DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    repeat_customers INTEGER DEFAULT 0,
    
    -- Engagement
    profile_views INTEGER DEFAULT 0,
    search_appearances INTEGER DEFAULT 0,
    click_through_rate REAL DEFAULT 0,
    
    -- Reviews
    reviews_received INTEGER DEFAULT 0,
    avg_rating REAL DEFAULT 0,
    
    -- Appointments (for service shops)
    total_appointments INTEGER DEFAULT 0,
    completed_appointments INTEGER DEFAULT 0,
    no_shows INTEGER DEFAULT 0,
    
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(shop_id, date)
);

CREATE INDEX IF NOT EXISTS idx_shop_analytics_shop ON shop_analytics_daily(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_analytics_date ON shop_analytics_daily(date);

-- Zone-level analytics cache
CREATE TABLE IF NOT EXISTS zone_analytics_daily (
    id TEXT PRIMARY KEY,
    territory_id TEXT NOT NULL,
    date TEXT NOT NULL,
    
    total_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    total_shops INTEGER DEFAULT 0,
    active_shops INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_gmv REAL DEFAULT 0,
    top_categories TEXT,
    
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(territory_id, date)
);

CREATE INDEX IF NOT EXISTS idx_zone_analytics_territory ON zone_analytics_daily(territory_id);
CREATE INDEX IF NOT EXISTS idx_zone_analytics_date ON zone_analytics_daily(date);
