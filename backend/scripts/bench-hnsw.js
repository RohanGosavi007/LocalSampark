#!/usr/bin/env node
/**
 * HNSW benchmark: recall against brute force, and query latency.
 *
 * The performance budget for approximate search is a claim, and a claim about
 * an approximate algorithm is worth nothing without the recall figure beside
 * it. An index that answers in 2ms and returns the wrong neighbours is not a
 * fast index, it is a broken one — and it fails silently, because "wrong
 * neighbours" and "right neighbours" are both plausible-looking lists of shops.
 *
 * So this measures both together, against exact search over the same vectors.
 *
 * Usage:
 *   node scripts/bench-hnsw.js                 # 100k vectors, dim 64
 *   node scripts/bench-hnsw.js --n 10000 --dim 128 --ef 128 --k 10
 *
 * Exits non-zero when recall@k or p95 latency misses the budget, so it can be
 * wired into CI as a regression gate rather than read by eye.
 */

const path = require('path');
const { HNSWIndex } = require(path.join(__dirname, '..', 'src', 'modules', 'ml', 'vector', 'hnsw'));

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || i === process.argv.length - 1) return fallback;
  const value = Number(process.argv[i + 1]);
  return Number.isFinite(value) ? value : fallback;
}

const N = arg('n', 100000);
const DIM = arg('dim', 64);
const K = arg('k', 10);
const EF = arg('ef', 64);
const M = arg('m', 16);
const EF_CONSTRUCTION = arg('efc', 200);
const QUERIES = arg('queries', 200);

const TARGET_RECALL = 0.95;
const TARGET_P95_MS = 20;

/**
 * Clustered synthetic data, not uniform noise.
 *
 * Uniform random vectors in high dimensions are all roughly equidistant, which
 * makes every ANN algorithm look equally good and measures nothing. Real
 * catalogue embeddings are clustered — groceries near groceries — and clustered
 * data is where the neighbour-selection heuristic earns its place.
 */
function makeVectors(n, dim, clusters = 64) {
  let state = 12345;
  const rand = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };

  const centres = [];
  for (let c = 0; c < clusters; c += 1) {
    const centre = new Float32Array(dim);
    for (let d = 0; d < dim; d += 1) centre[d] = rand() * 2 - 1;
    centres.push(centre);
  }

  const vectors = [];
  for (let i = 0; i < n; i += 1) {
    const centre = centres[i % clusters];
    const vec = new Float32Array(dim);
    for (let d = 0; d < dim; d += 1) vec[d] = centre[d] + (rand() - 0.5) * 0.6;
    vectors.push(vec);
  }
  return vectors;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function main() {
  console.log(`HNSW benchmark — n=${N} dim=${DIM} M=${M} efConstruction=${EF_CONSTRUCTION} efSearch=${EF} k=${K}`);

  const vectors = makeVectors(N, DIM);

  const buildStart = Date.now();
  const index = new HNSWIndex({ dim: DIM, M, efConstruction: EF_CONSTRUCTION, metric: 'cosine' });
  for (let i = 0; i < N; i += 1) index.add(`item-${i}`, vectors[i]);
  const buildMs = Date.now() - buildStart;

  console.log(`\nBuild: ${(buildMs / 1000).toFixed(1)}s (${(buildMs / N).toFixed(3)}ms/vector)`);
  console.log(`Index: ${JSON.stringify(index.stats())}`);

  // Queries are held-out points near the same cluster centres, not members of
  // the index. Querying with a vector that is in the index makes recall@k
  // flattering: its own entry is always rank 1 and the search starts on top of
  // the answer.
  const queries = makeVectors(QUERIES, DIM, 64);

  const latencies = [];
  let recallSum = 0;

  for (const queryVec of queries) {
    const truth = new Set(index.bruteForce(queryVec, K).map((r) => r.label));

    const started = process.hrtime.bigint();
    const approx = index.search(queryVec, K, { ef: EF });
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
    latencies.push(elapsedMs);

    let hits = 0;
    for (const result of approx) if (truth.has(result.label)) hits += 1;
    recallSum += hits / Math.max(truth.size, 1);
  }

  latencies.sort((a, b) => a - b);
  const recall = recallSum / queries.length;
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);

  console.log(`\nRecall@${K}: ${recall.toFixed(4)}   (target > ${TARGET_RECALL})`);
  console.log(`Latency p50: ${p50.toFixed(3)}ms`);
  console.log(`Latency p95: ${p95.toFixed(3)}ms   (target < ${TARGET_P95_MS}ms)`);
  console.log(`Latency p99: ${p99.toFixed(3)}ms`);

  const recallOk = recall > TARGET_RECALL;
  const latencyOk = p95 < TARGET_P95_MS;

  console.log(`\n${recallOk && latencyOk ? '✅ within budget' : '❌ outside budget'}`);
  if (!recallOk) console.log(`   recall ${recall.toFixed(4)} <= ${TARGET_RECALL}`);
  if (!latencyOk) console.log(`   p95 ${p95.toFixed(3)}ms >= ${TARGET_P95_MS}ms`);

  process.exit(recallOk && latencyOk ? 0 : 1);
}

main();
