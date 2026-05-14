{
  "expo": {
    "name": "NandedRozgar",
    "slug": "nanded",
    "version": "1.0.1",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": false,
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#111111"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.nandedrozgar.app",
      "infoPlist": {
        "NSCameraUsageDescription": "Allow NandedRozgar to use your camera to take property/vehicle photos.",
        "NSPhotoLibraryUsageDescription": "Allow NandedRozgar to access your photos for listing."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#111111"
      },
      "package": "com.nandedrozgar.app",
      "permissions": [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "POST_NOTIFICATIONS",
        "CAMERA",
        "READ_MEDIA_IMAGES",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ],
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      "expo-secure-store",
      [
        "expo-notifications",
        {
          "icon": "./assets/icon.png",
          "color": "#f97316",
          "sounds": []
        }
      ],
      [
        "expo-build-properties",
        {
          "android": {
            "usesCleartextTraffic": false,
            "enableProguardInReleaseBuilds": true,
            "minSdkVersion": 24
          }
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow NandedRozgar to access your photos.",
          "cameraPermission": "Allow NandedRozgar to use your camera."
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "da8f053f-5fd8-4bff-9004-7c4ecba82ff8"
      }
    }
  }
}
