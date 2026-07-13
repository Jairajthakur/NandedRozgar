/**
 * JobHeatmap.js — "Live Work Location Clusters"
 *
 * Shows where open labor demand (active jobs + pending hire requests with a
 * site location) is spiking right now, ranked hottest-first, with a
 * distance from the worker's current location when available — so a worker
 * can decide which direction to commute, the way a ride-share driver reads
 * a demand map. Rendered as a ranked intensity list rather than a real map
 * (no map SDK is wired into this project) — same approach already used by
 * NearbyRadar for nearby workers.
 *
 * Backend: GET /api/labour/nearby/heatmap (src/routes/labour.js)
 * Place at: src/components/labour/JobHeatmap.js
 *
 * Usage: <JobHeatmap />
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { http } from '../../utils/api';
import { LABOUR_COLORS as C, SPACING, RADIUS } from '../../constants/labourTheme';

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function heatColor(intensity) {
  if (intensity >= 0.66) return C.danger;
  if (intensity >= 0.33) return C.warning;
  return C.info;
}

function HeatRow({ point, myCoords }) {
  const dist = myCoords ? distanceKm(myCoords.lat, myCoords.lng, point.lat, point.lng) : null;
  const color = heatColor(point.intensity);
  return (
    <View style={st.row}>
      <View style={[st.dot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={st.rowTitle}>{point.count} open job{point.count === 1 ? '' : 's'} nearby</Text>
        <View style={st.barTrack}>
          <View style={[st.barFill, { width: `${Math.max(8, point.intensity * 100)}%`, backgroundColor: color }]} />
        </View>
      </View>
      {dist != null && <Text style={st.distTxt}>{dist.toFixed(1)} km</Text>}
    </View>
  );
}

export default function JobHeatmap() {
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState([]);
  const [myCoords, setMyCoords] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setMyCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      } catch { /* best-effort — heatmap still works without it */ }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await http('GET', '/api/labour/nearby/heatmap');
    if (res?.ok) setPoints(res.points || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const sorted = myCoords
    ? [...points].sort((a, b) => distanceKm(myCoords.lat, myCoords.lng, a.lat, a.lng) - distanceKm(myCoords.lat, myCoords.lng, b.lat, b.lng))
    : points;

  return (
    <View style={{ gap: SPACING.md }}>
      <View style={st.headerRow}>
        <Ionicons name="flame-outline" size={16} color={C.primary} />
        <Text style={st.title}>Where work is spiking right now</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginVertical: SPACING.lg }} />
      ) : sorted.length === 0 ? (
        <Text style={st.empty}>No open-job clusters yet — check back soon.</Text>
      ) : (
        <FlatList
          data={sorted.slice(0, 12)}
          keyExtractor={(p, i) => `${p.lat},${p.lng},${i}`}
          renderItem={({ item }) => <HeatRow point={item} myCoords={myCoords} />}
          scrollEnabled={false}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '700', color: C.text },
  empty: { fontSize: 12.5, color: C.textMuted, fontStyle: 'italic' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: C.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowTitle: { fontSize: 13, fontWeight: '700', color: C.text },
  barTrack: { height: 5, borderRadius: 3, backgroundColor: C.bg, marginTop: 6, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  distTxt: { fontSize: 11.5, color: C.info, fontWeight: '700' },
});
