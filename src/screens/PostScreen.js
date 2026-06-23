/**
 * PostScreen.js — "What do you want to post?" selection screen
 *
 * ✅ Web  (sticky topBar, centred max-width card grid, hover states)
 * ✅ Mobile / APK  (SafeArea, StatusBar, back button, spring animations)
 *
 * Place at:  src/screens/PostScreen.js
 * No new packages required — uses only deps already in this project.
 */

import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Animated, Easing, StatusBar,
  Platform, useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MonthlyPlanBanner from '../components/MonthlyPlanBanner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const ORANGE  = '#f97316';
const IS_WEB  = Platform.OS === 'web';

// ─────────────────────────────────────────────────────────────────────────────
// Card definitions
// ─────────────────────────────────────────────────────────────────────────────
const CARDS = [
  {
    id: 'job',
    title: 'Post a Job',
    desc: 'Hire staff, workers, delivery partners',
    icon: 'briefcase-outline',
    iconColor: '#f97316',
    iconBg: '#fff7ed',
    accent: '#f97316',
    cardBg: '#fffcf9',
    badge: { label: '🔥 HOT', bg: '#fff3e8', border: '#ffd8aa', color: '#c2410c' },
    route: 'PostJob',
  },
  {
    id: 'room',
    title: 'List a Room / PG',
    desc: 'Find tenants for your flat or hostel',
    icon: 'home-outline',
    iconColor: '#16a34a',
    iconBg: '#f0fdf4',
    accent: '#22c55e',
    cardBg: '#f8fef9',
    badge: { label: '34 listed', bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
    route: 'PostRoom',
  },
  {
    id: 'car',
    title: 'Rent your Vehicle',
    desc: 'List your car, bike or auto',
    icon: 'car-sport-outline',
    iconColor: '#2563eb',
    iconBg: '#eff6ff',
    accent: '#3b82f6',
    cardBg: '#f7faff',
    route: 'PostCar',
  },
  {
    id: 'sell',
    title: 'Sell an Item',
    desc: 'Sell electronics, furniture, books',
    icon: 'pricetag-outline',
    iconColor: '#9333ea',
    iconBg: '#faf5ff',
    accent: '#a855f7',
    cardBg: '#fdfaff',
    route: 'PostItem',
  },
  {
    id: 'promote',
    title: 'Promote Business',
    desc: 'Advertise your shop, clinic or service',
    icon: 'megaphone-outline',
    iconColor: '#db2777',
    iconBg: '#fdf2f8',
    accent: '#ec4899',
    cardBg: '#fffafd',
    badge: { label: '✨ NEW', bg: '#fdf2f8', border: '#fbcfe8', color: '#be185d' },
    route: 'PromoteBusiness',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LiveDot — pulsing green / orange indicator
// ─────────────────────────────────────────────────────────────────────────────
function LiveDot({ color = '#22c55e' }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.9, duration: 650,
          easing: Easing.out(Easing.ease), useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(scale, {
          toValue: 1, duration: 650,
          easing: Easing.in(Easing.ease), useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{
      width: 7, height: 7, borderRadius: 4,
      backgroundColor: color, transform: [{ scale }],
    }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ActionCard — individual post-type tile
// ─────────────────────────────────────────────────────────────────────────────
function ActionCard({ card, index, onPress, isWeb }) {
  const animY  = useRef(new Animated.Value(26)).current;
  const animO  = useRef(new Animated.Value(0)).current;
  const pressS = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animY, {
        toValue: 0, duration: 460,
        delay: 220 + index * 75,
        easing: Easing.out(Easing.back(1.3)), useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(animO, {
        toValue: 1, duration: 380,
        delay: 220 + index * 75,
        easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, []);

  const onPressIn  = () =>
    Animated.spring(pressS, { toValue: 0.96, useNativeDriver: Platform.OS !== 'web', speed: 35, bounciness: 0 }).start();
  const onPressOut = () =>
    Animated.spring(pressS, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 22, bounciness: 8 }).start();

  return (
    <Animated.View style={[
      isWeb && s.webCardWrap,
      { opacity: animO, transform: [{ translateY: animY }, { scale: pressS }] },
    ]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => onPress(card.route)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[s.card, { backgroundColor: card.cardBg }, isWeb && s.cardWeb]}
      >
        {/* Left accent stripe */}
        <View style={[s.accentBar, { backgroundColor: card.accent }]} />

        {/* Icon */}
        <View style={[s.iconWrap, { backgroundColor: card.iconBg }]}>
          <Ionicons name={card.icon} size={24} color={card.iconColor} />
        </View>

        {/* Text */}
        <View style={s.cardText}>
          <Text style={s.cardTitle}>{card.title}</Text>
          <Text style={s.cardDesc}>{card.desc}</Text>
        </View>

        {/* Chevron */}
        <View style={s.chevronWrap}>
          <Ionicons name="chevron-forward" size={15} color="#bbb" />
        </View>

        {/* Badge (optional) */}
        {card.badge && (
          <View style={[s.badge, {
            backgroundColor: card.badge.bg,
            borderColor: card.badge.border,
          }]}>
            <Text style={[s.badgeTxt, { color: card.badge.color }]}>
              {card.badge.label}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function PostScreen() {
  const nav         = useNavigation();
  const insets      = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();

  // On web, use a two-column grid when there's enough room
  const webTwoCol = IS_WEB && winW >= 680;

  // Header entrance animation
  const headerO = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerO, {
        toValue: 1, duration: 420, delay: 60,
        easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(headerY, {
        toValue: 0, duration: 420, delay: 60,
        easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, []);

  const handleBack = () => {
    if (nav.canGoBack()) nav.goBack();
    else nav.navigate('Home');
  };

  const handleNavigate = (route) => nav.navigate(route);

  // ── Shared header block ────────────────────────────────────────────────────
  const HeaderContent = (
    <Animated.View style={[
      IS_WEB ? ws.headerCard : s.header,
      { opacity: headerO, transform: [{ translateY: headerY }] },
    ]}>
      {/* Decorative circles */}
      <View style={s.deco1} pointerEvents="none" />
      <View style={s.deco2} pointerEvents="none" />

      <Text style={IS_WEB ? ws.eyebrow : s.eyebrow}>
        NANDED  ·  REACH 10,000+
      </Text>
      <Text style={IS_WEB ? ws.headline : s.headline}>
        What do you want{'\n'}to{' '}
        <Text style={s.accent}>post?</Text>
      </Text>
      <Text style={IS_WEB ? ws.subText : s.subText}>
        Hire, rent, list or sell — reach your city in minutes.
      </Text>

      {/* Stats pills */}
      <View style={s.pillsRow}>
        <View style={[s.pill, s.pillOrange]}>
          <LiveDot color={ORANGE} />
          <Text style={[s.pillTxt, { color: '#92400e' }]}>
            <Text style={[s.pillBold, { color: ORANGE }]}>247</Text>
            {'  '}posts today
          </Text>
        </View>
        <View style={[s.pill, s.pillGreen]}>
          <LiveDot color="#16a34a" />
          <Text style={[s.pillTxt, { color: '#166534' }]}>
            <Text style={[s.pillBold, { color: '#16a34a' }]}>12k+</Text>
            {'  '}active users
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // WEB LAYOUT
  // ─────────────────────────────────────────────────────────────────────────
  if (IS_WEB) {
    return (
      <View style={ws.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        {/* Sticky top bar */}
        <View style={ws.topBar}>
          <TouchableOpacity
            onPress={handleBack}
            style={ws.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={19} color="#111" />
          </TouchableOpacity>
          <Text style={ws.topBarTitle}>Post</Text>
        </View>

        {/* Centered content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[ws.body, { paddingBottom: 60 }]}
        >
          {/* Monthly Plan Banner — top of page */}
          <MonthlyPlanBanner navigation={nav} />

          {/* Header card */}
          {HeaderContent}

          {/* Card grid */}
          <View style={[ws.cardGrid, webTwoCol && ws.cardGridTwo]}>
            {CARDS.map((card, i) => (
              <ActionCard
                key={card.id}
                card={card}
                index={i}
                onPress={handleNavigate}
                isWeb
              />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MOBILE / APK LAYOUT
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Top bar with back button */}
      <View style={s.topBar}>
        <TouchableOpacity
          onPress={handleBack}
          style={s.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#111" />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>Post</Text>
        {/* Spacer so title stays centred */}
        <View style={s.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={s.scroll}
      >
        {/* Monthly Plan Banner — top of page */}
        <View style={s.bannerTop}>
          <MonthlyPlanBanner navigation={nav} />
        </View>

        {/* Header */}
        {HeaderContent}

        {/* Cards */}
        <View style={s.cards}>
          {CARDS.map((card, i) => (
            <ActionCard
              key={card.id}
              card={card}
              index={i}
              onPress={handleNavigate}
              isWeb={false}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({

  root:   { flex: 1, backgroundColor: '#f7f7f7' },
  scroll: { paddingBottom: 36 },
  bannerTop: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 },

  // ── Top bar ───────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1, borderColor: '#e8e8e8',
  },
  topBarTitle: {
    fontSize: 16, fontWeight: '800', color: '#111', letterSpacing: -0.2,
  },

  // ── Header block ──────────────────────────────────────────────
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    overflow: 'hidden',
    position: 'relative',
  },

  // Decorative bg circles (shared mobile + web)
  deco1: {
    position: 'absolute', top: -44, right: -44,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(249,115,22,.07)',
    pointerEvents: 'none',
  },
  deco2: {
    position: 'absolute', top: 16, right: 28,
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(249,115,22,.05)',
    pointerEvents: 'none',
  },

  eyebrow: {
    fontSize: 11, fontWeight: '700', color: ORANGE,
    letterSpacing: 1.5, marginBottom: 7,
  },
  headline: {
    fontSize: 26, fontWeight: '900', color: '#111',
    lineHeight: 32, letterSpacing: -0.4,
  },
  accent:   { color: ORANGE },
  subText:  { fontSize: 13, color: '#888', marginTop: 6, lineHeight: 18 },

  // Stat pills
  pillsRow: { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1, borderRadius: 30,
    paddingVertical: 5, paddingHorizontal: 12,
  },
  pillOrange: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  pillGreen:  { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  pillTxt:    { fontSize: 11, fontWeight: '500' },
  pillBold:   { fontWeight: '800' },

  // ── Cards ─────────────────────────────────────────────────────
  cards: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 11,
  },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ebebeb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingRight: 14,
    paddingLeft: 18,          // extra left so accent bar has room
    gap: 14,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  accentBar: {
    position: 'absolute', left: 0, top: 14, bottom: 14,
    width: 4, borderRadius: 2,
  },

  iconWrap: {
    width: 50, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  cardText: { flex: 1 },
  cardTitle: {
    fontSize: 15, fontWeight: '800', color: '#111', letterSpacing: -0.15,
  },
  cardDesc: {
    fontSize: 12, color: '#888', marginTop: 3, lineHeight: 16,
  },

  chevronWrap: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1.5, borderColor: '#ebebeb',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  badge: {
    position: 'absolute', top: 11, right: 50,
    borderWidth: 1, borderRadius: 20,
    paddingVertical: 2, paddingHorizontal: 8,
  },
  badgeTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },

  // Web card wrapper (used for 2-col grid flex item)
  webCardWrap: { flex: 1, minWidth: 260 },
  cardWeb: {
    // slightly larger padding for web
    paddingVertical: 20,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// WEB STYLES
// ─────────────────────────────────────────────────────────────────────────────
const ws = StyleSheet.create({

  root: { flex: 1, backgroundColor: '#f3f4f6' },

  // Sticky top nav bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    paddingVertical: 12, paddingHorizontal: 20,
    position: 'sticky', top: 0, zIndex: 100,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  topBarTitle: { fontSize: 15, fontWeight: '800', color: '#111' },

  // Scroll body — centred, max 720px
  body: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },

  // Header card (web — rounded card on bg)
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: '#ebebeb',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  eyebrow: {
    fontSize: 11, fontWeight: '700', color: ORANGE,
    letterSpacing: 1.5, marginBottom: 8,
  },
  headline: {
    fontSize: 30, fontWeight: '900', color: '#111',
    lineHeight: 36, letterSpacing: -0.5,
  },
  subText: { fontSize: 14, color: '#888', marginTop: 7, lineHeight: 20 },

  // Card grid
  cardGrid: {
    gap: 12,
  },
  // Two-column flex-wrap layout for wider web
  cardGridTwo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
