-- 095: admin curation of ranked results.
--
-- Three override types, deliberately separate from the scoring weights:
--
--   pin    place this merchant at a fixed slot regardless of score
--   boost  multiply its score by a factor
--   block  remove it from recommendations entirely
--
-- Weights change how the ranker values a signal for everyone; an override is a
-- statement about one merchant. Mixing them would make "why is this shop
-- first?" unanswerable, which matters here because every merchant in this
-- catalogue is a paying stakeholder entitled to an answer.
--
-- Pins are labelled as promoted in the API response so a user can tell a paid
-- placement from a ranked one, and every write is recorded in admin_audit_log
-- with an actor and a reason.
--
-- region_id scopes an override to one territory, which is what lets a territory
-- admin curate their own market without touching anyone else's. Unlike
-- admin_config, this table is new, so the uniqueness can be declared correctly
-- across (surface, item_id, region_id) from the start.

BEGIN;

CREATE TABLE IF NOT EXISTS ml_item_overrides (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    surface         VARCHAR(48) NOT NULL,
    item_type       VARCHAR(32) NOT NULL DEFAULT 'shop',
    item_id         TEXT NOT NULL,

    override_type   VARCHAR(16) NOT NULL,

    -- Multiplier for 'boost'. Bounded by the CHECK below: an unbounded factor
    -- is indistinguishable from a pin, but without a pin's disclosure.
    boost_factor    REAL,

    -- Zero-based slot for 'pin'.
    pinned_position INTEGER,

    region_id       UUID REFERENCES regions(id) ON DELETE CASCADE,

    -- Required by the API. A curation decision that nobody has to justify is
    -- one nobody can review later.
    reason          TEXT,

    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP,

    CONSTRAINT ml_override_type_valid CHECK (override_type IN ('pin', 'boost', 'block')),
    CONSTRAINT ml_override_boost_sane CHECK (
        boost_factor IS NULL OR (boost_factor > 0 AND boost_factor <= 5)
    ),
    CONSTRAINT ml_override_position_sane CHECK (
        pinned_position IS NULL OR (pinned_position >= 0 AND pinned_position < 100)
    ),
    -- A pin needs a position and a boost needs a factor; without this a row can
    -- be saved that the ranker silently ignores.
    CONSTRAINT ml_override_has_payload CHECK (
        (override_type = 'pin'   AND pinned_position IS NOT NULL) OR
        (override_type = 'boost' AND boost_factor IS NOT NULL) OR
        (override_type = 'block')
    )
);

-- One override per merchant per surface per territory. Two contradictory rows
-- would make the ranking depend on row order.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_overrides_unique
    ON ml_item_overrides(surface, item_id, COALESCE(region_id::text, ''));

-- The ranker's read path: every active override for one surface.
CREATE INDEX IF NOT EXISTS idx_ml_overrides_surface
    ON ml_item_overrides(surface, is_active);

COMMIT;
