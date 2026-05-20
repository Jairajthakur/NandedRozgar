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
