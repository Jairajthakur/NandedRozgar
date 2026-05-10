-- NandedRozgar Database Schema
-- Run this once to set up your PostgreSQL database on Railway

-- ── USERS ──
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('seeker','giver')),
  phone       VARCHAR(20) DEFAULT '',
  company     VARCHAR(150) DEFAULT '',
  avatar      VARCHAR(5) DEFAULT 'U',
  location    VARCHAR(100) DEFAULT 'Nanded',
  bio         TEXT DEFAULT '',
  skills      TEXT DEFAULT '',
  active      BOOLEAN DEFAULT true,
  premium     BOOLEAN DEFAULT false,
  plan_expiry TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── JOBS ──
CREATE TABLE IF NOT EXISTS jobs (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  company     VARCHAR(150) NOT NULL,
  category    VARCHAR(100) DEFAULT 'Other',
  location    VARCHAR(150) NOT NULL,
  salary      VARCHAR(100) NOT NULL,
  type        VARCHAR(50) DEFAULT 'Full-time',
  phone       VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  featured    BOOLEAN DEFAULT false,
  urgent      BOOLEAN DEFAULT false,
  posted_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status      VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','deleted','paused')),
  views       INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── APPLICATIONS ──
CREATE TABLE IF NOT EXISTS applications (
  id         SERIAL PRIMARY KEY,
  job_id     INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, user_id)
);

-- ── SAVED JOBS ──
CREATE TABLE IF NOT EXISTS saved_jobs (
  id         SERIAL PRIMARY KEY,
  job_id     INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, user_id)
);

-- ── TRANSACTIONS ──
CREATE TABLE IF NOT EXISTS transactions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  plan        VARCHAR(50),
  amount      INTEGER NOT NULL,
  description TEXT,
  status      VARCHAR(20) DEFAULT 'success',
  method      VARCHAR(30) DEFAULT 'card',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES for performance ──
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by ON jobs(posted_by);
CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);

-- ── SEED SAMPLE JOBS (optional, delete if not needed) ──
INSERT INTO users (name, email, password, role, phone, company, avatar, location, active, premium)
VALUES ('Ramesh Patil', 'ramesh@gmail.com', '$2a$10$XQCg1z6S.kMDXRvGSS8FTeRThkDI7e4dxY3P6e0C3oAqPGhGm1R3i', 'giver', '9812345678', 'Patil Builders', 'R', 'Nanded', true, true)
ON CONFLICT (email) DO NOTHING;
-- Default password for demo: pass123

INSERT INTO jobs (title, company, category, location, salary, type, phone, description, featured, urgent, posted_by, views)
SELECT 'Security Guard Needed','Nanded City Residency','Security','Shivaji Nagar, Nanded','₹12,000/month','Full-time','9876543210','Night shift security guard needed for residential society. 12 hour shift. Uniform & food provided.',true,false,id,142
FROM users WHERE email='ramesh@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO jobs (title, company, category, location, salary, type, phone, description, featured, urgent, posted_by, views)
SELECT 'Delivery Boy – Bike Required','QuickBites Hub','Delivery','Vazirabad, Nanded','₹15,000–₹22,000/month','Part-time','9765432100','Own bike required. Flexible hours. Weekly payout. Good incentives during peak hours.',true,true,id,98
FROM users WHERE email='ramesh@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO jobs (title, company, category, location, salary, type, phone, description, featured, urgent, posted_by, views)
SELECT 'House Cook – Marathi Cuisine','Private Family','Domestic Help','Nanded City, Nanded','₹8,000/month','Full-time','9654321009','Morning shift only. 2 hours daily. Cooking for family of 4. Only vegetarian food required.',false,false,id,67
FROM users WHERE email='ramesh@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO jobs (title, company, category, location, salary, type, phone, description, featured, urgent, posted_by, views)
SELECT 'Electrician – Apartment Complex','Skyline Builders','Electrician','Cidco, Nanded','₹18,000/month','Contract','9543210098','3 months project. Wiring, panel installation, maintenance work. ITI certificate preferred.',false,true,id,45
FROM users WHERE email='ramesh@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO jobs (title, company, category, location, salary, type, phone, description, featured, urgent, posted_by, views)
SELECT 'Shop Assistant – Kirana Store','Patil General Stores','Shop Assistant','Ganesh Nagar, Nanded','₹7,500/month','Full-time','9432100987','Billing, stacking, customer service. 10am–8pm. Sunday off. No experience needed.',false,false,id,33
FROM users WHERE email='ramesh@gmail.com'
ON CONFLICT DO NOTHING;
