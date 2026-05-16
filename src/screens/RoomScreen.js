import React, { useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const ORANGE = '#f97316';

export const ROOMS = [
  {
    id: 'r1', title: '1BHK Flat – Vazirabad', location: 'Vazirabad', type: '1BHK',
    rent: '₹5,500/mo', available: true, description: 'Spacious 1BHK flat available for rent near Vazirabad bus stand. 24hr water, electricity. Suitable for working professionals.',
    phone: '9876543210', timestamp: Date.now() - 86400000 * 2,
  },
  {
    id: 'r2', title: 'Single Room – Station Road', location: 'Station Road', type: 'Single',
    rent: '₹3,000/mo', available: true, description: 'Furnished single room near railway station. Ideal for students and working bachelors.',
    phone: '9812345678', timestamp: Date.now() - 86400000 * 5,
  },
  {
    id: 'r3', title: 'PG for Girls – Shivaji Nagar', location: 'Shivaji Nagar', type: 'PG',
    rent: '₹4,200/mo', available: true, description: 'Girls PG with home-cooked meals, AC rooms, Wi-Fi. Safe and secure location.',
    phone: '9765432109', timestamp: Date.now() - 86400000 * 1,
  },
  {
    id: 'r4', title: '2BHK – Vazirabad Main Road', location: 'Vazirabad', type: '2BHK',
    rent: '₹8,000/mo', available: false, description: 'Well-maintained 2BHK flat with parking. Suitable for families.',
    phone: '9898989898', timestamp: Date.now() - 86400000 * 10,
  },
];

const TYPES = ['All', '1BHK', '2BHK', 'Single', 'PG', 'Hostel'];

export default function RoomScreen() {
  const nav = useNavigation();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');

  const filtered = ROOMS.filter(r =>
    (type === 'All' || r.type === type) &&
    (search === '' || r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.location.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color="#aaa" />
        <TextInput style={styles.searchInput} placeholder="Search rooms, area..."
          placeholderTextColor="#aaa" value={search} onChangeText={setSearch} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pills}>
        {TYPES.map(t => (
          <TouchableOpacity key={t} style={[styles.pill, type === t && styles.pillActive]}
            onPress={() => setType(t)}>
            <Text style={[styles.pillTxt, type === t && styles.pillTxtActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.countTxt}>{filtered.length} rooms found</Text>

      <FlatList
        data={filtered}
        keyExtractor={r => r.id}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}
            onPress={() => nav.navigate('RoomDetail', { room: item })}
            activeOpacity={0.85}>
            <View style={styles.cardTop}>
              <View style={styles.imgPlaceholder}>
                <Ionicons name="home-outline" size={32} color="#ccc" />
              </View>
              <View style={[styles.badge, item.available ? styles.badgeGreen : styles.badgeGray]}>
                <Text style={styles.badgeTxt}>{item.available ? 'Available' : 'Occupied'}</Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={styles.row}>
                <Ionicons name="location-outline" size={12} color="#888" />
                <Text style={styles.cardSub}>{item.location}</Text>
                <View style={styles.typeBadge}><Text style={styles.typeTxt}>{item.type}</Text></View>
              </View>
              <View style={styles.rentRow}>
                <Text style={styles.rent}>{item.rent}</Text>
                <TouchableOpacity style={styles.contactBtn}
                  onPress={() => nav.navigate('RoomDetail', { room: item })}>
                  <Text style={styles.contactTxt}>View Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 60 }}>
            <Ionicons name="home-outline" size={48} color="#ccc" style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#555' }}>No rooms found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5', paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#111' },
  pills: { paddingHorizontal: 12, gap: 8, paddingBottom: 8 },
  pill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e5e5' },
  pillActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  pillTxt: { fontSize: 12, fontWeight: '600', color: '#555' },
  pillTxtActive: { color: '#fff' },
  countTxt: { fontSize: 12, color: '#888', paddingHorizontal: 14, marginBottom: 4, fontWeight: '500' },
  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#ebebeb', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTop: { height: 140, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  imgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 10, right: 10, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  badgeGreen: { backgroundColor: '#16a34a' },
  badgeGray: { backgroundColor: '#888' },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardBody: { padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  cardSub: { fontSize: 12, color: '#888', flex: 1 },
  typeBadge: { backgroundColor: '#eff6ff', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4 },
  typeTxt: { fontSize: 11, color: '#2563eb', fontWeight: '600' },
  rentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rent: { fontSize: 16, fontWeight: '800', color: '#111' },
  contactBtn: { backgroundColor: ORANGE, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 8 },
  contactTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
