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

// POST /api/seeker/resume — upload resume (base64 PDF, max ~4MB)
router.post('/resume', auth, async (req, res) => {
  try {
    const { resumeBase64, fileName } = req.body;
    if (!resumeBase64) return res.json({ ok: false, error: 'No resume data provided' });

    // Validate it's a base64 data URI for PDF or we accept raw base64
    const dataUri = resumeBase64.startsWith('data:')
      ? resumeBase64
      : `data:application/pdf;base64,${resumeBase64}`;

    // Rough size check — base64 is ~4/3 of original; 5MB limit
    const sizeBytes = (resumeBase64.length * 3) / 4;
    if (sizeBytes > 5 * 1024 * 1024) {
      return res.json({ ok: false, error: 'Resume file too large (max 5 MB)' });
    }

    // Upsert seeker profile with resume_url
    await pool.query(`
      INSERT INTO seeker_profiles (user_id, resume_url, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id) DO UPDATE SET resume_url=$2, updated_at=NOW()
    `, [req.user.id, dataUri]);

    res.json({ ok: true, resumeUrl: dataUri, fileName: fileName || 'resume.pdf' });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to upload resume' });
  }
});

// DELETE /api/seeker/resume — remove resume
router.delete('/resume', auth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE seeker_profiles SET resume_url=NULL, updated_at=NOW() WHERE user_id=$1',
      [req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to remove resume' });
  }
});

module.exports = router;
