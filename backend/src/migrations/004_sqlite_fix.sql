-- 004_sqlite_fix.sql
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

CREATE TABLE IF NOT EXISTS admin_pins (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    pin_hash TEXT NOT NULL,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS admin_ip_allowlist (
    id TEXT PRIMARY KEY,
    ip_address TEXT NOT NULL,
    label TEXT,
    added_by TEXT REFERENCES users(id),
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
