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
const changePasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10,
  message: { ok: false, error: 'Too many password change attempts. Try again in 1 hour.' },
  standardHeaders: true, legacyHeaders: false,
});

// ── Helpers ────────────────────────────────────────────────────────────────────
function makeToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function safeUser(u) {
  const { password, reset_token, reset_expires, push_token, ...rest } = u;
  return rest;
}

// ── POST /api/auth/register ────────────────────────────────────────────────────
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { name, email, password, phone, company, referralCode, district } = req.body;

    if (!name?.trim() || !email?.trim() || !password)
      return res.json({ ok: false, error: 'Name, email and password are required' });
    if (password.length < 8)
      return res.json({ ok: false, error: 'Password must be at least 8 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.json({ ok: false, error: 'Enter a valid email address' });
    if (!/[0-9]/.test(password) && !/[^A-Za-z0-9]/.test(password))
      return res.json({ ok: false, error: 'Password must contain at least one number or symbol' });
    // Phone is optional, but if provided it must be a valid 10-digit Indian mobile number.
    // Storing garbage breaks SMS/WhatsApp features and pollutes the DB.
    if (phone !== undefined && phone !== null && phone !== '') {
      const cleaned = String(phone).replace(/\s+/g, '');
      if (!/^[6-9]\d{9}$/.test(cleaned))
        return res.json({ ok: false, error: 'Enter a valid 10-digit Indian mobile number' });
    }

    const validDistricts = ['nanded', 'latur'];
    const userDistrict = validDistricts.includes(district) ? district : 'nanded';
    // Use the cleaned (whitespace-stripped) phone so DB comparisons are reliable
    const cleanedPhone = (phone !== undefined && phone !== null && phone !== '')
      ? String(phone).replace(/\s+/g, '')
      : null;

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role, phone, company, district)
       VALUES ($1, $2, $3, 'user', $4, $5, $6) RETURNING *`,
      [name.trim(), email.toLowerCase().trim(), hash, cleanedPhone, company || null, userDistrict]
    );
    const user = rows[0];

    if (referralCode?.startsWith('NR')) {
      const refId = parseInt(referralCode.slice(2), 10);
      if (!isNaN(refId) && refId !== user.id) {
        // Self-referral abuse check: verify the referrer does not share the
        // same phone or email as the new account. This blocks the most common
        // multi-account farming pattern (different email, same phone number).
        const { rows: referrerRows } = await pool.query(
          'SELECT phone, email FROM users WHERE id = $1',
          [refId]
        ).catch(() => ({ rows: [] }));

        const referrer = referrerRows[0];
        const samePhone = referrer?.phone && user.phone && referrer.phone === user.phone;
        const sameEmail = referrer?.email && user.email &&
          referrer.email.toLowerCase() === user.email.toLowerCase();

        if (referrer && !samePhone && !sameEmail) {
          await pool.query(
            `UPDATE users SET referral_credits = COALESCE(referral_credits, 0) + 1 WHERE id = $1`,
            [refId]
          ).catch(() => {});
        }
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

    // Reject server startup misconfiguration early: ADMIN_PASSWORD must be a
    // bcrypt hash (starts with $2). Plain-text passwords are never accepted —
    // a warning-and-fallback is not safe enough for an admin credential.
    if (ADMIN_EMAIL && ADMIN_PASSWORD && !ADMIN_PASSWORD.startsWith('$2')) {
      console.error(
        'FATAL CONFIG: ADMIN_PASSWORD must be a bcrypt hash (starting with $2). ' +
        `Generate one with: node -e "console.log(require('bcryptjs').hashSync('yourpassword', 12))" ` +
        'and set it as the ADMIN_PASSWORD environment variable.'
      );
      // Fail closed: do not allow login until the config is fixed.
      return res.json({ ok: false, error: 'Server configuration error. Contact the administrator.' });
    }

    const adminPasswordMatch = ADMIN_EMAIL && ADMIN_PASSWORD &&
      email.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
      await bcrypt.compare(password, ADMIN_PASSWORD);

    if (adminPasswordMatch) {
      const { rows: existing } = await pool.query('SELECT * FROM users WHERE email = $1', [ADMIN_EMAIL.toLowerCase()]);
      let admin = existing[0];
      if (!admin) {
        const { rows } = await pool.query(
          `INSERT INTO users (name, email, password, role) VALUES ('Admin', $1, $2, 'admin') RETURNING *`,
          [ADMIN_EMAIL.toLowerCase(), ADMIN_PASSWORD]
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
// Accepts either:
//   { idToken }     — from native @react-native-google-signin (preferred, verified locally via JWKS)
//   { accessToken } — from web GSI / legacy flow (verified via userinfo)
router.post('/google', loginLimiter, async (req, res) => {
  try {
    const { idToken, accessToken } = req.body;
    if (!idToken && !accessToken) return res.json({ ok: false, error: 'Google token required' });

    let googleId, email, name, picture, email_verified;

    if (idToken) {
      // Verify idToken locally using Google's public keys (JWKS).
      // This is Google's recommended approach — avoids a network round-trip to
      // tokeninfo and is not vulnerable to tokeninfo endpoint outages or deprecation.
      // Reference: https://developers.google.com/identity/openid-connect/openid-connect#validatinganidtoken
      let tokenData;
      try {
        // Fetch Google's public JWKS to verify the JWT signature
        const jwksRes  = await fetch('https://www.googleapis.com/oauth2/v3/certs');
        if (!jwksRes.ok) throw new Error('Failed to fetch Google public keys');
        const { keys } = await jwksRes.json();

        // Decode the JWT header to find which key was used
        const [headerB64, payloadB64, sigB64] = idToken.split('.');
        if (!headerB64 || !payloadB64 || !sigB64) throw new Error('Malformed JWT');

        const header  = JSON.parse(Buffer.from(headerB64,  'base64url').toString());
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

        // Find the matching public key by key ID
        const jwk = keys.find(k => k.kid === header.kid && k.alg === 'RS256');
        if (!jwk) throw new Error('No matching Google public key found');

        // Import the JWK and verify the signature using Node's built-in crypto
        const { createVerify } = require('crypto');
        const pubKey = require('crypto').createPublicKey({ key: jwk, format: 'jwk' });
        const verify = createVerify('SHA256');
        verify.update(`${headerB64}.${payloadB64}`);
        const valid = verify.verify(pubKey, sigB64, 'base64url');
        if (!valid) throw new Error('JWT signature verification failed');

        // Validate standard claims
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now)  throw new Error('ID token has expired');
        if (payload.iat > now + 60) throw new Error('ID token issued in the future');

        // Accept tokens whose audience is any of our registered OAuth clients.
        // Backend env var is GOOGLE_ANDROID_CLIENT_ID (no EXPO_PUBLIC_ prefix).
        // Frontend env var is EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID — also checked
        // here so it works even if the Railway env uses the EXPO_PUBLIC_ name.
        const validAudiences = [
          process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
          process.env.GOOGLE_WEB_CLIENT_ID,
          process.env.GOOGLE_ANDROID_CLIENT_ID,
          process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        ].filter(Boolean);
        if (validAudiences.length > 0 && !validAudiences.includes(payload.aud)) {
          // Log the mismatch so it can be diagnosed in Railway logs
          console.error(
            `[Google auth] aud mismatch — token aud: ${payload.aud} | ` +
            `accepted: ${validAudiences.join(', ')}`
          );
          throw new Error('ID token audience mismatch');
        }
        if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
          throw new Error('ID token issuer mismatch');
        }

        tokenData = payload;
      } catch (e) {
        console.error('Google ID token verification failed:', e.message);
        return res.json({ ok: false, error: 'Invalid Google ID token' });
      }

      googleId       = tokenData.sub;
      email          = tokenData.email;
      name           = tokenData.name;
      picture        = tokenData.picture;
      email_verified = tokenData.email_verified === true;
    } else {
      // Verify accessToken via userinfo endpoint — for web GSI flow
      const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!googleRes.ok) return res.json({ ok: false, error: 'Invalid Google access token' });
      ({ sub: googleId, email, name, picture, email_verified } = await googleRes.json());
    }

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
  const apiBase     = process.env.EXPO_PUBLIC_API_URL || 'https://thecityplus.in';
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

  // FIX #5: The original code interpolated process.env.APP_URL and user-supplied
  // query params directly into an inline <script> block, enabling XSS if APP_URL
  // was compromised or either param contained quote/semicolon characters.
  //
  // Fix strategy:
  //   • All server-controlled values (APP_URL, nativeUrl) are used only in
  //     server-side redirect headers (302) or as pre-built full URLs that are
  //     JSON-encoded before being placed in the HTML. JSON.stringify produces a
  //     quoted, escaped string literal that cannot break out of JS context.
  //   • User-supplied values (access_token, error, error_description) are first
  //     validated/sanitised and then also JSON.stringify-encoded before use.
  //   • The Content-Security-Policy header prevents execution of any injected
  //     scripts that somehow made it through.

  // Validate APP_URL at call-time so a misconfigured value fails loudly rather
  // than silently producing an exploitable redirect.
  const rawAppUrl = process.env.APP_URL || 'https://thecityplus.in';
  let appUrl;
  try {
    const parsed = new URL(rawAppUrl);
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('bad protocol');
    appUrl = parsed.origin; // strip any trailing path to get a clean base
  } catch {
    console.error('google/callback: APP_URL is not a valid URL:', rawAppUrl);
    return res.status(500).send('Server configuration error.');
  }

  // nativeUrl is a hardcoded constant — it never comes from user input or env.
  const NATIVE_SCHEME = 'cityplus://google-auth'; // Bug fix #19: was 'nanded://' — matches scheme in app.config.js

  if (error || !access_token) {
    // Sanitise: only keep printable ASCII, cap length, re-encode for URL use.
    const rawMsg = String(error_description || error || 'Google sign-in failed')
      .replace(/[^\x20-\x7E]/g, '')
      .slice(0, 200);
    const encodedMsg = encodeURIComponent(rawMsg);

    // JSON-encode the full URL strings so they are safe JS string literals.
    const nativeHref = JSON.stringify(`${NATIVE_SCHEME}?error=${encodedMsg}`);
    const webHref    = JSON.stringify(`${appUrl}/?error=${encodedMsg}`);

    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'");
    return res.send(
      `<!DOCTYPE html><html><head><title>Redirecting\u2026</title></head><body>` +
      `<script>` +
      `var n=${nativeHref},w=${webHref};` +
      `window.location=n;setTimeout(function(){window.location=w;},1000);` +
      `</script>` +
      `<p>Redirecting back to app\u2026</p>` +
      `</body></html>`
    );
  }

  // Validate access_token: Google OAuth access tokens are opaque strings that
  // can be base64-encoded (containing +, /, =) or base64url-encoded (containing
  // - and _). Allow all safe printable characters; only reject quotes, angle
  // brackets, and whitespace which could enable XSS injection.
  if (!/^[^\s"'<>]+$/.test(access_token) || access_token.length > 2048) {
    return res.status(400).send('Invalid token format.');
  }

  const encodedToken = encodeURIComponent(access_token);
  const nativeHref   = JSON.stringify(`${NATIVE_SCHEME}?access_token=${encodedToken}`);
  const webHref      = JSON.stringify(`${appUrl}/?access_token=${encodedToken}`);

  res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'");
  return res.send(
    `<!DOCTYPE html><html><head><title>Signing in\u2026</title></head><body>` +
    `<script>` +
    `var n=${nativeHref},w=${webHref};` +
    `window.location=n;` +
    `setTimeout(function(){window.location=w;},1000);` +
    `</script>` +
    `<p style="font-family:sans-serif;text-align:center;margin-top:40px">` +
    `Signing you in\u2026 please wait.</p>` +
    `</body></html>`
  );
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

    const appUrl   = process.env.APP_URL || 'https://thecityplus.in';
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

    // Escape HTML special characters to prevent XSS — a user who registered
    // with a name like <script>alert(1)</script> would otherwise inject into
    // the email HTML. Email clients vary; some render scripts.
    const escapeHtml = (str) => String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
    const safeName = escapeHtml(user.name || 'there');

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
                <p>Hi ${safeName},</p>
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
    // Query by the hash directly — lets the DB use an index and avoids loading
    // every pending reset token into memory for in-process comparison.
    // timingSafeEqual is not needed here: the token is already hashed before
    // storage, so the DB comparison on the hex digest is safe.
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_expires > NOW()',
      [tokenHash]
    );
    const user = rows[0];
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
router.post('/change-password', changePasswordLimiter, auth, async (req, res) => {
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
