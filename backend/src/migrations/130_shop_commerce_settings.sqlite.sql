-- ─────────────────────────────────────────────────────────────────────────────
-- 130: Shop Hyperlocal Commerce Settings (S1, S3, C6, D6) (SQLite twin)
--
-- Adds shop-level commerce configuration: delivery fee, min order amount,
-- delivery radius, self-delivery/pickup toggles, and seller KYC fields.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE local_shops ADD COLUMN delivery_fee REAL DEFAULT 0;
ALTER TABLE local_shops ADD COLUMN min_order_amount REAL DEFAULT 0;
ALTER TABLE local_shops ADD COLUMN self_delivery_enabled INTEGER DEFAULT 1;
ALTER TABLE local_shops ADD COLUMN pickup_enabled INTEGER DEFAULT 1;
ALTER TABLE local_shops ADD COLUMN delivery_radius_km REAL DEFAULT 5.0;
ALTER TABLE local_shops ADD COLUMN fssai_license_number TEXT;
ALTER TABLE local_shops ADD COLUMN gstin TEXT;
ALTER TABLE local_shops ADD COLUMN pan TEXT;
ALTER TABLE local_shops ADD COLUMN bank_account_details TEXT;
