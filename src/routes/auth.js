/**
 * LokalLoop — auth.js (Express routes)
 * Secure routes: Email/Password + Google OAuth + Phone OTP + Forgot/Reset Password
 */
const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// ── Rate limiters ─────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { ok: false, error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true, legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { ok: false, error: 'Too many registrations from this IP. Try again later.' },
  standardHeaders: true, legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { ok: false, error: 'Too many OTP requests. Try again in 10 minutes.' },
  standardHeaders: true, legacyHeaders: false,
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { ok: false, error: 'Too many reset requests. Try again in 1 hour.' },
  standardHeaders: true, legacyHeaders: false,
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function safeUser(u) {
  const { password, otp_hash, otp_expires, reset_token, reset_expires, ...rest } = u;
  return rest;
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

// In-memory OTP store (replace with Redis in production for multi-instance)
const otpStore = new Map(); // phone -> { hash, expires, attempts }

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { name, email, password, phone, company, referralCode } = req.body;

    if (!name?.trim() || !email?.trim() || !password)
      return res.json({ ok: false, error: 'Name, email and password are required' });

    if (password.length < 8)
      return res.json({ ok: false, error: 'Password must be at least 8 characters' });

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.json({ ok: false, error: 'Enter a valid email address' });

    // Password complexity check
    if (!/[0-9]/.test(password) && !/[^A-Za-z0-9]/.test(password))
      return res.json({ ok: false, error: 'Password must contain at least one number or symbol' });

    const hash = await bcrypt.hash(password, 12); // cost factor 12
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role, phone, company)
       VALUES ($1, $2, $3, 'user', $4, $5) RETURNING *`,
      [name.trim(), email.toLowerCase().trim(), hash, phone || null, company || null]
    );
    const user = rows[0];

    // Handle referral
    if (referralCode && referralCode.startsWith('LL')) {
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

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ ok: false, error: 'Email and password required' });

    // Admin via env vars
    const ADMIN_EMAIL    = process.env.ADMIN_EMAIL;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    if (ADMIN_EMAIL && ADMIN_PASSWORD &&
        email.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
        password === ADMIN_PASSWORD) {
      const { rows: existing } = await pool.query('SELECT * FROM users WHERE email = $1', [ADMIN_EMAIL.toLowerCase()]);
      let admin = existing[0];
      if (!admin) {
        const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
        const { rows } = await pool.query(
          `INSERT INTO users (name, email, password, role) VALUES ('Admin', $1, $2, 'admin') RETURNING *`,
          [ADMIN_EMAIL.toLowerCase(), hash]
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
    if (!user) return res.json({ ok: false, error: 'No account found with this email' });
    if (!user.active) return res.json({ ok: false, error: 'This account has been suspended' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ ok: false, error: 'Incorrect password' });

    // Update last seen
    await pool.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [user.id]).catch(() => {});

    return res.json({ ok: true, token: makeToken(user), user: safeUser(user) });
  } catch (err) {
    console.error('login error:', err.message);
    return res.json({ ok: false, error: 'Login failed' });
  }
});

// ── POST /api/auth/google ─────────────────────────────────────────────────────
// Accepts Google accessToken from the Expo OAuth flow, verifies against
// Google's userinfo endpoint, then upserts the user.
router.post('/google', loginLimiter, async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.json({ ok: false, error: 'Access token required' });

    // Verify with Google and get profile
    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!googleRes.ok) return res.json({ ok: false, error: 'Invalid Google token' });

    const profile = await googleRes.json();
    const { sub: googleId, email, name, picture, email_verified } = profile;

    if (!email_verified) return res.json({ ok: false, error: 'Google account email not verified' });
    if (!email)          return res.json({ ok: false, error: 'Could not retrieve email from Google' });

    // Upsert user: find by google_id or email
    let { rows } = await pool.query(
      'SELECT * FROM users WHERE google_id = $1 OR email = $2 LIMIT 1',
      [googleId, email.toLowerCase()]
    );
    let user = rows[0];

    if (user) {
      // Update google_id and avatar if not already set
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
      // New Google user — no password needed
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

// ── POST /api/auth/send-otp ───────────────────────────────────────────────────
// Sends a 6-digit OTP to the given phone number.
// Integrate your SMS provider (Fast2SMS / Twilio) via environment variables.
router.post('/send-otp', otpLimiter, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^[6-9]\d{9}$/.test(phone))
      return res.json({ ok: false, error: 'Enter a valid 10-digit Indian mobile number' });

    const otpCode = generateOTP();
    const otpHash = crypto.createHash('sha256').update(otpCode + process.env.OTP_SECRET).digest('hex');
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    otpStore.set(phone, { hash: otpHash, expires, attempts: 0 });

    // ── SMS dispatch ──────────────────────────────────────────────────────
    // Option A: Fast2SMS (Indian provider, cheapest)
    if (process.env.FAST2SMS_API_KEY) {
      const smsRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route:    'otp',
          variables_values: otpCode,
          numbers:  phone,
          flash:    0,
        }),
      });
      const smsData = await smsRes.json();
      if (!smsData?.return) {
        console.warn('Fast2SMS error:', smsData);
        return res.json({ ok: false, error: 'Failed to send OTP. Check SMS configuration.' });
      }
    }
    // Option B: Twilio (global)
    else if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const { Twilio } = await import('twilio');
      const client = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: `Your LokalLoop OTP is ${otpCode}. Valid for 10 minutes. Do not share with anyone.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to:   `+91${phone}`,
      });
    }
    // Dev mode: log OTP to console when no SMS provider is configured
    else {
      console.log(`\n🔐 LokalLoop OTP for +91${phone}: ${otpCode} (dev mode — configure FAST2SMS_API_KEY or Twilio)\n`);
    }

    return res.json({ ok: true, message: `OTP sent to +91${phone}` });
  } catch (err) {
    console.error('send-otp error:', err.message);
    return res.json({ ok: false, error: 'Failed to send OTP' });
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
router.post('/verify-otp', otpLimiter, async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.json({ ok: false, error: 'Phone and OTP are required' });

    const record = otpStore.get(phone);
    if (!record)              return res.json({ ok: false, error: 'OTP expired or not sent. Request a new one.' });
    if (Date.now() > record.expires) {
      otpStore.delete(phone);
      return res.json({ ok: false, error: 'OTP has expired. Request a new one.' });
    }
    if (record.attempts >= 5) {
      otpStore.delete(phone);
      return res.json({ ok: false, error: 'Too many failed attempts. Request a new OTP.' });
    }

    const expectedHash = crypto.createHash('sha256').update(otp + process.env.OTP_SECRET).digest('hex');
    if (record.hash !== expectedHash) {
      record.attempts++;
      return res.json({ ok: false, error: 'Incorrect OTP' });
    }

    otpStore.delete(phone); // single-use

    // Upsert user by phone
    let { rows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
    let user = rows[0];
    if (!user) {
      const { rows: newRows } = await pool.query(
        `INSERT INTO users (name, phone, role, active) VALUES ($1, $2, 'user', true) RETURNING *`,
        [`User${phone.slice(-4)}`, phone]
      );
      user = newRows[0];
    }

    if (!user.active) return res.json({ ok: false, error: 'This account has been suspended' });

    await pool.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [user.id]).catch(() => {});
    return res.json({ ok: true, token: makeToken(user), user: safeUser(user) });
  } catch (err) {
    console.error('verify-otp error:', err.message);
    return res.json({ ok: false, error: 'OTP verification failed' });
  }
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post('/forgot-password', forgotLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.json({ ok: false, error: 'Email is required' });

    // Always return success to prevent email enumeration
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (!rows[0]) return res.json({ ok: true, message: 'If that email exists, a reset link was sent.' });

    const user       = rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetHash  = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expires    = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3',
      [resetHash, expires, user.id]
    );

    const resetUrl = `${process.env.APP_URL || 'https://lokalloop.app'}/reset-password?token=${resetToken}`;

    // Send email via your provider (Nodemailer / Resend / SendGrid)
    if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from:    'LokalLoop <noreply@lokalloop.app>',
          to:      [user.email],
          subject: 'Reset your LokalLoop password',
          html: `
            <h2>Reset your password</h2>
            <p>Hi ${user.name},</p>
            <p>Click the link below to reset your password. This link expires in 1 hour.</p>
            <a href="${resetUrl}" style="background:#f97316;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0">Reset Password</a>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <p>– The LokalLoop Team</p>
          `,
        }),
      });
    } else {
      // Log in dev
      console.log(`\n🔑 Password reset link for ${email}:\n${resetUrl}\n`);
    }

    return res.json({ ok: true, message: 'If that email exists, a reset link was sent.' });
  } catch (err) {
    console.error('forgot-password error:', err.message);
    return res.json({ ok: false, error: 'Failed to process reset request' });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────
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

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', auth, (req, res) => {
  res.json({ ok: true, user: safeUser(req.user) });
});

// ── POST /api/auth/change-password ───────────────────────────────────────────
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.json({ ok: false, error: 'Both passwords required' });
    if (newPassword.length < 8) return res.json({ ok: false, error: 'New password must be at least 8 characters' });

    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];

    // Google-only accounts may have no password
    if (!user.password) return res.json({ ok: false, error: 'Set a password first via forgot-password flow' });

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

module.exports = router;
