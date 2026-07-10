/**
 * WageBoardStrip.js — "Today's going rate" market-rate strip.
 *
 * A small, chowk-specific bit of transparency: everyone standing at a real
 * labour chowk roughly knows what a mason costs today. This surfaces the
 * same thing in-app — the median daily rate per skill, computed server-side
 * from GET /api/labour/wage-board — so contractors have a reason to open
 * the app even on days they're not hiring.
 *
 * Place at: src/components/WageBoardStrip.js
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { http } from '../utils/api';

const ORANGE = '#f97316';
const IS_WEB = Platform.OS === 'web';

const SKILL_ICONS = {
  Mason: 'construct-outline',
  Electrician: 'flash-outline',
  Plumber: 'water-outline',
  Painter: 'color-palette-outline',
  Carpenter: 'hammer-outline',
  Welder: 'flame-outline',
  Helper: 'people-outline',
  Other: 'apps-outline',
};

export default function WageBoardStrip({ district, onPressSkill, style }) {
  const [rates, setRates] = useState(null); // null = loading, [] = no data yet

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (district) params.set('district', district);
        const res = await http('GET', `/api/labour/wage-board?${params.toString()}`);
        if (alive) setRates(res?.ok ? (res.rates || []) : []);
      } catch {
        if (alive) setRates([]);
      }
    })();
    return () => { alive = false; };
  }, [district]);

  if (rates !== null && rates.length === 0) return null; // not enough data yet — stay quiet, don't show an empty strip

  return (
    <View style={[s.wrap, style]}>
      <View style={s.headerRow}>
        <Ionicons name="trending-up-outline" size={13} color={ORANGE} />
        <Text style={s.headerTxt}>Today&apos;s going rate</Text>
        <Text style={s.headerSub}>· median of active listings</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.row}
      >
        {rates === null
          ? [1, 2, 3, 4].map(i => <View key={i} style={[s.chip, s.chipSkeleton]} />)
          : rates.map(r => (
            <TouchableOpacity
              key={r.skill_category}
              style={s.chip}
              activeOpacity={0.85}
              onPress={() => onPressSkill?.(r.skill_category)}
            >
              <Ionicons name={SKILL_ICONS[r.skill_category] || 'briefcase-outline'} size={13} color={ORANGE} />
              <View>
                <Text style={s.chipSkill}>{r.skill_category}</Text>
                <Text style={s.chipRate}>₹{r.median_wage}/day</Text>
              </View>
            </TouchableOpacity>
          ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: '#fffaf5', borderRadius: 14, borderWidth: 1, borderColor: '#fde8cc',
    paddingVertical: 10, paddingHorizontal: 12, marginBottom: 14,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  headerTxt: { fontSize: 11.5, fontWeight: '800', color: '#9a3412', textTransform: 'uppercase', letterSpacing: 0.4 },
  headerSub: { fontSize: 11, color: '#c2854f', fontWeight: '500' },

  row: { gap: 8, paddingRight: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#f3d9b5',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7,
    minWidth: 92,
  },
  chipSkeleton: { backgroundColor: '#f3f0ec', borderColor: '#f3f0ec', height: 34, width: 92 },
  chipSkill: { fontSize: 10.5, fontWeight: '700', color: '#7c4a1e' },
  chipRate: { fontSize: 12.5, fontWeight: '800', color: '#111', marginTop: 1 },
});
