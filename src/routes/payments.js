/**
 * payments.js — Cashfree payment routes for NandedRozgar
 *
 * POST /api/payments/order            — Step 1: create Cashfree order → returns payment_session_id
 * POST /api/payments/verify           — Step 2: verify + create JOB listing
 * POST /api/payments/verify/room      — Step 2: verify + create ROOM listing
 * POST /api/payments/verify/vehicle   — Step 2: verify + create VEHICLE listing
 * POST /api/payments/verify/buysell   — Step 2: verify + create BUY-SELL listing
 * POST /api/payments/verify/promotion — Step 2: verify + create PROMOTION listing
 *
 * ⚠️  Requires these Railway env vars:
 *     CASHFREE_APP_ID      — from Cashfree Dashboard → Credentials
 *     CASHFREE_SECRET_KEY  — from Cashfree Dashboard → Credentials
 *     APP_URL              — your public URL, e.g. https://thecityplus.in
 *
 * Cashfree API docs: https://docs.cashfree.com/docs/payment-gateway
 *
 * Flow:
 *   1. Client  → POST /order  → server creates a Cashfree order → returns payment_session_id + order_id
 *   2. Client opens Cashfree Drop-in / WebView with payment_session_id
 *   3. User pays; Cashfree redirects to APP_URL/payment/callback?order_id=&status=SUCCESS
 *   4. Client sends cashfree_order_id to /verify route
 *   5. Server calls Cashfree GET /orders/{order_id}/payments to confirm → creates listing
 */

const router   = require('express').Router();
const axios    = require('axios');
const { pool } = require('../db');
const { auth } = require('../middleware/auth');
const { logActivity, getIP, getUA } = require('../utils/logActivity');

// ── Cashfree API config ───────────────────────────────────────────────────────
// Production:  https://api.cashfree.com/pg
// Sandbox:     https://sandbox.cashfree.com/pg
//
// To use the sandbox during development set:
//   CASHFREE_ENV=sandbox   (takes priority over NODE_ENV check)
//
// For production on Railway make sure you set:
//   NODE_ENV=production   OR   CASHFREE_ENV=production
const CF_BASE = (process.env.CASHFREE_ENV || process.env.NODE_ENV) === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

const CF_VERSION = '2023-08-01';   // Cashfree API version header

if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
  console.error(
    '[payments] ❌  CASHFREE_APP_ID and/or CASHFREE_SECRET_KEY are NOT set.\n' +
    '           Go to Railway → Your Project → Variables and add:\n' +
    '             CASHFREE_APP_ID      = <your App ID from Cashfree Dashboard>\n' +
    '             CASHFREE_SECRET_KEY  = <your Secret Key from Cashfree Dashboard>\n' +
    '             NODE_ENV             = production\n' +
    '             APP_URL              = https://thecityplus.in\n' +
    '           Until these are set every payment will fail.'
  );
}

console.log(`[payments] Cashfree endpoint: ${CF_BASE}`);

function cfHeaders() {
  return {
    'x-client-id':     process.env.CASHFREE_APP_ID,
    'x-client-secret': process.env.CASHFREE_SECRET_KEY,
    'x-api-version':   CF_VERSION,
    'Content-Type':    'application/json',
  };
}

// ── Helper: verify payment with Cashfree ──────────────────────────────────────
// Returns { ok, amount, paymentId } or { ok: false, error }
// Retries up to 5 times (every 3 s) to handle UPI PENDING → SUCCESS delay.
async function verifyCashfreePayment(orderId, { retries = 5, delayMs = 3000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.get(
        `${CF_BASE}/orders/${orderId}/payments`,
        { headers: cfHeaders() }
      );

      const payments = res.data;
      if (!Array.isArray(payments) || payments.length === 0) {
        // No payments recorded yet — wait and retry
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, delayMs));
          continue;
        }
        return { ok: false, error: 'No payments found for this order.' };
      }

      // Check for a successful payment
      const success = payments.find(p => p.payment_status === 'SUCCESS');
      if (success) {
        return {
          ok:        true,
          amount:    parseFloat(success.payment_amount || 0),
          paymentId: success.cf_payment_id || success.payment_id || '',
        };
      }

      const latest = payments[payments.length - 1];
      const latestStatus = latest?.payment_status || 'UNKNOWN';

      // UPI payments can stay PENDING for several seconds after redirect.
      // Keep retrying while status is PENDING.
      if (latestStatus === 'PENDING' && attempt < retries) {
        console.log(`[payments] Order ${orderId} still PENDING — retry ${attempt}/${retries}`);
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }

      // Genuinely failed/cancelled or retries exhausted
      return { ok: false, error: `Payment not successful. Status: ${latestStatus}` };

    } catch (err) {
      console.error(`Cashfree verify error (attempt ${attempt}):`, err?.response?.data || err.message);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      return { ok: false, error: 'Could not verify payment with Cashfree.' };
    }
  }
  return { ok: false, error: 'Payment verification timed out. Please contact support.' };
}

// ── Server-side plan pricing (₹) — Tier-2/3 city friendly ───────────────────
// Strategy: free listing for 7 days (builds supply/trust), then pay to repost
// or boost. Prices match what a tea-shop owner or small factory in Nanded can
// justify — equivalent to one newspaper classified ad (₹50–₹150).
// Featured = top of list. Urgent = red badge + top. Paid plans = full 30 days.
const PLAN_PRICES = {
  job:       { free: 0, featured: 99, urgent: 49, '7 days': 49, '15 days': 79, '30 days': 99 },
  room:      { free: 0, featured: 99, '15 days': 49, '1 month': 79, '2 months': 109, '3 months': 149 },
  vehicle:   { free: 0, featured: 99, '15 days': 49, '1 month': 79, '2 months': 109, '3 months': 149 },
  buysell:   { free: 0, featured: 49, '7 days': 49, '15 days': 79, '30 days': 99 },
  promotion:    { basic: 99, popular: 149, premium: 199 },
  monthly_plan: { monthly: 299 },
};

const PLAN_DAYS = {
  job:     { free: 7, featured: 30, urgent: 30, '7 days': 7, '15 days': 15, '30 days': 30 },
  room:    { free: 7, featured: 30, '15 days': 15, '1 month': 30, '2 months': 60, '3 months': 90 },
  vehicle: { free: 7, featured: 30, '15 days': 15, '1 month': 30, '2 months': 60, '3 months': 90 },
  buysell: { free: 7, featured: 15, '7 days': 7, '15 days': 15, '30 days': 30 },
};

// ── Phone sanitisation ────────────────────────────────────────────────────────
// All listing routes accept a phone/whatsapp number supplied by the client and
// store it in a public-facing DB column that is rendered in the app UI.
// Without validation:
//   • Garbage strings (or XSS payloads) end up in public listings.
//   • WhatsApp deep-link buttons break for malformed numbers.
//
// sanitisePhone() strips whitespace/formatting, rejects anything that is not a
// valid 10-digit Indian mobile number (starting 6–9), and returns null for
// empty/missing input so the caller can decide whether to error-out or accept
// a NULL DB value.
//
// IMPORTANT: call this for EVERY phone/whatsapp field before INSERT.
function sanitisePhone(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  // Strip common formatting characters: spaces, dashes, dots, parentheses,
  // leading +91 or 0 country/trunk prefix.
  const cleaned = String(raw)
    .trim()
    .replace(/[\s\-().+]/g, '')
    .replace(/^91(\d{10})$/, '$1')  // strip +91 / 91 prefix
    .replace(/^0(\d{10})$/, '$1');  // strip leading 0
  if (!/^[6-9]\d{9}$/.test(cleaned)) return false; // sentinel: invalid
  return cleaned;
}

// requirePhone(raw, fieldName) — use in route guards where a number is mandatory.
// Returns { ok: true, value } or { ok: false, error }.
function requirePhone(raw, fieldName = 'Phone') {
  const result = sanitisePhone(raw);
  if (result === null)  return { ok: false, error: `${fieldName} is required.` };
  if (result === false) return { ok: false, error: `${fieldName}: enter a valid 10-digit Indian mobile number.` };
  return { ok: true, value: result };
}

function resolveExpectedAmount(listingType, planKey, coupon) {
  const prices = PLAN_PRICES[listingType];
  if (!prices) return null;
  const normalised = (planKey || 'free').toLowerCase().trim();
  if (!(normalised in prices)) return null;
  let amount = prices[normalised];
  if (coupon && amount > 0) {
    if (coupon.type === 'percent')   amount = Math.max(0, amount - Math.round(amount * coupon.value / 100));
    else if (coupon.type === 'flat') amount = Math.max(0, amount - coupon.value);
  }
  return amount; // ₹ (not paise)
}

function resolvePlanDays(listingType, planKey) {
  const days = PLAN_DAYS[listingType];
  if (!days) return 30;
  return days[(planKey || 'free').toLowerCase().trim()] || 30;
}

function resolveExtraDays(coupon) {
  return coupon?.type === 'free_days' ? parseInt(coupon.value) || 0 : 0;
}

function resolveCredits(userCredits, amountRupees) {
  if (!userCredits || userCredits <= 0 || amountRupees <= 0) return { creditsToUse: 0, remaining: amountRupees };
  const creditsToUse = Math.min(userCredits, amountRupees);
  return { creditsToUse, remaining: amountRupees - creditsToUse };
}

async function deductCredits(dbClient, userId, creditsToUse) {
  if (!creditsToUse || creditsToUse <= 0) return;
  await dbClient.query(
    `UPDATE users SET referral_credits = GREATEST(0, referral_credits - $1) WHERE id = $2`,
    [creditsToUse, userId]
  );
}

// Stores payment record. Column names kept from original schema (razorpay_payment_id
// stores our cashfree_payment_id; razorpay_order_id stores cashfree_order_id).
async function savePayment(dbClient, userId, { amountRupees, plan, cashfreeOrderId, cashfreePaymentId }) {
  const { rows } = await dbClient.query(
    `INSERT INTO payments (user_id, amount, plan, razorpay_payment_id, razorpay_order_id, status)
     VALUES ($1, $2, $3, $4, $5, 'paid') RETURNING id`,
    [userId, amountRupees || 0, plan, cashfreePaymentId || null, cashfreeOrderId || null]
  );
  return rows[0].id;
}

async function markCouponUsed(dbClient, couponId, userId) {
  if (!couponId) return;
  const { rowCount } = await dbClient.query(
    `INSERT INTO coupon_usage (coupon_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [couponId, userId]
  );
  // Only increment the counter when we actually inserted a new row
  if (rowCount > 0) {
    await dbClient.query(`UPDATE coupon_codes SET uses_count = uses_count + 1 WHERE id = $1`, [couponId]);
  }
}

async function rejectIfDuplicatePayment(dbClient, cashfreeOrderId) {
  if (!cashfreeOrderId) return null;
  const { rows } = await dbClient.query(
    'SELECT id FROM payments WHERE razorpay_order_id = $1 LIMIT 1',
    [cashfreeOrderId]
  );
  return rows.length > 0 ? { ok: false, error: 'This payment has already been used.' } : null;
}

async function resolveCoupon(dbClient, couponId, userId) {
  if (!couponId) return null;
  // FIX: Removed NOT EXISTS coupon_usage — same reason as /order fix above.
  // The verify route runs after payment; if the coupon was already inserted into
  // coupon_usage (by a prior retry), returning null here makes expectedAmount = full
  // price, which causes a false "amount mismatch" error for discounted payments.
  // For 100% off coupons: expectedAmount = 0, remaining = 0 -> free path in verify.
  //
  // FIX (Bug #9): Added FOR UPDATE to lock the coupon row for the duration of
  // the transaction. Without a row lock, two concurrent payments using the same
  // coupon both read uses_count = N, both pass the max_uses check, and both
  // proceed -- only one of them will insert into coupon_usage (ON CONFLICT DO
  // NOTHING), but markCouponUsed increments uses_count only on a real insert, so
  // the second redemption slips through without incrementing the counter.
  // FOR UPDATE serialises access: the second transaction blocks until the first
  // commits or rolls back, guaranteeing at most one winner per coupon slot.
  const { rows } = await dbClient.query(
    `SELECT * FROM coupon_codes WHERE id = $1 AND is_active = TRUE
     AND (valid_until IS NULL OR valid_until >= NOW())
     AND (max_uses IS NULL OR uses_count <= max_uses)
     FOR UPDATE`,
    [couponId]
  );
  return rows[0] || null;
}

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/order — create Cashfree order (Step 1)
// Returns: { ok, free } for free/credit-covered plans, or
//          { ok, payment_session_id, order_id, amount }
// ══════════════════════════════════════════════════════════════════════════════
router.post('/order', auth, async (req, res) => {
  try {
    const { listingType, plan, couponId, description } = req.body;
    if (!listingType || !plan) {
      return res.json({ ok: false, error: 'listingType and plan are required.' });
    }

    let couponRow = null;
    if (couponId) {
      // FIX: Removed NOT EXISTS coupon_usage check from /order lookup.
      // If the user already used this coupon on a failed attempt, excluding it
      // here would make amount = full price even though they have a valid coupon.
      // Actual one-use enforcement is done in markCouponUsed (ON CONFLICT DO NOTHING).
      const { rows } = await pool.query(
        `SELECT * FROM coupon_codes WHERE id = $1 AND is_active = TRUE
         AND (valid_until IS NULL OR valid_until >= NOW())
         AND (max_uses IS NULL OR uses_count <= max_uses)`,
        [couponId]
      );
      couponRow = rows[0] || null;
    }

    const amount = resolveExpectedAmount(listingType, plan, couponRow);
    if (amount === null) return res.json({ ok: false, error: 'Invalid listing type or plan.' });

    const { rows: userRows } = await pool.query(
      'SELECT referral_credits, name, phone, email FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userRows[0];
    const { creditsToUse, remaining } = resolveCredits(user?.referral_credits || 0, amount);

    // Free or fully covered by credits
    if (remaining === 0 || amount === 0) {
      return res.json({ ok: true, free: true, creditsToUse });
    }

    if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
      return res.json({ ok: false, error: 'Payment gateway is not configured. Please contact support.' });
    }

    // Cashfree minimum order is ₹1
    if (remaining < 1) {
      return res.json({ ok: true, free: true, creditsToUse });
    }

    // Generate a unique order ID (Cashfree requires it, max 50 chars, alphanumeric + underscore/hyphen)
    const orderId = `NR_${req.user.id}_${Date.now()}`;

    const orderPayload = {
      order_id:       orderId,
      order_amount:   remaining,                           // ₹ (not paise)
      order_currency: 'INR',
      order_note:     description || `${listingType} - ${plan}`,
      customer_details: {
        customer_id:    String(req.user.id),
        customer_name:  user?.name  || 'User',
        customer_phone: user?.phone || '9999999999',
        customer_email: user?.email || req.user.email || 'user@example.com',
      },
      order_meta: {
        return_url: `${process.env.APP_URL || 'https://thecityplus.in'}/payment/callback?order_id={order_id}&status={payment_status}`,
        notify_url: `${process.env.APP_URL || 'https://thecityplus.in'}/api/payments/cashfree-webhook`,
      },
    };

    const cfRes = await axios.post(
      `${CF_BASE}/orders`,
      orderPayload,
      { headers: cfHeaders() }
    );

    const cfOrder = cfRes.data;
    if (!cfOrder?.payment_session_id) {
      console.error('Cashfree order error:', cfOrder);
      return res.json({ ok: false, error: 'Failed to create payment order.' });
    }

    res.json({
      ok:                 true,
      payment_session_id: cfOrder.payment_session_id,
      order_id:           orderId,
      amount:             remaining,
      creditsToUse,
    });
  } catch (err) {
    console.error('Cashfree order error:', err?.response?.data || err);
    res.json({ ok: false, error: 'Failed to create payment order.' });
  }
});

// ── Shared verify helper ───────────────────────────────────────────────────────
async function sharedVerify(req, res, listingType, insertFn) {
  const client = await pool.connect();
  try {
    const { cashfree_order_id, plan, couponId } = req.body;

    await client.query('BEGIN');

    // ── Monthly plan check: if user has active subscription, post is FREE ─────
    // FIX (Bug #10): Use SELECT ... FOR UPDATE to lock the user row before
    // reading monthly_plan_expires_at. Without this lock, two concurrent
    // requests for the same user both read an active plan and both proceed to
    // insert a free listing before either transaction commits, letting two
    // listings through for the price of zero. FOR UPDATE ensures the second
    // request waits until the first transaction finishes, by which point the
    // first listing is already committed and the second request sees the
    // unchanged (still-active) plan and correctly posts its own listing -- or,
    // if the plan has just expired, correctly falls through to the paid path.
    const { rows: subRows } = await client.query(
      `SELECT monthly_plan_expires_at FROM users WHERE id = $1 FOR UPDATE`, [req.user.id]
    );
    const subExpiry = subRows[0]?.monthly_plan_expires_at;
    const hasActivePlan = subExpiry && new Date(subExpiry) > new Date();

    if (hasActivePlan) {
      // Grant 30-day free listing, skip all payment checks
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      const result = await insertFn(client, req, { planDays: 30, expiresAt, expectedAmount: 0 });
      await client.query('COMMIT');
      await logActivity('monthly_plan_post', { userId: req.user.id, ip: getIP(req), userAgent: getUA(req), detail: `${listingType} posted via monthly plan` });
      return res.json({ ok: true, freePost: true, ...result });
    }
    // ─────────────────────────────────────────────────────────────────────────

    const couponRow      = await resolveCoupon(client, couponId, req.user.id);
    const expectedAmount = resolveExpectedAmount(listingType, plan, couponRow);
    if (expectedAmount === null) {
      await client.query('ROLLBACK');
      return res.json({ ok: false, error: 'Invalid plan.' });
    }

    const { rows: uRows } = await client.query(
      'SELECT referral_credits FROM users WHERE id = $1', [req.user.id]
    );
    const { creditsToUse, remaining } = resolveCredits(uRows[0]?.referral_credits || 0, expectedAmount);

    // Paid plan — verify with Cashfree
    if (remaining > 0) {
      if (!cashfree_order_id) {
        await client.query('ROLLBACK');
        return res.json({ ok: false, error: 'Missing cashfree_order_id.' });
      }

      const dupErr = await rejectIfDuplicatePayment(client, cashfree_order_id);
      if (dupErr) { await client.query('ROLLBACK'); return res.json(dupErr); }

      const verification = await verifyCashfreePayment(cashfree_order_id);
      if (!verification.ok) {
        await client.query('ROLLBACK');
        return res.json({ ok: false, error: verification.error });
      }

      // Amount check — allow ₹1 tolerance for rounding.
      // FIX: use min(remaining, expectedAmount) so a 100%-off coupon that reduces
      // expectedAmount to 0 never reaches this branch (remaining=0 → free path).
      // For partial coupons: expectedAmount already includes the discount, so we
      // compare against that rather than the pre-credits 'remaining'.
      const lowestAccepted = Math.min(remaining, expectedAmount);
      if (verification.amount < lowestAccepted - 1) {
        await client.query('ROLLBACK');
        return res.json({ ok: false, error: 'Payment amount mismatch. Please contact support.' });
      }

      await savePayment(client, req.user.id, {
        amountRupees:       remaining,
        plan,
        cashfreeOrderId:    cashfree_order_id,
        cashfreePaymentId:  verification.paymentId,
      });
    } else {
      // Free / fully covered by credits
      await savePayment(client, req.user.id, {
        amountRupees: 0, plan,
        cashfreeOrderId: null, cashfreePaymentId: null,
      });
    }

    await deductCredits(client, req.user.id, creditsToUse);

    const planDays  = resolvePlanDays(listingType, plan) + resolveExtraDays(couponRow);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + planDays);

    const result = await insertFn(client, req, { planDays, expiresAt, expectedAmount });
    await markCouponUsed(client, couponId, req.user.id);
    await client.query('COMMIT');
    await logActivity('payment_success', { userId: req.user.id, ip: getIP(req), userAgent: getUA(req), detail: `${listingType} listing via ${plan} plan` });
    return res.json({ ok: true, ...result });
  } catch (err) {
    await client.query('ROLLBACK');
    // userError = true means the error came from input validation inside insertFn
    // (e.g. invalid phone). Return the message directly instead of a generic 500.
    if (err.userError) return res.json({ ok: false, error: err.message });
    console.error(`verify/${listingType} error:`, err);
    return res.json({ ok: false, error: `Failed to create ${listingType} listing after payment.` });
  } finally {
    client.release();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/verify — JOB listing
// ══════════════════════════════════════════════════════════════════════════════
router.post('/verify', auth, (req, res) =>
  sharedVerify(req, res, 'job', async (client, req, { planDays, expiresAt }) => {
    const { job, plan } = req.body;

    // ── Phone validation ───────────────────────────────────────────────────────
    const phoneResult   = requirePhone(job?.phone,            'Phone');
    const whatsappRaw   = job?.whatsapp || job?.phone;
    const whatsappResult = requirePhone(whatsappRaw,          'WhatsApp');
    if (!phoneResult.ok)   throw Object.assign(new Error(phoneResult.error),   { userError: true });
    if (!whatsappResult.ok) throw Object.assign(new Error(whatsappResult.error), { userError: true });

    const isFeatured = plan === 'featured', isUrgent = plan === 'urgent';
    const skillsArr = Array.isArray(job.skills) ? job.skills
      : typeof job.skills === 'string' && job.skills.trim()
        ? job.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
    const reqArr = Array.isArray(job.requirements) ? job.requirements
      : typeof job.requirements === 'string' && job.requirements.trim()
        ? job.requirements.split('\n').map(r => r.trim()).filter(Boolean) : [];
    const { rows } = await client.query(`
      INSERT INTO jobs (posted_by,title,company,address,category,type,location,salary,phone,whatsapp,description,
        skills,requirements,education,experience,hours,openings,featured,urgent,expires_at,district)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING *`,
      [req.user.id, job.title, job.company, job.address || '', job.category, job.type || 'Full-time', job.location, job.salary || '',
       phoneResult.value, whatsappResult.value, job.description, skillsArr, reqArr,
       job.education || '', job.experience || '', job.hours || '', job.openings || '1',
       isFeatured, isUrgent, expiresAt, job.district || 'nanded']);
    return { job: rows[0] };
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/verify/room
// ══════════════════════════════════════════════════════════════════════════════
router.post('/verify/room', auth, (req, res) => {
  const { room } = req.body;
  const isSale = room?.listingPurpose === 'sale';
  if (!isSale && !room?.rent) return res.json({ ok: false, error: 'Rent is required.' });
  if (isSale && !room?.salePrice) return res.json({ ok: false, error: 'Sale price is required.' });
  if (!room?.area) return res.json({ ok: false, error: 'Area is required.' });

  // ── Phone validation ─────────────────────────────────────────────────────────
  const waResult = requirePhone(room?.whatsapp, 'WhatsApp');
  if (!waResult.ok) return res.json({ ok: false, error: waResult.error });

  return sharedVerify(req, res, 'room', async (client, req, { planDays, expiresAt, expectedAmount }) => {
    const { room, plan } = req.body;
    const waClean = requirePhone(room?.whatsapp, 'WhatsApp');
    if (!waClean.ok) throw Object.assign(new Error(waClean.error), { userError: true });
    const { rows } = await client.query(`
      INSERT INTO rooms (posted_by,room_type,for_gender,furnished,floor,total_floors,bhk_size,facing,vacancies,
        rent,deposit,maintenance,broker_free,amenities,rules,available_from,tenant_pref,area,address,landmark,
        owner_name,whatsapp,description,photos,plan_days,plan_label,plan_price,expires_at,district,
        listing_purpose,sale_price,carpet_area,property_age)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33) RETURNING *`,
      [req.user.id, room.roomType || 'PG', room.forGender || 'Any', room.furnished || 'Semi-furnished',
       room.floor || '', room.totalFloors || '', room.bhkSize || '', room.facing || '',
       parseInt(room.vacancies) || 1, room.rent || '0', room.deposit || '', room.maintenance || '',
       room.brokerFree !== false,
       JSON.stringify(room.amenities || []), JSON.stringify(room.rules || []),
       room.availableFrom || 'Immediately', room.tenantPref || 'Any', room.area, room.address || '',
       room.landmark || '', room.ownerName || '', waClean.value, room.description || '',
       JSON.stringify(room.photos || []),
       planDays, room.planLabel || plan || '1 Month', expectedAmount, expiresAt,
       room.district || 'nanded',
       room.listingPurpose || 'rent',
       room.salePrice ? parseInt(room.salePrice) : null,
       room.carpetArea || null,
       room.propertyAge || null]);
    return { room: rows[0] };
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/verify/vehicle
// ══════════════════════════════════════════════════════════════════════════════
router.post('/verify/vehicle', auth, (req, res) => {
  const { vehicle } = req.body;
  if (!vehicle?.dailyRate || !vehicle?.area) {
    return res.json({ ok: false, error: 'Daily rate and area are required.' });
  }
  // ── Phone validation ─────────────────────────────────────────────────────────
  const waResult = requirePhone(vehicle?.whatsapp, 'WhatsApp');
  if (!waResult.ok) return res.json({ ok: false, error: waResult.error });

  return sharedVerify(req, res, 'vehicle', async (client, req, { planDays, expiresAt, expectedAmount }) => {
    const { vehicle, plan } = req.body;
    const waClean = requirePhone(vehicle?.whatsapp, 'WhatsApp');
    if (!waClean.ok) throw Object.assign(new Error(waClean.error), { userError: true });
    const { rows } = await client.query(`
      INSERT INTO vehicles (posted_by,vehicle_type,name,year,color,fuel_type,transmission,ac_type,seats,
        daily_rate,hourly_rate,km_limit,extra_km_rate,min_booking,advance_amt,purpose,includes,availability,
        area,address,owner_name,whatsapp,description,photos,plan_days,plan_label,plan_price,expires_at,district)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29) RETURNING *`,
      [req.user.id, vehicle.vehicleType || 'Car',
       vehicle.name || vehicle.vehicleType || 'Vehicle',
       vehicle.year || '', vehicle.color || '', vehicle.fuelType || 'Petrol',
       vehicle.transmission || 'Manual', vehicle.acType || 'AC', vehicle.seats || '5',
       vehicle.dailyRate, vehicle.hourlyRate || '', vehicle.kmLimit || '',
       vehicle.extraKmRate || '', vehicle.minBooking || '1', vehicle.advanceAmt || '',
       vehicle.purpose || '', JSON.stringify(vehicle.includes || []),
       JSON.stringify(vehicle.availability || []),
       vehicle.area, vehicle.address || '', vehicle.ownerName || '', waClean.value,
       vehicle.description || '', JSON.stringify(vehicle.photos || []),
       planDays, vehicle.planLabel || plan || '1 Month', expectedAmount, expiresAt,
       vehicle.district || 'nanded']);
    return { vehicle: rows[0] };
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/verify/buysell
// ══════════════════════════════════════════════════════════════════════════════
router.post('/verify/buysell', auth, (req, res) => {
  const { item } = req.body;
  if (!item?.title || !item?.price) {
    return res.json({ ok: false, error: 'Title and price are required.' });
  }
  // ── Phone validation ─────────────────────────────────────────────────────────
  const waResult = requirePhone(item?.whatsapp, 'WhatsApp');
  if (!waResult.ok) return res.json({ ok: false, error: waResult.error });

  return sharedVerify(req, res, 'buysell', async (client, req, { planDays, expiresAt, expectedAmount }) => {
    const { item, plan } = req.body;
    const waClean = requirePhone(item?.whatsapp, 'WhatsApp');
    if (!waClean.ok) throw Object.assign(new Error(waClean.error), { userError: true });
    const { rows } = await client.query(`
      INSERT INTO buysell_items (posted_by,title,category,condition,age,price,negotiable,area,description,
        whatsapp,photos,plan_days,plan_label,plan_price,expires_at,district)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [req.user.id, item.title.trim(), item.category || 'Other',
       item.condition || 'Good', item.age || 'Unknown',
       parseInt(item.price) || 0, item.negotiable !== false, item.area || '',
       item.description || '', waClean.value,
       JSON.stringify(item.photos || []),
       planDays, item.planLabel || plan || '15 Days', expectedAmount, expiresAt,
       item.district || 'nanded']);
    return { item: rows[0] };
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/verify/promotion
// ══════════════════════════════════════════════════════════════════════════════
const PROMOTION_PLANS = {
  basic:   { price: 99,  days: 7  },
  popular: { price: 149, days: 15 },
  premium: { price: 199, days: 30 },
};
const BANNER_COLORS = { bold: '#e82828', clean: '#f97316', vivid: '#f97316' };

router.post('/verify/promotion', auth, async (req, res) => {
  const { promotion, cashfree_order_id } = req.body;
  if (!promotion?.bizName?.trim())  return res.json({ ok: false, error: 'Business name is required.' });
  if (!promotion?.category?.trim()) return res.json({ ok: false, error: 'Category is required.' });
  if (!promotion?.location?.trim()) return res.json({ ok: false, error: 'Location is required.' });

  // ── Phone validation ─────────────────────────────────────────────────────────
  const phoneResult = requirePhone(promotion?.phone, 'Contact number');
  if (!phoneResult.ok) return res.json({ ok: false, error: phoneResult.error });

  const client = await pool.connect();
  try {
    const planKey  = promotion?.plan || 'basic';
    const planMeta = PROMOTION_PLANS[planKey];
    if (!planMeta) return res.json({ ok: false, error: 'Invalid promotion plan.' });

    await client.query('BEGIN');

    const { rows: uRowsP } = await client.query(
      'SELECT referral_credits FROM users WHERE id = $1', [req.user.id]
    );
    const { creditsToUse, remaining } = resolveCredits(uRowsP[0]?.referral_credits || 0, planMeta.price);

    let cfPaymentId = null;

    if (remaining > 0) {
      if (!cashfree_order_id) {
        await client.query('ROLLBACK');
        return res.json({ ok: false, error: 'Missing cashfree_order_id.' });
      }

      const dupErr = await rejectIfDuplicatePayment(client, cashfree_order_id);
      if (dupErr) { await client.query('ROLLBACK'); return res.json(dupErr); }

      const verification = await verifyCashfreePayment(cashfree_order_id);
      if (!verification.ok) {
        await client.query('ROLLBACK');
        return res.json({ ok: false, error: verification.error });
      }

      // ── BUG FIX: Verify paid amount matches the selected plan price ──────────
      // Without this check a client could pay ₹1 (or any amount) and receive a
      // higher-value plan (e.g. pay ₹1, get the ₹199 premium plan).
      // `remaining` is what was actually due after credits; allow ₹1 rounding tolerance.
      if (verification.amount < remaining - 1) {
        await client.query('ROLLBACK');
        return res.json({ ok: false, error: 'Payment amount mismatch. Please contact support.' });
      }

      cfPaymentId = verification.paymentId;
    }

    await savePayment(client, req.user.id, {
      amountRupees:      remaining,
      plan:              planKey,
      cashfreeOrderId:   cashfree_order_id || null,
      cashfreePaymentId: cfPaymentId,
    });
    await deductCredits(client, req.user.id, creditsToUse);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + planMeta.days);
    const accentColor = BANNER_COLORS[promotion?.bannerStyle] || '#f97316';

    // Limit banner_image to 2 MB (base64 ~2.7 MB encoded)
    const bannerImage = promotion.bannerImage || null;
    if (bannerImage && bannerImage.length > 2_800_000) {
      await client.query('ROLLBACK');
      return res.json({ ok: false, error: 'Banner image is too large. Please upload an image under 2 MB.' });
    }

    const { rows } = await client.query(
      `INSERT INTO business_promotions
         (user_id,biz_name,tagline,phone,category,location,address,website,description,
          plan,plan_price,plan_days,banner_style,accent_color,banner_mode,banner_image,status,expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'active',$17) RETURNING *`,
      [req.user.id, promotion.bizName.trim(), promotion.tagline?.trim() || null,
       phoneResult.value, promotion.category.trim(), promotion.location.trim(),
       promotion.address?.trim() || null, promotion.website?.trim() || null,
       promotion.description?.trim() || null,
       planKey, planMeta.price, planMeta.days,
       promotion.bannerStyle || 'clean', accentColor,
       promotion.bannerMode || 'upload', bannerImage,
       expiresAt]
    );

    await client.query('COMMIT');
    res.json({ ok: true, promotion: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('verify/promotion error:', err);
    res.json({ ok: false, error: 'Failed to create promotion after payment.' });
  } finally {
    client.release();
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/cashfree-webhook  (optional — for server-side confirmation)
// Cashfree sends a signed webhook to this URL after payment.
// See: https://docs.cashfree.com/docs/webhooks
// ══════════════════════════════════════════════════════════════════════════════
router.post('/cashfree-webhook', async (req, res) => {
  // Verify Cashfree webhook signature before trusting the payload.
  //
  // FIX (Bug #1): Use req.rawBody (the original bytes captured before JSON
  // parsing) instead of JSON.stringify(req.body).  Re-serialising a parsed
  // object changes whitespace and key order, producing a different HMAC than
  // what Cashfree computed over the wire.  req.rawBody is attached in
  // index.js by the express.raw() middleware that runs before express.json().
  //
  // FIX (Bug #2): Replace the string equality check (sig !== expected) with
  // crypto.timingSafeEqual().  Plain string comparison leaks timing
  // information that allows an attacker to brute-force the expected value.
  const secret = process.env.CASHFREE_SECRET_KEY;
  if (secret) {
    const crypto   = require('crypto');
    const sig      = req.headers['x-webhook-signature'] || '';
    const ts       = req.headers['x-webhook-timestamp'] || '';

    // req.rawBody is the original Buffer set in index.js before JSON parsing.
    // Fall back to JSON.stringify only if somehow rawBody is missing (should
    // never happen in normal operation, but avoids a hard crash).
    const rawBody  = req.rawBody
      ? req.rawBody.toString()
      : JSON.stringify(req.body);

    const message  = ts + rawBody;
    const expected = crypto.createHmac('sha256', secret).update(message).digest('base64');

    // Constant-time comparison — prevents timing-based side-channel attacks.
    let signaturesMatch = false;
    try {
      signaturesMatch = crypto.timingSafeEqual(
        Buffer.from(sig,      'utf8'),
        Buffer.from(expected, 'utf8')
      );
    } catch {
      // timingSafeEqual throws if buffers are different lengths (definite mismatch)
      signaturesMatch = false;
    }

    if (!signaturesMatch) {
      console.warn('[cashfree-webhook] Invalid signature — ignoring');
      return res.status(400).json({ ok: false, error: 'Invalid signature' });
    }
  }
  // Actual listing activation is handled via /verify routes called by the client.
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// MONTHLY PLAN — ₹299/month — unlocks free posting across Jobs, Rooms, Cars, BuySell
// POST /api/payments/order/monthly-plan  — create Cashfree order for ₹299
// POST /api/payments/verify/monthly-plan — verify payment & activate subscription
// GET  /api/payments/monthly-plan/status — check if current user has active plan
// ══════════════════════════════════════════════════════════════════════════════

const MONTHLY_PLAN_PRICE = 299; // ₹299/month

router.post('/order/monthly-plan', auth, async (req, res) => {
  try {
    const user = req.user;
    const orderId = `NR_MPLAN_${user.id}_${Date.now()}`;
    const customerName  = user.name  || 'User';
    const customerEmail = user.email || `user${user.id}@nandedrozgar.in`;
    const customerPhone = user.phone || '9999999999';

    const body = {
      order_id:       orderId,
      order_amount:   MONTHLY_PLAN_PRICE,
      order_currency: 'INR',
      order_note:     'Monthly Plan – Unlimited Free Posts for 30 Days',
      customer_details: {
        customer_id:    `user_${user.id}`,
        customer_name:  customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
      },
      order_meta: {
        return_url: `${process.env.APP_URL || 'https://thecityplus.in'}/payment/callback?order_id={order_id}&status={order_status}`,
      },
    };

    const { data } = await axios.post(`${CF_BASE}/orders`, body, { headers: cfHeaders() });
    res.json({ ok: true, orderId, paymentSessionId: data.payment_session_id });
  } catch (err) {
    console.error('monthly-plan order error:', err?.response?.data || err.message);
    res.json({ ok: false, error: 'Could not create payment order.' });
  }
});

router.post('/verify/monthly-plan', auth, async (req, res) => {
  const { cashfree_order_id } = req.body;
  if (!cashfree_order_id) return res.json({ ok: false, error: 'cashfree_order_id is required.' });

  // FIX (Bug #5): Verify with Cashfree BEFORE opening the DB transaction so a
  // failed payment never touches the database, then guard against duplicate
  // submissions (network retries, double-taps) using rejectIfDuplicatePayment
  // inside the transaction — same pattern used by every other verify route.
  const verification = await verifyCashfreePayment(cashfree_order_id);
  if (!verification.ok) return res.json({ ok: false, error: verification.error });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Idempotency guard — reject if this order_id was already processed.
    // Without this, a client that retries (network timeout, double-tap) can
    // call this endpoint multiple times with the same cashfree_order_id and
    // each call would reset/extend the subscription independently.
    const dupErr = await rejectIfDuplicatePayment(client, cashfree_order_id);
    if (dupErr) { await client.query('ROLLBACK'); return res.json(dupErr); }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Upsert subscription
    await client.query(
      `INSERT INTO user_subscriptions (user_id, plan, amount, cashfree_order_id, cashfree_payment_id, started_at, expires_at)
       VALUES ($1, 'monthly', $2, $3, $4, NOW(), $5)
       ON CONFLICT (user_id) DO UPDATE
         SET plan = 'monthly', amount = $2, cashfree_order_id = $3,
             cashfree_payment_id = $4, started_at = NOW(), expires_at = $5`,
      [req.user.id, MONTHLY_PLAN_PRICE, cashfree_order_id,
       verification.paymentId || null, expiresAt]
    );

    // Also update users table column for easy lookup
    await client.query(
      `UPDATE users SET monthly_plan_expires_at = $1 WHERE id = $2`,
      [expiresAt, req.user.id]
    );

    await savePayment(client, req.user.id, {
      amountRupees:      MONTHLY_PLAN_PRICE,
      plan:              'monthly_plan',
      cashfreeOrderId:   cashfree_order_id,
      cashfreePaymentId: verification.paymentId || null,
    });

    await client.query('COMMIT');
    res.json({ ok: true, expiresAt });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('verify/monthly-plan error:', err);
    res.json({ ok: false, error: 'Failed to activate monthly plan.' });
  } finally {
    client.release();
  }
});

// GET /api/payments/monthly-plan/status — returns { active, expiresAt }
router.get('/monthly-plan/status', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT monthly_plan_expires_at FROM users WHERE id = $1`,
      [req.user.id]
    );
    const expiry = rows[0]?.monthly_plan_expires_at;
    const active = expiry && new Date(expiry) > new Date();
    res.json({ ok: true, active: !!active, expiresAt: expiry || null });
  } catch (err) {
    console.error('monthly-plan/status error:', err);
    res.json({ ok: false, active: false, expiresAt: null });
  }
});

module.exports = router;
