const { query, queryOne } = require('../config/database');

let flagCache = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 30000; // 30 seconds TTL

class FeatureFlagService {
  static async getAllFlags(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && flagCache && (now - lastCacheTime < CACHE_TTL_MS)) {
      return flagCache;
    }

    const res = await query('SELECT * FROM feature_flags ORDER BY phase ASC');
    const flags = res.rows || res;
    
    // Convert to lookup map
    const flagMap = {};
    flags.forEach(f => {
      let pincodes = [];
      try {
        pincodes = JSON.parse(f.allowed_pincodes_json || '[]');
      } catch (e) {
        pincodes = [];
      }
      flagMap[f.feature_key] = {
        ...f,
        is_enabled: Boolean(f.is_enabled),
        allowed_pincodes: pincodes
      };
    });

    flagCache = flagMap;
    lastCacheTime = now;
    return flagCache;
  }

  static invalidateCache() {
    flagCache = null;
    lastCacheTime = 0;
  }

  static async isFeatureAvailable(featureKey, pincode = null) {
    const flags = await this.getAllFlags();
    const flag = flags[featureKey];

    if (!flag) {
      // Unknown feature keys default to available to prevent breaking unflagged endpoints
      return { available: true };
    }

    // 1. Globally Enabled
    if (flag.is_enabled) {
      return { available: true, flag };
    }

    // 2. Hyperlocal Soft-Launch via Pincode Whitelist
    if (pincode && Array.isArray(flag.allowed_pincodes) && flag.allowed_pincodes.includes(String(pincode))) {
      return { available: true, flag, isBeta: true };
    }

    // 3. Disabled / Locked Feature
    return {
      available: false,
      flag,
      comingSoon: {
        headline: flag.coming_soon_headline || `${flag.title} Coming Soon!`,
        message: flag.coming_soon_message || 'This feature is currently rolling out to your neighborhood soon.'
      }
    };
  }
}

module.exports = FeatureFlagService;
