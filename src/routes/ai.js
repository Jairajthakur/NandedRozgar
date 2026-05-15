const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { pool } = require('../db');

// Rate limiting applied in index.js (10 req/min per IP)
router.post('/chat', auth, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      error: 'AI is not configured. Set ANTHROPIC_API_KEY in your environment.',
    });
  }

  const { query, role, userLocation } = req.body;

  // FIX #10 — validate and cap input size
  if (!query || !query.trim()) {
    return res.status(400).json({ ok: false, error: 'Query is required.' });
  }
  if (query.length > 500) {
    return res.status(400).json({ ok: false, error: 'Query too long (max 500 characters).' });
  }

  try {
    const { rows: jobs } = await pool.query(
      `SELECT title, company, location, salary, type, category
       FROM jobs WHERE status = 'active' ORDER BY created_at DESC LIMIT 10`
    );

    const jobList = jobs
      .map(j => `• ${j.title} at ${j.company} (${j.location}) — ${j.salary}, ${j.type}`)
      .join('\n');

    const isSeeker = role === 'seeker';
    const userCtx = isSeeker
      ? `User: Job Seeker. Location: ${userLocation || 'Nanded'}.`
      : `User: Employer. Company: ${req.user.company || ''}. Location: ${userLocation || 'Nanded'}.`;

    const system = [
      'You are NandedRozgar AI — a helpful, concise career assistant for the Nanded local job market.',
      userCtx,
      jobs.length > 0 ? `Current active jobs:\n${jobList}` : 'No active jobs listed currently.',
      'Be practical, use ₹ for currency, Nanded/India context. Max 150 words. Use bullet points where helpful.',
    ].join('\n');

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system,
        messages: [{ role: 'user', content: query.trim() }],
      }),
    });

    const data = await anthropicRes.json();

    if (data.content && data.content[0]?.text) {
      return res.json({ ok: true, reply: data.content[0].text });
    }

    const errMsg = data.error?.message || 'AI did not return a response.';
    return res.status(502).json({ ok: false, error: errMsg });
  } catch (err) {
    // FIX #17 — do not forward internal error details to client
    console.error('AI route error:', err.message);
    return res.status(500).json({ ok: false, error: 'AI service error. Please try again.' });
  }
});

module.exports = router;
