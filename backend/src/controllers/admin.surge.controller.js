const SurgeEngine = require('../services/surge.engine');
const CacheService = require('../services/cache.service');
const { query } = require('../config/database');

/**
 * Controller allowing Territory Admins to configure surge limits per pincode
 */
async function getSurgeConfig(req, res, next) {
  try {
    const { pincode } = req.params;
    const config = await SurgeEngine.getTerritoryConfig(pincode);
    return res.json({ success: true, pincode, config });
  } catch (error) {
    next(error);
  }
}

async function updateSurgeConfig(req, res, next) {
  try {
    const { pincode } = req.params;
    const { enabled, capMode, maxMultiplier, maxFlatRupee, baseDeliveryFee } = req.body;

    const sql = `
      INSERT INTO territory_surge_configs (pincode, enabled, cap_mode, max_multiplier, max_flat_rupee, base_delivery_fee, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (pincode) 
      DO UPDATE SET 
        enabled = EXCLUDED.enabled,
        cap_mode = EXCLUDED.cap_mode,
        max_multiplier = EXCLUDED.max_multiplier,
        max_flat_rupee = EXCLUDED.max_flat_rupee,
        base_delivery_fee = EXCLUDED.base_delivery_fee,
        updated_at = NOW();
    `;

    await query(sql, [
      pincode,
      enabled !== undefined ? enabled : true,
      capMode || 'BOTH',
      maxMultiplier || 2.5,
      maxFlatRupee || 35,
      baseDeliveryFee || 25,
    ]);

    // Invalidate Redis Cache
    await CacheService.del(`surge:config:${pincode}`);

    return res.json({
      success: true,
      message: `Surge configuration updated for pincode ${pincode}`,
      config: { pincode, enabled, capMode, maxMultiplier, maxFlatRupee, baseDeliveryFee },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSurgeConfig,
  updateSurgeConfig,
};
