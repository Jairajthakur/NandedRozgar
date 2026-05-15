require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { runMigrations } = require('./db');

const app = express();

// FIX #8 — Security headers
app.use(helmet());

// FIX #6 — Restrict CORS to known origins only
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
      return cb(null, true);
    }
    cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));

// FIX #10 — Limit request body size to prevent DoS
app.use(express.json({ limit: '50kb' }));

// FIX #5 — Global rate limiter (fallback)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// FIX #5 — Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { ok: false, error: 'Too many auth attempts, please try again in 15 minutes.' },
});

// FIX #5 — AI endpoint limiter (protect API credits)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { ok: false, error: 'AI rate limit reached, please wait a moment.' },
});

// Routes
app.use('/api/auth',     authLimiter, require('./routes/auth'));
app.use('/api/jobs',     require('./routes/jobs'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/ai',       aiLimiter, require('./routes/ai'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/rooms',    require('./routes/rooms'));

// Health check
app.get('/health', (req, res) => res.json({ ok: true, status: 'NandedRozgar API running' }));

// 404
app.use((req, res) => res.status(404).json({ ok: false, error: 'Route not found' }));

// Global error handler — FIX #17: never leak stack traces to clients
app.use((err, req, res, _next) => {
  res.status(500).json({ ok: false, error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server — migration error:', err.message);
    process.exit(1);
  });
