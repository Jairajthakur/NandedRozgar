/**
 * CityPlus — appOpenAds.js
 * Preloads and shows the App Open ad on both triggers:
 *  1. Cold start — the first time the ad finishes loading after
 *     initAppOpenAds() is called from App.js on launch.
 *  2. Resume from background — AppState flips to 'active' after having
 *     been 'background'/'inactive' (a fresh JS load doesn't count as a
 *     resume, only an actual backgrounding does).
 *
 * Respects MIN_MS_BETWEEN_APP_OPEN_ADS so a user rapidly switching apps
 * doesn't get hit every single time, and shares the full-screen cooldown
 * in adGate.js so it never fires back-to-back with an Interstitial.
 */
import { AppState } from 'react-native';
import { APP_OPEN_AD_UNIT_ID, MIN_MS_BETWEEN_APP_OPEN_ADS, ADS_SUPPORTED } from './adConfig';
import { canShowFullscreenAd, markFullscreenAdShown } from './adGate';

let AppOpenAd, AdEventType;
try {
  ({ AppOpenAd, AdEventType } = require('react-native-google-mobile-ads'));
} catch (err) {
  console.log('[ads] appOpenAds: could not load react-native-google-mobile-ads', err);
}

let ad = null;
let isLoaded = false;
let isShowingAd = false;
let lastShownAt = 0;
let hasShownColdStartAd = false;
let hasGoneToBackground = false;
let started = false;

function load() {
  if (!ADS_SUPPORTED || !AppOpenAd) return;
  ad = AppOpenAd.createForAdRequest(APP_OPEN_AD_UNIT_ID);
  isLoaded = false;

  const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
    isLoaded = true;
    // First successful load after launch — this is the cold-start
    // opportunity. Show immediately if nothing else has claimed the
    // full-screen slot yet.
    if (!hasShownColdStartAd) {
      hasShownColdStartAd = true;
      showIfAllowed({ force: true });
    }
  });
  const unsubError = ad.addAdEventListener(AdEventType.ERROR, err => {
    console.log('[ads] app open ad failed to load', err);
    isLoaded = false;
  });
  const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
    isLoaded = false;
    isShowingAd = false;
    unsubLoaded(); unsubError(); unsubClosed();
    load(); // preload the next one for the next resume
  });

  ad.load();
}

function showIfAllowed({ force = false } = {}) {
  if (!ADS_SUPPORTED || !AppOpenAd || isShowingAd) return;
  if (!ad || !isLoaded) return;
  const now = Date.now();
  if (!force && now - lastShownAt < MIN_MS_BETWEEN_APP_OPEN_ADS) return;
  if (!canShowFullscreenAd()) return;
  isShowingAd = true;
  lastShownAt = now;
  markFullscreenAdShown();
  ad.show();
}

/** Call once at app startup (from App.js). Loads the first ad and sets
 * up the resume-from-background listener. Safe to call multiple times. */
export function initAppOpenAds() {
  if (started) return;
  started = true;
  if (!ADS_SUPPORTED || !AppOpenAd) return;

  load();

  AppState.addEventListener('change', nextState => {
    if (nextState === 'background' || nextState === 'inactive') {
      hasGoneToBackground = true;
      return;
    }
    if (nextState === 'active' && hasGoneToBackground) {
      showIfAllowed();
    }
  });
}
