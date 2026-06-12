const jwt  = require('jsonwebtoken');
const { pool, cache } = require('../db');

// ── Auth middleware ────────────────────────────────────────────────────────────
// Optimised for latency:
//   1. JWT verify is a pure crypto op — no I/O, ~0.1 ms
//   2. User record is cached in memory for 60 s — eliminates a DB round-trip
//      on every authenticated request (the single biggest latency driver)
//   3. Cache is keyed by user id from the JWT payload
//
// JWT revocation via token_version:
//   The JWT payload contains a `tv` (token version) claim. The users table has
//   a `token_version` column. On every auth check we compare the claim against
//   the DB value (via cache). Increment `token_version` to instantly revoke all
//   tokens for a user — used by logout and admin ban routes.
//   See routes/auth.js makeToken() and POST /logout for details.
//
// Cache coherence: the 60 s TTL means a banned/deleted user keeps access for
// up to 60 s after deactivation — BUT logout and ban routes call
// cache.del(`auth:${userId}`) to force immediate eviction, reducing that
// window to ~0 s in practice.

const USER_CACHE_TTL = 60_000; // 60 seconds

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Not authenticated' });
  }

  // Step 1: verify JWT signature and expiry (pure crypto, no I/O)
  let payload;
  try {
    payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
  }

  // Step 2: check cache before hitting the DB
  const cacheKey = `auth:${payload.id}`;
  const cached   = await cache.get(cacheKey);
  if (cached) {
    // ── BUG FIX: Token revocation check (cache path) ──────────────────────────
    // Compare the `tv` (token version) claim from the JWT against the cached
    // token_version. Mismatch means this token was revoked after it was cached
    // (logout or admin ban). Evict the cache entry so the next request re-reads
    // the DB; reject this request immediately.
    const tokenVersion = payload.tv ?? 0;
    if ((cached.token_version ?? 0) !== tokenVersion) {
      await cache.del(cacheKey);
      return res.status(401).json({ ok: false, error: 'Token has been revoked. Please log in again.' });
    }
    req.user = cached;
    return next();
  }

  // Step 3: DB lookup (only on cache miss — once per 60 s per user)
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, phone, role, active, avatar_url, company, token_version FROM users WHERE id = $1 AND active = true',
      [payload.id]
    );
    if (!rows[0]) {
      return res.status(401).json({ ok: false, error: 'User not found or deactivated' });
    }

    // ── BUG FIX: Token revocation check (DB path) ─────────────────────────────
    // Compare the `tv` claim from the JWT against the freshly-loaded DB value.
    // Mismatch means this token was issued before the last logout/ban — reject it.
    const tokenVersion = payload.tv ?? 0;
    if ((rows[0].token_version ?? 0) !== tokenVersion) {
      return res.status(401).json({ ok: false, error: 'Token has been revoked. Please log in again.' });
    }

    await cache.set(cacheKey, rows[0], USER_CACHE_TTL);
    req.user = rows[0];
    next();
  } catch (e) {
    console.error('auth middleware DB error:', e.message);
    return res.status(503).json({ ok: false, error: 'Server temporarily unavailable. Please try again.' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ ok: false, error: 'Admin only' });
  }
  next();
}

module.exports = { auth, adminOnly };
