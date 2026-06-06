const router = require('express').Router();
const { pool, cache } = require('../db');
const { auth } = require('../middleware/auth');
const { logActivity, getIP, getUA } = require('../utils/logActivity');

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
    const hit = await cache.get(cacheKey);
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
               b.whatsapp, b.district, b.plan_label, b.status, b.created_at, b.expires_at,
               b.photos,
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
    await cache.set(cacheKey, payload, LIST_TTL);
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
    const hit = await cache.get(cacheKey);
    if (hit) return res.json(hit);

    const params = [];
    let where = "status='active' AND (expires_at IS NULL OR expires_at > NOW())";
    if (district) { params.push(district); where += ` AND (district=$${params.length} OR district IS NULL)`; }

    const { rows } = await pool.query(`SELECT COUNT(*) FROM buysell_items WHERE ${where}`, params);
    const payload = { ok: true, count: parseInt(rows[0].count) };
    await cache.set(cacheKey, payload, LIST_TTL);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to count items' });
  }
});

// GET /api/buysell/:id — full detail including photos
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0)
      return res.json({ ok: false, error: 'Invalid item ID' });
    const cacheKey = `buysell:item:${id}`;
    const hit = await cache.get(cacheKey);
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
    await cache.set(cacheKey, payload, DETAIL_TTL);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load item' });
  }
});

// POST /api/buysell
// Free plan: 7 days, only on the user's very first buy-sell post ever.
router.post('/', auth, async (req, res) => {
  try {
    const { title, category, condition, age, price, negotiable, area, description, whatsapp, photos, planDays, plan, district } = req.body;
    if (!title || !price || !whatsapp)
      return res.json({ ok: false, error: 'Title, price and WhatsApp are required' });

    const cleanWhatsapp = String(whatsapp).replace(/\s+/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanWhatsapp))
      return res.json({ ok: false, error: 'Enter a valid 10-digit Indian mobile number' });

    const safePhotos = (Array.isArray(photos) ? photos : []).slice(0, 10);
    const planKey = (plan || 'free').toLowerCase().trim();

    // ── First-post-free check ─────────────────────────────────────────────────
    if (planKey === 'free') {
      const { rows: prior } = await pool.query(
        `SELECT id FROM buysell_items WHERE posted_by = $1 AND status != 'deleted' LIMIT 1`,
        [req.user.id]
      );
      if (prior.length > 0) {
        return res.json({
          ok: false,
          error: 'Free listing is only for your first post. Please choose a paid plan (from ₹49) to post again.',
          requiresPayment: true,
        });
      }
    }

    const days = planKey === 'free' ? 7 : Math.max(1, parseInt(planDays) || 7);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { rows } = await pool.query(`
      INSERT INTO buysell_items (posted_by,title,category,condition,age,price,negotiable,area,description,whatsapp,photos,plan_label,plan_days,expires_at,district)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *
    `, [
      req.user.id, title, category||'Other', condition||'Good', age||'',
      price, negotiable!==false, area||'', description||'', cleanWhatsapp,
      JSON.stringify(safePhotos),
      planKey, days, expiresAt, district||'nanded',
    ]);

    await cache.delPrefix('buysell:');
    await logActivity('buysell_post', { userId: req.user.id, ip: getIP(req), userAgent: getUA(req), detail: `Item posted: "${title}" (${planKey} plan)` });
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
    await cache.del(`buysell:item:${req.params.id}`);
    await cache.delPrefix('buysell:');
    await logActivity('buysell_delete', { userId: req.user.id, ip: getIP(req), userAgent: getUA(req), detail: `Deleted buysell item #${req.params.id}` });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to delete' });
  }
});

module.exports = router;
