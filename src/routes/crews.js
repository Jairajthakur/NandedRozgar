/**
 * routes/crews.js — Group/Crew Team Creator
 *
 * In construction, laborers rarely work alone — a head Mason (Mistri)
 * usually travels with a crew of 3-5 helpers. This lets a worker with their
 * own labour_profiles row create a "Crew", add their regular teammates
 * (each of whom must also have their own labour_profiles row), and lets a
 * contractor hire the entire crew with a single click instead of hiring
 * each person individually.
 *
 * Each crew member still gets their own row in hire_requests (so attendance,
 * escrow, ratings, and payouts all keep working exactly as they do for a
 * solo hire) — the rows are just grouped under one labour_crew_hires id.
 *
 * Mounted at /api/crews in src/index.js.
 */
const router = require('express').Router();
const { pool, cache } = require('../db');
const { auth } = require('../middleware/auth');

// Resolve the caller's own labour_profiles.id, or null if they haven't
// posted a worker profile — only a worker can lead a crew.
async function getOwnLabourProfileId(userId) {
  const { rows } = await pool.query('SELECT id FROM labour_profiles WHERE user_id = $1', [userId]);
  return rows[0]?.id || null;
}

// POST /api/crews — create a crew led by the caller's own worker profile
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, combinedWage } = req.body;
    if (!name?.trim()) return res.status(400).json({ ok: false, error: 'Crew name is required' });

    const leaderId = await getOwnLabourProfileId(req.user.id);
    if (!leaderId) {
      return res.status(400).json({ ok: false, error: 'Post your own worker profile first, then create a crew' });
    }

    const { rows } = await pool.query(`
      INSERT INTO labour_crews (leader_labour_id, name, description, combined_wage)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [leaderId, name.trim().slice(0, 100), description?.trim() || null, parseInt(combinedWage, 10) || null]);

    // Leader is automatically a member of their own crew.
    await pool.query(`
      INSERT INTO labour_crew_members (crew_id, labour_id, role_label)
      VALUES ($1, $2, 'Lead Mistri') ON CONFLICT DO NOTHING
    `, [rows[0].id, leaderId]);

    res.json({ ok: true, crew: rows[0] });
  } catch (err) {
    console.error('[crews] create error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to create crew' });
  }
});

// GET /api/crews/mine — crews the caller leads
router.get('/mine', auth, async (req, res) => {
  try {
    const leaderId = await getOwnLabourProfileId(req.user.id);
    if (!leaderId) return res.json({ ok: true, crews: [] });

    const { rows } = await pool.query(`
      SELECT c.*, COUNT(m.id)::int AS member_count
      FROM labour_crews c
      LEFT JOIN labour_crew_members m ON m.crew_id = c.id
      WHERE c.leader_labour_id = $1 AND c.status = 'active'
      GROUP BY c.id ORDER BY c.created_at DESC
    `, [leaderId]);

    res.json({ ok: true, crews: rows });
  } catch (err) {
    console.error('[crews] mine error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load your crews' });
  }
});

// GET /api/crews/:id — crew detail with its members' public profile info
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { rows: crewRows } = await pool.query('SELECT * FROM labour_crews WHERE id = $1', [id]);
    if (!crewRows.length) return res.status(404).json({ ok: false, error: 'Crew not found' });

    const { rows: members } = await pool.query(`
      SELECT m.role_label, m.added_at,
             l.id AS labour_id, l.full_name, l.skill_category, l.daily_wage,
             l.photo_url, l.rating_avg, l.rating_count
      FROM labour_crew_members m
      JOIN labour_profiles l ON l.id = m.labour_id
      WHERE m.crew_id = $1
      ORDER BY m.added_at ASC
    `, [id]);

    res.json({ ok: true, crew: crewRows[0], members });
  } catch (err) {
    console.error('[crews] detail error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load crew' });
  }
});

// POST /api/crews/:id/members — leader adds a teammate by their labour_profiles id
router.post('/:id/members', auth, async (req, res) => {
  try {
    const crewId = parseInt(req.params.id, 10);
    const { labourId, roleLabel } = req.body;
    if (!labourId) return res.status(400).json({ ok: false, error: 'labourId is required' });

    const { rows: crewRows } = await pool.query('SELECT * FROM labour_crews WHERE id = $1', [crewId]);
    if (!crewRows.length) return res.status(404).json({ ok: false, error: 'Crew not found' });

    const leaderId = await getOwnLabourProfileId(req.user.id);
    if (crewRows[0].leader_labour_id !== leaderId) {
      return res.status(403).json({ ok: false, error: 'Only the crew leader can add members' });
    }

    const { rows: memberCount } = await pool.query(
      'SELECT COUNT(*)::int AS n FROM labour_crew_members WHERE crew_id = $1', [crewId]
    );
    if (memberCount[0].n >= 12) {
      return res.status(400).json({ ok: false, error: 'A crew can have at most 12 members' });
    }

    const { rows } = await pool.query(`
      INSERT INTO labour_crew_members (crew_id, labour_id, role_label)
      VALUES ($1, $2, $3)
      ON CONFLICT (crew_id, labour_id) DO UPDATE SET role_label = $3
      RETURNING *
    `, [crewId, labourId, (roleLabel || 'Helper').slice(0, 50)]);

    res.json({ ok: true, member: rows[0] });
  } catch (err) {
    console.error('[crews] add member error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to add crew member' });
  }
});

// DELETE /api/crews/:id/members/:labourId — leader removes a teammate
router.delete('/:id/members/:labourId', auth, async (req, res) => {
  try {
    const crewId = parseInt(req.params.id, 10);
    const labourId = parseInt(req.params.labourId, 10);

    const { rows: crewRows } = await pool.query('SELECT * FROM labour_crews WHERE id = $1', [crewId]);
    if (!crewRows.length) return res.status(404).json({ ok: false, error: 'Crew not found' });

    const leaderId = await getOwnLabourProfileId(req.user.id);
    if (crewRows[0].leader_labour_id !== leaderId) {
      return res.status(403).json({ ok: false, error: 'Only the crew leader can remove members' });
    }
    if (labourId === leaderId) {
      return res.status(400).json({ ok: false, error: 'The crew leader cannot remove themselves — disband the crew instead' });
    }

    await pool.query('DELETE FROM labour_crew_members WHERE crew_id = $1 AND labour_id = $2', [crewId, labourId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[crews] remove member error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to remove crew member' });
  }
});

// POST /api/crews/:id/hire — contractor hires the ENTIRE crew with one
// click: creates one hire_requests row per member, grouped under a shared
// labour_crew_hires id. Reuses the normal pending → accepted → completed
// flow per member, so nothing else in the app needs to know a hire came
// from a crew booking.
router.post('/:id/hire', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const crewId = parseInt(req.params.id, 10);
    const { workDescription, proposedWagePerPerson, workDate, projectId } = req.body;

    await client.query('BEGIN');

    const { rows: crewRows } = await client.query(
      "SELECT * FROM labour_crews WHERE id = $1 AND status = 'active'", [crewId]
    );
    if (!crewRows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, error: 'Crew not found' });
    }

    const { rows: members } = await client.query(
      'SELECT labour_id FROM labour_crew_members WHERE crew_id = $1', [crewId]
    );
    if (!members.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ ok: false, error: 'This crew has no members' });
    }

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

    const { rows: crewHireRows } = await client.query(`
      INSERT INTO labour_crew_hires (crew_id, contractor_id, work_date, project_id)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [crewId, req.user.id, workDate || null, validProjectId]);
    const crewHireId = crewHireRows[0].id;

    const created = [];
    for (const m of members) {
      const { rows } = await client.query(`
        INSERT INTO hire_requests (labour_id, contractor_id, work_description, proposed_wage, work_date, status, crew_hire_id, project_id)
        VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
        RETURNING *
      `, [m.labour_id, req.user.id, workDescription || null, parseInt(proposedWagePerPerson, 10) || null, workDate || null, crewHireId, validProjectId]);
      created.push(rows[0]);
    }

    await client.query('COMMIT');
    res.json({ ok: true, crewHireId, hireRequests: created });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[crews] hire error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to hire crew' });
  } finally {
    client.release();
  }
});

// DELETE /api/crews/:id — disband a crew (leader only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const crewId = parseInt(req.params.id, 10);
    const leaderId = await getOwnLabourProfileId(req.user.id);

    const { rows } = await pool.query(
      "UPDATE labour_crews SET status = 'disbanded' WHERE id = $1 AND leader_labour_id = $2 RETURNING *",
      [crewId, leaderId]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Crew not found or not yours' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[crews] disband error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to disband crew' });
  }
});

module.exports = router;
