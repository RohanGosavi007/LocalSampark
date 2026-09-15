/**
 * Stage-two scoring and re-ranking.
 *
 * Takes the candidates stage one produced and orders them. Every weight comes
 * from mlconfig, so an administrator can change any of this without a deploy;
 * nothing here is a constant.
 *
 * The governing constraint is that this must degrade rather than fail. A
 * hyperlocal feed sorted by distance is a perfectly usable product — it is what
 * the app shipped with — so any error, timeout or missing signal falls back to
 * it silently. The user sees a feed; the operator sees the fallback rate.
 */

const mlconfig = require('./mlconfig.service');
const embeddings = require('./embedding.service');
const logger = require('../../../config/logger');
const { query } = require('../../../config/database');

/** Great-circle distance in kilometres. */
function distanceKm(aLat, aLng, bLat, bLng) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Proximity score, 1 at the user's location decaying by half every half-life.
 *
 * Exponential rather than linear because the difference between 200m and 1km is
 * what decides whether someone walks there, while the difference between 8km
 * and 9km is noise. A linear decay spends most of its range on distinctions
 * nobody acts on.
 */
function distanceScore(km, halfLifeKm) {
  if (!Number.isFinite(km) || km < 0) return 0;
  return Math.pow(0.5, km / Math.max(halfLifeKm, 0.1));
}

/**
 * Wilson lower bound on the positive-rating proportion.
 *
 * Not the mean rating. A single 5-star review must not outrank ninety reviews
 * averaging 4.6, and a mean cannot express that — it has no notion of how much
 * evidence sits behind it. This returns the pessimistic end of the confidence
 * interval, so a rating earns its place by volume as well as value.
 */
function wilsonScore(rating, count) {
  const n = Number(count) || 0;
  const r = Number(rating) || 0;
  if (n <= 0 || r <= 0) return 0;

  // Ratings are 1..5; map to a proportion of "positive".
  const p = Math.min(Math.max((r - 1) / 4, 0), 1);
  const z = 1.96; // 95%
  const denom = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  return Math.max((centre - margin) / denom, 0);
}

/** Freshness, decaying over roughly a quarter. */
function recencyScore(createdAt) {
  if (!createdAt) return 0;
  const t = new Date(String(createdAt).replace(' ', 'T')).getTime();
  if (!Number.isFinite(t)) return 0;
  const days = (Date.now() - t) / 86400000;
  if (days < 0) return 1;
  return Math.exp(-days / 90);
}

/**
 * Time-of-day affinity.
 *
 * Coarse and hand-written rather than learned, because learning it needs the
 * interaction history that does not exist yet. It carries the smallest weight
 * of any term for that reason, and the categories listed are the ones where the
 * effect is strong enough to be worth asserting without evidence: nobody wants
 * a tiffin service at 11pm, and a pharmacy matters more then than at noon.
 */
const HOUR_AFFINITY = {
  morning: { hours: [6, 7, 8, 9, 10], terms: ['tiffin', 'dairy', 'bakery', 'breakfast', 'milk', 'newspaper', 'gym'] },
  midday: { hours: [11, 12, 13, 14, 15], terms: ['restaurant', 'catering', 'salon', 'clinic', 'laundry', 'hardware'] },
  evening: { hours: [16, 17, 18, 19, 20], terms: ['grocery', 'vegetable', 'sweet', 'gift', 'tuition', 'turf'] },
  night: { hours: [21, 22, 23, 0, 1, 2, 3, 4, 5], terms: ['pharmacy', 'medical', 'emergency', 'atm', 'fuel'] },
};

function contextScore(categoryText, localHour) {
  if (!categoryText || localHour == null) return 0;
  const hour = Number(localHour);
  if (!Number.isInteger(hour)) return 0;
  const text = String(categoryText).toLowerCase();

  for (const band of Object.values(HOUR_AFFINITY)) {
    if (!band.hours.includes(hour)) continue;
    for (const term of band.terms) {
      if (text.includes(term)) return 1;
    }
    return 0;
  }
  return 0;
}

/**
 * The deterministic baseline.
 *
 * Distance, then rating. This is what every failure path returns, and what the
 * kill switch reverts to. It is deliberately the same function in both cases so
 * it is exercised constantly rather than rotting as untested fallback code.
 */
function baselineRank(candidates, { lat, lng }) {
  return candidates
    .map((c) => ({
      ...c,
      _distance_km: (lat != null && c.latitude != null)
        ? distanceKm(lat, lng, Number(c.latitude), Number(c.longitude))
        : null,
    }))
    .sort((a, b) => {
      if (a._distance_km != null && b._distance_km != null && a._distance_km !== b._distance_km) {
        return a._distance_km - b._distance_km;
      }
      return (Number(b.rating) || 0) - (Number(a.rating) || 0);
    });
}

/** Admin pins, boosts and blocks for a surface. */
async function loadOverrides(surface) {
  try {
    const res = await query(
      `SELECT item_id, override_type, boost_factor, pinned_position
         FROM ml_item_overrides
        WHERE surface = $1 AND is_active = 1`,
      [surface]
    );
    const map = new Map();
    for (const row of res.rows || res || []) map.set(row.item_id, row);
    return map;
  } catch {
    // The overrides table is optional; its absence must not stop ranking.
    return new Map();
  }
}

/**
 * Interleaves exploration slots into a ranked list.
 *
 * Takes items from the tail — preferring those with the fewest lifetime
 * impressions — and places them at deterministic positions in the head. With
 * 124 shops and a popularity term, a pure-exploit ranker converges on the same
 * dozen merchants within days, and the other 112 never accumulate the
 * interactions that would let them rank. This is the mechanism that keeps
 * coverage from collapsing, and exploration slots are tagged so their CTR can
 * be compared against exploited slots directly.
 */
function injectExploration(ranked, epsilon, limit, impressionCounts) {
  const take = Math.min(limit, ranked.length);
  if (epsilon <= 0 || take < 4) return ranked.slice(0, take);

  const exploreSlots = Math.max(1, Math.round(take * epsilon));
  const head = ranked.slice(0, take);
  const tail = ranked.slice(take);
  if (tail.length === 0) return head;

  // Least-shown first: exploration is most valuable where least is known.
  const pool = tail
    .slice()
    .sort((a, b) => (impressionCounts.get(a.id) || 0) - (impressionCounts.get(b.id) || 0))
    .slice(0, exploreSlots);
  if (pool.length === 0) return head;

  const out = head.slice();
  // Spread the slots rather than clustering them, and never take position 0 —
  // the first result is the one most likely to be acted on, and spending it on
  // exploration is the most expensive slot to give away.
  const stride = Math.max(2, Math.floor(take / (pool.length + 1)));
  pool.forEach((item, i) => {
    const pos = Math.min(stride * (i + 1), out.length - 1);
    out[pos] = { ...item, is_exploration: true };
  });
  return out;
}

/** Lifetime impression counts, for the exploration pool ordering. */
async function loadImpressionCounts(itemType = 'shop') {
  try {
    const res = await query(
      `SELECT item_id, COUNT(*) AS shown
         FROM ml_interaction_events
        WHERE item_type = $1 AND event_type = 'IMPRESSION'
        GROUP BY item_id`,
      [itemType]
    );
    const map = new Map();
    for (const row of res.rows || res || []) map.set(row.item_id, Number(row.shown) || 0);
    return map;
  } catch {
    return new Map();
  }
}

/**
 * Ranks candidates.
 *
 * Returns { items, strategy, timings }. `strategy` is 'ml' or 'baseline', and
 * is echoed to the client and counted by the admin console so the fallback rate
 * is visible rather than inferred.
 */
async function rank(candidates, context = {}) {
  const {
    userId = null,
    lat = null,
    lng = null,
    localHour = null,
    regionId = null,
    surface = 'shops_home',
    limit = 20,
  } = context;

  const started = Date.now();

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { items: [], strategy: 'baseline', reason: 'no_candidates', timings: { total_ms: 0 } };
  }

  let cfg;
  try {
    cfg = await mlconfig.get(regionId);
  } catch (err) {
    logger.warn('ML config unavailable during ranking: ' + err.message);
    return {
      items: baselineRank(candidates, { lat, lng }).slice(0, limit),
      strategy: 'baseline',
      reason: 'config_unavailable',
      timings: { total_ms: Date.now() - started },
    };
  }

  const surfaceKey = surface.split('_')[0];
  const enabled = cfg.ml_enabled && cfg[`ml_enabled_${surfaceKey}`] !== false;
  if (!enabled) {
    return {
      items: baselineRank(candidates, { lat, lng }).slice(0, limit),
      strategy: 'baseline',
      reason: cfg.ml_enabled ? 'surface_disabled' : 'ml_disabled',
      timings: { total_ms: Date.now() - started },
    };
  }

  try {
    const budgetMs = Number(cfg.ml_timeout_ms) || 150;
    const weights = await mlconfig.getWeights(regionId);

    const [index, profile, overrides, impressionCounts] = await Promise.all([
      embeddings.getIndex(),
      embeddings.preferenceVector(userId),
      loadOverrides(surface),
      loadImpressionCounts('shop'),
    ]);

    // Budget check after the I/O and before scoring. Scoring is pure CPU over a
    // bounded candidate set, so if there is time left here there is time to
    // finish; abandoning mid-scan would waste the work already done.
    if (Date.now() - started > budgetMs) {
      return {
        items: baselineRank(candidates, { lat, lng }).slice(0, limit),
        strategy: 'baseline',
        reason: 'budget_exceeded',
        timings: { total_ms: Date.now() - started },
      };
    }

    const scored = [];
    for (const candidate of candidates) {
      const override = overrides.get(candidate.id);
      if (override && override.override_type === 'block') continue;

      const km = (lat != null && candidate.latitude != null)
        ? distanceKm(lat, lng, Number(candidate.latitude), Number(candidate.longitude))
        : null;

      const itemVector = index.vectors.get(candidate.id) || null;

      // Similarity needs a profile to compare against. With no history there is
      // nothing to be similar to, so the term contributes 0 rather than a
      // guess — this is the confidence mechanism that lets the same code serve
      // a cold start and a mature system.
      const sim = (profile && itemVector) ? embeddings.cosine(profile, itemVector) : 0;

      const terms = {
        sim,
        // Collaborative stays 0 until the affinity matrix has support. The
        // weight is 0 too, so this is belt and braces.
        cf: 0,
        dist: km != null ? distanceScore(km, Number(cfg.ml_distance_half_life_km) || 2) : 0,
        pop: wilsonScore(candidate.rating, candidate.review_count ?? candidate.total_ratings ?? 0),
        rec: recencyScore(candidate.created_at),
        ctx: contextScore(candidate.category_name || candidate.category, localHour),
      };

      let score =
        weights.ml_w_sim * terms.sim +
        weights.ml_w_cf * terms.cf +
        weights.ml_w_dist * terms.dist +
        weights.ml_w_pop * terms.pop +
        weights.ml_w_rec * terms.rec +
        weights.ml_w_ctx * terms.ctx;

      if (override && override.override_type === 'boost') {
        score *= Number(override.boost_factor) || 1;
      }

      scored.push({
        ...candidate,
        _distance_km: km,
        _score: score,
        // Returned so an admin can answer a merchant asking why they rank where
        // they do. Stripped before the response for non-admin callers.
        _terms: terms,
        _pinned: override && override.override_type === 'pin' ? override.pinned_position : null,
      });
    }

    scored.sort((a, b) => b._score - a._score);

    // Pins are placed after sorting so a pinned merchant lands exactly where
    // the admin put it regardless of score.
    const pinned = scored.filter((s) => s._pinned != null);
    let ordered = scored.filter((s) => s._pinned == null);
    for (const item of pinned.sort((a, b) => a._pinned - b._pinned)) {
      const pos = Math.min(Math.max(item._pinned, 0), ordered.length);
      ordered.splice(pos, 0, { ...item, is_promoted: true });
    }

    const items = injectExploration(
      ordered,
      Number(cfg.ml_epsilon) || 0,
      limit,
      impressionCounts
    );

    return {
      items,
      strategy: 'ml',
      timings: { total_ms: Date.now() - started },
      debug: {
        candidates: candidates.length,
        has_profile: Boolean(profile),
        vocabulary: index.idf.size,
      },
    };
  } catch (err) {
    // Any failure at all returns a usable feed. The operator finds out from the
    // fallback rate in the console, not from a user reporting a blank screen.
    logger.error('ML ranking failed, serving baseline: ' + err.message);
    return {
      items: baselineRank(candidates, { lat, lng }).slice(0, limit),
      strategy: 'baseline',
      reason: 'error',
      timings: { total_ms: Date.now() - started },
    };
  }
}

/** Strips internal scoring fields from a response for non-admin callers. */
function publicShape(items, { includeScores = false } = {}) {
  return items.map((item) => {
    const out = { ...item };
    if (!includeScores) {
      delete out._score;
      delete out._terms;
      delete out._pinned;
    }
    if (out._distance_km != null) {
      out.distance_km = Math.round(out._distance_km * 100) / 100;
    }
    delete out._distance_km;
    return out;
  });
}

module.exports = {
  rank,
  baselineRank,
  publicShape,
  distanceKm,
  distanceScore,
  wilsonScore,
  recencyScore,
  contextScore,
  injectExploration,
};
