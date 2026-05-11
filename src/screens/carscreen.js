import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import VehicleCard from '../components/VehicleCard';
import { Empty } from '../components/UI';
import { C } from '../utils/constants';

const VEHICLE_TYPES = ['All', 'Car', 'Auto', 'Bike', 'Mini Truck'];

export default function CarsScreen() {
  const { vehicles, loadVehicles, role } = useAuth();
  const nav = useNavigation();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const activeVehicles = vehicles || [];

  const filtered = useMemo(() => {
    return activeVehicles.filter(v =>
      v.status === 'active' &&
      (type === 'All' || v.vehicle_type === type) &&
      (search === '' ||
        [v.title, v.area, v.description || '', v.fuel_type || '']
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase()))
    ).sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [activeVehicles, search, type]);

  async function onRefresh() {
    setRefreshing(true);
    await loadVehicles?.();
    setRefreshing(false);
  }

  const canPost = role === 'giver' || role === 'admin';

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search car, area…"
          placeholderTextColor={C.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: C.muted, fontSize: 18, paddingRight: 10 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Type pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pills}
        style={{ maxHeight: 46 }}
      >
        {VEHICLE_TYPES.map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setType(t)}
            style={[styles.pill, type === t && styles.pillActive]}
          >
            <Text style={[styles.pillText, type === t && styles.pillTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Listings */}
      <FlatList
        data={filtered}
        keyExtractor={v => String(v.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            colors={[C.dark]} tintColor={C.dark} />
        }
        renderItem={({ item }) => (
          <VehicleCard
            vehicle={item}
            onPress={() => nav.navigate('VehicleDetail', { vehicle: item })}
          />
        )}
        ListEmptyComponent={
          <Empty
            icon="🚗"
            title="No vehicles found"
            sub={search || type !== 'All' ? 'Try different filters' : 'No vehicles listed yet'}
            action={canPost ? () => nav.navigate('PostVehicle') : null}
            actionLabel="List Your Vehicle"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border,
    borderRadius: 9, margin: 12, marginBottom: 6, paddingLeft: 12,
  },
  searchIcon:  { fontSize: 15, marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 13, color: C.text },
  pills: { paddingHorizontal: 12, paddingBottom: 8, gap: 6 },
  pill: {
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card,
    paddingVertical: 5, paddingHorizontal: 13, borderRadius: 20,
  },
  pillActive:     { backgroundColor: C.dark, borderColor: C.dark },
  pillText:       { fontSize: 12, fontWeight: '600', color: '#555' },
  pillTextActive: { color: '#fff' },
  list: { padding: 12, paddingTop: 8 },
});
