-- Migration 087 (SQLite): admin_jobs.shop_id
--
-- The job-posting endpoint inserts a shop_id, and admin_jobs only ever had the
-- denormalised shop_name, so posting a job from the admin console failed.
--
-- Deliberately no foreign key to local_shops: the endpoint writes
-- `shop_id || 'system'`, using the literal 'system' for jobs the platform posts
-- itself rather than a shop, and that value would violate the constraint.

ALTER TABLE admin_jobs ADD COLUMN shop_id TEXT;

CREATE INDEX IF NOT EXISTS idx_admin_jobs_shop ON admin_jobs(shop_id, status);
