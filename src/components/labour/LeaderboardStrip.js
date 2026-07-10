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
    <View style={[s.wrap, style]}>
      <View style={s.headerRow}>
        <Ionicons name="trophy-outline" size={13} color="#b45309" />
        <Text style={s.headerTxt}>Top hired this month</Text>
      </View>

      {top !== null && top.length === 0 ? (
        <View style={s.emptyRow}>
          <Ionicons name="hourglass-outline" size={14} color="#c2854f" />
          <Text style={s.emptyTxt}>No hires completed yet this month — be the first!</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
          {top === null
            ? [1, 2, 3].map(i => <View key={i} style={[s.chip, s.chipSkeleton]} />)
            : top.map((w, i) => (
              <TouchableOpacity
                key={w.id}
                style={s.chip}
                activeOpacity={0.85}
                onPress={() => onPressWorker?.(w.id)}
              >
                <View style={[s.rank, { backgroundColor: RANK_COLORS[i] || '#e5e5e5' }]}>
                  <Text style={s.rankTxt}>{i + 1}</Text>
                </View>
                <View style={{ flexShrink: 1 }}>
                  <Text style={s.chipName} numberOfLines={1}>{w.full_name}</Text>
                  <Text style={s.chipMeta} numberOfLines={1}>{w.skill_category} · {w.hire_count} hire{w.hire_count === 1 ? '' : 's'}</Text>
                </View>
              </TouchableOpacity>
            ))}
        </ScrollView>
      )}
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

  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  emptyTxt: { fontSize: 11.5, color: '#9a6a3f', fontWeight: '600', flexShrink: 1 },

  row: { gap: 8, paddingRight: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#f3d9b5',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7,
    minWidth: 140, maxWidth: 170,
  },
  chipSkeleton: { backgroundColor: '#f3f0ec', borderColor: '#f3f0ec', height: 40, width: 140 },
  rank: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rankTxt: { fontSize: 11, fontWeight: '800', color: '#fff' },
  chipName: { fontSize: 12, fontWeight: '700', color: '#111' },
  chipMeta: { fontSize: 10.5, fontWeight: '500', color: '#9a6a3f', marginTop: 1 },
});
