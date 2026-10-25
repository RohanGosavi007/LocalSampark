const { isFeatureEnabled, getAllFeatures } = require('../../../packages/shared');

/**
 * Middleware that guards an Express route behind a feature flag.
 * If the feature is disabled (and not bypassed in testing), returns 403/404.
 */
function requireFeature(featureKey, options = {}) {
  const { statusCode = 403, message } = options;

  return (req, res, next) => {
    // In test environment with BYPASS_FEATURE_FLAGS=true, allow tests to run
    if (process.env.NODE_ENV === 'test' && (process.env.BYPASS_FEATURE_FLAGS === 'true' || process.env.BYPASS_FEATURE_FLAGS === '1')) {
      return next();
    }

    if (!isFeatureEnabled(featureKey)) {
      return res.status(statusCode).json({
        success: false,
        error: 'FEATURE_DISABLED',
        message: message || `The ${featureKey} feature is currently inactive in this launch phase.`,
        feature: featureKey
      });
    }

    next();
  };
}

module.exports = {
  requireFeature,
  isFeatureEnabled,
  getAllFeatures
};
