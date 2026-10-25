-- Migration: 128_coupons_engine.sql
-- Database-backed promotional coupon engine with usage limits and per-user tracking

CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL DEFAULT 'fixed',
    discount_value NUMERIC NOT NULL DEFAULT 0,
    min_order_amount NUMERIC DEFAULT 0,
    max_discount_amount NUMERIC,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    max_uses INTEGER NOT NULL DEFAULT 1000,
    current_uses INTEGER NOT NULL DEFAULT 0,
    per_user_limit INTEGER DEFAULT 1,
    first_order_only BOOLEAN DEFAULT false,
    shop_id TEXT,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE coupons ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'fixed';
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS min_order_amount NUMERIC DEFAULT 0;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_discount_amount NUMERIC;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS per_user_limit INTEGER DEFAULT 1;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS first_order_only BOOLEAN DEFAULT false;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS shop_id TEXT;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- If legacy discount_amount exists, relax NOT NULL and populate discount_value
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupons' AND column_name = 'discount_amount') THEN
    ALTER TABLE coupons ALTER COLUMN discount_amount DROP NOT NULL;
    UPDATE coupons SET discount_value = discount_amount WHERE (discount_value = 0 OR discount_value IS NULL) AND discount_amount > 0;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id TEXT PRIMARY KEY,
    coupon_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    order_id TEXT,
    discount_applied NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON coupon_redemptions (coupon_id, user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_shop ON coupons (shop_id);

-- Initial launch seed coupons
INSERT INTO coupons (id, code, discount_type, discount_value, min_order_amount, max_discount_amount, max_uses, per_user_limit, first_order_only, description) VALUES
('cpn-welcome50', 'WELCOME50', 'fixed', 50, 200, 50, 5000, 1, true, '₹50 off on your first order!'),
('cpn-freedelivery', 'FREEDELIVERY', 'free_delivery', 0, 150, 50, 5000, 3, false, 'Free delivery applied!'),
('cpn-save10', 'SAVE10', 'percentage', 10, 300, 100, 5000, 5, false, '10% off up to ₹100')
ON CONFLICT (code) DO NOTHING;
