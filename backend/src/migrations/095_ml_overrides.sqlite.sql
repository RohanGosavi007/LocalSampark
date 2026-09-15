-- SQLite variant of 095_ml_overrides.sql. See that file for what each override
-- type means and why curation is kept separate from the scoring weights.
--
-- Translations: UUID/VARCHAR -> TEXT, BOOLEAN -> INTEGER 0/1,
-- TIMESTAMP -> DATETIME, uuid_generate_v4() -> supplied by the application.
-- `region_id::text` in the unique index becomes a plain COALESCE, since every
-- id in this schema is already TEXT.

CREATE TABLE IF NOT EXISTS ml_item_overrides (
    id              TEXT PRIMARY KEY,
    surface         TEXT NOT NULL,
    item_type       TEXT NOT NULL DEFAULT 'shop',
    item_id         TEXT NOT NULL,
    override_type   TEXT NOT NULL,
    boost_factor    REAL,
    pinned_position INTEGER,
    region_id       TEXT REFERENCES regions(id) ON DELETE CASCADE,
    reason          TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at      DATETIME,

    CONSTRAINT ml_override_type_valid CHECK (override_type IN ('pin', 'boost', 'block')),
    CONSTRAINT ml_override_boost_sane CHECK (
        boost_factor IS NULL OR (boost_factor > 0 AND boost_factor <= 5)
    ),
    CONSTRAINT ml_override_position_sane CHECK (
        pinned_position IS NULL OR (pinned_position >= 0 AND pinned_position < 100)
    ),
    CONSTRAINT ml_override_has_payload CHECK (
        (override_type = 'pin'   AND pinned_position IS NOT NULL) OR
        (override_type = 'boost' AND boost_factor IS NOT NULL) OR
        (override_type = 'block')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_overrides_unique
    ON ml_item_overrides(surface, item_id, COALESCE(region_id, ''));

CREATE INDEX IF NOT EXISTS idx_ml_overrides_surface
    ON ml_item_overrides(surface, is_active);
