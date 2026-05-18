const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// GET /api/seeker/profile
router.get('/profile', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM seeker_profiles WHERE user_id=$1', [req.user.id]
    );
    res.json({ ok: true, profile: rows[0] || null });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load profile' });
  }
});

// PUT /api/seeker/profile — create or update
router.put('/profile', auth, async (req, res) => {
  try {
    const { headline, bio, skills, experience, education, location, expectedSalary, openToWork } = req.body;

    const skillsArr = Array.isArray(skills)
      ? skills
      : typeof skills === 'string' && skills.trim()
        ? skills.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    const { rows } = await pool.query(`
      INSERT INTO seeker_profiles (user_id, headline, bio, skills, experience, education, location, expected_salary, open_to_work, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        headline=$2, bio=$3, skills=$4, experience=$5, education=$6,
        location=$7, expected_salary=$8, open_to_work=$9, updated_at=NOW()
      RETURNING *
    `, [req.user.id, headline||null, bio||null, skillsArr, experience||null, education||null, location||null, expectedSalary||null, openToWork !== false]);

    res.json({ ok: true, profile: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to save profile' });
  }
});

module.exports = router;
