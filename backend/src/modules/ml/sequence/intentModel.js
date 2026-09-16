/**
 * The sequence model as the platform uses it.
 *
 * transformer.js is the architecture and knows nothing about shops. This turns
 * the event log into training sequences, owns the category vocabulary, trains,
 * persists to ml_sequence_model, and serves `predictNextCategory` to the ranker.
 *
 * ── What a sequence is here ────────────────────────────────────────────────
 *
 * One user's weighted interactions, ordered by time, mapped to the *category*
 * of the item rather than the item itself. Categories, not shops, for two
 * reasons. The vocabulary stays in the dozens rather than the thousands, which
 * is what makes a model this small trainable on this much data. And the useful
 * prediction is "they are shopping for a plumber next", not "they will tap shop
 * #4471" — the ranker already knows how to order plumbers once it knows that is
 * what is wanted.
 *
 * ── Sessions ───────────────────────────────────────────────────────────────
 *
 * A user's history is split into sessions at a gap of six hours, and each
 * session yields training examples independently. Without the split, the model
 * is asked to predict Tuesday's errand from Monday's, which is not a
 * relationship that exists; with it, the task is "given what has happened in
 * this session, what comes next", which is both learnable and the thing the
 * feed needs.
 *
 * The elapsed-time embedding still sees the true gap, so the model retains the
 * ability to distinguish a rapid burst from a leisurely browse *within* a
 * session.
 */

const crypto = require('crypto');
const { SequenceModel, timeBucket } = require('./transformer');
const { query } = require('../../../config/database');
const logger = require('../../../config/logger');

/** Gap at which one session ends and the next begins. */
const SESSION_GAP_MS = 6 * 3600 * 1000;

/** Index 0 is reserved as a pad/unknown slot and is never a target. */
const PAD = 0;

/** Shortest prefix worth training on: one event predicting the next. */
const MIN_SEQUENCE = 2;

/**
 * Builds the category vocabulary.
 *
 * Read from shop_categories rather than inferred from the events, so a category
 * with no interactions yet still has an embedding row. Inferring it would mean
 * the vocabulary silently changes shape whenever a quiet category goes a week
 * without a click, and every stored weight matrix would become unloadable.
 */
async function buildVocabulary() {
  const vocabulary = new Map(); // slug -> index
  const labels = [PAD];

  try {
    const res = await query(
      'SELECT id, slug, name FROM shop_categories ORDER BY slug'
    );
    for (const row of res.rows || res || []) {
      const key = String(row.slug || row.id);
      if (vocabulary.has(key)) continue;
      vocabulary.set(key, labels.length);
      labels.push({ id: row.id, slug: row.slug, name: row.name });
    }
  } catch (err) {
    logger.warn('Sequence model: category vocabulary unavailable: ' + err.message);
  }

  return { vocabulary, labels, size: labels.length };
}

/**
 * Loads each user's ordered interaction history, joined to categories.
 *
 * Impressions are excluded. They carry weight zero by design — being shown
 * something is not evidence of wanting it — and including them would train the
 * model to predict whatever the ranker already chose to show, which is the
 * feedback loop the telemetry module takes care to avoid creating.
 */
async function loadSequences({ limit = 20000, minEvents = MIN_SEQUENCE } = {}) {
  const { vocabulary, labels, size } = await buildVocabulary();
  if (size <= 1) return { sequences: [], vocabulary, labels, size };

  let rows = [];
  try {
    const res = await query(
      `SELECT e.user_id      AS user_id,
              e.created_at   AS created_at,
              COALESCE(c.slug, s.category) AS category
         FROM ml_interaction_events e
         JOIN local_shops s      ON s.id = e.item_id
    LEFT JOIN shop_categories c   ON c.id = s.category_id
        WHERE e.item_type = 'shop'
          AND e.weight > 0
          AND e.user_id IS NOT NULL
        ORDER BY e.user_id, e.created_at
        LIMIT $1`,
      [limit]
    );
    rows = res.rows || res || [];
  } catch (err) {
    logger.warn('Sequence model: event history unavailable: ' + err.message);
    return { sequences: [], vocabulary, labels, size };
  }

  const sequences = [];
  let currentUser = null;
  let current = null;

  const flush = () => {
    if (current && current.items.length >= minEvents) sequences.push(current);
    current = null;
  };

  for (const row of rows) {
    const index = vocabulary.get(String(row.category));
    if (index === undefined) continue;

    const at = new Date(String(row.created_at).replace(' ', 'T')).getTime();
    if (!Number.isFinite(at)) continue;

    if (row.user_id !== currentUser) {
      flush();
      currentUser = row.user_id;
      current = { userId: row.user_id, items: [], times: [] };
    } else if (current && current.times.length > 0) {
      const gap = at - current.times[current.times.length - 1];
      if (gap > SESSION_GAP_MS) {
        flush();
        current = { userId: row.user_id, items: [], times: [] };
      }
    }

    if (!current) current = { userId: row.user_id, items: [], times: [] };
    current.items.push(index);
    current.times.push(at);
  }
  flush();

  return { sequences, vocabulary, labels, size };
}

/**
 * Expands sessions into (prefix, next) training examples.
 *
 * Every prefix of a session is an example, so a session of five events yields
 * four. This is standard for next-item models and it is what makes a small
 * event log usable: the number of examples grows with total events rather than
 * with sessions.
 */
function toExamples(sequences, maxLen) {
  const examples = [];
  for (const sequence of sequences) {
    const { items, times } = sequence;
    for (let end = 1; end < items.length; end += 1) {
      const start = Math.max(0, end - maxLen);
      const prefixItems = items.slice(start, end);
      const prefixTimes = times.slice(start, end);

      const buckets = prefixTimes.map((at, i) => (
        i === 0 ? 0 : timeBucket(at - prefixTimes[i - 1])
      ));

      examples.push({
        items: prefixItems,
        buckets,
        target: items[end],
        at: times[end],
        userId: sequence.userId,
      });
    }
  }
  return examples;
}

/**
 * The baseline the model has to beat: predict the most frequent category.
 *
 * Every recommender should be compared against this, and most are not. A
 * next-category model that cannot beat "always say groceries" is not a model,
 * and on a skewed catalogue that baseline is a great deal stronger than it
 * sounds.
 */
function popularityBaseline(examples) {
  const counts = new Map();
  for (const example of examples) {
    counts.set(example.target, (counts.get(example.target) || 0) + 1);
  }
  let best = PAD;
  let bestCount = -1;
  for (const [target, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      best = target;
    }
  }
  return { prediction: best, accuracy: examples.length > 0 ? bestCount / examples.length : 0 };
}

function accuracyOf(model, examples) {
  if (examples.length === 0) return 0;
  let correct = 0;
  for (const example of examples) {
    const probs = model.predict(example.items, example.buckets);
    let best = 1;
    // Slot 0 is the pad and is never a legitimate prediction.
    for (let c = 1; c < probs.length; c += 1) if (probs[c] > probs[best]) best = c;
    if (best === example.target) correct += 1;
  }
  return correct / examples.length;
}

/**
 * Trains a model and, if it beats the baseline, persists it as the active one.
 *
 * The split is chronological rather than random. A random split lets the model
 * train on Thursday and be evaluated on Wednesday, which for a model over time
 * ordered behaviour is a straightforward leak — the evaluation then reports an
 * accuracy the model will never reproduce in production.
 */
async function train({
  dModel = 32,
  nHeads = 4,
  maxLen = 50,
  epochs = 8,
  learningRate = 0.01,
  batchSize = 16,
  validationFraction = 0.2,
  persist = true,
  seed = 1234,
} = {}) {
  const started = Date.now();

  const { sequences, labels, size } = await loadSequences();
  if (size <= 1) {
    return { trained: false, reason: 'no_vocabulary' };
  }

  const examples = toExamples(sequences, maxLen);
  if (examples.length < 50) {
    // Below this there is nothing to learn and a model trained anyway would be
    // confident noise. Reporting the shortfall is more useful than shipping it.
    return {
      trained: false,
      reason: 'insufficient_history',
      examples: examples.length,
      required: 50,
      sequences: sequences.length,
    };
  }

  examples.sort((a, b) => a.at - b.at);
  const splitAt = Math.floor(examples.length * (1 - validationFraction));
  const trainSet = examples.slice(0, splitAt);
  const validationSet = examples.slice(splitAt);

  if (trainSet.length === 0 || validationSet.length === 0) {
    return { trained: false, reason: 'split_empty', examples: examples.length };
  }

  const model = new SequenceModel({ vocabSize: size, dModel, nHeads, maxLen, seed });

  const history = [];
  for (let epoch = 0; epoch < epochs; epoch += 1) {
    let epochLoss = 0;

    for (let start = 0; start < trainSet.length; start += batchSize) {
      const batch = trainSet.slice(start, start + batchSize);

      // Gradients accumulated across the batch and applied once. Stepping per
      // example on a dataset this small makes the trajectory dominated by
      // whichever example came last.
      const accumulated = {};
      for (const [name, matrix] of Object.entries(model.params)) {
        accumulated[name] = { rows: matrix.rows, cols: matrix.cols, data: new Float64Array(matrix.data.length) };
      }

      for (const example of batch) {
        const cache = model.forward(example.items, example.buckets);
        epochLoss += SequenceModel.loss(cache.probs, example.target);
        const grads = model.backward(cache, example.target);
        for (const [name, grad] of Object.entries(grads)) {
          const into = accumulated[name].data;
          for (let i = 0; i < grad.data.length; i += 1) into[i] += grad.data[i];
        }
      }

      const scale = 1 / batch.length;
      for (const grad of Object.values(accumulated)) {
        for (let i = 0; i < grad.data.length; i += 1) grad.data[i] *= scale;
      }

      model.step(accumulated, { learningRate, weightDecay: 1e-5 });
    }

    history.push({ epoch, loss: epochLoss / trainSet.length });
  }

  const heldOutAccuracy = accuracyOf(model, validationSet);
  const baseline = popularityBaseline(trainSet);
  const baselineAccuracy = validationSet.filter((e) => e.target === baseline.prediction).length / validationSet.length;

  const beatsBaseline = heldOutAccuracy > baselineAccuracy;

  const metrics = {
    held_out_accuracy: heldOutAccuracy,
    baseline_accuracy: baselineAccuracy,
    beats_baseline: beatsBaseline,
    examples: examples.length,
    train_examples: trainSet.length,
    validation_examples: validationSet.length,
    sequences: sequences.length,
    vocabulary: size,
    parameters: model.parameterCount,
    final_loss: history.length ? history[history.length - 1].loss : null,
    duration_ms: Date.now() - started,
  };

  if (!persist) return { trained: true, persisted: false, model, metrics, history };

  // A model that does not beat "always predict the most common category" is
  // worse than the baseline it would replace, and activating it would make the
  // feed worse while every dashboard showed a model successfully deployed.
  if (!beatsBaseline) {
    logger.warn(
      `Sequence model trained but did not beat the popularity baseline ` +
      `(${(heldOutAccuracy * 100).toFixed(1)}% vs ${(baselineAccuracy * 100).toFixed(1)}%). Not activating.`
    );
    return { trained: true, persisted: false, reason: 'did_not_beat_baseline', metrics, history };
  }

  try {
    const versionRes = await query('SELECT MAX(version) AS v FROM ml_sequence_model');
    const version = (Number((versionRes.rows || versionRes || [])[0]?.v) || 0) + 1;

    await query('UPDATE ml_sequence_model SET is_active = 0 WHERE is_active = 1');
    await query(
      `INSERT INTO ml_sequence_model
         (id, version, is_active, d_model, n_heads, max_len, vocabulary, weights, metrics)
       VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8)`,
      [
        crypto.randomUUID(),
        version,
        dModel,
        nHeads,
        maxLen,
        JSON.stringify(labels),
        JSON.stringify(model.toJSON()),
        JSON.stringify(metrics),
      ]
    );

    invalidate();
    logger.info(
      `Sequence model v${version} active: ${(heldOutAccuracy * 100).toFixed(1)}% held-out ` +
      `vs ${(baselineAccuracy * 100).toFixed(1)}% baseline, ${model.parameterCount} parameters.`
    );

    return { trained: true, persisted: true, version, metrics, history };
  } catch (err) {
    logger.error('Sequence model: could not persist: ' + err.message);
    return { trained: true, persisted: false, reason: 'persist_failed', error: err.message, metrics };
  }
}

/** Loaded once at boot and after a training run; never inside a request. */
let active = null; // { model, labels, slugToIndex, version, loadedAt }
let loading = null;

async function loadActive({ force = false } = {}) {
  if (!force && active) return active;
  // Concurrent callers share one load rather than each deserialising the
  // weights. At boot several requests can arrive before the first finishes.
  if (loading) return loading;

  loading = (async () => {
    try {
      const res = await query(
        `SELECT version, d_model, n_heads, max_len, vocabulary, weights, metrics
           FROM ml_sequence_model WHERE is_active = 1 LIMIT 1`
      );
      const row = (res.rows || res || [])[0];
      if (!row) {
        active = null;
        return null;
      }

      const labels = JSON.parse(row.vocabulary);
      const model = SequenceModel.fromJSON(JSON.parse(row.weights));

      const slugToIndex = new Map();
      labels.forEach((label, index) => {
        if (index === PAD || !label) return;
        if (label.slug) slugToIndex.set(String(label.slug), index);
        if (label.id) slugToIndex.set(String(label.id), index);
      });

      active = {
        model,
        labels,
        slugToIndex,
        version: row.version,
        metrics: row.metrics ? JSON.parse(row.metrics) : null,
        loadedAt: Date.now(),
      };
      logger.info(`Sequence model v${row.version} loaded (${model.parameterCount} parameters).`);
      return active;
    } catch (err) {
      logger.warn('Sequence model: load failed, intent term will be inert: ' + err.message);
      active = null;
      return null;
    } finally {
      loading = null;
    }
  })();

  return loading;
}

/**
 * Predicted next-category distribution for a session.
 *
 * `sessionEvents` are `{ category, at }` in chronological order — what the
 * client has observed this session, which is fresher than anything the event
 * log has yet ingested.
 *
 * Returns null rather than a uniform distribution when there is no model or no
 * usable history. A uniform distribution looks like a prediction and would be
 * mixed into ranking as though it meant something; null makes the caller's
 * "no signal" branch explicit.
 */
async function predictNextCategory(userId, sessionEvents = []) {
  const state = await loadActive();
  if (!state) return null;

  const items = [];
  const times = [];

  for (const event of sessionEvents) {
    const index = state.slugToIndex.get(String(event.category));
    if (index === undefined) continue;
    const at = Number(event.at) || Date.now();
    items.push(index);
    times.push(at);
  }

  if (items.length === 0) return null;

  const buckets = times.map((at, i) => (i === 0 ? 0 : timeBucket(at - times[i - 1])));

  let probs;
  try {
    probs = state.model.predict(items, buckets);
  } catch (err) {
    logger.warn('Sequence model: prediction failed: ' + err.message);
    return null;
  }

  const distribution = new Map();
  let best = null;
  let bestProb = 0;
  let entropy = 0;

  for (let c = 1; c < probs.length; c += 1) {
    const label = state.labels[c];
    if (!label) continue;
    const p = probs[c];
    distribution.set(String(label.slug || label.id), p);
    if (p > 0) entropy -= p * Math.log(p);
    if (p > bestProb) {
      bestProb = p;
      best = label;
    }
  }

  // Confidence as one minus normalised entropy, not as the top probability.
  // A top probability of 0.3 means something entirely different when the
  // runner-up is 0.29 than when it is 0.02, and the ranker needs to know which.
  const maxEntropy = Math.log(Math.max(distribution.size, 2));
  const confidence = maxEntropy > 0 ? Math.max(0, 1 - entropy / maxEntropy) : 0;

  return {
    distribution,
    top_category: best ? String(best.slug || best.id) : null,
    top_probability: bestProb,
    intent_confidence: confidence,
    model_version: state.version,
  };
}

/**
 * Per-candidate intent scores, for the ranker's weighted sum.
 *
 * The predicted probability of a candidate's own category, scaled by how
 * confident the whole prediction is. A confident prediction moves ranking; a
 * diffuse one barely does, without needing a separate threshold to be tuned.
 */
function intentScores(candidates, prediction) {
  const out = new Map();
  if (!prediction || !prediction.distribution) return out;

  let max = 0;
  for (const p of prediction.distribution.values()) if (p > max) max = p;
  if (max <= 0) return out;

  for (const candidate of candidates) {
    const key = String(candidate.category_slug || candidate.category_id || candidate.category || '');
    const p = prediction.distribution.get(key);
    if (p === undefined) continue;
    out.set(candidate.id, (p / max) * prediction.intent_confidence);
  }
  return out;
}

function invalidate() {
  active = null;
}

async function stats() {
  const state = await loadActive();
  if (!state) {
    let versions = 0;
    try {
      const res = await query('SELECT COUNT(*) AS c FROM ml_sequence_model');
      versions = Number((res.rows || res || [])[0]?.c) || 0;
    } catch { /* table may not exist yet */ }
    return { active: false, versions };
  }
  return {
    active: true,
    version: state.version,
    parameters: state.model.parameterCount,
    vocabulary: state.labels.length,
    max_len: state.model.maxLen,
    d_model: state.model.dModel,
    n_heads: state.model.nHeads,
    metrics: state.metrics,
    loaded_ms_ago: Date.now() - state.loadedAt,
  };
}

module.exports = {
  train,
  loadActive,
  predictNextCategory,
  intentScores,
  loadSequences,
  buildVocabulary,
  toExamples,
  popularityBaseline,
  accuracyOf,
  invalidate,
  stats,
  SESSION_GAP_MS,
  MIN_SEQUENCE,
  PAD,
};
