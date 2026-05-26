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

// PATCH /api/admin/users/:id/verify — grant Verified Employer badge
router.patch('/users/:id/verify', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE users SET verified = true WHERE id = $1 RETURNING id, name, verified',
      [req.params.id]
    );
    res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to verify user' });
  }
});

// PATCH /api/admin/users/:id/unverify — revoke Verified Employer badge
router.patch('/users/:id/unverify', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE users SET verified = false WHERE id = $1 RETURNING id, name, verified',
      [req.params.id]
    );
    res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to unverify user' });
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
          (SELECT COUNT(*) FROM applications)         AS total_applicants
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

// POST /api/admin/notifications — send push notification via Expo push API
//
// Targets users by push_token (stored in users.push_token by POST /api/auth/push-token).
// Delivers in batches of 100 as required by the Expo push service.
// Returns { ok, sent_to, failed } so the admin sees accurate delivery counts.
const EXPO_PUSH_URL  = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH_MAX = 100;

router.post('/notifications', async (req, res) => {
  try {
    const { title, body, target } = req.body;
    if (!title || !body) return res.json({ ok: false, error: 'Title and body required' });

    // Fetch push tokens for the target audience.
    // Only rows with a non-null push_token can receive a notification.
    let userQuery = 'SELECT push_token FROM users WHERE active = true AND push_token IS NOT NULL';
    if (target === 'pro')  userQuery += ' AND premium = true';
    if (target === 'free') userQuery += ' AND premium = false';

    const { rows } = await pool.query(userQuery);
    const tokens = rows.map(r => r.push_token).filter(Boolean);

    if (tokens.length === 0) {
      return res.json({ ok: true, sent_to: 0, failed: 0, message: 'No push tokens found for target audience' });
    }

    // Build Expo message objects
    const messages = tokens.map(token => ({
      to:    token,
      title,
      body,
      sound: 'default',
    }));

    // Send in batches of EXPO_BATCH_MAX
    let sentCount  = 0;
    let failCount  = 0;
    const batchErrors = [];

    for (let i = 0; i < messages.length; i += EXPO_BATCH_MAX) {
      const batch = messages.slice(i, i + EXPO_BATCH_MAX);
      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body:    JSON.stringify(batch),
        });

        if (!response.ok) {
          const text = await response.text();
          batchErrors.push(`Batch ${Math.floor(i / EXPO_BATCH_MAX) + 1} HTTP ${response.status}: ${text}`);
          failCount += batch.length;
          continue;
        }

        const result = await response.json();
        // Expo returns { data: [ { status: 'ok' | 'error', ... } ] }
        for (const ticket of result.data || []) {
          ticket.status === 'ok' ? sentCount++ : failCount++;
        }
      } catch (batchErr) {
        batchErrors.push(`Batch ${Math.floor(i / EXPO_BATCH_MAX) + 1} fetch error: ${batchErr.message}`);
        failCount += batch.length;
      }
    }

    if (batchErrors.length) {
      console.error('📣 Notification batch errors:', batchErrors);
    }
    console.log(`📣 Admin notification (${target}): "${title}" — sent=${sentCount}, failed=${failCount}`);

    res.json({ ok: true, sent_to: sentCount, failed: failCount });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to send notification' });
  }
});

// GET /api/admin/buysell — all buy & sell items
router.get('/buysell', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, u.name AS seller_name, u.email AS seller_email
       FROM buysell_items b
       LEFT JOIN users u ON b.posted_by = u.id
       ORDER BY b.created_at DESC`
    );
    res.json({ ok: true, buysell: rows });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load buysell items' });
  }
});

module.exports = router;
