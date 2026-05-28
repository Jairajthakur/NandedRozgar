require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const rateLimit = require('express-rate-limit');
const { runMigrations, pool, cache } = require('./db');

// ── Gzip compression — dramatically reduces payload size on slow networks ──────
let compression;
try { compression = require('compression'); } catch { compression = null; }

const app = express();
app.set('trust proxy', 1);

// Enable gzip for all responses
if (compression) {
  app.use(compression({ level: 6, threshold: 1024 }));
}

// ── Response-time header (visible in Railway logs & dev tools) ────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    if (ms > 200) console.warn(`SLOW ${req.method} ${req.path} — ${ms}ms`);
  });
  next();
});

// ── HTTP Cache-Control for read-only API endpoints ────────────────────────────
// Tells CDNs and browsers to cache public GET responses briefly.
// Authenticated responses are excluded by the auth middleware (private).
app.use('/api/', (req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, max-age=10, stale-while-revalidate=30');
  } else {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});

// ── Startup guards ─────────────────────────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
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
  if (/^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin)) return true;
  if (/^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)) return true;
  if (/^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?$/.test(origin)) return true;
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

app.use(express.json({ limit: '5mb' }));

// ── Security headers ──────────────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ── Force HTTPS in production ─────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
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

// Health check
app.get('/health', (_req, res) => res.json({ ok: true, status: 'CityPlus API running 🚀' }));

// ── Cashfree payment start — native APK opens this in the system browser ──────
// The browser visits this page via GET with ?session_id=...&order_id=...
// The page auto-submits a POST form to Cashfree's hosted checkout endpoint,
// which is the only way to initiate a Cashfree hosted session from a browser
// (Cashfree requires a POST, not a GET redirect).
const CF_CHECKOUT_ENDPOINT = (process.env.CASHFREE_ENV || process.env.NODE_ENV) === 'production'
  ? 'https://api.cashfree.com/pg/view/sessions/checkout'
  : 'https://sandbox.cashfree.com/pg/view/sessions/checkout';

app.get('/payment/start', (req, res) => {
  const { session_id, order_id } = req.query;
  if (!session_id) {
    return res.status(400).send('Missing session_id');
  }
  // Escape values for safe inline HTML injection
  const safeSession = String(session_id).replace(/[<>"'&]/g, c =>
    ({ '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":"&#39;", '&':'&amp;' }[c]));
  const safeOrder = String(order_id || '').replace(/[<>"'&]/g, c =>
    ({ '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":"&#39;", '&':'&amp;' }[c]));

  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Opening payment…</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center;
           justify-content: center; min-height: 100vh; margin: 0;
           background: #fff8f5; flex-direction: column; gap: 16px; }
    .spinner { width: 44px; height: 44px; border: 4px solid #fed7aa;
               border-top-color: #f97316; border-radius: 50%;
               animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { color: #f97316; font-weight: 600; font-size: 15px; }
    small { color: #aaa; font-size: 12px; }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <p>Opening payment page…</p>
  <small>Secured by Cashfree Payments</small>
  <form id="cf" method="POST" action="${CF_CHECKOUT_ENDPOINT}" style="display:none">
    <input type="hidden" name="payment_session_id" value="${safeSession}">
  </form>
  <script>
    // Auto-submit on load; tiny delay so the loading spinner is visible
    window.addEventListener('load', function () {
      setTimeout(function () { document.getElementById('cf').submit(); }, 300);
    });
  </script>
</body>
</html>`);
});

// ── Cashfree payment callback ──────────────────────────────────────────────────
// Cashfree redirects here after payment with ?order_id=XXX&payment_status=SUCCESS|FAILED
//
// Native (APK) flow — browser-redirect + deep link:
//   This page (public/payment-callback.html) immediately redirects the system
//   browser to  cityplus://payment/callback?order_id=...&payment_status=...
//   App.js picks that up via its Linking listener → emitPaymentResult().
//
// Web (browser) flow:
//   The Cashfree Drop-in handles success/failure via its own JS callbacks.
//   This endpoint is never reached for web users; it is only a safety net.
const CALLBACK_HTML   = path.join(__dirname, '..', 'public', 'payment-callback.html');
const ADMIN_LOGIN_HTML = path.join(__dirname, '..', 'public', 'admin-login.html');

// ── Admin login page ──────────────────────────────────────────────────────────
app.get('/admin-login', (_req, res) => {
  res.sendFile(ADMIN_LOGIN_HTML);
});
app.get('/payment/callback', (req, res) => {
  if (fs.existsSync(CALLBACK_HTML)) {
    // Serve the custom HTML that fires the cityplus:// deep link
    res.sendFile(CALLBACK_HTML);
  } else {
    // Inline fallback — redirects to the deep link directly from the server response
    const { order_id = '', payment_status = '' } = req.query;
    const deepLink =
      `cityplus://payment/callback` +
      `?order_id=${encodeURIComponent(order_id)}` +
      `&payment_status=${encodeURIComponent(payment_status)}`;
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Returning to app…</title>
      <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;
      min-height:100vh;margin:0;background:#fff8f5;flex-direction:column;gap:12px;padding:24px}
      p{color:#f97316;font-weight:600;font-size:15px;text-align:center}
      a{color:#f97316;font-size:14px}</style></head>
      <body>
        <p>${payment_status.toUpperCase() === 'SUCCESS' ? '✅ Payment Successful!' : payment_status.toUpperCase() === 'FAILED' ? '❌ Payment Failed' : '⏳ Processing…'}</p>
        <p>Returning to the app…</p>
        <a href="${deepLink}">Tap here if the app does not open</a>
      <script>
        setTimeout(function(){ window.location.href = ${JSON.stringify(deepLink)}; }, 400);
      </script></body></html>`);
  }
});

// ── Serve Expo web build ───────────────────────────────────────────────────────
const WEB_BUILD = path.join(__dirname, '..', 'dist');
if (fs.existsSync(WEB_BUILD)) {
  app.use(express.static(WEB_BUILD));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(WEB_BUILD, 'index.html'));
  });
} else {
  app.use((_req, res) => res.status(404).json({ ok: false, error: 'Route not found' }));
}

// ── Expiry cleanup cron ────────────────────────────────────────────────────────
function startExpiryCleanup() {
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
        console.log(`🗑️  Expiry cleanup: ${jobs.rowCount} jobs, ${vehicles.rowCount} vehicles, ${rooms.rowCount} rooms, ${items.rowCount} items | ${promos.rowCount} promotions expired`);
        // Bust all list caches so expired items disappear immediately
        cache.delPrefix('jobs:');
        cache.delPrefix('rooms:');
        cache.delPrefix('vehicles:');
        cache.delPrefix('buysell:');
      }
    } catch (err) {
      console.error('❌ Expiry cleanup error:', err.message);
    }
  }
  deleteExpired();
  setInterval(deleteExpired, 60 * 60 * 1000);
}

const PORT = process.env.PORT || 3000;

runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      startExpiryCleanup();
    });
  })
  .catch(err => {
    console.error('❌ Failed to start server — migration error:', err.message);
    process.exit(1);
  });
