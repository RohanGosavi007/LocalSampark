-- Phase 9: Merchant Ecosystem & Hyperlocal Delivery Fleet

CREATE TABLE IF NOT EXISTS delivery_agents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    region_id TEXT NOT NULL,
    vehicle_number TEXT,
    status TEXT DEFAULT 'offline', -- 'offline', 'available', 'busy'
    current_lat REAL,
    current_lng REAL,
    rating REAL DEFAULT 5.0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(region_id) REFERENCES regions(id)
);

CREATE TABLE IF NOT EXISTS order_dispatch (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    agent_id TEXT,
    pickup_time TEXT,
    delivery_time TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'assigned', 'picked_up', 'delivered', 'failed'
    earnings REAL DEFAULT 0.0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(agent_id) REFERENCES delivery_agents(id)
);

CREATE TABLE IF NOT EXISTS agent_payouts (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    amount REAL NOT NULL,
    week_ending TEXT,
    payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(agent_id) REFERENCES delivery_agents(id)
);
