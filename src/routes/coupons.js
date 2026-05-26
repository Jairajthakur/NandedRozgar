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
// Called after payment is verified to record usage
// Body: { couponId }
router.post('/mark-used', auth, async (req, res) => {
  try {
    const { couponId } = req.body;
    if (!couponId) return res.json({ ok: false, error: 'couponId required.' });

    // Insert usage (ignore if duplicate)
    await pool.query(
      `INSERT INTO coupon_usage (coupon_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [couponId, req.user.id]
    );

    // Increment counter
    await pool.query(
      `UPDATE coupon_codes SET uses_count = uses_count + 1 WHERE id = $1`,
      [couponId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('coupon mark-used error:', err);
    res.json({ ok: false, error: 'Failed to record coupon usage.' });
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
