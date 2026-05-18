const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// ── Rate limiters ─────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { ok: false, error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { ok: false, error: 'Too many registrations from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function makeToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function safeUser(u) {
  const { password, ...rest } = u;
  return rest;
}

// POST /api/auth/register
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { name, email, password, role, phone, company, referralCode } = req.body;
    if (!name || !email || !password) {
      return res.json({ ok: false, error: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.json({ ok: false, error: 'Password must be at least 6 characters' });
    }
    // Only allow 'user' role on self-registration — admins are created via DB seed
    const userRole = 'user';
    const hash = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role, phone, company)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, email.toLowerCase(), hash, userRole, phone || null, company || null]
    );
    const user = rows[0];

    // Handle referral credit if a valid code was given
    if (referralCode && referralCode.startsWith('NR')) {
      const refUserId = parseInt(referralCode.slice(2), 10);
      if (!isNaN(refUserId) && refUserId !== user.id) {
        await pool.query(
          `UPDATE users SET referral_credits = COALESCE(referral_credits, 0) + 1 WHERE id = $1`,
          [refUserId]
        ).catch(() => {}); // non-fatal if referral_credits column not yet migrated
      }
    }

    res.json({ ok: true, token: makeToken(user), user: safeUser(user) });
  } catch (err) {
    if (err.code === '23505') {
      return res.json({ ok: false, error: 'Email already registered' });
    }
    console.error(err);
    res.json({ ok: false, error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.json({ ok: false, error: 'Email and password required' });
    }

    // ── Admin check via environment variables (NOT hardcoded) ─────────────────
    // Set ADMIN_EMAIL and ADMIN_PASSWORD in your Railway environment variables.
    const ADMIN_EMAIL    = process.env.ADMIN_EMAIL;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (
      ADMIN_EMAIL && ADMIN_PASSWORD &&
      email.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
      password === ADMIN_PASSWORD
    ) {
      const { rows: existing } = await pool.query(
        'SELECT * FROM users WHERE email = $1', [ADMIN_EMAIL.toLowerCase()]
      );
      let adminUser = existing[0];
      if (!adminUser) {
        const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
        const { rows } = await pool.query(
          `INSERT INTO users (name, email, password, role)
           VALUES ('Admin', $1, $2, 'admin') RETURNING *`,
          [ADMIN_EMAIL.toLowerCase(), hash]
        );
        adminUser = rows[0];
      } else if (adminUser.role !== 'admin') {
        await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', adminUser.id]);
        adminUser.role = 'admin';
      }
      return res.json({ ok: true, token: makeToken(adminUser), user: safeUser(adminUser) });
    }
    // ──────────────────────────────────────────────────────────────────────────

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = rows[0];
    if (!user) return res.json({ ok: false, error: 'No account found with this email' });
    if (!user.active) return res.json({ ok: false, error: 'Account is banned' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ ok: false, error: 'Incorrect password' });
    res.json({ ok: true, token: makeToken(user), user: safeUser(user) });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  res.json({ ok: true, user: safeUser(req.user) });
});

module.exports = router;
