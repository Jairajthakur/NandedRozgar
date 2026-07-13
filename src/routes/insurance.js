/**
 * routes/insurance.js — Micro-Insurance ("₹5/day accident cover")
 *
 * A worker flips a toggle on for sites they consider risky. While active,
 * a lazy daily charge (same pattern as labour_profiles.checked_in_until —
 * no cron needed) debits ₹5 from wallet_balance once per calendar day and
 * records it, so the worker has proof of exactly which days were covered
 * if they ever need to make a claim with the partner insurer.
 *
 * This is the in-app toggle + ledger only — wiring an actual underwriting
 * partner's claims API is a business integration outside this app's scope,
 * but the activation/coverage-day record is what a partner would need.
 *
 * Mounted at /api/insurance in src/index.js.
 */
const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

const DAILY_PREMIUM = 5;

// Charges today's premium if insurance is active and today hasn't been
// charged yet. Best-effort: if the wallet can't cover it, auto-deactivates
// rather than letting the balance go negative or silently not charging.
async function chargeTodayIfNeeded(userId) {
  const { rows: userRows } = await pool.query(
    'SELECT labour_insurance_active, wallet_balance FROM users WHERE id = $1', [userId]
  );
  if (!userRows.length || !userRows[0].labour_insurance_active) return { charged: false };

  const today = new Date().toISOString().slice(0, 10);
  const { rows: existing } = await pool.query(
    'SELECT id FROM labour_insurance_charges WHERE user_id = $1 AND charge_date = $2', [userId, today]
  );
  if (existing.length) return { charged: false, alreadyCharged: true };

  const balance = parseFloat(userRows[0].wallet_balance);
  if (balance < DAILY_PREMIUM) {
    await pool.query('UPDATE users SET labour_insurance_active = FALSE WHERE id = $1', [userId]);
    return { charged: false, deactivated: true, reason: 'Insufficient wallet balance for today\'s premium' };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: bal } = await client.query(
      'UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2 RETURNING wallet_balance',
      [DAILY_PREMIUM, userId]
    );
    await client.query(`
      INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reason, reference_type)
      VALUES ($1, 'debit', $2, $3, 'labour_insurance_premium', 'insurance')
    `, [userId, DAILY_PREMIUM, bal[0].wallet_balance]);
    await client.query(
      'INSERT INTO labour_insurance_charges (user_id, charge_date, amount) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [userId, today, DAILY_PREMIUM]
    );
    await client.query('COMMIT');
    return { charged: true };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

// GET /api/insurance/mine — current status + coverage history. Also runs
// today's lazy charge, so simply opening the earnings screen keeps cover current.
router.get('/mine', auth, async (req, res) => {
  try {
    const chargeResult = await chargeTodayIfNeeded(req.user.id);

    const { rows: userRows } = await pool.query(
      'SELECT labour_insurance_active, labour_insurance_activated_at, wallet_balance FROM users WHERE id = $1',
      [req.user.id]
    );
    const { rows: charges } = await pool.query(
      'SELECT charge_date, amount FROM labour_insurance_charges WHERE user_id = $1 ORDER BY charge_date DESC LIMIT 60',
      [req.user.id]
    );

    res.json({
      ok: true,
      active: userRows[0]?.labour_insurance_active || false,
      activatedAt: userRows[0]?.labour_insurance_activated_at || null,
      walletBalance: parseFloat(userRows[0]?.wallet_balance || 0),
      dailyPremium: DAILY_PREMIUM,
      coveredDays: charges.length,
      charges,
      ...chargeResult,
    });
  } catch (err) {
    console.error('[insurance] mine error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load insurance status' });
  }
});

// POST /api/insurance/toggle — { active: boolean }
router.post('/toggle', auth, async (req, res) => {
  try {
    const active = !!req.body.active;

    if (active) {
      const { rows: userRows } = await pool.query('SELECT wallet_balance FROM users WHERE id = $1', [req.user.id]);
      if (parseFloat(userRows[0].wallet_balance) < DAILY_PREMIUM) {
        return res.status(402).json({
          ok: false,
          error: `You need at least ₹${DAILY_PREMIUM} in your wallet to activate today's cover. Please top up first.`,
        });
      }
    }

    await pool.query(
      `UPDATE users SET labour_insurance_active = $1,
         labour_insurance_activated_at = CASE WHEN $1 THEN NOW() ELSE labour_insurance_activated_at END
       WHERE id = $2`,
      [active, req.user.id]
    );

    if (active) await chargeTodayIfNeeded(req.user.id);

    res.json({ ok: true, active });
  } catch (err) {
    console.error('[insurance] toggle error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to update insurance' });
  }
});

module.exports = router;
