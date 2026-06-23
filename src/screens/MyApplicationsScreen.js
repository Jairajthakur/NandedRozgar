import React, { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { http } from '../utils/api';

const ORANGE = '#f97316';

const STATUS_CONFIG = {
  applied:     { label: 'Applied',        color: '#3b82f6', bg: '#eff6ff', icon: 'paper-plane-outline' },
  reviewed:    { label: 'Reviewed',       color: '#8b5cf6', bg: '#f5f3ff', icon: 'eye-outline' },
  shortlisted: { label: 'Shortlisted 🎉', color: '#10b981', bg: '#ecfdf5', icon: 'checkmark-circle-outline' },
  rejected:    { label: 'Not Selected',   color: '#ef4444', bg: '#fef2f2', icon: 'close-circle-outline' },
  hired:       { label: 'Hired 🎊',       color: '#f97316', bg: '#fff7ed', icon: 'trophy-outline' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.applied;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.color + '40' }]}>
      {/* Glossy sheen banner */}
      <LinearGradient colors={['rgba(249,115,22,0.18)', 'rgba(249,115,22,0)']} style={{ height: 4, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />
      <Ionicons name={cfg.icon} size={13} color={cfg.color} />
      <Text style={[styles.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

export default function MyApplicationsScreen({ navigation }) {
  const [apps, setApps]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true);
    try {
      const r = await http('GET', '/api/jobs/my-applications');
      if (r?.ok) setApps(r.applications || []);
    } finally {
      if (!refresh) setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={ORANGE} size="large" />
    </View>
  );

  const counts = Object.keys(STATUS_CONFIG).reduce((acc, k) => {
    acc[k] = apps.filter(a => a.status === k).length;
    return acc;
  }, {});

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={ORANGE} />}
    >
      {/* Summary pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
        {Object.entries(STATUS_CONFIG).map(([k, cfg]) => counts[k] > 0 && (
          <View key={k} style={[styles.pill, { backgroundColor: cfg.bg, borderColor: cfg.color + '40' }]}>
            <Text style={[styles.pillNum, { color: cfg.color }]}>{counts[k]}</Text>
            <Text style={[styles.pillLbl, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        ))}
      </ScrollView>

      {apps.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="briefcase-outline" size={48} color="#ddd" />
          <Text style={styles.emptyTxt}>No applications yet</Text>
          <Text style={styles.emptySub}>Jobs you apply to will appear here</Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {apps.map(app => (
            <TouchableOpacity
              key={app.id}
              style={styles.card}
              onPress={() => navigation.navigate('JobDetail', { job: { id: app.job_id, title: app.title, company: app.company, category: app.category, location: app.location, salary: app.salary } })}
              activeOpacity={0.85}
            >
              <View style={styles.cardTop}>
                <View style={styles.catIcon}>
                  <Ionicons name="briefcase-outline" size={18} color={ORANGE} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.jobTitle} numberOfLines={1}>{app.title}</Text>
                  <Text style={styles.jobMeta}>{app.company || 'Company'} · {app.location || 'Nanded'}</Text>
                </View>
                {!!app.salary && <Text style={styles.salary}>₹{app.salary}</Text>}
              </View>
              <View style={styles.cardBottom}>
                <StatusBadge status={app.status} />
                <Text style={styles.date}>
                  Applied {new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f5f5f5' },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pillsRow:   { flexGrow: 0 },
  pill:       { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, minWidth: 72 },
  pillNum:    { fontSize: 18, fontWeight: '800' },
  pillLbl:    { fontSize: 10, fontWeight: '600', marginTop: 2 },
  empty:      { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyTxt:   { fontSize: 16, fontWeight: '700', color: '#aaa' },
  emptySub:   { fontSize: 12, color: '#ccc' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#ebebeb',
  },
  cardTop:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  catIcon:  { width: 40, height: 40, borderRadius: 10, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  jobTitle: { fontSize: 14, fontWeight: '700', color: '#111' },
  jobMeta:  { fontSize: 12, color: '#888', marginTop: 2 },
  salary:   { fontSize: 13, fontWeight: '800', color: ORANGE },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1 },
  badgeTxt: { fontSize: 12, fontWeight: '700' },
  date:     { fontSize: 11, color: '#aaa' },
});
