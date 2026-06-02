import storage from './storage';
import { BASE_URL } from './constants';

const TOKEN_KEY = 'cityplus_token';

export async function saveToken(token) {
  await storage.setItem(TOKEN_KEY, token);
}

export async function loadToken() {
  return storage.getItem(TOKEN_KEY);
}

export async function clearToken() {
  await storage.removeItem(TOKEN_KEY);
}

export async function getToken() {
  return loadToken();
}

// ── http — fetch with automatic retry on network failure ─────────────────────
// On patchy connections (Nanded/Latur 2G/3G), a single transient failure would
// previously show a blank screen with no recovery path. Now:
//   - GET requests retry up to 3 times with exponential back-off (1s, 2s, 4s)
//   - POST/PATCH/DELETE do NOT retry (not idempotent — avoid double-submit)
//   - A timeout of 15 s per attempt prevents hanging indefinitely
//   - status: 0 is returned on network error so callers can distinguish from auth errors
export async function http(method, path, body, { retries = method === 'GET' ? 3 : 1, timeoutMs = 15_000 } = {}) {
  const token = await loadToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      // Safely parse JSON — server may return HTML/text on cold start or errors
      const text = await res.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch {
        console.warn('Non-JSON response from server:', text.slice(0, 200));
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        return {
          ok: false,
          error: res.status === 503 || res.status === 502
            ? 'Server is starting up, please try again in a moment.'
            : 'Server error. Please try again.',
        };
      }

      return { ...data, ok: data.ok ?? res.ok, status: res.status };
    } catch (e) {
      const isTimeout = e.name === 'AbortError';
      const isNetwork = e.message?.toLowerCase().includes('network') || e.message?.toLowerCase().includes('fetch');
      console.warn(`http attempt ${attempt}/${retries} failed:`, e.message);

      if (attempt < retries && (isTimeout || isNetwork)) {
        // Exponential back-off: 1s, 2s, 4s
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
        continue;
      }

      return {
        ok: false,
        status: 0,
        error: isTimeout
          ? 'Request timed out. Check your internet connection and try again.'
          : 'Unable to connect. Check your internet connection.',
      };
    }
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
