-- ─────────────────────────────────────────────────────────────────────────────
-- 109: admin_audit_log.ip_address defaults to ''
--
-- A database created by this runner gets admin_audit_log from migration 077,
-- which already declares `ip_address TEXT DEFAULT ''`. A database that predates
-- the runner got it from 002_auth_upgrade.sql instead, where the column is
-- NOT NULL with no default — and 077's CREATE TABLE IF NOT EXISTS then does
-- nothing, because the table is already there.
--
-- The application is written against the 077 shape: 28 of the 29 statements
-- that insert into this table supply no ip_address. On the older shape each of
-- them fails on the constraint, after the admin action it was recording has
-- already been applied.
--
-- Both statements are no-ops on a table that already matches.
--
-- NOT EXECUTED: no PostgreSQL instance was available in this environment.
-- Review before applying to production. The SQLite counterpart is
-- 109_admin_audit_log_ip_default.js.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE admin_audit_log ALTER COLUMN ip_address DROP NOT NULL;
ALTER TABLE admin_audit_log ALTER COLUMN ip_address SET DEFAULT '';
