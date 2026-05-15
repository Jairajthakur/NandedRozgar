const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// POST /api/payments — record payment and create job
router.post('/', auth, async (req, res) => {
  try {
    const { job, plan, days, amount } = req.body;

    // 1. Save payment record
    const payment = await pool.query(
      `INSERT INTO payments (user_id, amount, plan, status) VALUES ($1, $2, $3, 'paid') RETURNING *`,
      [req.user.id, amount, plan]
    );

    // 2. Create the job — use the plan's actual days, NOT hardcoded 30
    const planDays = parseInt(days) || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + planDays);

    const { rows } = await pool.query(`
      INSERT INTO jobs (posted_by, title, company, category, type, location, salary, phone, description, featured, urgent, expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `, [
      req.user.id,
      job.title, job.company, job.category, job.type || 'Full-time',
      job.location, job.salary, job.phone, job.description,
      !!job.featured, !!job.urgent, expiresAt
    ]);

    // 3. Link payment to job
    await pool.query('UPDATE payments SET job_id = $1 WHERE id = $2', [rows[0].id, payment.rows[0].id]);

    res.json({ ok: true, job: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Payment processing failed' });
  }
});

module.exports = router;
