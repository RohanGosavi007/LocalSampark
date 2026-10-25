const { query } = require('../../../config/database');
const platformConfig = require('../../../services/platformConfig.service');

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
    const { price, is_active } = req.body || {};
    const amount = Number(price);
    if (price === undefined || price === null || price === '' || !Number.isFinite(amount) || amount < 0 || amount > 100000) {
      return res.status(400).json({ success: false, error: 'price must be a number from 0 to 100000' });
    }

    await query(`
      UPDATE subscription_plans
      SET price = $1, is_active = $2
      WHERE id = $3
        `, [amount, is_active, id]);

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
 * Update configs (profit allocation, ad pricing).
 *
 * This wrote whatever keys and values it was sent straight into admin_config
 * — the table the pricing settings live in — so it could set
 * default_commission_percent to "free" or delivery_base_fee to -500. Pricing
 * settings now go through platformConfig.update(), which checks each against
 * its range; the other keys this screen shows must be numbers from 0 to
 * 100000. Anything else is refused, and nothing is saved unless all of it is
 * valid.
 */
const LEGACY_KEYS = new Set([
  'platform_profit_split', 'reward_pool_split', 'reserve_split', 'ad_cpc', 'ad_cpm',
  'product_commission_percent', 'skilled_job_commission_percent', 'event_ticket_commission_percent',
  'property_listing_fee', 'marketplace_listing_fee', 'franchise_commission_rate', 'delivery_payout_rate',
]);

const updateConfig = async (req, res, next) => {
  try {
    const updates = req.body && typeof req.body === 'object' ? req.body : {};
    const pricing = {};
    const legacy = {};
    const errors = {};

    for (const [key, value] of Object.entries(updates)) {
      if (platformConfig.SETTINGS[key]) {
        pricing[key] = value;
      } else if (LEGACY_KEYS.has(key)) {
        const number = Number(value);
        if (value === '' || value === null || !Number.isFinite(number) || number < 0 || number > 100000) {
          errors[key] = 'Must be a number from 0 to 100000';
        } else {
          legacy[key] = number;
        }
      } else {
        errors[key] = 'Unknown setting';
      }
    }

    // Checked in full before anything is written.
    for (const key of Object.keys(pricing)) {
      if (platformConfig.coerce(key, pricing[key]) === undefined) errors[key] = 'Not a valid value for this setting';
    }
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, error: 'Some settings are not valid. Nothing was changed.', errors });
    }

    if (Object.keys(pricing).length) {
      const outcome = await platformConfig.update(pricing, req.user && req.user.id);
      if (outcome.errors) return res.status(400).json({ success: false, error: 'Some settings are not valid.', errors: outcome.errors });
    }
    for (const [key, value] of Object.entries(legacy)) {
      // config_value is JSONB on PostgreSQL: a number in text form is valid JSON.
      await query(`
        INSERT INTO admin_config (config_key, config_value, config_category)
        VALUES ($1, $2, 'revenue_model')
        ON CONFLICT(config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = CURRENT_TIMESTAMP
      `, [key, String(value)]);
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
