'use strict';
require('dotenv').config();

// ── isProduction — declared early, used throughout ────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';

// ── PERF: Node.js cluster — one worker per CPU core ───────────────────────────
const cluster = require('cluster');
const os      = require('os');

const WORKERS = parseInt(process.env.CLUSTER_WORKERS || os.cpus().length, 10);
const DISABLE_CLUSTER = process.env.DISABLE_CLUSTER === 'true' || !isProduction;

if (cluster.isPrimary && !DISABLE_CLUSTER) {
  console.log(`🔀 Cluster primary PID ${process.pid} — forking ${WORKERS} workers`);

  // FIX: Run migrations ONCE in the primary before spawning workers.
  // Previously all 48 workers ran migrations simultaneously causing
  // "constraint already exists" errors and worker crash loops.
  const { runMigrations: runMigrationsOnce } = require('./db');
  runMigrationsOnce()
    .then(() => {
      console.log('✅ Primary: migrations complete — starting workers');
      for (let i = 0; i < WORKERS; i++) cluster.fork();
    })
    .catch(err => {
      console.error('❌ Primary: migration failed, aborting:', err.message);
      process.exit(1);
    });

  cluster.on('exit', (worker, code, signal) => {
    console.warn(`⚠️  Worker ${worker.process.pid} died (code=${code}, signal=${signal}) — restarting`);
    cluster.fork();
  });

  _startPrimaryCrons();
  return;
}

// ── Worker (or single process in dev) ─────────────────────────────────────────
const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const fs        = require('fs');
const rateLimit = require('express-rate-limit');
const { runMigrations, pool, cache } = require('./db');

// Security headers
let helmet;
try { helmet = require('helmet'); } catch { helmet = null; }
if (!helmet) console.warn('[startup] helmet not installed — run: npm i helmet');

// Gzip compression
let compression;
try { compression = require('compression'); } catch { compression = null; }

const app = express();
app.set('trust proxy', 1);

if (helmet) {
  const appUrl = process.env.APP_URL || 'https://thecityplus.in';
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:      ["'self'"],
        // FIX: Added 'unsafe-hashes' so onclick= / onerror= inline event handlers
        // in admin-login.html are permitted. Also added Cloudflare Insights CDN
        // (static.cloudflareinsights.com) which the admin panel loads.
        scriptSrc:       ["'self'", "'unsafe-inline'", "'unsafe-hashes'",
                          'https://static.cloudflareinsights.com',
                          'https://apis.google.com',               // Google Sign-In SDK
                          'https://accounts.google.com'],          // Google OAuth
        // FIX: Helmet 8 sets script-src-attr to 'none' by default, which overrides
        // scriptSrc for inline event handlers (onclick=, onerror=, onsubmit= etc.).
        // 'unsafe-hashes' alone in scriptSrc is not enough — must be repeated here.
        // Without this, admin-login.html nav() onclick handlers are silently blocked.
        scriptSrcAttr:   ["'unsafe-inline'", "'unsafe-hashes'"],
        styleSrc:        ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com',
                          'https://accounts.google.com'],          // Google Sign-In styles
        fontSrc:         ["'self'", 'https://fonts.gstatic.com'],
        imgSrc:          ["'self'", 'data:', 'https:'],
        // FIX: Added Firebase + Google OAuth domains to connectSrc.
        // Previously missing, causing CSP violations that blocked:
        //   - securetoken.googleapis.com       → Firebase ID token refresh
        //   - identitytoolkit.googleapis.com   → Firebase sign-in / verify / password reset
        //   - firebaseinstallations.googleapis.com → Firebase SDK heartbeat on app init
        //   - accounts.google.com              → Google Sign-In token exchange
        connectSrc:      [
          "'self'",
          appUrl,
          'https://cloudflareinsights.com',
          'https://securetoken.googleapis.com',            // Firebase token refresh
          'https://identitytoolkit.googleapis.com',        // Firebase sign-in / verify
          'https://firebaseinstallations.googleapis.com',  // Firebase SDK init heartbeat
          'https://accounts.google.com',                   // Google OAuth token exchange
          'https://oauth2.googleapis.com',                 // Google OAuth2 endpoints
        ],
        // FIX: Google Sign-In loads its UI in an iframe from accounts.google.com.
        // Without frameSrc, the browser blocks the iframe and auth/internal-error is thrown.
        frameSrc:        [
          'https://accounts.google.com',                   // Google Sign-In popup/iframe
          'https://thecityplus.firebaseapp.com',           // Firebase auth redirect handler
          'https://cityplus-7ac75.firebaseapp.com',        // Firebase project auth handler
        ],
        frameAncestors:  ["'none'"],
        formAction:      ["'self'", 'https://api.cashfree.com', 'https://sandbox.cashfree.com'],
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
}
if (compression) app.use(compression({ level: 6, threshold: 1024 }));

// ── Response-time header ──────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    if (ms > 200) console.warn(`SLOW ${req.method} ${req.path} — ${ms}ms`);
  });
  next();
});

// ── HTTP Cache-Control ────────────────────────────────────────────────────────
app.use('/api/', (req, res, next) => {
  const hasAuth = !!req.headers['authorization'];
  if (req.method === 'GET' && !hasAuth) {
    res.setHeader('Cache-Control', 'public, max-age=10, stale-while-revalidate=30');
  } else {
    res.setHeader('Cache-Control', 'no-store, private');
  }
  next();
});

// ── Startup guards ─────────────────────────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
  process.exit(1);
}

if (process.env.ADMIN_PASSWORD && !process.env.ADMIN_PASSWORD.startsWith('$2')) {
  console.error('❌ FATAL: ADMIN_PASSWORD must be a bcrypt hash (starting with $2a$ or $2b$).');
  console.error('   Generate one: node -e "const b=require(\'bcryptjs\');b.hash(\'yourpassword\',12).then(console.log)"');
  console.error('   Refusing to start with a plain-text admin password.');
  process.exit(1);
}

// ── CORS ───────────────────────────────────────────────────────────────────────
const explicitOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const staticOrigins = [
  'https://thecityplus.in',
  'https://www.thecityplus.in',
  ...(process.env.APP_URL ? [process.env.APP_URL] : []),
  ...explicitOrigins,
];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (staticOrigins.includes(origin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  if (!isProduction) {
    if (/^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin)) return true;
    if (/^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)) return true;
    if (/^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?$/.test(origin)) return true;
  }
  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    console.warn(`CORS blocked: ${origin}`);
    callback(new Error(`CORS: origin '${origin}' is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use('/api/payments/cashfree-webhook', express.raw({ type: 'application/json', limit: '1mb' }), (req, _res, next) => {
  if (Buffer.isBuffer(req.body)) {
    req.rawBody = req.body;
    try { req.body = JSON.parse(req.body.toString()); } catch { req.body = {}; }
  }
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Security headers ──────────────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
});

// ── Force HTTPS in production ─────────────────────────────────────────────────
if (isProduction) {
  app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    const proto = req.headers['x-forwarded-proto'];
    if (proto && proto !== 'https') {
      return res.redirect(301, 'https://' + req.headers.host + req.url);
    }
    next();
  });
}

// ── Global rate limiter ────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests. Please slow down.' },
});
app.use('/api/', globalLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/jobs',       require('./routes/jobs'));
app.use('/api/payments',   require('./routes/payments'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/ai',         require('./routes/ai'));
app.use('/api/vehicles',   require('./routes/vehicles'));
app.use('/api/buysell',    require('./routes/buysell'));
app.use('/api/rooms',      require('./routes/rooms'));
app.use('/api/chat',       require('./routes/chat'));
app.use('/api/ratings',    require('./routes/ratings'));
app.use('/api/alerts',     require('./routes/alerts'));
app.use('/api/analytics',  require('./routes/analytics'));
app.use('/api/seeker',     require('./routes/seeker'));
app.use('/api/promotions', require('./routes/promotions'));
app.use('/api/coupons',    require('./routes/coupons'));
app.use('/api/upload',     require('./routes/upload'));
const { router: seoRouter } = require('./routes/seo');
app.use('/', seoRouter);

// ── ISO 27001 Audit Logging Middleware ────────────────────────────────────────
(function installAuditMiddleware(app) {
  const { pool } = require('./db');

  const RULES = [
    ['POST',   /^\/api\/jobs\/?$/,                          'job_created'],
    ['POST',   /^\/api\/jobs\/\d+\/apply/,               'job_applied'],
    ['POST',   /^\/api\/jobs\/\d+\/save/,                'job_saved'],
    ['POST',   /^\/api\/jobs\/\d+\/report/,              'job_reported'],
    ['DELETE', /^\/api\/jobs\/\d+/,                       'job_deleted'],
    ['PATCH',  /^\/api\/jobs\/\d+\/application\/\d+/,  'application_status_updated'],
    ['POST',   /^\/api\/payments\/order/,                  'payment_initiated'],
    ['POST',   /^\/api\/payments\/verify\/room/,          'payment_verified_room'],
    ['POST',   /^\/api\/payments\/verify\/vehicle/,       'payment_verified_vehicle'],
    ['POST',   /^\/api\/payments\/verify\/buysell/,       'payment_verified_buysell'],
    ['POST',   /^\/api\/payments\/verify\/promotion/,     'payment_verified_promotion'],
    ['POST',   /^\/api\/payments\/verify/,                 'payment_verified'],
    ['POST',   /^\/api\/vehicles\/?$/,                     'vehicle_listed'],
    ['DELETE', /^\/api\/vehicles\/\d+/,                   'vehicle_deleted'],
    ['POST',   /^\/api\/rooms\/?$/,                        'room_listed'],
    ['DELETE', /^\/api\/rooms\/\d+/,                      'room_deleted'],
    ['POST',   /^\/api\/buysell\/?$/,                      'buysell_item_listed'],
    ['DELETE', /^\/api\/buysell\/\d+/,                    'buysell_item_deleted'],
    ['PUT',    /^\/api\/seeker\/profile/,                  'profile_updated'],
    ['POST',   /^\/api\/seeker\/resume/,                   'resume_uploaded'],
    ['DELETE', /^\/api\/seeker\/resume/,                   'resume_deleted'],
    ['POST',   /^\/api\/upload\/image/,                    'image_uploaded'],
    ['DELETE', /^\/api\/upload\/image/,                    'image_deleted'],
    ['POST',   /^\/api\/chat\//,                           'message_sent'],
    ['POST',   /^\/api\/ratings\/?$/,                      'rating_submitted'],
    ['POST',   /^\/api\/alerts\/?$/,                       'job_alert_created'],
    ['PATCH',  /^\/api\/alerts\/\d+\/toggle/,            'job_alert_toggled'],
    ['DELETE', /^\/api\/alerts\/\d+/,                     'job_alert_deleted'],
    ['POST',   /^\/api\/promotions\/?$/,                   'promotion_created'],
    ['POST',   /^\/api\/coupons\/validate/,                'coupon_validated'],
    ['POST',   /^\/api\/coupons\/mark-used/,               'coupon_used'],
    ['PATCH',  /^\/api\/admin\/users\/\d+\/toggle/,     'admin_user_toggled'],
    ['PATCH',  /^\/api\/admin\/users\/\d+\/grant-pro/,  'admin_pro_granted'],
    ['PATCH',  /^\/api\/admin\/users\/\d+\/revoke-pro/, 'admin_pro_revoked'],
    ['PATCH',  /^\/api\/admin\/users\/\d+\/role/,       'admin_role_changed'],
    ['PATCH',  /^\/api\/admin\/users\/\d+\/verify/,     'admin_user_verified'],
    ['PATCH',  /^\/api\/admin\/jobs\/\d+\/status/,      'admin_job_status_changed'],
    ['PATCH',  /^\/api\/admin\/jobs\/\d+\/feature/,     'admin_job_featured'],
    ['DELETE', /^\/api\/admin\/jobs\/\d+/,               'admin_job_deleted'],
    ['DELETE', /^\/api\/admin\/buysell\/\d+/,            'admin_buysell_deleted'],
    ['PATCH',  /^\/api\/admin\/vehicles\/\d+\/status/,  'admin_vehicle_status_changed'],
    ['DELETE', /^\/api\/admin\/vehicles\/\d+/,           'admin_vehicle_deleted'],
    ['PATCH',  /^\/api\/admin\/rooms\/\d+\/status/,     'admin_room_status_changed'],
    ['DELETE', /^\/api\/admin\/rooms\/\d+/,              'admin_room_deleted'],
    ['POST',   /^\/api\/admin\/notifications/,             'admin_notification_sent'],
    ['GET',    /^\/api\/jobs\/\d+(?:\?|$)/,                  'job_viewed'],
    ['GET',    /^\/api\/jobs\/my-applications/,               'applications_viewed'],
    ['GET',    /^\/api\/jobs\/saved/,                         'saved_jobs_viewed'],
    ['GET',    /^\/api\/jobs(\/|\?|$)/,                       'jobs_browsed'],
    ['GET',    /^\/api\/rooms\/\d+(?:\?|$)/,                 'room_viewed'],
    ['GET',    /^\/api\/rooms(\/|\?|$)/,                      'rooms_browsed'],
    ['GET',    /^\/api\/vehicles\/\d+(?:\?|$)/,              'vehicle_viewed'],
    ['GET',    /^\/api\/vehicles(\/|\?|$)/,                   'vehicles_browsed'],
    ['GET',    /^\/api\/buysell\/\d+(?:\?|$)/,               'buysell_item_viewed'],
    ['GET',    /^\/api\/buysell(\/|\?|$)/,                    'buysell_browsed'],
    ['GET',    /^\/api\/chat\//,                               'chat_opened'],
    ['GET',    /^\/api\/seeker\/profile/,                     'profile_viewed'],
    ['GET',    /^\/api\/alerts/,                               'alerts_viewed'],
    ['GET',    /^\/api\/analytics/,                            'analytics_viewed'],
  ];

  function deriveAction(method, url) {
    const p = url.split('?')[0];
    for (const [m, re, action] of RULES) {
      if (m === method && re.test(p)) return action;
    }
    return null;
  }

  function buildDetail(req) {
    const parts = [];
    const safe = ['title','category','type','status','plan','code','reason'];
    for (const f of safe) {
      if (req.body && req.body[f]) parts.push(`${f}:${String(req.body[f]).slice(0, 80)}`);
    }
    const ids = (req.originalUrl || '').match(/\/(\d+)/g);
    if (ids && ids.length) parts.push(`ref:${ids.map(i => i.slice(1)).join(',')}`);
    return parts.join(' | ') || null;
  }

  app.use(function auditLogger(req, res, next) {
    const action = deriveAction(req.method, req.originalUrl || req.url);
    if (!action) return next();

    const _json = res.json.bind(res);
    res.json = function(body) {
      const userId = req.user && req.user.id ? req.user.id : null;
      if (userId && body && body.ok !== false) {
        const ip        = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
                          || (req.socket && req.socket.remoteAddress) || null;
        const userAgent = req.headers['user-agent'] || null;
        const detail    = buildDetail(req);
        pool.query(
          'INSERT INTO activity_logs (user_id, action, status, ip, user_agent, detail) VALUES ($1,$2,$3,$4,$5,$6)',
          [userId, action, 'success', ip, userAgent, detail]
        ).catch(e => console.warn('[audit] insert failed:', e.message));
      }
      return _json(body);
    };
    next();
  });

  console.log('[audit] ISO 27001 audit middleware installed ✅');
})(app);

// ── App version check ──────────────────────────────────────────────────────────
app.get('/api/app/version', (_req, res) => {
  res.json({
    ok: true,
    android: {
      versionCode:   parseInt(process.env.ANDROID_VERSION_CODE || '1'),
      versionName:   process.env.ANDROID_VERSION_NAME  || '1.0.0',
      forceUpdate:   process.env.FORCE_UPDATE === 'true',
      updateMessage: process.env.UPDATE_MESSAGE
        || 'A new version of CityPlus is available with improvements and bug fixes. Update now for the best experience!',
    },
  });
});

// Health check
app.get('/health', (_req, res) => res.json({
  ok:     true,
  status: 'CityPlus API running 🚀',
  pid:    process.pid,
  worker: cluster.worker ? cluster.worker.id : 'primary',
}));

// ── Cashfree payment start ─────────────────────────────────────────────────────
const CF_CHECKOUT_ENDPOINT = (process.env.CASHFREE_ENV || process.env.NODE_ENV) === 'production'
  ? 'https://api.cashfree.com/pg/view/sessions/checkout'
  : 'https://sandbox.cashfree.com/pg/view/sessions/checkout';

app.get('/payment/start', (req, res) => {
  const { session_id, order_id } = req.query;
  if (!session_id) return res.status(400).send('Missing session_id');
  const safeSession = String(session_id).replace(/[<>"'&]/g, c =>
    ({ '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;', '&':'&amp;' }[c]));
  const safeOrder = String(order_id || '').replace(/[<>"'&]/g, c =>
    ({ '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;', '&':'&amp;' }[c]));

  res.send(`<!DOCTYPE html><html><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Opening payment…</title>
  <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;
  min-height:100vh;margin:0;background:#fff8f5;flex-direction:column;gap:16px;}
  .spinner{width:44px;height:44px;border:4px solid #fed7aa;border-top-color:#f97316;
  border-radius:50%;animation:spin 0.8s linear infinite;}
  @keyframes spin{to{transform:rotate(360deg);}}</style></head>
  <body><div class="spinner"></div><p style="color:#f97316;font-weight:600">Opening payment page…</p>
  <form id="cf" method="POST" action="${CF_CHECKOUT_ENDPOINT}" style="display:none">
    <input type="hidden" name="payment_session_id" value="${safeSession}">
  </form>
  <script>window.addEventListener('load',function(){setTimeout(function(){document.getElementById('cf').submit();},300);});</script>
  </body></html>`);
});

// ── Static pages ──────────────────────────────────────────────────────────────
const CALLBACK_HTML    = path.join(__dirname, '..', 'public', 'payment-callback.html');
const ADMIN_LOGIN_HTML = path.join(__dirname, '..', 'public', 'admin-login.html');
// NOTE: admin-login.html is a self-contained SPA — it renders the login screen
// first, then transitions to the full admin panel in-page after authentication.
// A separate admin-panel.html file does not exist and is not needed.
// All three admin URLs below serve the same file intentionally.
const PRIVACY_HTML     = path.join(__dirname, '..', 'public', 'privacy-policy.html');
const TERMS_HTML       = path.join(__dirname, '..', 'public', 'terms-and-conditions.html');
const REFUND_HTML      = path.join(__dirname, '..', 'public', 'refund-policy.html');

app.get('/admin',       (_req, res) => res.sendFile(ADMIN_LOGIN_HTML));
app.get('/admin-login', (_req, res) => res.sendFile(ADMIN_LOGIN_HTML));
app.get('/admin-panel', (_req, res) => res.sendFile(ADMIN_LOGIN_HTML));
app.get('/privacy-policy',       (_req, res) => res.sendFile(PRIVACY_HTML));
app.get('/terms-and-conditions', (_req, res) => res.sendFile(TERMS_HTML));
app.get('/refund-policy',        (_req, res) => res.sendFile(REFUND_HTML));

app.get('/payment/callback', (req, res) => {
  if (fs.existsSync(CALLBACK_HTML)) {
    res.sendFile(CALLBACK_HTML);
  } else {
    const { order_id = '', payment_status = '' } = req.query;
    const deepLink = `cityplus://payment/callback?order_id=${encodeURIComponent(order_id)}&payment_status=${encodeURIComponent(payment_status)}`;
    res.send(`<!DOCTYPE html><html><body>
      <script>setTimeout(function(){window.location.href=${JSON.stringify(deepLink)};},400);</script>
      <p>Returning to app… <a href="${deepLink}">Tap here if it doesn't open</a></p>
      </body></html>`);
  }
});

// ── Web SPA — serve Expo web bundle from dist/ (built via `npm run build`) ────
// Railway runs `npm run build` which runs `npx expo export --platform web`,
// producing a dist/ folder with a full React Native Web bundle including
// a proper index.html with <div id="root"> for mounting.
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const DIST_DIR   = path.join(__dirname, '..', 'dist');
const WEB_DIR    = fs.existsSync(DIST_DIR) ? DIST_DIR : PUBLIC_DIR;
const WEB_INDEX  = path.join(WEB_DIR, 'index.html');

// Serve public/ assets (icons, images, manifest, policy pages, etc.)
app.use(express.static(PUBLIC_DIR, { index: false }));

// Serve Expo web bundle static assets (JS, CSS, fonts, etc.)
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, { index: false }));
}

// SPA web routes — all load the Expo web index.html
const WEB_ROUTES = ['/', '/jobs', '/rooms', '/vehicles', '/buysell', '/buy-sell',
                    '/post', '/profile', '/ai', '/alerts', '/saved', '/referral',
                    '/about', '/help', '/chat'];
WEB_ROUTES.forEach(route => {
  app.get(route, (_req, res) => res.sendFile(WEB_INDEX));
});

// Dynamic detail pages  e.g. /jobs/123  /rooms/456  /vehicles/789
app.get('/jobs/:id',     (_req, res) => res.sendFile(WEB_INDEX));
app.get('/rooms/:id',    (_req, res) => res.sendFile(WEB_INDEX));
app.get('/vehicles/:id', (_req, res) => res.sendFile(WEB_INDEX));
app.get('/buysell/:id',  (_req, res) => res.sendFile(WEB_INDEX));

// Catch-all for any other browser navigation (unknown paths → SPA handles 404)
app.get('*', (req, res, next) => {
  // Skip API calls — those should 404 as JSON, not get the SPA
  if (req.path.startsWith('/api/') || req.path.startsWith('/admin')) return next();
  res.sendFile(WEB_INDEX);
});

// Remaining unmatched (API 404s)
app.use((_req, res) => res.status(404).json({ ok: false, error: 'Route not found' }));

// ── Worker startup ─────────────────────────────────────────────────────────────
// FIX: Workers skip migrations — primary already ran them before forking.
// In single-process dev mode (DISABLE_CLUSTER=true), still run migrations here.
const PORT = process.env.PORT || 3000;

const startServer = () => {
  app.listen(PORT, () => {
    const workerLabel = cluster.worker ? `worker #${cluster.worker.id} PID ${process.pid}` : `PID ${process.pid}`;
    console.log(`🚀 Server running on port ${PORT} [${workerLabel}]`);
    if (DISABLE_CLUSTER) _startPrimaryCrons();
  });
};

if (DISABLE_CLUSTER) {
  // Dev/single-process: run migrations then start
  runMigrations()
    .then(startServer)
    .catch(err => {
      console.error('❌ Failed to start server — migration error:', err.message);
      process.exit(1);
    });
} else {
  // Cluster worker: migrations already done by primary, just start
  startServer();
}

// ── Cron jobs ──────────────────────────────────────────────────────────────────
function _startPrimaryCrons() {
  // FIX: Require pool and cache here so this function works in BOTH the primary
  // process (which only imports runMigrations at the top) and worker processes.
  const { pool, cache } = require('./db');

  async function deleteExpired() {
    try {
      const now = new Date();
      const results = await Promise.all([
        pool.query(`UPDATE jobs SET status='deleted' WHERE expires_at IS NOT NULL AND expires_at < $1 AND status != 'deleted' RETURNING id`, [now]),
        pool.query(`UPDATE vehicles SET status='deleted' WHERE expires_at IS NOT NULL AND expires_at < $1 AND status != 'deleted' RETURNING id`, [now]),
        pool.query(`UPDATE rooms SET status='deleted' WHERE expires_at IS NOT NULL AND expires_at < $1 AND status != 'deleted' RETURNING id`, [now]),
        pool.query(`UPDATE buysell_items SET status='deleted' WHERE expires_at IS NOT NULL AND expires_at < $1 AND status != 'deleted' RETURNING id`, [now]),
        pool.query(`UPDATE business_promotions SET status='expired' WHERE expires_at IS NOT NULL AND expires_at < $1 AND status='active' RETURNING id`, [now]),
      ]);
      const [jobs, vehicles, rooms, items, promos] = results;
      const total = jobs.rowCount + vehicles.rowCount + rooms.rowCount + items.rowCount + promos.rowCount;
      if (total > 0) {
        console.log(`🗑️  Expiry cleanup: ${jobs.rowCount} jobs, ${vehicles.rowCount} vehicles, ${rooms.rowCount} rooms, ${items.rowCount} items | ${promos.rowCount} promotions`);
        await cache.delPrefix('jobs:');
        await cache.delPrefix('rooms:');
        await cache.delPrefix('vehicles:');
        await cache.delPrefix('buysell:');
      }
    } catch (err) {
      console.error('❌ Expiry cleanup error:', err.message);
    }
  }
  deleteExpired();
  setInterval(deleteExpired, 60 * 60 * 1000);

  async function pruneActivityLogs() {
    try {
      const result = await pool.query(
        `DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '90 days'`
      );
      if (result.rowCount > 0) {
        console.log(`🧹 Pruned ${result.rowCount} old activity_log rows (>90 days)`);
      }
    } catch (err) {
      console.error('❌ Activity log pruning error:', err.message);
    }
  }
  pruneActivityLogs();
  setInterval(pruneActivityLogs, 7 * 24 * 60 * 60 * 1000);

  console.log('⏰ Cron jobs started (expiry hourly, log pruning weekly)');
}
