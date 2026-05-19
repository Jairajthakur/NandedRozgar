const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { pool } = require('../db');

// POST /api/ai/chat — powered by Google Gemini (free tier)
router.post('/chat', auth, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({
      ok: false,
      error: 'AI is not configured yet. Add GEMINI_API_KEY to your Railway environment variables. Get a free key at https://aistudio.google.com/app/apikey',
    });
  }

  const { query, userLocation, history = [] } = req.body;
  if (!query || !query.trim()) {
    return res.json({ ok: false, error: 'Query is required.' });
  }

  try {
    // Fetch all active jobs for full context
    const { rows: jobs } = await pool.query(
      `SELECT title, company, location, salary, type, category, created_at
       FROM jobs WHERE status = 'active' ORDER BY created_at DESC LIMIT 30`
    );

    const catMap = {};
    jobs.forEach(j => { catMap[j.category] = (catMap[j.category] || 0) + 1; });
    const catSummary = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `${cat}: ${count}`)
      .join(', ');

    const jobList = jobs
      .map(j => `• ${j.title} at ${j.company} (${j.location}) — ${j.salary}, ${j.type}`)
      .join('\n');

    const systemPrompt = [
      'You are NandedRozgar AI — a smart, friendly assistant for the NandedRozgar platform in Nanded, Maharashtra, India.',
      `Platform owner: ${req.user.name || 'Admin'}. Location: ${userLocation || 'Nanded'}.`,
      `Total active listings: ${jobs.length}. Categories: ${catSummary || 'none yet'}.`,
      jobs.length > 0 ? `Current active listings:\n${jobList}` : 'No active listings currently.',
      'You help with everything: jobs, rooms, vehicles, buy & sell, salary benchmarks, job descriptions, hiring tips, market insights.',
      'Rules: Use ₹ for INR. Max 180 words per reply. Be specific, practical, and friendly. Use bullet points for lists. Reference actual listings by name when helpful.',
    ].join('\n');

    // Build Gemini contents array (multi-turn history)
    const contents = [];

    // Add conversation history
    history
      .filter(h => h.role && h.content)
      .slice(-8)
      .forEach(h => {
        contents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        });
      });

    // Add current user query
    contents.push({ role: 'user', parts: [{ text: query.trim() }] });

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
          },
        }),
      }
    );

    const data = await geminiRes.json();

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      return res.json({ ok: true, reply: text });
    }

    const errMsg = data?.error?.message || 'AI did not return a response.';
    return res.json({ ok: false, error: errMsg });
  } catch (err) {
    console.error('AI route error:', err.message);
    return res.json({ ok: false, error: 'AI service error. Please try again.' });
  }
});

module.exports = router;
