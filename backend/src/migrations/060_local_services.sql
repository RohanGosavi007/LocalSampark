-- 060: The local services catalogue and its bookings.
--
-- services.routes.js has always read local_services and service_bookings, but
-- neither table was ever declared, so /services/nearby and /services/my-bookings
-- failed on every call.
--
-- The columns below are exactly those the existing queries select, so this adds
-- no speculative shape:
--   local_services   -> id, name, base_price, provider_name, status, region_id
--   service_bookings -> id, user_id, service_id, scheduled_time, status

BEGIN;

CREATE TABLE IF NOT EXISTS local_services (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name           VARCHAR(255) NOT NULL,
    category       VARCHAR(100),
    description    TEXT,
    provider_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    provider_name  VARCHAR(255),
    base_price     DECIMAL(10,2) NOT NULL DEFAULT 0,
    duration_mins  INT,
    region_id      UUID REFERENCES regions(id) ON DELETE SET NULL,
    pincode        VARCHAR(10),
    image_url      TEXT,
    rating         DECIMAL(3,2) DEFAULT 0,
    total_ratings  INT DEFAULT 0,
    -- /services/nearby filters on status = 'active'.
    status         VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT local_services_status_valid CHECK (status IN ('active', 'inactive', 'suspended')),
    CONSTRAINT local_services_price_non_negative CHECK (base_price >= 0)
);

CREATE TABLE IF NOT EXISTS service_bookings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id      UUID NOT NULL REFERENCES local_services(id) ON DELETE CASCADE,
    scheduled_time  TIMESTAMP NOT NULL,
    address         TEXT,
    notes           TEXT,
    total_amount    DECIMAL(10,2),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT service_bookings_status_valid
        CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_local_services_status   ON local_services(status);
CREATE INDEX IF NOT EXISTS idx_local_services_region   ON local_services(region_id);
CREATE INDEX IF NOT EXISTS idx_local_services_category ON local_services(category);
CREATE INDEX IF NOT EXISTS idx_service_bookings_user   ON service_bookings(user_id, scheduled_time DESC);
CREATE INDEX IF NOT EXISTS idx_service_bookings_svc    ON service_bookings(service_id);

COMMIT;
