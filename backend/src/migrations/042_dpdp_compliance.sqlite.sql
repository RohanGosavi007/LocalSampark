-- ═══════════════════════════════════════════════════════════════════════
-- Migration 042: DPDP Act Compliance — Consent & Data Rights
-- 10x Plan: Section 22.2 — India's Digital Personal Data Protection
-- ═══════════════════════════════════════════════════════════════════════

-- User consent records
CREATE TABLE IF NOT EXISTS user_consents (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL,
    consent_purpose TEXT NOT NULL,
    granted INTEGER NOT NULL DEFAULT 0,
    granted_at TEXT,
    revoked_at TEXT,
    consent_version TEXT NOT NULL DEFAULT '1.0',
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, consent_type)
);

CREATE INDEX IF NOT EXISTS idx_consents_user ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_consents_type ON user_consents(consent_type);

-- Data subject requests (right to erasure, right to access)
CREATE TABLE IF NOT EXISTS data_subject_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    request_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    reason TEXT,
    requested_data TEXT,
    export_file_url TEXT,
    processed_by TEXT REFERENCES users(id),
    processed_at TEXT,
    completed_at TEXT,
    rejection_reason TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dsr_user ON data_subject_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_dsr_status ON data_subject_requests(status);
CREATE INDEX IF NOT EXISTS idx_dsr_type ON data_subject_requests(request_type);

-- Data breach log (CERT-In notification requirement)
CREATE TABLE IF NOT EXISTS data_breach_log (
    id TEXT PRIMARY KEY,
    breach_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    affected_users_count INTEGER DEFAULT 0,
    data_types_affected TEXT,
    discovery_timestamp TEXT NOT NULL,
    containment_timestamp TEXT,
    notification_timestamp TEXT,
    certin_reference TEXT,
    remediation_steps TEXT,
    reported_by TEXT REFERENCES users(id),
    status TEXT DEFAULT 'detected',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Privacy policy versions
CREATE TABLE IF NOT EXISTS privacy_policy_versions (
    id TEXT PRIMARY KEY,
    version TEXT UNIQUE NOT NULL,
    content_url TEXT NOT NULL,
    effective_date TEXT NOT NULL,
    summary_of_changes TEXT,
    requires_reconsent INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);
