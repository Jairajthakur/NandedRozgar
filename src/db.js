const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ✅ Auto-creates all tables on server start
async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('⚙️  Running database migrations...');

    await client.query(`
      -- USERS table
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100),
        email       VARCHAR(200) UNIQUE NOT NULL,
        password    VARCHAR(200) NOT NULL,
        phone       VARCHAR(15),
        company     VARCHAR(100),
        role        VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        premium     BOOLEAN DEFAULT FALSE,
        active      BOOLEAN DEFAULT TRUE,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      -- JOBS table
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
      -- JOB APPLICATIONS table
      CREATE TABLE IF NOT EXISTS applications (
        id         SERIAL PRIMARY KEY,
        job_id     INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
        user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(job_id, user_id)
      );
    `);

    await client.query(`
      -- SAVED JOBS table
      CREATE TABLE IF NOT EXISTS saved_jobs (
        id         SERIAL PRIMARY KEY,
        job_id     INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
        user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(job_id, user_id)
      );
    `);

    await client.query(`
      -- PAYMENTS table
      CREATE TABLE IF NOT EXISTS payments (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
        job_id      INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
        amount      INTEGER NOT NULL,
        plan        VARCHAR(50),
        status      VARCHAR(20) DEFAULT 'paid',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── VEHICLES table ────────────────────────────────────────────────────────
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

    // ── ROOMS table ───────────────────────────────────────────────────────────
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

    // Indexes for performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_status      ON jobs(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_category    ON jobs(category);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_posted_by   ON jobs(posted_by);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_apps_job_id      ON applications(job_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_apps_user_id     ON applications(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_vehicles_status  ON vehicles(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_vehicles_expires ON vehicles(expires_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_rooms_status     ON rooms(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_rooms_expires    ON rooms(expires_at);`);

    // ── Fix legacy DB issues safely ───────────────────────────────────────────
    // 1. Add premium column if missing
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS premium BOOLEAN DEFAULT FALSE;`);

    // 2. Fix any rows with invalid role values (old schema may have used 'employer'/'seeker')
    await client.query(`UPDATE users SET role = 'user' WHERE role NOT IN ('user', 'admin');`);

    // ── Add missing jobs columns (safe for existing tables) ─────────────────
    const jobCols = [
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(15)`,
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS skills TEXT[]`,
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS requirements TEXT[]`,
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS education VARCHAR(100)`,
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience VARCHAR(50)`,
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS hours VARCHAR(50)`,
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS openings VARCHAR(10) DEFAULT '1'`,
    ];
    for (const sql of jobCols) {
      try { await client.query(sql); } catch (e) { console.warn('Col warn:', e.message); }
    }
    // ──────────────────────────────────────────────────────────────────────────

    // 3. Drop and recreate role constraint cleanly
    await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;`);
    await client.query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));`);
    // ─────────────────────────────────────────────────────────────────────────

    // Seed default admin
    try {
      const bcrypt = require('bcryptjs');
      const adminPass = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
      await client.query(`
        INSERT INTO users (name, email, password, role)
        VALUES ('Admin', $1, $2, 'admin')
        ON CONFLICT (email) DO NOTHING;
      `, [process.env.ADMIN_EMAIL || 'admin@nandedrozgar.com', adminPass]);
    } catch (e) {
      console.warn('⚠️  Admin seed warning (non-fatal):', e.message);
    }

    // Seed free test user (can post without payment)
    try {
      const bcrypt = require('bcryptjs');
      const testPass = await bcrypt.hash('test@123', 10);
      await client.query(`
        INSERT INTO users (name, email, password, role, premium, phone)
        VALUES ('Test User', 'test@nandedrozgar.com', $1, 'user', TRUE, '9999999999')
        ON CONFLICT (email) DO UPDATE SET premium = TRUE;
      `, [testPass]);
      console.log('✅ Test user ready: test@nandedrozgar.com / test@123');
    } catch (e) {
      console.warn('⚠️  Test user seed warning (non-fatal):', e.message);
    }

    console.log('✅ Database migrations complete. All tables ready!');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, runMigrations };
