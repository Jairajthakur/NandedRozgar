export default ({ config }) => ({
  ...config,
  name: "CityPlus",
  slug: "cityplus",
  version: "4.4.0",
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
      "USE_BIOMETRIC",
      "USE_FINGERPRINT",
    ],
  },

  web: {
    favicon: "./assets/favicon.png",
  },

  plugins: [
    "expo-font",
    "expo-secure-store",
    "expo-local-authentication",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Allow NandedRozgar to use your location.",
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/icon.png",
        color: "#ffffff",
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          minSdkVersion: 24,
        },
      },
    ],
    "@react-native-firebase/app",
    "@react-native-google-signin/google-signin",
  ],

  extra: {
    eas: {
      projectId: process.env.EXPO_PROJECT_ID,
    },
  },
});
