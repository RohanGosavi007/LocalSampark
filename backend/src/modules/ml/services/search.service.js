/**
 * Hybrid search: keyword and vector, fused.
 *
 * Neither retriever is good enough alone, and they fail in opposite directions:
 *
 *   Keyword (FTS5) is exact. A user typing a shop's actual name must get that
 *   shop first, and lexical matching does that perfectly. It returns nothing at
 *   all for "urgent plumber for leaking tap", because no shop description
 *   contains that phrase.
 *
 *   Vector is fuzzy. It finds the plumber, and it also cheerfully returns
 *   something vaguely related when the user typed an exact name it happens to
 *   score slightly lower.
 *
 * Reciprocal rank fusion combines them without needing their scores to be
 * comparable — which they are not, one being a BM25-family relevance and the
 * other a cosine. RRF only reads each retriever's *ordering*, so no calibration
 * or score normalisation is required, and adding a third retriever later needs
 * no re-tuning.
 *
 * This also contains an existing divergence rather than inheriting it.
 * shop_search_index is a SQLite FTS5 virtual table with no PostgreSQL
 * counterpart, so keyword search behaves differently in production than in dev
 * and CI. The vector path behaves identically on both engines, and is what
 * answers when FTS5 is unavailable.
 */

const { query } = require('../../../config/database');
const embeddings = require('./embedding.service');
const logger = require('../../../config/logger');

/**
 * RRF constant. 60 is the value from the original Cormack et al. paper and the
 * usual default; it damps the advantage of rank 1 over rank 2 so a single
 * retriever cannot dominate the fused list on one confident hit.
 */
const RRF_K = 60;

const isSqlite = () => process.env.USE_SQLITE === 'true';

/**
 * Escapes a user query for FTS5.
 *
 * FTS5 has its own query syntax: bare `-`, `*`, `"` and `:` are operators, and
 * a user typing "24/7 plumber - urgent" produces a syntax error rather than
 * results. Each token is quoted, which makes it a literal phrase and neutralises
 * the operators.
 */
function toFtsQuery(text, { prefix = false } = {}) {
  const tokens = String(text || '')
    // Punctuation is stripped from the tokens themselves, not merely quoted
    // around. Quoting makes "(leaking" safe — inside quotes FTS5 reads it as a
    // literal phrase rather than as an operator — but the indexed token is
    // `leaking`, so the quoted form matches nothing and the word is silently
    // lost from the query. Stripping keeps it searchable.
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
  if (tokens.length === 0) return null;
  // The trailing * is FTS5 prefix matching, and it has to sit outside the
  // quotes to be read as an operator rather than a literal asterisk.
  return tokens.map((t) => (prefix ? `"${t}"*` : `"${t}"`)).join(' OR ');
}

/**
 * Keyword retrieval. Returns ids in relevance order.
 *
 * `prefix` is what makes autocomplete work. Exact token matching returns
 * nothing for "groc" — no shop is called that — so a suggest endpoint built on
 * it is silent until the user has typed a whole word, which is the one thing an
 * autocomplete must not do.
 */
async function keywordSearch(text, limit, { prefix = false } = {}) {
  if (!isSqlite()) {
    // No FTS5 on Postgres in this schema. A LIKE scan over ~124 rows is
    // perfectly adequate at this catalogue size and keeps the endpoint working
    // identically on both engines rather than silently returning nothing.
    try {
      // A trailing-wildcard LIKE is already a prefix match, so the Postgres
      // path needs no separate mode.
      const like = `%${String(text).toLowerCase()}%`;
      const res = await query(
        `SELECT id FROM local_shops
          WHERE COALESCE(is_active, 1) = 1
            AND (LOWER(name) LIKE $1 OR LOWER(COALESCE(description, '')) LIKE $1
                 OR LOWER(COALESCE(category, '')) LIKE $1)
          LIMIT $2`,
        [like, limit]
      );
      return (res.rows || res || []).map((r) => r.id);
    } catch (err) {
      logger.warn('Keyword search (LIKE) failed: ' + err.message);
      return [];
    }
  }

  const ftsQuery = toFtsQuery(text, { prefix });
  if (!ftsQuery) return [];

  try {
    const res = await query(
      `SELECT shop_id FROM shop_search_index
        WHERE shop_search_index MATCH $1
        ORDER BY rank
        LIMIT $2`,
      [ftsQuery, limit]
    );
    return (res.rows || res || []).map((r) => r.shop_id);
  } catch (err) {
    // A malformed FTS query or a missing index must not take search down; the
    // vector half still answers.
    logger.warn('FTS5 search failed, falling back to vector only: ' + err.message);
    return [];
  }
}

/** Vector retrieval. Returns ids in similarity order. */
async function vectorSearch(text, limit) {
  try {
    const queryVector = await embeddings.embedText(text);
    if (!queryVector || queryVector.size === 0) return [];

    const index = await embeddings.getIndex();
    const scored = [];
    for (const [id, vec] of index.vectors) {
      const score = embeddings.cosine(queryVector, vec);
      // Items with no term overlap at all are noise. Returning them would fill
      // the tail of every search with arbitrary shops.
      if (score > 0.01) scored.push({ id, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.id);
  } catch (err) {
    logger.warn('Vector search failed: ' + err.message);
    return [];
  }
}

/**
 * Reciprocal rank fusion.
 *
 * Each list contributes 1/(k + rank) to every id it contains. An item both
 * retrievers rank highly beats one that only appears in a single list, without
 * either retriever's raw score entering the calculation.
 */
function fuse(rankedLists, weights = []) {
  const scores = new Map();
  const sources = new Map();

  rankedLists.forEach((list, listIndex) => {
    const weight = weights[listIndex] != null ? weights[listIndex] : 1;
    list.forEach((id, rank) => {
      scores.set(id, (scores.get(id) || 0) + weight / (RRF_K + rank + 1));
      if (!sources.has(id)) sources.set(id, []);
      sources.get(id).push(listIndex === 0 ? 'keyword' : 'vector');
    });
  });

  return Array.from(scores.entries())
    .map(([id, score]) => ({ id, score, sources: sources.get(id) }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Searches shops.
 *
 * Returns hydrated rows in fused order, each tagged with which retrievers found
 * it — useful in the admin console for judging whether the vector half is
 * earning its place.
 */
async function search(text, { limit = 20, lat = null, lng = null, categorySlug = null, prefix = false } = {}) {
  const started = Date.now();
  const trimmed = String(text || '').trim();

  if (trimmed.length < 2) {
    return { items: [], strategy: 'none', reason: 'query_too_short', timings: { total_ms: 0 } };
  }

  // Retrieve wider than the page, so fusion has material to reorder. Fusing two
  // lists already truncated to the page size mostly reproduces their agreement
  // and wastes the exercise.
  const retrieveLimit = Math.min(Math.max(limit * 5, 50), 200);

  const [keywordIds, vectorIds] = await Promise.all([
    keywordSearch(trimmed, retrieveLimit, { prefix }),
    vectorSearch(trimmed, retrieveLimit),
  ]);

  if (keywordIds.length === 0 && vectorIds.length === 0) {
    return {
      items: [],
      strategy: 'hybrid',
      reason: 'no_match',
      retrievers: { keyword: 0, vector: 0 },
      timings: { total_ms: Date.now() - started },
    };
  }

  // Keyword is weighted slightly higher. When someone types an exact name, they
  // want that shop, and the lexical retriever is the one that knows it.
  const fused = fuse([keywordIds, vectorIds], [1.2, 1.0]).slice(0, limit * 2);
  if (fused.length === 0) {
    return { items: [], strategy: 'hybrid', reason: 'no_match', timings: { total_ms: Date.now() - started } };
  }

  const ids = fused.map((f) => f.id);
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  const params = [...ids];

  let sql = `
    SELECT s.*, c.name AS category_name, c.slug AS category_slug
      FROM local_shops s
      LEFT JOIN shop_categories c ON c.id = s.category_id
     WHERE s.id IN (${placeholders}) AND COALESCE(s.is_active, 1) = 1`;

  if (categorySlug && categorySlug !== 'all') {
    params.push(categorySlug);
    sql += ` AND s.category_id = (SELECT id FROM shop_categories WHERE slug = $${params.length} LIMIT 1)`;
  }

  const res = await query(sql, params);
  const byId = new Map((res.rows || res || []).map((r) => [r.id, r]));

  // SQL returns rows in whatever order it likes; the fused ranking is the point,
  // so the order is reapplied here rather than trusted from the database.
  const items = [];
  for (const entry of fused) {
    const row = byId.get(entry.id);
    if (!row) continue;
    items.push({
      ...row,
      _fusion_score: entry.score,
      _matched_by: entry.sources,
    });
    if (items.length >= limit) break;
  }

  return {
    items,
    strategy: 'hybrid',
    retrievers: { keyword: keywordIds.length, vector: vectorIds.length },
    timings: { total_ms: Date.now() - started },
  };
}

module.exports = { search, keywordSearch, vectorSearch, fuse, toFtsQuery, RRF_K };
