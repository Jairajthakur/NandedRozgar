/**
 * NandedRozgar — auth.js (Express routes)
 * Production-ready: Email/Password + Google OAuth + Phone OTP (Firebase) + Forgot/Reset Password
 *
 * Phone OTP: Firebase Auth — FREE 10,000/month, no SMS cost, handles reCAPTCHA
 *   - Client sends OTP via Firebase SDK (no backend SMS call needed)
 *   - Backend verifies Firebase ID token via firebase-admin SDK
 * Email:  Resend (free: 3,000 emails/month)
 * Google: expo-auth-session + Google OAuth2
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
      // Credentials come from FIREBASE_SERVICE_ACCOUNT env var (JSON string)
      // or from GOOGLE_APPLICATION_CREDENTIALS file path
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
  windowMs: 15 * 60 * 1000, max: 10,
  message: { ok: false, error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true, legacyHeaders: false,
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5,
  message: { ok: false, error: 'Too many registrations from this IP. Try again later.' },
  standardHeaders: true, legacyHeaders: false,
});
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, max: 10,
  message: { ok: false, error: 'Too many OTP requests. Try again in 10 minutes.' },
  standardHeaders: true, legacyHeaders: false,
});
const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 3,
  message: { ok: false, error: 'Too many reset requests. Try again in 1 hour.' },
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
    if (ADMIN_EMAIL && ADMIN_PASSWORD &&
        email.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
        password === ADMIN_PASSWORD) {
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
    if (!user.password) return res.json({ ok: false, error: 'This account uses Google or Phone sign-in. Use those options instead.' });

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

// ── POST /api/auth/verify-firebase-otp ────────────────────────────────────────
// Firebase handles OTP sending entirely on the client (free, 10K/month).
// The client calls firebase.auth().signInWithPhoneNumber(), user enters OTP,
// Firebase returns an idToken — the client sends ONLY that token here.
// We verify it with firebase-admin and upsert the user.
router.post('/verify-firebase-otp', otpLimiter, async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.json({ ok: false, error: 'Firebase ID token required' });

    const admin = getFirebaseAdmin();
    if (!admin) return res.json({ ok: false, error: 'Firebase not configured on server. Set FIREBASE_SERVICE_ACCOUNT.' });

    // Verify the token with Firebase Admin
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (e) {
      console.warn('Firebase token verification failed:', e.message);
      return res.json({ ok: false, error: 'OTP verification failed. Please try again.' });
    }

    const phone = decoded.phone_number; // e.g. "+919876543210"
    if (!phone) return res.json({ ok: false, error: 'No phone number in token' });

    // Normalise: strip +91 prefix for DB storage
    const phoneLocal = phone.replace(/^\+91/, '');

    // Upsert user by phone
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

    const appUrl   = process.env.APP_URL || 'https://nandedrozgar.app';
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
          from:    `NandedRozgar <${fromEmail}>`,
          to:      [user.email],
          subject: 'Reset your NandedRozgar password',
          html: `
            <!DOCTYPE html><html><body style="font-family:sans-serif;background:#f9f9f9;padding:24px">
              <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.08)">
                <h2 style="color:#f97316;margin-top:0">Reset your password</h2>
                <p>Hi ${user.name || 'there'},</p>
                <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
                <a href="${resetUrl}" style="display:inline-block;background:#f97316;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Reset Password</a>
                <p style="color:#666;font-size:14px">If you didn't request this, you can safely ignore this email.</p>
                <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
                <p style="color:#999;font-size:12px">— The NandedRozgar Team</p>
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
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.json({ ok: false, error: 'Token and new password are required' });
    if (password.length < 8)  return res.json({ ok: false, error: 'Password must be at least 8 characters' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_expires > NOW()',
      [tokenHash]
    );
    if (!rows[0]) return res.json({ ok: false, error: 'Reset link is invalid or has expired' });

    const user = rows[0];
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

module.exports = router;
