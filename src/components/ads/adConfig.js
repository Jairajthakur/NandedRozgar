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

// ── Google's official test IDs (safe to use anytime, always fill) ──────────
const TEST_NATIVE_AD_UNIT_ID = {
  android: 'ca-app-pub-3940256099942544/2247696110',
  ios: 'ca-app-pub-3940256099942544/3986624511',
};

const TEST_BANNER_AD_UNIT_ID = {
  android: 'ca-app-pub-3940256099942544/6300978111',
  ios: 'ca-app-pub-3940256099942544/2934735716',
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

// Ads are native-only — there is no AdMob SDK for the web build.
export const ADS_SUPPORTED = Platform.OS === 'android' || Platform.OS === 'ios';

// Show one ad card after every N real listings in a feed.
// RAISED 2026-07-05: was temporarily 3 for easier testing; pipeline is now
// confirmed working (test ads rendered successfully) and real ads are live,
// so this is back to a normal, less intrusive frequency.
export const NATIVE_AD_FREQUENCY = 8;

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
  ' BANNER_AD_UNIT_ID=' + BANNER_AD_UNIT_ID
);
