require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { runMigrations } = require('./db');

const app = express();

// ── Global middlewares ────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// General API rate limiter (fallback — auth routes have their own stricter limits)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests. Please slow down.' },
});
app.use('/api/', globalLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/jobs',     require('./routes/jobs'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/ai',       require('./routes/ai'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/rooms',    require('./routes/rooms'));

// Health check
app.get('/health', (req, res) => res.json({ ok: true, status: 'NandedRozgar API running 🚀' }));

// ── Serve Expo web build ──────────────────────────────────────────────────────
const WEB_BUILD = path.join(__dirname, '..', 'dist');
if (fs.existsSync(WEB_BUILD)) {
  app.use(express.static(WEB_BUILD));
  // SPA fallback — all non-API routes serve index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(WEB_BUILD, 'index.html'));
  });
} else {
  app.use((req, res) => res.status(404).json({ ok: false, error: 'Route not found' }));
}

const PORT = process.env.PORT || 3000;

runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to start server — migration error:', err.message);
    process.exit(1);
  });
