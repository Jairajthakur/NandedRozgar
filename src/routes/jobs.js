const router = require('express').Router();
const { pool, cache } = require('../db');
const { auth } = require('../middleware/auth');
const { logActivity, getIP, getUA } = require('../utils/logActivity');
const { sendPushNotifications } = require('../utils/push');

const JOBS_TTL   = 15_000;  // list cache: 15 s
const DETAIL_TTL = 30_000;  // single-job cache: 30 s

// ── GET /api/jobs ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(50, parseInt(req.query.limit) || 20);
    const offset   = (page - 1) * limit;
    const category = req.query.category || null;
    const rawSearch = req.query.search  || null;
    const search    = rawSearch ? String(rawSearch).trim().slice(0, 200) || null : null;
    const jobType   = req.query.type     || null;
    const district  = req.query.district || null;

    // Cache key — include all filter params
    const cacheKey = `jobs:${page}:${limit}:${category}:${search}:${jobType}:${district}`;
    const hit = await cache.get(cacheKey);
    if (hit) return res.json(hit);

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
      // Wrap in % so ILIKE does substring matching — "driver" matches "Delivery Driver"
      params.push(`%${search}%`);
      conditions.push(`(j.title ILIKE $${params.length} OR j.company ILIKE $${params.length})`);
    }
    if (district) {
      params.push(district);
      conditions.push(`(j.district = $${params.length} OR j.district IS NULL)`);
    }

    const where = conditions.join(' AND ');

    // Run count + data in parallel — halves round-trips
    const countParams = [...params];
    params.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM jobs j WHERE ${where}`, countParams),
      pool.query(`
        SELECT j.id, j.title, j.company, j.category, j.type, j.location, j.salary,
               j.phone, j.whatsapp, j.skills, j.education, j.experience,
               j.featured, j.urgent, j.fresher_ok, j.status, j.views,
               j.applicant_count, j.expires_at, j.created_at, j.district,
               u.name AS poster_name, u.verified AS poster_verified
        FROM jobs j
        LEFT JOIN users u ON u.id = j.posted_by
        WHERE ${where}
        ORDER BY j.featured DESC, j.urgent DESC, j.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `, params),
    ]);

    const total = parseInt(countResult.rows[0].count);
    const payload = {
      ok: true,
      jobs: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total },
    };

    await cache.set(cacheKey, payload, JOBS_TTL);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load jobs' });
  }
});

// GET /api/jobs/my-applications
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

// GET /api/jobs/saved
router.get('/saved', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT j.id, j.title, j.company, j.category, j.location, j.salary,
             j.featured, j.urgent, j.status, j.created_at, s.created_at AS saved_at
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

// GET /api/jobs/:id
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) return res.json({ ok: false, error: 'Invalid job ID' });
    const cacheKey = `job:${id}`;
    const hit      = await cache.get(cacheKey);
    if (hit) {
      // Increment views async without blocking response
      pool.query('UPDATE jobs SET views = COALESCE(views,0)+1 WHERE id=$1', [id]).catch(() => {});
      return res.json(hit);
    }

    const { rows } = await pool.query(`
      SELECT j.*, u.name AS poster_name, u.verified AS poster_verified,
        (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count
      FROM jobs j
      LEFT JOIN users u ON u.id = j.posted_by
      WHERE j.id = $1 AND j.status = 'active' AND (j.expires_at IS NULL OR j.expires_at > NOW())
    `, [id]);

    if (!rows[0]) return res.json({ ok: false, error: 'Job not found' });

    pool.query('UPDATE jobs SET views = COALESCE(views,0)+1 WHERE id=$1', [id]).catch(() => {});

    const payload = { ok: true, job: rows[0] };
    await cache.set(cacheKey, payload, DETAIL_TTL);
    res.json(payload);
  } catch (err) {
    console.error('GET /jobs/:id error:', err);
    res.json({ ok: false, error: 'Failed to load job' });
  }
});

// POST /api/jobs
// Free plan: 7 days, allowed only on the user's very first job post ever.
// Every post after that requires a paid plan (from ₹49).
const FREE_PLAN_MAX_DAYS = 7;
router.post('/', auth, async (req, res) => {
  try {
    const {
      title, company, category, type, location, salary,
      phone, whatsapp, description, skills, requirements,
      education, experience, hours, openings, fresherOk, planDays, plan,
      district,
    } = req.body;

    if (!title || !category || !location)
      return res.json({ ok: false, error: 'Title, category and location are required' });

    const planKey = (plan || 'free').toLowerCase().trim();

    // ── BUG FIX: Reject paid plan keys on the free route ─────────────────────
    // A client could send plan='30 days' (or any paid plan key) to this route
    // and bypass the payment flow entirely. Only 'free' is accepted here;
    // all paid plans must go through POST /api/payments/verify.
    if (planKey !== 'free') {
      return res.json({
        ok: false,
        error: 'Paid plans must be posted through the payment flow.',
        requiresPayment: true,
      });
    }

    // ── First-post-free check ─────────────────────────────────────────────────
    if (planKey === 'free') {
      const { rows: prior } = await pool.query(
        `SELECT id FROM jobs WHERE posted_by = $1 AND status != 'deleted' LIMIT 1`,
        [req.user.id]
      );
      if (prior.length > 0) {
        return res.json({
          ok: false,
          error: 'Free listing is only for your first post. Please choose a paid plan (from ₹49) to post again.',
          requiresPayment: true,
        });
      }
    }

    const days = planKey === 'free'
      ? FREE_PLAN_MAX_DAYS   // BUG FIX: always 7 days for free plan — ignore any
                             // client-supplied planDays so a free post cannot receive
                             // a paid duration (e.g. 30 days) without payment.
      : FREE_PLAN_MAX_DAYS;  // Non-free plans must go through /api/payments/verify,
                             // not this free route. If somehow reached, fall back to
                             // FREE_PLAN_MAX_DAYS rather than trusting the client.
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const skillsArr = Array.isArray(skills) ? skills
      : typeof skills === 'string' && skills.trim() ? skills.split(',').map(s => s.trim()).filter(Boolean) : [];
    const reqArr = Array.isArray(requirements) ? requirements
      : typeof requirements === 'string' && requirements.trim() ? requirements.split('\n').map(r => r.trim()).filter(Boolean) : [];

    const isFresherOk = !!fresherOk || (type || '').toLowerCase().includes('fresher');

    const { rows } = await pool.query(`
      INSERT INTO jobs (
        posted_by, title, company, category, type, location, salary,
        phone, whatsapp, description, skills, requirements,
        education, experience, hours, openings,
        featured, urgent, fresher_ok, expires_at, district
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
      RETURNING *
    `, [
      req.user.id, title, company, category, type || 'Full-time', location, salary || '',
      phone, whatsapp || phone, description, skillsArr, reqArr,
      education || '', experience || '', hours || '', openings || '1',
      false, false, isFresherOk, expiresAt,
      (process.env.VALID_DISTRICTS || 'nanded').split(',').map(d=>d.trim()).includes(district) ? district : 'nanded',
    ]);

    await cache.delPrefix('jobs:'); // bust list cache
    await logActivity('job_post', { userId: req.user.id, ip: getIP(req), userAgent: getUA(req), detail: `Job posted: "${title}" (${planKey} plan)` });

    // Fire push notifications to users who have an alert matching this job's category.
    // Done async — any failure here must NOT block the response.
    const newJob = rows[0];
    setImmediate(async () => {
      try {
        const { rows: alerts } = await pool.query(
          `SELECT ja.push_token FROM job_alerts ja
           WHERE ja.category IN ($1, 'All') AND ja.push_token IS NOT NULL AND ja.active = TRUE`,
          [newJob.category]
        );
        if (!alerts.length) return;

        const tokens = alerts.map(a => a.push_token).filter(Boolean);
        if (!tokens.length) return;

        const { invalidTokens } = await sendPushNotifications(tokens, {
          title: `New ${newJob.category} job in ${newJob.location || 'your area'}`,
          body:  `${newJob.title} at ${newJob.company || 'a local employer'} — tap to view`,
          data:  { jobId: newJob.id },
        });

        // Drop dead tokens so future alert sends don't keep retrying them.
        if (invalidTokens.length) {
          await pool.query('UPDATE job_alerts SET push_token = NULL WHERE push_token = ANY($1)', [invalidTokens])
            .catch(e => console.warn('Failed to clear invalid alert tokens:', e.message));
        }
      } catch (e) {
        console.warn('Job alert notifications error:', e.message);
      }
    });

    res.json({ ok: true, job: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to post job' });
  }
});

// POST /api/jobs/:id/apply
router.post('/:id/apply', auth, async (req, res) => {
  try {
    const [jobRow, existing] = await Promise.all([
      pool.query("SELECT posted_by FROM jobs WHERE id=$1 AND status='active'", [req.params.id]),
      pool.query('SELECT id FROM applications WHERE job_id=$1 AND user_id=$2', [req.params.id, req.user.id]),
    ]);
    if (!jobRow.rows.length)          return res.json({ ok: false, error: 'Job not found' });
    if (jobRow.rows[0].posted_by === req.user.id) return res.json({ ok: false, error: 'Cannot apply to your own job' });
    if (existing.rows.length)         return res.json({ ok: false, error: 'Already applied' });

    await pool.query(
      `INSERT INTO applications (job_id, user_id, status) VALUES ($1,$2,'applied') ON CONFLICT DO NOTHING`,
      [req.params.id, req.user.id]
    );
    await cache.del(`job:${req.params.id}`);
    await logActivity('job_apply', { userId: req.user.id, ip: getIP(req), userAgent: getUA(req), detail: `Applied to job #${req.params.id}` });
    res.json({ ok: true, message: 'Application submitted!' });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to apply' });
  }
});

// GET /api/jobs/:id/application-status
router.get('/:id/application-status', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT status FROM applications WHERE job_id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    res.json({ ok: true, applied: rows.length > 0, status: rows[0]?.status ?? null });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to check status' });
  }
});

// PATCH /api/jobs/:id/application/:userId
router.patch('/:id/application/:userId', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['applied','reviewed','shortlisted','rejected','hired'];
    if (!valid.includes(status)) return res.json({ ok: false, error: 'Invalid status' });

    const { rows } = await pool.query('SELECT posted_by FROM jobs WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.json({ ok: false, error: 'Job not found' });
    if (rows[0].posted_by !== req.user.id && req.user.role !== 'admin')
      return res.json({ ok: false, error: 'Not authorised' });

    await pool.query(
      'UPDATE applications SET status=$1 WHERE job_id=$2 AND user_id=$3',
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
    const { rows } = await pool.query(
      'SELECT id FROM saved_jobs WHERE job_id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (rows.length) {
      await pool.query('DELETE FROM saved_jobs WHERE job_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
      return res.json({ ok: true, saved: false });
    }
    await pool.query('INSERT INTO saved_jobs (job_id,user_id) VALUES ($1,$2)', [req.params.id, req.user.id]);
    res.json({ ok: true, saved: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to save job' });
  }
});

// POST /api/jobs/:id/report
router.post('/:id/report', auth, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO job_reports (job_id,user_id,reason) VALUES ($1,$2,$3) ON CONFLICT (job_id,user_id) DO NOTHING`,
      [req.params.id, req.user.id, req.body.reason || 'Other']
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to report job' });
  }
});

// DELETE /api/jobs/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT posted_by FROM jobs WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.json({ ok: false, error: 'Not found' });
    if (rows[0].posted_by !== req.user.id && req.user.role !== 'admin')
      return res.json({ ok: false, error: 'Not allowed' });
    await pool.query("UPDATE jobs SET status='deleted' WHERE id=$1", [req.params.id]);
    await cache.del(`job:${req.params.id}`);
    await cache.delPrefix('jobs:');
    await logActivity('job_delete', { userId: req.user.id, ip: getIP(req), userAgent: getUA(req), detail: `Deleted job #${req.params.id}` });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to delete job' });
  }
});

module.exports = router;
