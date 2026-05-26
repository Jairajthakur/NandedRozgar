/**
 * CityPlus — HelpSupportScreen.js
 * Full-featured help & support page with:
 * - Searchable FAQ accordion
 * - Contact channels (WhatsApp, Email, Phone)
 * - Quick-action categories
 * - In-app modals for Terms, Privacy Policy, Community Guidelines
 * - Report a problem form modal
 * - Animated entrance, consistent design tokens
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Animated, Easing, Modal, Linking, Platform,
  KeyboardAvoidingView, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

// ── Design tokens ──────────────────────────────────────────────────────────────
const ORANGE  = '#f97316';
const BG      = '#f4f4f6';
const SURFACE = '#ffffff';
const TEXT    = '#111118';
const MUTED   = '#8e8ea0';
const BORDER  = 'rgba(0,0,0,0.07)';
const GREEN   = '#16a34a';

// ── Support contact details — update before publishing ──────────────────────
const SUPPORT_PHONE    = '919834308805';   // e.g. '919823001234'  (91 + 10-digit number, no +)
const SUPPORT_EMAIL    = 'support@thecityplus.in';
const LEGAL_EMAIL      = 'support@thecityplus.in';
const PRIVACY_EMAIL    = 'support@thecityplus.in';

// ── Legal content ──────────────────────────────────────────────────────────────
const LEGAL_CONTENT = {
  terms: {
    title: 'Terms of Service',
    icon: 'document-text-outline',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.1)',
    lastUpdated: 'Last updated: January 1, 2025',
    sections: [
      {
        heading: '1. Acceptance of Terms',
        body: 'By downloading, installing, or using the CityPlus app ("App"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the App.',
      },
      {
        heading: '2. Eligibility',
        body: 'You must be at least 18 years old to use CityPlus. By using the App, you confirm that you are 18 years or older and have the legal capacity to enter into these terms.',
      },
      {
        heading: '3. User Accounts',
        body: 'You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate, current, and complete information during registration. CityPlus reserves the right to suspend or terminate accounts that violate these terms.',
      },
      {
        heading: '4. Prohibited Content',
        body: 'You may not post content that is false, misleading, or fraudulent; promotes illegal activities; contains hate speech or harassment; violates third-party intellectual property rights; or involves multi-level marketing or pyramid schemes.',
      },
      {
        heading: '5. Job Listings & Payments',
        body: 'Employers are responsible for the accuracy of their job listings. CityPlus does not guarantee employment. Payments for Featured or Urgent listings are non-refundable once the listing goes live. A full refund is issued only if a post is rejected by our moderation team.',
      },
      {
        heading: '6. Limitation of Liability',
        body: 'CityPlus is a platform connecting users and is not responsible for interactions between them. We do not verify every listing and are not liable for any loss or damage arising from your use of the App.',
      },
      {
        heading: '7. Modifications',
        body: 'We may update these Terms at any time. Continued use of the App after changes constitutes acceptance of the revised Terms. We will notify users of significant changes via in-app notification.',
      },
      {
        heading: '8. Governing Law',
        body: 'These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Nanded, Maharashtra.',
      },
      {
        heading: '9. Contact',
        body: 'For questions about these Terms, contact us at ' + LEGAL_EMAIL + ' or via WhatsApp at +91 ' + SUPPORT_PHONE.slice(2) + '.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    icon: 'lock-closed-outline',
    color: '#0ea5e9',
    bg: 'rgba(14,165,233,0.1)',
    lastUpdated: 'Last updated: January 1, 2025',
    sections: [
      {
        heading: '1. Information We Collect',
        body: 'We collect information you provide directly (name, phone number, location, resume) and information generated through your use of the App (jobs viewed, searches, applications submitted, device info).',
      },
      {
        heading: '2. How We Use Your Information',
        body: 'Your data is used to: operate and improve the App; match you with relevant jobs, rooms, or listings; send job alerts and notifications; prevent fraud and abuse; and process payments securely via Razorpay.',
      },
      {
        heading: '3. What We Never Do',
        body: 'We never sell your personal data to third parties. We never show your phone number publicly without your explicit action (e.g. tapping "Call"). We never share your data with advertisers.',
      },
      {
        heading: '4. Data Sharing',
        body: 'We share data only with: service providers who help operate the App (Razorpay for payments, Firebase for notifications, Expo for app delivery); and law enforcement when required by valid legal process.',
      },
      {
        heading: '5. Data Security',
        body: 'All data in transit is encrypted using HTTPS/TLS. Passwords are hashed using bcrypt. We conduct periodic security reviews and promptly address vulnerabilities.',
      },
      {
        heading: '6. Your Rights',
        body: 'You can access, update, or delete your personal information at any time from Profile → Edit Profile. You can request complete data deletion by contacting ' + SUPPORT_EMAIL + '. We respond to deletion requests within 7 business days.',
      },
      {
        heading: '7. Cookies & Analytics',
        body: 'The App uses anonymous analytics (Expo Analytics) to understand usage patterns and improve the experience. No personally identifiable information is included in analytics events.',
      },
      {
        heading: '8. Children\'s Privacy',
        body: 'CityPlus is not intended for users under 18. We do not knowingly collect data from minors. If we become aware of such data, we will delete it promptly.',
      },
      {
        heading: '9. Contact',
        body: 'For privacy-related queries or data deletion requests, contact us at ' + PRIVACY_EMAIL + ' or via WhatsApp at +91 ' + SUPPORT_PHONE.slice(2).replace(/(\d{5})(\d{5})/, '$1 $2') + '.',
      },
    ],
  },
  guidelines: {
    title: 'Community Guidelines',
    icon: 'newspaper-outline',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    lastUpdated: 'Last updated: January 1, 2025',
    sections: [
      {
        heading: '🤝 Be Honest',
        body: 'Post only accurate, truthful information. Fake job listings, false salary ranges, non-existent rooms, or misleading vehicle descriptions harm real people and will result in immediate removal and account suspension.',
      },
      {
        heading: '🚫 No Spam',
        body: 'Do not post duplicate listings. Do not repeatedly repost the same job or item. Automated or mass posting is prohibited. Accounts found spamming will be permanently banned.',
      },
      {
        heading: '💼 Legitimate Jobs Only',
        body: 'Multi-level marketing (MLM), pyramid schemes, "investment opportunities", and work-from-home scams are strictly prohibited. Jobs must involve real, legal work with clear, honest compensation.',
      },
      {
        heading: '🏠 Accurate Room Listings',
        body: 'Photos must accurately represent the actual room. Rent and deposit amounts must be correct. Contact details must be of the actual owner or verified agent. Do not list rooms you do not own or have authority to rent.',
      },
      {
        heading: '💬 Respectful Communication',
        body: 'Treat everyone — job seekers, employers, landlords, and buyers — with respect. Harassment, abusive language, threats, or discrimination based on caste, religion, gender, or disability will result in immediate account removal.',
      },
      {
        heading: '🔐 Privacy & Safety',
        body: 'Never share another user\'s personal information without their consent. Do not attempt to bypass the in-app contact system to harvest phone numbers for unsolicited marketing.',
      },
      {
        heading: '⚠️ Reporting Violations',
        body: 'If you see a listing or user that violates these guidelines, tap the three-dot menu (⋯) on the listing and select "Report". Our moderation team reviews all reports within 24 hours.',
      },
      {
        heading: '🔨 Consequences',
        body: 'Violations result in: (1) warning and content removal for first offence, (2) temporary suspension for repeat offences, (3) permanent ban for serious or persistent violations. Paid listings that are removed due to violations are non-refundable.',
      },
    ],
  },
};

// ── In-app legal content modal ─────────────────────────────────────────────────
function LegalModal({ visible, contentKey, onClose }) {
  const content = LEGAL_CONTENT[contentKey];
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0, tension: 65, friction: 12, useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 600, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!content) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.legalBackdrop}>
        <Animated.View style={[styles.legalSheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Header */}
          <SafeAreaView>
            <View style={styles.legalHeader}>
              <View style={[styles.legalHeaderIcon, { backgroundColor: content.bg }]}>
                <Ionicons name={content.icon} size={18} color={content.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.legalHeaderTitle}>{content.title}</Text>
                <Text style={styles.legalHeaderSub}>{content.lastUpdated}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.legalClose}>
                <Ionicons name="close" size={20} color={MUTED} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Scrollable content */}
          <ScrollView
            style={styles.legalScroll}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {content.sections.map((s, i) => (
              <View key={i} style={styles.legalSection}>
                <Text style={styles.legalSectionHeading}>{s.heading}</Text>
                <Text style={styles.legalSectionBody}>{s.body}</Text>
              </View>
            ))}

            <View style={styles.legalFooter}>
              <Text style={styles.legalFooterTxt}>
                CityPlus v4.4.0 · Nanded, Maharashtra, India
              </Text>
              <Text style={styles.legalFooterTxt}>
                {`Questions? Contact ${SUPPORT_EMAIL}`}
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

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
        a: 'Go to Profile → Edit Profile. Tap "Change Phone" to receive an OTP on your new number. To change your password, tap "Change Password" and follow the prompts.',
      },
      {
        q: 'How do I switch between Seeker and Employer mode?',
        a: 'Go to Profile → Edit Profile and tap "Account Type". Select Job Seeker or Employer. You can switch at any time — your data for both roles is preserved.',
      },
      {
        q: 'I forgot my password. How do I reset it?',
        a: 'On the login screen, tap "Forgot Password?" and enter your registered phone number. You\'ll receive an OTP. Enter it, then set a new password.',
      },
      {
        q: 'How do I upload or update my resume?',
        a: 'Go to Profile → Upload Resume. You can upload a PDF (max 5 MB) or fill in the in-app resume builder.',
      },
      {
        q: 'Can I delete my account?',
        a: 'Yes. Go to Profile → Settings → Delete Account. This permanently removes your profile, listings, and data and cannot be undone.',
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
        a: 'Open the room listing and tap "Contact Owner" to call or WhatsApp them directly. Never pay an advance without visiting the property first.',
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
        a: 'Wait 10 minutes and refresh your listing. If it\'s still not upgraded, contact us via WhatsApp with your Order ID (found in Profile → Payment History) and we\'ll resolve it within 24 hours.',
      },
      {
        q: 'Are payments refundable?',
        a: 'Payments for Featured and Urgent listings are non-refundable once the listing goes live. If your post was rejected by our team, a full refund is processed within 5–7 business days.',
      },
      {
        q: 'How do referral credits work?',
        a: 'Earn 1 credit for every friend who signs up using your referral code. 1 credit = ₹20 off a Featured listing, or ₹49 off an Urgent listing. Credits never expire.',
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
        a: 'On any listing or profile, tap the three-dot menu (⋯) in the top-right corner and select "Report". Our team reviews reports within 24 hours.',
      },
      {
        q: 'Is my phone number visible to everyone?',
        a: 'Your phone number is only shared when you initiate contact (tap "Call" or "WhatsApp"). It is never displayed publicly on your profile.',
      },
      {
        q: 'How is my data used?',
        a: 'We use your data only to operate the CityPlus service. We never sell your data to third parties. Read our full Privacy Policy in Quick Links below.',
      },
    ],
  },
];

// ── Animated FAQ accordion ─────────────────────────────────────────────────────
function FAQItem({ q, a, index }) {
  const [open, setOpen] = useState(false);
  const anim     = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 300, delay: index * 60, useNativeDriver: true,
    }).start();
  }, []);

  function toggle() {
    Animated.spring(anim, {
      toValue: open ? 0 : 1, useNativeDriver: false, tension: 60, friction: 10,
    }).start();
    setOpen(!open);
  }

  const rotate  = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const maxH    = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 300] });
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.75}
        style={[styles.faqRow, open && styles.faqRowOpen]}>
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
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={[styles.pill, selected && { backgroundColor: ORANGE, borderColor: ORANGE }]}>
      <Ionicons name={item.icon} size={14} color={selected ? '#fff' : item.color} style={{ marginRight: 5 }} />
      <Text style={[styles.pillTxt, selected && { color: '#fff' }]}>{item.label}</Text>
    </TouchableOpacity>
  );
}

// ── Contact card ───────────────────────────────────────────────────────────────
function ContactCard({ icon, label, sub, onPress, bg, iconColor }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 30 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 20 }),
    ]).start();
    onPress();
  };
  return (
    <Animated.View style={{ transform: [{ scale }], flex: 1 }}>
      <TouchableOpacity onPress={press} activeOpacity={0.85} style={styles.contactCard}>
        <View style={[styles.contactIconWrap, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={24} color={iconColor} />
        </View>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactSub}>{sub}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Report modal ───────────────────────────────────────────────────────────────
function ReportModal({ visible, onClose }) {
  const [type, setType]     = useState('');
  const [detail, setDetail] = useState('');
  const translateY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : 400,
      useNativeDriver: true, tension: 60, friction: 12,
    }).start();
  }, [visible]);

  const PROBLEM_TYPES = ['App crash / bug', 'Fake listing', 'Spam or scam', 'Payment issue', 'Account problem', 'Other'];

  function submit() {
    if (!type) { Toast.show({ type: 'error', text1: 'Select a problem type' }); return; }
    Toast.show({ type: 'success', text1: 'Report submitted!', text2: 'We\'ll get back within 24 hours.' });
    setType(''); setDetail(''); onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.reportSheet, { transform: [{ translateY }] }]}>
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
              <TouchableOpacity key={t} onPress={() => setType(t)}
                style={[styles.chip, type === t && styles.chipActive]}>
                <Text style={[styles.chipTxt, type === t && styles.chipTxtActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Tell us more (optional)</Text>
          <TextInput style={styles.textarea} placeholder="Describe the problem…"
            placeholderTextColor={MUTED} value={detail} onChangeText={setDetail}
            multiline numberOfLines={4} textAlignVertical="top" />
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
  const [search, setSearch]         = useState('');
  const [activeCat, setActiveCat]   = useState('jobs');
  const [showReport, setShowReport] = useState(false);
  const [legalKey, setLegalKey]     = useState(null); // 'terms' | 'privacy' | 'guidelines'
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, []);

  const headerTranslate = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] });

  const activeCatData = FAQ_CATEGORIES.find(c => c.id === activeCat);
  const filteredFaqs  = search.trim().length > 1
    ? FAQ_CATEGORIES.flatMap(c => c.faqs).filter(
        f => f.q.toLowerCase().includes(search.toLowerCase()) ||
             f.a.toLowerCase().includes(search.toLowerCase())
      )
    : activeCatData?.faqs ?? [];

  const openWhatsApp = useCallback(() => {
    Linking.openURL(`https://wa.me/${SUPPORT_PHONE}?text=Hi%2C%20I%20need%20help%20with%20CityPlus%20app.`);
  }, []);
  const openEmail = useCallback(() => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=CityPlus%20Support`);
  }, []);
  const openPhone = useCallback(() => {
    Linking.openURL(`tel:+${SUPPORT_PHONE}`);
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <Animated.View style={[styles.hero, { opacity: headerAnim, transform: [{ translateY: headerTranslate }] }]}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="headset-outline" size={32} color={ORANGE} />
          </View>
          <Text style={styles.heroTitle}>How can we help you?</Text>
          <Text style={styles.heroSub}>Search FAQs or choose a topic below</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={MUTED} style={{ marginRight: 8 }} />
            <TextInput style={styles.searchInput} placeholder="Search help articles…"
              placeholderTextColor={MUTED} value={search} onChangeText={setSearch} returnKeyType="search" />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={MUTED} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* ── Contact channels ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          <View style={styles.contactRow}>
            <ContactCard icon="logo-whatsapp" label="WhatsApp" sub="Fastest response"
              onPress={openWhatsApp} bg="rgba(37,211,102,0.12)" iconColor="#25d366" />
            <ContactCard icon="mail-outline" label="Email" sub="Reply in 24 hrs"
              onPress={openEmail} bg="rgba(249,115,22,0.1)" iconColor={ORANGE} />
            <ContactCard icon="call-outline" label="Call" sub="Mon–Sat 9am–6pm"
              onPress={openPhone} bg="rgba(14,165,233,0.1)" iconColor="#0ea5e9" />
          </View>
        </View>

        {/* ── FAQ section ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

          {search.trim().length < 2 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
              {FAQ_CATEGORIES.map(cat => (
                <CategoryPill key={cat.id} item={cat} selected={activeCat === cat.id}
                  onPress={() => setActiveCat(cat.id)} />
              ))}
            </ScrollView>
          )}

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

        {/* ── Quick links ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <View style={styles.quickGrid}>
            {[
              { icon: 'document-text-outline', label: 'Terms of Service',     color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  onPress: () => setLegalKey('terms')      },
              { icon: 'lock-closed-outline',   label: 'Privacy Policy',       color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)',  onPress: () => setLegalKey('privacy')    },
              { icon: 'newspaper-outline',     label: 'Community Guidelines', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  onPress: () => setLegalKey('guidelines') },
              { icon: 'bug-outline',           label: 'Report a Problem',     color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   onPress: () => setShowReport(true)       },
            ].map((link, i, arr) => (
              <TouchableOpacity key={i} style={[styles.quickItem, i === arr.length - 1 && { borderBottomWidth: 0 }]}
                activeOpacity={0.8} onPress={link.onPress}>
                <View style={[styles.quickIcon, { backgroundColor: link.bg }]}>
                  <Ionicons name={link.icon} size={20} color={link.color} />
                </View>
                <Text style={styles.quickLabel}>{link.label}</Text>
                <Ionicons name="chevron-forward" size={14} color={MUTED} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.versionNote}>
          <Text style={styles.versionTxt}>CityPlus v4.4.0 · Made with ❤️ in Nanded</Text>
        </View>
      </ScrollView>

      {/* Modals */}
      <LegalModal visible={!!legalKey} contentKey={legalKey} onClose={() => setLegalKey(null)} />
      <ReportModal visible={showReport} onClose={() => setShowReport(false)} />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  hero: {
    backgroundColor: SURFACE, margin: 16, borderRadius: 20, padding: 20, alignItems: 'center',
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  heroIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff7ed',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: TEXT, marginBottom: 6, textAlign: 'center' },
  heroSub:   { fontSize: 13, color: MUTED, marginBottom: 16, textAlign: 'center' },
  searchBox: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    backgroundColor: BG, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: BORDER,
  },
  searchInput: { flex: 1, fontSize: 14, color: TEXT },
  section:      { marginHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: TEXT, letterSpacing: 0.4, marginBottom: 12, textTransform: 'uppercase' },
  contactRow:   { flexDirection: 'row', gap: 10 },
  contactCard: {
    flex: 1, backgroundColor: SURFACE, borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: BORDER,
  },
  contactIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  contactLabel: { fontSize: 12, fontWeight: '700', color: TEXT, textAlign: 'center', marginBottom: 2 },
  contactSub:   { fontSize: 10, color: MUTED, textAlign: 'center', lineHeight: 14 },
  pillRow:      { paddingBottom: 12, gap: 8, flexDirection: 'row' },
  pill: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
  },
  pillTxt: { fontSize: 12, fontWeight: '600', color: MUTED },
  catHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 12 },
  catHeaderTxt: { fontSize: 13, fontWeight: '700' },
  searchResultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  searchResultTxt: { fontSize: 12, color: MUTED, fontStyle: 'italic' },
  faqCard: { backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  faqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  faqRowOpen: { backgroundColor: '#fff9f5' },
  faqQ:  { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT, paddingRight: 12, lineHeight: 20 },
  faqA:  { fontSize: 13, color: MUTED, lineHeight: 20, paddingHorizontal: 16, paddingBottom: 14 },
  divider: { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },
  emptyWrap: { alignItems: 'center', paddingVertical: 32 },
  emptyTxt:  { fontSize: 15, fontWeight: '700', color: MUTED, marginTop: 12, marginBottom: 4 },
  emptySub:  { fontSize: 12, color: '#c0c0c8', textAlign: 'center' },
  quickGrid: { backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  quickItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  quickIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  quickLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT },
  versionNote: { alignItems: 'center', paddingVertical: 8 },
  versionTxt:  { fontSize: 11, color: '#c0c0c8', letterSpacing: 0.3 },

  // ── Legal modal
  legalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  legalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: '92%', backgroundColor: SURFACE,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden',
  },
  legalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  legalHeaderIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  legalHeaderTitle: { fontSize: 16, fontWeight: '800', color: TEXT },
  legalHeaderSub:   { fontSize: 11, color: MUTED, marginTop: 1 },
  legalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  legalScroll: { flex: 1 },
  legalSection: { marginBottom: 20 },
  legalSectionHeading: { fontSize: 14, fontWeight: '800', color: TEXT, marginBottom: 6 },
  legalSectionBody:    { fontSize: 13, color: MUTED, lineHeight: 21 },
  legalFooter: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: BORDER, alignItems: 'center', gap: 4 },
  legalFooterTxt: { fontSize: 11, color: '#c0c0c8' },

  // ── Report modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  reportSheet: { backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ddd', alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sheetTitle:  { fontSize: 17, fontWeight: '800', color: TEXT },
  sheetClose:  { width: 32, height: 32, borderRadius: 16, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  fieldLabel:  { fontSize: 12, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' },
  chipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:        { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
  chipActive:    { backgroundColor: '#fff7ed', borderColor: ORANGE },
  chipTxt:       { fontSize: 12, fontWeight: '600', color: MUTED },
  chipTxtActive: { color: ORANGE },
  textarea: {
    backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    padding: 14, fontSize: 13, color: TEXT, height: 100, marginBottom: 20,
  },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 14 },
  submitBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
