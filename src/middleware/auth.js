const jwt  = require('jsonwebtoken');
const { pool, cache } = require('../db');

// ── Auth middleware ────────────────────────────────────────────────────────────
// Optimised for latency:
//   1. JWT verify is a pure crypto op — no I/O, ~0.1 ms
//   2. User record is cached in memory for 60 s — eliminates a DB round-trip
//      on every authenticated request (the single biggest latency driver)
//   3. Cache is keyed by user id from the JWT payload
//
// Cache coherence: the 60 s TTL means a banned/deleted user keeps access for
// up to 60 s after deactivation — acceptable trade-off for a jobs app.
// Call cache.del(`auth:${userId}`) from admin routes to force immediate eviction.

const USER_CACHE_TTL = 60_000; // 60 seconds

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Not authenticated' });
  }

  // Step 1: verify JWT (pure crypto, no I/O)
  let payload;
  try {
    payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
  }

  // Step 2: check memory cache before hitting the DB
  const cacheKey = `auth:${payload.id}`;
  const cached   = cache.get(cacheKey);
  if (cached) {
    req.user = cached;
    return next();
  }

  // Step 3: DB lookup (only on cache miss — once per 60 s per user)
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, phone, role, active, avatar_url, company FROM users WHERE id = $1 AND active = true',
      [payload.id]
    );
    if (!rows[0]) {
      return res.status(401).json({ ok: false, error: 'User not found or deactivated' });
    }
    cache.set(cacheKey, rows[0], USER_CACHE_TTL);
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
