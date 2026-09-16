/**
 * Causal uplift: who converts *because* they were promoted.
 *
 * Every scorer in this system predicts engagement. That is the wrong objective
 * for a promotion budget, and the reason is easy to state and easy to miss: the
 * merchants most likely to be clicked when promoted are largely the merchants
 * that would have been clicked anyway. Spending the promoted slot on them buys
 * a click that was already coming. The dashboard shows the promoted slots
 * converting beautifully, and the incremental return is near zero.
 *
 * What a promotion should optimise is the *difference* — the probability of
 * conversion if promoted minus the probability if not. That quantity is never
 * observed for any single merchant, because each one is either promoted or not.
 * It has to be estimated.
 *
 * ── The X-learner ──────────────────────────────────────────────────────────
 *
 * Four models and a propensity model:
 *
 *   1. mu0(x): outcome among the untreated.
 *   2. mu1(x): outcome among the treated.
 *   3. For each treated unit, the imputed effect D1 = y − mu0(x); regress it on
 *      x to get tau1(x).
 *   4. For each control unit, the imputed effect D0 = mu1(x) − y; regress it on
 *      x to get tau0(x).
 *   5. Combine: tau(x) = g(x)·tau0(x) + (1 − g(x))·tau1(x), with g the
 *      propensity.
 *
 * The weighting in step 5 is what makes this an X-learner rather than a
 * two-model approach, and it is the part that matters on this platform's data.
 * Promotion is not randomly assigned here — a tiny treated group produces a
 * noisy tau1, and weighting by propensity leans on tau0, which was fitted on
 * the plentiful control data. A plain difference of two models would inherit
 * the noise of whichever group is smaller.
 *
 * ── The honest caveat, stated rather than buried ───────────────────────────
 *
 * Treatment here is observational: `is_promoted` and the exploration flag are
 * not randomised assignments. The propensity model adjusts for the features it
 * can see, which removes confounding only to the extent that the confounders
 * are among those features. If merchants are promoted for a reason not captured
 * in the feature vector, the estimate is biased and no amount of modelling
 * fixes it.
 *
 * That is why `ml_uplift_enabled` defaults to off, why the Qini curve is
 * computed and surfaced rather than a single headline number, and why the
 * exploration slots — which *are* randomised — are the treatment signal worth
 * building toward. The right use of this module today is to read its Qini curve
 * before deciding whether to trust it, not to switch it on.
 */

const crypto = require('crypto');
const { query } = require('../../../config/database');
const logger = require('../../../config/logger');

/**
 * Ridge-regularised logistic regression, fitted by gradient descent.
 *
 * Logistic rather than linear because every outcome here is binary and a linear
 * probability model predicts outside [0, 1] — which for mu0 and mu1 produces
 * imputed effects greater than 1 or less than −1, and those propagate into tau
 * as confident nonsense.
 *
 * The regularisation is not optional. The treated group is small, and an
 * unregularised fit on a small group with correlated features produces enormous
 * coefficients that fit the noise exactly.
 */
class LogisticModel {
  constructor(dimension, { l2 = 1.0 } = {}) {
    this.dimension = dimension;
    this.l2 = l2;
    this.weights = new Float64Array(dimension);
    this.bias = 0;
  }

  static sigmoid(z) {
    // Branching rather than the naive form: exp of a large positive number
    // overflows, and the two branches are algebraically identical.
    if (z >= 0) {
      const e = Math.exp(-z);
      return 1 / (1 + e);
    }
    const e = Math.exp(z);
    return e / (1 + e);
  }

  predict(x) {
    let z = this.bias;
    for (let i = 0; i < this.dimension; i += 1) z += this.weights[i] * x[i];
    return LogisticModel.sigmoid(z);
  }

  fit(X, y, { epochs = 200, learningRate = 0.1, sampleWeights = null } = {}) {
    const n = X.length;
    if (n === 0) return this;

    for (let epoch = 0; epoch < epochs; epoch += 1) {
      const gradW = new Float64Array(this.dimension);
      let gradB = 0;
      let totalWeight = 0;

      for (let i = 0; i < n; i += 1) {
        const weight = sampleWeights ? sampleWeights[i] : 1;
        if (weight === 0) continue;
        totalWeight += weight;

        const error = this.predict(X[i]) - y[i];
        gradB += weight * error;
        for (let d = 0; d < this.dimension; d += 1) gradW[d] += weight * error * X[i][d];
      }

      if (totalWeight === 0) break;
      const scale = 1 / totalWeight;

      this.bias -= learningRate * gradB * scale;
      for (let d = 0; d < this.dimension; d += 1) {
        // The bias is deliberately not regularised: shrinking it toward zero
        // pulls the predicted base rate toward 0.5, which on data with a 5%
        // conversion rate is a large and entirely artificial distortion.
        this.weights[d] -= learningRate * (gradW[d] * scale + this.l2 * this.weights[d] / n);
      }
    }

    return this;
  }

  toJSON() {
    return { weights: Array.from(this.weights), bias: this.bias, l2: this.l2 };
  }

  static fromJSON(data, dimension) {
    const model = new LogisticModel(dimension, { l2: data.l2 });
    model.weights = Float64Array.from(data.weights);
    model.bias = data.bias;
    return model;
  }
}

/**
 * Ridge regression for the imputed-effect stage.
 *
 * Imputed effects live in [−1, 1] and are continuous, so this stage is linear
 * rather than logistic. Solved in closed form by Gaussian elimination on the
 * normal equations: the dimension is small, the solution is exact, and there is
 * no learning rate to get wrong.
 */
class RidgeModel {
  constructor(dimension, { l2 = 1.0 } = {}) {
    this.dimension = dimension;
    this.l2 = l2;
    this.weights = new Float64Array(dimension);
    this.bias = 0;
  }

  predict(x) {
    let sum = this.bias;
    for (let i = 0; i < this.dimension; i += 1) sum += this.weights[i] * x[i];
    return sum;
  }

  fit(X, y) {
    const n = X.length;
    const d = this.dimension;
    if (n === 0) return this;

    // Centre both sides so the intercept is the mean and does not have to be
    // regularised alongside the coefficients.
    const meanX = new Float64Array(d);
    for (const row of X) for (let i = 0; i < d; i += 1) meanX[i] += row[i] / n;
    let meanY = 0;
    for (const value of y) meanY += value / n;

    // Normal equations: (XᵀX + λI) w = Xᵀy, on centred data.
    const A = [];
    for (let i = 0; i < d; i += 1) A.push(new Float64Array(d + 1));

    for (let r = 0; r < n; r += 1) {
      const row = X[r];
      const yc = y[r] - meanY;
      for (let i = 0; i < d; i += 1) {
        const xi = row[i] - meanX[i];
        for (let j = 0; j < d; j += 1) A[i][j] += xi * (row[j] - meanX[j]);
        A[i][d] += xi * yc;
      }
    }
    for (let i = 0; i < d; i += 1) A[i][i] += this.l2;

    // Gaussian elimination with partial pivoting.
    for (let col = 0; col < d; col += 1) {
      let pivot = col;
      for (let r = col + 1; r < d; r += 1) {
        if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
      }
      if (Math.abs(A[pivot][col]) < 1e-12) continue; // Singular even with ridge.
      if (pivot !== col) {
        const swap = A[col];
        A[col] = A[pivot];
        A[pivot] = swap;
      }
      const diagonal = A[col][col];
      for (let j = col; j <= d; j += 1) A[col][j] /= diagonal;
      for (let r = 0; r < d; r += 1) {
        if (r === col) continue;
        const factor = A[r][col];
        if (factor === 0) continue;
        for (let j = col; j <= d; j += 1) A[r][j] -= factor * A[col][j];
      }
    }

    for (let i = 0; i < d; i += 1) this.weights[i] = A[i][d];

    this.bias = meanY;
    for (let i = 0; i < d; i += 1) this.bias -= this.weights[i] * meanX[i];

    return this;
  }

  toJSON() {
    return { weights: Array.from(this.weights), bias: this.bias, l2: this.l2 };
  }

  static fromJSON(data, dimension) {
    const model = new RidgeModel(dimension, { l2: data.l2 });
    model.weights = Float64Array.from(data.weights);
    model.bias = data.bias;
    return model;
  }
}

/**
 * The Qini curve.
 *
 * Units sorted by predicted uplift, descending. At each prefix, the cumulative
 * incremental conversions the targeting achieved:
 *
 *     Q(k) = Y1(k) − Y0(k) · N1(k)/N0(k)
 *
 * The scaling term is what makes the two arms comparable when they are
 * different sizes, which observational treatment groups always are.
 *
 * A curve that rises steeply and then flattens means the model concentrates the
 * persuadable units at the top, which is the only thing a targeting model is
 * for. A curve that tracks the diagonal means the predictions carry no
 * information about who is persuadable, whatever their AUC against conversion.
 */
function qiniCurve(predictions, treatments, outcomes, { points = 20 } = {}) {
  const n = predictions.length;
  if (n === 0) return { curve: [], auuc: 0, n: 0 };

  const order = Array.from({ length: n }, (_, i) => i)
    .sort((a, b) => predictions[b] - predictions[a]);

  const curve = [];
  let treated = 0;
  let control = 0;
  let treatedConversions = 0;
  let controlConversions = 0;

  const stride = Math.max(1, Math.floor(n / points));

  for (let rank = 0; rank < n; rank += 1) {
    const i = order[rank];
    if (treatments[i]) {
      treated += 1;
      treatedConversions += outcomes[i];
    } else {
      control += 1;
      controlConversions += outcomes[i];
    }

    if ((rank + 1) % stride === 0 || rank === n - 1) {
      const scaled = control > 0 ? controlConversions * (treated / control) : 0;
      curve.push({
        fraction: (rank + 1) / n,
        targeted: rank + 1,
        incremental: treatedConversions - scaled,
        treated,
        control,
      });
    }
  }

  // Area between the Qini curve and the random-targeting diagonal, by the
  // trapezoidal rule. Positive means the model beats targeting at random;
  // negative means it is actively worse than random, which is a real and
  // important outcome to be able to report.
  const total = curve.length > 0 ? curve[curve.length - 1].incremental : 0;
  let area = 0;
  let previous = { fraction: 0, incremental: 0 };
  for (const point of curve) {
    const width = point.fraction - previous.fraction;
    area += width * (point.incremental + previous.incremental) / 2;
    previous = point;
  }
  const randomArea = total / 2;

  return {
    curve,
    auuc: area - randomArea,
    total_incremental: total,
    n,
  };
}

/** The features the model is fitted on, in a fixed order. */
const FEATURE_NAMES = Object.freeze([
  'log_impressions',
  'ctr',
  'rating',
  'log_reviews',
  'distance_km',
  'age_days',
  'is_verified',
]);

function featureVector(row) {
  const impressions = Number(row.impressions) || 0;
  const clicks = Number(row.clicks) || 0;
  return [
    Math.log1p(impressions),
    impressions > 0 ? clicks / impressions : 0,
    (Number(row.rating) || 0) / 5,
    Math.log1p(Number(row.review_count) || 0),
    Math.min((Number(row.distance_km) || 0) / 10, 1),
    Math.min((Number(row.age_days) || 0) / 365, 1),
    row.is_verified ? 1 : 0,
  ];
}

class UpliftModel {
  constructor(dimension = FEATURE_NAMES.length, { l2 = 1.0 } = {}) {
    this.dimension = dimension;
    this.mu0 = new LogisticModel(dimension, { l2 });
    this.mu1 = new LogisticModel(dimension, { l2 });
    this.tau0 = new RidgeModel(dimension, { l2 });
    this.tau1 = new RidgeModel(dimension, { l2 });
    this.propensity = new LogisticModel(dimension, { l2 });
    this.fitted = false;
  }

  /**
   * Fits all five components.
   *
   * Returns diagnostics rather than throwing when a group is too small: a
   * platform that has barely promoted anything yet is the normal early state,
   * and the honest response is to report that the estimate is not yet
   * trustworthy, not to refuse or to fit on four rows and pretend.
   */
  fit(X, treatments, outcomes, { epochs = 300, learningRate = 0.2, minGroup = 20 } = {}) {
    const treatedIdx = [];
    const controlIdx = [];
    treatments.forEach((t, i) => (t ? treatedIdx : controlIdx).push(i));

    const diagnostics = {
      n: X.length,
      n_treated: treatedIdx.length,
      n_control: controlIdx.length,
      min_group: minGroup,
      sufficient: treatedIdx.length >= minGroup && controlIdx.length >= minGroup,
    };

    if (!diagnostics.sufficient) {
      this.fitted = false;
      return diagnostics;
    }

    this.propensity.fit(X, treatments.map((t) => (t ? 1 : 0)), { epochs, learningRate });

    const X0 = controlIdx.map((i) => X[i]);
    const y0 = controlIdx.map((i) => outcomes[i]);
    const X1 = treatedIdx.map((i) => X[i]);
    const y1 = treatedIdx.map((i) => outcomes[i]);

    this.mu0.fit(X0, y0, { epochs, learningRate });
    this.mu1.fit(X1, y1, { epochs, learningRate });

    // Imputed treatment effects. For a treated unit, what it did minus what the
    // control model says it would have done; for a control unit, the reverse.
    const D1 = X1.map((x, i) => y1[i] - this.mu0.predict(x));
    const D0 = X0.map((x, i) => this.mu1.predict(x) - y0[i]);

    this.tau1.fit(X1, D1);
    this.tau0.fit(X0, D0);

    this.fitted = true;
    diagnostics.base_rate_treated = y1.reduce((s, v) => s + v, 0) / y1.length;
    diagnostics.base_rate_control = y0.reduce((s, v) => s + v, 0) / y0.length;
    // The naive difference in means, for comparison. When the X-learner's
    // average estimate diverges wildly from this, the features are doing a lot
    // of work and the result deserves scepticism.
    diagnostics.naive_ate = diagnostics.base_rate_treated - diagnostics.base_rate_control;

    return diagnostics;
  }

  /** Estimated conditional average treatment effect for one unit. */
  estimate(x) {
    if (!this.fitted) return 0;
    const g = this.propensity.predict(x);
    // Clamped away from the extremes. A propensity of 0.999 gives one estimator
    // essentially all the weight, and that estimator was fitted on the group
    // this unit is least like — the classic positivity violation, and it shows
    // up as a handful of enormous uplift estimates rather than as an error.
    const weight = Math.min(Math.max(g, 0.05), 0.95);
    return weight * this.tau0.predict(x) + (1 - weight) * this.tau1.predict(x);
  }

  toJSON() {
    return {
      format: 'uplift/1',
      dimension: this.dimension,
      fitted: this.fitted,
      mu0: this.mu0.toJSON(),
      mu1: this.mu1.toJSON(),
      tau0: this.tau0.toJSON(),
      tau1: this.tau1.toJSON(),
      propensity: this.propensity.toJSON(),
    };
  }

  static fromJSON(data) {
    if (!data || data.format !== 'uplift/1') {
      throw new Error('Unrecognised uplift model format; refit rather than load.');
    }
    const model = new UpliftModel(data.dimension);
    model.mu0 = LogisticModel.fromJSON(data.mu0, data.dimension);
    model.mu1 = LogisticModel.fromJSON(data.mu1, data.dimension);
    model.tau0 = RidgeModel.fromJSON(data.tau0, data.dimension);
    model.tau1 = RidgeModel.fromJSON(data.tau1, data.dimension);
    model.propensity = LogisticModel.fromJSON(data.propensity, data.dimension);
    model.fitted = Boolean(data.fitted);
    return model;
  }
}

/**
 * Assembles the training log.
 *
 * One row per (shop, day): what it looked like, whether it was promoted, and
 * whether it converted. Treatment is the exploration flag where present — those
 * slots are assigned by the ranker rather than by merit, which is the closest
 * thing to a randomised assignment this platform produces — falling back to the
 * promoted flag.
 */
async function loadTrainingLog({ windowDays = 90, limit = 50000 } = {}) {
  const cutoff = new Date(Date.now() - windowDays * 86400000)
    .toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

  try {
    const res = await query(
      `SELECT e.item_id AS item_id,
              SUM(CASE WHEN e.event_type = 'IMPRESSION' THEN 1 ELSE 0 END) AS impressions,
              SUM(CASE WHEN e.event_type = 'CARD_CLICK' THEN 1 ELSE 0 END) AS clicks,
              MAX(CASE WHEN e.is_exploration = 1 THEN 1 ELSE 0 END)        AS explored,
              MAX(CASE WHEN e.event_type IN ('CALL_VENDOR', 'PURCHASE_INTENT')
                       THEN 1 ELSE 0 END)                                  AS converted,
              s.rating       AS rating,
              s.is_verified  AS is_verified,
              s.is_promoted  AS is_promoted,
              s.created_at   AS created_at,
              (SELECT COUNT(*) FROM shop_reviews r WHERE r.shop_id = s.id) AS review_count
         FROM ml_interaction_events e
         JOIN local_shops s ON s.id = e.item_id
        WHERE e.item_type = 'shop' AND e.created_at >= $1
        GROUP BY e.item_id
        LIMIT $2`,
      [cutoff, limit]
    );

    const rows = res.rows || res || [];
    const X = [];
    const treatments = [];
    const outcomes = [];
    const ids = [];

    for (const row of rows) {
      const created = new Date(String(row.created_at).replace(' ', 'T')).getTime();
      X.push(featureVector({
        ...row,
        age_days: Number.isFinite(created) ? (Date.now() - created) / 86400000 : 0,
        distance_km: 0,
      }));
      // Exploration is the better treatment variable because it is assigned by
      // the ranker rather than earned; is_promoted is a fallback and carries
      // every confounder an editor's judgement introduces.
      treatments.push(Number(row.explored) === 1 || Number(row.is_promoted) === 1);
      outcomes.push(Number(row.converted) || 0);
      ids.push(String(row.item_id));
    }

    return { X, treatments, outcomes, ids, rows: rows.length };
  } catch (err) {
    logger.warn('Uplift: training log unavailable: ' + err.message);
    return { X: [], treatments: [], outcomes: [], ids: [], rows: 0 };
  }
}

/** Fits from the log and stores the result as the active version. */
async function trainFromLog({ windowDays = 90, persist = true } = {}) {
  const started = Date.now();
  const log = await loadTrainingLog({ windowDays });

  if (log.rows === 0) return { trained: false, reason: 'no_history' };

  const model = new UpliftModel();
  const diagnostics = model.fit(log.X, log.treatments, log.outcomes);

  if (!diagnostics.sufficient) {
    return {
      trained: false,
      reason: 'insufficient_treatment_variation',
      diagnostics,
      duration_ms: Date.now() - started,
    };
  }

  const predictions = log.X.map((x) => model.estimate(x));
  const qini = qiniCurve(predictions, log.treatments, log.outcomes);

  const metrics = {
    ...diagnostics,
    qini: qini.curve,
    auuc: qini.auuc,
    total_incremental: qini.total_incremental,
    duration_ms: Date.now() - started,
  };

  if (!persist) return { trained: true, persisted: false, model, metrics };

  try {
    const versionRes = await query('SELECT MAX(version) AS v FROM ml_uplift_model');
    const version = (Number((versionRes.rows || versionRes || [])[0]?.v) || 0) + 1;

    await query('UPDATE ml_uplift_model SET is_active = 0 WHERE is_active = 1');
    await query(
      `INSERT INTO ml_uplift_model (id, version, is_active, feature_names, weights, metrics)
       VALUES ($1, $2, 1, $3, $4, $5)`,
      [
        crypto.randomUUID(),
        version,
        JSON.stringify(FEATURE_NAMES),
        JSON.stringify(model.toJSON()),
        JSON.stringify(metrics),
      ]
    );

    invalidate();
    logger.info(`Uplift model v${version} active: AUUC ${qini.auuc.toFixed(3)} over ${log.rows} units.`);
    return { trained: true, persisted: true, version, metrics };
  } catch (err) {
    logger.error('Uplift: could not persist: ' + err.message);
    return { trained: true, persisted: false, reason: 'persist_failed', error: err.message, metrics };
  }
}

let active = null;

async function loadActive({ force = false } = {}) {
  if (!force && active) return active;
  try {
    const res = await query(
      'SELECT version, weights, metrics FROM ml_uplift_model WHERE is_active = 1 LIMIT 1'
    );
    const row = (res.rows || res || [])[0];
    if (!row) {
      active = null;
      return null;
    }
    active = {
      model: UpliftModel.fromJSON(JSON.parse(row.weights)),
      version: row.version,
      metrics: row.metrics ? JSON.parse(row.metrics) : null,
      loadedAt: Date.now(),
    };
    return active;
  } catch (err) {
    logger.warn('Uplift: load failed, term will be inert: ' + err.message);
    active = null;
    return null;
  }
}

/**
 * Uplift multipliers for a ranked candidate set.
 *
 * Returned as a multiplier around 1 rather than an additive term, bounded by
 * `strength`. Additive would make the uplift term's influence depend on the
 * absolute scale of scores, which differs between the weighted-sum and
 * multi-task rankers — the same configuration would then mean two different
 * things depending on which ranker was active.
 */
async function multipliers(candidates, { strength = 0.5 } = {}) {
  const out = new Map();
  const state = await loadActive();
  if (!state || !state.model.fitted || strength <= 0) return out;

  const estimates = [];
  for (const candidate of candidates) {
    const x = featureVector({
      impressions: candidate._impressions || 0,
      clicks: candidate._clicks || 0,
      rating: candidate.rating,
      review_count: candidate.review_count ?? candidate.total_ratings ?? 0,
      distance_km: candidate._distance_km || 0,
      age_days: candidate.created_at
        ? (Date.now() - new Date(String(candidate.created_at).replace(' ', 'T')).getTime()) / 86400000
        : 0,
      is_verified: candidate.is_verified,
    });
    estimates.push({ id: candidate.id, tau: state.model.estimate(x) });
  }

  // Normalised across this candidate set, so the multiplier means the same
  // thing whatever the absolute scale of the estimates on a given day.
  const taus = estimates.map((e) => e.tau);
  const min = Math.min(...taus);
  const max = Math.max(...taus);
  const range = max - min;

  for (const { id, tau } of estimates) {
    const normalised = range > 0 ? (tau - min) / range : 0.5;
    // Spans [1 − strength, 1 + strength], centred at 1 so a candidate of
    // average uplift is unaffected.
    out.set(id, 1 + strength * (2 * normalised - 1));
  }

  return out;
}

function invalidate() {
  active = null;
}

async function stats() {
  const state = await loadActive();
  if (!state) return { active: false };
  return {
    active: true,
    version: state.version,
    fitted: state.model.fitted,
    features: FEATURE_NAMES,
    metrics: state.metrics,
  };
}

module.exports = {
  UpliftModel,
  LogisticModel,
  RidgeModel,
  qiniCurve,
  featureVector,
  loadTrainingLog,
  trainFromLog,
  loadActive,
  multipliers,
  invalidate,
  stats,
  FEATURE_NAMES,
};
