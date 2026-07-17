const router = require('express').Router();
const { pool, cache } = require('../db');
const { auth, adminOnly } = require('../middleware/auth');
const { sendPushNotifications } = require('../utils/push');

// ── Admin direct-post constants ───────────────────────────────────────────────
const ADMIN_EXPIRY_DAYS = 365;

function adminExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + ADMIN_EXPIRY_DAYS);
  return d;
}

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
    // Evict auth cache so a banned user loses access immediately (not after 60 s TTL)
    await cache.del(`auth:${req.params.id}`);
    // LOOPHOLE FIX: banning previously only evicted the auth cache. Every
    // labour_profiles read is now gated on users.active, but cached
    // listings/wage-board/leaderboard/detail responses generated *before*
    // the ban could still serve a banned worker for up to their TTL
    // (15-30 min for the wage board). Flush them so the ban takes effect
    // immediately across the labour marketplace too.
    await cache.delPrefix('labour:');
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

// GET /api/admin/payments/unmatched — Cashfree confirmed SUCCESS via webhook,
// but the app never wrote a matching row into `payments` (client-side /verify
// call never happened — app killed, deep link back into the app failed, tab
// closed right after paying, etc). These are payments that took the
// customer's money but never became a listing/wallet-credit/subscription in
// the app. Cross-check against the Cashfree Dashboard using order_id, then
// either manually complete the listing or refund via Cashfree.
router.get('/payments/unmatched', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, order_id, event_type, payment_status, amount, cf_payment_id,
             customer_email, customer_phone, created_at
      FROM cashfree_webhook_events
      WHERE payment_status = 'SUCCESS' AND matched = FALSE
      ORDER BY created_at DESC
      LIMIT 200
    `);
    res.json({ ok: true, unmatched: rows });
  } catch (err) {
    console.error('GET /admin/payments/unmatched error:', err);
    res.json({ ok: false, error: 'Failed to load unmatched payments' });
  }
});

// ─── STATS ────────────────────────────────────────────────────────────────────

// GET /api/admin/stats — aggregate platform stats
// FIX: Each query is wrapped in safe() so a single table error doesn't zero-out
// all stats. Errors are logged server-side with the specific query that failed.
router.get('/stats', async (req, res) => {
  const safe = async (label, fn, fallback) => {
    try { return await fn(); }
    catch(e) {
      console.error(`[admin/stats] "${label}" query failed:`, e.message);
      return fallback;
    }
  };

  const [jobs, users, payments, apps, vehicles, rooms, buysell, revenue] = await Promise.all([
    safe('jobs', () => pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active')   AS active_jobs,
        COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_jobs,
        COUNT(*) FILTER (WHERE featured = true)     AS featured_jobs,
        COUNT(*) FILTER (WHERE urgent = true)       AS urgent_jobs,
        COALESCE(SUM(views),0)                      AS total_views,
        (SELECT COUNT(*) FROM applications)         AS total_applicants
      FROM jobs WHERE status != 'deleted'
    `), { rows: [{ active_jobs:0, inactive_jobs:0, featured_jobs:0, urgent_jobs:0, total_views:0, total_applicants:0 }] }),

    safe('users', () => pool.query(`
      SELECT
        COUNT(*)                              AS total_users,
        COUNT(*) FILTER (WHERE premium)       AS pro_users,
        COUNT(*) FILTER (WHERE NOT active)    AS banned_users,
        COUNT(*) FILTER (WHERE role='admin')  AS admin_users
      FROM users
    `), { rows: [{ total_users:0, pro_users:0, banned_users:0, admin_users:0 }] }),

    safe('payments_total', () => pool.query(`SELECT COALESCE(SUM(amount),0) AS total_revenue FROM payments WHERE status='paid'`),
      { rows: [{ total_revenue: 0 }] }),

    safe('applications', () => pool.query(`SELECT COUNT(*) AS total FROM applications`),
      { rows: [{ total: 0 }] }),

    safe('vehicles', () => pool.query(`
      SELECT
        COUNT(*)                                    AS total_vehicles,
        COUNT(*) FILTER (WHERE status = 'active')   AS active_vehicles,
        COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_vehicles,
        COALESCE(SUM(CASE WHEN plan != 'free' THEN 1 ELSE 0 END), 0) AS paid_vehicle_listings
      FROM vehicles
    `), { rows: [{ total_vehicles:0, active_vehicles:0, inactive_vehicles:0, paid_vehicle_listings:0 }] }),

    safe('rooms', () => pool.query(`
      SELECT
        COUNT(*)                                    AS total_rooms,
        COUNT(*) FILTER (WHERE status = 'active')   AS active_rooms,
        COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_rooms,
        COALESCE(SUM(CASE WHEN plan != 'free' THEN 1 ELSE 0 END), 0) AS paid_room_listings
      FROM rooms
    `), { rows: [{ total_rooms:0, active_rooms:0, inactive_rooms:0, paid_room_listings:0 }] }),

    safe('buysell', () => pool.query(`
      SELECT
        COUNT(*)                                    AS total_buysell,
        COUNT(*) FILTER (WHERE status = 'active')   AS active_buysell,
        COUNT(*) FILTER (WHERE status = 'sold')     AS sold_buysell
      FROM buysell_items
    `), { rows: [{ total_buysell:0, active_buysell:0, sold_buysell:0 }] }),

    safe('revenue_breakdown', () => pool.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE category = 'job' OR job_id IS NOT NULL), 0) AS jobs_revenue,
        COALESCE(SUM(amount) FILTER (WHERE category = 'vehicle'), 0)                    AS vehicles_revenue,
        COALESCE(SUM(amount) FILTER (WHERE category = 'room'), 0)                       AS rooms_revenue,
        COALESCE(SUM(amount) FILTER (WHERE category = 'buysell'), 0)                    AS buysell_revenue
      FROM payments WHERE status = 'paid'
    `), { rows: [{ jobs_revenue:0, vehicles_revenue:0, rooms_revenue:0, buysell_revenue:0 }] }),
  ]);

  const stats = {
    ...jobs.rows[0],
    ...users.rows[0],
    total_revenue:      payments.rows[0].total_revenue,
    total_applications: apps.rows[0].total,
    ...vehicles.rows[0],
    ...rooms.rows[0],
    ...buysell.rows[0],
    ...revenue.rows[0],
  };

  // Cast all numeric fields from strings (Postgres bigint/numeric comes as string)
  const numericFields = [
    'active_jobs','inactive_jobs','featured_jobs','urgent_jobs','total_views','total_applicants',
    'total_users','pro_users','banned_users','admin_users','total_revenue',
    'total_applications','total_vehicles','active_vehicles','inactive_vehicles','paid_vehicle_listings',
    'total_rooms','active_rooms','inactive_rooms','paid_room_listings',
    'total_buysell','active_buysell','sold_buysell',
    'jobs_revenue','vehicles_revenue','rooms_revenue','buysell_revenue',
  ];
  for (const f of numericFields) {
    if (stats[f] !== undefined) stats[f] = Number(stats[f]) || 0;
  }

  res.json({ ok: true, stats });
});

// GET /api/admin/debug — raw table counts for troubleshooting
// FIX (High): Raw Postgres error messages leaked table structure, column names, and
// constraint details. Now sanitised to a generic message; full detail is server-side only.
router.get('/debug', async (req, res) => {
  try {
    const tables = ['users','jobs','applications','payments','vehicles','rooms','buysell_items'];
    const counts = {};
    for (const t of tables) {
      try {
        const r = await pool.query(`SELECT COUNT(*) AS n FROM ${t}`);
        counts[t] = parseInt(r.rows[0].n);
      } catch(e) {
        console.error(`[admin/debug] query failed for table "${t}":`, e.message);
        counts[t] = 'query failed'; // FIX: never expose raw DB error to client
      }
    }
    res.json({ ok: true, counts });
  } catch(err) {
    console.error('[admin/debug] unexpected error:', err.message);
    res.json({ ok: false, error: 'Debug query failed' }); // FIX: sanitised
  }
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

// POST /api/admin/notifications — send push notification via Firebase (FCM)
//
// Targets users by push_token (stored in users.push_token, a raw FCM device
// token saved via POST /api/auth/save-push-token). Delivered through Firebase
// Admin's messaging API — NOT Expo's push API, since the tokens we collect
// are raw FCM tokens, not Expo-format tokens. See src/utils/push.js.
// Returns { ok, sent_to, failed } so the admin sees accurate delivery counts.
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

    const { sent, failed, invalidTokens } = await sendPushNotifications(tokens, { title, body });

    // House-keeping: clear dead/unregistered tokens so future sends don't
    // keep wasting batches on devices that uninstalled the app or expired.
    if (invalidTokens.length) {
      await pool.query('UPDATE users SET push_token = NULL WHERE push_token = ANY($1)', [invalidTokens])
        .catch(e => console.warn('[admin/notifications] failed to clear invalid tokens:', e.message));
    }

    console.log(`📣 Admin notification (${target}): "${title}" — sent=${sent}, failed=${failed}`);
    res.json({ ok: true, sent_to: sent, failed });
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
       WHERE b.status != 'deleted'
       ORDER BY b.created_at DESC`
    );
    res.json({ ok: true, buysell: rows });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load buysell items' });
  }
});

// PATCH /api/admin/buysell/:id/status
router.patch('/buysell/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive', 'sold'].includes(status)) {
      return res.json({ ok: false, error: 'Invalid status' });
    }
    await pool.query('UPDATE buysell_items SET status = $1 WHERE id = $2', [status, req.params.id]);
    // Clear all buysell caches so users see updated status immediately
    await cache.delPrefix('buysell:');
    await cache.delPrefix('buysell_count:');
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to update buysell status' });
  }
});

// DELETE /api/admin/buysell/:id
// BUG FIX: Changed from hard DELETE to soft-delete (status = 'deleted').
// Hard deletes are unrecoverable — a misclick by an admin permanently destroys
// a paid listing and its payment record association. Soft-delete matches the
// jobs pattern, allows audit-trail recovery, and keeps FK integrity intact.
router.delete('/buysell/:id', async (req, res) => {
  try {
    await pool.query("UPDATE buysell_items SET status = 'deleted' WHERE id = $1", [req.params.id]);
    await cache.delPrefix('buysell:');
    await cache.delPrefix('buysell_count:');
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to delete buysell item' });
  }
});

// ─── VEHICLES (CAR RENT) ──────────────────────────────────────────────────────

// GET /api/admin/vehicles — all vehicle listings
router.get('/vehicles', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT v.*, u.name AS poster_name, u.email AS poster_email
       FROM vehicles v
       LEFT JOIN users u ON v.posted_by = u.id
       WHERE v.status != 'deleted'
       ORDER BY v.created_at DESC`
    );
    res.json({ ok: true, vehicles: rows });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load vehicles' });
  }
});

// PATCH /api/admin/vehicles/:id/status
router.patch('/vehicles/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.json({ ok: false, error: 'Invalid status' });
    }
    await pool.query('UPDATE vehicles SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to update vehicle status' });
  }
});

// DELETE /api/admin/vehicles/:id
// BUG FIX: Changed from hard DELETE to soft-delete (status = 'deleted').
// Same reasoning as buysell: hard deletes are unrecoverable, break audit
// trails, and are inconsistent with the jobs soft-delete pattern.
router.delete('/vehicles/:id', async (req, res) => {
  try {
    await pool.query("UPDATE vehicles SET status = 'deleted' WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to delete vehicle' });
  }
});

// ─── ROOMS (HOME/PG) ──────────────────────────────────────────────────────────

// GET /api/admin/rooms — all room listings
router.get('/rooms', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, u.name AS poster_name, u.email AS poster_email
       FROM rooms r
       LEFT JOIN users u ON r.posted_by = u.id
       WHERE r.status != 'deleted'
       ORDER BY r.created_at DESC`
    );
    res.json({ ok: true, rooms: rows });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load rooms' });
  }
});

// PATCH /api/admin/rooms/:id/status
router.patch('/rooms/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.json({ ok: false, error: 'Invalid status' });
    }
    await pool.query('UPDATE rooms SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to update room status' });
  }
});

// DELETE /api/admin/rooms/:id
// BUG FIX: Changed from hard DELETE to soft-delete (status = 'deleted').
// Same reasoning as buysell and vehicles above.
router.delete('/rooms/:id', async (req, res) => {
  try {
    await pool.query("UPDATE rooms SET status = 'deleted' WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to delete room' });
  }
});


// ─── ACTIVITY LOGS ────────────────────────────────────────────────────────────

// GET /api/admin/logs?page=1&limit=50&action=login&status=failed
// DELETE /api/admin/logs/test-cleanup — removes admin_test entries
router.delete('/logs/test-cleanup', async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM activity_logs WHERE action = 'admin_test'");
    res.json({ ok: true, deleted: result.rowCount });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(200, parseInt(req.query.limit) || 50);
    const offset = (page - 1) * limit;
    const action = req.query.action || null;
    const status = req.query.status || null;
    const search = req.query.search || null;

    const conditions = [];
    const params = [];

    if (action) { params.push(action); conditions.push(`l.action = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`l.status = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR l.detail ILIKE $${params.length} OR l.ip ILIKE $${params.length})`);
    }

    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
    const countParams = [...params];
    params.push(limit, offset);

    const [countRes, dataRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM activity_logs l LEFT JOIN users u ON u.id = l.user_id ${where}`, countParams),
      pool.query(`
        SELECT l.*, u.name AS user_name, u.email AS user_email
        FROM activity_logs l
        LEFT JOIN users u ON u.id = l.user_id
        ${where}
        ORDER BY l.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `, params),
    ]);

    res.json({ ok: true, logs: dataRes.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: "Failed to load logs" });
  }
});

// GET /api/admin/analytics — charts data (last 30 days)
router.get("/analytics", async (req, res) => {
  const safe = async (fn, fallback) => { try { return await fn(); } catch(e) { return fallback; } };

  const [signups, logins, loginFails, jobsChart, paymentsChart, topActions] = await Promise.all([
    safe(() => pool.query(`SELECT DATE(created_at) AS day, COUNT(*) AS count FROM users WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY day ORDER BY day`), { rows: [] }),
    safe(() => pool.query(`SELECT DATE(created_at) AS day, COUNT(*) AS count FROM activity_logs WHERE action = 'login' AND created_at >= NOW() - INTERVAL '30 days' GROUP BY day ORDER BY day`), { rows: [] }),
    safe(() => pool.query(`SELECT DATE(created_at) AS day, COUNT(*) AS count FROM activity_logs WHERE action IN ('login_failed','login_blocked') AND created_at >= NOW() - INTERVAL '30 days' GROUP BY day ORDER BY day`), { rows: [] }),
    safe(() => pool.query(`SELECT DATE(created_at) AS day, COUNT(*) AS count FROM jobs WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY day ORDER BY day`), { rows: [] }),
    safe(() => pool.query(`SELECT DATE(created_at) AS day, COALESCE(SUM(amount),0) AS total FROM payments WHERE status='paid' AND created_at >= NOW() - INTERVAL '30 days' GROUP BY day ORDER BY day`), { rows: [] }),
    safe(() => pool.query(`SELECT action, COUNT(*) AS count FROM activity_logs WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY action ORDER BY count DESC LIMIT 10`), { rows: [] }),
  ]);

  res.json({
    ok: true,
    signups:        signups.rows,
    logins:         logins.rows,
    login_fails:    loginFails.rows,
    jobs_chart:     jobsChart.rows,
    payments_chart: paymentsChart.rows,
    top_actions:    topActions.rows,
  });
});


// ── ADMIN DIRECT POSTING (no payment required) ───────────────────────────────
// All routes below bypass the free-check and payment gateway entirely.
// Admin posts get plan='admin', featured=true, 365-day expiry.

// POST /api/admin/post/job
router.post('/post/job', async (req, res) => {
  try {
    const {
      title, company, category, type, location, salary,
      phone, whatsapp, description, skills, requirements,
      education, experience, hours, openings, fresherOk, district,
    } = req.body;

    if (!title || !category || !location)
      return res.json({ ok: false, error: 'Title, category and location are required' });

    const skillsArr = Array.isArray(skills) ? skills
      : typeof skills === 'string' && skills.trim() ? skills.split(',').map(s => s.trim()).filter(Boolean) : [];
    const reqArr = Array.isArray(requirements) ? requirements
      : typeof requirements === 'string' && requirements.trim() ? requirements.split('\n').map(r => r.trim()).filter(Boolean) : [];

    const { rows } = await pool.query(`
      INSERT INTO jobs (
        posted_by, title, company, category, type, location, salary,
        phone, whatsapp, description, skills, requirements,
        education, experience, hours, openings,
        featured, urgent, fresher_ok, expires_at, district, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING *
    `, [
      req.user.id, title, company || '', category, type || 'Full-time', location, salary || '',
      phone || '', whatsapp || phone || '', description || '', skillsArr, reqArr,
      education || '', experience || '', hours || '', openings || '1',
      true, false, !!fresherOk, adminExpiry(),
      district || 'nanded', 'active',
    ]);

    await cache.delPrefix('jobs:');
    res.json({ ok: true, job: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to post job' });
  }
});

// POST /api/admin/post/room
router.post('/post/room', async (req, res) => {
  try {
    const {
      title, type, bhk, rent, furnished, area, address,
      landmark, ownerName, whatsapp, description, photos, district,
    } = req.body;

    if (!title || !whatsapp)
      return res.json({ ok: false, error: 'Title and WhatsApp are required' });

    const cleanWhatsapp = String(whatsapp).replace(/\s+/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanWhatsapp))
      return res.json({ ok: false, error: 'Enter a valid 10-digit Indian mobile number' });

    const safePhotos = (Array.isArray(photos) ? photos : []).slice(0, 10);
    const cleanRent = (rent === undefined || rent === null || String(rent).trim() === '')
      ? null : parseInt(rent, 10);

    const { rows } = await pool.query(`
      INSERT INTO rooms (posted_by,title,type,bhk,rent,furnished,area,address,landmark,
                         owner_name,whatsapp,description,photos,plan,expires_at,district,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *
    `, [
      req.user.id, title, type || '', bhk || '', cleanRent, furnished || '',
      area || '', address || '', landmark || '', ownerName || '', cleanWhatsapp,
      description || '', JSON.stringify(safePhotos),
      'admin', adminExpiry(), district || 'nanded', 'active',
    ]);

    await cache.delPrefix('rooms:');
    res.json({ ok: true, room: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to post room' });
  }
});

// POST /api/admin/post/vehicle
router.post('/post/vehicle', async (req, res) => {
  try {
    const {
      title, type, brand, model, year, kmDriven, fuel, transmission,
      price, area, address, ownerName, whatsapp, description, photos, district,
    } = req.body;

    if (!title || !whatsapp)
      return res.json({ ok: false, error: 'Title and WhatsApp are required' });

    const cleanWhatsapp = String(whatsapp).replace(/\s+/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanWhatsapp))
      return res.json({ ok: false, error: 'Enter a valid 10-digit Indian mobile number' });

    const safePhotos = (Array.isArray(photos) ? photos : []).slice(0, 10);
    const cleanPrice = (price === undefined || price === null || String(price).trim() === '')
      ? null : parseInt(price, 10);

    const { rows } = await pool.query(`
      INSERT INTO vehicles (posted_by,name,title,type,brand,model,year,km_driven,fuel,transmission,
                            price,area,address,owner_name,whatsapp,description,photos,plan,expires_at,district,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING *
    `, [
      req.user.id, title, title, type || '', brand || '', model || '', year || null, kmDriven || null,
      fuel || '', transmission || '', cleanPrice, area || '', address || '', ownerName || '', cleanWhatsapp,
      description || '', JSON.stringify(safePhotos),
      'admin', adminExpiry(), district || 'nanded', 'active',
    ]);

    await cache.delPrefix('vehicles:');
    res.json({ ok: true, vehicle: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to post vehicle' });
  }
});

// POST /api/admin/post/buysell
router.post('/post/buysell', async (req, res) => {
  try {
    const {
      title, category, condition, age, price, negotiable,
      area, description, whatsapp, photos, district,
    } = req.body;

    if (!title || !whatsapp)
      return res.json({ ok: false, error: 'Title and WhatsApp are required' });

    const cleanWhatsapp = String(whatsapp).replace(/\s+/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanWhatsapp))
      return res.json({ ok: false, error: 'Enter a valid 10-digit Indian mobile number' });

    const safePhotos = (Array.isArray(photos) ? photos : []).slice(0, 10);
    const cleanPrice = (price === undefined || price === null || String(price).trim() === '')
      ? null : parseInt(price, 10);

    const { rows } = await pool.query(`
      INSERT INTO buysell_items (posted_by,title,category,condition,age,price,negotiable,
                                 area,description,whatsapp,photos,plan_label,plan_days,expires_at,district,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *
    `, [
      req.user.id, title, category || 'Other', condition || 'Good', age || '',
      cleanPrice, negotiable !== false && negotiable !== 'false', area || '', description || '', cleanWhatsapp,
      JSON.stringify(safePhotos),
      'admin', ADMIN_EXPIRY_DAYS, adminExpiry(), district || 'nanded', 'active',
    ]);

    await cache.delPrefix('buysell:');
    await cache.delPrefix('buysell_count:');
    res.json({ ok: true, item: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to post item' });
  }
});

// POST /api/admin/post/project
// Our team posts a contractor's Project on their behalf (see PostProjectScreen —
// contractors send details over WhatsApp, including photos of the site/work,
// and staff post the finished listing here). contractor_id is the admin's own
// user id, same as how job/room/vehicle/buysell admin-posts work.
router.post('/post/project', async (req, res) => {
  try {
    const {
      title, description, skillCategory, district, location,
      workersNeeded, durationDays, dailyWage, budget, photos,
    } = req.body;

    if (!title || !String(title).trim())
      return res.json({ ok: false, error: 'Title is required' });

    const needed = parseInt(workersNeeded, 10) || 1;
    if (needed < 1)
      return res.json({ ok: false, error: 'Workers needed must be at least 1' });

    const duration = durationDays !== undefined && durationDays !== '' ? parseInt(durationDays, 10) || null : null;
    const wage = dailyWage !== undefined && dailyWage !== '' ? parseInt(dailyWage, 10) || null : null;
    const autoBudget = wage && duration ? needed * wage * duration : null;
    const finalBudget = (budget !== undefined && budget !== '') ? (parseFloat(budget) || null) : autoBudget;
    const safePhotos = (Array.isArray(photos) ? photos : []).slice(0, 10);

    const { rows } = await pool.query(`
      INSERT INTO labour_projects
        (contractor_id, title, description, skill_category, district, location,
         workers_needed, duration_days, daily_wage, budget, photos, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `, [
      req.user.id,
      String(title).trim().slice(0, 150),
      description || '',
      skillCategory || '',
      district || 'nanded',
      location || '',
      needed,
      duration,
      wage,
      finalBudget,
      JSON.stringify(safePhotos),
      'active',
    ]);

    await cache.delPrefix('projects:public:');
    res.json({ ok: true, project: rows[0] });
  } catch (err) {
    console.error('POST /admin/post/project error:', err);
    res.json({ ok: false, error: 'Failed to post project' });
  }
});

// ── POST /api/admin/post/banner ───────────────────────────────────────────────
// Admin can post a free promotional banner directly (bypasses payment).
// Supports two modes:
//   1. Image banner: provide bannerImage URL — shown as a full image in the app
//   2. Layout banner: provide bizName + fields — rendered using a colour template
router.post('/post/banner', async (req, res) => {
  try {
    const {
      bannerImage,
      bizName, tagline, phone, category, location,
      address, website, description, timing,
      bannerStyle, accentColor,
    } = req.body;

    // Image banner only needs the image URL (+ optional phone/website for tap action)
    const isImageBanner = !!bannerImage;

    if (!isImageBanner) {
      if (!bizName?.trim())   return res.json({ ok: false, error: 'Business name is required.' });
      if (!phone?.trim())     return res.json({ ok: false, error: 'Contact number is required.' });
      if (!category?.trim())  return res.json({ ok: false, error: 'Category is required.' });
      if (!location?.trim())  return res.json({ ok: false, error: 'Location is required.' });
    }

    const BANNER_COLORS = { bold: '#e82828', clean: '#f97316', vivid: '#f97316' };
    const style     = bannerStyle || 'bold';
    const color     = accentColor || BANNER_COLORS[style] || '#f97316';
    const expiresAt = adminExpiry();
    // business_name is the original NOT NULL column; biz_name is the newer alias added via ALTER
    const safeBizName = (bizName || '').trim() || 'Admin Banner';

    const { rows } = await pool.query(
      `INSERT INTO business_promotions
         (user_id, biz_name, tagline, phone, category, location, address,
          website, description, timing, plan, plan_price, plan_days,
          banner_style, accent_color, banner_image, status, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'admin',0,${ADMIN_EXPIRY_DAYS},$11,$12,$13,'active',$14)
       RETURNING *`,
      [
        req.user.id,
        safeBizName,
        tagline?.trim() || null,
        (phone || '').trim() || '',
        (category || '').trim() || 'General',
        (location || '').trim() || null,
        address?.trim() || null,
        website?.trim() || null,
        description?.trim() || null,
        timing?.trim() || null,
        style, color,
        bannerImage || null,
        expiresAt,
      ]
    );

    res.json({ ok: true, banner: rows[0] });
  } catch (err) {
    console.error('POST /admin/post/banner error:', err);
    res.status(500).json({ ok: false, error: err.message || 'Failed to post banner. Please try again.' });
  }
});

// ── GET /api/admin/banners ─────────────────────────────────────────────────────
// List all banners (all statuses) for admin management.
router.get('/banners', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, biz_name, plan, status, banner_image, banner_style, expires_at, created_at
       FROM business_promotions
       ORDER BY created_at DESC`
    );
    const banners = rows.map(b => ({
      ...b,
      banner_image: b.banner_image
        ? (b.banner_image.startsWith('http') || b.banner_image.startsWith('data:')
            ? b.banner_image
            : 'https://thecityplus.in' + b.banner_image)
        : null,
    }));
    res.json({ ok: true, banners });
  } catch (err) {
    console.error('GET /admin/banners error:', err);
    res.status(500).json({ ok: false, error: 'Failed to load banners.' });
  }
});

// ── DELETE /api/admin/banners/:id ─────────────────────────────────────────────
// Admin can delete any promotional banner.
router.delete('/banners/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM business_promotions WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /admin/banners/:id error:', err);
    res.status(500).json({ ok: false, error: 'Failed to delete banner.' });
  }
});

// ── PATCH /api/admin/banners/:id/status ───────────────────────────────────────
// Admin can toggle a banner's status (active / paused / expired).
router.patch('/banners/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'paused', 'expired'].includes(status))
      return res.json({ ok: false, error: 'Invalid status value.' });

    const { rows } = await pool.query(
      'UPDATE business_promotions SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (!rows.length) return res.json({ ok: false, error: 'Banner not found.' });
    res.json({ ok: true, banner: rows[0] });
  } catch (err) {
    console.error('PATCH /admin/banners/:id/status error:', err);
    res.status(500).json({ ok: false, error: 'Failed to update banner status.' });
  }
});

// ─── LABOUR PROFILES ─────────────────────────────────────────────────────────

// GET /api/admin/labour — all labour profiles, for the moderation table.
// This was previously missing entirely, which is why labourers never showed
// up anywhere in the admin web panel even though jobs/vehicles/rooms/buysell
// all had one of these.
router.get('/labour', async (req, res) => {
  try {
    // booking_count / completed_count give the admin, at a glance, how many
    // times each labourer has actually been booked (hire_requests rows) —
    // not just whether their profile exists. LEFT JOIN + COUNT so labourers
    // with zero hires still show up with 0 rather than being dropped.
    const { rows } = await pool.query(
      `SELECT l.*, u.name AS poster_name, u.email AS poster_email, u.phone AS poster_phone,
              COALESCE(hr.booking_count, 0)   AS booking_count,
              COALESCE(hr.completed_count, 0) AS completed_count
       FROM labour_profiles l
       LEFT JOIN users u ON l.user_id = u.id
       LEFT JOIN (
         SELECT labour_id,
                COUNT(*)                                    AS booking_count,
                COUNT(*) FILTER (WHERE status = 'completed') AS completed_count
         FROM hire_requests
         GROUP BY labour_id
       ) hr ON hr.labour_id = l.id
       ORDER BY l.created_at DESC`
    );
    res.json({ ok: true, labour: rows });
  } catch (err) {
    console.error('GET /admin/labour error:', err);
    res.json({ ok: false, error: 'Failed to load labour profiles' });
  }
});

// PATCH /api/admin/labour/:id/status — active / hidden / banned
router.patch('/labour/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'hidden', 'banned'].includes(status)) {
      return res.json({ ok: false, error: 'Invalid status' });
    }
    await pool.query('UPDATE labour_profiles SET status = $1 WHERE id = $2', [status, req.params.id]);
    await cache.delPrefix('labour:');
    res.json({ ok: true });
  } catch (err) {
    console.error('PATCH /admin/labour/:id/status error:', err);
    res.json({ ok: false, error: 'Failed to update labour status' });
  }
});

// DELETE /api/admin/labour/:id
// NOTE: unlike jobs/vehicles/rooms/buysell, labour_profiles.status has a CHECK
// constraint of only ('active','hidden','banned') — there's no 'deleted'
// state to soft-delete into. All labour-related tables (hire requests,
// ratings, payouts, etc.) reference labour_profiles(id) ON DELETE CASCADE,
// so a real delete here is safe and was already the intended design.
router.delete('/labour/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM labour_profiles WHERE id = $1', [req.params.id]);
    await cache.delPrefix('labour:');
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /admin/labour/:id error:', err);
    res.json({ ok: false, error: 'Failed to delete labour profile' });
  }
});

// GET /api/admin/labour/stats — the full labour dashboard: how many workers
// are active, how many have been hired, and a today / this-week / this-month
// / last-month breakdown of new profiles, hires, and platform revenue.
//
// Period boundaries are computed once in JS (not in SQL) so "today" and
// "this week" are anchored to the exact same instant across every query
// below — computing NOW() separately per query risks a period boundary
// shifting mid-request right at midnight.
//
// Hire counts/revenue per period are read from the immutable event logs
// (wallet_transactions for the hire-fee charge, labour_payouts for the
// commission payout, hire_requests.completed_at for completions) rather
// than the mutable hire_requests.status column — a row's *current* status
// can't tell you when a past event happened, only what state it's in now.
router.get('/labour/stats', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = (now.getDay() + 6) % 7; // Mon=0..Sun=6, so week starts on Monday
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - dayOfWeek);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const periods = [todayStart, weekStart, monthStart, lastMonthStart, monthStart];
    // $1=today $2=weekStart $3=monthStart $4=lastMonthStart $5=lastMonthEnd(=monthStart)

    const safe = async (label, fn, fallback) => {
      try { return await fn(); }
      catch (e) { console.error(`[admin/labour/stats] "${label}" query failed:`, e.message); return fallback; }
    };

    const zeroPeriod = { today: 0, this_week: 0, this_month: 0, last_month: 0 };

    const [profiles, profilesByPeriod, hireStatus, hiresByPeriod, completedByPeriod, revenueByPeriod, topSkills, topDistricts] = await Promise.all([
      safe('profiles', () => pool.query(`
        SELECT
          COUNT(*)                                     AS total,
          COUNT(*) FILTER (WHERE status = 'active')    AS active,
          COUNT(*) FILTER (WHERE status = 'hidden')    AS hidden,
          COUNT(*) FILTER (WHERE status = 'banned')    AS banned,
          COUNT(*) FILTER (WHERE id_verified)          AS verified,
          COUNT(*) FILTER (WHERE is_available_now)     AS available_now
        FROM labour_profiles
      `), { rows: [{ total: 0, active: 0, hidden: 0, banned: 0, verified: 0, available_now: 0 }] }),

      safe('profilesByPeriod', () => pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE created_at >= $1)                    AS today,
          COUNT(*) FILTER (WHERE created_at >= $2)                    AS this_week,
          COUNT(*) FILTER (WHERE created_at >= $3)                    AS this_month,
          COUNT(*) FILTER (WHERE created_at >= $4 AND created_at < $5) AS last_month
        FROM labour_profiles
      `, periods), { rows: [zeroPeriod] }),

      safe('hireStatus', () => pool.query(`
        SELECT
          COUNT(*)                                       AS total,
          COUNT(*) FILTER (WHERE status = 'pending')     AS pending,
          COUNT(*) FILTER (WHERE status = 'accepted')     AS accepted,
          COUNT(*) FILTER (WHERE status = 'completed')    AS completed,
          COUNT(*) FILTER (WHERE status = 'declined')     AS declined,
          COUNT(*) FILTER (WHERE status = 'cancelled')    AS cancelled
        FROM hire_requests
      `), { rows: [{ total: 0, pending: 0, accepted: 0, completed: 0, declined: 0, cancelled: 0 }] }),

      // "Hired" = the hire fee was actually charged (request accepted), read
      // from the wallet ledger so this is a true per-period event count.
      safe('hiresByPeriod', () => pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE created_at >= $1)                     AS today,
          COUNT(*) FILTER (WHERE created_at >= $2)                     AS this_week,
          COUNT(*) FILTER (WHERE created_at >= $3)                     AS this_month,
          COUNT(*) FILTER (WHERE created_at >= $4 AND created_at < $5) AS last_month
        FROM wallet_transactions WHERE reason = 'labour_hire_fee'
      `, periods), { rows: [zeroPeriod] }),

      safe('completedByPeriod', () => pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE completed_at >= $1)                     AS today,
          COUNT(*) FILTER (WHERE completed_at >= $2)                     AS this_week,
          COUNT(*) FILTER (WHERE completed_at >= $3)                     AS this_month,
          COUNT(*) FILTER (WHERE completed_at >= $4 AND completed_at < $5) AS last_month
        FROM hire_requests WHERE status = 'completed'
      `, periods), { rows: [zeroPeriod] }),

      // Platform revenue = hire fee collected minus commission paid out,
      // per period — same ₹10-in / ₹5-out / ₹5-kept split used everywhere
      // else, just bucketed by time here instead of a rolling window.
      safe('revenueByPeriod', () => pool.query(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE created_at >= $1), 0)                     AS today,
          COALESCE(SUM(amount) FILTER (WHERE created_at >= $2), 0)                     AS this_week,
          COALESCE(SUM(amount) FILTER (WHERE created_at >= $3), 0)                     AS this_month,
          COALESCE(SUM(amount) FILTER (WHERE created_at >= $4 AND created_at < $5), 0) AS last_month
        FROM wallet_transactions WHERE reason = 'labour_hire_fee'
      `, periods), { rows: [zeroPeriod] }),

      safe('topSkills', () => pool.query(`
        SELECT skill_category, COUNT(*) AS count
        FROM labour_profiles WHERE status = 'active'
        GROUP BY skill_category ORDER BY count DESC LIMIT 5
      `), { rows: [] }),

      safe('topDistricts', () => pool.query(`
        SELECT district, COUNT(*) AS count
        FROM labour_profiles WHERE status = 'active'
        GROUP BY district ORDER BY count DESC LIMIT 5
      `), { rows: [] }),
    ]);

    const commissionByPeriod = await safe('commissionByPeriod', () => pool.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE created_at >= $1), 0)                     AS today,
        COALESCE(SUM(amount) FILTER (WHERE created_at >= $2), 0)                     AS this_week,
        COALESCE(SUM(amount) FILTER (WHERE created_at >= $3), 0)                     AS this_month,
        COALESCE(SUM(amount) FILTER (WHERE created_at >= $4 AND created_at < $5), 0) AS last_month
      FROM labour_payouts WHERE source = 'hire_fee'
    `, periods), { rows: [zeroPeriod] });

    const toNum = (row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, Number(v) || 0]));
    const gross = toNum(revenueByPeriod.rows[0]);
    const commission = toNum(commissionByPeriod.rows[0]);
    const platformRevenue = Object.fromEntries(Object.keys(gross).map(k => [k, gross[k] - commission[k]]));

    res.json({
      ok: true,
      profiles: toNum(profiles.rows[0]),
      profilesByPeriod: toNum(profilesByPeriod.rows[0]),
      hireStatus: toNum(hireStatus.rows[0]),
      hiresByPeriod: toNum(hiresByPeriod.rows[0]),
      completedByPeriod: toNum(completedByPeriod.rows[0]),
      grossFeesByPeriod: gross,
      commissionByPeriod: commission,
      platformRevenueByPeriod: platformRevenue,
      topSkills: topSkills.rows,
      topDistricts: topDistricts.rows,
    });
  } catch (err) {
    console.error('GET /admin/labour/stats error:', err);
    res.json({ ok: false, error: 'Failed to load labour stats' });
  }
});

// ── LABOUR MONTHLY TOP-3 REWARD ────────────────────────────────────────────────
// Cash prize for the month's top 3 workers by completed/accepted hire count
// (same ranking already shown on LeaderboardStrip): 1st ₹1500, 2nd ₹1000,
// 3rd ₹500. No cron — this is an admin-triggered action, safe to run more
// than once for the same month (idempotent via bonus_period).
const MONTHLY_REWARD_AMOUNTS = [1500, 1000, 500];

function currentMonthPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function rankTopWorkersForMonth(period) {
  // period is 'YYYY-MM' — build the month's date range from it rather than
  // trusting CURRENT_DATE, so admins can also settle a just-finished month.
  const [y, m] = period.split('-').map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 1);

  const { rows } = await pool.query(`
    SELECT l.id AS labour_profile_id, l.user_id AS labour_user_id,
           l.full_name, l.skill_category, l.photo_url,
           COUNT(hr.id)::int AS hire_count
    FROM hire_requests hr
    JOIN labour_profiles l ON l.id = hr.labour_id
    JOIN users u ON u.id = l.user_id
    WHERE hr.status IN ('accepted', 'completed')
      AND hr.created_at >= $1 AND hr.created_at < $2
      AND u.active = true
    GROUP BY l.id, l.user_id, l.full_name, l.skill_category, l.photo_url
    ORDER BY hire_count DESC, l.id ASC
    LIMIT 3
  `, [monthStart, monthEnd]);
  return rows;
}

// GET /api/admin/labour/monthly-reward?period=2026-07 — preview who *would*
// be paid without crediting anything. Defaults to the current month.
router.get('/labour/monthly-reward', async (req, res) => {
  try {
    const period = req.query.period || currentMonthPeriod();
    const top = await rankTopWorkersForMonth(period);

    const { rows: alreadyPaid } = await pool.query(
      `SELECT labour_user_id, amount FROM labour_payouts WHERE bonus_period = $1`,
      [period]
    );
    const paidUserIds = new Set(alreadyPaid.map(r => r.labour_user_id));

    res.json({
      ok: true,
      period,
      winners: top.map((w, i) => ({
        ...w,
        rank: i + 1,
        amount: MONTHLY_REWARD_AMOUNTS[i],
        alreadyPaid: paidUserIds.has(w.labour_user_id),
      })),
    });
  } catch (err) {
    console.error('GET /admin/labour/monthly-reward error:', err);
    res.json({ ok: false, error: 'Failed to load monthly reward preview' });
  }
});

// POST /api/admin/labour/monthly-reward { period? } — actually credits the
// top 3 for that month. ₹1500 / ₹1000 / ₹500 land straight in 'available'
// status (no hold — this is a prize, not a disputable hire), so it shows up
// in the worker's withdrawable balance immediately. Re-running this for a
// period that's already been paid changes nothing (ON CONFLICT DO NOTHING).
router.post('/labour/monthly-reward', async (req, res) => {
  const client = await pool.connect();
  try {
    const period = req.body?.period || currentMonthPeriod();
    const top = await rankTopWorkersForMonth(period);

    if (!top.length) {
      return res.json({ ok: true, period, credited: [] });
    }

    await client.query('BEGIN');
    const credited = [];
    for (let i = 0; i < top.length; i++) {
      const winner = top[i];
      const amount = MONTHLY_REWARD_AMOUNTS[i];
      const { rows } = await client.query(`
        INSERT INTO labour_payouts (labour_user_id, amount, status, available_at, source, bonus_period)
        VALUES ($1, $2, 'available', NOW(), 'monthly_bonus', $3)
        ON CONFLICT (labour_user_id, bonus_period) DO NOTHING
        RETURNING id
      `, [winner.labour_user_id, amount, period]);

      if (rows.length) {
        credited.push({ rank: i + 1, labour_user_id: winner.labour_user_id, full_name: winner.full_name, amount });
      }
    }
    await client.query('COMMIT');

    res.json({ ok: true, period, credited, skipped: top.length - credited.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /admin/labour/monthly-reward error:', err);
    res.json({ ok: false, error: 'Failed to credit monthly reward' });
  } finally {
    client.release();
  }
});

// ── LABOUR EARNINGS PIPELINE ──────────────────────────────────────────────────


// GET /api/admin/labour/revenue — gross hire fees collected vs commissions
// paid out vs net platform revenue, plus a snapshot of money currently sitting
// in each payout stage. `since` optionally filters to the last N days.
router.get('/labour/revenue', async (req, res) => {
  try {
    const days = Math.max(1, parseInt(req.query.days) || 30);

    const { rows: feeRows } = await pool.query(
      `SELECT reason, COALESCE(SUM(amount), 0) AS total, COUNT(*)::int AS n
       FROM wallet_transactions
       WHERE reason IN ('labour_hire_fee', 'labour_contact_unlock') AND created_at >= NOW() - ($1 || ' days')::interval
       GROUP BY reason`,
      [days]
    );
    const { rows: commissionRows } = await pool.query(
      `SELECT source, COALESCE(SUM(amount), 0) AS total, COUNT(*)::int AS n
       FROM labour_payouts
       WHERE created_at >= NOW() - ($1 || ' days')::interval
       GROUP BY source`,
      [days]
    );
    const { rows: stageRows } = await pool.query(`
      SELECT status, COALESCE(SUM(amount), 0) AS total FROM labour_payouts GROUP BY status
    `);
    const { rows: withdrawalRows } = await pool.query(`
      SELECT status, COALESCE(SUM(amount), 0) AS total, COUNT(*)::int AS n
      FROM labour_withdrawals GROUP BY status
    `);

    const feeByReason = Object.fromEntries(feeRows.map(r => [r.reason, { total: parseFloat(r.total), count: r.n }]));
    const commissionBySource = Object.fromEntries(commissionRows.map(r => [r.source, { total: parseFloat(r.total), count: r.n }]));

    const grossFees = (feeByReason.labour_hire_fee?.total || 0) + (feeByReason.labour_contact_unlock?.total || 0);
    const commissions = (commissionBySource.hire_fee?.total || 0) + (commissionBySource.contact_unlock?.total || 0);

    res.json({
      ok: true,
      periodDays: days,
      grossFees,
      commissionsOwed: commissions,
      netRevenue: grossFees - commissions,
      // Breakdown so it's clear how much of the revenue/commission is coming
      // from contact unlocks (₹10/day, ₹5 commission) vs hire completions
      // (₹10 flat, ₹5 commission).
      byType: {
        contactUnlock: {
          grossFees: feeByReason.labour_contact_unlock?.total || 0,
          unlocks: feeByReason.labour_contact_unlock?.count || 0,
          commissions: commissionBySource.contact_unlock?.total || 0,
        },
        hireCompletion: {
          grossFees: feeByReason.labour_hire_fee?.total || 0,
          hires: feeByReason.labour_hire_fee?.count || 0,
          commissions: commissionBySource.hire_fee?.total || 0,
          completions: commissionBySource.hire_fee?.count || 0,
        },
      },
      payoutStages: Object.fromEntries(stageRows.map(r => [r.status, parseFloat(r.total)])),
      withdrawals: Object.fromEntries(withdrawalRows.map(r => [r.status, { total: parseFloat(r.total), count: r.n }])),
    });
  } catch (err) {
    console.error('GET /admin/labour/revenue error:', err);
    res.status(500).json({ ok: false, error: 'Failed to load labour revenue.' });
  }
});

// GET /api/admin/labour/withdrawals — queue of withdrawal requests to process,
// filterable by status (defaults to 'requested' — the actionable queue).
router.get('/labour/withdrawals', async (req, res) => {
  try {
    const status = req.query.status || 'requested';
    const { rows } = await pool.query(`
      SELECT w.*, u.name AS labourer_name, u.phone AS labourer_phone
      FROM labour_withdrawals w JOIN users u ON u.id = w.user_id
      WHERE w.status = $1
      ORDER BY w.requested_at ASC
    `, [status]);
    res.json({ ok: true, withdrawals: rows });
  } catch (err) {
    console.error('GET /admin/labour/withdrawals error:', err);
    res.status(500).json({ ok: false, error: 'Failed to load withdrawals.' });
  }
});

// PATCH /api/admin/labour/withdrawals/:id — mark a withdrawal paid (with UTR)
// or rejected (which releases the claimed payout rows back to 'available' so
// the labourer can request again rather than the money vanishing).
router.patch('/labour/withdrawals/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status, utrReference, adminNote } = req.body;
    if (!['paid', 'rejected'].includes(status)) {
      return res.status(400).json({ ok: false, error: "Status must be 'paid' or 'rejected'." });
    }
    if (status === 'paid' && !utrReference) {
      return res.status(400).json({ ok: false, error: 'UTR reference is required to mark a withdrawal paid.' });
    }

    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE labour_withdrawals SET status = $1, utr_reference = $2, admin_note = $3, processed_at = NOW()
       WHERE id = $4 AND status = 'requested' RETURNING *`,
      [status, utrReference || null, adminNote || null, id]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, error: 'Withdrawal not found or already processed.' });
    }

    if (status === 'paid') {
      await client.query(`UPDATE labour_payouts SET status = 'paid' WHERE withdrawal_id = $1`, [id]);
    } else {
      // Rejected: release the money back to 'available' so it isn't stuck.
      await client.query(
        `UPDATE labour_payouts SET status = 'available', withdrawal_id = NULL WHERE withdrawal_id = $1`,
        [id]
      );
    }

    await client.query('COMMIT');
    res.json({ ok: true, withdrawal: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('PATCH /admin/labour/withdrawals/:id error:', err);
    res.status(500).json({ ok: false, error: 'Failed to process withdrawal.' });
  } finally {
    client.release();
  }
});

// GET /api/admin/labour/rewards — queue of milestone rewards (ID card @ 5
// bookings, T-shirt @ 10) to fulfill, filterable by status (defaults to
// 'pending' — the actionable queue).
router.get('/labour/rewards', async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const { rows } = await pool.query(`
      SELECT r.*, u.name AS labourer_name, u.phone AS labourer_phone,
             lp.full_name, lp.location, lp.photo_url
      FROM labour_milestone_rewards r
      JOIN labour_profiles lp ON lp.id = r.labour_id
      JOIN users u ON u.id = lp.user_id
      WHERE r.status = $1
      ORDER BY r.achieved_at ASC
    `, [status]);
    res.json({ ok: true, rewards: rows });
  } catch (err) {
    console.error('GET /admin/labour/rewards error:', err);
    res.status(500).json({ ok: false, error: 'Failed to load rewards.' });
  }
});

// PATCH /api/admin/labour/rewards/:id — mark a reward issued once the ID
// card/T-shirt has actually been handed to the worker.
router.patch('/labour/rewards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `UPDATE labour_milestone_rewards SET status = 'issued', issued_at = NOW(), issued_by = $1
       WHERE id = $2 AND status = 'pending' RETURNING *`,
      [req.user.id, id]
    );
    if (!rows.length) {
      return res.status(404).json({ ok: false, error: 'Reward not found or already issued.' });
    }
    res.json({ ok: true, reward: rows[0] });
  } catch (err) {
    console.error('PATCH /admin/labour/rewards/:id error:', err);
    res.status(500).json({ ok: false, error: 'Failed to update reward.' });
  }
});

module.exports = router;
