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
      WHERE r.rated_id = $1 AND r.job_id IS NOT NULL
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

// GET /api/ratings/labour/:labourId — all ratings a labourer has received
// from completed hires. Public (same visibility level as the profile itself).
router.get('/labour/:labourId', async (req, res) => {
  try {
    const labourId = parseInt(req.params.labourId, 10);
    if (!labourId) return res.json({ ok: false, error: 'Invalid labour profile id' });

    const { rows } = await pool.query(`
      SELECT r.id, r.stars, r.comment, r.created_at,
             u.name AS rater_name, hr.work_description
      FROM ratings r
      JOIN hire_requests hr ON hr.id = r.hire_request_id
      JOIN users u ON u.id = r.rater_id
      WHERE hr.labour_id = $1
      ORDER BY r.created_at DESC
    `, [labourId]);

    const avg = rows.length
      ? (rows.reduce((s, r) => s + r.stars, 0) / rows.length).toFixed(1)
      : null;

    res.json({ ok: true, ratings: rows, average: avg ? parseFloat(avg) : null, count: rows.length });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load ratings' });
  }
});

// POST /api/ratings — submit a rating for an employer
// Requires the rater to have applied to the specific job, and the ratedId
// must be the actual poster of that job — prevents rating strangers.
router.post('/', auth, async (req, res) => {
  try {
    const { jobId, ratedId, stars, comment } = req.body;

    const s = parseInt(stars, 10);
    if (!s || s < 1 || s > 5) {
      return res.json({ ok: false, error: 'Stars must be a whole number between 1 and 5' });
    }
    if (!jobId) {
      return res.json({ ok: false, error: 'A job must be specified to submit a rating' });
    }
    if (ratedId === req.user.id) {
      return res.json({ ok: false, error: 'Cannot rate yourself' });
    }

    // Verify the rater actually applied to this job
    const { rows: appRows } = await pool.query(
      'SELECT id FROM applications WHERE job_id = $1 AND user_id = $2',
      [jobId, req.user.id]
    );
    if (!appRows.length) {
      return res.json({ ok: false, error: 'You can only rate employers for jobs you applied to' });
    }

    // Verify the ratedId is the actual poster of this job
    const { rows: jobRows } = await pool.query(
      'SELECT posted_by FROM jobs WHERE id = $1',
      [jobId]
    );
    if (!jobRows.length) {
      return res.json({ ok: false, error: 'Job not found' });
    }
    if (jobRows[0].posted_by !== ratedId) {
      return res.json({ ok: false, error: 'You can only rate the employer who posted this job' });
    }

    const { rows } = await pool.query(`
      INSERT INTO ratings (job_id, rater_id, rated_id, stars, comment)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (rater_id, job_id) WHERE job_id IS NOT NULL
      DO UPDATE SET stars = $4, comment = $5
      RETURNING *
    `, [jobId, req.user.id, ratedId, s, comment?.trim() || null]);

    res.json({ ok: true, rating: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to submit rating' });
  }
});

// POST /api/ratings/labour — submit a rating for a labourer after a hire
// Requires the rater to be the contractor on a hire_requests row that has
// reached status='completed'. ratedId is derived server-side from the hire
// request (never trusted from the client) so a contractor can't rate anyone
// other than the worker they actually hired.
router.post('/labour', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { hireRequestId, stars, comment } = req.body;

    const s = parseInt(stars, 10);
    if (!s || s < 1 || s > 5) {
      client.release();
      return res.json({ ok: false, error: 'Stars must be a whole number between 1 and 5' });
    }
    const hrId = parseInt(hireRequestId, 10);
    if (!hrId) {
      client.release();
      return res.json({ ok: false, error: 'A hire request must be specified to submit a rating' });
    }

    const { rows: hrRows } = await client.query(`
      SELECT hr.id, hr.contractor_id, hr.status, l.id AS labour_id, l.user_id AS labourer_user_id
      FROM hire_requests hr
      JOIN labour_profiles l ON l.id = hr.labour_id
      WHERE hr.id = $1
    `, [hrId]);

    if (!hrRows.length) {
      client.release();
      return res.json({ ok: false, error: 'Hire request not found' });
    }
    const hr = hrRows[0];

    if (hr.contractor_id !== req.user.id) {
      client.release();
      return res.json({ ok: false, error: 'You can only rate a worker you hired' });
    }
    if (hr.status !== 'completed') {
      client.release();
      return res.json({ ok: false, error: 'You can only rate a worker after the job is marked completed' });
    }
    if (hr.labourer_user_id === req.user.id) {
      client.release();
      return res.json({ ok: false, error: 'Cannot rate yourself' });
    }

    await client.query('BEGIN');

    const { rows } = await client.query(`
      INSERT INTO ratings (hire_request_id, rater_id, rated_id, stars, comment)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (rater_id, hire_request_id) WHERE hire_request_id IS NOT NULL
      DO UPDATE SET stars = $4, comment = $5
      RETURNING *
    `, [hrId, req.user.id, hr.labourer_user_id, s, comment?.trim() || null]);

    // Recompute the labourer's aggregate rating from source-of-truth (ratings
    // table) rather than incrementing a running average, so it self-heals if
    // a rating is ever edited, deleted, or this endpoint retried.
    await client.query(`
      UPDATE labour_profiles SET
        rating_count = (
          SELECT COUNT(*) FROM ratings r2
          JOIN hire_requests hr2 ON hr2.id = r2.hire_request_id
          WHERE hr2.labour_id = $1
        ),
        rating_avg = (
          SELECT ROUND(AVG(r2.stars)::numeric, 1) FROM ratings r2
          JOIN hire_requests hr2 ON hr2.id = r2.hire_request_id
          WHERE hr2.labour_id = $1
        )
      WHERE id = $1
    `, [hr.labour_id]);

    await client.query('COMMIT');
    res.json({ ok: true, rating: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.json({ ok: false, error: 'Failed to submit rating' });
  } finally {
    client.release();
  }
});

// GET /api/ratings/my — ratings I have given (both employer and labour hires)
router.get('/my', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, j.title AS job_title, lp.full_name AS labour_name, u.name AS rated_name
      FROM ratings r
      LEFT JOIN jobs j ON j.id = r.job_id
      LEFT JOIN hire_requests hr ON hr.id = r.hire_request_id
      LEFT JOIN labour_profiles lp ON lp.id = hr.labour_id
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
