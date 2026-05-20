const router = require('express').Router();
const crypto = require('crypto');
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// ── Razorpay setup ────────────────────────────────────────────────────────────
// Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your Railway environment variables.
// Get them from: https://dashboard.razorpay.com/app/keys
let Razorpay;
try {
  Razorpay = require('razorpay');
} catch {
  Razorpay = null;
}

function getRazorpay() {
  if (!Razorpay || !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// POST /api/payments/order — create a Razorpay order (step 1)
// Client calls this to get an order_id before showing the Razorpay checkout modal.
router.post('/order', auth, async (req, res) => {
  try {
    const { amount, plan } = req.body; // amount in paise (e.g., 9900 = ₹99)

    if (!amount || amount < 0) {
      return res.json({ ok: false, error: 'Invalid amount' });
    }

    // Free plan — no payment needed
    if (amount === 0) {
      return res.json({ ok: true, free: true });
    }

    const rzp = getRazorpay();
    if (!rzp) {
      return res.json({
        ok: false,
        error: 'Payment gateway not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to Railway.',
      });
    }

    const order = await rzp.orders.create({
      amount,           // in paise
      currency: 'INR',
      receipt: `rcpt_${req.user.id}_${Date.now()}`,
      notes: { plan, userId: req.user.id },
    });

    res.json({ ok: true, orderId: order.id, amount, currency: 'INR' });
  } catch (err) {
    console.error('Razorpay order error:', err);
    res.json({ ok: false, error: 'Failed to create payment order' });
  }
});

// POST /api/payments/verify — verify Razorpay signature, then create the job (step 2)
// IMPORTANT: Never trust the client saying "payment succeeded" — always verify the signature.
router.post('/verify', auth, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      job,
      plan,
      amount,
      days,
    } = req.body;

    // ── Free plan: no signature needed ───────────────────────────────────────
    if (!razorpay_order_id && amount === 0) {
      return createJobAfterPayment(req, res, { job, plan: 'free', amount: 0, days, paymentId: null });
    }

    // ── Verify Razorpay signature ─────────────────────────────────────────────
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.json({ ok: false, error: 'Missing payment verification fields' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.json({ ok: false, error: 'Payment gateway not configured on server' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.warn('⚠️  Invalid Razorpay signature for user', req.user.id);
      return res.json({ ok: false, error: 'Payment verification failed. Please contact support.' });
    }
    // ── Signature verified — safe to proceed ─────────────────────────────────

    return createJobAfterPayment(req, res, {
      job, plan, amount, days,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    });

  } catch (err) {
    console.error('Payment verify error:', err);
    res.json({ ok: false, error: 'Payment processing failed' });
  }
});

async function createJobAfterPayment(req, res, { job, plan, amount, days, paymentId, orderId }) {
  try {
    const planDays = parseInt(days) || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + planDays);

    // Save payment record
    const paymentRow = await pool.query(
      `INSERT INTO payments (user_id, amount, plan, razorpay_payment_id, razorpay_order_id, status)
       VALUES ($1, $2, $3, $4, $5, 'paid') RETURNING *`,
      [req.user.id, amount, plan, paymentId || null, orderId || null]
    );

    // Normalise skills/requirements
    const skillsArr = Array.isArray(job.skills)
      ? job.skills
      : typeof job.skills === 'string' && job.skills.trim()
        ? job.skills.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    const reqArr = Array.isArray(job.requirements)
      ? job.requirements
      : typeof job.requirements === 'string' && job.requirements.trim()
        ? job.requirements.split('\n').map(r => r.trim()).filter(Boolean)
        : [];

    // Create the job
    const { rows } = await pool.query(`
      INSERT INTO jobs (
        posted_by, title, company, category, type, location, salary,
        phone, whatsapp, description, skills, requirements,
        education, experience, hours, openings,
        featured, urgent, expires_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *
    `, [
      req.user.id,
      job.title, job.company, job.category,
      job.type || 'Full-time', job.location, job.salary || '',
      job.phone, job.whatsapp || job.phone, job.description,
      skillsArr, reqArr,
      job.education || '', job.experience || '', job.hours || '', job.openings || '1',
      !!job.featured, !!job.urgent, expiresAt,
    ]);

    // Link payment to job
    await pool.query('UPDATE payments SET job_id = $1 WHERE id = $2', [rows[0].id, paymentRow.rows[0].id]);

    res.json({ ok: true, job: rows[0] });
  } catch (err) {
    console.error('createJobAfterPayment error:', err);
    res.json({ ok: false, error: 'Failed to create job after payment' });
  }
}

module.exports = router;
