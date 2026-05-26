/**
 * Cross-platform storage utility.
 * Uses expo-secure-store on native (iOS/Android) and localStorage on web.
 */
import { Platform } from 'react-native';

async function setItem(key, value) {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(key, value); } catch {}
  } else {
    const SecureStore = await import('expo-secure-store');
    try { await SecureStore.setItemAsync(key, value); } catch {}
  }
}

async function getItem(key) {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch { return null; }
  } else {
    const SecureStore = await import('expo-secure-store');
    try { return await SecureStore.getItemAsync(key); } catch { return null; }
  }
}

async function removeItem(key) {
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(key); } catch {}
  } else {
    const SecureStore = await import('expo-secure-store');
    try { await SecureStore.deleteItemAsync(key); } catch {}
  }
}

export default { setItem, getItem, removeItem };

// ── Onboarding helpers ────────────────────────────────────────────────────────
// Extracted here so any file can import them without depending on the
// OnboardingScreen module. Avoids silent breakage if OnboardingScreen is
// renamed or its exports change.
const ONBOARDING_KEY = 'nr_onboarded_v1';
export async function isOnboarded() {
  try { const v = await getItem(ONBOARDING_KEY); return v === '1'; } catch { return false; }
}
export async function markOnboarded() { await setItem(ONBOARDING_KEY, '1'); }
