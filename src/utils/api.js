import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from './constants';

let _token = null;

export async function loadToken() {
  _token = await SecureStore.getItemAsync('nr_token');
  return _token;
}

export async function saveToken(token) {
  _token = token;
  await SecureStore.setItemAsync('nr_token', token);
}

export async function clearToken() {
  _token = null;
  await SecureStore.deleteItemAsync('nr_token');
}

export function getToken() {
  return _token;
}

export async function http(method, path, body) {
  const controller = new AbortController();
  // 15-second timeout — prevents app from hanging on slow / cold-start servers
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

export function timeAgo(ts) {
  const t = typeof ts === 'string' ? new Date(ts).getTime() : ts;
  const d = (Date.now() - t) / 1000;
  if (d < 3600)  return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function fmtCard(v) {
  return v.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
}
