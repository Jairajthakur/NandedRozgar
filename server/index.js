const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'nandedrozgar_secret_2024';

// ── DATABASE ──
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ── MIDDLEWARE ──
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// ── AUTH MIDDLEWARE ──
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

// ═══════════════════════════════════════
//  AUTH ROUTES
// ═══════════════════════════════════════

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, company } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'Missing fields' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const avatar = name[0].toUpperCase();

    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, phone, company, avatar, location, active, premium)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'Nanded',true,false) RETURNING *`,
      [name, email, hash, role, phone || '', company || '', avatar]
    );
    const user = sanitizeUser(result.rows[0]);
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ ok: true, user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    // Admin check
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      const adminUser = { id: 'admin_001', name: 'NandedRozgar Admin', email, role: 'admin', active: true, avatar: 'A', premium: false };
      const token = jwt.sign({ id: 'admin_001', role: 'admin' }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({ ok: true, user: adminUser, token });
    }

    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });
    if (!user.active) return res.status(403).json({ error: 'Account suspended. Contact support.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ ok: true, user: sanitizeUser(user), token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.json({ ok: true, user: { id: 'admin_001', name: 'NandedRozgar Admin', role: 'admin', active: true, avatar: 'A', premium: false } });
    }
    const result = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true, user: sanitizeUser(result.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════
//  JOB ROUTES
// ═══════════════════════════════════════

// GET /api/jobs
app.get('/api/jobs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT j.*, u.name as poster_name, u.company as poster_company, u.avatar as poster_avatar,
        (SELECT COUNT(*) FROM applications WHERE job_id=j.id) as applicant_count,
        (SELECT COUNT(*) FROM saved_jobs WHERE job_id=j.id) as saved_count
      FROM jobs j
      LEFT JOIN users u ON j.posted_by = u.id
      WHERE j.status != 'deleted'
      ORDER BY (j.featured::int*2 + j.urgent::int) DESC, j.created_at DESC
    `);
    res.json({ ok: true, jobs: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/jobs
app.post('/api/jobs', auth, async (req, res) => {
  try {
    if (req.user.role === 'seeker') return res.status(403).json({ error: 'Seekers cannot post jobs' });
    const { title, company, category, location, salary, type, phone, description, featured, urgent } = req.body;
    if (!title || !company || !location || !phone || !description || !salary) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await pool.query(
      `INSERT INTO jobs (title, company, category, location, salary, type, phone, description, featured, urgent, posted_by, status, views)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',0) RETURNING *`,
      [title, company, category || 'Other', location, salary, type || 'Full-time', phone, description, !!featured, !!urgent, req.user.id]
    );
    res.json({ ok: true, job: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/jobs/:id
app.get('/api/jobs/:id', async (req, res) => {
  try {
    // Increment view count
    await pool.query('UPDATE jobs SET views = views + 1 WHERE id=$1', [req.params.id]);
    const result = await pool.query(`
      SELECT j.*, u.name as poster_name, u.company as poster_company, u.avatar as poster_avatar
      FROM jobs j LEFT JOIN users u ON j.posted_by=u.id WHERE j.id=$1
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Job not found' });
    res.json({ ok: true, job: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/jobs/:id
app.delete('/api/jobs/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM jobs WHERE id=$1', [req.params.id]);
    const job = result.rows[0];
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (req.user.role !== 'admin' && job.posted_by !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    await pool.query("UPDATE jobs SET status='deleted' WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════
//  APPLICATION ROUTES
// ═══════════════════════════════════════

// POST /api/jobs/:id/apply
app.post('/api/jobs/:id/apply', auth, async (req, res) => {
  try {
    const existing = await pool.query('SELECT id FROM applications WHERE job_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (existing.rows.length > 0) return res.json({ ok: true, already: true });
    await pool.query('INSERT INTO applications (job_id, user_id) VALUES ($1,$2)', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/jobs/:id/save
app.post('/api/jobs/:id/save', auth, async (req, res) => {
  try {
    const existing = await pool.query('SELECT id FROM saved_jobs WHERE job_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM saved_jobs WHERE job_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
      return res.json({ ok: true, saved: false });
    }
    await pool.query('INSERT INTO saved_jobs (job_id, user_id) VALUES ($1,$2)', [req.params.id, req.user.id]);
    res.json({ ok: true, saved: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/me/applications
app.get('/api/me/applications', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT j.* FROM jobs j
      INNER JOIN applications a ON a.job_id=j.id
      WHERE a.user_id=$1 AND j.status!='deleted'
      ORDER BY a.created_at DESC
    `, [req.user.id]);
    res.json({ ok: true, jobs: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/me/saved
app.get('/api/me/saved', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT j.* FROM jobs j
      INNER JOIN saved_jobs s ON s.job_id=j.id
      WHERE s.user_id=$1 AND j.status!='deleted'
      ORDER BY s.created_at DESC
    `, [req.user.id]);
    res.json({ ok: true, jobs: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════
//  PAYMENT ROUTES
// ═══════════════════════════════════════

// POST /api/payments
app.post('/api/payments', auth, async (req, res) => {
  try {
    const { plan, amount, description, jobData } = req.body;
    // Record transaction
    await pool.query(
      `INSERT INTO transactions (user_id, plan, amount, description, status, method)
       VALUES ($1,$2,$3,$4,'success','card')`,
      [req.user.id, plan, amount, description]
    );
    // Grant PRO if plan is PRO
    if (plan === 'pro_monthly' || plan === 'pro_quarterly') {
      const months = plan === 'pro_quarterly' ? 3 : 1;
      const expiry = new Date(Date.now() + months * 30 * 86400000);
      await pool.query('UPDATE users SET premium=true, plan_expiry=$1 WHERE id=$2', [expiry, req.user.id]);
    }
    // If posting a job, create it
    let job = null;
    if (plan === 'boost' && jobData) {
      const r = await pool.query(
        `INSERT INTO jobs (title, company, category, location, salary, type, phone, description, featured, urgent, posted_by, status, views)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',0) RETURNING *`,
        [jobData.title, jobData.company, jobData.category || 'Other', jobData.location, jobData.salary, jobData.type || 'Full-time', jobData.phone, jobData.description, !!jobData.featured, !!jobData.urgent, req.user.id]
      );
      job = r.rows[0];
    }
    res.json({ ok: true, txnId: 'TXN' + Date.now(), job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/me/transactions
app.get('/api/me/transactions', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE user_id=$1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ ok: true, transactions: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════
//  ADMIN ROUTES
// ═══════════════════════════════════════

// GET /api/admin/users
app.get('/api/admin/users', auth, adminOnly, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    res.json({ ok: true, users: result.rows.map(sanitizeUser) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/users/:id/toggle
app.patch('/api/admin/users/:id/toggle', auth, adminOnly, async (req, res) => {
  try {
    const result = await pool.query('UPDATE users SET active=NOT active WHERE id=$1 RETURNING *', [req.params.id]);
    res.json({ ok: true, user: sanitizeUser(result.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/users/:id/grant-pro
app.patch('/api/admin/users/:id/grant-pro', auth, adminOnly, async (req, res) => {
  try {
    const expiry = new Date(Date.now() + 30 * 86400000);
    await pool.query('UPDATE users SET premium=true, plan_expiry=$1 WHERE id=$2', [expiry, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/jobs/:id/status
app.patch('/api/admin/jobs/:id/status', auth, adminOnly, async (req, res) => {
  try {
    await pool.query('UPDATE jobs SET status=$1 WHERE id=$2', [req.body.status, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/transactions
app.get('/api/admin/transactions', auth, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, u.name as user_name FROM transactions t
      LEFT JOIN users u ON t.user_id=u.id
      ORDER BY t.created_at DESC
    `);
    res.json({ ok: true, transactions: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── CATCH ALL → serve frontend ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// ── HELPERS ──
function sanitizeUser(u) {
  const { password, ...safe } = u;
  return safe;
}

// ── START ──
app.listen(PORT, () => console.log(`NandedRozgar server running on port ${PORT}`));
