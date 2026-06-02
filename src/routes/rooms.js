const router = require('express').Router();
const { pool, cache } = require('../db');
const { auth } = require('../middleware/auth');

const LIST_TTL   = 15_000;
const DETAIL_TTL = 30_000;
const FREE_PLAN_MAX_DAYS = 30;

// GET /api/rooms
router.get('/', async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(50, parseInt(req.query.limit) || 20);
    const offset   = (page - 1) * limit;
    const district = req.query.district || null;

    const cacheKey = `rooms:${page}:${limit}:${district}`;
    const hit = await cache.get(cacheKey);
    if (hit) return res.json(hit);

    const conditions = ["r.status='active'", "(r.expires_at IS NULL OR r.expires_at > NOW())"];
    const params = [];
    if (district) {
      params.push(district);
      conditions.push(`(r.district=$${params.length} OR r.district IS NULL)`);
    }
    const where = conditions.join(' AND ');
    const countParams = [...params];
    params.push(limit, offset);

    const [countRes, dataRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM rooms r WHERE ${where}`, countParams),
      pool.query(`
        SELECT r.id, r.title, r.rent, r.type, r.bhk, r.furnished, r.area, r.address,
               r.landmark, r.owner_name, r.whatsapp, r.district, r.plan, r.status,
               r.created_at, r.expires_at, r.views,
               u.name AS poster_name
        FROM rooms r
        LEFT JOIN users u ON u.id = r.posted_by
        WHERE ${where}
        ORDER BY r.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `, params),
    ]);

    const total = parseInt(countRes.rows[0].count);
    const payload = {
      ok: true, rooms: dataRes.rows,
      pagination: { page, limit, total, hasNext: offset + dataRes.rows.length < total },
    };
    await cache.set(cacheKey, payload, LIST_TTL);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load rooms' });
  }
});

// GET /api/rooms/:id — full detail including photos
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const cacheKey = `room:${id}`;
    const hit = await cache.get(cacheKey);
    if (hit) {
      pool.query('UPDATE rooms SET views=COALESCE(views,0)+1 WHERE id=$1', [id]).catch(() => {});
      return res.json(hit);
    }
    const { rows } = await pool.query(
      `SELECT r.*, u.name AS poster_name FROM rooms r LEFT JOIN users u ON u.id=r.posted_by WHERE r.id=$1`,
      [id]
    );
    if (!rows[0]) return res.json({ ok: false, error: 'Room not found' });
    pool.query('UPDATE rooms SET views=COALESCE(views,0)+1 WHERE id=$1', [id]).catch(() => {});
    const payload = { ok: true, room: rows[0] };
    await cache.set(cacheKey, payload, DETAIL_TTL);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load room' });
  }
});

// POST /api/rooms
router.post('/', auth, async (req, res) => {
  try {
    const {
      title, type, bhk, rent, furnished, area, address,
      landmark, ownerName, whatsapp, description, photos,
      planDays, district,
    } = req.body;
    if (!title || !rent || !whatsapp)
      return res.json({ ok: false, error: 'Title, rent and WhatsApp are required' });

    const days = Math.min(Math.max(1, parseInt(planDays) || FREE_PLAN_MAX_DAYS), FREE_PLAN_MAX_DAYS);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { rows } = await pool.query(`
      INSERT INTO rooms (posted_by,title,type,bhk,rent,furnished,area,address,landmark,
                         owner_name,whatsapp,description,photos,plan,expires_at,district)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'free',$14,$15) RETURNING *
    `, [
      req.user.id, title, type||'', bhk||'', rent, furnished||'',
      area||'', address||'', landmark||'', ownerName||'', whatsapp,
      description||'', JSON.stringify(Array.isArray(photos)?photos:[]),
      expiresAt, district||'nanded',
    ]);

    await cache.delPrefix('rooms:');
    res.json({ ok: true, room: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to post room' });
  }
});

// DELETE /api/rooms/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT posted_by FROM rooms WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.json({ ok: false, error: 'Not found' });
    if (rows[0].posted_by !== req.user.id && req.user.role !== 'admin')
      return res.json({ ok: false, error: 'Not allowed' });
    await pool.query("UPDATE rooms SET status='deleted' WHERE id=$1", [req.params.id]);
    await cache.del(`room:${req.params.id}`);
    await cache.delPrefix('rooms:');
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to delete' });
  }
});

module.exports = router;
