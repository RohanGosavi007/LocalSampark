-- SQLite variant of 091_fleet_rentals.sql. See that file for why these tables
-- are needed.
--
-- Differences: no explicit transaction (the runner executes statement by
-- statement); TIMESTAMPTZ becomes TEXT with a CURRENT_TIMESTAMP default;
-- BOOLEAN becomes INTEGER; and no DESC in index definitions, since SQLite walks
-- an index backwards just as well.
--
-- src/modules/crm/routes/fleet-assets.routes.js is mounted at
-- /api/v1/fleet-assets and every one of its seven endpoints queries fleet_assets,
-- rental_bookings or fleet_asset_logs. None of those three tables was created by
-- any migration, so the whole rentals archetype answered 500 on every call.

CREATE TABLE IF NOT EXISTS fleet_assets (
    id                    TEXT PRIMARY KEY,
    shop_id               TEXT NOT NULL REFERENCES local_shops(id) ON DELETE CASCADE,
    name                  TEXT NOT NULL,
    asset_type            TEXT,
    model                 TEXT,
    registration_number   TEXT,
    photos                TEXT DEFAULT '[]',
    hourly_rate           REAL DEFAULT 0,
    daily_rate            REAL DEFAULT 0,
    weekly_rate           REAL DEFAULT 0,
    acreage_rate          REAL DEFAULT 0,
    security_deposit      REAL DEFAULT 0,
    driver_available      INTEGER DEFAULT 0,
    driver_charge_per_day REAL DEFAULT 0,
    fuel_type             TEXT,
    capacity              TEXT,
    description           TEXT,
    status                TEXT DEFAULT 'available',
    status_notes          TEXT,
    expected_return_date  TEXT,
    current_operator      TEXT,
    fuel_level            REAL,
    created_at            TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at            TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rental_bookings (
    id               TEXT PRIMARY KEY,
    shop_id          TEXT NOT NULL REFERENCES local_shops(id) ON DELETE CASCADE,
    asset_id         TEXT NOT NULL REFERENCES fleet_assets(id) ON DELETE CASCADE,
    booking_number   TEXT UNIQUE NOT NULL,
    customer_name    TEXT,
    customer_phone   TEXT,
    user_id          TEXT REFERENCES users(id) ON DELETE SET NULL,
    start_date       TEXT,
    end_date         TEXT,
    duration_type    TEXT,
    duration_value   REAL,
    need_driver      INTEGER DEFAULT 0,
    delivery_address TEXT,
    rental_cost      REAL DEFAULT 0,
    security_deposit REAL DEFAULT 0,
    total_amount     REAL DEFAULT 0,
    notes            TEXT,
    status           TEXT DEFAULT 'pending',
    created_at       TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at       TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fleet_asset_logs (
    id            TEXT PRIMARY KEY,
    asset_id      TEXT NOT NULL REFERENCES fleet_assets(id) ON DELETE CASCADE,
    log_type      TEXT DEFAULT 'usage',
    operator_name TEXT,
    fuel_added    REAL DEFAULT 0,
    hours_used    REAL DEFAULT 0,
    notes         TEXT,
    photos        TEXT DEFAULT '[]',
    created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fleet_assets_shop ON fleet_assets(shop_id);
CREATE INDEX IF NOT EXISTS idx_fleet_assets_shop_status ON fleet_assets(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_shop ON rental_bookings(shop_id, created_at);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_asset ON rental_bookings(asset_id);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_status ON rental_bookings(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_fleet_asset_logs_asset ON fleet_asset_logs(asset_id, created_at);
