-- ─────────────────────────────────────────────────────────────────────────────
-- 104: Territory transition log
--
-- Where a user or rider crossed from one franchise territory into another, as
-- reported by the device. Separate from territory_assignment_log, which records
-- commercial changes — who holds an area — rather than movement through it.
--
-- `occurred_at` and `received_at` are both kept and they are genuinely
-- different. Crossing a franchise boundary is exactly when a rider is most
-- likely to have no signal, because that is the edge of a serviced area, so the
-- device queues the crossing and uploads it later. Recording only the upload
-- time would place every reconnection's backlog at the moment the signal
-- returned, which makes the log useless for the question it exists to answer.
--
-- `mocked` is stored rather than filtered out. A device that reports a
-- spoofed fix is itself worth knowing about, and a row that is visibly flagged
-- is more useful than a row that was silently dropped.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS territory_transitions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID REFERENCES users(id) ON DELETE CASCADE,

    from_territory_id   TEXT REFERENCES territories(id) ON DELETE SET NULL,
    to_territory_id     TEXT REFERENCES territories(id) ON DELETE SET NULL,

    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION,

    occurred_at         TIMESTAMP NOT NULL,
    received_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    mocked              BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT territory_transition_moved CHECK (
        from_territory_id IS DISTINCT FROM to_territory_id
    )
);

CREATE INDEX IF NOT EXISTS idx_territory_transition_user
    ON territory_transitions(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_territory_transition_to
    ON territory_transitions(to_territory_id, occurred_at DESC);

-- The device may retry an upload it already made. Same user, same crossing,
-- same instant is the same event, and a duplicate would double-count a rider's
-- border activity.
CREATE UNIQUE INDEX IF NOT EXISTS idx_territory_transition_dedupe
    ON territory_transitions(user_id, occurred_at, to_territory_id);
