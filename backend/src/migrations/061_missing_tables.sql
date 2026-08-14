-- 061: Tables the application reads and writes but that were never declared.
--
-- Both were found by executing init.sql against Postgres: indexes and queries
-- referenced them, but no CREATE TABLE existed, so every call against them
-- failed.
--
-- Columns are taken from the queries that use them, not invented:
--   society_vehicles -> guard-operations.controller.js reads id, flat_number,
--     vehicle_number, society_id, is_active
--   universal_leads  -> universal-catalog.controller.js writes shop_id,
--     user_id, lead_type, content; shop-management.controller.js reads
--     lead_status and created_at and updates lead_status/updated_at

BEGIN;

-- Resident vehicles, used by the gate to recognise a vehicle on entry.
CREATE TABLE IF NOT EXISTS society_vehicles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id      UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
    resident_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    flat_number     TEXT NOT NULL,
    vehicle_number  TEXT NOT NULL,
    vehicle_type    TEXT,
    make_model      TEXT,
    colour          TEXT,
    parking_slot    TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- The gate looks a vehicle up by number within a society, so that pair
    -- must be unique for the lookup to be unambiguous.
    CONSTRAINT society_vehicles_unique UNIQUE (society_id, vehicle_number)
);

CREATE INDEX IF NOT EXISTS idx_society_vehicles_lookup
    ON society_vehicles(society_id, vehicle_number) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_society_vehicles_flat
    ON society_vehicles(society_id, flat_number);

-- Enquiries raised against a shop's universal catalogue.
CREATE TABLE IF NOT EXISTS universal_leads (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id      UUID NOT NULL REFERENCES local_shops(id) ON DELETE CASCADE,
    user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    lead_type    TEXT NOT NULL DEFAULT 'enquiry',
    content      TEXT,
    lead_status  TEXT NOT NULL DEFAULT 'new',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT universal_leads_status_valid
        CHECK (lead_status IN ('new', 'contacted', 'qualified', 'converted', 'lost'))
);

CREATE INDEX IF NOT EXISTS idx_universal_leads_shop ON universal_leads(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_universal_leads_user ON universal_leads(user_id);

COMMIT;
