const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

const MIN_PASSWORD_LEN = 8; // FIX #18 — raise minimum from 6 to 8

function makeToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' } // FIX #7 — reduce from 30d to 1d
  );
}

function safeUser(u) {
  const { password, ...rest } = u;
  return rest;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, company } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, error: 'Name, email and password are required' });
    }
    if (password.length < MIN_PASSWORD_LEN) {
      return res.status(400).json({ ok: false, error: `Password must be at least ${MIN_PASSWORD_LEN} characters` });
    }
    // FIX #10 — basic input length caps
    if (name.length > 100 || email.length > 200) {
      return res.status(400).json({ ok: false, error: 'Input too long' });
    }

    // FIX #3 — role is ALWAYS 'user'; never trust client-supplied role
    const userRole = 'user';

    const hash = await bcrypt.hash(password, 12); // FIX #18 — increase bcrypt rounds
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role, phone, company)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name.trim(), email.toLowerCase().trim(), hash, userRole, phone || null, company || null]
    );
    const user = rows[0];
    res.json({ ok: true, token: makeToken(user), user: safeUser(user) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ ok: false, error: 'Email already registered' });
    }
    console.error('register error:', err.message);
    res.status(500).json({ ok: false, error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password required' });
    }

    // FIX #1 — Removed hardcoded admin bypass entirely.
    // Admin logs in through the normal flow like any other user.

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const user = rows[0];

    // FIX #19 — Return a single generic message to prevent email enumeration
    const GENERIC_ERR = 'Invalid email or password';

    if (!user) {
      // Perform a dummy bcrypt compare to prevent timing-based enumeration
      await bcrypt.compare(password, '$2a$12$dummyhashfortimingprotectiononly000000000000000000000000');
      return res.status(401).json({ ok: false, error: GENERIC_ERR });
    }
    if (!user.active) {
      return res.status(403).json({ ok: false, error: 'Account is suspended' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ ok: false, error: GENERIC_ERR });
    }
    res.json({ ok: true, token: makeToken(user), user: safeUser(user) });
  } catch (err) {
    console.error('login error:', err.message);
    res.status(500).json({ ok: false, error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  res.json({ ok: true, user: safeUser(req.user) });
});

module.exports = router;
