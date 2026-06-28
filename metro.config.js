const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname, {
  isCSSEnabled: true,
});

// Enable web support
config.resolver.platforms = ['web', 'android', 'ios', 'native'];

// FIX: @react-native-firebase and @react-native-google-signin are native-only
// packages. When Expo exports for web, they get bundled with their own internal
// Google OAuth client ID (947711...) which conflicts with ours.
// Stub them out on web so they are never included in the web bundle.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    const nativeOnlyPrefixes = [
      '@react-native-firebase/app',
      '@react-native-firebase/auth',
      '@react-native-google-signin/google-signin',
    ];
    if (nativeOnlyPrefixes.some(p => moduleName === p || moduleName.startsWith(p + '/'))) {
      // Return an empty stub so web bundle doesn't include native Firebase
      return {
        filePath: path.resolve(__dirname, 'src/stubs/native-only.js'),
        type: 'sourceFile',
      };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
