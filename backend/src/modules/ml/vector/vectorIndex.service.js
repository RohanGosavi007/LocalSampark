/**
 * The vector index as the rest of the platform uses it.
 *
 * hnsw.js is the algorithm and knows nothing about shops. This is the layer
 * that decides what goes in it, where it lives on disk, how it is sharded, and
 * how its results are fused with keyword search.
 *
 * ── Turning TF-IDF into something HNSW can index ───────────────────────────
 *
 * embedding.service.js produces sparse term -> weight maps over a vocabulary of
 * a few thousand terms. HNSW needs dense, fixed-dimension vectors. The bridge is
 * signed feature hashing: each term is hashed to a coordinate and a sign, and
 * its weight is added there.
 *
 * Hashing rather than keeping a term -> column dictionary, for one reason that
 * matters operationally: the vocabulary changes every time the catalogue does.
 * A dictionary would make every stored vector invalid the moment a new shop
 * introduced a new word, so the whole index would have to be rebuilt to stay
 * consistent — and a half-rebuilt index silently mixes two coordinate systems.
 * A hash is fixed for all time, so an incremental update is meaningful.
 *
 * The cost is collisions: two terms sharing a coordinate. The signs make
 * collisions cancel in expectation rather than accumulate, which is the whole
 * point of the signed variant, and at 256 dimensions over this vocabulary the
 * distortion is far below what ranking can resolve. `projectionError` measures
 * it so the claim is checkable rather than asserted.
 *
 * ── Geo-sharding ───────────────────────────────────────────────────────────
 *
 * One index per pincode prefix. A hyperlocal query is, by construction, only
 * interested in a small geographic neighbourhood, so searching a national index
 * and then filtering by distance does the expensive part of the work for
 * results that are thrown away. Searching the caller's own shard plus its
 * neighbours keeps recall — a shop one street over is in the adjacent shard —
 * while the index actually scanned stays small.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { HNSWIndex } = require('./hnsw');
const embeddings = require('../services/embedding.service');
const { query } = require('../../../config/database');
const logger = require('../../../config/logger');

const DEFAULT_DIM = 256;
const INDEX_DIR = path.join(__dirname, '..', '..', '..', 'data', 'vector');

/** Shard key for a pincode. Three digits is an Indian postal sorting district. */
const SHARD_PREFIX_LENGTH = 3;
const GLOBAL_SHARD = '__all__';

function shardFor(pincode) {
  const digits = String(pincode || '').replace(/\D/g, '');
  if (digits.length < SHARD_PREFIX_LENGTH) return GLOBAL_SHARD;
  return digits.slice(0, SHARD_PREFIX_LENGTH);
}

/**
 * Shards worth searching for a query in one shard.
 *
 * Numerically adjacent prefixes, which in the Indian pincode system are
 * genuinely neighbouring sorting districts — 411 and 412 are both Pune. This is
 * an approximation of adjacency, not a geometric one, and it is the right kind
 * of approximation here: the exact Haversine filter runs afterwards in the
 * retrieval stage regardless, so a shard included unnecessarily costs a little
 * time and a shard wrongly excluded costs recall. It errs toward inclusion.
 */
function neighbourShards(shard) {
  if (shard === GLOBAL_SHARD) return [GLOBAL_SHARD];
  const base = Number(shard);
  if (!Number.isFinite(base)) return [shard, GLOBAL_SHARD];
  const out = [shard];
  for (const delta of [-1, 1]) {
    const neighbour = String(base + delta).padStart(SHARD_PREFIX_LENGTH, '0');
    if (neighbour.length === SHARD_PREFIX_LENGTH) out.push(neighbour);
  }
  out.push(GLOBAL_SHARD);
  return out;
}

/**
 * Signed feature hashing, deterministic across processes and restarts.
 *
 * MD5 rather than a cheap string hash because the distribution matters: a weak
 * hash clusters related terms — which in this corpus share prefixes — into the
 * same coordinates, and correlated collisions do not cancel.
 */
function hashTerm(term, dim) {
  const digest = crypto.createHash('md5').update(term).digest();
  const bucket = digest.readUInt32BE(0) % dim;
  // The sign comes from a different byte than the bucket, so bucket and sign
  // are independent. Deriving both from the same bits would correlate them.
  const sign = (digest[4] & 1) === 0 ? 1 : -1;
  return { bucket, sign };
}

/** Projects one sparse TF-IDF vector into a dense array. */
function denseFromSparse(sparse, dim = DEFAULT_DIM) {
  const out = new Float32Array(dim);
  if (!sparse || sparse.size === 0) return out;
  for (const [term, weight] of sparse) {
    const { bucket, sign } = hashTerm(term, dim);
    out[bucket] += sign * weight;
  }
  return out;
}

/**
 * How much the projection distorts similarity, measured against the sparse
 * cosine it is meant to approximate.
 *
 * Exists so the dimension can be chosen from evidence. Reports mean and maximum
 * absolute error over a sample of pairs.
 */
function projectionError(sparseVectors, dim = DEFAULT_DIM, sampleSize = 200) {
  const entries = [...sparseVectors.entries()];
  if (entries.length < 2) return { pairs: 0, mean_error: 0, max_error: 0 };

  const dense = new Map();
  for (const [id, sparse] of entries) {
    const vec = denseFromSparse(sparse, dim);
    let sumSq = 0;
    for (let i = 0; i < vec.length; i += 1) sumSq += vec[i] * vec[i];
    const norm = Math.sqrt(sumSq);
    if (norm > 0) for (let i = 0; i < vec.length; i += 1) vec[i] /= norm;
    dense.set(id, vec);
  }

  let total = 0;
  let worst = 0;
  let pairs = 0;

  for (let n = 0; n < sampleSize; n += 1) {
    const a = entries[(n * 7919) % entries.length];
    const b = entries[(n * 104729 + 13) % entries.length];
    if (a[0] === b[0]) continue;

    const sparseCos = embeddings.cosine(a[1], b[1]);
    const denseA = dense.get(a[0]);
    const denseB = dense.get(b[0]);
    let denseCos = 0;
    for (let i = 0; i < denseA.length; i += 1) denseCos += denseA[i] * denseB[i];

    const error = Math.abs(sparseCos - denseCos);
    total += error;
    if (error > worst) worst = error;
    pairs += 1;
  }

  return {
    pairs,
    dim,
    mean_error: pairs > 0 ? total / pairs : 0,
    max_error: worst,
  };
}

/** shard -> { index, builtAt } */
let shards = new Map();
let buildMeta = { builtAt: null, dim: DEFAULT_DIM, items: 0, build_ms: 0 };

/**
 * Builds every shard from the current catalogue.
 *
 * The whole index is rebuilt rather than updated in place. HNSW supports
 * incremental insertion and this deliberately does not use it for the scheduled
 * build: the graph quality of an index built by a million interleaved inserts
 * and deletes degrades in ways nothing measures until recall is checked, and
 * the catalogue is small enough that a clean rebuild is cheap. Incremental
 * `add` remains available for the single-shop case, where it is correct.
 */
async function build({ dim = DEFAULT_DIM, M = 16, efConstruction = 200, persist = true } = {}) {
  const started = Date.now();

  const textIndex = await embeddings.getIndex();
  if (textIndex.vectors.size === 0) {
    return { built: false, reason: 'no_vectors', items: 0 };
  }

  // Pincodes decide shard membership. A shop without one lands in the global
  // shard rather than being dropped — an unsharded shop must still be findable.
  const pincodes = new Map();
  try {
    const res = await query(
      'SELECT id, pincode FROM local_shops WHERE COALESCE(is_active, 1) = 1'
    );
    for (const row of res.rows || res || []) pincodes.set(String(row.id), row.pincode);
  } catch (err) {
    logger.warn('Vector index: pincodes unavailable, building a single shard: ' + err.message);
  }

  const next = new Map();
  let items = 0;

  for (const [id, sparse] of textIndex.vectors) {
    const dense = denseFromSparse(sparse, dim);

    // A shop whose text tokenised to nothing has a zero vector and would never
    // be anyone's neighbour. Indexing it costs a slot and returns nothing;
    // skipping it keeps the index honest about what it can answer.
    let sumSq = 0;
    for (let i = 0; i < dense.length; i += 1) sumSq += dense[i] * dense[i];
    if (sumSq === 0) continue;

    const shardKey = shardFor(pincodes.get(String(id)));

    // Every shop is also in the global shard, so a query with no pincode — or
    // one in a district with no shops — still has somewhere to search. The
    // duplication doubles memory and is worth it: the alternative is a
    // location-less query returning nothing.
    //
    // Deduplicated because a shop with no pincode shards to GLOBAL_SHARD
    // already, and iterating [shardKey, GLOBAL_SHARD] blindly then visits the
    // same shard twice. The index itself is unharmed — `add` replaces by
    // label — but `items` counted every such shop twice, which on a catalogue
    // with no pincodes reported exactly double the true size. A stat that
    // silently doubles is worse than a missing one: it is the number an
    // operator would check to see whether the index covers the catalogue.
    const targets = shardKey === GLOBAL_SHARD ? [GLOBAL_SHARD] : [shardKey, GLOBAL_SHARD];

    for (const key of targets) {
      if (!next.has(key)) {
        next.set(key, new HNSWIndex({ dim, M, efConstruction, metric: 'cosine' }));
      }
      next.get(key).add(String(id), dense);
      if (key === GLOBAL_SHARD) items += 1;
    }
  }

  shards = next;
  buildMeta = {
    builtAt: Date.now(),
    dim,
    items,
    shards: shards.size,
    build_ms: Date.now() - started,
  };

  logger.info(
    `Vector index built: ${items} items across ${shards.size} shards, ` +
    `dim ${dim}, ${buildMeta.build_ms}ms.`
  );

  if (persist) {
    try {
      await save();
    } catch (err) {
      // An index that cannot be saved still serves this process. Losing it on
      // restart is a cost; refusing to serve because the disk is full is worse.
      logger.warn('Vector index: persist failed, serving from memory: ' + err.message);
    }
  }

  return { built: true, ...buildMeta };
}

/**
 * Writes each shard to disk, atomically.
 *
 * Write-then-rename, because rename is atomic on both filesystems this runs on
 * and a plain write is not. A process killed midway through a direct write
 * leaves a truncated JSON file that `fromJSON` will reject on next boot — which
 * is recoverable but means a cold start with no index. The temp file leaves the
 * previous good index in place until the new one is complete.
 */
async function save(directory = INDEX_DIR) {
  fs.mkdirSync(directory, { recursive: true });

  const manifest = { format: 'vector-shards/1', ...buildMeta, shards: [] };

  for (const [key, index] of shards) {
    const filename = `shard-${key}.json`;
    const target = path.join(directory, filename);
    const temp = `${target}.${process.pid}.tmp`;

    fs.writeFileSync(temp, JSON.stringify(index.toJSON()));
    fs.renameSync(temp, target);

    manifest.shards.push({ key, file: filename, size: index.size });
  }

  const manifestPath = path.join(directory, 'manifest.json');
  const manifestTemp = `${manifestPath}.${process.pid}.tmp`;
  fs.writeFileSync(manifestTemp, JSON.stringify(manifest, null, 2));
  fs.renameSync(manifestTemp, manifestPath);

  return { directory, shards: manifest.shards.length };
}

/**
 * Loads a persisted index.
 *
 * Returns false rather than throwing when there is nothing to load or the files
 * are unreadable. A missing index is an ordinary state — first boot, or a
 * deploy to a fresh disk — and the caller's response is to build one, not to
 * fail.
 */
async function load(directory = INDEX_DIR) {
  const manifestPath = path.join(directory, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return false;

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.format !== 'vector-shards/1') {
      logger.warn('Vector index: unrecognised manifest format, rebuilding.');
      return false;
    }

    const next = new Map();
    for (const entry of manifest.shards || []) {
      const file = path.join(directory, entry.file);
      if (!fs.existsSync(file)) continue;
      next.set(entry.key, HNSWIndex.fromJSON(JSON.parse(fs.readFileSync(file, 'utf8'))));
    }

    if (next.size === 0) return false;

    shards = next;
    buildMeta = {
      builtAt: manifest.builtAt,
      dim: manifest.dim,
      items: manifest.items,
      shards: next.size,
      build_ms: manifest.build_ms,
      loaded_from_disk: true,
    };
    logger.info(`Vector index loaded from disk: ${next.size} shards, ${manifest.items} items.`);
    return true;
  } catch (err) {
    logger.warn('Vector index: load failed, will rebuild: ' + err.message);
    return false;
  }
}

/**
 * Nearest neighbours for a dense query vector.
 *
 * Searches the caller's shard and its neighbours, merges, and de-duplicates
 * keeping the best score per item — an item in both its own shard and the
 * global one would otherwise appear twice.
 */
function searchDense(queryVec, { pincode = null, k = 50, ef = 64 } = {}) {
  if (shards.size === 0) return [];

  const keys = pincode ? neighbourShards(shardFor(pincode)) : [GLOBAL_SHARD];
  const best = new Map();

  for (const key of keys) {
    const index = shards.get(key);
    if (!index) continue;
    for (const result of index.search(queryVec, k, { ef })) {
      const existing = best.get(result.label);
      if (!existing || result.score > existing.score) best.set(result.label, result);
    }
  }

  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, k);
}

/** Nearest neighbours for a text query, through the same projection. */
async function searchText(text, options = {}) {
  const sparse = await embeddings.embedText(text);
  if (!sparse || sparse.size === 0) return [];
  return searchDense(denseFromSparse(sparse, buildMeta.dim), options);
}

/**
 * Reciprocal rank fusion.
 *
 * Combines ranked lists by summing 1/(k + rank) rather than by blending scores.
 * Scores from BM25 and from cosine similarity are not on the same scale and
 * have no stable relationship — a normalisation that works on one corpus is
 * wrong on the next — so blending them means tuning a constant that silently
 * stops being right. Ranks are comparable by construction.
 *
 * `k` damps the influence of the very top ranks. At k = 60, the standard value,
 * rank 1 contributes 1/61 and rank 2 contributes 1/62: close enough that a list
 * cannot win on its first result alone, which is what stops one retriever
 * dominating whenever it is confident.
 */
function reciprocalRankFusion(lists, { k = 60, weights = null, limit = 50 } = {}) {
  const scores = new Map();
  const seen = new Map();

  lists.forEach((list, listIndex) => {
    const weight = weights && Number.isFinite(weights[listIndex]) ? weights[listIndex] : 1;
    list.forEach((item, rank) => {
      const id = String(item.id != null ? item.id : item.label);
      scores.set(id, (scores.get(id) || 0) + weight * (1 / (k + rank + 1)));
      if (!seen.has(id)) seen.set(id, item);
      // Record which retrievers found it. An item both agree on is a different
      // kind of result from one only the keyword side found, and the admin
      // console wants to be able to tell them apart.
      const entry = seen.get(id);
      entry._retrievers = entry._retrievers || [];
      if (!entry._retrievers.includes(listIndex)) entry._retrievers.push(listIndex);
    });
  });

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, score]) => ({
      ...seen.get(id),
      id,
      _fusion_score: score,
      _retriever_count: (seen.get(id)._retrievers || []).length,
    }));
}

/**
 * Hybrid retrieval: keyword and dense, fused.
 *
 * Both retrievers run against the same catalogue and disagree in useful ways.
 * Keyword search finds the shop whose name is literally what was typed; dense
 * search finds the shop whose description means the same thing in different
 * words. Fusing them is strictly better than either at the cost of running both,
 * and because they run concurrently the added latency is the slower of the two
 * rather than their sum.
 */
async function hybridSearch(text, { pincode = null, k = 50, ef = 64, rrfK = 60, denseWeight = 0.5, keywordSearch = null } = {}) {
  const started = Date.now();

  const [dense, keyword] = await Promise.all([
    Promise.resolve().then(() => searchText(text, { pincode, k, ef })).catch((err) => {
      logger.warn('Hybrid search: dense leg failed: ' + err.message);
      return [];
    }),
    typeof keywordSearch === 'function'
      ? Promise.resolve().then(() => keywordSearch(text)).catch((err) => {
        logger.warn('Hybrid search: keyword leg failed: ' + err.message);
        return [];
      })
      : Promise.resolve([]),
  ]);

  // One leg failing is not the query failing. The other leg's results are a
  // worse answer than the fusion, and a much better answer than an error.
  const denseItems = dense.map((r) => ({ id: r.label, _dense_score: r.score }));
  const keywordItems = (keyword || []).map((r) => ({ id: String(r.id), _keyword_score: r.score ?? null }));

  const fused = reciprocalRankFusion(
    [denseItems, keywordItems],
    { k: rrfK, weights: [denseWeight, 1 - denseWeight], limit: k }
  );

  return {
    items: fused,
    dense_count: denseItems.length,
    keyword_count: keywordItems.length,
    degraded: denseItems.length === 0 || keywordItems.length === 0,
    duration_ms: Date.now() - started,
  };
}

function stats() {
  const perShard = [];
  for (const [key, index] of shards) {
    perShard.push({ shard: key, ...index.stats() });
  }
  return {
    built: shards.size > 0,
    ...buildMeta,
    age_ms: buildMeta.builtAt ? Date.now() - buildMeta.builtAt : null,
    shards: perShard,
  };
}

function invalidate() {
  shards = new Map();
  buildMeta = { builtAt: null, dim: DEFAULT_DIM, items: 0, build_ms: 0 };
}

module.exports = {
  build,
  save,
  load,
  searchDense,
  searchText,
  hybridSearch,
  reciprocalRankFusion,
  denseFromSparse,
  projectionError,
  hashTerm,
  shardFor,
  neighbourShards,
  stats,
  invalidate,
  DEFAULT_DIM,
  GLOBAL_SHARD,
  INDEX_DIR,
};
