const jwt = require('jsonwebtoken');
const { pool } = require('../db');

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Not authenticated' });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    // Always fetch fresh user record so bans and role changes take effect immediately.
    // FIX #7 — this also ensures a revoked/banned user's token is blocked mid-session.
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND active = true',
      [payload.id]
    );
    if (!rows[0]) return res.status(401).json({ ok: false, error: 'Not authenticated' });
    req.user = rows[0];
    next();
  } catch {
    return res.status(401).json({ ok: false, error: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }
  next();
}

module.exports = { auth, adminOnly };
