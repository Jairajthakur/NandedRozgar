/**
 * upload.js — Image upload route for CityPlus
 *
 * POST /api/upload/image  — upload a single image → returns { ok, url }
 *   Accepts two content types:
 *   1. multipart/form-data  — file in field "image" (preferred, no proxy size issues)
 *   2. application/json     — { image: "<base64 data URL>", folder: "..." }
 *
 * GET  /api/upload/image/:id — serve a stored image
 *
 * Images are stored as base64 in PostgreSQL (uploaded_images table).
 */

const router  = require('express').Router();
const busboy  = require('busboy');
const { auth } = require('../middleware/auth');
const { pool } = require('../db');

// ── POST /api/upload/image ────────────────────────────────────────────────────
router.post('/image', auth, async (req, res) => {
  const ct = req.headers['content-type'] || '';

  // ── Branch 1: multipart/form-data ─────────────────────────────────────────
  if (ct.includes('multipart/form-data')) {
    try {
      const bb = busboy({ headers: req.headers, limits: { fileSize: 10 * 1024 * 1024 } });
      let mimeType  = 'image/jpeg';
      let folder    = null;
      const chunks  = [];
      let fileSeen  = false;
      let tooBig    = false;

      bb.on('field', (name, val) => { if (name === 'folder') folder = val; });

      bb.on('file', (name, stream, info) => {
        fileSeen = true;
        mimeType = info.mimeType || 'image/jpeg';
        stream.on('data', d => chunks.push(d));
        stream.on('limit', () => { tooBig = true; stream.resume(); });
        stream.on('end', () => {});
      });

      bb.on('finish', async () => {
        if (!fileSeen) return res.json({ ok: false, error: 'No file received.' });
        if (tooBig)   return res.json({ ok: false, error: 'Image too large. Maximum size is 10 MB.' });

        const buf        = Buffer.concat(chunks);
        const base64Data = buf.toString('base64');

        try {
          const result = await pool.query(
            `INSERT INTO uploaded_images (data, mime_type, folder) VALUES ($1, $2, $3) RETURNING id`,
            [base64Data, mimeType, folder || null]
          );
          const url = `/api/upload/image/${result.rows[0].id}`;
          return res.json({ ok: true, url, publicId: result.rows[0].id });
        } catch (err) {
          console.error('[upload] DB insert error (multipart):', err.message);
          return res.json({ ok: false, error: 'Image upload failed. Please try again.' });
        }
      });

      bb.on('error', err => {
        console.error('[upload] busboy error:', err.message);
        return res.json({ ok: false, error: 'Upload parsing failed.' });
      });

      req.pipe(bb);
    } catch (err) {
      console.error('[upload] multipart setup error:', err.message);
      return res.json({ ok: false, error: 'Upload failed.' });
    }
    return; // response sent inside busboy callbacks
  }

  // ── Branch 2: application/json (base64) ───────────────────────────────────
  const { image, folder } = req.body || {};
  if (!image || typeof image !== 'string') {
    return res.json({ ok: false, error: 'image field (base64 string) is required' });
  }

  let mimeType   = 'image/jpeg';
  let base64Data = image;
  if (image.startsWith('data:')) {
    const match = image.match(/^data:(image\/[a-z+]+);base64,(.+)$/s);
    if (match) { mimeType = match[1]; base64Data = match[2]; }
    else { base64Data = image.replace(/^data:image\/[a-z]+;base64,/, ''); }
  }

  const approxBytes = (base64Data.length * 3) / 4;
  if (approxBytes > 10 * 1024 * 1024) {
    return res.json({ ok: false, error: 'Image too large. Maximum size is 10 MB.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO uploaded_images (data, mime_type, folder) VALUES ($1, $2, $3) RETURNING id`,
      [base64Data, mimeType, folder || null]
    );
    const url = `/api/upload/image/${result.rows[0].id}`;
    return res.json({ ok: true, url, publicId: result.rows[0].id });
  } catch (err) {
    console.error('[upload] DB insert error (json):', err.message);
    return res.json({ ok: false, error: 'Image upload failed. Please try again.' });
  }
});

// ── GET /api/upload/image/:id — serve stored image ───────────────────────────
router.get('/image/:id', async (req, res) => {
  const { id } = req.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(404).send('Not found');
  }
  try {
    const result = await pool.query(
      'SELECT data, mime_type FROM uploaded_images WHERE id = $1', [id]
    );
    if (!result.rows.length) return res.status(404).send('Image not found');
    const { data, mime_type } = result.rows[0];
    const buf = Buffer.from(data, 'base64');
    res.setHeader('Content-Type', mime_type);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(buf);
  } catch (err) {
    console.error('[upload] Serve error:', err.message);
    return res.status(500).send('Error serving image');
  }
});

// ── DELETE /api/upload/image ──────────────────────────────────────────────────
router.delete('/image', auth, async (req, res) => {
  const { publicId } = req.body;
  if (publicId && /^[0-9a-f-]{36}$/i.test(publicId)) {
    await pool.query('DELETE FROM uploaded_images WHERE id = $1', [publicId]).catch(() => {});
  }
  return res.json({ ok: true });
});

module.exports = router;
