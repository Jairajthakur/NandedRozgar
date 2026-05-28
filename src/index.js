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

// ── Cashfree payment callback ──────────────────────────────────────────────────
// Cashfree redirects here after payment with ?order_id=XXX&status=SUCCESS|FAILED
// Native WebView intercepts this URL directly in cashfree.native.js.
// Web Drop-in handles success/failure via its own callbacks — this page is a
// safe landing fallback shown briefly before the modal closes itself.
// Optional: place a custom page at public/payment-callback.html to override.
const CALLBACK_HTML = path.join(__dirname, '..', 'public', 'payment-callback.html');
app.get('/payment/callback', (req, res) => {
  if (fs.existsSync(CALLBACK_HTML)) {
    res.sendFile(CALLBACK_HTML);
  } else {
    // Inline fallback page — reads Cashfree query params, posts message to parent/WebView
    const { order_id = '', status = '' } = req.query;
    const isSuccess = status.toUpperCase() === 'SUCCESS';
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Payment ${isSuccess ? 'Successful' : 'Failed'}</title>
      <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fff8f5}
      .box{text-align:center;padding:32px}.icon{font-size:64px;margin-bottom:16px}h2{color:#333}p{color:#666;font-size:14px}</style></head>
      <body><div class="box">
        <div class="icon">${isSuccess ? '✅' : '❌'}</div>
        <h2>${isSuccess ? 'Payment Successful!' : 'Payment Failed'}</h2>
        <p>${isSuccess ? 'Redirecting back to app…' : 'Please go back and try again.'}</p>
        <p style="color:#aaa;font-size:12px">Order: ${order_id}</p>
      </div>
      <script>
        var payload = JSON.stringify({
          type: 'cashfree_payment',
          order_id: '${order_id}',
          status: '${status}'
        });
        // Notify web parent iframe (Drop-in modal)
        if (window.parent && window.parent !== window) window.parent.postMessage(payload, '*');
        // Notify React Native WebView (native app)
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(payload);
        // Auto-close after 2 s
        setTimeout(function(){ try { window.close(); } catch(e){} }, 2000);
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
