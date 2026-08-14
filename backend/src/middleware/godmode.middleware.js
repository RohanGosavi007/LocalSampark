const { queryOne } = require('../config/database');
const { cacheGetOrSet } = require('../config/redis');
const logger = require('../config/logger');

/**
 * Middleware to enforce God-Mode Kill-Switches.
 * 
 * @param {string} killSwitchKey - The key from admin_config (e.g., 'kill_switch_deliveries')
 * @param {string} customMessage - Message to return if blocked
 */
const enforceKillSwitch = (killSwitchKey, customMessage = 'Service is temporarily unavailable due to system maintenance.') => {
  return async (req, res, next) => {
    try {
      // Super Admins can bypass kill switches
      if (req.user && req.user.role === 'super_admin') {
        return next();
      }

      // Check if kill switch is active (Cached for 60 seconds)
      const isKillSwitchActive = await cacheGetOrSet(`kill_switch:${killSwitchKey}`, async () => {
        const config = await queryOne(`SELECT config_value FROM admin_config WHERE config_key = $1`, [killSwitchKey]);
        return config && config.config_value === 'true';
      }, 60);
      
      if (isKillSwitchActive) {
        return res.status(503).json({
          success: false,
          error: customMessage,
          code: 'KILL_SWITCH_ACTIVE'
        });
      }

      next();
    } catch (error) {
      if (logger && logger.error) {
        logger.error(`[Kill-Switch Error] Failed to check ${killSwitchKey}: ${error.message}`);
      } else {
        console.error(`[Kill-Switch Error] Failed to check ${killSwitchKey}:`, error.message);
      }
      
      // FAIL-CLOSED: Do NOT let requests pass if we cannot ascertain kill switch state!
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable (Failsafe Active)',
        code: 'FAILSAFE_CLOSED'
      });
    }
  };
};

module.exports = {
  enforceKillSwitch
};
