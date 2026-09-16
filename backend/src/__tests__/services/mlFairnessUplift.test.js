/**
 * Exposure fairness and causal uplift.
 *
 * Both modules make claims that cannot be checked by inspection. Fairness
 * claims it never spends more relevance than the configured budget; uplift
 * claims it recovers who is persuadable rather than who is likely to convert.
 * Both are tested against ground truth that is constructed rather than
 * observed — a synthetic population where the true treatment effect is known,
 * and orderings where the NDCG can be computed exactly.
 */

process.env.USE_SQLITE = 'true';

const fairness = require('../../modules/ml/fairness/exposureFairness');
const uplift = require('../../modules/ml/causal/upliftModel');
const { seededRandom } = require('../../modules/ml/vector/hnsw');

describe('DCG and NDCG', () => {
  test('NDCG of the ideal ordering is 1', () => {
    const items = [{ id: 'a', _score: 5 }, { id: 'b', _score: 3 }, { id: 'c', _score: 1 }];
    expect(fairness.ndcg(items, (i) => i._score)).toBeCloseTo(1, 12);
  });

  test('reversing the ordering costs NDCG', () => {
    const items = [{ id: 'a', _score: 5 }, { id: 'b', _score: 3 }, { id: 'c', _score: 1 }];
    const reversed = [...items].reverse();
    expect(fairness.ndcg(reversed, (i) => i._score)).toBeLessThan(1);
  });

  test('swapping the top two costs more than swapping positions nine and ten', () => {
    // The logarithmic discount is the reason fairness has a cost at all. If
    // this failed, every position would be worth the same and the budget would
    // be meaningless.
    const base = Array.from({ length: 10 }, (_, i) => ({ id: `s${i}`, _score: 10 - i }));

    const topSwap = [...base];
    [topSwap[0], topSwap[1]] = [topSwap[1], topSwap[0]];

    const tailSwap = [...base];
    [tailSwap[8], tailSwap[9]] = [tailSwap[9], tailSwap[8]];

    const relevance = (i) => i._score;
    expect(fairness.ndcg(topSwap, relevance)).toBeLessThan(fairness.ndcg(tailSwap, relevance));
  });

  test('handles negative scores, which an override multiplier can produce', () => {
    const items = [{ id: 'a', _score: 2 }, { id: 'b', _score: -1 }, { id: 'c', _score: -5 }];
    const score = fairness.ndcg(items, (i) => i._score);
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeCloseTo(1, 12);
  });

  test('an all-equal ordering is perfect, because no ordering is worse', () => {
    const items = [{ id: 'a', _score: 1 }, { id: 'b', _score: 1 }];
    expect(fairness.ndcg(items, (i) => i._score)).toBe(1);
  });
});

describe('Gini', () => {
  test('a perfectly equal split is 0', () => {
    expect(fairness.gini([10, 10, 10, 10])).toBeCloseTo(0, 10);
  });

  test('one merchant taking everything approaches 1', () => {
    expect(fairness.gini([0, 0, 0, 100])).toBeGreaterThan(0.7);
  });

  test('rises as the distribution concentrates', () => {
    const even = fairness.gini([25, 25, 25, 25]);
    const skewed = fairness.gini([1, 4, 15, 80]);
    expect(skewed).toBeGreaterThan(even);
  });

  test('an empty distribution is null rather than zero', () => {
    // Zero would report perfect equality for a market with no data in it.
    expect(fairness.gini([])).toBeNull();
  });

  test('all-zero exposure is equal, not undefined', () => {
    expect(fairness.gini([0, 0, 0])).toBe(0);
  });
});

describe('fairness re-ranking', () => {
  /** Ten merchants, descending relevance, with the last three heavily owed. */
  function scenario() {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: `s${i}`, _score: 10 - i }));
    const deficits = new Map([['s7', 40], ['s8', 55], ['s9', 70]]);
    return { items, deficits };
  }

  test('never spends more relevance than the budget allows', () => {
    const { items, deficits } = scenario();
    for (const budget of [0, 0.01, 0.02, 0.05, 0.1, 0.3]) {
      const result = fairness.rerank(items, {
        deficits,
        strength: 1,
        maxNdcgLoss: budget,
      });
      // The constraint the whole module rests on: an operator who drags the
      // slider to maximum gets the most fairness available for the relevance
      // they agreed to spend, never more.
      expect(result.ndcg_loss).toBeLessThanOrEqual(budget + 1e-9);
    }
  });

  test('a zero budget returns the pure relevance ordering', () => {
    const { items, deficits } = scenario();
    const result = fairness.rerank(items, { deficits, strength: 1, maxNdcgLoss: 0 });
    expect(result.items.map((i) => i.id)).toEqual(items.map((i) => i.id));
    expect(result.moved).toBe(0);
  });

  test('a generous budget actually promotes the owed merchants', () => {
    // The complement. Without it, a re-ranker that always returned the
    // relevance ordering would satisfy every budget assertion above.
    const { items, deficits } = scenario();
    const result = fairness.rerank(items, { deficits, strength: 1, maxNdcgLoss: 0.4 });

    const baselinePosition = 9;
    const newPosition = result.items.findIndex((i) => i.id === 's9');
    expect(newPosition).toBeLessThan(baselinePosition);
    expect(result.moved).toBeGreaterThan(0);
    expect(result.applied_strength).toBeGreaterThan(0);
  });

  test('a larger budget permits at least as much correction as a smaller one', () => {
    const { items, deficits } = scenario();
    const tight = fairness.rerank(items, { deficits, strength: 1, maxNdcgLoss: 0.02 });
    const loose = fairness.rerank(items, { deficits, strength: 1, maxNdcgLoss: 0.25 });
    expect(loose.applied_strength).toBeGreaterThanOrEqual(tight.applied_strength);
  });

  test('strength zero is a no-op whatever the deficits', () => {
    const { items, deficits } = scenario();
    const result = fairness.rerank(items, { deficits, strength: 0, maxNdcgLoss: 0.5 });
    expect(result.items.map((i) => i.id)).toEqual(items.map((i) => i.id));
  });

  test('no deficits means nothing to correct', () => {
    const { items } = scenario();
    const result = fairness.rerank(items, { deficits: new Map(), strength: 1, maxNdcgLoss: 0.5 });
    expect(result.items.map((i) => i.id)).toEqual(items.map((i) => i.id));
  });

  test('reports how far the worst-affected merchant actually moved', () => {
    // NDCG loss can be small while one merchant drops several places, and the
    // merchant experiences the second number, not the first.
    const { items, deficits } = scenario();
    const result = fairness.rerank(items, { deficits, strength: 1, maxNdcgLoss: 0.4 });
    expect(result.max_move).toBeGreaterThan(0);
    expect(result.max_move).toBeLessThanOrEqual(items.length);
  });

  test('a single item or an empty list is returned untouched', () => {
    expect(fairness.rerank([]).items).toEqual([]);
    const one = [{ id: 'only', _score: 1 }];
    expect(fairness.rerank(one).items).toEqual(one);
  });

  test('negative deficits — a merchant already over-served — do not promote', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, _score: 5 - i }));
    const deficits = new Map([['s0', -100]]);
    const result = fairness.rerank(items, { deficits, strength: 1, maxNdcgLoss: 0.5 });
    // s0 is both most relevant and over-served; it must not be demoted for
    // being over-served, because the deficit floor is zero.
    expect(result.items[0].id).toBe('s0');
  });
});

describe('logistic and ridge components', () => {
  test('sigmoid does not overflow at extreme inputs', () => {
    expect(uplift.LogisticModel.sigmoid(1000)).toBeCloseTo(1, 10);
    expect(uplift.LogisticModel.sigmoid(-1000)).toBeCloseTo(0, 10);
    expect(Number.isFinite(uplift.LogisticModel.sigmoid(1e308))).toBe(true);
  });

  test('logistic regression recovers a separable boundary', () => {
    const X = [];
    const y = [];
    for (let i = 0; i < 200; i += 1) {
      const value = (i / 200) * 2 - 1;
      X.push([value]);
      y.push(value > 0 ? 1 : 0);
    }
    const model = new uplift.LogisticModel(1, { l2: 0.01 }).fit(X, y, { epochs: 1500, learningRate: 1 });
    expect(model.predict([0.8])).toBeGreaterThan(0.6);
    expect(model.predict([-0.8])).toBeLessThan(0.4);
  });

  test('ridge regression recovers a linear relationship', () => {
    const X = [];
    const y = [];
    for (let i = 0; i < 100; i += 1) {
      const a = i / 100;
      const b = (i % 7) / 7;
      X.push([a, b]);
      y.push(3 * a - 2 * b + 0.5);
    }
    const model = new uplift.RidgeModel(2, { l2: 1e-6 }).fit(X, y);
    expect(model.weights[0]).toBeCloseTo(3, 1);
    expect(model.weights[1]).toBeCloseTo(-2, 1);
    expect(model.bias).toBeCloseTo(0.5, 1);
  });

  test('ridge does not blow up on perfectly collinear features', () => {
    // Without regularisation the normal equations are singular here, and a
    // naive solve returns Infinity or NaN coefficients.
    const X = [];
    const y = [];
    for (let i = 0; i < 50; i += 1) {
      const a = i / 50;
      X.push([a, a]); // identical columns
      y.push(a);
    }
    const model = new uplift.RidgeModel(2, { l2: 1 }).fit(X, y);
    for (const w of model.weights) expect(Number.isFinite(w)).toBe(true);
    expect(Number.isFinite(model.predict([0.5, 0.5]))).toBe(true);
  });
});

describe('uplift recovers a known treatment effect', () => {
  /**
   * A synthetic population with a deliberately adversarial structure.
   *
   * Feature 0 drives the base conversion rate: high values convert whether or
   * not they are treated. Feature 1 drives the *uplift*: only high values
   * respond to treatment at all.
   *
   * A model that predicts conversion will rank on feature 0 and be confidently
   * wrong about who to target — those are precisely the units that would have
   * converted anyway. Only a model estimating the treatment effect ranks on
   * feature 1. This is the distinction the whole module exists to make, so the
   * data is built to punish getting it wrong.
   */
  function population(n = 3000, seed = 21) {
    const rand = seededRandom(seed);
    const X = [];
    const treatments = [];
    const outcomes = [];
    const trueTau = [];

    for (let i = 0; i < n; i += 1) {
      const baseDriver = rand();
      const upliftDriver = rand();
      const x = [baseDriver, upliftDriver, rand(), rand(), rand(), rand(), rand() > 0.5 ? 1 : 0];

      const treated = rand() < 0.5;
      const baseRate = 0.05 + 0.5 * baseDriver;
      const tau = 0.4 * upliftDriver;
      const rate = Math.min(Math.max(treated ? baseRate + tau : baseRate, 0), 1);

      X.push(x);
      treatments.push(treated);
      outcomes.push(rand() < rate ? 1 : 0);
      trueTau.push(tau);
    }

    return { X, treatments, outcomes, trueTau };
  }

  test('fits when both arms are adequately populated', () => {
    const { X, treatments, outcomes } = population();
    const model = new uplift.UpliftModel(7);
    const diagnostics = model.fit(X, treatments, outcomes);

    expect(diagnostics.sufficient).toBe(true);
    expect(model.fitted).toBe(true);
    expect(diagnostics.naive_ate).toBeGreaterThan(0);
  });

  test('estimates correlate with the true per-unit effect', () => {
    const { X, treatments, outcomes, trueTau } = population();
    const model = new uplift.UpliftModel(7);
    model.fit(X, treatments, outcomes);

    const estimates = X.map((x) => model.estimate(x));

    const mean = (values) => values.reduce((s, v) => s + v, 0) / values.length;
    const meanEstimate = mean(estimates);
    const meanTrue = mean(trueTau);

    let covariance = 0;
    let varianceEstimate = 0;
    let varianceTrue = 0;
    for (let i = 0; i < estimates.length; i += 1) {
      const de = estimates[i] - meanEstimate;
      const dt = trueTau[i] - meanTrue;
      covariance += de * dt;
      varianceEstimate += de * de;
      varianceTrue += dt * dt;
    }
    const correlation = covariance / Math.sqrt(varianceEstimate * varianceTrue);

    expect(correlation).toBeGreaterThan(0.5);
  });

  test('ranks on the uplift driver, not the base-rate driver', () => {
    // The trap stated directly. A conversion model ranks by feature 0; an
    // uplift model ranks by feature 1.
    const { X, treatments, outcomes } = population();
    const model = new uplift.UpliftModel(7);
    model.fit(X, treatments, outcomes);

    const highUplift = model.estimate([0.5, 0.95, 0.5, 0.5, 0.5, 0.5, 0]);
    const highBaseRate = model.estimate([0.95, 0.05, 0.5, 0.5, 0.5, 0.5, 0]);

    expect(highUplift).toBeGreaterThan(highBaseRate);
  });

  test('refuses to fit when one arm is too small, rather than fitting on noise', () => {
    const { X, treatments, outcomes } = population(200);
    // Almost everything into control.
    const skewed = treatments.map((_, i) => i < 3);
    const model = new uplift.UpliftModel(7);
    const diagnostics = model.fit(X, skewed, outcomes);

    expect(diagnostics.sufficient).toBe(false);
    expect(model.fitted).toBe(false);
    // An unfitted model estimates zero effect for everyone, which is the
    // correct thing for the ranker to receive: no evidence, no adjustment.
    expect(model.estimate(X[0])).toBe(0);
  });

  test('propensity clamping keeps estimates bounded under a positivity violation', () => {
    const { X, treatments, outcomes } = population();
    // Treatment almost perfectly determined by feature 0: the classic
    // positivity violation, where some units have essentially no chance of
    // being in one arm.
    const confounded = X.map((x) => x[0] > 0.5);
    const model = new uplift.UpliftModel(7);
    model.fit(X, confounded, outcomes);

    for (const x of X.slice(0, 200)) {
      const estimate = model.estimate(x);
      expect(Number.isFinite(estimate)).toBe(true);
      expect(Math.abs(estimate)).toBeLessThan(5);
    }
  });
});

describe('Qini curve', () => {
  test('a model that targets the persuadable beats random targeting', () => {
    const rand = seededRandom(5);
    const n = 2000;
    const predictions = [];
    const treatments = [];
    const outcomes = [];

    for (let i = 0; i < n; i += 1) {
      const persuadable = rand();
      const treated = rand() < 0.5;
      predictions.push(persuadable);          // a perfect uplift predictor
      treatments.push(treated);
      outcomes.push((treated && rand() < persuadable) ? 1 : 0);
    }

    const result = uplift.qiniCurve(predictions, treatments, outcomes);
    expect(result.auuc).toBeGreaterThan(0);
    expect(result.curve.length).toBeGreaterThan(0);
    expect(result.curve[result.curve.length - 1].fraction).toBeCloseTo(1, 6);
  });

  test('a predictor carrying no information scores near zero', () => {
    const rand = seededRandom(11);
    const n = 2000;
    const predictions = [];
    const treatments = [];
    const outcomes = [];

    for (let i = 0; i < n; i += 1) {
      predictions.push(rand());   // unrelated to anything
      treatments.push(rand() < 0.5);
      outcomes.push(rand() < 0.2 ? 1 : 0);
    }

    const result = uplift.qiniCurve(predictions, treatments, outcomes);
    expect(Math.abs(result.auuc)).toBeLessThan(Math.abs(result.total_incremental) * 0.5 + 5);
  });

  test('an empty input returns a defined result rather than NaN', () => {
    const result = uplift.qiniCurve([], [], []);
    expect(result.n).toBe(0);
    expect(result.auuc).toBe(0);
    expect(result.curve).toEqual([]);
  });
});

describe('uplift serialisation', () => {
  test('a round trip estimates identically', () => {
    const rand = seededRandom(3);
    const X = Array.from({ length: 500 }, () => Array.from({ length: 7 }, () => rand()));
    const treatments = X.map(() => rand() < 0.5);
    const outcomes = X.map((x, i) => (treatments[i] && rand() < x[1] ? 1 : 0));

    const model = new uplift.UpliftModel(7);
    model.fit(X, treatments, outcomes);

    const restored = uplift.UpliftModel.fromJSON(JSON.parse(JSON.stringify(model.toJSON())));
    for (const x of X.slice(0, 50)) {
      expect(restored.estimate(x)).toBeCloseTo(model.estimate(x), 10);
    }
  });

  test('refuses an unrecognised format', () => {
    expect(() => uplift.UpliftModel.fromJSON({ format: 'uplift/0' })).toThrow(/Unrecognised uplift model/);
    expect(() => uplift.UpliftModel.fromJSON(null)).toThrow(/Unrecognised uplift model/);
  });
});
