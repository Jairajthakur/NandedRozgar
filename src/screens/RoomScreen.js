import React, { useState } from 'react';
import {
  View, Text, FlatList, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { useLang } from '../utils/i18n';

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
    icon: 'home',
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
    icon: 'business',
    specs: { Type: 'PG Shared', Deposit: '₹11,000', For: 'Girls', Floor: '1st floor' },
    amenities: ['Meals 2x/day', 'WiFi', 'CCTV', 'Wardrobe', 'Attached bath'],
    owner: { name: 'Meena Bhosale', initials: 'MB', area: 'Replies within 30 mins', color: '#854f0b', bg: '#faeeda' },
    verified: false,
  },
];

export default function RoomsScreen() {
  const nav = useNavigation();
  const { t } = useLang();
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
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            activeOpacity={0.85}
            onPress={() => nav.navigate('RoomDetail', { room: item })}
          >
            {/* Photo Strip */}
            <View style={[s.imgStrip, { backgroundColor: item.iconColor }]}>
              <Ionicons name={item.icon} size={36} color="#fff" />
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
