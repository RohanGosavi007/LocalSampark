const FeatureFlagService = require('../services/FeatureFlagService');

/**
 * Express Middleware to restrict route execution if a GTM feature flag is locked.
 * Returns 403 Forbidden with FEATURE_LOCKED payload for graceful frontend "Coming Soon" handling.
 */
const requireFeature = (featureKey) => {
  return async (req, res, next) => {
    try {
      // Extract pincode from user token, query params, or body
      const pincode = req.query.pincode || req.body?.pincode || req.user?.pincode || null;

      const evalResult = await FeatureFlagService.isFeatureAvailable(featureKey, pincode);

      if (evalResult.available) {
        req.featureFlag = evalResult.flag;
        return next();
      }

      // Feature is locked -> return standardized Coming Soon payload
      return res.status(403).json({
        success: false,
        error_code: 'FEATURE_LOCKED',
        feature_key: featureKey,
        phase: evalResult.flag?.phase || 2,
        coming_soon: evalResult.comingSoon
      });
    } catch (error) {
      console.error(`Error checking feature flag [${featureKey}]:`, error);
      next(error);
    }
  };
};

module.exports = {
  requireFeature
};
