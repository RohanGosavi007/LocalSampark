-- 126: refresh-token reuse detection, scheduled-job locks, SamparkPlus period
--
-- used_refresh_tokens
--   A refresh token is exchanged for a new pair and should then be dead. It was
--   not: the old one stayed valid for its whole 30 days, so a stolen refresh
--   token worked alongside the real one with nothing to show it. Each refresh
--   token now carries a jti; presenting one records it here, and presenting the
--   same jti again is a replay (see modules/core/routes/auth.routes.js).
--
-- job_locks
--   node-cron and the polling workers run in every instance. With more than one
--   instance each job ran once per instance — a subscription delivery order
--   created twice. A job now takes a row here for slightly less than its
--   interval before it runs (utils/cron.js, utils/intervals.js).
--
-- user_subscriptions.tier_expires_at
--   SamparkPlus is a paid, 30-day tier. The table had a tier and a start date
--   but no end, so a membership could not lapse.
--
-- NOT EXECUTED: no PostgreSQL with PostGIS was available to run it.

BEGIN;

CREATE TABLE IF NOT EXISTS used_refresh_tokens (
    jti        TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    used_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_used_refresh_tokens_expires_at ON used_refresh_tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_used_refresh_tokens_user_id ON used_refresh_tokens (user_id);

CREATE TABLE IF NOT EXISTS job_locks (
    name         TEXT PRIMARY KEY,
    locked_until TIMESTAMP NOT NULL,
    locked_by    TEXT,
    locked_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS tier_expires_at TIMESTAMP;

COMMIT;
