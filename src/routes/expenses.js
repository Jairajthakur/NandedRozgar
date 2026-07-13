/**
 * routes/expenses.js — Digital Expense Log
 *
 * Daily-wage workers rarely have a bank statement to fall back on. This is
 * their financial ledger: log everyday costs (tools, transport, meals,
 * materials) against a date, and LabourEarningsScreen can show real
 * take-home profit (commission earned minus expenses logged), not just
 * gross commission.
 *
 * Deliberately independent of labour_payouts — an expense isn't tied to a
 * specific hire, since a worker's tea/transport cost on a given day usually
 * isn't attributable to one particular job.
 *
 * Mounted at /api/expenses in src/index.js.
 */
const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

const CATEGORIES = ['tools', 'transport', 'meals', 'materials', 'other'];

// POST /api/expenses — log a new expense
router.post('/', auth, async (req, res) => {
  try {
    const amount = parseFloat(req.body.amount);
    const category = CATEGORIES.includes(req.body.category) ? req.body.category : 'other';
    const note = (req.body.note || '').trim().slice(0, 200) || null;
    const expenseDate = req.body.expenseDate || new Date().toISOString().slice(0, 10);

    if (!(amount > 0)) return res.status(400).json({ ok: false, error: 'A positive amount is required' });

    const { rows } = await pool.query(`
      INSERT INTO labour_expenses (user_id, expense_date, category, amount, note)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [req.user.id, expenseDate, category, amount, note]);

    res.json({ ok: true, expense: rows[0] });
  } catch (err) {
    console.error('[expenses] create error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to log expense' });
  }
});

// GET /api/expenses/mine?from=YYYY-MM-DD&to=YYYY-MM-DD — a worker's own log,
// plus totals by category and a running "net" figure against paid earnings.
router.get('/mine', auth, async (req, res) => {
  try {
    const from = /^\d{4}-\d{2}-\d{2}$/.test(req.query.from) ? req.query.from : null;
    const to   = /^\d{4}-\d{2}-\d{2}$/.test(req.query.to)   ? req.query.to   : null;

    const params = [req.user.id];
    let where = 'WHERE user_id = $1';
    if (from) { params.push(from); where += ` AND expense_date >= $${params.length}`; }
    if (to)   { params.push(to);   where += ` AND expense_date <= $${params.length}`; }

    const { rows } = await pool.query(
      `SELECT * FROM labour_expenses ${where} ORDER BY expense_date DESC, created_at DESC LIMIT 200`,
      params
    );

    const totalsByCategory = {};
    let total = 0;
    for (const e of rows) {
      const amt = parseFloat(e.amount);
      total += amt;
      totalsByCategory[e.category] = (totalsByCategory[e.category] || 0) + amt;
    }

    // Lifetime paid commission, for a simple "net profit so far" figure.
    const { rows: paidRows } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS paid FROM labour_payouts WHERE labour_user_id = $1 AND status = 'paid'`,
      [req.user.id]
    );
    const lifetimePaid = parseFloat(paidRows[0].paid);

    res.json({
      ok: true,
      expenses: rows,
      total,
      totalsByCategory,
      lifetimePaid,
      netEstimate: lifetimePaid - total,
    });
  } catch (err) {
    console.error('[expenses] list error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load expenses' });
  }
});

// DELETE /api/expenses/:id — remove a mis-logged expense
router.delete('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM labour_expenses WHERE id = $1 AND user_id = $2 RETURNING id',
      [parseInt(req.params.id, 10), req.user.id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Expense not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[expenses] delete error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to delete expense' });
  }
});

module.exports = router;
