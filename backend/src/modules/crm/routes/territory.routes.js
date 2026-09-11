const express = require('express');
const router = express.Router();
const { getTerritoryMap } = require('../controllers/territory.controller');
const { query, queryOne } = require('../../../config/database');
const { authenticate, requireRole } = require('../../../middleware/auth.middleware');

// Admin / Franchise Routes
router.get('/map', getTerritoryMap);

// The mobile auth context reads pending territory approvals on sign-in; this
// was never implemented, so the call 404'd on every launch.
router.get('/pending-approvals', authenticate, async (req, res, next) => {
  try {
    // Owner name and the revenue the shop has generated are both shown on the
    // franchise screen, so they are joined here rather than left for the client
    // to invent.
    const rows = await query(
      `SELECT s.id, s.name, s.category, s.approval_status, s.pincode, s.created_at,
              u.full_name AS owner_name,
              COALESCE((
                SELECT SUM(o.total_amount) FROM orders o
                 WHERE o.shop_id = s.id AND LOWER(o.order_status) = 'delivered'
              ), 0) AS revenue
         FROM local_shops s
         LEFT JOIN users u ON u.id = s.owner_id
        ORDER BY
          CASE WHEN s.approval_status = 'pending' THEN 0 ELSE 1 END,
          s.created_at DESC
        LIMIT 100`
    );
    const data = rows.rows || rows;
    res.json({ success: true, data, count: data.length });
  } catch (error) {
    next(error);
  }
});

/**
 * Approve or reject a shop in the territory.
 *
 * The mobile franchise screen had a "Review KYC & Approve" button that showed
 * "Shop is now live in your territory" and only changed a value in React state:
 * there was no approval endpoint anywhere in the backend, so a partner could
 * believe they had approved a shop that stayed pending forever.
 */
router.put(
  '/shops/:id/approval',
  authenticate,
  requireRole('admin', 'super_admin', 'territory_admin', 'area_agent'),
  async (req, res, next) => {
    try {
      const { status } = req.body;

      if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: "status must be 'approved', 'rejected' or 'pending'" });
      }

      const shop = await queryOne('SELECT id FROM local_shops WHERE id = $1', [req.params.id]);
      if (!shop) return res.status(404).json({ error: 'Shop not found' });

      // is_verified is what requireShopOwner gates merchant access on, and
      // is_active is what the storefront listing filters by, so an approval has
      // to move all three or the shop is approved in name only.
      await query(
        `UPDATE local_shops
            SET approval_status = $1,
                is_verified = $2,
                is_active = $3,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $4`,
        [status, status === 'approved' ? 1 : 0, status === 'approved' ? 1 : 0, req.params.id]
      );

      const updated = await queryOne('SELECT * FROM local_shops WHERE id = $1', [req.params.id]);
      res.json({ success: true, shop: updated });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
