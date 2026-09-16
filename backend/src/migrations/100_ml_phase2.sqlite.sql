-- SQLite variant of 100_ml_phase2.sql. See that file for what each table is
-- for and why the model weights are stored as JSON.
--
-- Translations, the same set 099 used: UUID/VARCHAR -> TEXT (ids supplied by
-- the application), BOOLEAN -> INTEGER 0/1, DOUBLE PRECISION -> REAL,
-- TIMESTAMP -> DATETIME, DATE -> TEXT holding 'YYYY-MM-DD', `region_id::text`
-- in the unique indexes -> a plain COALESCE since every id here is already
-- TEXT, and `INSERT ... ON CONFLICT DO NOTHING` -> `INSERT OR IGNORE`.
--
-- No BEGIN/COMMIT: the runner executes these statements one at a time and
-- tolerates individual failures, so wrapping them in a transaction here would
-- either be a no-op or abort the rest of the file.

CREATE TABLE IF NOT EXISTS ml_graph_embeddings (
    id              TEXT PRIMARY KEY,
    node_type       TEXT NOT NULL,
    node_id         TEXT NOT NULL,
    region_id       TEXT REFERENCES regions(id) ON DELETE CASCADE,
    dimension       INTEGER NOT NULL,
    layers          INTEGER NOT NULL DEFAULT 3,
    vector          TEXT NOT NULL,
    degree          INTEGER NOT NULL DEFAULT 0,
    built_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_graph_dimension_positive CHECK (dimension > 0),
    CONSTRAINT ml_graph_node_type_valid
        CHECK (node_type IN ('user', 'society', 'merchant', 'category'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_graph_node_unique
    ON ml_graph_embeddings(node_type, node_id, COALESCE(region_id, ''));
CREATE INDEX IF NOT EXISTS idx_ml_graph_type_region
    ON ml_graph_embeddings(node_type, region_id);

CREATE TABLE IF NOT EXISTS ml_sequence_model (
    id              TEXT PRIMARY KEY,
    version         INTEGER NOT NULL,
    is_active       INTEGER NOT NULL DEFAULT 0,
    d_model         INTEGER NOT NULL,
    n_heads         INTEGER NOT NULL,
    max_len         INTEGER NOT NULL,
    vocabulary      TEXT NOT NULL,
    weights         TEXT NOT NULL,
    metrics         TEXT,
    trained_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_sequence_dims_positive
        CHECK (d_model > 0 AND n_heads > 0 AND max_len > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_sequence_version ON ml_sequence_model(version);

CREATE TABLE IF NOT EXISTS ml_uplift_model (
    id              TEXT PRIMARY KEY,
    version         INTEGER NOT NULL,
    is_active       INTEGER NOT NULL DEFAULT 0,
    feature_names   TEXT NOT NULL,
    weights         TEXT NOT NULL,
    metrics         TEXT,
    trained_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_uplift_version_positive CHECK (version > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_uplift_version ON ml_uplift_model(version);

CREATE TABLE IF NOT EXISTS ml_exposure_ledger (
    id              TEXT PRIMARY KEY,
    item_type       TEXT NOT NULL DEFAULT 'shop',
    item_id         TEXT NOT NULL,
    region_id       TEXT REFERENCES regions(id) ON DELETE CASCADE,
    window_date     TEXT NOT NULL,
    impressions     INTEGER NOT NULL DEFAULT 0,
    fair_share      REAL NOT NULL DEFAULT 0,
    deficit         REAL NOT NULL DEFAULT 0,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_exposure_impressions_non_negative CHECK (impressions >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_exposure_unique
    ON ml_exposure_ledger(item_type, item_id, COALESCE(region_id, ''), window_date);
CREATE INDEX IF NOT EXISTS idx_ml_exposure_window
    ON ml_exposure_ledger(window_date, region_id);

CREATE TABLE IF NOT EXISTS ml_feature_values (
    id              TEXT PRIMARY KEY,
    feature         TEXT NOT NULL,
    entity_type     TEXT NOT NULL,
    entity_id       TEXT NOT NULL,
    value_num       REAL,
    value_text      TEXT,
    valid_from      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    computed_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_feature_entity_type_valid
        CHECK (entity_type IN ('user', 'shop', 'category', 'society', 'region', 'global'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_feature_current
    ON ml_feature_values(feature, entity_type, entity_id, valid_from);
CREATE INDEX IF NOT EXISTS idx_ml_feature_lookup
    ON ml_feature_values(feature, entity_type, entity_id, valid_from DESC);

CREATE TABLE IF NOT EXISTS ml_visual_embeddings (
    id              TEXT PRIMARY KEY,
    item_type       TEXT NOT NULL,
    item_id         TEXT NOT NULL,
    dimension       INTEGER NOT NULL,
    vector          TEXT NOT NULL,
    source_url      TEXT,
    source_hash     TEXT,
    extractor       TEXT NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_visual_dimension_positive CHECK (dimension > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_visual_item
    ON ml_visual_embeddings(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_ml_visual_hash ON ml_visual_embeddings(source_hash);

CREATE TABLE IF NOT EXISTS ml_coldstart_priors (
    id              TEXT PRIMARY KEY,
    pincode         TEXT NOT NULL,
    category        TEXT,
    prior_alpha     REAL NOT NULL DEFAULT 1,
    prior_beta      REAL NOT NULL DEFAULT 1,
    shrinkage       REAL NOT NULL DEFAULT 1,
    donors          TEXT,
    own_events      INTEGER NOT NULL DEFAULT 0,
    computed_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ml_coldstart_prior_positive
        CHECK (prior_alpha > 0 AND prior_beta > 0),
    CONSTRAINT ml_coldstart_shrinkage_range
        CHECK (shrinkage >= 0 AND shrinkage <= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_coldstart_unique
    ON ml_coldstart_priors(pincode, COALESCE(category, ''));

INSERT OR IGNORE INTO admin_config (id, config_key, config_value, config_category, description, is_active) VALUES
    ('b2e1d3c5-0002-4000-8000-000000000001', 'ml_graph_enabled',       'false', 'ml', 'Add the LightGCN society-affinity term to ranking.', 1),
    ('b2e1d3c5-0002-4000-8000-000000000002', 'ml_graph_layers',        '3',     'ml', 'Propagation rounds in the graph embedding job. Beyond four, embeddings over-smooth.', 1),
    ('b2e1d3c5-0002-4000-8000-000000000003', 'ml_graph_dim',           '32',    'ml', 'Graph embedding dimension.', 1),
    ('b2e1d3c5-0002-4000-8000-000000000004', 'ml_w_graph',             '0.0',   'ml', 'Weight on the society-affinity term. Zero until the graph has support.', 1),
    ('b2e1d3c5-0002-4000-8000-000000000005', 'ml_graph_min_degree',    '3',     'ml', 'Edges a node needs before its embedding is trusted.', 1),
    ('b2e1d3c5-0002-4000-8000-000000000006', 'ml_narratives_enabled',  'true',  'ml', 'Attach social-proof badges to ranked cards.', 1),
    ('b2e1d3c5-0002-4000-8000-000000000007', 'ml_narratives_budget_ms','40',    'ml', 'Budget for badge generation before falling back to the deterministic rules.', 1),
    ('b2e1d3c5-0002-4000-8000-000000000008', 'ml_sequence_enabled',    'false', 'ml', 'Use the sequential intent model as a ranking signal.', 1),
    ('b2e1d3c5-0002-4000-8000-000000000009', 'ml_sequence_max_len',    '50',    'ml', 'Events of history the sequence model attends over.', 1),
    ('b2e1d3c5-0002-4000-8000-00000000000a', 'ml_w_intent',            '0.0',   'ml', 'Weight on the predicted-next-category term.', 1),
    ('b2e1d3c5-0002-4000-8000-00000000000b', 'ml_uplift_enabled',      'false', 'ml', 'Re-rank by estimated incremental conversion rather than predicted engagement.', 1),
    ('b2e1d3c5-0002-4000-8000-00000000000c', 'ml_uplift_strength',     '0.5',   'ml', 'How far the uplift multiplier may move a score. 0 is a no-op.', 1),
    ('b2e1d3c5-0002-4000-8000-00000000000d', 'ml_ann_enabled',         'false', 'ml', 'Serve retrieval from the HNSW index instead of a linear scan.', 1),
    ('b2e1d3c5-0002-4000-8000-00000000000e', 'ml_ann_ef_search',       '64',    'ml', 'HNSW search breadth. Higher is more accurate and slower.', 1),
    ('b2e1d3c5-0002-4000-8000-00000000000f', 'ml_ann_ef_construction', '200',   'ml', 'HNSW build breadth. Affects index quality, not query cost.', 1),
    ('b2e1d3c5-0002-4000-8000-000000000010', 'ml_ann_m',               '16',    'ml', 'HNSW neighbours per node per layer.', 1),
    ('b2e1d3c5-0002-4000-8000-000000000011', 'ml_rrf_k',               '60',    'ml', 'Reciprocal-rank-fusion constant when blending keyword and vector results.', 1),
    ('b2e1d3c5-0002-4000-8000-000000000012', 'ml_hybrid_w_dense',      '0.5',   'ml', 'Share of the fused score contributed by dense retrieval.', 1),
    ('b2e1d3c5-0002-4000-8000-000000000013', 'ml_coldstart_enabled',   'true',  'ml', 'Give new merchants a reserved share of feed slots.', 1),
    ('b2e1d3c5-0002-4000-8000-000000000014', 'ml_coldstart_budget',    '0.1',   'ml', 'Share of ranked slots reserved for high-uncertainty new merchants.', 1),
    ('b2e1d3c5-0002-4000-8000-000000000015', 'ml_coldstart_grace_days','30',    'ml', 'How long a merchant counts as new.', 1),
    ('b2e1d3c5-0002-4000-8000-000000000016', 'ml_fairness_enabled',    'false', 'ml', 'Guarantee each merchant a minimum share of impressions.', 1),
    ('b2e1d3c5-0002-4000-8000-000000000017', 'ml_fairness_strength',   '0.3',   'ml', 'How hard the exposure constraint pulls. Higher costs more relevance.', 1),
    ('b2e1d3c5-0002-4000-8000-000000000018', 'ml_fairness_max_ndcg_loss','0.05','ml', 'Relevance the fairness re-ranker may spend. It stops rather than exceed this.', 1),
    ('b2e1d3c5-0002-4000-8000-000000000019', 'ml_visual_enabled',      'false', 'ml', 'Accept image queries on the visual search endpoint.', 1),
    ('b2e1d3c5-0002-4000-8000-00000000001a', 'ml_visual_min_score',    '0.45',  'ml', 'Similarity below which visual search falls back to keywords.', 1),
    ('b2e1d3c5-0002-4000-8000-00000000001b', 'ml_featurestore_enabled','true',  'ml', 'Serve ranking features through the feature store rather than ad-hoc queries.', 1),
    ('b2e1d3c5-0002-4000-8000-00000000001c', 'ml_featurestore_ttl_ms', '60000', 'ml', 'Online feature cache lifetime.', 1);
