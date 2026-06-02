const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// GET /api/analytics/employer — stats for the logged-in employer's job posts
router.get('/employer', auth, async (req, res) => {
  try {
    // Per-job stats
    const { rows: jobStats } = await pool.query(`
      SELECT
        j.id, j.title, j.category, j.status,
        j.views, j.applicant_count,
        j.created_at, j.expires_at,
        j.featured, j.urgent,
        COUNT(a.id)                                            AS applications,
        COUNT(a.id) FILTER (WHERE a.status='shortlisted')     AS shortlisted,
        COUNT(a.id) FILTER (WHERE a.status='hired')           AS hired,
        COUNT(a.id) FILTER (WHERE a.status='rejected')        AS rejected,
        ROUND(
          CASE WHEN j.views > 0
          THEN COUNT(a.id)::NUMERIC / j.views * 100 ELSE 0 END, 1
        ) AS conversion_rate
      FROM jobs j
      LEFT JOIN applications a ON a.job_id = j.id
      WHERE j.posted_by = $1 AND j.status != 'deleted'
      GROUP BY j.id
      ORDER BY j.created_at DESC
    `, [req.user.id]);

    // Totals
    const totals = jobStats.reduce((acc, j) => ({
      totalViews:        acc.totalViews        + (parseInt(j.views)        || 0),
      totalApplications: acc.totalApplications + (parseInt(j.applications) || 0),
      totalShortlisted:  acc.totalShortlisted  + (parseInt(j.shortlisted)  || 0),
      totalHired:        acc.totalHired        + (parseInt(j.hired)        || 0),
      totalJobs:         acc.totalJobs         + 1,
      activeJobs:        acc.activeJobs        + (j.status === 'active' ? 1 : 0),
    }), { totalViews: 0, totalApplications: 0, totalShortlisted: 0, totalHired: 0, totalJobs: 0, activeJobs: 0 });

    const overallConversion = totals.totalViews > 0
      ? ((totals.totalApplications / totals.totalViews) * 100).toFixed(1)
      : 0;

    // Applications by day for last 30 days
    const { rows: daily } = await pool.query(`
      SELECT DATE(a.created_at) AS day, COUNT(*) AS count
      FROM applications a
      JOIN jobs j ON j.id = a.job_id
      WHERE j.posted_by = $1 AND a.created_at > NOW() - INTERVAL '30 days'
      GROUP BY day ORDER BY day ASC
    `, [req.user.id]);

    // Category breakdown
    const { rows: byCategory } = await pool.query(`
      SELECT j.category, COUNT(DISTINCT j.id) AS jobs, COUNT(a.id) AS applications
      FROM jobs j
      LEFT JOIN applications a ON a.job_id = j.id
      WHERE j.posted_by = $1 AND j.status != 'deleted'
      GROUP BY j.category ORDER BY applications DESC
    `, [req.user.id]);

    res.json({
      ok: true,
      summary: { ...totals, overallConversion: parseFloat(overallConversion) },
      jobs: jobStats,
      dailyApplications: daily,
      byCategory,
    });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load analytics' });
  }
});

// GET /api/analytics/stats — public platform stats for About screen
router.get('/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role != 'admin')                        AS users,
        (SELECT COUNT(*) FROM jobs WHERE status = 'active')                       AS jobs,
        (SELECT COUNT(*) FROM rooms WHERE status = 'active')                      AS rooms,
        (SELECT ROUND(AVG(stars)::numeric, 1) FROM ratings)                       AS rating
    `);
    const s = rows[0];
    res.json({
      ok: true,
      users:  parseInt(s.users)  || 0,
      jobs:   parseInt(s.jobs)   || 0,
      rooms:  parseInt(s.rooms)  || 0,
      rating: s.rating ? parseFloat(s.rating) : null,
    });
  } catch (err) {
    console.error(err);
    res.json({ ok: false });
  }
});

// POST /api/analytics/job/:id/view — increment view count
router.post('/job/:id/view', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0)
      return res.json({ ok: false, error: 'Invalid job ID' });
    await pool.query('UPDATE jobs SET views = views + 1 WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  }
});

// GET /api/analytics/seeker — stats for job seeker
router.get('/seeker', auth, async (req, res) => {
  try {
    const { rows: appStats } = await pool.query(`
      SELECT
        COUNT(*)                                              AS total,
        COUNT(*) FILTER (WHERE status='applied')             AS applied,
        COUNT(*) FILTER (WHERE status='reviewed')            AS reviewed,
        COUNT(*) FILTER (WHERE status='shortlisted')         AS shortlisted,
        COUNT(*) FILTER (WHERE status='hired')               AS hired,
        COUNT(*) FILTER (WHERE status='rejected')            AS rejected
      FROM applications WHERE user_id=$1
    `, [req.user.id]);

    const { rows: savedCount } = await pool.query(
      'SELECT COUNT(*) AS total FROM saved_jobs WHERE user_id=$1', [req.user.id]
    );

    res.json({
      ok: true,
      applications: appStats[0],
      savedCount: parseInt(savedCount[0].total),
    });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load stats' });
  }
});

module.exports = router;
