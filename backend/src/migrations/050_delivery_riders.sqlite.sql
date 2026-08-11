-- Migration 050: Delivery Fleet & Live Tracking
-- Adds tables for Riders and their geospatial live tracking

CREATE TABLE IF NOT EXISTS delivery_riders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    vehicle_type TEXT DEFAULT 'bike',
    vehicle_number TEXT,
    status TEXT DEFAULT 'offline', -- 'offline', 'available', 'on_delivery'
    current_order_id TEXT,
    shop_id TEXT, -- Optional, if assigned exclusively to one shop
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS live_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rider_id TEXT NOT NULL,
    order_id TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rider_id) REFERENCES delivery_riders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tracking_rider ON live_tracking(rider_id);
CREATE INDEX IF NOT EXISTS idx_tracking_order ON live_tracking(order_id);

-- Alter universal_orders to track assigned rider
ALTER TABLE universal_orders ADD COLUMN rider_id TEXT REFERENCES delivery_riders(id);
