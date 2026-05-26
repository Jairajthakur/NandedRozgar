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

// POST /api/seeker/resume — upload resume (base64 PDF only, max 5 MB)
router.post('/resume', auth, async (req, res) => {
  try {
    const { resumeBase64, fileName } = req.body;
    if (!resumeBase64) return res.json({ ok: false, error: 'No resume data provided' });

    // ── Extract the raw base64 payload and declared MIME type ────────────────
    let rawBase64, declaredMime;
    if (resumeBase64.startsWith('data:')) {
      // Data URI format: "data:<mime>;base64,<data>"
      const matches = resumeBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!matches) {
        return res.json({ ok: false, error: 'Invalid data URI format.' });
      }
      declaredMime = matches[1].toLowerCase();
      rawBase64    = matches[2];
    } else {
      // Raw base64 with no data URI prefix — assume PDF
      declaredMime = 'application/pdf';
      rawBase64    = resumeBase64;
    }

    // ── Validate declared MIME type ──────────────────────────────────────────
    if (declaredMime !== 'application/pdf') {
      return res.json({ ok: false, error: 'Only PDF files are accepted.' });
    }

    // ── Validate file magic bytes (first 4 bytes must be %PDF) ───────────────
    // This catches files where the client lies about the MIME type.
    let fileBuffer;
    try {
      fileBuffer = Buffer.from(rawBase64, 'base64');
    } catch {
      return res.json({ ok: false, error: 'Invalid base64 data.' });
    }
    const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // "%PDF"
    if (fileBuffer.length < 4 || !fileBuffer.slice(0, 4).equals(PDF_MAGIC)) {
      return res.json({ ok: false, error: 'File does not appear to be a valid PDF.' });
    }

    // ── Size check (5 MB limit on actual decoded bytes) ──────────────────────
    if (fileBuffer.length > 5 * 1024 * 1024) {
      return res.json({ ok: false, error: 'Resume file too large (max 5 MB).' });
    }

    // ── Sanitise fileName — strip path separators and enforce .pdf extension ─
    const safeName = (fileName || 'resume.pdf')
      .replace(/[/\]/g, '')   // no path traversal
      .replace(/[^a-zA-Z0-9._\- ]/g, '') // only safe chars
      .slice(0, 200)           // cap length
      || 'resume.pdf';
    const safeNameWithExt = safeName.toLowerCase().endsWith('.pdf')
      ? safeName
      : `${safeName}.pdf`;

    // Reconstruct a clean, canonical data URI
    const dataUri = `data:application/pdf;base64,${rawBase64}`;

    // ── Upsert seeker profile with validated resume ──────────────────────────
    await pool.query(`
      INSERT INTO seeker_profiles (user_id, resume_url, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id) DO UPDATE SET resume_url=$2, updated_at=NOW()
    `, [req.user.id, dataUri]);

    res.json({ ok: true, resumeUrl: dataUri, fileName: safeNameWithExt });
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
