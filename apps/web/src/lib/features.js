import { FEATURES, isFeatureEnabled as sharedIsEnabled } from '../../../../packages/shared/src/features';

export { FEATURES };

/**
 * Check whether a feature module is enabled in web client.
 */
export function isFeatureEnabled(featureKey) {
  if (typeof window !== 'undefined') {
    if (window.__FEATURE_OVERRIDES__ && window.__FEATURE_OVERRIDES__[featureKey] !== undefined) {
      return Boolean(window.__FEATURE_OVERRIDES__[featureKey]);
    }
  }
  return sharedIsEnabled(featureKey, process.env);
}
