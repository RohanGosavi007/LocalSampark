const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../config/database');
const { authenticate, requireAdmin, requireStaff } = require('../../../middleware/auth.middleware');
const { requirePermission } = require('../../../middleware/rbac.middleware');

// GET dashboard summary
router.get('/dashboard', authenticate, requireStaff, requirePermission('finance', 'read'), async (req, res, next) => {
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
router.get('/', authenticate, requireStaff, requirePermission('finance', 'read'), async (req, res, next) => {
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
router.put('/shops/:shopId/override', authenticate, requireStaff, requirePermission('finance', 'write'), async (req, res, next) => {
    try {
        const { commission_override_percent, convenience_fee_override } = req.body;
        await query('UPDATE local_shops SET commission_override_percent = $1, convenience_fee_override = $2 WHERE id = $3',
            [commission_override_percent, convenience_fee_override, req.params.shopId]
        );
        res.json({ success: true, message: "Shop override updated" });
    } catch(err) {
        next(err);
    }
});

// POST /api/v1/crm/commissions/process-split - Trigger automated commission & franchise split
router.post('/process-split', authenticate, requireStaff, requirePermission('finance', 'write'), async (req, res, next) => {
  try {
    const { order_id, shop_id, order_amount, pincode = '411015' } = req.body;
    if (!order_id || !shop_id || !order_amount) {
      return res.status(400).json({ error: 'Missing required order parameters.' });
    }

    const platformCommission = order_amount * 0.05; // 5% total platform fee
    const franchiseSplit = platformCommission * 0.25; // 25% of fee goes to Franchise Owner (1.25% of GMV)
    const netShopPayout = order_amount - platformCommission;

    // Insert commission record
    // order_type, commission_percent and total_platform_earning are NOT NULL
    // and were not written. The 5 is the rate applied three lines up.
    await query(`INSERT INTO shop_commissions
         (id, order_id, shop_id, order_type, gross_amount, commission_percent, commission_amount, total_platform_earning, net_to_shop, status)
       VALUES ($6, $1, $2, 'product_order', $3, 5, $4, $4, $5, 'settled')`,
      [order_id, shop_id, order_amount, platformCommission, netShopPayout, require('crypto').randomUUID()]
    );

    // Find and credit franchise partner for pincode
    const partner = await queryOne('SELECT id, user_id FROM franchise_partners WHERE territory_pincode LIKE $1 OR territory_name LIKE $2 LIMIT 1',
      [`%${pincode}%`, `%${pincode}%`]
    );

    if (partner && partner.user_id) {
      await query('UPDATE wallets SET balance = balance + $1 WHERE user_id = $2',
        [franchiseSplit, partner.user_id]
      );
    }

    res.json({
      success: true,
      order_id,
      gross_amount: order_amount,
      platform_commission: platformCommission,
      net_shop_payout: netShopPayout,
      franchise_commission_credited: partner ? franchiseSplit : 0
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
