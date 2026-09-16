/**
 * Ranked feeds.
 *
 * Stage one — candidate retrieval — is a bounding-box query plus an exact
 * Haversine filter, the same technique /shops/nearby already uses and for the
 * same reason: earth_distance/ll_to_earth need the PostgreSQL earthdistance
 * extension and do not exist on the SQLite driver this app also runs on. The
 * box is index-friendly (idx_local_shops_lat_lng) and the exact filter follows.
 *
 * Stage two is ranker.service.js.
 *
 * Every endpoint here returns a usable feed or an empty list — never an error a
 * client has to handle. A recommendation surface that can 500 is worse than no
 * recommendation surface, because the fallback path then has to be written into
 * every caller instead of once here.
 */

const express = require('express');
const router = express.Router();

const { optionalAuth } = require('../../../middleware/auth.middleware');
const { query } = require('../../../config/database');
const ranker = require('../services/ranker.service');
const embeddings = require('../services/embedding.service');
const mlconfig = require('../services/mlconfig.service');
const sessionBoost = require('../ranking/sessionBoost');
const logger = require('../../../config/logger');

/** Pune city centre, matching the fallback /shops/nearby already uses. */
const DEFAULT_LAT = 18.5913;
const DEFAULT_LNG = 73.8987;

/**
 * Stage one: everything inside the radius, capped.
 *
 * Selects the columns the ranker scores on. review_count is derived rather than
 * read from a column because local_shops stores only an aggregate `rating`, and
 * the Wilson bound needs the count behind it — without it a single five-star
 * review would outrank a merchant with ninety.
 */
async function retrieveCandidates({ lat, lng, radiusKm, categorySlug, regionId, limit }) {
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / (111.32 * Math.max(Math.cos(lat * (Math.PI / 180)), 0.01));

  const params = [lat - latDelta, lat + latDelta, lng - lngDelta, lng + lngDelta];
  const conditions = [
    'COALESCE(s.is_active, 1) = 1',
    's.latitude BETWEEN $1 AND $2',
    's.longitude BETWEEN $3 AND $4',
  ];

  if (categorySlug && categorySlug !== 'all') {
    params.push(categorySlug);
    conditions.push(`s.category_id = (SELECT id FROM shop_categories WHERE slug = $${params.length} LIMIT 1)`);
  }
  if (regionId) {
    params.push(regionId);
    conditions.push(`s.region_id = $${params.length}`);
  }

  params.push(limit);

  const res = await query(
    `SELECT s.*,
            c.slug AS category_slug,
            c.name AS category_name,
            (SELECT COUNT(*) FROM shop_reviews r WHERE r.shop_id = s.id) AS review_count
       FROM local_shops s
       LEFT JOIN shop_categories c ON c.id = s.category_id
      WHERE ${conditions.join(' AND ')}
      LIMIT $${params.length}`,
    params
  );
  return res.rows || res || [];
}

function readContext(req) {
  const lat = req.query.lat != null ? parseFloat(req.query.lat) : null;
  const lng = req.query.lng != null ? parseFloat(req.query.lng) : null;
  const usedFallbackLocation = !Number.isFinite(lat) || !Number.isFinite(lng);

  return {
    lat: usedFallbackLocation ? DEFAULT_LAT : lat,
    lng: usedFallbackLocation ? DEFAULT_LNG : lng,
    usedFallbackLocation,
    radiusKm: Math.min(Math.max(parseFloat(req.query.radius) || 10, 0.5), 50),
    categorySlug: req.query.category || null,
    regionId: req.query.region_id || req.headers['x-territory-id'] || null,
    // Client-supplied: the server may be in another timezone and this signal is
    // about the user's local time of day.
    localHour: req.query.local_hour != null ? parseInt(req.query.local_hour, 10) : null,
    limit: Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50),
    userId: req.user ? (req.user.id || req.user.userId) : null,
    // In-session intent from the client. Parsed into a fixed vocabulary and
    // applied as bounded adjustments — see ranking/sessionBoost.js for why a
    // client must not be able to set ranking parameters directly.
    session: sessionBoost.parseTags(req.query.boost_tags),
    intentConfidence: req.query.intent_confidence != null
      ? Math.min(Math.max(parseFloat(req.query.intent_confidence) || 0, 0), 1)
      : 1,

    // Used by the cold-start transfer prior to pick which pincode's borrowed
    // rate applies, and by the vector index to choose a shard.
    pincode: req.query.pincode ? String(req.query.pincode).slice(0, 10) : null,

    // The user's society, when the client knows it. Passed rather than looked
    // up so a client that already has it saves the ranker a query; when absent,
    // the graph module resolves it itself.
    societyId: req.query.society_id || req.headers['x-society-id'] || null,

    // This session's ordered category events, for the sequence model. Fresher
    // than the event log, which has not ingested the last few taps yet — which
    // is exactly the window where next-action prediction is worth anything.
    sessionEvents: parseSessionEvents(req.query.session_events),
  };
}

/**
 * Parses the client's in-session event trail.
 *
 * Format: `slug:timestamp,slug:timestamp,...`, oldest first. Compact because it
 * rides on every feed request, and structured enough to carry the elapsed times
 * the model's time embedding needs.
 *
 * Validated strictly and dropped silently on anything malformed. This is
 * client-supplied input feeding a model that influences ranking, so the same
 * reasoning applies as in sessionBoost: a client must not be able to steer the
 * ranker by sending something the server did not anticipate. The worst a
 * malformed trail can do here is produce no prediction.
 */
function parseSessionEvents(raw) {
  if (!raw || typeof raw !== 'string') return [];
  const out = [];
  const now = Date.now();

  for (const part of raw.split(',').slice(-50)) {
    const [category, timestamp] = part.split(':');
    if (!category || !/^[a-z0-9_-]{1,48}$/i.test(category)) continue;

    const at = Number(timestamp);
    // A timestamp in the future, or more than a day old, is not a plausible
    // in-session event. Clamped rather than rejected so a client with a skewed
    // clock still contributes ordering.
    const resolved = Number.isFinite(at) && at > 0 && at <= now + 60000 && at > now - 86400000
      ? at
      : now;

    out.push({ category: category.toLowerCase(), at: resolved });
  }

  out.sort((a, b) => a.at - b.at);
  return out;
}

/**
 * GET /ml/recommendations/home
 *
 * The ranked shop feed.
 */
router.get('/home', optionalAuth, async (req, res) => {
  const started = Date.now();
  const ctx = readContext(req);

  try {
    const baseCfg = await mlconfig.get(ctx.regionId);

    // Session hints adjust the ranking parameters within the bounds an
    // administrator configured. They cannot switch ranking on, cannot exceed
    // those bounds, and are scaled by how much evidence the client's
    // classification rests on.
    const { cfg, applied } = sessionBoost.applyHints(
      baseCfg,
      { tags: ctx.session.tags, intent: ctx.session.intent, confidence: ctx.intentConfidence },
      mlconfig.BOUNDS
    );

    let candidates = await retrieveCandidates({
      lat: ctx.lat,
      lng: ctx.lng,
      radiusKm: ctx.radiusKm,
      categorySlug: ctx.categorySlug,
      regionId: ctx.regionId,
      limit: Number(cfg.ml_candidate_limit) || 200,
    });

    // `require:open_now` filters rather than reweights: no score adjustment
    // expresses "closed is useless" as reliably as removing it. Falls back to
    // the unfiltered set if filtering would empty the feed.
    const hard = sessionBoost.applyHardFilters(candidates, {
      tags: ctx.session.tags,
      localHour: ctx.localHour,
    });
    candidates = hard.candidates;

    // The session's dominant category, as a bounded multiplier applied before
    // ranking so it composes with every scorer rather than only one of them.
    if (ctx.session.category) {
      candidates = candidates.map((c) => ({
        ...c,
        _session_category_boost: sessionBoost.categoryBoost(c, ctx.session.category),
      }));
    }

    const result = await ranker.rank(candidates, {
      userId: ctx.userId,
      lat: ctx.lat,
      lng: ctx.lng,
      localHour: ctx.localHour,
      regionId: ctx.regionId,
      surface: 'shops_home',
      limit: ctx.limit,
      cfgOverride: cfg,
      pincode: ctx.pincode,
      sessionEvents: ctx.sessionEvents,
    });

    // Badges are attached after ranking, never before. A badge is presentation:
    // it explains the order, it does not participate in deciding it. Generating
    // them first and letting a "trending" tag feed back into the score would
    // make the explanation self-fulfilling.
    let shaped = result.items;
    let narratives = null;
    if (cfg.ml_narratives_enabled === true) {
      try {
        const justification = require('../narratives/justificationEngine');
        const annotated = await justification.annotate(result.items, {
          userId: ctx.userId,
          societyId: ctx.societyId,
          localHour: ctx.localHour,
          budgetMs: Number(cfg.ml_narratives_budget_ms) || 40,
          wilsonScore: ranker.wilsonScore,
          enabled: true,
        });
        shaped = annotated.items;
        narratives = {
          badged: annotated.badged,
          degraded: annotated.degraded,
          duration_ms: annotated.duration_ms,
        };
      } catch (err) {
        // A missing badge is a cosmetic loss. The feed ships without it.
        logger.warn('Narratives: annotation skipped: ' + err.message);
      }
    }

    // The exposure ledger records what was actually served, so tomorrow's
    // fairness pass knows who was owed. Deliberately not awaited: a ledger
    // write must never extend the latency of the feed it is recording.
    if (cfg.ml_fairness_enabled === true) {
      const fairness = require('../fairness/exposureFairness');
      fairness.recordExposure(
        result.items.map((item) => item.id),
        candidates.map((item) => item.id),
        { regionId: ctx.regionId }
      ).catch((err) => logger.warn('Fairness: exposure not recorded: ' + err.message));
    }

    return res.json({
      success: true,
      // The client sends this back with each impression so the console can
      // attribute engagement to the surface that produced it.
      surface: 'shops_home',
      // 'ml' or 'baseline'. Exposed so the fallback rate is measurable rather
      // than inferred from a latency graph.
      strategy: result.strategy,
      reason: result.reason || null,
      // Echoed so a client can tell whether its hints were honoured, and so the
      // admin console can attribute a feed to the intent that shaped it.
      session: {
        intent: ctx.session.intent,
        applied_hints: applied,
        hard_filters: hard.filtered,
        filtered_out: hard.removed || 0,
        category: ctx.session.category,
      },
      used_fallback_location: ctx.usedFallbackLocation,
      count: shaped.length,
      shops: ranker.publicShape(shaped),
      // Echoed so the client can prefetch the predicted next category and the
      // console can attribute a feed to the intent that shaped it. Null
      // whenever the sequence model is off or had nothing to go on.
      predicted_intent: result.prediction
        ? {
          top_category: result.prediction.top_category,
          confidence: Math.round(result.prediction.intent_confidence * 100) / 100,
          model_version: result.prediction.model_version,
        }
        : null,
      // What uplift and fairness actually did, including the relevance the
      // fairness constraint spent. Surfaced rather than hidden: it is a cost
      // the operator agreed to and should be able to see being incurred.
      adjustments: result.adjustments || null,
      narratives,
      timings: { total_ms: Date.now() - started },
    });
  } catch (err) {
    // Last-resort: an empty ranked feed, not a 500. The client falls back to
    // its own distance-sorted query.
    logger.error('ML /recommendations/home failed: ' + err.message);
    return res.json({
      success: true,
      surface: 'shops_home',
      strategy: 'baseline',
      reason: 'error',
      count: 0,
      shops: [],
      timings: { total_ms: Date.now() - started },
    });
  }
});

/**
 * GET /ml/recommendations/similar/:id
 *
 * "Because you viewed X." Content similarity plus the collaborative matrix once
 * it has support; today the matrix is empty and this is content-only, which is
 * exactly the cold-start behaviour the design intends.
 */
router.get('/similar/:id', optionalAuth, async (req, res) => {
  const started = Date.now();
  const sourceId = req.params.id;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 30);

  try {
    const sourceVector = await embeddings.vectorFor(sourceId);

    const sourceRes = await query(
      `SELECT s.*, c.name AS category_name
         FROM local_shops s
         LEFT JOIN shop_categories c ON c.id = s.category_id
        WHERE s.id = $1`,
      [sourceId]
    );
    const source = (sourceRes.rows || sourceRes || [])[0];
    if (!source) {
      return res.status(404).json({ success: false, error: 'Shop not found' });
    }

    // Collaborative pairs first, when the matrix has any. Returns nothing today.
    let affinityIds = [];
    try {
      const cfg = await mlconfig.get(source.region_id);
      const affinity = await query(
        `SELECT related_item_id, score
           FROM ml_item_affinity
          WHERE item_type = 'shop' AND source_item_id = $1 AND support >= $2
          ORDER BY score DESC
          LIMIT $3`,
        [sourceId, Number(cfg.ml_cf_min_support) || 50, limit]
      );
      affinityIds = (affinity.rows || affinity || []).map((r) => r.related_item_id);
    } catch {
      affinityIds = [];
    }

    const poolRes = await query(
      `SELECT s.*, c.name AS category_name,
              (SELECT COUNT(*) FROM shop_reviews r WHERE r.shop_id = s.id) AS review_count
         FROM local_shops s
         LEFT JOIN shop_categories c ON c.id = s.category_id
        WHERE COALESCE(s.is_active, 1) = 1 AND s.id <> $1
        LIMIT 500`,
      [sourceId]
    );
    const pool = poolRes.rows || poolRes || [];

    const index = await embeddings.getIndex();
    const scored = pool.map((item) => {
      const vec = index.vectors.get(item.id);
      const similarity = (sourceVector && vec) ? embeddings.cosine(sourceVector, vec) : 0;
      // A collaborative pair is stronger evidence than text overlap, so it is
      // added rather than averaged — but it stays bounded so it cannot swamp a
      // genuinely similar shop on the strength of two co-views.
      const affinityBonus = affinityIds.includes(item.id) ? 0.3 : 0;
      const distance = (source.latitude != null && item.latitude != null)
        ? ranker.distanceKm(Number(source.latitude), Number(source.longitude), Number(item.latitude), Number(item.longitude))
        : null;

      return {
        ...item,
        _similarity: similarity + affinityBonus,
        _distance_km: distance,
      };
    });

    scored.sort((a, b) => b._similarity - a._similarity);

    // Items with no textual overlap at all are noise, not recommendations. An
    // empty "because you viewed" rail is better than a random one.
    const items = scored.filter((s) => s._similarity > 0.01).slice(0, limit);

    return res.json({
      success: true,
      surface: 'shops_similar',
      source_id: sourceId,
      strategy: affinityIds.length > 0 ? 'ml' : 'content',
      count: items.length,
      shops: ranker.publicShape(items).map((item) => {
        const out = { ...item };
        delete out._similarity;
        return out;
      }),
      timings: { total_ms: Date.now() - started },
    });
  } catch (err) {
    logger.error('ML /recommendations/similar failed: ' + err.message);
    return res.json({
      success: true,
      surface: 'shops_similar',
      source_id: sourceId,
      strategy: 'baseline',
      reason: 'error',
      count: 0,
      shops: [],
      timings: { total_ms: Date.now() - started },
    });
  }
});

module.exports = router;
