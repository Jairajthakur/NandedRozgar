/**
 * routes/projects.js — Contractor Projects
 *
 * A "project" is two things at once:
 *   1. A PRIVATE bucket a contractor uses to group hires under one job site
 *      (e.g. "Shivaji Nagar Bungalow — Phase 2") so they can see who's on it
 *      and how much they've spent, in one place.
 *   2. A PUBLIC listing any worker can browse — a fixed-slot posting like
 *      "10 Mason helpers needed, ₹500/day, 5 days" — the same way they'd
 *      browse `jobs`.
 *
 * Hiring off a project is DIRECT: a worker taps Apply and is immediately
 * hired (hire_requests row created with status='accepted', hire fee charged
 * to the contractor's wallet right there) — no separate review/approval
 * step. First-come-first-served until `workers_needed` slots are filled,
 * then the project stops accepting new applicants. A contractor can also
 * still manually add people to a project via the existing projectId param
 * on /api/labour/:id/hire, /api/labour/hire-bulk, and /api/crews/:id/hire.
 *
 * "Spent" is never stored — it's computed live so it can never drift out of
 * sync with what actually happened:
 *   - the ₹{HIRE_FEE} hire fee for every accepted/completed hire under the project
 *   - actual wages paid, from labour_attendance.wage_for_day for hires under the project
 *
 * Mounted at /api/projects in src/index.js.
 */
const router = require('express').Router();
const { pool, cache } = require('../db');
const { auth } = require('../middleware/auth');

const HIRE_FEE = 10; // must match routes/labour.js — charged per hire on acceptance
const LIST_TTL = 15_000;

// Shared "budget vs spent" computation for a single project.
async function getSpend(projectId) {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE hr.status IN ('accepted', 'completed'))::int AS hires_charged,
      COALESCE(SUM(a.wage_for_day), 0)::numeric AS wages_paid
    FROM hire_requests hr
    LEFT JOIN labour_attendance a ON a.hire_request_id = hr.id
    WHERE hr.project_id = $1
  `, [projectId]);

  const { hires_charged, wages_paid } = rows[0];
  const hireFees = hires_charged * HIRE_FEE;
  return {
    hireFees,
    wagesPaid: Number(wages_paid),
    totalSpent: hireFees + Number(wages_paid),
  };
}

// How many slots are still open on a project (workers_needed minus everyone
// currently accepted/completed on it — declined/cancelled hires free the slot back up).
async function getSlotsFilled(projectId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM hire_requests WHERE project_id = $1 AND status IN ('accepted', 'completed')`,
    [projectId]
  );
  return rows[0].n;
}

// Resolve the caller's own labour_profiles.id, or null if they haven't posted a worker profile.
async function getOwnLabourProfileId(userId) {
  const { rows } = await pool.query('SELECT id FROM labour_profiles WHERE user_id = $1', [userId]);
  return rows[0]?.id || null;
}

// POST /api/projects — create a project: "N workers needed, ₹X/day, D days".
// budget auto-computes from workersNeeded × dailyWage × durationDays when
// not given explicitly, so a contractor doesn't have to do the math.
router.post('/', auth, async (req, res) => {
  try {
    // Workers post their own profile and get hired — they don't post jobs.
    // Only contractors/regular users (no labour_profiles row) can create projects.
    const ownLabourId = await getOwnLabourProfileId(req.user.id);
    if (ownLabourId) {
      return res.status(403).json({ ok: false, error: 'Labourers cannot post projects. Browse and apply to projects posted by contractors instead.' });
    }

    const { title, description, skillCategory, district, location, budget, workersNeeded, durationDays, dailyWage } = req.body;
    if (!title?.trim()) return res.status(400).json({ ok: false, error: 'Project title is required' });

    const needed = parseInt(workersNeeded, 10) || 1;
    if (needed < 1) return res.status(400).json({ ok: false, error: 'Workers needed must be at least 1' });

    const duration = durationDays != null ? parseInt(durationDays, 10) || null : null;
    const wage = dailyWage != null ? parseInt(dailyWage, 10) || null : null;

    const autoBudget = wage && duration ? needed * wage * duration : null;
    const finalBudget = budget != null ? (parseFloat(budget) || null) : autoBudget;

    const { rows } = await pool.query(`
      INSERT INTO labour_projects
        (contractor_id, title, description, skill_category, district, location, workers_needed, duration_days, daily_wage, budget)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
    `, [
      req.user.id,
      title.trim().slice(0, 150),
      description?.trim() || null,
      skillCategory?.trim() || null,
      district?.trim() || 'nanded',
      location?.trim() || null,
      needed,
      duration,
      wage,
      finalBudget,
    ]);

    res.json({ ok: true, project: rows[0] });
  } catch (err) {
    console.error('[projects] create error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to create project' });
  }
});

// POST /api/projects/:id/apply — a worker applies and is HIRED on the spot,
// as long as a slot is still open. This is the whole point of a project
// posting: "10 labourers for 5 days" fills itself as workers tap Apply,
// with no manual review step from the contractor.
//
// Charges the contractor's wallet the same ₹{HIRE_FEE} hire fee as any
// other accepted hire, right here — since there's no separate accept step,
// this IS the moment the hire becomes real.
router.post('/:id/apply', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const projectId = parseInt(req.params.id, 10);
    const labourId = await getOwnLabourProfileId(req.user.id);
    if (!labourId) {
      return res.status(400).json({ ok: false, error: 'Post your own worker profile first, then apply' });
    }

    await client.query('BEGIN');

    const { rows: projRows } = await client.query(
      "SELECT * FROM labour_projects WHERE id = $1 AND status = 'active' FOR UPDATE", [projectId]
    );
    if (!projRows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, error: 'Project not found or no longer accepting applicants' });
    }
    const project = projRows[0];
    if (project.contractor_id === req.user.id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ ok: false, error: 'You cannot apply to your own project' });
    }

    const { rows: dupRows } = await client.query(
      `SELECT 1 FROM hire_requests WHERE project_id = $1 AND labour_id = $2 AND status IN ('pending', 'accepted', 'completed')`,
      [projectId, labourId]
    );
    if (dupRows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ ok: false, error: 'You already applied to this project' });
    }

    const filled = await client.query(
      `SELECT COUNT(*)::int AS n FROM hire_requests WHERE project_id = $1 AND status IN ('accepted', 'completed')`,
      [projectId]
    ).then(r => r.rows[0].n);
    if (filled >= project.workers_needed) {
      await client.query('ROLLBACK');
      return res.status(409).json({ ok: false, error: 'This project is already fully staffed' });
    }

    // Charge the contractor's wallet the hire fee, same as the normal
    // pending → accepted transition in PATCH /api/labour/hire-requests/:id.
    const { rows: balRows } = await client.query(
      'SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [project.contractor_id]
    );
    const balance = parseFloat(balRows[0]?.wallet_balance || 0);
    if (balance < HIRE_FEE) {
      await client.query('ROLLBACK');
      return res.status(402).json({
        ok: false,
        error: 'This project can\'t accept new applicants right now — the poster\'s wallet is low. Try again shortly or apply to another project.',
      });
    }

    const { rows: newBalRows } = await client.query(
      'UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2 RETURNING wallet_balance',
      [HIRE_FEE, project.contractor_id]
    );

    const { rows: hireRows } = await client.query(`
      INSERT INTO hire_requests (labour_id, contractor_id, work_description, proposed_wage, status, project_id)
      VALUES ($1, $2, $3, $4, 'accepted', $5)
      RETURNING *
    `, [labourId, project.contractor_id, project.title, project.daily_wage, projectId]);

    await client.query(`
      INSERT INTO wallet_transactions
        (user_id, type, amount, balance_after, reason, reference_type, reference_id)
      VALUES ($1, 'debit', $2, $3, 'labour_hire_fee', 'hire_requests', $4)
    `, [project.contractor_id, HIRE_FEE, newBalRows[0].wallet_balance, hireRows[0].id]);

    const newFilled = filled + 1;
    if (newFilled >= project.workers_needed) {
      await client.query(`UPDATE labour_projects SET status = 'filled' WHERE id = $1`, [projectId]);
    }

    await client.query('COMMIT');
    await cache.delPrefix('projects:public:');

    res.json({
      ok: true,
      hireRequest: hireRows[0],
      spotsLeft: Math.max(0, project.workers_needed - newFilled),
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[projects] apply error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to apply' });
  } finally {
    client.release();
  }
});

// GET /api/projects/mine — the contractor's own projects, with budget vs
// spent and slots-filled for each. Used both to manage projects and to
// power the "attach hire to project" picker in the manual hire flows.
router.get('/mine', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*
      FROM labour_projects p
      WHERE p.contractor_id = $1
      ORDER BY p.created_at DESC
    `, [req.user.id]);

    const projects = await Promise.all(rows.map(async (p) => ({
      ...p,
      spotsFilled: await getSlotsFilled(p.id),
      spend: await getSpend(p.id),
    })));

    res.json({ ok: true, projects });
  } catch (err) {
    console.error('[projects] mine error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load your projects' });
  }
});

// GET /api/projects — public listing, browsable by any worker (like /api/jobs).
// Only 'active' projects show up here (a project auto-flips to 'filled' once
// all slots are taken, so it naturally drops off this list).
router.get('/', async (req, res) => {
  try {
    const { district, skillCategory, page = 1 } = req.query;
    const limit = 20;
    const offset = (parseInt(page, 10) - 1) * limit;
    const cacheKey = `projects:public:${district || ''}:${skillCategory || ''}:${page}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const conditions = [`p.status = 'active'`];
    const params = [];
    if (district) { params.push(district); conditions.push(`p.district = $${params.length}`); }
    if (skillCategory) { params.push(skillCategory); conditions.push(`p.skill_category = $${params.length}`); }

    params.push(limit, offset);
    const { rows } = await pool.query(`
      SELECT p.id, p.title, p.description, p.skill_category, p.district, p.location,
             p.workers_needed, p.duration_days, p.daily_wage, p.created_at,
             u.name AS contractor_name,
             COUNT(hr.id) FILTER (WHERE hr.status IN ('accepted', 'completed'))::int AS spots_filled
      FROM labour_projects p
      JOIN users u ON u.id = p.contractor_id
      LEFT JOIN hire_requests hr ON hr.project_id = p.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY p.id, u.name
      ORDER BY p.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    // Budget is the contractor's own business, not shown on the public
    // listing — workers see the wage/day being offered, not the running total spent.
    const projects = rows.map(p => ({ ...p, spots_left: Math.max(0, p.workers_needed - p.spots_filled) }));
    const result = { ok: true, projects };
    await cache.set(cacheKey, result, LIST_TTL);
    res.json(result);
  } catch (err) {
    console.error('[projects] list error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load projects' });
  }
});

// GET /api/projects/:id — detail. Owning contractor gets budget/spend and
// the full hire roster; anyone else gets the public-listing view only.
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { rows } = await pool.query(`
      SELECT p.*, u.name AS contractor_name
      FROM labour_projects p JOIN users u ON u.id = p.contractor_id
      WHERE p.id = $1
    `, [id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Project not found' });

    const project = rows[0];
    const isOwner = req.user && req.user.id === project.contractor_id;
    const spotsFilled = await getSlotsFilled(id);
    const spotsLeft = Math.max(0, project.workers_needed - spotsFilled);

    if (!isOwner) {
      // Public view: strip budget and don't leak who else was hired.
      const { budget, ...publicProject } = project;
      return res.json({ ok: true, project: publicProject, isOwner: false, spotsFilled, spotsLeft });
    }

    const spend = await getSpend(id);
    const { rows: roster } = await pool.query(`
      SELECT hr.id, hr.status, hr.work_date, hr.proposed_wage, hr.created_at,
             l.id AS labour_id, l.full_name, l.skill_category, l.photo_url, l.rating_avg
      FROM hire_requests hr
      JOIN labour_profiles l ON l.id = hr.labour_id
      WHERE hr.project_id = $1
      ORDER BY hr.created_at DESC
    `, [id]);

    res.json({
      ok: true,
      project,
      isOwner: true,
      budget: project.budget != null ? Number(project.budget) : null,
      spotsFilled,
      spotsLeft,
      spend,
      // No blocking on overspend — just enough info for the app to render
      // a visual (e.g. red) warning bar when spend.totalSpent > budget.
      overBudget: project.budget != null && spend.totalSpent > Number(project.budget),
      roster,
    });
  } catch (err) {
    console.error('[projects] detail error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load project' });
  }
});

// PATCH /api/projects/:id — owner edits title/description/budget/slots/status/etc.
router.patch('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { rows: existing } = await pool.query('SELECT * FROM labour_projects WHERE id = $1', [id]);
    if (!existing.length) return res.status(404).json({ ok: false, error: 'Project not found' });
    if (existing[0].contractor_id !== req.user.id) {
      return res.status(403).json({ ok: false, error: 'Only the project owner can edit it' });
    }

    const { title, description, skillCategory, district, location, budget, status, workersNeeded, durationDays, dailyWage } = req.body;
    const { rows } = await pool.query(`
      UPDATE labour_projects SET
        title          = COALESCE($1, title),
        description    = COALESCE($2, description),
        skill_category = COALESCE($3, skill_category),
        district       = COALESCE($4, district),
        location       = COALESCE($5, location),
        budget         = COALESCE($6, budget),
        status         = COALESCE($7, status),
        workers_needed = COALESCE($8, workers_needed),
        duration_days  = COALESCE($9, duration_days),
        daily_wage     = COALESCE($10, daily_wage)
      WHERE id = $11 RETURNING *
    `, [
      title?.trim() || null,
      description?.trim() || null,
      skillCategory?.trim() || null,
      district?.trim() || null,
      location?.trim() || null,
      budget != null ? parseFloat(budget) : null,
      status || null,
      workersNeeded != null ? parseInt(workersNeeded, 10) : null,
      durationDays != null ? parseInt(durationDays, 10) : null,
      dailyWage != null ? parseInt(dailyWage, 10) : null,
      id,
    ]);

    res.json({ ok: true, project: rows[0] });
  } catch (err) {
    console.error('[projects] update error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to update project' });
  }
});

module.exports = router;
