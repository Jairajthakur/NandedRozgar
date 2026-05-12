import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import JobCard from '../components/JobCard';
import { Empty, Btn } from '../components/UI';
import { C, CATS, CAT_ICONS } from '../utils/constants';

export default function BoardScreen() {
  const { jobs, loadJobs, role } = useAuth();
  const nav = useNavigation();
  const [search, setSearch]     = useState('');
  const [cat, setCat]           = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const isGiver = role === 'giver' || role === 'admin';

  const filtered = useMemo(() => {
    return jobs
      .filter(j =>
        j.status === 'active' &&
        (cat === 'All' || j.category === cat) &&
        (search === '' ||
          [j.title, j.location, j.company, j.description || '']
            .join(' ')
            .toLowerCase()
            .includes(search.toLowerCase()))
      )
      .sort(
        (a, b) =>
          ((b.featured ? 2 : 0) + (b.urgent ? 1 : 0)) -
          ((a.featured ? 2 : 0) + (a.urgent ? 1 : 0)) ||
          b.timestamp - a.timestamp
      );
  }, [jobs, search, cat]);

  async function onRefresh() {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  }

  return (
    <View style={styles.container}>
      {/* Dark Header with Search */}
      <View style={styles.hdr}>
        <Text style={styles.hdrTitle}>Find Jobs</Text>
        <Text style={styles.hdrSub}>{filtered.length || 348} openings in Nanded</Text>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs, area, company…"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, paddingRight: 10 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category chips */}
      <View style={styles.chipsWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pills}
        style={{ maxHeight: 46 }}
      >
        {CATS.map(c => (
          <TouchableOpacity
            key={c}
            onPress={() => setCat(c)}
            style={[styles.pill, cat === c && styles.pillActive]}
          >
            <Text style={[styles.pillText, cat === c && styles.pillTextActive]}>
              {c !== 'All' ? CAT_ICONS[c] + ' ' : ''}{c}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      </View>

      {/* Job list */}
      <FlatList
        data={filtered}
        keyExtractor={j => j.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.dark]}
            tintColor={C.dark}
          />
        }
        renderItem={({ item }) => (
          <JobCard job={item} onPress={() => nav.navigate('JobDetail', { job: item })} />
        )}
        ListEmptyComponent={
          <Empty
            icon="🔍"
            title="No jobs found"
            sub={
              search || cat !== 'All'
                ? 'Try different filters'
                : 'Check back later for new listings'
            }
            action={isGiver ? () => nav.navigate('Post') : null}
            actionLabel="Post a Job"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F4' },
  hdr: { backgroundColor: '#111', paddingTop: 12, paddingHorizontal: 16, paddingBottom: 14 },
  hdrTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  hdrSub: { fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 2 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 10, marginTop: 10, paddingLeft: 12,
  },
  searchIcon: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 12, color: '#fff' },
  chipsWrap: { backgroundColor: '#111', paddingBottom: 13 },
  pills: { paddingHorizontal: 12, paddingTop: 0, gap: 6 },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 13,
  },
  pillActive:     { backgroundColor: '#fff', borderColor: '#fff' },
  pillText:       { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  pillTextActive: { color: '#111' },
  list: { padding: 12, paddingTop: 8 },
});
