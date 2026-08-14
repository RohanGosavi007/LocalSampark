const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');

// The mobile dashboard has always called /dashboard/metrics; it was never
// implemented, so the screen rendered hardcoded placeholder figures.
router.get('/metrics', authenticate, async (req, res, next) => {
  try {
    // A missing table must not fail the whole dashboard, so each count is
    // resolved independently and degrades to zero.
    const count = async (sql, params = []) => {
      try {
        const r = await query(sql, params);
        const rows = r.rows || r || [];
        return parseInt(rows[0]?.count ?? 0, 10) || 0;
      } catch {
        return 0;
      }
    };

    const [totalUsers, activeShops, pendingApprovals, ordersToday] = await Promise.all([
      count('SELECT COUNT(*) AS count FROM users'),
      count("SELECT COUNT(*) AS count FROM local_shops WHERE is_active = true"),
      count("SELECT COUNT(*) AS count FROM local_shops WHERE approval_status = 'pending'"),
      count('SELECT COUNT(*) AS count FROM orders WHERE DATE(created_at) = CURRENT_DATE'),
    ]);

    let revenueToday = 0;
    try {
      const r = await query(
        `SELECT COALESCE(SUM(total_amount), 0) AS total
           FROM orders
          WHERE DATE(created_at) = CURRENT_DATE
            AND order_status <> 'cancelled'`
      );
      revenueToday = Number((r.rows || r)[0]?.total || 0);
    } catch {
      revenueToday = 0;
    }

    res.json({
      totalUsers,
      activeShops,
      pendingApprovals,
      ordersToday,
      // The screen renders this as a formatted string.
      revenueToday: revenueToday.toFixed(2),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
