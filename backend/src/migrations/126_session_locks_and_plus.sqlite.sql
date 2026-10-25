-- 126 (SQLite): refresh-token reuse detection, scheduled-job locks, SamparkPlus period.
-- 126_session_locks_and_plus.sql carries the reasoning.

CREATE TABLE IF NOT EXISTS used_refresh_tokens (
    jti        TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    used_at    TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_used_refresh_tokens_expires_at ON used_refresh_tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_used_refresh_tokens_user_id ON used_refresh_tokens (user_id);

CREATE TABLE IF NOT EXISTS job_locks (
    name         TEXT PRIMARY KEY,
    locked_until TEXT NOT NULL,
    locked_by    TEXT,
    locked_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE user_subscriptions ADD COLUMN tier_expires_at TEXT;
