const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.projectRoot = __dirname;
config.resolver.unstable_enableSymlinks = false;

config.maxWorkers = 0;

module.exports = config;
