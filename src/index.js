require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { runMigrations } = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/jobs',     require('./routes/jobs'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/ai',       require('./routes/ai'));

// Health check
app.get('/health', (req, res) => res.json({ ok: true, status: 'NandedRozgar API running 🚀' }));

// 404
app.use((req, res) => res.status(404).json({ ok: false, error: 'Route not found' }));

const PORT = process.env.PORT || 3000;

// ✅ Run migrations first, then start server
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
