/**
 * routes/escrow.js — "Wage Guarantee" Security
 *
 * The biggest fear daily-wage workers have is working all day and having a
 * contractor refuse to pay or disappear. This adds an OPT-IN escrow layer on
 * top of a hire_request: the contractor funds the agreed wage up front from
 * their in-app wallet (same wallet_balance already used for contact unlocks
 * — no new payment gateway needed), and it sits held until the contractor
 * confirms the work is done, at which point it's released into the existing
 * labour_payouts pipeline (same 48h dispute hold that governs every other
 * payout). If the job never happens, the contractor can reclaim the deposit.
 *
 * Mounted at /api/escrow in src/index.js.
 */
const router = require('express').Router();
const { pool, cache } = require('../db');
const { auth } = require('../middleware/auth');

const PAYOUT_HOLD_HOURS = 48; // kept in sync with routes/labour.js

// POST /api/escrow/:hireRequestId/fund — contractor deposits the day's/week's
// wage for an accepted hire request. Debits wallet_balance immediately.
router.post('/:hireRequestId/fund', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const hireRequestId = parseInt(req.params.hireRequestId, 10);
    const amount = parseFloat(req.body.amount);
    if (!(amount > 0)) {
      return res.status(400).json({ ok: false, error: 'A positive amount is required' });
    }

    await client.query('BEGIN');

    const { rows: hrRows } = await client.query(
      `SELECT hr.*, l.user_id AS labourer_user_id FROM hire_requests hr
       JOIN labour_profiles l ON l.id = hr.labour_id
       WHERE hr.id = $1 FOR UPDATE`,
      [hireRequestId]
    );
    if (!hrRows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, error: 'Hire request not found' });
    }
    const hr = hrRows[0];

    if (hr.contractor_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ ok: false, error: 'Only the hiring contractor can fund escrow for this hire' });
    }
    if (hr.status !== 'accepted') {
      await client.query('ROLLBACK');
      return res.status(400).json({ ok: false, error: 'Escrow can only be funded for an accepted hire request' });
    }

    const { rows: existing } = await client.query(
      'SELECT * FROM escrow_deposits WHERE hire_request_id = $1', [hireRequestId]
    );
    if (existing.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ ok: false, error: `Escrow already ${existing[0].status} for this hire` });
    }

    const { rows: balRows } = await client.query(
      'SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [hr.contractor_id]
    );
    const balance = parseFloat(balRows[0]?.wallet_balance || 0);
    if (balance < amount) {
      await client.query('ROLLBACK');
      return res.status(402).json({
        ok: false,
        error: `Wallet balance (₹${balance}) is less than the escrow amount (₹${amount}). Please top up first.`,
      });
    }

    const { rows: newBalRows } = await client.query(
      'UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2 RETURNING wallet_balance',
      [amount, hr.contractor_id]
    );
    await client.query(`
      INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reason, reference_type, reference_id)
      VALUES ($1, 'debit', $2, $3, 'labour_escrow_fund', 'hire_requests', $4)
    `, [hr.contractor_id, amount, newBalRows[0].wallet_balance, hireRequestId]);

    const { rows: depositRows } = await client.query(`
      INSERT INTO escrow_deposits (hire_request_id, contractor_id, labour_id, amount, status)
      VALUES ($1, $2, $3, $4, 'funded')
      RETURNING *
    `, [hireRequestId, hr.contractor_id, hr.labour_id, amount]);

    await client.query('COMMIT');
    res.json({ ok: true, escrow: depositRows[0], walletBalance: newBalRows[0].wallet_balance });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[escrow] fund error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to fund escrow' });
  } finally {
    client.release();
  }
});

// POST /api/escrow/:hireRequestId/release — contractor confirms the work is
// done and releases the held wage straight to the labourer's earnings
// pipeline (labour_payouts, subject to the same dispute hold as a normal
// hire-completion commission).
router.post('/:hireRequestId/release', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const hireRequestId = parseInt(req.params.hireRequestId, 10);

    await client.query('BEGIN');

    const { rows: depositRows } = await client.query(
      `SELECT e.*, hr.contractor_id, l.user_id AS labourer_user_id
       FROM escrow_deposits e
       JOIN hire_requests hr ON hr.id = e.hire_request_id
       JOIN labour_profiles l ON l.id = e.labour_id
       WHERE e.hire_request_id = $1 FOR UPDATE`,
      [hireRequestId]
    );
    if (!depositRows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, error: 'No escrow deposit found for this hire' });
    }
    const deposit = depositRows[0];

    if (deposit.contractor_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ ok: false, error: 'Only the funding contractor can release this escrow' });
    }
    if (deposit.status !== 'funded') {
      await client.query('ROLLBACK');
      return res.status(400).json({ ok: false, error: `Escrow is already ${deposit.status}` });
    }

    const availableAt = new Date(Date.now() + PAYOUT_HOLD_HOURS * 60 * 60 * 1000);
    await client.query(`
      INSERT INTO labour_payouts (hire_request_id, labour_user_id, amount, status, available_at, source)
      VALUES ($1, $2, $3, 'pending', $4, 'escrow_release')
      ON CONFLICT (hire_request_id) DO NOTHING
    `, [hireRequestId, deposit.labourer_user_id, deposit.amount, availableAt]);

    const { rows: updated } = await client.query(
      `UPDATE escrow_deposits SET status = 'released', released_at = NOW(), release_reason = $1
       WHERE hire_request_id = $2 RETURNING *`,
      [req.body.note || 'Work verified complete by contractor', hireRequestId]
    );

    await client.query('COMMIT');
    res.json({ ok: true, escrow: updated[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[escrow] release error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to release escrow' });
  } finally {
    client.release();
  }
});

// POST /api/escrow/:hireRequestId/refund — contractor reclaims a funded
// deposit if the work never happened (e.g. hire got cancelled).
router.post('/:hireRequestId/refund', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const hireRequestId = parseInt(req.params.hireRequestId, 10);

    await client.query('BEGIN');

    const { rows: depositRows } = await client.query(
      'SELECT * FROM escrow_deposits WHERE hire_request_id = $1 FOR UPDATE',
      [hireRequestId]
    );
    if (!depositRows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, error: 'No escrow deposit found for this hire' });
    }
    const deposit = depositRows[0];

    if (deposit.contractor_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ ok: false, error: 'Only the funding contractor can refund this escrow' });
    }
    if (deposit.status !== 'funded') {
      await client.query('ROLLBACK');
      return res.status(400).json({ ok: false, error: `Escrow is already ${deposit.status}` });
    }

    const { rows: newBalRows } = await client.query(
      'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2 RETURNING wallet_balance',
      [deposit.amount, deposit.contractor_id]
    );
    await client.query(`
      INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reason, reference_type, reference_id)
      VALUES ($1, 'credit', $2, $3, 'labour_escrow_refund', 'hire_requests', $4)
    `, [deposit.contractor_id, deposit.amount, newBalRows[0].wallet_balance, hireRequestId]);

    const { rows: updated } = await client.query(
      `UPDATE escrow_deposits SET status = 'refunded', refunded_at = NOW(), release_reason = $1
       WHERE hire_request_id = $2 RETURNING *`,
      [req.body.reason || 'Refunded by contractor', hireRequestId]
    );

    await client.query('COMMIT');
    res.json({ ok: true, escrow: updated[0], walletBalance: newBalRows[0].wallet_balance });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[escrow] refund error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to refund escrow' });
  } finally {
    client.release();
  }
});

// GET /api/escrow/:hireRequestId — status of the escrow deposit for a hire,
// visible to both sides of the hire.
router.get('/:hireRequestId', auth, async (req, res) => {
  try {
    const hireRequestId = parseInt(req.params.hireRequestId, 10);
    const { rows } = await pool.query(
      `SELECT e.*, hr.contractor_id, l.user_id AS labourer_user_id
       FROM escrow_deposits e
       JOIN hire_requests hr ON hr.id = e.hire_request_id
       JOIN labour_profiles l ON l.id = e.labour_id
       WHERE e.hire_request_id = $1`,
      [hireRequestId]
    );
    if (!rows.length) return res.json({ ok: true, escrow: null });

    const row = rows[0];
    if (row.contractor_id !== req.user.id && row.labourer_user_id !== req.user.id) {
      return res.status(403).json({ ok: false, error: 'Not authorized' });
    }
    res.json({ ok: true, escrow: row });
  } catch (err) {
    console.error('[escrow] get error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load escrow status' });
  }
});

module.exports = router;
