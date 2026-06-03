const { Pool } = require('pg');

const dbUrl      = process.env.DATABASE_URL || '';
const requireSsl = process.env.NODE_ENV === 'production'
  || dbUrl.includes('railway.internal')
  || dbUrl.includes('railway.app');

const pool = new Pool({
  connectionString:  dbUrl,
  ssl:               requireSsl ? { rejectUnauthorized: false } : false,
  max:               20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  keepAlive:         true,
  keepAliveInitialDelayMillis: 10_000,
});

pool.on('error', (err) => {
  console.error('Unexpected pool client error:', err.message);
});

// ── Cache: Redis (if REDIS_URL set) with seamless in-memory fallback ──────────
// When Redis is available, cache survives deployments and is shared across
// multiple Railway instances. When it's not, we fall back to the original
// in-memory Map so nothing breaks in development or on free-tier deploys.
//
// To enable Redis on Railway:
//   1. Railway dashboard → your project → + New → Database → Add Redis
//   2. Railway auto-injects REDIS_URL into your service — no extra config needed.

let _redisClient = null;
let _redisReady  = false;

async function _initRedis() {
  const url = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL;
  if (!url) return;
  try {
    const { createClient } = require('redis');
    const client = createClient({ url, socket: { reconnectStrategy: (n) => Math.min(n * 100, 3000) } });
    client.on('error', (e) => console.warn('[Redis] error:', e.message));
    client.on('ready', () => { _redisReady = true;  console.log('[Redis] connected ✅'); });
    client.on('end',   () => { _redisReady = false; console.warn('[Redis] disconnected — falling back to in-memory cache'); });
    await client.connect();
    _redisClient = client;
  } catch (e) {
    console.warn('[Redis] init failed, using in-memory cache:', e.message);
  }
}
_initRedis();

// In-memory fallback
const _mem   = new Map();
const _memTtl = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, exp] of _memTtl) { if (now > exp) { _mem.delete(k); _memTtl.delete(k); } }
}, 120_000).unref();

const cache = {
  async get(key) {
    if (_redisReady && _redisClient) {
      try {
        const val = await _redisClient.get(key);
        return val ? JSON.parse(val) : undefined;
      } catch { /* fall through */ }
    }
    const exp = _memTtl.get(key);
    if (!exp || Date.now() > exp) { _mem.delete(key); _memTtl.delete(key); return undefined; }
    return _mem.get(key);
  },
  async set(key, data, ttlMs = 10_000) {
    if (_redisReady && _redisClient) {
      try {
        await _redisClient.set(key, JSON.stringify(data), { PX: ttlMs });
        return;
      } catch { /* fall through */ }
    }
    _mem.set(key, data);
    _memTtl.set(key, Date.now() + ttlMs);
  },
  async del(key) {
    if (_redisReady && _redisClient) {
      try { await _redisClient.del(key); } catch { /* ignore */ }
    }
    _mem.delete(key); _memTtl.delete(key);
  },
  async delPrefix(prefix) {
    if (_redisReady && _redisClient) {
      try {
        // SCAN is non-blocking unlike KEYS — safe for production
        let cursor = 0;
        do {
          const { cursor: next, keys } = await _redisClient.scan(cursor, { MATCH: `${prefix}*`, COUNT: 100 });
          if (keys.length) await _redisClient.del(keys);
          cursor = next;
        } while (cursor !== 0);
        return;
      } catch { /* fall through */ }
    }
    for (const k of _mem.keys()) { if (k.startsWith(prefix)) { _mem.delete(k); _memTtl.delete(k); } }
  },
};


async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('⚙️  Running database migrations...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id               SERIAL PRIMARY KEY,
        name             VARCHAR(100),
        email            VARCHAR(200) UNIQUE,
        password         VARCHAR(200),
        phone            VARCHAR(15) UNIQUE,
        company          VARCHAR(100),
        role             VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        premium          BOOLEAN DEFAULT FALSE,
        active           BOOLEAN DEFAULT TRUE,
        verified         BOOLEAN DEFAULT FALSE,
        referral_credits INTEGER DEFAULT 0,
        google_id        VARCHAR(200) UNIQUE,
        avatar_url       TEXT,
        reset_token      VARCHAR(200),
        reset_expires    TIMESTAMPTZ,
        last_seen        TIMESTAMPTZ,
        district         VARCHAR(50) DEFAULT 'nanded',
        created_at       TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Safe column additions for existing DBs
    const safeAlters = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS district        VARCHAR(50)  DEFAULT 'nanded'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS premium         BOOLEAN      DEFAULT FALSE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS verified        BOOLEAN      DEFAULT FALSE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_credits INTEGER     DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id       VARCHAR(200)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url      TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token     VARCHAR(200)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires   TIMESTAMPTZ`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen       TIMESTAMPTZ`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token      TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMPTZ`,
      `ALTER TABLE users ALTER COLUMN email    DROP NOT NULL`,
      `ALTER TABLE users ALTER COLUMN password DROP NOT NULL`,

      `ALTER TABLE jobs  ADD COLUMN IF NOT EXISTS district        VARCHAR(50)  DEFAULT 'nanded'`,
      `ALTER TABLE jobs  ADD COLUMN IF NOT EXISTS whatsapp        VARCHAR(15)`,
      `ALTER TABLE jobs  ADD COLUMN IF NOT EXISTS skills          TEXT[]`,
      `ALTER TABLE jobs  ADD COLUMN IF NOT EXISTS requirements    TEXT[]`,
      `ALTER TABLE jobs  ADD COLUMN IF NOT EXISTS education       VARCHAR(100)`,
      `ALTER TABLE jobs  ADD COLUMN IF NOT EXISTS experience      VARCHAR(50)`,
      `ALTER TABLE jobs  ADD COLUMN IF NOT EXISTS hours           VARCHAR(50)`,
      `ALTER TABLE jobs  ADD COLUMN IF NOT EXISTS openings        VARCHAR(10)  DEFAULT '1'`,
      `ALTER TABLE jobs  ADD COLUMN IF NOT EXISTS status          VARCHAR(20)  DEFAULT 'active'`,
      `ALTER TABLE jobs  ADD COLUMN IF NOT EXISTS fresher_ok      BOOLEAN      DEFAULT FALSE`,
      `ALTER TABLE jobs  ADD COLUMN IF NOT EXISTS address         TEXT`,

      `ALTER TABLE applications ADD COLUMN IF NOT EXISTS status   VARCHAR(20)  DEFAULT 'applied'`,

      `ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100)`,
      `ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_order_id   VARCHAR(100)`,
      `ALTER TABLE payments ADD COLUMN IF NOT EXISTS status              VARCHAR(20) DEFAULT 'paid'`,
      `ALTER TABLE payments ADD COLUMN IF NOT EXISTS category            VARCHAR(20)  DEFAULT 'job'`,
      `ALTER TABLE payments ADD COLUMN IF NOT EXISTS plan                VARCHAR(30)`,
      `ALTER TABLE payments ADD COLUMN IF NOT EXISTS ref_id              INTEGER`,

      `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS district     VARCHAR(50)  DEFAULT 'nanded'`,
      `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS status       VARCHAR(20)  DEFAULT 'active'`,
      `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS expires_at   TIMESTAMPTZ`,
      `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS plan_days    INTEGER      DEFAULT 30`,
      `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS plan_label   VARCHAR(30)`,
      `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS plan_price   INTEGER`,

      `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS district        VARCHAR(50)  DEFAULT 'nanded'`,
      `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS status          VARCHAR(20)  DEFAULT 'active'`,
      `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS expires_at      TIMESTAMPTZ`,
      `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS plan_days       INTEGER      DEFAULT 30`,
      `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS plan_label      VARCHAR(30)`,
      `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS plan_price      INTEGER`,

      `ALTER TABLE buysell_items ADD COLUMN IF NOT EXISTS district VARCHAR(50) DEFAULT 'nanded'`,

      `ALTER TABLE business_promotions ADD COLUMN IF NOT EXISTS banner_style VARCHAR(20) DEFAULT 'bold'`,
      `ALTER TABLE business_promotions ADD COLUMN IF NOT EXISTS accent_color VARCHAR(20)`,
      `ALTER TABLE business_promotions ADD COLUMN IF NOT EXISTS plan_price   INTEGER`,
      `ALTER TABLE business_promotions ADD COLUMN IF NOT EXISTS plan_days    INTEGER`,
      `ALTER TABLE business_promotions ADD COLUMN IF NOT EXISTS website      VARCHAR(200)`,
      `ALTER TABLE business_promotions ADD COLUMN IF NOT EXISTS description  TEXT`,
      `ALTER TABLE business_promotions ADD COLUMN IF NOT EXISTS address      TEXT`,
      `ALTER TABLE business_promotions ADD COLUMN IF NOT EXISTS tagline      VARCHAR(100)`,
      `ALTER TABLE business_promotions ADD COLUMN IF NOT EXISTS expires_at   TIMESTAMPTZ`,
      `ALTER TABLE business_promotions ADD COLUMN IF NOT EXISTS timing       VARCHAR(100)`,
      `ALTER TABLE business_promotions ADD COLUMN IF NOT EXISTS template_id  INTEGER`,

      `ALTER TABLE seeker_profiles ADD COLUMN IF NOT EXISTS resume_url TEXT`,

      // Free-first-post tracking: plan_label on buysell_items was missing
      `ALTER TABLE buysell_items ADD COLUMN IF NOT EXISTS plan_label VARCHAR(30) DEFAULT 'free'`,
    ];

    for (const sql of safeAlters) {
      try { await client.query(sql); } catch (e) { console.warn('Alter warn (non-fatal):', e.message); }
    }

    // Core tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id               SERIAL PRIMARY KEY,
        posted_by        INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title            VARCHAR(200) NOT NULL,
        company          VARCHAR(100),
        category         VARCHAR(50) NOT NULL,
        type             VARCHAR(50) DEFAULT 'Full-time',
        location         VARCHAR(200),
        salary           VARCHAR(100),
        phone            VARCHAR(15),
        whatsapp         VARCHAR(15),
        description      TEXT,
        skills           TEXT[],
        requirements     TEXT[],
        education        VARCHAR(100),
        experience       VARCHAR(50),
        hours            VARCHAR(50),
        openings         VARCHAR(10) DEFAULT '1',
        fresher_ok       BOOLEAN DEFAULT FALSE,
        featured         BOOLEAN DEFAULT FALSE,
        urgent           BOOLEAN DEFAULT FALSE,
        status           VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
        views            INTEGER DEFAULT 0,
        applicant_count  INTEGER DEFAULT 0,
        expires_at       TIMESTAMPTZ,
        created_at       TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id         SERIAL PRIMARY KEY,
        job_id     INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
        user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status     VARCHAR(20) DEFAULT 'applied',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(job_id, user_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_jobs (
        id         SERIAL PRIMARY KEY,
        job_id     INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
        user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(job_id, user_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id              SERIAL PRIMARY KEY,
        user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
        job_id          INTEGER,
        amount          NUMERIC(10,2),
        status          VARCHAR(20) DEFAULT 'paid',
        category        VARCHAR(20) DEFAULT 'job',
        plan            VARCHAR(30),
        ref_id          INTEGER,
        razorpay_payment_id VARCHAR(100),
        razorpay_order_id   VARCHAR(100),
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id          SERIAL PRIMARY KEY,
        sender_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        job_id      INTEGER REFERENCES jobs(id)  ON DELETE SET NULL,
        content     TEXT NOT NULL,
        read        BOOLEAN DEFAULT FALSE,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id         SERIAL PRIMARY KEY,
        rater_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
        rated_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
        job_id     INTEGER REFERENCES jobs(id)  ON DELETE SET NULL,
        score      INTEGER CHECK (score BETWEEN 1 AND 5),
        comment    TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(rater_id, rated_id, job_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS job_alerts (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
        category   VARCHAR(50),
        keywords   TEXT,
        push_token TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS job_reports (
        id         SERIAL PRIMARY KEY,
        job_id     INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
        user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reason     TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(job_id, user_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id            SERIAL PRIMARY KEY,
        posted_by     INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title         VARCHAR(200) NOT NULL,
        type          VARCHAR(50),
        brand         VARCHAR(100),
        model         VARCHAR(100),
        year          INTEGER,
        km_driven     INTEGER,
        fuel          VARCHAR(30),
        transmission  VARCHAR(30),
        price         INTEGER NOT NULL,
        area          VARCHAR(100),
        address       TEXT,
        owner_name    VARCHAR(100),
        whatsapp      VARCHAR(15),
        description   TEXT,
        photos        JSONB   DEFAULT '[]',
        plan          VARCHAR(20) DEFAULT 'free',
        status        VARCHAR(20) DEFAULT 'active',
        views         INTEGER DEFAULT 0,
        expires_at    TIMESTAMPTZ,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id            SERIAL PRIMARY KEY,
        posted_by     INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title         VARCHAR(200) NOT NULL,
        type          VARCHAR(50),
        bhk           VARCHAR(10),
        rent          INTEGER NOT NULL,
        furnished     VARCHAR(30),
        area          VARCHAR(100),
        address       TEXT,
        landmark      TEXT,
        owner_name    VARCHAR(100),
        whatsapp      VARCHAR(15),
        description   TEXT,
        photos        JSONB    DEFAULT '[]',
        plan          VARCHAR(20) DEFAULT 'free',
        status        VARCHAR(20) DEFAULT 'active',
        views         INTEGER DEFAULT 0,
        expires_at    TIMESTAMPTZ,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS seeker_profiles (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        bio         TEXT,
        skills      TEXT[],
        experience  TEXT,
        education   TEXT,
        location    VARCHAR(100),
        phone       VARCHAR(15),
        available   BOOLEAN DEFAULT TRUE,
        resume_url  TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS business_promotions (
        id           SERIAL PRIMARY KEY,
        posted_by    INTEGER REFERENCES users(id) ON DELETE CASCADE,
        business_name VARCHAR(200) NOT NULL,
        category     VARCHAR(100),
        phone        VARCHAR(15),
        whatsapp     VARCHAR(15),
        logo_url     TEXT,
        status       VARCHAR(20) DEFAULT 'active',
        views        INTEGER DEFAULT 0,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_sessions (
        phone       VARCHAR(15) PRIMARY KEY,
        otp_hash    TEXT        NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        attempts    INT         DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS buysell_items (
        id          SERIAL PRIMARY KEY,
        posted_by   INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title       VARCHAR(200) NOT NULL,
        category    VARCHAR(50)  DEFAULT 'Other',
        condition   VARCHAR(50)  DEFAULT 'Good',
        age         VARCHAR(50),
        price       INTEGER      NOT NULL,
        negotiable  BOOLEAN      DEFAULT TRUE,
        area        VARCHAR(100),
        description TEXT,
        whatsapp    VARCHAR(15)  NOT NULL,
        photos      JSONB        DEFAULT '[]',
        plan_days   INTEGER      DEFAULT 15,
        plan_label  VARCHAR(30),
        plan_price  INTEGER,
        expires_at  TIMESTAMPTZ,
        status      VARCHAR(20)  DEFAULT 'active',
        created_at  TIMESTAMPTZ  DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS coupon_codes (
        id            SERIAL PRIMARY KEY,
        code          VARCHAR(30)  UNIQUE NOT NULL,
        type          VARCHAR(20)  NOT NULL CHECK (type IN ('percent','flat','free_days')),
        value         INTEGER      NOT NULL,
        max_uses      INTEGER      DEFAULT NULL,
        uses_count    INTEGER      DEFAULT 0,
        valid_from    TIMESTAMPTZ  DEFAULT NOW(),
        valid_until   TIMESTAMPTZ  DEFAULT NULL,
        applies_to    TEXT[]       DEFAULT '{}',
        is_active     BOOLEAN      DEFAULT TRUE,
        created_at    TIMESTAMPTZ  DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS coupon_usage (
        id          SERIAL PRIMARY KEY,
        coupon_id   INTEGER REFERENCES coupon_codes(id) ON DELETE CASCADE,
        user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
        used_at     TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(coupon_id, user_id)
      );
    `);

    // ── Indexes — covering indexes for every hot query path ───────────────────
    const indexes = [
      // users
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id    ON users(google_id) WHERE google_id IS NOT NULL`,
      `CREATE INDEX        IF NOT EXISTS idx_users_reset_token  ON users(reset_token) WHERE reset_token IS NOT NULL`,
      `CREATE INDEX        IF NOT EXISTS idx_users_email        ON users(email)`,
      `CREATE INDEX        IF NOT EXISTS idx_users_push_token   ON users(push_token) WHERE push_token IS NOT NULL`,

      // jobs — covering index for the main list query (status + district + ordering)
      `CREATE INDEX IF NOT EXISTS idx_jobs_status       ON jobs(status)`,
      `CREATE INDEX IF NOT EXISTS idx_jobs_category     ON jobs(category)`,
      `CREATE INDEX IF NOT EXISTS idx_jobs_posted_by    ON jobs(posted_by)`,
      `CREATE INDEX IF NOT EXISTS idx_jobs_district     ON jobs(district)`,
      `CREATE INDEX IF NOT EXISTS idx_jobs_expires      ON jobs(expires_at) WHERE expires_at IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS idx_jobs_featured_hot ON jobs(featured DESC, urgent DESC, created_at DESC) WHERE status='active'`,
      // Full-text search on title+company (much faster than ILIKE)
      `CREATE INDEX IF NOT EXISTS idx_jobs_fts ON jobs USING gin(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(company,'')))`,

      // applications
      `CREATE INDEX IF NOT EXISTS idx_apps_job_id    ON applications(job_id)`,
      `CREATE INDEX IF NOT EXISTS idx_apps_user_id   ON applications(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_apps_status    ON applications(status)`,

      // vehicles / rooms / buysell
      `CREATE INDEX IF NOT EXISTS idx_vehicles_status   ON vehicles(status)`,
      `CREATE INDEX IF NOT EXISTS idx_vehicles_district ON vehicles(district)`,
      `CREATE INDEX IF NOT EXISTS idx_rooms_status      ON rooms(status)`,
      `CREATE INDEX IF NOT EXISTS idx_rooms_district    ON rooms(district)`,
      `CREATE INDEX IF NOT EXISTS idx_buysell_status    ON buysell_items(status)`,
      `CREATE INDEX IF NOT EXISTS idx_buysell_district  ON buysell_items(district)`,

      // messages
      `CREATE INDEX IF NOT EXISTS idx_messages_sender    ON messages(sender_id)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_receiver  ON messages(receiver_id)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_thread    ON messages(sender_id, receiver_id, job_id)`,

      // misc
      `CREATE INDEX IF NOT EXISTS idx_ratings_rated  ON ratings(rated_id)`,
      `CREATE INDEX IF NOT EXISTS idx_alerts_user    ON job_alerts(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_seeker_user    ON seeker_profiles(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_promos_status  ON business_promotions(status)`,
      `CREATE INDEX IF NOT EXISTS idx_reports_job    ON job_reports(job_id)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_razorpay ON payments(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL`,
    ];

    for (const sql of indexes) {
      try { await client.query(sql); } catch (e) { console.warn('Index warn (non-fatal):', e.message); }
    }

    // ── Data fixes ────────────────────────────────────────────────────────────
    try {
      await client.query(`
        UPDATE payments SET amount = ROUND(amount / 100.0)
        WHERE status = 'paid' AND amount > 500
      `);
    } catch (e) { console.warn('Payment paise-fix warning:', e.message); }

    await client.query(`UPDATE users SET role = 'user' WHERE role NOT IN ('user', 'admin')`);
    await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
    await client.query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'))`);

    // Seed admin
    try {
      const bcrypt     = require('bcryptjs');
      const adminEmail = process.env.ADMIN_EMAIL    || 'admin@cityplus.app';
      const adminPass  = process.env.ADMIN_PASSWORD || 'ChangeMe@2025!';
      const adminHash  = await bcrypt.hash(adminPass, 10);
      await client.query(`
        INSERT INTO users (name, email, password, role)
        VALUES ('Admin', $1, $2, 'admin')
        ON CONFLICT (email) DO UPDATE SET role = 'admin';
      `, [adminEmail, adminHash]);
    } catch (e) { console.warn('Admin seed warning:', e.message); }

    // Seed WELCOME coupon — 100% off, valid 30 days from deploy, one use per user
    try {
      await client.query(`
        INSERT INTO coupon_codes (code, type, value, max_uses, is_active, applies_to, valid_until)
        VALUES ('WELCOME', 'percent', 100, NULL, TRUE, '{}', NOW() + INTERVAL '30 days')
        ON CONFLICT (code) DO UPDATE SET
          type      = 'percent',
          value     = 100,
          is_active = TRUE,
          valid_until = CASE
            WHEN coupon_codes.valid_until IS NULL OR coupon_codes.valid_until < NOW()
            THEN NOW() + INTERVAL '30 days'
            ELSE coupon_codes.valid_until
          END;
      `);
      console.log('✅ WELCOME coupon seeded (100% off, 30 days).');
    } catch (e) { console.warn('WELCOME coupon seed warning:', e.message); }

    console.log('✅ Database migrations complete.');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, cache, runMigrations };
