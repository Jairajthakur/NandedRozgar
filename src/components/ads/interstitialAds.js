/**
 * CityPlus — interstitialAds.js
 * Preloads and shows full-screen Interstitial ads. Two triggers feed into
 * the same manager so they share one cooldown/preload cycle instead of
 * fighting each other for the SDK's single loaded-ad slot:
 *
 *  1. Navigation-based — App.js counts screen changes and calls
 *     maybeShowOnNavigation() every INTERSTITIAL_NAV_FREQUENCY screens.
 *  2. Action-based — individual screens (e.g. after a successful post)
 *     call showInterstitial({ force: true }) directly at a natural
 *     breakpoint, ignoring the nav counter but still respecting the
 *     shared full-screen-ad cooldown in adGate.js so it never doubles up
 *     with an App Open ad shown moments earlier.
 */
import { INTERSTITIAL_AD_UNIT_ID, INTERSTITIAL_NAV_FREQUENCY, ADS_SUPPORTED } from './adConfig';
import { canShowFullscreenAd, markFullscreenAdShown } from './adGate';

let InterstitialAd, AdEventType;
try {
  ({ InterstitialAd, AdEventType } = require('react-native-google-mobile-ads'));
} catch (err) {
  console.log('[ads] interstitialAds: could not load react-native-google-mobile-ads', err);
}

let ad = null;
let isLoaded = false;
let navCounter = 0;

function load() {
  if (!ADS_SUPPORTED || !InterstitialAd) return;
  ad = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID);
  isLoaded = false;

  const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
    isLoaded = true;
  });
  const unsubError = ad.addAdEventListener(AdEventType.ERROR, err => {
    console.log('[ads] interstitial failed to load', err);
    isLoaded = false;
  });
  const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
    isLoaded = false;
    unsubLoaded(); unsubError(); unsubClosed();
    load(); // preload the next one immediately
  });

  ad.load();
}

/** Call once at app startup (from initAds.js) to warm the first ad. */
export function preloadInterstitial() {
  if (!ADS_SUPPORTED || !InterstitialAd) return;
  if (!ad) load();
}

/**
 * Show the interstitial right now if one is loaded and the shared
 * full-screen cooldown allows it. Returns true if the ad was shown.
 */
export function showInterstitial({ force = false } = {}) {
  if (!ADS_SUPPORTED || !InterstitialAd) return false;
  if (!force && !canShowFullscreenAd()) return false;
  if (!ad || !isLoaded) {
    preloadInterstitial();
    return false;
  }
  markFullscreenAdShown();
  ad.show();
  return true;
}

/**
 * Call from the NavigationContainer's onStateChange. Every
 * INTERSTITIAL_NAV_FREQUENCY-th screen change, attempts to show an
 * interstitial (silently no-ops if one isn't ready or the cooldown
 * hasn't elapsed — never blocks navigation either way).
 */
export function maybeShowOnNavigation() {
  if (!ADS_SUPPORTED) return;
  navCounter += 1;
  if (navCounter < INTERSTITIAL_NAV_FREQUENCY) return;
  navCounter = 0;
  showInterstitial();
}
