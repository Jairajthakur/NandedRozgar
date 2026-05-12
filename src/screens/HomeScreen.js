import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { C } from '../utils/constants';

const ORANGE = '#f97316';

export default function HomeScreen() {
  const nav = useNavigation();
  const { jobs, user, role } = useAuth();

  const activeJobs = jobs?.filter(j => j.status === 'active') || [];
  const recentJobs = activeJobs.slice(0, 3);

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }}>

      {/* ── Dark header ── */}
      <View style={s.headerBand}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.brandText}>
              <Text style={s.brandNanded}>Nanded</Text>
              <Text style={s.brandRozgar}>Rozgar</Text>
            </Text>
            <View style={s.locRow}>
              <Ionicons name="location-sharp" size={13} color="#f97316" />
              <Text style={s.locText}>Nanded, Maharashtra</Text>
            </View>
          </View>
          <TouchableOpacity style={s.profileBtn} onPress={() => nav.navigate('Profile')} activeOpacity={0.8}>
            <Text style={s.profileInitial}>{user?.name?.[0]?.toUpperCase() || 'N'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Services grid ── */}
      <Text style={s.sectionTitle}>OUR SERVICES</Text>
      <View style={s.grid}>

        <TouchableOpacity style={s.card} onPress={() => nav.navigate('Jobs')} activeOpacity={0.85}>
          <View style={s.cardBadgeRow}>
            <View style={[s.cardIcon, { backgroundColor: '#fff3e8' }]}>
              <Ionicons name="briefcase" size={22} color={ORANGE} />
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
              <Ionicons name="car-sport" size={22} color="#3b82f6" />
            </View>
          </View>
          <Text style={s.cardTitle}>Car Rental</Text>
          <Text style={s.cardSub}>42 vehicles</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.card} onPress={() => nav.navigate('Rooms')} activeOpacity={0.85}>
          <View style={s.cardBadgeRow}>
            <View style={[s.cardIcon, { backgroundColor: '#f0f4ff' }]}>
              <Ionicons name="business" size={22} color="#6366f1" />
            </View>
          </View>
          <Text style={s.cardTitle}>Rooms & PG</Text>
          <Text style={s.cardSub}>120 listings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.card} onPress={() => nav.navigate('BuySell')} activeOpacity={0.85}>
          <View style={s.cardBadgeRow}>
            <View style={[s.cardIcon, { backgroundColor: '#fdf0ff' }]}>
              <Ionicons name="pricetag" size={22} color="#9333ea" />
            </View>
            <View style={[s.liveBadge, { borderColor: '#9333ea', backgroundColor: '#fdf4ff' }]}>
              <Text style={[s.liveTxt, { color: '#9333ea' }]}>New</Text>
            </View>
          </View>
          <Text style={s.cardTitle}>Buy & Sell</Text>
          <Text style={s.cardSub}>New & used items</Text>
        </TouchableOpacity>

      </View>

      {/* ── Quick access ── */}
      <View style={s.quickRow}>
        <TouchableOpacity style={s.quickBtn} onPress={() => nav.navigate('AIMatch')} activeOpacity={0.85}>
          <Ionicons name="sparkles" size={16} color={ORANGE} />
          <Text style={s.quickTxt}>AI Job Match</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickBtn} onPress={() => nav.navigate('Profile')} activeOpacity={0.85}>
          <Ionicons name="person" size={16} color="#555" />
          <Text style={s.quickTxt}>My Profile</Text>
        </TouchableOpacity>
        {role === 'admin' && (
          <TouchableOpacity style={s.quickBtn} onPress={() => nav.navigate('Admin')} activeOpacity={0.85}>
            <Ionicons name="settings" size={16} color="#555" />
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
            <View style={s.jobThumb}><Ionicons name="briefcase" size={20} color={ORANGE} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.jobTitle} numberOfLines={1}>{job.title}</Text>
              <View style={s.jobSubRow}>
                <Ionicons name="business-outline" size={11} color="#aaa" />
                <Text style={s.jobSub} numberOfLines={1}> {job.company}</Text>
              </View>
              <View style={s.jobSubRow}>
                <Ionicons name="location-outline" size={11} color="#aaa" />
                <Text style={s.jobSub}> {job.location}</Text>
              </View>
            </View>
            <View style={s.salaryCol}>
              <View style={s.priceBadge}><Text style={s.priceTxt}>{job.salary}</Text></View>
              <Text style={s.jobTime}>Just posted</Text>
            </View>
          </View>
        </TouchableOpacity>
      )) : (
        <>
          {[
            { title: 'Telecaller',    company: 'Dhanraj Enterprises', loc: 'Nanded',       salary: '₹12,000', icon: 'call-outline' },
            { title: 'Web Developer', company: 'TechSoft Solutions',  loc: 'Nanded',       salary: '₹25,000', icon: 'globe-outline' },
            { title: 'Shop Assistant',company: 'Reliance Retail',     loc: 'Station Road', salary: '₹12,000', icon: 'storefront-outline' },
          ].map(job => (
            <TouchableOpacity key={job.title} style={s.jobCard} onPress={() => nav.navigate('Jobs')} activeOpacity={0.85}>
              <View style={s.jobRow}>
                <View style={s.jobThumb}><Ionicons name={job.icon} size={20} color={ORANGE} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.jobTitle}>{job.title}</Text>
                  <View style={s.jobSubRow}>
                    <Ionicons name="business-outline" size={11} color="#aaa" />
                    <Text style={s.jobSub}> {job.company}</Text>
                  </View>
                  <View style={s.jobSubRow}>
                    <Ionicons name="location-outline" size={11} color="#aaa" />
                    <Text style={s.jobSub}> {job.loc}</Text>
                  </View>
                </View>
                <View style={s.salaryCol}>
                  <View style={s.priceBadge}><Text style={s.priceTxt}>{job.salary}</Text></View>
                  <Text style={s.jobTime}>Full time</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
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
  headerBand: { backgroundColor: '#111111', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandText: { fontSize: 22, fontWeight: '900', letterSpacing: 0.2 },
  brandNanded: { color: '#ffffff' },
  brandRozgar: { color: '#f97316' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  profileBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  profileInitial: { color: '#fff', fontSize: 16, fontWeight: '800' },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10, marginBottom: 4 },
  card: { width: '47%', backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#ebebeb', padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardIcon: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#16a34a' },
  liveTxt: { fontSize: 10, fontWeight: '700' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111' },
  cardSub: { fontSize: 11, color: '#888', marginTop: 2 },
  quickRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, marginTop: 4, marginBottom: 4 },
  quickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#ffffff', borderRadius: 10, borderWidth: 1, borderColor: '#ebebeb', paddingVertical: 10, paddingHorizontal: 12 },
  quickTxt: { fontSize: 12, fontWeight: '600', color: '#111' },
  jobCard: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#ebebeb', marginHorizontal: 12, marginBottom: 10, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  jobThumb: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  jobTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 3 },
  jobSubRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  jobSub: { fontSize: 11, color: '#777' },
  jobTime: { fontSize: 10, color: '#bbb', marginTop: 4, textAlign: 'right' },
  salaryCol: { alignItems: 'flex-end' },
  priceBadge: { backgroundColor: '#111', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  priceTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  viewAll: { marginHorizontal: 12, marginTop: 4, alignItems: 'center', padding: 10 },
  viewAllTxt: { fontSize: 13, color: '#f97316', fontWeight: '700' },
});
