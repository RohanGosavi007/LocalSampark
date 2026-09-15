/**
 * Semantic and predictive search.
 *
 * Backed by search.service.js, which fuses the FTS5 keyword index with vector
 * similarity. Both halves degrade independently: if FTS5 is missing the vector
 * half answers, and if the vector index fails to build the keyword half does.
 *
 * Worth noting what this fixes beyond the new capability. The existing
 * `GET /shops/search` calls SearchEngine.searchShops(), which returns null
 * whenever Typesense is unreachable — and Typesense is not configured in this
 * deployment — so that endpoint answers `503 Search Engine Offline` for every
 * query. Shop search is dead in production today. These endpoints do not depend
 * on any external service.
 */

const express = require('express');
const router = express.Router();

const { optionalAuth } = require('../../../middleware/auth.middleware');
const search = require('../services/search.service');
const ranker = require('../services/ranker.service');
const logger = require('../../../config/logger');

/**
 * POST /ml/search/semantic
 *
 * Body: { q, limit?, lat?, lng?, category? }
 *
 * POST rather than GET because a natural-language query is user-entered content
 * that would otherwise sit in access logs and in the browser history of a shared
 * device. "urgent std clinic near me" is not something to write into nginx logs.
 */
router.post('/semantic', optionalAuth, async (req, res) => {
  const started = Date.now();
  try {
    const body = req.body || {};
    const q = body.q || body.query || '';
    const limit = Math.min(Math.max(parseInt(body.limit, 10) || 20, 1), 50);

    const result = await search.search(q, {
      limit,
      lat: body.lat != null ? parseFloat(body.lat) : null,
      lng: body.lng != null ? parseFloat(body.lng) : null,
      categorySlug: body.category || null,
    });

    return res.json({
      success: true,
      surface: 'search_semantic',
      query: String(q).slice(0, 200),
      strategy: result.strategy,
      reason: result.reason || null,
      retrievers: result.retrievers || null,
      count: result.items.length,
      shops: ranker.publicShape(result.items).map((item) => {
        const out = { ...item };
        delete out._fusion_score;
        return out;
      }),
      timings: { total_ms: Date.now() - started },
    });
  } catch (err) {
    // An empty result set, never a 500 — the caller is a search box and has no
    // useful error path.
    logger.error('Semantic search failed: ' + err.message);
    return res.json({
      success: true,
      surface: 'search_semantic',
      strategy: 'none',
      reason: 'error',
      count: 0,
      shops: [],
      timings: { total_ms: Date.now() - started },
    });
  }
});

/**
 * GET /ml/search/suggest?q=
 *
 * Predictive completions for the search bar. Names only, so the payload stays
 * small enough to fetch on each keystroke.
 */
router.get('/suggest', async (req, res) => {
  const started = Date.now();
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 20);

    if (q.length < 2) {
      return res.json({ success: true, suggestions: [], timings: { total_ms: 0 } });
    }

    // Prefix mode: someone typing "groc" expects to see Grocery shops before
    // they finish the word.
    const result = await search.search(q, { limit, prefix: true });
    return res.json({
      success: true,
      query: q.slice(0, 100),
      suggestions: result.items.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category_name || item.category || null,
        matched_by: item._matched_by || [],
      })),
      timings: { total_ms: Date.now() - started },
    });
  } catch (err) {
    logger.warn('Search suggest failed: ' + err.message);
    return res.json({ success: true, suggestions: [], timings: { total_ms: Date.now() - started } });
  }
});

module.exports = router;
