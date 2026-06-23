import React, { useState, useEffect, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { http } from '../utils/api';

const ORANGE = '#f97316';
const BG     = '#f4f4f6';
const SURFACE = '#ffffff';
const TEXT   = '#111118';
const MUTED  = '#8e8ea0';
const BORDER = 'rgba(0,0,0,0.07)';

function JobCard({ job, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardTop}>
        {/* Glossy sheen */}
        <LinearGradient colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']} pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', zIndex: 1 }} />
        <LinearGradient colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']} pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, zIndex: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{job.title}</Text>
          <Text style={styles.company} numberOfLines={1}>{job.company}</Text>
        </View>
        {job.featured && (
          <View style={styles.badge}>
            <Text style={styles.badgeTxt}>Featured</Text>
          </View>
        )}
        {job.urgent && (
          <View style={[styles.badge, { backgroundColor: '#fee2e2' }]}>
            <Text style={[styles.badgeTxt, { color: '#dc2626' }]}>Urgent</Text>
          </View>
        )}
      </View>
      <View style={styles.meta}>
        <Ionicons name="location-outline" size={13} color={MUTED} />
        <Text style={styles.metaTxt}>{job.location || 'Nanded'}</Text>
        {job.salary ? (
          <>
            <Text style={styles.dot}>·</Text>
            <Ionicons name="cash-outline" size={13} color={MUTED} />
            <Text style={styles.metaTxt}>{job.salary}</Text>
          </>
        ) : null}
        <Text style={styles.dot}>·</Text>
        <Ionicons name="briefcase-outline" size={13} color={MUTED} />
        <Text style={styles.metaTxt}>{job.type || 'Full-time'}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SavedJobsScreen() {
  const nav = useNavigation();
  const [jobs,      setJobs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,     setError]     = useState(null);

  const fetchSaved = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await http('GET', '/api/jobs/saved');
      if (data.ok) setJobs(data.jobs || []);
      else setError(data.error || 'Failed to load saved jobs');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchSaved(); }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={MUTED} />
        <Text style={styles.emptyTitle}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchSaved()}>
          <Text style={styles.retryTxt}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (jobs.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="bookmark-outline" size={56} color={MUTED} />
        <Text style={styles.emptyTitle}>No saved jobs yet</Text>
        <Text style={styles.emptySub}>Tap the bookmark icon on any job to save it here.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => nav.navigate('Jobs')}>
          <Text style={styles.retryTxt}>Browse Jobs</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.root}
      data={jobs}
      keyExtractor={j => String(j.id)}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchSaved(true)} tintColor={ORANGE} />
      }
      renderItem={({ item }) => (
        <JobCard
          job={item}
          onPress={() => nav.navigate('JobDetail', { job: item })}
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListHeaderComponent={
        <Text style={styles.count}>{jobs.length} saved job{jobs.length !== 1 ? 's' : ''}</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: BG },

  card: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardTop:    { overflow: 'hidden', position: 'relative', flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  title:      { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  company:    { fontSize: 13, color: MUTED },
  badge:      { backgroundColor: '#fff7ed', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeTxt:   { fontSize: 11, fontWeight: '700', color: ORANGE },
  meta:       { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  metaTxt:    { fontSize: 12, color: MUTED },
  dot:        { fontSize: 12, color: MUTED },

  count:      { fontSize: 13, fontWeight: '700', color: MUTED, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TEXT, marginTop: 16, marginBottom: 6, textAlign: 'center' },
  emptySub:   { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  retryBtn:   { backgroundColor: ORANGE, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24 },
  retryTxt:   { color: '#fff', fontWeight: '700', fontSize: 14 },
});
