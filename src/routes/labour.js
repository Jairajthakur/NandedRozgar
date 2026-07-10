const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { pool, cache } = require('../db');
const { auth } = require('../middleware/auth');

const LIST_TTL   = 15_000;
const DETAIL_TTL = 30_000;

// Must match LABOUR_CONTACT_RATE_PER_DAY in routes/payments.js
const CONTACT_RATE_PER_DAY = 8;

// Best-effort decode of the Authorization header — does NOT reject the request
// if missing/invalid, since profile browsing is public. Used only to determine
// whether a viewer has already paid to unlock this profile's contact info.
function getUserIdFromReq(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET).id;
  } catch {
    return null;
  }
}

// GET /api/labour — browse/search labour profiles
router.get('/', async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(50, parseInt(req.query.limit) || 20);
    const offset   = (page - 1) * limit;
    const district = req.query.district || null;
    const skill    = req.query.skill_category || null;
    const q        = req.query.q || null;
    const type     = ['individual', 'team'].includes(req.query.profile_type) ? req.query.profile_type : null;

    const cacheKey = `labour:${page}:${limit}:${district}:${skill}:${q}:${type}`;
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
    if (type) {
      params.push(type);
      conditions.push(`l.profile_type=$${params.length}`);
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
               l.photo_url, l.id_verified, l.rating_avg, l.rating_count, l.created_at,
               l.profile_type, l.team_size, l.team_composition,
               (l.checked_in_until IS NOT NULL AND l.checked_in_until > NOW()) AS checked_in_today
        FROM labour_profiles l
        WHERE ${where}
        ORDER BY
          (l.checked_in_until IS NOT NULL AND l.checked_in_until > NOW()) DESC,
          (l.availability = 'available') DESC,
          l.created_at DESC
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

// GET /api/labour/:id — profile detail (phone number hidden until unlocked)
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: 'Invalid id' });

    const cacheKey = `labour:detail:${id}`;
    let profile = await cache.get(cacheKey);

    if (!profile) {
      const result = await pool.query(`
        SELECT l.*, u.name AS user_name, u.phone AS user_phone
        FROM labour_profiles l
        LEFT JOIN users u ON u.id = l.user_id
        WHERE l.id = $1 AND l.status = 'active'
      `, [id]);

      if (!result.rows.length) return res.status(404).json({ ok: false, error: 'Profile not found' });
      profile = result.rows[0];
      // Cached server-side only — phone is masked per-request below, never cached unmasked to clients.
      await cache.set(cacheKey, profile, DETAIL_TTL);
    }

    const userId = getUserIdFromReq(req);
    let contactUnlocked = false;
    let unlockExpiresAt = null;

    if (userId && userId === profile.user_id) {
      contactUnlocked = true; // labourer viewing their own profile
    } else if (userId) {
      const { rows } = await pool.query(
        `SELECT expires_at FROM labour_contact_unlocks
         WHERE contractor_id = $1 AND labour_id = $2 AND expires_at > NOW()
         ORDER BY expires_at DESC LIMIT 1`,
        [userId, id]
      );
      if (rows.length) {
        contactUnlocked = true;
        unlockExpiresAt = rows[0].expires_at;
      }
    }

    const hasPhone = !!profile.user_phone;
    const safeProfile = { ...profile, user_phone: contactUnlocked ? profile.user_phone : null };

    // Computed fresh on every request (not cached) — checked_in_until itself
    // is cached on `profile`, but whether it's still in the future can't be,
    // same reasoning as contactUnlocked above.
    const checkedInToday = !!(profile.checked_in_until && new Date(profile.checked_in_until) > new Date());

    res.json({
      ok: true,
      profile: { ...safeProfile, checked_in_today: checkedInToday },
      contactUnlocked,
      unlockExpiresAt,
      contactRatePerDay: CONTACT_RATE_PER_DAY,
      hasPhone, // lets the client hide/disable the paid-unlock flow when there's nothing to unlock
    });
  } catch (err) {
    console.error('[labour] detail error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load profile' });
  }
});

// POST /api/labour — create or update the logged-in user's own labour profile
router.post('/', auth, async (req, res) => {
  try {
    const {
      full_name, phone, skill_category, skills, experience_years,
      daily_wage, district, location, bio, photo_url,
      profile_type, team_size, team_composition,
    } = req.body;

    if (!full_name || !skill_category) {
      return res.status(400).json({ ok: false, error: 'full_name and skill_category are required' });
    }

    // Team profiles: a lead worker posting on behalf of a group needs a
    // headcount of at least 2 — otherwise this is just an individual listing.
    const cleanedType = profile_type === 'team' ? 'team' : 'individual';
    let cleanedTeamSize = null;
    if (cleanedType === 'team') {
      cleanedTeamSize = parseInt(team_size, 10);
      if (!cleanedTeamSize || cleanedTeamSize < 2) {
        return res.status(400).json({ ok: false, error: 'Team profiles need a headcount of at least 2' });
      }
    }
    const cleanedComposition = cleanedType === 'team' ? (team_composition || '').trim().slice(0, 200) || null : null;

    // A labour listing with no contact number is useless to contractors (and
    // can't actually be sold via the paid-unlock flow), so require one here —
    // either freshly supplied or already present on the account.
    const { rows: existingUserRows } = await pool.query('SELECT phone FROM users WHERE id = $1', [req.user.id]);
    const existingPhone = existingUserRows[0]?.phone || null;

    let cleanedPhone = existingPhone;
    if (phone !== undefined && phone !== null && phone !== '') {
      cleanedPhone = String(phone).replace(/\s+/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanedPhone)) {
        return res.status(400).json({ ok: false, error: 'Enter a valid 10-digit Indian mobile number' });
      }
    }
    if (!cleanedPhone) {
      return res.status(400).json({ ok: false, error: 'A contact number is required so contractors can reach you' });
    }
    if (cleanedPhone !== existingPhone) {
      await pool.query('UPDATE users SET phone = $1 WHERE id = $2', [cleanedPhone, req.user.id]);
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
          daily_wage = $5, district = $6, location = $7, bio = $8, photo_url = $9,
          profile_type = $10, team_size = $11, team_composition = $12
        WHERE user_id = $13
        RETURNING *
      `, [full_name, skill_category, skills || [], experience_years || null,
          daily_wage || null, district || 'nanded', location || null, bio || null,
          photo_url || null, cleanedType, cleanedTeamSize, cleanedComposition, req.user.id]);
    } else {
      result = await pool.query(`
        INSERT INTO labour_profiles
          (user_id, full_name, skill_category, skills, experience_years,
           daily_wage, district, location, bio, photo_url,
           profile_type, team_size, team_composition)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING *
      `, [req.user.id, full_name, skill_category, skills || [], experience_years || null,
          daily_wage || null, district || 'nanded', location || null, bio || null,
          photo_url || null, cleanedType, cleanedTeamSize, cleanedComposition]);
    }

    await cache.delPrefix('labour:');
    res.json({ ok: true, profile: result.rows[0] });
  } catch (err) {
    console.error('[labour] create/update error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to save profile' });
  }
});

// POST /api/labour/:id/checkin — "I'm standing at the chowk today"
// Sets a same-day expiry (midnight IST) that bumps this profile to the top
// of search results until it lapses on its own — no cron job needed, every
// read just checks checked_in_until > NOW(). Also nudges availability to
// 'available' since checking in only makes sense if you're ready to work.
router.post('/:id/checkin', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query(`
      UPDATE labour_profiles SET
        checked_in_until = (date_trunc('day', (NOW() AT TIME ZONE 'Asia/Kolkata')) + INTERVAL '1 day') AT TIME ZONE 'Asia/Kolkata',
        availability = 'available'
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [id, req.user.id]);
    if (!result.rows.length) return res.status(404).json({ ok: false, error: 'Profile not found' });

    await cache.delPrefix('labour:');
    res.json({ ok: true, profile: { ...result.rows[0], checked_in_today: true } });
  } catch (err) {
    console.error('[labour] checkin error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to check in' });
  }
});

// DELETE /api/labour/:id/checkin — leave the chowk early (before midnight)
router.delete('/:id/checkin', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query(
      'UPDATE labour_profiles SET checked_in_until = NULL WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ ok: false, error: 'Profile not found' });

    await cache.delPrefix('labour:');
    res.json({ ok: true, profile: { ...result.rows[0], checked_in_today: false } });
  } catch (err) {
    console.error('[labour] checkout error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to check out' });
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
// Requires an active paid contact unlock: hiring is gated behind the same
// pay-per-day contact purchase, so this can't be used to bypass that paywall.
router.post('/:id/hire', auth, async (req, res) => {
  try {
    const labourId = parseInt(req.params.id);
    const { work_description, proposed_wage, work_date } = req.body;

    const labour = await pool.query('SELECT user_id FROM labour_profiles WHERE id = $1', [labourId]);
    if (!labour.rows.length) return res.status(404).json({ ok: false, error: 'Profile not found' });
    if (labour.rows[0].user_id === req.user.id) {
      return res.status(400).json({ ok: false, error: 'You cannot hire yourself' });
    }

    const { rows: unlockRows } = await pool.query(
      `SELECT 1 FROM labour_contact_unlocks
       WHERE contractor_id = $1 AND labour_id = $2 AND expires_at > NOW()
       LIMIT 1`,
      [req.user.id, labourId]
    );
    if (!unlockRows.length) {
      return res.status(402).json({ ok: false, error: 'Unlock this worker\'s contact before sending a hire request.' });
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

// GET /api/labour/hire-requests/sent — hire requests I sent as a contractor
router.get('/hire-requests/sent', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT hr.*, l.full_name AS labour_name, l.skill_category, l.photo_url,
             EXISTS(
               SELECT 1 FROM ratings r WHERE r.hire_request_id = hr.id AND r.rater_id = $1
             ) AS already_rated
      FROM hire_requests hr
      JOIN labour_profiles l ON l.id = hr.labour_id
      WHERE hr.contractor_id = $1
      ORDER BY hr.created_at DESC
    `, [req.user.id]);
    res.json({ ok: true, hireRequests: rows });
  } catch (err) {
    console.error('[labour] hire-requests/sent error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load hire requests' });
  }
});

// GET /api/labour/hire-requests/received — hire requests sent to my labour
// profile. Returns an empty list (not an error) if the user has no profile,
// since a contractor-only account visiting this tab is a normal case.
router.get('/hire-requests/received', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT hr.*, u.name AS contractor_name
      FROM hire_requests hr
      JOIN labour_profiles l ON l.id = hr.labour_id
      JOIN users u ON u.id = hr.contractor_id
      WHERE l.user_id = $1
      ORDER BY hr.created_at DESC
    `, [req.user.id]);
    res.json({ ok: true, hireRequests: rows });
  } catch (err) {
    console.error('[labour] hire-requests/received error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load hire requests' });
  }
});

// PATCH /api/labour/hire-requests/:id — update a hire request's status
//
// FIX: previously ONLY the labourer could ever change status — there was no
// way for the contractor who sent the request to mark it completed or
// cancel it, which meant `status` could get stuck at 'accepted' forever and
// the rating flow (which requires status='completed') was unreachable.
// Now: the labourer can accept/decline a pending request or cancel one, and
// either side can mark an accepted job completed or cancelled. Transitions
// are also validated so e.g. a declined request can't be reopened.
router.patch('/hire-requests/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (!['accepted', 'declined', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status' });
    }

    const { rows } = await pool.query(`
      SELECT hr.*, l.user_id AS labourer_user_id
      FROM hire_requests hr
      JOIN labour_profiles l ON l.id = hr.labour_id
      WHERE hr.id = $1
    `, [id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Hire request not found' });
    const hr = rows[0];

    const isLabourer   = hr.labourer_user_id === req.user.id;
    const isContractor = hr.contractor_id === req.user.id;
    if (!isLabourer && !isContractor) {
      return res.status(403).json({ ok: false, error: 'Not authorized to update this hire request' });
    }

    // Who is allowed to set which target status
    const labourerAllowed   = ['accepted', 'declined', 'completed', 'cancelled'];
    const contractorAllowed = ['completed', 'cancelled'];
    const allowed = isLabourer ? labourerAllowed : contractorAllowed;
    if (!allowed.includes(status)) {
      return res.status(403).json({ ok: false, error: 'Not authorized to set this status' });
    }

    // Valid forward transitions from the current status
    const validFrom = {
      pending:   ['accepted', 'declined', 'cancelled'],
      accepted:  ['completed', 'cancelled'],
    };
    if (!validFrom[hr.status]?.includes(status)) {
      return res.status(400).json({ ok: false, error: `Cannot change status from '${hr.status}' to '${status}'` });
    }

    const result = await pool.query(
      'UPDATE hire_requests SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    res.json({ ok: true, hireRequest: result.rows[0] });
  } catch (err) {
    console.error('[labour] hire-request update error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to update hire request' });
  }
});

module.exports = router;
