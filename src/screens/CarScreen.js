import React, { useState } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C } from '../utils/constants';

const FILTERS = ['All', 'Car', 'Bike', 'Auto', 'SUV'];

const CARS = [
  {
    id: '1', name: 'Maruti Swift Dzire', subtitle: 'White · 2020 · AC · Petrol · 5 seats',
    price: '₹600/day', location: 'Shivaji Nagar', rating: '4.8', reviews: '38', photos: 4,
    type: 'Car', specs: { Fuel: 'Petrol', Transmission: 'Manual', Seats: '5 persons', Year: '2020' },
    includes: ['AC', 'Music system', 'GPS', '100 km/day', 'Fuel not included'],
    owner: { name: 'Mahesh Kulkarni', initials: 'MK', area: 'Shivaji Nagar · Responds fast', color: '#185fa5', bg: '#e6f1fb' },
    verified: true, iconColor: '#2d3a4a', icon: '🚗',
  },
  {
    id: '2', name: 'Toyota Innova Crysta', subtitle: 'Silver · 2019 · AC · Diesel · 7 seats',
    price: '₹1,200/day', location: 'Cidco', rating: '4.6', reviews: '21', photos: 3,
    type: 'SUV', specs: { Fuel: 'Diesel', Transmission: 'Automatic', Seats: '7 persons', Year: '2019' },
    includes: ['AC', 'GPS', 'Music system', '150 km/day', 'Driver available'],
    owner: { name: 'Ramesh Sharma', initials: 'RS', area: 'Cidco · Member since 2022', color: '#854f0b', bg: '#faeeda' },
    verified: true, iconColor: '#1e3a2f', icon: '🚙',
  },
  {
    id: '3', name: 'Honda Activa 6G', subtitle: 'Blue · 2022 · Petrol · 60 km/l',
    price: '₹300/day', location: 'Sadar Bazar', rating: '4.9', reviews: '62', photos: 2,
    type: 'Bike', specs: { Fuel: 'Petrol', Type: 'Scooter', Mileage: '60 km/l', Year: '2022' },
    includes: ['Helmet included', 'Full tank', 'Lock & key'],
    owner: { name: 'Anil Deshmukh', initials: 'AD', area: 'Sadar · Responds fast', color: '#0f6e56', bg: '#e1f5ee' },
    verified: false, iconColor: '#2a1e3a', icon: '🛵',
  },
];

export default function CarsScreen() {
  const nav = useNavigation();
  const [filter, setFilter] = useState('All');
  const filtered = CARS.filter(c => filter === 'All' || c.type === filter);

  return (
    <View style={s.container}>
      {/* Dark Header */}
      <View style={s.hdr}>
        <Text style={s.hdrTitle}>Car Rental</Text>
        <Text style={s.hdrSub}>42 vehicles in Nanded</Text>
        <View style={s.searchBar}>
          <Text style={s.searchIcon}>🔍</Text>
          <Text style={s.searchPlaceholder}>Search by car, location…</Text>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={s.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[s.chip, filter === f && s.chipOn]}>
              <Text style={[s.chipTxt, filter === f && s.chipTxtOn]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} activeOpacity={0.85}
            onPress={() => nav.navigate('CarDetail', { car: item })}>
            {/* Image Area */}
            <View style={[s.cardImg, { backgroundColor: item.iconColor }]}>
              <Text style={s.cardImgIcon}>{item.icon}</Text>
              <View style={s.photoBadge}><Text style={s.photoBadgeTxt}>{item.photos} photos</Text></View>
              <View style={s.availBadge}><Text style={s.availBadgeTxt}>Available</Text></View>
            </View>
            {/* Body */}
            <View style={s.cardBody}>
              <View style={s.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{item.name}</Text>
                  <Text style={s.cardSub}>📍 {item.location} · {item.owner.name}</Text>
                </View>
                <View style={s.priceTag}>
                  <Text style={s.priceTxt}>{item.price.split('/')[0]}</Text>
                  <Text style={s.pricePer}>/day</Text>
                </View>
              </View>
              <View style={s.specsRow}>
                {Object.entries(item.specs).slice(0, 3).map(([k, v]) => (
                  <View key={k} style={s.spec}><Text style={s.specTxt}>{v}</Text></View>
                ))}
                {item.verified && <View style={s.spec}><Text style={s.specTxt}>✓ Verified</Text></View>}
              </View>
              <View style={s.actRow}>
                <TouchableOpacity style={s.actOut}>
                  <Text style={s.actOutTxt}>📞 Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actPrim} onPress={() => nav.navigate('CarDetail', { car: item })}>
                  <Text style={s.actPrimTxt}>View Details →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F4' },

  hdr: { backgroundColor: '#111', paddingTop: 12, paddingHorizontal: 16, paddingBottom: 14 },
  hdrTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  hdrSub: { fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 2 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 10, padding: 9, paddingHorizontal: 12, marginTop: 10 },
  searchIcon: { fontSize: 14 },
  searchPlaceholder: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },

  chipsWrap: { backgroundColor: '#111', paddingBottom: 13 },
  chips: { paddingHorizontal: 12, gap: 6 },
  chip: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 13 },
  chipOn: { backgroundColor: '#fff', borderColor: '#fff' },
  chipTxt: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  chipTxtOn: { color: '#111' },

  list: { padding: 12, paddingTop: 10, paddingBottom: 24 },

  card: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 9, borderWidth: 1, borderColor: '#E8E8E8', overflow: 'hidden' },
  cardImg: { height: 120, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cardImgIcon: { fontSize: 40, opacity: 0.25 },
  photoBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 7 },
  photoBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '600' },
  availBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#fff', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, borderWidth: 1, borderColor: '#ddd' },
  availBadgeTxt: { color: '#111', fontSize: 9, fontWeight: '700' },

  cardBody: { padding: 13 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#111', lineHeight: 18 },
  cardSub: { fontSize: 10, color: '#888', marginTop: 2 },
  priceTag: { backgroundColor: '#111', borderRadius: 7, paddingVertical: 5, paddingHorizontal: 10, alignItems: 'flex-end', flexShrink: 0 },
  priceTxt: { fontSize: 12, color: '#fff', fontWeight: '700' },
  pricePer: { fontSize: 9, color: 'rgba(255,255,255,0.55)' },

  specsRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginBottom: 10 },
  spec: { backgroundColor: '#F4F4F4', borderRadius: 5, paddingVertical: 3, paddingHorizontal: 8 },
  specTxt: { fontSize: 10, color: '#666' },

  actRow: { flexDirection: 'row', gap: 7 },
  actOut: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ddd' },
  actOutTxt: { fontSize: 11, fontWeight: '700', color: '#111' },
  actPrim: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', backgroundColor: '#111' },
  actPrimTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },
});
