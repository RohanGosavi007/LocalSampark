const { query } = require('../config/database');

/**
 * Get all revenue models (subscriptions, loyalty)
 */
const getRevenueModels = async (req, res, next) => {
  try {
    // Fetch subscriptions (in reality, maybe filter by active or global)
    const subscriptions = await query(`
      SELECT id, name, description, frequency, price, is_active
      FROM subscription_plans
    `);

    // Fetch loyalty tiers
    const loyalty = await query(`
      SELECT id, name, min_points, perks, is_active
      FROM loyalty_tiers
      ORDER BY min_points ASC
    `);

    // Fetch configs for profit splits and ads
    const configRows = await query(`
      SELECT config_key as key, config_value as value
      FROM admin_config
      WHERE config_key IN ('platform_profit_split', 'reward_pool_split', 'reserve_split', 'ad_cpc', 'ad_cpm', 'product_commission_percent', 'skilled_job_commission_percent', 'event_ticket_commission_percent', 'delivery_base_fee', 'property_listing_fee', 'marketplace_listing_fee', 'franchise_commission_rate', 'delivery_payout_rate')
    `);
    
    // Default values if missing from DB
    const defaultConfig = {
      platform_profit_split: '70',
      reward_pool_split: '20',
      reserve_split: '10',
      ad_cpc: '5',
      ad_cpm: '100',
      product_commission_percent: '10',
      skilled_job_commission_percent: '15',
      event_ticket_commission_percent: '5',
      delivery_base_fee: '40',
      property_listing_fee: '500',
      marketplace_listing_fee: '50',
      franchise_commission_rate: '30',
      delivery_payout_rate: '80'
    };

    const configArray = configRows.rows || configRows || [];
    const config = { ...defaultConfig };
    configArray.forEach(row => {
      if (row.key) config[row.key] = row.value;
    });

    res.json({
      success: true,
      data: {
        subscriptions,
        loyalty,
        config
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a subscription plan (price, etc.)
 */
const updateSubscriptionPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { price, is_active } = req.body;

    await query(`
      UPDATE subscription_plans
      SET price = $1, is_active = $2
      WHERE id = $3
    `, [price, is_active, id]);

    res.json({ success: true, message: 'Subscription plan updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a loyalty tier
 */
const updateLoyaltyTier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { min_points, perks, is_active } = req.body;

    await query(`
      UPDATE loyalty_tiers
      SET min_points = $1, perks = $2, is_active = $3
      WHERE id = $4
    `, [min_points, perks, is_active, id]);

    res.json({ success: true, message: 'Loyalty tier updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Update configs (profit allocation, ad pricing)
 */
const updateConfig = async (req, res, next) => {
  try {
    const updates = req.body; // { key: value }
    const keys = Object.keys(updates);
    
    for (const key of keys) {
      // Upsert into admin_config
      await query(`
        INSERT INTO admin_config (config_key, config_value) 
        VALUES ($1, $2) 
        ON CONFLICT(config_key) DO UPDATE SET config_value = $3
      `, [key, String(updates[key]), String(updates[key])]);
    }

    res.json({ success: true, message: 'Configuration updated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRevenueModels,
  updateSubscriptionPlan,
  updateLoyaltyTier,
  updateConfig
};
