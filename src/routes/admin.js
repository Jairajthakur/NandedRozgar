const router = require('express').Router();
const { pool, cache } = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

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
  const safe = async (fn, fallback) => { try { return await fn(); } catch(e) { console.error('stats partial error:', e.message); return fallback; } };

  const [jobs, users, payments, apps, vehicles, rooms, buysell, revenue] = await Promise.all([
    safe(() => pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active')   AS active_jobs,
        COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_jobs,
        COUNT(*) FILTER (WHERE featured = true)     AS featured_jobs,
        COUNT(*) FILTER (WHERE urgent = true)       AS urgent_jobs,
        COALESCE(SUM(views),0)                      AS total_views,
        (SELECT COUNT(*) FROM applications)         AS total_applicants
      FROM jobs WHERE status != 'deleted'
    `), { rows: [{ active_jobs:0, inactive_jobs:0, featured_jobs:0, urgent_jobs:0, total_views:0, total_applicants:0 }] }),

    safe(() => pool.query(`
      SELECT
        COUNT(*)                              AS total_users,
        COUNT(*) FILTER (WHERE premium)       AS pro_users,
        COUNT(*) FILTER (WHERE NOT active)    AS banned_users,
        COUNT(*) FILTER (WHERE role='admin')  AS admin_users
      FROM users
    `), { rows: [{ total_users:0, pro_users:0, banned_users:0, admin_users:0 }] }),

    safe(() => pool.query(`SELECT COALESCE(SUM(amount),0) AS total_revenue FROM payments WHERE status='paid'`),
      { rows: [{ total_revenue: 0 }] }),

    safe(() => pool.query(`SELECT COUNT(*) AS total FROM applications`),
      { rows: [{ total: 0 }] }),

    safe(() => pool.query(`
      SELECT
        COUNT(*)                                    AS total_vehicles,
        COUNT(*) FILTER (WHERE status = 'active')   AS active_vehicles,
        COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_vehicles,
        COALESCE(SUM(CASE WHEN plan != 'free' THEN 1 ELSE 0 END), 0) AS paid_vehicle_listings
      FROM vehicles
    `), { rows: [{ total_vehicles:0, active_vehicles:0, inactive_vehicles:0, paid_vehicle_listings:0 }] }),

    safe(() => pool.query(`
      SELECT
        COUNT(*)                                    AS total_rooms,
        COUNT(*) FILTER (WHERE status = 'active')   AS active_rooms,
        COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_rooms,
        COALESCE(SUM(CASE WHEN plan != 'free' THEN 1 ELSE 0 END), 0) AS paid_room_listings
      FROM rooms
    `), { rows: [{ total_rooms:0, active_rooms:0, inactive_rooms:0, paid_room_listings:0 }] }),

    safe(() => pool.query(`
      SELECT
        COUNT(*)                                    AS total_buysell,
        COUNT(*) FILTER (WHERE status = 'active')   AS active_buysell,
        COUNT(*) FILTER (WHERE status = 'sold')     AS sold_buysell
      FROM buysell_items
    `), { rows: [{ total_buysell:0, active_buysell:0, sold_buysell:0 }] }),

    safe(() => pool.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE category = 'job' OR job_id IS NOT NULL), 0) AS jobs_revenue,
        COALESCE(SUM(amount) FILTER (WHERE category = 'vehicle'), 0)                    AS vehicles_revenue,
        COALESCE(SUM(amount) FILTER (WHERE category = 'room'), 0)                       AS rooms_revenue,
        COALESCE(SUM(amount) FILTER (WHERE category = 'buysell'), 0)                    AS buysell_revenue
      FROM payments WHERE status = 'paid'
    `), { rows: [{ jobs_revenue:0, vehicles_revenue:0, rooms_revenue:0, buysell_revenue:0 }] }),
  ]);

  res.json({
    ok: true,
    stats: {
      ...jobs.rows[0],
      ...users.rows[0],
      total_revenue:      payments.rows[0].total_revenue,
      total_applications: apps.rows[0].total,
      ...vehicles.rows[0],
      ...rooms.rows[0],
      ...buysell.rows[0],
      ...revenue.rows[0],
    },
  });
});

// GET /api/admin/debug — raw table counts for troubleshooting
router.get('/debug', async (req, res) => {
  try {
    const tables = ['users','jobs','applications','payments','vehicles','rooms','buysell_items'];
    const counts = {};
    for (const t of tables) {
      try {
        const r = await pool.query(`SELECT COUNT(*) AS n FROM ${t}`);
        counts[t] = parseInt(r.rows[0].n);
      } catch(e) {
        counts[t] = `ERROR: ${e.message}`;
      }
    }
    res.json({ ok: true, counts });
  } catch(err) {
    res.json({ ok: false, error: err.message });
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
router.delete('/buysell/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM buysell_items WHERE id = $1', [req.params.id]);
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
router.delete('/vehicles/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM vehicles WHERE id = $1', [req.params.id]);
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
router.delete('/rooms/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM rooms WHERE id = $1', [req.params.id]);
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

    if (!title || !rent || !whatsapp)
      return res.json({ ok: false, error: 'Title, rent and WhatsApp are required' });

    const cleanWhatsapp = String(whatsapp).replace(/\s+/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanWhatsapp))
      return res.json({ ok: false, error: 'Enter a valid 10-digit Indian mobile number' });

    const safePhotos = (Array.isArray(photos) ? photos : []).slice(0, 10);

    const { rows } = await pool.query(`
      INSERT INTO rooms (posted_by,title,type,bhk,rent,furnished,area,address,landmark,
                         owner_name,whatsapp,description,photos,plan,expires_at,district,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *
    `, [
      req.user.id, title, type || '', bhk || '', rent, furnished || '',
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

    if (!title || !price || !whatsapp)
      return res.json({ ok: false, error: 'Title, price and WhatsApp are required' });

    const cleanWhatsapp = String(whatsapp).replace(/\s+/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanWhatsapp))
      return res.json({ ok: false, error: 'Enter a valid 10-digit Indian mobile number' });

    const safePhotos = (Array.isArray(photos) ? photos : []).slice(0, 10);

    const { rows } = await pool.query(`
      INSERT INTO vehicles (posted_by,name,title,type,brand,model,year,km_driven,fuel,transmission,
                            price,area,address,owner_name,whatsapp,description,photos,plan,expires_at,district,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING *
    `, [
      req.user.id, title, title, type || '', brand || '', model || '', year || null, kmDriven || null,
      fuel || '', transmission || '', price, area || '', address || '', ownerName || '', cleanWhatsapp,
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

    if (!title || !price || !whatsapp)
      return res.json({ ok: false, error: 'Title, price and WhatsApp are required' });

    const cleanWhatsapp = String(whatsapp).replace(/\s+/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanWhatsapp))
      return res.json({ ok: false, error: 'Enter a valid 10-digit Indian mobile number' });

    const safePhotos = (Array.isArray(photos) ? photos : []).slice(0, 10);

    const { rows } = await pool.query(`
      INSERT INTO buysell_items (posted_by,title,category,condition,age,price,negotiable,
                                 area,description,whatsapp,photos,plan_label,plan_days,expires_at,district,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *
    `, [
      req.user.id, title, category || 'Other', condition || 'Good', age || '',
      price, negotiable !== false && negotiable !== 'false', area || '', description || '', cleanWhatsapp,
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

module.exports = router;
