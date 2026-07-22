-- Migration: Events & Meetups Schema

CREATE TABLE IF NOT EXISTS local_events (
    id TEXT PRIMARY KEY,
    organizer_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    event_date TEXT NOT NULL,
    event_time TEXT NOT NULL,
    venue TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    geohash TEXT,
    ticket_price REAL DEFAULT 0.0,
    total_capacity INTEGER DEFAULT 100,
    available_tickets INTEGER DEFAULT 100,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_tickets (
    id TEXT PRIMARY KEY,
    ticket_ref TEXT UNIQUE NOT NULL,
    event_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'confirmed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_category ON local_events(category);
CREATE INDEX IF NOT EXISTS idx_events_geohash ON local_events(geohash);
