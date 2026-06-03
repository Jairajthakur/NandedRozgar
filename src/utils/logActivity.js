/**
 * logActivity — shared activity logger for all routes
 * Usage:
 *   const logActivity = require('../utils/logActivity');
 *   await logActivity('job_post', { userId: req.user.id, ip: getIP(req), detail: `Job: ${title}` });
 */
const { pool } = require('../db');

async function logActivity(action, {
  userId    = null,
  status    = 'success',
  ip        = null,
  userAgent = null,
  detail    = null,
} = {}) {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, status, ip, user_agent, detail)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId || null, action, status, ip, userAgent, detail]
    );
  } catch (e) {
    console.warn('[activity_log] Insert failed:', e.message);
  }
}

function getIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || null;
}

function getUA(req) {
  return req.headers['user-agent'] || null;
}

module.exports = { logActivity, getIP, getUA };
