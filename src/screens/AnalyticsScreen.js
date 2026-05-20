import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { http } from '../utils/api';

const ORANGE = '#f97316';

function StatCard({ icon, label, value, color = '#111', sub }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.statNum, { color }]}>{value ?? '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {!!sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

const STATUS_COLORS = {
  applications: '#3b82f6',
  shortlisted:  '#10b981',
  hired:        '#f97316',
  rejected:     '#ef4444',
};

export default function AnalyticsScreen() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab]           = useState('overview'); // 'overview' | 'jobs'

  async function load(refresh = false) {
    if (refresh) setRefreshing(true);
    const r = await http('GET', '/api/analytics/employer');
    if (r?.ok) setData(r);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={ORANGE} size="large" />
    </View>
  );

  if (!data) return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={40} color="#ccc" />
      <Text style={{ color: '#aaa', marginTop: 10 }}>Failed to load analytics</Text>
    </View>
  );

  const s = data.summary;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={ORANGE} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Employer Analytics</Text>
        <Text style={styles.headerSub}>Performance overview for your job posts</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['overview', 'jobs'].map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabTxt, tab === t && styles.tabTxtActive]}>
              {t === 'overview' ? 'Overview' : 'Per Job'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'overview' ? (
        <>
          {/* KPI grid */}
          <View style={styles.statsGrid}>
            <StatCard icon="eye-outline"         label="Total Views"       value={s.totalViews}        color="#6366f1" />
            <StatCard icon="people-outline"      label="Applications"      value={s.totalApplications} color="#3b82f6" />
            <StatCard icon="checkmark-circle"    label="Shortlisted"       value={s.totalShortlisted}  color="#10b981" />
            <StatCard icon="trophy-outline"      label="Hired"             value={s.totalHired}        color={ORANGE}  />
            <StatCard icon="briefcase-outline"   label="Active Jobs"       value={s.activeJobs}        color="#8b5cf6" />
            <StatCard icon="trending-up-outline" label="Conversion"        value={s.overallConversion + '%'} color="#ec4899" sub="views → apply" />
          </View>

          {/* Category breakdown */}
          {data.byCategory?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>BY CATEGORY</Text>
              {data.byCategory.map((c, i) => (
                <View key={i} style={styles.catRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catName}>{c.category}</Text>
                    <Text style={styles.catSub}>{c.jobs} job{c.jobs > 1 ? 's' : ''}</Text>
                  </View>
                  <View style={styles.catBadge}>
                    <Ionicons name="people-outline" size={13} color="#3b82f6" />
                    <Text style={styles.catBadgeTxt}>{c.applications} applied</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Last 30 days activity */}
          {data.dailyApplications?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>RECENT ACTIVITY (30 days)</Text>
              <Text style={styles.activityTotal}>
                {data.dailyApplications.reduce((s, d) => s + parseInt(d.count), 0)} applications in the last 30 days
              </Text>
              <View style={styles.barChart}>
                {data.dailyApplications.slice(-14).map((d, i) => {
                  const max = Math.max(...data.dailyApplications.map(x => parseInt(x.count)));
                  const h = Math.max(4, (parseInt(d.count) / Math.max(max, 1)) * 60);
                  return (
                    <View key={i} style={styles.barCol}>
                      <View style={[styles.bar, { height: h }]} />
                      <Text style={styles.barLabel}>{new Date(d.day).getDate()}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </>
      ) : (
        /* Per-job table */
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {data.jobs?.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="briefcase-outline" size={40} color="#ddd" />
              <Text style={styles.emptyTxt}>No jobs posted yet</Text>
            </View>
          ) : data.jobs?.map(j => (
            <View key={j.id} style={styles.jobCard}>
              <View style={styles.jobCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.jobTitle} numberOfLines={1}>{j.title}</Text>
                  <Text style={styles.jobCategory}>{j.category} · {j.status}</Text>
                </View>
                {j.featured && <View style={styles.featuredBadge}><Text style={styles.featuredTxt}>★ Featured</Text></View>}
              </View>
              <View style={styles.jobMetrics}>
                {[
                  { label: 'Views',       value: j.views       || 0, color: '#6366f1' },
                  { label: 'Applied',     value: j.applications || 0, color: '#3b82f6' },
                  { label: 'Shortlisted', value: j.shortlisted  || 0, color: '#10b981' },
                  { label: 'Hired',       value: j.hired        || 0, color: ORANGE },
                ].map(m => (
                  <View key={m.label} style={styles.metric}>
                    <Text style={[styles.metricNum, { color: m.color }]}>{m.value}</Text>
                    <Text style={styles.metricLabel}>{m.label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.convRow}>
                <Text style={styles.convTxt}>Conversion rate: </Text>
                <Text style={[styles.convVal, { color: parseFloat(j.conversion_rate) > 5 ? '#10b981' : '#f97316' }]}>
                  {j.conversion_rate}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f5f5f5' },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  header:     { backgroundColor: '#111', padding: 20, paddingBottom: 24 },
  headerTitle:{ fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub:  { fontSize: 12, color: '#aaa', marginTop: 4 },
  tabs:       { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f0f0f0' },
  tab:        { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:  { borderBottomColor: ORANGE },
  tabTxt:     { fontSize: 13, fontWeight: '600', color: '#aaa' },
  tabTxtActive:{ color: ORANGE },
  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  statCard:   { width: '30%', flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ebebeb' },
  statIcon:   { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statNum:    { fontSize: 20, fontWeight: '800' },
  statLabel:  { fontSize: 10, color: '#888', marginTop: 2, textAlign: 'center' },
  statSub:    { fontSize: 9, color: '#bbb', marginTop: 1 },
  section:    { backgroundColor: '#fff', margin: 12, marginTop: 0, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#ebebeb' },
  sectionTitle:{ fontSize: 11, fontWeight: '800', color: '#999', letterSpacing: 1, marginBottom: 12 },
  catRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  catName:    { fontSize: 13, fontWeight: '700', color: '#111' },
  catSub:     { fontSize: 11, color: '#aaa' },
  catBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  catBadgeTxt:{ fontSize: 12, color: '#3b82f6', fontWeight: '600' },
  activityTotal:{ fontSize: 12, color: '#888', marginBottom: 12 },
  barChart:   { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 72 },
  barCol:     { flex: 1, alignItems: 'center', gap: 4 },
  bar:        { width: '100%', backgroundColor: ORANGE, borderRadius: 3, opacity: 0.8 },
  barLabel:   { fontSize: 9, color: '#bbb' },
  empty:      { alignItems: 'center', padding: 40, gap: 8 },
  emptyTxt:   { fontSize: 14, color: '#aaa', fontWeight: '600' },
  jobCard:    { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#ebebeb' },
  jobCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  jobTitle:   { fontSize: 14, fontWeight: '700', color: '#111' },
  jobCategory:{ fontSize: 12, color: '#888', marginTop: 2 },
  featuredBadge: { backgroundColor: '#fff7ed', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: '#fed7aa' },
  featuredTxt:{ fontSize: 10, color: ORANGE, fontWeight: '700' },
  jobMetrics: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#f9f9f9', borderRadius: 10, paddingVertical: 10 },
  metric:     { alignItems: 'center' },
  metricNum:  { fontSize: 18, fontWeight: '800' },
  metricLabel:{ fontSize: 10, color: '#aaa', marginTop: 2 },
  convRow:    { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  convTxt:    { fontSize: 12, color: '#888' },
  convVal:    { fontSize: 12, fontWeight: '800' },
});
