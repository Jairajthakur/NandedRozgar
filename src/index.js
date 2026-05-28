require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const rateLimit = require('express-rate-limit');
const { runMigrations, pool } = require('./db');

const app = express();
app.set('trust proxy', 1);

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

// ── Instamojo payment callback ─────────────────────────────────────────────────
// Instamojo redirects here after payment with ?payment_id=&payment_request_id=&payment_status=
// This file MUST be at: public/payment-callback.html  (next to the src/ folder)
const CALLBACK_HTML = path.join(__dirname, '..', 'public', 'payment-callback.html');
app.get('/payment/callback', (_req, res) => {
  if (fs.existsSync(CALLBACK_HTML)) {
    res.sendFile(CALLBACK_HTML);
  } else {
    // Fallback inline page if file is missing
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Payment Complete</title>
      <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fff8f5}
      .box{text-align:center;padding:32px}.icon{font-size:64px;margin-bottom:16px}h2{color:#333}p{color:#666}</style></head>
      <body><div class="box"><div class="icon" id="icon">⏳</div><h2 id="title">Processing…</h2><p id="msg">Please wait.</p></div>
      <script>
        const p=new URLSearchParams(location.search),status=p.get('payment_status'),pid=p.get('payment_id'),prid=p.get('payment_request_id');
        const payload={type:'instamojo_payment',payment_status:status,payment_id:pid,payment_request_id:prid};
        if(window.parent&&window.parent!==window)window.parent.postMessage(JSON.stringify(payload),'*');
        if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        if(status==='Credit'){document.getElementById('icon').textContent='✅';document.getElementById('title').textContent='Payment Successful!';document.getElementById('msg').textContent='Redirecting back to app…';}
        else{document.getElementById('icon').textContent='❌';document.getElementById('title').textContent='Payment Failed';document.getElementById('msg').textContent='Please go back and try again.';}
        setTimeout(()=>{try{window.close();}catch{}},2000);
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
