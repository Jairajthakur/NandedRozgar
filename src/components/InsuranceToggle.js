/**
 * InsuranceToggle.js — "₹5/day accident insurance" toggle for dangerous
 * structural sites. Flips labour_insurance_active on the worker's account;
 * while on, a lazy daily charge debits ₹5 from wallet_balance per calendar
 * day and records it as proof of coverage.
 *
 * Backend: src/routes/insurance.js, mounted at /api/insurance.
 * Place at: src/components/labour/InsuranceToggle.js
 *
 * Usage: <InsuranceToggle /> — drop into LabourEarningsScreen.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { http } from '../../utils/api';
import { LABOUR_COLORS as C, SPACING, RADIUS } from '../../constants/labourTheme';

export default function InsuranceToggle() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    const res = await http('GET', '/api/insurance/mine');
    if (res?.ok) setData(res);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onToggle = async (next) => {
    if (next && (data?.walletBalance ?? 0) < (data?.dailyPremium ?? 5)) {
      Alert.alert(
        'Top up your wallet first',
        `You need at least ₹${data?.dailyPremium || 5} in your wallet to activate today's cover.`
      );
      return;
    }
    setToggling(true);
    const res = await http('POST', '/api/insurance/toggle', { active: next });
    setToggling(false);
    if (res?.ok) {
      Toast.show({
        type: 'success',
        text1: next ? 'Accident cover activated' : 'Accident cover turned off',
        text2: next ? `₹${data?.dailyPremium || 5}/day will be debited from your wallet.` : undefined,
      });
      load();
    } else {
      Toast.show({ type: 'error', text1: 'Could not update cover', text2: res?.error });
    }
  };

  if (loading) return <View style={st.card}><ActivityIndicator color={C.primary} /></View>;

  const active = !!data?.active;

  return (
    <View style={st.card}>
      <View style={st.headerRow}>
        <View style={st.headerLeft}>
          <Ionicons name="shield-checkmark-outline" size={16} color={active ? C.success : C.primary} />
          <Text style={st.title}>Accident cover</Text>
        </View>
        {toggling ? <ActivityIndicator size="small" color={C.primary} /> : (
          <Switch
            value={active}
            onValueChange={onToggle}
            trackColor={{ true: C.success, false: C.border }}
            thumbColor="#fff"
          />
        )}
      </View>

      <Text style={st.desc}>
        {active
          ? `Active — ₹${data.dailyPremium}/day is debited from your wallet automatically. Covered ${data.coveredDays} day${data.coveredDays === 1 ? '' : 's'} so far.`
          : `Turn on ₹${data?.dailyPremium || 5}/day accident cover before heading to a risky structural site.`}
      </Text>

      {data?.deactivated && (
        <Text style={st.warn}>Cover was turned off — your wallet balance ran low. Top up and switch it back on.</Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.border, padding: SPACING.lg, gap: SPACING.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '800', color: C.text },
  desc: { fontSize: 12, color: C.textMuted, lineHeight: 17 },
  warn: { fontSize: 11.5, color: C.danger, fontWeight: '600' },
});
