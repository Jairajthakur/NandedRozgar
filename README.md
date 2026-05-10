# NandedRozgar 🏙️
**Local Jobs Platform for Nanded City**

---

## 📁 Project Structure
```
nandedrozgar/
├── server/
│   ├── index.js      ← Express API server
│   └── schema.sql    ← PostgreSQL database tables
├── client/
│   └── index.html    ← Frontend app
├── package.json
├── railway.toml
└── .env.example
```

---

## 🚀 Deploy on Railway (Step by Step)

### Step 1 — Create GitHub Repository
1. Go to https://github.com → click **New repository**
2. Name it `nandedrozgar`, set to **Private**
3. Click **Create repository**
4. Upload all files from this folder to GitHub

### Step 2 — Deploy on Railway
1. Go to https://railway.app → **Login with GitHub**
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `nandedrozgar` repo → click **Deploy Now**

### Step 3 — Add PostgreSQL Database
1. In your Railway project, click **+ New** → **Database** → **PostgreSQL**
2. Railway automatically sets `DATABASE_URL` for you ✅

### Step 4 — Set Environment Variables
In Railway → your app service → **Variables** tab, add:

| Variable | Value |
|---|---|
| `JWT_SECRET` | `any_long_random_string_here` |
| `ADMIN_EMAIL` | `admin@nandedrozgar.in` |
| `ADMIN_PASSWORD` | `your_admin_password` |
| `NODE_ENV` | `production` |

> `DATABASE_URL` is set automatically by Railway — do NOT add it manually.

### Step 5 — Run Database Schema
1. In Railway → PostgreSQL service → **Query** tab
2. Copy everything from `server/schema.sql`
3. Paste and click **Run Query**
4. This creates all tables and sample data ✅

### Step 6 — Get Your Live URL
1. Railway app service → **Settings** → **Generate Domain**
2. Your app is live at: `https://nandedrozgar-xxxx.up.railway.app` 🎉

---

## 🔐 Admin Login
- Email: `admin@nandedrozgar.in`
- Password: whatever you set in `ADMIN_PASSWORD`

## 👷 Demo Employer Login (after running schema.sql)
- Email: `ramesh@gmail.com`
- Password: `pass123`

---

## 🛠️ Local Development
```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your local PostgreSQL credentials

# Run server
npm run dev

# Open browser
open http://localhost:3000
```

---

## 📊 API Endpoints
| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| GET | /api/jobs | List all jobs |
| POST | /api/jobs | Post a job |
| DELETE | /api/jobs/:id | Delete job |
| POST | /api/jobs/:id/apply | Apply to job |
| POST | /api/jobs/:id/save | Save/unsave job |
| POST | /api/payments | Process payment |
| GET | /api/admin/users | Admin: list users |
| PATCH | /api/admin/users/:id/toggle | Admin: ban/unban |
| PATCH | /api/admin/users/:id/grant-pro | Admin: grant PRO |
