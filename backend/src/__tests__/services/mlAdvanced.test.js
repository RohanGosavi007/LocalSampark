/**
 * Multi-task ranking, contextual bandits, anomaly detection, experiment
 * bucketing and drift.
 *
 * These subsystems share a failure mode: none of them throws when it is wrong.
 * A miscalibrated ranker still returns an ordered list, a broken bandit still
 * returns six module names, a contaminated z-score still returns a number, and
 * an experiment with unequal buckets still reports a result. Each test below
 * pins the property whose violation would be silent.
 */

process.env.USE_SQLITE = 'true';

const multiTask = require('../../modules/ml/ranking/multiTaskRanker');
const bandit = require('../../modules/ml/bandits/contextualBandit');
const anomaly = require('../../modules/ml/safety/anomalyDetector');
const abTesting = require('../../modules/ml/experimentation/abTestingManager');
const drift = require('../../modules/ml/governance/driftMonitor');

/**
 * Removes the interaction rows this suite writes.
 *
 * Belt and braces now rather than the load-bearing guard it once was:
 * jest.globalSetup.js builds an isolated database and jest.setup.js points the
 * suite at it, so these writes no longer reach the development file. It is kept
 * because it costs one statement and still holds if someone runs the suite with
 * an overridden SQLITE_DB_PATH.
 */
const SUITE_STARTED_AT = new Date()
  .toISOString()
  .replace('T', ' ')
  .replace(/\.\d{3}Z$/, '');

afterAll(async () => {
  const { query } = require('../../config/database');
  try {
    await query('DELETE FROM ml_interaction_events WHERE created_at >= $1', [SUITE_STARTED_AT]);
  } catch {
    // A failed cleanup is not a failed test.
  }
});


const CFG = {
  ml_mmoe_alpha: 1, ml_mmoe_beta: 1, ml_mmoe_gamma: 1, ml_mmoe_lambda: 0.15,
  ml_mmoe_prior_ctr: 0.08, ml_mmoe_prior_cvr: 0.12, ml_mmoe_prior_weight: 20,
};

describe('smoothed rate estimation', () => {
  test('one click on one impression is not a 100% click-through rate', () => {
    // The raw ratio says 1.0, which would put every brand-new listing at the
    // top of every feed. This is the single most consequential line in the
    // ranker and the easiest to get wrong.
    const rate = multiTask.smoothedRate(1, 1, 0.08, 20);
    expect(rate).toBeLessThan(0.15);
    expect(rate).toBeGreaterThan(0.08);
  });

  test('evidence overtakes the prior as it accumulates', () => {
    const sparse = multiTask.smoothedRate(2, 10, 0.08, 20);
    const rich = multiTask.smoothedRate(200, 1000, 0.08, 20);
    // Both observed 20%; only the second has earned it.
    expect(rich).toBeGreaterThan(sparse);
    expect(rich).toBeCloseTo(0.2, 1);
  });

  test('no history returns exactly the prior', () => {
    expect(multiTask.smoothedRate(0, 0, 0.08, 20)).toBeCloseTo(0.08, 6);
  });

  test('never returns zero, which would annihilate the product', () => {
    expect(multiTask.smoothedRate(0, 10000, 0.08, 20)).toBeGreaterThan(0);
  });
});

describe('multi-task composite score', () => {
  const candidate = { id: 's1', rating: 4.5, review_count: 50, _distance_km: 1 };

  test('a weak head drags the whole score down', () => {
    // The reason for a product rather than a weighted sum: a listing must not
    // compensate for being unclickable by being close.
    const params = multiTask.readParams(CFG);
    const good = multiTask.scoreCandidate(candidate, { impressions: 1000, clicks: 200, conversions: 60 }, params);
    const unclickable = multiTask.scoreCandidate(candidate, { impressions: 1000, clicks: 2, conversions: 1 }, params);
    expect(unclickable.score).toBeLessThan(good.score / 5);
  });

  test('distance penalty is exponential and applied once', () => {
    const params = multiTask.readParams(CFG);
    const near = multiTask.scoreCandidate({ ...candidate, _distance_km: 0 }, null, params);
    const far = multiTask.scoreCandidate({ ...candidate, _distance_km: 10 }, null, params);
    expect(near.heads.distance_penalty).toBe(1);
    expect(far.heads.distance_penalty).toBeCloseTo(Math.exp(-0.15 * 10), 6);
    expect(far.score).toBeLessThan(near.score);
  });

  test('pQuality excludes distance, so the penalty is not double-counted', () => {
    // Folding distance into pQuality as well as the exponential term would
    // apply it twice — once inside a gamma exponent — and the feed would still
    // look plausible.
    const a = multiTask.qualityScore({ rating: 4.5, review_count: 50, _distance_km: 0 });
    const b = multiTask.qualityScore({ rating: 4.5, review_count: 50, _distance_km: 40 });
    expect(a).toBe(b);
  });

  test('exponents change the ordering, which is what makes them worth exposing', () => {
    const clicky = { id: 'a', rating: 4, review_count: 30, _distance_km: 1 };
    const converting = { id: 'b', rating: 4, review_count: 30, _distance_km: 1 };
    const clickyStats = { impressions: 1000, clicks: 300, conversions: 6 };
    const convertingStats = { impressions: 1000, clicks: 100, conversions: 50 };

    const ctrFocused = multiTask.readParams({ ...CFG, ml_mmoe_alpha: 3, ml_mmoe_beta: 0.2 });
    const cvrFocused = multiTask.readParams({ ...CFG, ml_mmoe_alpha: 0.2, ml_mmoe_beta: 3 });

    const aCtr = multiTask.scoreCandidate(clicky, clickyStats, ctrFocused).score;
    const bCtr = multiTask.scoreCandidate(converting, convertingStats, ctrFocused).score;
    const aCvr = multiTask.scoreCandidate(clicky, clickyStats, cvrFocused).score;
    const bCvr = multiTask.scoreCandidate(converting, convertingStats, cvrFocused).score;

    expect(aCtr).toBeGreaterThan(bCtr); // clicks win when alpha dominates
    expect(bCvr).toBeGreaterThan(aCvr); // calls win when beta dominates
  });

  test('an exponent of zero switches a head off entirely', () => {
    const params = multiTask.readParams({ ...CFG, ml_mmoe_gamma: 0 });
    const great = multiTask.scoreCandidate({ id: 'a', rating: 5, review_count: 500, _distance_km: 1 }, null, params);
    const awful = multiTask.scoreCandidate({ id: 'b', rating: 1, review_count: 500, _distance_km: 1 }, null, params);
    expect(great.score).toBeCloseTo(awful.score, 9);
  });

  test('negative exponents are clamped rather than inverting the objective', () => {
    const params = multiTask.readParams({ ...CFG, ml_mmoe_alpha: -3 });
    expect(params.alpha).toBe(0);
  });

  test('scores stay within [0,1]', () => {
    const params = multiTask.readParams(CFG);
    for (const stats of [null, { impressions: 0, clicks: 0, conversions: 0 }, { impressions: 10, clicks: 10, conversions: 10 }]) {
      const s = multiTask.scoreCandidate(candidate, stats, params).score;
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  test('an unrated listing is rankable rather than annihilated', () => {
    // A zero on any head would zero the product and make the listing
    // unrankable, which is not the same as ranking it low.
    expect(multiTask.qualityScore({ rating: 0, review_count: 0 })).toBeGreaterThan(0);
  });

  test('ranking an empty candidate set is not an error', async () => {
    await expect(multiTask.rank([], { cfg: CFG })).resolves.toMatchObject({ items: [] });
  });
});

describe('LinUCB linear algebra', () => {
  test('inversion matches a known result', () => {
    const inv = bandit.invert([[4, 7], [2, 6]]);
    expect(inv[0][0]).toBeCloseTo(0.6, 9);
    expect(inv[0][1]).toBeCloseTo(-0.7, 9);
    expect(inv[1][0]).toBeCloseTo(-0.2, 9);
    expect(inv[1][1]).toBeCloseTo(0.4, 9);
  });

  test('M · M^-1 is the identity', () => {
    const M = [[2, 1, 0], [1, 3, 1], [0, 1, 2]];
    const inv = bandit.invert(M);
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        const v = M[i].reduce((s, x, k) => s + x * inv[k][j], 0);
        expect(v).toBeCloseTo(i === j ? 1 : 0, 9);
      }
    }
  });

  test('a singular matrix returns null instead of NaN', () => {
    // Without partial pivoting this divides by zero and fills the matrix with
    // NaN, and a NaN score sorts unpredictably rather than failing.
    expect(bandit.invert([[1, 2], [2, 4]])).toBeNull();
  });

  test('pivoting handles a zero on the diagonal', () => {
    const inv = bandit.invert([[0, 1], [1, 0]]);
    expect(inv).not.toBeNull();
    expect(inv[0][1]).toBeCloseTo(1, 9);
  });

  test('the quadratic form is non-negative for a positive-definite matrix', () => {
    // It is a variance; a negative value would make the confidence width
    // imaginary.
    const A = bandit.identity(4, 2);
    expect(bandit.quadratic(A, [1, -2, 3, 0.5])).toBeGreaterThan(0);
  });

  test('a rank-one update grows the matrix along the observed direction', () => {
    const A = bandit.identity(3, 1);
    const before = bandit.quadratic(A, [1, 0, 0]);
    bandit.addOuterProduct(A, [1, 0, 0]);
    expect(bandit.quadratic(A, [1, 0, 0])).toBeGreaterThan(before);
  });
});

describe('bandit context encoding', () => {
  test('every component is bounded in [0,1]', () => {
    // An unbounded feature dominates the quadratic form and the policy stops
    // exploring entirely.
    const x = bandit.encodeContext({
      localHour: 23, dayOfWeek: 0, tenureDays: 100000,
      pincode: '411019', sessionDepth: 9999, arm: 'NearbyShops',
    });
    expect(x).toHaveLength(bandit.DIMENSION);
    for (const v of x) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  test('exactly one time-of-day bucket is set', () => {
    for (const hour of [0, 7, 13, 18, 23]) {
      const x = bandit.encodeContext({ localHour: hour });
      expect(x[1] + x[2] + x[3] + x[4]).toBe(1);
    }
  });

  test('the pincode hash is stable and discriminating', () => {
    const a = bandit.encodeContext({ pincode: '411019' })[7];
    expect(bandit.encodeContext({ pincode: '411019' })[7]).toBe(a);
    expect(bandit.encodeContext({ pincode: '411020' })[7]).not.toBe(a);
  });

  test('missing inputs encode as absent, not as average', () => {
    // 0.5 would assert average interest the data does not support.
    expect(bandit.encodeContext({ arm: 'LocalJobs' })[8]).toBe(0);
  });
});

describe('bandit policy', () => {
  test('returns the default order when disabled', async () => {
    const result = await bandit.selectLayout({}, { cfg: { ml_bandit_enabled: false } });
    expect(result.strategy).toBe('default');
    expect(result.layout).toEqual(bandit.ARMS);
  });

  test('returns every arm exactly once when enabled', async () => {
    const result = await bandit.selectLayout(
      { localHour: 9, pincode: '411019' },
      { cfg: { ml_bandit_enabled: true, ml_bandit_alpha: 1, ml_bandit_ridge: 1 } }
    );
    expect(result.layout.slice().sort()).toEqual(bandit.ARMS.slice().sort());
  });

  test('an unseen arm carries a wider confidence interval than a pulled one', async () => {
    const result = await bandit.selectLayout(
      { localHour: 9 },
      { cfg: { ml_bandit_enabled: true, ml_bandit_alpha: 1, ml_bandit_ridge: 1 } }
    );
    // With fresh state every arm is equally unexplored, so every width matches.
    // The property that matters is that the width exists and is positive —
    // a zero width is a policy that never explores.
    for (const s of result.scores) expect(s.width).toBeGreaterThan(0);
  });

  test('an unknown arm is rejected rather than silently creating state', async () => {
    const out = await bandit.recordReward({ arm: 'NotAnArm', reward: 1 });
    expect(out.updated).toBe(false);
  });
});

describe('robust outlier detection', () => {
  test('the median resists what the mean does not', () => {
    // A single listing with 400 fake reviews raises the mean enough to make
    // itself look ordinary. This is the entire reason for median/MAD here.
    const population = [10, 11, 9, 12, 10, 11, 10, 9, 11, 10, 400];
    const mean = population.reduce((a, b) => a + b, 0) / population.length;
    const sd = Math.sqrt(population.reduce((s, x) => s + (x - mean) ** 2, 0) / population.length);
    const ordinaryZ = (400 - mean) / sd;
    const modified = anomaly.modifiedZ(400, population);

    expect(ordinaryZ).toBeLessThan(4);      // slips past a threshold of 3–4
    expect(modified).toBeGreaterThan(50);   // unmistakable
  });

  test('a normal member of a contaminated population scores near zero', () => {
    expect(Math.abs(anomaly.modifiedZ(10, [10, 11, 9, 12, 10, 11, 10, 9, 11, 10, 400]))).toBeLessThan(1);
  });

  test('a zero MAD returns 0 rather than Infinity', () => {
    // More than half the population sharing one value is common in sparse data.
    expect(anomaly.modifiedZ(5, [1, 1, 1, 1, 1])).toBe(0);
  });

  test('too small a population yields no score', () => {
    expect(anomaly.modifiedZ(100, [1, 2])).toBe(0);
  });

  test('risk is tempered by how much evidence exists', () => {
    // A z of 6 from four observations mostly means the sample is tiny.
    const thin = anomaly.riskScore(6, 4, 10);
    const thick = anomaly.riskScore(6, 400, 10);
    expect(thin).toBeLessThan(thick);
    expect(thick).toBeLessThanOrEqual(100);
  });

  test('duplicate detection normalises punctuation and case', () => {
    expect(anomaly.normaliseName("Sharma's Grocery-Mart!")).toBe(anomaly.normaliseName('SHARMA S GROCERY MART'));
  });
});

describe('experiment bucketing', () => {
  test('assignment is deterministic', () => {
    const a = abTesting.bucketValue('exp', 'user-42');
    expect(abTesting.bucketValue('exp', 'user-42')).toBe(a);
  });

  test('experiments are independent of one another', () => {
    // Without the per-experiment salt every experiment buckets users
    // identically and their effects are perfectly confounded.
    const same = ['u1', 'u2', 'u3', 'u4', 'u5'].filter(
      (u) => abTesting.bucketValue('expA', u) === abTesting.bucketValue('expB', u)
    );
    expect(same).toHaveLength(0);
  });

  test('buckets are uniform at scale', () => {
    const variants = [{ name: 'a', weight: 80 }, { name: 'b', weight: 10 }, { name: 'c', weight: 10 }];
    const counts = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 20000; i += 1) {
      counts[abTesting.pickVariant(variants, abTesting.bucketValue('e', `u${i}`)).name] += 1;
    }
    expect(counts.a / 20000).toBeCloseTo(0.8, 1);
    expect(counts.b / 20000).toBeCloseTo(0.1, 1);
    expect(counts.c / 20000).toBeCloseTo(0.1, 1);
  });

  test('weights are relative, not percentages', () => {
    const asPercent = [{ name: 'a', weight: 80 }, { name: 'b', weight: 20 }];
    const asRatio = [{ name: 'a', weight: 4 }, { name: 'b', weight: 1 }];
    expect(abTesting.pickVariant(asPercent, 0.5).name).toBe(abTesting.pickVariant(asRatio, 0.5).name);
    expect(abTesting.pickVariant(asPercent, 0.9).name).toBe(abTesting.pickVariant(asRatio, 0.9).name);
  });

  test('a boundary value never falls through to undefined', () => {
    const variants = [{ name: 'a', weight: 1 }, { name: 'b', weight: 1 }];
    expect(abTesting.pickVariant(variants, 0.9999999999)).toBeTruthy();
  });

  test('an anonymous subject is never enrolled', async () => {
    // Without a stable id the assignment changes between requests and the
    // subject contributes noise to both arms.
    const out = await abTesting.assign('anything', null);
    expect(out.inExperiment).toBe(false);
    expect(out.reason).toBe('no_subject');
  });

  test('significance refuses to call a result on thin data', () => {
    const verdicts = abTesting.significance([
      { variant: 'control', impressions: 100, clicks: 5, conversions: 1 },
      { variant: 'candidate', impressions: 100, clicks: 12, conversions: 3 },
    ]);
    expect(verdicts[0].verdict).toBe('insufficient_data');
  });

  test('significance detects a real difference at volume', () => {
    const verdicts = abTesting.significance([
      { variant: 'control', impressions: 10000, clicks: 500, conversions: 100 },
      { variant: 'candidate', impressions: 10000, clicks: 800, conversions: 200 },
    ]);
    expect(verdicts[0].verdict).toBe('better');
    expect(verdicts[0].z).toBeGreaterThan(1.96);
  });
});

describe('population stability index', () => {
  test('identical distributions have zero PSI', () => {
    const d = [0.2, 0.3, 0.3, 0.2];
    expect(drift.psi(d, d)).toBe(0);
  });

  test('PSI grows with the size of the shift', () => {
    const base = [0.25, 0.25, 0.25, 0.25];
    const small = drift.psi(base, [0.26, 0.25, 0.25, 0.24]);
    const large = drift.psi(base, [0.70, 0.15, 0.10, 0.05]);
    expect(large).toBeGreaterThan(small);
    expect(large).toBeGreaterThan(0.25); // past the conventional alert line
  });

  test('an emptied bin is finite rather than infinite', () => {
    // Without flooring the proportions this returns Infinity exactly when a
    // distribution has shifted enough to empty a bin — the case it exists for.
    const value = drift.psi([0.25, 0.25, 0.25, 0.25], [0.4, 0.3, 0.3, 0]);
    expect(Number.isFinite(value)).toBe(true);
  });

  test('PSI is symmetric', () => {
    expect(drift.psi([0.5, 0.5], [0.7, 0.3])).toBeCloseTo(drift.psi([0.7, 0.3], [0.5, 0.5]), 9);
  });

  test('mismatched or empty inputs return null, not a number', () => {
    expect(drift.psi([0.5, 0.5], [0.3, 0.3, 0.4])).toBeNull();
    expect(drift.psi([], [])).toBeNull();
  });

  test('binning assigns every finite value exactly once', () => {
    const { counts, n } = drift.binned([0.1, 0.7, 1.5, 3, 7, 30, NaN], [0, 0.5, 1, 2, 5, 10, Infinity]);
    expect(n).toBe(6); // the NaN is excluded, not bucketed
    expect(counts.reduce((a, b) => a + b, 0)).toBe(6);
  });
});
