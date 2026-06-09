/**
 * PromoteBusinessScreen.js — Business promotion / sponsored listing form
 *
 * ✅ Web  (sticky topBar, centred max-width, card layout)
 * ✅ Mobile / APK  (SafeArea, KeyboardAvoidingView, step form)
 *
 * Banner options:
 *   1. Request banner design via WhatsApp (we design for them)
 *   2. Upload their own ready-made banner image
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, StatusBar, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Animated, Easing,
  Image, Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { http } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useRazorpayCheckout } from '../utils/cashfree';
import * as ImagePicker from 'expo-image-picker';

const ORANGE  = '#f97316';
const PURPLE  = '#7c3aed';
const GREEN   = '#16a34a';
const IS_WEB  = Platform.OS === 'web';

const WHATSAPP_NUMBER = '919834308805';

// ─── Plans ────────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 49,
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
    price: 79,
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
    price: 99,
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

// ─── Banner mode ──────────────────────────────────────────────────────────────
// 'whatsapp' = request us to design, 'upload' = user has their own banner
const BANNER_MODES = [
  {
    id: 'whatsapp',
    icon: 'logo-whatsapp',
    color: '#25D366',
    bg: '#f0fdf4',
    border: '#86efac',
    title: 'Request Banner Design',
    desc: 'Fill your details & we\'ll create a beautiful banner for you via WhatsApp',
    tag: '✦ FREE design help',
  },
  {
    id: 'upload',
    icon: 'image-outline',
    color: ORANGE,
    bg: '#fff7ed',
    border: '#fed7aa',
    title: 'Upload Your Own Banner',
    desc: 'Already have a ready banner? Upload it directly (JPG / PNG)',
    tag: '✦ Instant upload',
  },
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

// ─── Banner Mode Card ─────────────────────────────────────────────────────────
function BannerModeCard({ mode, selected, onSelect }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: !IS_WEB, speed: 40, bounciness: 0 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: !IS_WEB, speed: 22, bounciness: 8 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => onSelect(mode.id)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          s.modeCard,
          { backgroundColor: mode.bg, borderColor: selected ? mode.color : '#e5e7eb' },
          selected && { shadowColor: mode.color, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 },
        ]}
      >
        <View style={[s.modeIconWrap, { backgroundColor: mode.color + '18' }]}>
          <Ionicons name={mode.icon} size={26} color={mode.color} />
        </View>
        <View style={s.modeText}>
          <View style={s.modeTitleRow}>
            <Text style={[s.modeTitle, { color: mode.color }]}>{mode.title}</Text>
            {selected && <Ionicons name="checkmark-circle" size={16} color={mode.color} />}
          </View>
          <Text style={s.modeDesc}>{mode.desc}</Text>
          <View style={[s.modeTag, { backgroundColor: mode.color + '15', borderColor: mode.border }]}>
            <Text style={[s.modeTagTxt, { color: mode.color }]}>{mode.tag}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function PromoteBusinessScreen() {
  const nav    = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { RazorpayCheckout, initiatePayment } = useRazorpayCheckout({ http, user });

  // Redirect to Login if not authenticated
  useEffect(() => {
    if (!user) {
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
  const [selectedPlan,       setSelectedPlan]       = useState('popular');
  const [bannerMode,         setBannerMode]         = useState(null);   // 'whatsapp' | 'upload'
  const [uploadedBanner,     setUploadedBanner]     = useState(null);   // { uri, base64, type }
  const [submitting,         setSubmitting]         = useState(false);
  const [errorMsg,           setErrorMsg]           = useState('');
  const [successMsg,         setSuccessMsg]         = useState('');

  const set = (key, val) => { setErrorMsg(''); setForm(prev => ({ ...prev, [key]: val })); };

  // ── Pick image from gallery ─────────────────────────────────────────────────
  const pickBanner = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Please allow photo access to upload your banner.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
        base64: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setUploadedBanner({ uri: asset.uri, base64: asset.base64, type: asset.mimeType || 'image/jpeg' });
        setErrorMsg('');
      }
    } catch (e) {
      setErrorMsg('Could not open image picker. Please try again.');
    }
  };

  // ── Build WhatsApp message ─────────────────────────────────────────────────
  const openWhatsApp = async () => {
    const plan = PLANS.find(p => p.id === selectedPlan);
    const lines = [
      `🏪 *Business Promotion Request — NandedRozgar*`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `*📌 Business Name:* ${form.bizName || '—'}`,
      `*💬 Tagline / Offer:* ${form.tagline || '—'}`,
      `*📞 Contact Number:* ${form.phone || '—'}`,
      `*🏷️ Category:* ${form.category || '—'}`,
      `*📍 Location:* ${form.location || '—'}`,
      `*🏠 Address:* ${form.address || '—'}`,
      `*🌐 Website / Social:* ${form.website || '—'}`,
      ``,
      `*📝 About Business:*`,
      form.description || '—',
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `*🚀 Selected Plan:* ${plan?.name || selectedPlan} — ₹${plan?.price} / ${plan?.days} days`,
      ``,
      `Please design a promotional banner for my business and confirm the plan. Thank you! 🙏`,
    ];
    const msg = encodeURIComponent(lines.join('\n'));
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;

    // Save the request to the database before opening WhatsApp
    try {
      await http('POST', '/api/promotions/request', {
        bizName:     form.bizName,
        tagline:     form.tagline,
        phone:       form.phone,
        category:    form.category,
        location:    form.location,
        address:     form.address,
        website:     form.website,
        description: form.description,
        plan:        selectedPlan,
      });
    } catch (e) {
      // Non-fatal — still open WhatsApp even if save fails
      console.warn('Could not save WhatsApp request to DB:', e);
    }

    Linking.openURL(url).catch(() =>
      Alert.alert('WhatsApp not found', 'Please install WhatsApp or contact us directly.')
    );
  };

  // ── Validate ───────────────────────────────────────────────────────────────
  const validate = () => {
    if (!form.bizName.trim())  { setErrorMsg('Please enter your business name.');    return false; }
    if (!form.phone.trim())    { setErrorMsg('Please enter a contact number.');      return false; }
    if (!form.category)        { setErrorMsg('Please select a business category.');  return false; }
    if (!form.location)        { setErrorMsg('Please select your location.');        return false; }
    if (!selectedPlan)         { setErrorMsg('Please select a promotion plan.');     return false; }
    if (!bannerMode)           { setErrorMsg('Please choose a banner option.');      return false; }
    if (bannerMode === 'upload' && !uploadedBanner) {
      setErrorMsg('Please upload your banner image.');
      return false;
    }
    return true;
  };

  // ── Submit (payment + API) ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!user) {
      setErrorMsg('You must be logged in to promote your business.');
      setTimeout(() => nav.navigate('Login'), 1800);
      return;
    }
    if (!validate()) return;

    // WhatsApp mode: just open WhatsApp — no payment here, team handles manually
    if (bannerMode === 'whatsapp') {
      openWhatsApp();
      return;
    }

    // Upload mode: pay then submit
    const planObj     = PLANS.find(p => p.id === selectedPlan);
    const planPrice   = planObj?.price ?? 0;
    const amountPaise = planPrice * 100;

    setSubmitting(true);
    try {
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

      const res = await http('POST', '/api/payments/verify/promotion', {
        cashfree_order_id: payResult.free ? undefined : payResult.cashfree_order_id,
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
          bannerMode:  'upload',
          bannerImage: uploadedBanner?.base64
            ? `data:${uploadedBanner.type};base64,${uploadedBanner.base64}`
            : null,
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

      setSuccessMsg(`🎉 Your business "${form.bizName}" is now live!`);
      Alert.alert(
        '🎉 Promotion is Live!',
        `Your business "${form.bizName}" is now posted across all pages!`,
        [{ text: 'Done', onPress: () => nav.navigate('Main', { screen: 'Board' }) }]
      );
    } catch {
      setErrorMsg('Unable to connect. Please check your internet connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPlanObj = PLANS.find(p => p.id === selectedPlan);

  // ── Submit button label ────────────────────────────────────────────────────
  const submitLabel = bannerMode === 'whatsapp'
    ? '💬 Send Request via WhatsApp'
    : `Submit & Pay  ₹${selectedPlanObj?.price ?? '—'}`;

  const submitColor = bannerMode === 'whatsapp' ? '#25D366' : ORANGE;

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

              <SectionLabel text="Tagline / Offer" />
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

            {/* ── Banner Option ── */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Ionicons name="image-outline" size={17} color={ORANGE} />
                <Text style={s.sectionTitle}>Banner Option</Text>
              </View>
              <Text style={s.sectionSub}>How would you like your promotional banner?</Text>

              <View style={s.modeList}>
                {BANNER_MODES.map(mode => (
                  <BannerModeCard
                    key={mode.id}
                    mode={mode}
                    selected={bannerMode === mode.id}
                    onSelect={setBannerMode}
                  />
                ))}
              </View>

              {/* WhatsApp info box */}
              {bannerMode === 'whatsapp' && (
                <View style={s.waInfoBox}>
                  <Ionicons name="information-circle-outline" size={16} color="#15803d" />
                  <Text style={s.waInfoTxt}>
                    After tapping the button below, WhatsApp will open with your details pre-filled. Our team will design your banner and confirm your plan via WhatsApp within a few hours.
                  </Text>
                </View>
              )}

              {/* Upload section */}
              {bannerMode === 'upload' && (
                <View style={s.uploadArea}>
                  {uploadedBanner ? (
                    <View style={s.uploadPreviewWrap}>
                      <Image source={{ uri: uploadedBanner.uri }} style={s.uploadPreview} resizeMode="contain" />
                      <TouchableOpacity style={s.reuploadBtn} onPress={pickBanner} activeOpacity={0.8}>
                        <Ionicons name="refresh-outline" size={14} color={ORANGE} />
                        <Text style={s.reuploadTxt}>Change Image</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={s.uploadBtn} onPress={pickBanner} activeOpacity={0.8}>
                      <Ionicons name="cloud-upload-outline" size={28} color={ORANGE} />
                      <Text style={s.uploadBtnTitle}>Tap to Upload Banner</Text>
                      <Text style={s.uploadBtnSub}>JPG or PNG · Recommended: 800×300 px</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

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
            {bannerMode !== 'whatsapp' && (
              <View style={s.paymentNote}>
                <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
                <Text style={s.paymentNoteTxt}>
                  Secure payment via Razorpay (UPI, Card, Net Banking). Your promotion goes live within 24 hours of payment.
                </Text>
              </View>
            )}

            {/* ── Inline Error ── */}
            {!!errorMsg && (
              <View style={s.inlineError}>
                <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
                <Text style={s.inlineErrorTxt}>{errorMsg}</Text>
              </View>
            )}

            {/* ── Inline Success ── */}
            {!!successMsg && (
              <View style={s.inlineSuccess}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                <Text style={s.inlineSuccessTxt}>{successMsg}</Text>
              </View>
            )}

            {/* ── Submit ── */}
            <TouchableOpacity
              style={[s.submitBtn, { backgroundColor: submitColor }, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" size="small" />
                : (
                  <View style={s.submitInner}>
                    <Ionicons
                      name={bannerMode === 'whatsapp' ? 'logo-whatsapp' : 'megaphone-outline'}
                      size={18}
                      color="#fff"
                    />
                    <Text style={s.submitTxt}>{submitLabel}</Text>
                  </View>
                )
              }
            </TouchableOpacity>

            <Text style={s.tosNote}>
              By submitting, you agree to our community guidelines. Promotions go live within 24 hours.
            </Text>

          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({

  root:      { flex: 1, backgroundColor: '#f7f7f7' },
  scroll:    { paddingBottom: 40 },
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
  heroTitle:  { fontSize: 26, fontWeight: '900', color: '#111', lineHeight: 32, letterSpacing: -0.3 },
  heroAccent: { color: ORANGE },
  heroSub:    { fontSize: 13, color: '#888', marginTop: 6, lineHeight: 18 },
  heroPills:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  heroPill: {
    paddingVertical: 5, paddingHorizontal: 11,
    backgroundColor: '#f9fafb', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb',
  },
  heroPillTxt: { fontSize: 11, fontWeight: '600', color: '#444' },

  body: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },

  // Sections
  section: {
    backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1, borderColor: '#ebebeb', padding: 16, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  sectionHead:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#111', letterSpacing: -0.1 },
  sectionSub:   { fontSize: 12, color: '#888', marginTop: -4, marginBottom: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#555', letterSpacing: 0.1, marginTop: 2 },

  // Input
  inputWrap: {
    height: 50, backgroundColor: '#f9f9f9', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e8e8e8',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
  },
  inputText: { flex: 1, fontSize: 14, color: '#111', fontWeight: '500' },

  // Pill select
  pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingVertical: 7, paddingHorizontal: 13,
    backgroundColor: '#f3f4f6', borderRadius: 20, borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  pillActive:    { backgroundColor: '#fff7ed', borderColor: ORANGE },
  pillTxt:       { fontSize: 12, fontWeight: '600', color: '#555' },
  pillTxtActive: { color: ORANGE },

  // Banner mode cards
  modeList: { gap: 12 },
  modeCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    borderRadius: 16, borderWidth: 2, padding: 14,
  },
  modeIconWrap: {
    width: 50, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  modeText:     { flex: 1, gap: 4 },
  modeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  modeTitle:    { fontSize: 14, fontWeight: '900', letterSpacing: -0.1 },
  modeDesc:     { fontSize: 12, color: '#666', lineHeight: 17 },
  modeTag: {
    alignSelf: 'flex-start', marginTop: 4,
    paddingVertical: 3, paddingHorizontal: 10,
    borderRadius: 20, borderWidth: 1,
  },
  modeTagTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },

  // WhatsApp info box
  waInfoBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#86efac', marginTop: 4,
  },
  waInfoTxt: { flex: 1, fontSize: 12, color: '#166534', lineHeight: 17, fontWeight: '500' },

  // Upload area
  uploadArea: { marginTop: 4 },
  uploadBtn: {
    borderWidth: 2, borderColor: ORANGE + '55', borderStyle: 'dashed',
    borderRadius: 14, padding: 24, alignItems: 'center', gap: 8,
    backgroundColor: '#fff7ed',
  },
  uploadBtnTitle: { fontSize: 14, fontWeight: '800', color: '#111' },
  uploadBtnSub:   { fontSize: 11, color: '#888' },
  uploadPreviewWrap: { gap: 10 },
  uploadPreview: {
    width: '100%', height: 160, borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  reuploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 20, borderWidth: 1.5, borderColor: ORANGE,
    backgroundColor: '#fff7ed',
  },
  reuploadTxt: { fontSize: 12, fontWeight: '700', color: ORANGE },

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
  planBadgeTxt:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  planRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planDot: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  planName:      { fontSize: 16, fontWeight: '900', letterSpacing: -0.2 },
  planDuration:  { fontSize: 12, color: '#888', marginTop: 1 },
  planPriceWrap: { marginLeft: 'auto', alignItems: 'flex-end' },
  planPrice:     { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  planPriceSub:  { fontSize: 10, color: '#aaa', fontWeight: '500' },
  planPerks:     { gap: 6, paddingLeft: 36 },
  perkRow:       { flexDirection: 'row', alignItems: 'center', gap: 7 },
  perkTxt:       { fontSize: 12, color: '#444', fontWeight: '500' },

  // Payment note
  paymentNote: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  paymentNoteTxt: { flex: 1, fontSize: 12, color: '#166534', lineHeight: 17, fontWeight: '500' },

  // Submit
  submitBtn: {
    borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 4, marginTop: 4,
  },
  submitInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitTxt:   { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: -0.2 },

  tosNote: { fontSize: 10, color: '#bbb', textAlign: 'center', lineHeight: 14 },

  // Feedback banners
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
