-- Migration 048: Phase 5 Staff, Reviews, and Analytics
-- Creates tables for Shop Staff, Reviews, and pre-calculated Analytics snapshots.

-- Staff Table (Administrative use by Shop Owner)
CREATE TABLE IF NOT EXISTS shop_staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'Active',
  shift TEXT,
  commission REAL DEFAULT 0.0,
  joined_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS shop_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INTEGER NOT NULL,
  user_id INTEGER,
  customer_name TEXT,
  rating INTEGER NOT NULL,
  comment TEXT,
  reply TEXT,
  status TEXT DEFAULT 'Published',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Analytics Snapshots Table
CREATE TABLE IF NOT EXISTS shop_analytics_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INTEGER NOT NULL,
  snapshot_date DATE NOT NULL,
  total_revenue REAL DEFAULT 0.0,
  total_orders INTEGER DEFAULT 0,
  total_visitors INTEGER DEFAULT 0,
  conversion_rate REAL DEFAULT 0.0,
  popular_items_json TEXT, -- JSON array of popular items
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_id, snapshot_date)
);
