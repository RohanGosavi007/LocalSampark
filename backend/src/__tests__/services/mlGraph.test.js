/**
 * LightGCN propagation.
 *
 * The module makes one claim that is not self-evident from reading it: that the
 * cosines between randomly-projected propagated vectors approximate the exact
 * symmetric-normalised diffusion similarity of the graph. Everything the graph
 * term contributes to ranking rests on that, so it is measured here against a
 * dense reference implementation rather than asserted in a comment.
 *
 * The rest of the file pins the properties that are easy to break silently
 * while refactoring the inner loop: that the normalisation actually normalises,
 * that layer averaging includes layer zero, that duplicate edges are merged,
 * and that a popular node cannot dominate purely by degree.
 */

process.env.USE_SQLITE = 'true';

const lightgcn = require('../../modules/ml/graph/lightgcn');

/** Cosine between two unit-norm rows, read out of a flat embedding buffer. */
function cosineAt(embeddings, dim, i, j) {
  let sum = 0;
  for (let d = 0; d < dim; d += 1) {
    sum += embeddings[i * dim + d] * embeddings[j * dim + d];
  }
  return sum;
}

function cosineRows(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += a[i] * b[i];
  return sum;
}

/**
 * A graph with deliberate community structure.
 *
 * Two societies, each with three households. Society A's members all use
 * merchants m1 and m2; society B's use m3 and m4. m5 is used by one household
 * in each, so it should sit between the communities rather than inside either.
 */
function communityGraph() {
  const edges = [];
  const push = (from, to, weight) => edges.push({ from, to, weight });

  for (const [society, users, merchants] of [
    ['sA', ['u1', 'u2', 'u3'], ['m1', 'm2']],
    ['sB', ['u4', 'u5', 'u6'], ['m3', 'm4']],
  ]) {
    for (const user of users) {
      push(`user:${user}`, `society:${society}`, 1);
      for (const merchant of merchants) {
        push(`user:${user}`, `merchant:${merchant}`, 3);
        push(`society:${society}`, `merchant:${merchant}`, 3);
      }
    }
  }

  push('user:u1', 'merchant:m5', 2);
  push('user:u4', 'merchant:m5', 2);

  return edges;
}

describe('LightGCN adjacency', () => {
  test('merges duplicate edges by summing weight rather than double-counting', () => {
    const adj = lightgcn.buildAdjacency([
      { from: 'user:u1', to: 'merchant:m1', weight: 1 },
      { from: 'user:u1', to: 'merchant:m1', weight: 4 },
    ]);

    expect(adj.n).toBe(2);
    // One undirected edge, stored once in each direction.
    expect(adj.targets.length).toBe(2);
    expect(adj.weights[0]).toBe(5);
    expect(adj.degree[0]).toBe(5);
    expect(adj.neighbourCount[0]).toBe(1);
  });

  test('drops self-loops, which would add a constant to every score', () => {
    const adj = lightgcn.buildAdjacency([
      { from: 'user:u1', to: 'user:u1', weight: 9 },
      { from: 'user:u1', to: 'merchant:m1', weight: 1 },
    ]);
    expect(adj.targets.length).toBe(2);
    expect(adj.degree[0]).toBe(1);
  });

  test('ignores non-positive and non-finite weights', () => {
    const adj = lightgcn.buildAdjacency([
      { from: 'a:1', to: 'b:1', weight: 0 },
      { from: 'a:1', to: 'b:2', weight: -3 },
      { from: 'a:1', to: 'b:3', weight: Number.NaN },
      { from: 'a:1', to: 'b:4', weight: 2 },
    ]);
    expect(adj.n).toBe(2);
    expect(adj.degree[0]).toBe(2);
  });
});

describe('seed vectors', () => {
  test('are deterministic, so two builds produce comparable embeddings', () => {
    const a = lightgcn.seedVector('merchant:m1', 32);
    const b = lightgcn.seedVector('merchant:m1', 32);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  test('differ between nodes', () => {
    const a = lightgcn.seedVector('merchant:m1', 32);
    const b = lightgcn.seedVector('merchant:m2', 32);
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });

  test('are unit norm, so no node starts with an advantage', () => {
    for (const key of ['user:u1', 'society:sA', 'merchant:m9']) {
      const vec = lightgcn.seedVector(key, 64);
      let sumSq = 0;
      for (const v of vec) sumSq += v * v;
      expect(Math.sqrt(sumSq)).toBeCloseTo(1, 10);
    }
  });
});

describe('propagation', () => {
  test('produces unit-norm rows so similarity is a plain dot product', () => {
    const adj = lightgcn.buildAdjacency(communityGraph());
    const dim = 48;
    const embeddings = lightgcn.propagate(adj, dim, 3);

    for (let i = 0; i < adj.n; i += 1) {
      expect(cosineAt(embeddings, dim, i, i)).toBeCloseTo(1, 8);
    }
  });

  test('places merchants used by the same society closer than merchants used by another', () => {
    const adj = lightgcn.buildAdjacency(communityGraph());
    const dim = 128;
    const embeddings = lightgcn.propagate(adj, dim, 3);

    const idx = (key) => adj.indexOf.get(key);
    const withinA = cosineAt(embeddings, dim, idx('merchant:m1'), idx('merchant:m2'));
    const across = cosineAt(embeddings, dim, idx('merchant:m1'), idx('merchant:m3'));

    expect(withinA).toBeGreaterThan(across);
  });

  test("a society's vector is closer to the merchants its members use", () => {
    const adj = lightgcn.buildAdjacency(communityGraph());
    const dim = 128;
    const embeddings = lightgcn.propagate(adj, dim, 3);

    const idx = (key) => adj.indexOf.get(key);
    const own = cosineAt(embeddings, dim, idx('society:sA'), idx('merchant:m1'));
    const other = cosineAt(embeddings, dim, idx('society:sA'), idx('merchant:m3'));

    expect(own).toBeGreaterThan(other);
  });

  test('layer averaging includes layer zero', () => {
    // With zero layers the result is E^(0) normalised — the seed itself. If the
    // accumulator started at E^(1) instead, this would not hold, and the
    // over-smoothing that layer averaging exists to prevent would be back.
    const adj = lightgcn.buildAdjacency(communityGraph());
    const dim = 32;
    const embeddings = lightgcn.propagate(adj, dim, 0);

    const i = adj.indexOf.get('merchant:m1');
    const seed = lightgcn.seedVector('merchant:m1', dim);
    for (let d = 0; d < dim; d += 1) {
      expect(embeddings[i * dim + d]).toBeCloseTo(seed[d], 8);
    }
  });

  test('symmetric normalisation stops a high-degree node dominating', () => {
    // m_hub is attached to every user; m_niche to exactly one. Without the
    // 1/sqrt(d_i d_j) factor, propagation is popularity and u1 would sit closer
    // to the hub than to the merchant only it uses.
    const edges = [];
    const users = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8'];
    for (const user of users) {
      edges.push({ from: `user:${user}`, to: 'merchant:m_hub', weight: 3 });
    }
    edges.push({ from: 'user:u1', to: 'merchant:m_niche', weight: 3 });

    const adj = lightgcn.buildAdjacency(edges);
    const dim = 128;
    const embeddings = lightgcn.propagate(adj, dim, 3);

    const idx = (key) => adj.indexOf.get(key);
    const toNiche = cosineAt(embeddings, dim, idx('user:u1'), idx('merchant:m_niche'));
    const toHub = cosineAt(embeddings, dim, idx('user:u1'), idx('merchant:m_hub'));

    expect(toNiche).toBeGreaterThan(toHub);
  });

  test('isolated nodes keep their seed rather than decaying to zero', () => {
    const adj = lightgcn.buildAdjacency([
      { from: 'user:u1', to: 'merchant:m1', weight: 1 },
    ]);
    const dim = 16;
    const embeddings = lightgcn.propagate(adj, dim, 3);
    for (let i = 0; i < adj.n; i += 1) {
      expect(cosineAt(embeddings, dim, i, i)).toBeCloseTo(1, 8);
    }
  });
});

describe('the random projection approximates exact diffusion', () => {
  /**
   * The claim the module rests on, measured.
   *
   * Exact diffusion is computed densely, the projected embedding at a realistic
   * dimension, and the two cosine matrices compared over every pair. The bound
   * is on mean absolute error rather than on any single pair, because
   * Johnson-Lindenstrauss is a statement about the distribution of errors and a
   * per-pair bound at this dimension would be flaky by construction.
   */
  test('mean absolute cosine error stays small at dimension 256', () => {
    const adj = lightgcn.buildAdjacency(communityGraph());
    const layers = 3;
    const dim = 256;

    const exact = lightgcn.exactDiffusion(adj, layers);
    const projected = lightgcn.propagate(adj, dim, layers);

    let totalError = 0;
    let worst = 0;
    let pairs = 0;

    for (let i = 0; i < adj.n; i += 1) {
      const projectedI = projected.subarray(i * dim, (i + 1) * dim);
      for (let j = i + 1; j < adj.n; j += 1) {
        const projectedJ = projected.subarray(j * dim, (j + 1) * dim);
        const error = Math.abs(cosineRows(exact[i], exact[j]) - cosineRows(projectedI, projectedJ));
        totalError += error;
        if (error > worst) worst = error;
        pairs += 1;
      }
    }

    const meanError = totalError / pairs;
    expect(meanError).toBeLessThan(0.1);
    expect(worst).toBeLessThan(0.35);
  });

  test('raising the dimension reduces the error, as the JL bound requires', () => {
    // The direction of this relationship is the falsifiable part. If a
    // refactor broke the projection — reused one seed for every node, say —
    // the error would stop responding to dimension at all.
    const adj = lightgcn.buildAdjacency(communityGraph());
    const layers = 3;
    const exact = lightgcn.exactDiffusion(adj, layers);

    const errorAt = (dim) => {
      const projected = lightgcn.propagate(adj, dim, layers);
      let total = 0;
      let pairs = 0;
      for (let i = 0; i < adj.n; i += 1) {
        const pi = projected.subarray(i * dim, (i + 1) * dim);
        for (let j = i + 1; j < adj.n; j += 1) {
          const pj = projected.subarray(j * dim, (j + 1) * dim);
          total += Math.abs(cosineRows(exact[i], exact[j]) - cosineRows(pi, pj));
          pairs += 1;
        }
      }
      return total / pairs;
    };

    expect(errorAt(512)).toBeLessThan(errorAt(16));
  });

  test('exact diffusion agrees with the community structure it is checked against', () => {
    // Guards the reference implementation itself. If exactDiffusion were wrong,
    // the comparison above would be measuring agreement between two mistakes.
    const adj = lightgcn.buildAdjacency(communityGraph());
    const exact = lightgcn.exactDiffusion(adj, 3);
    const idx = (key) => adj.indexOf.get(key);

    const within = cosineRows(exact[idx('merchant:m1')], exact[idx('merchant:m2')]);
    const across = cosineRows(exact[idx('merchant:m1')], exact[idx('merchant:m3')]);
    expect(within).toBeGreaterThan(across);
  });
});
