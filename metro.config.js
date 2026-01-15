// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure .web.ts/.web.tsx files are prioritized for web platform
// This avoids web bundler issues with platform-specific dependencies
config.resolver.sourceExts = ['web.tsx', 'web.ts', 'web.js', ...config.resolver.sourceExts];

module.exports = config;
