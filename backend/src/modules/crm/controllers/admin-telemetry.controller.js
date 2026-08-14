const { query } = require('../../../../config/database');

exports.getGodModeMetrics = async (req, res, next) => {
  try {
    // Fire concurrent queries for maximum performance
    const [usersResult, shopsResult, ordersResult, regionsResult] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM local_shops'),
      query('SELECT COUNT(*) as count FROM orders'),
      query('SELECT COUNT(*) as count FROM regions')
    ]);

    // Handle both pg (rows) and generic drivers
    const totalUsers = parseInt((usersResult.rows || usersResult)[0].count || 0);
    const totalShops = parseInt((shopsResult.rows || shopsResult)[0].count || 0);
    const totalOrders = parseInt((ordersResult.rows || ordersResult)[0].count || 0);
    const totalRegions = parseInt((regionsResult.rows || regionsResult)[0].count || 0);

    // Some mock/placeholder data for time-series charts required by the UI
    const revenueOverTime = [
      { name: 'Jan', value: 1000 },
      { name: 'Feb', value: 1200 },
      { name: 'Mar', value: 900 },
      { name: 'Apr', value: 1500 },
      { name: 'May', value: 2000 }
    ];

    res.json({
      success: true,
      data: {
        totalUsers,
        totalShops,
        totalOrders,
        totalRegions,
        revenueYTD: totalOrders * 250, // Mock calculation for now
        revenueOverTime
      }
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
