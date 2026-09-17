/**
 * Minimal Jest setup for pure-logic tests.
 *
 * This deliberately does NOT use jest-expo or render components — it exists so
 * the auth/token-refresh logic in src/lib/api.js can be tested without a device
 * or a native runtime. That logic silently refreshes the session on a 401, and
 * a bug there logs every user out on their access token's expiry (now 1h), so
 * it needs coverage that does not depend on hardware being attached.
 *
 * Native modules are mapped to stubs in __mocks__ rather than transformed.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.js'],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$': '<rootDir>/__tests__/__mocks__/asyncStorage.js',
    '^expo-constants$': '<rootDir>/__tests__/__mocks__/expoConstants.js',
    '^expo-location$': '<rootDir>/__tests__/__mocks__/expoLocation.js',
    '^@react-native-community/netinfo$': '<rootDir>/__tests__/__mocks__/netinfo.js',
    '^expo-haptics$': '<rootDir>/__tests__/__mocks__/expoHaptics.js',
    // src/lib/api.js imports the token store from './secureStorage'. It used to
    // import it from '../context/AuthContext', which is why the mapping below
    // was keyed on that path.
    '^./secureStorage$': '<rootDir>/__tests__/__mocks__/secureStorage.js',
    '^../lib/secureStorage$': '<rootDir>/__tests__/__mocks__/secureStorage.js',
    '^../store/useTerritoryStore$': '<rootDir>/__tests__/__mocks__/territoryStore.js',
  },
  setupFiles: ['<rootDir>/__tests__/setup.js'],
  // Only ESM->CJS is needed; the modules under test are plain JS. Using the
  // commonjs transform directly avoids depending on @babel/preset-env, which
  // this project does not install.
  transform: {
    '^.+\\.js$': ['babel-jest', {
      babelrc: false,
      configFile: false,
      plugins: ['@babel/plugin-transform-modules-commonjs'],
    }],
  },
};
