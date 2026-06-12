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
// 70b is still free on Groq and significantly better for regional salary/job context
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

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

// ── POST /api/ai/voice-fill ────────────────────────────────────────────────────
// Converts a spoken job/room/item/vehicle description into structured form fields.
// Called from VoicePostAssistant.js in the React Native app.
// Uses Groq (same key as /chat) so no extra credentials needed.
//
// Rate limit: 10 requests per user per 10 minutes (tighter than /chat because
// each call involves a longer structured prompt).
const voiceFillLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `voice_fill_${req.user?.id || req.ip}`,
  message: { ok: false, error: 'Too many voice requests. Please wait a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const VOICE_FILL_PROMPTS = {
  job: (langLabel) => `You are a form-filling assistant for a job posting app in Nanded, Maharashtra.
User spoke in ${langLabel}. Extract job details and return ONLY a valid JSON object (no markdown, no extra text):
{
  "title": "Job title in English",
  "company": "Company name if mentioned",
  "industry": "Closest match from: Cafe/Tea Stall Boy, Hotel Waiter, Cook/Chef, Kitchen Helper, Delivery Boy (2-Wheeler), Courier Executive, Auto Driver, Car Driver, Shop Assistant/Helper, Salesman, Mason/Contractor, Electrician, Plumber, Hair Stylist, Data Entry Operator, Receptionist, Field Sales Executive, TeleCaller, School Teacher, Maid/Househelp, Security Guard, Software Developer, Other/Custom",
  "jobType": "One of: Full-time, Part-time, Contract, Freshers Welcome",
  "salaryMin": "number string only e.g. 8000",
  "salaryMax": "number string only e.g. 12000",
  "experience": "One of: Fresher (0 yr), 6 Months, 1 Year, 2 Years, 3 Years, 5+ Years",
  "workHours": "One of: 9 AM - 6 PM, 10 AM - 7 PM, 8 AM - 5 PM, 6 AM - 2 PM, 2 PM - 10 PM, Night Shift, Flexible",
  "education": "One of: none, 10th, 12th, graduate, diploma",
  "skills": ["pick only from: Marathi, Hindi, English, MS Excel, Tally, Typing, Driving Licence, 2-Wheeler, 4-Wheeler, Customer Service, Cooking, Welding, Electrical Work, Plumbing"],
  "description": "2-3 sentence job description in English",
  "requirements": "Requirements in English",
  "address": "Area or locality if mentioned"
}
Rules: JSON only. Omit fields you are unsure about. Translate everything to English.
Salary: "8 se 12 hazar" means salaryMin 8000 salaryMax 12000.`,

  room: (langLabel) => `You are a form-filling assistant for a room/property listing app in Maharashtra.
User spoke in ${langLabel}. Return ONLY valid JSON:
{
  "rent": "monthly rent as number string",
  "deposit": "deposit as number string",
  "salePrice": "sale price if sale listing",
  "saleCarpetArea": "carpet area in sqft if mentioned",
  "landmark": "landmark or address details",
  "notes": "extra rules, facilities, or description in English",
  "whatsapp": "phone number if mentioned"
}
Rules: JSON only. Omit unsure fields. Translate to English.`,

  item: (langLabel) => `You are a form-filling assistant for a buy/sell listing app in Maharashtra.
User spoke in ${langLabel}. Return ONLY valid JSON:
{
  "title": "Item title in English",
  "price": "price as number string",
  "description": "item description in English",
  "area": "area or locality if mentioned"
}
Rules: JSON only. Omit unsure fields. Translate to English.`,

  vehicle: (langLabel) => `You are a form-filling assistant for a vehicle rental listing app in Maharashtra.
User spoke in ${langLabel}. Return ONLY valid JSON:
{
  "title": "Vehicle name/model in English",
  "salaryMin": "daily rental rate as number string",
  "deposit": "security deposit if mentioned",
  "description": "vehicle features and notes in English",
  "whatsapp": "phone number if mentioned"
}
Rules: JSON only. Omit unsure fields. Translate to English.`,
};

router.post('/voice-fill', auth, voiceFillLimiter, async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.json({
      ok: false,
      error: 'GROQ_API_KEY not configured. Add it in Railway variables.',
    });
  }

  const { transcript, screenType = 'job', lang = 'mr-IN' } = req.body;
  if (!transcript || !transcript.trim()) {
    return res.json({ ok: false, error: 'Transcript is required.' });
  }
  if (transcript.trim().length > 1000) {
    return res.json({ ok: false, error: 'Transcript too long (max 1000 characters).' });
  }

  const validScreenTypes = ['job', 'room', 'item', 'vehicle'];
  if (!validScreenTypes.includes(screenType)) {
    return res.json({ ok: false, error: 'Invalid screenType.' });
  }

  const langLabel = lang === 'hi-IN' ? 'Hindi' : lang === 'mr-IN' ? 'Marathi' : 'English';
  const systemPrompt = VOICE_FILL_PROMPTS[screenType](langLabel);

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `User said: "${transcript.trim()}"` },
        ],
        max_tokens: 600,
        temperature: 0.2, // Low temp for structured extraction — less hallucination
      }),
    });

    const data = await groqRes.json();
    const raw = data?.choices?.[0]?.message?.content || '';

    // Strip any accidental markdown fences Groq sometimes adds
    const clean = raw.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (_) {
      console.error('[voice-fill] JSON parse failed. Raw:', raw.slice(0, 200));
      return res.json({ ok: false, error: 'AI returned invalid data. Please try again.' });
    }

    return res.json({ ok: true, fields: parsed });
  } catch (err) {
    console.error('[voice-fill] error:', err.message);
    return res.json({ ok: false, error: 'AI service error. Please try again.' });
  }
});
