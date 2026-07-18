CREATE TABLE IF NOT EXISTS scrap_pickups (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    address TEXT,
    preferred_time TEXT,
    estimated_weight TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
