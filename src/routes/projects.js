/**
 * routes/projects.js — Contractor Projects
 *
 * A "project" is two things at once:
 *   1. A PRIVATE bucket a contractor uses to group hires under one job site
 *      (e.g. "Shivaji Nagar Bungalow — Phase 2") so they can see who's on it
 *      and how much they've spent, in one place.
 *   2. A PUBLIC listing any worker can browse — same discovery surface as
 *      `jobs` — so a contractor can also use a project to attract workers
 *      directly, not just as an org tool for hires made elsewhere.
 *
 * Attaching a hire to a project happens at hire time (see the projectId
 * param on /api/labour/:id/hire, /api/labour/hire-bulk, and
 * /api/crews/:id/hire) — this file only owns the project record itself and
 * its derived budget/spend view.
 *
 * "Spent" is never stored on the row — it's computed live so it can never
 * drift out of sync with what actually happened:
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

// POST /api/projects — create a project (contractor only, no worker-profile requirement)
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, skillCategory, district, location, budget } = req.body;
    if (!title?.trim()) return res.status(400).json({ ok: false, error: 'Project title is required' });

    const { rows } = await pool.query(`
      INSERT INTO labour_projects (contractor_id, title, description, skill_category, district, location, budget)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [
      req.user.id,
      title.trim().slice(0, 150),
      description?.trim() || null,
      skillCategory?.trim() || null,
      district?.trim() || 'nanded',
      location?.trim() || null,
      budget != null ? parseFloat(budget) || null : null,
    ]);

    res.json({ ok: true, project: rows[0] });
  } catch (err) {
    console.error('[projects] create error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to create project' });
  }
});

// GET /api/projects/mine — the contractor's own projects, with budget vs spent
// for each. Used both to manage projects and to power the "attach hire to
// project" picker in the hire flows.
router.get('/mine', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, COUNT(DISTINCT hr.id)::int AS worker_count
      FROM labour_projects p
      LEFT JOIN hire_requests hr ON hr.project_id = p.id
      WHERE p.contractor_id = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [req.user.id]);

    const projects = await Promise.all(rows.map(async (p) => ({
      ...p,
      spend: await getSpend(p.id),
    })));

    res.json({ ok: true, projects });
  } catch (err) {
    console.error('[projects] mine error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load your projects' });
  }
});

// GET /api/projects — public listing, browsable by any worker (like /api/jobs).
// Only 'active' projects show up here.
router.get('/', async (req, res) => {
  try {
    const { district, skillCategory, page = 1 } = req.query;
    const limit = 20;
    const offset = (parseInt(page, 10) - 1) * limit;
    const cacheKey = `projects:public:${district || ''}:${skillCategory || ''}:${page}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const conditions = [`p.status = 'active'`];
    const params = [];
    if (district) { params.push(district); conditions.push(`p.district = $${params.length}`); }
    if (skillCategory) { params.push(skillCategory); conditions.push(`p.skill_category = $${params.length}`); }

    params.push(limit, offset);
    const { rows } = await pool.query(`
      SELECT p.id, p.title, p.description, p.skill_category, p.district, p.location, p.created_at,
             u.name AS contractor_name,
             COUNT(DISTINCT hr.id)::int AS worker_count
      FROM labour_projects p
      JOIN users u ON u.id = p.contractor_id
      LEFT JOIN hire_requests hr ON hr.project_id = p.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY p.id, u.name
      ORDER BY p.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    // Budget/spend are the contractor's own business, not shown on the
    // public listing — workers browsing only see what the job is, not
    // what's already been spent against it.
    const result = { ok: true, projects: rows };
    cache.set(cacheKey, result, LIST_TTL);
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

    if (!isOwner) {
      // Public view: strip budget and don't leak who else was hired.
      const { budget, ...publicProject } = project;
      return res.json({ ok: true, project: publicProject, isOwner: false });
    }

    const spend = await getSpend(id);
    const { rows: roster } = await pool.query(`
      SELECT hr.id, hr.status, hr.work_date, hr.proposed_wage,
             l.id AS labour_id, l.full_name, l.skill_category, l.photo_url
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

// PATCH /api/projects/:id — owner edits title/description/budget/status/etc.
router.patch('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { rows: existing } = await pool.query('SELECT * FROM labour_projects WHERE id = $1', [id]);
    if (!existing.length) return res.status(404).json({ ok: false, error: 'Project not found' });
    if (existing[0].contractor_id !== req.user.id) {
      return res.status(403).json({ ok: false, error: 'Only the project owner can edit it' });
    }

    const { title, description, skillCategory, district, location, budget, status } = req.body;
    const { rows } = await pool.query(`
      UPDATE labour_projects SET
        title          = COALESCE($1, title),
        description    = COALESCE($2, description),
        skill_category = COALESCE($3, skill_category),
        district       = COALESCE($4, district),
        location       = COALESCE($5, location),
        budget         = COALESCE($6, budget),
        status         = COALESCE($7, status)
      WHERE id = $8 RETURNING *
    `, [
      title?.trim() || null,
      description?.trim() || null,
      skillCategory?.trim() || null,
      district?.trim() || null,
      location?.trim() || null,
      budget != null ? parseFloat(budget) : null,
      status || null,
      id,
    ]);

    res.json({ ok: true, project: rows[0] });
  } catch (err) {
    console.error('[projects] update error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to update project' });
  }
});

module.exports = router;
