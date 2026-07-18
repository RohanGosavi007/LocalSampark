const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.projectRoot = process.cwd();
config.resolver.unstable_enableSymlinks = false;

module.exports = withNativeWind(config, { input: './global.css' });
