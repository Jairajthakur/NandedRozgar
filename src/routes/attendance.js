/**
 * routes/attendance.js — Daily Wage Attendance & Timekeeping
 *
 * Laborers rarely work standard monthly payrolls; they work by the day.
 * This is the digital muster-roll replacement: a contractor marks a hired
 * worker present/absent each day, with an optional punch-in/punch-out pair
 * captured from the contractor's device (time + GPS), so there's a real
 * record of "did they actually show up on site today".
 *
 * One row per (hire_request_id, work_date) — see labour_attendance in db.js.
 *
 * Mounted at /api/attendance in src/index.js.
 */
const router = require('express').Router();
const { pool, cache } = require('../db');
const { auth } = require('../middleware/auth');

// Only the contractor on an ACCEPTED (or already completed) hire request can
// mark attendance for it — resolves the hire request and checks ownership,
// throwing a consistent { status, error } shape the routes below reuse.
async function loadHireRequestForContractor(client, hireRequestId, contractorId) {
  const { rows } = await client.query(
    `SELECT hr.*, l.user_id AS labourer_user_id
     FROM hire_requests hr
     JOIN labour_profiles l ON l.id = hr.labour_id
     WHERE hr.id = $1`,
    [hireRequestId]
  );
  if (!rows.length) return { error: 'Hire request not found', status: 404 };
  const hr = rows[0];
  if (hr.contractor_id !== contractorId) {
    return { error: 'Only the hiring contractor can mark attendance for this hire', status: 403 };
  }
  if (!['accepted', 'completed'].includes(hr.status)) {
    return { error: 'This hire request has not been accepted yet', status: 400 };
  }
  return { hr };
}

// POST /api/attendance/:hireRequestId/punch-in — contractor marks a worker
// as having shown up today. Idempotent per day (UNIQUE(hire_request_id,
// work_date)) — a second punch-in the same day just updates the time/location.
router.post('/:hireRequestId/punch-in', auth, async (req, res) => {
  try {
    const hireRequestId = parseInt(req.params.hireRequestId, 10);
    const { lat, lng, workDate } = req.body;

    const { hr, error, status } = await loadHireRequestForContractor(pool, hireRequestId, req.user.id);
    if (error) return res.status(status).json({ ok: false, error });

    const date = workDate || new Date().toISOString().slice(0, 10);
    const hasCoords = Number.isFinite(parseFloat(lat)) && Number.isFinite(parseFloat(lng));

    const { rows } = await pool.query(`
      INSERT INTO labour_attendance
        (hire_request_id, labour_id, contractor_id, work_date, punch_in_at, punch_in_lat, punch_in_lng, status, wage_for_day)
      VALUES ($1, $2, $3, $4, NOW(), $5, $6, 'present', $7)
      ON CONFLICT (hire_request_id, work_date) DO UPDATE SET
        punch_in_at = NOW(),
        punch_in_lat = $5,
        punch_in_lng = $6,
        status = 'present'
      RETURNING *
    `, [
      hireRequestId, hr.labour_id, req.user.id, date,
      hasCoords ? parseFloat(lat) : null, hasCoords ? parseFloat(lng) : null,
      hr.proposed_wage || null,
    ]);

    res.json({ ok: true, attendance: rows[0] });
  } catch (err) {
    console.error('[attendance] punch-in error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to punch in' });
  }
});

// POST /api/attendance/:hireRequestId/punch-out — end of day, on the same
// work_date row created by punch-in (or creates one directly if a contractor
// forgets to punch in and just closes out the day).
router.post('/:hireRequestId/punch-out', auth, async (req, res) => {
  try {
    const hireRequestId = parseInt(req.params.hireRequestId, 10);
    const { lat, lng, workDate } = req.body;

    const { hr, error, status } = await loadHireRequestForContractor(pool, hireRequestId, req.user.id);
    if (error) return res.status(status).json({ ok: false, error });

    const date = workDate || new Date().toISOString().slice(0, 10);
    const hasCoords = Number.isFinite(parseFloat(lat)) && Number.isFinite(parseFloat(lng));

    const { rows } = await pool.query(`
      INSERT INTO labour_attendance
        (hire_request_id, labour_id, contractor_id, work_date, punch_out_at, punch_out_lat, punch_out_lng, status, wage_for_day)
      VALUES ($1, $2, $3, $4, NOW(), $5, $6, 'present', $7)
      ON CONFLICT (hire_request_id, work_date) DO UPDATE SET
        punch_out_at = NOW(),
        punch_out_lat = $5,
        punch_out_lng = $6
      RETURNING *
    `, [
      hireRequestId, hr.labour_id, req.user.id, date,
      hasCoords ? parseFloat(lat) : null, hasCoords ? parseFloat(lng) : null,
      hr.proposed_wage || null,
    ]);

    res.json({ ok: true, attendance: rows[0] });
  } catch (err) {
    console.error('[attendance] punch-out error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to punch out' });
  }
});

// PATCH /api/attendance/:id — mark a specific day's row present/absent/half_day
// directly (e.g. contractor marking a no-show, or correcting a mistake),
// with an optional note.
router.patch('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, notes } = req.body;
    if (!['present', 'absent', 'half_day'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status' });
    }

    const { rows } = await pool.query(
      `UPDATE labour_attendance SET status = $1, notes = COALESCE($2, notes)
       WHERE id = $3 AND contractor_id = $4 RETURNING *`,
      [status, notes || null, id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Attendance record not found' });

    res.json({ ok: true, attendance: rows[0] });
  } catch (err) {
    console.error('[attendance] update error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to update attendance' });
  }
});

// GET /api/attendance/hire/:hireRequestId — full attendance sheet for one hire
router.get('/hire/:hireRequestId', auth, async (req, res) => {
  try {
    const hireRequestId = parseInt(req.params.hireRequestId, 10);
    const { rows: hrRows } = await pool.query(
      `SELECT hr.*, l.user_id AS labourer_user_id FROM hire_requests hr
       JOIN labour_profiles l ON l.id = hr.labour_id WHERE hr.id = $1`,
      [hireRequestId]
    );
    if (!hrRows.length) return res.status(404).json({ ok: false, error: 'Hire request not found' });
    const hr = hrRows[0];
    if (hr.contractor_id !== req.user.id && hr.labourer_user_id !== req.user.id) {
      return res.status(403).json({ ok: false, error: 'Not authorized' });
    }

    const { rows } = await pool.query(
      `SELECT * FROM labour_attendance WHERE hire_request_id = $1 ORDER BY work_date DESC`,
      [hireRequestId]
    );
    res.json({ ok: true, attendance: rows });
  } catch (err) {
    console.error('[attendance] list error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load attendance' });
  }
});

// GET /api/attendance/mine — a worker's own attendance history across all hires
router.get('/mine', auth, async (req, res) => {
  try {
    const { rows: profileRows } = await pool.query(
      'SELECT id FROM labour_profiles WHERE user_id = $1', [req.user.id]
    );
    if (!profileRows.length) return res.json({ ok: true, attendance: [] });

    const { rows } = await pool.query(`
      SELECT a.*, u.name AS contractor_name
      FROM labour_attendance a
      JOIN users u ON u.id = a.contractor_id
      WHERE a.labour_id = $1
      ORDER BY a.work_date DESC LIMIT 100
    `, [profileRows[0].id]);

    res.json({ ok: true, attendance: rows });
  } catch (err) {
    console.error('[attendance] mine error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load your attendance' });
  }
});

module.exports = router;
