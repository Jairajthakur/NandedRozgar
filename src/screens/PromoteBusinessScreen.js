/**
 * PromoteBusinessScreen.js — Business promotion / sponsored listing form
 *
 * ✅ Web  (sticky topBar, centred max-width, card layout)
 * ✅ Mobile / APK  (SafeArea, KeyboardAvoidingView, step form)
 *
 * Place at:  src/screens/PromoteBusinessScreen.js
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, StatusBar, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Animated, Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BannerStylePicker } from '../components/PromoBanner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { http } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useRazorpayCheckout } from '../utils/razorpay';

const ORANGE  = '#f97316';
const PURPLE  = '#7c3aed';
const IS_WEB  = Platform.OS === 'web';

// ─── Plans ────────────────────────────────────────────────────────────────────
// NOTE: Prices here MUST match the server-authoritative PROMOTION_PLANS table
// in src/routes/payments.js (basic=₹99, popular=₹249, premium=₹499).
const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 99,
    days: 7,
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    badge: null,
    perks: ['Banner on 1 listing screen', 'Reach up to 2,000 users', '7-day campaign'],
  },
  {
    id: 'popular',
    name: 'Popular',
    price: 249,
    days: 15,
    color: ORANGE,
    bg: '#fff7ed',
    border: '#fed7aa',
    badge: '🔥 MOST POPULAR',
    perks: ['Banner on ALL listing screens', 'Reach up to 8,000 users', '15-day campaign', 'Priority placement'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 499,
    days: 30,
    color: PURPLE,
    bg: '#faf5ff',
    border: '#e9d5ff',
    badge: '⭐ BEST VALUE',
    perks: ['Banner on ALL screens + Home', 'Reach up to 20,000 users', '30-day campaign', 'Priority + featured tag', 'WhatsApp enquiries'],
  },
];

const CATEGORIES = [
  'Restaurant / Food', 'Retail / Shop', 'Education / Coaching',
  'Healthcare / Clinic', 'Salon / Beauty', 'Real Estate',
  'Transport / Logistics', 'IT / Tech Services', 'Hotel / Lodge', 'Other',
];

const LOCATIONS = [
  'Nanded City', 'Vazirabad', 'Shivajinagar', 'Vishnupuri', 'Taroda Naka',
  'Cidco', 'Gangapur', 'Naigaon', 'Ardhapur', 'Mukhed', 'Hadgaon', 'Other',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function SectionLabel({ text, required }) {
  return (
    <Text style={s.sectionLabel}>
      {text}
      {required && <Text style={{ color: '#ef4444' }}> *</Text>}
    </Text>
  );
}

function StyledInput({ value, onChangeText, placeholder, multiline, numberOfLines, maxLength, keyboardType }) {
  const h = multiline ? (numberOfLines || 4) * 24 : 50;
  return (
    <View style={[s.inputWrap, multiline && { height: h, alignItems: 'flex-start' }]}>
      <TextInput
        style={[s.inputText, multiline && { textAlignVertical: 'top', paddingTop: 10 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#ccc"
        multiline={multiline}
        numberOfLines={numberOfLines}
        maxLength={maxLength}
        keyboardType={keyboardType || 'default'}
      />
    </View>
  );
}

function PillSelect({ options, value, onSelect }) {
  return (
    <View style={s.pillGrid}>
      {options.map(opt => {
        const active = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onSelect(opt)}
            style={[s.pill, active && s.pillActive]}
            activeOpacity={0.7}
          >
            <Text style={[s.pillTxt, active && s.pillTxtActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({ plan, selected, onSelect }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: !IS_WEB, speed: 40, bounciness: 0 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: !IS_WEB, speed: 22, bounciness: 8 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => onSelect(plan.id)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          s.planCard,
          { backgroundColor: plan.bg, borderColor: selected ? plan.color : '#e5e7eb' },
          selected && s.planCardActive,
        ]}
      >
        {plan.badge && (
          <View style={[s.planBadge, { backgroundColor: plan.color + '18', borderColor: plan.border }]}>
            <Text style={[s.planBadgeTxt, { color: plan.color }]}>{plan.badge}</Text>
          </View>
        )}

        <View style={s.planRow}>
          <View style={[s.planDot, { backgroundColor: selected ? plan.color : '#d1d5db' }]}>
            {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.planName, { color: plan.color }]}>{plan.name}</Text>
            <Text style={s.planDuration}>{plan.days}-day campaign</Text>
          </View>
          <View style={s.planPriceWrap}>
            <Text style={[s.planPrice, { color: plan.color }]}>₹{plan.price}</Text>
            <Text style={s.planPriceSub}>one-time</Text>
          </View>
        </View>

        <View style={s.planPerks}>
          {plan.perks.map((perk, i) => (
            <View key={i} style={s.perkRow}>
              <Ionicons name="checkmark-circle" size={14} color={plan.color} />
              <Text style={s.perkTxt}>{perk}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Preview Banner ───────────────────────────────────────────────────────────
// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function PromoteBusinessScreen() {
  const nav    = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { RazorpayCheckout, initiatePayment } = useRazorpayCheckout({ http, user });

  // Redirect to Login if not authenticated
  useEffect(() => {
    if (!user) {
      // On web Alert is often blocked; navigate directly instead
      if (IS_WEB) {
        nav.navigate('Login');
      } else {
        Alert.alert(
          'Login Required',
          'Please log in to promote your business.',
          [{ text: 'Log In', onPress: () => nav.navigate('Login') }]
        );
      }
    }
  }, [user]);

  const [form, setForm] = useState({
    bizName: '', tagline: '', phone: '', category: '', location: '',
    address: '', website: '', description: '',
  });
  const [selectedPlan, setSelectedPlan] = useState('popular');
  const [selectedBannerStyle, setSelectedBannerStyle] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg,   setErrorMsg]   = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const set = (key, val) => { setErrorMsg(''); setForm(prev => ({ ...prev, [key]: val })); };

  const validate = () => {
    if (!form.bizName.trim())  { setErrorMsg('Please enter your business name.');       return false; }
    if (!form.phone.trim())    { setErrorMsg('Please enter a contact number.');         return false; }
    if (!form.category)        { setErrorMsg('Please select a business category.');     return false; }
    if (!form.location)        { setErrorMsg('Please select your location.');           return false; }
    if (!selectedPlan)         { setErrorMsg('Please select a promotion plan.');        return false; }
    if (!selectedBannerStyle)   { setErrorMsg('Please select a banner style.');             return false; }
    return true;
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!user) {
      setErrorMsg('You must be logged in to promote your business.');
      setTimeout(() => nav.navigate('Login'), 1800);
      return;
    }
    if (!validate()) return;

    const planObj     = PLANS.find(p => p.id === selectedPlan);
    const planPrice   = planObj?.price ?? 0;
    const amountPaise = planPrice * 100;

    setSubmitting(true);
    try {
      // ── Step 1: Razorpay payment ───────────────────────────────────────────
      // FIX: pass listingType + plan so the backend /api/payments/order can
      // look up the server-authoritative price. Without these the server
      // returns { ok: false, error: 'listingType and plan are required.' }
      // which caused the Razorpay WebView to crash with "Payment Failed".
      const payResult = await initiatePayment({
        amount:      amountPaise,
        description: `Business Promotion – ${planObj?.name || selectedPlan} Plan`,
        listingType: 'promotion',
        plan:        selectedPlan,
      });

      if (!payResult.success) {
        if (!payResult.cancelled) {
          setErrorMsg(payResult.error || 'Payment was not completed. Please try again.');
        }
        return;
      }

      // ── Step 2: Verify payment & create promotion ──────────────────────────
      const res = await http('POST', '/api/payments/verify/promotion', {
        razorpay_order_id:   payResult.free ? undefined : payResult.razorpay_order_id,
        razorpay_payment_id: payResult.free ? undefined : payResult.razorpay_payment_id,
        razorpay_signature:  payResult.free ? undefined : payResult.razorpay_signature,
        amount: amountPaise,
        promotion: {
          bizName:     form.bizName,
          tagline:     form.tagline,
          phone:       form.phone,
          category:    form.category,
          location:    form.location,
          address:     form.address,
          website:     form.website,
          description: form.description,
          plan:        selectedPlan,
          bannerStyle: selectedBannerStyle,
        },
      });

      if (!res.ok) {
        const isAuth =
          res.status === 401 ||
          res.error?.toLowerCase().includes('unauthorized') ||
          res.error?.toLowerCase().includes('invalid token') ||
          res.error?.toLowerCase().includes('no token') ||
          res.error?.toLowerCase().includes('not authenticated');

        if (isAuth) {
          setErrorMsg('Session expired. Redirecting to login…');
          setTimeout(() => nav.navigate('Login'), 1800);
        } else {
          setErrorMsg(res.error || 'Something went wrong. Please try again.');
        }
        return;
      }

      // ── Success ─────────────────────────────────────────────────────────────
      setSuccessMsg(
        `🎉 Your business "${form.bizName}" is now live on Jobs, Rooms, Cars & Buy-Sell pages!`
      );
      Alert.alert(
        '🎉 Promotion is Live!',
        `Your business "${form.bizName}" is now posted across all pages!`,
        [{ text: 'Done', onPress: () => nav.navigate('Main', { screen: 'Board' }) }]
      );
    } catch (err) {
      setErrorMsg('Unable to connect. Please check your internet connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPlanObj = PLANS.find(p => p.id === selectedPlan);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {RazorpayCheckout}
      <View style={[s.root, { paddingTop: IS_WEB ? 0 : insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        {/* Top bar */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#111" />
          </TouchableOpacity>
          <Text style={s.topBarTitle}>Promote Business</Text>
          <View style={s.backBtn} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={[s.scroll, IS_WEB && s.scrollWeb]}
        >
          {/* Hero header */}
          <View style={s.hero}>
            <View style={s.heroDecoA} pointerEvents="none" />
            <View style={s.heroDecoB} pointerEvents="none" />
            <View style={s.heroIconWrap}>
              <Ionicons name="megaphone-outline" size={28} color={ORANGE} />
            </View>
            <Text style={s.heroTitle}>Grow your business{'\n'}in <Text style={s.heroAccent}>Nanded</Text></Text>
            <Text style={s.heroSub}>Get your banner seen by 10,000+ locals on NandedRozgar</Text>
            <View style={s.heroPills}>
              <View style={s.heroPill}><Text style={s.heroPillTxt}>📍 Hyperlocal reach</Text></View>
              <View style={s.heroPill}><Text style={s.heroPillTxt}>⚡ Live in 24 hrs</Text></View>
              <View style={s.heroPill}><Text style={s.heroPillTxt}>🇮🇳 Marathi + Hindi</Text></View>
            </View>
          </View>

          <View style={s.body}>

            {/* ── Business Details ── */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Ionicons name="storefront-outline" size={17} color={ORANGE} />
                <Text style={s.sectionTitle}>Business Details</Text>
              </View>

              <SectionLabel text="Business Name" required />
              <StyledInput
                value={form.bizName}
                onChangeText={v => set('bizName', v)}
                placeholder="e.g. Sharma Electronics, Nanded"
                maxLength={80}
              />

              <SectionLabel text="Tagline / Offer (shown on banner)" />
              <StyledInput
                value={form.tagline}
                onChangeText={v => set('tagline', v)}
                placeholder="e.g. 20% off this week · Best price in Nanded"
                maxLength={80}
              />

              <SectionLabel text="Contact Number" required />
              <StyledInput
                value={form.phone}
                onChangeText={v => set('phone', v)}
                placeholder="10-digit mobile number"
                keyboardType="phone-pad"
                maxLength={10}
              />

              <SectionLabel text="Website / Social Link" />
              <StyledInput
                value={form.website}
                onChangeText={v => set('website', v)}
                placeholder="https:// or Instagram handle"
              />
            </View>

            {/* ── Category ── */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Ionicons name="grid-outline" size={17} color={ORANGE} />
                <Text style={s.sectionTitle}>Business Category</Text>
              </View>
              <SectionLabel text="Select category" required />
              <PillSelect options={CATEGORIES} value={form.category} onSelect={v => set('category', v)} />
            </View>

            {/* ── Location ── */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Ionicons name="location-outline" size={17} color={ORANGE} />
                <Text style={s.sectionTitle}>Location</Text>
              </View>
              <SectionLabel text="Area / Locality" required />
              <PillSelect options={LOCATIONS} value={form.location} onSelect={v => set('location', v)} />

              <SectionLabel text="Full Address" />
              <StyledInput
                value={form.address}
                onChangeText={v => set('address', v)}
                placeholder="Shop no, street, landmark..."
                multiline
                numberOfLines={2}
                maxLength={150}
              />
            </View>

            {/* ── Description ── */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Ionicons name="document-text-outline" size={17} color={ORANGE} />
                <Text style={s.sectionTitle}>About your Business</Text>
              </View>
              <SectionLabel text="Short description (optional)" />
              <StyledInput
                value={form.description}
                onChangeText={v => set('description', v)}
                placeholder="Tell people what you offer, your USP, timings, etc."
                multiline
                numberOfLines={4}
                maxLength={300}
              />
            </View>

            {/* ── Banner Style Picker ── */}
            <BannerStylePicker
              form={form}
              selected={selectedBannerStyle}
              onSelect={setSelectedBannerStyle}
            />

            {/* ── Plans ── */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Ionicons name="rocket-outline" size={17} color={ORANGE} />
                <Text style={s.sectionTitle}>Choose a Promotion Plan</Text>
              </View>
              <Text style={s.sectionSub}>Select the plan that fits your budget and goals.</Text>
              <View style={s.plansWrap}>
                {PLANS.map(plan => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    selected={selectedPlan === plan.id}
                    onSelect={setSelectedPlan}
                  />
                ))}
              </View>
            </View>

            {/* ── Payment info note ── */}
            <View style={s.paymentNote}>
              <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
              <Text style={s.paymentNoteTxt}>
                Secure payment via Razorpay (UPI, Card, Net Banking). Your promotion goes live within 24 hours of payment.
              </Text>
            </View>

            {/* ── Inline Error Banner ── */}
            {!!errorMsg && (
              <View style={s.inlineError}>
                <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
                <Text style={s.inlineErrorTxt}>{errorMsg}</Text>
              </View>
            )}

            {/* ── Inline Success Banner ── */}
            {!!successMsg && (
              <View style={s.inlineSuccess}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                <Text style={s.inlineSuccessTxt}>{successMsg}</Text>
              </View>
            )}

            {/* ── Submit ── */}
            <TouchableOpacity
              style={[s.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" size="small" />
                : (
                  <View style={s.submitInner}>
                    <Ionicons name="megaphone-outline" size={18} color="#fff" />
                    <Text style={s.submitTxt}>
                      Submit Promotion · ₹{selectedPlanObj?.price ?? '—'}
                    </Text>
                  </View>
                )
              }
            </TouchableOpacity>

            <Text style={s.tosNote}>
              By submitting, you agree to our community guidelines. Your promotion goes live instantly on all pages.
            </Text>

          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({

  root:   { flex: 1, backgroundColor: '#f7f7f7' },
  scroll: { paddingBottom: 40 },
  scrollWeb: { maxWidth: 680, alignSelf: 'center', width: '100%' },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e8e8e8',
  },
  topBarTitle: { fontSize: 16, fontWeight: '800', color: '#111', letterSpacing: -0.2 },

  // Hero
  hero: {
    backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', overflow: 'hidden', position: 'relative',
  },
  heroDecoA: {
    position: 'absolute', top: -50, right: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(249,115,22,.07)',
  },
  heroDecoB: {
    position: 'absolute', top: 20, right: 30,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(124,58,237,.05)',
  },
  heroIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, borderWidth: 1, borderColor: '#fed7aa',
  },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#111', lineHeight: 32, letterSpacing: -0.3 },
  heroAccent: { color: ORANGE },
  heroSub: { fontSize: 13, color: '#888', marginTop: 6, lineHeight: 18 },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  heroPill: {
    paddingVertical: 5, paddingHorizontal: 11,
    backgroundColor: '#f9fafb', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb',
  },
  heroPillTxt: { fontSize: 11, fontWeight: '600', color: '#444' },

  body: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },

  // Sections
  section: {
    backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1, borderColor: '#ebebeb',
    padding: 16, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#111', letterSpacing: -0.1 },
  sectionSub: { fontSize: 12, color: '#888', marginTop: -4, marginBottom: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#555', letterSpacing: 0.1, marginTop: 2 },

  // Input
  inputWrap: {
    height: 50, backgroundColor: '#f9f9f9', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e8e8e8',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputText: { flex: 1, fontSize: 14, color: '#111', fontWeight: '500' },

  // Pill select
  pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingVertical: 7, paddingHorizontal: 13,
    backgroundColor: '#f3f4f6', borderRadius: 20,
    borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  pillActive: { backgroundColor: '#fff7ed', borderColor: ORANGE },
  pillTxt: { fontSize: 12, fontWeight: '600', color: '#555' },
  pillTxtActive: { color: ORANGE },

  // Banner Style Picker
  bannerPickerWrap: {
    backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1, borderColor: '#ebebeb', padding: 16, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  bannerOptions: { gap: 12 },
  bannerCardWrap: {
    borderRadius: 14, borderWidth: 1.5, borderColor: '#e5e7eb', overflow: 'hidden',
  },
  bannerCanvas: {
    height: 110, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, overflow: 'hidden',
  },
  bannerStripe: {
    position: 'absolute', left: 0, top: 16, bottom: 16, width: 4, borderRadius: 2,
  },
  bannerLeft: { flex: 1, paddingLeft: 8, justifyContent: 'center', gap: 3 },
  bannerRight: { width: 100, alignItems: 'center', gap: 8 },
  bannerLogoBox: {
    backgroundColor: '#e82828', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
    alignSelf: 'flex-start', marginBottom: 4,
  },
  bannerLogoTxt: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  bannerBizBold: { fontSize: 14, fontWeight: '900', letterSpacing: -0.3 },
  bannerOfferBold: { fontSize: 11, fontWeight: '700' },
  bannerLocBold: { fontSize: 9, color: '#aaa', marginTop: 2 },
  bannerOfferBox: {
    width: 90, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
  },
  bannerOfferBoxLabel: { fontSize: 8, color: '#ffcccc', fontWeight: '700', letterSpacing: 1 },
  bannerOfferBoxVal: { fontSize: 12, color: '#fff', fontWeight: '800' },
  bannerCTA: {
    paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20,
  },
  bannerCTATxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  // Clean style
  bannerCleanLeft: { width: 110, justifyContent: 'center', gap: 3 },
  bannerCleanLogo: {
    width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  bannerBizClean: { fontSize: 13, fontWeight: '800' },
  bannerUnderline: { height: 2, width: 60, borderRadius: 1, marginVertical: 2 },
  bannerLocClean: { fontSize: 9, color: '#888' },
  bannerDivider: { width: 1, height: 80, marginHorizontal: 4 },
  bannerCleanRight: { flex: 1, justifyContent: 'center', gap: 2 },
  bannerLimitedTxt: { fontSize: 8, color: '#aaa', fontWeight: '700', letterSpacing: 1.5 },
  bannerOfferClean: { fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },

  // Vivid style
  bannerVividLeft: { width: 110, padding: 8, justifyContent: 'center', gap: 3 },
  bannerLocVivid: { fontSize: 9, color: '#fff7ed', marginTop: 2 },
  bannerVividRight: { flex: 1, alignItems: 'flex-end', justifyContent: 'center', gap: 3 },
  bannerMegaTxt: { fontSize: 8, color: '#fff7ed', fontWeight: '700', letterSpacing: 1.5 },
  bannerOfferVivid: { fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },

  bannerCheck: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: '#fff', borderRadius: 12,
  },
  bannerStyleLabel: {
    fontSize: 11, fontWeight: '700', color: '#555', textAlign: 'center',
    backgroundColor: '#f9f9f9', paddingVertical: 5, borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },

  // Plans
  plansWrap: { gap: 12 },
  planCard: {
    borderRadius: 16, borderWidth: 2, padding: 14, gap: 10,
  },
  planCardActive: {
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  planBadge: {
    alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 10,
    borderRadius: 20, borderWidth: 1, marginBottom: 2,
  },
  planBadgeTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planDot: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  planName: { fontSize: 16, fontWeight: '900', letterSpacing: -0.2 },
  planDuration: { fontSize: 12, color: '#888', marginTop: 1 },
  planPriceWrap: { marginLeft: 'auto', alignItems: 'flex-end' },
  planPrice: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  planPriceSub: { fontSize: 10, color: '#aaa', fontWeight: '500' },
  planPerks: { gap: 6, paddingLeft: 36 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  perkTxt: { fontSize: 12, color: '#444', fontWeight: '500' },

  // Payment note
  paymentNote: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  paymentNoteTxt: { flex: 1, fontSize: 12, color: '#166534', lineHeight: 17, fontWeight: '500' },

  // Submit
  submitBtn: {
    backgroundColor: ORANGE, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ORANGE, shadowOpacity: 0.35, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
    marginTop: 4,
  },
  submitInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitTxt: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: -0.2 },

  tosNote: { fontSize: 10, color: '#bbb', textAlign: 'center', lineHeight: 14 },

  // Inline feedback banners (web-safe alternative to Alert)
  inlineError: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fef2f2', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#fecaca', marginBottom: 4,
  },
  inlineErrorTxt: { flex: 1, fontSize: 13, color: '#dc2626', lineHeight: 18, fontWeight: '600' },
  inlineSuccess: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 4,
  },
  inlineSuccessTxt: { flex: 1, fontSize: 13, color: '#16a34a', lineHeight: 18, fontWeight: '600' },
});
