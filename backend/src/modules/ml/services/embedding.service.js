/**
 * Content vectors for the catalogue.
 *
 * Phase 2 uses TF-IDF over each shop's text — name, description, category and
 * tags — rather than dense transformer embeddings. That is a deliberate
 * sequencing choice, not a shortcut:
 *
 *   - It adds no dependency. `@xenova/transformers` pulls ~23 MB of model
 *     weights resident in the API process, which on a Render starter instance
 *     is a real cost to justify before anything is known to work.
 *
 *   - It is deterministic and inspectable. When a merchant asks why they rank
 *     where they do, "these terms matched" is an answer; a 384-dimension dense
 *     vector is not.
 *
 *   - The catalogue is 124 shops and 318 products. TF-IDF over a corpus that
 *     size is exact and instant; the gains from dense embeddings are in
 *     synonymy and paraphrase, which matter for free-text search (phase 3,
 *     where "urgent plumber for leaking tap" has to match a shop whose
 *     description says none of those words) far more than for ranking a feed.
 *
 * Phase 3 replaces the vector source behind this same interface — `vectorFor`
 * and `cosine` are all the ranker knows about — so swapping in dense embeddings
 * changes this file and nothing else.
 *
 * Vectors are sparse maps of term -> weight, not arrays. With a vocabulary in
 * the low thousands and a dozen terms per shop, a dense array would be 99%
 * zeroes and the dot product would walk all of it.
 */

const { query } = require('../../../config/database');
const logger = require('../../../config/logger');

/**
 * Terms carrying no discriminating signal in this domain.
 *
 * The domain words matter as much as the English ones: nearly every shop in the
 * corpus is called something-Mart or something-Store, so those terms appear in
 * most documents and IDF would push them toward zero anyway — listing them just
 * skips the work.
 */
const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'our',
  'you', 'your', 'all', 'can', 'has', 'have', 'not', 'but', 'its', 'his', 'her',
  'shop', 'store', 'services', 'service', 'best', 'quality', 'new', 'old',
  'near', 'local', 'we', 'a', 'an', 'in', 'on', 'at', 'to', 'of', 'is', 'it',
]);

const CACHE_TTL_MS = 15 * 60 * 1000;

let cache = null; // { vectors: Map<id, Map<term, weight>>, idf: Map, builtAt, meta: Map }

function tokenize(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    // Keep Devanagari alongside ASCII: shop names in this catalogue are
    // routinely in Hindi or Marathi script, and stripping to [a-z] would reduce
    // those documents to their category alone.
    //
    // \p{M} is essential and easy to miss. Devanagari vowel signs — the matras
    // in कि, ना — are combining Marks, not Letters, so a class of just
    // \p{L}\p{N} deletes them and shatters "किराना" into the bare consonants
    // क र न. Each survivor is then one character long and the length filter
    // below discards it, so the whole name tokenizes to nothing: those shops
    // get an empty vector and are invisible to every content comparison.
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ')
    .split(/\s+/)
    // Counted in code points, not UTF-16 units, so a surrogate pair is one
    // character rather than two.
    .filter((t) => [...t].length > 2 && !STOPWORDS.has(t));
}

/** L2-normalises in place so cosine similarity is a plain dot product. */
function normalize(vec) {
  let sumSq = 0;
  for (const w of vec.values()) sumSq += w * w;
  const norm = Math.sqrt(sumSq);
  if (norm === 0) return vec;
  for (const [term, w] of vec) vec.set(term, w / norm);
  return vec;
}

/**
 * Cosine similarity between two L2-normalised sparse vectors.
 *
 * Iterates the smaller vector, so the cost is proportional to the shorter
 * document rather than to the vocabulary.
 */
function cosine(a, b) {
  if (!a || !b || a.size === 0 || b.size === 0) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [term, weight] of small) {
    const other = large.get(term);
    if (other !== undefined) dot += weight * other;
  }
  // Both are normalised, so the dot product is already the cosine. Clamped
  // because floating-point error can put it a hair above 1.
  return Math.min(Math.max(dot, 0), 1);
}

async function loadCorpus() {
  // COALESCE throughout: description and tags are optional, and a shop with no
  // description must still get a vector from its name and category rather than
  // being silently excluded from every content-similarity comparison.
  const res = await query(`
    SELECT s.id,
           COALESCE(s.name, '')        AS name,
           COALESCE(s.description, '') AS description,
           COALESCE(s.category, '')    AS category,
           COALESCE(c.name, '')        AS category_name
      FROM local_shops s
      LEFT JOIN shop_categories c ON c.id = s.category_id
     WHERE COALESCE(s.is_active, 1) = 1
  `);
  return res.rows || res || [];
}

/**
 * Builds the TF-IDF index over the active catalogue.
 *
 * The name is weighted more heavily than the description by repeating its
 * tokens: "Sharma Grocery Mart" tells you more about what a shop is than three
 * sentences of marketing copy, and in this catalogue the descriptions are
 * largely generated boilerplate that would otherwise dominate the vector.
 */
async function build() {
  const rows = await loadCorpus();
  const docs = new Map();
  const docFreq = new Map();
  const meta = new Map();

  for (const row of rows) {
    const nameTokens = tokenize(row.name);
    const tokens = [
      ...nameTokens,
      ...nameTokens, // name counted twice
      ...tokenize(row.category_name || row.category),
      ...tokenize(row.description),
    ];

    const tf = new Map();
    for (const term of tokens) tf.set(term, (tf.get(term) || 0) + 1);
    if (tf.size === 0) continue;

    for (const term of tf.keys()) docFreq.set(term, (docFreq.get(term) || 0) + 1);
    docs.set(row.id, tf);
    meta.set(row.id, { category: row.category_name || row.category });
  }

  const n = docs.size || 1;
  const idf = new Map();
  for (const [term, df] of docFreq) {
    // Smoothed IDF. Without the +1s, a term appearing in every document gets
    // weight 0 and one appearing in none divides by zero.
    idf.set(term, Math.log((n + 1) / (df + 1)) + 1);
  }

  const vectors = new Map();
  for (const [id, tf] of docs) {
    const vec = new Map();
    let maxTf = 0;
    for (const count of tf.values()) if (count > maxTf) maxTf = count;
    for (const [term, count] of tf) {
      // Sub-linear TF, normalised by the document's own maximum, so a long
      // description cannot outweigh a short one purely by repetition.
      vec.set(term, (0.5 + 0.5 * (count / maxTf)) * (idf.get(term) || 1));
    }
    vectors.set(id, normalize(vec));
  }

  cache = { vectors, idf, meta, builtAt: Date.now() };
  logger.info(`ML embeddings built: ${vectors.size} shops, ${idf.size} terms.`);
  return cache;
}

async function getIndex({ force = false } = {}) {
  if (!force && cache && Date.now() - cache.builtAt < CACHE_TTL_MS) return cache;
  try {
    return await build();
  } catch (err) {
    logger.error('ML embedding build failed: ' + err.message);
    // An empty index makes every similarity zero, which drives the content term
    // to contribute nothing and leaves the other terms to rank. Ranking
    // degrades; it does not fail.
    if (!cache) cache = { vectors: new Map(), idf: new Map(), meta: new Map(), builtAt: Date.now() };
    return cache;
  }
}

/** The stored vector for one catalogue item, or null. */
async function vectorFor(itemId) {
  const index = await getIndex();
  return index.vectors.get(itemId) || null;
}

/** Embeds arbitrary text into the same space, for a query or a preference. */
async function embedText(text) {
  const index = await getIndex();
  const tokens = tokenize(text);
  if (tokens.length === 0) return new Map();

  const tf = new Map();
  for (const term of tokens) tf.set(term, (tf.get(term) || 0) + 1);

  let maxTf = 0;
  for (const count of tf.values()) if (count > maxTf) maxTf = count;

  const vec = new Map();
  for (const [term, count] of tf) {
    // Terms absent from the corpus get the IDF a singleton would have, rather
    // than being dropped: a query term nothing matches should contribute
    // nothing, not silently change the weighting of the terms around it.
    const termIdf = index.idf.get(term) || 1;
    vec.set(term, (0.5 + 0.5 * (count / maxTf)) * termIdf);
  }
  return normalize(vec);
}

/**
 * A user's preference vector, built from what they have engaged with.
 *
 * Each interacted item's vector is added in proportion to the weight of the
 * interaction, so a shop the user phoned pulls the profile five times as hard
 * as one they merely tapped. Returns null when there is no history, which is
 * the common case today and is why the content term carries a confidence.
 */
async function preferenceVector(userId, { limit = 50 } = {}) {
  if (!userId) return null;
  try {
    const res = await query(
      `SELECT item_id, SUM(weight) AS total_weight
         FROM ml_interaction_events
        WHERE user_id = $1 AND item_type = 'shop' AND weight > 0
        GROUP BY item_id
        ORDER BY total_weight DESC
        LIMIT $2`,
      [userId, limit]
    );
    const rows = res.rows || res || [];
    if (rows.length === 0) return null;

    const index = await getIndex();
    const profile = new Map();
    for (const row of rows) {
      const vec = index.vectors.get(row.item_id);
      if (!vec) continue;
      const weight = Number(row.total_weight) || 0;
      for (const [term, value] of vec) {
        profile.set(term, (profile.get(term) || 0) + value * weight);
      }
    }
    if (profile.size === 0) return null;
    return normalize(profile);
  } catch (err) {
    logger.warn('Preference vector build failed: ' + err.message);
    return null;
  }
}

/** Drops the cached index. Called after a catalogue write. */
function invalidate() {
  cache = null;
}

function stats() {
  return {
    built: Boolean(cache),
    items: cache ? cache.vectors.size : 0,
    vocabulary: cache ? cache.idf.size : 0,
    age_ms: cache ? Date.now() - cache.builtAt : null,
  };
}

module.exports = {
  getIndex,
  vectorFor,
  embedText,
  preferenceVector,
  cosine,
  tokenize,
  invalidate,
  stats,
  build,
};
