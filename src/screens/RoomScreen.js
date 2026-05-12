import React, { useState } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C } from '../utils/constants';

const FILTERS = ['All', 'PG / Hostel', '1 BHK', '2 BHK', 'Single Room', 'For Girls'];

export const ROOMS = [
  {
    id: '1', name: 'Boys PG Near Station', subtitle: 'Single occupancy · Meals included · WiFi',
    price: '₹4,500/mo', location: 'Station Road', forGender: 'Boys', type: 'PG',
    available: true, availableLabel: 'Available', photos: 4, iconColor: '#1e2a3a', icon: '🏠',
    specs: { Type: 'PG Single', Deposit: '₹9,000', For: 'Boys', Floor: '2nd floor' },
    amenities: ['WiFi', 'Meals 2x/day', 'CCTV', 'Laundry', '24hr water'],
    owner: { name: 'Sunita Patil', initials: 'SP', area: 'Replies within 1 hr', color: '#0f6e56', bg: '#e1f5ee' },
    verified: true,
  },
  {
    id: '2', name: '1 BHK Furnished Flat', subtitle: 'Fully furnished · Cidco Colony · Ground floor',
    price: '₹7,000/mo', location: 'Cidco', forGender: 'Family/Single', type: '1 BHK',
    available: true, availableLabel: 'Available', photos: 3, iconColor: '#1a2e1e', icon: '🏡',
    specs: { Type: '1 BHK', Deposit: '₹14,000', For: 'Family', Floor: 'Ground' },
    amenities: ['Furnished', 'Parking', 'RO water', 'Power backup'],
    owner: { name: 'Prakash Joshi', initials: 'PJ', area: 'Responds in 2 hrs', color: '#185fa5', bg: '#e6f1fb' },
    verified: true,
  },
  {
    id: '3', name: 'Girls PG with Meals', subtitle: '2 meals/day · WiFi · CCTV · Shivaji Nagar',
    price: '₹5,500/mo', location: 'Shivaji Nagar', forGender: 'Girls', type: 'PG',
    available: false, availableLabel: '2 left', photos: 2, iconColor: '#2e1a1a', icon: '🏢',
    specs: { Type: 'PG Shared', Deposit: '₹11,000', For: 'Girls', Floor: '1st floor' },
    amenities: ['Meals 2x/day', 'WiFi', 'CCTV', 'Wardrobe', 'Attached bath'],
    owner: { name: 'Meena Bhosale', initials: 'MB', area: 'Replies within 30 mins', color: '#854f0b', bg: '#faeeda' },
    verified: false,
  },
  {
    id: '4', name: '2 BHK Flat — Vazirabad', subtitle: 'Semi-furnished · Parking · Family preferred',
    price: '₹9,000/mo', location: 'Vazirabad', forGender: 'Family', type: '2 BHK',
    available: true, availableLabel: 'Available', photos: 3, iconColor: '#2a2a2a', icon: '🏘️',
    specs: { Type: '2 BHK', Deposit: '₹18,000', For: 'Family', Floor: '1st floor' },
    amenities: ['Parking', 'Semi-furnished', '2 Beds', '2 Baths'],
    owner: { name: 'Kiran Properties', initials: 'KP', area: 'Responds in 1 hr', color: '#333', bg: '#f0f0f0' },
    verified: true,
  },
];

export default function RoomsScreen() {
  const nav = useNavigation();
  const [filter, setFilter] = useState('All');

  const filtered = ROOMS.filter(r =>
    filter === 'All' || r.type === filter || r.type.includes(filter.replace('/ Hostel','').trim()) ||
    (filter === 'For Girls' && r.forGender === 'Girls')
  );

  return (
    <View style={s.container}>
      {/* Dark Header */}
      <View style={s.hdr}>
        <Text style={s.hdrTitle}>Rooms & PG</Text>
        <Text style={s.hdrSub}>120 listings in Nanded</Text>
        <View style={s.searchBar}>
          <Text style={s.searchIcon}>🔍</Text>
          <Text style={s.searchPlaceholder}>Search by area, type…</Text>
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
        keyExtractor={r => r.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} activeOpacity={0.85}
            onPress={() => nav.navigate('RoomDetail', { room: item })}>
            {/* Image Area */}
            <View style={[s.cardImg, { backgroundColor: item.iconColor }]}>
              <Text style={s.cardImgIcon}>{item.icon}</Text>
              <View style={s.photoBadge}><Text style={s.photoBadgeTxt}>{item.photos} photos</Text></View>
              <View style={[s.availBadge, { backgroundColor: item.available ? 'rgba(255,255,255,0.92)' : 'rgba(255,200,100,0.92)' }]}>
                <Text style={s.availBadgeTxt}>{item.availableLabel}</Text>
              </View>
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
                  <Text style={s.pricePer}>/mo</Text>
                </View>
              </View>
              <View style={s.badgesRow}>
                {item.amenities.slice(0, 2).map((a, i) => (
                  <View key={i} style={s.badge}><Text style={s.badgeTxt}>{a}</Text></View>
                ))}
                <View style={[s.badge, s.badgeDark]}>
                  <Text style={[s.badgeTxt, { color: '#fff' }]}>{item.forGender === 'Girls' ? 'Girls Only' : item.forGender === 'Boys' ? 'Boys Only' : 'Family OK'}</Text>
                </View>
              </View>
              <View style={s.specsRow}>
                <View style={s.spec}><Text style={s.specTxt}>🛏 {item.specs.Type}</Text></View>
                <View style={s.spec}><Text style={s.specTxt}>🏢 {item.specs.Floor}</Text></View>
                {item.verified && <View style={s.spec}><Text style={s.specTxt}>✓ Verified</Text></View>}
              </View>
              <View style={s.actRow}>
                <TouchableOpacity style={s.actOut}>
                  <Text style={s.actOutTxt}>📞 Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actPrim} onPress={() => nav.navigate('RoomDetail', { room: item })}>
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
  availBadge: { position: 'absolute', top: 8, right: 8, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, borderWidth: 1, borderColor: '#ddd' },
  availBadgeTxt: { color: '#111', fontSize: 9, fontWeight: '700' },

  cardBody: { padding: 13 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#111', lineHeight: 18 },
  cardSub: { fontSize: 10, color: '#888', marginTop: 2 },
  priceTag: { backgroundColor: '#111', borderRadius: 7, paddingVertical: 5, paddingHorizontal: 10, alignItems: 'flex-end', flexShrink: 0 },
  priceTxt: { fontSize: 12, color: '#fff', fontWeight: '700' },
  pricePer: { fontSize: 9, color: 'rgba(255,255,255,0.55)' },

  badgesRow: { flexDirection: 'row', gap: 5, marginBottom: 8, flexWrap: 'wrap' },
  badge: { backgroundColor: '#F4F4F4', borderRadius: 5, paddingVertical: 3, paddingHorizontal: 8 },
  badgeDark: { backgroundColor: '#111' },
  badgeTxt: { fontSize: 10, color: '#555', fontWeight: '600' },

  specsRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginBottom: 10 },
  spec: { backgroundColor: '#F4F4F4', borderRadius: 5, paddingVertical: 3, paddingHorizontal: 8 },
  specTxt: { fontSize: 10, color: '#666' },

  actRow: { flexDirection: 'row', gap: 7 },
  actOut: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ddd' },
  actOutTxt: { fontSize: 11, fontWeight: '700', color: '#111' },
  actPrim: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', backgroundColor: '#111' },
  actPrimTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },
});
