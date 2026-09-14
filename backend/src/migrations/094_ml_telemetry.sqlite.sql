-- SQLite variant of 094_ml_telemetry.sql. See that file for why these tables
-- exist and what each column is for.
--
-- Translations from the Postgres original:
--   BIGSERIAL      -> INTEGER PRIMARY KEY AUTOINCREMENT
--   UUID / VARCHAR -> TEXT (ids in this schema are TEXT uuids)
--   BOOLEAN        -> INTEGER 0/1
--   REAL           -> REAL
--   TIMESTAMP      -> DATETIME
--   INSERT ... SELECT FROM (VALUES ...) -> INSERT OR IGNORE, which is a no-op
--   on re-run because admin_config already declares config_key UNIQUE.
--
-- Keeping this in step with the Postgres file matters more here than usual:
-- the CI suite runs against SQLite, so a table that exists only in the Postgres
-- migration is a table the tests can never exercise.

CREATE TABLE IF NOT EXISTS ml_interaction_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT REFERENCES users(id) ON DELETE CASCADE,
    session_id      TEXT,
    item_type       TEXT NOT NULL,
    item_id         TEXT NOT NULL,
    event_type      TEXT NOT NULL,
    weight          REAL NOT NULL DEFAULT 0,
    surface         TEXT,
    position        INTEGER,
    is_exploration  INTEGER NOT NULL DEFAULT 0,
    region_id       TEXT REFERENCES regions(id) ON DELETE SET NULL,
    pincode         TEXT,
    local_hour      INTEGER,
    platform        TEXT,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_events_event_type_valid CHECK (event_type IN (
        'IMPRESSION', 'CARD_CLICK', 'DETAIL_VIEW', 'BOOKMARK',
        'CALL_VENDOR', 'SHARE', 'PURCHASE_INTENT'
    )),
    CONSTRAINT ml_events_item_type_valid CHECK (item_type IN (
        'shop', 'product', 'service', 'job', 'listing', 'event'
    )),
    CONSTRAINT ml_events_weight_non_negative CHECK (weight >= 0),
    CONSTRAINT ml_events_local_hour_valid CHECK (local_hour IS NULL OR (local_hour BETWEEN 0 AND 23))
);

CREATE INDEX IF NOT EXISTS idx_ml_events_created   ON ml_interaction_events(created_at);
CREATE INDEX IF NOT EXISTS idx_ml_events_user_item ON ml_interaction_events(user_id, item_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_events_session   ON ml_interaction_events(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ml_events_surface   ON ml_interaction_events(surface, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_ml_events_item      ON ml_interaction_events(item_type, item_id, event_type);

CREATE TABLE IF NOT EXISTS ml_item_affinity (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    item_type       TEXT NOT NULL,
    source_item_id  TEXT NOT NULL,
    related_item_id TEXT NOT NULL,
    score           REAL NOT NULL DEFAULT 0,
    support         INTEGER NOT NULL DEFAULT 0,
    computed_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_affinity_no_self CHECK (source_item_id <> related_item_id),
    CONSTRAINT ml_affinity_unique UNIQUE (item_type, source_item_id, related_item_id)
);

CREATE INDEX IF NOT EXISTS idx_ml_affinity_source ON ml_item_affinity(item_type, source_item_id, score DESC);

-- Seed the ML runtime configuration into admin_config.
--
-- admin_config already declares `config_key TEXT UNIQUE`, so INSERT OR IGNORE
-- is a no-op on re-run without adding an index here. That same constraint is
-- why region-scoped values are stored under a suffixed key rather than as a
-- second row with the same key — see storageKey() in mlconfig.service.js.
--
-- The id is supplied explicitly. `id TEXT PRIMARY KEY` has no default, and
-- SQLite — alone among engines — permits NULL in a primary key column, so an
-- INSERT that omits it produces rows with a NULL id that `WHERE id = ?` can
-- never match. The seeded rows are given fixed uuids so the values are stable
-- across environments and a re-run cannot duplicate them.
INSERT OR IGNORE INTO admin_config (id, config_key, config_value, config_category, description, is_active) VALUES
    ('0070a5ad-22c7-5901-8d2a-8933aaccef66', 'ml_enabled', 'false', 'ml', 'Master switch. When false every ML endpoint serves the deterministic distance-and-popularity baseline.', 1),
    ('73a8e80e-5fc0-5336-a663-838bea2e31d0', 'ml_enabled_shops', 'true', 'ml', 'Per-surface switch for the shop feed. Has no effect while ml_enabled is false.', 1),
    ('d74a18aa-4504-512f-8dba-8f2aa75d519b', 'ml_enabled_services', 'true', 'ml', 'Per-surface switch for the services feed.', 1),
    ('b912c10d-3fc2-5855-a629-c0e37c86e6a5', 'ml_enabled_jobs', 'true', 'ml', 'Per-surface switch for the jobs feed.', 1),
    ('dcc8715b-241e-5993-b4cb-3c7edd929524', 'ml_enabled_marketplace', 'true', 'ml', 'Per-surface switch for the marketplace feed.', 1),
    ('ddf5549f-7497-59ca-a0c6-fa621dcb18c0', 'ml_w_sim', '0.25', 'ml', 'Weight of vector similarity between the user preference vector and the item.', 1),
    ('322186cb-af52-5e86-a2e6-e14eeee95890', 'ml_w_cf', '0.0', 'ml', 'Weight of the collaborative term. Zero until the affinity matrix passes ml_cf_min_support.', 1),
    ('032e96ea-78bc-5936-83be-3d8408e96316', 'ml_w_dist', '0.40', 'ml', 'Weight of geographic proximity. Dominant at launch because proximity is the product.', 1),
    ('e3693a38-74ec-58de-8d70-2ad091932a1b', 'ml_w_pop', '0.20', 'ml', 'Weight of the Wilson lower bound on ratings, not the mean rating.', 1),
    ('b5c39f55-2b79-5120-b5fa-1bc7e5ec9bb9', 'ml_w_rec', '0.10', 'ml', 'Weight of listing freshness, which keeps newly onboarded merchants visible.', 1),
    ('1b6c6bf8-cc07-50e3-8943-b6684edeb567', 'ml_w_ctx', '0.05', 'ml', 'Weight of the time-of-day category affinity signal.', 1),
    ('96fb586c-426e-59e0-a2fe-dbe7a4b767a0', 'ml_epsilon', '0.12', 'ml', 'Share of each returned page given to exploration slots.', 1),
    ('d47396dc-31c4-526c-ae00-bdbb9a4949e6', 'ml_distance_half_life_km', '2.0', 'ml', 'Half-life in kilometres of the exponential distance decay.', 1),
    ('d59678bb-a937-57e3-970b-1a526b9327ae', 'ml_cf_min_support', '50', 'ml', 'Minimum co-occurrence support before a collaborative pair contributes at all.', 1),
    ('8c76c61e-b513-5e09-bfed-5a32c34354d5', 'ml_timeout_ms', '150', 'ml', 'Server-side ranking budget. Past this the baseline result is returned.', 1),
    ('b1c6dece-d3e2-58fa-99e1-665069db42a3', 'ml_candidate_limit', '200', 'ml', 'Maximum candidates passed from retrieval into re-ranking.', 1);
