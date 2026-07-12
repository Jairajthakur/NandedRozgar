/**
 * NearbyRadar.js — Contractor Radar (part of "Digital Labour Chowk")
 *
 * A contractor opens this and sees workers who've flipped on "available
 * right now" nearby, sorted by distance, so they can hire someone who can
 * pack their tools and come immediately instead of waiting for the physical
 * chowk to fill up in the morning.
 *
 * Backend: GET /api/labour/nearby/radar (src/routes/labour.js)
 * Place at: src/components/labour/NearbyRadar.js
 *
 * Usage:
 *   <NearbyRadar onSelectWorker={(w) => navigation.navigate('LabourDetail', { id: w.id })} />
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { http } from '../../utils/api';
import { LABOUR_COLORS as C, SPACING, RADIUS } from '../../constants/labourTheme';

const RADIUS_OPTIONS = [3, 5, 10, 15];

function WorkerRow({ w, onPress }) {
  return (
    <TouchableOpacity style={st.row} onPress={onPress}>
      {w.photo_url
        ? <Image source={{ uri: w.photo_url }} style={st.avatar} />
        : <View style={[st.avatar, st.avatarFallback]}><Ionicons name="person" size={18} color="#fff" /></View>}
      <View style={{ flex: 1 }}>
        <Text style={st.name}>{w.full_name}</Text>
        <Text style={st.skill}>{w.skill_category}{w.profile_type === 'team' ? ` · Crew of ${w.team_size}` : ''}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {w.distance_km != null && <Text style={st.distance}>{w.distance_km.toFixed(1)} km</Text>}
        <Text style={st.wage}>₹{w.daily_wage}/day</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NearbyRadar({ onSelectWorker }) {
  const [radiusKm, setRadiusKm] = useState(5);
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState([]);
  const [permDenied, setPermDenied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setPermDenied(true); setLoading(false); return; }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        setPermDenied(true);
        setLoading(false);
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const q = coords ? `?lat=${coords.lat}&lng=${coords.lng}&radiusKm=${radiusKm}` : `?radiusKm=${radiusKm}`;
    const res = await http('GET', `/api/labour/nearby/radar${q}`);
    if (res.ok) setWorkers(res.workers || []);
    setLoading(false);
  }, [coords, radiusKm]);

  useEffect(() => { if (coords || permDenied) load(); }, [coords, permDenied, radiusKm, load]);

  return (
    <View style={{ gap: SPACING.md }}>
      <View style={st.headerRow}>
        <Ionicons name="radio-outline" size={16} color={C.primary} />
        <Text style={st.title}>Available right now nearby</Text>
      </View>

      {permDenied && (
        <Text style={st.hint}>Location permission not granted — showing recent workers instead of by distance.</Text>
      )}

      <View style={st.chipRow}>
        {RADIUS_OPTIONS.map((r) => (
          <TouchableOpacity key={r} style={[st.chip, radiusKm === r && st.chipActive]} onPress={() => setRadiusKm(r)}>
            <Text style={[st.chipTxt, radiusKm === r && st.chipTxtActive]}>{r} km</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginVertical: SPACING.lg }} />
      ) : workers.length === 0 ? (
        <Text style={st.empty}>No one has switched on "available right now" nearby yet.</Text>
      ) : (
        <FlatList
          data={workers}
          keyExtractor={(w) => String(w.id)}
          renderItem={({ item }) => <WorkerRow w={item} onPress={() => onSelectWorker?.(item)} />}
          scrollEnabled={false}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '700', color: C.text },
  hint: { fontSize: 11.5, color: C.textMuted },
  chipRow: { flexDirection: 'row', gap: SPACING.sm },
  chip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: RADIUS.pill, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipTxt: { fontSize: 12, fontWeight: '600', color: C.text },
  chipTxtActive: { color: '#fff' },
  empty: { fontSize: 12.5, color: C.textMuted, fontStyle: 'italic' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: C.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { backgroundColor: C.worker, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 13.5, fontWeight: '700', color: C.text },
  skill: { fontSize: 11.5, color: C.textMuted, marginTop: 2 },
  distance: { fontSize: 11, color: C.info, fontWeight: '700' },
  wage: { fontSize: 12, color: C.text, fontWeight: '700', marginTop: 2 },
});
