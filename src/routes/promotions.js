/**
 * promotions.js — Business promotion routes
 *
 * POST /api/promotions        — submit a new promotion (auth required)
 * GET  /api/promotions/active — get a random active promotion banner (public)
 * GET  /api/promotions/all    — get ALL active promotions ordered by created_at (public)
 * GET  /api/promotions/mine   — get the current user's promotions (auth required)
 */

const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// Plan config — source of truth on the server
const PLANS = {
  basic:   { price: 49, days: 7  },
  popular: { price: 79, days: 15 },
  premium: { price: 99, days: 30 },
};

// Accent colour per banner style (used by the banner component)
const BANNER_COLORS = {
  bold:  '#e82828',
  clean: '#f97316',
  vivid: '#f97316',
};

// ── POST /api/promotions ──────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const {
      bizName, tagline, phone, category, location,
      address, website, description, timing, plan,
      bannerStyle, templateId,
    } = req.body;

    if (!bizName?.trim())  return res.json({ ok: false, error: 'Business name is required.' });
    if (!phone?.trim())    return res.json({ ok: false, error: 'Contact number is required.' });
    if (!category?.trim()) return res.json({ ok: false, error: 'Category is required.' });
    if (!location?.trim()) return res.json({ ok: false, error: 'Location is required.' });
    if (!PLANS[plan])      return res.json({ ok: false, error: 'Invalid promotion plan.' });

    const { price, days } = PLANS[plan];
    const accentColor = BANNER_COLORS[bannerStyle] || '#f97316';
    const tid = templateId ? parseInt(templateId, 10) : null;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { rows } = await pool.query(
      `INSERT INTO business_promotions
         (user_id, business_name, biz_name, tagline, phone, category, location, address,
          website, description, timing, plan, plan_price, plan_days,
          banner_style, accent_color, template_id, status, expires_at)
       VALUES ($1,$2,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'active',$17)
       RETURNING *`,
      [
        req.user.id,
        bizName.trim(), tagline?.trim() || null, phone.trim(),
        category.trim(), location.trim(), address?.trim() || null,
        website?.trim() || null, description?.trim() || null,
        timing?.trim() || null,
        plan, price, days, bannerStyle || 'bold', accentColor, tid,
        expiresAt,
      ]
    );

    res.json({ ok: true, promotion: rows[0] });
  } catch (err) {
    console.error('POST /promotions error:', err);
    res.status(500).json({ ok: false, error: 'Failed to submit promotion. Please try again.' });
  }
});

// ── POST /api/promotions/request ─────────────────────────────────────────────
// Saves a WhatsApp banner-design request to the DB with status='pending'.
// Called BEFORE opening WhatsApp so every request is recorded even if the user
// never sends the message.
router.post('/request', auth, async (req, res) => {
  try {
    const {
      bizName, tagline, phone, category, location,
      address, website, description, plan,
    } = req.body;

    if (!bizName?.trim())  return res.json({ ok: false, error: 'Business name is required.' });
    if (!phone?.trim())    return res.json({ ok: false, error: 'Contact number is required.' });
    if (!category?.trim()) return res.json({ ok: false, error: 'Category is required.' });
    if (!location?.trim()) return res.json({ ok: false, error: 'Location is required.' });
    if (!PLANS[plan])      return res.json({ ok: false, error: 'Invalid promotion plan.' });

    const { price, days } = PLANS[plan];

    const { rows } = await pool.query(
      `INSERT INTO business_promotions
         (user_id, business_name, biz_name, tagline, phone, category, location, address,
          website, description, plan, plan_price, plan_days,
          banner_mode, banner_style, accent_color, status, created_at)
       VALUES ($1,$2,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'whatsapp','clean','#f97316','pending',NOW())
       RETURNING id`,
      [
        req.user.id,
        bizName.trim(), tagline?.trim() || null, phone.trim(),
        category.trim(), location.trim(), address?.trim() || null,
        website?.trim() || null, description?.trim() || null,
        plan, price, days,
      ]
    );

    res.json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error('POST /promotions/request error:', err);
    res.status(500).json({ ok: false, error: 'Failed to save your request. Please try again.' });
  }
});

// ── GET /api/promotions/active ────────────────────────────────────────────────
// Returns ONE random active promotion (legacy — kept for compatibility)
router.get('/active', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, biz_name, tagline, phone, category, location, address, website, description,
              timing, banner_style, accent_color, template_id, plan, created_at, banner_image
       FROM business_promotions
       WHERE status = 'active'
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (
           banner_image IS NOT NULL
           OR (biz_name IS NOT NULL AND biz_name NOT IN ('Admin Banner', 'Advertise Your Business Here') AND LENGTH(TRIM(biz_name)) > 0)
         )
       ORDER BY RANDOM()
       LIMIT 1`
    );

    if (!rows.length) return res.json({ ok: true, promotion: null });

    const p = rows[0];
    res.json({
      ok: true,
      promotion: {
        id:          p.id,
        bizName:     p.biz_name,
        tagline:     p.tagline || '',
        phone:       p.phone,
        category:    p.category,
        location:    p.location,
        address:     p.address || '',
        website:     p.website || '',
        description: p.description || '',
        timing:      p.timing || '',
        plan:        p.plan || 'basic',
        bannerStyle: p.banner_style,
        accentColor: p.accent_color || '#f97316',
        templateId:  p.template_id || null,
        bannerImage: p.banner_image ? (p.banner_image.startsWith('http') ? p.banner_image : 'https://thecityplus.in' + p.banner_image) : null,
        createdAt:   p.created_at,
      },
    });
  } catch (err) {
    console.error('GET /promotions/active error:', err);
    res.json({ ok: false, error: 'Failed to fetch promotion.' });
  }
});

// ── GET /api/promotions/all ───────────────────────────────────────────────────
// Returns ALL active promotions ordered by created_at DESC.
// Used by screens to interleave banners with posts chronologically.
router.get('/all', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, biz_name, tagline, phone, category, location, address, website, description,
              timing, banner_style, accent_color, template_id, plan, expires_at, created_at,
              banner_image
       FROM business_promotions
       WHERE status = 'active'
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (
           banner_image IS NOT NULL
           OR (biz_name IS NOT NULL AND biz_name NOT IN ('Admin Banner', 'Advertise Your Business Here') AND LENGTH(TRIM(biz_name)) > 0)
         )
       ORDER BY created_at DESC`
    );

    const promotions = rows.map(p => ({
      id:          p.id,
      bizName:     p.biz_name,
      tagline:     p.tagline || '',
      phone:       p.phone,
      category:    p.category,
      location:    p.location,
      address:     p.address || '',
      website:     p.website || '',
      description: p.description || '',
      timing:      p.timing || '',
      plan:        p.plan || 'basic',
      bannerStyle: p.banner_style,
      accentColor: p.accent_color || '#f97316',
      templateId:  p.template_id || null,
      bannerImage: p.banner_image ? (p.banner_image.startsWith('http') ? p.banner_image : 'https://thecityplus.in' + p.banner_image) : null,
      expiresAt:   p.expires_at,
      createdAt:   p.created_at,
    }));

    res.json({ ok: true, promotions });
  } catch (err) {
    console.error('GET /promotions/all error:', err);
    res.json({ ok: false, error: 'Failed to fetch promotions.' });
  }
});

// ── GET /api/promotions/mine ──────────────────────────────────────────────────
router.get('/mine', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM business_promotions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ ok: true, promotions: rows });
  } catch (err) {
    console.error('GET /promotions/mine error:', err);
    res.json({ ok: false, error: 'Failed to load your promotions.' });
  }
});

module.exports = router;
