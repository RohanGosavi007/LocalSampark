const { query } = require('../../../config/database');

/**
 * The admin dashboard's headline numbers.
 *
 * Every figure is read from the database. This used to hide failures and invent
 * data:
 *   - each count caught its error and answered 0, so a broken query looked like
 *     "0 users";
 *   - revenue summed a column that does not exist (`totalAmountPaise`, from the
 *     Prisma schema), fell back to another query, and in the end to
 *     `totalOrders * 350`;
 *   - the monthly chart was a synthetic ramp computed from that one figure, over
 *     a hardcoded Jan–Aug;
 *   - `active_sos` was a literal 0;
 *   - cancelled orders counted as revenue, because the status was compared with
 *     'CANCELLED' and is stored 'cancelled'.
 * A query that fails now fails the request, so the console shows an error
 * instead of a confident zero.
 *
 * "Revenue" here is gross order value (GMV) of orders that were not cancelled,
 * in rupees. Platform commission is in the finance export.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

exports.getGodModeMetrics = async (req, res, next) => {
  try {
    const scalar = async (sql, params = []) => {
      const result = await query(sql, params);
      const rows = result.rows || result || [];
      return rows[0] || {};
    };

    const now = new Date();
    const year = now.getUTCFullYear();
    const yearStart = `${year}-01-01`;

    const [users, shops, orders, regions, sos, gmv, monthly] = await Promise.all([
      scalar('SELECT COUNT(*) AS count FROM users'),
      scalar('SELECT COUNT(*) AS count FROM local_shops'),
      scalar('SELECT COUNT(*) AS count FROM orders'),
      scalar('SELECT COUNT(*) AS count FROM regions'),
      scalar("SELECT COUNT(*) AS count FROM sos_alerts WHERE LOWER(status) = 'active'"),
      scalar(
        "SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders WHERE LOWER(COALESCE(order_status, '')) <> 'cancelled' AND created_at >= $1",
        [yearStart]
      ),
      query(
        `SELECT SUBSTR(CAST(created_at AS TEXT), 1, 7) AS month, COALESCE(SUM(total_amount), 0) AS total
           FROM orders
          WHERE LOWER(COALESCE(order_status, '')) <> 'cancelled' AND created_at >= $1
          GROUP BY SUBSTR(CAST(created_at AS TEXT), 1, 7)`,
        [yearStart]
      ),
    ]);

    const totals = Object.fromEntries((monthly.rows || monthly || []).map((r) => [String(r.month), Number(r.total) || 0]));
    // January to the current month, each from its own orders; a month with none is 0.
    const revenueOverTime = MONTHS.slice(0, now.getUTCMonth() + 1).map((name, i) => ({
      name,
      value: Math.round(totals[`${year}-${String(i + 1).padStart(2, '0')}`] || 0),
    }));

    const int = (row) => parseInt(row.count || 0, 10);
    const revenueYTD = Math.round(Number(gmv.total) || 0);
    const heap = process.memoryUsage();

    res.json({
      success: true,
      data: {
        totalUsers: int(users),
        total_users: int(users),
        totalShops: int(shops),
        total_shops: int(shops),
        totalOrders: int(orders),
        total_orders: int(orders),
        totalRegions: int(regions),
        total_regions: int(regions),
        active_sos: int(sos),
        // Reaching here means the database answered every query above.
        system_health: { ram_usage: Math.round((heap.heapUsed / heap.heapTotal) * 100), status: 'healthy' },
        revenueYTD,
        revenue_ytd: revenueYTD,
        revenueOverTime,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;

    try {
      const logsResult = await query(`SELECT * FROM admin_audit_log 
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      res.json({ success: true, data: logsResult.rows || logsResult });
    } catch (e) {
      // If table doesn't exist yet, just return empty array instead of crashing
      res.json({ success: true, data: [] });
    }
  } catch (error) {
    next(error);
  }
};
