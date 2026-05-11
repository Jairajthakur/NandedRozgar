const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// Block only THIS PROJECT'S server-side files, not node_modules.
// The previous regexes like /src\/index\.js$/ were too broad —
// they also matched node_modules/expo-secure-store/src/index.js etc.,
// causing "keeps stopping" crashes on device.
const esc = __dirname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [
  new RegExp(`^${esc}/src/index\\.js$`),
  new RegExp(`^${esc}/src/db\\.js$`),
  new RegExp(`^${esc}/src/routes/.*`),
  new RegExp(`^${esc}/src/middleware/.*`),
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
