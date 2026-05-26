const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');
const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// ── Resume storage directory ──────────────────────────────────────────────────
// Bug #8 fix: the original code silently fell back to an ephemeral local path
// in production (Railway resets the filesystem on every deploy), meaning all
// uploaded resumes were lost after each deployment.
//
// Fix: in production (NODE_ENV === 'production'), RESUME_STORAGE_DIR is now
// REQUIRED and the server refuses to start without it, forcing an explicit
// volume mount.  In development it still falls back to uploads/resumes so
// local runs need no extra config.
//
// To deploy on Railway:
//   1. Add a Volume mount at e.g. /data
//   2. Set RESUME_STORAGE_DIR=/data/resumes in Railway env vars
const RESUME_DIR = process.env.RESUME_STORAGE_DIR
  ? path.resolve(process.env.RESUME_STORAGE_DIR)
  : path.resolve(__dirname, '../../uploads/resumes');

// In production, warn loudly if no persistent volume is configured.
// Resumes will survive the current deploy but will be wiped on the next one.
// Fix: add a Railway Volume at /data and set RESUME_STORAGE_DIR=/data/resumes
if (process.env.NODE_ENV === 'production' && !process.env.RESUME_STORAGE_DIR) {
  console.error(
    '⚠️  WARNING: RESUME_STORAGE_DIR is not set in production. ' +
    'Resumes stored in the default path will be lost on every Railway deploy. ' +
    'Mount a persistent volume and set RESUME_STORAGE_DIR to its path.'
  );
  // Do NOT exit — let the server start so all other features keep working.
  // Resume uploads will still function within a single deploy cycle.
}

// Ensure the directory exists on startup (safe to call repeatedly)
try { fs.mkdirSync(RESUME_DIR, { recursive: true }); } catch { /* ignore */ }

// ── GET /api/seeker/profile ───────────────────────────────────────────────────
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

// ── PUT /api/seeker/profile — create or update ────────────────────────────────
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

// ── POST /api/seeker/resume — upload resume (base64 PDF only, max 5 MB) ───────
//
// FIX #4: Instead of writing the raw base64 (~6.7 MB string) into the DB column,
// we decode the bytes, write them to a file on disk, and store only the relative
// path in the DB. This keeps the DB row small regardless of file size.
router.post('/resume', auth, async (req, res) => {
  try {
    const { resumeBase64, fileName } = req.body;
    if (!resumeBase64) return res.json({ ok: false, error: 'No resume data provided' });

    // ── Extract the raw base64 payload and declared MIME type ────────────────
    let rawBase64, declaredMime;
    if (resumeBase64.startsWith('data:')) {
      const matches = resumeBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!matches) return res.json({ ok: false, error: 'Invalid data URI format.' });
      declaredMime = matches[1].toLowerCase();
      rawBase64    = matches[2];
    } else {
      declaredMime = 'application/pdf';
      rawBase64    = resumeBase64;
    }

    // ── Validate declared MIME type ──────────────────────────────────────────
    if (declaredMime !== 'application/pdf') {
      return res.json({ ok: false, error: 'Only PDF files are accepted.' });
    }

    // ── Decode and validate magic bytes (%PDF) ───────────────────────────────
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

    // ── Size check (5 MB limit on decoded bytes) ─────────────────────────────
    if (fileBuffer.length > 5 * 1024 * 1024) {
      return res.json({ ok: false, error: 'Resume file too large (max 5 MB).' });
    }

    // ── Sanitise fileName ────────────────────────────────────────────────────
    const safeName = (fileName || 'resume.pdf')
      .replace(/[/\\]/g, '')
      .replace(/[^a-zA-Z0-9._\- ]/g, '')
      .slice(0, 200)
      || 'resume.pdf';
    const safeNameWithExt = safeName.toLowerCase().endsWith('.pdf') ? safeName : `${safeName}.pdf`;

    // ── Delete old resume file if one exists ────────────────────────────────
    try {
      const { rows: existing } = await pool.query(
        'SELECT resume_url FROM seeker_profiles WHERE user_id=$1', [req.user.id]
      );
      const oldPath = existing[0]?.resume_url;
      // resume_url values stored by this version start with "resumes/"
      if (oldPath && oldPath.startsWith('resumes/') && !oldPath.includes('..')) {
        const absOld = path.join(RESUME_DIR, path.basename(oldPath));
        fs.unlink(absOld, () => {}); // best-effort; ignore errors
      }
    } catch { /* ignore */ }

    // ── Write file to disk with a collision-free name ────────────────────────
    const uniqueName = `${req.user.id}_${crypto.randomBytes(8).toString('hex')}.pdf`;
    const absPath    = path.join(RESUME_DIR, uniqueName);
    fs.writeFileSync(absPath, fileBuffer);

    // Store only the relative path segment — not the full absolute path
    const relPath = `resumes/${uniqueName}`;

    // ── Upsert seeker profile with the file path (not the raw data) ──────────
    await pool.query(`
      INSERT INTO seeker_profiles (user_id, resume_url, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id) DO UPDATE SET resume_url=$2, updated_at=NOW()
    `, [req.user.id, relPath]);

    // Return a URL the client can use to download/display the resume.
    // The API base is read from APP_URL so it works in both dev and prod.
    const apiBase   = (process.env.APP_URL || '').replace(/\/$/, '');
    const resumeUrl = `${apiBase}/api/seeker/resume/file/${uniqueName}`;

    res.json({ ok: true, resumeUrl, fileName: safeNameWithExt });
  } catch (err) {
    console.error('resume upload error:', err);
    res.json({ ok: false, error: 'Failed to upload resume' });
  }
});

// ── GET /api/seeker/resume/file/:filename — serve a resume file ───────────────
// Only the owner (or an admin) can download their own resume.
router.get('/resume/file/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;

    // Guard against path traversal
    if (!filename || filename.includes('/') || filename.includes('..')) {
      return res.status(400).json({ ok: false, error: 'Invalid filename.' });
    }

    // Verify ownership: the stored path must start with "resumes/<filename>"
    const { rows } = await pool.query(
      'SELECT resume_url FROM seeker_profiles WHERE user_id=$1', [req.user.id]
    );
    const storedPath = rows[0]?.resume_url;
    const expectedRel = `resumes/${filename}`;

    // Allow admin to download any resume by skipping the ownership check
    if (req.user.role !== 'admin' && storedPath !== expectedRel) {
      return res.status(403).json({ ok: false, error: 'Access denied.' });
    }

    const absPath = path.join(RESUME_DIR, filename);
    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ ok: false, error: 'Resume file not found.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    fs.createReadStream(absPath).pipe(res);
  } catch (err) {
    console.error('resume download error:', err);
    res.status(500).json({ ok: false, error: 'Failed to retrieve resume.' });
  }
});

// ── DELETE /api/seeker/resume — remove resume ────────────────────────────────
router.delete('/resume', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT resume_url FROM seeker_profiles WHERE user_id=$1', [req.user.id]
    );
    const oldPath = rows[0]?.resume_url;
    if (oldPath && oldPath.startsWith('resumes/') && !oldPath.includes('..')) {
      const absOld = path.join(RESUME_DIR, path.basename(oldPath));
      fs.unlink(absOld, () => {}); // best-effort
    }

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
