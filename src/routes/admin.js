const router = require('express').Router();
const { pool } = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

// All admin routes require auth + admin role
router.use(auth, adminOnly);

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, phone, company, role, premium, active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ ok: true, users: rows });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load users' });
  }
});

// PATCH /api/admin/jobs/:id/status
router.patch('/jobs/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.json({ ok: false, error: 'Invalid status' });
    }
    await pool.query('UPDATE jobs SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to update job status' });
  }
});

// PATCH /api/admin/users/:id/toggle — ban / unban
router.patch('/users/:id/toggle', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE users SET active = NOT active WHERE id = $1 RETURNING id, active, name',
      [req.params.id]
    );
    res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to toggle user' });
  }
});

// PATCH /api/admin/users/:id/grant-pro
router.patch('/users/:id/grant-pro', async (req, res) => {
  try {
    await pool.query('UPDATE users SET premium = true WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to grant PRO' });
  }
});

module.exports = router;
