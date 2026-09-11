-- Migration 072 (PostgreSQL): columns the users table is missing
--
-- Found with scripts/verify-column-usage.js against real PRAGMA metadata.
--
-- token_version is the significant one. auth.middleware.generateTokens() embeds
-- user.tokenVersion in every JWT, and admin.routes.js:381 bumps it to revoke
-- every outstanding session:
--     UPDATE users SET token_version = token_version + 1
-- The column has never existed, so that statement fails and the claim is always
-- undefined — meaning "log out all users" silently does nothing. A security
-- control that reports success while doing nothing is worse than an absent one.
--
-- is_banned backs the admin ban flow (admin.routes.js:1294 lists it, :1326 sets
-- it); both fail today. loyalty_points and total_coins are read by the CRM and
-- engagement routes.
--
-- Naming drift (users.name -> full_name, user_type -> role, profile_photo ->
-- avatar_url) is fixed in the code instead, since the live names are correct.

ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_coins INTEGER DEFAULT 0;

-- Existing rows must start at a defined version or the first comparison
-- against a JWT claim is against NULL.
UPDATE users SET token_version = 0 WHERE token_version IS NULL;
UPDATE users SET is_banned = FALSE WHERE is_banned IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_banned ON users(is_banned, is_active);
