const jwt = require('jsonwebtoken');
const { pool } = require('../db');

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Not authenticated' });
  }

  // Step 1: Verify the JWT — this is a pure crypto check, no DB needed
  let payload;
  try {
    payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch (e) {
    // Token is genuinely invalid or expired — correct to return 401
    return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
  }

  // Step 2: Look up the user in DB — DB errors are NOT auth failures
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, phone, role, active, avatar_url, company FROM users WHERE id = $1 AND active = true',
      [payload.id]
    );
    if (!rows[0]) {
      // User deleted or deactivated — correct to return 401
      return res.status(401).json({ ok: false, error: 'User not found or deactivated' });
    }
    req.user = rows[0];
    next();
  } catch (e) {
    // DB is down or timed out — log full error details for Railway logs debugging
    console.error('auth middleware DB error:', e.message, '| code:', e.code, '| detail:', e.detail);
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
