/**
 * MonthlyPlanBanner.js
 * ────────────────────────────────────────────────────────────────
 * Promotional banner for the ₹299/month unlimited-free-posts plan.
 * Shows in Jobs, Rooms, Cars, Buy-Sell screens at the top.
 *
 * Usage:
 *   import MonthlyPlanBanner from '../components/MonthlyPlanBanner';
 *   <MonthlyPlanBanner navigation={navigation} />
 *
 * Props:
 *   navigation  — React Navigation object (required)
 *   compact     — boolean, shows a smaller inline version (optional)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

const ORANGE  = '#f97316';
const GOLD    = '#f59e0b';
const DARK    = '#1a1a1a';
const PLAN_PRICE = 299;

// ─── Helper: check if user has active monthly plan ────────────────────────────
export async function checkMonthlyPlan(token) {
  try {
    const API = process.env.EXPO_PUBLIC_API_URL || 'https://thecityplus.in';
    const res = await fetch(`${API}/api/payments/monthly-plan/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.active === true;
  } catch {
    return false;
  }
}

// ─── Hook: cached monthly plan status ────────────────────────────────────────
export function useMonthlyPlan() {
  const { token } = useAuth();
  const [active, setActive]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    (async () => {
      // Fast: read from cache
      try {
        const cached = await AsyncStorage.getItem('monthly_plan_active');
        if (cached === 'true') setActive(true);
      } catch {}

      // Fresh: verify from server
      try {
        const API = process.env.EXPO_PUBLIC_API_URL || 'https://thecityplus.in';
        const res  = await fetch(`${API}/api/payments/monthly-plan/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const isActive = data.active === true;
        setActive(isActive);
        await AsyncStorage.setItem('monthly_plan_active', isActive ? 'true' : 'false');
      } catch {}

      setLoading(false);
    })();
  }, [token]);

  return { active, loading };
}

// ─── Main Banner ─────────────────────────────────────────────────────────────
export default function MonthlyPlanBanner({ navigation, compact = false }) {
  const { active, loading } = useMonthlyPlan();
  const shimmer = useRef(new Animated.Value(0)).current;
  const pulse   = useRef(new Animated.Value(1)).current;

  // Shimmer animation on the badge
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1200, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(shimmer, { toValue: 0, duration: 1200, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, []);

  if (loading) return null;

  // ── Active plan: show a compact green badge ───────────────────────────────
  if (active) {
    return (
      <View style={s.activeBadge}>
        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
        <Text style={s.activeTxt}>Monthly Plan Active — All Posts Free</Text>
      </View>
    );
  }

  // ── Compact inline version ────────────────────────────────────────────────
  if (compact) {
    return (
      <TouchableOpacity
        style={s.compact}
        onPress={() => navigation?.navigate('MonthlyPlan')}
        activeOpacity={0.85}
      >
        <Ionicons name="flash" size={15} color={GOLD} />
        <Text style={s.compactTxt}>
          Post <Text style={{ color: GOLD, fontWeight: '800' }}>unlimited FREE</Text> with Monthly Plan
          <Text style={s.compactPrice}>  ₹{PLAN_PRICE}/month</Text>
        </Text>
        <Ionicons name="chevron-forward" size={13} color={ORANGE} />
      </TouchableOpacity>
    );
  }

  // ── Full promo banner ─────────────────────────────────────────────────────
  return (
    <TouchableOpacity
      style={s.banner}
      onPress={() => navigation?.navigate('MonthlyPlan')}
      activeOpacity={0.88}
    >
      {/* Background stripes */}
      <View style={[s.stripe, { top: 0,  right: 40, opacity: 0.12 }]} />
      <View style={[s.stripe, { top: 20, right: 70, opacity: 0.08 }]} />
      <View style={[s.stripe, { top: 10, right: 10, opacity: 0.10 }]} />

      {/* Left content */}
      <View style={s.left}>
        {/* Tag */}
        <View style={s.tagRow}>
          <View style={s.arrowHead} />
          <View style={s.tagBody}>
            <Text style={s.tagTxt}>MONTHLY PLAN</Text>
          </View>
        </View>

        <Text style={s.headline}>Post Everything{'\n'}Absolutely <Text style={{ color: GOLD }}>FREE!</Text></Text>
        <Text style={s.sub}>Jobs · Rooms · Cars · Buy-Sell</Text>

        <Animated.View style={[s.cta, { transform: [{ scale: pulse }] }]}>
          <Text style={s.ctaTxt}>⚡ GET PLAN — ₹{PLAN_PRICE}/mo</Text>
        </Animated.View>
      </View>

      {/* Right avatar area */}
      <View style={s.right}>
        <Animated.View style={[s.circle, {
          opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }),
        }]}>
          <Text style={s.circleEmoji}>🚀</Text>
        </Animated.View>

        <View style={s.priceBadge}>
          <Text style={s.priceTop}>₹{PLAN_PRICE}</Text>
          <Text style={s.priceBot}>/month</Text>
        </View>

        <View style={s.featureList}>
          {['✓ Unlimited posts', '✓ All categories', '✓ 30 days'].map(f => (
            <Text key={f} style={s.featureTxt}>{f}</Text>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Full banner
  banner: {
    flexDirection: 'row',
    backgroundColor: DARK,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: ORANGE + '55',
    overflow: 'hidden',
    marginHorizontal: 12,
    marginVertical: 8,
    minHeight: 155,
    elevation: 5,
    shadowColor: ORANGE,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  stripe: {
    position: 'absolute',
    width: 2.5,
    height: '150%',
    backgroundColor: ORANGE,
    transform: [{ rotate: '15deg' }],
  },
  left: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'center',
    gap: 4,
  },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  arrowHead: {
    width: 0, height: 0,
    borderTopWidth: 9, borderBottomWidth: 9, borderRightWidth: 10,
    borderTopColor: 'transparent', borderBottomColor: 'transparent',
    borderRightColor: ORANGE,
  },
  tagBody: {
    backgroundColor: ORANGE,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },
  tagTxt:    { fontSize: 8, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  headline:  { fontSize: 20, fontWeight: '900', color: '#fff', lineHeight: 26 },
  sub:       { fontSize: 11, color: '#aaa', fontWeight: '500', marginTop: 1 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: ORANGE,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
  },
  ctaTxt:    { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },

  // Right panel
  right: {
    width: 105,
    backgroundColor: '#2a1500',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    overflow: 'hidden',
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: ORANGE,
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  circleEmoji: { fontSize: 26 },
  priceBadge: {
    backgroundColor: GOLD,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
  },
  priceTop: { fontSize: 15, fontWeight: '900', color: DARK },
  priceBot: { fontSize: 9,  fontWeight: '700', color: DARK },
  featureList: { gap: 2, alignItems: 'center' },
  featureTxt:  { fontSize: 9, color: '#ccc', fontWeight: '600' },

  // Compact inline
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff8f0',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ORANGE + '44',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  compactTxt:   { flex: 1, fontSize: 12, color: '#444', fontWeight: '500' },
  compactPrice: { color: ORANGE, fontWeight: '800', fontSize: 12 },

  // Active badge
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6ee7b7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  activeTxt: { fontSize: 12, color: '#065f46', fontWeight: '700' },
});
