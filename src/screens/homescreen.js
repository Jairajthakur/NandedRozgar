import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, RefreshControl, FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import JobCard from '../components/JobCard';
import VehicleCard from '../components/VehicleCard';
import RoomCard from '../components/RoomCard';
import { C } from '../utils/constants';

export default function HomeScreen() {
  const nav = useNavigation();
  const { jobs, vehicles, rooms, loadJobs, loadVehicles, loadRooms, role } = useAuth();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const activeJobs     = jobs.filter(j => j.status === 'active');
  const activeVehicles = (vehicles || []).filter(v => v.status === 'active');
  const activeRooms    = (rooms    || []).filter(r => r.status === 'active');

  const recentJobs     = [...activeJobs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3);
  const recentVehicles = [...activeVehicles].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 2);
  const recentRooms    = [...activeRooms].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 2);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([loadJobs(), loadVehicles?.(), loadRooms?.()]);
    setRefreshing(false);
  }

  function handleSearch() {
    if (!search.trim()) return;
    nav.navigate('Jobs', { initialSearch: search });
    setSearch('');
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
          colors={[C.dark]} tintColor={C.dark} />
      }
    >
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs, cars, rooms…"
          placeholderTextColor={C.muted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: C.muted, fontSize: 18, paddingRight: 10 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Free listings banner */}
      <TouchableOpacity
        style={styles.freeBanner}
        onPress={() => nav.navigate('Cars')}
        activeOpacity={0.85}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.freeBannerTitle}>Free listings this week</Text>
          <Text style={styles.freeBannerSub}>Cars & Rooms — no charges</Text>
        </View>
        <View style={styles.freeBannerBtn}>
          <Text style={{ color: C.dark, fontWeight: '700', fontSize: 12 }}>Post free</Text>
        </View>
      </TouchableOpacity>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statItem} onPress={() => nav.navigate('Jobs')}>
          <Text style={styles.statNum}>{activeJobs.length}</Text>
          <Text style={styles.statLabel}>JOBS</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statItem} onPress={() => nav.navigate('Cars')}>
          <Text style={styles.statNum}>{activeVehicles.length}</Text>
          <Text style={styles.statLabel}>CARS</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statItem} onPress={() => nav.navigate('Rooms')}>
          <Text style={styles.statNum}>{activeRooms.length}</Text>
          <Text style={styles.statLabel}>ROOMS</Text>
        </TouchableOpacity>
      </View>

      {/* Our Services */}
      <Text style={styles.sectionHeader}>OUR SERVICES</Text>
      <View style={styles.servicesGrid}>
        <TouchableOpacity style={[styles.serviceCard, { backgroundColor: '#e8f0fe' }]}
          onPress={() => nav.navigate('Jobs')}>
          <Text style={styles.serviceIcon}>💼</Text>
          <Text style={styles.serviceTitle}>Find Jobs</Text>
          <Text style={styles.serviceSub}>{activeJobs.length} openings nearby</Text>
          {activeJobs.length > 0 && (
            <View style={styles.openBadge}>
              <Text style={{ color: C.dark, fontSize: 10, fontWeight: '700' }}>
                {activeJobs.length} open
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.serviceCard, { backgroundColor: '#fef3e2' }]}
          onPress={() => nav.navigate('Cars')}>
          <Text style={styles.serviceIcon}>🚗</Text>
          <Text style={styles.serviceTitle}>Car Rental</Text>
          <Text style={styles.serviceSub}>{activeVehicles.length} vehicles available</Text>
          {activeVehicles.some(v => v.photos?.length > 0) && (
            <View style={[styles.openBadge, { backgroundColor: '#fde68a' }]}>
              <Text style={{ color: '#92400e', fontSize: 10, fontWeight: '700' }}>With photos</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.serviceCard, { backgroundColor: '#e6f7ee' }]}
          onPress={() => nav.navigate('Rooms')}>
          <Text style={styles.serviceIcon}>🏠</Text>
          <Text style={styles.serviceTitle}>Rooms & PG</Text>
          <Text style={styles.serviceSub}>{activeRooms.length} listings in city</Text>
          {activeRooms.some(r => r.photos?.length > 0) && (
            <View style={[styles.openBadge, { backgroundColor: '#bbf7d0' }]}>
              <Text style={{ color: '#166534', fontSize: 10, fontWeight: '700' }}>With photos</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.serviceCard, { borderStyle: 'dashed', borderColor: '#aaa', backgroundColor: '#fafafa' }]}
          onPress={() => nav.navigate('PostVehicle')}>
          <Text style={styles.serviceIcon}>➕</Text>
          <Text style={styles.serviceTitle}>List Your Vehicle</Text>
          <Text style={styles.serviceSub}>Earn from your car/bike</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>RECENT JOBS</Text>
            <TouchableOpacity onPress={() => nav.navigate('Jobs')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          {recentJobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onPress={() => nav.navigate('JobDetail', { job })}
            />
          ))}
        </>
      )}

      {/* Recent Vehicles */}
      {recentVehicles.length > 0 && (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>CARS AVAILABLE</Text>
            <TouchableOpacity onPress={() => nav.navigate('Cars')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          {recentVehicles.map(v => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              onPress={() => nav.navigate('VehicleDetail', { vehicle: v })}
            />
          ))}
        </>
      )}

      {/* Recent Rooms */}
      {recentRooms.length > 0 && (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>ROOMS & PG</Text>
            <TouchableOpacity onPress={() => nav.navigate('Rooms')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          {recentRooms.map(r => (
            <RoomCard
              key={r.id}
              room={r}
              onPress={() => nav.navigate('RoomDetail', { room: r })}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border,
    borderRadius: 9, margin: 12, marginBottom: 8, paddingLeft: 12,
  },
  searchIcon:  { fontSize: 15, marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 13, color: C.text },

  freeBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.dark, borderRadius: 12,
    marginHorizontal: 12, marginBottom: 12,
    padding: 16,
  },
  freeBannerTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  freeBannerSub:   { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
  freeBannerBtn: {
    backgroundColor: '#fff', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 14,
  },

  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 12, marginHorizontal: 12, marginBottom: 14,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
  },
  statItem:   { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statDivider:{ width: 1, backgroundColor: C.border },
  statNum:    { fontSize: 26, fontWeight: '800', color: C.text },
  statLabel:  { fontSize: 10, color: C.muted, fontWeight: '600', letterSpacing: 0.5, marginTop: 2 },

  sectionHeader: {
    fontSize: 11, fontWeight: '700', color: C.muted,
    letterSpacing: 0.8, paddingHorizontal: 12,
    marginBottom: 10, marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingRight: 12,
    marginTop: 4,
  },
  seeAll: { fontSize: 12, color: C.dark, fontWeight: '600' },

  servicesGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 10, marginBottom: 14,
  },
  serviceCard: {
    width: '47%', borderRadius: 14,
    borderWidth: 1.5, borderColor: 'transparent',
    padding: 14, minHeight: 110,
  },
  serviceIcon:  { fontSize: 28, marginBottom: 6 },
  serviceTitle: { fontWeight: '700', fontSize: 13, color: C.text, marginBottom: 2 },
  serviceSub:   { fontSize: 11, color: C.muted },
  openBadge: {
    marginTop: 8, backgroundColor: '#dbeafe',
    alignSelf: 'flex-start', borderRadius: 20,
    paddingVertical: 2, paddingHorizontal: 8,
  },
});
