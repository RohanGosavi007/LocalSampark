const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
config.projectRoot = __dirname;

// ── Inject globalThis.expo shim BEFORE any module loads ────────────────────
// This prevents: "TypeError: Cannot read property 'requireNativeModule' of undefined"
// Root cause: Expo JSI native init lags behind Hermes JS execution on Android.
// The shim at src/expo-crash-fix.js runs as a polyfill (pre-module) and sets up
// a safe globalThis.expo object. When native finishes, it overwrites the shim.
const EXPO_CRASH_FIX = path.resolve(__dirname, 'src/expo-crash-fix.js');

const originalGetPolyfills = config.serializer && config.serializer.getPolyfills
  ? config.serializer.getPolyfills.bind(config.serializer)
  : () => [];

config.serializer = config.serializer || {};
config.serializer.getPolyfills = function ({ platform }) {
  const defaults = originalGetPolyfills({ platform }) || [];
  // Prepend our shim so it runs before all other polyfills
  return [EXPO_CRASH_FIX, ...defaults];
};

module.exports = config;

