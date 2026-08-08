CREATE TABLE IF NOT EXISTS society_notices (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    posted_by TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    document_url TEXT,
    is_urgent INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_notice_receipts (
    id TEXT PRIMARY KEY,
    notice_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(notice_id, user_id)
);
