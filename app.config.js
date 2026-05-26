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
    // Bug fix #19: slug and scheme were still 'nanded' (the old project name)
    // while every screen and the Play Store package are already branded 'CityPlus'.
    // slug determines the EAS project URL and the Play Store listing URL slug;
    // scheme determines the deep-link protocol (was nanded://, now cityplus://).
    // NOTE: after changing the slug you must run `eas project:init` once to
    // re-link the EAS project, and update the NATIVE_SCHEME constant in
    // src/routes/auth.js from 'nanded://google-auth' to 'cityplus://google-auth'.
    slug: 'cityplus',
    version: '4.4.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    // Play Store metadata — required for submission
    // Content rating is completed in Play Console, but category must be set here.
    category: 'BUSINESS',
    // Languages supported by the i18n system (en, mr, hi).
    // The Play Store uses this to surface the app to users in those locales.
    locales: {
      en: {
        name: 'CityPlus — Jobs, Rooms & More',
        description: 'Find local jobs, rent rooms, buy/sell items, and hire vehicles in Nanded. Free for job seekers.',
      },
      mr: {
        name: 'CityPlus — नोकऱ्या, खोल्या आणि बरेच काही',
        description: 'नांदेडमध्ये स्थानिक नोकऱ्या, खोल्या, वस्तू खरेदी-विक्री आणि वाहने — पूर्णपणे मोफत.',
      },
      hi: {
        name: 'CityPlus — नौकरियाँ, कमरे और बहुत कुछ',
        description: 'नांदेड में स्थानीय नौकरियाँ, कमरे, सामान खरीदें-बेचें और वाहन किराए पर लें। बिल्कुल मुफ्त।',
      },
    },
    splash: {
      image: './assets/splash.png',
      // 'cover' fills the screen edge-to-edge so the dark background never
      // bleeds around the icon on Android 12+ with the new splash-screen API.
      // 'contain' left visible dark bars around the icon on light-mode devices.
      resizeMode: 'cover',
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
      // Android API 24–30 uses the legacy SplashScreen API which does not
      // honour the top-level splash.resizeMode:'cover'. On those devices
      // 'cover' can clip the icon or leave artefacts. We set 'contain' here
      // so older devices show the icon centred with the solid background colour
      // while API 31+ (Android 12+) uses the adaptive-icon system and ignores
      // this field anyway.
      splash: {
        resizeMode: 'contain',
        backgroundColor: '#111111',
      },
      package: 'com.cityplus.app',
      // Bug fix: versionCode was hardcoded to 1, which blocks every Play Store
      // update after the first release (Store rejects equal or lower codes).
      // Now read from the ANDROID_VERSION_CODE env var set in your CI / EAS
      // build profile. Fall back to 1 only as a last resort and warn loudly so
      // the value is never silently forgotten before a release build.
      // In eas.json, add:  "env": { "ANDROID_VERSION_CODE": "2" }  (increment each release)
      versionCode: (() => {
        const code = parseInt(process.env.ANDROID_VERSION_CODE, 10);
        if (!isNaN(code) && code > 0) return code;
        console.warn(
          '[app.config.js] WARNING: ANDROID_VERSION_CODE env var is not set or invalid. ' +
          'Falling back to versionCode 1. Set ANDROID_VERSION_CODE in your EAS build ' +
          'profile or CI environment and increment it before every Play Store release.'
        );
        return 1;
      })(),
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
    scheme: 'cityplus', // was 'nanded' — see slug comment above
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
        // Read from EXPO_PROJECT_ID env var (set as a GitHub Actions secret).
        // Never hardcode this — the slug was renamed from 'nanded' to 'cityplus'
        // and the old hardcoded ID caused EAS slug-mismatch build failures.
        projectId: process.env.EXPO_PROJECT_ID || '',
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
