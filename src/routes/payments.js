const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// FIX #4 — Server-side plan price catalog. The client NEVER controls the amount.
// These values must match what is shown in the mobile app's constants.js.
const PLAN_CATALOG = {
  job: {
    7:  49,
    15: 79,
    30: 119,
  },
  car: {
    15: 69,
    30: 99,
    60: 169,
    90: 229,
  },
  room: {
    15: 69,
    30: 99,
    60: 169,
    90: 229,
  },
  buysell: {
    7:  39,
    15: 59,
    30: 89,
  },
};

function lookupPrice(type, days) {
  const catalog = PLAN_CATALOG[type];
  if (!catalog) return null;
  const price = catalog[parseInt(days)];
  return price !== undefined ? price : null;
}

// POST /api/payments — verify payment and create job
// NOTE: In production this endpoint should only be called AFTER a server-side
// webhook from your payment gateway (Razorpay/Stripe) confirms payment success.
// The current implementation records a payment as pending until verified.
router.post('/', auth, async (req, res) => {
  try {
    const { job, planType, days, gatewayRef } = req.body;

    // FIX #4 — Look up the authoritative price server-side; reject unknown plans
    const resolvedType = planType || 'job';
    const serverAmount = lookupPrice(resolvedType, days);
    if (serverAmount === null) {
      return res.status(400).json({ ok: false, error: 'Invalid plan selection' });
    }

    // FIX #4 — Record as 'pending'; mark 'paid' only after gateway webhook confirms
    const payment = await pool.query(
      `INSERT INTO payments (user_id, amount, plan, status, gateway_ref)
       VALUES ($1, $2, $3, 'pending', $4) RETURNING *`,
      [req.user.id, serverAmount, resolvedType, gatewayRef || null]
    );

    // TODO: Do not create the job here. Instead, create it inside the Razorpay/Stripe
    // webhook handler once payment status is confirmed as 'paid'. The code below
    // is retained for development/testing only and should be removed in production.
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
      !!job.featured, !!job.urgent, expiresAt,
    ]);

    await pool.query('UPDATE payments SET job_id = $1 WHERE id = $2', [rows[0].id, payment.rows[0].id]);

    res.json({ ok: true, job: rows[0] });
  } catch (err) {
    console.error('payments error:', err.message);
    res.status(500).json({ ok: false, error: 'Payment processing failed' });
  }
});

module.exports = router;
