-- Migration: Add Hierarchy and Pincode to regions table

-- Note: SQLite ALTER TABLE ADD COLUMN does not support adding multiple columns in one statement.
ALTER TABLE regions ADD COLUMN region_type TEXT NOT NULL DEFAULT 'locality';
ALTER TABLE regions ADD COLUMN parent_id TEXT REFERENCES regions(id) ON DELETE SET NULL;
ALTER TABLE regions ADD COLUMN pincode TEXT;
ALTER TABLE franchise_partners ADD COLUMN region_id TEXT REFERENCES regions(id) ON DELETE SET NULL;
