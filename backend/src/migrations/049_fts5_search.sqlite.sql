-- Migration 049: Global Search FTS5
-- Creates a Full-Text Search virtual table for hyper-fast directory searches.

-- 1. Create FTS5 Virtual Table
CREATE VIRTUAL TABLE IF NOT EXISTS shop_search_index USING fts5(
  shop_id UNINDEXED,
  shop_name,
  shop_description,
  category,
  tags,
  tokenize='porter'
);

-- 2. Populate FTS5 table with existing shops
INSERT INTO shop_search_index(shop_id, shop_name, shop_description, category, tags)
SELECT id, name, description, category, tags FROM local_shops;

-- 3. Triggers to keep FTS index updated when a shop is created, updated, or deleted.

CREATE TRIGGER IF NOT EXISTS after_shop_insert
AFTER INSERT ON local_shops
BEGIN
  INSERT INTO shop_search_index(shop_id, shop_name, shop_description, category, tags)
  VALUES (new.id, new.name, new.description, new.category, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS after_shop_update
AFTER UPDATE ON local_shops
BEGIN
  DELETE FROM shop_search_index WHERE shop_id = old.id;
  INSERT INTO shop_search_index(shop_id, shop_name, shop_description, category, tags)
  VALUES (new.id, new.name, new.description, new.category, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS after_shop_delete
AFTER DELETE ON local_shops
BEGIN
  DELETE FROM shop_search_index WHERE shop_id = old.id;
END;
