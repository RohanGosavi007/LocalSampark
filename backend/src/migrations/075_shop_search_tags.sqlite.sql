-- Migration 075 (SQLite): the tags column local_shops' search triggers require
--
-- 049_fts5_search.sqlite.sql maintains shop_search_index with triggers whose
-- bodies read new.tags:
--     INSERT INTO shop_search_index(shop_id, shop_name, shop_description, category, tags)
--     VALUES (new.id, new.name, new.description, new.category, new.tags);
-- local_shops has never had a tags column.
--
-- This went unnoticed because the migration runner split statements on `;` at
-- end of line, which tore every CREATE TRIGGER apart at the semicolons inside
-- its BEGIN ... END body. No trigger in this database was ever created, so
-- shop full-text search silently indexed nothing. Once the runner was fixed the
-- triggers came into existence and immediately began rejecting every insert
-- into local_shops with "no such column: new.tags".
--
-- Adding the column both unblocks inserts and makes the search index work as it
-- was originally written to.

ALTER TABLE local_shops ADD COLUMN tags TEXT DEFAULT '';

-- Seed the index for shops that predate the working triggers, so search is not
-- empty until each row happens to be updated.
DELETE FROM shop_search_index;
INSERT INTO shop_search_index(shop_id, shop_name, shop_description, category, tags)
SELECT id, name, COALESCE(description, ''), COALESCE(category, ''), COALESCE(tags, '')
  FROM local_shops;
