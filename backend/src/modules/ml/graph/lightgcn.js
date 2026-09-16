/**
 * Hyperlocal graph collaborative filtering.
 *
 * The weighted-sum ranker and the affinity matrix both reason about pairs: this
 * user engaged with that shop, these two shops co-occur. Neither can express
 * the thing that actually drives a hyperlocal booking — that eleven households
 * in the same building have used this plumber, so the twelfth probably should.
 * That is a path of length three through a graph (user -> society -> user ->
 * merchant), and a pairwise matrix has no way to see it.
 *
 * So this builds the graph. Four node types, undirected weighted edges:
 *
 *     user     -- merchant    interaction weight from ml_interaction_events
 *     user     -- society     membership
 *     society  -- merchant    aggregated engagement by that society's members
 *     merchant -- category    catalogue structure
 *
 * and runs LightGCN propagation over it:
 *
 *     E^(k+1) = D^(-1/2) A~ D^(-1/2) E^(k)
 *     E       = (1 / (K+1)) * sum over k of E^(k)
 *
 * Layer averaging rather than taking only the final layer is the part of
 * LightGCN that matters most here and is easiest to drop by accident. E^(K)
 * alone over-smooths: at three hops in a graph this dense, most nodes have
 * reached the dominant eigenvector and every merchant looks alike. Averaging
 * keeps the sharp local structure from the early layers alongside the
 * community structure from the later ones.
 *
 * ── What E^(0) is, and what that means for the scores ──────────────────────
 *
 * Canonical LightGCN learns E^(0) by BPR against observed interactions. This
 * does not, and the distinction is worth stating plainly rather than burying:
 * E^(0) here is a deterministic seeded random projection, and the propagation
 * turns it into a diffusion embedding.
 *
 * That is not a placeholder standing in for the real thing. It computes a
 * well-defined quantity: by Johnson-Lindenstrauss, the cosine between two
 * propagated vectors approximates the exact symmetric-normalised diffusion
 * similarity between those nodes, with error falling as the dimension rises.
 * Two merchants used by overlapping sets of households in overlapping
 * societies score alike; two merchants with disjoint neighbourhoods do not.
 * That is precisely the "society neighbourhood affinity" this module owes the
 * ranker, and it needs no labels — which matters, because the platform does not
 * yet have the interaction volume that BPR training would require.
 *
 * The test suite pins this: on a small graph it compares these cosines against
 * exact dense diffusion, and fails if the approximation degrades. When
 * interaction volume justifies learned embeddings, `propagate` and the storage
 * format stay as they are and only the E^(0) source changes.
 *
 * Nothing here runs in a request. The job writes ml_graph_embeddings; the
 * ranker reads it.
 */

const crypto = require('crypto');
const { query } = require('../../../config/database');
const logger = require('../../../config/logger');

/** Node key. Types share an id space — a society and a shop can both be 'abc'. */
function nodeKey(type, id) {
  return `${type}:${id}`;
}

/**
 * Deterministic unit-variance pseudo-random vector for a node.
 *
 * Seeded from the node key, so a rebuild produces the same E^(0) and therefore
 * comparable embeddings across runs. A Math.random() initialisation would make
 * every rebuild incomparable with the last, which would turn any change in a
 * merchant's score into an unanswerable question.
 *
 * Bytes come from a SHA-256 stream over the key; each pair of bytes becomes one
 * coordinate in [-1, 1]. Cheap, reproducible, and adequate: JL needs the
 * entries to be independent with zero mean and equal variance, not Gaussian.
 */
function seedVector(key, dim) {
  const vec = new Float64Array(dim);
  let produced = 0;
  let counter = 0;

  while (produced < dim) {
    const digest = crypto.createHash('sha256').update(`${key}#${counter}`).digest();
    for (let i = 0; i + 1 < digest.length && produced < dim; i += 2) {
      const raw = (digest[i] << 8) | digest[i + 1]; // 0..65535
      vec[produced] = (raw / 32767.5) - 1;
      produced += 1;
    }
    counter += 1;
  }

  // Normalised so every node starts on the unit sphere. Without this, a node
  // whose seed happened to draw a long vector would dominate its neighbourhood
  // for reasons that have nothing to do with the graph.
  let sumSq = 0;
  for (let i = 0; i < dim; i += 1) sumSq += vec[i] * vec[i];
  const norm = Math.sqrt(sumSq);
  if (norm > 0) for (let i = 0; i < dim; i += 1) vec[i] /= norm;
  return vec;
}

/**
 * Adjacency in CSR-like form: parallel arrays rather than a Map of Maps.
 *
 * The propagation loop touches every edge K times. A Map of Maps costs a hash
 * lookup per edge per layer and allocates an iterator per node; flat typed
 * arrays let the inner loop be a sequential walk. On the catalogue this is a
 * few milliseconds either way, but the job also has to run against a year of
 * events without becoming an overnight batch.
 */
function buildAdjacency(edges) {
  const indexOf = new Map();
  const keys = [];

  const idFor = (key) => {
    let idx = indexOf.get(key);
    if (idx === undefined) {
      idx = keys.length;
      indexOf.set(key, idx);
      keys.push(key);
    }
    return idx;
  };

  // Collapse duplicate edges by summing weight. The same (user, merchant) pair
  // arrives once per interaction type, and treating those as separate edges
  // would count an engaged user's merchant several times over.
  const merged = new Map();
  for (const edge of edges) {
    const w = Number(edge.weight);
    if (!Number.isFinite(w) || w <= 0) continue;
    const a = idFor(edge.from);
    const b = idFor(edge.to);
    if (a === b) continue; // A self-loop adds a constant to every score.
    const pair = a < b ? `${a}|${b}` : `${b}|${a}`;
    merged.set(pair, (merged.get(pair) || 0) + w);
  }

  const n = keys.length;
  const degree = new Float64Array(n);
  const neighbourCount = new Int32Array(n);

  const pairs = [];
  for (const [pair, weight] of merged) {
    const [a, b] = pair.split('|').map(Number);
    pairs.push([a, b, weight]);
    degree[a] += weight;
    degree[b] += weight;
    neighbourCount[a] += 1;
    neighbourCount[b] += 1;
  }

  // Row offsets, then fill.
  const offsets = new Int32Array(n + 1);
  for (let i = 0; i < n; i += 1) offsets[i + 1] = offsets[i] + neighbourCount[i];

  const cursor = Int32Array.from(offsets.subarray(0, n));
  const targets = new Int32Array(offsets[n]);
  const weights = new Float64Array(offsets[n]);

  for (const [a, b, weight] of pairs) {
    targets[cursor[a]] = b;
    weights[cursor[a]] = weight;
    cursor[a] += 1;
    targets[cursor[b]] = a;
    weights[cursor[b]] = weight;
    cursor[b] += 1;
  }

  return { keys, indexOf, offsets, targets, weights, degree, neighbourCount, n };
}

/**
 * K rounds of symmetric-normalised aggregation, layer-averaged.
 *
 * The normalisation is the 1/sqrt(d_i * d_j) factor on each edge. It is what
 * stops a merchant with four hundred interactions from flooding every
 * neighbourhood it touches: without it, propagation is plain popularity with
 * extra steps, and the graph term would duplicate what the Wilson bound in the
 * ranker already contributes.
 *
 * Isolated nodes — degree zero — keep their seed vector and are excluded by the
 * minimum-degree check when scoring. They must not be dropped here, because the
 * index positions have to stay aligned with `keys`.
 */
function propagate(adj, dim, layers, { seedFor = seedVector } = {}) {
  const { n, offsets, targets, weights, degree, keys } = adj;

  // 1/sqrt(degree), precomputed once rather than per edge per layer.
  const invSqrtDeg = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    invSqrtDeg[i] = degree[i] > 0 ? 1 / Math.sqrt(degree[i]) : 0;
  }

  let current = new Float64Array(n * dim);
  for (let i = 0; i < n; i += 1) {
    const seed = seedFor(keys[i], dim);
    current.set(seed, i * dim);
  }

  // The running layer sum, seeded with E^(0) so the average covers k = 0..K.
  const accumulated = Float64Array.from(current);
  let next = new Float64Array(n * dim);

  for (let layer = 0; layer < layers; layer += 1) {
    next.fill(0);

    for (let i = 0; i < n; i += 1) {
      const scaleI = invSqrtDeg[i];
      if (scaleI === 0) continue;
      const rowStart = i * dim;

      for (let e = offsets[i]; e < offsets[i + 1]; e += 1) {
        const j = targets[e];
        // A~ carries the edge weight; the symmetric normalisation divides by
        // the square root of both endpoint degrees.
        const coefficient = weights[e] * scaleI * invSqrtDeg[j];
        if (coefficient === 0) continue;
        const srcStart = j * dim;
        for (let d = 0; d < dim; d += 1) {
          next[rowStart + d] += coefficient * current[srcStart + d];
        }
      }
    }

    // A node with no usable neighbours would otherwise decay to zero and lose
    // even its seed identity; carry it forward unchanged instead.
    for (let i = 0; i < n; i += 1) {
      if (invSqrtDeg[i] !== 0) continue;
      const start = i * dim;
      for (let d = 0; d < dim; d += 1) next[start + d] = current[start + d];
    }

    for (let k = 0; k < accumulated.length; k += 1) accumulated[k] += next[k];

    const swap = current;
    current = next;
    next = swap;
  }

  const denom = layers + 1;
  for (let k = 0; k < accumulated.length; k += 1) accumulated[k] /= denom;

  // L2-normalise each row so downstream similarity is a plain dot product and
  // lands in [-1, 1] regardless of how connected the node is.
  for (let i = 0; i < n; i += 1) {
    const start = i * dim;
    let sumSq = 0;
    for (let d = 0; d < dim; d += 1) sumSq += accumulated[start + d] ** 2;
    const norm = Math.sqrt(sumSq);
    if (norm > 0) for (let d = 0; d < dim; d += 1) accumulated[start + d] /= norm;
  }

  return accumulated;
}

/**
 * Exact symmetric-normalised diffusion similarity, for verification only.
 *
 * Builds the dense propagation operator and applies it to the identity, giving
 * the similarity that `propagate`'s random projection approximates. O(n^3) and
 * therefore useless in production — it exists so the test suite can measure how
 * closely the projected cosines track the exact ones, which is the claim the
 * module's honesty rests on.
 */
function exactDiffusion(adj, layers) {
  const { n, offsets, targets, weights, degree } = adj;
  const invSqrtDeg = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    invSqrtDeg[i] = degree[i] > 0 ? 1 / Math.sqrt(degree[i]) : 0;
  }

  const identity = [];
  for (let i = 0; i < n; i += 1) {
    const row = new Float64Array(n);
    row[i] = 1;
    identity.push(row);
  }

  let current = identity.map((row) => Float64Array.from(row));
  const accumulated = identity.map((row) => Float64Array.from(row));

  for (let layer = 0; layer < layers; layer += 1) {
    const next = [];
    for (let i = 0; i < n; i += 1) {
      const row = new Float64Array(n);
      const scaleI = invSqrtDeg[i];
      if (scaleI !== 0) {
        for (let e = offsets[i]; e < offsets[i + 1]; e += 1) {
          const j = targets[e];
          const coefficient = weights[e] * scaleI * invSqrtDeg[j];
          for (let c = 0; c < n; c += 1) row[c] += coefficient * current[j][c];
        }
      } else {
        row.set(current[i]);
      }
      next.push(row);
    }
    for (let i = 0; i < n; i += 1) {
      for (let c = 0; c < n; c += 1) accumulated[i][c] += next[i][c];
    }
    current = next;
  }

  for (let i = 0; i < n; i += 1) {
    for (let c = 0; c < n; c += 1) accumulated[i][c] /= layers + 1;
  }

  for (const row of accumulated) {
    let sumSq = 0;
    for (const v of row) sumSq += v * v;
    const norm = Math.sqrt(sumSq);
    if (norm > 0) for (let c = 0; c < row.length; c += 1) row[c] /= norm;
  }

  return accumulated;
}

/**
 * Loads the edge list.
 *
 * Four queries rather than one join, because the four edge types have nothing
 * in common and a UNION over them would need every column every type uses. Each
 * is independently failable: a deployment without the societies tables still
 * gets a user–merchant graph, which is degraded but correct.
 */
async function loadEdges(regionId = null) {
  const edges = [];
  const stats = { interaction: 0, membership: 0, society_merchant: 0, category: 0 };

  const regionClause = regionId ? 'AND e.region_id = $1' : '';
  const regionParams = regionId ? [regionId] : [];

  // user -- merchant
  try {
    const res = await query(
      `SELECT e.user_id AS user_id, e.item_id AS item_id, SUM(e.weight) AS weight
         FROM ml_interaction_events e
        WHERE e.item_type = 'shop' AND e.weight > 0 AND e.user_id IS NOT NULL
              ${regionClause}
        GROUP BY e.user_id, e.item_id`,
      regionParams
    );
    for (const row of res.rows || res || []) {
      edges.push({
        from: nodeKey('user', row.user_id),
        to: nodeKey('merchant', row.item_id),
        weight: Number(row.weight) || 0,
      });
      stats.interaction += 1;
    }
  } catch (err) {
    logger.warn('Graph: interaction edges unavailable: ' + err.message);
  }

  // user -- society, and society -- merchant.
  //
  // The society-to-merchant edge is the one that carries the product claim, and
  // it is derived rather than stored: a society trusts a merchant to the extent
  // that its members have engaged with them. Deriving it here rather than
  // materialising a table keeps it consistent with the event log by
  // construction.
  try {
    const members = await query(
      `SELECT sm.society_id AS society_id, sm.user_id AS user_id
         FROM society_members sm
        WHERE sm.user_id IS NOT NULL`
    );
    const memberRows = members.rows || members || [];

    for (const row of memberRows) {
      edges.push({
        from: nodeKey('user', row.user_id),
        to: nodeKey('society', row.society_id),
        // Membership is a fact, not a measured intensity. Weight 1 keeps it
        // from competing with interaction weights, which run to 8.
        weight: 1,
      });
      stats.membership += 1;
    }

    if (memberRows.length > 0) {
      const societyOf = new Map();
      for (const row of memberRows) societyOf.set(String(row.user_id), row.society_id);

      const engagement = await query(
        `SELECT e.user_id AS user_id, e.item_id AS item_id, SUM(e.weight) AS weight
           FROM ml_interaction_events e
          WHERE e.item_type = 'shop' AND e.weight > 0 AND e.user_id IS NOT NULL
                ${regionClause}
          GROUP BY e.user_id, e.item_id`,
        regionParams
      );

      const societyMerchant = new Map();
      for (const row of engagement.rows || engagement || []) {
        const society = societyOf.get(String(row.user_id));
        if (!society) continue;
        const key = `${society}|${row.item_id}`;
        societyMerchant.set(key, (societyMerchant.get(key) || 0) + (Number(row.weight) || 0));
      }

      for (const [key, weight] of societyMerchant) {
        const [society, merchant] = key.split('|');
        edges.push({
          from: nodeKey('society', society),
          to: nodeKey('merchant', merchant),
          weight,
        });
        stats.society_merchant += 1;
      }
    }
  } catch (err) {
    // A deployment without society management still gets a usable graph.
    logger.warn('Graph: society edges unavailable: ' + err.message);
  }

  // merchant -- category
  try {
    const params = [];
    let clause = 'COALESCE(s.is_active, 1) = 1 AND s.category_id IS NOT NULL';
    if (regionId) {
      params.push(regionId);
      clause += ` AND s.region_id = $${params.length}`;
    }
    const res = await query(
      `SELECT s.id AS shop_id, s.category_id AS category_id
         FROM local_shops s
        WHERE ${clause}`,
      params
    );
    for (const row of res.rows || res || []) {
      edges.push({
        from: nodeKey('merchant', row.shop_id),
        to: nodeKey('category', row.category_id),
        // Light. Category membership relates every shop in a category to every
        // other, and at interaction-scale weight it would swamp the signal that
        // particular households chose particular merchants.
        weight: 0.5,
      });
      stats.category += 1;
    }
  } catch (err) {
    logger.warn('Graph: category edges unavailable: ' + err.message);
  }

  return { edges, stats };
}

/**
 * Builds the graph, propagates, and persists one row per node.
 *
 * Returns a summary rather than the embeddings: this is a job, and its caller
 * is a scheduler or an admin endpoint, neither of which wants a few megabytes
 * of vectors back.
 */
async function build({ regionId = null, dim = 32, layers = 3, persist = true } = {}) {
  const started = Date.now();

  const { edges, stats } = await loadEdges(regionId);
  if (edges.length === 0) {
    return {
      built: false,
      reason: 'no_edges',
      nodes: 0,
      edges: 0,
      stats,
      duration_ms: Date.now() - started,
    };
  }

  const adj = buildAdjacency(edges);
  const embeddings = propagate(adj, dim, layers);

  if (!persist) {
    return {
      built: true,
      persisted: false,
      nodes: adj.n,
      edges: edges.length,
      stats,
      adjacency: adj,
      embeddings,
      dim,
      layers,
      duration_ms: Date.now() - started,
    };
  }

  // Replace rather than upsert row by row. The whole embedding set is one
  // coherent artefact — vectors from two different propagation runs are not
  // comparable — so a partial update would leave the table holding a mixture
  // that scores nothing meaningfully.
  try {
    if (regionId) {
      await query('DELETE FROM ml_graph_embeddings WHERE region_id = $1', [regionId]);
    } else {
      await query('DELETE FROM ml_graph_embeddings WHERE region_id IS NULL');
    }
  } catch (err) {
    logger.error('Graph: could not clear previous embeddings: ' + err.message);
    return { built: false, reason: 'clear_failed', error: err.message, duration_ms: Date.now() - started };
  }

  const COLUMNS = ['id', 'node_type', 'node_id', 'region_id', 'dimension', 'layers', 'vector', 'degree'];
  const CHUNK = 200;
  let written = 0;

  for (let start = 0; start < adj.n; start += CHUNK) {
    const end = Math.min(start + CHUNK, adj.n);
    const params = [];
    const tuples = [];

    for (let i = start; i < end; i += 1) {
      const key = adj.keys[i];
      const splitAt = key.indexOf(':');
      const type = key.slice(0, splitAt);
      const id = key.slice(splitAt + 1);

      const vector = Array.from(embeddings.subarray(i * dim, (i + 1) * dim))
        // Six decimals. The vectors are unit-norm, so this is well below the
        // precision any downstream comparison can distinguish, and it roughly
        // halves the stored size.
        .map((v) => Math.round(v * 1e6) / 1e6);

      const values = [
        crypto.randomUUID(),
        type,
        id,
        regionId,
        dim,
        layers,
        JSON.stringify(vector),
        adj.neighbourCount[i],
      ];
      const slots = values.map((value) => {
        params.push(value);
        return `$${params.length}`;
      });
      tuples.push(`(${slots.join(', ')})`);
    }

    try {
      await query(
        `INSERT INTO ml_graph_embeddings (${COLUMNS.join(', ')}) VALUES ${tuples.join(', ')}`,
        params
      );
      written += end - start;
    } catch (err) {
      logger.error('Graph: embedding write failed: ' + err.message);
      break;
    }
  }

  const duration = Date.now() - started;
  logger.info(
    `Graph embeddings built: ${written} nodes, ${edges.length} edges, ` +
    `${layers} layers, dim ${dim}, ${duration}ms.`
  );

  return {
    built: true,
    persisted: true,
    nodes: adj.n,
    written,
    edges: edges.length,
    stats,
    dim,
    layers,
    duration_ms: duration,
  };
}

/**
 * Cached read side.
 *
 * The ranker calls this per request, so it cannot go to the database each
 * time. The TTL is long because the job that writes the table runs nightly —
 * an embedding is stale by construction, and refreshing it every thirty
 * seconds would only re-read the same rows.
 */
const READ_CACHE_TTL_MS = 10 * 60 * 1000;
let readCache = null; // { regionKey, vectors: Map<nodeKey, Float64Array>, degrees, dim, loadedAt }

async function loadEmbeddings(regionId = null) {
  const regionKey = regionId || '__global__';
  if (readCache && readCache.regionKey === regionKey && Date.now() - readCache.loadedAt < READ_CACHE_TTL_MS) {
    return readCache;
  }

  const vectors = new Map();
  const degrees = new Map();
  let dim = 0;

  try {
    const res = regionId
      ? await query(
        'SELECT node_type, node_id, dimension, vector, degree FROM ml_graph_embeddings WHERE region_id = $1',
        [regionId]
      )
      : await query(
        'SELECT node_type, node_id, dimension, vector, degree FROM ml_graph_embeddings WHERE region_id IS NULL'
      );

    for (const row of res.rows || res || []) {
      let parsed;
      try {
        parsed = JSON.parse(row.vector);
      } catch {
        continue;
      }
      if (!Array.isArray(parsed) || parsed.length === 0) continue;
      dim = parsed.length;
      const key = nodeKey(row.node_type, row.node_id);
      vectors.set(key, Float64Array.from(parsed));
      degrees.set(key, Number(row.degree) || 0);
    }
  } catch (err) {
    logger.warn('Graph: embeddings unreadable, affinity term will be zero: ' + err.message);
  }

  readCache = { regionKey, vectors, degrees, dim, loadedAt: Date.now() };
  return readCache;
}

/** Dot product of two unit-norm rows. */
function dot(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += a[i] * b[i];
  return sum;
}

/**
 * Society-neighbourhood affinity for a set of candidates.
 *
 * Returns itemId -> score in [0, 1]. Two sources are combined, and which one is
 * available differs by user:
 *
 *   - the user's own graph position, which exists once they have engaged with
 *     anything;
 *   - their society's position, which exists as soon as *any* member of the
 *     building has, and is the whole reason this module was built. A user who
 *     joined yesterday inherits their neighbours' accumulated judgement.
 *
 * The society term is taken at full strength when present because it is the
 * better signal early on and degrades gracefully later: by the time a user has
 * their own history, both terms point the same way for merchants the building
 * uses.
 *
 * Scores are shifted from the cosine's [-1, 1] into [0, 1]. A negative cosine
 * in a diffusion embedding means "in a different part of the graph", not
 * "actively bad", and letting it go negative would let the graph term cancel
 * out distance and rating rather than merely failing to endorse.
 */
async function affinityScores(userId, itemIds, { regionId = null, societyId = null, minDegree = 3 } = {}) {
  const out = new Map();
  if (!Array.isArray(itemIds) || itemIds.length === 0) return out;

  const index = await loadEmbeddings(regionId);
  if (index.vectors.size === 0) return out;

  const userVec = userId ? index.vectors.get(nodeKey('user', userId)) : null;
  const societyVec = societyId ? index.vectors.get(nodeKey('society', societyId)) : null;
  if (!userVec && !societyVec) return out;

  const userDegree = userId ? (index.degrees.get(nodeKey('user', userId)) || 0) : 0;
  const societyDegree = societyId ? (index.degrees.get(nodeKey('society', societyId)) || 0) : 0;

  for (const itemId of itemIds) {
    const key = nodeKey('merchant', itemId);
    const itemVec = index.vectors.get(key);
    if (!itemVec) continue;

    // A merchant nobody has interacted with sits at its seed vector, and its
    // cosine against anything is meaningless noise. Requiring degree is what
    // keeps that noise out of the ranking rather than letting it masquerade as
    // a weak endorsement.
    if ((index.degrees.get(key) || 0) < minDegree) continue;

    let score = 0;
    let weight = 0;

    if (userVec && userDegree >= minDegree) {
      score += (dot(userVec, itemVec) + 1) / 2;
      weight += 1;
    }
    if (societyVec && societyDegree >= minDegree) {
      score += (dot(societyVec, itemVec) + 1) / 2;
      weight += 1;
    }
    if (weight === 0) continue;

    out.set(itemId, Math.min(Math.max(score / weight, 0), 1));
  }

  return out;
}

/** The society a user belongs to, or null. Used to pick the society vector. */
async function societyForUser(userId) {
  if (!userId) return null;
  try {
    const res = await query(
      'SELECT society_id FROM society_members WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    const row = (res.rows || res || [])[0];
    return row ? row.society_id : null;
  } catch {
    return null;
  }
}

/** Drops the read cache. Called after a rebuild. */
function invalidate() {
  readCache = null;
}

/** What the admin console reports about the graph. */
async function stats() {
  try {
    const res = await query(
      `SELECT node_type, COUNT(*) AS nodes, AVG(degree) AS avg_degree, MAX(layers) AS layers,
              MAX(dimension) AS dimension, MAX(built_at) AS built_at
         FROM ml_graph_embeddings
        GROUP BY node_type`
    );
    const rows = res.rows || res || [];
    const byType = {};
    let total = 0;
    let builtAt = null;
    for (const row of rows) {
      byType[row.node_type] = {
        nodes: Number(row.nodes) || 0,
        avg_degree: Number(row.avg_degree) || 0,
      };
      total += Number(row.nodes) || 0;
      if (!builtAt || String(row.built_at) > String(builtAt)) builtAt = row.built_at;
    }
    return {
      built: total > 0,
      total_nodes: total,
      by_type: byType,
      dimension: rows.length ? Number(rows[0].dimension) || 0 : 0,
      layers: rows.length ? Number(rows[0].layers) || 0 : 0,
      built_at: builtAt,
    };
  } catch (err) {
    return { built: false, total_nodes: 0, by_type: {}, error: err.message };
  }
}

module.exports = {
  build,
  affinityScores,
  societyForUser,
  loadEmbeddings,
  invalidate,
  stats,
  // Exported for the test suite and the admin graph inspector.
  buildAdjacency,
  propagate,
  exactDiffusion,
  seedVector,
  nodeKey,
  dot,
  loadEdges,
};
