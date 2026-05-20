import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
  Animated, Dimensions, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { http } from '../utils/api';

const { width: SW } = Dimensions.get('window');
const ORANGE = '#f97316';
const TOTAL  = 5;

// ── Data ──────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: 'Electronics',  icon: 'phone-portrait-outline' },
  { label: 'Furniture',    icon: 'bed-outline' },
  { label: 'Vehicles',     icon: 'bicycle-outline' },
  { label: 'Clothes',      icon: 'shirt-outline' },
  { label: 'Books',        icon: 'book-outline' },
  { label: 'Appliances',   icon: 'tv-outline' },
  { label: 'Sports',       icon: 'football-outline' },
  { label: 'Other',        icon: 'cube-outline' },
];

const CONDITIONS = [
  { label: 'Like New',    sub: 'Hardly used, mint condition' },
  { label: 'Good',        sub: 'Used but well maintained' },
  { label: 'Fair / Used', sub: 'Shows signs of wear and tear' },
  { label: 'Brand New',   sub: 'Unopened / Unused' },
];

const AGE_OPTIONS = [
  'Less than 6 months', '6 months – 1 Year', '1-2 Years',
  '2-3 Years', '3-5 Years', 'More than 5 Years',
];

const AREAS = [
  'Nanded City', 'Vazirabad', 'Cidco', 'Shivaji Nagar',
  'Old Nanded', 'Ardhapur', 'Naigaon', 'Taroda',
  'SRTMU Area', 'Station Road', 'Other',
];

const PLANS = [
  { days: 7,  label: '7 Days',  price: 39,  popular: false, strikePrice: null },
  { days: 15, label: '15 Days', price: 59,  popular: true,  strikePrice: 79   },
  { days: 30, label: '30 Days', price: 89,  popular: false, strikePrice: null },
];

const STEP_META = [
  { title: 'Item Details',         sub: 'What are you selling?' },
  { title: 'Pricing & Location',   sub: 'Set your expected price' },
  { title: 'Photos & Description', sub: 'Add photos and details' },
  { title: 'Choose Plan',          sub: 'How long should your listing stay live?' },
  { title: 'Review & Post',        sub: 'Confirm your listing before going live' },
];

// ── Simple picker component ───────────────────────────────────────────────────
function Picker({ value, options, onSelect, fullWidth = false }) {
  return (
    <ScrollView
      horizontal={!fullWidth}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.pickerRow, fullWidth && styles.pickerRowWrap]}
    >
      {options.map(opt => {
        const label = typeof opt === 'string' ? opt : opt.label;
        const isActive = value === label;
        return (
          <TouchableOpacity
            key={label}
            onPress={() => onSelect(label)}
            style={[styles.chip, isActive && styles.chipActive, fullWidth && styles.chipFull]}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipTxt, isActive && styles.chipTxtActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Radio option ──────────────────────────────────────────────────────────────
function RadioOption({ label, sub, selected, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.radioRow, selected && styles.radioRowActive]}
    >
      <View style={[styles.radioCircle, selected && styles.radioCircleActive]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.radioLabel, selected && { color: ORANGE, fontWeight: '700' }]}>{label}</Text>
        {sub ? <Text style={styles.radioSub}>{sub}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

// ── Field label ───────────────────────────────────────────────────────────────
function Label({ text, required }) {
  return (
    <Text style={styles.fieldLabel}>
      {text}{required && <Text style={{ color: ORANGE }}> *</Text>}
    </Text>
  );
}

// ── Step progress dots ────────────────────────────────────────────────────────
function StepDots({ step, total }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < step  && styles.dotDone,
            i === step - 1 && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );
}

// ── Orange hero header ────────────────────────────────────────────────────────
function HeroHeader({ step, total, title, sub, onBack }) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroCircle1} />
      <View style={styles.heroCircle2} />
      <View style={styles.heroTop}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </TouchableOpacity>
        <StepDots step={step} total={total} />
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeTxt}>Step {step} of {total}</Text>
        </View>
      </View>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSub}>{sub}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════
export default function PostItemScreen() {
  const nav = useNavigation();
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(1)).current;

  const [form, setForm] = useState({
    title:       '',
    category:    'Electronics',
    condition:   'Good',
    age:         '1-2 Years',
    price:       '',
    negotiable:  true,
    area:        'Nanded City',
    description: '',
    whatsapp:    '',
    photos:      [],
    plan:        PLANS[1],
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Slide animation between steps ──────────────────────────────────────────
  function animateStep(dir, cb) {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: dir === 'next' ? -SW : SW, duration: 220, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      slideAnim.setValue(dir === 'next' ? SW : -SW);
      cb();
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }

  function next() {
    if (step === 1 && !form.title.trim()) { Alert.alert('Required', 'Please enter an item title'); return; }
    if (step === 2 && !form.price.trim()) { Alert.alert('Required', 'Please enter a selling price'); return; }
    if (step === 3 && !form.whatsapp.trim()) { Alert.alert('Required', 'Please enter your WhatsApp number'); return; }
    if (step < TOTAL) animateStep('next', () => setStep(s => s + 1));
  }

  function back() {
    if (step > 1) animateStep('back', () => setStep(s => s - 1));
    else nav.goBack();
  }

  async function submit() {
    if (!form.title || !form.price || !form.whatsapp) {
      Alert.alert('Missing Info', 'Title, price and WhatsApp are required');
      return;
    }
    setLoading(true);
    try {
      const res = await http('POST', '/api/buysell', {
        title:       form.title.trim(),
        category:    form.category,
        condition:   form.condition,
        age:         form.age,
        price:       parseInt(form.price) || 0,
        negotiable:  form.negotiable,
        area:        form.area,
        description: form.description.trim(),
        whatsapp:    form.whatsapp.trim(),
        photos:      form.photos,
        planDays:    form.plan.days,
        planLabel:   form.plan.label,
        planPrice:   form.plan.price,
      });

      if (res.ok) {
        Toast.show({ type: 'success', text1: '🎉 Item Listed!', text2: 'Your item is now live on Buy & Sell.' });
        nav.navigate('BuySell');
      } else {
        Alert.alert('Error', res.error || 'Failed to post item. Try again.');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 1: Item Details ───────────────────────────────────────────────────
  function Step1() {
    return (
      <ScrollView contentContainerStyle={styles.stepBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Label text="AD TITLE" required />
        <TextInput
          style={styles.input}
          placeholder="e.g. Samsung 42 inch TV, Wooden Study Table"
          placeholderTextColor="#bbb"
          value={form.title}
          onChangeText={v => set('title', v)}
          maxLength={80}
        />
        <Text style={styles.charCount}>{form.title.length}/80</Text>

        <Label text="CATEGORY" required />
        <View style={styles.categoryGrid}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.label}
              onPress={() => set('category', c.label)}
              activeOpacity={0.8}
              style={[styles.catCard, form.category === c.label && styles.catCardActive]}
            >
              <Ionicons
                name={c.icon}
                size={22}
                color={form.category === c.label ? ORANGE : '#888'}
              />
              <Text style={[styles.catCardLabel, form.category === c.label && { color: ORANGE, fontWeight: '700' }]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Label text="CONDITION" />
        {CONDITIONS.map(c => (
          <RadioOption
            key={c.label}
            label={c.label}
            sub={c.sub}
            selected={form.condition === c.label}
            onPress={() => set('condition', c.label)}
          />
        ))}

        <Label text="HOW OLD IS IT?" />
        <Picker value={form.age} options={AGE_OPTIONS} onSelect={v => set('age', v)} fullWidth />
        <View style={{ height: 24 }} />
      </ScrollView>
    );
  }

  // ── Step 2: Pricing & Location ─────────────────────────────────────────────
  function Step2() {
    return (
      <ScrollView contentContainerStyle={styles.stepBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Label text="SELLING PRICE (₹)" required />
        <View style={styles.priceWrap}>
          <View style={styles.rupeeBox}><Text style={styles.rupeeSign}>₹</Text></View>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="e.g. 5000"
            placeholderTextColor="#bbb"
            keyboardType="numeric"
            value={form.price}
            onChangeText={v => set('price', v.replace(/[^0-9]/g, ''))}
          />
        </View>
        <View style={{ height: 16 }} />

        <Label text="PRICE NEGOTIABLE?" />
        <RadioOption
          label="Yes, Negotiable"
          selected={form.negotiable === true}
          onPress={() => set('negotiable', true)}
        />
        <RadioOption
          label="No, Fixed Price"
          selected={form.negotiable === false}
          onPress={() => set('negotiable', false)}
        />

        <Label text="YOUR LOCATION / AREA" required />
        <Picker value={form.area} options={AREAS} onSelect={v => set('area', v)} fullWidth />
        <View style={{ height: 24 }} />
      </ScrollView>
    );
  }

  // ── Step 3: Photos & Description ──────────────────────────────────────────
  function Step3() {
    return (
      <ScrollView contentContainerStyle={styles.stepBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Label text="ITEM PHOTOS" />
        <TouchableOpacity style={styles.photoUploadBox} activeOpacity={0.8}>
          <Ionicons name="cloud-upload-outline" size={32} color={ORANGE} />
          <Text style={styles.photoUploadTitle}>Upload item photos</Text>
          <Text style={styles.photoUploadSub}>Include multiple angles and any damage</Text>
        </TouchableOpacity>

        <Label text="ITEM DESCRIPTION" />
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Provide details like brand, model, reason for selling, accessories included..."
          placeholderTextColor="#bbb"
          value={form.description}
          onChangeText={v => set('description', v)}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={styles.charCount}>{form.description.length}/500</Text>

        <Label text="WHATSAPP NUMBER" required />
        <View style={styles.phoneWrap}>
          <View style={styles.phonePrefix}>
            <Text style={styles.phonePrefixTxt}>+91</Text>
          </View>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="98765 43210"
            placeholderTextColor="#bbb"
            keyboardType="phone-pad"
            value={form.whatsapp}
            onChangeText={v => set('whatsapp', v.replace(/[^0-9]/g, ''))}
            maxLength={10}
          />
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    );
  }

  // ── Step 4: Choose Plan ───────────────────────────────────────────────────
  function Step4() {
    return (
      <ScrollView contentContainerStyle={styles.stepBody} showsVerticalScrollIndicator={false}>
        <Text style={styles.planQuestion}>How long should your listing stay live?</Text>
        <Text style={styles.planNote}>Your listing is automatically removed after the selected period.</Text>

        {PLANS.map(plan => {
          const isActive = form.plan.days === plan.days;
          return (
            <TouchableOpacity
              key={plan.days}
              onPress={() => set('plan', plan)}
              activeOpacity={0.85}
              style={[styles.planCard, isActive && styles.planCardActive]}
            >
              <View style={[styles.planIconWrap, isActive && styles.planIconWrapActive]}>
                <Ionicons name="calendar-outline" size={20} color={isActive ? '#fff' : ORANGE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.planLabel, isActive && styles.planLabelActive]}>
                  {plan.label}
                </Text>
                <Text style={[styles.planSubLabel, isActive && { color: 'rgba(255,255,255,0.75)' }]}>
                  listing duration · pay once
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
                {plan.strikePrice && (
                  <Text style={[styles.strikePrice, isActive && { color: 'rgba(255,255,255,0.5)' }]}>
                    ₹{plan.strikePrice}
                  </Text>
                )}
                <Text style={[styles.planPrice, isActive && styles.planPriceActive]}>
                  ₹{plan.price}
                </Text>
              </View>
              <View style={[styles.planRadio, isActive && styles.planRadioActive]}>
                {isActive && <View style={styles.planRadioInner} />}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Benefits strip */}
        <View style={styles.benefitsRow}>
          {[
            { icon: 'flash-outline',         label: 'INSTANT ACTIVATION' },
            { icon: 'shield-checkmark-outline', label: 'SECURE UPI / CARD' },
            { icon: 'refresh-outline',       label: 'RENEWABLE ANYTIME' },
          ].map(b => (
            <View key={b.label} style={styles.benefitItem}>
              <Ionicons name={b.icon} size={16} color={ORANGE} />
              <Text style={styles.benefitLabel}>{b.label}</Text>
            </View>
          ))}
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    );
  }

  // ── Step 5: Review & Post ─────────────────────────────────────────────────
  function Step5() {
    const rows1 = [
      ['TITLE',     form.title     || 'Not set'],
      ['CATEGORY',  form.category],
      ['CONDITION', form.condition],
      ['AGE',       form.age],
    ];
    const rows2 = [
      ['PRICE',      form.price ? `₹${parseInt(form.price).toLocaleString('en-IN')}` : 'Not set'],
      ['NEGOTIABLE', form.negotiable ? 'Yes' : 'No, Fixed Price'],
      ['LOCATION',   form.area],
    ];
    return (
      <ScrollView contentContainerStyle={styles.stepBody} showsVerticalScrollIndicator={false}>
        <Text style={styles.reviewHeading}>Review your item listing:</Text>

        <View style={styles.reviewCard}>
          {rows1.map(([k, v]) => (
            <View key={k} style={styles.reviewRow}>
              <Text style={styles.reviewKey}>{k}</Text>
              <Text style={[styles.reviewVal, !form.title && k === 'TITLE' && { color: '#ef4444' }]}>{v}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.reviewCard, { marginTop: 10 }]}>
          {rows2.map(([k, v]) => (
            <View key={k} style={styles.reviewRow}>
              <Text style={styles.reviewKey}>{k}</Text>
              <Text style={styles.reviewVal}>{v}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.reviewCard, { marginTop: 10 }]}>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewKey}>WHATSAPP</Text>
            <Text style={[styles.reviewVal, !form.whatsapp && { color: '#ef4444' }]}>
              {form.whatsapp ? `+91 ${form.whatsapp}` : 'Not set'}
            </Text>
          </View>
        </View>

        <View style={[styles.reviewCard, styles.reviewPlanCard, { marginTop: 10 }]}>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewKey}>DURATION</Text>
            <Text style={styles.reviewVal}>{form.plan.label} listing</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewKey}>AMOUNT</Text>
            <Text style={[styles.reviewVal, { color: ORANGE, fontWeight: '700' }]}>₹{form.plan.price}</Text>
          </View>
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    );
  }

  const stepContent = [Step1, Step2, Step3, Step4, Step5];
  const StepComponent = stepContent[step - 1];

  const isLastStep = step === TOTAL;

  return (
    <View style={styles.container}>
      {/* Orange Hero */}
      <HeroHeader
        step={step}
        total={TOTAL}
        title={STEP_META[step - 1].title}
        sub={STEP_META[step - 1].sub}
        onBack={back}
      />

      {/* Animated Step Content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          style={[
            styles.stepWrap,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <StepComponent />
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.backBtnBottom} onPress={back} activeOpacity={0.8}>
          <Text style={styles.backBtnTxt}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.continueBtn, loading && { opacity: 0.7 }]}
          onPress={isLastStep ? submit : next}
          activeOpacity={0.88}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.continueBtnTxt}>{isLastStep ? 'Post Item' : 'Continue'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────── STYLES ───────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  // Hero
  hero: {
    backgroundColor: ORANGE,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 24,
    paddingHorizontal: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  heroCircle1: {
    position: 'absolute', width: 160, height: 160,
    borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.10)',
    top: -40, right: -30,
  },
  heroCircle2: {
    position: 'absolute', width: 90, height: 90,
    borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.07)',
    bottom: -20, right: 60,
  },
  heroTop: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 14, gap: 10,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepBadge: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12,
  },
  stepBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  dotsRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: {
    width: 22, height: 4, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: { backgroundColor: '#fff' },
  dotDone:   { backgroundColor: 'rgba(255,255,255,0.6)' },

  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  heroSub:   { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  // Step content
  stepWrap: { flex: 1 },
  stepBody: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20,
  },

  fieldLabel: {
    fontSize: 11, fontWeight: '800', color: '#aaa',
    letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#ebebeb',
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, color: '#111', marginBottom: 16,
  },
  textarea: { height: 110, paddingTop: 12 },
  charCount: { fontSize: 11, color: '#bbb', textAlign: 'right', marginTop: -12, marginBottom: 14 },

  // Category grid
  categoryGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16,
  },
  catCard: {
    width: (SW - 64) / 4,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 6,
    borderWidth: 1.5, borderColor: '#ebebeb',
    gap: 6,
  },
  catCardActive: {
    backgroundColor: '#fff7f0', borderColor: ORANGE,
  },
  catCardLabel: { fontSize: 10, fontWeight: '600', color: '#888', textAlign: 'center' },

  // Picker/chips
  pickerRow: { gap: 8, paddingBottom: 16, alignItems: 'center' },
  pickerRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 16 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 100,
    borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#111', borderColor: '#111' },
  chipFull: {},
  chipTxt: { fontSize: 13, fontWeight: '600', color: '#555' },
  chipTxtActive: { color: '#fff' },

  // Radio
  radioRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#ebebeb',
    padding: 14, marginBottom: 10,
  },
  radioRowActive: { backgroundColor: '#fff7f0', borderColor: ORANGE },
  radioCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#ccc',
    alignItems: 'center', justifyContent: 'center',
  },
  radioCircleActive: { borderColor: ORANGE },
  radioInner: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: ORANGE,
  },
  radioLabel: { fontSize: 14, fontWeight: '600', color: '#222' },
  radioSub:   { fontSize: 12, color: '#aaa', marginTop: 1 },

  // Price row
  priceWrap: { flexDirection: 'row', alignItems: 'center', gap: 0, marginBottom: 16 },
  rupeeBox: {
    backgroundColor: '#f5f5f5', borderWidth: 1.5, borderColor: '#ebebeb',
    borderRightWidth: 0, borderTopLeftRadius: 12, borderBottomLeftRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, alignItems: 'center', justifyContent: 'center',
  },
  rupeeSign: { fontSize: 16, fontWeight: '700', color: '#555' },

  // Phone row
  phoneWrap: { flexDirection: 'row', alignItems: 'center', gap: 0, marginBottom: 16 },
  phonePrefix: {
    backgroundColor: '#f5f5f5', borderWidth: 1.5, borderColor: '#ebebeb',
    borderRightWidth: 0, borderTopLeftRadius: 12, borderBottomLeftRadius: 12,
    paddingHorizontal: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center',
  },
  phonePrefixTxt: { fontSize: 14, fontWeight: '700', color: '#555' },

  // Photo upload
  photoUploadBox: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 2, borderColor: '#ffe5cc', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 32, marginBottom: 16,
    gap: 6,
  },
  photoUploadTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginTop: 4 },
  photoUploadSub:   { fontSize: 12, color: '#aaa' },

  // Plan cards
  planQuestion: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 4 },
  planNote:     { fontSize: 12, color: '#999', marginBottom: 16 },
  planCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#ebebeb',
    padding: 16, marginBottom: 12,
  },
  planCardActive: {
    backgroundColor: ORANGE, borderColor: ORANGE,
  },
  planIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#fff7f0', alignItems: 'center', justifyContent: 'center',
  },
  planIconWrapActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  planLabel:       { fontSize: 15, fontWeight: '700', color: '#111' },
  planLabelActive: { color: '#fff' },
  planSubLabel:    { fontSize: 11, color: '#aaa', marginTop: 2 },
  strikePrice:     { fontSize: 11, color: '#ccc', textDecorationLine: 'line-through' },
  planPrice:       { fontSize: 16, fontWeight: '800', color: ORANGE },
  planPriceActive: { color: '#fff' },
  planRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#e0e0e0',
    alignItems: 'center', justifyContent: 'center',
  },
  planRadioActive: { borderColor: '#fff' },
  planRadioInner:  { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },

  // Benefits
  benefitsRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 14, borderWidth: 1.5, borderColor: '#ebebeb',
    padding: 14, justifyContent: 'space-around', marginTop: 6,
  },
  benefitItem: { alignItems: 'center', gap: 6, flex: 1 },
  benefitLabel: { fontSize: 9, fontWeight: '700', color: '#888', textAlign: 'center', letterSpacing: 0.3 },

  // Review
  reviewHeading: { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 12 },
  reviewCard: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#ebebeb', overflow: 'hidden',
  },
  reviewPlanCard: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  reviewRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  reviewKey: { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 0.5 },
  reviewVal: { fontSize: 14, fontWeight: '600', color: '#111' },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row', gap: 12,
    backgroundColor: '#fff', padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  backBtnBottom: {
    flex: 1, paddingVertical: 15, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#e0e0e0',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnTxt: { fontSize: 15, fontWeight: '700', color: '#555' },
  continueBtn: {
    flex: 2.2, paddingVertical: 15, borderRadius: 14,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  continueBtnTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
