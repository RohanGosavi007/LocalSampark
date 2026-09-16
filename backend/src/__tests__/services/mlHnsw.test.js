/**
 * HNSW correctness.
 *
 * An approximate index fails in a way that produces no error: it returns ten
 * shops, they are plausible shops, and they are not the ten nearest. Nothing
 * downstream can detect that. So every test here measures against exact search
 * over the same vectors rather than asserting a shape.
 *
 * The recall floors are the contract the ranking path depends on. They are set
 * where a correct implementation sits comfortably and a subtly broken one — the
 * neighbour heuristic replaced with a nearest-M truncation, say — does not.
 */

process.env.USE_SQLITE = 'true';

const { HNSWIndex, Heap, seededRandom } = require('../../modules/ml/vector/hnsw');

/** Clustered vectors: uniform noise makes every ANN algorithm look equal. */
function makeVectors(n, dim, clusters = 16, seed = 7) {
  const rand = seededRandom(seed);
  const centres = [];
  for (let c = 0; c < clusters; c += 1) {
    const centre = new Float32Array(dim);
    for (let d = 0; d < dim; d += 1) centre[d] = rand() * 2 - 1;
    centres.push(centre);
  }
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const centre = centres[i % clusters];
    const vec = new Float32Array(dim);
    for (let d = 0; d < dim; d += 1) vec[d] = centre[d] + (rand() - 0.5) * 0.6;
    out.push(vec);
  }
  return out;
}

function buildIndex(vectors, dim, options = {}) {
  const index = new HNSWIndex({ dim, M: 16, efConstruction: 200, metric: 'cosine', ...options });
  vectors.forEach((vec, i) => index.add(`item-${i}`, vec));
  return index;
}

/** Mean recall@k of approximate search against the index's own exact search. */
function measureRecall(index, queries, k, ef) {
  let total = 0;
  for (const queryVec of queries) {
    const truth = new Set(index.bruteForce(queryVec, k).map((r) => r.label));
    const approx = index.search(queryVec, k, { ef });
    let hits = 0;
    for (const result of approx) if (truth.has(result.label)) hits += 1;
    total += hits / Math.max(truth.size, 1);
  }
  return total / queries.length;
}

describe('Heap', () => {
  test('min-heap pops in ascending order', () => {
    const heap = new Heap(true);
    for (const d of [5, 1, 9, 3, 7, 2]) heap.push(d, `id${d}`);
    const popped = [];
    while (heap.size > 0) popped.push(heap.pop().distance);
    expect(popped).toEqual([1, 2, 3, 5, 7, 9]);
  });

  test('max-heap pops in descending order', () => {
    const heap = new Heap(false);
    for (const d of [5, 1, 9, 3, 7, 2]) heap.push(d, `id${d}`);
    const popped = [];
    while (heap.size > 0) popped.push(heap.pop().distance);
    expect(popped).toEqual([9, 7, 5, 3, 2, 1]);
  });

  test('keeps distance and id paired through sift operations', () => {
    const heap = new Heap(true);
    for (const d of [5, 1, 9, 3, 7, 2]) heap.push(d, `id${d}`);
    while (heap.size > 0) {
      const entry = heap.pop();
      expect(entry.id).toBe(`id${entry.distance}`);
    }
  });

  test('popping an empty heap returns null rather than undefined arithmetic', () => {
    expect(new Heap(true).pop()).toBeNull();
  });
});

describe('construction', () => {
  test('rejects a non-positive dimension rather than building an unusable index', () => {
    expect(() => new HNSWIndex({ dim: 0 })).toThrow(/positive integer dimension/);
    expect(() => new HNSWIndex({ dim: -4 })).toThrow(/positive integer dimension/);
  });

  test('rejects an unknown metric by name', () => {
    expect(() => new HNSWIndex({ dim: 8, metric: 'euclidean' })).toThrow(/Unknown HNSW metric/);
  });

  test('rejects a vector of the wrong dimension', () => {
    const index = new HNSWIndex({ dim: 8 });
    expect(() => index.add('a', new Float32Array(4))).toThrow(/dimension 4, index expects 8/);
  });

  test('an empty index returns no results rather than throwing', () => {
    const index = new HNSWIndex({ dim: 8 });
    expect(index.search(new Float32Array(8), 5)).toEqual([]);
  });

  test('a single-vector index returns that vector', () => {
    const index = new HNSWIndex({ dim: 4 });
    index.add('only', Float32Array.from([1, 0, 0, 0]));
    const results = index.search(Float32Array.from([1, 0, 0, 0]), 5);
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('only');
    expect(results[0].score).toBeCloseTo(1, 5);
  });

  test('a zero vector does not put NaN distances into the search', () => {
    // NaN compares false against everything, so it would silently corrupt the
    // heap ordering rather than raising.
    const index = new HNSWIndex({ dim: 4 });
    index.add('zero', Float32Array.from([0, 0, 0, 0]));
    index.add('real', Float32Array.from([1, 0, 0, 0]));
    const results = index.search(Float32Array.from([1, 0, 0, 0]), 2);
    for (const result of results) expect(Number.isFinite(result.distance)).toBe(true);
    expect(results[0].label).toBe('real');
  });

  test('re-adding a label replaces the vector rather than duplicating the label', () => {
    const index = new HNSWIndex({ dim: 4 });
    index.add('shop', Float32Array.from([1, 0, 0, 0]));
    index.add('shop', Float32Array.from([0, 1, 0, 0]));
    expect(index.size).toBe(1);

    const results = index.search(Float32Array.from([0, 1, 0, 0]), 1);
    expect(results[0].label).toBe('shop');
    expect(results[0].score).toBeCloseTo(1, 5);
  });
});

describe('recall against exact search', () => {
  const DIM = 32;
  const vectors = makeVectors(2000, DIM);
  const queries = makeVectors(60, DIM, 16, 99);
  const index = buildIndex(vectors, DIM);

  test('recall@10 exceeds 0.95 at the default search breadth', () => {
    expect(measureRecall(index, queries, 10, 64)).toBeGreaterThan(0.95);
  });

  test('recall@1 is essentially exact', () => {
    expect(measureRecall(index, queries, 1, 64)).toBeGreaterThan(0.95);
  });

  test('raising efSearch does not reduce recall', () => {
    // Monotonicity is the property that makes the ef slider meaningful. A
    // broken graph can still score well at one ef and worse at a higher one.
    const low = measureRecall(index, queries, 10, 16);
    const high = measureRecall(index, queries, 10, 256);
    expect(high).toBeGreaterThanOrEqual(low - 1e-9);
  });

  test('ef is raised to k when a caller asks for more results than beam width', () => {
    // Otherwise the beam is narrower than the answer and recall collapses for
    // reasons that look like missing data.
    const results = index.search(queries[0], 50, { ef: 5 });
    expect(results.length).toBe(50);
  });

  test('results come back sorted by increasing distance', () => {
    const results = index.search(queries[0], 20, { ef: 128 });
    const distances = results.map((r) => r.distance);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  test('score is the cosine similarity, not the distance', () => {
    const results = index.search(queries[0], 5, { ef: 64 });
    for (const result of results) {
      expect(result.score).toBeCloseTo(1 - result.distance, 10);
    }
  });
});

describe('the neighbour-selection heuristic', () => {
  test('keeps recall high on data with well-separated clusters', () => {
    // The case a nearest-M selection fails. With tight, distant clusters, a
    // graph built from nearest-M links has no edge crossing the gaps, and a
    // query landing in the wrong cluster cannot reach the right one. A correct
    // heuristic keeps those bridges and recall stays high.
    const DIM = 24;
    const rand = seededRandom(3);
    const centres = [];
    for (let c = 0; c < 8; c += 1) {
      const centre = new Float32Array(DIM);
      for (let d = 0; d < DIM; d += 1) centre[d] = rand() * 20 - 10;
      centres.push(centre);
    }
    const vectors = [];
    for (let i = 0; i < 1200; i += 1) {
      const centre = centres[i % centres.length];
      const vec = new Float32Array(DIM);
      for (let d = 0; d < DIM; d += 1) vec[d] = centre[d] + (rand() - 0.5) * 0.05;
      vectors.push(vec);
    }

    const index = buildIndex(vectors, DIM);
    const queries = vectors.slice(0, 40).map((vec) => {
      const jittered = Float32Array.from(vec);
      for (let d = 0; d < DIM; d += 1) jittered[d] += (rand() - 0.5) * 0.02;
      return jittered;
    });

    expect(measureRecall(index, queries, 10, 64)).toBeGreaterThan(0.9);
  });

  test('every node on layer 0 has at least one connection', () => {
    // An isolated node is unreachable, so it can never be returned however
    // close it is to the query.
    const DIM = 16;
    const index = buildIndex(makeVectors(500, DIM), DIM);
    const layer0 = index.links[0];
    for (const [, neighbours] of layer0) {
      expect(neighbours.length).toBeGreaterThan(0);
    }
  });

  test('no layer-0 neighbour list exceeds M0', () => {
    // Pruning runs when a bidirectional link overflows a list; if it did not,
    // hub nodes would accumulate unbounded neighbour lists and search cost
    // would drift back toward linear.
    const DIM = 16;
    const index = buildIndex(makeVectors(800, DIM), DIM);
    for (const [, neighbours] of index.links[0]) {
      expect(neighbours.length).toBeLessThanOrEqual(index.M0);
    }
    for (let level = 1; level < index.links.length; level += 1) {
      for (const [, neighbours] of index.links[level]) {
        expect(neighbours.length).toBeLessThanOrEqual(index.M);
      }
    }
  });
});

describe('level assignment', () => {
  test('is reproducible, so a rebuild is comparable with the build it replaces', () => {
    const DIM = 16;
    const vectors = makeVectors(300, DIM);
    const a = buildIndex(vectors, DIM, { seed: 42 });
    const b = buildIndex(vectors, DIM, { seed: 42 });
    expect(a.levels).toEqual(b.levels);
    expect(a.maxLevel).toBe(b.maxLevel);
  });

  test('produces a layered structure rather than everything on layer 0', () => {
    const DIM = 16;
    const index = buildIndex(makeVectors(2000, DIM), DIM);
    expect(index.maxLevel).toBeGreaterThan(0);
    // Higher layers must be sparse; if they were not, the descent would cost as
    // much as searching layer 0 and the hierarchy would buy nothing.
    expect(index.links[1].size).toBeLessThan(index.links[0].size / 2);
  });
});

describe('deletion', () => {
  test('a removed label stops appearing in results', () => {
    const DIM = 16;
    const vectors = makeVectors(300, DIM);
    const index = buildIndex(vectors, DIM);

    const before = index.search(vectors[0], 5, { ef: 64 });
    const victim = before[0].label;
    expect(index.remove(victim)).toBe(true);

    const after = index.search(vectors[0], 5, { ef: 64 });
    expect(after.map((r) => r.label)).not.toContain(victim);
  });

  test('removing an unknown label reports false rather than throwing', () => {
    const index = new HNSWIndex({ dim: 4 });
    expect(index.remove('nothing')).toBe(false);
  });

  test('size excludes removed entries', () => {
    const DIM = 8;
    const index = buildIndex(makeVectors(50, DIM), DIM);
    const before = index.size;
    index.remove('item-0');
    expect(index.size).toBe(before - 1);
  });
});

describe('serialisation', () => {
  test('a round trip returns identical results', () => {
    const DIM = 24;
    const vectors = makeVectors(600, DIM);
    const index = buildIndex(vectors, DIM);
    const queries = makeVectors(20, DIM, 16, 5);

    const restored = HNSWIndex.fromJSON(JSON.parse(JSON.stringify(index.toJSON())));

    for (const queryVec of queries) {
      const original = index.search(queryVec, 10, { ef: 64 });
      const loaded = restored.search(queryVec, 10, { ef: 64 });
      expect(loaded.map((r) => r.label)).toEqual(original.map((r) => r.label));
    }
  });

  test('preserves deletions', () => {
    const DIM = 8;
    const index = buildIndex(makeVectors(100, DIM), DIM);
    index.remove('item-3');
    const restored = HNSWIndex.fromJSON(JSON.parse(JSON.stringify(index.toJSON())));
    expect(restored.size).toBe(index.size);
  });

  test('refuses an unrecognised format rather than loading a wrong-shaped index', () => {
    expect(() => HNSWIndex.fromJSON({ format: 'hnsw/0' })).toThrow(/Unrecognised HNSW index format/);
    expect(() => HNSWIndex.fromJSON(null)).toThrow(/Unrecognised HNSW index format/);
  });
});

describe('inner-product metric', () => {
  test('does not normalise, so magnitude affects the ranking', () => {
    const index = new HNSWIndex({ dim: 3, metric: 'ip' });
    index.add('small', Float32Array.from([1, 0, 0]));
    index.add('large', Float32Array.from([4, 0, 0]));

    const results = index.search(Float32Array.from([1, 0, 0]), 2);
    // Under cosine these are identical directions and tie; under inner product
    // the longer vector wins, which is the reason to choose this metric.
    expect(results[0].label).toBe('large');
    expect(results[0].score).toBeCloseTo(4, 5);
  });

  test('agrees with exact search on clustered data', () => {
    const DIM = 16;
    const vectors = makeVectors(800, DIM);
    const index = new HNSWIndex({ dim: DIM, metric: 'ip', M: 16, efConstruction: 200 });
    vectors.forEach((vec, i) => index.add(`item-${i}`, vec));
    const queries = makeVectors(30, DIM, 16, 11);
    expect(measureRecall(index, queries, 10, 128)).toBeGreaterThan(0.9);
  });
});
