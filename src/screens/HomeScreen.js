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
  const recentJobs = activeJobs.slice(0, 2);

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 24 }}>

      {/* ── Dark header band ── */}
      <View style={s.headerBand}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.greeting}>Good morning,</Text>
            <View style={s.locRow}>
              <Text style={s.pin}>📍</Text>
              <Text style={s.locText}>Nanded, Maharashtra</Text>
            </View>
          </View>
          {/* Profile icon — no letter, just icon tap to go to Profile */}
          <TouchableOpacity style={s.profileBtn} onPress={() => nav.navigate('Profile')} activeOpacity={0.8}>
            <Text style={s.profileIcon}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <TouchableOpacity style={s.searchBar} activeOpacity={0.8}>
          <Text style={s.searchIcon}>🔍</Text>
          <Text style={s.searchPlaceholder}>Search jobs, cars, rooms…</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stats row ── */}
      <View style={s.statsRow}>
        {[
          [activeJobs.length || 348, 'Jobs'],
          ['42',  'Cars'],
          ['120', 'Rooms'],
        ].map(([val, lbl]) => (
          <View key={lbl} style={s.statBox}>
            <Text style={s.statNum}>{val}</Text>
            <Text style={s.statLbl}>{lbl}</Text>
          </View>
        ))}
      </View>

      {/* ── Services grid ── */}
      <Text style={s.sectionTitle}>OUR SERVICES</Text>
      <View style={s.grid}>

        <TouchableOpacity style={s.card} onPress={() => nav.navigate('Jobs')} activeOpacity={0.85}>
          <View style={[s.cardIcon, { backgroundColor: '#fff7ed' }]}>
            <Text style={{ fontSize: 18 }}>💼</Text>
          </View>
          <Text style={s.cardTitle}>Find Jobs</Text>
          <Text style={s.cardSub}>{activeJobs.length || 348} openings</Text>
          <View style={[s.badge, { backgroundColor: '#fff7ed' }]}>
            <Text style={[s.badgeTxt, { color: '#c2410c' }]}>Live</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={s.card} onPress={() => nav.navigate('Cars')} activeOpacity={0.85}>
          <View style={[s.cardIcon, { backgroundColor: '#eff6ff' }]}>
            <Text style={{ fontSize: 18 }}>🚗</Text>
          </View>
          <Text style={s.cardTitle}>Car Rental</Text>
          <Text style={s.cardSub}>42 vehicles</Text>
          <View style={[s.badge, { backgroundColor: '#eff6ff' }]}>
            <Text style={[s.badgeTxt, { color: '#1d4ed8' }]}>With photos</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={s.card} onPress={() => nav.navigate('Rooms')} activeOpacity={0.85}>
          <View style={[s.cardIcon, { backgroundColor: '#f0fdf4' }]}>
            <Text style={{ fontSize: 18 }}>🏠</Text>
          </View>
          <Text style={s.cardTitle}>Rooms & PG</Text>
          <Text style={s.cardSub}>120 listings</Text>
          <View style={[s.badge, { backgroundColor: '#f0fdf4' }]}>
            <Text style={[s.badgeTxt, { color: '#15803d' }]}>With photos</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={s.card} onPress={() => nav.navigate('BuySell')} activeOpacity={0.85}>
          <View style={[s.cardIcon, { backgroundColor: '#fdf4ff' }]}>
            <Text style={{ fontSize: 18 }}>🏷️</Text>
          </View>
          <Text style={s.cardTitle}>Buy & Sell</Text>
          <Text style={s.cardSub}>New & used items</Text>
          <View style={[s.badge, { backgroundColor: '#fdf4ff' }]}>
            <Text style={[s.badgeTxt, { color: '#7e22ce' }]}>New</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Quick links row: AI Match + Profile ── */}
      <View style={s.quickRow}>
        <TouchableOpacity style={s.quickBtn} onPress={() => nav.navigate('AIMatch')} activeOpacity={0.85}>
          <Text style={{ fontSize: 16 }}>✨</Text>
          <Text style={s.quickTxt}>AI Job Match</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickBtn} onPress={() => nav.navigate('Profile')} activeOpacity={0.85}>
          <Text style={{ fontSize: 16 }}>👤</Text>
          <Text style={s.quickTxt}>My Profile</Text>
        </TouchableOpacity>
        {role === 'admin' && (
          <TouchableOpacity style={s.quickBtn} onPress={() => nav.navigate('Admin')} activeOpacity={0.85}>
            <Text style={{ fontSize: 16 }}>⚙️</Text>
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
            <View style={[s.jobThumb, { backgroundColor: '#fff7ed' }]}>
              <Text style={{ fontSize: 18 }}>💼</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.jobTitle} numberOfLines={1}>{job.title}</Text>
              <Text style={s.jobSub} numberOfLines={1}>{job.company} · {job.location}</Text>
            </View>
            <View style={s.priceBadge}><Text style={s.priceTxt}>{job.salary}</Text></View>
          </View>
          <View style={s.tagRow}>
            <View style={s.tag}><Text style={s.tagTxt}>🕐 Just posted</Text></View>
            {job.featured && (
              <View style={[s.tag, { backgroundColor: '#eff6ff' }]}>
                <Text style={[s.tagTxt, { color: '#1d4ed8' }]}>✓ Verified</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )) : (
        <>
          <TouchableOpacity style={s.jobCard} onPress={() => nav.navigate('Jobs')} activeOpacity={0.85}>
            <View style={s.jobRow}>
              <View style={[s.jobThumb, { backgroundColor: '#eff6ff' }]}>
                <Text style={{ fontSize: 18 }}>🚚</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.jobTitle}>Delivery Driver</Text>
                <Text style={s.jobSub}>Swiggy Partner · Shivaji Nagar</Text>
              </View>
              <View style={s.priceBadge}><Text style={s.priceTxt}>₹18k/mo</Text></View>
            </View>
            <View style={s.tagRow}>
              <View style={s.tag}><Text style={s.tagTxt}>🕐 2h ago</Text></View>
              <View style={[s.tag, { backgroundColor: '#f0fdf4' }]}>
                <Text style={[s.tagTxt, { color: '#15803d' }]}>✓ Verified</Text>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={s.jobCard} onPress={() => nav.navigate('Jobs')} activeOpacity={0.85}>
            <View style={s.jobRow}>
              <View style={[s.jobThumb, { backgroundColor: '#fff7ed' }]}>
                <Text style={{ fontSize: 18 }}>🏪</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.jobTitle}>Shop Assistant</Text>
                <Text style={s.jobSub}>Reliance Retail · Station Road</Text>
              </View>
              <View style={s.priceBadge}><Text style={s.priceTxt}>₹12k/mo</Text></View>
            </View>
            <View style={s.tagRow}>
              <View style={s.tag}><Text style={s.tagTxt}>🕐 5h ago</Text></View>
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
  container: { flex: 1, backgroundColor: C.bg },

  // ── Header band ──
  headerBand: { backgroundColor: '#111111', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  headerTop:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  greeting:   { color: '#888', fontSize: 12, marginBottom: 4 },
  locRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pin:        { fontSize: 13 },
  locText:    { color: '#ffffff', fontSize: 16, fontWeight: '700' },

  // Profile icon button — NO letter, just an icon circle
  profileBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#2a2a2a',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#444',
  },
  profileIcon: { fontSize: 16 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1e1e22', borderRadius: 12,
    borderWidth: 0.5, borderColor: '#333',
    paddingVertical: 10, paddingHorizontal: 14,
  },
  searchIcon:        { fontSize: 14 },
  searchPlaceholder: { fontSize: 13, color: '#555' },

  // ── Stats ──
  statsRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 12, marginTop: 12, marginBottom: 4 },
  statBox:  { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 9, padding: 10, alignItems: 'center' },
  statNum:  { fontSize: 16, fontWeight: '800', color: C.text },
  statLbl:  { fontSize: 8, color: C.muted, marginTop: 2, letterSpacing: 0.5, fontWeight: '600', textTransform: 'uppercase' },

  // ── Section title ──
  sectionTitle: {
    fontSize: 9, fontWeight: '700', color: C.muted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 12, paddingTop: 14, paddingBottom: 6,
  },

  // ── Services grid ──
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, paddingHorizontal: 12, marginBottom: 4 },
  card: { width: '47%', backgroundColor: C.card, borderRadius: 13, borderWidth: 1, borderColor: C.border, padding: 13 },
  cardIcon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: C.text },
  cardSub:   { fontSize: 10, color: C.muted, marginTop: 2 },
  badge:     { marginTop: 6, borderRadius: 5, paddingVertical: 2, paddingHorizontal: 6, alignSelf: 'flex-start' },
  badgeTxt:  { fontSize: 9, fontWeight: '700' },

  // ── Quick row (AI + Profile) ──
  quickRow: { flexDirection: 'row', gap: 9, paddingHorizontal: 12, marginTop: 4, marginBottom: 4 },
  quickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 10, paddingHorizontal: 12,
  },
  quickTxt: { fontSize: 12, fontWeight: '600', color: C.text },

  // ── Job cards ──
  jobCard:   { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginHorizontal: 12, marginBottom: 9, padding: 13 },
  jobRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 },
  jobThumb:  { width: 40, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  jobTitle:  { fontSize: 13, fontWeight: '700', color: C.text },
  jobSub:    { fontSize: 11, color: C.muted, marginTop: 1 },
  priceBadge:{ backgroundColor: C.dark, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 9 },
  priceTxt:  { color: '#fff', fontSize: 12, fontWeight: '700' },
  tagRow:    { flexDirection: 'row', gap: 5 },
  tag:       { backgroundColor: '#f0f0f0', borderRadius: 5, paddingVertical: 3, paddingHorizontal: 7 },
  tagTxt:    { fontSize: 10, color: C.muted },

  viewAll:    { marginHorizontal: 12, marginTop: 2, alignItems: 'center', padding: 10 },
  viewAllTxt: { fontSize: 12, color: C.muted, fontWeight: '600' },
});
