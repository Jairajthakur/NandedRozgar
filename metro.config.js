const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname, {
  isCSSEnabled: true,
});

// Enable web support
config.resolver.platforms = ['web', 'android', 'ios', 'native'];

module.exports = config;
