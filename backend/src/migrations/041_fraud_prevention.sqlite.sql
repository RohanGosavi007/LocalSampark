-- ═══════════════════════════════════════════════════════════════════════
-- Migration 041: Fraud Prevention System
-- 10x Plan: Section 22.3 — 3-Layer Fraud Detection Engine
-- ═══════════════════════════════════════════════════════════════════════

-- Fraud detection signals
CREATE TABLE IF NOT EXISTS fraud_signals (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    signal_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'low',
    details TEXT NOT NULL DEFAULT '{}',
    fraud_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    auto_action_taken TEXT,
    reviewed_by TEXT REFERENCES users(id),
    reviewed_at TEXT,
    review_notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fraud_entity ON fraud_signals(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_fraud_status ON fraud_signals(status);
CREATE INDEX IF NOT EXISTS idx_fraud_severity ON fraud_signals(severity);
CREATE INDEX IF NOT EXISTS idx_fraud_type ON fraud_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_fraud_created ON fraud_signals(created_at);

-- Device fingerprinting for multi-account detection
CREATE TABLE IF NOT EXISTS device_fingerprints (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_model TEXT,
    os_name TEXT,
    os_version TEXT,
    app_version TEXT,
    ip_address TEXT,
    screen_resolution TEXT,
    timezone TEXT,
    language TEXT,
    first_seen_at TEXT DEFAULT (datetime('now')),
    last_seen_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_device_fp_device ON device_fingerprints(device_id);
CREATE INDEX IF NOT EXISTS idx_device_fp_user ON device_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_device_fp_ip ON device_fingerprints(ip_address);

-- IP reputation tracking
CREATE TABLE IF NOT EXISTS ip_reputation (
    id TEXT PRIMARY KEY,
    ip_address TEXT UNIQUE NOT NULL,
    risk_score INTEGER DEFAULT 0,
    total_requests INTEGER DEFAULT 0,
    blocked_count INTEGER DEFAULT 0,
    associated_users INTEGER DEFAULT 0,
    is_proxy INTEGER DEFAULT 0,
    is_vpn INTEGER DEFAULT 0,
    country_code TEXT,
    city TEXT,
    last_seen_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ip_rep_address ON ip_reputation(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_rep_score ON ip_reputation(risk_score);

-- Blocked entities
CREATE TABLE IF NOT EXISTS fraud_blocklist (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_value TEXT NOT NULL,
    reason TEXT NOT NULL,
    blocked_by TEXT REFERENCES users(id),
    expires_at TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(entity_type, entity_value)
);

CREATE INDEX IF NOT EXISTS idx_blocklist_type ON fraud_blocklist(entity_type, entity_value);
