/**
 * PromoBanner.js — Sponsored business promotion banner
 * Shown on all listing screens (Jobs, Rooms, Cars, BuySell)
 *
 * Fetches a live active promotion from GET /api/promotions/active.
 * Falls back silently if no promotion is active (renders nothing).
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { http } from '../utils/api';

const ORANGE = '#f97316';

function PulseDot({ color }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.8, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        Animated.timing(scale, { toValue: 1,   duration: 700, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
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

export default function PromoBanner({ style }) {
  const nav   = useNavigation();
  const fadeY = useRef(new Animated.Value(12)).current;
  const fadeO = useRef(new Animated.Value(0)).current;
  const [promo, setPromo] = useState(null);

  // Fetch an active promotion on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await http('GET', '/api/promotions/active');
        if (!cancelled && res.ok && res.promotion) {
          setPromo(res.promotion);
        }
      } catch {
        // Silently fail — no banner if API unreachable
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Animate in once promo loads
  useEffect(() => {
    if (!promo) return;
    Animated.parallel([
      Animated.timing(fadeY, { toValue: 0, duration: 420, delay: 120, useNativeDriver: true, easing: Easing.out(Easing.back(1.2)) }),
      Animated.timing(fadeO, { toValue: 1, duration: 350, delay: 120, useNativeDriver: true }),
    ]).start();
  }, [promo]);

  // Render nothing if no active promotion
  if (!promo) return null;

  const color = promo.accentColor || ORANGE;

  const handleCall = () => {
    if (promo.phone) Linking.openURL(`tel:${promo.phone}`);
  };

  return (
    <Animated.View style={[s.wrap, style, { opacity: fadeO, transform: [{ translateY: fadeY }] }]}>
      {/* Sponsored label */}
      <View style={s.topRow}>
        <View style={[s.adTag, { backgroundColor: color + '18', borderColor: color + '40' }]}>
          <PulseDot color={color} />
          <Text style={[s.adTagTxt, { color }]}>Sponsored</Text>
        </View>
        <TouchableOpacity
          onPress={() => nav.navigate('PromoteBusiness')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={s.advertiseLink}>Advertise here →</Text>
        </TouchableOpacity>
      </View>

      {/* Banner card */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handleCall}
        style={[s.card, { borderColor: color + '30' }]}
      >
        {/* Left accent bar */}
        <View style={[s.accentBar, { backgroundColor: color }]} />

        {/* Icon */}
        <View style={[s.iconWrap, { backgroundColor: color + '15' }]}>
          <Ionicons name="storefront-outline" size={22} color={color} />
        </View>

        {/* Info */}
        <View style={s.info}>
          <Text style={[s.bizName, { color }]} numberOfLines={1}>{promo.bizName}</Text>
          {!!promo.tagline && (
            <Text style={s.tagline} numberOfLines={1}>{promo.tagline}</Text>
          )}
          <View style={s.meta}>
            <Ionicons name="location-outline" size={10} color="#aaa" />
            <Text style={s.metaTxt}>{promo.location}</Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[s.ctaBtn, { backgroundColor: color }]}
          activeOpacity={0.8}
          onPress={handleCall}
        >
          <Text style={s.ctaTxt}>Call</Text>
          <Ionicons name="call-outline" size={11} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginHorizontal: 12,
    marginBottom: 10,
    marginTop: 4,
  },

  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 6,
  },
  adTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 9,
  },
  adTagTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  advertiseLink: { fontSize: 10, fontWeight: '700', color: '#bbb', textDecorationLine: 'underline' },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5,
    paddingVertical: 12, paddingRight: 12, paddingLeft: 16,
    overflow: 'hidden', position: 'relative',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },

  accentBar: {
    position: 'absolute', left: 0, top: 10, bottom: 10, width: 4, borderRadius: 2,
  },

  iconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  info: { flex: 1 },
  bizName: { fontSize: 14, fontWeight: '800', letterSpacing: -0.1 },
  tagline: { fontSize: 11, color: '#777', marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  metaTxt: { fontSize: 10, color: '#aaa' },

  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12,
    flexShrink: 0,
  },
  ctaTxt: { fontSize: 12, fontWeight: '800', color: '#fff' },
});
