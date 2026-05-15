const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// FIX #16 — phone/WhatsApp validation
function isValidPhone(p) {
  return p && /^\+?[0-9]{10,15}$/.test(p);
}

// FIX #15 — only allow photos from known storage domains
const ALLOWED_PHOTO_HOSTS = (process.env.ALLOWED_PHOTO_HOSTS || '').split(',').map(h => h.trim()).filter(Boolean);
function isValidPhotoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    if (!['https:'].includes(u.protocol)) return false;
    if (ALLOWED_PHOTO_HOSTS.length === 0) return true;
    return ALLOWED_PHOTO_HOSTS.some(host => u.hostname === host || u.hostname.endsWith('.' + host));
  } catch { return false; }
}

function validatePhotos(photos) {
  if (!Array.isArray(photos)) return [];
  return photos.filter(isValidPhotoUrl).slice(0, 20);
}

// GET /api/vehicles — list active, non-expired vehicles (paginated)
router.get('/', async (req, res) => {
  try {
    // FIX #12 — pagination
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(`
      SELECT v.*, u.name AS poster_name
      FROM vehicles v
      LEFT JOIN users u ON u.id = v.posted_by
      WHERE v.status = 'active'
        AND (v.expires_at IS NULL OR v.expires_at > NOW())
      ORDER BY v.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({ ok: true, vehicles: rows, page, limit });
  } catch (err) {
    console.error('vehicles list error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load vehicles' });
  }
});

// POST /api/vehicles — create a vehicle listing
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

    // FIX #10 — required field validation
    if (!name || !area || !whatsapp) {
      return res.status(400).json({ ok: false, error: 'Name, area, and WhatsApp are required' });
    }
    // FIX #16 — validate WhatsApp number
    if (!isValidPhone(whatsapp)) {
      return res.status(400).json({ ok: false, error: 'Invalid WhatsApp number (10–15 digits)' });
    }
    // FIX #10 — length caps
    if (name.length > 200 || area.length > 100 || (description && description.length > 5000)) {
      return res.status(400).json({ ok: false, error: 'Input too long' });
    }

    // FIX #15 — validate photo URLs
    const safePhotos = validatePhotos(photos);

    const days = Math.min(Math.max(parseInt(planDays) || 30, 1), 365);
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
      JSON.stringify(Array.isArray(purpose) ? purpose : []),
      JSON.stringify(Array.isArray(includes) ? includes : []),
      availability || 'Available now',
      area, address || '', ownerName || '', whatsapp, description || '',
      JSON.stringify(safePhotos),
      days, planLabel || '1 Month', parseInt(planPrice) || 99,
      expiresAt,
    ]);

    res.json({ ok: true, vehicle: rows[0] });
  } catch (err) {
    console.error('vehicles post error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to post vehicle' });
  }
});

// DELETE /api/vehicles/:id — owner can delete their own listing
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query(
      `UPDATE vehicles SET status = 'deleted' WHERE id = $1 AND posted_by = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('vehicles delete error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to delete vehicle' });
  }
});

module.exports = router;
