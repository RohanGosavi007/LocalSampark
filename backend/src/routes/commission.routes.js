const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');

// GET dashboard summary
router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    const totalCommissions = await queryOne('SELECT SUM(commission_amount) as total FROM shop_commissions WHERE status != $1', ['refunded']);
    const pendingSettlements = await queryOne('SELECT SUM(net_to_shop) as total FROM shop_commissions WHERE status = $1', ['pending']);
    
    // Revenue by category (rough estimation via joins)
    const categoryRevenue = await query(`
        SELECT sc.name as category_name, SUM(c.commission_amount) as commission
        FROM shop_commissions c
        JOIN local_shops ls ON c.shop_id = ls.id
        JOIN shop_categories sc ON ls.category_id = sc.id
        GROUP BY sc.id
    `);

    res.json({
        totalCommissions: totalCommissions?.total || 0,
        pendingSettlements: pendingSettlements?.total || 0,
        categoryRevenue: categoryRevenue.rows || categoryRevenue
    });
  } catch (error) {
    next(error);
  }
});

// GET list of all commissions
router.get('/', authenticate, async (req, res, next) => {
    try {
        const history = await query(`
            SELECT c.*, ls.name as shop_name 
            FROM shop_commissions c 
            JOIN local_shops ls ON c.shop_id = ls.id 
            ORDER BY c.created_at DESC LIMIT 100
        `);
        res.json(history.rows || history);
    } catch(err) {
        next(err);
    }
});

// PUT per-shop override
router.put('/shops/:shopId/override', authenticate, async (req, res, next) => {
    try {
        const { commission_override_percent, convenience_fee_override } = req.body;
        await query(
            'UPDATE local_shops SET commission_override_percent = $1, convenience_fee_override = $2 WHERE id = $3',
            [commission_override_percent, convenience_fee_override, req.params.shopId]
        );
        res.json({ success: true, message: "Shop override updated" });
    } catch(err) {
        next(err);
    }
});

module.exports = router;
