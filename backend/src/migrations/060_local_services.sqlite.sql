-- 060 (SQLite): the local services catalogue and its bookings.
--
-- The Postgres counterpart, 060_local_services.sql, has existed for a while,
-- but the SQLite migration runner only picks up files matching `0*.sqlite.sql`
-- and this one was never written. The result was that local_services and
-- service_bookings existed in production and in NO local or CI environment, so
-- every request to /services/nearby and /services/my-bookings failed there with
-- "SQLITE_ERROR: no such table: local_services". The Services page rendered its
-- empty state instead of an error, which is why this went unnoticed — the
-- failure was only visible in the server log.
--
-- Shapes mirror the Postgres migration, with the usual translations:
--   UUID/VARCHAR/TEXT -> TEXT, DECIMAL -> REAL, TIMESTAMP -> DATETIME, and ids
--   supplied by the application (SQLite has no uuid_generate_v4()).

CREATE TABLE IF NOT EXISTS local_services (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    category       TEXT,
    description    TEXT,
    provider_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
    provider_name  TEXT,
    base_price     REAL NOT NULL DEFAULT 0,
    duration_mins  INTEGER,
    region_id      TEXT REFERENCES regions(id) ON DELETE SET NULL,
    pincode        TEXT,
    image_url      TEXT,
    rating         REAL DEFAULT 0,
    total_ratings  INTEGER DEFAULT 0,
    -- /services/nearby filters on status = 'active'.
    status         TEXT NOT NULL DEFAULT 'active',
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT local_services_status_valid CHECK (status IN ('active', 'inactive', 'suspended')),
    CONSTRAINT local_services_price_non_negative CHECK (base_price >= 0)
);

CREATE TABLE IF NOT EXISTS service_bookings (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id      TEXT NOT NULL REFERENCES local_services(id) ON DELETE CASCADE,
    scheduled_time  DATETIME NOT NULL,
    address         TEXT,
    notes           TEXT,
    total_amount    REAL,
    status          TEXT NOT NULL DEFAULT 'pending',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT service_bookings_status_valid
        CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_local_services_status   ON local_services(status);
CREATE INDEX IF NOT EXISTS idx_local_services_region   ON local_services(region_id);
CREATE INDEX IF NOT EXISTS idx_local_services_category ON local_services(category);
CREATE INDEX IF NOT EXISTS idx_service_bookings_user   ON service_bookings(user_id, scheduled_time DESC);
CREATE INDEX IF NOT EXISTS idx_service_bookings_svc    ON service_bookings(service_id);
