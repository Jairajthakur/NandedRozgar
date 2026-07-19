/**
 * CityPlus — adConfig.js
 * Central place for all AdMob unit IDs.
 *
 * IMPORTANT: In __DEV__ (and on any non-standalone build) we always use
 * Google's official TEST ad unit IDs. Never test with real ad unit IDs —
 * clicking your own live ads is a policy violation that can get your
 * AdMob account suspended. Test IDs always return a fill so you can verify
 * layout/behaviour safely.
 *
 * Fill in the REAL_* values below with the IDs from your AdMob console.
 * The App ID itself goes in app.json (config plugin), not here.
 */
import { Platform } from 'react-native';

const IS_DEV = __DEV__;

// ── Manual override ─────────────────────────────────────────────────────
// __DEV__ is only true in a local Metro dev session — your EAS "preview"
// and "production" profiles both set NODE_ENV=production, so __DEV__ is
// FALSE in those builds too, even for internal testing APKs.
//
// While your app is still in closed testing / not yet verified with AdMob
// (app-ads.txt + app readiness review), real ad units will likely show
// zero fill and there's no upside to risking real ad requests from test
// devices. Keep this `true` until the app is publicly available (open
// testing or production) and AdMob verification has cleared — then flip
// it to `false` so real builds serve real ads.
//
// FLIPPED 2026-07-05: pipeline confirmed working end-to-end (test ads
// rendering correctly on a real device build), switching to live ad units.
// If real ads show zero fill, that means AdMob verification (app-ads.txt +
// app readiness review) hasn't cleared yet — check the AdMob console for
// unit/account status before assuming it's a code problem again.
const FORCE_TEST_ADS = false;

// ── Your real AdMob ad unit IDs (from the AdMob console) ───────────────────
const REAL_NATIVE_AD_UNIT_ID = {
  android: 'ca-app-pub-7042392981755855/7722283743',
  ios: '', // create an iOS native ad unit in AdMob and paste it here
};

const REAL_BANNER_AD_UNIT_ID = {
  android: 'ca-app-pub-7042392981755855/4316144367',
  ios: '', // create an iOS banner ad unit in AdMob and paste it here
};

const REAL_INTERSTITIAL_AD_UNIT_ID = {
  android: 'ca-app-pub-7042392981755855/9131714126',
  ios: '', // create an iOS interstitial ad unit in AdMob and paste it here
};

const REAL_REWARDED_AD_UNIT_ID = {
  android: 'ca-app-pub-7042392981755855/7782853298',
  ios: '', // create an iOS rewarded ad unit in AdMob and paste it here
};

const REAL_REWARDED_INTERSTITIAL_AD_UNIT_ID = {
  android: 'ca-app-pub-7042392981755855/5914523843',
  ios: '', // create an iOS rewarded interstitial ad unit in AdMob and paste it here
};

const REAL_APP_OPEN_AD_UNIT_ID = {
  android: 'ca-app-pub-7042392981755855/7227605514',
  ios: '', // create an iOS app open ad unit in AdMob and paste it here
};

// ── Google's official test IDs (safe to use anytime, always fill) ──────────
const TEST_NATIVE_AD_UNIT_ID = {
  android: 'ca-app-pub-3940256099942544/2247696110',
  ios: 'ca-app-pub-3940256099942544/3986624511',
};

const TEST_BANNER_AD_UNIT_ID = {
  android: 'ca-app-pub-3940256099942544/6300978111',
  ios: 'ca-app-pub-3940256099942544/2934735716',
};

// Google's official test IDs for the other formats — see
// https://developers.google.com/admob/android/test-ads and the iOS
// equivalent. Always fill, safe to request anytime.
const TEST_INTERSTITIAL_AD_UNIT_ID = {
  android: 'ca-app-pub-3940256099942544/1033173712',
  ios: 'ca-app-pub-3940256099942544/4411468910',
};

const TEST_REWARDED_AD_UNIT_ID = {
  android: 'ca-app-pub-3940256099942544/5224354917',
  ios: 'ca-app-pub-3940256099942544/1712485313',
};

const TEST_REWARDED_INTERSTITIAL_AD_UNIT_ID = {
  android: 'ca-app-pub-3940256099942544/5354046379',
  ios: 'ca-app-pub-3940256099942544/6978759866',
};

const TEST_APP_OPEN_AD_UNIT_ID = {
  android: 'ca-app-pub-3940256099942544/9257395921',
  ios: 'ca-app-pub-3940256099942544/5575463023',
};

function pick(real, test) {
  const platformKey = Platform.OS === 'ios' ? 'ios' : 'android';
  const realId = real[platformKey];
  // Fall back to test ID automatically if a real ID hasn't been filled in yet,
  // so nothing crashes while you're still setting up new ad units.
  if (IS_DEV || FORCE_TEST_ADS || !realId) return test[platformKey];
  return realId;
}

export const NATIVE_AD_UNIT_ID = pick(REAL_NATIVE_AD_UNIT_ID, TEST_NATIVE_AD_UNIT_ID);
export const BANNER_AD_UNIT_ID = pick(REAL_BANNER_AD_UNIT_ID, TEST_BANNER_AD_UNIT_ID);
export const INTERSTITIAL_AD_UNIT_ID = pick(REAL_INTERSTITIAL_AD_UNIT_ID, TEST_INTERSTITIAL_AD_UNIT_ID);
export const REWARDED_AD_UNIT_ID = pick(REAL_REWARDED_AD_UNIT_ID, TEST_REWARDED_AD_UNIT_ID);
export const REWARDED_INTERSTITIAL_AD_UNIT_ID = pick(REAL_REWARDED_INTERSTITIAL_AD_UNIT_ID, TEST_REWARDED_INTERSTITIAL_AD_UNIT_ID);
export const APP_OPEN_AD_UNIT_ID = pick(REAL_APP_OPEN_AD_UNIT_ID, TEST_APP_OPEN_AD_UNIT_ID);

// Ads are native-only — there is no AdMob SDK for the web build.
export const ADS_SUPPORTED = Platform.OS === 'android' || Platform.OS === 'ios';

// Show one ad card after every N real listings in a feed.
// TUNED 2026-07-08: every 3 listings, per explicit request for more
// impressions. This is noticeably more frequent than typical marketplace
// apps (most stay in the 5-8 range) — worth watching session length /
// retention after this ships, since ad density is one of the more common
// silent causes of drop-off. If retention dips, 5 is a reasonable middle
// ground before going back to 6-8.
export const NATIVE_AD_FREQUENCY = 3;

// Show a full-screen interstitial after every N screen navigations, in
// addition to the action-triggered spots (after posting an ad, etc).
export const INTERSTITIAL_NAV_FREQUENCY = 4;

// Don't show two full-screen ads (interstitial / app open) back-to-back —
// shared across the interstitial and app-open managers via adGate.js.
export const MIN_MS_BETWEEN_FULLSCREEN_ADS = 45_000;

// Minimum time between App Open ad impressions, so a user backgrounding
// and resuming the app repeatedly in a short span doesn't get hit with an
// ad every single time.
export const MIN_MS_BETWEEN_APP_OPEN_ADS = 4 * 60 * 60 * 1000; // 4 hours

// ── Startup diagnostics ─────────────────────────────────────────────────
// Logs once at import time so `adb logcat -s ReactNativeJS` (or the EAS
// build log) tells you immediately whether the JS thinks ads should be
// possible at all, before any ad request is even made. If ADS_SUPPORTED
// is false here on what you believe is a native build, Platform.OS is
// not what you think it is (e.g. running inside a webview) — check that
// first, it explains "no ads and no debug box" more often than anything
// ad-request-related.
console.log(
  '[ads] adConfig loaded — Platform.OS=' + Platform.OS +
  ' ADS_SUPPORTED=' + ADS_SUPPORTED +
  ' IS_DEV=' + IS_DEV +
  ' FORCE_TEST_ADS=' + FORCE_TEST_ADS +
  ' NATIVE_AD_UNIT_ID=' + NATIVE_AD_UNIT_ID +
  ' BANNER_AD_UNIT_ID=' + BANNER_AD_UNIT_ID +
  ' INTERSTITIAL_AD_UNIT_ID=' + INTERSTITIAL_AD_UNIT_ID +
  ' REWARDED_AD_UNIT_ID=' + REWARDED_AD_UNIT_ID +
  ' REWARDED_INTERSTITIAL_AD_UNIT_ID=' + REWARDED_INTERSTITIAL_AD_UNIT_ID +
  ' APP_OPEN_AD_UNIT_ID=' + APP_OPEN_AD_UNIT_ID
);
