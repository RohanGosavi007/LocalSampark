-- Migration: 128_coupons_engine.sqlite.sql
-- Database-backed promotional coupon engine with usage limits and per-user tracking

CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL DEFAULT 'fixed', -- 'fixed', 'percentage', 'free_delivery'
    discount_value NUMERIC NOT NULL DEFAULT 0,
    min_order_amount NUMERIC DEFAULT 0,
    max_discount_amount NUMERIC,
    start_date TEXT,
    end_date TEXT,
    max_uses INTEGER NOT NULL DEFAULT 1000,
    current_uses INTEGER NOT NULL DEFAULT 0,
    per_user_limit INTEGER DEFAULT 1,
    first_order_only INTEGER DEFAULT 0,
    shop_id TEXT,
    is_active INTEGER DEFAULT 1,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id TEXT PRIMARY KEY,
    coupon_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    order_id TEXT,
    discount_applied NUMERIC NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON coupon_redemptions (coupon_id, user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_shop ON coupons (shop_id);

-- Initial launch seed coupons
INSERT OR IGNORE INTO coupons (id, code, discount_type, discount_value, min_order_amount, max_discount_amount, max_uses, per_user_limit, first_order_only, description) VALUES
('cpn-welcome50', 'WELCOME50', 'fixed', 50, 200, 50, 5000, 1, 1, '₹50 off on your first order!'),
('cpn-freedelivery', 'FREEDELIVERY', 'free_delivery', 0, 150, 50, 5000, 3, 0, 'Free delivery applied!'),
('cpn-save10', 'SAVE10', 'percentage', 10, 300, 100, 5000, 5, 0, '10% off up to ₹100');
