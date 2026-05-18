const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// GET /api/ratings/employer/:userId — all ratings for an employer
router.get('/employer/:userId', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, u.name AS rater_name, j.title AS job_title
      FROM ratings r
      JOIN users u ON u.id = r.rater_id
      LEFT JOIN jobs j ON j.id = r.job_id
      WHERE r.rated_id = $1
      ORDER BY r.created_at DESC
    `, [req.params.userId]);

    const avg = rows.length
      ? (rows.reduce((s, r) => s + r.stars, 0) / rows.length).toFixed(1)
      : null;

    res.json({ ok: true, ratings: rows, average: avg ? parseFloat(avg) : null, count: rows.length });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load ratings' });
  }
});

// POST /api/ratings — submit a rating
router.post('/', auth, async (req, res) => {
  try {
    const { jobId, ratedId, stars, comment } = req.body;
    if (!stars || stars < 1 || stars > 5) {
      return res.json({ ok: false, error: 'Stars must be between 1 and 5' });
    }
    if (ratedId === req.user.id) {
      return res.json({ ok: false, error: 'Cannot rate yourself' });
    }

    const { rows } = await pool.query(`
      INSERT INTO ratings (job_id, rater_id, rated_id, stars, comment)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (job_id, rater_id) DO UPDATE SET stars=$4, comment=$5
      RETURNING *
    `, [jobId || null, req.user.id, ratedId, stars, comment?.trim() || null]);

    res.json({ ok: true, rating: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to submit rating' });
  }
});

// GET /api/ratings/my — ratings I have given
router.get('/my', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, j.title AS job_title, u.name AS rated_name
      FROM ratings r
      LEFT JOIN jobs j ON j.id = r.job_id
      JOIN users u ON u.id = r.rated_id
      WHERE r.rater_id = $1
      ORDER BY r.created_at DESC
    `, [req.user.id]);
    res.json({ ok: true, ratings: rows });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load ratings' });
  }
});

module.exports = router;
