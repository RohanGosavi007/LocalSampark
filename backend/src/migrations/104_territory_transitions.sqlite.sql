-- SQLite variant of 104_territory_transitions.sql. See that file for why both
-- occurred_at and received_at are kept, and why mocked rows are stored rather
-- than dropped.
--
-- IS DISTINCT FROM has no SQLite equivalent, so the "actually moved" check is
-- spelled out with an explicit NULL comparison.

CREATE TABLE IF NOT EXISTS territory_transitions (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT REFERENCES users(id) ON DELETE CASCADE,

    from_territory_id   TEXT REFERENCES territories(id) ON DELETE SET NULL,
    to_territory_id     TEXT REFERENCES territories(id) ON DELETE SET NULL,

    latitude            REAL,
    longitude           REAL,

    occurred_at         DATETIME NOT NULL,
    received_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    mocked              INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT territory_transition_moved CHECK (
        from_territory_id IS NULL
        OR to_territory_id IS NULL
        OR from_territory_id <> to_territory_id
    )
);

CREATE INDEX IF NOT EXISTS idx_territory_transition_user
    ON territory_transitions(user_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_territory_transition_to
    ON territory_transitions(to_territory_id, occurred_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_territory_transition_dedupe
    ON territory_transitions(user_id, occurred_at, to_territory_id);
