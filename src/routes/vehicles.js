const router = require('express').Router();
const { pool, cache } = require('../db');
const { auth } = require('../middleware/auth');
const { logActivity, getIP, getUA } = require('../utils/logActivity');

const LIST_TTL   = 15_000;
const DETAIL_TTL = 30_000;
// Free plan: 7 days, only on the user's very first vehicle post ever.
const FREE_PLAN_MAX_DAYS = 7;

// FIX (Critical): Server-side plan duration lookup — never trust client-supplied planDays.
const PAID_PLANS = {
  basic:    7,
  standard: 15,
  featured: 30,
  premium:  30,
};

// GET /api/vehicles
router.get('/', async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(50, parseInt(req.query.limit) || 20);
    const offset   = (page - 1) * limit;
    const district = req.query.district || null;
    // FIX: Support filtering by listing_purpose ('rent' | 'sell' | null = all)
    const purpose  = req.query.purpose  || null;

    const cacheKey = `vehicles:${page}:${limit}:${district}:${purpose}`;
    const hit = await cache.get(cacheKey);
    if (hit) return res.json(hit);

    const conditions = ["v.status='active'", "(v.expires_at IS NULL OR v.expires_at > NOW())"];
    const params = [];
    if (district) {
      params.push(district);
      conditions.push(`(v.district=$${params.length} OR v.district IS NULL)`);
    }
    if (purpose) {
      params.push(purpose);
      conditions.push(`v.listing_purpose=$${params.length}`);
    }
    const where = conditions.join(' AND ');
    const countParams = [...params];
    params.push(limit, offset);

    const [countRes, dataRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM vehicles v WHERE ${where}`, countParams),
      pool.query(`
        SELECT v.id, v.name, v.title, v.price, v.type, v.brand, v.model, v.year, v.km_driven,
               v.fuel, v.transmission, v.seats, v.color, v.area, v.address, v.owner_name, v.whatsapp,
               v.district, v.plan, v.status, v.created_at, v.expires_at, v.views,
               v.photos,
               v.listing_purpose, v.negotiable, v.number_of_owners,
               v.advance_amt, v.min_booking,
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
    await cache.set(cacheKey, payload, LIST_TTL);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load vehicles' });
  }
});

// GET /api/vehicles/:id — full detail including photos
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0)
      return res.json({ ok: false, error: 'Invalid vehicle ID' });
    const cacheKey = `vehicle:${id}`;
    const hit = await cache.get(cacheKey);
    if (hit) {
      pool.query('UPDATE vehicles SET views=COALESCE(views,0)+1 WHERE id=$1', [id]).catch(() => {});
      return res.json(hit);
    }
    const { rows } = await pool.query(
      `SELECT v.*, u.name AS poster_name
       FROM vehicles v
       LEFT JOIN users u ON u.id = v.posted_by
       WHERE v.id = $1`,
      [id]
    );
    if (!rows[0]) return res.json({ ok: false, error: 'Vehicle not found' });
    pool.query('UPDATE vehicles SET views=COALESCE(views,0)+1 WHERE id=$1', [id]).catch(() => {});
    const payload = { ok: true, vehicle: rows[0] };
    await cache.set(cacheKey, payload, DETAIL_TTL);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load vehicle' });
  }
});

// POST /api/vehicles  (free/first-post flow — paid listings go through /api/payments/verify/vehicle)
router.post('/', auth, async (req, res) => {
  try {
    const {
      title, type, brand, model, year, kmDriven, fuel, transmission,
      price, area, address, ownerName, whatsapp, description, photos,
      plan, district,
      // FIX: Accept sell/rent fields
      listingPurpose, askingPrice, dailyRate, negotiable,
      numberOfOwners, advanceAmt, minBooking,
      // planDays intentionally not accepted from client
    } = req.body;

    // FIX: resolve price from the correct field based on listing purpose
    const isSell      = (listingPurpose || 'rent') === 'sell';
    const resolvedPrice = isSell
      ? (askingPrice || price)
      : (dailyRate   || price);

    if (!title || !resolvedPrice || !whatsapp)
      return res.json({ ok: false, error: 'Title, price and WhatsApp are required' });

    const cleanWhatsapp = String(whatsapp).replace(/\s+/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanWhatsapp))
      return res.json({ ok: false, error: 'Enter a valid 10-digit Indian mobile number' });

    const safePhotos = (Array.isArray(photos) ? photos : []).slice(0, 10);
    const planKey    = (plan || 'free').toLowerCase().trim();

    // FIX (Medium): Per-user active listing cap to prevent resource exhaustion.
    const { rows: capRows } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM vehicles WHERE posted_by = $1 AND status = 'active'`,
      [req.user.id]
    );
    if (parseInt(capRows[0].cnt) >= 10) {
      return res.json({ ok: false, error: 'You have reached the maximum of 10 active vehicle listings. Please delete an old one before posting a new one.' });
    }

    // ── First-post-free check ─────────────────────────────────────────────────
    if (planKey === 'free') {
      const { rows: prior } = await pool.query(
        `SELECT id FROM vehicles WHERE posted_by = $1 AND status != 'deleted' LIMIT 1`,
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

    // FIX (Critical): Use server-side plan duration; ignore client-supplied planDays.
    const days = planKey === 'free'
      ? FREE_PLAN_MAX_DAYS
      : (PAID_PLANS[planKey] || FREE_PLAN_MAX_DAYS);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { rows } = await pool.query(`
      INSERT INTO vehicles (
        posted_by, name, title, type, brand, model, year, km_driven, fuel, transmission,
        price, area, address, owner_name, whatsapp, description, photos,
        plan, expires_at, district,
        listing_purpose, negotiable, number_of_owners, advance_amt, min_booking
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,
        $18,$19,$20,
        $21,$22,$23,$24,$25
      ) RETURNING *
    `, [
      req.user.id,
      title, title,
      type         || '',
      brand        || '',
      model        || '',
      year         || null,
      isSell ? (kmDriven || null) : null,
      fuel         || '',
      transmission || '',
      resolvedPrice,
      area         || '',
      address      || '',
      ownerName    || '',
      cleanWhatsapp,
      description  || '',
      JSON.stringify(safePhotos),
      planKey,
      expiresAt,
      district     || 'nanded',
      // FIX: sell/rent specific columns
      isSell ? 'sell' : 'rent',
      isSell ? (negotiable !== false) : null,
      isSell ? (numberOfOwners || null) : null,
      isSell ? null : (advanceAmt || null),
      isSell ? null : (minBooking || null),
    ]);

    await cache.delPrefix('vehicles:');
    await logActivity('vehicle_post', {
      userId: req.user.id, ip: getIP(req), userAgent: getUA(req),
      detail: `Vehicle posted: "${title}" (${planKey} plan, ${isSell ? 'sell' : 'rent'})`,
    });
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
    await cache.del(`vehicle:${req.params.id}`);
    await cache.delPrefix('vehicles:');
    await logActivity('vehicle_delete', {
      userId: req.user.id, ip: getIP(req), userAgent: getUA(req),
      detail: `Deleted vehicle #${req.params.id}`,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to delete' });
  }
});

module.exports = router;
