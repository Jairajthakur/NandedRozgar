export default ({ config }) => ({
  ...config,
  name: "CityPlus",
  slug: "cityplus",
  owner: "jai234",         // Required for auth.expo.io and EAS
  version: "4.4.0",
  scheme: "cityplus",                   // Required for deep links & payment callbacks
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",

  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },

  android: {
    package: "com.cityplus.app",
    versionCode: parseInt(process.env.ANDROID_VERSION_CODE) || 1,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    googleServicesFile: "./google-services.json",
    permissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
    ],
    // Handles payment return deep links (Cashfree / Razorpay callbacks)
    intentFilters: [
      // ── Payment callback deep link ──────────────────────────────────────
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "https",
            host: "thecityplus.in",
            pathPrefix: "/payment-callback",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },

      // ── Android App Links — enables Google to index app content ─────────
      // Google Search can show "Open in CityPlus" for thecityplus.in URLs
      // Requires /.well-known/assetlinks.json on your server (handled by seo.js)
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          { scheme: "https", host: "thecityplus.in", pathPrefix: "/jobs" },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          { scheme: "https", host: "thecityplus.in", pathPrefix: "/rooms" },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          { scheme: "https", host: "thecityplus.in", pathPrefix: "/vehicles" },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          { scheme: "https", host: "thecityplus.in", pathPrefix: "/buy-sell" },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          { scheme: "https", host: "www.thecityplus.in" },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },

      // ── cityplus:// custom scheme for in-app deep links ──────────────────
      {
        action: "VIEW",
        data: [{ scheme: "cityplus" }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },

  web: {
    favicon: "./assets/favicon.png",
  },

  plugins: [
    "expo-font",
    "expo-secure-store",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Allow CityPlus to use your location to show nearby jobs, rooms and listings.",
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/icon.png",
        color: "#f97316",
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          minSdkVersion: 21,
        },
      },
    ],
    // @react-native-firebase/app is included only when google-services.json exists
    // This prevents expo config from failing during CI before the file is written
    ...(require('fs').existsSync('./google-services.json') ? ["@react-native-firebase/app"] : []),
    [
      "@react-native-google-signin/google-signin",
      {
        iosUrlScheme: "com.googleusercontent.apps.1012993473745-iiur989ghkd2pjsu9uuoc6ckqupkevoc",
      }
    ],
  ],

  extra: {
    eas: {
      projectId: process.env.EXPO_PROJECT_ID,
    },
    // Embed at build time so constants.js can read these as fallback
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://thecityplus.in",
    razorpayKeyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || "",
  },
});
