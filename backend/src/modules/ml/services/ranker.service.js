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

/**
 * Phase-2 scorers, each behind its own config flag and each defaulting to off.
 *
 * Required lazily inside the functions that use them rather than at module
 * load. Two reasons, both learned from the modules above: a require cycle
 * (coldstart reads embeddings, which this file also holds) and, more
 * practically, a disabled subsystem should cost nothing at boot — the sequence
 * model deserialises a weight matrix on first use, and a deployment with
 * ml_sequence_enabled false should never pay for it.
 */
function optional(modulePath) {
  try {
    // eslint-disable-next-line global-require
    return require(modulePath);
  } catch (err) {
    logger.warn(`Ranker: optional module ${modulePath} unavailable: ${err.message}`);
    return null;
  }
}

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

/**
 * Places cold-start picks into a finished feed.
 *
 * Distinct from injectExploration in what it selects and where it puts it.
 * That function takes the least-*shown* items from the tail; this takes the
 * least-*known* ones chosen by Thompson sampling, which after a few weeks is a
 * different set — an item shown a hundred times and ignored is well understood,
 * and spending another slot on it learns nothing.
 *
 * Placement mirrors the existing exploration pass deliberately: never position
 * 0, and spread rather than clustered. The first slot is the one most likely to
 * be acted on and is the most expensive to give away, and three unknown
 * merchants in a row reads as a broken feed.
 */
function injectColdStart(items, pool, picks) {
  if (!Array.isArray(items) || items.length < 4 || picks.length === 0) return items;

  const present = new Set(items.map((item) => String(item.id)));
  const byId = new Map(pool.map((item) => [String(item.id), item]));

  const additions = picks
    .filter((pick) => !present.has(String(pick.id)) && byId.has(String(pick.id)))
    .map((pick) => ({ ...byId.get(String(pick.id)), is_cold_start: true, _sampled_rate: pick.sampled_rate }));

  if (additions.length === 0) return items;

  const out = items.slice();
  const stride = Math.max(2, Math.floor(out.length / (additions.length + 1)));
  additions.forEach((item, i) => {
    const position = Math.min(stride * (i + 1), out.length - 1);
    out[position] = item;
  });
  return out;
}

/**
 * Collaborative affinity for the items a user has already engaged with.
 *
 * Returns itemId -> { score, support } keyed by the *candidate* item, so
 * scoring is a map lookup rather than a query per candidate.
 *
 * Returns an empty map when the user has no history, which is the normal case
 * today. That is what keeps the collaborative term at zero without any special
 * cold-start branch: no history means no affinity rows means a term of 0.
 */
async function loadCollaborativeScores(userId, minSupport) {
  if (!userId) return new Map();
  try {
    // The user's own engaged items, then everything the matrix relates to them.
    const res = await query(
      `SELECT a.related_item_id AS item_id,
              SUM(a.score * e.user_weight) AS score,
              MAX(a.support)               AS support
         FROM ml_item_affinity a
         JOIN (
              SELECT item_id, SUM(weight) AS user_weight
                FROM ml_interaction_events
               WHERE user_id = $1 AND item_type = 'shop' AND weight > 0
               GROUP BY item_id
         ) e ON e.item_id = a.source_item_id
        WHERE a.item_type = 'shop'
          AND a.support >= $2
        GROUP BY a.related_item_id`,
      [userId, minSupport]
    );

    const rows = res.rows || res || [];
    if (rows.length === 0) return new Map();

    // Normalised across this user's own candidates so the term lands in 0..1
    // like every other, and the configured weight means the same thing
    // regardless of how active the user is.
    let max = 0;
    for (const row of rows) {
      const v = Number(row.score) || 0;
      if (v > max) max = v;
    }

    const out = new Map();
    for (const row of rows) {
      const raw = Number(row.score) || 0;
      out.set(row.item_id, {
        score: max > 0 ? raw / max : 0,
        support: Number(row.support) || 0,
      });
    }
    return out;
  } catch {
    // The affinity table may not exist yet in an older deployment.
    return new Map();
  }
}

/**
 * How far to trust a collaborative pair, given how much evidence backs it.
 *
 * Ramps from 0 at the minimum support to 1 at ten times it. This is the
 * mechanism that lets the same scoring code serve launch day and month six: a
 * pair seen twice contributes almost nothing, a pair seen four hundred times
 * contributes fully, and no separate cold-start path has to be written or
 * maintained. Without it, the first weeks of sparse data would produce
 * confident nonsense — which is exactly what a recommender looks like when it
 * is trained on nearly nothing.
 */
function collaborativeConfidence(support, minSupport) {
  if (!support || support < minSupport) return 0;
  const ceiling = minSupport * 10;
  return Math.min((support - minSupport) / Math.max(ceiling - minSupport, 1), 1);
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
 * Gathers every phase-2 signal, concurrently and failing soft.
 *
 * The contract each one honours: return an empty map when the flag is off, when
 * the data is missing, or when anything at all goes wrong. A signal that throws
 * would take down a feed; a signal that returns nothing leaves the ranker
 * exactly as it was before the subsystem existed, which is a working feed.
 */
function emptyPhase2Signals() {
  return {
    graph: new Map(),
    intent: new Map(),
    coldstart: new Map(),
    coldstartPicks: [],
    prediction: null,
    timed_out: true,
  };
}

/**
 * Resolves `promise`, or `fallback()` if it has not settled within `ms`.
 *
 * The losing promise is not cancelled — JavaScript has no mechanism for that —
 * so its queries still complete and its result is discarded. That is the cost
 * of the deadline and it is bounded: these are read-only aggregates, and the
 * alternative is a feed that waits.
 */
function withDeadline(promise, ms, fallback) {
  let timer = null;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(fallback()), ms);
  });
  return Promise.race([promise, timeout])
    .then((result) => {
      // Clearing the timer matters: an un-cleared one keeps the event loop
      // alive for its full duration, which in a test run shows up as Jest
      // complaining that it cannot exit.
      if (timer) clearTimeout(timer);
      return result;
    })
    .catch((err) => {
      if (timer) clearTimeout(timer);
      logger.warn('Ranker: phase-2 signals failed: ' + err.message);
      return fallback();
    });
}

async function loadPhase2Signals({ cfg, userId, candidates, context }) {
  const empty = emptyPhase2Signals();
  empty.timed_out = false;

  const itemIds = candidates.map((c) => c.id);

  const [graph, intent, coldstart] = await Promise.all([
    (async () => {
      if (cfg.ml_graph_enabled !== true || Number(cfg.ml_w_graph) <= 0) return new Map();
      const lightgcn = optional('../graph/lightgcn');
      if (!lightgcn) return new Map();
      try {
        const societyId = context.societyId || await lightgcn.societyForUser(userId);
        return await lightgcn.affinityScores(userId, itemIds, {
          regionId: context.regionId || null,
          societyId,
          minDegree: Number(cfg.ml_graph_min_degree) || 3,
        });
      } catch (err) {
        logger.warn('Ranker: graph affinity unavailable: ' + err.message);
        return new Map();
      }
    })(),

    (async () => {
      if (cfg.ml_sequence_enabled !== true || Number(cfg.ml_w_intent) <= 0) {
        return { scores: new Map(), prediction: null };
      }
      const intentModel = optional('../sequence/intentModel');
      if (!intentModel) return { scores: new Map(), prediction: null };
      try {
        const prediction = await intentModel.predictNextCategory(userId, context.sessionEvents || []);
        return { scores: intentModel.intentScores(candidates, prediction), prediction };
      } catch (err) {
        logger.warn('Ranker: intent prediction unavailable: ' + err.message);
        return { scores: new Map(), prediction: null };
      }
    })(),

    (async () => {
      if (cfg.ml_coldstart_enabled !== true) return { assessments: new Map(), picks: [] };
      const coldStart = optional('../coldstart/coldStart');
      if (!coldStart) return { assessments: new Map(), picks: [] };
      try {
        const assessments = await coldStart.assess(candidates, {
          graceDays: Number(cfg.ml_coldstart_grace_days) || 30,
          pincode: context.pincode || null,
        });
        const budget = Math.round((Number(cfg.ml_coldstart_budget) || 0) * (context.limit || 20));
        return { assessments, picks: coldStart.selectExploration(assessments, budget) };
      } catch (err) {
        logger.warn('Ranker: cold-start assessment unavailable: ' + err.message);
        return { assessments: new Map(), picks: [] };
      }
    })(),
  ]).catch((err) => {
    logger.warn('Ranker: phase-2 signals failed wholesale: ' + err.message);
    return [new Map(), { scores: new Map(), prediction: null }, { assessments: new Map(), picks: [] }];
  });

  return {
    ...empty,
    graph,
    intent: intent.scores,
    prediction: intent.prediction,
    coldstart: coldstart.assessments,
    coldstartPicks: coldstart.picks,
  };
}

/**
 * Applies the post-scoring adjustments: uplift, then fairness.
 *
 * Order matters and is not arbitrary. Uplift is a *scoring* correction — it
 * changes what the ranker believes each candidate is worth — so it must happen
 * before the ordering is fixed. Fairness is an *allocation* constraint over the
 * final ordering, and it measures its own cost in NDCG against the scores it
 * receives. Running fairness first and uplift second would let uplift silently
 * undo a correction whose cost had already been accounted for and reported.
 */
async function applyPostScoring(ordered, { cfg, context }) {
  const notes = { uplift: null, fairness: null };
  let items = ordered;

  if (cfg.ml_uplift_enabled === true && Number(cfg.ml_uplift_strength) > 0) {
    const uplift = optional('../causal/upliftModel');
    if (uplift) {
      try {
        const factors = await uplift.multipliers(items, {
          strength: Number(cfg.ml_uplift_strength) || 0.5,
        });
        if (factors.size > 0) {
          items = items
            .map((item) => {
              const factor = factors.get(item.id);
              if (factor === undefined) return item;
              return { ...item, _score: item._score * factor, _uplift_factor: factor };
            })
            .sort((a, b) => b._score - a._score);
          notes.uplift = { applied: factors.size, strength: Number(cfg.ml_uplift_strength) };
        }
      } catch (err) {
        logger.warn('Ranker: uplift adjustment skipped: ' + err.message);
      }
    }
  }

  if (cfg.ml_fairness_enabled === true && Number(cfg.ml_fairness_strength) > 0) {
    const fairness = optional('../fairness/exposureFairness');
    if (fairness) {
      try {
        const deficits = await fairness.loadDeficits(items.map((i) => i.id), {
          regionId: context.regionId || null,
        });
        const result = fairness.rerank(items, {
          deficits,
          strength: Number(cfg.ml_fairness_strength) || 0.3,
          maxNdcgLoss: Number(cfg.ml_fairness_max_ndcg_loss) || 0.05,
        });
        items = result.items;
        notes.fairness = {
          applied_strength: result.applied_strength,
          ndcg_loss: result.ndcg_loss,
          budget: result.budget,
          moved: result.moved,
          max_move: result.max_move,
        };
      } catch (err) {
        logger.warn('Ranker: fairness re-rank skipped: ' + err.message);
      }
    }
  }

  return { items, notes };
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
    // Pre-adjusted config from the session-hint layer. Passed in rather than
    // re-read so the hints the endpoint echoed back are exactly the ones that
    // ranked, with no chance of the two diverging.
    cfgOverride = null,
  } = context;

  const started = Date.now();

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { items: [], strategy: 'baseline', reason: 'no_candidates', timings: { total_ms: 0 } };
  }

  let cfg;
  try {
    cfg = cfgOverride || await mlconfig.get(regionId);
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

    // Multi-task ranking, when enabled, replaces the weighted-sum scorer
    // entirely. It is a different scoring model rather than an extra term:
    // running both and blending them would give two objectives a vote each and
    // make neither interpretable. Overrides, exploration and the surface kill
    // switches all still apply, because those are governance rather than
    // scoring — an admin's block must hold whichever model is ranking.
    if (cfg.ml_mmoe_enabled === true) {
      const multiTask = require('../ranking/multiTaskRanker');
      const withDistance = candidates.map((c) => ({
        ...c,
        _distance_km: (lat != null && c.latitude != null)
          ? distanceKm(lat, lng, Number(c.latitude), Number(c.longitude))
          : null,
      }));

      const overrides = await loadOverrides(surface);
      const impressionCounts = await loadImpressionCounts('shop');
      const eligible = withDistance.filter((c) => {
        const o = overrides.get(c.id);
        return !(o && o.override_type === 'block');
      });

      const mt = await multiTask.rank(eligible, { cfg });

      let ordered = mt.items.map((item) => {
        const o = overrides.get(item.id);
        let score = item._score;
        if (o && o.override_type === 'boost') score *= Number(o.boost_factor) || 1;
        // Session category affinity, set by the endpoint when the user has been
        // looking at one category. 1 when absent, so this is a no-op then.
        score *= Number(item._session_category_boost) || 1;
        return score === item._score ? item : { ...item, _score: score };
      });
      ordered.sort((a, b) => b._score - a._score);

      const pinned = [];
      ordered = ordered.filter((item) => {
        const o = overrides.get(item.id);
        if (o && o.override_type === 'pin') {
          pinned.push({ ...item, _pinned: o.pinned_position, is_promoted: true });
          return false;
        }
        return true;
      });
      for (const item of pinned.sort((a, b) => a._pinned - b._pinned)) {
        ordered.splice(Math.min(Math.max(item._pinned, 0), ordered.length), 0, item);
      }

      const items = injectExploration(ordered, Number(cfg.ml_epsilon) || 0, limit, impressionCounts);

      return {
        items,
        strategy: 'mmoe',
        timings: { total_ms: Date.now() - started },
        debug: {
          candidates: candidates.length,
          params: mt.params,
          items_with_history: mt.stats_loaded,
        },
      };
    }

    const minSupport = Number(cfg.ml_cf_min_support) || 50;

    const [index, profile, overrides, impressionCounts, collaborative, phase2] = await Promise.all([
      embeddings.getIndex(),
      embeddings.preferenceVector(userId),
      loadOverrides(surface),
      loadImpressionCounts('shop'),
      loadCollaborativeScores(userId, minSupport),
      // Every phase-2 signal, gathered concurrently with the rest. Each resolves
      // to an empty result when its flag is off or its data is missing, so the
      // scoring loop below has no conditional branches for them — an absent
      // signal contributes a term of zero, exactly as ml_w_cf does before the
      // affinity matrix has support.
      //
      // Raced against its own deadline rather than sharing the ranker's. These
      // signals are enhancements: losing them costs some ranking quality, while
      // letting them consume the ranking budget costs the *whole* ML path,
      // because the check below falls back to the distance-sorted baseline.
      // Trading a graph term for a baseline feed is a bad exchange, and it is
      // the one that happens by default if this shares the main budget.
      withDeadline(
        loadPhase2Signals({ cfg, userId, candidates, context }),
        Math.max(Math.floor((Number(cfg.ml_timeout_ms) || 150) / 2), 20),
        emptyPhase2Signals
      ),
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

      // Scaled by its own support, so a thinly-evidenced pair contributes
      // proportionally little rather than the same as a well-evidenced one.
      const affinity = collaborative.get(candidate.id);
      const cf = affinity
        ? affinity.score * collaborativeConfidence(affinity.support, minSupport)
        : 0;

      const terms = {
        sim,
        cf,
        dist: km != null ? distanceScore(km, Number(cfg.ml_distance_half_life_km) || 2) : 0,
        pop: wilsonScore(candidate.rating, candidate.review_count ?? candidate.total_ratings ?? 0),
        rec: recencyScore(candidate.created_at),
        ctx: contextScore(candidate.category_name || candidate.category, localHour),
        // Society-neighbourhood affinity from the propagated graph, and the
        // predicted-next-category probability from the sequence model. Both are
        // 0 when their subsystem is off or has no answer for this candidate,
        // which is what lets them join the weighted sum with no special-casing.
        graph: phase2.graph.get(candidate.id) || 0,
        intent: phase2.intent.get(candidate.id) || 0,
      };

      let score =
        weights.ml_w_sim * terms.sim +
        weights.ml_w_cf * terms.cf +
        weights.ml_w_dist * terms.dist +
        weights.ml_w_pop * terms.pop +
        weights.ml_w_rec * terms.rec +
        weights.ml_w_ctx * terms.ctx +
        weights.ml_w_graph * terms.graph +
        weights.ml_w_intent * terms.intent;

      if (override && override.override_type === 'boost') {
        score *= Number(override.boost_factor) || 1;
      }
      score *= Number(candidate._session_category_boost) || 1;

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

    // Uplift re-scores, fairness re-allocates. Both are no-ops when their flags
    // are off, and both fail soft.
    const post = await applyPostScoring(ordered, { cfg, context });
    ordered = post.items;

    let items = injectExploration(
      ordered,
      Number(cfg.ml_epsilon) || 0,
      limit,
      impressionCounts
    );

    // Cold-start slots are placed last, over the finished list.
    //
    // They are a claim on the *served* feed, so they have to be applied to what
    // is actually being served — inserting them earlier would let the fairness
    // re-rank or the exploration pass push them back out, and the budget an
    // operator configured would silently not be honoured.
    if (phase2.coldstartPicks.length > 0) {
      items = injectColdStart(items, ordered, phase2.coldstartPicks);
    }

    return {
      items,
      strategy: 'ml',
      timings: { total_ms: Date.now() - started },
      // Surfaced so the endpoint can echo the predicted intent to the client
      // and the console can attribute a feed to it.
      prediction: phase2.prediction,
      adjustments: post.notes,
      debug: {
        candidates: candidates.length,
        has_profile: Boolean(profile),
        vocabulary: index.idf.size,
        collaborative_pairs: collaborative.size,
        graph_scored: phase2.graph.size,
        intent_scored: phase2.intent.size,
        coldstart_slots: phase2.coldstartPicks.length,
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
  collaborativeConfidence,
  loadCollaborativeScores,
  baselineRank,
  publicShape,
  distanceKm,
  distanceScore,
  wilsonScore,
  recencyScore,
  contextScore,
  injectExploration,
  injectColdStart,
  applyPostScoring,
  loadPhase2Signals,
  withDeadline,
};
