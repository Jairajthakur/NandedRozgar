/**
 * upload.js — Image upload route for CityPlus
 *
 * POST /api/upload/image  — upload a single image → returns { ok, url }
 *
 * Uses ImgBB (100% free, no credit card, no storage limits on free tier).
 *
 * Setup (one-time, 2 minutes):
 *   1. Go to https://imgbb.com → Sign Up free
 *   2. Go to https://api.imgbb.com → copy your API key
 *   3. Add to Railway env vars:
 *        IMGBB_API_KEY = your-api-key-here
 *
 * The app sends:  { image: "data:image/jpeg;base64,/9j/4AAQ..." }
 * This route returns: { ok: true, url: "https://i.ibb.co/..." }
 */

const router  = require('express').Router();
const { auth } = require('../middleware/auth');

// ── POST /api/upload/image ────────────────────────────────────────────────────
router.post('/image', auth, async (req, res) => {
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    return res.json({
      ok: false,
      error: 'Image uploads not configured. Add IMGBB_API_KEY to Railway variables. Get a free key at https://api.imgbb.com',
    });
  }

  const { image } = req.body;
  if (!image || typeof image !== 'string') {
    return res.json({ ok: false, error: 'image field (base64 string) is required' });
  }

  // Strip data URI prefix if present — ImgBB wants raw base64
  const base64Data = image.startsWith('data:')
    ? image.replace(/^data:image\/[a-z]+;base64,/, '')
    : image;

  // Rough size check — ImgBB free limit is 32 MB
  const approxBytes = (base64Data.length * 3) / 4;
  if (approxBytes > 10 * 1024 * 1024) {
    return res.json({ ok: false, error: 'Image too large. Maximum size is 10 MB.' });
  }

  try {
    const formData = new URLSearchParams();
    formData.append('key', apiKey);
    formData.append('image', base64Data);

    const response = await fetch(`https://api.imgbb.com/1/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!data.success) {
      console.error('[upload] ImgBB error:', data);
      return res.json({ ok: false, error: 'Image upload failed. Please try again.' });
    }

    return res.json({
      ok: true,
      url:      data.data.url,
      publicId: data.data.id,
    });
  } catch (err) {
    console.error('[upload] ImgBB error:', err.message);
    return res.json({ ok: false, error: 'Image upload failed. Please try again.' });
  }
});

// ── DELETE /api/upload/image ──────────────────────────────────────────────────
// ImgBB free tier does not support deletion via API — images expire or stay.
// This endpoint is kept for API compatibility but is a no-op.
router.delete('/image', auth, async (req, res) => {
  return res.json({ ok: true });
});

module.exports = router;
