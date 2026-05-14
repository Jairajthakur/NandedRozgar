import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from './constants';

let _token = null;
const KEY = 'nr_token';

export async function loadToken() {
  try {
    _token = await SecureStore.getItemAsync(KEY);
  } catch (e) {
    console.warn('SecureStore read failed:', e.message);
    _token = null;
  }
  return _token;
}

export async function saveToken(t) {
  _token = t;
  try { await SecureStore.setItemAsync(KEY, t); }
  catch (e) { console.warn('SecureStore write failed:', e.message); }
}

export async function clearToken() {
  _token = null;
  try { await SecureStore.deleteItemAsync(KEY); }
  catch (e) { console.warn('SecureStore clear failed:', e.message); }
}

export function getToken() { return _token; }

export async function http(method, path, body) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    signal: ctrl.signal,
  };
  if (_token) opts.headers['Authorization'] = 'Bearer ' + _token;
  if (body)   opts.body = JSON.stringify(body);

  try {
    const res  = await fetch(BASE_URL + path, opts);
    const data = await res.json();
    return data;
  } catch (e) {
    if (e.name === 'AbortError')
      return { ok: false, error: 'Request timed out. Check your connection.' };
    return { ok: false, error: 'Network error. Please check your connection.' };
  } finally {
    clearTimeout(timer);
  }
}

export function timeAgo(ts) {
  try {
    const t = typeof ts === 'string' ? new Date(ts).getTime() : (ts || 0);
    const d = (Date.now() - t) / 1000;
    if (d < 60)    return 'just now';
    if (d < 3600)  return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
  } catch { return ''; }
}

export function fmtDate(ts) {
  try {
    return new Date(ts).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return ''; }
}

export function fmtCard(v) {
  return v.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
}
