const router = require('express').Router();
const { pool, cache } = require('../db');
const { auth } = require('../middleware/auth');

const LIST_TTL   = 15_000;
const DETAIL_TTL = 30_000;

// GET /api/labour — browse/search labour profiles
router.get('/', async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(50, parseInt(req.query.limit) || 20);
    const offset   = (page - 1) * limit;
    const district = req.query.district || null;
    const skill    = req.query.skill_category || null;
    const q        = req.query.q || null;

    const cacheKey = `labour:${page}:${limit}:${district}:${skill}:${q}`;
    const hit = await cache.get(cacheKey);
    if (hit) return res.json(hit);

    const conditions = ["l.status='active'"];
    const params = [];

    if (district) {
      params.push(district);
      conditions.push(`(l.district=$${params.length} OR l.district IS NULL)`);
    }
    if (skill) {
      params.push(skill);
      conditions.push(`l.skill_category=$${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(l.full_name ILIKE $${params.length} OR l.skill_category ILIKE $${params.length})`);
    }

    const where = conditions.join(' AND ');
    const countParams = [...params];
    params.push(limit, offset);

    const [countRes, dataRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM labour_profiles l WHERE ${where}`, countParams),
      pool.query(`
        SELECT l.id, l.full_name, l.skill_category, l.skills, l.experience_years,
               l.daily_wage, l.district, l.location, l.availability, l.bio,
               l.photo_url, l.id_verified, l.rating_avg, l.rating_count, l.created_at
        FROM labour_profiles l
        WHERE ${where}
        ORDER BY (l.availability = 'available') DESC, l.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `, params),
    ]);

    const total = parseInt(countRes.rows[0].count);
    const payload = {
      ok: true,
      labourers: dataRes.rows,
      total,
      page,
      hasMore: offset + dataRes.rows.length < total,
    };

    await cache.set(cacheKey, payload, LIST_TTL);
    res.json(payload);
  } catch (err) {
    console.error('[labour] list error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load labour profiles' });
  }
});

// GET /api/labour/:id — profile detail
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: 'Invalid id' });

    const cacheKey = `labour:detail:${id}`;
    const hit = await cache.get(cacheKey);
    if (hit) return res.json(hit);

    const result = await pool.query(`
      SELECT l.*, u.name AS user_name, u.phone AS user_phone
      FROM labour_profiles l
      LEFT JOIN users u ON u.id = l.user_id
      WHERE l.id = $1 AND l.status = 'active'
    `, [id]);

    if (!result.rows.length) return res.status(404).json({ ok: false, error: 'Profile not found' });

    const payload = { ok: true, profile: result.rows[0] };
    await cache.set(cacheKey, payload, DETAIL_TTL);
    res.json(payload);
  } catch (err) {
    console.error('[labour] detail error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load profile' });
  }
});

// POST /api/labour — create or update the logged-in user's own labour profile
router.post('/', auth, async (req, res) => {
  try {
    const {
      full_name, skill_category, skills, experience_years,
      daily_wage, district, location, bio, photo_url,
    } = req.body;

    if (!full_name || !skill_category) {
      return res.status(400).json({ ok: false, error: 'full_name and skill_category are required' });
    }

    const existing = await pool.query(
      'SELECT id FROM labour_profiles WHERE user_id = $1',
      [req.user.id]
    );

    let result;
    if (existing.rows.length) {
      result = await pool.query(`
        UPDATE labour_profiles SET
          full_name = $1, skill_category = $2, skills = $3, experience_years = $4,
          daily_wage = $5, district = $6, location = $7, bio = $8, photo_url = $9
        WHERE user_id = $10
        RETURNING *
      `, [full_name, skill_category, skills || [], experience_years || null,
          daily_wage || null, district || 'nanded', location || null, bio || null,
          photo_url || null, req.user.id]);
    } else {
      result = await pool.query(`
        INSERT INTO labour_profiles
          (user_id, full_name, skill_category, skills, experience_years,
           daily_wage, district, location, bio, photo_url)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *
      `, [req.user.id, full_name, skill_category, skills || [], experience_years || null,
          daily_wage || null, district || 'nanded', location || null, bio || null,
          photo_url || null]);
    }

    await cache.delPrefix('labour:');
    res.json({ ok: true, profile: result.rows[0] });
  } catch (err) {
    console.error('[labour] create/update error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to save profile' });
  }
});

// PATCH /api/labour/:id/availability — toggle available/busy
router.patch('/:id/availability', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { availability } = req.body;
    if (!['available', 'busy', 'inactive'].includes(availability)) {
      return res.status(400).json({ ok: false, error: 'Invalid availability value' });
    }

    const result = await pool.query(
      'UPDATE labour_profiles SET availability = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [availability, id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ ok: false, error: 'Profile not found' });

    res.json({ ok: true, profile: result.rows[0] });
  } catch (err) {
    console.error('[labour] availability error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to update availability' });
  }
});

// POST /api/labour/:id/hire — contractor sends a hire request
router.post('/:id/hire', auth, async (req, res) => {
  try {
    const labourId = parseInt(req.params.id);
    const { work_description, proposed_wage, work_date } = req.body;

    const labour = await pool.query('SELECT user_id FROM labour_profiles WHERE id = $1', [labourId]);
    if (!labour.rows.length) return res.status(404).json({ ok: false, error: 'Profile not found' });
    if (labour.rows[0].user_id === req.user.id) {
      return res.status(400).json({ ok: false, error: 'You cannot hire yourself' });
    }

    const result = await pool.query(`
      INSERT INTO hire_requests (labour_id, contractor_id, work_description, proposed_wage, work_date)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
    `, [labourId, req.user.id, work_description || null, proposed_wage || null, work_date || null]);

    res.json({ ok: true, hireRequest: result.rows[0] });
  } catch (err) {
    console.error('[labour] hire error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to send hire request' });
  }
});

// PATCH /api/hire-requests/:id — labourer accepts/declines a hire request
router.patch('/hire-requests/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (!['accepted', 'declined', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status' });
    }

    const result = await pool.query(`
      UPDATE hire_requests hr SET status = $1
      FROM labour_profiles l
      WHERE hr.id = $2 AND hr.labour_id = l.id AND l.user_id = $3
      RETURNING hr.*
    `, [status, id, req.user.id]);

    if (!result.rows.length) return res.status(404).json({ ok: false, error: 'Hire request not found' });
    res.json({ ok: true, hireRequest: result.rows[0] });
  } catch (err) {
    console.error('[labour] hire-request update error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to update hire request' });
  }
});

module.exports = router;
