/**
 * Dev Mode Configuration
 * Controls mock data behavior and developer features across the app.
 * In production builds, FORCE_MOCK_DATA should always be false.
 */

const isDev = process.env.NODE_ENV === 'development' || __DEV__;

export const DEV_CONFIG = {
  /** Show [DEMO] badge on screens using mock/fallback data */
  SHOW_DEMO_BADGE: true,

  /** Allow mock login when backend is unreachable */
  ENABLE_MOCK_LOGIN: true,

  /** Mock wallet balance for testing (used when API fails) */
  MOCK_WALLET_BALANCE: 750.00,

  /** Console log all API requests and responses */
  LOG_API_CALLS: isDev,

  /** Force ALL screens to use mock data (for offline testing) */
  FORCE_MOCK_DATA: false,

  /** Show network status indicator */
  SHOW_NETWORK_STATUS: isDev,
};

/**
 * Check if the app is running in development/testing mode.
 * Used to decide whether to show dev-only UI elements.
 */
export function isDevMode() {
  return isDev;
}

/**
 * Check if a specific dev feature is enabled
 */
export function isFeatureEnabled(featureName) {
  return DEV_CONFIG[featureName] ?? false;
}
