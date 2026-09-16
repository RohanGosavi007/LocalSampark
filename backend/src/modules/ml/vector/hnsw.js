/**
 * Hierarchical Navigable Small World index.
 *
 * embedding.service.js searches by scanning every vector and taking the best.
 * That is exact, and at 124 shops it is also the right answer — the reason this
 * exists is that the same scan backs free-text search, "similar to this", and
 * now visual search, and those run over products and listings too. A linear
 * scan is O(n) per query with a large constant (a sparse-map dot product per
 * candidate), and it is the component that stops working first as the catalogue
 * grows.
 *
 * HNSW is a navigable small-world graph stacked in layers. Each node appears in
 * layer 0 and, with exponentially decreasing probability, in the layers above.
 * A query descends greedily from the top layer — where the graph is sparse and
 * hops are long — until it reaches layer 0, where it runs a best-first search
 * with a beam of `efSearch`. Queries cost roughly O(log n).
 *
 * The two details that decide whether an implementation of this is correct or
 * merely plausible, both of which are easy to omit and neither of which
 * produces an error when omitted:
 *
 *  1. **The neighbour-selection heuristic** (Algorithm 4 of Malkov & Yashunin,
 *     not the naive "keep the M closest"). Taking the M nearest neighbours
 *     builds a graph where every link in a dense cluster points inward, and the
 *     search cannot escape a local minimum to reach a better cluster. The
 *     heuristic keeps a candidate only when it is closer to the query than to
 *     any already-selected neighbour, which preserves long-range links between
 *     clusters. Without it the index builds fine, queries return fast, and
 *     recall quietly sits around 0.6.
 *
 *  2. **Pruning with the same heuristic when a neighbour's list overflows.**
 *     Connections are bidirectional, so inserting a node can push an existing
 *     node past its limit. Truncating that list by distance re-introduces
 *     exactly the problem the heuristic solves.
 *
 * Both are pinned by tests that measure recall against brute force.
 *
 * Level assignment is seeded rather than Math.random, so a rebuild from the
 * same input produces the same graph. That turns "recall dropped after the
 * nightly rebuild" from an unfalsifiable report into a reproducible one.
 */

/**
 * Binary heap over (distance, id) pairs.
 *
 * Two are needed with opposite orderings — a min-heap for the candidate
 * frontier and a max-heap for the result beam — so the comparison is a
 * constructor argument rather than two near-identical classes.
 *
 * Stored as two parallel arrays rather than an array of objects: the inner loop
 * of a search pushes and pops thousands of times per query, and an object per
 * entry makes this allocation-bound.
 */
class Heap {
  constructor(isMinHeap) {
    this.dist = [];
    this.id = [];
    this.sign = isMinHeap ? 1 : -1;
  }

  get size() {
    return this.dist.length;
  }

  /** True when a should sit above b. */
  _above(a, b) {
    return this.sign * (a - b) < 0;
  }

  push(distance, id) {
    this.dist.push(distance);
    this.id.push(id);
    let i = this.dist.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this._above(this.dist[i], this.dist[parent])) break;
      this._swap(i, parent);
      i = parent;
    }
  }

  peekDist() {
    return this.dist[0];
  }

  peekId() {
    return this.id[0];
  }

  pop() {
    const n = this.dist.length;
    if (n === 0) return null;
    const topDist = this.dist[0];
    const topId = this.id[0];
    const lastDist = this.dist.pop();
    const lastId = this.id.pop();

    if (n > 1) {
      this.dist[0] = lastDist;
      this.id[0] = lastId;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let best = i;
        if (left < this.dist.length && this._above(this.dist[left], this.dist[best])) best = left;
        if (right < this.dist.length && this._above(this.dist[right], this.dist[best])) best = right;
        if (best === i) break;
        this._swap(i, best);
        i = best;
      }
    }
    return { distance: topDist, id: topId };
  }

  _swap(a, b) {
    const d = this.dist[a];
    this.dist[a] = this.dist[b];
    this.dist[b] = d;
    const i = this.id[a];
    this.id[a] = this.id[b];
    this.id[b] = i;
  }
}

/**
 * mulberry32. Small, fast, and — the point — seedable.
 *
 * Level assignment must be reproducible for a rebuild to be comparable with the
 * build it replaced.
 */
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

const METRICS = Object.freeze({
  /**
   * Cosine, as a distance in [0, 2].
   *
   * Vectors are L2-normalised on insert, so the cosine is the dot product and
   * the distance is 1 minus it. Normalising once at insert rather than dividing
   * by the norms on every comparison is the difference between two
   * multiplications and two square roots per candidate.
   */
  cosine: {
    normalize: true,
    distance(a, b) {
      let dot = 0;
      for (let i = 0; i < a.length; i += 1) dot += a[i] * b[i];
      return 1 - dot;
    },
  },
  /**
   * Negative inner product.
   *
   * Not normalised: magnitude is meaningful here, which is the whole reason to
   * choose this metric — it is what a learned embedding trained with a dot
   * product objective expects.
   */
  ip: {
    normalize: false,
    distance(a, b) {
      let dot = 0;
      for (let i = 0; i < a.length; i += 1) dot += a[i] * b[i];
      return -dot;
    },
  },
});

class HNSWIndex {
  /**
   * @param {object} options
   * @param {number} options.dim           Vector dimension. Fixed for the index.
   * @param {number} options.M             Neighbours per node above layer 0.
   * @param {number} options.efConstruction Beam width during build.
   * @param {string} options.metric        'cosine' or 'ip'.
   * @param {number} options.seed          Level-assignment seed.
   */
  constructor({ dim, M = 16, efConstruction = 200, metric = 'cosine', seed = 0x5eed } = {}) {
    if (!Number.isInteger(dim) || dim <= 0) {
      throw new Error(`HNSW requires a positive integer dimension, received ${dim}`);
    }
    if (!METRICS[metric]) {
      throw new Error(`Unknown HNSW metric "${metric}". Expected one of: ${Object.keys(METRICS).join(', ')}`);
    }

    this.dim = dim;
    this.M = Math.max(2, M);
    // Layer 0 gets twice the connections. It holds every node, so it is the
    // layer where connectivity actually determines recall; the sparse upper
    // layers only have to route.
    this.M0 = this.M * 2;
    this.efConstruction = Math.max(efConstruction, this.M);
    this.metricName = metric;
    this.metric = METRICS[metric];

    // 1/ln(M) — the normalisation that makes the expected number of layers
    // logarithmic in the number of nodes.
    this.levelMultiplier = 1 / Math.log(this.M);
    this.random = seededRandom(seed);
    this.seed = seed;

    this.vectors = [];    // internal id -> Float32Array
    this.labels = [];     // internal id -> external id
    this.labelToId = new Map();
    this.levels = [];     // internal id -> top layer
    this.links = [];      // layer -> Map<internal id, number[]>
    this.entryPoint = -1;
    this.maxLevel = -1;
    this.deleted = new Set();
  }

  get size() {
    return this.vectors.length - this.deleted.size;
  }

  _linksAt(level) {
    while (this.links.length <= level) this.links.push(new Map());
    return this.links[level];
  }

  _neighbours(level, id) {
    const layer = this.links[level];
    if (!layer) return [];
    return layer.get(id) || [];
  }

  _prepare(vector) {
    if (vector.length !== this.dim) {
      throw new Error(`Vector has dimension ${vector.length}, index expects ${this.dim}`);
    }
    const out = Float32Array.from(vector);
    if (this.metric.normalize) {
      let sumSq = 0;
      for (let i = 0; i < out.length; i += 1) sumSq += out[i] * out[i];
      const norm = Math.sqrt(sumSq);
      // A zero vector has no direction, so cosine against it is undefined. It
      // is stored as-is and will simply never be anyone's nearest neighbour,
      // which is the honest outcome — better than dividing by zero and putting
      // NaN distances into the heap, where they compare false against
      // everything and corrupt the search silently.
      if (norm > 0) for (let i = 0; i < out.length; i += 1) out[i] /= norm;
    }
    return out;
  }

  _distance(a, b) {
    return this.metric.distance(a, b);
  }

  /**
   * Greedy descent on one layer with a beam of `ef`.
   *
   * Returns a max-heap of the ef closest found, so the caller can pop the
   * furthest first. The loop terminates when the nearest unvisited candidate is
   * further than the furthest result held — the standard best-first stopping
   * rule, and the reason the beam is a max-heap.
   */
  _searchLayer(queryVec, entryPoints, ef, level) {
    const visited = new Set();
    const candidates = new Heap(true);   // nearest first
    const results = new Heap(false);     // furthest first

    for (const entry of entryPoints) {
      if (visited.has(entry)) continue;
      visited.add(entry);
      const distance = this._distance(queryVec, this.vectors[entry]);
      candidates.push(distance, entry);
      results.push(distance, entry);
    }

    while (results.size > ef) results.pop();

    while (candidates.size > 0) {
      const nearestDist = candidates.peekDist();
      if (results.size >= ef && nearestDist > results.peekDist()) break;
      const current = candidates.pop();

      for (const neighbour of this._neighbours(level, current.id)) {
        if (visited.has(neighbour)) continue;
        visited.add(neighbour);

        const distance = this._distance(queryVec, this.vectors[neighbour]);
        if (results.size < ef || distance < results.peekDist()) {
          candidates.push(distance, neighbour);
          results.push(distance, neighbour);
          while (results.size > ef) results.pop();
        }
      }
    }

    return results;
  }

  /**
   * Algorithm 4: neighbour selection by heuristic.
   *
   * Walks candidates nearest-first and keeps one only if it is closer to the
   * query than to every neighbour already kept. That single condition is what
   * preserves the long-range links between clusters — a candidate on the far
   * side of a gap is closer to the query than to anything already selected,
   * and so survives, where a plain nearest-M filter would have discarded it in
   * favour of yet another node inside the cluster already covered.
   *
   * `keepPruned` backfills from the discarded set when the heuristic returns
   * fewer than M. An under-connected node is a node the search can fall into
   * and not get out of.
   */
  _selectNeighbours(queryVec, candidateHeap, M, { keepPruned = true } = {}) {
    // candidateHeap is furthest-first; reverse into nearest-first order.
    const ordered = [];
    while (candidateHeap.size > 0) ordered.push(candidateHeap.pop());
    ordered.reverse();

    const selected = [];
    const discarded = [];

    for (const candidate of ordered) {
      if (selected.length >= M) break;

      let keep = true;
      for (const chosen of selected) {
        const toChosen = this._distance(this.vectors[candidate.id], this.vectors[chosen]);
        if (toChosen < candidate.distance) {
          keep = false;
          break;
        }
      }

      if (keep) selected.push(candidate.id);
      else discarded.push(candidate.id);
    }

    if (keepPruned) {
      for (const id of discarded) {
        if (selected.length >= M) break;
        selected.push(id);
      }
    }

    return selected;
  }

  /**
   * Re-applies the heuristic to a neighbour list that has overflowed.
   *
   * Reached when a bidirectional connection pushes an existing node past its
   * cap. Truncating by distance here would undo the heuristic for that node,
   * which is why this rebuilds the list rather than slicing it.
   */
  _pruneConnections(id, level, maxConnections) {
    const layer = this._linksAt(level);
    const current = layer.get(id) || [];
    if (current.length <= maxConnections) return;

    const heap = new Heap(false);
    for (const neighbour of current) {
      heap.push(this._distance(this.vectors[id], this.vectors[neighbour]), neighbour);
    }
    layer.set(id, this._selectNeighbours(this.vectors[id], heap, maxConnections));
  }

  /** Draws a node's top layer from the exponential distribution HNSW assumes. */
  _randomLevel() {
    // -ln(U) * mL. U is drawn from (0, 1]; a U of exactly 0 would give Infinity.
    const u = Math.max(this.random(), Number.MIN_VALUE);
    return Math.floor(-Math.log(u) * this.levelMultiplier);
  }

  /**
   * Inserts one vector.
   *
   * Re-inserting an existing label replaces it: the catalogue re-indexes shops
   * whose description changed, and leaving both copies would let a stale vector
   * win the search.
   */
  add(label, vector) {
    const prepared = this._prepare(vector);
    const key = String(label);

    if (this.labelToId.has(key)) {
      // Replace in place. The graph links stay as they are — they are an
      // approximation to begin with, and rebuilding them for one changed vector
      // costs more than the small recall drift it avoids. A full rebuild is the
      // job's business, not an insert's.
      const existing = this.labelToId.get(key);
      this.vectors[existing] = prepared;
      this.deleted.delete(existing);
      return existing;
    }

    const id = this.vectors.length;
    const level = this._randomLevel();

    this.vectors.push(prepared);
    this.labels.push(key);
    this.levels.push(level);
    this.labelToId.set(key, id);
    for (let l = 0; l <= level; l += 1) this._linksAt(l).set(id, []);

    if (this.entryPoint === -1) {
      this.entryPoint = id;
      this.maxLevel = level;
      return id;
    }

    let currentNearest = [this.entryPoint];

    // Phase one: descend from the top with a beam of 1, purely to find a good
    // entry point for the layers this node actually joins.
    for (let l = this.maxLevel; l > level; l -= 1) {
      const found = this._searchLayer(prepared, currentNearest, 1, l);
      const best = [];
      while (found.size > 0) best.push(found.pop().id);
      if (best.length > 0) currentNearest = [best[best.length - 1]];
    }

    // Phase two: connect, from this node's top layer down to 0.
    for (let l = Math.min(level, this.maxLevel); l >= 0; l -= 1) {
      const found = this._searchLayer(prepared, currentNearest, this.efConstruction, l);

      // The heap is consumed by selection, so keep the ids for the next layer's
      // entry points first.
      const foundIds = [];
      const copy = new Heap(false);
      while (found.size > 0) {
        const entry = found.pop();
        foundIds.push(entry.id);
        copy.push(entry.distance, entry.id);
      }

      const maxConnections = l === 0 ? this.M0 : this.M;
      const neighbours = this._selectNeighbours(prepared, copy, this.M);

      const layer = this._linksAt(l);
      layer.set(id, neighbours.slice());

      for (const neighbour of neighbours) {
        const existing = layer.get(neighbour) || [];
        if (!existing.includes(id)) {
          existing.push(id);
          layer.set(neighbour, existing);
          this._pruneConnections(neighbour, l, maxConnections);
        }
      }

      currentNearest = foundIds.length > 0 ? foundIds : currentNearest;
    }

    if (level > this.maxLevel) {
      this.maxLevel = level;
      this.entryPoint = id;
    }

    return id;
  }

  /** Marks a label absent from results without rebuilding the graph. */
  remove(label) {
    const id = this.labelToId.get(String(label));
    if (id === undefined) return false;
    this.deleted.add(id);
    return true;
  }

  /**
   * The k nearest labels to a query vector.
   *
   * `ef` must be at least k, or the beam is narrower than the answer and recall
   * collapses for reasons that look like a data problem.
   */
  search(vector, k = 10, { ef = null } = {}) {
    if (this.entryPoint === -1) return [];

    const prepared = this._prepare(vector);
    const efSearch = Math.max(ef || this.efConstruction, k);

    let currentNearest = [this.entryPoint];
    for (let l = this.maxLevel; l > 0; l -= 1) {
      const found = this._searchLayer(prepared, currentNearest, 1, l);
      const best = [];
      while (found.size > 0) best.push(found.pop().id);
      if (best.length > 0) currentNearest = [best[best.length - 1]];
    }

    const results = this._searchLayer(prepared, currentNearest, efSearch, 0);

    const out = [];
    while (results.size > 0) out.push(results.pop());
    out.reverse();

    return out
      .filter((entry) => !this.deleted.has(entry.id))
      .slice(0, k)
      .map((entry) => ({
        label: this.labels[entry.id],
        distance: entry.distance,
        // Reported alongside distance because every caller wants similarity and
        // deriving it at each call site is where a sign error gets introduced.
        score: this.metricName === 'cosine' ? 1 - entry.distance : -entry.distance,
      }));
  }

  /** Exact search, for measuring the approximate one. Never on a request path. */
  bruteForce(vector, k = 10) {
    const prepared = this._prepare(vector);
    const scored = [];
    for (let id = 0; id < this.vectors.length; id += 1) {
      if (this.deleted.has(id)) continue;
      scored.push({ id, distance: this._distance(prepared, this.vectors[id]) });
    }
    scored.sort((a, b) => a.distance - b.distance);
    return scored.slice(0, k).map((entry) => ({
      label: this.labels[entry.id],
      distance: entry.distance,
      score: this.metricName === 'cosine' ? 1 - entry.distance : -entry.distance,
    }));
  }

  /**
   * Serialises the whole index.
   *
   * Vectors are written as plain arrays rather than base64 typed arrays. Larger
   * on disk, but readable and diffable, and the index is rebuilt from the
   * catalogue nightly — a corrupt binary blob nobody can inspect is a worse
   * trade than a bigger file.
   */
  toJSON() {
    return {
      format: 'hnsw/1',
      dim: this.dim,
      M: this.M,
      efConstruction: this.efConstruction,
      metric: this.metricName,
      seed: this.seed,
      entryPoint: this.entryPoint,
      maxLevel: this.maxLevel,
      labels: this.labels,
      levels: this.levels,
      deleted: Array.from(this.deleted),
      vectors: this.vectors.map((v) => Array.from(v)),
      links: this.links.map((layer) => Array.from(layer.entries())),
    };
  }

  static fromJSON(data) {
    if (!data || data.format !== 'hnsw/1') {
      throw new Error('Unrecognised HNSW index format; rebuild rather than load.');
    }
    const index = new HNSWIndex({
      dim: data.dim,
      M: data.M,
      efConstruction: data.efConstruction,
      metric: data.metric,
      seed: data.seed,
    });
    index.entryPoint = data.entryPoint;
    index.maxLevel = data.maxLevel;
    index.labels = data.labels.slice();
    index.levels = data.levels.slice();
    index.deleted = new Set(data.deleted || []);
    index.vectors = data.vectors.map((v) => Float32Array.from(v));
    index.links = (data.links || []).map((entries) => new Map(entries));
    index.labelToId = new Map(index.labels.map((label, id) => [label, id]));
    return index;
  }

  stats() {
    let totalLinks = 0;
    const layer0 = this.links[0];
    if (layer0) for (const neighbours of layer0.values()) totalLinks += neighbours.length;
    return {
      size: this.size,
      dim: this.dim,
      M: this.M,
      ef_construction: this.efConstruction,
      metric: this.metricName,
      max_level: this.maxLevel,
      layers: this.links.length,
      avg_degree_layer0: layer0 && layer0.size > 0 ? totalLinks / layer0.size : 0,
      deleted: this.deleted.size,
    };
  }
}

module.exports = { HNSWIndex, Heap, seededRandom, METRICS };
