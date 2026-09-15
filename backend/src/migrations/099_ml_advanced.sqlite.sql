-- SQLite variant of 099_ml_advanced.sql. See that file for what each table is
-- for and why the bandit matrices are stored as JSON.
--
-- Translations: UUID/VARCHAR -> TEXT (ids supplied by the application, since
-- `id TEXT PRIMARY KEY` has no default and SQLite permits NULL in a primary
-- key), BOOLEAN -> INTEGER 0/1, DOUBLE PRECISION -> REAL, TIMESTAMP/DATE ->
-- DATETIME/TEXT, and `region_id::text` in the unique indexes becomes a plain
-- COALESCE since every id here is already TEXT.
--
-- The partial index on the moderation queue uses SQLite's WHERE clause support
-- for partial indexes, which matches the Postgres form exactly.

CREATE TABLE IF NOT EXISTS ml_bandit_arms (
    id              TEXT PRIMARY KEY,
    policy          TEXT NOT NULL,
    arm             TEXT NOT NULL,
    region_id       TEXT REFERENCES regions(id) ON DELETE CASCADE,
    dimension       INTEGER NOT NULL,
    a_matrix        TEXT NOT NULL,
    b_vector        TEXT NOT NULL,
    pulls           INTEGER NOT NULL DEFAULT 0,
    rewards         REAL NOT NULL DEFAULT 0,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_bandit_dimension_positive CHECK (dimension > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_bandit_arm_unique
    ON ml_bandit_arms(policy, arm, COALESCE(region_id, ''));

CREATE TABLE IF NOT EXISTS ml_experiments (
    id              TEXT PRIMARY KEY,
    key             TEXT NOT NULL UNIQUE,
    description     TEXT,
    variants        TEXT NOT NULL,
    is_active       INTEGER NOT NULL DEFAULT 0,
    traffic_pct     INTEGER NOT NULL DEFAULT 100,
    started_at      DATETIME,
    stopped_at      DATETIME,
    created_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_experiment_traffic_valid CHECK (traffic_pct BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS ml_demand_buckets (
    id              TEXT PRIMARY KEY,
    region_id       TEXT REFERENCES regions(id) ON DELETE CASCADE,
    category        TEXT,
    bucket_start    DATETIME NOT NULL,
    bucket_hours    INTEGER NOT NULL DEFAULT 1,
    impressions     INTEGER NOT NULL DEFAULT 0,
    clicks          INTEGER NOT NULL DEFAULT 0,
    conversions     INTEGER NOT NULL DEFAULT 0,
    distinct_actors INTEGER NOT NULL DEFAULT 0,
    computed_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_demand_bucket_unique
    ON ml_demand_buckets(COALESCE(region_id, ''), COALESCE(category, ''), bucket_start);
CREATE INDEX IF NOT EXISTS idx_ml_demand_bucket_time
    ON ml_demand_buckets(bucket_start);

CREATE TABLE IF NOT EXISTS ml_moderation_queue (
    id              TEXT PRIMARY KEY,
    entity_type     TEXT NOT NULL,
    entity_id       TEXT NOT NULL,
    detector        TEXT NOT NULL,
    risk_score      REAL NOT NULL,
    evidence        TEXT,
    status          TEXT NOT NULL DEFAULT 'pending',
    reviewed_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at     DATETIME,
    resolution_note TEXT,
    region_id       TEXT REFERENCES regions(id) ON DELETE SET NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_moderation_status_valid
        CHECK (status IN ('pending', 'reviewing', 'actioned', 'dismissed')),
    CONSTRAINT ml_moderation_risk_range CHECK (risk_score >= 0 AND risk_score <= 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_moderation_open_unique
    ON ml_moderation_queue(entity_type, entity_id, detector)
    WHERE status IN ('pending', 'reviewing');

CREATE INDEX IF NOT EXISTS idx_ml_moderation_status
    ON ml_moderation_queue(status, risk_score DESC);

CREATE TABLE IF NOT EXISTS ml_feature_snapshots (
    id              TEXT PRIMARY KEY,
    feature         TEXT NOT NULL,
    snapshot_date   TEXT NOT NULL,
    distribution    TEXT NOT NULL,
    sample_size     INTEGER NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_feature_snapshot_unique
    ON ml_feature_snapshots(feature, snapshot_date);

INSERT OR IGNORE INTO admin_config (id, config_key, config_value, config_category, description, is_active) VALUES
    ('a1f0c2d4-0001-4000-8000-000000000001', 'ml_mmoe_enabled',      'false', 'ml', 'Use the multi-task (pCTR/pCVR/pQuality) ranker instead of the weighted-sum ranker.', 1),
    ('a1f0c2d4-0001-4000-8000-000000000002', 'ml_mmoe_alpha',        '1.0',   'ml', 'Exponent on pCTR in the composite score.', 1),
    ('a1f0c2d4-0001-4000-8000-000000000003', 'ml_mmoe_beta',         '1.0',   'ml', 'Exponent on pCVR. Raise above alpha to favour calls and bookings over clicks.', 1),
    ('a1f0c2d4-0001-4000-8000-000000000004', 'ml_mmoe_gamma',        '1.0',   'ml', 'Exponent on pQuality.', 1),
    ('a1f0c2d4-0001-4000-8000-000000000005', 'ml_mmoe_lambda',       '0.15',  'ml', 'Distance decay rate in the exponential penalty, per kilometre.', 1),
    ('a1f0c2d4-0001-4000-8000-000000000006', 'ml_mmoe_prior_ctr',    '0.08',  'ml', 'Prior click-through rate used to smooth listings with little history.', 1),
    ('a1f0c2d4-0001-4000-8000-000000000007', 'ml_mmoe_prior_cvr',    '0.12',  'ml', 'Prior conversion rate among clicks.', 1),
    ('a1f0c2d4-0001-4000-8000-000000000008', 'ml_mmoe_prior_weight', '20',    'ml', 'Strength of the priors, in pseudo-observations. Higher trusts history less.', 1),
    ('a1f0c2d4-0001-4000-8000-000000000009', 'ml_bandit_enabled',    'false', 'ml', 'Order the home feed with the contextual bandit rather than a fixed layout.', 1),
    ('a1f0c2d4-0001-4000-8000-00000000000a', 'ml_bandit_alpha',      '1.0',   'ml', 'LinUCB exploration parameter. Higher explores more.', 1),
    ('a1f0c2d4-0001-4000-8000-00000000000b', 'ml_bandit_ridge',      '1.0',   'ml', 'Ridge regularisation added to the identity when a bandit arm is initialised.', 1),
    ('a1f0c2d4-0001-4000-8000-00000000000c', 'ml_anomaly_enabled',   'true',  'ml', 'Run the statistical anomaly detectors.', 1),
    ('a1f0c2d4-0001-4000-8000-00000000000d', 'ml_anomaly_z',         '3.0',   'ml', 'Z-score above which a metric is flagged for moderation.', 1),
    ('a1f0c2d4-0001-4000-8000-00000000000e', 'ml_anomaly_min_n',     '10',    'ml', 'Minimum observations before a z-score is considered meaningful.', 1),
    ('a1f0c2d4-0001-4000-8000-00000000000f', 'ml_drift_psi_warn',    '0.10',  'ml', 'PSI above which a feature is reported as drifting.', 1),
    ('a1f0c2d4-0001-4000-8000-000000000010', 'ml_drift_psi_alert',   '0.25',  'ml', 'PSI above which a feature is reported as significantly drifted.', 1);
