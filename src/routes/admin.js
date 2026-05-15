const router = require('express').Router();
const { pool } = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

router.use(auth, adminOnly);

// FIX #14 — Durable audit trail for every admin action
async function auditLog(adminId, action, targetType, targetId, detail, ip) {
  try {
    await pool.query(
      `INSERT INTO audit_log (admin_id, action, target_type, target_id, detail, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminId, action, targetType, String(targetId), JSON.stringify(detail || {}), ip || null]
    );
  } catch (e) {
    console.error('audit_log write failed:', e.message);
  }
}

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
}

// ─── USERS ────────────────────────────────────────────────────────────────────

router.get('/users', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, phone, company, role, premium, active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ ok: true, users: rows });
  } catch (err) {
    console.error('admin users error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load users' });
  }
});

router.patch('/users/:id/toggle', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE users SET active = NOT active WHERE id = $1 RETURNING id, active, name',
      [req.params.id]
    );
    await auditLog(req.user.id, 'user.toggle_ban', 'user', req.params.id,
      { new_active: rows[0]?.active }, clientIp(req));
    res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error('admin toggle error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to toggle user' });
  }
});

router.patch('/users/:id/grant-pro', async (req, res) => {
  try {
    await pool.query('UPDATE users SET premium = true WHERE id = $1', [req.params.id]);
    await auditLog(req.user.id, 'user.grant_pro', 'user', req.params.id, {}, clientIp(req));
    res.json({ ok: true });
  } catch (err) {
    console.error('admin grant-pro error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to grant PRO' });
  }
});

router.patch('/users/:id/revoke-pro', async (req, res) => {
  try {
    await pool.query('UPDATE users SET premium = false WHERE id = $1', [req.params.id]);
    await auditLog(req.user.id, 'user.revoke_pro', 'user', req.params.id, {}, clientIp(req));
    res.json({ ok: true });
  } catch (err) {
    console.error('admin revoke-pro error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to revoke PRO' });
  }
});

router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ ok: false, error: 'Invalid role' });
    }
    if (String(req.params.id) === String(req.user.id) && role !== 'admin') {
      return res.status(400).json({ ok: false, error: 'Cannot demote yourself' });
    }
    const { rows } = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, role',
      [role, req.params.id]
    );
    await auditLog(req.user.id, 'user.set_role', 'user', req.params.id, { role }, clientIp(req));
    res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error('admin set-role error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to update role' });
  }
});

// ─── JOBS ─────────────────────────────────────────────────────────────────────

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
    console.error('admin jobs error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load jobs' });
  }
});

router.patch('/jobs/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status' });
    }
    await pool.query('UPDATE jobs SET status = $1 WHERE id = $2', [status, req.params.id]);
    await auditLog(req.user.id, 'job.set_status', 'job', req.params.id, { status }, clientIp(req));
    res.json({ ok: true });
  } catch (err) {
    console.error('admin job status error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to update job status' });
  }
});

router.patch('/jobs/:id/feature', async (req, res) => {
  try {
    const { featured } = req.body;
    await pool.query('UPDATE jobs SET featured = $1 WHERE id = $2', [!!featured, req.params.id]);
    await auditLog(req.user.id, 'job.set_featured', 'job', req.params.id, { featured: !!featured }, clientIp(req));
    res.json({ ok: true });
  } catch (err) {
    console.error('admin job feature error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to update featured status' });
  }
});

router.patch('/jobs/:id/urgent', async (req, res) => {
  try {
    const { urgent } = req.body;
    await pool.query('UPDATE jobs SET urgent = $1 WHERE id = $2', [!!urgent, req.params.id]);
    await auditLog(req.user.id, 'job.set_urgent', 'job', req.params.id, { urgent: !!urgent }, clientIp(req));
    res.json({ ok: true });
  } catch (err) {
    console.error('admin job urgent error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to update urgent status' });
  }
});

router.delete('/jobs/:id', async (req, res) => {
  try {
    await pool.query("UPDATE jobs SET status = 'deleted' WHERE id = $1", [req.params.id]);
    await auditLog(req.user.id, 'job.delete', 'job', req.params.id, {}, clientIp(req));
    res.json({ ok: true });
  } catch (err) {
    console.error('admin delete job error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to delete job' });
  }
});

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────

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
    console.error('admin payments error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load payments' });
  }
});

// ─── STATS ────────────────────────────────────────────────────────────────────

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
    console.error('admin stats error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load stats' });
  }
});

// ─── AUDIT LOG (NEW) ──────────────────────────────────────────────────────────

router.get('/audit', async (req, res) => {
  try {
    const limit  = Math.min(200, parseInt(req.query.limit)  || 50);
    const offset = Math.max(0,   parseInt(req.query.offset) || 0);
    const { rows } = await pool.query(`
      SELECT a.*, u.name AS admin_name, u.email AS admin_email
      FROM audit_log a
      LEFT JOIN users u ON u.id = a.admin_id
      ORDER BY a.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    res.json({ ok: true, logs: rows });
  } catch (err) {
    console.error('admin audit error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load audit log' });
  }
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

router.post('/notifications', async (req, res) => {
  try {
    const { title, body, target } = req.body;
    if (!title || !body) return res.status(400).json({ ok: false, error: 'Title and body required' });
    if (title.length > 200 || body.length > 1000) {
      return res.status(400).json({ ok: false, error: 'Input too long' });
    }

    let userQuery = 'SELECT id FROM users WHERE active = true';
    if (target === 'pro')  userQuery += ' AND premium = true';
    if (target === 'free') userQuery += ' AND premium = false';

    const { rows } = await pool.query(userQuery);

    await auditLog(req.user.id, 'notification.send', 'broadcast', target || 'all',
      { title, recipient_count: rows.length }, clientIp(req));

    res.json({ ok: true, sent_to: rows.length });
  } catch (err) {
    console.error('admin notification error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to send notification' });
  }
});

module.exports = router;
