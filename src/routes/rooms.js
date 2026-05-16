const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// ── GET /api/rooms — list all active, non-expired rooms ───────────────────────
router.get('/', async (req, res) => {
  try {
    // Only return listings whose plan has NOT yet expired.
    // Expired listings are NOT deleted — owners can still see them in their profile.
    const { rows } = await pool.query(`
      SELECT r.*, u.name AS poster_name
      FROM rooms r
      LEFT JOIN users u ON u.id = r.posted_by
      WHERE r.status = 'active'
        AND (r.expires_at IS NULL OR r.expires_at > NOW())
      ORDER BY r.created_at DESC
    `);
    res.json({ ok: true, rooms: rows });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load rooms' });
  }
});

// ── POST /api/rooms — create a room listing ──────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const {
      roomType, forGender, furnished, floor, totalFloors, bhkSize, facing,
      vacancies, rent, deposit, maintenance, brokerFree,
      amenities, rules, availableFrom, tenantPref,
      area, address, landmark, ownerName, whatsapp, description,
      photos,
      planDays, planLabel, planPrice,
    } = req.body;

    if (!rent || !area || !whatsapp) {
      return res.json({ ok: false, error: 'Rent, area, and WhatsApp are required' });
    }

    const days = parseInt(planDays) || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { rows } = await pool.query(`
      INSERT INTO rooms (
        posted_by, room_type, for_gender, furnished, floor, total_floors,
        bhk_size, facing, vacancies, rent, deposit, maintenance, broker_free,
        amenities, rules, available_from, tenant_pref,
        area, address, landmark, owner_name, whatsapp, description, photos,
        plan_days, plan_label, plan_price, expires_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,
        $25,$26,$27,$28
      ) RETURNING *
    `, [
      req.user.id,
      roomType || 'PG', forGender || 'Any', furnished || 'Semi-furnished',
      floor || '', totalFloors || '', bhkSize || '', facing || '',
      parseInt(vacancies) || 1,
      rent, deposit || '', maintenance || '', brokerFree !== false,
      JSON.stringify(amenities || []), JSON.stringify(rules || []),
      availableFrom || 'Immediately', tenantPref || 'Any',
      area, address || '', landmark || '', ownerName || '', whatsapp,
      description || '', JSON.stringify(photos || []),
      days, planLabel || '1 Month', parseInt(planPrice) || 99,
      expiresAt,
    ]);

    res.json({ ok: true, room: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to post room' });
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
