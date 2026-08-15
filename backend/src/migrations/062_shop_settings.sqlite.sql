-- Migration 062: Create missing shop_settings and admin_jobs tables
-- shop_settings is required by checkout/create-order flow

CREATE TABLE IF NOT EXISTS shop_settings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  shop_id TEXT NOT NULL,
  settings TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  UNIQUE(shop_id)
);

-- admin_jobs already exists from migration 027, but ensure it's present
CREATE TABLE IF NOT EXISTS admin_jobs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT,
  description TEXT,
  salary TEXT,
  shop_name TEXT,
  status TEXT DEFAULT 'active',
  admin_id TEXT,
  created_at DATETIME DEFAULT (datetime('now'))
);
