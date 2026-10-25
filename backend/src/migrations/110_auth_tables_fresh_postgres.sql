-- ─────────────────────────────────────────────────────────────────────────────
-- 110: the four auth tables a fresh PostgreSQL database never received
--
-- admin_ip_allowlist, admin_pins, password_reset_tokens and
-- email_verification_tokens have exactly one PostgreSQL definition, in
-- 002_auth_upgrade.sql. run.js treats every file below 054 as "already
-- contained in init.sql" and records it as applied without executing it —
-- but init.sql does not contain these four. On an empty database they are
-- therefore never created, and nothing reports it.
--
-- The consequence is not subtle once traffic arrives:
--
--   POST /admin-auth/login     reads admin_ip_allowlist and then admin_pins
--                              with no guard, so every admin login answers 500
--   POST /auth/forgot-password inserts into password_reset_tokens
--   POST /auth/register        inserts into email_verification_tokens
--
-- SQLite has always had all four (init.sqlite.sql), which is why no test and no
-- local run has ever shown this.
--
-- 002's own DDL could not simply be re-run. It declares `user_id TEXT
-- REFERENCES users(id)` while users.id is UUID here, which PostgreSQL rejects
-- outright, and `is_active INTEGER` while the application filters on
-- `is_active = true`, which fails with "operator does not exist: integer =
-- boolean". The definitions below are typed for the queries that are actually
-- issued:
--
--   used        stays INTEGER  — auth.routes.js compares and assigns 0 / 1
--   is_active   is BOOLEAN     — both readers compare against `true`
--   user_id     is UUID        — to reference users(id)
--   expires_at, locked_until   — written as ISO-8601 strings, read back
--                                through `new Date(...)`; TIMESTAMPTZ accepts
--                                the former and returns a Date for the latter
--
-- IF NOT EXISTS throughout, so a database that did get these tables by another
-- route is left exactly as it is.
--
-- NOT EXECUTED: no PostgreSQL instance was available in this environment.
-- Review before applying to production.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_ip_allowlist (
    id          TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    ip_address  TEXT NOT NULL,
    label       TEXT,
    added_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_ip_allowlist_active
    ON admin_ip_allowlist (ip_address)
    WHERE is_active;

CREATE TABLE IF NOT EXISTS admin_pins (
    id               TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id          UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    pin_hash         TEXT NOT NULL,
    failed_attempts  INTEGER DEFAULT 0,
    locked_until     TIMESTAMP WITH TIME ZONE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT UNIQUE NOT NULL,
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    used        INTEGER DEFAULT 0,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens (user_id);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id          TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT UNIQUE NOT NULL,
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    used        INTEGER DEFAULT 0,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user ON email_verification_tokens (user_id);
