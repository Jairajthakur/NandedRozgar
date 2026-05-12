const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

function makeToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function safeUser(u) {
  const { password, ...rest } = u;
  return rest;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, company } = req.body;
    if (!name || !email || !password) {
      return res.json({ ok: false, error: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.json({ ok: false, error: 'Password must be at least 6 characters' });
    }
    const userRole = ['user', 'admin'].includes(role) ? role : 'user';
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role, phone, company)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, email.toLowerCase(), hash, userRole, phone || null, company || null]
    );
    const user = rows[0];
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
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.json({ ok: false, error: 'Email and password required' });
    }
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
