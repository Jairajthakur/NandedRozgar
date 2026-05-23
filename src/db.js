const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

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
        created_at       TIMESTAMPTZ DEFAULT NOW()
      );
    `);

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

    // Applications table with status tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id         SERIAL PRIMARY KEY,
        job_id     INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
        user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status     VARCHAR(20) DEFAULT 'applied'
                   CHECK (status IN ('applied', 'reviewed', 'shortlisted', 'rejected', 'hired')),
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

    // Payments table now stores Razorpay IDs for audit trail
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id                    SERIAL PRIMARY KEY,
        user_id               INTEGER REFERENCES users(id) ON DELETE SET NULL,
        job_id                INTEGER REFERENCES jobs(id)  ON DELETE SET NULL,
        amount                INTEGER NOT NULL,
        plan                  VARCHAR(50),
        razorpay_payment_id   VARCHAR(100),
        razorpay_order_id     VARCHAR(100),
        status                VARCHAR(20) DEFAULT 'paid',
        created_at            TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Job reports table (was missing before — caused silent failures)
    await client.query(`
      CREATE TABLE IF NOT EXISTS job_reports (
        id         SERIAL PRIMARY KEY,
        job_id     INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
        user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reason     VARCHAR(200),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(job_id, user_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id            SERIAL PRIMARY KEY,
        posted_by     INTEGER REFERENCES users(id) ON DELETE CASCADE,
        vehicle_type  VARCHAR(50),
        name          VARCHAR(200) NOT NULL,
        year          VARCHAR(10),
        color         VARCHAR(50),
        fuel_type     VARCHAR(30),
        transmission  VARCHAR(30),
        ac_type       VARCHAR(20),
        seats         VARCHAR(10),
        daily_rate    VARCHAR(20),
        hourly_rate   VARCHAR(20),
        km_limit      VARCHAR(20),
        extra_km_rate VARCHAR(20),
        min_booking   VARCHAR(20),
        advance_amt   VARCHAR(20),
        purpose       JSONB    DEFAULT '[]',
        includes      JSONB    DEFAULT '[]',
        availability  VARCHAR(50),
        area          VARCHAR(100),
        address       VARCHAR(200),
        owner_name    VARCHAR(100),
        whatsapp      VARCHAR(15),
        description   TEXT,
        photos        JSONB    DEFAULT '[]',
        plan_days     INTEGER  DEFAULT 30,
        plan_label    VARCHAR(30),
        plan_price    INTEGER,
        status        VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','deleted')),
        expires_at    TIMESTAMPTZ,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id            SERIAL PRIMARY KEY,
        posted_by     INTEGER REFERENCES users(id) ON DELETE CASCADE,
        room_type     VARCHAR(50),
        for_gender    VARCHAR(20),
        furnished     VARCHAR(30),
        floor         VARCHAR(20),
        total_floors  VARCHAR(10),
        bhk_size      VARCHAR(20),
        facing        VARCHAR(30),
        vacancies     INTEGER DEFAULT 1,
        rent          VARCHAR(20),
        deposit       VARCHAR(20),
        maintenance   VARCHAR(20),
        broker_free   BOOLEAN DEFAULT TRUE,
        amenities     JSONB   DEFAULT '[]',
        rules         JSONB   DEFAULT '[]',
        available_from VARCHAR(50),
        tenant_pref   VARCHAR(30),
        area          VARCHAR(100),
        address       VARCHAR(200),
        landmark      VARCHAR(200),
        owner_name    VARCHAR(100),
        whatsapp      VARCHAR(15),
        description   TEXT,
        photos        JSONB   DEFAULT '[]',
        plan_days     INTEGER DEFAULT 30,
        plan_label    VARCHAR(30),
        plan_price    INTEGER,
        status        VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','deleted')),
        expires_at    TIMESTAMPTZ,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── MESSAGES (in-app chat) ────────────────────────────────────────────────
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

    // ── RATINGS ───────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id         SERIAL PRIMARY KEY,
        job_id     INTEGER REFERENCES jobs(id)  ON DELETE CASCADE,
        rater_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
        rated_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
        stars      INTEGER CHECK (stars BETWEEN 1 AND 5),
        comment    TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(job_id, rater_id)
      );
    `);

    // ── JOB ALERTS ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS job_alerts (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
        category   VARCHAR(50),
        keywords   TEXT,
        push_token TEXT,
        active     BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, category)
      );
    `);

    // ── BUSINESS PROMOTIONS ───────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS business_promotions (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
        biz_name     VARCHAR(100) NOT NULL,
        tagline      VARCHAR(100),
        phone        VARCHAR(15) NOT NULL,
        category     VARCHAR(60),
        location     VARCHAR(60),
        address      TEXT,
        website      VARCHAR(200),
        description  TEXT,
        plan         VARCHAR(20) NOT NULL,
        plan_price   INTEGER NOT NULL,
        plan_days    INTEGER NOT NULL,
        banner_style VARCHAR(20) DEFAULT 'bold',
        accent_color VARCHAR(20),
        timing       VARCHAR(100),
        template_id  INTEGER,
        status       VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','active','rejected','expired')),
        expires_at   TIMESTAMPTZ,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── SEEKER PROFILES ───────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS seeker_profiles (
        id              SERIAL PRIMARY KEY,
        user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        headline        VARCHAR(200),
        bio             TEXT,
        skills          TEXT[],
        experience      VARCHAR(50),
        education       VARCHAR(100),
        location        VARCHAR(100),
        expected_salary VARCHAR(50),
        open_to_work    BOOLEAN DEFAULT TRUE,
        resume_url      TEXT,
        updated_at      TIMESTAMPTZ DEFAULT NOW()
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

    // ── Coupon codes ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS coupon_codes (
        id            SERIAL PRIMARY KEY,
        code          VARCHAR(30)  UNIQUE NOT NULL,
        type          VARCHAR(20)  NOT NULL CHECK (type IN ('percent','flat','free_days')),
        value         INTEGER      NOT NULL,        -- % off | ₹ off | free days
        max_uses      INTEGER      DEFAULT NULL,    -- NULL = unlimited
        uses_count    INTEGER      DEFAULT 0,
        valid_from    TIMESTAMPTZ  DEFAULT NOW(),
        valid_until   TIMESTAMPTZ  DEFAULT NULL,    -- NULL = no expiry
        applies_to    TEXT[]       DEFAULT '{}',    -- [] = all listing types
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

    // ── Safe ALTER for existing deployments (must run BEFORE indexes) ────────
    const safeAlters = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS premium          BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS verified         BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_credits INTEGER DEFAULT 0`,
      // Auth feature columns — safe for existing deployments
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id     VARCHAR(200)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url    TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token   VARCHAR(200)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMPTZ`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen     TIMESTAMPTZ`,
      // Allow NULL email/password for Google & Phone OTP sign-ups
      `ALTER TABLE users ALTER COLUMN email    DROP NOT NULL`,
      `ALTER TABLE users ALTER COLUMN password DROP NOT NULL`,
      `ALTER TABLE jobs  ADD COLUMN IF NOT EXISTS whatsapp         VARCHAR(15)`,
      `ALTER TABLE jobs  ADD COLUMN IF NOT EXISTS skills           TEXT[]`,
      `ALTER TABLE jobs  ADD COLUMN IF NOT EXISTS requirements     TEXT[]`,
      `ALTER TABLE jobs  ADD COLUMN IF NOT EXISTS education        VARCHAR(100)`,
      `ALTER TABLE jobs  ADD COLUMN IF NOT EXISTS experience       VARCHAR(50)`,
      `ALTER TABLE jobs  ADD COLUMN IF NOT EXISTS hours            VARCHAR(50)`,
      `ALTER TABLE jobs  ADD COLUMN IF NOT EXISTS openings         VARCHAR(10) DEFAULT '1'`,
      `ALTER TABLE jobs      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`,
      `ALTER TABLE applications ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'applied'`,
      `ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100)`,
      `ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_order_id  VARCHAR(100)`,
      `ALTER TABLE payments  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'paid'`,
      `ALTER TABLE vehicles  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`,
      `ALTER TABLE vehicles  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`,
      `ALTER TABLE vehicles  ADD COLUMN IF NOT EXISTS plan_days  INTEGER DEFAULT 30`,
      `ALTER TABLE vehicles  ADD COLUMN IF NOT EXISTS plan_label VARCHAR(30)`,
      `ALTER TABLE vehicles  ADD COLUMN IF NOT EXISTS plan_price INTEGER`,
      `ALTER TABLE rooms     ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`,
      `ALTER TABLE rooms     ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`,
      `ALTER TABLE rooms     ADD COLUMN IF NOT EXISTS plan_days  INTEGER DEFAULT 30`,
      `ALTER TABLE rooms     ADD COLUMN IF NOT EXISTS plan_label VARCHAR(30)`,
      `ALTER TABLE seeker_profiles ADD COLUMN IF NOT EXISTS resume_url TEXT`,
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fresher_ok BOOLEAN DEFAULT FALSE`,

      // ── business_promotions columns added in later versions ──────────────────
      // These are NO-OPs if the column already exists, but critical for databases
      // that were created before banner_style / accent_color were introduced.
      // Without them the INSERT in POST /api/promotions crashes silently.
      `ALTER TABLE business_promotions ADD COLUMN IF NOT EXISTS banner_style  VARCHAR(20) DEFAULT 'bold'`,
      `ALTER TABLE business_promotions ADD COLUMN IF NOT EXISTS accent_color  VARCHAR(20)`,
      `ALTER TABLE business_promotions ADD COLUMN IF NOT EXISTS plan_price    INTEGER`,
      `ALTER TABLE business_promotions ADD COLUMN IF NOT EXISTS plan_days     INTEGER`,
      `ALTER TABLE business_promotions ADD COLUMN IF NOT EXISTS website       VARCHAR(200)`,
      `ALTER TABLE business_promotions ADD COLUMN IF NOT EXISTS description   TEXT`,
      `ALTER TABLE business_promotions ADD COLUMN IF NOT EXISTS address       TEXT`,
      `ALTER TABLE business_promotions ADD COLUMN IF NOT EXISTS tagline       VARCHAR(100)`,
      `ALTER TABLE business_promotions ADD COLUMN IF NOT EXISTS expires_at    TIMESTAMPTZ`,
      `ALTER TABLE business_promotions ADD COLUMN IF NOT EXISTS timing        VARCHAR(100)`,
      `ALTER TABLE business_promotions ADD COLUMN IF NOT EXISTS template_id   INTEGER`,
      `ALTER TABLE rooms               ADD COLUMN IF NOT EXISTS plan_price    INTEGER`,
    ];
    for (const sql of safeAlters) {
      try { await client.query(sql); } catch (e) { console.warn('Alter warn (non-fatal):', e.message); }
    }

    // ── Indexes (run AFTER alters so all columns exist) ───────────────────────
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL`);

    // (OTP storage removed — Firebase Auth handles OTP sending and verification client-side.
    //  Our backend only verifies the Firebase ID token via firebase-admin.)

    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_status      ON jobs(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_category    ON jobs(category);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_posted_by   ON jobs(posted_by);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_apps_job_id      ON applications(job_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_apps_user_id     ON applications(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_apps_status      ON applications(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_vehicles_status  ON vehicles(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_rooms_status     ON rooms(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_job      ON job_reports(job_id);`);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_sender   ON messages(sender_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ratings_rated     ON ratings(rated_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_alerts_user       ON job_alerts(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_seeker_user       ON seeker_profiles(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_promos_status     ON business_promotions(status);`);

    // ── Fix payments stored in paise instead of rupees ────────────────────────
    // Razorpay amounts are in paise; older code saved them raw (e.g. ₹249 → 24900).
    // All current plans are ≤ ₹499, so any amount > 500 is still in paise → divide by 100.
    // This guard (amount > 500) makes the migration safe to run on every startup.
    try {
      const fixResult = await client.query(`
        UPDATE payments
        SET amount = ROUND(amount / 100.0)
        WHERE status = 'paid' AND amount > 500
      `);
      if (fixResult.rowCount > 0) {
        console.log(`💰 Fixed ${fixResult.rowCount} payment record(s): converted paise → rupees.`);
      }
    } catch (e) {
      console.warn('⚠️  Payment paise-fix warning (non-fatal):', e.message);
    }

    // Fix any legacy invalid role values
    await client.query(`UPDATE users SET role = 'user' WHERE role NOT IN ('user', 'admin');`);
    await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;`);
    await client.query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));`);

    // ── Seed admin user from environment variables ─────────────────────────────
    // Set ADMIN_EMAIL and ADMIN_PASSWORD in Railway — never hardcode these.
    try {
      const bcrypt     = require('bcryptjs');
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@cityplus.app';
      const adminPass  = process.env.ADMIN_PASSWORD || 'ChangeMe@2025!';
      const adminHash  = await bcrypt.hash(adminPass, 10);
      await client.query(`
        INSERT INTO users (name, email, password, role)
        VALUES ('Admin', $1, $2, 'admin')
        ON CONFLICT (email) DO UPDATE SET role = 'admin';
      `, [adminEmail, adminHash]);
    } catch (e) {
      console.warn('⚠️  Admin seed warning (non-fatal):', e.message);
    }

    console.log('✅ Database migrations complete.');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, runMigrations };
