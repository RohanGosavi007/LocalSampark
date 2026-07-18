const { query } = require('../config/database');

/**
 * Calculates the platform and franchise splits for a given order amount
 * @param {number} totalAmount 
 * @param {number} platformFeePercentage (e.g. 5% = 5)
 * @param {number} franchiseSplitPercentage (e.g. 20% = 20)
 * @returns {Object} { platformRetained, franchisePayout, shopOwnerPayout }
 */
const calculateRevenueSplits = (totalAmount, platformFeePercentage = 5, franchiseSplitPercentage = 20) => {
  const platformFee = totalAmount * (platformFeePercentage / 100);
  
  // Franchise gets a percentage of the PLATFORM FEE, not the total order amount
  const franchisePayout = platformFee * (franchiseSplitPercentage / 100);
  const platformRetained = platformFee - franchisePayout;
  
  // Shop owner gets total minus platform fee
  const shopOwnerPayout = totalAmount - platformFee;

  return {
    platformRetained,
    franchisePayout,
    shopOwnerPayout,
    totalPlatformFee: platformFee
  };
};

/**
 * Get all franchise mappings with stats
 */
const getFranchises = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT f.id, u.full_name as owner_name, u.region_id, f.territory_name as name, f.territory_pincode as zones, f.commission_rate as split,
             f.merchants_onboarded as shops,
             f.product_commission_percent, f.skilled_job_commission_percent, f.event_ticket_commission_percent,
             f.delivery_base_fee, f.property_listing_fee, f.marketplace_listing_fee,
             f.platform_profit_split, f.reward_pool_split, f.reserve_split
      FROM franchise_partners f
      JOIN users u ON f.user_id = u.id
    `);
    
    res.json({
      success: true,
      data: result.rows || result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update franchise split percentage
 */
const updateFranchiseSplit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      splitPercentage,
      product_commission_percent, skilled_job_commission_percent, event_ticket_commission_percent,
      delivery_base_fee, property_listing_fee, marketplace_listing_fee,
      platform_profit_split, reward_pool_split, reserve_split
    } = req.body;

    const result = await query(
      `UPDATE franchise_partners 
       SET commission_rate = COALESCE($1, commission_rate),
           product_commission_percent = COALESCE($2, product_commission_percent),
           skilled_job_commission_percent = COALESCE($3, skilled_job_commission_percent),
           event_ticket_commission_percent = COALESCE($4, event_ticket_commission_percent),
           delivery_base_fee = COALESCE($5, delivery_base_fee),
           property_listing_fee = COALESCE($6, property_listing_fee),
           marketplace_listing_fee = COALESCE($7, marketplace_listing_fee),
           platform_profit_split = COALESCE($8, platform_profit_split),
           reward_pool_split = COALESCE($9, reward_pool_split),
           reserve_split = COALESCE($10, reserve_split)
       WHERE id = $11 RETURNING *`,
      [
        splitPercentage, 
        product_commission_percent, skilled_job_commission_percent, event_ticket_commission_percent,
        delivery_base_fee, property_listing_fee, marketplace_listing_fee,
        platform_profit_split, reward_pool_split, reserve_split,
        id
      ]
    );

    res.json({
      success: true,
      data: (result.rows && result.rows[0]) || result[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending payouts
 */
const getPendingPayouts = async (req, res, next) => {
  try {
    const franchisePayouts = await query(`
      SELECT fp.id, u.full_name || ' (' || f.territory_name || ')' as payee, 'Franchise' as type, fp.commission_earned as amount, fp.created_at as date, fp.payout_status as status
      FROM franchise_payouts fp
      JOIN franchise_partners f ON fp.franchise_partner_id = f.id
      JOIN users u ON f.user_id = u.id
      WHERE fp.payout_status = 'pending'
    `);
    
    const developerPayouts = await query(`
      SELECT dp.id, 'Core Developer Team' as payee, 'Developer' as type, dp.developer_share as amount, dp.created_at as date, dp.payout_status as status
      FROM developer_payouts dp
      WHERE dp.payout_status = 'pending'
    `);

    const shopOwnerPayouts = await query(`
      SELECT wt.id, u.full_name || ' (Shop)' as payee, 'Shop Withdrawal' as type, wt.amount as amount, wt.created_at as date, wt.status as status
      FROM wallet_transactions wt
      JOIN wallets w ON wt.wallet_id = w.id
      JOIN users u ON w.user_id = u.id
      WHERE wt.purpose = 'withdrawal' AND wt.status = 'pending' AND u.role = 'shop_owner'
    `);

    const skilledPayouts = await query(`
      SELECT wt.id, u.full_name || ' (Service)' as payee, 'Skilled Worker' as type, wt.amount as amount, wt.created_at as date, wt.status as status
      FROM wallet_transactions wt
      JOIN wallets w ON wt.wallet_id = w.id
      JOIN users u ON w.user_id = u.id
      WHERE wt.purpose = 'withdrawal' AND wt.status = 'pending' AND u.role = 'service_provider'
    `);

    res.json({
      success: true,
      data: {
        franchise: franchisePayouts.rows || franchisePayouts,
        developer: developerPayouts.rows || developerPayouts,
        shopOwner: shopOwnerPayouts.rows || shopOwnerPayouts,
        skilled: skilledPayouts.rows || skilledPayouts,
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get dashboard stats
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const revenueSum = await query(`SELECT COALESCE(SUM(platform_share), 0) as total FROM revenue_transactions WHERE status = 'completed'`);
    const payoutsSum = await query(`SELECT COALESCE(SUM(commission_earned), 0) as total FROM franchise_payouts WHERE payout_status = 'completed'`);
    const shopsCount = await query(`SELECT COUNT(*) as count FROM local_shops WHERE is_active = 1`);
    const activeRegions = await query(`SELECT COUNT(*) as count FROM regions WHERE is_active = 1`);
    const totalRegions = await query(`SELECT COUNT(*) as count FROM regions`);
    const totalUsers = await query(`SELECT COUNT(*) as count FROM users`);
    const franchiseCount = await query(`SELECT COUNT(*) as count FROM franchise_partners`);
    const activeFranchiseCount = await query(`SELECT COUNT(*) as count FROM franchise_partners WHERE status = 'active'`);
    
    // Calculate basic growth metric (comparing this month to last month)
    let growthVal = '+0%';
    try {
      const thisMonth = await query(`SELECT COALESCE(SUM(platform_share), 0) as total FROM revenue_transactions WHERE status = 'completed' AND created_at >= date('now', 'start of month')`);
      const lastMonth = await query(`SELECT COALESCE(SUM(platform_share), 0) as total FROM revenue_transactions WHERE status = 'completed' AND created_at >= date('now', 'start of month', '-1 month') AND created_at < date('now', 'start of month')`);
      const tmTotal = thisMonth.rows ? thisMonth.rows[0].total : thisMonth[0].total;
      const lmTotal = lastMonth.rows ? lastMonth.rows[0].total : lastMonth[0].total;
      if (lmTotal > 0) {
        const pct = ((tmTotal - lmTotal) / lmTotal) * 100;
        growthVal = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
      }
    } catch(e) {}
    
    res.json({
      success: true,
      data: {
        totalRevenue: (revenueSum.rows ? revenueSum.rows[0].total : revenueSum[0].total) || 0,
        totalPayouts: (payoutsSum.rows ? payoutsSum.rows[0].total : payoutsSum[0].total) || 0,
        activeShops: (shopsCount.rows ? shopsCount.rows[0].count : shopsCount[0].count) || 0,
        activeRegions: (activeRegions.rows ? activeRegions.rows[0].count : activeRegions[0].count) || 0,
        totalRegions: (totalRegions.rows ? totalRegions.rows[0].count : totalRegions[0].count) || 0,
        totalUsers: (totalUsers.rows ? totalUsers.rows[0].count : totalUsers[0].count) || 0,
        totalShops: (shopsCount.rows ? shopsCount.rows[0].count : shopsCount[0].count) || 0,
        totalFranchises: (franchiseCount.rows ? franchiseCount.rows[0].count : franchiseCount[0].count) || 0,
        activeFranchises: (activeFranchiseCount.rows ? activeFranchiseCount.rows[0].count : activeFranchiseCount[0].count) || 0,
        growth: growthVal
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get revenue chart data
 */
const getRevenueChart = async (req, res, next) => {
  try {
    let revenueData = [];
    try {
      // Try to fetch last 7 days of revenue
      const result = await query(`
        SELECT 
          strftime('%w', created_at) as day_index,
          COALESCE(SUM(platform_share), 0) as platform,
          COALESCE(SUM(franchise_share), 0) as franchise
        FROM revenue_transactions
        WHERE created_at >= date('now', '-6 days')
        GROUP BY day_index
      `);
      
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const rawData = result.rows || result;
      
      if (rawData.length > 0) {
        revenueData = rawData.map(row => ({
          name: days[parseInt(row.day_index)],
          platform: parseFloat(row.platform),
          franchise: parseFloat(row.franchise)
        }));
      } else {
        // Fallback to empty structure if no data
        revenueData = days.map(d => ({ name: d, platform: 0, franchise: 0 }));
      }
    } catch (e) {
      revenueData = [
        { name: 'Mon', platform: 0, franchise: 0 },
        { name: 'Tue', platform: 0, franchise: 0 }
      ];
    }
    
    res.json({
      success: true,
      data: revenueData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  calculateRevenueSplits,
  getFranchises,
  updateFranchiseSplit,
  getPendingPayouts,
  getDashboardStats,
  getRevenueChart
};
