import React, { useState } from 'react';
import {
  View, Text, FlatList, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C } from '../utils/constants';

const { width } = Dimensions.get('window');

const FILTERS = ['All', 'Car', 'Bike', 'Auto', 'SUV'];

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
    iconColor: '#2d3a4a',
    icon: '🚗',
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
    icon: '🚙',
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
    icon: '🛵',
  },
];

export default function CarsScreen() {
  const nav = useNavigation();
  const [filter, setFilter] = useState('All');

  const filtered = CARS.filter(c => filter === 'All' || c.type === filter);

  return (
    <View style={s.container}>
      {/* Filter Pills */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.pills}
        style={{ maxHeight: 50 }}
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
              <Text style={s.carIcon}>{item.icon}</Text>
              <View style={s.photoThumbs}>
                {['Front', 'Side', 'Inside', 'Back'].slice(0, item.photos).map((lbl, i) => (
                  <View key={i} style={[s.thumb, i === 0 && s.thumbActive]}>
                    <Text style={[s.thumbTxt, i === 0 && s.thumbTxtActive]}>{lbl}</Text>
                  </View>
                ))}
              </View>
              <View style={s.photoBadge}>
                <Text style={s.photoBadgeTxt}>{item.photos} photos</Text>
              </View>
            </View>
            {/* Body */}
            <View style={s.body}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.subtitle}>{item.subtitle}</Text>
              <View style={s.metaRow}>
                <View style={s.tag}><Text style={s.tagTxt}>📍 {item.location}</Text></View>
                <View style={s.ratingWrap}>
                  <Text style={s.ratingTxt}>⭐ {item.rating} ({item.reviews})</Text>
                </View>
                <View style={s.priceBadge}><Text style={s.priceTxt}>{item.price}</Text></View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          <View style={s.listHeader}>
            <Text style={s.listHeaderTxt}>{filtered.length} vehicles available</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  pills: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  pill: {
    paddingVertical: 5, paddingHorizontal: 13, borderRadius: 20,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  pillOn: { backgroundColor: C.dark, borderColor: C.dark },
  pillTxt: { fontSize: 12, fontWeight: '600', color: '#555' },
  pillTxtOn: { color: '#fff' },

  card: {
    backgroundColor: C.card, borderRadius: 13,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 10, overflow: 'hidden',
  },
  imgStrip: { height: 150, alignItems: 'center', justifyContent: 'center' },
  carIcon: { fontSize: 48, opacity: 0.25, marginBottom: 8 },
  photoThumbs: { flexDirection: 'row', gap: 5 },
  thumb: {
    width: 44, height: 28, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
  },
  thumbTxt: { fontSize: 9, color: 'rgba(255,255,255,0.6)' },
  thumbTxtActive: { color: '#fff' },
  photoBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6, paddingVertical: 3, paddingHorizontal: 7,
  },
  photoBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '600' },

  body: { padding: 13 },
  name: { fontSize: 14, fontWeight: '700', color: C.text },
  subtitle: { fontSize: 11, color: C.muted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 9 },
  tag: { backgroundColor: '#f0f0f0', borderRadius: 5, paddingVertical: 3, paddingHorizontal: 7 },
  tagTxt: { fontSize: 10, color: C.muted },
  ratingWrap: { backgroundColor: '#f0f0f0', borderRadius: 5, paddingVertical: 3, paddingHorizontal: 7 },
  ratingTxt: { fontSize: 10, color: '#9a6200', fontWeight: '600' },
  priceBadge: { marginLeft: 'auto', backgroundColor: C.dark, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 9 },
  priceTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },

  listHeader: { paddingBottom: 4 },
  listHeaderTxt: { fontSize: 11, color: C.muted, fontWeight: '500' },
});
