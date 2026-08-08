CREATE TABLE IF NOT EXISTS society_ratings (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    resident_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_type TEXT NOT NULL, -- 'guard', 'visitor', 'vendor'
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS society_intercom_logs (
    id TEXT PRIMARY KEY,
    society_id TEXT NOT NULL,
    caller_id TEXT NOT NULL, -- guard_id or resident_id
    receiver_id TEXT NOT NULL, -- resident_id or guard_id
    flat_number TEXT,
    call_status TEXT DEFAULT 'initiated', -- 'initiated', 'answered', 'missed'
    duration_seconds INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
