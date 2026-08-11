-- 044_missing_tables.sqlite.sql
-- Fix missing tables for admin dashboard and multilingual features

CREATE TABLE IF NOT EXISTS local_job_postings (
    id TEXT PRIMARY KEY,
    shop_id TEXT,
    title TEXT,
    description TEXT,
    salary REAL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medical_providers (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    address TEXT,
    contact_number TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_subscriptions (
    id TEXT PRIMARY KEY,
    shop_id TEXT,
    plan_name TEXT,
    status TEXT DEFAULT 'active',
    start_date DATETIME,
    end_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_emergency_alerts (
    id TEXT PRIMARY KEY,
    triggered_by TEXT,
    society_id TEXT,
    alert_type TEXT,
    status TEXT DEFAULT 'active',
    resolved_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS utility_payments (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    utility_type TEXT,
    biller_name TEXT,
    amount REAL,
    status TEXT DEFAULT 'completed',
    transaction_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feature_flags (
    id TEXT PRIMARY KEY,
    name TEXT,
    phase INTEGER,
    is_enabled BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS localization_dictionaries (
    id TEXT PRIMARY KEY,
    lang_code TEXT,
    translation_key TEXT,
    translation_value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed basic dictionaries for hindi to prevent 500 error
INSERT OR IGNORE INTO localization_dictionaries (id, lang_code, translation_key, translation_value) VALUES 
('dict_hi_1', 'hi', 'greeting', 'नमस्ते'),
('dict_hi_2', 'hi', 'search_placeholder', 'दुकानें और सेवाएँ खोजें...'),
('dict_hi_3', 'hi', 'home', 'होम');
