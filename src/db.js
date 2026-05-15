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
        description      TEXT,
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

    // Indexes for performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_status    ON jobs(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_category  ON jobs(category);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_posted_by ON jobs(posted_by);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_apps_job_id    ON applications(job_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_apps_user_id   ON applications(user_id);`);

    // ── Add premium column if it doesn't exist yet (safe for existing DBs) ───
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS premium BOOLEAN DEFAULT FALSE;
    `);
    // ─────────────────────────────────────────────────────────────────────────

    // Seed default admin — wrapped so a seed failure never crashes the server
    try {
      const bcrypt = require('bcryptjs');
      const adminPass = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
      await client.query(`
        INSERT INTO users (name, email, password, role)
        VALUES ('Admin', $1, $2, 'admin')
        ON CONFLICT (email) DO NOTHING;
      `, [process.env.ADMIN_EMAIL || 'admin@nandedrozgar.com', adminPass]);

      // ── Seed a free test user (can post without payment) ───────────────────
      const testPass = await bcrypt.hash('test@123', 10);
      await client.query(`
        INSERT INTO users (name, email, password, role, premium, phone)
        VALUES ('Test User', 'test@nandedrozgar.com', $1, 'user', TRUE, '9999999999')
        ON CONFLICT (email) DO UPDATE SET premium = TRUE;
      `, [testPass]);
      // ───────────────────────────────────────────────────────────────────────
    } catch (seedErr) {
      console.warn('⚠️  Seed warning (non-fatal):', seedErr.message);
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
