-- 046_add_metadata.sqlite.sql

ALTER TABLE universal_catalog_items ADD COLUMN metadata TEXT; -- JSON for dynamic category schemas
