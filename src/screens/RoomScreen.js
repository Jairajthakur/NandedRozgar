import React, { useState } from 'react';
import {
  View, Text, FlatList, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C } from '../utils/constants';

const FILTERS = ['All', 'PG', '1 BHK', '2 BHK', 'Boys', 'Girls'];

export const ROOMS = [
  {
    id: '1',
    name: 'Boys PG Near Station',
    subtitle: 'Single occupancy · Meals included · WiFi',
    price: '₹4,500/mo',
    location: 'Station Road',
    forGender: 'Boys',
    type: 'PG',
    available: true,
    availableLabel: 'Available',
    photos: 4,
    iconColor: '#1e2a3a',
    icon: '🏠',
    specs: { Type: 'PG Single', Deposit: '₹9,000', For: 'Boys', Floor: '2nd floor' },
    amenities: ['WiFi', 'Meals 2x/day', 'CCTV', 'Laundry', '24hr water'],
    owner: { name: 'Sunita Patil', initials: 'SP', area: 'Replies within 1 hr', color: '#0f6e56', bg: '#e1f5ee' },
    verified: true,
  },
  {
    id: '2',
    name: '1 BHK Furnished Flat',
    subtitle: 'Fully furnished · Cidco Colony · Ground floor',
    price: '₹7,000/mo',
    location: 'Cidco',
    forGender: 'Family/Single',
    type: '1 BHK',
    available: true,
    availableLabel: 'Available',
    photos: 3,
    iconColor: '#1a2e1e',
    icon: '🏡',
    specs: { Type: '1 BHK', Deposit: '₹14,000', For: 'Family', Floor: 'Ground' },
    amenities: ['Furnished', 'Parking', 'RO water', 'Power backup'],
    owner: { name: 'Prakash Joshi', initials: 'PJ', area: 'Responds in 2 hrs', color: '#185fa5', bg: '#e6f1fb' },
    verified: true,
  },
  {
    id: '3',
    name: 'Girls PG with Meals',
    subtitle: '2 meals/day · WiFi · CCTV · Shivaji Nagar',
    price: '₹5,500/mo',
    location: 'Shivaji Nagar',
    forGender: 'Girls',
    type: 'PG',
    available: false,
    availableLabel: '2 left',
    photos: 2,
    iconColor: '#2e1a1a',
    icon: '🏢',
    specs: { Type: 'PG Shared', Deposit: '₹11,000', For: 'Girls', Floor: '1st floor' },
    amenities: ['Meals 2x/day', 'WiFi', 'CCTV', 'Wardrobe', 'Attached bath'],
    owner: { name: 'Meena Bhosale', initials: 'MB', area: 'Replies within 30 mins', color: '#854f0b', bg: '#faeeda' },
    verified: false,
  },
];

export default function RoomsScreen() {
  const nav = useNavigation();
  const [filter, setFilter] = useState('All');

  const filtered = ROOMS.filter(r =>
    filter === 'All' ||
    r.type === filter ||
    r.forGender === filter
  );

  return (
    <View style={s.container}>
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
        keyExtractor={r => r.id}
        contentContainerStyle={{ padding: 12, paddingTop: 4 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            activeOpacity={0.85}
            onPress={() => nav.navigate('RoomDetail', { room: item })}
          >
            {/* Photo Strip */}
            <View style={[s.imgStrip, { backgroundColor: item.iconColor }]}>
              <Text style={s.roomIcon}>{item.icon}</Text>
              <View style={s.photoThumbs}>
                {['Room', 'Kitchen', 'Bath', 'Outside'].slice(0, item.photos).map((lbl, i) => (
                  <View key={i} style={[s.thumb, i === 0 && s.thumbActive]}>
                    <Text style={[s.thumbTxt, i === 0 && s.thumbTxtActive]}>{lbl}</Text>
                  </View>
                ))}
              </View>
              <View style={s.photoBadge}>
                <Text style={s.photoBadgeTxt}>{item.photos} photos</Text>
              </View>
              <View style={[s.availBadge, { backgroundColor: item.available ? 'rgba(29,158,117,0.85)' : 'rgba(186,117,23,0.85)' }]}>
                <Text style={s.availBadgeTxt}>{item.availableLabel}</Text>
              </View>
            </View>
            <View style={s.body}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.subtitle}>{item.subtitle}</Text>
              <View style={s.metaRow}>
                <View style={s.tag}><Text style={s.tagTxt}>📍 {item.location}</Text></View>
                <View style={s.tag}><Text style={s.tagTxt}>👤 {item.forGender}</Text></View>
                <View style={s.priceBadge}><Text style={s.priceTxt}>{item.price}</Text></View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          <View style={{ paddingBottom: 4 }}>
            <Text style={{ fontSize: 11, color: C.muted, fontWeight: '500' }}>{filtered.length} listings in Nanded</Text>
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
  roomIcon: { fontSize: 48, opacity: 0.25, marginBottom: 8 },
  photoThumbs: { flexDirection: 'row', gap: 5 },
  thumb: {
    width: 48, height: 30, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
  },
  thumbTxt: { fontSize: 8, color: 'rgba(255,255,255,0.6)' },
  thumbTxtActive: { color: '#fff' },
  photoBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6, paddingVertical: 3, paddingHorizontal: 7,
  },
  photoBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '600' },
  availBadge: {
    position: 'absolute', top: 8, right: 8,
    borderRadius: 5, paddingVertical: 3, paddingHorizontal: 7,
  },
  availBadgeTxt: { color: '#fff', fontSize: 8, fontWeight: '600' },

  body: { padding: 13 },
  name: { fontSize: 14, fontWeight: '700', color: C.text },
  subtitle: { fontSize: 11, color: C.muted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 9 },
  tag: { backgroundColor: '#f0f0f0', borderRadius: 5, paddingVertical: 3, paddingHorizontal: 7 },
  tagTxt: { fontSize: 10, color: C.muted },
  priceBadge: { marginLeft: 'auto', backgroundColor: C.dark, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 9 },
  priceTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
