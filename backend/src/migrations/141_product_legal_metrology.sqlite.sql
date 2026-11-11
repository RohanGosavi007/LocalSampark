-- ─────────────────────────────────────────────────────────────────────────────
-- 141: what a product page has to say about a packaged product (C4) — SQLite twin of
-- 141_product_legal_metrology.sql. A re-run reports "duplicate column", which
-- the SQLite runner treats as already applied.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE shop_products ADD COLUMN generic_name TEXT;
ALTER TABLE shop_products ADD COLUMN net_quantity TEXT;
ALTER TABLE shop_products ADD COLUMN manufacturer_details TEXT;
ALTER TABLE shop_products ADD COLUMN country_of_origin TEXT;
ALTER TABLE shop_products ADD COLUMN best_before TEXT;
ALTER TABLE shop_products ADD COLUMN consumer_care TEXT;
ALTER TABLE shop_products ADD COLUMN gallery_urls TEXT;
ALTER TABLE shop_products ADD COLUMN max_order_quantity INTEGER;
