const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { authenticate, requireRole } = require('../../../middleware/auth.middleware');
const {
  attachFranchiseScope,
  requireFranchise,
  coversPincode,
} = require('../../../middleware/franchiseScope.middleware');
const pool = require('../../../config/database');

/**
 * Confirms the caller's franchise actually holds the zone in the URL.
 *
 * Every route here is keyed on `:zoneId` and every one of them was guarded only
 * by `requireRole('franchise')` — which asks whether the caller is *a*
 * franchise, never whether it is *this* franchise. Any partner could substitute
 * another partner's region id and read their merchant health scores, their
 * prospect list with contact details, and write outreach records into their
 * log. Roles answer "what kind of user"; only the territory scope answers
 * "whose data".
 *
 * Zones are regions, and regions carry a pincode, which is the same key the
 * scope is expressed in. An administrator is unscoped and passes through.
 */
async function requireZoneOwnership(req, res, next) {
  try {
    const scope = req.franchiseScope;
    if (scope && !scope.scoped) return next();

    const zone = await pool.queryOne(
      'SELECT id, pincode FROM regions WHERE id = $1 LIMIT 1',
      [req.params.zoneId]
    );

    if (!zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    if (!coversPincode(req, zone.pincode)) {
      return res.status(403).json({
        error: 'This zone is outside your franchise territory.',
      });
    }

    return next();
  } catch (err) {
    // Denying by default: a failure to establish ownership is not permission.
    return res.status(403).json({ error: 'Zone ownership could not be verified.' });
  }
}

const zoneGuard = [authenticate, requireRole('franchise'), attachFranchiseScope, requireFranchise, requireZoneOwnership];

// GET /api/v1/franchise-intelligence/:zoneId/health-scores - Merchant health scoring
router.get('/:zoneId/health-scores', ...zoneGuard, async (req, res) => {
  try {
    const { zoneId } = req.params;
    
    // Simulate complex health scoring: query orders in last 7 days, revenue trend, response time
    // local_shops has no zone_id or shop_category_slug column; scoping is by
    // region_id (-> regions.id), the same column franchise_partners uses, and
    // the category slug lives on shop_categories. Queried as they were, both
    // columns raised "no such column" and every request returned the generic
    // 500 below, which is why this never looked broken.
    const result = await pool.query(`SELECT s.id, s.name, c.slug AS shop_category_slug,
        (SELECT COUNT(*) FROM orders o WHERE o.shop_id = s.id AND o.created_at >= NOW() - INTERVAL '7 days') as recent_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders o WHERE o.shop_id = s.id AND o.created_at >= NOW() - INTERVAL '7 days') as recent_revenue
       FROM local_shops s
       LEFT JOIN shop_categories c ON c.id = s.category_id
       WHERE s.region_id = $1`,
      [zoneId]
    );

    // Calculate arbitrary health score 0-100 based on orders
    const scores = result.rows.map(shop => {
      const orders = parseInt(shop.recent_orders, 10);
      let score = 50; // Base score
      if (orders > 50) score = 95;
      else if (orders > 20) score = 80;
      else if (orders > 5) score = 65;
      else if (orders === 0) score = 30;

      return {
        ...shop,
        health_score: score,
        status: score > 75 ? 'Healthy' : (score > 40 ? 'Needs Attention' : 'At-Risk')
      };
    });

    res.json(scores);
  } catch (error) {
    res.status(500).json({ error: 'Server error calculating health scores' });
  }
});

// GET /api/v1/franchise-intelligence/:zoneId/leads - Prospective merchants
router.get('/:zoneId/leads', ...zoneGuard, async (req, res) => {
  try {
    const { zoneId } = req.params;
    // The table is franchise_lead_crm -- ai-analytics.routes.js reads it under
    // that name. `lead_crm` has never existed, so this endpoint always 500'd.
    const result = await pool.query(`SELECT * FROM franchise_lead_crm WHERE region_id = $1 ORDER BY created_at DESC`,
      [zoneId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching leads' });
  }
});

// POST /api/v1/franchise-intelligence/:zoneId/outreach - Log outreach attempt
router.post('/:zoneId/outreach', ...zoneGuard, async (req, res) => {
  try {
    const { zoneId } = req.params;
    const { shopId, method, notes } = req.body;

    // This previously wrote nothing and replied "Outreach logged successfully"
    // regardless -- a write endpoint reporting success for work it never did.
    // franchise_outreach_log is declared in migration 083.
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO franchise_outreach_log (id, region_id, shop_id, method, notes, logged_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, zoneId, shopId || null, method || null, notes || null, req.user.id || req.user.userId]
    );

    res.json({ message: 'Outreach logged successfully', data: { id, shopId, method } });
  } catch (error) {
    console.error('Franchise outreach logging failed:', error.message);
    res.status(500).json({ error: 'Server error logging outreach' });
  }
});

module.exports = router;
