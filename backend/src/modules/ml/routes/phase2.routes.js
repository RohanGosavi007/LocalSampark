/**
 * Phase-2 ML endpoints: visual search, and the admin control surface for the
 * graph, sequence, uplift, fairness, cold-start and feature-store subsystems.
 *
 * Follows the posture the existing ML routes established, which is not
 * uniform by accident:
 *
 *   - Public reads use `optionalAuth` and never fail the caller. A search that
 *     can 500 forces every client to carry a fallback path.
 *   - Admin reads use `...adminOnly`.
 *   - Anything that changes what users see — training a model, rebuilding an
 *     index, activating a version — additionally requires a super admin, and is
 *     audited. These are the operations that alter every feed on the platform.
 *
 * Training endpoints answer 202 and run the work detached. A graph rebuild over
 * a year of events takes minutes; holding an HTTP connection open for it means
 * a proxy timeout kills the request while the job continues invisibly, and the
 * operator reasonably concludes it failed and runs it again.
 */

const express = require('express');
const router = express.Router();

const { optionalAuth, authenticate, requireAdmin } = require('../../../middleware/auth.middleware');
const mlconfig = require('../services/mlconfig.service');
const logger = require('../../../config/logger');

const adminOnly = [authenticate, requireAdmin];

/**
 * Super-admin gate.
 *
 * Mirrors the one in ml.routes.js rather than importing it, because that file
 * defines it inline as a local. Duplicating six lines is better than exporting
 * a middleware from a route module and creating a dependency between two
 * routers that should not know about each other.
 */
function requireSuperAdmin(req, res, next) {
  const role = req.user && (req.user.role || req.user.user_role);
  if (role === 'super_admin' || role === 'superadmin') return next();
  return res.status(403).json({
    success: false,
    message: 'This operation changes ranking for every user and requires a super admin.',
  });
}

/** Records who did what, without letting an audit failure block the operation. */
async function audit(req, action, detail) {
  try {
    const { query } = require('../../../config/database');
    const crypto = require('crypto');
    await query(
      `INSERT INTO admin_audit_log (id, admin_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, $3, 'ml_phase2', $4, $5)`,
      [
        crypto.randomUUID(),
        req.user ? (req.user.id || req.user.userId) : null,
        action,
        action,
        JSON.stringify(detail || {}),
      ]
    );
  } catch (err) {
    logger.warn(`ML phase-2 audit write failed for "${action}": ${err.message}`);
  }
}

// ─── Visual search ──────────────────────────────────────────────────────────

/**
 * Reads a raw image body.
 *
 * `express.raw` rather than a multipart parser: the client sends one image and
 * nothing else, so multipart adds a dependency and a parsing surface for no
 * gain. The type list is the allow-list — a body of any other content type is
 * rejected by Express before this handler runs.
 */
const rawImage = express.raw({
  type: ['image/jpeg', 'image/png', 'image/webp'],
  limit: '8mb',
});

/**
 * POST /ml/search/visual
 *
 * Body: the raw image bytes. Query: `q` for the keyword fallback, `limit`.
 *
 * Always answers 200 with a usable result. A photo the catalogue cannot match
 * returns the keyword results for `q` with `confident: false`, because a
 * confident wrong shop is worse than an honest miss — the user acts on the
 * answer by walking there.
 */
router.post('/search/visual', rawImage, optionalAuth, async (req, res) => {
  const started = Date.now();
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 30);
  const keywords = req.query.q ? String(req.query.q).slice(0, 200) : null;

  const respond = (payload) => res.json({
    success: true,
    ...payload,
    timings: { total_ms: Date.now() - started },
  });

  /** Keyword results, used as the fallback and never allowed to throw. */
  const keywordFallback = async (reason) => {
    if (!keywords) {
      return respond({ matches: [], confident: false, fallback: null, reason });
    }
    try {
      const search = require('../services/search.service');
      const results = await search.semantic(keywords, { limit });
      return respond({
        matches: [],
        confident: false,
        reason,
        fallback: { mode: 'keyword', query: keywords, results: results.items || results || [] },
      });
    } catch (err) {
      logger.warn('Visual search: keyword fallback failed: ' + err.message);
      return respond({ matches: [], confident: false, reason, fallback: null });
    }
  };

  try {
    const cfg = await mlconfig.get(req.query.region_id || null);
    if (cfg.ml_visual_enabled !== true) {
      return keywordFallback('visual_search_disabled');
    }

    if (!req.body || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Send the image as a raw request body with an image/jpeg, image/png or image/webp content type.',
      });
    }

    const visualSearch = require('../vision/visualSearch');
    const result = await visualSearch.search(req.body, {
      mimeType: req.headers['content-type'],
      k: limit,
      minScore: Number(cfg.ml_visual_min_score) || 0.45,
    });

    if (!result.confident) {
      // Below the floor the match is not trustworthy. The scores are still
      // returned, marked, so a client debugging the feature can see how close
      // it came — but `confident: false` is the field a UI should branch on.
      const fallback = await (async () => {
        if (!keywords) return null;
        try {
          const search = require('../services/search.service');
          const results = await search.semantic(keywords, { limit });
          return { mode: 'keyword', query: keywords, results: results.items || results || [] };
        } catch {
          return null;
        }
      })();

      return respond({
        matches: result.matches,
        confident: false,
        best_score: result.best_score,
        threshold: result.threshold,
        reason: result.reason || 'below_confidence_threshold',
        extractor: result.extractor,
        fallback,
      });
    }

    return respond({
      matches: result.matches,
      confident: true,
      best_score: result.best_score,
      threshold: result.threshold,
      extractor: result.extractor,
      indexed_items: result.indexed_items,
    });
  } catch (err) {
    if (err.code === 'NO_DECODER' || err.code === 'NO_EXTRACTOR') {
      // A deployment problem, not a user error. Reported plainly so it is
      // actionable rather than surfacing as a generic failure.
      logger.error('Visual search unavailable: ' + err.message);
      return keywordFallback('extractor_unavailable');
    }
    if (err.status === 415) {
      return res.status(415).json({ success: false, message: err.message });
    }
    logger.error('Visual search failed: ' + err.message);
    return keywordFallback('error');
  }
});

// ─── Hybrid retrieval ───────────────────────────────────────────────────────

/**
 * GET /ml/search/hybrid?q=...
 *
 * Keyword and dense retrieval, fused by reciprocal rank. Falls back to whatever
 * the existing search service returns when the vector index is not built, so a
 * client can call this unconditionally.
 */
router.get('/search/hybrid', optionalAuth, async (req, res) => {
  const started = Date.now();
  const text = String(req.query.q || '').trim();
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);

  if (!text) {
    return res.json({ success: true, items: [], count: 0, reason: 'empty_query' });
  }

  try {
    const cfg = await mlconfig.get(req.query.region_id || null);
    const search = require('../services/search.service');

    if (cfg.ml_ann_enabled !== true) {
      const results = await search.semantic(text, { limit });
      return res.json({
        success: true,
        mode: 'keyword_only',
        reason: 'ann_disabled',
        items: results.items || results || [],
        timings: { total_ms: Date.now() - started },
      });
    }

    const vectorIndex = require('../vector/vectorIndex.service');
    const fused = await vectorIndex.hybridSearch(text, {
      pincode: req.query.pincode || null,
      k: limit,
      ef: Number(cfg.ml_ann_ef_search) || 64,
      rrfK: Number(cfg.ml_rrf_k) || 60,
      denseWeight: Number(cfg.ml_hybrid_w_dense) || 0.5,
      keywordSearch: async (query) => {
        const results = await search.semantic(query, { limit });
        return results.items || results || [];
      },
    });

    return res.json({
      success: true,
      mode: 'hybrid',
      items: fused.items,
      count: fused.items.length,
      dense_count: fused.dense_count,
      keyword_count: fused.keyword_count,
      degraded: fused.degraded,
      timings: { total_ms: Date.now() - started },
    });
  } catch (err) {
    logger.error('Hybrid search failed: ' + err.message);
    return res.json({
      success: true,
      mode: 'error',
      items: [],
      count: 0,
      timings: { total_ms: Date.now() - started },
    });
  }
});

// ─── Admin: status of every phase-2 subsystem ───────────────────────────────

/**
 * GET /ml/phase2/admin/status
 *
 * One call backing the whole MLInsightsTab. Each subsystem's stats are
 * gathered independently and a failure in one is reported in place rather than
 * failing the response — a broken graph table must not blank the fairness
 * panel.
 */
router.get('/phase2/admin/status', ...adminOnly, async (req, res, next) => {
  try {
    const regionId = req.query.region_id || null;

    const safely = async (name, fn) => {
      try {
        return await fn();
      } catch (err) {
        logger.warn(`ML phase-2 status: ${name} unavailable: ${err.message}`);
        return { available: false, error: err.message };
      }
    };

    const [graph, sequence, uplift, fairnessStats, coldstart, cohorts, features, vector, visual, cfg] =
      await Promise.all([
        safely('graph', () => require('../graph/lightgcn').stats()),
        safely('sequence', () => require('../sequence/intentModel').stats()),
        safely('uplift', () => require('../causal/upliftModel').stats()),
        safely('fairness', () => require('../fairness/exposureFairness').concentration({ regionId })),
        safely('coldstart', () => require('../coldstart/coldStart').stats()),
        safely('cohorts', () => require('../coldstart/coldStart').cohortConversion()),
        safely('featurestore', () => require('../featurestore').freshness()),
        safely('vector', () => require('../vector/vectorIndex.service').stats()),
        safely('visual', () => require('../vision/visualSearch').stats()),
        mlconfig.get(regionId),
      ]);

    return res.json({
      success: true,
      region_id: regionId,
      graph,
      sequence,
      uplift,
      fairness: fairnessStats,
      coldstart: { priors: coldstart, cohorts },
      feature_store: {
        freshness: features,
        cache: safely('featurestore_cache', () => require('../featurestore').stats()),
      },
      vector_index: vector,
      visual_search: visual,
      config: Object.fromEntries(
        Object.entries(cfg).filter(([key]) => (
          key.startsWith('ml_graph') || key.startsWith('ml_sequence') ||
          key.startsWith('ml_uplift') || key.startsWith('ml_fairness') ||
          key.startsWith('ml_coldstart') || key.startsWith('ml_ann') ||
          key.startsWith('ml_visual') || key.startsWith('ml_featurestore') ||
          key.startsWith('ml_narratives') || key === 'ml_w_graph' ||
          key === 'ml_w_intent' || key === 'ml_rrf_k' || key === 'ml_hybrid_w_dense'
        ))
      ),
    });
  } catch (err) {
    return next(err);
  }
});

// ─── Admin: rebuild and training operations ─────────────────────────────────

/**
 * Runs a long job detached and answers immediately.
 *
 * The result is logged rather than returned. An operator who wants to know
 * whether it finished reads the status endpoint above, which reports the
 * artefact's own freshness — which is the honest source anyway, since a job can
 * report success and still have produced an empty index.
 */
function detach(name, work) {
  Promise.resolve()
    .then(work)
    .then((result) => logger.info(`ML job "${name}" finished: ${JSON.stringify(result).slice(0, 400)}`))
    .catch((err) => logger.error(`ML job "${name}" failed: ${err.message}`));
}

router.post('/phase2/admin/graph/rebuild', ...adminOnly, requireSuperAdmin, async (req, res, next) => {
  try {
    const regionId = req.body.region_id || null;
    const cfg = await mlconfig.get(regionId);
    await audit(req, 'ml_graph_rebuild', { region_id: regionId });

    detach('graph_rebuild', async () => {
      const lightgcn = require('../graph/lightgcn');
      const result = await lightgcn.build({
        regionId,
        dim: Number(cfg.ml_graph_dim) || 32,
        layers: Number(cfg.ml_graph_layers) || 3,
      });
      lightgcn.invalidate();
      return result;
    });

    return res.status(202).json({
      success: true,
      message: 'Graph rebuild started. Check /ml/phase2/admin/status for the result.',
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/phase2/admin/sequence/train', ...adminOnly, requireSuperAdmin, async (req, res, next) => {
  try {
    const cfg = await mlconfig.get(null);
    await audit(req, 'ml_sequence_train', {});

    detach('sequence_train', () => require('../sequence/intentModel').train({
      maxLen: Number(cfg.ml_sequence_max_len) || 50,
      epochs: Math.min(Math.max(parseInt(req.body.epochs, 10) || 8, 1), 50),
    }));

    return res.status(202).json({
      success: true,
      message: 'Sequence model training started. It will only be activated if it beats the popularity baseline.',
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/phase2/admin/uplift/train', ...adminOnly, requireSuperAdmin, async (req, res, next) => {
  try {
    await audit(req, 'ml_uplift_train', {});
    detach('uplift_train', () => require('../causal/upliftModel').trainFromLog({
      windowDays: Math.min(Math.max(parseInt(req.body.window_days, 10) || 90, 7), 365),
    }));
    return res.status(202).json({ success: true, message: 'Uplift model fitting started.' });
  } catch (err) {
    return next(err);
  }
});

router.post('/phase2/admin/vector/rebuild', ...adminOnly, requireSuperAdmin, async (req, res, next) => {
  try {
    const cfg = await mlconfig.get(null);
    await audit(req, 'ml_vector_rebuild', {});
    detach('vector_rebuild', () => require('../vector/vectorIndex.service').build({
      M: Number(cfg.ml_ann_m) || 16,
      efConstruction: Number(cfg.ml_ann_ef_construction) || 200,
    }));
    return res.status(202).json({ success: true, message: 'Vector index rebuild started.' });
  } catch (err) {
    return next(err);
  }
});

router.post('/phase2/admin/coldstart/rebuild', ...adminOnly, requireSuperAdmin, async (req, res, next) => {
  try {
    await audit(req, 'ml_coldstart_rebuild', {});
    detach('coldstart_rebuild', () => require('../coldstart/coldStart').rebuildPriors());
    return res.status(202).json({ success: true, message: 'Cold-start prior rebuild started.' });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /ml/phase2/admin/fairness/simulate
 *
 * Shows what a fairness strength would cost before anyone enables it.
 *
 * The point of the whole sandbox: an operator sees the NDCG loss and how far
 * merchants move at each setting, against the real current deficits, without
 * changing what a single user sees. A slider that can only be evaluated by
 * shipping it is not a control, it is a gamble.
 */
router.get('/phase2/admin/fairness/simulate', ...adminOnly, async (req, res, next) => {
  try {
    const regionId = req.query.region_id || null;
    const budget = Math.min(Math.max(parseFloat(req.query.max_ndcg_loss) || 0.05, 0), 0.5);

    const { query } = require('../../../config/database');
    const fairness = require('../fairness/exposureFairness');

    // A realistic candidate set: the merchants actually competing in this
    // territory, scored by the same popularity proxy the ranker uses when it
    // has no personalisation to apply.
    const res1 = await query(
      regionId
        ? `SELECT id, rating, (SELECT COUNT(*) FROM shop_reviews r WHERE r.shop_id = s.id) AS review_count
             FROM local_shops s WHERE COALESCE(is_active,1)=1 AND region_id = $1 LIMIT 100`
        : `SELECT id, rating, (SELECT COUNT(*) FROM shop_reviews r WHERE r.shop_id = s.id) AS review_count
             FROM local_shops s WHERE COALESCE(is_active,1)=1 LIMIT 100`,
      regionId ? [regionId] : []
    );
    const rows = res1.rows || res1 || [];
    if (rows.length === 0) {
      return res.json({ success: true, simulations: [], reason: 'no_merchants' });
    }

    const ranker = require('../services/ranker.service');
    const candidates = rows.map((row) => ({
      id: row.id,
      _score: ranker.wilsonScore(row.rating, row.review_count),
    }));

    const deficits = await fairness.loadDeficits(candidates.map((c) => c.id), { regionId });

    const simulations = [];
    for (const strength of [0, 0.1, 0.2, 0.3, 0.5, 0.7, 1.0]) {
      const result = fairness.rerank(candidates, { deficits, strength, maxNdcgLoss: budget });
      const exposures = result.items
        .slice(0, 20)
        .map((item) => deficits.get(String(item.id)) || 0);
      simulations.push({
        requested_strength: strength,
        applied_strength: result.applied_strength,
        ndcg: result.ndcg,
        ndcg_loss: result.ndcg_loss,
        moved: result.moved,
        max_move: result.max_move,
        top20_mean_deficit: exposures.reduce((s, v) => s + v, 0) / Math.max(exposures.length, 1),
      });
    }

    return res.json({
      success: true,
      region_id: regionId,
      budget,
      merchants: candidates.length,
      merchants_with_deficit: [...deficits.values()].filter((v) => v > 0).length,
      simulations,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /ml/phase2/admin/graph/inspect
 *
 * Neighbourhood of one node, for the admin graph inspector. Answers "why does
 * this merchant rank in this society" with the edges that produced it.
 */
router.get('/phase2/admin/graph/inspect', ...adminOnly, async (req, res, next) => {
  try {
    const nodeType = String(req.query.node_type || 'merchant');
    const nodeId = String(req.query.node_id || '');
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 50);

    if (!nodeId) {
      return res.status(400).json({ success: false, message: 'node_id is required.' });
    }

    const lightgcn = require('../graph/lightgcn');
    const index = await lightgcn.loadEmbeddings(req.query.region_id || null);
    const key = lightgcn.nodeKey(nodeType, nodeId);
    const vector = index.vectors.get(key);

    if (!vector) {
      return res.json({
        success: true,
        found: false,
        message: 'No embedding for that node. Rebuild the graph, or check the node has any edges.',
      });
    }

    const neighbours = [];
    for (const [otherKey, otherVector] of index.vectors) {
      if (otherKey === key) continue;
      neighbours.push({
        node: otherKey,
        similarity: lightgcn.dot(vector, otherVector),
        degree: index.degrees.get(otherKey) || 0,
      });
    }
    neighbours.sort((a, b) => b.similarity - a.similarity);

    return res.json({
      success: true,
      found: true,
      node: key,
      degree: index.degrees.get(key) || 0,
      dimension: index.dim,
      nearest: neighbours.slice(0, limit),
      furthest: neighbours.slice(-Math.min(5, neighbours.length)).reverse(),
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
