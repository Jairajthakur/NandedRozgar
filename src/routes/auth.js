/**
 * NandedRozgar — auth.js (Express routes)
 * Fixed:
 *   - Google /callback now redirects correctly for BOTH web and native APK
 *   - /google/start passes redirect_uri that matches Google Console setting
 *   - Rate limiters kept intact
 */
const router    = require('express').Router();
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const crypto    = require('crypto');
const rateLimit = require('express-rate-limit');
const { pool }  = require('../db');
const { auth }  = require('../middleware/auth');

// ── Firebase Admin (lazy-init once) ───────────────────────────────────────────
let _firebaseAdmin = null;
function getFirebaseAdmin() {
  if (_firebaseAdmin) return _firebaseAdmin;
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : undefined;
      admin.initializeApp({
        credential: serviceAccount
          ? admin.credential.cert(serviceAccount)
          : admin.credential.applicationDefault(),
      });
    }
    _firebaseAdmin = admin;
    return admin;
  } catch (e) {
    console.warn('Firebase Admin not initialised:', e.message);
    return null;
  }
}

// ── Rate limiters ──────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { ok: false, error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true, legacyHeaders: false,
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10,
  message: { ok: false, error: 'Too many registrations from this IP. Try again later.' },
  standardHeaders: true, legacyHeaders: false,
});
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, max: 10,
  message: { ok: false, error: 'Too many OTP requests. Try again in 10 minutes.' },
  standardHeaders: true, legacyHeaders: false,
});
const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5,
  message: { ok: false, error: 'Too many reset requests. Try again in 1 hour.' },
  standardHeaders: true, legacyHeaders: false,
});
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10,
  message: { ok: false, error: 'Too many password reset attempts. Try again in 1 hour.' },
  standardHeaders: true, legacyHeaders: false,
});

// ── Helpers ────────────────────────────────────────────────────────────────────
function makeToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function safeUser(u) {
  const { password, reset_token, reset_expires, ...rest } = u;
  return rest;
}

// ── POST /api/auth/register ────────────────────────────────────────────────────
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { name, email, password, phone, company, referralCode } = req.body;

    if (!name?.trim() || !email?.trim() || !password)
      return res.json({ ok: false, error: 'Name, email and password are required' });
    if (password.length < 8)
      return res.json({ ok: false, error: 'Password must be at least 8 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.json({ ok: false, error: 'Enter a valid email address' });
    if (!/[0-9]/.test(password) && !/[^A-Za-z0-9]/.test(password))
      return res.json({ ok: false, error: 'Password must contain at least one number or symbol' });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role, phone, company)
       VALUES ($1, $2, $3, 'user', $4, $5) RETURNING *`,
      [name.trim(), email.toLowerCase().trim(), hash, phone || null, company || null]
    );
    const user = rows[0];

    if (referralCode?.startsWith('NR')) {
      const refId = parseInt(referralCode.slice(2), 10);
      if (!isNaN(refId) && refId !== user.id) {
        await pool.query(
          `UPDATE users SET referral_credits = COALESCE(referral_credits, 0) + 1 WHERE id = $1`,
          [refId]
        ).catch(() => {});
      }
    }

    return res.json({ ok: true, token: makeToken(user), user: safeUser(user) });
  } catch (err) {
    if (err.code === '23505') return res.json({ ok: false, error: 'Email already registered' });
    console.error('register error:', err.message);
    return res.json({ ok: false, error: 'Registration failed' });
  }
});

// ── POST /api/auth/login ───────────────────────────────────────────────────────
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ ok: false, error: 'Email and password required' });

    const ADMIN_EMAIL    = process.env.ADMIN_EMAIL;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    const isBcryptHash = ADMIN_PASSWORD?.startsWith('$2');
    const adminPasswordMatch = ADMIN_EMAIL && ADMIN_PASSWORD &&
      email.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
      (isBcryptHash
        ? await bcrypt.compare(password, ADMIN_PASSWORD)
        : (() => {
            console.warn('⚠️  ADMIN_PASSWORD is stored as plain text. Hash it with bcrypt for production.');
            return password === ADMIN_PASSWORD;
          })());

    if (adminPasswordMatch) {
      const { rows: existing } = await pool.query('SELECT * FROM users WHERE email = $1', [ADMIN_EMAIL.toLowerCase()]);
      let admin = existing[0];
      if (!admin) {
        const ahash = await bcrypt.hash(ADMIN_PASSWORD, 12);
        const { rows } = await pool.query(
          `INSERT INTO users (name, email, password, role) VALUES ('Admin', $1, $2, 'admin') RETURNING *`,
          [ADMIN_EMAIL.toLowerCase(), ahash]
        );
        admin = rows[0];
      } else if (admin.role !== 'admin') {
        await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', admin.id]);
        admin.role = 'admin';
      }
      return res.json({ ok: true, token: makeToken(admin), user: safeUser(admin) });
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    const user = rows[0];
    if (!user)          return res.json({ ok: false, error: 'No account found with this email' });
    if (!user.active)   return res.json({ ok: false, error: 'This account has been suspended' });
    if (!user.password) return res.json({ ok: false, error: 'This account uses Google sign-in. Use that option instead.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ ok: false, error: 'Incorrect password' });

    await pool.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [user.id]).catch(() => {});
    return res.json({ ok: true, token: makeToken(user), user: safeUser(user) });
  } catch (err) {
    console.error('login error:', err.message);
    return res.json({ ok: false, error: 'Login failed' });
  }
});

// ── POST /api/auth/google ──────────────────────────────────────────────────────
router.post('/google', loginLimiter, async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.json({ ok: false, error: 'Access token required' });

    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!googleRes.ok) return res.json({ ok: false, error: 'Invalid Google token' });

    const { sub: googleId, email, name, picture, email_verified } = await googleRes.json();

    if (!email_verified) return res.json({ ok: false, error: 'Google account email not verified' });
    if (!email)          return res.json({ ok: false, error: 'Could not retrieve email from Google' });

    let { rows } = await pool.query(
      'SELECT * FROM users WHERE google_id = $1 OR email = $2 LIMIT 1',
      [googleId, email.toLowerCase()]
    );
    let user = rows[0];

    if (user) {
      await pool.query(
        `UPDATE users SET
           google_id  = COALESCE(google_id, $1),
           avatar_url = COALESCE(avatar_url, $2),
           last_seen  = NOW()
         WHERE id = $3`,
        [googleId, picture || null, user.id]
      );
      user.google_id  = user.google_id  || googleId;
      user.avatar_url = user.avatar_url || picture;
    } else {
      const { rows: newRows } = await pool.query(
        `INSERT INTO users (name, email, google_id, avatar_url, role, active)
         VALUES ($1, $2, $3, $4, 'user', true) RETURNING *`,
        [name || email.split('@')[0], email.toLowerCase(), googleId, picture || null]
      );
      user = newRows[0];
    }

    if (!user.active) return res.json({ ok: false, error: 'This account has been suspended' });
    return res.json({ ok: true, token: makeToken(user), user: safeUser(user) });
  } catch (err) {
    console.error('google auth error:', err.message);
    return res.json({ ok: false, error: 'Google sign-in failed' });
  }
});

// ── GET /api/auth/google/start ────────────────────────────────────────────────
// DEPRECATED: The app now uses expo-auth-session/providers/google (client-side
// OAuth) and no longer needs this server-side redirect route.
// Kept for backward compatibility only.
router.get('/google/start', (req, res) => {
  return res.status(410).json({
    ok: false,
    error: 'This endpoint is deprecated. The app now handles Google OAuth client-side.',
  });
});

// ── DEPRECATED google/start (original code kept below as comment) ─────────────
router.get('/google/start_legacy_DISABLED', (req, res) => {
  const clientId    = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const apiBase     = process.env.EXPO_PUBLIC_API_URL || 'https://localloops-production.up.railway.app';
  const redirectUri = encodeURIComponent(`${apiBase}/api/auth/google/callback`);
  const scope       = encodeURIComponent('openid profile email');
  // We use response_type=token (implicit flow) — simplest, no client secret needed.
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}&access_type=online`;
  res.redirect(url);
});

// ── GET /api/auth/google/callback ─────────────────────────────────────────────
// Google redirects here with access_token in the URL hash/query.
//
// IMPORTANT — In Google Cloud Console, add this as an Authorized redirect URI:
//   https://localloops-production.up.railway.app/api/auth/google/callback
//
// This handler redirects back into the app:
//   • Native (APK/Expo Go) → nanded://google-auth?access_token=...
//   • Web                  → APP_URL/?access_token=...   (same-tab navigation)
//
router.get('/google/callback', (req, res) => {
  const { access_token, error, error_description } = req.query;

  const appUrl    = process.env.APP_URL || 'https://localloops-production.up.railway.app';
  const nativeUrl = 'nanded://google-auth';   // matches scheme in app.config.js

  if (error || !access_token) {
    const msg = encodeURIComponent(error_description || error || 'Google sign-in failed');
    // Send error to both targets — client detects by platform
    return res.send(`
      <!DOCTYPE html><html><head><title>Redirecting…</title></head><body>
      <script>
        var msg = "${msg}";
        // Try native deep link first; if it fails (web), redirect to web app
        var native = "${nativeUrl}?error=" + msg;
        var web    = "${appUrl}/?error=" + msg;
        window.location = native;
        setTimeout(function(){ window.location = web; }, 1000);
      </script>
      <p>Redirecting back to app…</p>
      </body></html>
    `);
  }

  const token = encodeURIComponent(access_token);

  // HTML page that tries native deep link, falls back to web URL
  // This handles both native APK and web browser correctly.
  return res.send(`
    <!DOCTYPE html><html><head><title>Signing in…</title></head><body>
    <script>
      var token  = "${token}";
      var native = "${nativeUrl}?access_token=" + token;
      var web    = "${appUrl}/?access_token=" + token;

      // If the page is opened inside a Custom Tab / SFSafariVC (native),
      // the deep link will fire and close the tab automatically.
      // If opened in a normal browser (web), the deep link will fail silently
      // after ~800ms and we fall back to the web URL.
      window.location = native;
      setTimeout(function(){
        // Only runs if native redirect did not close the window
        window.location = web;
      }, 1000);
    </script>
    <p style="font-family:sans-serif;text-align:center;margin-top:40px">
      Signing you in… please wait.
    </p>
    </body></html>
  `);
});

// ── POST /api/auth/verify-firebase-otp ────────────────────────────────────────
router.post('/verify-firebase-otp', otpLimiter, async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.json({ ok: false, error: 'Firebase ID token required' });

    const admin = getFirebaseAdmin();
    if (!admin) return res.json({ ok: false, error: 'Firebase not configured on server. Set FIREBASE_SERVICE_ACCOUNT.' });

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (e) {
      console.warn('Firebase token verification failed:', e.message);
      return res.json({ ok: false, error: 'OTP verification failed. Please try again.' });
    }

    const phone = decoded.phone_number;
    if (!phone) return res.json({ ok: false, error: 'No phone number in token' });

    const phoneLocal = phone.replace(/^\+91/, '');

    let { rows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phoneLocal]);
    let user = rows[0];
    if (!user) {
      const { rows: newRows } = await pool.query(
        `INSERT INTO users (name, phone, role, active) VALUES ($1, $2, 'user', true) RETURNING *`,
        [`User${phoneLocal.slice(-4)}`, phoneLocal]
      );
      user = newRows[0];
    }

    if (!user.active) return res.json({ ok: false, error: 'This account has been suspended' });
    await pool.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [user.id]).catch(() => {});
    return res.json({ ok: true, token: makeToken(user), user: safeUser(user) });
  } catch (err) {
    console.error('verify-firebase-otp error:', err.message);
    return res.json({ ok: false, error: 'OTP verification failed' });
  }
});

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
router.post('/forgot-password', forgotLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.json({ ok: false, error: 'Email is required' });

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (!rows[0]) return res.json({ ok: true, message: 'If that email exists, a reset link was sent.' });

    const user       = rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetHash  = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expires    = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3',
      [resetHash, expires, user.id]
    );

    const appUrl   = process.env.APP_URL || 'https://localloops-production.up.railway.app';
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

    if (process.env.RESEND_API_KEY) {
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from:    `CityPlus <${fromEmail}>`,
          to:      [user.email],
          subject: 'Reset your CityPlus password',
          html: `
            <!DOCTYPE html><html><body style="font-family:sans-serif;background:#f9f9f9;padding:24px">
              <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.08)">
                <h2 style="color:#f97316;margin-top:0">Reset your password</h2>
                <p>Hi ${user.name || 'there'},</p>
                <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
                <a href="${resetUrl}" style="display:inline-block;background:#f97316;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Reset Password</a>
                <p style="color:#666;font-size:14px">If you didn't request this, you can safely ignore this email.</p>
                <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
                <p style="color:#999;font-size:12px">— The CityPlus Team</p>
              </div>
            </body></html>
          `,
        }),
      });
    } else {
      console.log(`\n🔑 Password reset link for ${email}:\n${resetUrl}\n`);
    }

    return res.json({ ok: true, message: 'If that email exists, a reset link was sent.' });
  } catch (err) {
    console.error('forgot-password error:', err.message);
    return res.json({ ok: false, error: 'Failed to process reset request' });
  }
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
router.post('/reset-password', resetLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.json({ ok: false, error: 'Token and new password are required' });
    if (password.length < 8)  return res.json({ ok: false, error: 'Password must be at least 8 characters' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE reset_expires > NOW() AND reset_token IS NOT NULL'
    );
    const user = rows.find(u => {
      if (!u.reset_token) return false;
      const a = Buffer.from(tokenHash);
      const b = Buffer.from(u.reset_token);
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    });
    if (!user) return res.json({ ok: false, error: 'Reset link is invalid or has expired' });

    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
      [hash, user.id]
    );
    return res.json({ ok: true, message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    console.error('reset-password error:', err.message);
    return res.json({ ok: false, error: 'Password reset failed' });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────────
router.get('/me', auth, (req, res) => {
  res.json({ ok: true, user: safeUser(req.user) });
});

// ── POST /api/auth/change-password ────────────────────────────────────────────
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.json({ ok: false, error: 'Both passwords required' });
    if (newPassword.length < 8)           return res.json({ ok: false, error: 'New password must be at least 8 characters' });

    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];
    if (!user.password) return res.json({ ok: false, error: 'No password set — use forgot-password to create one' });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.json({ ok: false, error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, user.id]);
    return res.json({ ok: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('change-password error:', err.message);
    return res.json({ ok: false, error: 'Failed to change password' });
  }
});

// ── POST /api/auth/logout ──────────────────────────────────────────────────────
router.post('/logout', auth, async (req, res) => {
  try {
    await pool.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [req.user.id]).catch(() => {});
    return res.json({ ok: true });
  } catch {
    return res.json({ ok: true });
  }
});

// ── POST /api/auth/send-otp ────────────────────────────────────────────────────
router.post('/send-otp', otpLimiter, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^\d{10}$/.test(phone.trim())) {
      return res.json({ ok: false, error: 'Enter a valid 10-digit mobile number.' });
    }

    const otp       = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash   = await bcrypt.hash(otp, 8);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      `INSERT INTO otp_sessions (phone, otp_hash, expires_at, attempts)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (phone)
       DO UPDATE SET otp_hash = $2, expires_at = $3, attempts = 0`,
      [phone.trim(), otpHash, expiresAt]
    );

    const apiKey     = process.env.FAST2SMS_API_KEY;
    const route      = process.env.FAST2SMS_ROUTE || 'otp';
    const senderId   = process.env.FAST2SMS_SENDER_ID || '';
    const templateId = process.env.FAST2SMS_TEMPLATE_ID || '';

    if (!apiKey) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] OTP for ${phone}: ${otp}`);
      }
      return res.json({ ok: true, dev: true, message: 'OTP logged to console (no FAST2SMS_API_KEY set).' });
    }

    let smsUrl;
    if (route === 'dlt') {
      smsUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&route=dlt&sender_id=${senderId}&message=${encodeURIComponent(process.env.FAST2SMS_MESSAGE || 'Your CityPlus OTP is {#var#}. Valid for 10 minutes.')}&variables_values=${otp}&flash=0&numbers=${phone.trim()}`
        + (templateId ? `&template_id=${templateId}` : '');
    } else {
      smsUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&variables_values=${otp}&route=otp&numbers=${phone.trim()}`;
    }

    const smsRes  = await fetch(smsUrl, { method: 'GET', headers: { 'cache-control': 'no-cache' } });
    const smsData = await smsRes.json();
    if (!smsData.return) throw new Error((Array.isArray(smsData.message) ? smsData.message[0] : smsData.message) || 'SMS delivery failed');

    return res.json({ ok: true });
  } catch (err) {
    console.error('send-otp error:', err.message);
    return res.json({ ok: false, error: 'Failed to send OTP. Please try again.' });
  }
});

// ── POST /api/auth/verify-otp ──────────────────────────────────────────────────
router.post('/verify-otp', otpLimiter, async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.json({ ok: false, error: 'Phone and OTP are required.' });

    const { rows } = await pool.query(
      `SELECT * FROM otp_sessions WHERE phone = $1 AND expires_at > NOW() AND attempts < 5`,
      [phone.trim()]
    );

    if (!rows.length) {
      return res.json({ ok: false, error: 'OTP expired or not found. Please request a new one.' });
    }

    const session = rows[0];
    const valid   = await bcrypt.compare(String(otp).trim(), session.otp_hash);

    if (!valid) {
      await pool.query('UPDATE otp_sessions SET attempts = attempts + 1 WHERE phone = $1', [phone]);
      const left = 5 - (session.attempts + 1);
      return res.json({ ok: false, error: `Incorrect OTP. ${left > 0 ? `${left} attempt(s) remaining.` : 'Please request a new OTP.'}` });
    }

    await pool.query('DELETE FROM otp_sessions WHERE phone = $1', [phone]);

    let { rows: userRows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phone.trim()]);
    let user;
    if (!userRows.length) {
      const { rows: newRows } = await pool.query(
        `INSERT INTO users (name, phone, role, active) VALUES ($1, $2, 'user', true) RETURNING *`,
        [`User${phone.slice(-4)}`, phone.trim()]
      );
      user = newRows[0];
    } else {
      user = userRows[0];
      await pool.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [user.id]).catch(() => {});
    }

    const token = makeToken(user);
    return res.json({
      ok: true, token,
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role, email: user.email },
    });
  } catch (err) {
    console.error('verify-otp error:', err.message);
    return res.json({ ok: false, error: 'OTP verification failed. Please try again.' });
  }
});

// ── POST /api/auth/save-push-token ────────────────────────────────────────────
router.post('/save-push-token', auth, async (req, res) => {
  try {
    const { pushToken } = req.body;
    if (!pushToken || typeof pushToken !== 'string' || !pushToken.startsWith('ExponentPushToken[')) {
      return res.json({ ok: false, error: 'Invalid push token format' });
    }
    await pool.query(
      'UPDATE users SET push_token = $1 WHERE id = $2',
      [pushToken.trim(), req.user.id]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('save-push-token error:', err.message);
    return res.json({ ok: false, error: 'Failed to save push token' });
  }
});

// ── DELETE /api/auth/account ───────────────────────────────────────────────────
router.delete('/account', auth, async (req, res) => {
  const client = await require('../db').pool.connect();
  try {
    await client.query('BEGIN');
    const userId = req.user.id;
    await client.query(`
      UPDATE users SET
        name='Deleted User', email=NULL, phone=NULL, password=NULL,
        google_id=NULL, avatar_url=NULL, push_token=NULL, company=NULL,
        reset_token=NULL, reset_expires=NULL, active=false, deleted_at=NOW()
      WHERE id=$1
    `, [userId]);
    await client.query(`UPDATE jobs         SET status='deleted' WHERE posted_by=$1`, [userId]);
    await client.query(`UPDATE rooms        SET status='deleted' WHERE posted_by=$1`, [userId]);
    await client.query(`UPDATE vehicles     SET status='deleted' WHERE posted_by=$1`, [userId]);
    await client.query(`UPDATE buysell_items SET status='deleted' WHERE posted_by=$1`, [userId]);
    await client.query(`DELETE FROM otp_sessions WHERE phone=$1`, [req.user.phone]).catch(() => {});
    await client.query('COMMIT');
    return res.json({ ok: true, message: 'Your account has been deleted.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('account-delete error:', err.message);
    return res.json({ ok: false, error: 'Failed to delete account. Please contact support.' });
  } finally {
    client.release();
  }
});

module.exports = router;
