const CacheService = require('./cache.service');
const { query } = require('../config/database');

/**
 * 10x Dynamic Territory Surge Engine
 * Computes order density vs driver capacity per pincode & enforces Admin Configurable Caps.
 */
class SurgeEngine {
  /**
   * Default Admin Surge Configuration fallback
   */
  static DEFAULT_CONFIG = {
    enabled: true,
    capMode: 'BOTH', // 'MULTIPLIER', 'FLAT_RUPEE', or 'BOTH'
    maxMultiplier: 2.5,
    maxFlatRupee: 35,
    baseDeliveryFee: 25,
  };

  /**
   * Fetch Territory Admin Surge Settings for a specific pincode
   */
  static async getTerritoryConfig(pincode) {
    const cacheKey = `surge:config:${pincode}`;
    return await CacheService.getOrSet(cacheKey, 600, async () => {
      try {
        const res = await query(
          'SELECT * FROM territory_surge_configs WHERE pincode = $1 LIMIT 1',
          [pincode]
        );
        if (res.rows && res.rows.length > 0) {
          return { ...this.DEFAULT_CONFIG, ...res.rows[0] };
        }
      } catch (err) {
        console.warn(`[SurgeEngine] Using default config for ${pincode}:`, err.message);
      }
      return this.DEFAULT_CONFIG;
    });
  }

  /**
   * Calculate dynamic surge fee based on driver scarcity & admin caps
   */
  static async calculateSurge(pincode, activeOrdersCount = 10, availableDriversCount = 2) {
    const config = await this.getTerritoryConfig(pincode);

    if (!config.enabled || availableDriversCount === 0) {
      // Driver scarcity ratio check
      const driverRatio = availableDriversCount / Math.max(activeOrdersCount, 1);
      
      let rawMultiplier = 1.0;
      let rawSurgeRupee = 0;

      if (driverRatio < 0.15) {
        rawMultiplier = 2.2;
        rawSurgeRupee = 30;
      } else if (driverRatio < 0.3) {
        rawMultiplier = 1.5;
        rawSurgeRupee = 15;
      } else if (driverRatio < 0.5) {
        rawMultiplier = 1.2;
        rawSurgeRupee = 10;
      }

      // Enforce Admin Caps
      let finalMultiplier = rawMultiplier;
      let finalSurgeRupee = rawSurgeRupee;

      if (config.capMode === 'MULTIPLIER' || config.capMode === 'BOTH') {
        finalMultiplier = Math.min(rawMultiplier, parseFloat(config.maxMultiplier));
      }

      if (config.capMode === 'FLAT_RUPEE' || config.capMode === 'BOTH') {
        finalSurgeRupee = Math.min(rawSurgeRupee, parseFloat(config.maxFlatRupee));
      }

      const calculatedFee = Math.round(config.baseDeliveryFee * finalMultiplier);
      const cappedSurgeFee = Math.min(calculatedFee - config.baseDeliveryFee, finalSurgeRupee);

      return {
        isSurgeActive: rawMultiplier > 1.0,
        pincode,
        rawMultiplier,
        finalMultiplier,
        baseDeliveryFee: config.baseDeliveryFee,
        surgeFeeAdded: cappedSurgeFee,
        totalDeliveryFee: config.baseDeliveryFee + cappedSurgeFee,
        capApplied: {
          capMode: config.capMode,
          maxMultiplier: config.maxMultiplier,
          maxFlatRupee: config.maxFlatRupee,
        },
      };
    }

    return {
      isSurgeActive: false,
      pincode,
      totalDeliveryFee: config.baseDeliveryFee,
      surgeFeeAdded: 0,
    };
  }
}

module.exports = SurgeEngine;
