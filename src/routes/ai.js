const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { pool } = require('../db');

// POST /api/ai/chat
router.post('/chat', auth, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.json({
      ok: false,
      error: 'AI is not configured yet. Add ANTHROPIC_API_KEY to your Railway environment variables.',
    });
  }

  const { query, role, userLocation, history = [] } = req.body;
  if (!query || !query.trim()) {
    return res.json({ ok: false, error: 'Query is required.' });
  }

  try {
    // Fetch richer job context
    const { rows: jobs } = await pool.query(
      `SELECT title, company, location, salary, type, category, created_at
       FROM jobs WHERE status = 'active' ORDER BY created_at DESC LIMIT 20`
    );

    // Build category summary
    const catMap = {};
    jobs.forEach(j => { catMap[j.category] = (catMap[j.category] || 0) + 1; });
    const catSummary = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `${cat}: ${count} listing${count > 1 ? 's' : ''}`)
      .join(', ');

    const jobList = jobs
      .map(j => `• ${j.title} at ${j.company} (${j.location}) — ${j.salary}, ${j.type}`)
      .join('\n');

    const isSeeker = role === 'seeker';
    const userName = req.user.name || '';
    const userCtx = isSeeker
      ? `User: Job Seeker. Name: ${userName}. Location: ${userLocation || 'Nanded'}.`
      : `User: Employer. Company: ${req.user.company || ''}. Location: ${userLocation || 'Nanded'}.`;

    const system = [
      'You are NandedRozgar AI — a sharp, friendly career assistant for the Nanded local job market in Maharashtra, India.',
      userCtx,
      `Total active listings: ${jobs.length}. Categories: ${catSummary || 'various'}.`,
      jobs.length > 0 ? `Current active jobs:\n${jobList}` : 'No active jobs currently.',
      isSeeker
        ? 'Help the seeker find relevant jobs, improve their application, and understand the local market. Mention specific jobs by name when relevant.'
        : 'Help the employer hire effectively — salary benchmarks, job description writing, candidate screening. Use real market data from listings.',
      'Rules: Use ₹ for INR. Max 160 words. Be specific, practical, and encouraging. Use bullet points for lists. Speak naturally, not robotically.',
    ].join('\n');

    // Build messages with conversation history for multi-turn context
    const messages = [
      ...history
        .filter(h => h.role && h.content)
        .slice(-8) // last 4 exchanges
        .map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: query.trim() },
    ];

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system,
        messages,
      }),
    });

    const data = await anthropicRes.json();

    if (data.content && data.content[0]?.text) {
      return res.json({ ok: true, reply: data.content[0].text });
    }

    const errMsg = data.error?.message || 'AI did not return a response.';
    return res.json({ ok: false, error: errMsg });
  } catch (err) {
    console.error('AI route error:', err.message);
    return res.json({ ok: false, error: 'AI service error. Please try again.' });
  }
});

module.exports = router;
