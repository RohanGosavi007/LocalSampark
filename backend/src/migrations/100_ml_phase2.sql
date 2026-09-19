-- 100: state for the phase-2 ML subsystems.
--
-- Seven tables, each backing one subsystem, separated for the same reason 099
-- separated its five: the write patterns have nothing in common. Graph
-- embeddings are rewritten wholesale by a batch job, the exposure ledger is
-- read-modify-write on every served feed, model weights are written once per
-- training run and read once per boot, and the feature store is append-only
-- with a point-in-time read pattern that must never see a later row.
--
-- Everything here is inert until the matching admin_config key is switched on.
-- Creating the tables changes no behaviour; that is deliberate, so this
-- migration can ship ahead of the code that fills them.

BEGIN;

-- ─── LightGCN graph embeddings ──────────────────────────────────────────────
--
-- One row per node per propagation run. The graph is bipartite over four node
-- types — user, society, merchant, category — and the embedding is the result
-- of k rounds of symmetric-normalised neighbour aggregation.
--
-- Stored as JSON rather than as an array column because the dimension is a
-- property of the training run, not of the schema, and because SQLite has no
-- array type and the two files must stay structurally identical.
--
-- `layers` records how many propagation rounds produced the vector. A consumer
-- that expects 3-hop embeddings must not silently score against 1-hop ones
-- left behind by an interrupted job.
CREATE TABLE IF NOT EXISTS ml_graph_embeddings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    node_type       VARCHAR(16) NOT NULL,
    node_id         VARCHAR(128) NOT NULL,

    -- Territory-scoped. A merchant's standing inside one society says nothing
    -- about another, and pooling every society into one graph is precisely the
    -- averaging that destroys the hyperlocal signal this module exists for.
    region_id       UUID REFERENCES regions(id) ON DELETE CASCADE,

    dimension       INTEGER NOT NULL,
    layers          INTEGER NOT NULL DEFAULT 3,
    vector          TEXT NOT NULL,

    -- How many edges touched this node. The confidence ramp reads it: a node
    -- with two edges gets an embedding, but not one worth trusting.
    degree          INTEGER NOT NULL DEFAULT 0,

    built_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_graph_dimension_positive CHECK (dimension > 0),
    CONSTRAINT ml_graph_node_type_valid
        CHECK (node_type IN ('user', 'society', 'merchant', 'category'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_graph_node_unique
    ON ml_graph_embeddings(node_type, node_id, COALESCE(region_id::text, ''));
CREATE INDEX IF NOT EXISTS idx_ml_graph_type_region
    ON ml_graph_embeddings(node_type, region_id);

-- ─── Sequence model weights ─────────────────────────────────────────────────
--
-- The trained self-attention next-action model, versioned. Exactly one row may
-- carry is_active = 1; the loader reads that row at boot and on warm reload.
--
-- Versioning rather than overwriting is what makes a bad training run
-- recoverable without a restore: flipping is_active back to the previous row is
-- an UPDATE, and the weights that produced last week's metrics are still there
-- to compare against.
CREATE TABLE IF NOT EXISTS ml_sequence_model (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    version         INTEGER NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,

    -- Architecture, recorded so a loader can refuse weights shaped for a
    -- different encoder rather than reshaping them into nonsense.
    d_model         INTEGER NOT NULL,
    n_heads         INTEGER NOT NULL,
    max_len         INTEGER NOT NULL,

    -- category slug -> index. The model's output layer is over this vocabulary,
    -- so it has to travel with the weights.
    vocabulary      TEXT NOT NULL,
    weights         TEXT NOT NULL,

    -- { "held_out_accuracy": .., "baseline_accuracy": .., "sequences": .. }
    metrics         TEXT,

    trained_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_sequence_dims_positive
        CHECK (d_model > 0 AND n_heads > 0 AND max_len > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_sequence_version ON ml_sequence_model(version);

-- ─── Uplift model weights ───────────────────────────────────────────────────
--
-- The X-learner's four fitted components plus the propensity model, stored
-- together because they are only meaningful as a set — scoring with a treated
-- outcome model from one run and a control model from another estimates
-- nothing.
CREATE TABLE IF NOT EXISTS ml_uplift_model (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    version         INTEGER NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,

    feature_names   TEXT NOT NULL,
    -- { "mu0": [..], "mu1": [..], "tau0": [..], "tau1": [..], "propensity": [..] }
    weights         TEXT NOT NULL,
    -- { "qini": [[x,y],..], "auuc": .., "n_treated": .., "n_control": .. }
    metrics         TEXT,

    trained_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_uplift_version_positive CHECK (version > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_uplift_version ON ml_uplift_model(version);

-- ─── Exposure ledger (amortised fairness) ───────────────────────────────────
--
-- One row per merchant per territory per day. The fairness re-ranker reads the
-- running deficit and writes back what it served, which is what makes fairness
-- amortised across sessions rather than enforced within each one — enforcing it
-- per feed would put an under-served merchant in every user's top three
-- simultaneously, which is neither fair nor useful.
CREATE TABLE IF NOT EXISTS ml_exposure_ledger (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    item_type       VARCHAR(16) NOT NULL DEFAULT 'shop',
    item_id         VARCHAR(128) NOT NULL,
    region_id       UUID REFERENCES regions(id) ON DELETE CASCADE,

    -- 'YYYY-MM-DD'. A date rather than a timestamp: the fairness window is a
    -- day, and storing the instant would invite per-request arithmetic on a
    -- read-modify-write path.
    window_date     DATE NOT NULL,

    impressions     BIGINT NOT NULL DEFAULT 0,
    -- What an equal split would have given this merchant over the same window.
    fair_share      DOUBLE PRECISION NOT NULL DEFAULT 0,
    -- Positive when the merchant is owed exposure. Carried forward by the job.
    deficit         DOUBLE PRECISION NOT NULL DEFAULT 0,

    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_exposure_impressions_non_negative CHECK (impressions >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_exposure_unique
    ON ml_exposure_ledger(item_type, item_id, COALESCE(region_id::text, ''), window_date);
CREATE INDEX IF NOT EXISTS idx_ml_exposure_window
    ON ml_exposure_ledger(window_date, region_id);

-- ─── Feature store ──────────────────────────────────────────────────────────
--
-- The online serving copy. The offline path does not read this table — it
-- reconstructs values from the event log as of a historical timestamp, which is
-- the only way to avoid training on a feature computed after its own label.
--
-- `valid_from` is when the value became true, not when the row was written.
-- Those differ whenever a batch job backfills, and an as-of join against the
-- write time would leak the future by exactly the backfill lag.
CREATE TABLE IF NOT EXISTS ml_feature_values (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    feature         VARCHAR(64) NOT NULL,
    entity_type     VARCHAR(16) NOT NULL,
    entity_id       VARCHAR(128) NOT NULL,

    value_num       DOUBLE PRECISION,
    value_text      TEXT,

    valid_from      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    computed_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_feature_entity_type_valid
        CHECK (entity_type IN ('user', 'shop', 'category', 'society', 'region', 'global'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_feature_current
    ON ml_feature_values(feature, entity_type, entity_id, valid_from);
CREATE INDEX IF NOT EXISTS idx_ml_feature_lookup
    ON ml_feature_values(feature, entity_type, entity_id, valid_from DESC);

-- ─── Visual search embeddings ───────────────────────────────────────────────
--
-- Dense image descriptors for catalogue items, computed once and searched with
-- the same ANN index the text vectors use.
--
-- `source_hash` is a content hash of the image bytes. Re-embedding an unchanged
-- image is the single largest avoidable cost in the indexing job, and a URL is
-- not a sufficient key because the catalogue re-uploads under the same path.
CREATE TABLE IF NOT EXISTS ml_visual_embeddings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    item_type       VARCHAR(16) NOT NULL,
    item_id         VARCHAR(128) NOT NULL,

    dimension       INTEGER NOT NULL,
    vector          TEXT NOT NULL,

    source_url      TEXT,
    source_hash     VARCHAR(64),
    extractor       VARCHAR(48) NOT NULL,

    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_visual_dimension_positive CHECK (dimension > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_visual_item
    ON ml_visual_embeddings(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_ml_visual_hash ON ml_visual_embeddings(source_hash);

-- ─── Cold-start priors ──────────────────────────────────────────────────────
--
-- The empirical-Bayes prior borrowed by a sparse pincode from its neighbours,
-- recomputed by the cold-start job. Materialised rather than computed per
-- request because the similarity search over pincodes is the expensive half and
-- it changes on the order of days.
CREATE TABLE IF NOT EXISTS ml_coldstart_priors (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    pincode         VARCHAR(10) NOT NULL,
    category        VARCHAR(64),

    -- Beta prior on the click-through rate, in pseudo-observations.
    prior_alpha     DOUBLE PRECISION NOT NULL DEFAULT 1,
    prior_beta      DOUBLE PRECISION NOT NULL DEFAULT 1,

    -- 0..1. How much of the prior is borrowed versus native, at the time of
    -- computation. Falls as the pincode accumulates its own events.
    shrinkage       DOUBLE PRECISION NOT NULL DEFAULT 1,
    -- The pincodes it was borrowed from, for explainability.
    donors          TEXT,

    own_events      BIGINT NOT NULL DEFAULT 0,
    computed_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_coldstart_prior_positive
        CHECK (prior_alpha > 0 AND prior_beta > 0),
    CONSTRAINT ml_coldstart_shrinkage_range
        CHECK (shrinkage >= 0 AND shrinkage <= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_coldstart_unique
    ON ml_coldstart_priors(pincode, COALESCE(category, ''));

-- ─── Configuration ──────────────────────────────────────────────────────────
--
-- Every new subsystem defaults to off. A migration that switches on a ranking
-- change is a deploy that changes what every user sees without anyone deciding
-- to; the decision belongs in the admin console, on a named actor's account.
INSERT INTO admin_config (id, config_key, config_value, config_category, description, is_active)
SELECT v.id::uuid, v.config_key, to_jsonb(v.config_value), v.config_category, v.description, v.is_active
FROM (VALUES
    ('b2e1d3c5-0002-4000-8000-000000000001', 'ml_graph_enabled',       'false', 'ml', 'Add the LightGCN society-affinity term to ranking.', TRUE),
    ('b2e1d3c5-0002-4000-8000-000000000002', 'ml_graph_layers',        '3',     'ml', 'Propagation rounds in the graph embedding job. Beyond four, embeddings over-smooth.', TRUE),
    ('b2e1d3c5-0002-4000-8000-000000000003', 'ml_graph_dim',           '32',    'ml', 'Graph embedding dimension.', TRUE),
    ('b2e1d3c5-0002-4000-8000-000000000004', 'ml_w_graph',             '0.0',   'ml', 'Weight on the society-affinity term. Zero until the graph has support.', TRUE),
    ('b2e1d3c5-0002-4000-8000-000000000005', 'ml_graph_min_degree',    '3',     'ml', 'Edges a node needs before its embedding is trusted.', TRUE),

    ('b2e1d3c5-0002-4000-8000-000000000006', 'ml_narratives_enabled',  'true',  'ml', 'Attach social-proof badges to ranked cards.', TRUE),
    ('b2e1d3c5-0002-4000-8000-000000000007', 'ml_narratives_budget_ms','40',    'ml', 'Budget for badge generation before falling back to the deterministic rules.', TRUE),

    ('b2e1d3c5-0002-4000-8000-000000000008', 'ml_sequence_enabled',    'false', 'ml', 'Use the sequential intent model as a ranking signal.', TRUE),
    ('b2e1d3c5-0002-4000-8000-000000000009', 'ml_sequence_max_len',    '50',    'ml', 'Events of history the sequence model attends over.', TRUE),
    ('b2e1d3c5-0002-4000-8000-00000000000a', 'ml_w_intent',            '0.0',   'ml', 'Weight on the predicted-next-category term.', TRUE),

    ('b2e1d3c5-0002-4000-8000-00000000000b', 'ml_uplift_enabled',      'false', 'ml', 'Re-rank by estimated incremental conversion rather than predicted engagement.', TRUE),
    ('b2e1d3c5-0002-4000-8000-00000000000c', 'ml_uplift_strength',     '0.5',   'ml', 'How far the uplift multiplier may move a score. 0 is a no-op.', TRUE),

    ('b2e1d3c5-0002-4000-8000-00000000000d', 'ml_ann_enabled',         'false', 'ml', 'Serve retrieval from the HNSW index instead of a linear scan.', TRUE),
    ('b2e1d3c5-0002-4000-8000-00000000000e', 'ml_ann_ef_search',       '64',    'ml', 'HNSW search breadth. Higher is more accurate and slower.', TRUE),
    ('b2e1d3c5-0002-4000-8000-00000000000f', 'ml_ann_ef_construction', '200',   'ml', 'HNSW build breadth. Affects index quality, not query cost.', TRUE),
    ('b2e1d3c5-0002-4000-8000-000000000010', 'ml_ann_m',               '16',    'ml', 'HNSW neighbours per node per layer.', TRUE),
    ('b2e1d3c5-0002-4000-8000-000000000011', 'ml_rrf_k',               '60',    'ml', 'Reciprocal-rank-fusion constant when blending keyword and vector results.', TRUE),
    ('b2e1d3c5-0002-4000-8000-000000000012', 'ml_hybrid_w_dense',      '0.5',   'ml', 'Share of the fused score contributed by dense retrieval.', TRUE),

    ('b2e1d3c5-0002-4000-8000-000000000013', 'ml_coldstart_enabled',   'true',  'ml', 'Give new merchants a reserved share of feed slots.', TRUE),
    ('b2e1d3c5-0002-4000-8000-000000000014', 'ml_coldstart_budget',    '0.1',   'ml', 'Share of ranked slots reserved for high-uncertainty new merchants.', TRUE),
    ('b2e1d3c5-0002-4000-8000-000000000015', 'ml_coldstart_grace_days','30',    'ml', 'How long a merchant counts as new.', TRUE),

    ('b2e1d3c5-0002-4000-8000-000000000016', 'ml_fairness_enabled',    'false', 'ml', 'Guarantee each merchant a minimum share of impressions.', TRUE),
    ('b2e1d3c5-0002-4000-8000-000000000017', 'ml_fairness_strength',   '0.3',   'ml', 'How hard the exposure constraint pulls. Higher costs more relevance.', TRUE),
    ('b2e1d3c5-0002-4000-8000-000000000018', 'ml_fairness_max_ndcg_loss','0.05','ml', 'Relevance the fairness re-ranker may spend. It stops rather than exceed this.', TRUE),

    ('b2e1d3c5-0002-4000-8000-000000000019', 'ml_visual_enabled',      'false', 'ml', 'Accept image queries on the visual search endpoint.', TRUE),
    ('b2e1d3c5-0002-4000-8000-00000000001a', 'ml_visual_min_score',    '0.45',  'ml', 'Similarity below which visual search falls back to keywords.', TRUE),

    ('b2e1d3c5-0002-4000-8000-00000000001b', 'ml_featurestore_enabled','true',  'ml', 'Serve ranking features through the feature store rather than ad-hoc queries.', TRUE),
    ('b2e1d3c5-0002-4000-8000-00000000001c', 'ml_featurestore_ttl_ms', '60000', 'ml', 'Online feature cache lifetime.', TRUE)
) AS v(id, config_key, config_value, config_category, description, is_active)
ON CONFLICT (config_key) DO NOTHING;

COMMIT;
