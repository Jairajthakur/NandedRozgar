const router = require('express').Router();
const { pool } = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

// All admin routes require auth + admin role
router.use(auth, adminOnly);

// ─── USERS ────────────────────────────────────────────────────────────────────

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

// PATCH /api/admin/users/:id/revoke-pro
router.patch('/users/:id/revoke-pro', async (req, res) => {
  try {
    await pool.query('UPDATE users SET premium = false WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to revoke PRO' });
  }
});

// PATCH /api/admin/users/:id/role — set role (admin | user)
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) {
      return res.json({ ok: false, error: 'Invalid role' });
    }
    // Prevent self-demotion
    if (String(req.params.id) === String(req.user.id) && role !== 'admin') {
      return res.json({ ok: false, error: 'Cannot demote yourself' });
    }
    const { rows } = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, role',
      [role, req.params.id]
    );
    res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to update role' });
  }
});

// ─── JOBS ─────────────────────────────────────────────────────────────────────

// GET /api/admin/jobs — all jobs including inactive/deleted
router.get('/jobs', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT j.*, u.name AS poster_name, u.email AS poster_email,
        (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count
      FROM jobs j
      LEFT JOIN users u ON u.id = j.posted_by
      WHERE j.status != 'deleted'
      ORDER BY j.created_at DESC
    `);
    res.json({ ok: true, jobs: rows });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load jobs' });
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

// PATCH /api/admin/jobs/:id/feature — toggle featured
router.patch('/jobs/:id/feature', async (req, res) => {
  try {
    const { featured } = req.body;
    await pool.query('UPDATE jobs SET featured = $1 WHERE id = $2', [!!featured, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to update featured status' });
  }
});

// PATCH /api/admin/jobs/:id/urgent — toggle urgent
router.patch('/jobs/:id/urgent', async (req, res) => {
  try {
    const { urgent } = req.body;
    await pool.query('UPDATE jobs SET urgent = $1 WHERE id = $2', [!!urgent, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to update urgent status' });
  }
});

// DELETE /api/admin/jobs/:id — hard delete (admin only)
router.delete('/jobs/:id', async (req, res) => {
  try {
    await pool.query("UPDATE jobs SET status = 'deleted' WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to delete job' });
  }
});

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────

// GET /api/admin/payments — all payment records
router.get('/payments', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, u.name AS user_name, u.email AS user_email, j.title AS job_title
      FROM payments p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN jobs j ON j.id = p.job_id
      ORDER BY p.created_at DESC
      LIMIT 100
    `);
    res.json({ ok: true, payments: rows });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load payments' });
  }
});

// ─── STATS ────────────────────────────────────────────────────────────────────

// GET /api/admin/stats — aggregate platform stats
router.get('/stats', async (req, res) => {
  try {
    const [jobs, users, payments, apps] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active')   AS active_jobs,
          COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_jobs,
          COUNT(*) FILTER (WHERE featured = true)     AS featured_jobs,
          COUNT(*) FILTER (WHERE urgent = true)       AS urgent_jobs,
          SUM(views)                                  AS total_views,
          SUM(applicant_count)                        AS total_applicants
        FROM jobs WHERE status != 'deleted'
      `),
      pool.query(`
        SELECT
          COUNT(*)                              AS total_users,
          COUNT(*) FILTER (WHERE premium)       AS pro_users,
          COUNT(*) FILTER (WHERE NOT active)    AS banned_users,
          COUNT(*) FILTER (WHERE role='admin')  AS admin_users
        FROM users
      `),
      pool.query(`SELECT COALESCE(SUM(amount),0) AS total_revenue FROM payments WHERE status='paid'`),
      pool.query(`SELECT COUNT(*) AS total FROM applications`),
    ]);

    res.json({
      ok: true,
      stats: {
        ...jobs.rows[0],
        ...users.rows[0],
        total_revenue: payments.rows[0].total_revenue,
        total_applications: apps.rows[0].total,
      },
    });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load stats' });
  }
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

// POST /api/admin/notifications — send push notification
router.post('/notifications', async (req, res) => {
  try {
    const { title, body, target } = req.body;
    if (!title || !body) return res.json({ ok: false, error: 'Title and body required' });

    // Build target query
    let userQuery = 'SELECT id FROM users WHERE active = true';
    if (target === 'pro')  userQuery += ' AND premium = true';
    if (target === 'free') userQuery += ' AND premium = false';

    // In a real app, you'd fetch push tokens and call Expo/FCM here.
    // For now, log and return success.
    const { rows } = await pool.query(userQuery);
    console.log(`📣 Admin notification to ${rows.length} users (${target}): "${title}" — "${body}"`);

    // TODO: integrate with Expo push tokens table and call
    // https://exp.host/--/api/v2/push/send in batches of 100

    res.json({ ok: true, sent_to: rows.length });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to send notification' });
  }
});

module.exports = router;
