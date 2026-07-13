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
// Contact unlock: ₹10/day total, split ₹5 platform / ₹5 to the labourer,
// credited instantly (no hold — the contractor already got the phone number
// they paid for, so unlike a hire completion there's nothing to dispute).
const CONTACT_RATE_PER_DAY = 10;
const CONTACT_COMMISSION_PER_DAY = 5;

// ── Labour earnings pipeline ────────────────────────────────────────────────
// Charged to the contractor when a hire request is ACCEPTED (not when sent —
// charging on send would let someone spam requests for free profile
// visibility with no intent to hire).
const HIRE_FEE = 10;
// Credited to the labourer when a hire request is COMPLETED (not accepted —
// crediting on accept would let a contractor/labourer pair farm commissions
// via accept-then-cancel with no work ever done).
const LABOUR_COMMISSION = 5;
// Hold window before a commission is withdrawable, so a job disputed shortly
// after being marked "completed" can still be clawed back.
const PAYOUT_HOLD_HOURS = 48;
const MIN_WITHDRAWAL = 50;
// Velocity cap: max commission-eligible completions per contractor↔labourer
// pair per day. Farming a ₹5 commission via a repeated same-pair accept→
// complete loop nets the colluding pair a net LOSS (they pay ₹10, get ₹5
// back) so it isn't directly profitable — but capping the pair's daily rate
// still bounds exposure and flags unusual velocity for review.
const MAX_PAIR_COMPLETIONS_PER_DAY = 3;

// ── Milestone rewards ────────────────────────────────────────────────────
// Physical items the platform hands a worker as they build a track record.
// Counting is "fresh start" from labour_reward_settings.rewards_start_at
// (see db.js) — only completions from when this feature shipped count, so
// existing high-completion workers aren't instantly credited.
// Ad-hoc multi-select hire: sanity cap on how many workers a contractor can
// bundle into one bulk-hire action (a pre-formed Crew has no such cap since
// its size is set by the leader when building the team).
const MAX_BULK_HIRE = 20;

const MILESTONE_REWARDS = [
  { reward_type: 'id_card', milestone_bookings: 5 },
  { reward_type: 'tshirt',  milestone_bookings: 10 },
];

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

// PATCH /api/labour/:id/live-now — "Available right now" toggle for the
// Digital Labour Chowk. Distinct from the longer-lived `availability` enum:
// this is the on/off switch a worker flips to say "I'm ready to grab my
// tools and come right now", auto-expiring at end of day (IST) so a forgotten
// toggle doesn't leave them listed as available forever.
router.patch('/:id/live-now', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { isAvailable, lat, lng } = req.body;

    const availableUntil = isAvailable
      ? new Date(new Date().setHours(23, 59, 59, 999))
      : null;

    const hasCoords = Number.isFinite(parseFloat(lat)) && Number.isFinite(parseFloat(lng));

    const { rows } = await pool.query(`
      UPDATE labour_profiles SET
        is_available_now = $1,
        available_until   = $2,
        lat = COALESCE($3, lat),
        lng = COALESCE($4, lng)
      WHERE id = $5 AND user_id = $6
      RETURNING *
    `, [!!isAvailable, availableUntil, hasCoords ? parseFloat(lat) : null, hasCoords ? parseFloat(lng) : null, id, req.user.id]);

    if (!rows.length) return res.status(404).json({ ok: false, error: 'Profile not found' });

    await cache.delPrefix('labour:');
    res.json({ ok: true, profile: rows[0] });
  } catch (err) {
    console.error('[labour] live-now error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to update live status' });
  }
});

// GET /api/labour/radar — Contractor Radar Map: workers who are "Available
// right now" within a radius (km) of the contractor's current location.
// Falls back to district-only filtering if no lat/lng is supplied.
router.get('/nearby/radar', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = Math.min(25, Math.max(1, parseInt(req.query.radiusKm, 10) || 5));
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

    const params = [];
    let distanceSelect = 'NULL AS distance_km';
    let distanceFilter = '';
    if (hasCoords) {
      params.push(lat, lng);
      distanceSelect = `(
        6371 * acos(LEAST(1, GREATEST(-1,
          cos(radians(l.lat)) * cos(radians($${params.length - 1})) *
          cos(radians($${params.length}) - radians(l.lng)) +
          sin(radians(l.lat)) * sin(radians($${params.length - 1}))
        )))
      ) AS distance_km`;
      distanceFilter = `AND l.lat IS NOT NULL AND l.lng IS NOT NULL AND (
        6371 * acos(LEAST(1, GREATEST(-1,
          cos(radians(l.lat)) * cos(radians($${params.length - 1})) *
          cos(radians($${params.length}) - radians(l.lng)) +
          sin(radians(l.lat)) * sin(radians($${params.length - 1}))
        )))
      ) <= ${radiusKm}`;
    }

    const { rows } = await pool.query(`
      SELECT l.id, l.full_name, l.skill_category, l.daily_wage, l.location,
             l.district, l.photo_url, l.rating_avg, l.rating_count,
             l.profile_type, l.team_size, ${distanceSelect}
      FROM labour_profiles l
      JOIN users u ON u.id = l.user_id
      WHERE l.status = 'active' AND u.active = true
        AND l.is_available_now = TRUE
        AND (l.available_until IS NULL OR l.available_until > NOW())
        ${distanceFilter}
      ORDER BY ${hasCoords ? 'distance_km ASC' : 'l.created_at DESC'}
      LIMIT 50
    `, params);

    res.json({ ok: true, workers: rows, radiusKm: hasCoords ? radiusKm : null });
  } catch (err) {
    console.error('[labour] radar error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load nearby workers' });
  }
});

// GET /api/labour/nearby/heatmap — Live Work Location Clusters.
// Aggregates open demand (active jobs with coordinates + pending hire
// requests with a site location) into coarse grid cells so a worker can see
// where work is spiking right now and decide which direction to commute,
// the same way a ride-sharing driver reads a demand heat-map. Grid cell
// size is ~1.1km (0.01°) — fine enough to be useful, coarse enough that a
// handful of open jobs in one area still forms a visible cluster.
router.get('/nearby/heatmap', async (req, res) => {
  try {
    const districtFilter = req.query.district ? 'AND district = $1' : '';
    const params = req.query.district ? [req.query.district] : [];

    const { rows: jobCells } = await pool.query(`
      SELECT ROUND(lat::numeric, 2) AS cell_lat, ROUND(lng::numeric, 2) AS cell_lng,
             COUNT(*)::int AS demand_count, 'job' AS source
      FROM jobs
      WHERE status = 'active' AND lat IS NOT NULL AND lng IS NOT NULL ${districtFilter}
      GROUP BY cell_lat, cell_lng
    `, params);

    const { rows: hireCells } = await pool.query(`
      SELECT ROUND(site_lat::numeric, 2) AS cell_lat, ROUND(site_lng::numeric, 2) AS cell_lng,
             COUNT(*)::int AS demand_count, 'hire' AS source
      FROM hire_requests
      WHERE status = 'pending' AND site_lat IS NOT NULL AND site_lng IS NOT NULL
        AND created_at > NOW() - INTERVAL '7 days'
      GROUP BY cell_lat, cell_lng
    `);

    // Merge both sources into one cell → count map so overlapping cells combine.
    const merged = new Map();
    for (const c of [...jobCells, ...hireCells]) {
      const key = `${c.cell_lat},${c.cell_lng}`;
      const prev = merged.get(key);
      merged.set(key, { lat: parseFloat(c.cell_lat), lng: parseFloat(c.cell_lng), count: (prev?.count || 0) + c.demand_count });
    }

    const points = [...merged.values()].sort((a, b) => b.count - a.count).slice(0, 200);
    const maxCount = points.length ? points[0].count : 0;

    res.json({
      ok: true,
      points: points.map(p => ({ ...p, intensity: maxCount ? +(p.count / maxCount).toFixed(2) : 0 })),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[labour] heatmap error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load demand heatmap' });
  }
});

// POST /api/labour/:id/endorse-skill — Micro-Skill Verification Badges.
// A contractor who completed a hire with this worker endorses a specific
// named skill (e.g. "Tiling"). Once 3 distinct contractors have endorsed the
// same skill, it becomes a verified badge shown on the worker's card.
router.post('/:id/endorse-skill', auth, async (req, res) => {
  try {
    const labourId = parseInt(req.params.id);
    const { skillName, hireRequestId } = req.body;
    const skill = (skillName || '').trim().slice(0, 50);
    if (!skill) return res.status(400).json({ ok: false, error: 'skillName is required' });
    if (!hireRequestId) return res.status(400).json({ ok: false, error: 'hireRequestId is required' });

    // Only the contractor on a COMPLETED hire with this worker can endorse —
    // prevents strangers from padding a worker's badge count.
    const { rows: hrRows } = await pool.query(
      `SELECT id FROM hire_requests WHERE id = $1 AND labour_id = $2 AND contractor_id = $3 AND status = 'completed'`,
      [hireRequestId, labourId, req.user.id]
    );
    if (!hrRows.length) {
      return res.status(403).json({ ok: false, error: 'You can only endorse skills for a completed hire with this worker' });
    }

    await pool.query(`
      INSERT INTO labour_skill_endorsements (labour_id, contractor_id, hire_request_id, skill_name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (contractor_id, labour_id, skill_name, hire_request_id) DO NOTHING
    `, [labourId, req.user.id, hireRequestId, skill]);

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(DISTINCT contractor_id)::int AS n FROM labour_skill_endorsements WHERE labour_id = $1 AND skill_name = $2`,
      [labourId, skill]
    );
    const n = countRows[0].n;
    const VERIFY_THRESHOLD = 3;

    const { rows: badgeRows } = await pool.query(`
      INSERT INTO labour_skill_badges (labour_id, skill_name, endorsement_count, is_verified, verified_at)
      VALUES ($1, $2, $3, $4, CASE WHEN $4 THEN NOW() ELSE NULL END)
      ON CONFLICT (labour_id, skill_name) DO UPDATE SET
        endorsement_count = $3,
        is_verified = $4,
        verified_at = COALESCE(labour_skill_badges.verified_at, CASE WHEN $4 THEN NOW() ELSE NULL END)
      RETURNING *
    `, [labourId, skill, n, n >= VERIFY_THRESHOLD]);

    res.json({ ok: true, badge: badgeRows[0] });
  } catch (err) {
    console.error('[labour] endorse-skill error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to endorse skill' });
  }
});

// GET /api/labour/:id/badges — public list of a worker's verified skill badges
router.get('/:id/badges', async (req, res) => {
  try {
    const labourId = parseInt(req.params.id);
    const { rows } = await pool.query(
      `SELECT skill_name, endorsement_count, is_verified, verified_at
       FROM labour_skill_badges WHERE labour_id = $1 AND is_verified = TRUE ORDER BY verified_at ASC`,
      [labourId]
    );
    res.json({ ok: true, badges: rows });
  } catch (err) {
    console.error('[labour] badges error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load badges' });
  }
});

// PATCH /api/labour/:id/voice-bio — save the URL of a recorded audio intro
// (uploaded beforehand via POST /api/upload) plus its duration/language.
// Lets literacy-challenged workers speak their profile instead of typing it.
router.patch('/:id/voice-bio', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { voiceBioUrl, durationSec, lang } = req.body;
    if (!voiceBioUrl) return res.status(400).json({ ok: false, error: 'voiceBioUrl is required' });

    const dur = Math.min(60, Math.max(1, parseInt(durationSec, 10) || 30));

    const { rows } = await pool.query(`
      UPDATE labour_profiles SET
        voice_bio_url = $1,
        voice_bio_duration_sec = $2,
        voice_bio_lang = $3
      WHERE id = $4 AND user_id = $5
      RETURNING *
    `, [voiceBioUrl, dur, (lang || 'mr').slice(0, 10), id, req.user.id]);

    if (!rows.length) return res.status(404).json({ ok: false, error: 'Profile not found' });
    await cache.delPrefix('labour:');
    res.json({ ok: true, profile: rows[0] });
  } catch (err) {
    console.error('[labour] voice-bio error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to save voice bio' });
  }
});

// DELETE /api/labour/:id/voice-bio — remove a recorded voice bio
router.delete('/:id/voice-bio', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { rows } = await pool.query(
      `UPDATE labour_profiles SET voice_bio_url = NULL, voice_bio_duration_sec = NULL
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Profile not found' });
    await cache.delPrefix('labour:');
    res.json({ ok: true, profile: rows[0] });
  } catch (err) {
    console.error('[labour] delete voice-bio error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to remove voice bio' });
  }
});

// POST /api/labour/:id/unlock — FREE contact unlock. Reveals the worker's
// phone number and satisfies the "must unlock before hiring" gate below, but
// charges nothing and pays the labourer no commission here.
//
// CHANGED: contractors used to be charged ₹10/day here AND ₹10 again on
// hire-accept — a double charge for what is really one transaction (find
// the worker, then hire them). Now the only money that moves in the whole
// labour flow is the single HIRE_FEE, charged once when a hire request is
// accepted. CONTACT_RATE_PER_DAY / CONTACT_COMMISSION_PER_DAY are kept
// defined above for reference but are no longer applied to a real charge.
router.post('/:id/unlock', auth, async (req, res) => {
  try {
    const labourId = parseInt(req.params.id);
    const days = Math.min(MAX_UNLOCK_DAYS, Math.max(1, parseInt(req.body.days) || 1));
    if (!labourId) return res.status(400).json({ ok: false, error: 'Invalid id' });

    // Same active-profile / active-owner guard as every other labour read —
    // can't unlock a hidden, banned, or deactivated worker.
    const { rows: labourRows } = await pool.query(`
      SELECT l.id, l.user_id, u.phone AS labourer_phone
      FROM labour_profiles l JOIN users u ON u.id = l.user_id
      WHERE l.id = $1 AND l.status = 'active' AND u.active = true
    `, [labourId]);
    if (!labourRows.length) return res.status(404).json({ ok: false, error: 'Profile not found' });
    if (labourRows[0].user_id === req.user.id) {
      return res.status(400).json({ ok: false, error: 'You cannot unlock your own profile.' });
    }
    if (!labourRows[0].labourer_phone) {
      return res.status(400).json({ ok: false, error: 'This profile does not have a contact number on file yet.' });
    }

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const { rows: unlockRows } = await pool.query(`
      INSERT INTO labour_contact_unlocks
        (contractor_id, labour_id, days, amount, cashfree_order_id, expires_at)
      VALUES ($1,$2,$3,0,'FREE',$4)
      RETURNING id
    `, [req.user.id, labourId, days, expiresAt]);

    const { rows: profileRows } = await pool.query(`
      SELECT l.*, u.name AS user_name, u.phone AS user_phone
      FROM labour_profiles l JOIN users u ON u.id = l.user_id
      WHERE l.id = $1
    `, [labourId]);

    res.json({
      ok: true,
      profile: profileRows[0],
      expiresAt,
      days,
      amount: 0,
      commissionCredited: 0,
      unlockId: unlockRows[0].id,
    });
  } catch (err) {
    console.error('[labour] unlock error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to unlock contact' });
  }
});

// POST /api/labour/:id/hire — contractor sends a hire request
// Requires an active paid contact unlock: hiring is gated behind the same
// pay-per-day contact purchase, so this can't be used to bypass that paywall.
router.post('/:id/hire', auth, async (req, res) => {
  try {
    const labourId = parseInt(req.params.id);
    const { work_description, proposed_wage, work_date, projectId } = req.body;

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

    let validProjectId = null;
    if (projectId) {
      const { rows: projRows } = await pool.query(
        'SELECT id FROM labour_projects WHERE id = $1 AND contractor_id = $2', [projectId, req.user.id]
      );
      if (!projRows.length) return res.status(400).json({ ok: false, error: 'Project not found' });
      validProjectId = projRows[0].id;
    }

    const result = await pool.query(`
      INSERT INTO hire_requests (labour_id, contractor_id, work_description, proposed_wage, work_date, project_id)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
    `, [labourId, req.user.id, work_description || null, proposed_wage || null, work_date || null, validProjectId]);

    res.json({
      ok: true,
      hireRequest: result.rows[0],
      // No money moves yet — this just tells the app what to show upfront
      // ("Hire fee: ₹10, charged if the worker accepts") so it's never a
      // surprise deduction later.
      hireFeeInfo: { amount: HIRE_FEE, chargedWhen: 'accepted' },
    });
  } catch (err) {
    console.error('[labour] hire error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to send hire request' });
  }
});

// POST /api/labour/hire-bulk — ad-hoc multi-select hire: a contractor picks
// any set of individual workers while browsing (not necessarily part of a
// pre-formed Crew) and hires them all in one action.
//
// CHANGED: unlocking is now free everywhere (see /:id/unlock above), so any
// selected worker the contractor hasn't already unlocked just gets a free
// 1-day unlock record created automatically here — no wallet charge, no
// commission. The only charge in the whole labour flow is the HIRE_FEE,
// applied once per worker when their hire request is accepted.
// One hire_requests row is created per worker either way.
router.post('/hire-bulk', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { labourIds, work_description, proposed_wage, work_date, projectId } = req.body;
    const ids = [...new Set((Array.isArray(labourIds) ? labourIds : []).map(id => parseInt(id, 10)).filter(Boolean))];

    if (!ids.length) {
      return res.status(400).json({ ok: false, error: 'Select at least one worker to hire.' });
    }
    if (ids.length > MAX_BULK_HIRE) {
      return res.status(400).json({ ok: false, error: `You can hire up to ${MAX_BULK_HIRE} workers at once.` });
    }

    await client.query('BEGIN');

    let validProjectId = null;
    if (projectId) {
      const { rows: projRows } = await client.query(
        'SELECT id FROM labour_projects WHERE id = $1 AND contractor_id = $2', [projectId, req.user.id]
      );
      if (!projRows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ ok: false, error: 'Project not found' });
      }
      validProjectId = projRows[0].id;
    }

    // Same active-profile / active-owner guard as a single hire, applied to
    // every selected id at once. Any id that fails this (hidden, banned,
    // deactivated, or the contractor's own profile) is silently dropped
    // rather than failing the whole batch — the response reports which ids
    // were skipped so the app can tell the contractor.
    const { rows: validRows } = await client.query(`
      SELECT l.id, l.user_id
      FROM labour_profiles l JOIN users u ON u.id = l.user_id
      WHERE l.id = ANY($1::int[]) AND l.status = 'active' AND u.active = true AND l.user_id != $2
    `, [ids, req.user.id]);

    const validIds = validRows.map(r => r.id);
    const skippedIds = ids.filter(id => !validIds.includes(id));
    if (!validIds.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, error: 'None of the selected workers are available to hire right now.' });
    }

    // Which of the valid ones already have an active unlock (manual or free
    // rehire window) — only the rest need a fresh unlock charged.
    const { rows: unlockedRows } = await client.query(`
      SELECT DISTINCT labour_id FROM labour_contact_unlocks
      WHERE contractor_id = $1 AND labour_id = ANY($2::int[]) AND expires_at > NOW()
    `, [req.user.id, validIds]);
    const alreadyUnlocked = new Set(unlockedRows.map(r => r.labour_id));
    const needsUnlock = validIds.filter(id => !alreadyUnlocked.has(id));

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    for (const labourId of needsUnlock) {
      await client.query(`
        INSERT INTO labour_contact_unlocks
          (contractor_id, labour_id, days, amount, cashfree_order_id, expires_at)
        VALUES ($1, $2, 1, 0, 'FREE', $3)
      `, [req.user.id, labourId, expiresAt]);
    }

    const created = [];
    for (const labourId of validIds) {
      const { rows } = await client.query(`
        INSERT INTO hire_requests (labour_id, contractor_id, work_description, proposed_wage, work_date, project_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [labourId, req.user.id, work_description || null, proposed_wage || null, work_date || null, validProjectId]);
      created.push(rows[0]);
    }

    await client.query('COMMIT');
    res.json({
      ok: true,
      hireRequests: created,
      skippedIds,
      unlocksGranted: needsUnlock.length,
      hireFeeInfo: { amount: HIRE_FEE, chargedWhen: 'accepted', perWorker: true },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[labour] hire-bulk error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to send hire requests' });
  } finally {
    client.release();
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
      SELECT hr.*, u.name AS contractor_name, u.phone AS contractor_phone
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
  const client = await pool.connect();
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
    if (!rows.length) {
      return res.status(404).json({ ok: false, error: 'Hire request not found' });
    }
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

    await client.query('BEGIN');

    // ── pending → accepted: charge the contractor's wallet the hire fee ──
    // The labourer is the one making this call, but it's the contractor's
    // wallet that gets debited — lock their balance row for the duration of
    // the transaction so two near-simultaneous accepts can't both succeed
    // against a balance that only covers one.
    let hireFeeCharged = null;
    if (status === 'accepted') {
      const { rows: balRows } = await client.query(
        'SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [hr.contractor_id]
      );
      const balance = parseFloat(balRows[0]?.wallet_balance || 0);
      if (balance < HIRE_FEE) {
        await client.query('ROLLBACK');
        return res.status(402).json({
          ok: false,
          error: `Contractor's wallet doesn't have enough balance for the ₹${HIRE_FEE} hire fee yet. Ask them to top up their wallet, then try accepting again.`,
        });
      }

      const { rows: newBalRows } = await client.query(
        'UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2 RETURNING wallet_balance',
        [HIRE_FEE, hr.contractor_id]
      );
      await client.query(`
        INSERT INTO wallet_transactions
          (user_id, type, amount, balance_after, reason, reference_type, reference_id)
        VALUES ($1, 'debit', $2, $3, 'labour_hire_fee', 'hire_requests', $4)
      `, [hr.contractor_id, HIRE_FEE, newBalRows[0].wallet_balance, id]);
      hireFeeCharged = HIRE_FEE;
    }

    // ── accepted → completed: credit the labourer's held commission ──
    let commissionCredited = null;
    if (status === 'completed') {
      // Only pay a commission if this hire request actually had its fee
      // charged (it should always be true via the accepted step above, but
      // this keeps the payout strictly tied to real revenue rather than
      // trusting the status column alone).
      const { rows: feeRows } = await client.query(
        `SELECT 1 FROM wallet_transactions WHERE reference_type = 'hire_requests' AND reference_id = $1 AND reason = 'labour_hire_fee' LIMIT 1`,
        [id]
      );

      const { rows: pairRows } = await client.query(
        `SELECT COUNT(*)::int AS n FROM labour_payouts p
         JOIN hire_requests hr2 ON hr2.id = p.hire_request_id
         WHERE hr2.contractor_id = $1 AND hr2.labour_id = $2 AND p.created_at >= CURRENT_DATE`,
        [hr.contractor_id, hr.labour_id]
      );
      const underDailyCap = pairRows[0].n < MAX_PAIR_COMPLETIONS_PER_DAY;

      if (feeRows.length && underDailyCap) {
        const availableAt = new Date(Date.now() + PAYOUT_HOLD_HOURS * 60 * 60 * 1000);
        await client.query(`
          INSERT INTO labour_payouts (hire_request_id, labour_user_id, amount, status, available_at)
          VALUES ($1, $2, $3, 'pending', $4)
          ON CONFLICT (hire_request_id) DO NOTHING
        `, [id, hr.labourer_user_id, LABOUR_COMMISSION, availableAt]);
        commissionCredited = LABOUR_COMMISSION;
      }
    }

    const result = await client.query(
      status === 'completed'
        ? 'UPDATE hire_requests SET status = $1, completed_at = NOW() WHERE id = $2 RETURNING *'
        : 'UPDATE hire_requests SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    // ── Milestone rewards: award any newly-crossed threshold ──
    let newlyAwardedRewards = [];
    if (status === 'completed') {
      const { rows: settingsRows } = await client.query(
        'SELECT rewards_start_at FROM labour_reward_settings WHERE id = 1'
      );
      const rewardsStartAt = settingsRows[0]?.rewards_start_at;
      if (rewardsStartAt) {
        const { rows: countRows } = await client.query(
          `SELECT COUNT(*)::int AS n FROM hire_requests
           WHERE labour_id = $1 AND status = 'completed' AND completed_at >= $2`,
          [hr.labour_id, rewardsStartAt]
        );
        const completedCount = countRows[0].n;

        for (const milestone of MILESTONE_REWARDS) {
          if (completedCount >= milestone.milestone_bookings) {
            const { rows: awarded } = await client.query(
              `INSERT INTO labour_milestone_rewards (labour_id, reward_type, milestone_bookings)
               VALUES ($1, $2, $3)
               ON CONFLICT (labour_id, reward_type) DO NOTHING
               RETURNING *`,
              [hr.labour_id, milestone.reward_type, milestone.milestone_bookings]
            );
            if (awarded.length) newlyAwardedRewards.push(awarded[0]);
          }
        }
      }
    }

    await client.query('COMMIT');
    res.json({
      ok: true,
      hireRequest: result.rows[0],
      hireFeeCharged,
      commissionCredited,
      newlyAwardedRewards,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[labour] hire-request update error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to update hire request' });
  } finally {
    client.release();
  }
});

// GET /api/labour/payouts/mine — a labourer's earnings dashboard: held
// balance, withdrawable balance, recent commissions, and withdrawal history.
// Lazily flips any 'pending' payouts past their hold window to 'available'
// on read, instead of a background job.
router.get('/payouts/mine', auth, async (req, res) => {
  try {
    await pool.query(
      `UPDATE labour_payouts SET status = 'available' WHERE labour_user_id = $1 AND status = 'pending' AND available_at <= NOW()`,
      [req.user.id]
    );

    const { rows: balRows } = await pool.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)   AS held_balance,
        COALESCE(SUM(amount) FILTER (WHERE status = 'available'), 0) AS available_balance,
        COALESCE(SUM(amount) FILTER (WHERE status = 'requested'), 0) AS requested_balance,
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)      AS lifetime_paid
      FROM labour_payouts WHERE labour_user_id = $1
    `, [req.user.id]);

    const { rows: ledger } = await pool.query(`
      SELECT p.id, p.hire_request_id, p.contact_unlock_id, p.source, p.amount, p.status, p.available_at, p.created_at,
             COALESCE(hu.name, cu.name) AS contractor_name
      FROM labour_payouts p
      LEFT JOIN hire_requests hr ON hr.id = p.hire_request_id
      LEFT JOIN users hu ON hu.id = hr.contractor_id
      LEFT JOIN labour_contact_unlocks lcu ON lcu.id = p.contact_unlock_id
      LEFT JOIN users cu ON cu.id = lcu.contractor_id
      WHERE p.labour_user_id = $1
      ORDER BY p.created_at DESC LIMIT 50
    `, [req.user.id]);

    const { rows: withdrawals } = await pool.query(`
      SELECT id, amount, upi_id, status, utr_reference, admin_note, requested_at, processed_at
      FROM labour_withdrawals WHERE user_id = $1 ORDER BY requested_at DESC LIMIT 20
    `, [req.user.id]);

    const { rows: userRows } = await pool.query('SELECT labour_upi_id FROM users WHERE id = $1', [req.user.id]);

    res.json({
      ok: true,
      heldBalance: parseFloat(balRows[0].held_balance),
      availableBalance: parseFloat(balRows[0].available_balance),
      requestedBalance: parseFloat(balRows[0].requested_balance),
      lifetimePaid: parseFloat(balRows[0].lifetime_paid),
      upiId: userRows[0]?.labour_upi_id || null,
      minWithdrawal: MIN_WITHDRAWAL,
      holdHours: PAYOUT_HOLD_HOURS,
      ledger,
      withdrawals,
    });
  } catch (err) {
    console.error('[labour] payouts/mine error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load earnings' });
  }
});

// GET /api/labour/rewards/mine — a worker's milestone-reward progress:
// how many completed bookings count toward rewards (since the fresh-start
// cutoff), which rewards have been earned/issued, and how many bookings
// remain until the next one.
router.get('/rewards/mine', auth, async (req, res) => {
  try {
    const { rows: profileRows } = await pool.query(
      'SELECT id FROM labour_profiles WHERE user_id = $1', [req.user.id]
    );
    if (!profileRows.length) {
      return res.json({ ok: true, completedCount: 0, rewards: [], nextMilestone: MILESTONE_REWARDS[0] });
    }
    const labourId = profileRows[0].id;

    const { rows: settingsRows } = await pool.query('SELECT rewards_start_at FROM labour_reward_settings WHERE id = 1');
    const rewardsStartAt = settingsRows[0]?.rewards_start_at || new Date(0);

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM hire_requests
       WHERE labour_id = $1 AND status = 'completed' AND completed_at >= $2`,
      [labourId, rewardsStartAt]
    );
    const completedCount = countRows[0].n;

    const { rows: earned } = await pool.query(
      `SELECT reward_type, milestone_bookings, status, achieved_at, issued_at
       FROM labour_milestone_rewards WHERE labour_id = $1 ORDER BY milestone_bookings ASC`,
      [labourId]
    );
    const earnedTypes = new Set(earned.map(r => r.reward_type));

    const rewards = MILESTONE_REWARDS.map(m => {
      const row = earned.find(r => r.reward_type === m.reward_type);
      return row
        ? { ...m, status: row.status, achieved_at: row.achieved_at, issued_at: row.issued_at }
        : { ...m, status: 'locked', achieved_at: null, issued_at: null };
    });

    const nextMilestone = MILESTONE_REWARDS.find(m => !earnedTypes.has(m.reward_type)) || null;

    res.json({
      ok: true,
      completedCount,
      rewards,
      nextMilestone: nextMilestone
        ? { ...nextMilestone, bookingsRemaining: Math.max(0, nextMilestone.milestone_bookings - completedCount) }
        : null,
    });
  } catch (err) {
    console.error('[labour] rewards/mine error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load rewards' });
  }
});

// PATCH /api/labour/payouts/upi — set/update the UPI ID commissions get paid to.
router.patch('/payouts/upi', auth, async (req, res) => {
  try {
    const upiId = (req.body.upiId || '').trim();
    if (!/^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/.test(upiId)) {
      return res.status(400).json({ ok: false, error: 'Enter a valid UPI ID, e.g. name@bank' });
    }
    await pool.query('UPDATE users SET labour_upi_id = $1 WHERE id = $2', [upiId, req.user.id]);
    res.json({ ok: true, upiId });
  } catch (err) {
    console.error('[labour] payouts/upi error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to save UPI ID' });
  }
});

// POST /api/labour/payouts/withdraw — request a cash-out of the available
// (past-hold) balance to the UPI ID on file. Locks and claims 'available'
// payout rows atomically so a double-tap can't create two withdrawal
// requests against the same money.
router.post('/payouts/withdraw', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows: userRows } = await pool.query('SELECT labour_upi_id FROM users WHERE id = $1', [req.user.id]);
    const upiId = userRows[0]?.labour_upi_id;
    if (!upiId) {
      return res.status(400).json({ ok: false, error: 'Add a UPI ID before requesting a withdrawal.' });
    }

    await client.query('BEGIN');

    // Flip anything past its hold window, then lock and claim it.
    await client.query(
      `UPDATE labour_payouts SET status = 'available' WHERE labour_user_id = $1 AND status = 'pending' AND available_at <= NOW()`,
      [req.user.id]
    );
    const { rows: claimRows } = await client.query(
      `SELECT id, amount FROM labour_payouts WHERE labour_user_id = $1 AND status = 'available' FOR UPDATE`,
      [req.user.id]
    );
    const total = claimRows.reduce((sum, r) => sum + parseFloat(r.amount), 0);

    if (total < MIN_WITHDRAWAL) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        ok: false,
        error: `Minimum withdrawal is ₹${MIN_WITHDRAWAL}. Available balance: ₹${total.toFixed(2)}.`,
      });
    }

    const { rows: wRows } = await client.query(`
      INSERT INTO labour_withdrawals (user_id, amount, upi_id, status)
      VALUES ($1, $2, $3, 'requested') RETURNING *
    `, [req.user.id, total, upiId]);

    await client.query(
      `UPDATE labour_payouts SET status = 'requested', withdrawal_id = $1 WHERE id = ANY($2::int[])`,
      [wRows[0].id, claimRows.map(r => r.id)]
    );

    await client.query('COMMIT');
    res.json({ ok: true, withdrawal: wRows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[labour] payouts/withdraw error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to request withdrawal' });
  } finally {
    client.release();
  }
});

// GET /api/labour/payouts/certificate — Formal Earnings Certificate.
// A downloadable PDF summary of a worker's lifetime paid earnings on the
// platform, usable as informal income verification when applying for a
// small bank loan or a government scheme. Only counts payouts that have
// actually reached status='paid' (real money that moved), not pending or
// held commissions, so the figure can't be inflated by unpaid claims.
router.get('/payouts/certificate', auth, async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');

    const { rows: userRows } = await pool.query('SELECT name, phone, labour_upi_id, created_at FROM users WHERE id = $1', [req.user.id]);
    const user = userRows[0];
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });

    const { rows: profileRows } = await pool.query(
      'SELECT full_name, skill_category, district FROM labour_profiles WHERE user_id = $1', [req.user.id]
    );
    const profile = profileRows[0];

    const { rows: paidRows } = await pool.query(`
      SELECT p.amount, p.created_at, p.source, COALESCE(hu.name, cu.name) AS contractor_name
      FROM labour_payouts p
      LEFT JOIN hire_requests hr ON hr.id = p.hire_request_id
      LEFT JOIN users hu ON hu.id = hr.contractor_id
      LEFT JOIN labour_contact_unlocks lcu ON lcu.id = p.contact_unlock_id
      LEFT JOIN users cu ON cu.id = lcu.contractor_id
      WHERE p.labour_user_id = $1 AND p.status = 'paid'
      ORDER BY p.created_at ASC
    `, [req.user.id]);

    const { rows: withdrawnRows } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM labour_withdrawals WHERE user_id = $1 AND status = 'paid'`,
      [req.user.id]
    );

    const totalPaid = paidRows.reduce((s, r) => s + parseFloat(r.amount), 0);
    const jobsCompleted = paidRows.filter(r => r.source !== 'contact_unlock').length;
    const firstEarning = paidRows[0]?.created_at || null;
    const lastEarning  = paidRows[paidRows.length - 1]?.created_at || null;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="earnings-certificate-${req.user.id}.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    doc.fontSize(20).fillColor('#f97316').text('NandedRozgar', { align: 'left' });
    doc.fontSize(12).fillColor('#666').text('Certificate of Earnings', { align: 'left' });
    doc.moveDown(1.5);

    doc.fontSize(10).fillColor('#999').text(`Issued: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`);
    doc.moveDown(1);

    doc.fontSize(13).fillColor('#111').text('Worker Details', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#333');
    doc.text(`Name: ${profile?.full_name || user.name || '—'}`);
    doc.text(`Phone: ${user.phone || '—'}`);
    doc.text(`Primary skill: ${profile?.skill_category || '—'}`);
    doc.text(`District: ${profile?.district || '—'}`);
    doc.text(`Platform member since: ${user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}`);
    doc.moveDown(1);

    doc.fontSize(13).fillColor('#111').text('Earnings Summary', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#333');
    doc.text(`Total verified earnings (paid): Rs. ${totalPaid.toFixed(2)}`);
    doc.text(`Jobs completed and paid: ${jobsCompleted}`);
    doc.text(`Total withdrawn to bank/UPI: Rs. ${parseFloat(withdrawnRows[0].total).toFixed(2)}`);
    if (firstEarning) doc.text(`Earning history: ${new Date(firstEarning).toLocaleDateString('en-IN')} to ${new Date(lastEarning).toLocaleDateString('en-IN')}`);
    doc.moveDown(1);

    if (paidRows.length) {
      doc.fontSize(13).fillColor('#111').text('Transaction History', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor('#333');
      const rowsToShow = paidRows.slice(-40); // last 40 to keep the PDF short
      rowsToShow.forEach((r, i) => {
        const date = new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        doc.text(`${i + 1}. ${date}  —  Rs. ${parseFloat(r.amount).toFixed(2)}  —  ${r.contractor_name || 'NandedRozgar platform'}`);
      });
      doc.moveDown(1);
    }

    doc.fontSize(9).fillColor('#999').text(
      'This certificate is generated from platform transaction records and reflects income earned through NandedRozgar. ' +
      'It is provided for informational purposes to support loan or scheme applications and is not a bank statement.',
      { align: 'left' }
    );

    doc.end();
  } catch (err) {
    console.error('[labour] certificate error:', err.message);
    if (!res.headersSent) res.status(500).json({ ok: false, error: 'Failed to generate certificate' });
  }
});

module.exports = router;
