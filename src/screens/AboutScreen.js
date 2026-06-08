/**
 * CityPlus — AboutScreen.js
 * Full-featured About page with:
 * - Animated brand hero
 * - Mission & vision cards
 * - App feature highlights
 * - Team / founded info
 * - Stats bar (live or static)
 * - Legal links (Privacy Policy, Terms)
 * - Social links
 * - Consistent design tokens
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  Platform,
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Easing, Linking, Alert, Modal, SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BASE_URL } from '../utils/constants';

// ── Design tokens ──────────────────────────────────────────────────────────────
const ORANGE   = '#f97316';
const ORANGE2  = '#fb923c';
const AMBER    = '#f59e0b';
const BG       = '#f4f4f6';
const SURFACE  = '#ffffff';
const TEXT     = '#111118';
const MUTED    = '#8e8ea0';
const BORDER   = 'rgba(0,0,0,0.07)';

// ── Support contact — update before publishing ──────────────────────────────
const SUPPORT_PHONE = '919834308805';   // e.g. '919823001234'  (91 + 10-digit, no +)

// ── Floating orb (reused from ProfileScreen pattern) ──────────────────────────
function Orb({ size, color, x, y, delay, duration }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web', delay }),
        Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  const opacity    = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, 0.35, 0.15] });
  return (
    <Animated.View
      style={{
        position: 'absolute', left: x, top: y,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color,
        transform: [{ translateY }],
        opacity,
      }}
    />
  );
}

// ── Animated stat number ───────────────────────────────────────────────────────
function StatNumber({ value, suffix = '' }) {
  const anim    = useRef(new Animated.Value(0)).current;
  const [disp, setDisp] = React.useState(0);
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: value,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    const id = anim.addListener(({ value: v }) => setDisp(Math.floor(v)));
    return () => anim.removeListener(id);
  }, [value]);
  return (
    <Text style={styles.statNum}>
      {disp.toLocaleString()}{suffix}
    </Text>
  );
}

// ── Feature tile ───────────────────────────────────────────────────────────────
function FeatureTile({ icon, color, bg, title, desc, delay }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 400, delay, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slide, { toValue: 0, duration: 400, delay, useNativeDriver: Platform.OS !== 'web', easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[styles.featureTile, { opacity: fade, transform: [{ translateY: slide }] }]}>
      <View style={[styles.featureIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </Animated.View>
  );
}

// ── Timeline item ──────────────────────────────────────────────────────────────
function TimelineItem({ year, label, isLast }) {
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        <View style={styles.timelineDot} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.timelineRight}>
        <Text style={styles.timelineYear}>{year}</Text>
        <Text style={styles.timelineLabel}>{label}</Text>
      </View>
    </View>
  );
}

// ── In-app legal content ───────────────────────────────────────────────────────
const LEGAL_CONTENT = {
  privacy: {
    title: 'Privacy Policy', icon: 'lock-closed-outline',
    color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)', lastUpdated: 'Last updated: June 2025',
    sections: [
      { heading: 'Information We Collect', body: 'We collect information you provide directly: name, phone number, email address, and job/listing data. We also collect device information and usage data to improve the app experience.' },
      { heading: 'How We Use Your Information', body: 'Your information is used solely to operate the NandedRozgar service — to show your listings, connect employers with job seekers, and send relevant notifications. We never sell your data to third parties.' },
      { heading: 'Data Storage & Security', body: 'All data is stored securely on encrypted servers. Passwords are hashed and never stored in plain text. We use HTTPS for all data transmission.' },
      { heading: 'Photos & Media', body: 'Photos you upload for listings are stored securely and used only to display your listing. You can delete your listings and photos at any time from your Profile.' },
      { heading: 'Third-Party Services', body: 'We use Cashfree for payment processing and Firebase for push notifications. These services have their own privacy policies. We share only the minimum data needed for these services to function.' },
      { heading: 'Your Rights', body: 'You can request deletion of your account and all associated data by contacting us at support@thecityplus.in. We will process deletion requests within 7 business days.' },
      { heading: 'Contact', body: 'For privacy questions or data deletion requests, contact us at support@thecityplus.in or via WhatsApp at +91 98343 08805.' },
    ],
  },
  terms: {
    title: 'Terms of Service', icon: 'document-text-outline',
    color: '#6366f1', bg: 'rgba(99,102,241,0.1)', lastUpdated: 'Last updated: June 2025',
    sections: [
      { heading: 'Acceptance of Terms', body: 'By using NandedRozgar, you agree to these Terms of Service. If you do not agree, please do not use the app.' },
      { heading: 'Eligibility', body: 'You must be at least 18 years old to use NandedRozgar. By using the app you confirm you meet this requirement.' },
      { heading: 'Account Responsibility', body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Provide accurate and complete information during registration.' },
      { heading: 'Listing Rules', body: 'All job posts, room listings, vehicle listings, and buy/sell items must be genuine and accurate. Fake, misleading, or duplicate listings are prohibited and will be removed.' },
      { heading: 'Prohibited Content', body: 'You may not post: illegal job offers, adult content, multi-level marketing schemes, spam, or any content that violates applicable laws. Violations result in immediate account suspension.' },
      { heading: 'Payments', body: 'Paid plans are processed via Cashfree. All payments are final and non-refundable unless the listing is rejected by our moderation team before going live.' },
      { heading: 'Termination', body: 'We reserve the right to suspend or terminate accounts that violate these terms without prior notice.' },
      { heading: 'Limitation of Liability', body: 'NandedRozgar is a platform that connects users. We are not responsible for the outcome of any job application, rental agreement, or transaction between users.' },
    ],
  },
  guidelines: {
    title: 'Community Guidelines', icon: 'newspaper-outline',
    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', lastUpdated: 'Last updated: June 2025',
    sections: [
      { heading: 'Be Honest', body: 'All listings must accurately represent the job, room, vehicle, or item. Do not exaggerate salary, hide conditions, or misrepresent what you are offering.' },
      { heading: 'Be Respectful', body: 'Treat all users with respect. Harassment, discrimination, or abusive language of any kind is strictly prohibited and will result in account removal.' },
      { heading: 'No Spam', body: 'Do not post the same listing multiple times. Do not send unsolicited messages to other users. Spam listings will be deleted without warning.' },
      { heading: 'Protect Privacy', body: 'Do not share other users\' personal information without their consent. Respect the contact details shared on listings — use them only for the intended purpose.' },
      { heading: 'Safe Transactions', body: 'Always meet in a public place for buy/sell transactions. NandedRozgar is not responsible for transactions that occur outside the platform.' },
      { heading: 'Reporting Violations', body: 'If you see a listing or user that violates these guidelines, tap the three-dot menu (⋯) on the listing and select "Report". Our team reviews all reports within 24 hours.' },
    ],
  },
};

function LegalModal({ visible, contentKey, onClose }) {
  const content  = LEGAL_CONTENT[contentKey];
  const slideAnim = useRef(new Animated.Value(700)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 12, useNativeDriver: Platform.OS !== 'web' }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 700, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
    }
  }, [visible]);

  if (!content) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={legalStyles.backdrop}>
        <Animated.View style={[legalStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <SafeAreaView>
            <View style={legalStyles.header}>
              <View style={[legalStyles.headerIcon, { backgroundColor: content.bg }]}>
                <Ionicons name={content.icon} size={18} color={content.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={legalStyles.headerTitle}>{content.title}</Text>
                <Text style={legalStyles.headerSub}>{content.lastUpdated}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={legalStyles.closeBtn}>
                <Ionicons name="close" size={20} color={MUTED} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
            showsVerticalScrollIndicator={false}
          >
            {content.sections.map((s, i) => (
              <View key={i} style={legalStyles.section}>
                <Text style={legalStyles.sectionHeading}>{s.heading}</Text>
                <Text style={legalStyles.sectionBody}>{s.body}</Text>
              </View>
            ))}
            <Text style={legalStyles.footer}>NandedRozgar · Nanded, Maharashtra{'\n'}Questions? support@thecityplus.in</Text>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const legalStyles = StyleSheet.create({
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  headerIcon:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 15, fontWeight: '800', color: TEXT },
  headerSub:    { fontSize: 11, color: MUTED, marginTop: 1 },
  closeBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f4f4f6', alignItems: 'center', justifyContent: 'center' },
  section:      { marginBottom: 20 },
  sectionHeading: { fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 6 },
  sectionBody:  { fontSize: 13, color: '#444', lineHeight: 20 },
  footer:       { fontSize: 11, color: MUTED, textAlign: 'center', marginTop: 8, lineHeight: 18 },
});

// ── Legal / social link row ───────────────────────────────────────────────────
function LinkRow({ icon, label, sub, color, bg, onPress, isLast }) {
  return (
    <TouchableOpacity
      style={[styles.linkRow, !isLast && { borderBottomWidth: 1, borderBottomColor: BORDER }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.linkIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.linkLabel}>{label}</Text>
        {sub ? <Text style={styles.linkSub}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={MUTED} />
    </TouchableOpacity>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function AboutScreen() {
  const heroAnim  = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;

  const [stats, setStats]     = useState({ users: 0, jobs: 0, rooms: 0, rating: null });
  const [legalKey, setLegalKey] = useState(null); // 'privacy' | 'terms' | 'guidelines'

  useEffect(() => {
    fetch(`${BASE_URL}/api/analytics/stats`)
      .then(r => r.json())
      .then(d => { if (d.ok) setStats(d); })
      .catch(() => {}); // silently keep zeros on network error
  }, []);

  useEffect(() => {
    // Entrance
    Animated.parallel([
      Animated.timing(heroAnim, {
        toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(logoScale, {
        toValue: 1, tension: 70, friction: 10, useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      // Subtle pulse on logo
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoPulse, { toValue: 1.05, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(logoPulse, { toValue: 1,    duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
        ])
      ).start();
    });
  }, []);

  const heroTranslate = heroAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] });

  async function openLink(url) {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert('Cannot open link', 'No browser found on this device.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open link', 'Please visit thecityplus.in directly.');
    }
  }

  return (
  <View style={styles.root}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ─── */}
      <Animated.View
        style={[
          styles.hero,
          { opacity: heroAnim, transform: [{ translateY: heroTranslate }] },
        ]}
      >
        {/* Background orbs */}
        <Orb size={120} color={ORANGE}  x={-20}  y={-20}  delay={0}    duration={3200} />
        <Orb size={80}  color={AMBER}   x={260}  y={30}   delay={600}  duration={2800} />
        <Orb size={60}  color={ORANGE2} x={160}  y={-30}  delay={1200} duration={3600} />

        {/* Logo */}
        <Animated.View style={[styles.logoWrap, { transform: [{ scale: Animated.multiply(logoScale, logoPulse) }] }]}>
          <Text style={styles.logoText}>C+</Text>
        </Animated.View>

        <Text style={styles.heroTitle}>CityPlus</Text>
        <Text style={styles.heroTagline}>Local Jobs · Local Life · Nanded</Text>

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Ionicons name="location-outline" size={11} color={ORANGE} />
            <Text style={styles.badgeTxt}>Nanded, Maharashtra</Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="phone-portrait-outline" size={11} color={ORANGE} />
            <Text style={styles.badgeTxt}>v4.4.0</Text>
          </View>
        </View>
      </Animated.View>

      {/* ── Stats bar ─── */}
      <View style={styles.statsBar}>
        {[
          { value: stats.users,  suffix: '+', label: 'Registered Users' },
          { value: stats.jobs,   suffix: '+', label: 'Jobs Posted' },
          { value: stats.rooms,  suffix: '+', label: 'Rooms Listed' },
          { value: stats.rating ?? 0, suffix: stats.rating ? '★' : '', label: 'App Rating' },
        ].map((s, i) => (
          <View key={i} style={[styles.statItem, i < 3 && { borderRightWidth: 1, borderRightColor: BORDER }]}>
            <StatNumber value={s.value} suffix={s.suffix} />
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Mission ─── */}
      <View style={styles.missionCard}>
        <View style={styles.missionIconWrap}>
          <Ionicons name="flag-outline" size={24} color={ORANGE} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.missionHeading}>Our Mission</Text>
          <Text style={styles.missionText}>
            To connect every job seeker, employer, landlord, and buyer in Nanded on a single trusted platform — reducing the gap between opportunity and access, one tap at a time.
          </Text>
        </View>
      </View>

      <View style={[styles.missionCard, { backgroundColor: '#111' }]}>
        <View style={[styles.missionIconWrap, { backgroundColor: 'rgba(249,115,22,0.15)' }]}>
          <Ionicons name="eye-outline" size={24} color={ORANGE} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.missionHeading, { color: '#fff' }]}>Our Vision</Text>
          <Text style={[styles.missionText, { color: '#aaa' }]}>
            A Nanded where no qualified person is unemployed for lack of information, and no employer struggles to find the right hire in their own city.
          </Text>
        </View>
      </View>

      {/* ── Features ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What CityPlus Offers</Text>
        <View style={styles.featureCard}>
          {[
            { icon: 'briefcase-outline',        color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  title: 'Job Board',          desc: 'Browse thousands of local jobs in Nanded — full-time, part-time, and contract.', delay: 0   },
            { icon: 'home-outline',             color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  title: 'Rooms & Rentals',    desc: 'Find verified PGs, flats, and rooms in any Nanded neighbourhood.', delay: 80  },
            { icon: 'car-outline',              color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)',  title: 'Vehicles',           desc: 'Buy and sell used cars, bikes, and scooters locally.', delay: 160 },
            { icon: 'storefront-outline',       color: '#16a34a', bg: 'rgba(22,163,74,0.1)',   title: 'Buy & Sell',         desc: 'List or discover second-hand electronics, furniture, and more.', delay: 240 },
            { icon: 'sparkles',         color: ORANGE,    bg: '#fff7ed',               title: 'AI Job Match',       desc: 'Our AI assistant helps you craft resumes and find best-fit jobs instantly.', delay: 320 },
            { icon: 'megaphone-outline',        color: '#ec4899', bg: 'rgba(236,72,153,0.1)',  title: 'Promote Business',   desc: 'Advertise your local business to thousands of Nanded residents.', delay: 400 },
            { icon: 'chatbubbles-outline',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  title: 'In-app Messaging',   desc: 'Chat securely with employers, landlords, or buyers within the app.', delay: 480 },
            { icon: 'notifications-outline',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  title: 'Smart Alerts',       desc: 'Get notified instantly when new jobs match your saved search filters.', delay: 560 },
          ].map((f, i) => (
            <React.Fragment key={i}>
              <FeatureTile {...f} />
              {i < 7 && <View style={{ height: 1, backgroundColor: BORDER, marginLeft: 68 }} />}
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* ── Our Story / Timeline ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Our Story</Text>
        <View style={styles.storyCard}>
          <Text style={styles.storyIntro}>
            CityPlus was born from a simple frustration — job seekers in Nanded were scrolling through national portals and finding zero local listings. Meanwhile, local employers had no affordable, trusted way to reach nearby talent.
          </Text>
          <Text style={styles.storyIntro}>
            We built CityPlus to solve that mismatch — a single trusted platform for jobs, rooms, vehicles, and classified ads, built specifically for Nanded.
          </Text>

          <View style={styles.timeline}>
            {[
              { year: '2026', label: 'CityPlus founded — built for Nanded, by Nanded locals' },
              { year: 'Now 🚀', label: "Officially launched! Join us as we grow Nanded's local marketplace together" },
            ].map((t, i, arr) => (
              <TimelineItem key={i} year={t.year} label={t.label} isLast={i === arr.length - 1} />
            ))}
          </View>
        </View>
      </View>

      {/* ── Team ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Built With ❤️ In Nanded</Text>
        <View style={styles.teamCard}>
          <Text style={styles.teamIntro}>
            CityPlus is a small, passionate team based in Nanded, Maharashtra. We believe the best local app for Nanded should be built by people who live here and understand the city's unique needs.
          </Text>
          <View style={styles.teamHighlight}>
            <Ionicons name="people-outline" size={20} color={ORANGE} style={{ marginRight: 10 }} />
            <Text style={styles.teamHighlightTxt}>5-person team · 100% bootstrapped · No VC funding</Text>
          </View>
          <View style={styles.teamHighlight}>
            <Ionicons name="code-slash-outline" size={20} color={ORANGE} style={{ marginRight: 10 }} />
            <Text style={styles.teamHighlightTxt}>Built with React Native, Expo, Node.js & PostgreSQL</Text>
          </View>
          <View style={[styles.teamHighlight, { borderBottomWidth: 0 }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color={ORANGE} style={{ marginRight: 10 }} />
            <Text style={styles.teamHighlightTxt}>User data never sold. No ads from third parties.</Text>
          </View>
        </View>
      </View>

      {/* ── Legal & Social ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal & Social</Text>
        <View style={styles.linkCard}>
          <LinkRow
            icon="lock-closed-outline"
            label="Privacy Policy"
            sub="How we collect and use your data"
            color="#0ea5e9"
            bg="rgba(14,165,233,0.1)"
            onPress={() => setLegalKey('privacy')}
          />
          <LinkRow
            icon="document-text-outline"
            label="Terms of Service"
            sub="Rules for using CityPlus"
            color="#6366f1"
            bg="rgba(99,102,241,0.1)"
            onPress={() => setLegalKey('terms')}
          />
          <LinkRow
            icon="newspaper-outline"
            label="Community Guidelines"
            sub="Keep CityPlus safe for everyone"
            color="#f59e0b"
            bg="rgba(245,158,11,0.1)"
            onPress={() => setLegalKey('guidelines')}
          />
          <LinkRow
            icon="logo-instagram"
            label="Instagram"
            sub="@thecityplus.in"
            color="#e1306c"
            bg="rgba(225,48,108,0.1)"
            onPress={() => openLink('https://instagram.com/thecityplus.in')}
          />
          <LinkRow
            icon="globe-outline"
            label="Website"
            sub="thecityplus.in"
            color={ORANGE}
            bg="#fff7ed"
            onPress={() => openLink('https://thecityplus.in')}
            isLast
          />
        </View>
      </View>

      {/* ── Footer ─── */}
      <View style={styles.footer}>
        <View style={[styles.logoWrap, { width: 40, height: 40, borderRadius: 12, marginBottom: 10 }]}>
          <Text style={[styles.logoText, { fontSize: 14 }]}>C+</Text>
        </View>
        <Text style={styles.footerAppName}>CityPlus v4.4.0</Text>
        <Text style={styles.footerSub}>© 2026 CityPlus Technologies. All rights reserved.</Text>
        <Text style={styles.footerSub}>Nanded, Maharashtra, India 🇮🇳</Text>
      </View>
    </ScrollView>
    <LegalModal visible={!!legalKey} contentKey={legalKey} onClose={() => setLegalKey(null)} />
  </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Hero
  hero: {
    backgroundColor: '#111',
    margin: 16,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText:    { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  heroTitle:   { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginBottom: 4 },
  heroTagline: { fontSize: 13, color: '#aaa', marginBottom: 14, letterSpacing: 0.3 },
  badgeRow:    { flexDirection: 'row', gap: 10 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(249,115,22,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.25)',
  },
  badgeTxt: { fontSize: 11, color: ORANGE, fontWeight: '600' },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
    overflow: 'hidden',
  },
  statItem:  { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statNum:   { fontSize: 18, fontWeight: '900', color: ORANGE, letterSpacing: -0.5, marginBottom: 2 },
  statLabel: { fontSize: 9, color: MUTED, fontWeight: '600', textAlign: 'center', lineHeight: 12 },

  // Mission
  missionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: SURFACE,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  missionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  missionHeading: { fontSize: 14, fontWeight: '800', color: TEXT, marginBottom: 6 },
  missionText:    { fontSize: 13, color: MUTED, lineHeight: 20 },

  // Sections
  section:      { marginHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: TEXT, letterSpacing: 0.4, marginBottom: 12, textTransform: 'uppercase' },

  // Feature card
  featureCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  featureTile:  { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  featureIcon:  { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureTitle: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 2 },
  featureDesc:  { fontSize: 12, color: MUTED, lineHeight: 17 },

  // Story / Timeline
  storyCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },
  storyIntro: { fontSize: 13, color: MUTED, lineHeight: 20, marginBottom: 12 },
  timeline:   { marginTop: 8 },
  timelineItem:  { flexDirection: 'row', gap: 12, marginBottom: 4 },
  timelineLeft:  { alignItems: 'center', width: 18 },
  timelineDot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: ORANGE, marginTop: 4, flexShrink: 0 },
  timelineLine:  { width: 2, flex: 1, backgroundColor: '#f0e8e0', marginTop: 4, marginBottom: -4 },
  timelineRight: { flex: 1, paddingBottom: 16 },
  timelineYear:  { fontSize: 11, fontWeight: '800', color: ORANGE, letterSpacing: 0.3, marginBottom: 2 },
  timelineLabel: { fontSize: 13, color: MUTED, lineHeight: 18 },

  // Team
  teamCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },
  teamIntro: { fontSize: 13, color: MUTED, lineHeight: 20, marginBottom: 16 },
  teamHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  teamHighlightTxt: { fontSize: 13, color: TEXT, fontWeight: '500', flex: 1, lineHeight: 18 },

  // Legal links
  linkCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  linkIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  linkLabel: { fontSize: 14, fontWeight: '600', color: TEXT, marginBottom: 1 },
  linkSub:   { fontSize: 11, color: MUTED },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  footerAppName: { fontSize: 15, fontWeight: '800', color: TEXT, marginBottom: 4 },
  footerSub:     { fontSize: 11, color: MUTED, marginBottom: 2, letterSpacing: 0.2 },
});
