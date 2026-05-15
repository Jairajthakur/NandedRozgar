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
    if (ALLOWED_PHOTO_HOSTS.length === 0) return true; // allow all HTTPS if no allowlist set
    return ALLOWED_PHOTO_HOSTS.some(host => u.hostname === host || u.hostname.endsWith('.' + host));
  } catch { return false; }
}

function validatePhotos(photos) {
  if (!Array.isArray(photos)) return [];
  return photos.filter(isValidPhotoUrl).slice(0, 20); // cap at 20 photos
}

// GET /api/rooms — list active, non-expired rooms (paginated)
router.get('/', async (req, res) => {
  try {
    // FIX #12 — pagination
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(`
      SELECT r.*, u.name AS poster_name
      FROM rooms r
      LEFT JOIN users u ON u.id = r.posted_by
      WHERE r.status = 'active'
        AND (r.expires_at IS NULL OR r.expires_at > NOW())
      ORDER BY r.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({ ok: true, rooms: rows, page, limit });
  } catch (err) {
    console.error('rooms list error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load rooms' });
  }
});

// POST /api/rooms — create a room listing
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

    // FIX #10 — required field validation
    if (!rent || !area || !whatsapp) {
      return res.status(400).json({ ok: false, error: 'Rent, area, and WhatsApp are required' });
    }
    // FIX #16 — validate WhatsApp number
    if (!isValidPhone(whatsapp)) {
      return res.status(400).json({ ok: false, error: 'Invalid WhatsApp number (10–15 digits)' });
    }
    // FIX #10 — length caps
    if (area.length > 100 || (address && address.length > 200) || (description && description.length > 5000)) {
      return res.status(400).json({ ok: false, error: 'Input too long' });
    }

    // FIX #15 — validate photo URLs
    const safePhotos = validatePhotos(photos);

    const days = Math.min(Math.max(parseInt(planDays) || 30, 1), 365);
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
      JSON.stringify(Array.isArray(amenities) ? amenities : []),
      JSON.stringify(Array.isArray(rules) ? rules : []),
      availableFrom || 'Immediately', tenantPref || 'Any',
      area, address || '', landmark || '', ownerName || '', whatsapp,
      description || '', JSON.stringify(safePhotos),
      days, planLabel || '1 Month', parseInt(planPrice) || 99,
      expiresAt,
    ]);

    res.json({ ok: true, room: rows[0] });
  } catch (err) {
    console.error('rooms post error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to post room' });
  }
});

// DELETE /api/rooms/:id — owner can delete their own listing
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query(
      `UPDATE rooms SET status = 'deleted' WHERE id = $1 AND posted_by = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('rooms delete error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to delete room' });
  }
});

module.exports = router;
