const { queryOne } = require('../config/database');

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

      // Check if kill switch is active
      const config = await queryOne(`SELECT config_value FROM admin_config WHERE config_key = $1`, [killSwitchKey]);
      
      if (config && config.config_value === 'true') {
        return res.status(503).json({
          success: false,
          error: customMessage,
          code: 'KILL_SWITCH_ACTIVE'
        });
      }

      next();
    } catch (error) {
      console.error(`[Kill-Switch Error] Failed to check ${killSwitchKey}:`, error.message);
      // Fail-open: if DB check fails, let request pass to avoid completely breaking the platform on DB load
      next();
    }
  };
};

module.exports = {
  enforceKillSwitch
};
