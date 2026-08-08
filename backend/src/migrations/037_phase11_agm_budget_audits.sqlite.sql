CREATE TABLE IF NOT EXISTS society_agm (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    title TEXT NOT NULL,
    meeting_date DATETIME NOT NULL,
    agenda TEXT,
    location TEXT,
    meeting_link TEXT,
    status TEXT DEFAULT 'scheduled',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_agm_resolutions (
    id TEXT PRIMARY KEY,
    agm_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'proposed'
);

CREATE TABLE IF NOT EXISTS society_budgets (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    financial_year TEXT NOT NULL,
    category TEXT NOT NULL,
    allocated_amount REAL NOT NULL,
    spent_amount REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_audits (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    audit_type TEXT NOT NULL,
    scheduled_date DATETIME NOT NULL,
    assigned_to TEXT,
    status TEXT DEFAULT 'pending',
    remarks TEXT,
    is_compliant INTEGER DEFAULT 0,
    certificate_url TEXT,
    completed_at DATETIME
);
