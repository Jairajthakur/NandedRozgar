/**
 * PromoBanner.js — Rich promotional banner
 * Shown on Jobs, Rooms, Cars, BuySell screens.
 *
 * Shows a live promotion from GET /api/promotions/active when available.
 * Falls back to rotating dummy ads so the banner is never empty.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, Linking, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { http } from '../utils/api';

const IS_WEB = Platform.OS === 'web';

// ─── Dummy ads shown when no real promotion is active ─────────────────────────
const DUMMY_ADS = [
  {
    id:          'dummy_1',
    bizName:     'Sharma Electronics',
    tagline:     '20% Off on all TVs & ACs this week!',
    phone:       '9876543210',
    category:    'Retail / Shop',
    location:    'Nanded City',
    bannerStyle: 'bold',
    accentColor: '#e82828',
    isDummy:     true,
  },
  {
    id:          'dummy_2',
    bizName:     'Priya Beauty Salon',
    tagline:     'Bridal packages starting ₹1,999 only',
    phone:       '8765432109',
    category:    'Salon / Beauty',
    location:    'Vazirabad',
    bannerStyle: 'clean',
    accentColor: '#f97316',
    isDummy:     true,
  },
  {
    id:          'dummy_3',
    bizName:     'Nanded Properties',
    tagline:     'Flats & Plots — Book your dream home today',
    phone:       '7654321098',
    category:    'Real Estate',
    location:    'Cidco',
    bannerStyle: 'vivid',
    accentColor: '#1a1a1a',
    isDummy:     true,
  },
];

// ─── Theme configs per bannerStyle ───────────────────────────────────────────
const THEMES = {
  bold: {
    bg:       '#1a1a1a',
    accent:   '#e82828',
    textPri:  '#ffffff',
    textSec:  'rgba(255,255,255,0.60)',
    ctaBg:    '#e82828',
    ctaTxt:   '#ffffff',
    badgeBg:  '#e82828',
    badgeTxt: '#ffffff',
    stripeBg: 'rgba(232,40,40,0.18)',
    logoBg:   '#e82828',
    border:   'transparent',
  },
  clean: {
    bg:       '#ffffff',
    accent:   '#f97316',
    textPri:  '#111111',
    textSec:  '#777777',
    ctaBg:    '#f97316',
    ctaTxt:   '#ffffff',
    badgeBg:  '#f97316',
    badgeTxt: '#ffffff',
    stripeBg: 'rgba(249,115,22,0.07)',
    logoBg:   '#111111',
    border:   '#f0e0d0',
  },
  vivid: {
    bg:       '#f97316',
    accent:   '#1a1a1a',
    textPri:  '#ffffff',
    textSec:  'rgba(255,255,255,0.78)',
    ctaBg:    '#1a1a1a',
    ctaTxt:   '#f97316',
    badgeBg:  '#1a1a1a',
    badgeTxt: '#f97316',
    stripeBg: 'rgba(0,0,0,0.11)',
    logoBg:   'rgba(0,0,0,0.30)',
    border:   'transparent',
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function Bolt({ size = 16, color = '#fff', style }) {
  return (
    <View style={[{ opacity: 0.30 }, style]} pointerEvents="none">
      <Ionicons name="flash" size={size} color={color} />
    </View>
  );
}

function OfferBadge({ label, bg, txt }) {
  return (
    <View style={[s.badgeWrap, { backgroundColor: bg }]}>
      <View style={[s.badgeInner, { backgroundColor: bg, transform: [{ rotate: '22deg' }] }]} />
      <View style={s.badgeContent} pointerEvents="none">
        <Text style={[s.badgeLabel, { color: txt }]} numberOfLines={3}>{label}</Text>
      </View>
    </View>
  );
}

function LogoCircle({ bizName, bg, accentColor }) {
  const letter = bizName ? bizName[0].toUpperCase() : '?';
  return (
    <View style={[s.logoOuter, { borderColor: accentColor + '55' }]}>
      <View style={[s.logoInner, { backgroundColor: bg }]}>
        <Text style={s.logoLetter}>{letter}</Text>
        <View style={[s.logoIconBadge, { backgroundColor: accentColor }]}>
          <Ionicons name="storefront-outline" size={8} color="#fff" />
        </View>
      </View>
    </View>
  );
}

function PulseDot({ color }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.9, duration: 750, useNativeDriver: !IS_WEB, easing: Easing.out(Easing.ease) }),
        Animated.timing(scale, { toValue: 1,   duration: 750, useNativeDriver: !IS_WEB, easing: Easing.in(Easing.ease) }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, transform: [{ scale }] }} />
  );
}

// ─── Dot indicators ───────────────────────────────────────────────────────────
function DotRow({ total, active, accentColor }) {
  return (
    <View style={s.dotRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            s.dot,
            i === active
              ? { backgroundColor: accentColor, width: 16 }
              : { backgroundColor: accentColor + '40', width: 6 },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Single banner card ───────────────────────────────────────────────────────
function BannerCard({ promo, onCall }) {
  const theme  = THEMES[promo.bannerStyle] || THEMES.bold;
  const offer  = promo.tagline || 'Exclusive Offer';

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onCall}>
      <View style={[
        s.card,
        { backgroundColor: theme.bg },
        theme.border !== 'transparent' && { borderWidth: 1.5, borderColor: theme.border },
      ]}>
        {/* Diagonal stripe decorations */}
        <View style={[s.stripe,  { backgroundColor: theme.stripeBg }]} pointerEvents="none" />
        <View style={[s.stripe2, { backgroundColor: theme.stripeBg }]} pointerEvents="none" />

        {/* Lightning bolts */}
        <Bolt size={28} color={theme.accent} style={s.boltTL} />
        <Bolt size={18} color={theme.textPri} style={s.boltBR} />

        {/* ── Left ── */}
        <View style={s.left}>
          {/* Category chip */}
          <View style={[s.chip, { backgroundColor: theme.accent + '28', borderColor: theme.accent + '55' }]}>
            <Text style={[s.chipTxt, { color: theme.accent }]}>{promo.category || 'Business'}</Text>
          </View>

          {/* Business name */}
          <Text style={[s.headline, { color: theme.textPri }]} numberOfLines={2}>
            {promo.bizName}
          </Text>

          {/* Tagline */}
          <Text style={[s.tagline, { color: theme.accent }]} numberOfLines={2}>
            {offer}
          </Text>

          {/* Location */}
          <View style={s.locationRow}>
            <Ionicons name="location-sharp" size={11} color={theme.textSec} />
            <Text style={[s.locationTxt, { color: theme.textSec }]} numberOfLines={1}>
              {promo.location}
            </Text>
          </View>

          {/* CTA button */}
          <TouchableOpacity
            style={[s.ctaBtn, { backgroundColor: theme.ctaBg }]}
            onPress={onCall}
            activeOpacity={0.82}
          >
            <Ionicons name="call-outline" size={13} color={theme.ctaTxt} />
            <Text style={[s.ctaTxt, { color: theme.ctaTxt }]}>CALL NOW</Text>
          </TouchableOpacity>

          {/* Phone */}
          <Text style={[s.phoneTxt, { color: theme.textSec }]}>{promo.phone}</Text>
        </View>

        {/* ── Right ── */}
        <View style={s.right}>
          <LogoCircle bizName={promo.bizName} bg={theme.logoBg} accentColor={theme.accent} />
          <OfferBadge
            label={offer.length > 16 ? offer.slice(0, 16) + '…' : offer}
            bg={theme.badgeBg}
            txt={theme.badgeTxt}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────
export default function PromoBanner({ style: propStyle }) {
  const nav              = useNavigation();
  const fadeO            = useRef(new Animated.Value(0)).current;
  const slideY           = useRef(new Animated.Value(16)).current;

  const [promos,  setPromos]  = useState([]);   // live promos from API + dummies
  const [current, setCurrent] = useState(0);    // index of displayed ad
  const [ready,   setReady]   = useState(false);

  // ── Fetch live promos; merge with dummies ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await http('GET', '/api/promotions/active');
        if (!cancelled) {
          const live = (res.ok && res.promotion) ? [res.promotion] : [];
          // Live promos first, then fill up to 3 slots with dummies
          const needed = Math.max(0, 3 - live.length);
          setPromos([...live, ...DUMMY_ADS.slice(0, needed)]);
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setPromos(DUMMY_ADS);
          setReady(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Animate in on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    Animated.parallel([
      Animated.timing(fadeO,  { toValue: 1, duration: 450, delay: 80, useNativeDriver: !IS_WEB, easing: Easing.out(Easing.ease) }),
      Animated.timing(slideY, { toValue: 0, duration: 400, delay: 80, useNativeDriver: !IS_WEB, easing: Easing.out(Easing.back(1.1)) }),
    ]).start();
  }, [ready]);

  // ── Auto-rotate every 5 seconds ───────────────────────────────────────────
  useEffect(() => {
    if (promos.length < 2) return;
    const id = setInterval(() => {
      setCurrent(prev => (prev + 1) % promos.length);
    }, 5000);
    return () => clearInterval(id);
  }, [promos]);

  if (!ready || promos.length === 0) return null;

  const promo = promos[current];
  const theme = THEMES[promo.bannerStyle] || THEMES.bold;

  const handleCall = () => {
    if (promo.phone && !promo.isDummy) Linking.openURL(`tel:${promo.phone}`);
  };

  return (
    <Animated.View style={[s.wrap, propStyle, { opacity: fadeO, transform: [{ translateY: slideY }] }]}>

      {/* ── Top row ── */}
      <View style={s.topRow}>
        <View style={[s.sponsoredTag, { borderColor: theme.accent + '35' }]}>
          <PulseDot color={theme.accent} />
          <Text style={[s.sponsoredTxt, { color: theme.accent }]}>Sponsored</Text>
        </View>
        <TouchableOpacity
          onPress={() => nav.navigate('PromoteBusiness')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={s.advertiseLink}>Advertise here →</Text>
        </TouchableOpacity>
      </View>

      {/* ── Banner ── */}
      <BannerCard promo={promo} onCall={handleCall} />

      {/* ── Dot indicators + nav arrows ── */}
      {promos.length > 1 && (
        <View style={s.navRow}>
          <TouchableOpacity
            onPress={() => setCurrent(prev => (prev - 1 + promos.length) % promos.length)}
            style={s.navBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={14} color="#bbb" />
          </TouchableOpacity>

          <DotRow total={promos.length} active={current} accentColor={theme.accent} />

          <TouchableOpacity
            onPress={() => setCurrent(prev => (prev + 1) % promos.length)}
            style={s.navBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={14} color="#bbb" />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  wrap: { marginHorizontal: 12, marginBottom: 12, marginTop: 4 },

  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 7, paddingHorizontal: 2,
  },
  sponsoredTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 20,
    paddingVertical: 3, paddingHorizontal: 9, borderWidth: 1,
  },
  sponsoredTxt:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  advertiseLink: { fontSize: 10, fontWeight: '700', color: '#aaa', textDecorationLine: 'underline' },

  card: {
    borderRadius: 20, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center',
    minHeight: 170, paddingHorizontal: 18, paddingVertical: 18, gap: 14,
    shadowColor: '#000', shadowOpacity: 0.13, shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
  stripe:  { position: 'absolute', top: -60, right: 80,  width: 130, height: 300, transform: [{ rotate: '22deg' }] },
  stripe2: { position: 'absolute', top: -40, right: 28,  width: 55,  height: 260, transform: [{ rotate: '22deg' }] },
  boltTL:  { position: 'absolute', top: 10,  left: 12 },
  boltBR:  { position: 'absolute', bottom: 8, right: 8  },

  left:    { flex: 1, gap: 5, zIndex: 1 },
  chip:    { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, marginBottom: 2 },
  chipTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },

  headline:    { fontSize: 21, fontWeight: '900', letterSpacing: -0.4, lineHeight: 25 },
  tagline:     { fontSize: 12, fontWeight: '700', letterSpacing: 0.1, lineHeight: 16 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  locationTxt: { fontSize: 10, fontWeight: '500' },

  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 25, marginTop: 5,
  },
  ctaTxt:   { fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  phoneTxt: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3, marginTop: 2 },

  right: { width: 108, alignItems: 'center', gap: 10, zIndex: 1 },

  logoOuter: { width: 82, height: 82, borderRadius: 41, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  logoInner: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  logoLetter: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  logoIconBadge: { position: 'absolute', bottom: 2, right: 2, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },

  badgeWrap:    { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  badgeInner:   { position: 'absolute', width: 68, height: 68, borderRadius: 6, opacity: 0.45 },
  badgeContent: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: 68, height: 68, padding: 5 },
  badgeLabel:   { fontSize: 9, fontWeight: '900', textAlign: 'center', letterSpacing: 0.2, lineHeight: 12 },

  // Nav row
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 },
  navBtn: { padding: 4 },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot:    { height: 6, borderRadius: 3 },
});
