// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: 'expo',
  ignorePatterns: [
    '/dist/*',
    // Dead code, unreferenced by any screen or route, importing a
    // ./components/VisitorViewRouter that doesn't exist at this path. Kept
    // on disk rather than deleted in case it's finished later, but it
    // shouldn't fail CI in the meantime.
    'src/screens/shops/DynamicSuperAppShopScreen.js',
    // Binary/corrupted file, not valid JS source.
    'test_hermes.js',
    // Minified/transpiled build output checked into the repo root, not
    // hand-written source — linting it reports the bundler's `var` usage as
    // if it were app code. Worth a separate conversation about whether these
    // belong in git at all.
    'expo_compiled.js',
    'index_compiled.js',
    // Metro polyfill injected before ANY module loads (see its own
    // docstring) — deliberately old-school `var`/function style for a
    // bootstrap-time crash shim. Not worth touching for a style rule.
    'src/expo-crash-fix.js',
  ],
  env: {
    browser: true,
    node: true,
  },
  overrides: [
    {
      // Detox e2e specs use their own global test API (describe/it/expect/
      // device/element/by/waitFor/...), which isn't part of any base env
      // here. Without this override every Detox global reads as an
      // undefined variable to ESLint.
      files: ['e2e/**/*.js'],
      env: { jest: true },
      globals: {
        device: 'readonly',
        element: 'readonly',
        by: 'readonly',
        waitFor: 'readonly',
        expect: 'readonly',
      },
    },
  ],
};
