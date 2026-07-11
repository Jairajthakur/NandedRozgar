const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { pool, cache } = require('../db');
const { auth } = require('../middleware/auth');

const LIST_TTL   = 15_000;
const DETAIL_TTL = 30_000;
const WAGE_BOARD_TTL = 30 * 60_000; // going rates move slowly, refresh every 30 min
const WAGE_BOARD_MIN_SAMPLES = 3;   // don't show a rate until enough listings back it up
const REHIRE_FREE_DAYS = 3;         // free re-unlock window granted on a repeat hire
const MAX_UNLOCK_DAYS = 30;         // sanity cap on a single wallet debit, not a real limit

// Single source of truth for the contact-unlock rate — the old duplicate in
// routes/payments.js is gone now that unlocks are a wallet debit handled
// entirely here instead of a separate Cashfree checkout per unlock.
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

// GET /api/labour/localities — distinct micro-neighbourhoods with active
// listings in a district, for the "hyper-local discovery" area dropdown.
router.get('/localities', async (req, res) => {
  try {
    const district = req.query.district || null;
    const params = [];
    // LOOPHOLE FIX: a banned/deactivated worker account (users.active=false)
    // previously kept showing up here (and everywhere else in this file) as
    // long as their labour_profiles.status stayed 'active' — admin bans never
    // touched labour_profiles, so a banned worker's listing, wage-board entry,
    // leaderboard spot, and profile stayed fully live and hireable. Every
    // read below now requires the owning user to still be active.
    let where = "l.status='active' AND l.location IS NOT NULL AND l.location <> '' AND u.active = true";
    if (district) {
      params.push(district);
      where += ` AND (l.district=$${params.length} OR l.district IS NULL)`;
    }
    const { rows } = await pool.query(
      `SELECT l.location, COUNT(*) AS count
       FROM labour_profiles l JOIN users u ON u.id = l.user_id
       WHERE ${where}
       GROUP BY l.location ORDER BY count DESC LIMIT 30`,
      params
    );
    res.json({ ok: true, localities: rows.map(r => ({ name: r.location, count: parseInt(r.count) })) });
  } catch (err) {
    console.error('localities error:', err.message);
    res.status(500).json({ ok: false, error: 'Could not load localities' });
  }
});

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
    const locality = req.query.locality || null; // micro-neighbourhood, e.g. "Shivaji Nagar"

    const cacheKey = `labour:${page}:${limit}:${district}:${skill}:${q}:${type}:${locality}`;
    const hit = await cache.get(cacheKey);
    if (hit) return res.json(hit);

    // LOOPHOLE FIX: exclude banned/deactivated worker accounts — see note in
    // GET /localities above.
    const conditions = ["l.status='active'", "u.active = true"];
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
    if (locality) {
      params.push(locality);
      conditions.push(`l.location=$${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(l.full_name ILIKE $${params.length} OR l.skill_category ILIKE $${params.length})`);
    }

    const where = conditions.join(' AND ');
    const countParams = [...params];
    params.push(limit, offset);

    const [countRes, dataRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM labour_profiles l JOIN users u ON u.id = l.user_id WHERE ${where}`, countParams),
      pool.query(`
        SELECT l.id, l.full_name, l.skill_category, l.skills, l.experience_years,
               l.daily_wage, l.district, l.location, l.availability, l.bio,
               l.photo_url, l.id_verified, l.rating_avg, l.rating_count, l.created_at,
               l.profile_type, l.team_size, l.team_composition,
               (l.checked_in_until IS NOT NULL AND l.checked_in_until > NOW()) AS checked_in_today,
               (SELECT COUNT(DISTINCT hr.contractor_id) FROM hire_requests hr
                  WHERE hr.labour_id = l.id AND hr.status = 'completed') AS trusted_count
        FROM labour_profiles l JOIN users u ON u.id = l.user_id
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

// GET /api/labour/wage-board — "today's going rate" per skill, chowk-style.
// Median daily rate per skill_category among active listings, so contractors
// have a reason to open the app even when they're not hiring right now.
// Team listings carry a *combined* crew rate, so they're normalized to a
// per-person figure (daily_wage / team_size) before being folded into the
// same median as individual listings — a contractor comparing "what does a
// mason cost today" doesn't care whether that mason posted solo or as part
// of a crew.
router.get('/wage-board', async (req, res) => {
  try {
    const district = req.query.district || null;
    const cacheKey = `labour:wageboard:${district}`;
    const hit = await cache.get(cacheKey);
    if (hit) return res.json(hit);

    const params = [];
    // LOOPHOLE FIX: exclude banned/deactivated worker accounts — see note in
    // GET /localities above.
    const conditions = ["l.status='active'", "l.daily_wage IS NOT NULL", "l.daily_wage > 0", "u.active = true"];
    if (district) {
      params.push(district);
      conditions.push(`(l.district=$${params.length} OR l.district IS NULL)`);
    }
    const where = conditions.join(' AND ');

    const { rows } = await pool.query(`
      SELECT
        l.skill_category,
        COUNT(*)::int AS sample_size,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY l.daily_wage / GREATEST(COALESCE(l.team_size, 1), 1)
        ))::int AS median_wage,
        MIN(ROUND(l.daily_wage / GREATEST(COALESCE(l.team_size, 1), 1)))::int AS min_wage,
        MAX(ROUND(l.daily_wage / GREATEST(COALESCE(l.team_size, 1), 1)))::int AS max_wage
      FROM labour_profiles l JOIN users u ON u.id = l.user_id
      WHERE ${where}
      GROUP BY l.skill_category
      ORDER BY sample_size DESC
    `, params);

    const rates = rows
      .filter(r => r.sample_size >= WAGE_BOARD_MIN_SAMPLES)
      .map(r => ({
        skill_category: r.skill_category,
        median_wage: r.median_wage,
        min_wage: r.min_wage,
        max_wage: r.max_wage,
        sample_size: r.sample_size,
      }));

    const payload = { ok: true, district, rates, generatedAt: new Date().toISOString() };
    await cache.set(cacheKey, payload, WAGE_BOARD_TTL);
    res.json(payload);
  } catch (err) {
    console.error('[labour] wage-board error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load wage board' });
  }
});

// GET /api/labour/leaderboard — "hired today" + "waiting today" counters and
// the top 5 most-hired workers this calendar month. Shown only to workers
// themselves (frontend gates this to a user's own labour profile view) —
// this endpoint returns aggregate stats only, no contractor-identifying data.
const LEADERBOARD_TTL = 5 * 60_000; // refresh every 5 min — a dashboard stat, not real-time
router.get('/leaderboard', async (req, res) => {
  try {
    const district = req.query.district || null;
    const cacheKey = `labour:leaderboard:${district}`;
    const hit = await cache.get(cacheKey);
    if (hit) return res.json(hit);

    const districtCond = district ? `AND l.district = $1` : '';
    const districtParams = district ? [district] : [];

    // LOOPHOLE FIX: exclude banned/deactivated worker accounts from every
    // public-facing count/showcase — see note in GET /localities above.
    const [hiredTodayRes, waitingTodayRes, topRes] = await Promise.all([
      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM hire_requests hr
        JOIN labour_profiles l ON l.id = hr.labour_id
        JOIN users u ON u.id = l.user_id
        WHERE hr.status IN ('accepted', 'completed')
          AND hr.created_at::date = CURRENT_DATE
          AND u.active = true
          ${districtCond}
      `, districtParams),
      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM labour_profiles l
        JOIN users u ON u.id = l.user_id
        WHERE l.status = 'active'
          AND l.checked_in_until IS NOT NULL AND l.checked_in_until > NOW()
          AND u.active = true
          ${districtCond}
      `, districtParams),
      pool.query(`
        SELECT l.id, l.full_name, l.skill_category, l.photo_url,
               COUNT(hr.id)::int AS hire_count
        FROM hire_requests hr
        JOIN labour_profiles l ON l.id = hr.labour_id
        JOIN users u ON u.id = l.user_id
        WHERE hr.status IN ('accepted', 'completed')
          AND date_trunc('month', hr.created_at) = date_trunc('month', CURRENT_DATE)
          AND u.active = true
          ${districtCond}
        GROUP BY l.id, l.full_name, l.skill_category, l.photo_url
        ORDER BY hire_count DESC, l.id ASC
        LIMIT 5
      `, districtParams),
    ]);

    const payload = {
      ok: true,
      hiredToday: hiredTodayRes.rows[0]?.count || 0,
      waitingToday: waitingTodayRes.rows[0]?.count || 0,
      topThisMonth: topRes.rows,
      generatedAt: new Date().toISOString(),
    };

    await cache.set(cacheKey, payload, LEADERBOARD_TTL);
    res.json(payload);
  } catch (err) {
    console.error('[labour] leaderboard error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load leaderboard' });
  }
});

// GET /api/labour/mine — the logged-in user's own labour profile, if any.
// Powers the worker dashboard header (name/skill/rating/availability/
// check-in state) so it doesn't have to be looked up by id. Registered
// before GET /:id so "mine" is never swallowed as an :id param.
router.get('/mine', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM labour_profiles WHERE user_id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.json({ ok: true, profile: null });

    const profile = rows[0];
    const checkedInToday = !!(profile.checked_in_until && new Date(profile.checked_in_until) > new Date());
    res.json({ ok: true, profile: { ...profile, checked_in_today: checkedInToday } });
  } catch (err) {
    console.error('[labour] mine error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load your profile' });
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
      // LOOPHOLE FIX: was a LEFT JOIN with only l.status checked, so a banned/
      // deactivated owner's profile (u.active = false) still loaded in full —
      // paid unlocks and hire requests against a banned worker kept working.
      // Now an inner join gated on u.active = true, same as every other
      // public read in this file — a banned worker's profile 404s like a
      // deleted one instead of silently staying live.
      const result = await pool.query(`
        SELECT l.*, u.name AS user_name, u.phone AS user_phone
        FROM labour_profiles l
        JOIN users u ON u.id = l.user_id
        WHERE l.id = $1 AND l.status = 'active' AND u.active = true
      `, [id]);

      if (!result.rows.length) return res.status(404).json({ ok: false, error: 'Profile not found' });
      profile = result.rows[0];
      // Cached server-side only — phone is masked per-request below, never cached unmasked to clients.
      await cache.set(cacheKey, profile, DETAIL_TTL);
    }

    const userId = getUserIdFromReq(req);
    let contactUnlocked = false;
    let unlockExpiresAt = null;
    let previouslyHired = false;

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

      // Real chowk relationships are repeat relationships — once a contractor
      // has actually finished a job with this worker, later visits don't need
      // to re-charge for the same contact. See POST /:id/rehire-unlock.
      const { rows: completedRows } = await pool.query(
        `SELECT 1 FROM hire_requests WHERE contractor_id = $1 AND labour_id = $2 AND status = 'completed' LIMIT 1`,
        [userId, id]
      );
      previouslyHired = completedRows.length > 0;
    }

    let isFavourited = false;
    if (userId) {
      const { rows: favRows } = await pool.query(
        'SELECT 1 FROM labour_favourites WHERE contractor_id = $1 AND labour_id = $2',
        [userId, id]
      );
      isFavourited = favRows.length > 0;
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
      previouslyHired, // lets the client show a "Hire again" shortcut instead of the paid unlock flow
      rehireFreeDays: REHIRE_FREE_DAYS,
      isFavourited,
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

// POST /api/labour/:id/unlock — pay-per-day contact unlock, paid from the
// in-app wallet instead of a per-unlock Cashfree checkout.
// Replaces the old two-step POST /api/payments/order+verify/labour-contact
// flow: no gateway round-trip, no waiting on a UPI confirmation — the wallet
// balance is checked and debited in one locked transaction, so this either
// succeeds immediately or fails immediately with a clear "top up" error.
router.post('/:id/unlock', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const labourId = parseInt(req.params.id);
    const days = Math.min(MAX_UNLOCK_DAYS, Math.max(1, parseInt(req.body.days) || 1));
    if (!labourId) return res.status(400).json({ ok: false, error: 'Invalid id' });

    // Same active-profile / active-owner guard as every other labour read —
    // can't pay to unlock a hidden, banned, or deactivated worker.
    const { rows: labourRows } = await pool.query(`
      SELECT l.id, l.user_id, u.phone AS labourer_phone
      FROM labour_profiles l JOIN users u ON u.id = l.user_id
      WHERE l.id = $1 AND l.status = 'active' AND u.active = true
    `, [labourId]);
    if (!labourRows.length) return res.status(404).json({ ok: false, error: 'Profile not found' });
    if (labourRows[0].user_id === req.user.id) {
      return res.status(400).json({ ok: false, error: 'You cannot pay to unlock your own profile.' });
    }
    if (!labourRows[0].labourer_phone) {
      return res.status(400).json({ ok: false, error: 'This profile does not have a contact number on file yet.' });
    }

    const amount = days * CONTACT_RATE_PER_DAY;

    await client.query('BEGIN');

    // Row lock on the wallet for the duration of the transaction — without
    // this, two concurrent unlock requests could both read a balance that
    // covers the debit, and both go through, taking the wallet negative.
    const { rows: balRows } = await client.query(
      'SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [req.user.id]
    );
    const balance = parseFloat(balRows[0]?.wallet_balance || 0);
    if (balance < amount) {
      await client.query('ROLLBACK');
      return res.status(402).json({
        ok: false,
        error: `Insufficient wallet balance. You need ₹${amount} but have ₹${balance.toFixed(2)}.`,
        balance,
        required: amount,
      });
    }

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const { rows: unlockRows } = await client.query(`
      INSERT INTO labour_contact_unlocks
        (contractor_id, labour_id, days, amount, cashfree_order_id, expires_at)
      VALUES ($1,$2,$3,$4,'WALLET',$5)
      RETURNING id
    `, [req.user.id, labourId, days, amount, expiresAt]);

    const { rows: newBalRows } = await client.query(
      'UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2 RETURNING wallet_balance',
      [amount, req.user.id]
    );
    const newBalance = newBalRows[0].wallet_balance;

    await client.query(`
      INSERT INTO wallet_transactions
        (user_id, type, amount, balance_after, reason, reference_type, reference_id)
      VALUES ($1, 'debit', $2, $3, 'labour_contact_unlock', 'labour_contact_unlocks', $4)
    `, [req.user.id, amount, newBalance, unlockRows[0].id]);

    const { rows: profileRows } = await client.query(`
      SELECT l.*, u.name AS user_name, u.phone AS user_phone
      FROM labour_profiles l JOIN users u ON u.id = l.user_id
      WHERE l.id = $1
    `, [labourId]);

    await client.query('COMMIT');
    res.json({
      ok: true,
      profile: profileRows[0],
      expiresAt,
      days,
      amount,
      walletBalance: parseFloat(newBalance),
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[labour] unlock error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to unlock contact' });
  } finally {
    client.release();
  }
});

// POST /api/labour/:id/hire — contractor sends a hire request
// Requires an active paid contact unlock: hiring is gated behind the same
// pay-per-day contact purchase, so this can't be used to bypass that paywall.
router.post('/:id/hire', auth, async (req, res) => {
  try {
    const labourId = parseInt(req.params.id);
    const { work_description, proposed_wage, work_date } = req.body;

    // LOOPHOLE FIX: this previously didn't check labour_profiles.status or
    // the owning user's active flag at all — a hire request (and the whole
    // rehire-free-unlock chain it feeds) could be sent to a hidden, banned,
    // or already-deactivated worker.
    const labour = await pool.query(`
      SELECT l.user_id FROM labour_profiles l JOIN users u ON u.id = l.user_id
      WHERE l.id = $1 AND l.status = 'active' AND u.active = true
    `, [labourId]);
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

// POST /api/labour/:id/rehire-unlock — "Hire again" shortcut.
// Real chowk relationships are repeat relationships: a contractor who has
// already finished a job with this worker shouldn't have to pay to unlock
// the same phone number again. Grants a short free re-unlock window instead
// of re-charging — gated strictly behind a genuine COMPLETED hire between
// this exact contractor/labour pair, so it can't be used to skip paying the
// first time.
router.post('/:id/rehire-unlock', auth, async (req, res) => {
  try {
    const labourId = parseInt(req.params.id);
    if (!labourId) return res.status(400).json({ ok: false, error: 'Invalid id' });

    // LOOPHOLE FIX: was scoped to labour_profiles.status only, so a banned
    // worker's owner could still be re-unlocked for free.
    const labour = await pool.query(`
      SELECT l.user_id FROM labour_profiles l JOIN users u ON u.id = l.user_id
      WHERE l.id = $1 AND l.status = 'active' AND u.active = true
    `, [labourId]);
    if (!labour.rows.length) return res.status(404).json({ ok: false, error: 'Profile not found' });
    if (labour.rows[0].user_id === req.user.id) {
      return res.status(400).json({ ok: false, error: 'This is your own profile' });
    }

    const { rows: completedRows } = await pool.query(
      `SELECT 1 FROM hire_requests WHERE contractor_id = $1 AND labour_id = $2 AND status = 'completed' LIMIT 1`,
      [req.user.id, labourId]
    );
    if (!completedRows.length) {
      return res.status(403).json({ ok: false, error: "You haven't completed a hire with this worker yet." });
    }

    // Already unlocked (e.g. from a recent paid unlock or an earlier free
    // grant that hasn't expired) — nothing to do, just report the existing window.
    const { rows: activeRows } = await pool.query(
      `SELECT expires_at FROM labour_contact_unlocks
       WHERE contractor_id = $1 AND labour_id = $2 AND expires_at > NOW()
       ORDER BY expires_at DESC LIMIT 1`,
      [req.user.id, labourId]
    );

    let expiresAt;
    if (activeRows.length) {
      expiresAt = activeRows[0].expires_at;
    } else {
      expiresAt = new Date(Date.now() + REHIRE_FREE_DAYS * 24 * 60 * 60 * 1000);
      await pool.query(`
        INSERT INTO labour_contact_unlocks
          (contractor_id, labour_id, days, amount, cashfree_order_id, expires_at)
        VALUES ($1,$2,$3,0,$4,$5)
      `, [req.user.id, labourId, REHIRE_FREE_DAYS, 'REPEAT_HIRE_FREE', expiresAt]);
    }

    const { rows } = await pool.query(`
      SELECT l.*, u.name AS user_name, u.phone AS user_phone
      FROM labour_profiles l LEFT JOIN users u ON u.id = l.user_id
      WHERE l.id = $1
    `, [labourId]);

    res.json({
      ok: true,
      profile: rows[0],
      contactUnlocked: true,
      unlockExpiresAt: expiresAt,
      freeDays: REHIRE_FREE_DAYS,
    });
  } catch (err) {
    console.error('[labour] rehire-unlock error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to unlock contact' });
  }
});

// POST /api/labour/:id/favourite — save a worker to my favourites
router.post('/:id/favourite', auth, async (req, res) => {
  try {
    const labourId = parseInt(req.params.id);
    const labour = await pool.query('SELECT id FROM labour_profiles WHERE id = $1', [labourId]);
    if (!labour.rows.length) return res.status(404).json({ ok: false, error: 'Profile not found' });

    await pool.query(`
      INSERT INTO labour_favourites (contractor_id, labour_id)
      VALUES ($1, $2)
      ON CONFLICT (contractor_id, labour_id) DO NOTHING
    `, [req.user.id, labourId]);

    res.json({ ok: true, favourited: true });
  } catch (err) {
    console.error('[labour] favourite error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to save worker' });
  }
});

// DELETE /api/labour/:id/favourite — remove a worker from my favourites
router.delete('/:id/favourite', auth, async (req, res) => {
  try {
    const labourId = parseInt(req.params.id);
    await pool.query(
      'DELETE FROM labour_favourites WHERE contractor_id = $1 AND labour_id = $2',
      [req.user.id, labourId]
    );
    res.json({ ok: true, favourited: false });
  } catch (err) {
    console.error('[labour] unfavourite error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to remove saved worker' });
  }
});

// GET /api/labour/favourites/mine — my saved/favourited workers
router.get('/favourites/mine', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT l.id, l.full_name, l.skill_category, l.skills, l.experience_years,
             l.daily_wage, l.district, l.location, l.availability, l.bio,
             l.photo_url, l.id_verified, l.rating_avg, l.rating_count,
             l.profile_type, l.team_size, l.team_composition,
             (l.checked_in_until IS NOT NULL AND l.checked_in_until > NOW()) AS checked_in_today,
             f.created_at AS favourited_at
      FROM labour_favourites f
      JOIN labour_profiles l ON l.id = f.labour_id
      JOIN users u ON u.id = l.user_id
      WHERE f.contractor_id = $1 AND l.status = 'active' AND u.active = true
      ORDER BY f.created_at DESC
    `, [req.user.id]);
    res.json({ ok: true, labourers: rows, total: rows.length });
  } catch (err) {
    console.error('[labour] favourites/mine error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load saved workers' });
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
