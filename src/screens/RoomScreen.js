import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { useLang } from '../utils/i18n';
import { http } from '../utils/api';

const FILTERS = ['All', 'PG', '1 BHK', '2 BHK', 'Boys', 'Girls'];

export const ROOMS = [];

export default function RoomsScreen() {
  const nav = useNavigation();
  const { t } = useLang();
  const [filter, setFilter]         = useState('All');
  const [rooms, setRooms]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRooms = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await http('GET', '/api/rooms');
      if (res.ok && res.rooms) {
        const mapped = res.rooms.map(r => ({
          id: String(r.id),
          name: `${r.room_type || 'Room'} — ${r.area || 'Nanded'}`,
          subtitle: [r.furnished, r.floor ? `${r.floor} floor` : '', r.area].filter(Boolean).join(' · '),
          price: r.rent ? `₹${r.rent}/mo` : 'Price on request',
          location: r.area || 'Nanded',
          forGender: r.for_gender || 'Any',
          type: r.room_type || 'PG',
          available: true,
          availableLabel: r.vacancies > 1 ? `${r.vacancies} left` : 'Available',
          photos: (r.photos || []).length || 0,
          iconColor: '#1a2a3a',
          icon: 'home',
          amenities: r.amenities || [],
          owner: {
            name: r.owner_name || r.poster_name || 'Owner',
            area: r.area || 'Nanded',
          },
          whatsapp: r.whatsapp,
          expiresAt: r.expires_at,
          daysLeft: r.expires_at
            ? Math.max(0, Math.ceil((new Date(r.expires_at) - Date.now()) / 86400000))
            : null,
        }));
        setRooms(mapped);
      }
    } catch (e) {
      // silently keep existing data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const filtered = rooms.filter(r =>
    filter === 'All' ||
    r.type === filter ||
    r.forGender === filter
  );

  if (loading) {
    return (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#111" />
        <Text style={{ marginTop: 12, color: '#888', fontSize: 13 }}>Loading rooms…</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.pills}
        style={{ maxHeight: 52 }}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[s.pill, filter === f && s.pillOn]}
          >
            <Text style={[s.pillTxt, filter === f && s.pillTxtOn]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={r => r.id}
        contentContainerStyle={{ padding: 12, paddingTop: 4 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchRooms(true)} tintColor="#111" />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="home-outline" size={48} color="#d1d5db" />
            <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 12, fontWeight: '600' }}>No rooms listed yet</Text>
            <Text style={{ color: '#d1d5db', fontSize: 12, marginTop: 4 }}>Be the first to list your room!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            activeOpacity={0.85}
            onPress={() => nav.navigate('RoomDetail', { room: item })}
          >
            {/* Photo Strip */}
            <View style={[s.imgStrip, { backgroundColor: item.iconColor || '#2e3a4a' }]}>
              <Ionicons name={item.icon || 'home'} size={36} color="#fff" />
              <View style={s.photoThumbs}>
                {['room', 'kitchen', 'bath', 'outside'].slice(0, item.photos).map((key, i) => (
                  <View key={i} style={[s.thumb, i === 0 && s.thumbActive]}>
                    <Text style={[s.thumbTxt, i === 0 && s.thumbTxtActive]}>{t(key)}</Text>
                  </View>
                ))}
              </View>
              <View style={s.photoBadge}>
                <Text style={s.photoBadgeTxt}>{item.photos} {t('photosLabel')}</Text>
              </View>
              <View style={[s.availBadge, {
                backgroundColor: item.available
                  ? 'rgba(22,163,74,0.88)'
                  : 'rgba(234,88,12,0.88)'
              }]}>
                <Text style={s.availBadgeTxt}>{item.availableLabel === 'Available' ? t('available') : item.availableLabel}</Text>
              </View>
            </View>
            <View style={s.body}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.subtitle}>{item.subtitle}</Text>
              <View style={s.metaRow}>
                <View style={s.tag}><Ionicons name="location-sharp" size={11} color="#555" /><Text style={[s.tagTxt, { marginLeft: 3 }]}>{item.location}</Text></View>
                <View style={s.tag}><Ionicons name="person" size={11} color="#555" /><Text style={[s.tagTxt, { marginLeft: 3 }]}>{item.forGender}</Text></View>
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
            <Text style={{ fontSize: 11, color: '#999', fontWeight: '500' }}>{filtered.length} {t('listings')} {t('inNanded')}</Text>
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
  roomIcon: { fontSize: 48, opacity: 0.2, marginBottom: 8 },
  photoThumbs: { flexDirection: 'row', gap: 5 },
  thumb: {
    width: 48, height: 30, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
  },
  thumbTxt: { fontSize: 8, color: 'rgba(255,255,255,0.6)' },
  thumbTxtActive: { color: '#fff' },
  photoBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8,
  },
  photoBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '600' },
  availBadge: {
    position: 'absolute', top: 10, right: 10,
    borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8,
  },
  availBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },

  body: { padding: 14 },
  name: { fontSize: 14, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 11, color: '#999', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8 },
  tagTxt: { fontSize: 11, color: '#777' },
  priceBadge: { marginLeft: 'auto', backgroundColor: '#111', borderRadius: 7, paddingVertical: 5, paddingHorizontal: 10 },
  priceTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
