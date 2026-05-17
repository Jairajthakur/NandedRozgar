import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Animated, Easing, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useLang } from '../utils/i18n';
import { http } from '../utils/api';

const ORANGE = '#f97316';
const DARK_NAVY = '#1a2a3a';
const FILTERS_KEYS = ['all', 'Car', 'Bike', 'Auto', 'SUV'];
const FILTER_LABELS = { all: 'all', Car: 'Car', Bike: 'Bike', Auto: 'Auto', SUV: 'SUV' };

export const CARS = [];

/* ─── Zero Deposit Banner ─── */
function ZeroDepositBanner() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.015, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[s.promoBanner, { transform: [{ scale: pulse }] }]}>
      <View style={s.promoIconWrap}>
        <Ionicons name="cash-outline" size={17} color={ORANGE} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.promoTitle}>Zero Deposit Options</Text>
        <Text style={s.promoSub}>Look for verified owners</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#c2410c" />
    </Animated.View>
  );
}

/* ─── Animated Card ─── */
function VehicleCard({ item, index, onPress }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 380, delay: index * 70,
        easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 380, delay: index * 70,
        easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  const pressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const pressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  const daysAgo = item.daysLeft !== null
    ? `${Math.max(0, 30 - (item.daysLeft || 30))}d ago`
    : null;

  const iconName = (item.type === 'Bike' || item.type === 'Bike / Scooter') ? 'bicycle' : 'car-sport';

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
        style={s.card}
      >
        {/* Image strip */}
        <View style={[s.imgStrip, { backgroundColor: DARK_NAVY }]}>
          <Ionicons name={iconName} size={58} color="#fff" style={{ opacity: 0.14 }} />
          {daysAgo && (
            <View style={s.ageBadge}>
              <Text style={s.ageTxt}>{daysAgo}</Text>
            </View>
          )}
        </View>

        {/* Card body */}
        <View style={s.cardBody}>
          <View style={s.nameRow}>
            <Text style={s.name} numberOfLines={1}>{item.name}</Text>
            <Text style={s.price}>{item.price}</Text>
          </View>
          <Text style={s.subtitle} numberOfLines={1}>{item.subtitle}</Text>
          <View style={s.tagsRow}>
            {item.location ? <View style={s.tag}><Text style={s.tagTxt}>{item.location}</Text></View> : null}
            {item.type ? <View style={s.tag}><Text style={s.tagTxt}>{item.type}</Text></View> : null}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ─── Main Screen ─── */
export default function CarsScreen({ route }) {
  const nav = useNavigation();
  const { t } = useLang();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState(route?.params?.searchQuery || '');
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerOpacity, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, []);

  const fetchCars = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await http('GET', '/api/vehicles');
      if (res.ok && res.vehicles) {
        const mapped = res.vehicles.map(v => ({
          id: String(v.id),
          name: v.name,
          subtitle: [v.color, v.fuel_type, v.ac_type, v.seats ? `${v.seats} seats` : ''].filter(Boolean).join(' · '),
          price: v.daily_rate ? `₹${v.daily_rate}/day` : 'Price on request',
          location: v.area || 'Nanded',
          type: v.vehicle_type || 'Car',
          photos: (v.photos || []).length || 0,
          whatsapp: v.whatsapp,
          owner: { name: v.owner_name || v.poster_name || 'Owner', area: v.area || 'Nanded' },
          icon: v.vehicle_type === 'Bike / Scooter' ? 'bicycle' : 'car-sport',
          iconColor: DARK_NAVY,
          verified: false,
          expiresAt: v.expires_at,
          daysLeft: v.expires_at
            ? Math.max(0, Math.ceil((new Date(v.expires_at) - Date.now()) / 86400000))
            : null,
        }));
        setCars(mapped);
      }
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchCars(); }, [fetchCars]);

  const filtered = cars.filter(c => {
    const matchFilter = filter === 'all' || c.type === filter;
    const matchSearch = search === '' || c.title?.toLowerCase().includes(search.toLowerCase()) || c.location?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  if (loading) {
    return (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={{ marginTop: 12, color: '#888', fontSize: 13 }}>Loading vehicles…</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Animated.View style={{ opacity: headerOpacity }}>
        {/* Count */}
        <Text style={s.countTxt}>{filtered.length} vehicles in Nanded</Text>
        {/* Search */}
        <View style={s.searchWrap}>
          <Ionicons name="search" size={15} color="#bbb" />
          <TextInput
            style={{ flex: 1, fontSize: 13, color: '#333', marginLeft: 6 }}
            placeholder="Search car model, area..."
            placeholderTextColor="#bbb"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ paddingRight: 4 }}>
              <Ionicons name="close-circle" size={16} color="#bbb" />
            </TouchableOpacity>
          )}
        </View>
        {/* Filter Pills */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pills}
        >
          {FILTERS_KEYS.map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[s.pill, filter === f && s.pillOn]}
            >
              <Text style={[s.pillTxt, filter === f && s.pillTxtOn]}>
                {FILTER_LABELS[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20, paddingTop: 4 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchCars(true)}
            tintColor={ORANGE}
            colors={[ORANGE]}
          />
        }
        ListHeaderComponent={<ZeroDepositBanner />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="car-outline" size={52} color="#d1d5db" />
            <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 12, fontWeight: '700' }}>
              No vehicles listed yet
            </Text>
            <Text style={{ color: '#d1d5db', fontSize: 12, marginTop: 4 }}>
              Be the first to list your vehicle!
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <VehicleCard
            item={item}
            index={index}
            onPress={() => nav.navigate('CarDetail', { car: item })}
          />
        )}
      />
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

  /* Banner */
  promoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff7ed', borderRadius: 12,
    padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#fed7aa',
  },
  promoIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#fed7aa',
  },
  promoTitle: { fontSize: 13, fontWeight: '700', color: '#9a3412' },
  promoSub: { fontSize: 11, color: '#c2410c', marginTop: 1 },

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
  ageBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6, paddingVertical: 4, paddingHorizontal: 9,
  },
  ageTxt: { color: '#fff', fontSize: 11, fontWeight: '600' },

  cardBody: { padding: 14 },
  nameRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 3,
  },
  name: { fontSize: 15, fontWeight: '700', color: '#111', flex: 1, marginRight: 8 },
  price: { fontSize: 14, fontWeight: '800', color: '#111' },
  subtitle: { fontSize: 12, color: '#888', marginBottom: 10 },

  tagsRow: { flexDirection: 'row', gap: 6 },
  tag: {
    backgroundColor: '#f3f4f6', borderRadius: 6,
    paddingVertical: 4, paddingHorizontal: 10,
  },
  tagTxt: { fontSize: 11, color: '#555', fontWeight: '500' },
});
