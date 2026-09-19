-- Fleet & rental tables.
--
-- src/modules/crm/routes/fleet-assets.routes.js is mounted at
-- /api/v1/fleet-assets (src/routes/index.js) and every one of its seven
-- endpoints queries fleet_assets, rental_bookings or fleet_asset_logs. None of
-- those three tables was created by any migration, so the whole rentals
-- archetype — tractors, borewell rigs, construction plant, tent and vehicle
-- hire — answered 500 on every call. The mobile Asset Tracker panel papered
-- over it with hardcoded placeholder bookings instead.
--
-- Columns below are taken from the statements the routes actually run, so the
-- INSERT and UPDATE column lists in that file are satisfied exactly.

BEGIN;

CREATE TABLE IF NOT EXISTS fleet_assets (
    id                    TEXT PRIMARY KEY,
    shop_id               UUID NOT NULL REFERENCES local_shops(id) ON DELETE CASCADE,
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
    driver_available      BOOLEAN DEFAULT FALSE,
    driver_charge_per_day REAL DEFAULT 0,
    fuel_type             TEXT,
    capacity              TEXT,
    description           TEXT,
    -- The status route validates against exactly this set.
    status                TEXT DEFAULT 'available',
    status_notes          TEXT,
    expected_return_date  TIMESTAMPTZ,
    current_operator      TEXT,
    fuel_level            REAL,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rental_bookings (
    id               TEXT PRIMARY KEY,
    shop_id          UUID NOT NULL REFERENCES local_shops(id) ON DELETE CASCADE,
    asset_id         TEXT NOT NULL REFERENCES fleet_assets(id) ON DELETE CASCADE,
    booking_number   TEXT UNIQUE NOT NULL,
    customer_name    TEXT,
    customer_phone   TEXT,
    user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    start_date       TIMESTAMPTZ,
    end_date         TIMESTAMPTZ,
    duration_type    TEXT,
    duration_value   REAL,
    need_driver      BOOLEAN DEFAULT FALSE,
    delivery_address TEXT,
    rental_cost      REAL DEFAULT 0,
    security_deposit REAL DEFAULT 0,
    total_amount     REAL DEFAULT 0,
    notes            TEXT,
    status           TEXT DEFAULT 'pending',
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
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
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- The asset list filters by shop and status, and the bookings list joins on
-- asset_id and sorts by created_at.
CREATE INDEX IF NOT EXISTS idx_fleet_assets_shop ON fleet_assets(shop_id);
CREATE INDEX IF NOT EXISTS idx_fleet_assets_shop_status ON fleet_assets(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_shop ON rental_bookings(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_asset ON rental_bookings(asset_id);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_status ON rental_bookings(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_fleet_asset_logs_asset ON fleet_asset_logs(asset_id, created_at DESC);

COMMIT;
