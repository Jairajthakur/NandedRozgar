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

import React, { useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Easing, Linking, Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

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
        Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true, delay }),
        Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
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
      Animated.timing(fade,  { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 400, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
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

  useEffect(() => {
    // Entrance
    Animated.parallel([
      Animated.timing(heroAnim, {
        toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1, tension: 70, friction: 10, useNativeDriver: true,
      }),
    ]).start(() => {
      // Subtle pulse on logo
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoPulse, { toValue: 1.05, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(logoPulse, { toValue: 1,    duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  const heroTranslate = heroAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] });

  function openLink(url) {
    Linking.openURL(url).catch(() =>
      Alert.alert('Could not open link', 'Please try again later.')
    );
  }

  return (
    <ScrollView
      style={styles.root}
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
          { value: 12000, suffix: '+', label: 'Registered Users' },
          { value: 3500,  suffix: '+', label: 'Jobs Posted' },
          { value: 850,   suffix: '+', label: 'Rooms Listed' },
          { value: 4,     suffix: '.8★', label: 'App Rating' },
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
            { icon: 'sparkles-outline',         color: ORANGE,    bg: '#fff7ed',               title: 'AI Job Match',       desc: 'Our AI assistant helps you craft resumes and find best-fit jobs instantly.', delay: 320 },
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
            We built CityPlus to solve that mismatch. Starting as a simple job board, we've grown into Nanded's most comprehensive local marketplace — covering jobs, rooms, vehicles, and classified ads.
          </Text>

          <View style={styles.timeline}>
            {[
              { year: '2023', label: 'Founded as NandedRozgar — a simple WhatsApp-based job-sharing group' },
              { year: 'Early 2024', label: 'Launched as a web app with 50 employers and 500 job seekers in the first month' },
              { year: 'Mid 2024', label: 'Added Rooms, Vehicles, and Buy & Sell sections. Crossed 5,000 users' },
              { year: 'Late 2024', label: 'Launched AI Job Match assistant. Crossed ₹1 lakh in promoted listings revenue' },
              { year: '2025', label: 'Rebranded to CityPlus. Native Android app launched. 12,000+ registered users' },
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
            onPress={() => openLink('https://cityplus.in/privacy')}
          />
          <LinkRow
            icon="document-text-outline"
            label="Terms of Service"
            sub="Rules for using CityPlus"
            color="#6366f1"
            bg="rgba(99,102,241,0.1)"
            onPress={() => openLink('https://cityplus.in/terms')}
          />
          <LinkRow
            icon="newspaper-outline"
            label="Community Guidelines"
            sub="Keep CityPlus safe for everyone"
            color="#f59e0b"
            bg="rgba(245,158,11,0.1)"
            onPress={() => openLink('https://cityplus.in/guidelines')}
          />
          <LinkRow
            icon="logo-instagram"
            label="Instagram"
            sub="@cityplus.nanded"
            color="#e1306c"
            bg="rgba(225,48,108,0.1)"
            onPress={() => openLink('https://instagram.com/cityplus.nanded')}
          />
          <LinkRow
            icon="logo-whatsapp"
            label="WhatsApp Community"
            sub="Join 2,000+ locals"
            color="#25d366"
            bg="rgba(37,211,102,0.1)"
            onPress={() => Linking.openURL(`https://wa.me/${SUPPORT_PHONE}`)}
          />
          <LinkRow
            icon="globe-outline"
            label="Website"
            sub="cityplus.in"
            color={ORANGE}
            bg="#fff7ed"
            onPress={() => openLink('https://cityplus.in')}
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
        <Text style={styles.footerSub}>© 2025 CityPlus Technologies. All rights reserved.</Text>
        <Text style={styles.footerSub}>Nanded, Maharashtra, India 🇮🇳</Text>
      </View>
    </ScrollView>
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
