import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from './constants';

let _token = null;
const TOKEN_KEY = 'nr_token';

// ── Secure Token Helpers ─────────────────────────────────────────────────────
// FIX: Wrapped all SecureStore calls in try/catch.
// On some Android devices (first install, no keystore), SecureStore throws.
// We gracefully fall back to in-memory token only so the app never crashes.

export async function loadToken() {
  try {
    _token = await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (e) {
    console.warn('SecureStore.getItemAsync failed:', e);
    _token = null;
  }
  return _token;
}

export async function saveToken(token) {
  _token = token;
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (e) {
    console.warn('SecureStore.setItemAsync failed — token saved in memory only:', e);
  }
}

export async function clearToken() {
  _token = null;
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (e) {
    console.warn('SecureStore.deleteItemAsync failed:', e);
  }
}

export function getToken() {
  return _token;
}

// ── HTTP Helper ──────────────────────────────────────────────────────────────
export async function http(method, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
  };
  if (_token) opts.headers['Authorization'] = 'Bearer ' + _token;
  if (body)   opts.body = JSON.stringify(body);

  try {
    const res  = await fetch(BASE_URL + path, opts);
    const data = await res.json();
    return data;
  } catch (e) {
    if (e.name === 'AbortError') {
      return { ok: false, error: 'Request timed out. Check your connection.' };
    }
    return { ok: false, error: 'Network error. Please check your connection.' };
  } finally {
    clearTimeout(timer);
  }
}

// ── Formatters ───────────────────────────────────────────────────────────────
export function timeAgo(ts) {
  try {
    const t = typeof ts === 'string' ? new Date(ts).getTime() : (ts || 0);
    const d = (Date.now() - t) / 1000;
    if (d < 60)    return 'just now';
    if (d < 3600)  return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
  } catch {
    return '';
  }
}

export function fmtDate(ts) {
  try {
    return new Date(ts).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function fmtCard(v) {
  return v.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
}
