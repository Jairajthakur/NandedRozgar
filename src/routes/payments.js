/**
 * payments.js — Razorpay payment routes for CityPlus
 *
 * POST /api/payments/order               — Step 1: create a Razorpay order (all listing types)
 * POST /api/payments/verify              — Step 2: verify + create JOB listing
 * POST /api/payments/verify/room         — Step 2: verify + create ROOM listing
 * POST /api/payments/verify/vehicle      — Step 2: verify + create VEHICLE listing
 * POST /api/payments/verify/buysell      — Step 2: verify + create BUY-SELL listing
 * POST /api/payments/verify/promotion    — Step 2: verify + create PROMOTION listing
 *
 * Security model:
 *   ─ Never trust the client saying "I paid". Always verify the HMAC signature.
 *   ─ Free plan (amount === 0) skips signature check but still records a ₹0 payment row.
 *   ─ All verify routes require auth middleware.
 *   ─ The server-computed expectedAmount is ALWAYS what gets saved — never req.body.amount.
 *   ─ planDays comes from server-authoritative PLAN_DAYS table, never from req.body.days.
 *   ─ Coupon usage + listing insert + payment record are wrapped in a single DB transaction.
 */

const router   = require('express').Router();
const crypto   = require('crypto');
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// ── Razorpay SDK setup ────────────────────────────────────────────────────────
let Razorpay;
try {
  Razorpay = require('razorpay');
} catch {
  Razorpay = null;
}

function getRazorpay() {
  if (!Razorpay || !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// ── Helper: verify Razorpay HMAC signature ────────────────────────────────────
function verifySignature(orderId, paymentId, signature) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return { ok: false, error: 'Payment gateway not configured on server.' };

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  if (expected !== signature) {
    return { ok: false, error: 'Payment verification failed. Please contact support.' };
  }
  return { ok: true };
}

// ── Server-side plan pricing (paise). Never trust the client for these. ────────
// Keys are the exact label strings sent by each PostScreen (planLabel / form.plan.label).\n// job:     PostJobScreen  PLANS → '7 Days' ₹49, '15 Days' ₹79, '30 Days' ₹119
// room:    PostRoomScreen PLANS → '15 Days' ₹69, '1 Month' ₹99, '2 Months' ₹169, '3 Months' ₹229
// vehicle: PostCarScreen  PLANS → '15 Days' ₹69, '1 Month' ₹99, '2 Months' ₹169, '3 Months' ₹229
// buysell: PostItemScreen PLANS → '7 Days' ₹39, '15 Days' ₹59, '30 Days' ₹89
// promotion: PromoteBusinessScreen → basic ₹99, popular ₹249, premium ₹499
const PLAN_PRICES = {
  job: {
    free:      0,
    featured:  9900,
    urgent:    4900,
    '7 days':  4900,   // ₹49
    '15 days': 7900,   // ₹79
    '30 days': 11900,  // ₹119
  },
  room: {
    free:       0,
    featured:   7900,
    '15 days':  6900,   // ₹69
    '1 month':  9900,   // ₹99
    '2 months': 16900,  // ₹169
    '3 months': 22900,  // ₹229
  },
  vehicle: {
    free:       0,
    featured:   7900,
    '15 days':  6900,   // ₹69
    '1 month':  9900,   // ₹99
    '2 months': 16900,  // ₹169
    '3 months': 22900,  // ₹229
  },
  buysell: {
    free:      0,
    featured:  4900,
    '7 days':  3900,   // ₹39
    '15 days': 5900,   // ₹59
    '30 days': 8900,   // ₹89
  },
  // Promotion plans — must match PROMOTION_PLANS table below
  promotion: {
    basic:   9900,   // ₹99
    popular: 24900,  // ₹249
    premium: 49900,  // ₹499
  },
};

// ── Server-authoritative plan durations (days). ──────────────────────────────
// The client-supplied `days` field is ignored in all verify routes.
// These values are the single source of truth for listing expiry.
const PLAN_DAYS = {
  job: {
    free: 30, featured: 30, urgent: 30,
    '7 days': 7, '15 days': 15, '30 days': 30,
  },
  room: {
    free: 30, featured: 30,
    '15 days': 15, '1 month': 30, '2 months': 60, '3 months': 90,
  },
  vehicle: {
    free: 30, featured: 30,
    '15 days': 15, '1 month': 30, '2 months': 60, '3 months': 90,
  },
  buysell: {
    free: 15, featured: 15,
    '7 days': 7, '15 days': 15, '30 days': 30,
  },
};

// Look up the server-authoritative price (in paise) for a listing type + plan.
// Returns null if the plan key is unrecognised (caller should reject the request).
function resolveExpectedAmount(listingType, planKey, coupon) {
  const prices = PLAN_PRICES[listingType];
  if (!prices) return null;

  const normalised = (planKey || 'free').toLowerCase().trim();
  if (!(normalised in prices)) return null;

  let amountPaise = prices[normalised];

  // Apply server-validated coupon discount
  if (coupon && amountPaise > 0) {
    if (coupon.type === 'percent') {
      amountPaise = Math.max(0, amountPaise - Math.round((amountPaise * coupon.value) / 100));
    } else if (coupon.type === 'flat') {
      amountPaise = Math.max(0, amountPaise - coupon.value * 100);
    }
    // free_days: amount is unchanged — the coupon adds bonus days, not a price discount
  }

  return amountPaise;
}

// ── FIX #7: Resolve plan days from server table, never from client. ───────────
function resolvePlanDays(listingType, planKey) {
  const days = PLAN_DAYS[listingType];
  if (!days) return 30;
  const normalised = (planKey || 'free').toLowerCase().trim();
  return days[normalised] || 30;
}

// Return extra listing days granted by a free_days coupon (0 for all other types).
function resolveExtraDays(coupon) {
  if (coupon?.type === 'free_days') return parseInt(coupon.value) || 0;
  return 0;
}

// ── Helper: resolve how many credits to apply and what remains to pay ──────────
// 1 credit = ₹1 = 100 paise.
// Returns { creditsToUse, remainingPaise }
function resolveCredits(userCredits, amountPaise) {
  if (!userCredits || userCredits <= 0 || amountPaise <= 0) {
    return { creditsToUse: 0, remainingPaise: amountPaise };
  }
  const maxCreditsPaise = userCredits * 100;
  const creditsPaise    = Math.min(maxCreditsPaise, amountPaise);
  const creditsToUse    = Math.ceil(creditsPaise / 100); // credits spent (1 credit = ₹1)
  const remainingPaise  = amountPaise - creditsToUse * 100;
  return { creditsToUse, remainingPaise };
}

// ── Helper: deduct credits from user inside a transaction ─────────────────────
async function deductCredits(dbClient, userId, creditsToUse) {
  if (!creditsToUse || creditsToUse <= 0) return;
  await dbClient.query(
    `UPDATE users SET referral_credits = GREATEST(0, referral_credits - $1) WHERE id = $2`,
    [creditsToUse, userId]
  );
}

// ── Helper: common signature check + free-plan bypass ─────────────────────────
// expectedAmountPaise must come from resolveExpectedAmount() — never from req.body.
function checkPayment(req, expectedAmountPaise) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  // Free plan — determined by server pricing, not client-supplied amount
  if (expectedAmountPaise === 0) {
    return { ok: true, free: true };
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return { ok: false, error: 'Missing payment verification fields.' };
  }

  return verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
}

// ── Helper: replay-attack guard ───────────────────────────────────────────────
// Rejects any razorpay_payment_id already in the payments table.
// The DB also enforces this via a UNIQUE partial index, but checking here gives
// a clean error message instead of a raw constraint violation.
// Must be called inside the same DB transaction (pass client) so the check and
// insert are atomic.
async function rejectIfDuplicatePayment(dbClient, paymentId) {
  if (!paymentId) return null; // free-plan — no payment ID to check
  const { rows } = await dbClient.query(
    'SELECT id FROM payments WHERE razorpay_payment_id = $1 LIMIT 1',
    [paymentId]
  );
  if (rows.length > 0) {
    return { ok: false, error: 'This payment has already been used.' };
  }
  return null; // null means no duplicate — proceed
}

// ── Helper: resolve coupon inside a transaction ───────────────────────────────
async function resolveCoupon(dbClient, couponId, userId) {
  if (!couponId) return null;
  const { rows: cr } = await dbClient.query(
    `SELECT * FROM coupon_codes WHERE id = $1 AND is_active = TRUE
       AND (valid_until IS NULL OR valid_until >= NOW())
       AND (max_uses IS NULL OR uses_count < max_uses)
       AND NOT EXISTS (
         SELECT 1 FROM coupon_usage
         WHERE coupon_id = $1 AND user_id = $2
       )`,
    [couponId, userId]
  );
  return cr[0] || null;
}

// ── FIX #1 + #6: save payment record using server-computed amount inside txn ──
// `serverAmountPaise` is the value from resolveExpectedAmount(), never req.body.amount.
async function savePayment(dbClient, userId, { serverAmountPaise, plan, paymentId, orderId }) {
  // Convert paise → rupees for storage
  const amountInRupees = Math.round((serverAmountPaise || 0) / 100);
  const { rows } = await dbClient.query(
    `INSERT INTO payments (user_id, amount, plan, razorpay_payment_id, razorpay_order_id, status)
     VALUES ($1, $2, $3, $4, $5, 'paid') RETURNING id`,
    [userId, amountInRupees, plan, paymentId || null, orderId || null]
  );
  return rows[0].id;
}

// ── FIX #6: mark coupon used inside the same transaction ─────────────────────
async function markCouponUsed(dbClient, couponId, userId) {
  if (!couponId) return;
  await dbClient.query(
    `INSERT INTO coupon_usage (coupon_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [couponId, userId]
  );
  await dbClient.query(
    `UPDATE coupon_codes SET uses_count = uses_count + 1 WHERE id = $1`,
    [couponId]
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/order — create Razorpay order (Step 1, shared by all screens)
//
// Expects: { listingType, plan, couponId?, description? }
//   listingType — one of: job | room | vehicle | buysell
//   plan        — one of the keys in PLAN_PRICES for that listing type
//   couponId    — optional; validated server-side before applying discount
//
// The client MUST NOT send an amount. The server derives the canonical price
// from PLAN_PRICES so it cannot be manipulated by the caller.
// ══════════════════════════════════════════════════════════════════════════════
router.post('/order', auth, async (req, res) => {
  try {
    const { listingType, plan, couponId, description } = req.body;

    // Validate listing type and plan against server-authoritative price table
    if (!listingType || !plan) {
      return res.json({ ok: false, error: 'listingType and plan are required.' });
    }

    // Resolve coupon server-side (same logic as /verify routes)
    let couponRow = null;
    if (couponId) {
      const { rows: cr } = await pool.query(
        `SELECT * FROM coupon_codes WHERE id = $1 AND is_active = TRUE
           AND (valid_until IS NULL OR valid_until >= NOW())
           AND (max_uses IS NULL OR uses_count < max_uses)
           AND NOT EXISTS (
             SELECT 1 FROM coupon_usage
             WHERE coupon_id = $1 AND user_id = $2
           )`,
        [couponId, req.user.id]
      );
      couponRow = cr[0] || null;
    }

    // Derive the canonical amount — returns null for unrecognised type/plan
    const amount = resolveExpectedAmount(listingType, plan, couponRow);
    if (amount === null) {
      return res.json({ ok: false, error: 'Invalid listing type or plan.' });
    }

    // Apply user credits (1 credit = ₹1 = 100 paise)
    const { rows: userRows } = await pool.query(
      'SELECT referral_credits FROM users WHERE id = $1', [req.user.id]
    );
    const userCredits = userRows[0]?.referral_credits || 0;
    const { creditsToUse, remainingPaise } = resolveCredits(userCredits, amount);

    // Fully covered by credits — no Razorpay order needed
    if (remainingPaise === 0) {
      return res.json({ ok: true, free: true, creditsToUse, creditsApplied: creditsToUse * 100 });
    }

    // Free plan — no Razorpay order needed
    if (amount === 0) {
      return res.json({ ok: true, free: true });
    }

    const rzp = getRazorpay();
    if (!rzp) {
      return res.json({
        ok: false,
        error: 'Payment gateway not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to Railway.',
      });
    }

    const order = await rzp.orders.create({
      amount: remainingPaise,  // paise after credits deducted
      currency: 'INR',
      receipt: `rcpt_${req.user.id}_${Date.now()}`,
      notes: { description, userId: req.user.id, listingType, plan, creditsToUse },
    });

    // Return server-computed amounts so UI can display correctly
    res.json({ ok: true, orderId: order.id, amount: remainingPaise, currency: 'INR', creditsToUse, creditsApplied: creditsToUse * 100 });
  } catch (err) {
    console.error('Razorpay order error:', err);
    res.json({ ok: false, error: 'Failed to create payment order.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/verify — verify + create JOB listing (PostJobScreen)
// FIX #1: saves expectedAmount (server-computed), not req.body.amount
// FIX #6: all writes wrapped in a single DB transaction
// FIX #7: planDays from server PLAN_DAYS table, not req.body.days
// ══════════════════════════════════════════════════════════════════════════════
router.post('/verify', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, job, plan, couponId, creditsToUse: clientCredits } = req.body;
    // NOTE: `amount` and `days` from req.body are intentionally NOT used below.

    await client.query('BEGIN');

    // Resolve coupon inside the transaction (locks against concurrent use)
    const couponRow = await resolveCoupon(client, couponId, req.user.id);

    const expectedAmount = resolveExpectedAmount('job', plan, couponRow);
    if (expectedAmount === null) {
      await client.query('ROLLBACK');
      return res.json({ ok: false, error: 'Invalid plan.' });
    }

    // Apply credits server-side (re-read from DB, never trust client)
    const { rows: uRows } = await client.query('SELECT referral_credits FROM users WHERE id = $1', [req.user.id]);
    const userCredits = uRows[0]?.referral_credits || 0;
    const { creditsToUse, remainingPaise } = resolveCredits(userCredits, expectedAmount);

    const check = checkPayment(req, remainingPaise);
    if (!check.ok) {
      await client.query('ROLLBACK');
      return res.json({ ok: false, error: check.error });
    }

    // Replay-attack guard inside the transaction
    if (!check.free) {
      const dupErr = await rejectIfDuplicatePayment(client, razorpay_payment_id);
      if (dupErr) {
        await client.query('ROLLBACK');
        return res.json(dupErr);
      }
    }

    // FIX #1: use server-computed expectedAmount, never req.body.amount
    const paymentId = await savePayment(client, req.user.id, {
      serverAmountPaise: remainingPaise,
      plan,
      paymentId: razorpay_payment_id || null,
      orderId:   razorpay_order_id   || null,
    });

    // Deduct credits atomically in same transaction
    await deductCredits(client, req.user.id, creditsToUse);

    // FIX #7: planDays from server table, not client
    const planDays = resolvePlanDays('job', plan) + resolveExtraDays(couponRow);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + planDays);

    // FIX #2 (jobs.js): featured/urgent derived from plan, not client flags
    const isFeatured = plan === 'featured';
    const isUrgent   = plan === 'urgent';

    const skillsArr = Array.isArray(job.skills)
      ? job.skills
      : typeof job.skills === 'string' && job.skills.trim()
        ? job.skills.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    const reqArr = Array.isArray(job.requirements)
      ? job.requirements
      : typeof job.requirements === 'string' && job.requirements.trim()
        ? job.requirements.split('\n').map(r => r.trim()).filter(Boolean)
        : [];

    const { rows } = await client.query(`
      INSERT INTO jobs (
        posted_by, title, company, category, type, location, salary,
        phone, whatsapp, description, skills, requirements,
        education, experience, hours, openings,
        featured, urgent, expires_at, district
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING *
    `, [
      req.user.id,
      job.title, job.company, job.category,
      job.type || 'Full-time', job.location, job.salary || '',
      job.phone, job.whatsapp || job.phone, job.description,
      skillsArr, reqArr,
      job.education || '', job.experience || '', job.hours || '', job.openings || '1',
      isFeatured, isUrgent, expiresAt,
      job.district || 'nanded',
    ]);

    // Link payment → job
    await client.query('UPDATE payments SET job_id = $1 WHERE id = $2', [rows[0].id, paymentId]);

    // FIX #6: coupon marked used atomically inside the same transaction
    await markCouponUsed(client, couponId, req.user.id);

    await client.query('COMMIT');
    res.json({ ok: true, job: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('verify/job error:', err);
    res.json({ ok: false, error: 'Failed to create job after payment.' });
  } finally {
    client.release();
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/verify/room — verify + create ROOM listing (PostRoomScreen)
// FIX #1: saves expectedAmount (server-computed), not req.body.amount
// FIX #6: all writes wrapped in a single DB transaction
// FIX #7: planDays from server PLAN_DAYS table, not req.body.days
// ══════════════════════════════════════════════════════════════════════════════
router.post('/verify/room', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, room, plan, couponId } = req.body;
    // NOTE: `amount` and `days` from req.body are intentionally NOT used below.

    // Validate required fields FIRST — before touching the payment or DB transaction.
    // If we validate after checkPayment(), the Razorpay charge has already been
    // captured and a DB ROLLBACK won't reverse the money taken from the user.
    if (!room?.rent || !room?.area || !room?.whatsapp) {
      return res.json({ ok: false, error: 'Rent, area, and WhatsApp are required.' });
    }

    await client.query('BEGIN');

    const couponRow = await resolveCoupon(client, couponId, req.user.id);

    const expectedAmount = resolveExpectedAmount('room', plan, couponRow);
    if (expectedAmount === null) {
      await client.query('ROLLBACK');
      return res.json({ ok: false, error: 'Invalid plan.' });
    }

    const { rows: uRowsR } = await client.query('SELECT referral_credits FROM users WHERE id = $1', [req.user.id]);
    const { creditsToUse: creditsR, remainingPaise: remainR } = resolveCredits(uRowsR[0]?.referral_credits || 0, expectedAmount);

    const check = checkPayment(req, remainR);
    if (!check.ok) {
      await client.query('ROLLBACK');
      return res.json({ ok: false, error: check.error });
    }

    if (!check.free) {
      const dupErr = await rejectIfDuplicatePayment(client, razorpay_payment_id);
      if (dupErr) {
        await client.query('ROLLBACK');
        return res.json(dupErr);
      }
    }

    // FIX #1
    await savePayment(client, req.user.id, {
      serverAmountPaise: remainR,
      plan,
      paymentId: razorpay_payment_id || null,
      orderId:   razorpay_order_id   || null,
    });
    await deductCredits(client, req.user.id, creditsR);

    // FIX #7
    const planDays = resolvePlanDays('room', plan) + resolveExtraDays(couponRow);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + planDays);

    const { rows } = await client.query(`
      INSERT INTO rooms (
        posted_by, room_type, for_gender, furnished, floor, total_floors,
        bhk_size, facing, vacancies, rent, deposit, maintenance, broker_free,
        amenities, rules, available_from, tenant_pref,
        area, address, landmark, owner_name, whatsapp, description, photos,
        plan_days, plan_label, plan_price, expires_at, district
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,
        $25,$26,$27,$28,$29
      ) RETURNING *
    `, [
      req.user.id,
      room.roomType || 'PG', room.forGender || 'Any', room.furnished || 'Semi-furnished',
      room.floor || '', room.totalFloors || '', room.bhkSize || '', room.facing || '',
      parseInt(room.vacancies) || 1,
      room.rent, room.deposit || '', room.maintenance || '', room.brokerFree !== false,
      JSON.stringify(room.amenities || []), JSON.stringify(room.rules || []),
      room.availableFrom || 'Immediately', room.tenantPref || 'Any',
      room.area, room.address || '', room.landmark || '', room.ownerName || '', room.whatsapp,
      room.description || '', JSON.stringify(room.photos || []),
      planDays, room.planLabel || plan || '1 Month', Math.round(expectedAmount / 100),
      expiresAt, room.district || 'nanded',
    ]);

    // FIX #6
    await markCouponUsed(client, couponId, req.user.id);

    await client.query('COMMIT');
    res.json({ ok: true, room: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('verify/room error:', err);
    res.json({ ok: false, error: 'Failed to create room listing after payment.' });
  } finally {
    client.release();
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/verify/vehicle — verify + create VEHICLE listing (PostCarScreen)
// FIX #1: saves expectedAmount (server-computed), not req.body.amount
// FIX #6: all writes wrapped in a single DB transaction
// FIX #7: planDays from server PLAN_DAYS table, not req.body.days
// ══════════════════════════════════════════════════════════════════════════════
router.post('/verify/vehicle', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, vehicle, plan, couponId } = req.body;
    // NOTE: `amount` and `days` from req.body are intentionally NOT used below.

    // Validate required fields FIRST — before touching the payment or DB transaction.
    if (!vehicle?.dailyRate || !vehicle?.area || !vehicle?.whatsapp) {
      return res.json({ ok: false, error: 'Daily rate, area, and WhatsApp are required.' });
    }

    await client.query('BEGIN');

    const couponRow = await resolveCoupon(client, couponId, req.user.id);

    const expectedAmount = resolveExpectedAmount('vehicle', plan, couponRow);
    if (expectedAmount === null) {
      await client.query('ROLLBACK');
      return res.json({ ok: false, error: 'Invalid plan.' });
    }

    const { rows: uRowsV } = await client.query('SELECT referral_credits FROM users WHERE id = $1', [req.user.id]);
    const { creditsToUse: creditsV, remainingPaise: remainV } = resolveCredits(uRowsV[0]?.referral_credits || 0, expectedAmount);

    const check = checkPayment(req, remainV);
    if (!check.ok) {
      await client.query('ROLLBACK');
      return res.json({ ok: false, error: check.error });
    }

    if (!check.free) {
      const dupErr = await rejectIfDuplicatePayment(client, razorpay_payment_id);
      if (dupErr) {
        await client.query('ROLLBACK');
        return res.json(dupErr);
      }
    }

    // FIX #1
    await savePayment(client, req.user.id, {
      serverAmountPaise: remainV,
      plan,
      paymentId: razorpay_payment_id || null,
      orderId:   razorpay_order_id   || null,
    });
    await deductCredits(client, req.user.id, creditsV);

    // FIX #7
    const planDays = resolvePlanDays('vehicle', plan) + resolveExtraDays(couponRow);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + planDays);

    const { rows } = await client.query(`
      INSERT INTO vehicles (
        posted_by, vehicle_type, name, year, color, fuel_type, transmission,
        ac_type, seats, daily_rate, hourly_rate, km_limit, extra_km_rate,
        min_booking, advance_amt, purpose, includes, availability,
        area, address, owner_name, whatsapp, description, photos,
        plan_days, plan_label, plan_price, expires_at, district
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,
        $25,$26,$27,$28,$29
      ) RETURNING *
    `, [
      req.user.id,
      vehicle.vehicleType || 'Car',
      vehicle.name || vehicle.vehicleType || 'Vehicle',
      vehicle.year || '', vehicle.color || '',
      vehicle.fuelType || 'Petrol', vehicle.transmission || 'Manual',
      vehicle.acType || 'AC', vehicle.seats || '5',
      vehicle.dailyRate, vehicle.hourlyRate || '',
      vehicle.kmLimit || '', vehicle.extraKmRate || '',
      vehicle.minBooking || '1', vehicle.advanceAmt || '',
      vehicle.purpose || '', JSON.stringify(vehicle.includes || []),
      JSON.stringify(vehicle.availability || []),
      vehicle.area, vehicle.address || '', vehicle.ownerName || '',
      vehicle.whatsapp, vehicle.description || '',
      JSON.stringify(vehicle.photos || []),
      planDays, vehicle.planLabel || plan || '1 Month', Math.round(expectedAmount / 100),
      expiresAt, vehicle.district || 'nanded',
    ]);

    // FIX #6
    await markCouponUsed(client, couponId, req.user.id);

    await client.query('COMMIT');
    res.json({ ok: true, vehicle: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('verify/vehicle error:', err);
    res.json({ ok: false, error: 'Failed to create vehicle listing after payment.' });
  } finally {
    client.release();
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/verify/buysell — verify + create BUY-SELL listing (PostItemScreen)
// FIX #1: saves expectedAmount (server-computed), not req.body.amount
// FIX #6: all writes wrapped in a single DB transaction
// FIX #7: planDays from server PLAN_DAYS table, not req.body.days
// ══════════════════════════════════════════════════════════════════════════════
router.post('/verify/buysell', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, item, plan, couponId } = req.body;
    // NOTE: `amount` and `days` from req.body are intentionally NOT used below.

    // Validate required fields FIRST — before touching the payment or DB transaction.
    if (!item?.title || !item?.price || !item?.whatsapp) {
      return res.json({ ok: false, error: 'Title, price, and WhatsApp are required.' });
    }

    await client.query('BEGIN');

    const couponRow = await resolveCoupon(client, couponId, req.user.id);

    const expectedAmount = resolveExpectedAmount('buysell', plan, couponRow);
    if (expectedAmount === null) {
      await client.query('ROLLBACK');
      return res.json({ ok: false, error: 'Invalid plan.' });
    }

    const { rows: uRowsB } = await client.query('SELECT referral_credits FROM users WHERE id = $1', [req.user.id]);
    const { creditsToUse: creditsB, remainingPaise: remainB } = resolveCredits(uRowsB[0]?.referral_credits || 0, expectedAmount);

    const check = checkPayment(req, remainB);
    if (!check.ok) {
      await client.query('ROLLBACK');
      return res.json({ ok: false, error: check.error });
    }

    if (!check.free) {
      const dupErr = await rejectIfDuplicatePayment(client, razorpay_payment_id);
      if (dupErr) {
        await client.query('ROLLBACK');
        return res.json(dupErr);
      }
    }

    // FIX #1
    await savePayment(client, req.user.id, {
      serverAmountPaise: remainB,
      plan,
      paymentId: razorpay_payment_id || null,
      orderId:   razorpay_order_id   || null,
    });
    await deductCredits(client, req.user.id, creditsB);

    // FIX #7
    const planDays = resolvePlanDays('buysell', plan) + resolveExtraDays(couponRow);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + planDays);

    const { rows } = await client.query(`
      INSERT INTO buysell_items (
        posted_by, title, category, condition, age,
        price, negotiable, area, description, whatsapp,
        photos, plan_days, plan_label, plan_price, expires_at, district
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
      ) RETURNING *
    `, [
      req.user.id,
      item.title.trim(),
      item.category    || 'Other',
      item.condition   || 'Good',
      item.age         || 'Unknown',
      parseInt(item.price) || 0,
      item.negotiable  !== false,
      item.area        || '',
      item.description || '',
      item.whatsapp.trim(),
      JSON.stringify(item.photos || []),
      planDays, item.planLabel || plan || '15 Days', Math.round(expectedAmount / 100),
      expiresAt, item.district || 'nanded',
    ]);

    // FIX #6
    await markCouponUsed(client, couponId, req.user.id);

    await client.query('COMMIT');
    res.json({ ok: true, item: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('verify/buysell error:', err);
    res.json({ ok: false, error: 'Failed to create listing after payment.' });
  } finally {
    client.release();
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/verify/promotion — verify + create PROMOTION (PromoteBusinessScreen)
// FIX #1: saves server-computed price, not req.body.amount
// FIX #6: all writes wrapped in a single DB transaction
// FIX #7: days come from server PROMOTION_PLANS table, not client
// ══════════════════════════════════════════════════════════════════════════════

const PROMOTION_PLANS = {
  basic:   { price: 99,  days: 7  },
  popular: { price: 249, days: 15 },
  premium: { price: 499, days: 30 },
};

const BANNER_COLORS = {
  bold:  '#e82828',
  clean: '#f97316',
  vivid: '#f97316',
};

router.post('/verify/promotion', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, promotion } = req.body;
    // NOTE: `amount` from req.body is intentionally NOT used below.

    // Validate required fields FIRST — before touching the payment or DB transaction.
    if (!promotion?.bizName?.trim())  return res.json({ ok: false, error: 'Business name is required.' });
    if (!promotion?.phone?.trim())    return res.json({ ok: false, error: 'Contact number is required.' });
    if (!promotion?.category?.trim()) return res.json({ ok: false, error: 'Category is required.' });
    if (!promotion?.location?.trim()) return res.json({ ok: false, error: 'Location is required.' });

    await client.query('BEGIN');

    const planKey  = promotion?.plan || 'basic';
    const planMeta = PROMOTION_PLANS[planKey];
    if (!planMeta) {
      await client.query('ROLLBACK');
      return res.json({ ok: false, error: 'Invalid promotion plan.' });
    }

    // Promotions are always paid — price comes from server table, never the client
    const expectedAmountPaise = planMeta.price * 100;

    // Apply credits server-side
    const { rows: uRowsP } = await client.query('SELECT referral_credits FROM users WHERE id = $1', [req.user.id]);
    const { creditsToUse: creditsP, remainingPaise: remainP } = resolveCredits(uRowsP[0]?.referral_credits || 0, expectedAmountPaise);

    const check = checkPayment(req, remainP);
    if (!check.ok) {
      await client.query('ROLLBACK');
      return res.json({ ok: false, error: check.error });
    }

    if (!check.free) {
      const dupErr = await rejectIfDuplicatePayment(client, razorpay_payment_id);
      if (dupErr) {
        await client.query('ROLLBACK');
        return res.json(dupErr);
      }
    }

    const { price, days } = planMeta;
    const accentColor = BANNER_COLORS[promotion?.bannerStyle] || '#f97316';

    // FIX #1: use server-computed price
    await savePayment(client, req.user.id, {
      serverAmountPaise: remainP,
      plan:   planKey,
      paymentId: razorpay_payment_id || null,
      orderId:   razorpay_order_id   || null,
    });
    await deductCredits(client, req.user.id, creditsP);

    // FIX #7: days from server table
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { rows } = await client.query(
      `INSERT INTO business_promotions
         (user_id, biz_name, tagline, phone, category, location, address,
          website, description, plan, plan_price, plan_days,
          banner_style, accent_color, status, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'active',$15)
       RETURNING *`,
      [
        req.user.id,
        promotion.bizName.trim(),
        promotion.tagline?.trim()     || null,
        promotion.phone.trim(),
        promotion.category.trim(),
        promotion.location.trim(),
        promotion.address?.trim()     || null,
        promotion.website?.trim()     || null,
        promotion.description?.trim() || null,
        planKey, price, days,
        promotion.bannerStyle || 'clean', accentColor,
        expiresAt,
      ]
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

module.exports = router;
