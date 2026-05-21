/**
 * PromoBanner.js — Rich promotional banner (redesigned)
 * Shown on Jobs, Rooms, Cars, BuySell screens.
 *
 * Fetches GET /api/promotions/active.
 * Falls back silently if no promotion is active.
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, Linking, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { http } from '../utils/api';

const IS_WEB = Platform.OS === 'web';

// ─── Theme configs per bannerStyle ───────────────────────────────────────────
const THEMES = {
  bold: {
    bg:        '#1a1a1a',
    accent:    '#e82828',
    textPri:   '#ffffff',
    textSec:   'rgba(255,255,255,0.65)',
    ctaBg:     '#e82828',
    ctaTxt:    '#ffffff',
    badgeBg:   '#e82828',
    badgeTxt:  '#ffffff',
    stripeBg:  'rgba(232,40,40,0.18)',
    logoBg:    '#e82828',
  },
  clean: {
    bg:        '#ffffff',
    accent:    '#f97316',
    textPri:   '#111111',
    textSec:   '#666666',
    ctaBg:     '#f97316',
    ctaTxt:    '#ffffff',
    badgeBg:   '#f97316',
    badgeTxt:  '#ffffff',
    stripeBg:  'rgba(249,115,22,0.08)',
    logoBg:    '#111111',
  },
  vivid: {
    bg:        '#f97316',
    accent:    '#1a1a1a',
    textPri:   '#ffffff',
    textSec:   'rgba(255,255,255,0.80)',
    ctaBg:     '#1a1a1a',
    ctaTxt:    '#f97316',
    badgeBg:   '#1a1a1a',
    badgeTxt:  '#f97316',
    stripeBg:  'rgba(0,0,0,0.12)',
    logoBg:    'rgba(0,0,0,0.25)',
  },
};

// ─── Decorative lightning bolt ────────────────────────────────────────────────
function Bolt({ size = 16, color = '#fff', style }) {
  return (
    <View style={[{ opacity: 0.35 }, style]} pointerEvents="none">
      <Ionicons name="flash" size={size} color={color} />
    </View>
  );
}

// ─── Offer badge (star-burst shape via overlapping rotated squares) ───────────
function OfferBadge({ label, bg, txt }) {
  return (
    <View style={[s.badgeWrap, { backgroundColor: bg }]}>
      {/* Rotated layer for starburst feel */}
      <View style={[s.badgeInner, { backgroundColor: bg, transform: [{ rotate: '22deg' }] }]} />
      <View style={s.badgeContent} pointerEvents="none">
        <Text style={[s.badgeLabel, { color: txt }]} numberOfLines={2}>{label}</Text>
      </View>
    </View>
  );
}

// ─── Circular logo placeholder ────────────────────────────────────────────────
function LogoCircle({ bizName, bg, accentColor }) {
  const letter = bizName ? bizName[0].toUpperCase() : '?';
  return (
    <View style={[s.logoOuter, { borderColor: accentColor + '55' }]}>
      <View style={[s.logoInner, { backgroundColor: bg }]}>
        <Text style={[s.logoLetter, { color: '#fff' }]}>{letter}</Text>
        <View style={[s.logoIconBadge, { backgroundColor: accentColor }]}>
          <Ionicons name="storefront-outline" size={8} color="#fff" />
        </View>
      </View>
    </View>
  );
}

// ─── Pulsing live dot ─────────────────────────────────────────────────────────
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
    <Animated.View style={{
      width: 6, height: 6, borderRadius: 3,
      backgroundColor: color, transform: [{ scale }],
    }} />
  );
}

// ─── Main Banner ──────────────────────────────────────────────────────────────
export default function PromoBanner({ style: propStyle }) {
  const nav   = useNavigation();
  const fadeO = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(16)).current;
  const [promo, setPromo] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await http('GET', '/api/promotions/active');
        if (!cancelled && res.ok && res.promotion) setPromo(res.promotion);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!promo) return;
    Animated.parallel([
      Animated.timing(fadeO,  { toValue: 1, duration: 450, delay: 80, useNativeDriver: !IS_WEB, easing: Easing.out(Easing.ease) }),
      Animated.timing(slideY, { toValue: 0, duration: 420, delay: 80, useNativeDriver: !IS_WEB, easing: Easing.out(Easing.back(1.1)) }),
    ]).start();
  }, [promo]);

  if (!promo) return null;

  const theme  = THEMES[promo.bannerStyle] || THEMES.bold;
  const offer  = promo.tagline || 'Exclusive Offer';
  const isBold = promo.bannerStyle !== 'clean';

  const handleCall = () => {
    if (promo.phone) Linking.openURL(`tel:${promo.phone}`);
  };

  return (
    <Animated.View style={[s.wrap, propStyle, { opacity: fadeO, transform: [{ translateY: slideY }] }]}>

      {/* ── Top label row ── */}
      <View style={s.topRow}>
        <View style={s.sponsoredTag}>
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

      {/* ── Main banner card ── */}
      <TouchableOpacity activeOpacity={0.9} onPress={handleCall}>
        <View style={[s.card, { backgroundColor: theme.bg }]}>

          {/* Decorative diagonal stripe overlay */}
          <View style={[s.stripe, { backgroundColor: theme.stripeBg }]} pointerEvents="none" />
          <View style={[s.stripe2, { backgroundColor: theme.stripeBg }]} pointerEvents="none" />

          {/* Decorative bolts */}
          <Bolt size={28} color={theme.accent} style={s.boltTL} />
          <Bolt size={20} color={theme.textPri} style={s.boltBR} />

          {/* ── Left column ── */}
          <View style={s.left}>

            {/* Category chip */}
            <View style={[s.chip, { backgroundColor: theme.accent + '28', borderColor: theme.accent + '55' }]}>
              <Text style={[s.chipTxt, { color: theme.accent }]}>{promo.category || 'Business'}</Text>
            </View>

            {/* Business name — large bold headline */}
            <Text style={[s.headline, { color: theme.textPri }]} numberOfLines={2}>
              {promo.bizName}
            </Text>

            {/* Tagline / offer */}
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
              onPress={handleCall}
              activeOpacity={0.82}
            >
              <Ionicons name="call-outline" size={13} color={theme.ctaTxt} />
              <Text style={[s.ctaTxt, { color: theme.ctaTxt }]}>CALL NOW</Text>
            </TouchableOpacity>

            {/* Phone number */}
            <Text style={[s.phoneTxt, { color: theme.textSec }]}>{promo.phone}</Text>
          </View>

          {/* ── Right column ── */}
          <View style={s.right}>

            {/* Logo circle */}
            <LogoCircle
              bizName={promo.bizName}
              bg={theme.logoBg}
              accentColor={theme.accent}
            />

            {/* Offer badge */}
            <OfferBadge
              label={offer.length > 14 ? offer.slice(0, 14) + '…' : offer}
              bg={theme.badgeBg}
              txt={theme.badgeTxt}
            />
          </View>

        </View>
      </TouchableOpacity>

    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({

  wrap: {
    marginHorizontal: 12,
    marginBottom: 12,
    marginTop: 4,
  },

  // Top row
  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 7, paddingHorizontal: 2,
  },
  sponsoredTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 20,
    paddingVertical: 3, paddingHorizontal: 9,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },
  sponsoredTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  advertiseLink: {
    fontSize: 10, fontWeight: '700', color: '#aaa', textDecorationLine: 'underline',
  },

  // Card
  card: {
    borderRadius: 20, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center',
    minHeight: 170, paddingHorizontal: 18, paddingVertical: 18, gap: 14,
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },

  // Decorative stripes
  stripe: {
    position: 'absolute', top: -60, right: 80,
    width: 140, height: 280,
    transform: [{ rotate: '22deg' }],
  },
  stripe2: {
    position: 'absolute', top: -40, right: 20,
    width: 60, height: 240,
    transform: [{ rotate: '22deg' }],
  },

  // Decorative bolts
  boltTL: { position: 'absolute', top: 10,  left: 10 },
  boltBR: { position: 'absolute', bottom: 8, right: 8 },

  // Left column
  left: { flex: 1, gap: 6, zIndex: 1 },

  chip: {
    alignSelf: 'flex-start',
    paddingVertical: 3, paddingHorizontal: 10,
    borderRadius: 20, borderWidth: 1,
    marginBottom: 2,
  },
  chipTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },

  headline: {
    fontSize: 22, fontWeight: '900',
    letterSpacing: -0.4, lineHeight: 26,
  },

  tagline: {
    fontSize: 13, fontWeight: '700',
    letterSpacing: 0.1, lineHeight: 17,
  },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  locationTxt: { fontSize: 10, fontWeight: '500' },

  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 25, marginTop: 4,
  },
  ctaTxt: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },

  phoneTxt: { fontSize: 10, fontWeight: '600', marginTop: 2, letterSpacing: 0.3 },

  // Right column
  right: { alignItems: 'center', gap: 10, zIndex: 1 },

  // Logo circle
  logoOuter: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  logoInner: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  logoLetter: {
    fontSize: 30, fontWeight: '900', letterSpacing: -1,
  },
  logoIconBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },

  // Offer badge
  badgeWrap: {
    width: 70, height: 70, borderRadius: 35,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  },
  badgeInner: {
    position: 'absolute', width: 70, height: 70,
    borderRadius: 6,
    opacity: 0.55,
  },
  badgeContent: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
    width: 70, height: 70, padding: 4,
  },
  badgeLabel: {
    fontSize: 10, fontWeight: '900', textAlign: 'center',
    letterSpacing: 0.2, lineHeight: 13,
  },
});
