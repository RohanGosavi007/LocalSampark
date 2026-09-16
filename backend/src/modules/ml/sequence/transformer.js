/**
 * A small causal self-attention model over interaction sequences.
 *
 * The ranker treats a user as a bag of aggregates: their preference vector,
 * their affinity rows, their distance from a shop. None of that has an order.
 * But the thing that predicts what someone wants next is precisely the order —
 * searched "plumber", viewed three plumbers, called none of them, and is now
 * back an hour later is a completely different state from the same four events
 * in any other arrangement, and an aggregate cannot represent the difference.
 *
 * So this is a real transformer block: multi-head scaled dot-product attention
 * with a causal mask, a position-wise feed-forward network, residual
 * connections, and a tied output projection over the category vocabulary. It is
 * trained by gradient descent with Adam on next-category prediction.
 *
 * ── Deliberate architectural omissions ─────────────────────────────────────
 *
 * There is no layer normalisation, and that is a choice rather than an
 * oversight. At one block and d_model = 32 the residual stream does not drift
 * far enough for normalisation to earn its place, and its backward pass is the
 * single most error-prone piece of hand-written autodiff there is. Leaving it
 * out means the gradients here are checkable against finite differences, which
 * the test suite does for every parameter tensor. A model whose gradients are
 * verified and whose architecture is modest beats one with the fashionable
 * architecture and a sign error nobody can find.
 *
 * Positions and elapsed time are separate learned embeddings, added to the item
 * embedding. Time matters independently of order in hyperlocal commerce: three
 * views a minute apart are one shopping session, and three views a week apart
 * are three unrelated errands. A model given only the ordering cannot tell
 * those apart, and it is the difference between predicting the next thing in
 * this session and predicting the user's general taste.
 *
 * ── Scale ──────────────────────────────────────────────────────────────────
 *
 * Deliberately tiny: a few tens of thousands of parameters, trained in-process
 * in seconds to minutes on the platform's event volume. The alternative — a
 * Python training service and a model server — is a great deal of operational
 * surface for a catalogue of this size, and this fits in the nightly job that
 * already exists.
 */

/** Elapsed-time buckets, in milliseconds. The last bucket is unbounded. */
const TIME_BUCKET_EDGES = Object.freeze([60 * 1000, 3600 * 1000, 86400000, 7 * 86400000]);
const N_TIME_BUCKETS = TIME_BUCKET_EDGES.length + 1;

function timeBucket(deltaMs) {
  const delta = Number(deltaMs);
  if (!Number.isFinite(delta) || delta < 0) return 0;
  for (let i = 0; i < TIME_BUCKET_EDGES.length; i += 1) {
    if (delta < TIME_BUCKET_EDGES[i]) return i;
  }
  return TIME_BUCKET_EDGES.length;
}

/** mulberry32, seeded so a training run is reproducible. */
function seededRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Box-Muller, for Gaussian initialisation.
 *
 * Uniform initialisation would do at this scale, but the variance of a uniform
 * draw differs from its range by a factor of 12, and the scaling below is
 * expressed in standard deviations. Mixing the two is how an initialisation
 * ends up quietly three times too large.
 */
function gaussian(rand) {
  let u = 0;
  while (u === 0) u = rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Row-major matrix over a flat buffer. */
function zeros(rows, cols) {
  return { rows, cols, data: new Float64Array(rows * cols) };
}

function randomMatrix(rows, cols, scale, rand) {
  const m = zeros(rows, cols);
  for (let i = 0; i < m.data.length; i += 1) m.data[i] = gaussian(rand) * scale;
  return m;
}

/** C = A · B. */
function matmul(A, B) {
  const out = zeros(A.rows, B.cols);
  for (let i = 0; i < A.rows; i += 1) {
    const aRow = i * A.cols;
    const cRow = i * B.cols;
    for (let k = 0; k < A.cols; k += 1) {
      const a = A.data[aRow + k];
      if (a === 0) continue;
      const bRow = k * B.cols;
      for (let j = 0; j < B.cols; j += 1) {
        out.data[cRow + j] += a * B.data[bRow + j];
      }
    }
  }
  return out;
}

/** C = A · Bᵀ. */
function matmulTransposeB(A, B) {
  const out = zeros(A.rows, B.rows);
  for (let i = 0; i < A.rows; i += 1) {
    for (let j = 0; j < B.rows; j += 1) {
      let sum = 0;
      for (let k = 0; k < A.cols; k += 1) sum += A.data[i * A.cols + k] * B.data[j * B.cols + k];
      out.data[i * B.rows + j] = sum;
    }
  }
  return out;
}

/** C = Aᵀ · B. */
function matmulTransposeA(A, B) {
  const out = zeros(A.cols, B.cols);
  for (let k = 0; k < A.rows; k += 1) {
    for (let i = 0; i < A.cols; i += 1) {
      const a = A.data[k * A.cols + i];
      if (a === 0) continue;
      for (let j = 0; j < B.cols; j += 1) {
        out.data[i * B.cols + j] += a * B.data[k * B.cols + j];
      }
    }
  }
  return out;
}

/**
 * Numerically stable softmax over one row, in place.
 *
 * The max is subtracted first. Without it, a logit of 800 — reachable with an
 * unlucky initialisation and a long sequence — overflows to Infinity, the
 * normalisation becomes Infinity/Infinity, and the whole row becomes NaN. NaN
 * then propagates silently through the rest of training: the loss reads NaN,
 * every parameter becomes NaN, and the run continues to completion producing a
 * model that outputs nothing.
 */
function softmaxRow(data, offset, length) {
  let max = -Infinity;
  for (let i = 0; i < length; i += 1) if (data[offset + i] > max) max = data[offset + i];
  let sum = 0;
  for (let i = 0; i < length; i += 1) {
    const e = Math.exp(data[offset + i] - max);
    data[offset + i] = e;
    sum += e;
  }
  const inv = sum > 0 ? 1 / sum : 0;
  for (let i = 0; i < length; i += 1) data[offset + i] *= inv;
}

class SequenceModel {
  /**
   * @param {object} options
   * @param {number} options.vocabSize Number of categories, plus one pad slot.
   * @param {number} options.dModel    Residual width.
   * @param {number} options.nHeads    Attention heads. Must divide dModel.
   * @param {number} options.maxLen    Longest history attended over.
   */
  constructor({ vocabSize, dModel = 32, nHeads = 4, maxLen = 50, dFF = null, seed = 1234 } = {}) {
    if (!Number.isInteger(vocabSize) || vocabSize < 2) {
      throw new Error(`Sequence model needs a vocabulary of at least 2, received ${vocabSize}`);
    }
    if (dModel % nHeads !== 0) {
      throw new Error(`dModel (${dModel}) must be divisible by nHeads (${nHeads})`);
    }

    this.vocabSize = vocabSize;
    this.dModel = dModel;
    this.nHeads = nHeads;
    this.dHead = dModel / nHeads;
    this.maxLen = maxLen;
    this.dFF = dFF || dModel * 4;

    const rand = seededRandom(seed);
    this.seed = seed;

    // Embedding scale 1/sqrt(d) keeps the residual stream at roughly unit scale
    // at initialisation, which is what makes a fixed learning rate reasonable
    // across widths.
    const embScale = 1 / Math.sqrt(dModel);

    this.params = {
      // Tied: also the output projection. Halves the parameter count and ties
      // "what this category looks like as an input" to "what predicting it
      // looks like as an output", which on a vocabulary this small is the
      // difference between learning the rare categories and never seeing them
      // enough to.
      itemEmbedding: randomMatrix(vocabSize, dModel, embScale, rand),
      positionEmbedding: randomMatrix(maxLen, dModel, embScale, rand),
      timeEmbedding: randomMatrix(N_TIME_BUCKETS, dModel, embScale, rand),

      // Xavier-ish for the projections.
      wq: randomMatrix(dModel, dModel, Math.sqrt(1 / dModel), rand),
      wk: randomMatrix(dModel, dModel, Math.sqrt(1 / dModel), rand),
      wv: randomMatrix(dModel, dModel, Math.sqrt(1 / dModel), rand),
      wo: randomMatrix(dModel, dModel, Math.sqrt(1 / dModel), rand),

      // He scaling for the ReLU layer: a ReLU zeroes half its inputs, so Xavier
      // halves the signal variance at every layer.
      w1: randomMatrix(dModel, this.dFF, Math.sqrt(2 / dModel), rand),
      b1: zeros(1, this.dFF),
      w2: randomMatrix(this.dFF, dModel, Math.sqrt(2 / this.dFF), rand),
      b2: zeros(1, dModel),

      outputBias: zeros(1, vocabSize),
    };

    this._initOptimizer();
  }

  _initOptimizer() {
    this.optimizer = { t: 0, m: {}, v: {} };
    for (const [name, matrix] of Object.entries(this.params)) {
      this.optimizer.m[name] = new Float64Array(matrix.data.length);
      this.optimizer.v[name] = new Float64Array(matrix.data.length);
    }
  }

  get parameterCount() {
    let total = 0;
    for (const matrix of Object.values(this.params)) total += matrix.data.length;
    return total;
  }

  /**
   * Forward pass over one sequence.
   *
   * `items` are vocabulary indices, `buckets` the elapsed-time bucket for each
   * step. Returns the probability distribution over the next category plus the
   * intermediates the backward pass needs.
   *
   * Sequences longer than maxLen are truncated from the *front*: the most
   * recent events are the informative ones, and dropping them to keep ancient
   * history would be the wrong half.
   */
  forward(items, buckets) {
    const L = Math.min(items.length, this.maxLen);
    if (L === 0) throw new Error('Sequence model forward called with an empty sequence');

    const offset = items.length - L;
    const ids = items.slice(offset);
    const timeIds = buckets.slice(offset);

    const { dModel, nHeads, dHead } = this;
    const P = this.params;

    // ── Input: item + position + elapsed-time embeddings ───────────────────
    const x = zeros(L, dModel);
    for (let t = 0; t < L; t += 1) {
      const item = ids[t];
      const bucket = timeIds[t];
      for (let d = 0; d < dModel; d += 1) {
        x.data[t * dModel + d] =
          P.itemEmbedding.data[item * dModel + d] +
          P.positionEmbedding.data[t * dModel + d] +
          P.timeEmbedding.data[bucket * dModel + d];
      }
    }

    // ── Multi-head causal self-attention ───────────────────────────────────
    const q = matmul(x, P.wq);
    const k = matmul(x, P.wk);
    const v = matmul(x, P.wv);

    const scale = 1 / Math.sqrt(dHead);
    // attn[h] holds an L×L row-stochastic matrix per head.
    const attn = [];
    const concat = zeros(L, dModel);

    for (let h = 0; h < nHeads; h += 1) {
      const base = h * dHead;
      const scores = new Float64Array(L * L);

      for (let i = 0; i < L; i += 1) {
        for (let j = 0; j <= i; j += 1) {
          // The causal mask is structural here rather than an additive -inf:
          // positions after i are never computed, so they cannot leak through
          // a softmax that later gets a different implementation. j > i simply
          // stays zero and is never normalised over.
          let sum = 0;
          for (let d = 0; d < dHead; d += 1) {
            sum += q.data[i * dModel + base + d] * k.data[j * dModel + base + d];
          }
          scores[i * L + j] = sum * scale;
        }
        softmaxRow(scores, i * L, i + 1);
        for (let j = i + 1; j < L; j += 1) scores[i * L + j] = 0;
      }

      attn.push(scores);

      for (let i = 0; i < L; i += 1) {
        for (let d = 0; d < dHead; d += 1) {
          let sum = 0;
          for (let j = 0; j <= i; j += 1) {
            sum += scores[i * L + j] * v.data[j * dModel + base + d];
          }
          concat.data[i * dModel + base + d] = sum;
        }
      }
    }

    const projected = matmul(concat, P.wo);

    // Residual around the attention block.
    const h1 = zeros(L, dModel);
    for (let i = 0; i < h1.data.length; i += 1) h1.data[i] = x.data[i] + projected.data[i];

    // ── Position-wise feed-forward ─────────────────────────────────────────
    const ff1 = matmul(h1, P.w1);
    for (let t = 0; t < L; t += 1) {
      for (let j = 0; j < this.dFF; j += 1) ff1.data[t * this.dFF + j] += P.b1.data[j];
    }
    const relu = zeros(L, this.dFF);
    for (let i = 0; i < ff1.data.length; i += 1) relu.data[i] = ff1.data[i] > 0 ? ff1.data[i] : 0;

    const ff2 = matmul(relu, P.w2);
    for (let t = 0; t < L; t += 1) {
      for (let j = 0; j < dModel; j += 1) ff2.data[t * dModel + j] += P.b2.data[j];
    }

    const h2 = zeros(L, dModel);
    for (let i = 0; i < h2.data.length; i += 1) h2.data[i] = h1.data[i] + ff2.data[i];

    // ── Output over the vocabulary, from the last position only ────────────
    //
    // Only the final position predicts. Training every position would give more
    // gradient per sequence, but the label this is trained against is what the
    // user did next, and that is defined only at the end.
    const last = new Float64Array(dModel);
    for (let d = 0; d < dModel; d += 1) last[d] = h2.data[(L - 1) * dModel + d];

    const logits = new Float64Array(this.vocabSize);
    for (let c = 0; c < this.vocabSize; c += 1) {
      let sum = P.outputBias.data[c];
      for (let d = 0; d < dModel; d += 1) sum += last[d] * P.itemEmbedding.data[c * dModel + d];
      logits[c] = sum;
    }

    const probs = Float64Array.from(logits);
    softmaxRow(probs, 0, this.vocabSize);

    return { L, ids, timeIds, x, q, k, v, attn, concat, projected, h1, ff1, relu, ff2, h2, last, logits, probs };
  }

  /**
   * Backward pass. Returns gradients for every parameter tensor.
   *
   * Cross-entropy against a single target, so dLogits is simply (probs - onehot)
   * — the identity that makes the softmax and the loss cancel, and the reason
   * the two are never separated in an implementation.
   *
   * The tied embedding receives gradient from two places: as the output
   * projection and as the input lookup. Both are accumulated into the same
   * tensor. Forgetting the second is the classic weight-tying bug, and it does
   * not produce an error — it produces a model that trains, slowly, to a worse
   * optimum. The gradient check in the test suite is what catches it.
   */
  backward(cache, target) {
    const { L, ids, timeIds, x, q, k, v, attn, concat, h1, ff1, relu, h2, last, probs } = cache;
    const { dModel, nHeads, dHead, dFF, vocabSize } = this;
    const P = this.params;

    const grads = {};
    for (const [name, matrix] of Object.entries(P)) grads[name] = zeros(matrix.rows, matrix.cols);

    // ── Output layer ───────────────────────────────────────────────────────
    const dLogits = new Float64Array(vocabSize);
    for (let c = 0; c < vocabSize; c += 1) dLogits[c] = probs[c] - (c === target ? 1 : 0);

    const dLast = new Float64Array(dModel);
    for (let c = 0; c < vocabSize; c += 1) {
      const g = dLogits[c];
      grads.outputBias.data[c] += g;
      if (g === 0) continue;
      for (let d = 0; d < dModel; d += 1) {
        // Output-projection half of the tied embedding's gradient.
        grads.itemEmbedding.data[c * dModel + d] += g * last[d];
        dLast[d] += g * P.itemEmbedding.data[c * dModel + d];
      }
    }

    const dH2 = zeros(L, dModel);
    for (let d = 0; d < dModel; d += 1) dH2.data[(L - 1) * dModel + d] = dLast[d];

    // ── Feed-forward, with its residual ────────────────────────────────────
    const dFF2 = dH2;                       // y = h1 + ff2, so d/dff2 = dH2
    const dH1 = zeros(L, dModel);
    for (let i = 0; i < dH1.data.length; i += 1) dH1.data[i] = dH2.data[i];

    for (let t = 0; t < L; t += 1) {
      for (let j = 0; j < dModel; j += 1) grads.b2.data[j] += dFF2.data[t * dModel + j];
    }
    const gradW2 = matmulTransposeA(relu, dFF2);
    for (let i = 0; i < gradW2.data.length; i += 1) grads.w2.data[i] += gradW2.data[i];

    const dRelu = matmulTransposeB(dFF2, P.w2);
    const dFF1 = zeros(L, dFF);
    for (let i = 0; i < dFF1.data.length; i += 1) {
      dFF1.data[i] = ff1.data[i] > 0 ? dRelu.data[i] : 0;
    }

    for (let t = 0; t < L; t += 1) {
      for (let j = 0; j < dFF; j += 1) grads.b1.data[j] += dFF1.data[t * dFF + j];
    }
    const gradW1 = matmulTransposeA(h1, dFF1);
    for (let i = 0; i < gradW1.data.length; i += 1) grads.w1.data[i] += gradW1.data[i];

    const dH1FromFF = matmulTransposeB(dFF1, P.w1);
    for (let i = 0; i < dH1.data.length; i += 1) dH1.data[i] += dH1FromFF.data[i];

    // ── Attention, with its residual ───────────────────────────────────────
    const dProjected = dH1;                 // h1 = x + projected
    const dX = zeros(L, dModel);
    for (let i = 0; i < dX.data.length; i += 1) dX.data[i] = dH1.data[i];

    const gradWo = matmulTransposeA(concat, dProjected);
    for (let i = 0; i < gradWo.data.length; i += 1) grads.wo.data[i] += gradWo.data[i];

    const dConcat = matmulTransposeB(dProjected, P.wo);

    const dQ = zeros(L, dModel);
    const dK = zeros(L, dModel);
    const dV = zeros(L, dModel);
    const scale = 1 / Math.sqrt(dHead);

    for (let h = 0; h < nHeads; h += 1) {
      const base = h * dHead;
      const scores = attn[h];

      // dV and dAttention from the weighted sum.
      const dScores = new Float64Array(L * L);
      for (let i = 0; i < L; i += 1) {
        for (let j = 0; j <= i; j += 1) {
          let dot = 0;
          for (let d = 0; d < dHead; d += 1) {
            const g = dConcat.data[i * dModel + base + d];
            dV.data[j * dModel + base + d] += scores[i * L + j] * g;
            dot += g * v.data[j * dModel + base + d];
          }
          dScores[i * L + j] = dot;
        }
      }

      // Softmax Jacobian, row by row: dz = a ⊙ (dy − Σ(dy ⊙ a)).
      for (let i = 0; i < L; i += 1) {
        let weighted = 0;
        for (let j = 0; j <= i; j += 1) weighted += dScores[i * L + j] * scores[i * L + j];
        for (let j = 0; j <= i; j += 1) {
          dScores[i * L + j] = scores[i * L + j] * (dScores[i * L + j] - weighted) * scale;
        }
      }

      for (let i = 0; i < L; i += 1) {
        for (let j = 0; j <= i; j += 1) {
          const g = dScores[i * L + j];
          if (g === 0) continue;
          for (let d = 0; d < dHead; d += 1) {
            dQ.data[i * dModel + base + d] += g * k.data[j * dModel + base + d];
            dK.data[j * dModel + base + d] += g * q.data[i * dModel + base + d];
          }
        }
      }
    }

    for (const [dProj, weight, gradName] of [[dQ, P.wq, 'wq'], [dK, P.wk, 'wk'], [dV, P.wv, 'wv']]) {
      const gradW = matmulTransposeA(x, dProj);
      for (let i = 0; i < gradW.data.length; i += 1) grads[gradName].data[i] += gradW.data[i];
      const contribution = matmulTransposeB(dProj, weight);
      for (let i = 0; i < dX.data.length; i += 1) dX.data[i] += contribution.data[i];
    }

    // ── Embeddings ─────────────────────────────────────────────────────────
    for (let t = 0; t < L; t += 1) {
      const item = ids[t];
      const bucket = timeIds[t];
      for (let d = 0; d < dModel; d += 1) {
        const g = dX.data[t * dModel + d];
        // Input-lookup half of the tied embedding's gradient.
        grads.itemEmbedding.data[item * dModel + d] += g;
        grads.positionEmbedding.data[t * dModel + d] += g;
        grads.timeEmbedding.data[bucket * dModel + d] += g;
      }
    }

    return grads;
  }

  /** Cross-entropy of one forward pass against its target. */
  static loss(probs, target) {
    // Floored before the log. A probability that underflows to exactly 0 gives
    // -Infinity, which propagates to every parameter on the next step and ends
    // the run with no error message.
    return -Math.log(Math.max(probs[target], 1e-12));
  }

  /**
   * Adam.
   *
   * Plain SGD needs a learning rate that suits both the embedding rows — each
   * updated only when its category appears — and the dense projections, updated
   * every step. There is no such rate: what keeps the embeddings moving blows up
   * the projections. Adam's per-parameter scaling is what makes one
   * hyperparameter work for both, which matters here because nobody is going to
   * tune this per deployment.
   */
  step(gradAccumulator, { learningRate = 0.01, beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8, weightDecay = 0, clipNorm = 5 } = {}) {
    this.optimizer.t += 1;
    const t = this.optimizer.t;

    // Global gradient-norm clipping. A single outlier sequence can otherwise
    // produce one enormous step that undoes an epoch of progress.
    if (clipNorm > 0) {
      let sumSq = 0;
      for (const grad of Object.values(gradAccumulator)) {
        for (let i = 0; i < grad.data.length; i += 1) sumSq += grad.data[i] * grad.data[i];
      }
      const norm = Math.sqrt(sumSq);
      if (norm > clipNorm) {
        const factor = clipNorm / norm;
        for (const grad of Object.values(gradAccumulator)) {
          for (let i = 0; i < grad.data.length; i += 1) grad.data[i] *= factor;
        }
      }
    }

    const biasCorrection1 = 1 - Math.pow(beta1, t);
    const biasCorrection2 = 1 - Math.pow(beta2, t);

    for (const [name, matrix] of Object.entries(this.params)) {
      const grad = gradAccumulator[name];
      if (!grad) continue;
      const m = this.optimizer.m[name];
      const v = this.optimizer.v[name];

      for (let i = 0; i < matrix.data.length; i += 1) {
        // Decoupled weight decay: applied to the parameter, not folded into the
        // gradient, so Adam's normalisation does not undo it.
        const g = grad.data[i] + weightDecay * matrix.data[i];
        m[i] = beta1 * m[i] + (1 - beta1) * g;
        v[i] = beta2 * v[i] + (1 - beta2) * g * g;
        const mHat = m[i] / biasCorrection1;
        const vHat = v[i] / biasCorrection2;
        matrix.data[i] -= learningRate * mHat / (Math.sqrt(vHat) + epsilon);
      }
    }
  }

  /** Predicts the next-category distribution for a sequence. */
  predict(items, buckets) {
    const cache = this.forward(items, buckets);
    return cache.probs;
  }

  toJSON() {
    const weights = {};
    for (const [name, matrix] of Object.entries(this.params)) {
      weights[name] = {
        rows: matrix.rows,
        cols: matrix.cols,
        // Rounded to six significant decimals. The stored JSON is the largest
        // row in the table and this roughly halves it, well below the precision
        // a softmax over a few dozen categories can resolve.
        data: Array.from(matrix.data, (value) => Math.round(value * 1e6) / 1e6),
      };
    }
    return {
      format: 'seqmodel/1',
      vocabSize: this.vocabSize,
      dModel: this.dModel,
      nHeads: this.nHeads,
      maxLen: this.maxLen,
      dFF: this.dFF,
      seed: this.seed,
      weights,
    };
  }

  static fromJSON(data) {
    if (!data || data.format !== 'seqmodel/1') {
      throw new Error('Unrecognised sequence model format; retrain rather than load.');
    }
    const model = new SequenceModel({
      vocabSize: data.vocabSize,
      dModel: data.dModel,
      nHeads: data.nHeads,
      maxLen: data.maxLen,
      dFF: data.dFF,
      seed: data.seed,
    });
    for (const [name, stored] of Object.entries(data.weights)) {
      const matrix = model.params[name];
      if (!matrix) continue;
      if (matrix.rows !== stored.rows || matrix.cols !== stored.cols) {
        // Refusing is the only safe response. Reshaping weights trained for a
        // different architecture produces a model that runs and predicts noise.
        throw new Error(
          `Sequence model weight "${name}" is ${stored.rows}x${stored.cols}, ` +
          `architecture expects ${matrix.rows}x${matrix.cols}`
        );
      }
      matrix.data.set(stored.data);
    }
    model._initOptimizer();
    return model;
  }
}

module.exports = {
  SequenceModel,
  timeBucket,
  softmaxRow,
  matmul,
  matmulTransposeA,
  matmulTransposeB,
  zeros,
  seededRandom,
  gaussian,
  TIME_BUCKET_EDGES,
  N_TIME_BUCKETS,
};
