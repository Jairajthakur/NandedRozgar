const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { pool } = require('../db');


// Groq model — update here if deprecated. See: https://console.groq.com/docs/deprecations
// Active models: llama-3.1-8b-instant | llama-3.3-70b-versatile | gemma2-9b-it
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
// POST /api/ai/chat — powered by Groq (free, fast, no restrictions)
router.post('/chat', auth, async (req, res) => {
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
      'You are NandedRozgar AI — a smart, friendly assistant for the NandedRozgar platform in Nanded, Maharashtra, India.',
      `Platform owner: ${req.user.name || 'Admin'}. Location: ${userLocation || 'Nanded'}.`,
      `Active listings: ${jobs.length}. Categories: ${catSummary || 'none yet'}.`,
      jobs.length > 0 ? `Current listings:\n${jobList}` : 'No active listings currently.',
      'Help with: jobs, rooms, vehicles, buy & sell, salaries, job descriptions, hiring tips, market insights.',
      'Use ₹ for INR. Max 180 words. Be specific and friendly. Use bullet points for lists.',
    ].join('\n');

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.filter(h => h.role && h.content).slice(-8),
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
