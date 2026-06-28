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
const { getFirebaseAdmin } = require('../utils/firebaseAdmin');

// ── Activity logger ───────────────────────────────────────────────────────────
async function log(action, { userId = null, status = 'success', ip = null, userAgent = null, detail = null } = {}) {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, status, ip, user_agent, detail) VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId || null, action, status, ip, userAgent, detail]
    );
  } catch (e) { console.warn('[activity_log] Insert failed:', e.message); }
}
function getIP(req) { return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null; }
function getUA(req) { return req.headers['user-agent'] || null; }

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
// ── BUG FIX: JWT revocation via token_version ──────────────────────────────
// Standard JWTs are stateless — once issued they remain valid until expiry.
// A banned user or a user whose account is compromised keeps access for up to
// 30 days. To fix this without a full token blacklist (expensive DB lookup on
// every request), we store a monotonic `token_version` integer in the users
// table and embed it in the JWT. The auth middleware compares the value in the
// JWT against the current DB value; a mismatch means the token was revoked.
//
// Revocation is O(1): just increment `token_version` for that user row.
// Call this from any admin/ban route or from the logout route.
//
// DB migration required (run once):
//   ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
//
function makeToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, tv: user.token_version ?? 0 },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function safeUser(u) {
  const { password, reset_token, reset_expires, push_token, ...rest } = u;
  return rest;
}

// ── POST /api/auth/register ────────────────────────────────────────────────────
// FIX (Bug #8): All error responses now return the semantically correct HTTP
// status code alongside the JSON body.  Previously every error returned 200,
// which breaks monitoring tools, CDNs, and any client that branches on status.
//   400 Bad Request   — missing/invalid input supplied by the caller
//   409 Conflict      — duplicate resource (email already registered)
//   500 Internal      — unexpected server-side failure
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { name, email, password, phone, company, referralCode, district } = req.body;

    if (!name?.trim() || !email?.trim() || !password)
      return res.status(400).json({ ok: false, error: 'Name, email and password are required' });
    if (password.length < 8)
      return res.status(400).json({ ok: false, error: 'Password must be at least 8 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ ok: false, error: 'Enter a valid email address' });
    if (!/[0-9]/.test(password) && !/[^A-Za-z0-9]/.test(password))
      return res.status(400).json({ ok: false, error: 'Password must contain at least one number or symbol' });
    // Phone is optional, but if provided it must be a valid 10-digit Indian mobile number.
    // Storing garbage breaks SMS/WhatsApp features and pollutes the DB.
    if (phone !== undefined && phone !== null && phone !== '') {
      const cleaned = String(phone).replace(/\s+/g, '');
      if (!/^[6-9]\d{9}$/.test(cleaned))
        return res.status(400).json({ ok: false, error: 'Enter a valid 10-digit Indian mobile number' });
    }

    const validDistricts = (process.env.VALID_DISTRICTS || 'nanded').split(',').map(d => d.trim());
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

    await log('register', { userId: user.id, ip: getIP(req), userAgent: getUA(req), detail: user.email });
    return res.status(201).json({ ok: true, token: makeToken(user), user: safeUser(user) });
  } catch (err) {
    if (err.code === '23505') {
      await log('register_failed', { status: 'failed', ip: getIP(req), userAgent: getUA(req), detail: `Duplicate email: ${req.body.email}` });
      return res.status(409).json({ ok: false, error: 'Email already registered' });
    }
    console.error('register error:', err.message);
    return res.status(500).json({ ok: false, error: 'Registration failed' });
  }
});

// ── POST /api/auth/login ───────────────────────────────────────────────────────
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ ok: false, error: 'Email and password required' });

    const ADMIN_EMAIL    = process.env.ADMIN_EMAIL;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    // ── Admin login check ────────────────────────────────────────────────────
    // Supports BOTH plain-text and bcrypt-hashed ADMIN_PASSWORD.
    // Plain text: set ADMIN_PASSWORD=mypassword on Railway — works directly.
    // Bcrypt hash: set ADMIN_PASSWORD=$2b$12$... — also works.
    // If ADMIN_EMAIL/ADMIN_PASSWORD are not set, this block is skipped.
    if (ADMIN_EMAIL && ADMIN_PASSWORD && email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      let adminPasswordMatch = false;
      if (ADMIN_PASSWORD.startsWith('$2')) {
        adminPasswordMatch = await bcrypt.compare(password, ADMIN_PASSWORD);
      } else {
        adminPasswordMatch = (password === ADMIN_PASSWORD);
      }

      if (!adminPasswordMatch) {
        await log('login_failed', { status: 'failed', ip: getIP(req), userAgent: getUA(req), detail: `Wrong admin password for ${ADMIN_EMAIL}` });
        return res.status(401).json({ ok: false, error: 'Incorrect admin password' });
      }

      // Upsert the admin user row in the DB
      const { rows: existing } = await pool.query('SELECT * FROM users WHERE email = $1', [ADMIN_EMAIL.toLowerCase()]);
      let admin = existing[0];
      if (!admin) {
        const hash = ADMIN_PASSWORD.startsWith('$2') ? ADMIN_PASSWORD : await bcrypt.hash(ADMIN_PASSWORD, 12);
        const { rows } = await pool.query(
          `INSERT INTO users (name, email, password, role) VALUES ('Admin', $1, $2, 'admin') RETURNING *`,
          [ADMIN_EMAIL.toLowerCase(), hash]
        );
        admin = rows[0];
      } else if (admin.role !== 'admin') {
        await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', admin.id]);
        admin.role = 'admin';
      }
      await log('login', { userId: admin.id, ip: getIP(req), userAgent: getUA(req), detail: `Admin login: ${ADMIN_EMAIL}` });
      return res.json({ ok: true, token: makeToken(admin), user: safeUser(admin) });
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    const user = rows[0];

    // ── BUG FIX: User enumeration — always return the same error for both
    // "no account found" and "wrong password" so an attacker cannot probe which
    // email addresses are registered by comparing error messages.
    // The specific reason is still written to the activity log for support use.
    const INVALID_CREDENTIALS_MSG = 'Incorrect email or password';

    if (!user) {
      await log('login_failed', { status: 'failed', ip: getIP(req), userAgent: getUA(req), detail: `Unknown email: ${email}` });
      return res.status(401).json({ ok: false, error: INVALID_CREDENTIALS_MSG });
    }
    if (!user.active) {
      await log('login_blocked', { userId: user.id, status: 'blocked', ip: getIP(req), userAgent: getUA(req), detail: `Banned user tried to login: ${email}` });
      return res.status(403).json({ ok: false, error: 'This account has been suspended' });
    }
    if (!user.password) return res.status(401).json({ ok: false, error: 'This account uses Google sign-in. Use that option instead.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      await log('login_failed', { userId: user.id, status: 'failed', ip: getIP(req), userAgent: getUA(req), detail: `Wrong password for ${email}` });
      return res.status(401).json({ ok: false, error: INVALID_CREDENTIALS_MSG });
    }

    await pool.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [user.id]).catch(() => {});
    await log('login', { userId: user.id, ip: getIP(req), userAgent: getUA(req), detail: user.email });
    return res.json({ ok: true, token: makeToken(user), user: safeUser(user) });
  } catch (err) {
    console.error('login error:', err.message);
    return res.status(500).json({ ok: false, error: 'Login failed' });
  }
});

// ── POST /api/auth/google ──────────────────────────────────────────────────────
// Accepts either:
//   { idToken }     — from native @react-native-google-signin (preferred, verified locally via JWKS)
//   { accessToken } — from web GSI / legacy flow (verified via userinfo)
router.post('/google', loginLimiter, async (req, res) => {
  try {
    const { idToken, accessToken } = req.body;
    if (!idToken && !accessToken) return res.status(400).json({ ok: false, error: 'Google token required' });

    let googleId, email, name, picture, email_verified;

    if (idToken) {
      // Verify idToken using Google's tokeninfo endpoint.
      // This is the most reliable approach for native Android apps — it works
      // regardless of which OAuth client ID (web or android) signed the token,
      // and requires zero env var configuration on the backend server.
      // Reference: https://developers.google.com/identity/openid-connect/openid-connect#validatinganidtoken
      let tokenData;
      try {
        const tokenInfoRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
        );
        if (!tokenInfoRes.ok) {
          const errBody = await tokenInfoRes.text();
          console.error('Google tokeninfo error:', tokenInfoRes.status, errBody);
          throw new Error('Google could not verify the token');
        }
        const payload = await tokenInfoRes.json();

        // tokeninfo returns { error_description } when the token is invalid
        if (payload.error || payload.error_description) {
          throw new Error(payload.error_description || payload.error || 'Invalid token');
        }

        // FIX (Bug #3): Replace the prefix check with an exact-match allowlist.
        //
        // The old code used String(payload.aud).startsWith(OUR_PROJECT_NUMBER),
        // which would also accept tokens from any Google project whose numeric
        // project ID happens to share the same leading digits — a weak guard.
        //
        // The correct check is an exact match against every OAuth client ID
        // that is legitimately allowed to call this backend.  List both the
        // web client ID and the Android client ID here.  Any token whose `aud`
        // (or `azp`) is not in this set is rejected immediately.
        // NOTE: EXPO_PUBLIC_* vars are frontend-only and will be undefined on
        // the Railway backend server. We include hardcoded fallbacks so the
        // allowlist is never empty. Add GOOGLE_WEB_CLIENT_ID and
        // GOOGLE_ANDROID_CLIENT_ID to Railway env vars to override without redeploy.
        const ALLOWED_CLIENT_IDS = new Set([
          process.env.GOOGLE_WEB_CLIENT_ID,
          process.env.GOOGLE_ANDROID_CLIENT_ID,
          process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
          process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
          // Hardcoded fallbacks — always present even if env vars are missing
          '1012993473745-iiur989ghkd2pjsu9uuoc6ckqupkevoc.apps.googleusercontent.com', // web client
          '1012993473745-ipt582ud6vrvjuht9ah0suu7fjah0erg.apps.googleusercontent.com', // android client
        ].filter(Boolean));

        const tokenAud = String(payload.aud || '');
        const tokenAzp = String(payload.azp || '');
        if (!ALLOWED_CLIENT_IDS.has(tokenAud) && !ALLOWED_CLIENT_IDS.has(tokenAzp)) {
          console.error(`[Google auth] token audience not in allowlist — aud: ${tokenAud}, azp: ${tokenAzp}`);
          throw new Error('Token does not belong to this app');
        }

        // Validate issuer
        if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
          throw new Error('ID token issuer mismatch');
        }

        // Validate expiry (tokeninfo also checks this, but belt-and-suspenders)
        const now = Math.floor(Date.now() / 1000);
        if (parseInt(payload.exp, 10) < now) throw new Error('ID token has expired');

        tokenData = payload;
      } catch (e) {
        console.error('Google ID token verification failed:', e.message);
        return res.status(401).json({ ok: false, error: 'Invalid Google ID token' });
      }

      googleId       = tokenData.sub;
      email          = tokenData.email;
      name           = tokenData.name;
      picture        = tokenData.picture;
      email_verified = tokenData.email_verified === 'true' || tokenData.email_verified === true;
    } else {
      // Verify accessToken via userinfo endpoint — for web GSI flow
      const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!googleRes.ok) return res.status(401).json({ ok: false, error: 'Invalid Google access token' });
      ({ sub: googleId, email, name, picture, email_verified } = await googleRes.json());
    }

    if (!email_verified) return res.status(401).json({ ok: false, error: 'Google account email not verified' });
    if (!email)          return res.status(401).json({ ok: false, error: 'Could not retrieve email from Google' });

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

    if (!user.active) return res.status(403).json({ ok: false, error: 'This account has been suspended' });
    await log('login', { userId: user.id, ip: getIP(req), userAgent: getUA(req), detail: `Google: ${email}` });
    return res.json({ ok: true, token: makeToken(user), user: safeUser(user) });
  } catch (err) {
    console.error('google auth error:', err.message);
    return res.status(500).json({ ok: false, error: 'Google sign-in failed' });
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

  // FIX v3: Detect whether this is a web browser request or a native app request.
  // Native APK deep-link: User-Agent contains "okhttp" or the request comes from
  // an Android WebView. Web browser: normal browser User-Agent.
  // Strategy:
  //   • Web browser  → 302 redirect to /login?google_token=TOKEN (same origin)
  //   • Native APK   → intent:// deep link HTML page (unchanged)
  // This avoids the Firebase signInWithRedirect cross-origin iframe issue entirely.

  const ua = req.headers['user-agent'] || '';
  const isNative = /okhttp|Expo|com\.cityplus/i.test(ua);

  const rawAppUrl = process.env.APP_URL || 'https://thecityplus.in';
  let appUrl;
  try {
    const parsed = new URL(rawAppUrl);
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('bad protocol');
    appUrl = parsed.origin;
  } catch {
    console.error('google/callback: APP_URL is not a valid URL:', rawAppUrl);
    return res.status(500).send('Server configuration error.');
  }

  if (error || !access_token) {
    const rawMsg = String(error_description || error || 'Google sign-in failed')
      .replace(/[^\x20-\x7E]/g, '')
      .slice(0, 200);
    const encodedMsg = encodeURIComponent(rawMsg);

    if (isNative) {
      const errorIntentUrl = JSON.stringify(
        `intent://google-auth?error=${encodedMsg}` +
        `#Intent;scheme=cityplus;package=com.cityplus.app;end`
      );
      res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'");
      return res.send(
        `<!DOCTYPE html><html><head><title>Redirecting\u2026</title></head><body>` +
        `<script>window.location=${errorIntentUrl};</script>` +
        `<p>Redirecting back to app\u2026</p>` +
        `</body></html>`
      );
    }
    // Web: redirect to login page with error param
    return res.redirect(302, `${appUrl}/login?google_error=${encodedMsg}`);
  }

  if (!/^[^\s"'<>]+$/.test(access_token) || access_token.length > 2048) {
    return res.status(400).send('Invalid token format.');
  }

  const encodedToken = encodeURIComponent(access_token);

  if (isNative) {
    // Android Intent URL for native APK
    const intentUrl =
      `intent://google-auth?access_token=${encodedToken}` +
      `#Intent;scheme=cityplus;package=com.cityplus.app;end`;
    const intentStr = JSON.stringify(intentUrl);
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'");
    return res.send(
      `<!DOCTYPE html><html><head><title>Signing in\u2026</title></head><body>` +
      `<script>window.location=${intentStr};</script>` +
      `<p style="font-family:sans-serif;text-align:center;margin-top:40px">` +
      `Signing you in\u2026 please wait.</p>` +
      `</body></html>`
    );
  }

  // Web browser: simple 302 redirect to login page with token in query param.
  // LoginScreen reads ?google_token= on mount and calls loginWithGoogle().
  return res.redirect(302, `${appUrl}/login?google_token=${encodedToken}`);
});

// ── POST /api/auth/verify-firebase-otp ────────────────────────────────────────
router.post('/verify-firebase-otp', otpLimiter, async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ ok: false, error: 'Firebase ID token required' });

    const admin = getFirebaseAdmin();
    if (!admin) return res.status(503).json({ ok: false, error: 'Firebase not configured on server. Set FIREBASE_SERVICE_ACCOUNT.' });

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (e) {
      console.warn('Firebase token verification failed:', e.message);
      return res.status(401).json({ ok: false, error: 'OTP verification failed. Please try again.' });
    }

    const phone = decoded.phone_number;
    if (!phone) return res.status(401).json({ ok: false, error: 'No phone number in token' });

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

    if (!user.active) return res.status(403).json({ ok: false, error: 'This account has been suspended' });
    await pool.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [user.id]).catch(() => {});
    await log('login', { userId: user.id, ip: getIP(req), userAgent: getUA(req), detail: `OTP: ${phoneLocal}` });
    return res.json({ ok: true, token: makeToken(user), user: safeUser(user) });
  } catch (err) {
    console.error('verify-firebase-otp error:', err.message);
    return res.status(500).json({ ok: false, error: 'OTP verification failed' });
  }
});

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
router.post('/forgot-password', forgotLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ ok: false, error: 'Email is required' });

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
      console.log(`[auth] Reset email not sent (RESEND_API_KEY not set). Email: ${email}`);
    }

    return res.json({ ok: true, message: 'If that email exists, a reset link was sent.' });
  } catch (err) {
    console.error('forgot-password error:', err.message);
    return res.status(500).json({ ok: false, error: 'Failed to process reset request' });
  }
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
router.post('/reset-password', resetLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ ok: false, error: 'Token and new password are required' });
    if (password.length < 8)  return res.status(400).json({ ok: false, error: 'Password must be at least 8 characters' });

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
    if (!user) return res.status(400).json({ ok: false, error: 'Reset link is invalid or has expired' });

    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
      [hash, user.id]
    );
    return res.json({ ok: true, message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    console.error('reset-password error:', err.message);
    return res.status(500).json({ ok: false, error: 'Password reset failed' });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  log('app_open', { userId: req.user.id, ip: getIP(req), userAgent: getUA(req), detail: 'Session resumed' }).catch(() => {});
  res.json({ ok: true, user: safeUser(req.user) });
});

// ── POST /api/auth/change-password ────────────────────────────────────────────
router.post('/change-password', changePasswordLimiter, auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ ok: false, error: 'Both passwords required' });
    if (newPassword.length < 8)           return res.status(400).json({ ok: false, error: 'New password must be at least 8 characters' });

    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];
    if (!user.password) return res.status(400).json({ ok: false, error: 'No password set — use forgot-password to create one' });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(401).json({ ok: false, error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 12);
    // FIX (Medium): Increment token_version so all existing JWTs (including any
    // captured by an attacker) are immediately invalidated after a password change.
    await pool.query(
      'UPDATE users SET password = $1, token_version = COALESCE(token_version, 0) + 1 WHERE id = $2',
      [hash, user.id]
    );
    return res.json({ ok: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('change-password error:', err.message);
    return res.status(500).json({ ok: false, error: 'Failed to change password' });
  }
});

// ── POST /api/auth/logout ──────────────────────────────────────────────────────
// Increments token_version so the current token (and any other active tokens
// for this user) are immediately rejected by the auth middleware.
// No auth middleware — we decode the JWT ourselves so logout is logged even if
// the token is expired or the cache has already been cleared on the client.
router.post('/logout', async (req, res) => {
  try {
    const header = req.headers.authorization;
    let userId = null;
    if (header?.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
        userId = payload.id;
      } catch {
        // expired or invalid token — still log with null userId
      }
    }
    if (userId) {
      // ── BUG FIX: Revoke all tokens for this user by bumping token_version.
      // The auth middleware checks the `tv` claim in the JWT against this column;
      // any token issued before this increment is immediately invalid.
      await pool.query(
        'UPDATE users SET last_seen = NOW(), token_version = COALESCE(token_version, 0) + 1 WHERE id = $1',
        [userId]
      ).catch(() => {});
    }
    await log('logout', { userId, ip: getIP(req), userAgent: getUA(req) });
    return res.json({ ok: true });
  } catch {
    return res.json({ ok: true });
  }
});

// ── POST /api/auth/save-push-token ────────────────────────────────────────────
// NOTE: the app (src/utils/notifications.js) registers devices using
// Notifications.getDevicePushTokenAsync(), which returns a raw FCM/APNs
// device token — NOT an "ExponentPushToken[...]" token. The old check here
// required the Expo format and silently rejected every real token sent by
// the app, so push_token was never being saved at all. Accept raw FCM/APNs
// tokens (long opaque strings) instead.
router.post('/save-push-token', auth, async (req, res) => {
  try {
    const { pushToken } = req.body;
    const isValid =
      typeof pushToken === 'string' &&
      pushToken.trim().length >= 20 &&
      pushToken.trim().length <= 4096 &&
      !/\s/.test(pushToken.trim());
    if (!isValid) {
      return res.status(400).json({ ok: false, error: 'Invalid push token format' });
    }
    await pool.query(
      'UPDATE users SET push_token = $1 WHERE id = $2',
      [pushToken.trim(), req.user.id]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('save-push-token error:', err.message);
    return res.status(500).json({ ok: false, error: 'Failed to save push token' });
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
    return res.status(500).json({ ok: false, error: 'Failed to delete account. Please contact support.' });
  } finally {
    client.release();
  }
});

module.exports = router;
