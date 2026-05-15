const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

const VALID_CATEGORIES = [
  'Construction','Driver','Domestic Help','Security','Delivery',
  'Shop Assistant','Plumber','Electrician','Carpenter','Painter','Other',
];

// FIX #16 — phone number validation helper
function isValidPhone(p) {
  return !p || /^\+?[0-9]{10,15}$/.test(p);
}

// GET /api/jobs — list active, non-expired jobs (paginated)
router.get('/', async (req, res) => {
  try {
    // FIX #12 — pagination; hard cap at 50 per page
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(`
      SELECT j.*, u.name AS poster_name, u.company AS poster_company,
        (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count
      FROM jobs j
      LEFT JOIN users u ON u.id = j.posted_by
      WHERE j.status = 'active'
        AND (j.expires_at IS NULL OR j.expires_at > NOW())
      ORDER BY j.featured DESC, j.urgent DESC, j.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({ ok: true, jobs: rows, page, limit });
  } catch (err) {
    console.error('jobs list error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load jobs' });
  }
});

// POST /api/jobs — create a job (after payment)
router.post('/', auth, async (req, res) => {
  try {
    const { title, company, category, type, location, salary, phone, description, featured, urgent, planDays } = req.body;

    // FIX #10 — input validation
    if (!title || !category || !location) {
      return res.status(400).json({ ok: false, error: 'Title, category and location are required' });
    }
    if (title.length > 200 || (description && description.length > 5000)) {
      return res.status(400).json({ ok: false, error: 'Input too long' });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ ok: false, error: 'Invalid category' });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ ok: false, error: 'Invalid phone number' });
    }

    const days = Math.min(Math.max(parseInt(planDays) || 30, 1), 365);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { rows } = await pool.query(`
      INSERT INTO jobs (posted_by, title, company, category, type, location, salary, phone, description, featured, urgent, expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `, [req.user.id, title, company, category, type || 'Full-time', location, salary, phone, description, !!featured, !!urgent, expiresAt]);

    res.json({ ok: true, job: rows[0] });
  } catch (err) {
    console.error('jobs post error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to post job' });
  }
});

// POST /api/jobs/:id/apply
router.post('/:id/apply', auth, async (req, res) => {
  try {
    // FIX #11 — Only increment applicant_count when a new row is actually inserted
    const result = await pool.query(
      'INSERT INTO applications (job_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rowCount > 0) {
      await pool.query('UPDATE jobs SET applicant_count = applicant_count + 1 WHERE id = $1', [req.params.id]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('apply error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to apply' });
  }
});

// POST /api/jobs/:id/save
router.post('/:id/save', auth, async (req, res) => {
  try {
    const existing = await pool.query(
      'SELECT id FROM saved_jobs WHERE job_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM saved_jobs WHERE job_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
      return res.json({ ok: true, saved: false });
    }
    await pool.query('INSERT INTO saved_jobs (job_id, user_id) VALUES ($1, $2)', [req.params.id, req.user.id]);
    res.json({ ok: true, saved: true });
  } catch (err) {
    console.error('save job error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to save job' });
  }
});

// DELETE /api/jobs/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    const job = rows[0];
    if (!job) return res.status(404).json({ ok: false, error: 'Job not found' });
    if (job.posted_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Not allowed' });
    }
    await pool.query("UPDATE jobs SET status = 'deleted' WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('delete job error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to delete job' });
  }
});

module.exports = router;
