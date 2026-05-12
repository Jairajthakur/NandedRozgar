import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { C } from '../utils/constants';

export default function HomeScreen() {
  const nav = useNavigation();
  const { jobs } = useAuth();

  const activeJobs = jobs?.filter(j => j.status === 'active') || [];
  const recentJobs = activeJobs.slice(0, 2);

  return (
    <View style={s.container}>
      {/* Dark Header */}
      <View style={s.hdr}>
        <View style={s.hdrTop}>
          <View>
            <Text style={s.hdrGreet}>Good morning,</Text>
            <Text style={s.hdrCity}>📍 Nanded, Maharashtra</Text>
          </View>
          <View style={s.avatar}>
            <Text style={{ fontSize: 16, color: '#fff' }}>👤</Text>
          </View>
        </View>
        <View style={s.searchBar}>
          <Text style={s.searchIcon}>🔍</Text>
          <Text style={s.searchPlaceholder}>Search jobs, cars, rooms…</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Promo Banner */}
        <View style={s.promo}>
          <View>
            <Text style={s.promoTitle}>Free listings this week</Text>
            <Text style={s.promoSub}>Cars & Rooms — no charges</Text>
          </View>
          <TouchableOpacity style={s.promoBtn} onPress={() => nav.navigate('PostCar')}>
            <Text style={s.promoBtnTxt}>Post Free</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statNum}>{activeJobs.length || 348}</Text>
            <Text style={s.statLbl}>JOBS</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statNum}>42</Text>
            <Text style={s.statLbl}>CARS</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statNum}>120</Text>
            <Text style={s.statLbl}>ROOMS</Text>
          </View>
        </View>

        {/* Services Grid */}
        <Text style={s.sectionTitle}>OUR SERVICES</Text>
        <View style={s.servicesGrid}>
          <TouchableOpacity style={s.serviceCard} onPress={() => nav.navigate('Jobs')}>
            <View style={s.svcIcon}><Text style={{ fontSize: 18 }}>💼</Text></View>
            <Text style={s.svcName}>Find Jobs</Text>
            <Text style={s.svcSub}>{activeJobs.length || 348} openings</Text>
            <View style={s.svcBadge}><Text style={s.svcBadgeTxt}>{activeJobs.length || 348} open</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={s.serviceCard} onPress={() => nav.navigate('Cars')}>
            <View style={s.svcIcon}><Text style={{ fontSize: 18 }}>🚗</Text></View>
            <Text style={s.svcName}>Car Rental</Text>
            <Text style={s.svcSub}>42 vehicles</Text>
            <View style={s.svcBadge}><Text style={s.svcBadgeTxt}>With photos</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={s.serviceCard} onPress={() => nav.navigate('Rooms')}>
            <View style={s.svcIcon}><Text style={{ fontSize: 18 }}>🏠</Text></View>
            <Text style={s.svcName}>Rooms & PG</Text>
            <Text style={s.svcSub}>120 listings</Text>
            <View style={s.svcBadge}><Text style={s.svcBadgeTxt}>With photos</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={[s.serviceCard, { borderStyle: 'dashed' }]} onPress={() => nav.navigate('PostCar')}>
            <View style={s.svcIcon}><Text style={{ fontSize: 18 }}>➕</Text></View>
            <Text style={s.svcName}>List Vehicle</Text>
            <Text style={s.svcSub}>Earn from car/bike</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Jobs */}
        <Text style={s.sectionTitle}>RECENT JOBS</Text>
        {recentJobs.length > 0 ? recentJobs.map(job => (
          <TouchableOpacity key={job.id} style={s.jobCard}
            onPress={() => nav.navigate('JobDetail', { job })} activeOpacity={0.85}>
            <View style={s.jobRow}>
              <View style={s.jobThumb}><Text style={{ fontSize: 18 }}>💼</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.jobTitle} numberOfLines={1}>{job.title}</Text>
                <Text style={s.jobSub} numberOfLines={1}>{job.company} · {job.location}</Text>
              </View>
              <View style={s.priceBadge}><Text style={s.priceTxt}>{job.salary}</Text></View>
            </View>
            <View style={s.tagRow}>
              <View style={s.tag}><Text style={s.tagTxt}>🕐 Just posted</Text></View>
              {job.featured && <View style={s.tag}><Text style={s.tagTxt}>✓ Verified</Text></View>}
            </View>
          </TouchableOpacity>
        )) : (
          <>
            <TouchableOpacity style={s.jobCard} onPress={() => nav.navigate('Jobs')} activeOpacity={0.85}>
              <View style={s.jobRow}>
                <View style={s.jobThumb}><Text style={{ fontSize: 18 }}>🚚</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.jobTitle}>Delivery Driver</Text>
                  <Text style={s.jobSub}>Swiggy · Shivaji Nagar</Text>
                </View>
                <View style={s.priceBadge}><Text style={s.priceTxt}>₹18k/mo</Text></View>
              </View>
              <View style={s.tagRow}>
                <View style={s.tag}><Text style={s.tagTxt}>🕐 2h ago</Text></View>
                <View style={s.tag}><Text style={s.tagTxt}>✓ Verified</Text></View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={s.jobCard} onPress={() => nav.navigate('Jobs')} activeOpacity={0.85}>
              <View style={s.jobRow}>
                <View style={s.jobThumb}><Text style={{ fontSize: 18 }}>🏪</Text></View>
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
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F4' },

  hdr: { backgroundColor: '#111', paddingTop: 12, paddingHorizontal: 16, paddingBottom: 14 },
  hdrTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hdrGreet: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  hdrCity: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.2, marginTop: 1 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 10, padding: 9, paddingHorizontal: 12, marginTop: 10 },
  searchIcon: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
  searchPlaceholder: { fontSize: 12, color: 'rgba(255,255,255,0.3)' },

  promo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#222', borderRadius: 14, margin: 12, padding: 14 },
  promoTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  promoSub: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 },
  promoBtn: { backgroundColor: '#fff', borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12 },
  promoBtnTxt: { color: '#111', fontSize: 11, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 4 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E8E8E8' },
  statNum: { fontSize: 17, fontWeight: '800', color: '#111' },
  statLbl: { fontSize: 9, color: '#aaa', fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 1 },

  sectionTitle: { fontSize: 9, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },

  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, marginBottom: 4 },
  serviceCard: { width: '47%', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E8E8E8', padding: 13 },
  svcIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F4F4F4', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  svcName: { fontSize: 13, fontWeight: '700', color: '#111' },
  svcSub: { fontSize: 10, color: '#999', marginTop: 2 },
  svcBadge: { marginTop: 7, borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: '#F4F4F4', alignSelf: 'flex-start' },
  svcBadgeTxt: { fontSize: 9, fontWeight: '700', color: '#555' },

  jobCard: { backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: '#E8E8E8', marginHorizontal: 12, marginBottom: 9, padding: 13 },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  jobThumb: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F4F4F4', alignItems: 'center', justifyContent: 'center' },
  jobTitle: { fontSize: 13, fontWeight: '700', color: '#111' },
  jobSub: { fontSize: 10, color: '#999', marginTop: 1 },
  priceBadge: { backgroundColor: '#111', borderRadius: 7, paddingVertical: 5, paddingHorizontal: 9 },
  priceTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  tagRow: { flexDirection: 'row', gap: 5 },
  tag: { backgroundColor: '#F4F4F4', borderRadius: 5, paddingVertical: 3, paddingHorizontal: 8 },
  tagTxt: { fontSize: 10, color: '#888' },

  viewAll: { marginHorizontal: 12, marginTop: 2, alignItems: 'center', padding: 10 },
  viewAllTxt: { fontSize: 12, color: '#555', fontWeight: '700' },
});
