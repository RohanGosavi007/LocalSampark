-- Migration 066: Townsquare news moderation + poll rewards/active flag
-- townsquare.routes.js referenced townsquare_posts/townsquare_polls tables
-- that were never created anywhere; it should reuse the existing posts/polls/
-- poll_votes tables instead, which need these additive columns.

ALTER TABLE posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';
ALTER TABLE polls ADD COLUMN IF NOT EXISTS reward_coins INTEGER DEFAULT 0;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS active INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_posts_townsquare ON posts(post_type, status);
