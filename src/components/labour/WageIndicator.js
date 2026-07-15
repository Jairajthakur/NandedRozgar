/**
 * WageIndicator.js — color-coded wage tier badge
 *
 * On a cheap phone screen in direct sunlight, digits and currency symbols
 * blur together — a worker shouldn't have to squint and do mental math to
 * know whether a job alert is worth taking. Color alone should answer
 * "is this good money?" in under a second:
 *
 *   Green  → high-paying   (comfortably above a fair daily wage)
 *   Blue   → standard      (a normal, fair daily wage)
 *   Orange → lower-paying  (below average / half-day work)
 *
 * Place at: src/components/labour/WageIndicator.js
 *
 * Usage:
 *   <WageIndicator wage={item.proposed_wage} />
 *   <WageIndicator wage={item.proposed_wage} avgWage={goingRate} size="lg" />
 *
 *   const { tier, color } = getWageTier(750);
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Static fallback thresholds (₹/day), used when no local "going rate" (from
// the Wage Board) is available to compare against.
const DEFAULT_LOW_MAX  = 500;
const DEFAULT_HIGH_MIN = 1000;

const TIERS = {
  high:     { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: 'trending-up',   label: 'High paying' },
  standard: { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: 'remove-outline', label: 'Fair wage' },
  low:      { color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: 'trending-down', label: 'Lower wage' },
};

/**
 * Pure helper — figure out which tier a wage falls into. If `avgWage` (a
 * local going-rate figure, e.g. from the Wage Board) is supplied, the tiers
 * are computed relative to it (±15%); otherwise static ₹ thresholds are used.
 */
export function getWageTier(wage, avgWage) {
  const n = Number(wage) || 0;
  if (avgWage && Number(avgWage) > 0) {
    const avg = Number(avgWage);
    if (n >= avg * 1.15) return { tier: 'high', ...TIERS.high };
    if (n <= avg * 0.85) return { tier: 'low', ...TIERS.low };
    return { tier: 'standard', ...TIERS.standard };
  }
  if (n >= DEFAULT_HIGH_MIN) return { tier: 'high', ...TIERS.high };
  if (n > 0 && n < DEFAULT_LOW_MAX) return { tier: 'low', ...TIERS.low };
  return { tier: 'standard', ...TIERS.standard };
}

export default function WageIndicator({ wage, avgWage, size = 'md', showLabel = true }) {
  const meta = getWageTier(wage, avgWage);
  const big = size === 'lg';

  return (
    <View style={[
      st.badge,
      { backgroundColor: meta.bg, borderColor: meta.border },
      big && st.badgeLg,
    ]}>
      <Ionicons name={meta.icon} size={big ? 18 : 13} color={meta.color} />
      <Text style={[st.wageTxt, { color: meta.color }, big && st.wageTxtLg]}>
        ₹{Number(wage) || 0}<Text style={[st.perDay, { color: meta.color }]}>/day</Text>
      </Text>
      {showLabel && (
        <Text style={[st.tierTxt, { color: meta.color }, big && st.tierTxtLg]}>{meta.label}</Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    borderRadius: 100, borderWidth: 1.5, paddingVertical: 6, paddingHorizontal: 12,
  },
  badgeLg: { paddingVertical: 10, paddingHorizontal: 18, gap: 8 },
  wageTxt: { fontSize: 14, fontWeight: '900' },
  wageTxtLg: { fontSize: 20 },
  perDay: { fontSize: 11, fontWeight: '700' },
  tierTxt: { fontSize: 11.5, fontWeight: '800', marginLeft: 2 },
  tierTxtLg: { fontSize: 13.5 },
});
