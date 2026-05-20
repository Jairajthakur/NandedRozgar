const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// GET /api/alerts — current user's alerts
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM job_alerts WHERE user_id=$1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ ok: true, alerts: rows });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load alerts' });
  }
});

// POST /api/alerts — create or update alert for a category
router.post('/', auth, async (req, res) => {
  try {
    const { category, keywords, pushToken } = req.body;
    if (!category) return res.json({ ok: false, error: 'Category is required' });

    const { rows } = await pool.query(`
      INSERT INTO job_alerts (user_id, category, keywords, push_token, active)
      VALUES ($1, $2, $3, $4, TRUE)
      ON CONFLICT (user_id, category)
      DO UPDATE SET keywords=$3, push_token=$4, active=TRUE
      RETURNING *
    `, [req.user.id, category, keywords?.trim() || null, pushToken || null]);

    res.json({ ok: true, alert: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to save alert' });
  }
});

// PATCH /api/alerts/:id/toggle — enable/disable an alert
router.patch('/:id/toggle', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE job_alerts SET active = NOT active
       WHERE id=$1 AND user_id=$2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.json({ ok: false, error: 'Alert not found' });
    res.json({ ok: true, alert: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to toggle alert' });
  }
});

// DELETE /api/alerts/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM job_alerts WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to delete alert' });
  }
});

module.exports = router;
