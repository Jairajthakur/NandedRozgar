/**
 * CityPlus — HelpSupportScreen.js
 * Full-featured help & support page with:
 * - Searchable FAQ accordion
 * - Contact channels (WhatsApp, Email, Phone)
 * - Quick-action categories
 * - Report a problem form modal
 * - Animated entrance, consistent design tokens
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Animated, Easing, Modal, Linking, Platform,
  KeyboardAvoidingView, Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

// ── Design tokens ──────────────────────────────────────────────────────────────
const ORANGE  = '#f97316';
const ORANGE2 = '#fb923c';
const BG      = '#f4f4f6';
const SURFACE = '#ffffff';
const TEXT    = '#111118';
const MUTED   = '#8e8ea0';
const BORDER  = 'rgba(0,0,0,0.07)';
const GREEN   = '#16a34a';

// ── FAQ data ───────────────────────────────────────────────────────────────────
const FAQ_CATEGORIES = [
  {
    id: 'jobs',
    icon: 'briefcase-outline',
    label: 'Jobs & Posting',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.1)',
    faqs: [
      {
        q: 'How do I post a job?',
        a: 'Tap the "+" button in the bottom navigation bar and select "Post a Job". Fill in the job title, description, salary, and contact details. Choose a listing type (Free / Featured / Urgent) and submit. Your job will go live after review.',
      },
      {
        q: 'How long does my job listing stay active?',
        a: 'Free listings stay active for 30 days. Featured listings are active for 45 days. Urgent listings are active for 60 days. You can renew or repost from your Profile → My Job Posts.',
      },
      {
        q: 'Can I edit or delete my job post?',
        a: 'Yes! Go to Profile → My Job Posts, tap the job you want to manage, and choose Edit or Delete. Note: once a job has 5+ applications, editing is limited to contact details and salary only.',
      },
      {
        q: 'What is the difference between Featured and Urgent listings?',
        a: 'Featured listings appear highlighted at the top of search results and cost ₹49. Urgent listings show a red "URGENT" badge and are prioritised above Featured — they cost ₹99. Both include a WhatsApp Apply button.',
      },
      {
        q: 'How do I apply for a job?',
        a: 'Open any job listing and tap "Apply via WhatsApp" or "Apply Now". WhatsApp applications connect you directly with the employer. For in-app applications, your saved profile and resume are submitted automatically.',
      },
      {
        q: 'Why was my job post rejected?',
        a: 'Posts are rejected if they violate our guidelines — e.g., misleading salaries, adult content, multi-level marketing schemes, or duplicate listings. You will receive an in-app notification with the reason. Edit and resubmit if appropriate.',
      },
    ],
  },
  {
    id: 'account',
    icon: 'person-circle-outline',
    label: 'Account & Profile',
    color: '#0ea5e9',
    bg: 'rgba(14,165,233,0.1)',
    faqs: [
      {
        q: 'How do I change my phone number or password?',
        a: 'Go to Profile → Edit Profile. Tap "Change Phone" to receive an OTP on your new number. To change your password, tap "Change Password" and follow the prompts. For security, you\'ll be logged out on other devices.',
      },
      {
        q: 'How do I switch between Seeker and Employer mode?',
        a: 'Go to Profile → Edit Profile and tap "Account Type". Select Job Seeker or Employer. You can switch at any time — your data for both roles is preserved.',
      },
      {
        q: 'I forgot my password. How do I reset it?',
        a: 'On the login screen, tap "Forgot Password?" and enter your registered phone number. You\'ll receive an OTP. Enter it, then set a new password. If you don\'t receive an OTP within 2 minutes, tap "Resend".',
      },
      {
        q: 'How do I upload or update my resume?',
        a: 'Go to Profile → Upload Resume. You can upload a PDF (max 5 MB) or fill in the in-app resume builder. Employers can view your resume when you apply for jobs.',
      },
      {
        q: 'Can I delete my account?',
        a: 'Yes. Go to Profile → Settings → Delete Account. This permanently removes your profile, listings, and data. This action cannot be undone. Active job posts will be taken down immediately.',
      },
    ],
  },
  {
    id: 'rooms',
    icon: 'home-outline',
    label: 'Rooms & Rentals',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    faqs: [
      {
        q: 'How do I list a room for rent?',
        a: 'Tap "+" → Post a Room. Add photos, monthly rent, deposit, amenities, and contact info. Listings are reviewed within 2 hours. You can list up to 3 rooms for free.',
      },
      {
        q: 'Are room listings verified?',
        a: 'Listings marked with a blue shield are verified by our team (address confirmed + landlord ID checked). We recommend visiting the property in person before paying any advance.',
      },
      {
        q: 'How do I contact a room owner?',
        a: 'Open the room listing and tap "Contact Owner" to call or WhatsApp them directly. Never pay an advance without visiting the property and meeting the owner in person.',
      },
    ],
  },
  {
    id: 'payments',
    icon: 'card-outline',
    label: 'Payments & Credits',
    color: GREEN,
    bg: 'rgba(22,163,74,0.1)',
    faqs: [
      {
        q: 'What payment methods are accepted?',
        a: 'We accept UPI (Google Pay, PhonePe, Paytm), debit/credit cards, and net banking via Razorpay. All transactions are encrypted. Cash payments are not supported.',
      },
      {
        q: 'I was charged but my listing wasn\'t upgraded. What do I do?',
        a: 'This can happen due to a temporary server or network error. Wait 10 minutes and refresh your listing. If it\'s still not upgraded, contact us via WhatsApp with your Order ID (found in Profile → Payment History) and we\'ll resolve it within 24 hours.',
      },
      {
        q: 'Are payments refundable?',
        a: 'Payments for Featured and Urgent listings are non-refundable once the listing goes live. If your post was rejected by our team, a full refund is processed within 5–7 business days. Referral credits are non-transferable and non-encashable.',
      },
      {
        q: 'How do referral credits work?',
        a: 'Earn 1 credit for every friend who signs up using your referral code. 1 credit = ₹20 off a Featured listing, or ₹49 off an Urgent listing. Credits never expire. You can use up to 5 credits per transaction.',
      },
    ],
  },
  {
    id: 'safety',
    icon: 'shield-checkmark-outline',
    label: 'Safety & Privacy',
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.1)',
    faqs: [
      {
        q: 'How do I report a suspicious listing or user?',
        a: 'On any listing or profile, tap the three-dot menu (⋯) in the top-right corner and select "Report". Choose a reason and add details. Our team reviews reports within 24 hours. You can also contact us directly via WhatsApp.',
      },
      {
        q: 'Is my phone number visible to everyone?',
        a: 'Your phone number is only shared with employers or room owners when you initiate contact (tap "Call" or "WhatsApp"). It is never displayed publicly on your profile or in listings.',
      },
      {
        q: 'How is my data used?',
        a: 'We use your data only to operate the CityPlus service — matching jobs, verifying accounts, and improving the app. We never sell your data to third parties. Read our full Privacy Policy in the About section.',
      },
    ],
  },
];

// ── Animated FAQ accordion item ────────────────────────────────────────────────
function FAQItem({ q, a, index }) {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: index * 60,
      useNativeDriver: true,
    }).start();
  }, []);

  function toggle() {
    const toValue = open ? 0 : 1;
    Animated.spring(anim, { toValue, useNativeDriver: false, tension: 60, friction: 10 }).start();
    setOpen(!open);
  }

  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const maxH   = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 300] });
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.75}
        style={[styles.faqRow, open && styles.faqRowOpen]}
      >
        <Text style={[styles.faqQ, open && { color: ORANGE }]}>{q}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={18} color={open ? ORANGE : MUTED} />
        </Animated.View>
      </TouchableOpacity>
      <Animated.View style={{ maxHeight: maxH, overflow: 'hidden', opacity }}>
        <Text style={styles.faqA}>{a}</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ── Category pill ──────────────────────────────────────────────────────────────
function CategoryPill({ item, selected, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.pill,
        selected && { backgroundColor: ORANGE, borderColor: ORANGE },
      ]}
    >
      <Ionicons
        name={item.icon}
        size={14}
        color={selected ? '#fff' : item.color}
        style={{ marginRight: 5 }}
      />
      <Text style={[styles.pillTxt, selected && { color: '#fff' }]}>{item.label}</Text>
    </TouchableOpacity>
  );
}

// ── Contact channel card ───────────────────────────────────────────────────────
function ContactCard({ icon, library, label, sub, onPress, bg, iconColor }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 30 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 20 }),
    ]).start();
    onPress();
  };
  return (
    <Animated.View style={{ transform: [{ scale }], flex: 1 }}>
      <TouchableOpacity onPress={press} activeOpacity={0.85} style={styles.contactCard}>
        <View style={[styles.contactIconWrap, { backgroundColor: bg }]}>
          {library === 'community'
            ? <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
            : <Ionicons name={icon} size={24} color={iconColor} />}
        </View>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactSub}>{sub}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Report a Problem modal ─────────────────────────────────────────────────────
function ReportModal({ visible, onClose }) {
  const [type, setType] = useState('');
  const [detail, setDetail] = useState('');
  const translateY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 60, friction: 12 }).start();
    } else {
      Animated.timing(translateY, { toValue: 400, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  const PROBLEM_TYPES = [
    'App crash / bug',
    'Listing is fake or misleading',
    'Spam or scam',
    'Payment issue',
    'Account problem',
    'Other',
  ];

  function submit() {
    if (!type) {
      Toast.show({ type: 'error', text1: 'Select a problem type' });
      return;
    }
    Toast.show({ type: 'success', text1: 'Report submitted!', text2: 'We\'ll get back to you within 24 hours.' });
    setType('');
    setDetail('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalBackdrop}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.reportSheet, { transform: [{ translateY }] }]}>
          {/* Handle */}
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Report a Problem</Text>
            <TouchableOpacity onPress={onClose} style={styles.sheetClose}>
              <Ionicons name="close" size={20} color={MUTED} />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Problem type *</Text>
          <View style={styles.chipRow}>
            {PROBLEM_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setType(t)}
                style={[styles.chip, type === t && styles.chipActive]}
              >
                <Text style={[styles.chipTxt, type === t && styles.chipTxtActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Tell us more (optional)</Text>
          <TextInput
            style={styles.textarea}
            placeholder="Describe the problem in detail…"
            placeholderTextColor={MUTED}
            value={detail}
            onChangeText={setDetail}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity style={styles.submitBtn} onPress={submit} activeOpacity={0.85}>
            <Ionicons name="send-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.submitBtnTxt}>Submit Report</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function HelpSupportScreen() {
  const [search, setSearch]           = useState('');
  const [activeCat, setActiveCat]     = useState('jobs');
  const [showReport, setShowReport]   = useState(false);
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const headerTranslate = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] });

  // Filter FAQ by search query
  const activeCatData = FAQ_CATEGORIES.find(c => c.id === activeCat);
  const filteredFaqs  = search.trim().length > 1
    ? FAQ_CATEGORIES.flatMap(c => c.faqs).filter(
        f => f.q.toLowerCase().includes(search.toLowerCase()) ||
             f.a.toLowerCase().includes(search.toLowerCase())
      )
    : activeCatData?.faqs ?? [];

  const openWhatsApp = useCallback(() => {
    Linking.openURL('https://wa.me/919876543210?text=Hi%2C%20I%20need%20help%20with%20CityPlus%20app.').catch(() =>
      Alert.alert('WhatsApp not installed', 'Please contact us at support@cityplus.in')
    );
  }, []);

  const openEmail = useCallback(() => {
    Linking.openURL('mailto:support@cityplus.in?subject=CityPlus%20Support%20Request');
  }, []);

  const openPhone = useCallback(() => {
    Linking.openURL('tel:+919876543210');
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero banner ─── */}
        <Animated.View
          style={[
            styles.hero,
            { opacity: headerAnim, transform: [{ translateY: headerTranslate }] },
          ]}
        >
          <View style={styles.heroIconWrap}>
            <Ionicons name="headset-outline" size={32} color={ORANGE} />
          </View>
          <Text style={styles.heroTitle}>How can we help you?</Text>
          <Text style={styles.heroSub}>Search FAQs or choose a topic below</Text>

          {/* Search bar */}
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={MUTED} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search help articles…"
              placeholderTextColor={MUTED}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={MUTED} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* ── Contact channels ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          <View style={styles.contactRow}>
            <ContactCard
              icon="logo-whatsapp"
              library="ion"
              label="WhatsApp"
              sub="Fastest • Usually instant"
              onPress={openWhatsApp}
              bg="rgba(37,211,102,0.12)"
              iconColor="#25d366"
            />
            <ContactCard
              icon="mail-outline"
              library="ion"
              label="Email"
              sub="Reply within 24 hrs"
              onPress={openEmail}
              bg="rgba(249,115,22,0.1)"
              iconColor={ORANGE}
            />
            <ContactCard
              icon="call-outline"
              library="ion"
              label="Call"
              sub="Mon–Sat 9am–6pm"
              onPress={openPhone}
              bg="rgba(14,165,233,0.1)"
              iconColor="#0ea5e9"
            />
          </View>
        </View>

        {/* ── FAQ section ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

          {/* Category pills — hide during search */}
          {search.trim().length < 2 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillRow}
            >
              {FAQ_CATEGORIES.map(cat => (
                <CategoryPill
                  key={cat.id}
                  item={cat}
                  selected={activeCat === cat.id}
                  onPress={() => setActiveCat(cat.id)}
                />
              ))}
            </ScrollView>
          )}

          {/* Active category header */}
          {search.trim().length < 2 && activeCatData && (
            <View style={[styles.catHeader, { backgroundColor: activeCatData.bg }]}>
              <Ionicons name={activeCatData.icon} size={18} color={activeCatData.color} style={{ marginRight: 8 }} />
              <Text style={[styles.catHeaderTxt, { color: activeCatData.color }]}>{activeCatData.label}</Text>
            </View>
          )}

          {search.trim().length > 1 && (
            <View style={styles.searchResultHeader}>
              <Ionicons name="search-outline" size={14} color={MUTED} style={{ marginRight: 6 }} />
              <Text style={styles.searchResultTxt}>
                {filteredFaqs.length} result{filteredFaqs.length !== 1 ? 's' : ''} for "{search}"
              </Text>
            </View>
          )}

          <View style={styles.faqCard}>
            {filteredFaqs.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="search-circle-outline" size={48} color="#e5e5e5" />
                <Text style={styles.emptyTxt}>No results found</Text>
                <Text style={styles.emptySub}>Try a different keyword or contact us directly</Text>
              </View>
            ) : (
              filteredFaqs.map((f, i) => (
                <React.Fragment key={`${activeCat}-${i}`}>
                  <FAQItem q={f.q} a={f.a} index={i} />
                  {i < filteredFaqs.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))
            )}
          </View>
        </View>

        {/* ── Quick links ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <View style={styles.quickGrid}>
            {[
              { icon: 'document-text-outline', label: 'Terms of Service',  color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
              { icon: 'lock-closed-outline',   label: 'Privacy Policy',    color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
              { icon: 'newspaper-outline',     label: 'Community Guidelines', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
              { icon: 'bug-outline',           label: 'Report a Problem',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  onPress: () => setShowReport(true) },
            ].map((link, i) => (
              <TouchableOpacity
                key={i}
                style={styles.quickItem}
                activeOpacity={0.8}
                onPress={link.onPress}
              >
                <View style={[styles.quickIcon, { backgroundColor: link.bg }]}>
                  <Ionicons name={link.icon} size={20} color={link.color} />
                </View>
                <Text style={styles.quickLabel}>{link.label}</Text>
                <Ionicons name="chevron-forward" size={14} color={MUTED} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── App version note ─── */}
        <View style={styles.versionNote}>
          <Text style={styles.versionTxt}>CityPlus v1.0.1 · Made with ❤️ in Nanded</Text>
        </View>
      </ScrollView>

      <ReportModal visible={showReport} onClose={() => setShowReport(false)} />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },

  // Hero
  hero: {
    backgroundColor: SURFACE,
    margin: 16,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: TEXT, marginBottom: 6, textAlign: 'center' },
  heroSub:   { fontSize: 13, color: MUTED, marginBottom: 16, textAlign: 'center' },
  searchBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchInput: { flex: 1, fontSize: 14, color: TEXT },

  // Sections
  section:      { marginHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: TEXT, letterSpacing: 0.4, marginBottom: 12, textTransform: 'uppercase' },

  // Contact cards
  contactRow:      { flexDirection: 'row', gap: 10 },
  contactCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  contactIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  contactLabel: { fontSize: 12, fontWeight: '700', color: TEXT, textAlign: 'center', marginBottom: 2 },
  contactSub:   { fontSize: 10, color: MUTED, textAlign: 'center', lineHeight: 14 },

  // Pills
  pillRow: { paddingBottom: 12, gap: 8, flexDirection: 'row' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  pillTxt: { fontSize: 12, fontWeight: '600', color: MUTED },

  // Category header
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  catHeaderTxt: { fontSize: 13, fontWeight: '700' },

  // Search result label
  searchResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchResultTxt: { fontSize: 12, color: MUTED, fontStyle: 'italic' },

  // FAQ card
  faqCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  faqRowOpen: { backgroundColor: '#fff9f5' },
  faqQ:  { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT, paddingRight: 12, lineHeight: 20 },
  faqA:  { fontSize: 13, color: MUTED, lineHeight: 20, paddingHorizontal: 16, paddingBottom: 14 },
  divider: { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },

  // Empty state
  emptyWrap: { alignItems: 'center', paddingVertical: 32 },
  emptyTxt:  { fontSize: 15, fontWeight: '700', color: MUTED, marginTop: 12, marginBottom: 4 },
  emptySub:  { fontSize: 12, color: '#c0c0c8', textAlign: 'center' },

  // Quick links
  quickGrid: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  quickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  quickIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  quickLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT },

  // Version note
  versionNote: { alignItems: 'center', paddingVertical: 8 },
  versionTxt:  { fontSize: 11, color: '#c0c0c8', letterSpacing: 0.3 },

  // Report modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  reportSheet: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: TEXT },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' },
  chipRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive:    { backgroundColor: '#fff7ed', borderColor: ORANGE },
  chipTxt:       { fontSize: 12, fontWeight: '600', color: MUTED },
  chipTxtActive: { color: ORANGE },
  textarea: {
    backgroundColor: BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    fontSize: 13,
    color: TEXT,
    height: 100,
    marginBottom: 20,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 14,
  },
  submitBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
