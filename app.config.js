// app.config.js — dynamic config so native-only plugins are excluded on web builds
// Railway runs `expo export --platform web` and doesn't have native packages installed,
// so we skip native-only plugins (google-signin, firebase) when building for web.

const IS_WEB = process.env.EXPO_PLATFORM === 'web' || process.env.RAILWAY_ENVIRONMENT !== undefined;

// Plugins that only work in native (Android/iOS) builds
const nativePlugins = IS_WEB ? [] : [
  '@react-native-google-signin/google-signin',
  '@react-native-firebase/app',
  '@react-native-firebase/auth',
];

export default {
  expo: {
    name: 'CityPlus',
    slug: 'nanded',
    version: '4.4.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#111111',
    },
    assetBundlePatterns: ['**/*'],
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
      output: 'single',
      name: 'CityPlus',
      shortName: 'CityPlus',
      description: 'Local Jobs · Local Life · Nanded',
      themeColor: '#f97316',
      backgroundColor: '#111111',
      inject: [
        // Google Sign-In (GSI) script for web Google OAuth
        '<script src="https://accounts.google.com/gsi/client" async defer></script>',
      ],
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.cityplus.app',
      infoPlist: {
        NSLocationWhenInUseUsageDescription: 'CityPlus uses your location to automatically set your district so you see nearby jobs, rooms and listings.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#111111',
      },
      package: 'com.cityplus.app',
      versionCode: 1,
      permissions: [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.RECEIVE_BOOT_COMPLETED',
        'android.permission.VIBRATE',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.CAMERA',
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
      ],
      googleServicesFile: './google-services.json',
    },
    scheme: 'nanded',
    plugins: [
      ...nativePlugins,
      'expo-secure-store',
      'expo-location',
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#f97316',
          sounds: [],
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            usesCleartextTraffic: false,
            enableProguardInReleaseBuilds: true,
            minSdkVersion: 24,
            targetSdkVersion: 35,
            compileSdkVersion: 35,
          },
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow CityPlus to access your photos.',
          cameraPermission: 'Allow CityPlus to use your camera.',
        },
      ],
    ],
    extra: {
      eas: {
        projectId: 'da8f053f-5fd8-4bff-9004-7c4ecba82ff8',
      },
      googleWebClientId:    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID  || '',
      firebaseApiKey:       process.env.EXPO_PUBLIC_FIREBASE_API_KEY       || '',
      firebaseAuthDomain:   process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN   || '',
      firebaseProjectId:    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID    || '',
      firebaseAppId:        process.env.EXPO_PUBLIC_FIREBASE_APP_ID        || '',
      apiUrl:               process.env.EXPO_PUBLIC_API_URL                || 'https://localloops-production.up.railway.app',
      razorpayKeyId:        process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID        || '',
    },
  },
};
