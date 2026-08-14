/**
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * Category-Territory Matrix Routes â€” Dynamic Category Engine
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 */
const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../config/database');
const { authenticate, requireAdmin, ROLES } = require('../../../middleware/auth.middleware');
const CacheService = require('../../../services/cache.service');
const { v4: uuidv4 } = require('uuid');

/**
 * GET /categories/active
 * Returns only active categories for the user's locked territory.
 * Falls back to ALL categories if no matrix entry exists.
 */
router.get('/active', async (req, res, next) => {
  try {
    const territoryId = req.territoryId || req.query.territory_id || req.headers['x-territory-id'];

    // Try territory-scoped cache first
    const cacheKey = territoryId
      ? CacheService.territoryKey(territoryId, 'categories')
      : 'categories:all';

    const cached = await CacheService.getOrSet(cacheKey, 1800, async () => {
      if (territoryId) {
        // Check if matrix has entries for this territory
        const matrixCount = await queryOne('SELECT count(*) as c FROM category_territory_matrix WHERE territory_id = $1',
          [territoryId]
        );

        if (matrixCount && matrixCount.c > 0) {
          // Return only active categories for this territory, sorted by priority
          const categories = await query(`
            SELECT sc.*, ctm.priority, ctm.is_active as territory_active
            FROM shop_categories sc
            JOIN category_territory_matrix ctm ON sc.id = ctm.category_id
            WHERE ctm.territory_id = $1 AND ctm.is_active = 1 AND sc.is_active = 1
            ORDER BY ctm.priority DESC, sc.display_order ASC
          `, [territoryId]);
          return categories.rows || categories;
        }
      }

      // Fallback: return ALL active categories (no matrix defined)
      const all = await query('SELECT * FROM shop_categories WHERE is_active = 1 ORDER BY display_order ASC');
      return all.rows || all;
    });

    res.setHeader('X-Cache-Source', cached.source);
    res.json({ success: true, categories: cached.data, territoryId: territoryId || 'global' });
  } catch (error) { next(error); }
});

/**
 * GET /categories/matrix/:territoryId
 * Admin: fetch the full matrix for a territory (for editing).
 */
router.get('/matrix/:territoryId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const matrix = await query(`
      SELECT sc.*, 
             COALESCE(ctm.is_active, 0) as territory_active,
             COALESCE(ctm.priority, 0) as priority
      FROM shop_categories sc
      LEFT JOIN category_territory_matrix ctm 
        ON sc.id = ctm.category_id AND ctm.territory_id = $1
      WHERE sc.is_active = 1
      ORDER BY ctm.priority DESC, sc.display_order ASC
    `, [req.params.territoryId]);

    res.json({ success: true, data: matrix.rows || matrix });
  } catch (error) { next(error); }
});

/**
 * PUT /categories/matrix
 * Admin: update the category matrix for a territory.
 * Body: { territoryId, categories: [{ categoryId, isActive, priority }] }
 */
router.put('/matrix', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { territoryId, categories } = req.body;
    if (!territoryId || !Array.isArray(categories)) {
      return res.status(400).json({ error: 'territoryId and categories array required' });
    }

    for (const cat of categories) {
      const existing = await queryOne('SELECT id FROM category_territory_matrix WHERE category_id = $1 AND territory_id = $2',
        [cat.categoryId, territoryId]
      );

      if (existing) {
        await query('UPDATE category_territory_matrix SET is_active = $1, priority = $2 WHERE id = $3',
          [cat.isActive ? 1 : 0, cat.priority || 0, existing.id]
        );
      } else {
        await query('INSERT INTO category_territory_matrix (id, category_id, territory_id, is_active, priority) VALUES ($1, $2, $3, $4, $5)',
          [uuidv4(), cat.categoryId, territoryId, cat.isActive ? 1 : 0, cat.priority || 0]
        );
      }
    }

    // Invalidate cache for this territory
    await CacheService.invalidateTerritory(territoryId);

    res.json({ success: true, message: `Updated ${categories.length} category mappings for territory.` });
  } catch (error) { next(error); }
});

module.exports = router;
