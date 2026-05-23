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

// ── Helper: save a payment record ─────────────────────────────────────────────
async function savePayment(userId, { amount, plan, paymentId, orderId }) {
  // Razorpay amounts are in paise (1 ₹ = 100 paise). Convert to rupees before storing.
  const amountInRupees = Math.round((amount || 0) / 100);
  const { rows } = await pool.query(
    `INSERT INTO payments (user_id, amount, plan, razorpay_payment_id, razorpay_order_id, status)
     VALUES ($1, $2, $3, $4, $5, 'paid') RETURNING id`,
    [userId, amountInRupees, plan, paymentId || null, orderId || null]
  );
  return rows[0].id;
}

// ── Helper: common signature check + free-plan bypass ─────────────────────────
function checkPayment(req) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

  // Free plan — skip signature
  if (!razorpay_order_id && (amount === 0 || amount === '0')) {
    return { ok: true, free: true };
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return { ok: false, error: 'Missing payment verification fields.' };
  }

  return verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
}

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/order — create Razorpay order (Step 1, shared by all screens)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/order', auth, async (req, res) => {
  try {
    const { amount, description } = req.body; // amount in paise

    if (amount === undefined || amount < 0) {
      return res.json({ ok: false, error: 'Invalid amount.' });
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
      amount,           // paise
      currency: 'INR',
      receipt: `rcpt_${req.user.id}_${Date.now()}`,
      notes: { description, userId: req.user.id },
    });

    res.json({ ok: true, orderId: order.id, amount, currency: 'INR' });
  } catch (err) {
    console.error('Razorpay order error:', err);
    res.json({ ok: false, error: 'Failed to create payment order.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/verify — verify + create JOB listing (PostJobScreen)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/verify', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, job, plan, amount, days } = req.body;

    const check = checkPayment(req);
    if (!check.ok) return res.json({ ok: false, error: check.error });

    // Save payment record
    const paymentId = await savePayment(req.user.id, {
      amount, plan,
      paymentId: razorpay_payment_id || null,
      orderId:   razorpay_order_id   || null,
    });

    const planDays = parseInt(days) || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + planDays);

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

    const { rows } = await pool.query(`
      INSERT INTO jobs (
        posted_by, title, company, category, type, location, salary,
        phone, whatsapp, description, skills, requirements,
        education, experience, hours, openings,
        featured, urgent, expires_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *
    `, [
      req.user.id,
      job.title, job.company, job.category,
      job.type || 'Full-time', job.location, job.salary || '',
      job.phone, job.whatsapp || job.phone, job.description,
      skillsArr, reqArr,
      job.education || '', job.experience || '', job.hours || '', job.openings || '1',
      !!job.featured, !!job.urgent, expiresAt,
    ]);

    // Link payment → job
    await pool.query('UPDATE payments SET job_id = $1 WHERE id = $2', [rows[0].id, paymentId]);

    res.json({ ok: true, job: rows[0] });
  } catch (err) {
    console.error('verify/job error:', err);
    res.json({ ok: false, error: 'Failed to create job after payment.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/verify/room — verify + create ROOM listing (PostRoomScreen)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/verify/room', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, room, plan, amount, days } = req.body;

    const check = checkPayment(req);
    if (!check.ok) return res.json({ ok: false, error: check.error });

    await savePayment(req.user.id, {
      amount, plan,
      paymentId: razorpay_payment_id || null,
      orderId:   razorpay_order_id   || null,
    });

    const planDays = parseInt(days) || parseInt(room?.planDays) || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + planDays);

    if (!room?.rent || !room?.area || !room?.whatsapp) {
      return res.json({ ok: false, error: 'Rent, area, and WhatsApp are required.' });
    }

    const { rows } = await pool.query(`
      INSERT INTO rooms (
        posted_by, room_type, for_gender, furnished, floor, total_floors,
        bhk_size, facing, vacancies, rent, deposit, maintenance, broker_free,
        amenities, rules, available_from, tenant_pref,
        area, address, landmark, owner_name, whatsapp, description, photos,
        plan_days, plan_label, plan_price, expires_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,
        $25,$26,$27,$28
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
      planDays, room.planLabel || plan || '1 Month', parseInt(room.planPrice) || 0,
      expiresAt,
    ]);

    res.json({ ok: true, room: rows[0] });
  } catch (err) {
    console.error('verify/room error:', err);
    res.json({ ok: false, error: 'Failed to create room listing after payment.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/verify/vehicle — verify + create VEHICLE listing (PostCarScreen)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/verify/vehicle', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, vehicle, plan, amount, days } = req.body;

    const check = checkPayment(req);
    if (!check.ok) return res.json({ ok: false, error: check.error });

    await savePayment(req.user.id, {
      amount, plan,
      paymentId: razorpay_payment_id || null,
      orderId:   razorpay_order_id   || null,
    });

    const planDays = parseInt(days) || parseInt(vehicle?.planDays) || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + planDays);

    if (!vehicle?.dailyRate || !vehicle?.area || !vehicle?.whatsapp) {
      return res.json({ ok: false, error: 'Daily rate, area, and WhatsApp are required.' });
    }

    const { rows } = await pool.query(`
      INSERT INTO vehicles (
        posted_by, vehicle_type, name, year, color, fuel_type, transmission,
        ac_type, seats, daily_rate, hourly_rate, km_limit, extra_km_rate,
        min_booking, advance_amt, purpose, includes, availability,
        area, address, owner_name, whatsapp, description, photos,
        plan_days, plan_label, plan_price, expires_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,
        $25,$26,$27,$28
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
      planDays, vehicle.planLabel || plan || '1 Month', parseInt(vehicle.planPrice) || 0,
      expiresAt,
    ]);

    res.json({ ok: true, vehicle: rows[0] });
  } catch (err) {
    console.error('verify/vehicle error:', err);
    res.json({ ok: false, error: 'Failed to create vehicle listing after payment.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/verify/buysell — verify + create BUY-SELL listing (PostItemScreen)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/verify/buysell', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, item, plan, amount, days } = req.body;

    const check = checkPayment(req);
    if (!check.ok) return res.json({ ok: false, error: check.error });

    await savePayment(req.user.id, {
      amount, plan,
      paymentId: razorpay_payment_id || null,
      orderId:   razorpay_order_id   || null,
    });

    const planDays = parseInt(days) || parseInt(item?.planDays) || 15;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + planDays);

    if (!item?.title || !item?.price || !item?.whatsapp) {
      return res.json({ ok: false, error: 'Title, price, and WhatsApp are required.' });
    }

    const { rows } = await pool.query(`
      INSERT INTO buysell_items (
        posted_by, title, category, condition, age,
        price, negotiable, area, description, whatsapp,
        photos, plan_days, plan_label, plan_price, expires_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
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
      planDays, item.planLabel || plan || '15 Days', parseInt(item.planPrice) || 0,
      expiresAt,
    ]);

    res.json({ ok: true, item: rows[0] });
  } catch (err) {
    console.error('verify/buysell error:', err);
    res.json({ ok: false, error: 'Failed to create listing after payment.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/payments/verify/promotion — verify + create PROMOTION (PromoteBusinessScreen)
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
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, promotion, amount } = req.body;

    const check = checkPayment(req);
    if (!check.ok) return res.json({ ok: false, error: check.error });

    const planKey   = promotion?.plan || 'basic';
    const planMeta  = PROMOTION_PLANS[planKey];
    if (!planMeta) return res.json({ ok: false, error: 'Invalid promotion plan.' });

    const { price, days } = planMeta;
    const accentColor     = BANNER_COLORS[promotion?.bannerStyle] || '#f97316';

    await savePayment(req.user.id, {
      amount: amount || price * 100,
      plan:   planKey,
      paymentId: razorpay_payment_id || null,
      orderId:   razorpay_order_id   || null,
    });

    if (!promotion?.bizName?.trim())  return res.json({ ok: false, error: 'Business name is required.' });
    if (!promotion?.phone?.trim())    return res.json({ ok: false, error: 'Contact number is required.' });
    if (!promotion?.category?.trim()) return res.json({ ok: false, error: 'Category is required.' });
    if (!promotion?.location?.trim()) return res.json({ ok: false, error: 'Location is required.' });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { rows } = await pool.query(
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

    res.json({ ok: true, promotion: rows[0] });
  } catch (err) {
    console.error('verify/promotion error:', err);
    res.json({ ok: false, error: 'Failed to create promotion after payment.' });
  }
});

module.exports = router;
