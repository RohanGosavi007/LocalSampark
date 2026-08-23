-- Migration 066: Townsquare news moderation + poll rewards/active flag
-- SQLite variant: ADD COLUMN has no IF NOT EXISTS before 3.35; the migration
-- runner already tolerates "duplicate column" errors on re-run.

ALTER TABLE posts ADD COLUMN status TEXT DEFAULT 'approved';
ALTER TABLE polls ADD COLUMN reward_coins INTEGER DEFAULT 0;
ALTER TABLE polls ADD COLUMN active INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_posts_townsquare ON posts(post_type, status);
