-- Migration 147: catalogue search (C5).
-- SQLite has no pg_trgm: services/catalogSearch.service.js works out the same
-- trigram similarity itself. The category index serves the category facet, as
-- on PostgreSQL.
CREATE INDEX IF NOT EXISTS idx_shop_products_category ON shop_products (category);
