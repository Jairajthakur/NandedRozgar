/**
 * Cross-platform storage utility.
 * - Web: uses localStorage (synchronous, always available in browsers)
 * - Android/iOS: uses AsyncStorage (persisted to app's private data directory)
 *
 * FIX: @react-native-async-storage/AsyncStorage does not work on web —
 * it relies on native modules unavailable in browsers. Previously this caused
 * saveToken() to silently fail on web, so the JWT was never persisted after
 * Google login, leaving the app stuck on "Connecting..." indefinitely.
 */
import { Platform } from 'react-native';

// ── Web storage (localStorage) ────────────────────────────────────────────────
const webStorage = {
  async setItem(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { console.warn('[storage] localStorage.setItem failed:', e.message); }
  },
  async getItem(key) {
    try { return localStorage.getItem(key); } catch (e) { console.warn('[storage] localStorage.getItem failed:', e.message); return null; }
  },
  async removeItem(key) {
    try { localStorage.removeItem(key); } catch (e) { console.warn('[storage] localStorage.removeItem failed:', e.message); }
  },
};

// ── Native storage (AsyncStorage) ─────────────────────────────────────────────
let _AsyncStorage = null;
function getNative() {
  if (!_AsyncStorage) {
    _AsyncStorage = require('@react-native-async-storage/async-storage').default;
  }
  return _AsyncStorage;
}

const nativeStorage = {
  async setItem(key, value) {
    try { await getNative().setItem(key, value); } catch (e) { console.warn('[storage] setItem failed:', e.message); }
  },
  async getItem(key) {
    try { return await getNative().getItem(key); } catch (e) { console.warn('[storage] getItem failed:', e.message); return null; }
  },
  async removeItem(key) {
    try { await getNative().removeItem(key); } catch (e) { console.warn('[storage] removeItem failed:', e.message); }
  },
};

const storage = Platform.OS === 'web' ? webStorage : nativeStorage;

export default storage;

// ── Onboarding helpers ────────────────────────────────────────────────────────
const ONBOARDING_KEY = 'nr_onboarded_v1';

let _onboardedCache = null;

export async function isOnboarded() {
  try {
    const v = await storage.getItem(ONBOARDING_KEY);
    if (v === '1') { _onboardedCache = true; return true; }
    if (_onboardedCache) return true;
    return false;
  } catch {
    // A read failure must never be mistaken for "already onboarded" — that
    // would silently skip onboarding for a genuinely new install. Only trust
    // a cache we've positively set to true; otherwise assume not onboarded.
    return _onboardedCache === true;
  }
}

export async function markOnboarded() {
  _onboardedCache = true;
  await storage.setItem(ONBOARDING_KEY, '1');
}

// ── Instagram follow banner (shown once ever, after first login) ─────────────
const INSTAGRAM_BANNER_KEY = 'nr_instagram_banner_shown_v1';

let _instagramBannerCache = null;

export async function hasSeenInstagramBanner() {
  try {
    const v = await storage.getItem(INSTAGRAM_BANNER_KEY);
    if (v === '1') { _instagramBannerCache = true; return true; }
    if (_instagramBannerCache) return true;
    return false;
  } catch {
    // Same reasoning as isOnboarded(): a read failure must never be treated
    // as "already seen", or the banner would silently never show.
    return _instagramBannerCache === true;
  }
}

export async function markInstagramBannerSeen() {
  _instagramBannerCache = true;
  await storage.setItem(INSTAGRAM_BANNER_KEY, '1');
}
