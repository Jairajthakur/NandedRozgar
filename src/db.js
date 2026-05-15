const { Pool } = require('pg');

// FIX #9 — rejectUnauthorized TRUE in production to prevent MITM on DB connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
});

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('Running database migrations...');

    await client.query(`
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
      CREATE TABLE IF NOT EXISTS applications (
        id         SERIAL PRIMARY KEY,
        job_id     INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
        user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
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
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
        job_id      INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
        amount      INTEGER NOT NULL,
        plan        VARCHAR(50),
        status      VARCHAR(20) DEFAULT 'pending',
        gateway_ref VARCHAR(200),
        created_at  TIMESTAMPTZ DEFAULT NOW()
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

    // FIX #14 — Durable audit log table for all admin actions
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id          SERIAL PRIMARY KEY,
        admin_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action      VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id   VARCHAR(50),
        detail      JSONB,
        ip_address  VARCHAR(45),
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_status      ON jobs(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_category    ON jobs(category);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_posted_by   ON jobs(posted_by);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_apps_job_id      ON applications(job_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_apps_user_id     ON applications(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_vehicles_status  ON vehicles(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_vehicles_expires ON vehicles(expires_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_rooms_status     ON rooms(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_rooms_expires    ON rooms(expires_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_admin_id   ON audit_log(admin_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at);`);

    // Fix legacy DB issues
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS premium BOOLEAN DEFAULT FALSE;`);
    await client.query(`UPDATE users SET role = 'user' WHERE role NOT IN ('user', 'admin');`);
    await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;`);
    await client.query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));`);

    // FIX #2 — Seed admin from env vars only. No hardcoded credentials.
    // FIX #13 — Never log credentials.
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      const bcrypt = require('bcryptjs');
      const adminPass = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
      await client.query(`
        INSERT INTO users (name, email, password, role)
        VALUES ('Admin', $1, $2, 'admin')
        ON CONFLICT (email) DO NOTHING;
      `, [process.env.ADMIN_EMAIL, adminPass]);
      console.log('Admin account ready.');
    } else {
      console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin seed.');
    }

    // FIX #2 — Removed hardcoded test user entirely.

    console.log('Database migrations complete. All tables ready.');
  } catch (err) {
    console.error('Migration error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, runMigrations };
