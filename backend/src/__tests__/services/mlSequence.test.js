/**
 * Sequence model correctness.
 *
 * Hand-written backpropagation fails silently. A sign error or a missing
 * accumulation does not throw; it produces a model that trains — the loss even
 * goes down, because most of the gradient is still right — to a worse optimum
 * than it should reach. Nothing downstream can tell the difference between that
 * and a model that is simply not very good at the task.
 *
 * So every parameter tensor is checked against finite differences. This is the
 * only test in the suite that can catch the class of bug that matters here, and
 * it is worth the seconds it costs.
 *
 * The weight-tied embedding gets its own check, because it receives gradient
 * from two separate places — as the input lookup and as the output projection —
 * and dropping either is the classic tying bug.
 */

process.env.USE_SQLITE = 'true';

const {
  SequenceModel,
  timeBucket,
  softmaxRow,
  matmul,
  matmulTransposeA,
  matmulTransposeB,
  zeros,
  seededRandom,
  TIME_BUCKET_EDGES,
  N_TIME_BUCKETS,
} = require('../../modules/ml/sequence/transformer');

const VOCAB = 7;

function makeModel(overrides = {}) {
  return new SequenceModel({
    vocabSize: VOCAB,
    dModel: 8,
    nHeads: 2,
    maxLen: 6,
    dFF: 16,
    seed: 99,
    ...overrides,
  });
}

/** A fixed sequence, so every gradient check runs on the same inputs. */
const ITEMS = [1, 3, 2, 5, 3];
const BUCKETS = [0, 1, 0, 3, 2];
const TARGET = 4;

function lossOf(model, items = ITEMS, buckets = BUCKETS, target = TARGET) {
  const cache = model.forward(items, buckets);
  return SequenceModel.loss(cache.probs, target);
}

describe('matrix helpers', () => {
  test('matmul computes A · B', () => {
    const A = { rows: 2, cols: 3, data: Float64Array.from([1, 2, 3, 4, 5, 6]) };
    const B = { rows: 3, cols: 2, data: Float64Array.from([7, 8, 9, 10, 11, 12]) };
    const C = matmul(A, B);
    expect(C.rows).toBe(2);
    expect(C.cols).toBe(2);
    expect(Array.from(C.data)).toEqual([58, 64, 139, 154]);
  });

  test('matmulTransposeB computes A · Bᵀ', () => {
    const A = { rows: 2, cols: 3, data: Float64Array.from([1, 2, 3, 4, 5, 6]) };
    const B = { rows: 2, cols: 3, data: Float64Array.from([1, 0, 1, 0, 1, 0]) };
    const C = matmulTransposeB(A, B);
    expect(Array.from(C.data)).toEqual([4, 2, 10, 5]);
  });

  test('matmulTransposeA computes Aᵀ · B', () => {
    const A = { rows: 2, cols: 2, data: Float64Array.from([1, 2, 3, 4]) };
    const B = { rows: 2, cols: 2, data: Float64Array.from([5, 6, 7, 8]) };
    const C = matmulTransposeA(A, B);
    // Aᵀ = [[1,3],[2,4]]; Aᵀ·B = [[26,30],[38,44]]
    expect(Array.from(C.data)).toEqual([26, 30, 38, 44]);
  });

  test('the three products agree with each other on random matrices', () => {
    const rand = seededRandom(5);
    const fill = (rows, cols) => {
      const m = zeros(rows, cols);
      for (let i = 0; i < m.data.length; i += 1) m.data[i] = rand() * 2 - 1;
      return m;
    };
    const A = fill(4, 3);
    const B = fill(3, 5);

    const direct = matmul(A, B);
    // A·B == (Aᵀ)ᵀ·B, computed by the transposed-A routine on Aᵀ.
    const AT = zeros(3, 4);
    for (let i = 0; i < 4; i += 1) {
      for (let j = 0; j < 3; j += 1) AT.data[j * 4 + i] = A.data[i * 3 + j];
    }
    const viaTransposeA = matmulTransposeA(AT, B);

    for (let i = 0; i < direct.data.length; i += 1) {
      expect(viaTransposeA.data[i]).toBeCloseTo(direct.data[i], 12);
    }
  });
});

describe('softmax', () => {
  test('sums to one', () => {
    const data = Float64Array.from([1, 2, 3, 4]);
    softmaxRow(data, 0, 4);
    let sum = 0;
    for (const v of data) sum += v;
    expect(sum).toBeCloseTo(1, 12);
  });

  test('survives logits large enough to overflow a naive implementation', () => {
    // exp(900) is Infinity. Without the max subtraction this row becomes NaN,
    // and NaN then propagates through every parameter for the rest of training.
    const data = Float64Array.from([900, 901, 902]);
    softmaxRow(data, 0, 3);
    for (const v of data) expect(Number.isFinite(v)).toBe(true);
    expect(data[2]).toBeGreaterThan(data[0]);
  });

  test('operates only on the requested slice', () => {
    const data = Float64Array.from([1, 1, 99, 99]);
    softmaxRow(data, 0, 2);
    expect(data[0]).toBeCloseTo(0.5, 12);
    expect(data[2]).toBe(99);
  });
});

describe('time bucketing', () => {
  test('separates a shopping session from unrelated errands', () => {
    expect(timeBucket(30 * 1000)).toBe(0);           // half a minute
    expect(timeBucket(10 * 60 * 1000)).toBe(1);      // ten minutes
    expect(timeBucket(5 * 3600 * 1000)).toBe(2);     // five hours
    expect(timeBucket(3 * 86400000)).toBe(3);        // three days
    expect(timeBucket(30 * 86400000)).toBe(4);       // a month
  });

  test('every bucket is within the embedding table', () => {
    for (const ms of [0, 1, 1e3, 1e5, 1e7, 1e9, 1e15]) {
      const bucket = timeBucket(ms);
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(N_TIME_BUCKETS);
    }
    expect(N_TIME_BUCKETS).toBe(TIME_BUCKET_EDGES.length + 1);
  });

  test('a negative or unusable delta falls in the first bucket rather than out of range', () => {
    expect(timeBucket(-5)).toBe(0);
    expect(timeBucket(Number.NaN)).toBe(0);
    expect(timeBucket(undefined)).toBe(0);
  });
});

describe('construction', () => {
  test('refuses a head count that does not divide the width', () => {
    expect(() => new SequenceModel({ vocabSize: 5, dModel: 10, nHeads: 4 }))
      .toThrow(/must be divisible/);
  });

  test('refuses a degenerate vocabulary', () => {
    expect(() => new SequenceModel({ vocabSize: 1 })).toThrow(/at least 2/);
  });

  test('refuses an empty sequence rather than indexing past the end', () => {
    expect(() => makeModel().forward([], [])).toThrow(/empty sequence/);
  });
});

describe('forward pass', () => {
  test('produces a probability distribution over the vocabulary', () => {
    const probs = makeModel().predict(ITEMS, BUCKETS);
    expect(probs.length).toBe(VOCAB);
    let sum = 0;
    for (const p of probs) {
      expect(p).toBeGreaterThanOrEqual(0);
      sum += p;
    }
    expect(sum).toBeCloseTo(1, 12);
  });

  test('attention is causal: no position attends to a later one', () => {
    const model = makeModel();
    const cache = model.forward(ITEMS, BUCKETS);
    const L = cache.L;
    for (const head of cache.attn) {
      for (let i = 0; i < L; i += 1) {
        for (let j = i + 1; j < L; j += 1) {
          expect(head[i * L + j]).toBe(0);
        }
      }
    }
  });

  test('each attention row is a distribution over the positions it may see', () => {
    const model = makeModel();
    const cache = model.forward(ITEMS, BUCKETS);
    const L = cache.L;
    for (const head of cache.attn) {
      for (let i = 0; i < L; i += 1) {
        let sum = 0;
        for (let j = 0; j <= i; j += 1) sum += head[i * L + j];
        expect(sum).toBeCloseTo(1, 12);
      }
    }
  });

  test('truncates from the front, keeping the most recent events', () => {
    const model = makeModel({ maxLen: 3 });
    const cache = model.forward([9 % VOCAB, 1, 2, 3, 4], [0, 1, 2, 3, 4]);
    expect(cache.L).toBe(3);
    expect(cache.ids).toEqual([2, 3, 4]);
    expect(cache.timeIds).toEqual([2, 3, 4]);
  });

  test('changing the elapsed time changes the prediction', () => {
    // The whole reason elapsed time is embedded separately. If this passed
    // trivially, the time embedding would be dead weight.
    const model = makeModel();
    const fast = model.predict(ITEMS, [0, 0, 0, 0, 0]);
    const slow = model.predict(ITEMS, [4, 4, 4, 4, 4]);
    let maxDelta = 0;
    for (let i = 0; i < VOCAB; i += 1) maxDelta = Math.max(maxDelta, Math.abs(fast[i] - slow[i]));
    expect(maxDelta).toBeGreaterThan(1e-6);
  });

  test('reordering the same events changes the prediction', () => {
    const model = makeModel();
    const forward = model.predict([1, 2, 3], [0, 0, 0]);
    const reversed = model.predict([3, 2, 1], [0, 0, 0]);
    let maxDelta = 0;
    for (let i = 0; i < VOCAB; i += 1) maxDelta = Math.max(maxDelta, Math.abs(forward[i] - reversed[i]));
    expect(maxDelta).toBeGreaterThan(1e-6);
  });
});

describe('gradients match finite differences', () => {
  /**
   * Central differences: (f(x+h) − f(x−h)) / 2h.
   *
   * Central rather than forward because its error is O(h²) instead of O(h),
   * which is what makes a meaningful tolerance possible in double precision. A
   * forward difference at h = 1e-5 has error large enough that a genuinely
   * wrong gradient can hide inside the tolerance needed to avoid false alarms.
   */
  function checkTensor(name, { h = 1e-5, tolerance = 1e-6, sampleSize = 12 } = {}) {
    const model = makeModel();
    const cache = model.forward(ITEMS, BUCKETS);
    const grads = model.backward(cache, TARGET);

    const matrix = model.params[name];
    const grad = grads[name];
    const total = matrix.data.length;

    // A stride rather than the first N entries: the first row of an embedding
    // table is often the pad slot and its gradient is legitimately zero, so
    // checking only the head of the buffer would check nothing.
    const stride = Math.max(1, Math.floor(total / sampleSize));
    let checked = 0;
    let nonZero = 0;

    for (let i = 0; i < total; i += stride) {
      const original = matrix.data[i];

      matrix.data[i] = original + h;
      const up = lossOf(model);

      matrix.data[i] = original - h;
      const down = lossOf(model);

      matrix.data[i] = original;

      const numeric = (up - down) / (2 * h);
      const analytic = grad.data[i];

      // Relative error, floored so that a pair of near-zero gradients does not
      // divide into a spurious failure.
      const denominator = Math.max(Math.abs(numeric), Math.abs(analytic), 1e-4);
      expect(Math.abs(numeric - analytic) / denominator).toBeLessThan(tolerance * 1e4);

      checked += 1;
      if (Math.abs(analytic) > 1e-9) nonZero += 1;
    }

    // Guards the check itself: a backward pass returning all zeros would
    // otherwise agree with nothing and pass.
    expect(checked).toBeGreaterThan(0);
    return { checked, nonZero };
  }

  test('wq', () => { expect(checkTensor('wq').nonZero).toBeGreaterThan(0); });
  test('wk', () => { expect(checkTensor('wk').nonZero).toBeGreaterThan(0); });
  test('wv', () => { expect(checkTensor('wv').nonZero).toBeGreaterThan(0); });
  test('wo', () => { expect(checkTensor('wo').nonZero).toBeGreaterThan(0); });
  test('w1', () => { expect(checkTensor('w1').nonZero).toBeGreaterThan(0); });
  test('b1', () => { expect(checkTensor('b1').nonZero).toBeGreaterThan(0); });
  test('w2', () => { expect(checkTensor('w2').nonZero).toBeGreaterThan(0); });
  test('b2', () => { expect(checkTensor('b2').nonZero).toBeGreaterThan(0); });
  test('outputBias', () => { expect(checkTensor('outputBias').nonZero).toBeGreaterThan(0); });
  test('positionEmbedding', () => { expect(checkTensor('positionEmbedding').nonZero).toBeGreaterThan(0); });
  test('timeEmbedding', () => { expect(checkTensor('timeEmbedding').nonZero).toBeGreaterThan(0); });

  test('itemEmbedding, which receives gradient from both tying paths', () => {
    // The tensor most likely to be wrong, and the one whose wrongness is least
    // visible: dropping the input-lookup half still trains, just worse.
    const result = checkTensor('itemEmbedding', { sampleSize: 24 });
    expect(result.nonZero).toBeGreaterThan(0);
  });

  test('the input-lookup half of the tied gradient is actually present', () => {
    // A direct check rather than a differential one. Row 6 of the vocabulary
    // appears in neither the sequence nor the target, so its only gradient
    // would come from the output projection. Row 1 appears in the sequence, so
    // it must carry strictly more than the output path alone provides.
    const model = makeModel();
    const cache = model.forward([1, 1, 1], [0, 0, 0]);
    const grads = model.backward(cache, TARGET);

    const rowNorm = (row) => {
      let sum = 0;
      for (let d = 0; d < model.dModel; d += 1) {
        sum += Math.abs(grads.itemEmbedding.data[row * model.dModel + d]);
      }
      return sum;
    };

    // Row 1 is in the input three times; row 6 is in neither input nor target.
    expect(rowNorm(1)).toBeGreaterThan(rowNorm(6));
  });
});

describe('optimisation', () => {
  test('a single sequence can be driven to near-zero loss', () => {
    // Overfitting one example is the minimum bar for a correct training loop.
    // If this cannot be done, the gradients or the optimiser are wrong,
    // whatever the loss curve on real data looks like.
    const model = makeModel();
    const before = lossOf(model);

    for (let epoch = 0; epoch < 300; epoch += 1) {
      const cache = model.forward(ITEMS, BUCKETS);
      const grads = model.backward(cache, TARGET);
      model.step(grads, { learningRate: 0.02 });
    }

    const after = lossOf(model);
    expect(after).toBeLessThan(before);
    expect(after).toBeLessThan(0.01);
  });

  test('learns a rule that generalises to an unseen sequence', () => {
    // The rule: whatever category was viewed most recently is what comes next.
    // A model that only memorised the training pairs fails the held-out case.
    const model = new SequenceModel({ vocabSize: VOCAB, dModel: 16, nHeads: 2, maxLen: 6, seed: 7 });

    const train = [];
    for (let a = 1; a < VOCAB; a += 1) {
      for (let b = 1; b < VOCAB; b += 1) {
        if (a === b) continue;
        if (a === 5 && b === 2) continue; // held out
        train.push({ items: [a, b], buckets: [0, 0], target: b });
      }
    }

    for (let epoch = 0; epoch < 260; epoch += 1) {
      for (const example of train) {
        const cache = model.forward(example.items, example.buckets);
        const grads = model.backward(cache, example.target);
        model.step(grads, { learningRate: 0.02 });
      }
    }

    const probs = model.predict([5, 2], [0, 0]);
    let best = 0;
    for (let c = 1; c < VOCAB; c += 1) if (probs[c] > probs[best]) best = c;
    expect(best).toBe(2);
  });

  test('gradient clipping bounds the update from an outlier', () => {
    const model = makeModel();
    const cache = model.forward(ITEMS, BUCKETS);
    const grads = model.backward(cache, TARGET);

    // An absurd gradient, as one pathological sequence could produce.
    for (let i = 0; i < grads.wq.data.length; i += 1) grads.wq.data[i] = 1e6;

    const before = Float64Array.from(model.params.wq.data);
    model.step(grads, { learningRate: 0.01, clipNorm: 1 });

    let maxDelta = 0;
    for (let i = 0; i < before.length; i += 1) {
      maxDelta = Math.max(maxDelta, Math.abs(model.params.wq.data[i] - before[i]));
    }
    // Adam's normalisation already bounds the step at roughly the learning
    // rate; clipping keeps it there rather than letting the moment estimates be
    // poisoned for the following steps.
    expect(maxDelta).toBeLessThan(0.02);
  });

  test('parameters stay finite through training', () => {
    const model = makeModel();
    for (let epoch = 0; epoch < 120; epoch += 1) {
      const cache = model.forward(ITEMS, BUCKETS);
      const grads = model.backward(cache, TARGET);
      model.step(grads, { learningRate: 0.05, weightDecay: 1e-4 });
    }
    for (const matrix of Object.values(model.params)) {
      for (const value of matrix.data) expect(Number.isFinite(value)).toBe(true);
    }
  });
});

describe('serialisation', () => {
  test('a round trip predicts identically', () => {
    const model = makeModel();
    for (let i = 0; i < 40; i += 1) {
      const cache = model.forward(ITEMS, BUCKETS);
      model.step(model.backward(cache, TARGET), { learningRate: 0.02 });
    }

    const restored = SequenceModel.fromJSON(JSON.parse(JSON.stringify(model.toJSON())));
    const original = model.predict(ITEMS, BUCKETS);
    const loaded = restored.predict(ITEMS, BUCKETS);

    for (let c = 0; c < VOCAB; c += 1) {
      // Weights are stored to six decimals, so agreement is to that precision
      // rather than exact.
      expect(loaded[c]).toBeCloseTo(original[c], 5);
    }
  });

  test('refuses weights shaped for a different architecture', () => {
    const model = makeModel();
    const serialised = model.toJSON();
    serialised.weights.wq.rows = 99;
    expect(() => SequenceModel.fromJSON(serialised)).toThrow(/architecture expects/);
  });

  test('refuses an unrecognised format', () => {
    expect(() => SequenceModel.fromJSON({ format: 'seqmodel/0' })).toThrow(/Unrecognised sequence model/);
    expect(() => SequenceModel.fromJSON(null)).toThrow(/Unrecognised sequence model/);
  });

  test('reports a parameter count consistent with the architecture', () => {
    const model = makeModel();
    // Tied embedding (V×d) + positions (maxLen×d) + time (5×d)
    // + 4 projections (d×d) + FFN (d×dFF + dFF + dFF×d + d) + output bias (V).
    const { vocabSize: V, dModel: d, maxLen: L, dFF: f } = model;
    const expected = V * d + L * d + N_TIME_BUCKETS * d + 4 * d * d + d * f + f + f * d + d + V;
    expect(model.parameterCount).toBe(expected);
  });
});
