/**
 * LeaderboardStrip.js — "Top hired this month" strip for the Labour browse
 * screen.
 *
 * Until now the Chowk Leaderboard (GET /api/labour/leaderboard) only ever
 * showed up on a worker's own profile page. Contractors browsing the list
 * had no way to see it at all. This surfaces the same top-3-this-month data
 * right on the browse screen, next to the wage board — same data source,
 * same visual pattern as WageBoardStrip, just a different metric.
 *
 * Place at: src/components/labour/LeaderboardStrip.js
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { http } from '../../utils/api';

const RANK_COLORS = ['#f59e0b', '#9ca3af', '#b45309']; // gold, silver, bronze

export default function LeaderboardStrip({ district, onPressWorker, style }) {
  const [top, setTop] = useState(null); // null = loading, [] = no data yet

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (district) params.set('district', district);
        const res = await http('GET', `/api/labour/leaderboard?${params.toString()}`);
        if (alive) setTop(res?.ok ? (res.topThisMonth || []).slice(0, 5) : []);
      } catch {
        if (alive) setTop([]);
      }
    })();
    return () => { alive = false; };
  }, [district]);

  return (
    <LinearGradient
      colors={['#fff3e2', '#ffe6c9']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[s.wrap, style]}
    >
      <View style={s.headerRow}>
        <View style={s.trophyBadge}>
          <Ionicons name="trophy" size={14} color="#fff" />
        </View>
        <Text style={s.headerTxt}>Top hired this month</Text>
      </View>

      {top !== null && top.length === 0 ? (
        <View style={s.emptyRow}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="hourglass-outline" size={16} color="#c2854f" />
          </View>
          <Text style={s.emptyTxt}>No hires completed yet this month — be the first!</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
          {top === null
            ? [1, 2, 3].map(i => <View key={i} style={[s.chip, s.chipSkeleton]} />)
            : top.map((w, i) => {
              const initials = (w.full_name || '?').split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
              return (
                <TouchableOpacity
                  key={w.id}
                  style={s.chip}
                  activeOpacity={0.85}
                  onPress={() => onPressWorker?.(w.id)}
                >
                  <View style={[s.rankAvatar, { backgroundColor: RANK_COLORS[i] || '#e5e5e5' }]}>
                    <Text style={s.rankAvatarTxt}>{initials}</Text>
                    <View style={[s.rankBadge, { backgroundColor: RANK_COLORS[i] || '#e5e5e5' }]}>
                      <Text style={s.rankBadgeTxt}>{i + 1}</Text>
                    </View>
                  </View>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={s.chipName} numberOfLines={1}>{w.full_name}</Text>
                    <Text style={s.chipMeta} numberOfLines={1}>{w.skill_category} · {w.hire_count} hire{w.hire_count === 1 ? '' : 's'}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    paddingVertical: 14, paddingHorizontal: 14, marginBottom: 16,
    shadowColor: '#c2761b', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  trophyBadge: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#f59e0b',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#f59e0b', shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  headerTxt: { fontSize: 12.5, fontWeight: '800', color: '#9a3412', textTransform: 'uppercase', letterSpacing: 0.5 },

  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  emptyIconWrap: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTxt: { fontSize: 12, color: '#9a6a3f', fontWeight: '600', flexShrink: 1 },

  row: { gap: 10, paddingRight: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff',
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9,
    minWidth: 150, maxWidth: 180,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  chipSkeleton: { backgroundColor: 'rgba(255,255,255,0.5)', height: 46, width: 150, shadowOpacity: 0 },
  rankAvatar: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    position: 'relative',
  },
  rankAvatarTxt: { fontSize: 12.5, fontWeight: '800', color: '#fff' },
  rankBadge: {
    position: 'absolute', bottom: -3, right: -3, width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff',
  },
  rankBadgeTxt: { fontSize: 9, fontWeight: '900', color: '#fff' },
  chipName: { fontSize: 12.5, fontWeight: '700', color: '#111' },
  chipMeta: { fontSize: 10.5, fontWeight: '500', color: '#9a6a3f', marginTop: 2 },
});
