import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from './constants';

const TOKEN_KEY = 'nanded_token';

export async function saveToken(token) {
  try { await SecureStore.setItemAsync(TOKEN_KEY, token); } catch {}
}

export async function loadToken() {
  try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
}

export async function clearToken() {
  try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch {}
}

export async function getToken() {
  return loadToken();
}

export async function http(method, path, body) {
  try {
    const token = await loadToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    return { ...data, ok: res.ok };
  } catch (e) {
    console.warn('http error:', e.message);
    return { ok: false, error: e.message };
  }
}

export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60)  return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)  return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)    return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7)      return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5)     return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12)   return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
