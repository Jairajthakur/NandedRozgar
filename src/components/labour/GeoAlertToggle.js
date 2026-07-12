/**
 * GeoAlertToggle.js — Localized "Geo-Fenced" Job Alerts
 *
 * Laborers often don't want to travel across the whole district for a
 * single day's wage. This lets someone opt an existing job alert into
 * "only ping me for jobs within N km of my current neighbourhood" instead
 * of the whole district — a one-time location capture plus a radius picker.
 *
 * Backend: POST /api/alerts (extended with lat/lng/radiusKm — src/routes/alerts.js)
 * Place at: src/components/labour/GeoAlertToggle.js
 *
 * Usage (inside AlertsScreen, per alert row):
 *   <GeoAlertToggle alert={alert} onSaved={reloadAlerts} />
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';

import { http } from '../../utils/api';
import { LABOUR_COLORS as C, SPACING, RADIUS } from '../../constants/labourTheme';

const RADIUS_OPTIONS = [5, 10, 20];

export default function GeoAlertToggle({ alert, onSaved }) {
  const [busy, setBusy] = useState(false);
  const isGeoFenced = alert.lat != null && alert.lng != null;

  const enableGeoFence = async (radiusKm) => {
    setBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Location permission is needed to localize this alert' });
        setBusy(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const res = await http('POST', '/api/alerts', {
        category: alert.category,
        keywords: alert.keywords,
        pushToken: alert.push_token,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        radiusKm,
      });
      if (res.ok) {
        Toast.show({ type: 'success', text1: `You'll only be pinged for jobs within ${radiusKm} km` });
        onSaved?.(res.alert);
      } else {
        Toast.show({ type: 'error', text1: res.error || 'Could not localize this alert' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Could not get your location' });
    } finally {
      setBusy(false);
    }
  };

  const clearGeoFence = async () => {
    setBusy(true);
    const res = await http('POST', '/api/alerts', {
      category: alert.category, keywords: alert.keywords, pushToken: alert.push_token,
      lat: null, lng: null, radiusKm: 10,
    });
    setBusy(false);
    if (res.ok) {
      Toast.show({ type: 'success', text1: 'Back to district-wide alerts' });
      onSaved?.(res.alert);
    }
  };

  return (
    <View style={st.wrap}>
      {isGeoFenced ? (
        <TouchableOpacity style={st.activeChip} onPress={clearGeoFence} disabled={busy}>
          <Ionicons name="location" size={12} color={C.success} />
          <Text style={st.activeTxt}>Within {alert.radius_km} km · tap to widen back to district</Text>
        </TouchableOpacity>
      ) : (
        <View style={st.row}>
          <Ionicons name="location-outline" size={13} color={C.textMuted} />
          <Text style={st.label}>Only nearby:</Text>
          {busy ? <ActivityIndicator size="small" color={C.primary} /> : RADIUS_OPTIONS.map((r) => (
            <TouchableOpacity key={r} style={st.chip} onPress={() => enableGeoFence(r)}>
              <Text style={st.chipTxt}>{r} km</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { marginTop: SPACING.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  label: { fontSize: 11, color: C.textMuted },
  chip: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: RADIUS.pill, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  chipTxt: { fontSize: 10.5, fontWeight: '600', color: C.text },
  activeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: C.successBg, borderRadius: RADIUS.pill, paddingVertical: 4, paddingHorizontal: 9,
    borderWidth: 1, borderColor: C.successBorder,
  },
  activeTxt: { fontSize: 10.5, color: C.success, fontWeight: '600' },
});
