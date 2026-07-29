const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure projectRoot is always the mobile app directory, regardless of CWD
config.projectRoot = __dirname;

module.exports = config;
