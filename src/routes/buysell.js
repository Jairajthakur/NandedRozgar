const router = require('express').Router();
const { pool, cache } = require('../db');
const { auth } = require('../middleware/auth');

const LIST_TTL   = 15_000;
const DETAIL_TTL = 30_000;

// GET /api/buysell
router.get('/', async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(50, parseInt(req.query.limit) || 20);
    const offset   = (page - 1) * limit;
    const district = req.query.district || null;
    const category = req.query.category || null;
    const search   = req.query.search   || null;

    const cacheKey = `buysell:${page}:${limit}:${district}:${category}:${search}`;
    const hit = cache.get(cacheKey);
    if (hit) return res.json(hit);

    const conditions = ["b.status='active'", "(b.expires_at IS NULL OR b.expires_at > NOW())"];
    const params = [];

    if (district) { params.push(district); conditions.push(`(b.district=$${params.length} OR b.district IS NULL)`); }
    if (category && category !== 'All') { params.push(category); conditions.push(`b.category=$${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`(b.title ILIKE $${params.length} OR b.description ILIKE $${params.length})`); }

    const where = conditions.join(' AND ');
    const countParams = [...params];
    params.push(limit, offset);

    const [countRes, dataRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM buysell_items b WHERE ${where}`, countParams),
      pool.query(`
        SELECT b.id, b.title, b.price, b.category, b.condition, b.area, b.address,
               b.whatsapp, b.district, b.plan_label, b.status, b.created_at, b.expires_at, b.views,
               u.name AS seller_name
        FROM buysell_items b
        LEFT JOIN users u ON u.id = b.posted_by
        WHERE ${where}
        ORDER BY b.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `, params),
    ]);

    const total = parseInt(countRes.rows[0].count);
    const payload = {
      ok: true, items: dataRes.rows,
      pagination: { page, limit, total, hasNext: offset + dataRes.rows.length < total },
    };
    cache.set(cacheKey, payload, LIST_TTL);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load buy & sell items' });
  }
});

// GET /api/buysell/count
router.get('/count', async (req, res) => {
  try {
    const district  = req.query.district || null;
    const cacheKey  = `buysell_count:${district}`;
    const hit = cache.get(cacheKey);
    if (hit) return res.json(hit);

    const params = [];
    let where = "status='active' AND (expires_at IS NULL OR expires_at > NOW())";
    if (district) { params.push(district); where += ` AND (district=$${params.length} OR district IS NULL)`; }

    const { rows } = await pool.query(`SELECT COUNT(*) FROM buysell_items WHERE ${where}`, params);
    const payload = { ok: true, count: parseInt(rows[0].count) };
    cache.set(cacheKey, payload, LIST_TTL);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to count items' });
  }
});

// GET /api/buysell/:id — full detail including photos
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const cacheKey = `buysell:item:${id}`;
    const hit = cache.get(cacheKey);
    if (hit) {
      pool.query('UPDATE buysell_items SET views=COALESCE(views,0)+1 WHERE id=$1', [id]).catch(() => {});
      return res.json(hit);
    }
    const { rows } = await pool.query(
      `SELECT b.*, u.name AS seller_name FROM buysell_items b LEFT JOIN users u ON u.id=b.posted_by WHERE b.id=$1`,
      [id]
    );
    if (!rows[0]) return res.json({ ok: false, error: 'Item not found' });
    pool.query('UPDATE buysell_items SET views=COALESCE(views,0)+1 WHERE id=$1', [id]).catch(() => {});
    const payload = { ok: true, item: rows[0] };
    cache.set(cacheKey, payload, DETAIL_TTL);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load item' });
  }
});

// POST /api/buysell
router.post('/', auth, async (req, res) => {
  try {
    const { title, category, condition, age, price, negotiable, area, description, whatsapp, photos, planDays, district } = req.body;
    if (!title || !price || !whatsapp)
      return res.json({ ok: false, error: 'Title, price and WhatsApp are required' });

    const days = Math.min(Math.max(1, parseInt(planDays)||15), 15);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { rows } = await pool.query(`
      INSERT INTO buysell_items (posted_by,title,category,condition,age,price,negotiable,area,description,whatsapp,photos,plan_days,expires_at,district)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *
    `, [
      req.user.id, title, category||'Other', condition||'Good', age||'',
      price, negotiable!==false, area||'', description||'', whatsapp,
      JSON.stringify(Array.isArray(photos)?photos:[]),
      days, expiresAt, district||'nanded',
    ]);

    cache.delPrefix('buysell:');
    res.json({ ok: true, item: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to post item' });
  }
});

// DELETE /api/buysell/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT posted_by FROM buysell_items WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.json({ ok: false, error: 'Not found' });
    if (rows[0].posted_by !== req.user.id && req.user.role !== 'admin')
      return res.json({ ok: false, error: 'Not allowed' });
    await pool.query("UPDATE buysell_items SET status='deleted' WHERE id=$1", [req.params.id]);
    cache.del(`buysell:item:${req.params.id}`);
    cache.delPrefix('buysell:');
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to delete' });
  }
});

module.exports = router;
