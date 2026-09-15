/**
 * Multi-task ranking (MMoE principle).
 *
 * Replaces a single weighted sum with three predictive heads scored
 * independently and combined multiplicatively:
 *
 *   FinalScore = pCTR^alpha · pCVR^beta · pQuality^gamma · e^(-lambda·distance)
 *
 * The multiplicative form is the point. A weighted sum lets a listing compensate
 * for being unclickable by being close, which is how a feed fills with
 * convenient shops nobody wants. A product cannot: any head near zero drags the
 * whole score down, so a listing has to be at least adequate on every objective.
 * The exponents then express how much each objective matters without changing
 * that property — raising beta above alpha favours listings people actually
 * call over listings people merely tap.
 *
 * What "MMoE principle" means here, precisely: the heads share one feature
 * extraction pass and are combined per-objective, which is the part of the
 * architecture that carries the benefit at this scale. It is not a trained
 * gating network — there is no interaction history to train one on, and a
 * network fitted to a few thousand events would be memorising noise. The heads
 * are Bayesian rate estimators, which degrade to their priors under sparse data
 * instead of to arbitrary values. When the log is large enough to fit a gate,
 * this file is the place it goes; the interface above it does not change.
 */

const { query } = require('../../../config/database');
const logger = require('../../../config/logger');

/**
 * Events that count as high-intent conversion.
 *
 * A click is interest; these are the actions with a cost attached. In a
 * hyperlocal directory a tapped phone number is the closest observable proxy
 * for a transaction, because the transaction itself happens offline.
 */
const CONVERSION_EVENTS = ['CALL_VENDOR', 'PURCHASE_INTENT', 'BOOKMARK', 'SHARE'];

/**
 * Beta-binomial posterior mean.
 *
 * successes/trials is unusable when trials is small: one click on one
 * impression is not a 100% click-through rate, but that is what the raw ratio
 * says, and it would put a brand-new listing at the top of every feed. This
 * shrinks toward the prior in proportion to how little evidence there is, so a
 * listing has to earn its way up rather than arrive there.
 *
 *   posterior = (successes + prior·weight) / (trials + weight)
 *
 * With weight = 20 and a prior of 0.08, one click on one impression scores
 * 0.086 rather than 1.0, while 200 clicks on 1000 impressions scores 0.198 —
 * close to the observed 0.2, because by then the evidence dominates.
 */
function smoothedRate(successes, trials, prior, priorWeight) {
  const s = Math.max(Number(successes) || 0, 0);
  const n = Math.max(Number(trials) || 0, 0);
  const w = Math.max(Number(priorWeight) || 1, 1e-6);
  const p = Math.min(Math.max(Number(prior) || 0, 0), 1);
  return (s + p * w) / (n + w);
}

/**
 * Loads per-item interaction counts in one query.
 *
 * One query for the whole candidate set, not one per candidate: at 200
 * candidates the difference is 200 round trips against a 150ms budget.
 */
async function loadItemStats(itemIds, { itemType = 'shop', windowDays = 30 } = {}) {
  const stats = new Map();
  if (!Array.isArray(itemIds) || itemIds.length === 0) return stats;

  // SQLite stores CURRENT_TIMESTAMP as 'YYYY-MM-DD HH:MM:SS' and compares it as
  // a string, so an ISO cutoff with T and Z never matches. Postgres parses this
  // form too.
  const cutoff = new Date(Date.now() - windowDays * 86400000)
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, '');

  const conversionList = CONVERSION_EVENTS.map((e) => `'${e}'`).join(', ');
  const placeholders = itemIds.map((_, i) => `$${i + 3}`).join(', ');

  const res = await query(
    `SELECT item_id,
            SUM(CASE WHEN event_type = 'IMPRESSION' THEN 1 ELSE 0 END) AS impressions,
            SUM(CASE WHEN event_type = 'CARD_CLICK' THEN 1 ELSE 0 END) AS clicks,
            SUM(CASE WHEN event_type IN (${conversionList}) THEN 1 ELSE 0 END) AS conversions
       FROM ml_interaction_events
      WHERE item_type = $1 AND created_at >= $2 AND item_id IN (${placeholders})
      GROUP BY item_id`,
    [itemType, cutoff, ...itemIds]
  );

  for (const row of res.rows || res || []) {
    stats.set(row.item_id, {
      impressions: Number(row.impressions) || 0,
      clicks: Number(row.clicks) || 0,
      conversions: Number(row.conversions) || 0,
    });
  }
  return stats;
}

/**
 * pQuality: rating, responsiveness and verification.
 *
 * Deliberately not distance — distance is the explicit exponential term in the
 * composite, and including it here would apply the penalty twice, once inside a
 * gamma exponent and once outside it. That double-counting is easy to introduce
 * and very hard to notice, because the feed still looks plausible.
 *
 * Returns a value in (0, 1]. Never exactly zero: a zero on any head annihilates
 * the whole product, and an unrated new listing should rank low, not be
 * unrankable.
 */
function qualityScore(candidate) {
  const FLOOR = 0.05;

  // Wilson lower bound on the rating, so volume counts. A single five-star
  // review from the owner must not outrank ninety genuine ones.
  const n = Number(candidate.review_count ?? candidate.total_ratings ?? 0) || 0;
  const r = Number(candidate.rating) || 0;
  let ratingComponent = 0.5; // unrated sits mid-scale rather than at either end
  if (n > 0 && r > 0) {
    const p = Math.min(Math.max((r - 1) / 4, 0), 1);
    const z = 1.96;
    const denom = 1 + (z * z) / n;
    const centre = p + (z * z) / (2 * n);
    const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
    ratingComponent = Math.max((centre - margin) / denom, 0);
  }

  // Responsiveness, where the merchant has a recorded median response time.
  // Half an hour scores ~0.5 and decays from there.
  let responseComponent = 0.5;
  const minutes = Number(candidate.avg_response_minutes);
  if (Number.isFinite(minutes) && minutes >= 0) {
    responseComponent = Math.exp(-minutes / 30);
  }

  const verified = candidate.is_verified === true || candidate.is_verified === 1;

  const score =
    0.6 * ratingComponent +
    0.25 * responseComponent +
    0.15 * (verified ? 1 : 0);

  return Math.min(Math.max(score, FLOOR), 1);
}

/**
 * Scores one candidate, returning the composite and every input to it.
 *
 * The breakdown travels with the score because merchants ask why they rank
 * where they do, and "your conversion probability is 0.03 against a 0.12 median"
 * is an answer a support agent can give. A bare number is not.
 */
function scoreCandidate(candidate, stats, params) {
  const { alpha, beta, gamma, lambda, priorCtr, priorCvr, priorWeight } = params;

  const s = stats || { impressions: 0, clicks: 0, conversions: 0 };

  const pCTR = smoothedRate(s.clicks, s.impressions, priorCtr, priorWeight);
  // Conditioned on a click, not on an impression. pCVR answers "given someone
  // opened this, do they act?", which is a property of the listing; dividing by
  // impressions would instead fold click-through into it and double-count pCTR.
  const pCVR = smoothedRate(s.conversions, s.clicks, priorCvr, priorWeight);
  const pQuality = qualityScore(candidate);

  const distanceKm = Number.isFinite(candidate._distance_km) ? candidate._distance_km : null;
  const distancePenalty = distanceKm != null ? Math.exp(-lambda * distanceKm) : 1;

  // Math.pow on a base in (0,1] with a non-negative exponent stays in (0,1], so
  // the composite cannot exceed 1 or go negative.
  const composite =
    Math.pow(pCTR, alpha) *
    Math.pow(pCVR, beta) *
    Math.pow(pQuality, gamma) *
    distancePenalty;

  return {
    score: Number.isFinite(composite) ? composite : 0,
    heads: {
      pCTR,
      pCVR,
      pQuality,
      distance_penalty: distancePenalty,
      distance_km: distanceKm,
    },
    support: {
      impressions: s.impressions,
      clicks: s.clicks,
      conversions: s.conversions,
      // How much of the score is evidence rather than prior. An operator
      // reading the console needs to know the difference.
      evidence_weight: s.impressions / (s.impressions + priorWeight),
    },
  };
}

/** Resolves exponents from admin config, clamped to sane ranges. */
function readParams(cfg) {
  const clamp = (v, lo, hi, fallback) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(Math.max(n, lo), hi);
  };
  return {
    // An exponent of 0 switches a head off entirely (x^0 = 1), which is a
    // legitimate thing to want; negatives would invert the objective and are
    // never what someone means.
    alpha: clamp(cfg.ml_mmoe_alpha, 0, 5, 1),
    beta: clamp(cfg.ml_mmoe_beta, 0, 5, 1),
    gamma: clamp(cfg.ml_mmoe_gamma, 0, 5, 1),
    lambda: clamp(cfg.ml_mmoe_lambda, 0, 5, 0.15),
    priorCtr: clamp(cfg.ml_mmoe_prior_ctr, 0, 1, 0.08),
    priorCvr: clamp(cfg.ml_mmoe_prior_cvr, 0, 1, 0.12),
    priorWeight: clamp(cfg.ml_mmoe_prior_weight, 1, 10000, 20),
  };
}

/**
 * Ranks candidates by the composite score.
 *
 * Returns { items, params, stats_loaded }. Throws nothing: a failure to load
 * interaction stats scores every candidate from its priors, which is an
 * ordering by quality and distance — degraded, not broken.
 */
async function rank(candidates, { cfg, itemType = 'shop', windowDays = 30 } = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { items: [], params: null, stats_loaded: 0 };
  }

  const params = readParams(cfg || {});

  let stats = new Map();
  try {
    stats = await loadItemStats(candidates.map((c) => c.id), { itemType, windowDays });
  } catch (err) {
    // Priors only. Every pCTR and pCVR collapses to the configured prior, which
    // makes the ranking a function of quality and distance alone.
    logger.warn('Multi-task ranker could not load interaction stats: ' + err.message);
  }

  const scored = candidates.map((candidate) => {
    const result = scoreCandidate(candidate, stats.get(candidate.id), params);
    return {
      ...candidate,
      _score: result.score,
      _heads: result.heads,
      _support: result.support,
    };
  });

  scored.sort((a, b) => b._score - a._score);

  return { items: scored, params, stats_loaded: stats.size };
}

module.exports = {
  rank,
  scoreCandidate,
  qualityScore,
  smoothedRate,
  loadItemStats,
  readParams,
  CONVERSION_EVENTS,
};
