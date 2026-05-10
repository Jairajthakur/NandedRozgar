const router = require('express').Router();
const { auth } = require('../middleware/auth');

// POST /api/ai/chat
// Proxies requests to Anthropic so the API key stays on the server
router.post('/chat', auth, async (req, res) => {
  const { system, message } = req.body;

  if (!message || !message.trim()) {
    return res.json({ ok: false, error: 'Message is required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.json({ ok: false, error: 'AI service not configured' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: system || 'You are a helpful job assistant for Nanded, India.',
        messages: [{ role: 'user', content: message }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic error:', data);
      return res.json({ ok: false, error: 'AI service error. Please try again.' });
    }

    const text = data.content?.[0]?.text || 'No response received.';
    res.json({ ok: true, text });
  } catch (err) {
    console.error('AI route error:', err);
    res.json({ ok: false, error: 'Network error connecting to AI.' });
  }
});

module.exports = router;
