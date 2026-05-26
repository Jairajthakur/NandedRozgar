/**
 * coupons.js — Coupon / promo-code routes
 *
 * POST /api/coupons/validate          — Check a code & return discount info
 * POST /api/coupons/mark-used         — Record usage after successful payment
 *
 * Admin (requires admin role):
 * GET  /api/coupons                   — List all coupons
 * POST /api/coupons                   — Create a coupon
 * PATCH /api/coupons/:id              — Update a coupon
 * DELETE /api/coupons/:id             — Delete a coupon
 */

const router   = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// ── Helper: fetch user role ───────────────────────────────────────────────────
async function isAdmin(userId) {
  const { rows } = await pool.query('SELECT role FROM users WHERE id=$1', [userId]);
  return rows[0]?.role === 'admin';
}

// ── POST /api/coupons/validate ────────────────────────────────────────────────
// Body: { code, listingType, originalAmount }
// Returns: { ok, discount: { type, value, finalAmount, label } }
router.post('/validate', auth, async (req, res) => {
  try {
    const { code, listingType = 'job', originalAmount = 0 } = req.body;

    if (!code?.trim()) return res.json({ ok: false, error: 'Please enter a coupon code.' });

    const { rows } = await pool.query(`
      SELECT * FROM coupon_codes
      WHERE UPPER(code) = UPPER($1)
        AND is_active = TRUE
        AND (valid_from  IS NULL OR valid_from  <= NOW())
        AND (valid_until IS NULL OR valid_until >= NOW())
        AND (max_uses    IS NULL OR uses_count  < max_uses)
    `, [code.trim()]);

    if (!rows.length) {
      return res.json({ ok: false, error: 'Invalid or expired coupon code.' });
    }

    const coupon = rows[0];

    // Check if applies_to restricts listing type
    if (coupon.applies_to?.length > 0 && !coupon.applies_to.includes(listingType)) {
      return res.json({ ok: false, error: `This coupon is not valid for ${listingType} listings.` });
    }

    // Check if user already used this coupon
    const { rows: usageRows } = await pool.query(
      'SELECT id FROM coupon_usage WHERE coupon_id=$1 AND user_id=$2',
      [coupon.id, req.user.id]
    );
    if (usageRows.length) {
      return res.json({ ok: false, error: 'You have already used this coupon.' });
    }

    // Calculate discount
    let finalAmount = originalAmount;
    let extraDays   = 0;
    let label = '';

    if (coupon.type === 'percent') {
      const discount = Math.round((originalAmount * coupon.value) / 100);
      finalAmount = Math.max(0, originalAmount - discount);
      label = `${coupon.value}% OFF`;
    } else if (coupon.type === 'flat') {
      finalAmount = Math.max(0, originalAmount - coupon.value);
      label = `₹${coupon.value} OFF`;
    } else if (coupon.type === 'free_days') {
      // free_days adds bonus days to the listing — the payment amount is unchanged
      extraDays = coupon.value;
      label = `+${coupon.value} Bonus Days`;
    }

    res.json({
      ok: true,
      coupon: {
        id:          coupon.id,
        code:        coupon.code,
        type:        coupon.type,
        value:       coupon.value,
        finalAmount,
        extraDays,
        label,
      },
    });
  } catch (err) {
    console.error('coupon validate error:', err);
    res.json({ ok: false, error: 'Failed to validate coupon.' });
  }
});

// ── POST /api/coupons/mark-used ───────────────────────────────────────────────
// SECURITY FIX (Bug #1 + #6):
//   Original: any authenticated user could POST { couponId: X } to mark any
//   coupon as used without having completed a payment — exhausting max_uses and
//   inflating uses_count for free.  Also never re-validated the coupon's
//   active/date/max_uses state before recording usage.
//
//   Fix: the caller MUST supply the razorpay_payment_id (or the sentinel
//   "free" for ₹0 orders) from the payment that used this coupon.  We verify
//   inside a single transaction that:
//     1. The coupon is still active and within its valid window.
//     2. A payments row owned by this user references that payment ID.
//     3. The user has not already used this coupon (idempotent re-call is ok).
//   Only then is usage recorded.
//
// Body: { couponId, paymentId }   paymentId = razorpay_payment_id | "free"
router.post('/mark-used', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { couponId, paymentId } = req.body;
    if (!couponId)  return res.json({ ok: false, error: 'couponId required.' });
    if (!paymentId) return res.json({ ok: false, error: 'paymentId required.' });

    await client.query('BEGIN');

    // 1. Re-validate the coupon is still live (Bug #6 fix)
    const { rows: cr } = await client.query(
      `SELECT id FROM coupon_codes
       WHERE id = $1
         AND is_active = TRUE
         AND (valid_from  IS NULL OR valid_from  <= NOW())
         AND (valid_until IS NULL OR valid_until >= NOW())
         AND (max_uses    IS NULL OR uses_count   < max_uses)`,
      [couponId]
    );
    if (!cr.length) {
      await client.query('ROLLBACK');
      return res.json({ ok: false, error: 'Coupon is no longer valid.' });
    }

    // 2. Verify the payment belongs to this user (Bug #1 fix)
    if (paymentId !== 'free') {
      const { rows: pr } = await client.query(
        `SELECT id FROM payments
         WHERE user_id = $1
           AND razorpay_payment_id = $2
         LIMIT 1`,
        [req.user.id, paymentId]
      );
      if (!pr.length) {
        await client.query('ROLLBACK');
        return res.json({ ok: false, error: 'No matching payment found for this coupon.' });
      }
    } else {
      // Free-plan: confirm user has at least one ₹0 payment row
      const { rows: fp } = await client.query(
        `SELECT id FROM payments
         WHERE user_id = $1
           AND razorpay_payment_id IS NULL
           AND amount = 0
         ORDER BY created_at DESC
         LIMIT 1`,
        [req.user.id]
      );
      if (!fp.length) {
        await client.query('ROLLBACK');
        return res.json({ ok: false, error: 'No matching free-plan payment found.' });
      }
    }

    // 3. Record usage (idempotent — ignore if already inserted)
    const { rowCount } = await client.query(
      `INSERT INTO coupon_usage (coupon_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [couponId, req.user.id]
    );

    // Only increment counter when we actually inserted a new row
    if (rowCount > 0) {
      await client.query(
        `UPDATE coupon_codes SET uses_count = uses_count + 1 WHERE id = $1`,
        [couponId]
      );
    }

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('coupon mark-used error:', err);
    res.json({ ok: false, error: 'Failed to record coupon usage.' });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ADMIN routes
// ════════════════════════════════════════════════════════════════════════════

// GET /api/coupons — list all
router.get('/', auth, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) return res.json({ ok: false, error: 'Unauthorized.' });
    const { rows } = await pool.query('SELECT * FROM coupon_codes ORDER BY created_at DESC');
    res.json({ ok: true, coupons: rows });
  } catch (err) {
    console.error('coupons list error:', err);
    res.json({ ok: false, error: 'Failed to fetch coupons.' });
  }
});

// POST /api/coupons — create
// Body: { code, type, value, maxUses, validUntil, appliesTo }
router.post('/', auth, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) return res.json({ ok: false, error: 'Unauthorized.' });

    const { code, type, value, maxUses, validUntil, appliesTo = [] } = req.body;

    if (!code?.trim())             return res.json({ ok: false, error: 'Code is required.' });
    if (!['percent','flat','free_days'].includes(type))
                                   return res.json({ ok: false, error: 'Invalid type.' });
    if (!value || value <= 0)      return res.json({ ok: false, error: 'Value must be > 0.' });

    const { rows } = await pool.query(`
      INSERT INTO coupon_codes (code, type, value, max_uses, valid_until, applies_to)
      VALUES (UPPER($1), $2, $3, $4, $5, $6)
      RETURNING *
    `, [code.trim(), type, value, maxUses || null, validUntil || null, appliesTo]);

    res.json({ ok: true, coupon: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.json({ ok: false, error: 'Coupon code already exists.' });
    console.error('coupon create error:', err);
    res.json({ ok: false, error: 'Failed to create coupon.' });
  }
});

// PATCH /api/coupons/:id — update
router.patch('/:id', auth, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) return res.json({ ok: false, error: 'Unauthorized.' });

    const { isActive, maxUses, validUntil } = req.body;
    const { rows } = await pool.query(`
      UPDATE coupon_codes
      SET is_active   = COALESCE($1, is_active),
          max_uses    = COALESCE($2, max_uses),
          valid_until = COALESCE($3, valid_until)
      WHERE id = $4 RETURNING *
    `, [isActive, maxUses || null, validUntil || null, req.params.id]);

    if (!rows.length) return res.json({ ok: false, error: 'Coupon not found.' });
    res.json({ ok: true, coupon: rows[0] });
  } catch (err) {
    console.error('coupon update error:', err);
    res.json({ ok: false, error: 'Failed to update coupon.' });
  }
});

// DELETE /api/coupons/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) return res.json({ ok: false, error: 'Unauthorized.' });
    await pool.query('DELETE FROM coupon_codes WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('coupon delete error:', err);
    res.json({ ok: false, error: 'Failed to delete coupon.' });
  }
});

module.exports = router;
