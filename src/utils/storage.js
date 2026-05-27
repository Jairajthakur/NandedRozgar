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
export async function isOnboarded() {
  try {
    const v = await getItem(ONBOARDING_KEY);
    return v === '1';
  } catch {
    return false;
  }
}
export async function markOnboarded() {
  await setItem(ONBOARDING_KEY, '1');
}
