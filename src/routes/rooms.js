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

// ── POST /api/rooms — free (unpaid) room listing ─────────────────────────────
// planDays is capped at FREE_PLAN_MAX_DAYS so a client cannot send planDays:99999
// to obtain a listing that never expires.  The payment-verified path
// (POST /api/payments/verify/room) handles paid plans independently and derives
// its duration from the server-authoritative PLAN_DAYS table, not from this cap.
const FREE_PLAN_MAX_DAYS = 30;

router.post('/', auth, async (req, res) => {
  try {
    const {
      roomType, forGender, furnished, floor, totalFloors,
      bhkSize, facing, vacancies, rent, deposit, maintenance, brokerFree,
      amenities, rules, availableFrom, tenantPref,
      area, address, landmark, ownerName, whatsapp, description, photos,
      planDays, district,
    } = req.body;

    if (!rent || !area || !whatsapp) {
      return res.json({ ok: false, error: 'Rent, area, and WhatsApp are required' });
    }

    // Cap planDays: clamp to [1, FREE_PLAN_MAX_DAYS]; ignore oversized client values.
    const days = Math.min(Math.max(1, parseInt(planDays) || FREE_PLAN_MAX_DAYS), FREE_PLAN_MAX_DAYS);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { rows } = await pool.query(`
      INSERT INTO rooms (
        posted_by, room_type, for_gender, furnished, floor, total_floors,
        bhk_size, facing, vacancies, rent, deposit, maintenance, broker_free,
        amenities, rules, available_from, tenant_pref,
        area, address, landmark, owner_name, whatsapp, description, photos,
        plan_days, plan_label, plan_price, expires_at, district
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,
        $25,$26,$27,$28,$29
      ) RETURNING *
    `, [
      req.user.id,
      roomType || 'PG', forGender || 'Any', furnished || 'Semi-furnished',
      floor || '', totalFloors || '', bhkSize || '', facing || '',
      parseInt(vacancies) || 1,
      rent, deposit || '', maintenance || '', brokerFree !== false,
      JSON.stringify(Array.isArray(amenities) ? amenities : []),
      JSON.stringify(Array.isArray(rules)     ? rules     : []),
      availableFrom || 'Immediately', tenantPref || 'Any',
      area, address || '', landmark || '', ownerName || '', whatsapp,
      description || '', JSON.stringify(Array.isArray(photos) ? photos : []),
      // Free plan: price is always 0; label is 'Free'; duration is server-capped.
      days, 'Free', 0,
      expiresAt, district || 'nanded',
    ]);

    res.json({ ok: true, room: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to create room listing' });
  }
});

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
