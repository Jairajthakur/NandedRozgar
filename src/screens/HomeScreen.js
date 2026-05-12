import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { C } from '../utils/constants';

export default function HomeScreen() {
  const nav = useNavigation();
  const { jobs } = useAuth();

  const activeJobs = jobs?.filter(j => j.status === 'active') || [];
  const recentJobs = activeJobs.slice(0, 2);

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Promo Banner */}
      <View style={s.promo}>
        <View>
          <Text style={s.promoTitle}>Free listings this week</Text>
          <Text style={s.promoSub}>Cars & Rooms — no charges</Text>
        </View>
        <TouchableOpacity style={s.promoBtn} onPress={() => nav.navigate('PostCar')}>
          <Text style={s.promoBtnTxt}>Post free</Text>
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
          <View style={[s.serviceIcon, { backgroundColor: '#e6f1fb' }]}>
            <Text style={{ fontSize: 18 }}>💼</Text>
          </View>
          <Text style={s.serviceName}>Find Jobs</Text>
          <Text style={s.serviceSub}>{activeJobs.length || 348} openings nearby</Text>
          <View style={[s.serviceBadge, { backgroundColor: '#e6f1fb' }]}>
            <Text style={[s.serviceBadgeTxt, { color: '#185fa5' }]}>{activeJobs.length || 348} open</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={s.serviceCard} onPress={() => nav.navigate('Cars')}>
          <View style={[s.serviceIcon, { backgroundColor: '#faeeda' }]}>
            <Text style={{ fontSize: 18 }}>🚗</Text>
          </View>
          <Text style={s.serviceName}>Car Rental</Text>
          <Text style={s.serviceSub}>42 vehicles available</Text>
          <View style={[s.serviceBadge, { backgroundColor: '#faeeda' }]}>
            <Text style={[s.serviceBadgeTxt, { color: '#854f0b' }]}>With photos</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={s.serviceCard} onPress={() => nav.navigate('Rooms')}>
          <View style={[s.serviceIcon, { backgroundColor: '#e1f5ee' }]}>
            <Text style={{ fontSize: 18 }}>🏠</Text>
          </View>
          <Text style={s.serviceName}>Rooms & PG</Text>
          <Text style={s.serviceSub}>120 listings in city</Text>
          <View style={[s.serviceBadge, { backgroundColor: '#e1f5ee' }]}>
            <Text style={[s.serviceBadgeTxt, { color: '#0f6e56' }]}>With photos</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.serviceCard, { borderStyle: 'dashed' }]}
          onPress={() => nav.navigate('PostCar')}
        >
          <View style={[s.serviceIcon, { backgroundColor: '#f0f0f0' }]}>
            <Text style={{ fontSize: 18 }}>➕</Text>
          </View>
          <Text style={s.serviceName}>List Your Vehicle</Text>
          <Text style={s.serviceSub}>Earn from your car/bike</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Jobs */}
      <Text style={s.sectionTitle}>RECENT JOBS</Text>
      {recentJobs.length > 0 ? recentJobs.map(job => (
        <TouchableOpacity
          key={job.id}
          style={s.jobCard}
          onPress={() => nav.navigate('JobDetail', { job })}
          activeOpacity={0.85}
        >
          <View style={s.jobRow}>
            <View style={[s.jobThumb, { backgroundColor: '#e6f1fb' }]}>
              <Text style={{ fontSize: 18 }}>💼</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.jobTitle} numberOfLines={1}>{job.title}</Text>
              <Text style={s.jobSub} numberOfLines={1}>{job.company} · {job.location}</Text>
            </View>
            <View style={s.priceBadge}>
              <Text style={s.priceTxt}>{job.salary}</Text>
            </View>
          </View>
          <View style={s.tagRow}>
            <View style={s.tag}><Text style={s.tagTxt}>🕐 Just posted</Text></View>
            {job.featured && (
              <View style={[s.tag, { backgroundColor: '#e6f1fb' }]}>
                <Text style={[s.tagTxt, { color: '#185fa5' }]}>✓ Verified</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )) : (
        // Placeholder jobs if none loaded
        <>
          <TouchableOpacity style={s.jobCard} onPress={() => nav.navigate('Jobs')} activeOpacity={0.85}>
            <View style={s.jobRow}>
              <View style={[s.jobThumb, { backgroundColor: '#e6f1fb' }]}>
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
              <View style={[s.tag, { backgroundColor: '#e1f5ee' }]}>
                <Text style={[s.tagTxt, { color: '#0f6e56' }]}>✓ Verified</Text>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={s.jobCard} onPress={() => nav.navigate('Jobs')} activeOpacity={0.85}>
            <View style={s.jobRow}>
              <View style={[s.jobThumb, { backgroundColor: '#faeeda' }]}>
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

  promo: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.dark, borderRadius: 13, margin: 12, marginTop: 12, padding: 13,
  },
  promoTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  promoSub: { color: '#aaa', fontSize: 11, marginTop: 2 },
  promoBtn: {
    backgroundColor: '#fff', borderRadius: 7,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  promoBtnTxt: { color: '#111', fontSize: 11, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 12, marginBottom: 4 },
  statBox: {
    flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 9, padding: 10, alignItems: 'center',
  },
  statNum: { fontSize: 16, fontWeight: '800', color: C.text },
  statLbl: { fontSize: 8, color: C.muted, marginTop: 2, letterSpacing: 0.5, fontWeight: '600' },

  sectionTitle: {
    fontSize: 9, fontWeight: '700', color: C.muted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 12, paddingTop: 14, paddingBottom: 6,
  },

  servicesGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 9,
    paddingHorizontal: 12, marginBottom: 4,
  },
  serviceCard: {
    width: '47%', backgroundColor: C.card, borderRadius: 13,
    borderWidth: 1, borderColor: C.border, padding: 13,
  },
  serviceIcon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  serviceName: { fontSize: 13, fontWeight: '700', color: C.text },
  serviceSub: { fontSize: 10, color: C.muted, marginTop: 2 },
  serviceBadge: { marginTop: 6, borderRadius: 5, paddingVertical: 2, paddingHorizontal: 6, alignSelf: 'flex-start' },
  serviceBadgeTxt: { fontSize: 9, fontWeight: '700' },

  jobCard: {
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    marginHorizontal: 12, marginBottom: 9, padding: 13,
  },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 },
  jobThumb: { width: 40, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  jobTitle: { fontSize: 13, fontWeight: '700', color: C.text },
  jobSub: { fontSize: 11, color: C.muted, marginTop: 1 },
  priceBadge: { backgroundColor: C.dark, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 9 },
  priceTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  tagRow: { flexDirection: 'row', gap: 5 },
  tag: { backgroundColor: '#f0f0f0', borderRadius: 5, paddingVertical: 3, paddingHorizontal: 7 },
  tagTxt: { fontSize: 10, color: C.muted },

  viewAll: { marginHorizontal: 12, marginTop: 2, alignItems: 'center', padding: 10 },
  viewAllTxt: { fontSize: 12, color: C.muted, fontWeight: '600' },
});
