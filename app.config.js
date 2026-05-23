// app.config.js — replaces app.json so EXPO_PUBLIC_* env vars are
// injected at build time (EAS Secrets) and at dev time (.env file).
// Delete or rename app.json after adding this file — Expo will use
// app.config.js first when both exist, but keeping both can cause confusion.

export default {
  expo: {
    name: 'CityPlus',
    slug: 'nanded',
    version: '1.0.0',
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
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.cityplus.app',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#111111',
      },
      package: 'com.cityplus.app',
      permissions: [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.RECEIVE_BOOT_COMPLETED',
        'android.permission.VIBRATE',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.CAMERA',
        'android.permission.READ_MEDIA_IMAGES',
      ],
      googleServicesFile: './google-services.json',
    },
    scheme: 'nanded',
    plugins: [
      '@react-native-firebase/app',
      '@react-native-firebase/auth',
      'expo-secure-store',
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
      // ── Public env vars — read from EAS Secrets / .env at build time ────────
      // Access anywhere in the app via: process.env.EXPO_PUBLIC_*
      // These are baked into the JS bundle — never put secrets here.
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
