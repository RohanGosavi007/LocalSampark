-- Migration 147: catalogue search (C5).
-- pg_trgm gives trigram similarity, so a search tolerates typos ("basmatti",
-- "bred"); the GIN indexes let the database find candidates without reading
-- the whole catalogue. The category index serves the category facet.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_shop_products_name_trgm ON shop_products USING gin (LOWER(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_local_shops_name_trgm ON local_shops USING gin (LOWER(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_shop_products_category ON shop_products (category);
