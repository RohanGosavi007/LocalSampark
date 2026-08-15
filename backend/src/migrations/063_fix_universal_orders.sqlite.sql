-- Migration 063: Fix universal_orders column types
-- shop_id and user_id are TEXT (UUIDs/slugs) in the app, not INTEGER

CREATE TABLE IF NOT EXISTS universal_orders_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id TEXT,
  user_id TEXT,
  status TEXT DEFAULT 'pending',
  total_amount REAL DEFAULT 0,
  order_type TEXT DEFAULT 'ecom',
  scheduled_time DATETIME,
  delivery_address TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  rider_id TEXT
);

INSERT OR IGNORE INTO universal_orders_new (id, shop_id, user_id, status, total_amount, order_type, scheduled_time, delivery_address, notes, created_at, updated_at, rider_id)
  SELECT id, CAST(shop_id AS TEXT), CAST(user_id AS TEXT), status, total_amount, order_type, scheduled_time, delivery_address, notes, created_at, updated_at, rider_id
  FROM universal_orders;

DROP TABLE IF EXISTS universal_orders;
ALTER TABLE universal_orders_new RENAME TO universal_orders;
