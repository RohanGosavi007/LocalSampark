-- 099: state for multi-task ranking, contextual bandits, anomaly detection and
-- A/B experimentation.
--
-- Five concerns, each with its own table, because they have genuinely different
-- write patterns: bandit state is read-modify-write per impression, demand
-- buckets are append-and-aggregate, drift snapshots are written once a day, the
-- moderation queue is human-paced, and experiments are configuration.

BEGIN;

-- ─── Contextual bandit state (LinUCB) ───────────────────────────────────────
--
-- One row per arm per scope. LinUCB maintains, for each arm, a d×d matrix A and
-- a d-vector b; the ridge-regression solution is theta = A^-1 b and the upper
-- confidence bound is theta'x + alpha*sqrt(x' A^-1 x).
--
-- A and b are stored as JSON arrays rather than as columns because d is a
-- property of the feature encoder, not of the schema: changing the context
-- vector would otherwise be a migration. `dimension` records what the stored
-- matrices were built for, so a mismatched encoder resets rather than
-- multiplying matrices of different sizes.
CREATE TABLE IF NOT EXISTS ml_bandit_arms (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Which decision this arm belongs to. 'home_layout' is the first.
    policy          VARCHAR(48) NOT NULL,
    arm             VARCHAR(64) NOT NULL,

    -- Territory-scoped learning. A module that works in a dense urban pincode
    -- need not work in a rural one, and pooling them learns neither.
    region_id       UUID REFERENCES regions(id) ON DELETE CASCADE,

    dimension       INTEGER NOT NULL,
    a_matrix        TEXT NOT NULL,
    b_vector        TEXT NOT NULL,

    -- Bookkeeping, and what the admin console reports.
    pulls           BIGINT NOT NULL DEFAULT 0,
    rewards         DOUBLE PRECISION NOT NULL DEFAULT 0,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_bandit_dimension_positive CHECK (dimension > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_bandit_arm_unique
    ON ml_bandit_arms(policy, arm, COALESCE(region_id::text, ''));

-- ─── A/B experiments ────────────────────────────────────────────────────────
--
-- Assignment is a pure function of (experiment, user) — see abTestingManager —
-- so there is no assignment table. A user always lands in the same variant
-- without a lookup, which keeps the ranking path free of an extra query and
-- means an assignment cannot be lost or drift between services.
CREATE TABLE IF NOT EXISTS ml_experiments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key             VARCHAR(64) NOT NULL UNIQUE,
    description     TEXT,

    -- [{ "name": "control", "weight": 80, "config": {...} }, ...]
    -- Weights are relative; the manager normalises them.
    variants        TEXT NOT NULL,

    is_active       BOOLEAN NOT NULL DEFAULT FALSE,
    -- Fraction of traffic entering the experiment at all. The remainder sees
    -- production behaviour and is not counted in either arm.
    traffic_pct     INTEGER NOT NULL DEFAULT 100,

    started_at      TIMESTAMP,
    stopped_at      TIMESTAMP,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_experiment_traffic_valid CHECK (traffic_pct BETWEEN 0 AND 100)
);

-- ─── Demand velocity buckets ────────────────────────────────────────────────
--
-- Pre-aggregated by (territory, category, hour) so the anomaly detector reads a
-- few hundred rows instead of scanning the raw interaction log. Written by the
-- aggregator job, never on the request path.
CREATE TABLE IF NOT EXISTS ml_demand_buckets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id       UUID REFERENCES regions(id) ON DELETE CASCADE,
    category        VARCHAR(100),
    bucket_start    TIMESTAMP NOT NULL,
    bucket_hours    INTEGER NOT NULL DEFAULT 1,

    impressions     INTEGER NOT NULL DEFAULT 0,
    clicks          INTEGER NOT NULL DEFAULT 0,
    conversions     INTEGER NOT NULL DEFAULT 0,
    distinct_actors INTEGER NOT NULL DEFAULT 0,
    computed_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_demand_bucket_unique
    ON ml_demand_buckets(COALESCE(region_id::text, ''), COALESCE(category, ''), bucket_start);
CREATE INDEX IF NOT EXISTS idx_ml_demand_bucket_time
    ON ml_demand_buckets(bucket_start);

-- ─── AI moderation queue ────────────────────────────────────────────────────
--
-- Statistical flags from the anomaly detector. Distinct from fraud_signals,
-- which FraudDetectionService fills with rule hits: a rule fires on a known
-- pattern, whereas these are outliers that need a human to look. Keeping them
-- apart stops a queue of "this is 4.2 standard deviations from normal" from
-- burying the deterministic hits an operator should action first.
CREATE TABLE IF NOT EXISTS ml_moderation_queue (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type     VARCHAR(32) NOT NULL,
    entity_id       TEXT NOT NULL,

    detector        VARCHAR(48) NOT NULL,
    -- 0..100. Combines the z-score magnitude with how much evidence supports it.
    risk_score      DOUBLE PRECISION NOT NULL,
    -- The numbers behind the score, so an operator can judge it rather than
    -- trust it.
    evidence        TEXT,

    status          VARCHAR(24) NOT NULL DEFAULT 'pending',
    reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at     TIMESTAMP,
    resolution_note TEXT,
    region_id       UUID REFERENCES regions(id) ON DELETE SET NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_moderation_status_valid
        CHECK (status IN ('pending', 'reviewing', 'actioned', 'dismissed')),
    CONSTRAINT ml_moderation_risk_range CHECK (risk_score >= 0 AND risk_score <= 100)
);

-- One open item per detector per entity: re-flagging the same listing every
-- hour would bury everything else.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_moderation_open_unique
    ON ml_moderation_queue(entity_type, entity_id, detector)
    WHERE status IN ('pending', 'reviewing');

CREATE INDEX IF NOT EXISTS idx_ml_moderation_status
    ON ml_moderation_queue(status, risk_score DESC);

-- ─── Feature distribution snapshots (drift / PSI) ───────────────────────────
--
-- A daily histogram per ranking feature. The Population Stability Index
-- compares a recent window against a reference window; storing the binned
-- distribution rather than raw values keeps this small and makes PSI a cheap
-- read rather than a scan.
CREATE TABLE IF NOT EXISTS ml_feature_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature         VARCHAR(64) NOT NULL,
    snapshot_date   DATE NOT NULL,
    -- {"bins": [0,0.1,...], "counts": [12,40,...], "n": 520}
    distribution    TEXT NOT NULL,
    sample_size     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_feature_snapshot_unique
    ON ml_feature_snapshots(feature, snapshot_date);

-- ─── Runtime configuration for the new subsystems ───────────────────────────
--
-- Same rule as every other ML value: nothing in the scoring path is a constant
-- an administrator cannot reach. Exponents default to 1.0, which makes the
-- multi-task composite reduce exactly to the plain product of its three
-- probabilities — a neutral starting point rather than an opinion.
INSERT INTO admin_config (config_key, config_value, config_category, description, is_active)
SELECT v.k, v.val, 'ml', v.descr, TRUE
  FROM (VALUES
    ('ml_mmoe_enabled',      'false', 'Use the multi-task (pCTR/pCVR/pQuality) ranker instead of the weighted-sum ranker.'),
    ('ml_mmoe_alpha',        '1.0',   'Exponent on pCTR in the composite score.'),
    ('ml_mmoe_beta',         '1.0',   'Exponent on pCVR. Raise above alpha to favour calls and bookings over clicks.'),
    ('ml_mmoe_gamma',        '1.0',   'Exponent on pQuality.'),
    ('ml_mmoe_lambda',       '0.15',  'Distance decay rate in the exponential penalty, per kilometre.'),
    ('ml_mmoe_prior_ctr',    '0.08',  'Prior click-through rate used to smooth listings with little history.'),
    ('ml_mmoe_prior_cvr',    '0.12',  'Prior conversion rate among clicks.'),
    ('ml_mmoe_prior_weight', '20',    'Strength of the priors, in pseudo-observations. Higher trusts history less.'),
    ('ml_bandit_enabled',    'false', 'Order the home feed with the contextual bandit rather than a fixed layout.'),
    ('ml_bandit_alpha',      '1.0',   'LinUCB exploration parameter. Higher explores more.'),
    ('ml_bandit_ridge',      '1.0',   'Ridge regularisation added to the identity when a bandit arm is initialised.'),
    ('ml_anomaly_enabled',   'true',  'Run the statistical anomaly detectors.'),
    ('ml_anomaly_z',         '3.0',   'Z-score above which a metric is flagged for moderation.'),
    ('ml_anomaly_min_n',     '10',    'Minimum observations before a z-score is considered meaningful.'),
    ('ml_drift_psi_warn',    '0.10',  'PSI above which a feature is reported as drifting.'),
    ('ml_drift_psi_alert',   '0.25',  'PSI above which a feature is reported as significantly drifted.')
  ) AS v(k, val, descr)
 WHERE NOT EXISTS (
   SELECT 1 FROM admin_config c WHERE c.config_key = v.k AND c.region_id IS NULL
 );

COMMIT;
