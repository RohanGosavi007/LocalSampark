# MISSION: ML Phase 2 — Sequence Modeling, Causal Uplift, Vector Infrastructure, Cold-Start Transfer, Real-Time Feature Store, and Fairness-Constrained Allocation

You are a Principal AI/ML Systems Engineer and Lead Monorepo Architect working in the
`LocalSampark` monorepo. This is a hyperlocal services + marketplace + community platform
(shops, home services, jobs, medical, properties, carpool, events, society management).

## 0. GROUND TRUTH — READ BEFORE WRITING ANY CODE

The repository layout is NOT what a generic monorepo prompt would assume. Verify each of
these yourself before planning, and correct the plan against what you actually find:

- There is **no `services/` directory**. All ML code lives in `backend/src/modules/ml/`.
- Existing ML modules (confirm they are present): `bandits/contextualBandit.js`,
  `ranking/multiTaskRanker.js`, `ranking/sessionBoost.js`, `governance/driftMonitor.js`,
  `safety/anomalyDetector.js`, `experimentation/abTestingManager.js`,
  `jobs/matrix-builder.job.js`, and `services/{embedding,mlconfig,ranker,search,telemetry}.service.js`.
- Existing ML routes: `backend/src/modules/ml/routes/{ml,advanced,recommendations,search}.routes.js`.
  Read them and follow their exact conventions: `optionalAuth` on public reads,
  `...adminOnly` on admin reads, `requireSuperAdmin` on anything that mutates what users see,
  `next(err)` error propagation, and the always-202 posture on high-volume ingest.
- Admin tabs are **`.js`, not `.jsx`**, in `apps/admin/src/components/tabs/`. Follow the
  structure of the existing `MLControlTab.js` and `MLGovernanceTab.js`.
- Mobile services are **`.js`, not `.ts`**, in `apps/mobile/src/services/`. See the existing
  `sessionIntentTracker.js` — extend it rather than inventing a second session tracker.
- The database runs on **both SQLite (dev) and Postgres (prod)** (`sqlite3` + `pg` in
  `backend/package.json`). Every migration you add MUST be valid on both, following the
  conventions of the numbered files in `backend/src/migrations/`. Never use a Postgres-only
  type or an SQLite-only pragma without a guarded branch.
- Existing ML tables are prefixed `ml_` (`ml_interaction_events`, `ml_item_affinity`,
  `ml_bandit_arms`, `ml_feature_snapshots`, `ml_demand_buckets`, `ml_experiments`,
  `ml_item_overrides`, `ml_moderation_queue`). Read their schemas before adding new ones and
  reuse the event stream rather than duplicating it.

**Step 0 — Phase 1 reconciliation.** A previous phase specified a LightGCN graph engine
(`graph/`), a generative justification engine (`narratives/`), an on-device edge re-ranker
(`apps/mobile/src/services/edgeRanker`), a visual search endpoint (`vision/`), and an admin
ML sandbox tab. Search the repo for each. For every one that is **absent**, implement it as
part of this task before the module that depends on it — Modules 1, 3 and 6 below assume the
graph engine and justification engine exist. Report in your plan which were found and which
you are building.

---

## 1. MODULES TO IMPLEMENT

### Module 1: Sequential Intent Transformer (Next-Action Prediction)
Path: `backend/src/modules/ml/sequence/`

Today's ranking treats a user as a bag of features. Model them as a **sequence** instead.

- Build a self-attention (transformer-style) next-item model over each user's ordered
  interaction history from `ml_interaction_events`: view -> search -> contact -> book.
- Implement the attention math for real — scaled dot-product attention with learned
  positional encodings over the last N (default 50) events, multi-head, with a causal mask so
  position *i* can only attend to positions <= *i*. No library stubs, no placeholder matmuls.
- Bucket time deltas between events (`<1m`, `<1h`, `<1d`, `<1w`, `>1w`) as a learned
  embedding added to the positional signal — recency between actions matters more in
  hyperlocal commerce than raw ordering does.
- Export `predictNextCategory(userId, sessionEvents)` returning a probability distribution
  over categories plus an `intent_confidence`, and feed it into `multiTaskRanker.js` as an
  additional scoring signal behind a config flag in `mlconfig.service.js`.
- Train offline in `backend/src/modules/ml/jobs/sequence-trainer.job.js`, persist weights to a
  new `ml_sequence_model` table (versioned, with an `is_active` flag), and load the active
  version into memory at boot with a warm-reload path that never blocks request handling.

### Module 2: Causal Uplift Modeling (X-Learner)
Path: `backend/src/modules/ml/causal/upliftModel.js`

Ranking currently optimizes *predicted engagement*. That over-promotes items the user would
have chosen anyway. Optimize **incremental** engagement instead.

- Implement an X-learner over the historical impression/conversion log: fit outcome models
  for treated (promoted/boosted) and control (organically ranked) groups, compute imputed
  treatment effects, and fit the CATE estimators with a propensity-weighted blend.
- Derive per-(user, item) uplift scores and expose `estimateUplift(userId, items)`.
- Add Qini curve and Area-Under-Uplift-Curve computation so the admin panel can show whether
  the promotion budget is actually creating demand or just harvesting it.
- Integrate as a re-ranking multiplier gated by an `ml_uplift_enabled` config key, defaulting
  **off**, with the same kill-switch posture as the existing ML settings.

### Module 3: Vector Index Infrastructure (HNSW) + Hybrid Retrieval
Path: `backend/src/modules/ml/vector/`

`embedding.service.js` exists but retrieval is a linear scan. That does not hold at catalog
scale.

- Implement a real **HNSW** (Hierarchical Navigable Small World) index in JavaScript:
  multi-layer graph construction with the level-assignment probability, `efConstruction`
  neighbor selection with the heuristic pruning rule, and `efSearch` greedy descent. Support
  cosine and inner-product metrics.
- Persist the index to disk (`backend/data/vector/`) with an atomic write-then-rename, and
  rebuild incrementally on the existing matrix-builder job cadence rather than from scratch.
- Implement **hybrid retrieval**: fuse BM25/keyword results from `search.service.js` with
  dense vector results using Reciprocal Rank Fusion, tunable via config weights.
- Add a **geo-sharded** mode: maintain one index per pincode cluster so a hyperlocal query
  only searches its own shard plus adjacent shards, keeping recall while cutting latency.
- Performance budget: p95 ANN query under 20ms at 100k vectors. Include a benchmark script
  under `backend/scripts/` that proves it and prints recall@10 against brute-force truth.

### Module 4: Cold-Start Transfer & Meta-Learning
Path: `backend/src/modules/ml/coldstart/`

A brand-new vendor in a brand-new pincode has no signal at all. This is the single biggest
quality gap in a hyperlocal marketplace that is still expanding.

- Implement a **content-to-collaborative bridge**: project a new item's metadata (category,
  price band, service radius, attributes, description embedding) into the same latent space
  as the learned collaborative embeddings via a learned linear projection fitted on items that
  *do* have interaction history.
- Implement **geographic transfer**: for a pincode with sparse data, borrow a shrinkage-
  weighted prior from demographically and behaviorally similar pincodes, with the shrinkage
  weight decaying as the target pincode accumulates its own events (empirical Bayes).
- Implement a **Thompson-sampling exploration budget** reserving a configurable share of feed
  slots for high-uncertainty new vendors, so cold items can earn signal without tanking the
  feed. Reuse `contextualBandit.js` rather than writing a second sampler.
- Expose `getColdStartScore(itemId, context)` and wire it into the retrieval candidate stage.

### Module 5: Real-Time Feature Store with Point-in-Time Correctness
Path: `backend/src/modules/ml/featurestore/`

- Build a feature registry: named features with a type, a default, a freshness SLA, and an
  owning computation function.
- Two serving paths from one definition: an **online** path (Redis when present, in-process
  LRU when absent — never hard-depend on Redis, matching the existing posture) for sub-5ms
  reads at ranking time, and an **offline** path that reconstructs feature values *as they
  were at a historical timestamp* for training.
- **Point-in-time correctness is the whole point of this module.** Training rows must never
  see a feature value computed after the label event. Implement as-of joins against the event
  log and write tests that would fail if leakage were introduced.
- Emit feature freshness and null-rate metrics into the existing drift monitoring surface.

### Module 6: Fairness-Constrained Merchant Allocation
Path: `backend/src/modules/ml/fairness/`

A pure relevance ranker creates a rich-get-richer loop: the top three vendors in a pincode
take everything and new merchants churn off the platform.

- Implement **exposure fairness** using Fair-Share / FA*IR style constrained re-ranking:
  guarantee each eligible merchant a minimum share of impressions within a rolling window,
  subject to a bounded, explicitly measured relevance loss (NDCG delta).
- Implement **amortized fairness** across sessions — a merchant under-served yesterday gets
  priority today — tracked in a new `ml_exposure_ledger` table.
- Expose the *cost* of fairness honestly: report the NDCG delta and the CTR delta for every
  fairness strength setting, so this is a business decision with real numbers rather than a
  slider with a vibe attached.
- Config keys `ml_fairness_enabled` and `ml_fairness_strength`, defaulting to off.

### Module 7: Admin Observability — ML Insights Tab
Path: `apps/admin/src/components/tabs/MLInsightsTab.js`

Mount alongside the existing `MLControlTab.js` / `MLGovernanceTab.js`, following their exact
component and data-fetching conventions.

- Sequence model: top predicted next-intents, intent confidence distribution.
- Uplift: Qini curve, incremental-conversion estimate vs. promotion spend.
- Vector index: size, build time, p95 query latency, recall@10 vs. brute force.
- Cold start: how many new vendors got their first booking within 7/14/30 days, by cohort.
- Fairness: Gini coefficient of impression share per pincode over time, with the measured
  NDCG cost of the current setting.
- Feature store: per-feature freshness and null rate, worst offenders first.

### Module 8: Mobile Integration
Path: `apps/mobile/src/services/`

- Extend the existing `sessionIntentTracker.js` (do not replace it) to emit the ordered event
  sequence the transformer consumes, batched and debounced.
- Prefetch the top predicted next-category's feed while the user is still on the current
  screen, respecting battery and network state — skip prefetch on low battery or on metered
  cellular connections.
- Everything here must **fail open**: if any ML call fails, times out, or returns malformed
  data, render the server-ordered list with no error toast and no UI hitch.

---

## 2. EXECUTION RULES

1. **No placeholders, no mock logic, no `TODO`.** Real matrix math, real index construction,
   real SQL. If a module cannot be completed honestly, say so explicitly rather than stubbing it.
2. **Every new table needs a migration** valid on both SQLite and Postgres, numbered and
   styled like the existing files in `backend/src/migrations/`.
3. **Every new ML behavior is config-gated and defaults to off**, registered in
   `mlconfig.service.js`, and covered by the existing kill switch.
4. **Backward compatibility is non-negotiable.** Existing recommendation endpoints must keep
   their current response shape; new fields are additive only.
5. **Performance budgets:** added ranking latency <= 25ms p95; ANN query <= 20ms p95 at 100k
   vectors; online feature read <= 5ms p95; mobile local pass <= 15ms.
6. **Tests are part of the deliverable, not a follow-up.** Add tests under
   `backend/src/__tests__/` following the existing hermetic-migration setup: attention-mask
   correctness, HNSW recall against brute force, point-in-time leakage, fairness constraint
   satisfaction, and uplift recovery on a synthetic dataset with a known ground-truth effect.
7. **Run what you write.** Execute the backend test suite and the relevant lint before
   reporting done, and paste the actual output. Do not report success without running it.

---

## 3. SEQUENCE OF WORK

Work in this order; each step must be complete and verified before the next begins:

| # | Milestone | Success criterion |
|---|-----------|-------------------|
| 0 | Phase 1 reconciliation | Report what exists; implement what is missing |
| 1 | Feature store (Module 5) | Point-in-time leakage test passes |
| 2 | Vector infra (Module 3) | Benchmark prints recall@10 > 0.95, p95 < 20ms |
| 3 | Sequence transformer (Module 1) | Next-category prediction beats a popularity baseline on held-out data |
| 4 | Cold start (Module 4) | New vendors receive a measurable exploration share |
| 5 | Uplift (Module 2) | Qini curve computed on the historical log |
| 6 | Fairness (Module 6) | Gini falls with a reported, bounded NDCG cost |
| 7 | Admin + mobile (Modules 7, 8) | Tab renders live metrics; mobile pass fails open under fault injection |

Begin with Step 0: inspect the repository, report what Phase 1 work is actually present,
then produce the file-by-file plan before writing code.
