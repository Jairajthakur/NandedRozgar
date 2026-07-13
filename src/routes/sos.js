/**
 * routes/sos.js — Emergency Alert / SOS Button
 *
 * A safety net inside the active-job interface: if a laborer feels unsafe
 * or has a medical issue on site, one tap logs an SOS alert with their
 * current location and pings the emergency contacts saved on their
 * profile. Actually dispatching SMS/calls needs an SMS gateway that isn't
 * wired into this project yet (see utils/notifications.js for the existing
 * push-notification plumbing this can hang off later) — for now this
 * persists the alert, returns the contacts to dial/message immediately
 * from the phone's own dialer, and notifies the hiring contractor (if any)
 * via the existing push pipeline so a real person is alerted right away.
 *
 * Mounted at /api/sos in src/index.js.
 */
const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

let sendPushNotifications = null;
try { ({ sendPushNotifications } = require('../utils/push')); } catch { /* push util optional */ }

// PATCH /api/sos/contacts — save/update emergency contacts on the profile
router.patch('/contacts', auth, async (req, res) => {
  try {
    const name   = (req.body.name || '').trim().slice(0, 100) || null;
    const phone  = (req.body.phone || '').trim().slice(0, 15) || null;
    const phone2 = (req.body.phone2 || '').trim().slice(0, 15) || null;

    if (phone && !/^\+?[0-9]{10,13}$/.test(phone)) {
      return res.status(400).json({ ok: false, error: 'Enter a valid phone number' });
    }

    const { rows } = await pool.query(`
      UPDATE users SET emergency_contact_name = $1, emergency_contact_phone = $2, emergency_contact_phone2 = $3
      WHERE id = $4
      RETURNING emergency_contact_name, emergency_contact_phone, emergency_contact_phone2
    `, [name, phone, phone2, req.user.id]);

    res.json({ ok: true, contacts: rows[0] });
  } catch (err) {
    console.error('[sos] contacts error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to save emergency contacts' });
  }
});

// GET /api/sos/contacts — read back saved contacts (for the SOS button to
// show who will be contacted before the worker taps it)
router.get('/contacts', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT emergency_contact_name, emergency_contact_phone, emergency_contact_phone2 FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json({ ok: true, contacts: rows[0] || {} });
  } catch (err) {
    console.error('[sos] get contacts error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load emergency contacts' });
  }
});

// POST /api/sos/trigger — fire an SOS alert. body: { hireRequestId?, lat, lng, message? }
router.post('/trigger', auth, async (req, res) => {
  try {
    const lat = parseFloat(req.body.lat);
    const lng = parseFloat(req.body.lng);
    const hireRequestId = req.body.hireRequestId ? parseInt(req.body.hireRequestId, 10) : null;
    const message = (req.body.message || '').trim().slice(0, 300) || null;

    const { rows } = await pool.query(`
      INSERT INTO sos_alerts (user_id, hire_request_id, lat, lng, message)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [
      req.user.id, hireRequestId,
      Number.isFinite(lat) ? lat : null, Number.isFinite(lng) ? lng : null,
      message,
    ]);
    const alert = rows[0];

    const { rows: contactRows } = await pool.query(
      'SELECT name, emergency_contact_name, emergency_contact_phone, emergency_contact_phone2 FROM users WHERE id = $1',
      [req.user.id]
    );
    const profile = contactRows[0] || {};

    // Best-effort: if this SOS is tied to an active hire, push-notify the
    // contractor on the other end so a human sees it immediately.
    if (hireRequestId && sendPushNotifications) {
      try {
        const { rows: hrRows } = await pool.query(
          `SELECT hr.contractor_id, u.push_token FROM hire_requests hr
           JOIN users u ON u.id = hr.contractor_id WHERE hr.id = $1`,
          [hireRequestId]
        );
        const token = hrRows[0]?.push_token;
        if (token) {
          await sendPushNotifications([token], {
            title: '🚨 SOS from your hired worker',
            body: `${profile.name || 'A worker'} has raised an emergency alert. Please check on them immediately.`,
          });
        }
      } catch (e) { console.warn('[sos] push notify failed (non-fatal):', e.message); }
    }

    res.json({
      ok: true,
      alert,
      emergencyContacts: {
        name: profile.emergency_contact_name,
        phone: profile.emergency_contact_phone,
        phone2: profile.emergency_contact_phone2,
      },
    });
  } catch (err) {
    console.error('[sos] trigger error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to send SOS alert' });
  }
});

// PATCH /api/sos/:id/resolve — mark an alert resolved (the worker themselves,
// once safe, closes it out — keeps the alert list meaningful)
router.patch('/:id/resolve', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE sos_alerts SET status = 'resolved', resolved_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *",
      [parseInt(req.params.id, 10), req.user.id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Alert not found' });
    res.json({ ok: true, alert: rows[0] });
  } catch (err) {
    console.error('[sos] resolve error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to resolve alert' });
  }
});

// GET /api/sos/mine — a worker's own SOS history
router.get('/mine', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM sos_alerts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ ok: true, alerts: rows });
  } catch (err) {
    console.error('[sos] mine error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to load SOS history' });
  }
});

module.exports = router;
