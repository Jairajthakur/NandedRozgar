const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

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

// Workaround: use-latest-callback ships a broken `main` field pointing to
// ./lib/src/index.js which doesn't exist in newer versions. Walk candidate
// paths to find the real compiled file regardless of installed version.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'use-latest-callback') {
    const candidates = [
      'node_modules/use-latest-callback/src/index.ts',
      'node_modules/use-latest-callback/lib/index.js',
      'node_modules/use-latest-callback/lib/commonjs/index.js',
      'node_modules/use-latest-callback/index.js',
    ];
    for (const candidate of candidates) {
      const full = path.resolve(__dirname, candidate);
      if (fs.existsSync(full)) {
        return { filePath: full, type: 'sourceFile' };
      }
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
