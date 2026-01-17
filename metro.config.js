// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure .web.ts/.web.tsx files are prioritized for web platform
config.resolver.sourceExts = ['web.tsx', 'web.ts', 'web.js', ...config.resolver.sourceExts];

// Force Metro to use CommonJS ("require") condition instead of ESM ("import")
// This keeps Metro from preferring ESM entrypoints in some deps
config.resolver.unstable_conditionNames = ['require'];

module.exports = config;
