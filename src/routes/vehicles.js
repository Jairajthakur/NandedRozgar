const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// ── GET /api/vehicles — list all active, non-expired vehicles ─────────────────
router.get('/', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const district = req.query.district || null;

    const conditions = ["v.status = 'active'", "(v.expires_at IS NULL OR v.expires_at > NOW())"];
    const params = [];

    if (district) {
      params.push(district);
      conditions.push(`(v.district = $${params.length} OR v.district IS NULL)`);
    }

    const where = conditions.join(' AND ');
    params.push(limit, offset);

    const { rows } = await pool.query(`
      SELECT v.*, u.name AS poster_name
      FROM vehicles v
      LEFT JOIN users u ON u.id = v.posted_by
      WHERE ${where}
      ORDER BY v.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const countParams = district ? [district] : [];
    const countWhere = district
      ? "status = 'active' AND (expires_at IS NULL OR expires_at > NOW()) AND (district = $1 OR district IS NULL)"
      : "status = 'active' AND (expires_at IS NULL OR expires_at > NOW())";
    const { rows: countRows } = await pool.query(`SELECT COUNT(*) FROM vehicles WHERE ${countWhere}`, countParams);
    const total = parseInt(countRows[0].count);

    res.json({
      ok: true,
      vehicles: rows,
      pagination: { page, limit, total, hasNext: offset + rows.length < total },
    });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load vehicles' });
  }
});

// ── POST /api/vehicles — free (unpaid) vehicle listing ───────────────────────
// planDays is capped at FREE_PLAN_MAX_DAYS so a client cannot send planDays:99999
// to obtain a listing that never expires.  The payment-verified path
// (POST /api/payments/verify/vehicle) handles paid plans independently and derives
// its duration from the server-authoritative PLAN_DAYS table, not from this cap.
const FREE_PLAN_MAX_DAYS = 30;

router.post('/', auth, async (req, res) => {
  try {
    const {
      vehicleType, name, year, color, fuelType, transmission,
      acType, seats, dailyRate, hourlyRate, kmLimit, extraKmRate,
      minBooking, advanceAmt, purpose, includes, availability,
      area, address, ownerName, whatsapp, description, photos,
      planDays, district,
    } = req.body;

    if (!dailyRate || !area || !whatsapp) {
      return res.json({ ok: false, error: 'Daily rate, area, and WhatsApp are required' });
    }

    // Cap planDays: clamp to [1, FREE_PLAN_MAX_DAYS]; ignore oversized client values.
    const days = Math.min(Math.max(1, parseInt(planDays) || FREE_PLAN_MAX_DAYS), FREE_PLAN_MAX_DAYS);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { rows } = await pool.query(`
      INSERT INTO vehicles (
        posted_by, vehicle_type, name, year, color, fuel_type, transmission,
        ac_type, seats, daily_rate, hourly_rate, km_limit, extra_km_rate,
        min_booking, advance_amt, purpose, includes, availability,
        area, address, owner_name, whatsapp, description, photos,
        plan_days, plan_label, plan_price, expires_at, district
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,
        $25,$26,$27,$28,$29
      ) RETURNING *
    `, [
      req.user.id,
      vehicleType || 'Car',
      name || vehicleType || 'Vehicle',
      year || '', color || '',
      fuelType || 'Petrol', transmission || 'Manual',
      acType || 'AC', seats || '5',
      dailyRate, hourlyRate || '',
      kmLimit || '', extraKmRate || '',
      minBooking || '1', advanceAmt || '',
      JSON.stringify(Array.isArray(purpose)       ? purpose       : []),
      JSON.stringify(Array.isArray(includes)      ? includes      : []),
      JSON.stringify(Array.isArray(availability)  ? availability  : []),
      area, address || '', ownerName || '', whatsapp,
      description || '', JSON.stringify(Array.isArray(photos) ? photos : []),
      // Free plan: price is always 0; label is 'Free'; duration is server-capped.
      days, 'Free', 0,
      expiresAt, district || 'nanded',
    ]);

    res.json({ ok: true, vehicle: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to create vehicle listing' });
  }
});

// ── DELETE /api/vehicles/:id — owner can delete their own listing ─────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    // Bug #4 fix: return an error when nothing was deleted (wrong owner / not found)
    const result = await pool.query(
      `UPDATE vehicles SET status = 'deleted' WHERE id = $1 AND (posted_by = $2 OR $3 = 'admin')`,
      [req.params.id, req.user.id, req.user.role]
    );
    if (result.rowCount === 0) {
      return res.json({ ok: false, error: 'Vehicle not found or you do not have permission to delete it.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to delete vehicle' });
  }
});

module.exports = router;
