/**
 * RewardsProgress.js — "ID card at 5 bookings, T-shirt at 10 bookings"
 * progress banner for a worker's Labour dashboard.
 *
 * Data source: GET /api/labour/rewards/mine. Counting is fresh-start —
 * only bookings completed since the feature shipped count (see
 * labour_reward_settings on the backend) — so the numbers here can differ
 * from the lifetime "Jobs done" stat shown elsewhere on the dashboard.
 *
 * Once a reward is earned it shows as "On the way" until an admin marks it
 * issued in the admin panel, at which point it shows "Delivered".
 *
 * Place at: src/components/labour/RewardsProgress.js
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { http } from '../../utils/api';
import { LABOUR_COLORS } from '../../constants/labourTheme';

const LABOUR = LABOUR_COLORS.worker;

const REWARD_META = {
  id_card: { icon: 'card-outline',  label: 'ID Card' },
  tshirt:  { icon: 'shirt-outline', label: 'T-Shirt' },
};

export default function RewardsProgress({ style }) {
  const [data, setData] = useState(null); // null = loading

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await http('GET', '/api/labour/rewards/mine');
        if (alive) setData(res?.ok ? res : null);
      } catch {
        if (alive) setData(null);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (!data || !data.rewards?.length) return null;

  const visibleRewards = data.rewards.filter(r => r.reward_type !== 'id_card');
  if (!visibleRewards.length) return null;

  return (
    <View style={[s.wrap, style]}>
      <View style={s.headerRow}>
        <View style={s.headerIconWrap}>
          <Ionicons name="gift-outline" size={14} color="#fff" />
        </View>
        <Text style={s.headerTxt}>Booking Rewards</Text>
      </View>

      {visibleRewards.map((r) => {
        const meta = REWARD_META[r.reward_type] || { icon: 'gift-outline', label: r.reward_type };
        const earned = r.status === 'issued' || r.status === 'pending';
        const delivered = r.status === 'issued';
        const remaining = Math.max(0, r.milestone_bookings - data.completedCount);

        return (
          <View key={r.reward_type} style={s.row}>
            <View style={[s.iconWrap, earned && s.iconWrapEarned]}>
              <Ionicons name={meta.icon} size={16} color={earned ? '#fff' : '#aaa'} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.rowLabel}>{meta.label} · {r.milestone_bookings} bookings</Text>
              <Text style={s.rowSub}>
                {delivered
                  ? 'Delivered ✓'
                  : earned
                  ? 'Earned — on its way to you'
                  : `${remaining} more booking${remaining === 1 ? '' : 's'} to unlock`}
              </Text>
            </View>
            {!earned && (
              <Text style={s.progressTxt}>{data.completedCount}/{r.milestone_bookings}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 14,
    marginBottom: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  headerIconWrap: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: LABOUR,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTxt: { fontSize: 13, fontWeight: '800', color: '#111' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  iconWrap: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapEarned: { backgroundColor: LABOUR },
  rowLabel: { fontSize: 12.5, fontWeight: '700', color: '#222' },
  rowSub: { fontSize: 11.5, color: '#888', marginTop: 1 },
  progressTxt: { fontSize: 11.5, fontWeight: '700', color: LABOUR },
});
