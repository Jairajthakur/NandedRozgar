import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { C } from '../utils/constants';

export default function HomeScreen() {
  const nav = useNavigation();
  const { jobs, user, role } = useAuth();

  const activeJobs = jobs?.filter(j => j.status === 'active') || [];
  const recentJobs = activeJobs.slice(0, 3);

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }}>

      {/* ── Dark header band ── */}
      <View style={s.headerBand}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.brandText}>
              <Text style={s.brandNanded}>Nanded</Text>
              <Text style={s.brandRozgar}>Rozgar</Text>
            </Text>
            <View style={s.locRow}>
              <Text style={s.pin}>📍</Text>
              <Text style={s.locText}>Nanded, Maharashtra</Text>
            </View>
          </View>
          <TouchableOpacity style={s.profileBtn} onPress={() => nav.navigate('Profile')} activeOpacity={0.8}>
            <Text style={s.profileInitial}>{user?.name?.[0]?.toUpperCase() || 'N'}</Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <TouchableOpacity style={s.searchBar} activeOpacity={0.8}>
          <Text style={s.searchIcon}>🔍</Text>
          <Text style={s.searchPlaceholder}>Search jobs, cars, rooms…</Text>
        </TouchableOpacity>
      </View>

      {/* ── Filter chips row ── */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
        style={{ maxHeight: 52 }}
      >
        {['All', 'Jobs', 'Cars', 'Rooms', 'Buy & Sell'].map((f, i) => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, i === 0 && s.filterChipActive]}
            activeOpacity={0.8}
          >
            <Text style={[s.filterChipTxt, i === 0 && s.filterChipTxtActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Services grid ── */}
      <Text style={s.sectionTitle}>OUR SERVICES</Text>
      <View style={s.grid}>

        <TouchableOpacity style={s.card} onPress={() => nav.navigate('Jobs')} activeOpacity={0.85}>
          <View style={s.cardBadgeRow}>
            <View style={[s.cardIcon, { backgroundColor: '#fff3e8' }]}>
              <Text style={{ fontSize: 22 }}>💼</Text>
            </View>
            <View style={[s.liveBadge, { borderColor: '#16a34a', backgroundColor: '#f0fdf4' }]}>
              <View style={s.liveDot} />
              <Text style={[s.liveTxt, { color: '#16a34a' }]}>Live</Text>
            </View>
          </View>
          <Text style={s.cardTitle}>Find Jobs</Text>
          <Text style={s.cardSub}>{activeJobs.length || 1} opening</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.card} onPress={() => nav.navigate('Cars')} activeOpacity={0.85}>
          <View style={s.cardBadgeRow}>
            <View style={[s.cardIcon, { backgroundColor: '#e8f4ff' }]}>
              <Text style={{ fontSize: 22 }}>🚗</Text>
            </View>
          </View>
          <Text style={s.cardTitle}>Car Rental</Text>
          <Text style={s.cardSub}>42 vehicles</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.card} onPress={() => nav.navigate('Rooms')} activeOpacity={0.85}>
          <View style={s.cardBadgeRow}>
            <View style={[s.cardIcon, { backgroundColor: '#f0f4ff' }]}>
              <Text style={{ fontSize: 22 }}>🏢</Text>
            </View>
          </View>
          <Text style={s.cardTitle}>Rooms & PG</Text>
          <Text style={s.cardSub}>120 listings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.card} onPress={() => nav.navigate('BuySell')} activeOpacity={0.85}>
          <View style={s.cardBadgeRow}>
            <View style={[s.cardIcon, { backgroundColor: '#fdf0ff' }]}>
              <Text style={{ fontSize: 22 }}>🏷️</Text>
            </View>
            <View style={[s.liveBadge, { borderColor: '#9333ea', backgroundColor: '#fdf4ff' }]}>
              <Text style={[s.liveTxt, { color: '#9333ea' }]}>New</Text>
            </View>
          </View>
          <Text style={s.cardTitle}>Buy & Sell</Text>
          <Text style={s.cardSub}>New & used items</Text>
        </TouchableOpacity>

      </View>

      {/* ── Quick access row ── */}
      <View style={s.quickRow}>
        <TouchableOpacity style={s.quickBtn} onPress={() => nav.navigate('AIMatch')} activeOpacity={0.85}>
          <Text style={{ fontSize: 15 }}>✨</Text>
          <Text style={s.quickTxt}>AI Job Match</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickBtn} onPress={() => nav.navigate('Profile')} activeOpacity={0.85}>
          <Text style={{ fontSize: 15 }}>👤</Text>
          <Text style={s.quickTxt}>My Profile</Text>
        </TouchableOpacity>
        {role === 'admin' && (
          <TouchableOpacity style={s.quickBtn} onPress={() => nav.navigate('Admin')} activeOpacity={0.85}>
            <Text style={{ fontSize: 15 }}>⚙️</Text>
            <Text style={s.quickTxt}>Admin</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Recent Jobs ── */}
      <Text style={s.sectionTitle}>RECENT JOBS</Text>

      {recentJobs.length > 0 ? recentJobs.map(job => (
        <TouchableOpacity key={job.id} style={s.jobCard}
          onPress={() => nav.navigate('JobDetail', { job })} activeOpacity={0.85}>
          <View style={s.jobRow}>
            <View style={s.jobThumb}>
              <Text style={{ fontSize: 20 }}>💼</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.jobTitle} numberOfLines={1}>{job.title}</Text>
              <Text style={s.jobSub} numberOfLines={1}>{job.company} · {job.location}</Text>
              <Text style={s.jobTime}>Just posted</Text>
            </View>
            <View style={s.priceBadge}>
              <Text style={s.priceTxt}>{job.salary}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )) : (
        <>
          <TouchableOpacity style={s.jobCard} onPress={() => nav.navigate('Jobs')} activeOpacity={0.85}>
            <View style={s.jobRow}>
              <View style={s.jobThumb}>
                <Text style={{ fontSize: 20 }}>📞</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.jobTitle}>Telecaller</Text>
                <Text style={s.jobSub}>Dhanraj Enterprises · Nanded</Text>
                <Text style={s.jobTime}>Just posted</Text>
              </View>
              <View style={s.priceBadge}>
                <Text style={s.priceTxt}>₹12,000</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.jobCard} onPress={() => nav.navigate('Jobs')} activeOpacity={0.85}>
            <View style={s.jobRow}>
              <View style={s.jobThumb}>
                <Text style={{ fontSize: 20 }}>🌐</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.jobTitle}>Web Developer</Text>
                <Text style={s.jobSub}>TechSoft Solutions · Nanded</Text>
                <Text style={s.jobTime}>2 hours ago</Text>
              </View>
              <View style={s.priceBadge}>
                <Text style={s.priceTxt}>₹25,000</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.jobCard} onPress={() => nav.navigate('Jobs')} activeOpacity={0.85}>
            <View style={s.jobRow}>
              <View style={s.jobThumb}>
                <Text style={{ fontSize: 20 }}>🏪</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.jobTitle}>Shop Assistant</Text>
                <Text style={s.jobSub}>Reliance Retail · Station Road</Text>
                <Text style={s.jobTime}>5 hours ago</Text>
              </View>
              <View style={s.priceBadge}>
                <Text style={s.priceTxt}>₹12,000</Text>
              </View>
            </View>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={() => nav.navigate('Jobs')} style={s.viewAll}>
        <Text style={s.viewAllTxt}>View all jobs →</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  // ── Header band ──
  headerBand: {
    backgroundColor: '#111111',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  brandText: { fontSize: 22, fontWeight: '900', letterSpacing: 0.2 },
  brandNanded: { color: '#ffffff' },
  brandRozgar: { color: '#f97316' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  pin: { fontSize: 12 },
  locText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },

  profileBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#f97316',
    alignItems: 'center', justifyContent: 'center',
  },
  profileInitial: { color: '#fff', fontSize: 16, fontWeight: '800' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1e1e22', borderRadius: 10,
    paddingVertical: 11, paddingHorizontal: 14,
    borderWidth: 0.5, borderColor: '#333',
  },
  searchIcon: { fontSize: 13 },
  searchPlaceholder: { fontSize: 13, color: '#555' },

  // ── Filter chips ──
  filterRow: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, alignItems: 'center' },
  filterChip: {
    paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0',
  },
  filterChipActive: { backgroundColor: '#f97316', borderColor: '#f97316' },
  filterChipTxt: { fontSize: 12, fontWeight: '600', color: '#555' },
  filterChipTxtActive: { color: '#fff' },

  // ── Section title ──
  sectionTitle: {
    fontSize: 10, fontWeight: '700', color: '#999',
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },

  // ── Services grid ──
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 10, marginBottom: 4,
  },
  card: {
    width: '47%',
    backgroundColor: '#ffffff', borderRadius: 14,
    borderWidth: 1, borderColor: '#ebebeb',
    padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardIcon: {
    width: 42, height: 42, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, borderRadius: 20,
    paddingVertical: 3, paddingHorizontal: 8,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#16a34a' },
  liveTxt: { fontSize: 10, fontWeight: '700' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111' },
  cardSub: { fontSize: 11, color: '#888', marginTop: 2 },

  // ── Quick row ──
  quickRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, marginTop: 4, marginBottom: 4 },
  quickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#ffffff', borderRadius: 10,
    borderWidth: 1, borderColor: '#ebebeb',
    paddingVertical: 10, paddingHorizontal: 12,
  },
  quickTxt: { fontSize: 12, fontWeight: '600', color: '#111' },

  // ── Job cards ──
  jobCard: {
    backgroundColor: '#ffffff', borderRadius: 12,
    borderWidth: 1, borderColor: '#ebebeb',
    marginHorizontal: 12, marginBottom: 8, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.03,
    shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  jobThumb: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: '#fff7ed',
    alignItems: 'center', justifyContent: 'center',
  },
  jobTitle: { fontSize: 14, fontWeight: '700', color: '#111' },
  jobSub: { fontSize: 12, color: '#777', marginTop: 1 },
  jobTime: { fontSize: 11, color: '#aaa', marginTop: 2 },
  priceBadge: {
    backgroundColor: '#111', borderRadius: 7,
    paddingVertical: 5, paddingHorizontal: 10,
  },
  priceTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  viewAll: { marginHorizontal: 12, marginTop: 4, alignItems: 'center', padding: 10 },
  viewAllTxt: { fontSize: 13, color: '#f97316', fontWeight: '700' },
});
