const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { pool } = require('../db');

// POST /api/ai/chat
// Proxies the request to Anthropic so the API key stays on the server.
// Requires ANTHROPIC_API_KEY in your Railway environment variables.
router.post('/chat', auth, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.json({
      ok: false,
      error: 'AI is not configured yet. Add ANTHROPIC_API_KEY to your Railway environment variables.',
    });
  }

  const { query, role, userLocation } = req.body;
  if (!query || !query.trim()) {
    return res.json({ ok: false, error: 'Query is required.' });
  }

  try {
    // Fetch active jobs to give the AI context about current listings
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

    // Anthropic returned an error object
    const errMsg = data.error?.message || 'AI did not return a response.';
    return res.json({ ok: false, error: errMsg });
  } catch (err) {
    console.error('AI route error:', err.message);
    return res.json({ ok: false, error: 'AI service error. Please try again.' });
  }
});

module.exports = router;
