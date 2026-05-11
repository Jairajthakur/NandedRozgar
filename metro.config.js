const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude server-side files from the mobile bundle.
// Without this, Metro may try to bundle Node.js modules (express, pg, bcryptjs)
// which have no React Native equivalent and cause a native crash at startup.
config.resolver.blockList = [
  /src\/index\.js$/,
  /src\/db\.js$/,
  /src\/routes\/.*/,
  /src\/middleware\/.*/,
];

module.exports = config;
