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

// ── Your real AdMob ad unit IDs (from the AdMob console) ───────────────────
const REAL_NATIVE_AD_UNIT_ID = {
  android: 'ca-app-pub-7042392981755855/7722283743',
  ios: '', // create an iOS native ad unit in AdMob and paste it here
};

const REAL_BANNER_AD_UNIT_ID = {
  android: '', // paste your Banner ad unit ID here once created
  ios: '',
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
  if (IS_DEV || !realId) return test[platformKey];
  return realId;
}

export const NATIVE_AD_UNIT_ID = pick(REAL_NATIVE_AD_UNIT_ID, TEST_NATIVE_AD_UNIT_ID);
export const BANNER_AD_UNIT_ID = pick(REAL_BANNER_AD_UNIT_ID, TEST_BANNER_AD_UNIT_ID);

// Ads are native-only — there is no AdMob SDK for the web build.
export const ADS_SUPPORTED = Platform.OS === 'android' || Platform.OS === 'ios';

// Show one ad card after every N real listings in a feed.
export const NATIVE_AD_FREQUENCY = 8;
