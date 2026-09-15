/**
 * Experiment assignment and bucketing.
 *
 * Assignment is a pure function of (experiment key, subject id). There is no
 * assignment table and no lookup on the request path, which buys three things
 * that a stored assignment does not:
 *
 *   - A subject lands in the same variant on every request, on every instance,
 *     forever, without a write ever having happened. Stored assignments drift
 *     when two instances race the first request for a user.
 *   - Adding the experiment to a second service needs no shared state, only the
 *     same key and hash.
 *   - Nothing accumulates. A hundred experiments over a year cost no rows.
 *
 * The hash is salted with the experiment key so that a subject unlucky enough
 * to land in the control arm of one experiment is not systematically in the
 * control arm of every other — without the salt, every experiment would bucket
 * users identically and their effects would be perfectly confounded.
 */

const crypto = require('crypto');
const { query } = require('../../../config/database');
const logger = require('../../../config/logger');

const CACHE_TTL_MS = 30000;
let cache = null;

/**
 * A uniform value in [0,1) for a subject within one experiment.
 *
 * SHA-256 over `key:subject`, taking the first 32 bits. Uniformity matters: a
 * weak hash that clusters produces variants of unequal size, and the experiment
 * then measures the bucketing rather than the change.
 */
function bucketValue(experimentKey, subjectId) {
  const digest = crypto
    .createHash('sha256')
    .update(`${experimentKey}:${subjectId}`)
    .digest();
  return digest.readUInt32BE(0) / 0x100000000;
}

/**
 * Picks a variant from relative weights.
 *
 * Weights need not sum to 100 — they are normalised — so an operator can write
 * 80/10/10 or 8/1/1 and mean the same thing, and adding a fourth arm does not
 * require rebalancing the other three by hand.
 */
function pickVariant(variants, value) {
  const total = variants.reduce((sum, v) => sum + Math.max(Number(v.weight) || 0, 0), 0);
  if (total <= 0) return variants[0] || null;

  let cursor = 0;
  for (const variant of variants) {
    cursor += Math.max(Number(variant.weight) || 0, 0) / total;
    if (value < cursor) return variant;
  }
  // Floating-point accumulation can leave `value` a hair past the final
  // boundary; the last variant is the correct answer there.
  return variants[variants.length - 1];
}

function parseVariants(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed
      .filter((v) => v && typeof v.name === 'string')
      .map((v) => ({
        name: v.name,
        weight: Number(v.weight) || 0,
        config: v.config || {},
      }));
  } catch {
    return null;
  }
}

/** Active experiments, cached briefly so ranking does not query per request. */
async function loadActive({ force = false } = {}) {
  if (!force && cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache.experiments;

  const experiments = new Map();
  try {
    const res = await query(
      'SELECT key, variants, traffic_pct, is_active FROM ml_experiments WHERE is_active = 1'
    );
    for (const row of res.rows || res || []) {
      const variants = parseVariants(row.variants);
      if (!variants) {
        logger.warn(`Experiment "${row.key}" has unparseable variants; ignoring it.`);
        continue;
      }
      experiments.set(row.key, {
        key: row.key,
        variants,
        trafficPct: Math.min(Math.max(Number(row.traffic_pct) || 0, 0), 100),
      });
    }
  } catch (err) {
    // No experiments means production behaviour for everyone, which is the
    // correct failure mode: an experiment framework that cannot read its own
    // config must not start assigning people to arms at random.
    logger.warn('Could not load experiments, treating all traffic as production: ' + err.message);
  }

  cache = { experiments, loadedAt: Date.now() };
  return experiments;
}

function invalidate() {
  cache = null;
}

/**
 * Assigns a subject to a variant.
 *
 * Returns { inExperiment, variant, config, reason }. An anonymous subject is
 * never enrolled: without a stable id the assignment would change between
 * requests, which is worse than not experimenting — the subject would see two
 * different behaviours and contribute noise to both arms.
 */
async function assign(experimentKey, subjectId) {
  if (!subjectId) {
    return { inExperiment: false, variant: null, config: {}, reason: 'no_subject' };
  }

  const experiments = await loadActive();
  const experiment = experiments.get(experimentKey);
  if (!experiment) {
    return { inExperiment: false, variant: null, config: {}, reason: 'not_running' };
  }

  // A separate hash decides entry, so changing traffic_pct from 10% to 20%
  // keeps the original 10% in their existing variants and adds new subjects,
  // rather than reshuffling everyone and discarding the data collected so far.
  const entry = bucketValue(`${experimentKey}:entry`, subjectId);
  if (entry * 100 >= experiment.trafficPct) {
    return { inExperiment: false, variant: null, config: {}, reason: 'not_sampled' };
  }

  const variant = pickVariant(experiment.variants, bucketValue(experimentKey, subjectId));
  if (!variant) {
    return { inExperiment: false, variant: null, config: {}, reason: 'no_variants' };
  }

  return {
    inExperiment: true,
    experiment: experimentKey,
    variant: variant.name,
    config: variant.config || {},
  };
}

/**
 * Per-variant outcome metrics.
 *
 * Recomputes assignment for each subject in the window rather than reading a
 * stored arm, which is the same function the serving path used — so the
 * analysis cannot disagree with what was actually served. A stored assignment
 * that drifted from the serving logic is the classic way an experiment reports
 * a result that never happened.
 */
async function results(experimentKey, { sinceHours = 168 } = {}) {
  const experiments = await loadActive({ force: true });
  const experiment = experiments.get(experimentKey);
  if (!experiment) return { experiment: experimentKey, running: false, variants: [] };

  const cutoff = new Date(Date.now() - Number(sinceHours) * 3600 * 1000)
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, '');

  let rows = [];
  try {
    const res = await query(
      `SELECT user_id,
              SUM(CASE WHEN event_type = 'IMPRESSION' THEN 1 ELSE 0 END) AS impressions,
              SUM(CASE WHEN event_type = 'CARD_CLICK' THEN 1 ELSE 0 END) AS clicks,
              SUM(CASE WHEN event_type IN ('CALL_VENDOR','PURCHASE_INTENT') THEN 1 ELSE 0 END) AS conversions
         FROM ml_interaction_events
        WHERE created_at >= $1 AND user_id IS NOT NULL
        GROUP BY user_id`,
      [cutoff]
    );
    rows = res.rows || res || [];
  } catch (err) {
    logger.warn('Experiment results query failed: ' + err.message);
    return { experiment: experimentKey, running: true, variants: [], error: true };
  }

  const buckets = new Map(experiment.variants.map((v) => [v.name, {
    variant: v.name, subjects: 0, impressions: 0, clicks: 0, conversions: 0,
  }]));

  for (const row of rows) {
    const entry = bucketValue(`${experimentKey}:entry`, row.user_id);
    if (entry * 100 >= experiment.trafficPct) continue;

    const variant = pickVariant(experiment.variants, bucketValue(experimentKey, row.user_id));
    const bucket = buckets.get(variant.name);
    if (!bucket) continue;

    bucket.subjects += 1;
    bucket.impressions += Number(row.impressions) || 0;
    bucket.clicks += Number(row.clicks) || 0;
    bucket.conversions += Number(row.conversions) || 0;
  }

  const variants = Array.from(buckets.values()).map((b) => ({
    ...b,
    // null rather than 0 where there is no denominator: an operator must be
    // able to tell "no traffic yet" from "nobody clicked".
    ctr: b.impressions > 0 ? b.clicks / b.impressions : null,
    cvr: b.clicks > 0 ? b.conversions / b.clicks : null,
  }));

  return {
    experiment: experimentKey,
    running: true,
    traffic_pct: experiment.trafficPct,
    window_hours: Number(sinceHours),
    variants,
    significance: significance(variants),
  };
}

/**
 * Two-proportion z-test of each variant against the first.
 *
 * Reported so an operator does not read a 3% CTR difference on 40 impressions
 * as a result. Deliberately reports the z statistic and a plain verdict rather
 * than a p-value: p-values invite "p < 0.05 means it worked", and at these
 * sample sizes the honest answer is usually "not enough data yet".
 */
function significance(variants) {
  if (variants.length < 2) return [];
  const control = variants[0];
  if (!control || control.impressions === 0) return [];

  const out = [];
  for (let i = 1; i < variants.length; i += 1) {
    const v = variants[i];
    if (v.impressions === 0 || control.impressions === 0) {
      out.push({ variant: v.variant, verdict: 'insufficient_data', z: null });
      continue;
    }

    const p1 = control.clicks / control.impressions;
    const p2 = v.clicks / v.impressions;
    const n1 = control.impressions;
    const n2 = v.impressions;
    const pooled = (control.clicks + v.clicks) / (n1 + n2);
    const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));

    if (!Number.isFinite(se) || se === 0) {
      out.push({ variant: v.variant, verdict: 'insufficient_data', z: null });
      continue;
    }

    const z = (p2 - p1) / se;
    // A common rule of thumb for a proportions test: fewer than ~30 successes
    // per arm and the normal approximation is not trustworthy regardless of z.
    const enough = control.clicks >= 30 && v.clicks >= 30;

    out.push({
      variant: v.variant,
      z: Number(z.toFixed(3)),
      lift: p1 > 0 ? Number(((p2 - p1) / p1).toFixed(4)) : null,
      verdict: !enough ? 'insufficient_data'
        : Math.abs(z) >= 1.96 ? (z > 0 ? 'better' : 'worse')
        : 'no_difference',
    });
  }
  return out;
}

module.exports = {
  assign,
  results,
  significance,
  bucketValue,
  pickVariant,
  loadActive,
  invalidate,
};
