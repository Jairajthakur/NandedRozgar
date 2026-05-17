import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ScrollView, Animated, Easing,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { http } from '../utils/api';

const ORANGE = '#f97316';
const DARK_NAVY = '#1a2a3a';
const DEEP_PURPLE = '#312e81';

const TYPES = ['All', '1BHK', '2BHK', 'PG', 'Single', 'Male', 'Female'];

/* Static demo data */
export const ROOMS = [
  {
    id: 'r1', title: '1BHK Flat — Vazirabad', location: 'Vazirabad', type: '1BHK',
    rent: '₹5,500/mo', rentNum: 5500, available: true,
    description: 'Furnished · 2nd floor · Near Bus Stand. Well maintained property with good security and ventilation. Water available 24/7. Society is peaceful and near to all facilities including market, hospitals and transport.',
    amenities: ['WiFi', 'Power Backup', 'Parking'],
    for: 'Any', listedDaysAgo: 12, deposit: '2 months',
    owner: { name: 'Ramesh Kulkarni', verified: true },
    phone: '9876543210',
    cardBg: DARK_NAVY,
  },
  {
    id: 'r2', title: 'PG — Girls Hostel', location: 'Near SRTMU', type: 'PG',
    rent: '₹4,200/mo', rentNum: 4200, available: true,
    description: 'AC rooms with 3 meals included. Safe and secure. Curfew 10 PM.',
    amenities: ['AC', 'Meals', 'WiFi'],
    for: 'Female', listedDaysAgo: 5, deposit: '1 month',
    owner: { name: 'Sunita Deshpande', verified: true },
    phone: '9765432109',
    cardBg: '#4a1942',
  },
  {
    id: 'r3', title: 'Single Room — Station Road', location: 'Station Road', type: 'Single',
    rent: '₹3,000/mo', rentNum: 3000, available: true,
    description: 'Furnished single room near railway station. Ideal for students and working bachelors.',
    amenities: ['WiFi'],
    for: 'Male', listedDaysAgo: 8, deposit: '1 month',
    owner: { name: 'Prakash More', verified: false },
    phone: '9812345678',
    cardBg: '#1a3a2a',
  },
  {
    id: 'r4', title: '2BHK — Vazirabad Main Road', location: 'Vazirabad', type: '2BHK',
    rent: '₹8,000/mo', rentNum: 8000, available: false,
    description: 'Well-maintained 2BHK flat with parking. Suitable for families.',
    amenities: ['Parking', 'Power Backup'],
    for: 'Any', listedDaysAgo: 20, deposit: '2 months',
    owner: { name: 'Anil Patil', verified: false },
    phone: '9898989898',
    cardBg: '#2a2030',
  },
];

/* ─── New Banner ─── */
function NewListingsBanner({ delay }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[s.newBanner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={s.newBannerIcon}>
        <Ionicons name="sparkles" size={16} color="#0891b2" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.newBannerTitle}>New: 15 rooms added this week</Text>
        <Text style={s.newBannerSub}>CIDCO &amp; Vazirabad areas trending</Text>
      </View>
    </Animated.View>
  );
}

/* ─── Amenity Tag ─── */
function AmenityTag({ label }) {
  return (
    <View style={s.amenityTag}>
      <Ionicons name="checkmark-circle" size={11} color="#16a34a" style={{ marginRight: 3 }} />
      <Text style={s.amenityTxt}>{label}</Text>
    </View>
  );
}

/* ─── Animated Room Card ─── */
function RoomCard({ item, index, onPress }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 380, delay: index * 80,
        easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 380, delay: index * 80,
        easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  const pressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const pressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
        style={s.card}
      >
        {/* Image Strip */}
        <View style={[s.imgStrip, { backgroundColor: item.cardBg || DARK_NAVY }]}>
          <Ionicons name="home-outline" size={52} color="#fff" style={{ opacity: 0.14 }} />
          <View style={[s.availBadge, { backgroundColor: item.available ? '#16a34a' : '#6b7280' }]}>
            <Text style={s.availTxt}>{item.available ? 'Available' : 'Occupied'}</Text>
          </View>
        </View>

        {/* Card Body */}
        <View style={s.cardBody}>
          <View style={s.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.title} numberOfLines={1}>{item.title}</Text>
              <View style={s.locationRow}>
                <Ionicons name="location-outline" size={11} color="#888" />
                <Text style={s.locationTxt}>
                  {item.location}{item.listedDaysAgo ? ` · Listed ${item.listedDaysAgo} days ago` : ''}
                </Text>
              </View>
            </View>
            <Text style={s.rent}>{item.rent}</Text>
          </View>

          {/* Chips */}
          <View style={s.chipRow}>
            {item.type && <View style={s.chip}><Text style={s.chipTxt}>{item.type}</Text></View>}
            {item.for && <View style={s.chip}><Ionicons name="people-outline" size={10} color="#555" /><Text style={s.chipTxt}> {item.for}</Text></View>}
            {item.available && (
              <View style={[s.chip, { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="checkmark-circle" size={11} color="#16a34a" />
                <Text style={[s.chipTxt, { color: '#16a34a', marginLeft: 2 }]}>Available</Text>
              </View>
            )}
          </View>

          {/* Amenities */}
          {item.amenities && item.amenities.length > 0 && (
            <View style={s.amenitiesRow}>
              {item.amenities.map((a, i) => <AmenityTag key={i} label={a} />)}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ─── Main Screen ─── */
export default function RoomScreen() {
  const nav = useNavigation();
  const [type, setType] = useState('All');
  const [rooms, setRooms] = useState(ROOMS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerOpacity, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, []);

  const fetchRooms = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await http('GET', '/api/rooms');
      if (res.ok && res.rooms && res.rooms.length > 0) {
        const mapped = res.rooms.map((r, i) => ({
          id: String(r.id),
          title: r.title || r.name,
          location: r.area || r.location || 'Nanded',
          type: r.room_type || r.type || '1BHK',
          rent: r.monthly_rent ? `₹${r.monthly_rent}/mo` : r.rent || 'Price on request',
          rentNum: r.monthly_rent || 0,
          available: r.available !== false,
          description: r.description || '',
          amenities: r.amenities || [],
          for: r.suitable_for || r.for || 'Any',
          listedDaysAgo: r.created_at
            ? Math.ceil((Date.now() - new Date(r.created_at)) / 86400000)
            : null,
          deposit: r.deposit || null,
          owner: { name: r.owner_name || r.poster_name || 'Owner', verified: r.verified || false },
          phone: r.phone || r.whatsapp || '',
          cardBg: [DARK_NAVY, '#4a1942', '#1a3a2a', '#2a2030'][i % 4],
        }));
        setRooms(mapped);
      }
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const filtered = rooms.filter(r => type === 'All' || r.type === type || r.for === type);

  return (
    <View style={s.container}>
      <Animated.View style={{ opacity: headerOpacity }}>
        {/* Count */}
        <Text style={s.countTxt}>{filtered.length} listings in Nanded</Text>
        {/* Search bar */}
        <View style={s.searchWrap}>
          <Ionicons name="search" size={15} color="#bbb" />
          <Text style={s.searchPlaceholder}>Search area, type...</Text>
        </View>
        {/* Type pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pills}>
          {TYPES.map(tp => (
            <TouchableOpacity
              key={tp}
              onPress={() => setType(tp)}
              style={[s.pill, type === tp && s.pillOn]}
            >
              <Text style={[s.pillTxt, type === tp && s.pillTxtOn]}>{tp}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={ORANGE} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={r => r.id}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20, paddingTop: 4 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchRooms(true)}
              tintColor={ORANGE}
              colors={[ORANGE]}
            />
          }
          ListHeaderComponent={<NewListingsBanner delay={200} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="home-outline" size={52} color="#d1d5db" />
              <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 12, fontWeight: '700' }}>No rooms found</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <RoomCard
              item={item}
              index={index}
              onPress={() => nav.navigate('RoomDetail', { room: item })}
            />
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  countTxt: { fontSize: 12, color: '#888', fontWeight: '500', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 12, marginBottom: 10,
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e5e5',
    paddingHorizontal: 14, paddingVertical: 11,
  },
  searchPlaceholder: { fontSize: 13, color: '#bbb', flex: 1 },

  pills: { paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  pill: {
    paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20,
    borderWidth: 1, borderColor: '#e5e5e5', backgroundColor: '#fff',
  },
  pillOn: { backgroundColor: '#111', borderColor: '#111' },
  pillTxt: { fontSize: 12, fontWeight: '600', color: '#555' },
  pillTxtOn: { color: '#fff' },

  /* New Listings Banner */
  newBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#ecfeff', borderRadius: 12,
    padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#a5f3fc',
  },
  newBannerIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#a5f3fc',
  },
  newBannerTitle: { fontSize: 13, fontWeight: '700', color: '#0e7490' },
  newBannerSub: { fontSize: 11, color: '#0891b2', marginTop: 1 },

  /* Card */
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#ebebeb',
    marginBottom: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  imgStrip: {
    height: 160, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  availBadge: {
    position: 'absolute', top: 10, right: 10,
    borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10,
  },
  availTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },

  cardBody: { padding: 14 },
  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 6,
  },
  title: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  locationTxt: { fontSize: 11, color: '#888' },
  rent: { fontSize: 15, fontWeight: '800', color: '#111', marginLeft: 8 },

  chipRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 6, borderWidth: 1, borderColor: '#e5e5e5',
    paddingVertical: 4, paddingHorizontal: 8,
  },
  chipTxt: { fontSize: 11, color: '#555', fontWeight: '500' },

  amenitiesRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  amenityTag: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 6,
    borderWidth: 1, borderColor: '#bbf7d0',
    paddingVertical: 4, paddingHorizontal: 8,
  },
  amenityTxt: { fontSize: 11, color: '#16a34a', fontWeight: '500' },
});
