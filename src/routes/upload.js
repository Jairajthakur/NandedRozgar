/**
 * upload.js — Image upload route for CityPlus
 *
 * POST /api/upload/image  — upload a single image → returns { ok, url }
 * GET  /api/upload/image/:id — serve a stored image
 *
 * Strategy: Store images as base64 in PostgreSQL (images table).
 * This avoids any dependency on external image hosts (ImgBB, Cloudinary, etc.)
 * which may be blocked by Railway's egress network.
 *
 * The returned "url" looks like:  /api/upload/image/<uuid>
 * The app/admin panel uses this relative URL to display images.
 */

const router = require('express').Router();
const { auth } = require('../middleware/auth');
const db = require('../db');

// Ensure the images table exists (runs once on startup)
async function ensureImagesTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS uploaded_images (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      data       TEXT NOT NULL,
      mime_type  TEXT NOT NULL DEFAULT 'image/jpeg',
      folder     TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}
ensureImagesTable().catch(err => console.error('[upload] Failed to ensure images table:', err.message));

// ── POST /api/upload/image ────────────────────────────────────────────────────
router.post('/image', auth, async (req, res) => {
  const { image, folder } = req.body;
  if (!image || typeof image !== 'string') {
    return res.json({ ok: false, error: 'image field (base64 string) is required' });
  }

  // Extract mime type and raw base64
  let mimeType = 'image/jpeg';
  let base64Data = image;
  if (image.startsWith('data:')) {
    const match = image.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    } else {
      base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');
    }
  }

  // Size check — ~5 MB raw limit
  const approxBytes = (base64Data.length * 3) / 4;
  if (approxBytes > 10 * 1024 * 1024) {
    return res.json({ ok: false, error: 'Image too large. Maximum size is 10 MB.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO uploaded_images (data, mime_type, folder)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [base64Data, mimeType, folder || null]
    );

    const id = result.rows[0].id;
    const url = `/api/upload/image/${id}`;

    return res.json({ ok: true, url, publicId: id });
  } catch (err) {
    console.error('[upload] DB error:', err.message);
    return res.json({ ok: false, error: 'Image upload failed. Please try again.' });
  }
});

// ── GET /api/upload/image/:id — serve stored image ───────────────────────────
router.get('/image/:id', async (req, res) => {
  const { id } = req.params;
  // Basic UUID validation
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(404).send('Not found');
  }

  try {
    const result = await db.query(
      'SELECT data, mime_type FROM uploaded_images WHERE id = $1',
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).send('Image not found');
    }

    const { data, mime_type } = result.rows[0];
    const buf = Buffer.from(data, 'base64');

    res.setHeader('Content-Type', mime_type);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(buf);
  } catch (err) {
    console.error('[upload] Serve error:', err.message);
    res.status(500).send('Error serving image');
  }
});

// ── DELETE /api/upload/image ──────────────────────────────────────────────────
router.delete('/image', auth, async (req, res) => {
  const { publicId } = req.body;
  if (publicId && /^[0-9a-f-]{36}$/i.test(publicId)) {
    await db.query('DELETE FROM uploaded_images WHERE id = $1', [publicId]).catch(() => {});
  }
  return res.json({ ok: true });
});

module.exports = router;
