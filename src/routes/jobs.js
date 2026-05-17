const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// GET /api/jobs — list all active, non-expired jobs
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT j.*, u.name AS poster_name,
        (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count
      FROM jobs j
      LEFT JOIN users u ON u.id = j.posted_by
      WHERE j.status = 'active'
        AND (j.expires_at IS NULL OR j.expires_at > NOW())
      ORDER BY j.featured DESC, j.urgent DESC, j.created_at DESC
    `);
    res.json({ ok: true, jobs: rows });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load jobs' });
  }
});

// POST /api/jobs — create a job
router.post('/', auth, async (req, res) => {
  try {
    const {
      title, company, category, type, location, salary,
      phone, whatsapp, description, skills, requirements,
      education, experience, hours, openings,
      featured, urgent, planDays,
    } = req.body;

    if (!title || !category || !location) {
      return res.json({ ok: false, error: 'Title, category and location are required' });
    }

    const days = parseInt(planDays) || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    // Normalise skills/requirements to arrays
    const skillsArr = Array.isArray(skills)
      ? skills
      : typeof skills === 'string' && skills.trim()
        ? skills.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    const reqArr = Array.isArray(requirements)
      ? requirements
      : typeof requirements === 'string' && requirements.trim()
        ? requirements.split('\n').map(r => r.trim()).filter(Boolean)
        : [];

    const { rows } = await pool.query(`
      INSERT INTO jobs (
        posted_by, title, company, category, type, location, salary,
        phone, whatsapp, description, skills, requirements,
        education, experience, hours, openings,
        featured, urgent, expires_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *
    `, [
      req.user.id, title, company, category,
      type || 'Full-time', location, salary || '',
      phone, whatsapp || phone, description,
      skillsArr, reqArr,
      education || '', experience || '', hours || '', openings || '1',
      !!featured, !!urgent, expiresAt,
    ]);

    res.json({ ok: true, job: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to post job' });
  }
});

// POST /api/jobs/:id/apply
router.post('/:id/apply', auth, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO applications (job_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, req.user.id]
    );
    await pool.query('UPDATE jobs SET applicant_count = applicant_count + 1 WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to apply' });
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
    console.error(err);
    res.json({ ok: false, error: 'Failed to save job' });
  }
});

// POST /api/jobs/:id/report
router.post('/:id/report', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    await pool.query(
      'INSERT INTO job_reports (job_id, user_id, reason) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [req.params.id, req.user.id, reason || 'Other']
    ).catch(() => {}); // table may not exist yet — non-fatal
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to report' });
  }
});

// DELETE /api/jobs/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    const job = rows[0];
    if (!job) return res.json({ ok: false, error: 'Job not found' });
    if (job.posted_by !== req.user.id && req.user.role !== 'admin') {
      return res.json({ ok: false, error: 'Not allowed' });
    }
    await pool.query("UPDATE jobs SET status = 'deleted' WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to delete job' });
  }
});

module.exports = router;
