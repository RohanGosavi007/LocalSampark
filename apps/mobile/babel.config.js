module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo"]
    ],
    plugins: [
      ["@babel/plugin-proposal-decorators", { "legacy": true }],
      // Reanimated 4 moved its Babel plugin into react-native-worklets, which is
      // now a peer dependency rather than a bundled one: react-native-reanimated
      // 4.1.7 declares no @babel/plugin-transform-* dependencies at all, while
      // react-native-worklets 0.5.1 declares all of them. The old
      // "react-native-reanimated/plugin" path still resolves only through a
      // deprecated shim that forwards here and warns, and that shim is slated
      // for removal — at which point every worklet ("worklet" directives,
      // useAnimatedStyle, useDerivedValue, gesture handlers) would silently stop
      // being transformed and fail at runtime instead of at build time.
      //
      // This must stay the LAST entry in the list.
      "react-native-worklets/plugin",
    ],
  };
};
