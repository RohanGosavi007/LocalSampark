-- ─────────────────────────────────────────────────────────────────────────────
-- 141: what a product page has to say about a packaged product (C4)
--
-- The Legal Metrology (Packaged Commodities) Rules, 2011 (rule 6(10), for
-- e-commerce) require the page to show, before purchase: the common or generic
-- name, the net quantity, the manufacturer's, packer's or importer's name and
-- address, the country of origin, consumer care details and, for food, the
-- best-before date. The catalogue had nowhere to keep any of them. Also: more
-- photos than one, and a per-order quantity limit a seller can set.
-- All text, entered by the seller; nothing is filled in for them.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS generic_name TEXT;
ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS net_quantity TEXT;
ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS manufacturer_details TEXT;
ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS country_of_origin TEXT;
ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS best_before TEXT;
ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS consumer_care TEXT;
ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS gallery_urls TEXT;
ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS max_order_quantity INTEGER;
