/**
 * CityPlus — rewardedAds.web.js
 * Web build has no AdMob SDK (it's a native-only library), so this file
 * is picked automatically by Metro when bundling for web instead of
 * rewardedAds.js, keeping react-native-google-mobile-ads out of the web
 * bundle entirely.
 */
export function preloadRewardedAds() {}

export function isRewardedReady() {
  return false;
}

export function showRewarded() {
  return Promise.resolve(false);
}

export function isRewardedInterstitialReady() {
  return false;
}

export function showRewardedInterstitial() {
  return Promise.resolve(false);
}
