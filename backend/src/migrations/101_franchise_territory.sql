-- 101: exclusive franchise territories, and the boundary quarantine flag.
--
-- Two concerns, and the first one is the reason this migration exists at all.
--
-- ─── The boundary quarantine ────────────────────────────────────────────────
--
-- Migration 097 added `centroid_verified` to territories and flagged every
-- existing row unverified, because the stored coordinates are uniform random
-- noise attached to genuine place names and pincodes — territories sharing a
-- pincode prefix, which in reality span under 60 km, are spread over roughly
-- 900 km. spatial.repository.js honours that flag on its distance lookups.
--
-- It does not honour it on the polygon lookup, and it cannot, because there was
-- no flag to honour: every row's `boundary_geojson` is a 5 km circle generated
-- around the same fabricated centroid. `pointInTerritory` therefore answered
-- "Aurangabad City" for a coordinate 415 km away on the Konkan coast, with no
-- indication anything was wrong. Franchise attribution, commission and lead
-- routing all read that answer.
--
-- `boundary_verified` closes it. Every existing row is flagged 0, the repository
-- filters on it exactly as it filters on centroid_verified, and polygon
-- attribution stays switched off until real boundaries are imported. Pincode —
-- which is genuine data here, all 1578 rows valid, unique and non-null — remains
-- the authoritative key in the meantime.
--
-- Nothing about the polygon engine is removed or stubbed. It is complete and
-- tested; it is simply not permitted to attribute revenue from geometry nobody
-- has verified. Importing real boundaries and setting this flag switches GPS
-- precedence on with no code change.
--
-- ─── Exclusive territories ──────────────────────────────────────────────────
--
-- franchise_partners.territory_pincode is a single TEXT pincode, so a partner
-- could hold exactly one and nothing prevented two partners holding the same
-- one. franchise_territories replaces it as the source of truth: many pincodes
-- per franchise, and a partial unique index that makes two active claims on one
-- territory impossible at the database level rather than by convention.

BEGIN;

-- ─── Boundary trust ─────────────────────────────────────────────────────────

ALTER TABLE territories ADD COLUMN IF NOT EXISTS boundary_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Provenance, so "where did this polygon come from" is answerable. A boundary
-- marked verified with no source is the state worth being able to find.
ALTER TABLE territories ADD COLUMN IF NOT EXISTS boundary_source VARCHAR(120);
ALTER TABLE territories ADD COLUMN IF NOT EXISTS boundary_imported_at TIMESTAMP;

-- Explicit and unconditional. Every boundary currently in the table is
-- generated from a fabricated centroid; none of them is verified, and a default
-- alone would not correct a row that somehow already carried TRUE.
UPDATE territories SET boundary_verified = FALSE WHERE boundary_verified IS NULL OR boundary_verified = TRUE;

CREATE INDEX IF NOT EXISTS idx_territories_boundary_verified
    ON territories(boundary_verified) WHERE boundary_verified = TRUE;

-- Pincode is the authoritative key while boundaries are quarantined, so it is
-- the one that needs the index.
CREATE INDEX IF NOT EXISTS idx_territories_pincode ON territories(pincode);

-- ─── Exclusive franchise territory assignment ───────────────────────────────

CREATE TABLE IF NOT EXISTS franchise_territories (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    franchise_partner_id    UUID NOT NULL REFERENCES franchise_partners(id) ON DELETE CASCADE,
    territory_id            UUID NOT NULL REFERENCES territories(id) ON DELETE CASCADE,

    -- Denormalised from territories at assignment time. Attribution reads this
    -- on every order, and joining to territories for a six-character string on
    -- a hot path is a join that buys nothing. It is written by the service, not
    -- by hand, so it cannot drift.
    pincode                 VARCHAR(10) NOT NULL,

    status                  VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',

    -- Overrides the partner-level rate for this territory when set. Null means
    -- "use the partner's rate" — distinct from 0, which means this territory
    -- genuinely earns nothing.
    commission_rate         DOUBLE PRECISION,

    -- Extends the serviceable area beyond the territory itself. Only meaningful
    -- once boundaries are verified; recorded now so the column does not need
    -- adding later.
    buffer_radius_km        DOUBLE PRECISION NOT NULL DEFAULT 0,

    assigned_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by             UUID REFERENCES users(id) ON DELETE SET NULL,
    released_at             TIMESTAMP,

    CONSTRAINT franchise_territory_status_valid
        CHECK (status IN ('ACTIVE', 'SUSPENDED', 'RELEASED')),
    CONSTRAINT franchise_territory_buffer_non_negative
        CHECK (buffer_radius_km >= 0),
    CONSTRAINT franchise_territory_commission_range
        CHECK (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 100))
);

-- Exclusivity, enforced by the database rather than by the service.
--
-- Partial on status so a released assignment stays in the table as history
-- without blocking the next partner. A service-level check could not provide
-- this: two concurrent assignment requests both read "unclaimed" and both
-- write, and the territory ends up with two active owners splitting one
-- commission. The index makes the second write fail.
CREATE UNIQUE INDEX IF NOT EXISTS idx_franchise_territory_exclusive
    ON franchise_territories(territory_id) WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_franchise_territory_partner
    ON franchise_territories(franchise_partner_id, status);
CREATE INDEX IF NOT EXISTS idx_franchise_territory_pincode
    ON franchise_territories(pincode, status);

-- ─── Reassignment history ───────────────────────────────────────────────────
--
-- When a territory moves between partners, historical orders must keep pointing
-- at whoever held it when they happened, while new orders go to the new holder.
-- Rewriting past attribution would move money that has already been paid out.
--
-- This is the record that makes "who held pincode 411001 last March" answerable
-- without reconstructing it from assignment timestamps.
CREATE TABLE IF NOT EXISTS territory_assignment_log (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    territory_id            UUID NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
    pincode                 VARCHAR(10) NOT NULL,

    from_franchise_id       UUID REFERENCES franchise_partners(id) ON DELETE SET NULL,
    to_franchise_id         UUID REFERENCES franchise_partners(id) ON DELETE SET NULL,

    action                  VARCHAR(24) NOT NULL,
    reason                  TEXT,

    -- The instant the change takes effect for attribution. Separate from
    -- created_at so a transfer can be scheduled for a billing boundary rather
    -- than splitting a month in half.
    effective_from          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    performed_by            UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT territory_assignment_action_valid
        CHECK (action IN ('ASSIGNED', 'TRANSFERRED', 'RELEASED', 'SUSPENDED', 'REINSTATED'))
);

CREATE INDEX IF NOT EXISTS idx_territory_assignment_log_territory
    ON territory_assignment_log(territory_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_territory_assignment_log_pincode
    ON territory_assignment_log(pincode, effective_from DESC);

-- ─── Unassigned-area demand ─────────────────────────────────────────────────
--
-- A pincode with no franchise is not an error, it is a sales lead. Recording
-- the demand turns the black hole the audit found into the input for deciding
-- where to sell the next franchise.
CREATE TABLE IF NOT EXISTS territory_coverage_gaps (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    pincode                 VARCHAR(10) NOT NULL,
    territory_id            UUID REFERENCES territories(id) ON DELETE SET NULL,

    -- How many times the platform was asked to serve this area and could not
    -- attribute it to anyone.
    request_count           BIGINT NOT NULL DEFAULT 0,
    last_requested_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    first_requested_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Set when someone taps "become a partner for this area".
    interest_count          BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT territory_gap_counts_non_negative
        CHECK (request_count >= 0 AND interest_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_territory_coverage_gap_pincode
    ON territory_coverage_gaps(pincode);

COMMIT;
