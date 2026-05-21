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
  basic:   { price: 99,  days: 7  },
  popular: { price: 249, days: 15 },
  premium: { price: 499, days: 30 },
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
      address, website, description, plan, bannerStyle,
    } = req.body;

    if (!bizName?.trim())  return res.json({ ok: false, error: 'Business name is required.' });
    if (!phone?.trim())    return res.json({ ok: false, error: 'Contact number is required.' });
    if (!category?.trim()) return res.json({ ok: false, error: 'Category is required.' });
    if (!location?.trim()) return res.json({ ok: false, error: 'Location is required.' });
    if (!PLANS[plan])      return res.json({ ok: false, error: 'Invalid promotion plan.' });

    const { price, days } = PLANS[plan];
    const accentColor = BANNER_COLORS[bannerStyle] || '#f97316';

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { rows } = await pool.query(
      `INSERT INTO business_promotions
         (user_id, biz_name, tagline, phone, category, location, address,
          website, description, plan, plan_price, plan_days, banner_style, accent_color, status, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'active',$15)
       RETURNING *`,
      [
        req.user.id,
        bizName.trim(), tagline?.trim() || null, phone.trim(),
        category.trim(), location.trim(), address?.trim() || null,
        website?.trim() || null, description?.trim() || null,
        plan, price, days, bannerStyle || 'bold', accentColor,
        expiresAt,
      ]
    );

    res.json({ ok: true, promotion: rows[0] });
  } catch (err) {
    console.error('POST /promotions error:', err);
    res.status(500).json({ ok: false, error: 'Failed to submit promotion. Please try again.' });
  }
});

// ── GET /api/promotions/active ────────────────────────────────────────────────
// Returns ONE random active promotion (legacy — kept for compatibility)
router.get('/active', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, biz_name, tagline, phone, category, location, banner_style, accent_color, created_at
       FROM business_promotions
       WHERE status = 'active'
         AND (expires_at IS NULL OR expires_at > NOW())
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
        bannerStyle: p.banner_style,
        accentColor: p.accent_color || '#f97316',
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
      `SELECT id, biz_name, tagline, phone, category, location, banner_style, accent_color, created_at
       FROM business_promotions
       WHERE status = 'active'
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC`
    );

    const promotions = rows.map(p => ({
      id:          p.id,
      bizName:     p.biz_name,
      tagline:     p.tagline || '',
      phone:       p.phone,
      category:    p.category,
      location:    p.location,
      bannerStyle: p.banner_style,
      accentColor: p.accent_color || '#f97316',
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
