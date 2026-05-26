const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// ── GET /api/buysell — list all active, non-expired buy & sell items ──────────
router.get('/', async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(50, parseInt(req.query.limit) || 20);
    const offset   = (page - 1) * limit;
    const district = req.query.district || null;
    const category = req.query.category || null;
    const search   = req.query.search   || null;

    const conditions = ["b.status = 'active'", "(b.expires_at IS NULL OR b.expires_at > NOW())"];
    const params = [];

    if (district) {
      params.push(district);
      conditions.push(`(b.district = $${params.length} OR b.district IS NULL)`);
    }

    if (category && category !== 'All') {
      params.push(category);
      conditions.push(`b.category = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(b.title ILIKE $${params.length} OR b.description ILIKE $${params.length})`);
    }

    const where = conditions.join(' AND ');
    params.push(limit, offset);

    const { rows } = await pool.query(`
      SELECT b.*, u.name AS seller_name
      FROM buysell_items b
      LEFT JOIN users u ON u.id = b.posted_by
      WHERE ${where}
      ORDER BY b.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    // Count total for pagination & stats
    const countParams = params.slice(0, params.length - 2);
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM buysell_items b WHERE ${where}`,
      countParams
    );
    const total = parseInt(countRows[0].count);

    res.json({
      ok: true,
      items: rows,
      pagination: { page, limit, total, hasNext: offset + rows.length < total },
    });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load buy & sell items' });
  }
});

// ── GET /api/buysell/count — total active items count (used by HomeScreen) ────
router.get('/count', async (req, res) => {
  try {
    const district = req.query.district || null;
    const params = [];
    let where = "status = 'active' AND (expires_at IS NULL OR expires_at > NOW())";

    if (district) {
      params.push(district);
      where += ` AND (district = $${params.length} OR district IS NULL)`;
    }

    const { rows } = await pool.query(
      `SELECT COUNT(*) FROM buysell_items WHERE ${where}`,
      params
    );
    res.json({ ok: true, count: parseInt(rows[0].count) });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, count: 0 });
  }
});

// ── DELETE /api/buysell/:id — owner can delete their own listing ──────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    // Bug #4 fix: return an error when nothing was deleted (wrong owner / not found)
    const result = await pool.query(
      `UPDATE buysell_items SET status = 'deleted' WHERE id = $1 AND (posted_by = $2 OR $3 = 'admin')`,
      [req.params.id, req.user.id, req.user.role]
    );
    if (result.rowCount === 0) {
      return res.json({ ok: false, error: 'Item not found or you do not have permission to delete it.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to delete item' });
  }
});

module.exports = router;
