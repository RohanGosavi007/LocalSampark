-- 094: ML telemetry — the interaction log and the affinity matrix derived from it.
--
-- Nothing in this codebase records what a user actually looked at. Of the ~370
-- tables, none holds an impression, a click, a detail view or a dwell.
-- shop_analytics_daily declares profile_views, search_appearances and
-- click_through_rate, but the table is empty and no code path writes to it.
--
-- That is why these two tables come first, before any ranking code: a
-- recommender cannot learn from history that was never recorded, and the clock
-- on collecting it only starts once this is deployed.
--
-- Two tables, not one:
--
--   ml_interaction_events  append-only, one row per user action. Never read on
--                          the request path — it is the raw log, sized for
--                          writes and for recomputation.
--
--   ml_item_affinity       the item-to-item matrix the ranker actually reads,
--                          rebuilt nightly from the log. Small, indexed for
--                          point lookup by source item.
--
-- Keeping them separate means the scoring path never scans the log, and the
-- matrix can be rebuilt with a different weighting without losing raw history.

BEGIN;

-- ─── Raw interaction log ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ml_interaction_events (
    id              BIGSERIAL PRIMARY KEY,

    -- Nullable: anonymous browsing is the majority of hyperlocal discovery
    -- traffic and its signal is still usable for item-item co-occurrence.
    -- ON DELETE CASCADE so a DPDP erasure request removes the user's history
    -- with the account rather than leaving orphaned behavioural rows.
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Rotating client-generated id. Groups one browsing session for anonymous
    -- users. Deliberately NOT joined back to a user after the fact.
    session_id      TEXT,

    -- What was interacted with. item_type keeps one table serving shops,
    -- products, services, jobs and marketplace listings rather than five
    -- near-identical tables; item_id is not a foreign key for the same reason.
    item_type       VARCHAR(32) NOT NULL,
    item_id         TEXT NOT NULL,

    event_type      VARCHAR(32) NOT NULL,

    -- Denormalised from the event weight table at write time. Storing it means
    -- the matrix rebuild is a pure aggregation and does not have to know the
    -- weighting rules, and a later change to the weights does not silently
    -- rewrite the meaning of history already recorded.
    weight          REAL NOT NULL DEFAULT 0,

    -- Ranking context, so a result's performance can be attributed. position is
    -- the slot the item occupied; surface is the feed it was shown in.
    surface         VARCHAR(48),
    position        INTEGER,

    -- Set when the item was served by an exploration slot rather than by score,
    -- so exploration CTR can be compared against exploitation CTR directly.
    is_exploration  BOOLEAN NOT NULL DEFAULT FALSE,

    -- Territory the event happened in, for region-scoped metrics and tuning.
    region_id       UUID REFERENCES regions(id) ON DELETE SET NULL,
    pincode         VARCHAR(10),

    -- Client-reported, used for the time-of-day contextual signal. Stored
    -- rather than derived from created_at because the server may be in a
    -- different timezone than the user.
    local_hour      SMALLINT,

    platform        VARCHAR(16),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

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

-- Rebuild job scans by time window.
CREATE INDEX IF NOT EXISTS idx_ml_events_created       ON ml_interaction_events(created_at);
-- Per-user history, used to build the preference vector.
CREATE INDEX IF NOT EXISTS idx_ml_events_user_item     ON ml_interaction_events(user_id, item_type, created_at DESC);
-- Anonymous sessions co-occur through session_id rather than user_id.
CREATE INDEX IF NOT EXISTS idx_ml_events_session       ON ml_interaction_events(session_id, created_at);
-- CTR and coverage are computed per surface over a window.
CREATE INDEX IF NOT EXISTS idx_ml_events_surface       ON ml_interaction_events(surface, event_type, created_at);
-- "How many times has this item ever been shown", for the exploration floor.
CREATE INDEX IF NOT EXISTS idx_ml_events_item          ON ml_interaction_events(item_type, item_id, event_type);

-- ─── Derived item-to-item affinity ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ml_item_affinity (
    id              BIGSERIAL PRIMARY KEY,
    item_type       VARCHAR(32) NOT NULL,
    source_item_id  TEXT NOT NULL,
    related_item_id TEXT NOT NULL,

    -- Sum of weighted co-occurrences, normalised to 0..1 at rebuild time.
    score           REAL NOT NULL DEFAULT 0,

    -- Number of distinct users/sessions supporting this pair. The ranker scales
    -- the collaborative term by this: a pair seen twice must not carry the same
    -- authority as one seen four hundred times, and without this the first few
    -- weeks of sparse data would produce confident nonsense.
    support         INTEGER NOT NULL DEFAULT 0,

    computed_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_affinity_no_self CHECK (source_item_id <> related_item_id),
    CONSTRAINT ml_affinity_unique UNIQUE (item_type, source_item_id, related_item_id)
);

-- The only read pattern on the request path: top-N related items for one item.
CREATE INDEX IF NOT EXISTS idx_ml_affinity_source ON ml_item_affinity(item_type, source_item_id, score DESC);

-- ─── ML runtime configuration ───────────────────────────────────────────────
-- Weights, thresholds and kill switches live in admin_config, which already has
-- config_key / config_value / config_category / region_id / is_active /
-- updated_by / updated_at. That gives territory-scoped tuning and an audit
-- trail of who changed a weight without inventing a parallel table.
--
-- Seeded under the 'ml' category. Every value the ranker reads must exist here,
-- so that nothing in the scoring path is a hardcoded constant an admin cannot
-- reach. ml_enabled defaults to false: the engine ships dark and is switched on
-- deliberately.
INSERT INTO admin_config (config_key, config_value, config_category, description, is_active)
SELECT v.k, to_jsonb(v.val), 'ml', v.descr, TRUE
  FROM (VALUES
    ('ml_enabled',            'false', 'Master switch. When false every ML endpoint serves the deterministic distance-and-popularity baseline.'),
    ('ml_enabled_shops',      'true',  'Per-surface switch for the shop feed. Has no effect while ml_enabled is false.'),
    ('ml_enabled_services',   'true',  'Per-surface switch for the services feed.'),
    ('ml_enabled_jobs',       'true',  'Per-surface switch for the jobs feed.'),
    ('ml_enabled_marketplace','true',  'Per-surface switch for the marketplace feed.'),
    ('ml_w_sim',              '0.25',  'Weight of vector similarity between the user preference vector and the item.'),
    ('ml_w_cf',               '0.0',   'Weight of the collaborative term. Zero until the affinity matrix passes ml_cf_min_support.'),
    ('ml_w_dist',             '0.40',  'Weight of geographic proximity. Dominant at launch because proximity is the product.'),
    ('ml_w_pop',              '0.20',  'Weight of the Wilson lower bound on ratings, not the mean rating.'),
    ('ml_w_rec',              '0.10',  'Weight of listing freshness, which keeps newly onboarded merchants visible.'),
    ('ml_w_ctx',              '0.05',  'Weight of the time-of-day category affinity signal.'),
    ('ml_epsilon',            '0.12',  'Share of each returned page given to exploration slots.'),
    ('ml_distance_half_life_km','2.0', 'Half-life in kilometres of the exponential distance decay.'),
    ('ml_cf_min_support',     '50',    'Minimum co-occurrence support before a collaborative pair contributes at all.'),
    ('ml_timeout_ms',         '150',   'Server-side ranking budget. Past this the baseline result is returned.'),
    ('ml_candidate_limit',    '200',   'Maximum candidates passed from retrieval into re-ranking.')
  ) AS v(k, val, descr)
 WHERE NOT EXISTS (
   SELECT 1 FROM admin_config c WHERE c.config_key = v.k AND c.region_id IS NULL
 );

COMMIT;
