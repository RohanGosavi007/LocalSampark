/**
 * C5: searching the catalogue (products and shops), with autocomplete, typo
 * tolerance and category and price facets.
 *
 * Before this the only search was GET /shops/search, which looked at shops
 * alone: a customer typing "basmati" found no rice, and "bred" found nothing.
 *
 * Matching is trigram similarity, the measure PostgreSQL's pg_trgm uses:
 *   - on PostgreSQL the database does it (similarity / word_similarity, with
 *     the trigram indexes of migration 147), so candidates are found without
 *     reading the catalogue;
 *   - on SQLite (development and CI) the same measure is worked out here, over
 *     the listed products.
 * A substring match always counts, so "atta" finds "Chakki Atta 5kg" however
 * short the query. If pg_trgm is missing, the PostgreSQL path falls back to
 * substring matching rather than failing.
 *
 * Typesense remains optional: nothing here depends on it.
 */
const { query } = require('../config/database');
const logger = require('../config/logger');
const { isRestrictedProduct } = require('./restrictedGoods');

const isSqlite = () => process.env.USE_SQLITE === 'true';
const MIN_QUERY = 2;
const MAX_QUERY = 80;
const CANDIDATES = 500;
const SQLITE_SCAN = 5000;
// pg_trgm's defaults: similarity 0.3, word_similarity 0.6. Word similarity is
// relaxed a little so one wrong letter in a short word still matches ("bred").
const SIMILARITY = 0.3;
const WORD_SIMILARITY = 0.45;

const rowsOf = (r) => (r && r.rows) || r || [];
const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

/** A query as searched: trimmed, lower-case, single-spaced; null if too short. */
function normalise(q) {
  const v = String(q || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY);
  return v.length >= MIN_QUERY ? v : null;
}

/** pg_trgm's trigrams: each word padded with two spaces before and one after. */
function trigrams(text) {
  const set = new Set();
  for (const word of String(text || '').toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (!word) continue;
    const padded = `  ${word} `;
    for (let i = 0; i < padded.length - 2; i += 1) set.add(padded.slice(i, i + 3));
  }
  return set;
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/** similarity(a, b) */
const similarity = (a, b) => jaccard(trigrams(a), trigrams(b));

/** pg_trgm's trigrams of text, in order (a word's trigrams, then the next word's). */
function trigramSequence(text) {
  const out = [];
  for (const word of String(text || '').toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (!word) continue;
    const padded = `  ${word} `;
    for (let i = 0; i < padded.length - 2; i += 1) out.push(padded.slice(i, i + 3));
  }
  return out;
}

/**
 * word_similarity(q, text), as pg_trgm defines it: the greatest similarity
 * between q's trigrams and any continuous run of text's trigrams, which may be
 * part of a word. So "bred" scores 0.6 against "brown bread" ("  b", " br",
 * "bre"), and pg_trgm's own example, ('word', 'two words'), is 0.8.
 */
function wordSimilarity(q, text) {
  const qt = trigrams(q);
  if (!qt.size) return 0;
  const seq = trigramSequence(text);
  let best = 0;
  for (let i = 0; i < seq.length; i += 1) {
    const extent = new Set();
    let shared = 0;
    for (let j = i; j < seq.length; j += 1) {
      if (!extent.has(seq[j])) {
        extent.add(seq[j]);
        if (qt.has(seq[j])) shared += 1;
      }
      const sim = shared / (qt.size + extent.size - shared);
      if (sim > best) best = sim;
      if (best === 1) return 1;
    }
  }
  return best;
}

/** How well a product matches: 1 for a substring of its name, else trigram. */
function score(q, row) {
  const name = String(row.name || '').toLowerCase();
  if (name.includes(q)) return name.startsWith(q) ? 1.1 : 1;
  const trig = Math.max(similarity(name, q), wordSimilarity(q, name));
  if (trig >= WORD_SIMILARITY || similarity(name, q) >= SIMILARITY) return trig;
  const rest = `${row.category || ''} ${row.description || ''} ${row.brand || ''}`.toLowerCase();
  return rest.includes(q) ? 0.5 : 0;
}

const LISTED = (col) => `COALESCE(CAST(${col} AS TEXT), '1') IN ('1', 'true', 't')`;
const VISIBLE = `${LISTED('p.is_available')} AND ${LISTED('p.is_active')}
  AND ${LISTED('s.is_active')} AND COALESCE(s.approval_status, 'pending') NOT IN ('rejected', 'suspended')`;
const COLUMNS = `p.id, p.name, p.description, p.price, p.mrp, p.image_url, p.unit, p.net_quantity, p.category,
  p.shop_id, s.name AS shop_name`;

async function pgCandidates(q) {
  const like = `%${q}%`;
  try {
    return rowsOf(await query(
      `SELECT ${COLUMNS},
              GREATEST(similarity(LOWER(p.name), $1), word_similarity($1, LOWER(p.name))) AS trig
         FROM shop_products p JOIN local_shops s ON s.id = p.shop_id
        WHERE ${VISIBLE}
          AND (LOWER(p.name) LIKE $2 OR LOWER(COALESCE(p.category, '')) LIKE $2 OR LOWER(COALESCE(p.description, '')) LIKE $2
               OR word_similarity($1, LOWER(p.name)) >= ${WORD_SIMILARITY} OR similarity(LOWER(p.name), $1) >= ${SIMILARITY})
        ORDER BY trig DESC
        LIMIT ${CANDIDATES}`,
      [q, like]
    ));
  } catch (err) {
    // pg_trgm not installed: substring matching still answers.
    logger.warn(`Catalogue search without pg_trgm: ${err.message}`);
    return rowsOf(await query(
      `SELECT ${COLUMNS} FROM shop_products p JOIN local_shops s ON s.id = p.shop_id
        WHERE ${VISIBLE} AND (LOWER(p.name) LIKE $1 OR LOWER(COALESCE(p.category, '')) LIKE $1 OR LOWER(COALESCE(p.description, '')) LIKE $1)
        LIMIT ${CANDIDATES}`,
      [like]
    ));
  }
}

async function sqliteCandidates() {
  return rowsOf(await query(
    `SELECT ${COLUMNS} FROM shop_products p JOIN local_shops s ON s.id = p.shop_id WHERE ${VISIBLE} LIMIT ${SQLITE_SCAN}`,
    []
  ));
}

/** Matching products, best first, each with its score. */
async function matchProducts(q) {
  const rows = isSqlite() ? await sqliteCandidates() : await pgCandidates(q);
  return rows
    // Restricted goods (tobacco, alcohol, …: A3) are not offered by search.
    .filter((row) => !isRestrictedProduct(row.name, row.description).restricted)
    .map((row) => ({ row, score: score(q, row) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || Number(a.row.price) - Number(b.row.price));
}

/** Shops whose name or category matches. */
async function matchShops(q, limit) {
  const visible = `${LISTED('s.is_active')} AND COALESCE(s.approval_status, 'pending') NOT IN ('rejected', 'suspended')`;
  let rows;
  if (isSqlite()) {
    rows = rowsOf(await query(`SELECT s.id, s.name, s.category, s.address, s.rating FROM local_shops s WHERE ${visible} LIMIT ${SQLITE_SCAN}`, []));
  } else {
    try {
      rows = rowsOf(await query(
        `SELECT s.id, s.name, s.category, s.address, s.rating FROM local_shops s
          WHERE ${visible} AND (LOWER(s.name) LIKE $2 OR LOWER(COALESCE(s.category, '')) LIKE $2 OR word_similarity($1, LOWER(s.name)) >= ${WORD_SIMILARITY})
          LIMIT ${CANDIDATES}`,
        [q, `%${q}%`]
      ));
    } catch {
      rows = rowsOf(await query(
        `SELECT s.id, s.name, s.category, s.address, s.rating FROM local_shops s
          WHERE ${visible} AND (LOWER(s.name) LIKE $1 OR LOWER(COALESCE(s.category, '')) LIKE $1) LIMIT ${CANDIDATES}`,
        [`%${q}%`]
      ));
    }
  }
  return rows
    .map((row) => ({ row, score: score(q, { name: row.name, category: row.category }) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((m) => m.row);
}

const presentProduct = (r) => ({
  id: r.id,
  name: r.name,
  price: Number(r.price),
  mrp: num(r.mrp),
  imageUrl: r.image_url || null,
  unit: r.unit || null,
  netQuantity: r.net_quantity || null,
  category: r.category || null,
  shop: { id: r.shop_id, name: r.shop_name },
});

const SORTS = ['relevance', 'price_asc', 'price_desc'];

/**
 * GET /shops/search/catalog. Facets describe everything the query matched:
 * the category counts ignore the chosen category, and the price range ignores
 * the chosen price limits, so a customer can always widen a filter again.
 */
async function searchCatalog({ q, category = null, minPrice = null, maxPrice = null, shopId = null, sort = 'relevance', limit = 20, offset = 0 } = {}) {
  const text = normalise(q);
  const empty = { query: text, products: [], shops: [], total: 0, facets: { categories: [], price: null } };
  if (!text) return { ...empty, reason: 'query_too_short' };

  const lo = num(minPrice);
  const hi = num(maxPrice);
  const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const skip = Math.max(parseInt(offset, 10) || 0, 0);
  const order = SORTS.includes(sort) ? sort : 'relevance';

  let matches = await matchProducts(text);
  if (shopId) matches = matches.filter((m) => String(m.row.shop_id) === String(shopId));

  const inPrice = (m) => (lo === null || Number(m.row.price) >= lo) && (hi === null || Number(m.row.price) <= hi);
  const inCategory = (m) => !category || String(m.row.category || '').toLowerCase() === String(category).toLowerCase();

  const counts = new Map();
  for (const m of matches.filter(inPrice)) {
    const name = m.row.category || 'Other';
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  const priced = matches.filter(inCategory).map((m) => Number(m.row.price)).filter(Number.isFinite);

  let chosen = matches.filter((m) => inCategory(m) && inPrice(m));
  if (order === 'price_asc') chosen = [...chosen].sort((a, b) => Number(a.row.price) - Number(b.row.price));
  if (order === 'price_desc') chosen = [...chosen].sort((a, b) => Number(b.row.price) - Number(a.row.price));

  return {
    query: text,
    products: chosen.slice(skip, skip + take).map((m) => presentProduct(m.row)),
    total: chosen.length,
    shops: skip === 0 && !shopId ? await matchShops(text, 5) : [],
    facets: {
      categories: [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      price: priced.length ? { min: Math.min(...priced), max: Math.max(...priced) } : null,
    },
    sort: order,
  };
}

/**
 * GET /shops/search/suggest: up to `limit` completions while the customer
 * types: shops and products whose names start with, contain or nearly match
 * what has been typed, prefix matches first.
 */
async function suggest(q, { limit = 8 } = {}) {
  const text = normalise(q);
  if (!text) return { query: text, suggestions: [] };
  const [products, shops] = await Promise.all([matchProducts(text), matchShops(text, limit)]);
  const seen = new Set();
  const out = [];
  const rank = (name) => {
    const n = String(name).toLowerCase();
    if (n.startsWith(text)) return 0;
    if (n.split(/\s+/).some((w) => w.startsWith(text))) return 1;
    return n.includes(text) ? 2 : 3;
  };
  const all = [
    ...shops.map((s) => ({ type: 'shop', id: s.id, label: s.name, sub: s.category || null })),
    ...products.map((m) => ({ type: 'product', id: m.row.id, label: m.row.name, sub: m.row.shop_name, shopId: m.row.shop_id })),
  ].sort((a, b) => rank(a.label) - rank(b.label));
  for (const s of all) {
    const key = `${s.type}:${String(s.label).toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= limit) break;
  }
  return { query: text, suggestions: out };
}

module.exports = { searchCatalog, suggest, normalise, trigrams, similarity, wordSimilarity, score, SORTS };
