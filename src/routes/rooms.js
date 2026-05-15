const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// FIX #16 — WhatsApp/phone validation
function isValidPhone(p) {
  return p && /^\+?[0-9]{10,15}$/.test(p);
}

// FIX #15 — Only allow photos from known HTTPS domains
const ALLOWED_PHOTO_HOSTS = (process.env.ALLOWED_PHOTO_HOSTS || '').split(',').map(h => h.trim()).filter(Boolean);
function isValidPhotoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    if (ALLOWED_PHOTO_HOSTS.length === 0) return true;
    return ALLOWED_PHOTO_HOSTS.some(host => u.hostname === host || u.hostname.endsWith('.' + host));
  } catch { return false; }
}
function validatePhotos(photos) {
  if (!Array.isArray(photos)) return [];
  return photos.filter(isValidPhotoUrl).slice(0, 20);
}

// GET /api/rooms — paginated
router.get('/', async (req, res) => {
  try {
    // FIX #12 — pagination
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
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

// POST /api/rooms
router.post('/', auth, async (req, res) => {
  try {
    const {
      roomType, forGender, furnished, floor, totalFloors, bhkSize, facing,
      vacancies, rent, deposit, maintenance, brokerFree,
      amenities, rules, availableFrom, tenantPref,
      area, address, landmark, ownerName, whatsapp, description,
      photos, planDays, planLabel, planPrice,
    } = req.body;

    if (!rent || !area || !whatsapp) {
      return res.status(400).json({ ok: false, error: 'Rent, area, and WhatsApp are required' });
    }
    if (!isValidPhone(whatsapp)) {
      return res.status(400).json({ ok: false, error: 'Invalid WhatsApp number (10–15 digits)' });
    }
    if (area.length > 100 || (description && description.length > 5000)) {
      return res.status(400).json({ ok: false, error: 'Input too long' });
    }

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
      JSON.stringify(Array.isArray(amenities) ? amenities : **...**

_This response is too long to display in full._
