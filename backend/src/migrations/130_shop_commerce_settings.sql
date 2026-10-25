-- ─────────────────────────────────────────────────────────────────────────────
-- 130: Shop Hyperlocal Commerce Settings (S1, S3, C6, D6)
--
-- Adds shop-level commerce configuration: delivery fee, min order amount,
-- delivery radius, self-delivery/pickup toggles, and seller KYC fields.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE local_shops ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 0;
ALTER TABLE local_shops ADD COLUMN IF NOT EXISTS min_order_amount NUMERIC DEFAULT 0;
ALTER TABLE local_shops ADD COLUMN IF NOT EXISTS self_delivery_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE local_shops ADD COLUMN IF NOT EXISTS pickup_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE local_shops ADD COLUMN IF NOT EXISTS delivery_radius_km REAL DEFAULT 5.0;
ALTER TABLE local_shops ADD COLUMN IF NOT EXISTS fssai_license_number TEXT;
ALTER TABLE local_shops ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE local_shops ADD COLUMN IF NOT EXISTS pan TEXT;
ALTER TABLE local_shops ADD COLUMN IF NOT EXISTS bank_account_details TEXT;
