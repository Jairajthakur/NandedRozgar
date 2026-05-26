const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// ── GET /api/rooms — list all active, non-expired rooms ───────────────────────
router.get('/', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const district = req.query.district || null;

    const conditions = ["r.status = 'active'", "(r.expires_at IS NULL OR r.expires_at > NOW())"];
    const params = [];

    if (district) {
      params.push(district);
      conditions.push(`(r.district = $${params.length} OR r.district IS NULL)`);
    }

    const where = conditions.join(' AND ');
    params.push(limit, offset);

    const { rows } = await pool.query(`
      SELECT r.*, u.name AS poster_name
      FROM rooms r
      LEFT JOIN users u ON u.id = r.posted_by
      WHERE ${where}
      ORDER BY r.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const countParams = district ? [district] : [];
    const countWhere = district
      ? "status = 'active' AND (expires_at IS NULL OR expires_at > NOW()) AND (district = $1 OR district IS NULL)"
      : "status = 'active' AND (expires_at IS NULL OR expires_at > NOW())";
    const { rows: countRows } = await pool.query(`SELECT COUNT(*) FROM rooms WHERE ${countWhere}`, countParams);
    const total = parseInt(countRows[0].count);

    res.json({
      ok: true,
      rooms: rows,
      pagination: { page, limit, total, hasNext: offset + rows.length < total },
    });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load rooms' });
  }
});

// NOTE: Room creation is handled exclusively by POST /api/payments/verify/room
// to ensure payment is always completed before a listing goes live.
// The direct POST route has been removed to prevent payment bypass.

// ── DELETE /api/rooms/:id — owner can delete their own listing ────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query(
      `UPDATE rooms SET status = 'deleted' WHERE id = $1 AND posted_by = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to delete room' });
  }
});

module.exports = router;
