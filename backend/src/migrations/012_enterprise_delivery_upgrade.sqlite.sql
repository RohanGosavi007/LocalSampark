-- 012_enterprise_delivery_upgrade.sqlite.sql

-- 1. Delivery Batches: For grouping multiple orders to one agent
CREATE TABLE IF NOT EXISTS delivery_batches (
    id TEXT PRIMARY KEY,
    agent_id TEXT,
    zone_id TEXT,
    status TEXT DEFAULT 'pending', -- pending, assigned, in_progress, completed
    total_amount REAL DEFAULT 0,
    estimated_eta_mins INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES delivery_agents(id)
);

-- 2. Delivery Jobs (Ensure it exists)
CREATE TABLE IF NOT EXISTS delivery_jobs (
    id TEXT PRIMARY KEY,
    batch_id TEXT,
    shop_order_id TEXT,
    requester_id TEXT,
    assigned_agent_id TEXT REFERENCES delivery_agents(id),
    pickup_location TEXT,
    dropoff_location TEXT,
    item_details TEXT,
    delivery_type TEXT,
    payment_pref TEXT,
    price_fiat REAL DEFAULT 0,
    price_coins INTEGER DEFAULT 0,
    surge_multiplier REAL DEFAULT 1.0,
    pincode TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- In SQLite, we can just do this if the table exists, but if we just created it with the columns above, 
-- we don't need ALTER TABLE for new setups, but for existing ones:
-- ALTER TABLE delivery_jobs ADD COLUMN batch_id TEXT;
-- ALTER TABLE delivery_jobs ADD COLUMN surge_multiplier REAL DEFAULT 1.0;

-- 3. High-Frequency Telemetry
CREATE TABLE IF NOT EXISTS delivery_telemetry (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    speed REAL DEFAULT 0,
    heading REAL DEFAULT 0,
    battery_level INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES delivery_agents(id)
);

-- 4. Dynamic Incentives & Surge Pricing configurations per zone
CREATE TABLE IF NOT EXISTS delivery_incentives (
    id TEXT PRIMARY KEY,
    zone_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'rain', 'peak_hours', 'high_demand'
    multiplier REAL DEFAULT 1.0,
    flat_bonus REAL DEFAULT 0,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    is_active INTEGER DEFAULT 1
);
