/**
 * CityPlus — interstitialAds.web.js
 * Web build has no AdMob SDK (it's a native-only library), so this file
 * is picked automatically by Metro when bundling for web instead of
 * interstitialAds.js, keeping react-native-google-mobile-ads out of the
 * web bundle entirely.
 */
export function preloadInterstitial() {}

export function showInterstitial() {
  return false;
}

export function maybeShowOnNavigation() {}
