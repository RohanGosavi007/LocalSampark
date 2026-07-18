-- Migration: 002_auth_upgrade
-- Purpose: Adds advanced authentication tables for v4.0

-- 1. Modify users table to support email auth and tracking
-- Note: SQLite does not support multiple ADD COLUMN in one statement, nor IF NOT EXISTS for columns in some older versions.
-- Assuming these might have been added in init.sqlite.sql, we'll wrap in a safe approach or just provide the standard script as per plan.
-- If these columns already exist, this might fail, so we'll use a safer approach for SQLite if possible, or just standard ALTER TABLE.
-- For a robust migration script in SQLite, often we just document the required schema.

-- Add columns to users (commented out if they already exist, but provided for completeness)
-- ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;
-- ALTER TABLE users ADD COLUMN password_hash TEXT;
-- ALTER TABLE users ADD COLUMN whatsapp_number TEXT;
-- ALTER TABLE users ADD COLUMN auth_method TEXT DEFAULT 'phone_otp';
-- ALTER TABLE users ADD COLUMN last_login_at TEXT;
-- ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0;

-- 2. Email verification tokens
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 4. Admin PIN codes
CREATE TABLE IF NOT EXISTS admin_pins (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    pin_hash TEXT NOT NULL,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 5. Admin session audit log
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id TEXT PRIMARY KEY,
    admin_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    details TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 6. IP allowlist for admin access
CREATE TABLE IF NOT EXISTS admin_ip_allowlist (
    id TEXT PRIMARY KEY,
    ip_address TEXT NOT NULL,
    label TEXT,
    added_by TEXT REFERENCES users(id),
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 7. Admin roles
CREATE TABLE IF NOT EXISTS admin_roles (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    region_id TEXT REFERENCES regions(id) ON DELETE SET NULL,
    permissions TEXT DEFAULT '{}',
    is_active INTEGER DEFAULT 1,
    granted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role)
);
