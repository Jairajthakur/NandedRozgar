import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { useLang } from '../utils/i18n';
import { http } from '../utils/api';

const FILTERS_KEYS = ['all', 'Car', 'Bike', 'Auto', 'SUV'];
const FILTER_LABELS_EN = { all:'All', Car:'Car', Bike:'Bike', Auto:'Auto', SUV:'SUV' };

// Kept as fallback/demo if API is unavailable
export const CARS = [];

export default function CarsScreen() {
  const nav = useNavigation();
  const { t } = useLang();
  const [filter, setFilter]       = useState('all');
  const [cars, setCars]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCars = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await http('GET', '/api/vehicles');
      if (res.ok && res.vehicles) {
        // Map DB fields to the shape the card expects
        const mapped = res.vehicles.map(v => ({
          id: String(v.id),
          name: v.name,
          subtitle: [v.color, v.year, v.ac_type, v.fuel_type, v.seats ? `${v.seats} seats` : ''].filter(Boolean).join(' · '),
          price: v.daily_rate ? `₹${v.daily_rate}/day` : 'Price on request',
          location: v.area || 'Nanded',
          type: v.vehicle_type || 'Car',
          photos: (v.photos || []).length || 0,
          whatsapp: v.whatsapp,
          owner: {
            name: v.owner_name || v.poster_name || 'Owner',
            area: v.area || 'Nanded',
          },
          icon: v.vehicle_type === 'Bike / Scooter' ? 'bicycle' : 'car-sport',
          iconColor: '#1a2a3a',
          verified: false,
          expiresAt: v.expires_at,
          daysLeft: v.expires_at
            ? Math.max(0, Math.ceil((new Date(v.expires_at) - Date.now()) / 86400000))
            : null,
        }));
        setCars(mapped);
      }
    } catch (e) {
      // silently keep existing data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchCars(); }, [fetchCars]);

  const filtered = cars.filter(c => filter === 'all' || c.type === filter);

  if (loading) {
    return (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#111" />
        <Text style={{ marginTop: 12, color: '#888', fontSize: 13 }}>Loading vehicles…</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Filter Pills */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.pills}
        style={{ maxHeight: 52 }}
      >
        {FILTERS_KEYS.map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[s.pill, filter === f && s.pillOn]}
          >
            <Text style={[s.pillTxt, filter === f && s.pillTxtOn]}>{FILTER_LABELS_EN[f]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        contentContainerStyle={{ padding: 12, paddingTop: 4 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchCars(true)} tintColor="#111" />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="car-outline" size={48} color="#d1d5db" />
            <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 12, fontWeight: '600' }}>No vehicles listed yet</Text>
            <Text style={{ color: '#d1d5db', fontSize: 12, marginTop: 4 }}>Be the first to list your vehicle!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            activeOpacity={0.85}
            onPress={() => nav.navigate('CarDetail', { car: item })}
          >
            {/* Photo Strip */}
            <View style={[s.imgStrip, { backgroundColor: item.iconColor }]}>
              <Ionicons name={item.icon} size={48} color="#fff" style={{ opacity: 0.2, marginBottom: 8 }} />
              <View style={s.photoThumbs}>
                {['front', 'side', 'inside', 'back'].slice(0, item.photos).map((key, i) => (
                  <View key={i} style={[s.thumb, i === 0 && s.thumbActive]}>
                    <Text style={[s.thumbTxt, i === 0 && s.thumbTxtActive]}>{t(key)}</Text>
                  </View>
                ))}
              </View>
              <View style={s.photoBadge}>
                <Text style={s.photoBadgeTxt}>{item.photos} {t('photosLabel')}</Text>
              </View>
              {item.verified && (
                <View style={s.verifiedBadge}>
                  <Text style={s.verifiedTxt}>{t('verified')}</Text>
                </View>
              )}
            </View>
            {/* Body */}
            <View style={s.body}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.subtitle}>{item.subtitle}</Text>
              <View style={s.metaRow}>
                <View style={s.tag}><Ionicons name="location-sharp" size={11} color="#555" /><Text style={[s.tagTxt, { marginLeft: 3 }]}>{item.location}</Text></View>
                {item.daysLeft !== null && (
                  <View style={[s.tag, { backgroundColor: item.daysLeft <= 3 ? '#fef2f2' : '#f0fdf4' }]}>
                    <Ionicons name="time-outline" size={11} color={item.daysLeft <= 3 ? '#ef4444' : '#16a34a'} />
                    <Text style={[s.tagTxt, { marginLeft: 3, color: item.daysLeft <= 3 ? '#ef4444' : '#16a34a' }]}>
                      {item.daysLeft}d left
                    </Text>
                  </View>
                )}
                <View style={s.priceBadge}><Text style={s.priceTxt}>{item.price}</Text></View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          <View style={{ paddingBottom: 4 }}>
            <Text style={{ fontSize: 11, color: '#999', fontWeight: '500' }}>{filtered.length} {t('vehicles')}</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  pills: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  pill: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 1, borderColor: '#e5e5e5', backgroundColor: '#fff',
  },
  pillOn: { backgroundColor: '#111', borderColor: '#111' },
  pillTxt: { fontSize: 12, fontWeight: '600', color: '#555' },
  pillTxtOn: { color: '#fff' },

  card: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#ebebeb',
    marginBottom: 10, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  imgStrip: { height: 150, alignItems: 'center', justifyContent: 'center' },
  carIcon: { fontSize: 48, opacity: 0.2, marginBottom: 8 },
  photoThumbs: { flexDirection: 'row', gap: 5 },
  thumb: {
    width: 44, height: 28, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
  },
  thumbTxt: { fontSize: 9, color: 'rgba(255,255,255,0.6)' },
  thumbTxtActive: { color: '#fff' },
  photoBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8,
  },
  photoBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '600' },
  verifiedBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(22,163,74,0.85)',
    borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8,
  },
  verifiedTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },

  body: { padding: 14 },
  name: { fontSize: 14, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 11, color: '#999', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8 },
  tagTxt: { fontSize: 11, color: '#777' },
  ratingWrap: { backgroundColor: '#fff7ed', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8 },
  ratingTxt: { fontSize: 11, color: '#c2410c', fontWeight: '600' },
  priceBadge: { marginLeft: 'auto', backgroundColor: '#111', borderRadius: 7, paddingVertical: 5, paddingHorizontal: 10 },
  priceTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
