const router = require('express').Router();
const { pool, cache } = require('../db');
const { auth } = require('../middleware/auth');

const LIST_TTL   = 15_000;
const DETAIL_TTL = 30_000;
const FREE_PLAN_MAX_DAYS = 30;

// GET /api/vehicles
router.get('/', async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(50, parseInt(req.query.limit) || 20);
    const offset   = (page - 1) * limit;
    const district = req.query.district || null;

    const cacheKey = `vehicles:${page}:${limit}:${district}`;
    const hit = cache.get(cacheKey);
    if (hit) return res.json(hit);

    const conditions = ["v.status='active'", "(v.expires_at IS NULL OR v.expires_at > NOW())"];
    const params = [];
    if (district) {
      params.push(district);
      conditions.push(`(v.district=$${params.length} OR v.district IS NULL)`);
    }
    const where = conditions.join(' AND ');
    const countParams = [...params];
    params.push(limit, offset);

    const [countRes, dataRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM vehicles v WHERE ${where}`, countParams),
      pool.query(`
        SELECT v.id, v.title, v.price, v.type, v.brand, v.model, v.year, v.km_driven,
               v.fuel, v.transmission, v.area, v.address, v.owner_name, v.whatsapp,
               v.district, v.plan, v.status, v.created_at, v.expires_at, v.views,
               u.name AS poster_name
        FROM vehicles v
        LEFT JOIN users u ON u.id = v.posted_by
        WHERE ${where}
        ORDER BY v.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `, params),
    ]);

    const total = parseInt(countRes.rows[0].count);
    const payload = {
      ok: true, vehicles: dataRes.rows,
      pagination: { page, limit, total, hasNext: offset + dataRes.rows.length < total },
    };
    cache.set(cacheKey, payload, LIST_TTL);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load vehicles' });
  }
});

// GET /api/vehicles/:id — full detail including photos
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const cacheKey = `vehicle:${id}`;
    const hit = cache.get(cacheKey);
    if (hit) {
      pool.query('UPDATE vehicles SET views=COALESCE(views,0)+1 WHERE id=$1', [id]).catch(() => {});
      return res.json(hit);
    }
    const { rows } = await pool.query(
      `SELECT v.*, u.name AS poster_name FROM vehicles v LEFT JOIN users u ON u.id=v.posted_by WHERE v.id=$1`,
      [id]
    );
    if (!rows[0]) return res.json({ ok: false, error: 'Vehicle not found' });
    pool.query('UPDATE vehicles SET views=COALESCE(views,0)+1 WHERE id=$1', [id]).catch(() => {});
    const payload = { ok: true, vehicle: rows[0] };
    cache.set(cacheKey, payload, DETAIL_TTL);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load vehicle' });
  }
});

// POST /api/vehicles
router.post('/', auth, async (req, res) => {
  try {
    const {
      title, type, brand, model, year, kmDriven, fuel, transmission,
      price, area, address, ownerName, whatsapp, description, photos,
      planDays, district,
    } = req.body;
    if (!title || !price || !whatsapp)
      return res.json({ ok: false, error: 'Title, price and WhatsApp are required' });

    const days = Math.min(Math.max(1, parseInt(planDays)||FREE_PLAN_MAX_DAYS), FREE_PLAN_MAX_DAYS);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { rows } = await pool.query(`
      INSERT INTO vehicles (posted_by,title,type,brand,model,year,km_driven,fuel,transmission,
                            price,area,address,owner_name,whatsapp,description,photos,plan,expires_at,district)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'free',$17,$18) RETURNING *
    `, [
      req.user.id, title, type||'', brand||'', model||'', year||null, kmDriven||null,
      fuel||'', transmission||'', price, area||'', address||'', ownerName||'', whatsapp,
      description||'', JSON.stringify(Array.isArray(photos)?photos:[]),
      expiresAt, district||'nanded',
    ]);

    cache.delPrefix('vehicles:');
    res.json({ ok: true, vehicle: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to post vehicle' });
  }
});

// DELETE /api/vehicles/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT posted_by FROM vehicles WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.json({ ok: false, error: 'Not found' });
    if (rows[0].posted_by !== req.user.id && req.user.role !== 'admin')
      return res.json({ ok: false, error: 'Not allowed' });
    await pool.query("UPDATE vehicles SET status='deleted' WHERE id=$1", [req.params.id]);
    cache.del(`vehicle:${req.params.id}`);
    cache.delPrefix('vehicles:');
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to delete' });
  }
});

module.exports = router;
