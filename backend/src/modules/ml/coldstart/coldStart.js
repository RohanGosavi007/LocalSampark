/**
 * Cold start: scoring merchants nothing is known about.
 *
 * Every signal the ranker uses needs history. The content vector needs a
 * preference vector to compare against, the collaborative term needs support,
 * the Wilson bound needs reviews, the graph term needs degree. A merchant who
 * listed yesterday in a pincode the platform entered last month has none of it,
 * so they score near zero on everything except distance, never get shown, never
 * accumulate the history that would let them score, and churn.
 *
 * That is not a minor gap for a platform whose growth is expansion into new
 * pincodes: it means the ranker is worst exactly where the business is
 * investing. Three mechanisms, each addressing a different reason the signal is
 * missing:
 *
 *  1. **Content-to-collaborative projection.** A new merchant has metadata even
 *     when it has no interactions. A linear map is fitted from content vectors
 *     to the collaborative embeddings of merchants that *do* have history, then
 *     applied to the new one. The estimate is worse than a learned embedding
 *     and far better than zero.
 *
 *  2. **Geographic transfer.** A pincode with little data borrows a prior from
 *     behaviourally similar pincodes, weighted by how little of its own data it
 *     has. Empirical Bayes: the shrinkage falls out of the variance ratio
 *     rather than being a tuned constant, so it decays on its own as the
 *     pincode matures and nobody has to remember to turn it down.
 *
 *  3. **An exploration budget** reserved for high-uncertainty new merchants,
 *     sampled by Thompson sampling against the contextual bandit already in the
 *     codebase rather than a second sampler.
 *
 * The distinction from the exploration slots already in ranker.service.js:
 * those pick the least-*shown* items, which after a few weeks means items that
 * were shown and ignored. This picks the least-*known* ones, which is a
 * different set and the one that actually needs the slot.
 */

const crypto = require('crypto');
const { query } = require('../../../config/database');
const logger = require('../../../config/logger');
const embeddings = require('../services/embedding.service');

/** Platform-wide fallback prior, used when a pincode has no donors either. */
const GLOBAL_PRIOR_ALPHA = 2;
const GLOBAL_PRIOR_BETA = 48; // ≈ 4% click-through

/**
 * Empirical-Bayes shrinkage weight.
 *
 * The share of the estimate taken from the prior rather than from the
 * pincode's own data. Derived from the ratio of prior strength to observed
 * count, so it approaches 1 when nothing has been observed and decays toward 0
 * as observations accumulate — the same shape as `collaborativeConfidence` in
 * the ranker, and for the same reason: a single code path that is correct at
 * launch and correct at month six, with no cold-start branch to maintain.
 */
function shrinkage(ownEvents, priorStrength) {
  const n = Math.max(Number(ownEvents) || 0, 0);
  const strength = Math.max(Number(priorStrength) || 1, 1e-6);
  return strength / (strength + n);
}

/**
 * Beta posterior mean after shrinking toward a borrowed prior.
 *
 * Returns the rate plus the uncertainty around it, because the exploration
 * budget below needs the uncertainty and not the point estimate — a merchant
 * whose rate is confidently low should not be explored, while one whose rate is
 * unknown should.
 */
function posterior(successes, trials, { alpha = GLOBAL_PRIOR_ALPHA, beta = GLOBAL_PRIOR_BETA } = {}) {
  const s = Math.max(Number(successes) || 0, 0);
  const n = Math.max(Number(trials) || 0, 0);
  const a = alpha + s;
  const b = beta + Math.max(n - s, 0);
  const mean = a / (a + b);
  // Variance of a Beta distribution. Falls as evidence accumulates, which is
  // exactly the quantity an exploration policy should be spending its budget on.
  const variance = (a * b) / ((a + b) ** 2 * (a + b + 1));
  return { mean, variance, alpha: a, beta: b, std: Math.sqrt(variance) };
}

/** Deterministic Beta sample, for reproducible Thompson draws in tests. */
function sampleBeta(alpha, beta, random = Math.random) {
  // Two Gamma draws: Beta(a,b) = X/(X+Y) with X~Gamma(a), Y~Gamma(b).
  const x = sampleGamma(alpha, random);
  const y = sampleGamma(beta, random);
  return x + y > 0 ? x / (x + y) : 0.5;
}

/** Marsaglia–Tsang, with the standard boost for shape parameters below 1. */
function sampleGamma(shape, random) {
  if (shape < 1) {
    const u = Math.max(random(), Number.MIN_VALUE);
    return sampleGamma(shape + 1, random) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (let attempt = 0; attempt < 200; attempt += 1) {
    let x;
    let v;
    do {
      const u1 = Math.max(random(), Number.MIN_VALUE);
      const u2 = random();
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
  // The rejection loop effectively always terminates; the bound exists so a
  // pathological RNG cannot hang a request thread.
  return d;
}

/**
 * Fits a linear map from content space to collaborative space.
 *
 * Both are high-dimensional and the training set is small — the merchants that
 * have enough history to have a trustworthy collaborative position. So the map
 * is fitted per output dimension by ridge regression with a heavy penalty, and
 * more importantly it is fitted on the *projected* content vector rather than
 * the raw sparse one: a few thousand content dimensions against a few hundred
 * training merchants would be fitted exactly and generalise not at all.
 *
 * Returns null when there is not enough history to fit, which is the honest
 * answer early on and leaves the caller's other two mechanisms to work.
 */
function fitContentBridge(contentVectors, targetVectors, { l2 = 10, minSamples = 30 } = {}) {
  const ids = [...targetVectors.keys()].filter((id) => contentVectors.has(id));
  if (ids.length < minSamples) return null;

  const inputDim = contentVectors.get(ids[0]).length;
  const outputDim = targetVectors.get(ids[0]).length;

  const X = ids.map((id) => contentVectors.get(id));

  // XᵀX + λI, shared across every output dimension — it does not depend on the
  // target, so computing it once turns d_out solves into one factorisation.
  const XtX = [];
  for (let i = 0; i < inputDim; i += 1) XtX.push(new Float64Array(inputDim));
  for (const row of X) {
    for (let i = 0; i < inputDim; i += 1) {
      if (row[i] === 0) continue;
      for (let j = 0; j < inputDim; j += 1) XtX[i][j] += row[i] * row[j];
    }
  }
  for (let i = 0; i < inputDim; i += 1) XtX[i][i] += l2;

  // Cholesky. XᵀX + λI is symmetric positive definite for λ > 0, so this is
  // both valid and roughly twice as fast as a general solve.
  const L = [];
  for (let i = 0; i < inputDim; i += 1) L.push(new Float64Array(inputDim));
  for (let i = 0; i < inputDim; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      let sum = XtX[i][j];
      for (let k = 0; k < j; k += 1) sum -= L[i][k] * L[j][k];
      if (i === j) {
        if (sum <= 0) return null; // Numerically indefinite: refuse rather than emit garbage.
        L[i][i] = Math.sqrt(sum);
      } else {
        L[i][j] = sum / L[j][j];
      }
    }
  }

  const solve = (b) => {
    const y = new Float64Array(inputDim);
    for (let i = 0; i < inputDim; i += 1) {
      let sum = b[i];
      for (let k = 0; k < i; k += 1) sum -= L[i][k] * y[k];
      y[i] = sum / L[i][i];
    }
    const x = new Float64Array(inputDim);
    for (let i = inputDim - 1; i >= 0; i -= 1) {
      let sum = y[i];
      for (let k = i + 1; k < inputDim; k += 1) sum -= L[k][i] * x[k];
      x[i] = sum / L[i][i];
    }
    return x;
  };

  const weights = [];
  for (let out = 0; out < outputDim; out += 1) {
    const Xty = new Float64Array(inputDim);
    ids.forEach((id, r) => {
      const target = targetVectors.get(id)[out];
      const row = X[r];
      for (let i = 0; i < inputDim; i += 1) Xty[i] += row[i] * target;
    });
    weights.push(solve(Xty));
  }

  return {
    inputDim,
    outputDim,
    samples: ids.length,
    project(contentVector) {
      const out = new Float64Array(outputDim);
      for (let o = 0; o < outputDim; o += 1) {
        const w = weights[o];
        let sum = 0;
        for (let i = 0; i < inputDim; i += 1) sum += w[i] * contentVector[i];
        out[o] = sum;
      }
      // Normalised, so a projected embedding is comparable with a learned one
      // under cosine rather than being systematically shorter — ridge shrinks
      // the coefficients, so an unnormalised projection lands inside the unit
      // sphere and would lose every similarity comparison on magnitude alone.
      let sumSq = 0;
      for (let i = 0; i < outputDim; i += 1) sumSq += out[i] * out[i];
      const norm = Math.sqrt(sumSq);
      if (norm > 0) for (let i = 0; i < outputDim; i += 1) out[i] /= norm;
      return out;
    },
  };
}

/**
 * Behavioural similarity between pincodes, for the transfer prior.
 *
 * Compared on their *category mix* — what share of engagement each category
 * takes — rather than on volume. A busy pincode and a quiet one with the same
 * mix are good donors for each other; two busy ones with opposite mixes are
 * not. Comparing on volume would pick donors by size, which is the one property
 * that says nothing about what people there want.
 */
async function pincodeProfiles({ windowDays = 90 } = {}) {
  const cutoff = new Date(Date.now() - windowDays * 86400000)
    .toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

  const profiles = new Map(); // pincode -> { mix: Map<category, share>, events, clicks, impressions }

  try {
    const res = await query(
      `SELECT s.pincode AS pincode,
              COALESCE(c.slug, s.category) AS category,
              SUM(CASE WHEN e.event_type = 'IMPRESSION' THEN 1 ELSE 0 END) AS impressions,
              SUM(CASE WHEN e.event_type = 'CARD_CLICK' THEN 1 ELSE 0 END) AS clicks,
              COUNT(*) AS events
         FROM ml_interaction_events e
         JOIN local_shops s ON s.id = e.item_id
    LEFT JOIN shop_categories c ON c.id = s.category_id
        WHERE e.item_type = 'shop' AND e.created_at >= $1 AND s.pincode IS NOT NULL
        GROUP BY s.pincode, COALESCE(c.slug, s.category)`,
      [cutoff]
    );

    for (const row of res.rows || res || []) {
      const pincode = String(row.pincode);
      if (!profiles.has(pincode)) {
        profiles.set(pincode, { mix: new Map(), events: 0, clicks: 0, impressions: 0 });
      }
      const profile = profiles.get(pincode);
      const events = Number(row.events) || 0;
      profile.mix.set(String(row.category), events);
      profile.events += events;
      profile.clicks += Number(row.clicks) || 0;
      profile.impressions += Number(row.impressions) || 0;
    }

    // Convert counts to shares.
    for (const profile of profiles.values()) {
      if (profile.events === 0) continue;
      for (const [category, count] of profile.mix) {
        profile.mix.set(category, count / profile.events);
      }
    }
  } catch (err) {
    logger.warn('Cold start: pincode profiles unavailable: ' + err.message);
  }

  return profiles;
}

/** Cosine over two category-mix maps. */
function mixSimilarity(a, b) {
  if (!a || !b || a.size === 0 || b.size === 0) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const value of a.values()) normA += value * value;
  for (const value of b.values()) normB += value * value;
  for (const [key, value] of small) {
    const other = large.get(key);
    if (other !== undefined) dot += value * other;
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator > 0 ? dot / denominator : 0;
}

/**
 * Recomputes the borrowed prior for every pincode.
 *
 * Materialised rather than computed per request because the donor search is
 * quadratic in the number of pincodes and the answer changes on the order of
 * days.
 */
async function rebuildPriors({ minDonorSimilarity = 0.5, maxDonors = 5, priorStrength = 50, persist = true } = {}) {
  const started = Date.now();
  const profiles = await pincodeProfiles();

  if (profiles.size === 0) {
    return { built: false, reason: 'no_profiles', duration_ms: Date.now() - started };
  }

  const entries = [...profiles.entries()];
  const results = [];

  for (const [pincode, profile] of entries) {
    // Donors ranked by behavioural similarity, and required to have
    // substantially more data than the borrower — borrowing from a pincode
    // quieter than yourself adds noise, not information.
    const donors = entries
      .filter(([other, otherProfile]) => (
        other !== pincode
        && otherProfile.impressions > Math.max(profile.impressions * 2, 50)
      ))
      .map(([other, otherProfile]) => ({
        pincode: other,
        similarity: mixSimilarity(profile.mix, otherProfile.mix),
        clicks: otherProfile.clicks,
        impressions: otherProfile.impressions,
      }))
      .filter((donor) => donor.similarity >= minDonorSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxDonors);

    let alpha = GLOBAL_PRIOR_ALPHA;
    let beta = GLOBAL_PRIOR_BETA;

    if (donors.length > 0) {
      // Similarity-weighted pooling of the donors' rates, scaled to
      // priorStrength pseudo-observations. Scaling matters: pooling raw counts
      // from a large donor would swamp the borrower's own data entirely and the
      // shrinkage would never decay.
      let weightedClicks = 0;
      let weightedImpressions = 0;
      for (const donor of donors) {
        weightedClicks += donor.similarity * donor.clicks;
        weightedImpressions += donor.similarity * donor.impressions;
      }
      if (weightedImpressions > 0) {
        const rate = Math.min(Math.max(weightedClicks / weightedImpressions, 1e-4), 1 - 1e-4);
        alpha = rate * priorStrength;
        beta = (1 - rate) * priorStrength;
      }
    }

    const weight = shrinkage(profile.impressions, priorStrength);

    results.push({
      pincode,
      alpha,
      beta,
      shrinkage: weight,
      donors: donors.map((d) => ({ pincode: d.pincode, similarity: Math.round(d.similarity * 1000) / 1000 })),
      ownEvents: profile.impressions,
    });
  }

  if (!persist) {
    return { built: true, persisted: false, pincodes: results.length, priors: results, duration_ms: Date.now() - started };
  }

  let written = 0;
  for (const result of results) {
    try {
      const existing = await query(
        "SELECT id FROM ml_coldstart_priors WHERE pincode = $1 AND category IS NULL",
        [result.pincode]
      );
      const row = (existing.rows || existing || [])[0];

      if (row) {
        await query(
          `UPDATE ml_coldstart_priors
              SET prior_alpha = $1, prior_beta = $2, shrinkage = $3, donors = $4,
                  own_events = $5, computed_at = CURRENT_TIMESTAMP
            WHERE id = $6`,
          [result.alpha, result.beta, result.shrinkage, JSON.stringify(result.donors), result.ownEvents, row.id]
        );
      } else {
        await query(
          `INSERT INTO ml_coldstart_priors
             (id, pincode, category, prior_alpha, prior_beta, shrinkage, donors, own_events)
           VALUES ($1, $2, NULL, $3, $4, $5, $6, $7)`,
          [crypto.randomUUID(), result.pincode, result.alpha, result.beta,
            result.shrinkage, JSON.stringify(result.donors), result.ownEvents]
        );
      }
      written += 1;
    } catch (err) {
      logger.warn(`Cold start: prior write failed for ${result.pincode}: ${err.message}`);
    }
  }

  logger.info(`Cold-start priors rebuilt: ${written} pincodes, ${Date.now() - started}ms.`);
  return { built: true, persisted: true, pincodes: results.length, written, duration_ms: Date.now() - started };
}

/** The stored prior for a pincode, or the global fallback. */
async function priorFor(pincode) {
  if (!pincode) return { alpha: GLOBAL_PRIOR_ALPHA, beta: GLOBAL_PRIOR_BETA, shrinkage: 1, source: 'global' };
  try {
    const res = await query(
      'SELECT prior_alpha, prior_beta, shrinkage, donors FROM ml_coldstart_priors WHERE pincode = $1 AND category IS NULL LIMIT 1',
      [String(pincode)]
    );
    const row = (res.rows || res || [])[0];
    if (!row) return { alpha: GLOBAL_PRIOR_ALPHA, beta: GLOBAL_PRIOR_BETA, shrinkage: 1, source: 'global' };
    return {
      alpha: Number(row.prior_alpha) || GLOBAL_PRIOR_ALPHA,
      beta: Number(row.prior_beta) || GLOBAL_PRIOR_BETA,
      shrinkage: Number(row.shrinkage),
      donors: row.donors ? JSON.parse(row.donors) : [],
      source: 'transferred',
    };
  } catch {
    return { alpha: GLOBAL_PRIOR_ALPHA, beta: GLOBAL_PRIOR_BETA, shrinkage: 1, source: 'global' };
  }
}

/**
 * Identifies which candidates are cold, and how uncertain each one is.
 *
 * "Cold" is about evidence, not age: a shop listed a year ago that nobody has
 * ever clicked is exactly as unknown as one listed this morning, and excluding
 * it because it is old would leave it permanently unranked. Age is used only to
 * bound how long a merchant keeps the *grace* the exploration budget grants.
 */
async function assess(candidates, { graceDays = 30, pincode = null } = {}) {
  const out = new Map();
  if (!Array.isArray(candidates) || candidates.length === 0) return out;

  const ids = candidates.map((c) => String(c.id));
  const stats = new Map();

  try {
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const res = await query(
      `SELECT item_id,
              SUM(CASE WHEN event_type = 'IMPRESSION' THEN 1 ELSE 0 END) AS impressions,
              SUM(CASE WHEN event_type = 'CARD_CLICK' THEN 1 ELSE 0 END) AS clicks
         FROM ml_interaction_events
        WHERE item_type = 'shop' AND item_id IN (${placeholders})
        GROUP BY item_id`,
      ids
    );
    for (const row of res.rows || res || []) {
      stats.set(String(row.item_id), {
        impressions: Number(row.impressions) || 0,
        clicks: Number(row.clicks) || 0,
      });
    }
  } catch (err) {
    logger.warn('Cold start: candidate history unavailable: ' + err.message);
  }

  const prior = await priorFor(pincode);

  for (const candidate of candidates) {
    const id = String(candidate.id);
    const history = stats.get(id) || { impressions: 0, clicks: 0 };

    const created = candidate.created_at
      ? new Date(String(candidate.created_at).replace(' ', 'T')).getTime()
      : null;
    const ageDays = Number.isFinite(created) ? (Date.now() - created) / 86400000 : Infinity;

    const post = posterior(history.clicks, history.impressions, prior);

    out.set(id, {
      impressions: history.impressions,
      clicks: history.clicks,
      age_days: ageDays,
      within_grace: ageDays <= graceDays,
      estimated_rate: post.mean,
      uncertainty: post.std,
      alpha: post.alpha,
      beta: post.beta,
      prior_source: prior.source,
      // Cold means little evidence. The threshold is in impressions rather than
      // days for the reason above.
      is_cold: history.impressions < 50,
    });
  }

  return out;
}

/**
 * Selects which cold merchants get the reserved slots, by Thompson sampling.
 *
 * Thompson rather than a plain "least shown" ordering because it spends the
 * budget where it can change a decision. A merchant whose rate is already
 * confidently low is not worth another slot; one whose posterior is wide might
 * be excellent, and sampling from the posterior picks it in proportion to the
 * probability that it is. The exploration slots in ranker.service.js cannot
 * express that, which is why this is a separate mechanism rather than a tweak
 * to theirs.
 */
function selectExploration(assessments, budgetSlots, { random = Math.random } = {}) {
  if (budgetSlots <= 0) return [];

  const eligible = [...assessments.entries()]
    .filter(([, assessment]) => assessment.is_cold && assessment.within_grace);
  if (eligible.length === 0) return [];

  const sampled = eligible.map(([id, assessment]) => ({
    id,
    draw: sampleBeta(assessment.alpha, assessment.beta, random),
    assessment,
  }));

  sampled.sort((a, b) => b.draw - a.draw);
  return sampled.slice(0, budgetSlots).map((entry) => ({
    id: entry.id,
    sampled_rate: entry.draw,
    uncertainty: entry.assessment.uncertainty,
  }));
}

/**
 * The cold-start score contributed to ranking.
 *
 * The shrunk posterior mean, scaled by how much of it is borrowed. A merchant
 * whose estimate is entirely prior gets a muted score — it is a guess, and
 * ranking should treat it as one — while a merchant with real data of its own
 * gets the full value. This is the same confidence ramp the collaborative term
 * uses, applied to a different quantity.
 */
function coldStartScore(assessment) {
  if (!assessment) return 0;
  const evidenceWeight = 1 - shrinkage(assessment.impressions, 50);
  // Rates are small, so the estimate is rescaled against a reference rate to
  // land in a usable 0..1 band rather than clustering near zero where the
  // configured weight would have to be enormous to matter.
  const scaled = Math.min(assessment.estimated_rate / 0.2, 1);
  return scaled * (0.4 + 0.6 * evidenceWeight);
}

async function stats() {
  try {
    const res = await query(
      `SELECT COUNT(*) AS pincodes, AVG(shrinkage) AS avg_shrinkage,
              SUM(CASE WHEN shrinkage > 0.5 THEN 1 ELSE 0 END) AS mostly_borrowed,
              MAX(computed_at) AS computed_at
         FROM ml_coldstart_priors`
    );
    const row = (res.rows || res || [])[0] || {};
    return {
      pincodes: Number(row.pincodes) || 0,
      avg_shrinkage: row.avg_shrinkage != null ? Number(row.avg_shrinkage) : null,
      mostly_borrowed: Number(row.mostly_borrowed) || 0,
      computed_at: row.computed_at || null,
    };
  } catch (err) {
    return { pincodes: 0, error: err.message };
  }
}

/**
 * How quickly new merchants reach their first booking, by cohort.
 *
 * The outcome measure for this whole module. Everything above is a mechanism;
 * this is whether the mechanism worked, and it is what the admin tab shows.
 */
async function cohortConversion({ windowDays = 90 } = {}) {
  const cutoff = new Date(Date.now() - windowDays * 86400000)
    .toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

  try {
    const res = await query(
      `SELECT s.id AS shop_id, s.created_at AS listed_at,
              MIN(e.created_at) AS first_booking
         FROM local_shops s
    LEFT JOIN ml_interaction_events e
           ON e.item_id = s.id
          AND e.item_type = 'shop'
          AND e.event_type IN ('CALL_VENDOR', 'PURCHASE_INTENT')
        WHERE s.created_at >= $1
        GROUP BY s.id, s.created_at`,
      [cutoff]
    );

    const buckets = { within_7: 0, within_14: 0, within_30: 0, never: 0, total: 0 };

    for (const row of res.rows || res || []) {
      buckets.total += 1;
      if (!row.first_booking) {
        buckets.never += 1;
        continue;
      }
      const listed = new Date(String(row.listed_at).replace(' ', 'T')).getTime();
      const first = new Date(String(row.first_booking).replace(' ', 'T')).getTime();
      if (!Number.isFinite(listed) || !Number.isFinite(first)) continue;
      const days = (first - listed) / 86400000;
      if (days <= 7) buckets.within_7 += 1;
      if (days <= 14) buckets.within_14 += 1;
      if (days <= 30) buckets.within_30 += 1;
    }

    return {
      window_days: windowDays,
      ...buckets,
      rate_within_7: buckets.total > 0 ? buckets.within_7 / buckets.total : null,
      rate_within_30: buckets.total > 0 ? buckets.within_30 / buckets.total : null,
    };
  } catch (err) {
    return { window_days: windowDays, total: 0, error: err.message };
  }
}

module.exports = {
  assess,
  coldStartScore,
  selectExploration,
  rebuildPriors,
  priorFor,
  pincodeProfiles,
  mixSimilarity,
  fitContentBridge,
  shrinkage,
  posterior,
  sampleBeta,
  sampleGamma,
  cohortConversion,
  stats,
  GLOBAL_PRIOR_ALPHA,
  GLOBAL_PRIOR_BETA,
};
