const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// ── GET /api/vehicles — list all active, non-expired vehicles ─────────────────
router.get('/', async (req, res) => {
  try {
    // Only return listings whose plan has NOT yet expired.
    // Expired listings are NOT deleted — owners can still see them in their profile.
    const { rows } = await pool.query(`
      SELECT v.*, u.name AS poster_name
      FROM vehicles v
      LEFT JOIN users u ON u.id = v.posted_by
      WHERE v.status = 'active'
        AND (v.expires_at IS NULL OR v.expires_at > NOW())
      ORDER BY v.created_at DESC
    `);
    res.json({ ok: true, vehicles: rows });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load vehicles' });
  }
});

// ── POST /api/vehicles — create a vehicle listing ────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const {
      vehicleType, name, year, color, fuelType, transmission, acType, seats,
      dailyRate, hourlyRate, kmLimit, extraKmRate, minBooking, advanceAmt,
      purpose, includes, availability,
      area, address, ownerName, whatsapp, description,
      photos,
      planDays, planLabel, planPrice,
    } = req.body;

    if (!name || !area || !whatsapp) {
      return res.json({ ok: false, error: 'Name, area, and WhatsApp are required' });
    }

    const days = parseInt(planDays) || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { rows } = await pool.query(`
      INSERT INTO vehicles (
        posted_by, vehicle_type, name, year, color, fuel_type, transmission,
        ac_type, seats, daily_rate, hourly_rate, km_limit, extra_km_rate,
        min_booking, advance_amt, purpose, includes, availability,
        area, address, owner_name, whatsapp, description, photos,
        plan_days, plan_label, plan_price, expires_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,
        $25,$26,$27,$28
      ) RETURNING *
    `, [
      req.user.id,
      vehicleType || 'Car', name, year || '', color || '',
      fuelType || 'Petrol', transmission || 'Manual', acType || 'AC', seats || '5',
      dailyRate || '0', hourlyRate || '', kmLimit || '', extraKmRate || '',
      minBooking || '', advanceAmt || '',
      JSON.stringify(purpose || []), JSON.stringify(includes || []),
      availability || 'Available now',
      area, address || '', ownerName || '', whatsapp, description || '',
      JSON.stringify(photos || []),
      days, planLabel || '1 Month', parseInt(planPrice) || 99,
      expiresAt,
    ]);

    res.json({ ok: true, vehicle: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to post vehicle' });
  }
});

// ── DELETE /api/vehicles/:id — owner can delete their own listing ─────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query(
      `UPDATE vehicles SET status = 'deleted' WHERE id = $1 AND posted_by = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to delete vehicle' });
  }
});

module.exports = router;
