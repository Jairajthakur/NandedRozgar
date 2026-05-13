import React, { useState } from 'react';
import {
  View, Text, FlatList, ScrollView, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { useLang } from '../utils/i18n';

const FILTERS_KEYS = ['all', 'Car', 'Bike', 'Auto', 'SUV'];
const FILTER_LABELS_EN = { all:'All', Car:'Car', Bike:'Bike', Auto:'Auto', SUV:'SUV' };

const CARS = [
  {
    id: '1',
    name: 'Maruti Swift Dzire',
    subtitle: 'White · 2020 · AC · Petrol · 5 seats',
    price: '₹600/day',
    location: 'Shivaji Nagar',
    rating: '4.8',
    reviews: '38',
    photos: 4,
    type: 'Car',
    specs: { Fuel: 'Petrol', Transmission: 'Manual', Seats: '5 persons', Year: '2020' },
    includes: ['AC', 'Music system', 'GPS', '100 km/day', 'Fuel not included'],
    owner: { name: 'Mahesh Kulkarni', initials: 'MK', area: 'Shivaji Nagar · Responds fast', color: '#185fa5', bg: '#e6f1fb' },
    verified: true,
    iconColor: '#1a2a3a',
    icon: 'car-sport',
  },
  {
    id: '2',
    name: 'Toyota Innova Crysta',
    subtitle: 'Silver · 2019 · AC · Diesel · 7 seats',
    price: '₹1,200/day',
    location: 'Cidco',
    rating: '4.6',
    reviews: '21',
    photos: 3,
    type: 'SUV',
    specs: { Fuel: 'Diesel', Transmission: 'Automatic', Seats: '7 persons', Year: '2019' },
    includes: ['AC', 'GPS', 'Music system', '150 km/day', 'Driver available'],
    owner: { name: 'Ramesh Sharma', initials: 'RS', area: 'Cidco · Member since 2022', color: '#854f0b', bg: '#faeeda' },
    verified: true,
    iconColor: '#1e3a2f',
    icon: 'car',
  },
  {
    id: '3',
    name: 'Honda Activa 6G',
    subtitle: 'Blue · 2022 · Petrol · 60 km/l',
    price: '₹300/day',
    location: 'Sadar Bazar',
    rating: '4.9',
    reviews: '62',
    photos: 2,
    type: 'Bike',
    specs: { Fuel: 'Petrol', Type: 'Scooter', Mileage: '60 km/l', Year: '2022' },
    includes: ['Helmet included', 'Full tank', 'Lock & key'],
    owner: { name: 'Anil Deshmukh', initials: 'AD', area: 'Sadar · Responds fast', color: '#0f6e56', bg: '#e1f5ee' },
    verified: false,
    iconColor: '#2a1e3a',
    icon: 'bicycle',
  },
];

export default function CarsScreen() {
  const nav = useNavigation();
  const { t } = useLang();
  const [filter, setFilter] = useState('all');

  const filtered = CARS.filter(c => filter === 'all' || c.type === filter);

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
                <View style={s.ratingWrap}>
                  <Text style={s.ratingTxt}>★ {item.rating} ({item.reviews})</Text>
                </View>
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
