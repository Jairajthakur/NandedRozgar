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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ORANGE  = '#f97316';
const PURPLE  = '#7c3aed';
const IS_WEB  = Platform.OS === 'web';

// ─── Plans ────────────────────────────────────────────────────────────────────
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
  const onPressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 22, bounciness: 8 }).start();

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
function PreviewBanner({ form, plan }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.2, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
      ])
    ).start();
  }, []);

  const planColor = plan ? PLANS.find(p => p.id === plan)?.color || ORANGE : ORANGE;

  return (
    <View style={s.previewWrap}>
      <Text style={s.previewLabel}>PREVIEW — how your banner will look</Text>
      <View style={[s.previewBanner, { borderColor: planColor + '40' }]}>
        <View style={[s.previewAccent, { backgroundColor: planColor }]} />
        <View style={[s.previewIconWrap, { backgroundColor: planColor + '18' }]}>
          <Ionicons name="storefront-outline" size={22} color={planColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.previewBizName, { color: planColor }]} numberOfLines={1}>
            {form.bizName || 'Your Business Name'}
          </Text>
          <Text style={s.previewTagline} numberOfLines={1}>
            {form.tagline || 'Your tagline / offer goes here'}
          </Text>
        </View>
        <View style={[s.previewAdTag, { backgroundColor: planColor }]}>
          <Animated.View style={[s.previewDot, { transform: [{ scale: pulse }] }]} />
          <Text style={s.previewAdTxt}>AD</Text>
        </View>
      </View>
      <Text style={s.previewHint}>This banner will appear across listing screens in Nanded.</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PromoteBusinessScreen() {
  const nav    = useNavigation();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    bizName: '', tagline: '', phone: '', category: '', location: '',
    address: '', website: '', description: '',
  });
  const [selectedPlan, setSelectedPlan] = useState('popular');
  const [submitting, setSubmitting] = useState(false);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const validate = () => {
    if (!form.bizName.trim())  { Alert.alert('Required', 'Please enter your business name.'); return false; }
    if (!form.phone.trim())    { Alert.alert('Required', 'Please enter a contact number.');  return false; }
    if (!form.category)        { Alert.alert('Required', 'Please select a business category.'); return false; }
    if (!form.location)        { Alert.alert('Required', 'Please select your location.'); return false; }
    if (!selectedPlan)         { Alert.alert('Required', 'Please select a promotion plan.'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    // Simulated API call — replace with real endpoint
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert(
        '🎉 Promotion Submitted!',
        `Your business "${form.bizName}" will go live within 24 hours. Our team will call you on ${form.phone} to confirm payment.`,
        [{ text: 'Done', onPress: () => nav.goBack() }]
      );
    }, 1200);
  };

  const selectedPlanObj = PLANS.find(p => p.id === selectedPlan);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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

            {/* ── Banner Preview ── */}
            <PreviewBanner form={form} plan={selectedPlan} />

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

            {/* ── Payment note ── */}
            <View style={s.paymentNote}>
              <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
              <Text style={s.paymentNoteTxt}>
                Payment is collected via UPI / cash after our team verifies your listing. No advance needed now.
              </Text>
            </View>

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
              By submitting, you agree to our community guidelines. Promotions are reviewed within 24 hours.
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

  // Preview
  previewWrap: {
    backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1, borderColor: '#ebebeb', padding: 16,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  previewLabel: { fontSize: 10, fontWeight: '800', color: '#aaa', letterSpacing: 1, marginBottom: 10 },
  previewBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fafafa', borderRadius: 14,
    borderWidth: 1.5, padding: 12, overflow: 'hidden', position: 'relative',
  },
  previewAccent: {
    position: 'absolute', left: 0, top: 10, bottom: 10,
    width: 4, borderRadius: 2,
  },
  previewIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    marginLeft: 6,
  },
  previewBizName: { fontSize: 14, fontWeight: '800', letterSpacing: -0.1 },
  previewTagline: { fontSize: 11, color: '#666', marginTop: 2 },
  previewAdTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 6, paddingVertical: 3, paddingHorizontal: 7, flexShrink: 0,
  },
  previewDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  previewAdTxt: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  previewHint: { fontSize: 11, color: '#aaa', marginTop: 8, textAlign: 'center', fontStyle: 'italic' },

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
});
