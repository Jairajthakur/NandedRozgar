const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// GET /api/jobs — paginated list of active, non-expired jobs
router.get('/', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const category = req.query.category || null;
    const search   = req.query.search   || null;
    const jobType  = req.query.type     || null;   // Full-time | Part-time | Fresher | Work from Home
    const district = req.query.district || null;   // nanded | latur

    // Build dynamic WHERE clauses
    const conditions = ["j.status = 'active'", "(j.expires_at IS NULL OR j.expires_at > NOW())"];
    const params = [];

    if (category && category !== 'All') {
      params.push(category);
      conditions.push(`j.category = $${params.length}`);
    }
    if (jobType && jobType !== 'All') {
      if (jobType === 'Fresher') {
        conditions.push(`(j.fresher_ok = TRUE OR j.type ILIKE 'fresher%')`);
      } else if (jobType === 'Work from Home') {
        conditions.push(`(j.type ILIKE '%work from home%' OR j.type ILIKE '%wfh%' OR j.type ILIKE '%remote%')`);
      } else {
        params.push(jobType);
        conditions.push(`j.type ILIKE $${params.length}`);
      }
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(j.title ILIKE $${params.length} OR j.company ILIKE $${params.length} OR j.description ILIKE $${params.length} OR j.location ILIKE $${params.length})`);
    }
    if (district) {
      params.push(district);
      conditions.push(`(j.district = $${params.length} OR j.district IS NULL)`);
    }

    const where = conditions.join(' AND ');

    // Total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM jobs j WHERE ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Data query with pagination
    params.push(limit, offset);
    const { rows } = await pool.query(`
      SELECT j.*, u.name AS poster_name, u.verified AS poster_verified,
        (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count
      FROM jobs j
      LEFT JOIN users u ON u.id = j.posted_by
      WHERE ${where}
      ORDER BY j.featured DESC, j.urgent DESC, j.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({
      ok: true,
      jobs: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
      },
    });
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
      featured, urgent, fresherOk, planDays,
    } = req.body;

    if (!title || !category || !location) {
      return res.json({ ok: false, error: 'Title, category and location are required' });
    }

    const days = parseInt(planDays) || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

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

    // Infer fresher_ok: explicit flag OR type is 'Freshers Welcome' OR type contains 'Fresher'
    const isFresherOk = !!fresherOk || (type || '').toLowerCase().includes('fresher');

    const { rows } = await pool.query(`
      INSERT INTO jobs (
        posted_by, title, company, category, type, location, salary,
        phone, whatsapp, description, skills, requirements,
        education, experience, hours, openings,
        featured, urgent, fresher_ok, expires_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING *
    `, [
      req.user.id, title, company, category,
      type || 'Full-time', location, salary || '',
      phone, whatsapp || phone, description,
      skillsArr, reqArr,
      education || '', experience || '', hours || '', openings || '1',
      !!featured, !!urgent, isFresherOk, expiresAt,
    ]);

    res.json({ ok: true, job: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to post job' });
  }
});

// GET /api/jobs/my-applications — current user's applications with statuses
// MUST be registered before /:id routes or Express will match 'my-applications' as an id
router.get('/my-applications', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.id, a.status, a.created_at,
        j.id AS job_id, j.title, j.company, j.category, j.location, j.salary
      FROM applications a
      JOIN jobs j ON j.id = a.job_id
      WHERE a.user_id = $1
      ORDER BY a.created_at DESC
    `, [req.user.id]);
    res.json({ ok: true, applications: rows });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load applications' });
  }
});

// GET /api/jobs/saved — list user's saved jobs
// MUST be registered before /:id routes or Express will match 'saved' as an id
router.get('/saved', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT j.*, s.created_at AS saved_at
      FROM saved_jobs s
      JOIN jobs j ON j.id = s.job_id
      WHERE s.user_id = $1 AND j.status = 'active'
      ORDER BY s.created_at DESC
    `, [req.user.id]);
    res.json({ ok: true, jobs: rows });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load saved jobs' });
  }
});

// POST /api/jobs/:id/apply
router.post('/:id/apply', auth, async (req, res) => {
  try {
    // Check user hasn't already applied
    const existing = await pool.query(
      'SELECT id FROM applications WHERE job_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (existing.rows.length > 0) {
      return res.json({ ok: false, error: 'You have already applied to this job' });
    }

    await pool.query(
      `INSERT INTO applications (job_id, user_id, status) VALUES ($1, $2, 'applied')
       ON CONFLICT DO NOTHING`,
      [req.params.id, req.user.id]
    );
    // applicant_count is computed live in GET /api/jobs via COUNT(*) on the
    // applications table — updating the jobs column here would cause it to
    // diverge from the real count on conflict, rejection, or withdrawal.
    res.json({ ok: true, message: 'Application submitted!' });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to apply' });
  }
});

// GET /api/jobs/:id/application-status — check if current user applied
router.get('/:id/application-status', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT status FROM applications WHERE job_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.json({ ok: true, applied: false, status: null });
    res.json({ ok: true, applied: true, status: rows[0].status });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to check status' });
  }
});

// PATCH /api/jobs/:id/application/:userId — employer updates application status
router.patch('/:id/application/:userId', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['applied', 'reviewed', 'shortlisted', 'rejected', 'hired'];
    if (!validStatuses.includes(status)) {
      return res.json({ ok: false, error: 'Invalid status value' });
    }

    // Only job owner or admin can update
    const jobRow = await pool.query('SELECT posted_by FROM jobs WHERE id = $1', [req.params.id]);
    if (!jobRow.rows[0]) return res.json({ ok: false, error: 'Job not found' });
    if (jobRow.rows[0].posted_by !== req.user.id && req.user.role !== 'admin') {
      return res.json({ ok: false, error: 'Not authorised' });
    }

    await pool.query(
      `UPDATE applications SET status = $1 WHERE job_id = $2 AND user_id = $3`,
      [status, req.params.id, req.params.userId]
    );
    res.json({ ok: true, status });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to update status' });
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
      `INSERT INTO job_reports (job_id, user_id, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (job_id, user_id) DO NOTHING`,
      [req.params.id, req.user.id, reason || 'Other']
    );
    res.json({ ok: true, message: 'Report submitted. Thank you.' });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to report job' });
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
