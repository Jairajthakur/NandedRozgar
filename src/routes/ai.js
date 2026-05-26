const router    = require('express').Router();
const rateLimit = require('express-rate-limit');
const { auth } = require('../middleware/auth');
const { pool } = require('../db');

// Rate limiter: 20 AI requests per user per 10 minutes.
// Keyed on authenticated user ID (not IP) so VPNs / shared IPs don't interfere.
// auth middleware runs first, so req.user is always populated here.
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  keyGenerator: (req) => `ai_user_${req.user?.id || req.ip}`,
  message: { ok: false, error: 'Too many AI requests. Please wait a few minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Groq model — update here if deprecated. See: https://console.groq.com/docs/deprecations
// Active models: llama-3.1-8b-instant | llama-3.3-70b-versatile | gemma2-9b-it
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

// POST /api/ai/chat — powered by Groq (free, fast, no restrictions)
router.post('/chat', auth, aiLimiter, async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.json({
      ok: false,
      error: 'Add GROQ_API_KEY to Railway variables. Get free key at https://console.groq.com',
    });
  }

  const { query, userLocation, history = [] } = req.body;
  if (!query || !query.trim()) {
    return res.json({ ok: false, error: 'Query is required.' });
  }

  // Bug #5 fix: cap query length to prevent token-burn via oversized payloads
  if (query.trim().length > 2000) {
    return res.json({ ok: false, error: 'Query is too long (max 2000 characters).' });
  }

  try {
    const { rows: jobs } = await pool.query(
      `SELECT title, company, location, salary, type, category
       FROM jobs WHERE status = 'active' ORDER BY created_at DESC LIMIT 30`
    );

    const catMap = {};
    jobs.forEach(j => { catMap[j.category] = (catMap[j.category] || 0) + 1; });
    const catSummary = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `${cat}: ${count}`).join(', ');

    const jobList = jobs
      .map(j => `• ${j.title} at ${j.company} (${j.location}) — ${j.salary}, ${j.type}`)
      .join('\n');

    const systemPrompt = [
      'You are CityPlus AI — a smart, friendly assistant for the CityPlus platform in Nanded, Maharashtra, India.',
      `Platform owner: ${req.user.name || 'Admin'}. Location: ${userLocation || 'Nanded'}.`,
      `Active listings: ${jobs.length}. Categories: ${catSummary || 'none yet'}.`,
      jobs.length > 0 ? `Current listings:\n${jobList}` : 'No active listings currently.',
      'Help with: jobs, rooms, vehicles, buy & sell, salaries, job descriptions, hiring tips, market insights.',
      'Use ₹ for INR. Max 180 words. Be specific and friendly. Use bullet points for lists.',
    ].join('\n');

    // Bug #2 fix: whitelist role to 'user'|'assistant' only — prevents injecting
    // { role: 'system', content: '...' } messages that override the system prompt.
    // Bug #5 fix: cap each history message to 1000 chars to prevent token-burn
    //             via 8 × huge-message payloads that slip past the rate limiter.
    const HISTORY_MSG_MAX = 1000;
    const sanitisedHistory = history
      .filter(h =>
        (h.role === 'user' || h.role === 'assistant') &&
        typeof h.content === 'string' &&
        h.content.trim().length > 0
      )
      .slice(-8)
      .map(h => ({ role: h.role, content: h.content.trim().slice(0, HISTORY_MSG_MAX) }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...sanitisedHistory,
      { role: 'user', content: query.trim() },
    ];

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const data = await groqRes.json();
    const text = data?.choices?.[0]?.message?.content;

    if (text) return res.json({ ok: true, reply: text });

    const errMsg = data?.error?.message || 'AI did not return a response.';
    return res.json({ ok: false, error: errMsg });
  } catch (err) {
    console.error('AI route error:', err.message);
    return res.json({ ok: false, error: 'AI service error. Please try again.' });
  }
});

module.exports = router;
