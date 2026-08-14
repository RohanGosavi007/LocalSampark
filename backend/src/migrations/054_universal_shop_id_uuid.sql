-- 054: Align the universal super-app tables with the real shops table.
--
-- These tables shipped declaring `shop_id INTEGER` with a foreign key to a
-- `shops` table that has never existed in the Postgres schema. The actual table
-- is `local_shops`, whose primary key is UUID. As written, the foreign keys
-- could not be satisfied and any join between a universal order and its shop
-- failed. This migration retypes the columns to UUID and points the constraints
-- at `local_shops`.
--
-- Existing rows cannot carry a meaningful shop reference (the old integer ids
-- never matched a real shop), so the column is rebuilt rather than cast.

BEGIN;

-- ─── universal_catalog_items ────────────────────────────────────────────────
ALTER TABLE universal_catalog_items
  DROP CONSTRAINT IF EXISTS universal_catalog_items_shop_id_fkey;

ALTER TABLE universal_catalog_items
  ADD COLUMN IF NOT EXISTS shop_id_uuid UUID;

-- Best-effort carry-over for deployments that stored the shop id as text.
UPDATE universal_catalog_items
   SET shop_id_uuid = ls.id
  FROM local_shops ls
 WHERE ls.id::text = universal_catalog_items.shop_id::text;

ALTER TABLE universal_catalog_items DROP COLUMN shop_id;
ALTER TABLE universal_catalog_items RENAME COLUMN shop_id_uuid TO shop_id;

DELETE FROM universal_catalog_items WHERE shop_id IS NULL;

ALTER TABLE universal_catalog_items ALTER COLUMN shop_id SET NOT NULL;
ALTER TABLE universal_catalog_items
  ADD CONSTRAINT universal_catalog_items_shop_id_fkey
  FOREIGN KEY (shop_id) REFERENCES local_shops(id) ON DELETE CASCADE;

-- ─── universal_orders ───────────────────────────────────────────────────────
ALTER TABLE universal_orders
  DROP CONSTRAINT IF EXISTS universal_orders_shop_id_fkey;

ALTER TABLE universal_orders
  ADD COLUMN IF NOT EXISTS shop_id_uuid UUID;

UPDATE universal_orders
   SET shop_id_uuid = ls.id
  FROM local_shops ls
 WHERE ls.id::text = universal_orders.shop_id::text;

ALTER TABLE universal_orders DROP COLUMN shop_id;
ALTER TABLE universal_orders RENAME COLUMN shop_id_uuid TO shop_id;

DELETE FROM universal_orders WHERE shop_id IS NULL;

ALTER TABLE universal_orders ALTER COLUMN shop_id SET NOT NULL;
ALTER TABLE universal_orders
  ADD CONSTRAINT universal_orders_shop_id_fkey
  FOREIGN KEY (shop_id) REFERENCES local_shops(id) ON DELETE CASCADE;

-- users.id is UUID in this schema; the original INTEGER declaration had the
-- same defect as shop_id.
ALTER TABLE universal_orders
  DROP CONSTRAINT IF EXISTS universal_orders_user_id_fkey;

ALTER TABLE universal_orders
  ADD COLUMN IF NOT EXISTS user_id_uuid UUID;

UPDATE universal_orders
   SET user_id_uuid = u.id
  FROM users u
 WHERE u.id::text = universal_orders.user_id::text;

ALTER TABLE universal_orders DROP COLUMN user_id;
ALTER TABLE universal_orders RENAME COLUMN user_id_uuid TO user_id;

DELETE FROM universal_orders WHERE user_id IS NULL;

ALTER TABLE universal_orders ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE universal_orders
  ADD CONSTRAINT universal_orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ─── indexes ────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_univ_catalog_shop;
DROP INDEX IF EXISTS idx_univ_orders_shop;
DROP INDEX IF EXISTS idx_univ_orders_user;

CREATE INDEX idx_univ_catalog_shop ON universal_catalog_items(shop_id);
CREATE INDEX idx_univ_orders_shop  ON universal_orders(shop_id);
CREATE INDEX idx_univ_orders_user  ON universal_orders(user_id);

COMMIT;
