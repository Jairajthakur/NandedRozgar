/**
 * AvailabilityToggle.js — "Digital Labour Chowk" live status switch
 *
 * The literal on/off switch a worker flips on their home screen to say
 * "I'm available for work RIGHT NOW" — replacing the need to physically
 * wait at a local naka/chowk each morning. Auto-expires at midnight IST
 * (handled server-side) so a forgotten toggle doesn't stay on forever.
 *
 * Backend: PATCH /api/labour/:id/live-now (src/routes/labour.js)
 * Place at: src/components/labour/AvailabilityToggle.js
 *
 * Usage:
 *   <AvailabilityToggle labourId={profile.id} initialValue={profile.is_available_now} />
 */
import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';

import { http } from '../../utils/api';
import { LABOUR_COLORS as C, SPACING, RADIUS } from '../../constants/labourTheme';

export default function AvailabilityToggle({ labourId, initialValue = false, onChange }) {
  const [value, setValue] = useState(!!initialValue);
  const [busy, setBusy] = useState(false);

  const toggle = async (next) => {
    setValue(next);
    setBusy(true);

    let coords = {};
    if (next) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
      } catch { /* location is optional — toggle still works without it */ }
    }

    const res = await http('PATCH', `/api/labour/${labourId}/live-now`, { isAvailable: next, ...coords });
    setBusy(false);

    if (res.ok) {
      Toast.show({
        type: 'success',
        text1: next ? "You're now visible as available right now 🟢" : 'Turned off "available right now"',
      });
      onChange?.(res.profile);
    } else {
      setValue(!next); // revert on failure
      Toast.show({ type: 'error', text1: res.error || 'Could not update your status' });
    }
  };

  return (
    <View style={[st.card, value && st.cardActive]}>
      <View style={[st.dot, { backgroundColor: value ? C.success : C.textFaint }]} />
      <View style={{ flex: 1 }}>
        <Text style={st.title}>Available for work right now</Text>
        <Text style={st.sub}>
          {value ? "Contractors nearby can see you're ready to go" : 'Switch on when you can start work immediately'}
        </Text>
      </View>
      {busy
        ? <ActivityIndicator size="small" color={C.primary} />
        : <Switch value={value} onValueChange={toggle} trackColor={{ true: C.success }} thumbColor="#fff" />}
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: C.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.border,
    padding: SPACING.lg,
  },
  cardActive: { borderColor: C.successBorder, backgroundColor: C.successBg },
  dot: { width: 10, height: 10, borderRadius: 5 },
  title: { fontSize: 13.5, fontWeight: '700', color: C.text },
  sub: { fontSize: 11.5, color: C.textMuted, marginTop: 2 },
});
