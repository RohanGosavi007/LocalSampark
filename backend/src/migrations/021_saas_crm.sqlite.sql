-- Migration: Add SaaS CRM Tables

CREATE TABLE IF NOT EXISTS saas_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_monthly REAL NOT NULL,
    stripe_product_id TEXT,
    features_json TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_subscriptions (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    plan_id TEXT REFERENCES saas_plans(id),
    status TEXT DEFAULT 'pending',
    current_period_end TEXT,
    gateway_subscription_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    event_id TEXT UNIQUE NOT NULL,
    processed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Alter local_shops to include CRM constraints
ALTER TABLE local_shops ADD COLUMN crm_tier TEXT DEFAULT 'free';
ALTER TABLE local_shops ADD COLUMN is_locked INTEGER DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vendor_subs_shop ON vendor_subscriptions (shop_id);
CREATE INDEX IF NOT EXISTS idx_vendor_subs_status ON vendor_subscriptions (status);
