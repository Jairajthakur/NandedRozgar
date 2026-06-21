/**
 * Cross-platform storage utility.
 * Uses AsyncStorage as the primary store (reliable on all Android/iOS versions).
 * Falls back gracefully if import fails.
 *
 * FIX: Previously used expo-secure-store which can silently fail on some
 * Android devices (especially older ones or those with disabled keystore),
 * causing loadToken() to return null on every app open → user gets logged out.
 * AsyncStorage is persisted to the app's private data directory and survives
 * app restarts reliably.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function setItem(key, value) {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.warn('[storage] setItem failed:', e.message);
  }
}

async function getItem(key) {
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    console.warn('[storage] getItem failed:', e.message);
    return null;
  }
}

async function removeItem(key) {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.warn('[storage] removeItem failed:', e.message);
  }
}

export default { setItem, getItem, removeItem };

// ── Onboarding helpers ────────────────────────────────────────────────────────
// Show onboarding only once — on first install.
// markOnboarded() is called when user taps "Get Started" or "Skip".
// isOnboarded() is checked in App.js before rendering any screen.
const ONBOARDING_KEY = 'nr_onboarded_v1';

// In-memory cache so that once we've confirmed "onboarded" in this process
// lifetime, a later transient AsyncStorage read failure (e.g. right after a
// cold start with no network, where some native modules haven't finished
// initializing yet) can never flip the user back to the onboarding screen.
let _onboardedCache = null;

export async function isOnboarded() {
  try {
    const v = await getItem(ONBOARDING_KEY);
    if (v === '1') {
      _onboardedCache = true;
      return true;
    }
    if (_onboardedCache) return true;
    return false;
  } catch {
    // FIX: previously defaulted to `false` ("not onboarded") on any error,
    // which meant a flaky/offline storage read on app open would
    // incorrectly show the onboarding screen to a returning user.
    // Default to the safer assumption: if we don't know, assume the user
    // has already been onboarded (or fall back to the in-memory cache).
    return _onboardedCache ?? true;
  }
}

export async function markOnboarded() {
  _onboardedCache = true;
  await setItem(ONBOARDING_KEY, '1');
}
