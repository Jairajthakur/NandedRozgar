/**
 * payments.js — Instamojo payment routes for CityPlus
 *
 * POST /api/payments/order            — Step 1: create Instamojo payment request → returns longurl
 * POST /api/payments/verify           — Step 2: verify + create JOB listing
 * POST /api/payments/verify/room      — Step 2: verify + create ROOM listing
 * POST /api/payments/verify/vehicle   — Step 2: verify + create VEHICLE listing
 * POST /api/payments/verify/buysell   — Step 2: verify + create BUY-SELL listing
 * POST /api/payments/verify/promotion — Step 2: verify + create PROMOTION listing
 *
 * ⚠️  Instamojo requires: INSTAMOJO_API_KEY and INSTAMOJO_AUTH_TOKEN in env vars
 *     Get these from: https://www.instamojo.com/developers/ → Credentials
 *     Trial account: no KYC needed, collect up to ₹9,999/month instantly.
 *
 * Flow:
 *   1. Client calls /order  → server creates Instamojo payment request → returns longurl
 *   2. Client opens longurl in WebView → user pays
 *   3. Instamojo redirects to redirect_url with ?payment_id=&payment_request_id=&payment_status=
 *   4. Client sends payment_id + payment_request_id to /verify route
 *   5. Server verifies with Instamojo API → creates listing
 */

const router   = require('express').Router();
const axios    = require('axios');
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// ── Instamojo API config ──────────────────────────────────────────────────────
const INSTAMOJO_BASE = process.env.NODE_ENV === 'production'
  ? 'https://www.instamojo.com/api/1.1'
  : 'https://test.instamojo.com/api/1.1';

// The URL Instamojo will redirect to after payment (must be publicly accessible)
// Instamojo appends: ?payment_id=XXX&payment_request_id=YYY&payment_status=Credit
const REDIRECT_URL = `${process.env.APP_URL || 'https://thecityplus.in'}/payment/callback`;

if (!process.env.INSTAMOJO_API_KEY || !process.env.INSTAMOJO_AUTH_TOKEN) {
  console.error(
    '[payments] WARNING: INSTAMOJO_API_KEY and/or INSTAMOJO_AUTH_TOKEN are not set. ' +
    'Add these env vars in Railway → Variables.'
  );
}

function getInstamojoHeaders() {
  return {
    'X-Api-Key':    process.env.INSTAMOJO_API_KEY,
    'X-Auth-Token': process.env.INSTAMOJO_AUTH_TOKEN,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
}

// ── Helper: verify payment with Instamojo API ─────────────────────────────────
async function verifyInstamojoPayment(paymentRequestId, paymentId) {
  try {
    const res = await axios.get(
      `${INSTAMOJO_BASE}/payment-requests/${paymentRequestId}/${paymentId}/`,
      { headers: getInstamojoHeaders() }
    );
    const payment = res.data?.payment;
    // status = "Credit" means successful payment
    if (payment?.status === 'Credit') {
      return { ok: true, amount: parseFloat(payment.amount), payment };
    }
    return { ok: false, error: `Payment not successful. Status: ${payment?.status || 'Unknown'}` };
  } catch (err) {
    console.error('Instamojo verify error:', err?.response?.data || err.message);
    return { ok: false, error: 'Could not verify payment with Instamojo.' };
  }
}

// ── Server-side plan pricing (₹). Never trust the client for these. ────────────
const PLAN_PRICES = {
  job:     { free: 0, featured: 99, urgent: 49, '7 days': 49,  '15 days': 79,  '30 days': 119 },
  room:    { free: 0, featured: 79, '15 days': 69, '1 month': 99,  '2 months': 169, '3 months': 229 },
  vehicle: { free: 0, featured: 79, '15 days': 69, '1 month': 99,  '2 months': 169, '3 months': 229 },
  buysell: { free: 0, featured: 49, '7 days': 39,  '15 days': 59,  '30 days': 89  },
  promotion: { basic: 49, popular: 79, premium: 99 },
};

const PLAN_DAYS = {
  job:     { free: 30, featured: 30, urgent: 30, '7 days': 7, '15 days': 15, '30 days': 30 },
  room:    { free: 30, featured: 30, '15 days': 15, '1 month': 30, '2 months': 60, '3 months': 90 },
  vehicle: { free: 30, featured: 30, '15 days': 15, '1 month': 30, '2 months': 60, '3 months': 90 },
  buysell: { free: 15, featured: 15, '7 days': 7, '15 days': 15, '30 days': 30 },
};

function resolveExpectedAmount(listingType, planKey, coupon) {
  const prices = PLAN_PRICES[listingType];
  if (!prices) return null;
  const normalised = (planKey || 'free').toLowerCase().trim();
  if (!(normalised in prices)) return null;
  let amount = prices[normalised]; // in ₹
  if (coupon && amount > 0) {
    if (coupon.type === 'percent') amount = Math.max(0, amount - Math.round(amount * coupon.value / 100));
    else if (coupon.type === 'flat') amount = Math.max(0, amount - coupon.value);
  }
  return amount; // returns ₹ (not paise)
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

async function savePayment(dbClient, userId, { amountRupees, plan, paymentId, paymentRequestId }) {
  const { rows } = await dbClient.query(
    `INSERT INTO payments (user_id, amount, plan, razorpay_payment_id, razorpay_order_id, status)
     VALUES ($1, $2, $3, $4, $5, 'paid') RETURNING id`,
    [userId, amountRupees || 0, plan, paymentId || null, paymentRequestId || null]
  );
  return rows[0].id;
}

async function markCouponUsed(dbClient, couponId, userId) {
  if (!couponId) return;
  await dbClient.query(`INSERT INTO coupon_usage (coupon_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [couponId, userId]);
  await dbClient.query(`UPDATE coupon_codes SET uses_count = uses_count + 1 WHERE id = $1`, [couponId]);
}

async function rejectIfDuplicatePayment(dbClient, paymentId) {
  if (!paymentId) return null;
  const { rows } = await dbClient.query('SELECT id FROM payments WHERE razorpay_payment_id = $1 LIMIT 1', [paymentId]);
  return rows.length > 0 ? { ok: false, error: 'This payment has already been used.' } : null;
}

async function resolveCoupon(dbClient, couponId, userId) {
  if (!couponId) return null;
  const { rows } = await dbClient.query(
    `SELECT * FROM coupon_codes WHERE id = $1 AND is_active = TRUE
     AND (valid_until IS NULL OR valid_until >= NOW())
     AND (max_uses IS NULL OR uses_count < max_uses)
     AND NOT EXISTS (SELECT 1 FROM coupon_usage WHERE coupon_id = $1 AND user_id = $2)`,
    [couponId, userId]
  );
  return rows[0] || null;
}

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/order — create Instamojo payment request (Step 1)
// Returns: { ok, free } for free plans, or { ok, longurl, paymentRequestId, amount }
// ══════════════════════════════════════════════════════════════════════════════
router.post('/order', auth, async (req, res) => {
  try {
    const { listingType, plan, couponId, description } = req.body;
    if (!listingType || !plan) return res.json({ ok: false, error: 'listingType and plan are required.' });

    let couponRow = null;
    if (couponId) {
      const { rows } = await pool.query(
        `SELECT * FROM coupon_codes WHERE id = $1 AND is_active = TRUE
         AND (valid_until IS NULL OR valid_until >= NOW())
         AND (max_uses IS NULL OR uses_count < max_uses)
         AND NOT EXISTS (SELECT 1 FROM coupon_usage WHERE coupon_id = $1 AND user_id = $2)`,
        [couponId, req.user.id]
      );
      couponRow = rows[0] || null;
    }

    const amount = resolveExpectedAmount(listingType, plan, couponRow);
    if (amount === null) return res.json({ ok: false, error: 'Invalid listing type or plan.' });

    const { rows: userRows } = await pool.query(
      'SELECT referral_credits, name, phone FROM users WHERE id = $1', [req.user.id]
    );
    const user = userRows[0];
    const { creditsToUse, remaining } = resolveCredits(user?.referral_credits || 0, amount);

    // Free or fully covered by credits
    if (remaining === 0 || amount === 0) {
      return res.json({ ok: true, free: true, creditsToUse });
    }

    if (!process.env.INSTAMOJO_API_KEY || !process.env.INSTAMOJO_AUTH_TOKEN) {
      return res.json({ ok: false, error: 'Payment gateway is not configured. Please contact support.' });
    }

    // Instamojo minimum is ₹3
    if (remaining < 3) {
      return res.json({ ok: true, free: true, creditsToUse }); // treat as free if < ₹3
    }

    // Create Instamojo payment request
    const params = new URLSearchParams({
      purpose:                 description || `${listingType} listing - ${plan}`,
      amount:                  String(remaining),
      buyer_name:              user?.name  || 'User',
      phone:                   user?.phone || '',
      email:                   req.user.email || '',
      redirect_url:            REDIRECT_URL,
      send_email:              'false',
      send_sms:                'false',
      allow_repeated_payments: 'false',
    });

    const imRes = await axios.post(
      `${INSTAMOJO_BASE}/payment-requests/`,
      params.toString(),
      { headers: getInstamojoHeaders() }
    );

    if (!imRes.data?.success) {
      console.error('Instamojo order error:', imRes.data);
      return res.json({ ok: false, error: 'Failed to create payment request.' });
    }

    const pr = imRes.data.payment_request;
    res.json({
      ok:               true,
      longurl:          pr.longurl,          // open this in WebView
      paymentRequestId: pr.id,               // store this, needed for verify
      amount:           remaining,
      creditsToUse,
    });
  } catch (err) {
    console.error('Instamojo order error:', err?.response?.data || err);
    res.json({ ok: false, error: 'Failed to create payment order.' });
  }
});

// ── Shared verify helper ───────────────────────────────────────────────────────
async function sharedVerify(req, res, listingType, insertFn) {
  const client = await pool.connect();
  try {
    const { payment_id, payment_request_id, plan, couponId } = req.body;

    await client.query('BEGIN');

    const couponRow      = await resolveCoupon(client, couponId, req.user.id);
    const expectedAmount = resolveExpectedAmount(listingType, plan, couponRow);
    if (expectedAmount === null) { await client.query('ROLLBACK'); return res.json({ ok: false, error: 'Invalid plan.' }); }

    const { rows: uRows } = await client.query('SELECT referral_credits FROM users WHERE id = $1', [req.user.id]);
    const { creditsToUse, remaining } = resolveCredits(uRows[0]?.referral_credits || 0, expectedAmount);

    // Paid plan — verify with Instamojo
    if (remaining > 0) {
      if (!payment_id || !payment_request_id) {
        await client.query('ROLLBACK');
        return res.json({ ok: false, error: 'Missing payment_id or payment_request_id.' });
      }

      const dupErr = await rejectIfDuplicatePayment(client, payment_id);
      if (dupErr) { await client.query('ROLLBACK'); return res.json(dupErr); }

      const verification = await verifyInstamojoPayment(payment_request_id, payment_id);
      if (!verification.ok) { await client.query('ROLLBACK'); return res.json({ ok: false, error: verification.error }); }

      // Double-check amount (Instamojo returns the actual charged amount)
      if (verification.amount < remaining - 1) { // allow ₹1 tolerance for rounding
        await client.query('ROLLBACK');
        return res.json({ ok: false, error: 'Payment amount mismatch. Please contact support.' });
      }
    }

    await savePayment(client, req.user.id, {
      amountRupees:     remaining,
      plan,
      paymentId:        payment_id        || null,
      paymentRequestId: payment_request_id || null,
    });

    await deductCredits(client, req.user.id, creditsToUse);

    const planDays  = resolvePlanDays(listingType, plan) + resolveExtraDays(couponRow);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + planDays);

    const result = await insertFn(client, req, { planDays, expiresAt, expectedAmount });
    await markCouponUsed(client, couponId, req.user.id);
    await client.query('COMMIT');
    return res.json({ ok: true, ...result });
  } catch (err) {
    await client.query('ROLLBACK');
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
    const isFeatured = plan === 'featured', isUrgent = plan === 'urgent';
    const skillsArr = Array.isArray(job.skills) ? job.skills
      : typeof job.skills === 'string' && job.skills.trim() ? job.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
    const reqArr = Array.isArray(job.requirements) ? job.requirements
      : typeof job.requirements === 'string' && job.requirements.trim() ? job.requirements.split('\n').map(r => r.trim()).filter(Boolean) : [];
    const { rows } = await client.query(`
      INSERT INTO jobs (posted_by,title,company,category,type,location,salary,phone,whatsapp,description,
        skills,requirements,education,experience,hours,openings,featured,urgent,expires_at,district)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [req.user.id, job.title, job.company, job.category, job.type||'Full-time', job.location, job.salary||'',
       job.phone, job.whatsapp||job.phone, job.description, skillsArr, reqArr,
       job.education||'', job.experience||'', job.hours||'', job.openings||'1',
       isFeatured, isUrgent, expiresAt, job.district||'nanded']);
    return { job: rows[0] };
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/verify/room
// ══════════════════════════════════════════════════════════════════════════════
router.post('/verify/room', auth, (req, res) => {
  const { room } = req.body;
  if (!room?.rent || !room?.area || !room?.whatsapp) return res.json({ ok: false, error: 'Rent, area, and WhatsApp are required.' });
  return sharedVerify(req, res, 'room', async (client, req, { planDays, expiresAt, expectedAmount }) => {
    const { room, plan } = req.body;
    const { rows } = await client.query(`
      INSERT INTO rooms (posted_by,room_type,for_gender,furnished,floor,total_floors,bhk_size,facing,vacancies,
        rent,deposit,maintenance,broker_free,amenities,rules,available_from,tenant_pref,area,address,landmark,
        owner_name,whatsapp,description,photos,plan_days,plan_label,plan_price,expires_at,district)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29) RETURNING *`,
      [req.user.id, room.roomType||'PG', room.forGender||'Any', room.furnished||'Semi-furnished',
       room.floor||'', room.totalFloors||'', room.bhkSize||'', room.facing||'',
       parseInt(room.vacancies)||1, room.rent, room.deposit||'', room.maintenance||'', room.brokerFree!==false,
       JSON.stringify(room.amenities||[]), JSON.stringify(room.rules||[]),
       room.availableFrom||'Immediately', room.tenantPref||'Any', room.area, room.address||'',
       room.landmark||'', room.ownerName||'', room.whatsapp, room.description||'', JSON.stringify(room.photos||[]),
       planDays, room.planLabel||plan||'1 Month', expectedAmount, expiresAt, room.district||'nanded']);
    return { room: rows[0] };
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/verify/vehicle
// ══════════════════════════════════════════════════════════════════════════════
router.post('/verify/vehicle', auth, (req, res) => {
  const { vehicle } = req.body;
  if (!vehicle?.dailyRate || !vehicle?.area || !vehicle?.whatsapp) return res.json({ ok: false, error: 'Daily rate, area, and WhatsApp are required.' });
  return sharedVerify(req, res, 'vehicle', async (client, req, { planDays, expiresAt, expectedAmount }) => {
    const { vehicle, plan } = req.body;
    const { rows } = await client.query(`
      INSERT INTO vehicles (posted_by,vehicle_type,name,year,color,fuel_type,transmission,ac_type,seats,
        daily_rate,hourly_rate,km_limit,extra_km_rate,min_booking,advance_amt,purpose,includes,availability,
        area,address,owner_name,whatsapp,description,photos,plan_days,plan_label,plan_price,expires_at,district)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29) RETURNING *`,
      [req.user.id, vehicle.vehicleType||'Car', vehicle.name||vehicle.vehicleType||'Vehicle',
       vehicle.year||'', vehicle.color||'', vehicle.fuelType||'Petrol', vehicle.transmission||'Manual',
       vehicle.acType||'AC', vehicle.seats||'5', vehicle.dailyRate, vehicle.hourlyRate||'',
       vehicle.kmLimit||'', vehicle.extraKmRate||'', vehicle.minBooking||'1', vehicle.advanceAmt||'',
       vehicle.purpose||'', JSON.stringify(vehicle.includes||[]), JSON.stringify(vehicle.availability||[]),
       vehicle.area, vehicle.address||'', vehicle.ownerName||'', vehicle.whatsapp, vehicle.description||'',
       JSON.stringify(vehicle.photos||[]), planDays, vehicle.planLabel||plan||'1 Month',
       expectedAmount, expiresAt, vehicle.district||'nanded']);
    return { vehicle: rows[0] };
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/verify/buysell
// ══════════════════════════════════════════════════════════════════════════════
router.post('/verify/buysell', auth, (req, res) => {
  const { item } = req.body;
  if (!item?.title || !item?.price || !item?.whatsapp) return res.json({ ok: false, error: 'Title, price, and WhatsApp are required.' });
  return sharedVerify(req, res, 'buysell', async (client, req, { planDays, expiresAt, expectedAmount }) => {
    const { item, plan } = req.body;
    const { rows } = await client.query(`
      INSERT INTO buysell_items (posted_by,title,category,condition,age,price,negotiable,area,description,
        whatsapp,photos,plan_days,plan_label,plan_price,expires_at,district)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [req.user.id, item.title.trim(), item.category||'Other', item.condition||'Good', item.age||'Unknown',
       parseInt(item.price)||0, item.negotiable!==false, item.area||'', item.description||'', item.whatsapp.trim(),
       JSON.stringify(item.photos||[]), planDays, item.planLabel||plan||'15 Days', expectedAmount,
       expiresAt, item.district||'nanded']);
    return { item: rows[0] };
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/verify/promotion
// ══════════════════════════════════════════════════════════════════════════════
const PROMOTION_PLANS = { basic: { price: 49, days: 7 }, popular: { price: 79, days: 15 }, premium: { price: 99, days: 30 } };
const BANNER_COLORS   = { bold: '#e82828', clean: '#f97316', vivid: '#f97316' };

router.post('/verify/promotion', auth, async (req, res) => {
  const { promotion, payment_id, payment_request_id } = req.body;
  if (!promotion?.bizName?.trim())  return res.json({ ok: false, error: 'Business name is required.' });
  if (!promotion?.phone?.trim())    return res.json({ ok: false, error: 'Contact number is required.' });
  if (!promotion?.category?.trim()) return res.json({ ok: false, error: 'Category is required.' });
  if (!promotion?.location?.trim()) return res.json({ ok: false, error: 'Location is required.' });

  const client = await pool.connect();
  try {
    const planKey  = promotion?.plan || 'basic';
    const planMeta = PROMOTION_PLANS[planKey];
    if (!planMeta) return res.json({ ok: false, error: 'Invalid promotion plan.' });

    await client.query('BEGIN');

    const { rows: uRowsP } = await client.query('SELECT referral_credits FROM users WHERE id = $1', [req.user.id]);
    const { creditsToUse, remaining } = resolveCredits(uRowsP[0]?.referral_credits || 0, planMeta.price);

    if (remaining > 0) {
      if (!payment_id || !payment_request_id) { await client.query('ROLLBACK'); return res.json({ ok: false, error: 'Missing payment fields.' }); }
      const dupErr = await rejectIfDuplicatePayment(client, payment_id);
      if (dupErr) { await client.query('ROLLBACK'); return res.json(dupErr); }
      const verification = await verifyInstamojoPayment(payment_request_id, payment_id);
      if (!verification.ok) { await client.query('ROLLBACK'); return res.json({ ok: false, error: verification.error }); }
    }

    await savePayment(client, req.user.id, { amountRupees: remaining, plan: planKey, paymentId: payment_id||null, paymentRequestId: payment_request_id||null });
    await deductCredits(client, req.user.id, creditsToUse);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + planMeta.days);
    const accentColor = BANNER_COLORS[promotion?.bannerStyle] || '#f97316';

    const { rows } = await client.query(
      `INSERT INTO business_promotions (user_id,biz_name,tagline,phone,category,location,address,website,description,
         plan,plan_price,plan_days,banner_style,accent_color,status,expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'active',$15) RETURNING *`,
      [req.user.id, promotion.bizName.trim(), promotion.tagline?.trim()||null, promotion.phone.trim(),
       promotion.category.trim(), promotion.location.trim(), promotion.address?.trim()||null,
       promotion.website?.trim()||null, promotion.description?.trim()||null,
       planKey, planMeta.price, planMeta.days, promotion.bannerStyle||'clean', accentColor, expiresAt]
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
