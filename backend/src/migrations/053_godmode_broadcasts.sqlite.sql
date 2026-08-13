CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_audience TEXT NOT NULL, -- e.g., 'all_users', 'all_shops', 'region_uuid'
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
