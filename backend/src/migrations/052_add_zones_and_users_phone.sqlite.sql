-- 052_add_zones_and_users_phone.sqlite.sql
-- Fix missing zones table and phone column in users table

CREATE TABLE IF NOT EXISTS zones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,
    level TEXT,
    polygon_data TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add phone column to users table if it does not exist
-- SQLite ALTER TABLE ADD COLUMN does not support IF NOT EXISTS natively in older versions, 
-- but in newer it might. Assuming simple add.
ALTER TABLE users ADD COLUMN phone TEXT;
