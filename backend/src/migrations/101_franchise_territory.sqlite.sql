-- SQLite variant of 101_franchise_territory.sql. See that file for why the
-- boundary quarantine exists and why exclusivity is a database constraint
-- rather than a service-level check.
--
-- Translations: UUID/VARCHAR -> TEXT (ids supplied by the application),
-- BOOLEAN -> INTEGER 0/1, DOUBLE PRECISION -> REAL, TIMESTAMP -> DATETIME.
--
-- SQLite has no `ADD COLUMN IF NOT EXISTS`. The runner reports and skips a
-- "duplicate column" error, which makes these statements idempotent in
-- practice; that is the same arrangement migration 097 relies on.

ALTER TABLE territories ADD COLUMN boundary_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE territories ADD COLUMN boundary_source TEXT;
ALTER TABLE territories ADD COLUMN boundary_imported_at DATETIME;

UPDATE territories SET boundary_verified = 0 WHERE boundary_verified IS NULL OR boundary_verified = 1;

CREATE INDEX IF NOT EXISTS idx_territories_boundary_verified
    ON territories(boundary_verified) WHERE boundary_verified = 1;

CREATE INDEX IF NOT EXISTS idx_territories_pincode ON territories(pincode);

CREATE TABLE IF NOT EXISTS franchise_territories (
    id                      TEXT PRIMARY KEY,
    franchise_partner_id    TEXT NOT NULL REFERENCES franchise_partners(id) ON DELETE CASCADE,
    territory_id            TEXT NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
    pincode                 TEXT NOT NULL,
    status                  TEXT NOT NULL DEFAULT 'ACTIVE',
    commission_rate         REAL,
    buffer_radius_km        REAL NOT NULL DEFAULT 0,
    assigned_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by             TEXT REFERENCES users(id) ON DELETE SET NULL,
    released_at             DATETIME,

    CONSTRAINT franchise_territory_status_valid
        CHECK (status IN ('ACTIVE', 'SUSPENDED', 'RELEASED')),
    CONSTRAINT franchise_territory_buffer_non_negative
        CHECK (buffer_radius_km >= 0),
    CONSTRAINT franchise_territory_commission_range
        CHECK (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 100))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_franchise_territory_exclusive
    ON franchise_territories(territory_id) WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_franchise_territory_partner
    ON franchise_territories(franchise_partner_id, status);
CREATE INDEX IF NOT EXISTS idx_franchise_territory_pincode
    ON franchise_territories(pincode, status);

CREATE TABLE IF NOT EXISTS territory_assignment_log (
    id                      TEXT PRIMARY KEY,
    territory_id            TEXT NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
    pincode                 TEXT NOT NULL,
    from_franchise_id       TEXT REFERENCES franchise_partners(id) ON DELETE SET NULL,
    to_franchise_id         TEXT REFERENCES franchise_partners(id) ON DELETE SET NULL,
    action                  TEXT NOT NULL,
    reason                  TEXT,
    effective_from          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    performed_by            TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT territory_assignment_action_valid
        CHECK (action IN ('ASSIGNED', 'TRANSFERRED', 'RELEASED', 'SUSPENDED', 'REINSTATED'))
);

CREATE INDEX IF NOT EXISTS idx_territory_assignment_log_territory
    ON territory_assignment_log(territory_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_territory_assignment_log_pincode
    ON territory_assignment_log(pincode, effective_from DESC);

CREATE TABLE IF NOT EXISTS territory_coverage_gaps (
    id                      TEXT PRIMARY KEY,
    pincode                 TEXT NOT NULL,
    territory_id            TEXT REFERENCES territories(id) ON DELETE SET NULL,
    request_count           INTEGER NOT NULL DEFAULT 0,
    last_requested_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    first_requested_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    interest_count          INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT territory_gap_counts_non_negative
        CHECK (request_count >= 0 AND interest_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_territory_coverage_gap_pincode
    ON territory_coverage_gaps(pincode);
