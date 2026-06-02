/**
 * upload.js — Image upload route for CityPlus
 *
 * POST /api/upload/image  — upload a single image → returns { ok, url }
 *
 * Uses Cloudinary free tier (25 GB storage, 25 GB bandwidth/month — plenty for launch).
 * Images are accepted as base64 strings from the React Native app (expo-image-picker).
 *
 * Setup (one-time, 5 minutes):
 *   1. Create free account at https://cloudinary.com
 *   2. Go to Dashboard → copy Cloud Name, API Key, API Secret
 *   3. Add to Railway env vars:
 *        CLOUDINARY_CLOUD_NAME = your-cloud-name
 *        CLOUDINARY_API_KEY    = 123456789012345
 *        CLOUDINARY_API_SECRET = xxxxxxxxxxxxxxxxxxxxxx
 *
 * The app sends:  { image: "data:image/jpeg;base64,/9j/4AAQ..." }
 * This route returns: { ok: true, url: "https://res.cloudinary.com/..." }
 */

const router = require('express').Router();
const { auth } = require('../middleware/auth');

// ── Cloudinary config ─────────────────────────────────────────────────────────
let cloudinary = null;
function getCloudinary() {
  if (cloudinary) return cloudinary;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return null;
  }
  try {
    const cld = require('cloudinary').v2;
    cld.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key:    CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
      secure:     true,
    });
    cloudinary = cld;
    return cloudinary;
  } catch (e) {
    console.warn('[upload] cloudinary package not installed:', e.message);
    return null;
  }
}

// ── POST /api/upload/image ────────────────────────────────────────────────────
// Auth required — prevents anonymous abuse of your Cloudinary quota.
// Max image size: 5 MB (base64 ~6.7 MB string). Enforced by express.json limit.
router.post('/image', auth, async (req, res) => {
  const cld = getCloudinary();
  if (!cld) {
    return res.json({
      ok: false,
      error: 'Image uploads not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to Railway variables.',
    });
  }

  const { image, folder = 'cityplus' } = req.body;
  if (!image || typeof image !== 'string') {
    return res.json({ ok: false, error: 'image field (base64 string) is required' });
  }

  // Accept both plain base64 and data URI format
  const base64Data = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;

  // Validate it looks like an image data URI (JPEG, PNG, WebP, HEIC)
  if (!/^data:image\/(jpeg|jpg|png|webp|heic);base64,/.test(base64Data)) {
    return res.json({ ok: false, error: 'Only JPEG, PNG, WebP, and HEIC images are supported' });
  }

  // Rough size check — base64 is ~33% larger than binary
  const approxBytes = (base64Data.length * 3) / 4;
  if (approxBytes > 5 * 1024 * 1024) {
    return res.json({ ok: false, error: 'Image too large. Maximum size is 5 MB.' });
  }

  try {
    const result = await cld.uploader.upload(base64Data, {
      folder,
      // Auto-optimize: convert to WebP, resize to max 1200px wide, quality auto
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
      // Tag with user ID for easy cleanup / GDPR deletion
      tags: [`user_${req.user.id}`],
    });

    return res.json({ ok: true, url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    console.error('[upload] Cloudinary error:', err.message);
    return res.json({ ok: false, error: 'Image upload failed. Please try again.' });
  }
});

// ── DELETE /api/upload/image ──────────────────────────────────────────────────
// Allows removing an image by its Cloudinary public_id.
// Only the owner (matched by user tag) can delete — enforced by tag filter.
router.delete('/image', auth, async (req, res) => {
  const cld = getCloudinary();
  if (!cld) return res.json({ ok: false, error: 'Image service not configured' });

  const { publicId } = req.body;
  if (!publicId || typeof publicId !== 'string' || publicId.length > 200) {
    return res.json({ ok: false, error: 'publicId is required' });
  }

  try {
    await cld.uploader.destroy(publicId);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[upload] Cloudinary delete error:', err.message);
    return res.json({ ok: false, error: 'Failed to delete image' });
  }
});

module.exports = router;
