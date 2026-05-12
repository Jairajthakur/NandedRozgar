import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import JobCard from '../components/JobCard';
import { Empty, Btn } from '../components/UI';
import { C, CATS, CAT_ICONS } from '../utils/constants';

const ORANGE = '#f97316';

export default function BoardScreen() {
  const { jobs, loadJobs, role } = useAuth();
  const nav = useNavigation();
  const [search, setSearch]     = useState('');
  const [cat, setCat]           = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const isGiver = role === 'user' || role === 'admin';

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
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color="#aaa" style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs, area, company…"
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={{ paddingRight: 12 }}>
            <Ionicons name="close-circle" size={18} color="#bbb" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pills}
        style={{ maxHeight: 48 }}
      >
        {CATS.map(c => (
          <TouchableOpacity
            key={c}
            onPress={() => setCat(c)}
            style={[styles.pill, cat === c && styles.pillActive]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {c !== 'All' && (
                <Ionicons name={CAT_ICONS[c]} size={12} color={cat === c ? '#fff' : '#555'} />
              )}
              <Text style={[styles.pillText, cat === c && styles.pillTextActive]}>{c}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results count */}
      {filtered.length > 0 && (
        <Text style={styles.countTxt}>{filtered.length} jobs found</Text>
      )}

      {/* Job list */}
      <FlatList
        data={filtered}
        keyExtractor={j => j.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[ORANGE]}
            tintColor={ORANGE}
          />
        }
        renderItem={({ item }) => (
          <JobCard job={item} onPress={() => nav.navigate('JobDetail', { job: item })} />
        )}
        ListEmptyComponent={
          <Empty
            icon="search"
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 10,
    margin: 12,
    marginBottom: 6,
    paddingLeft: 12,
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 13, color: '#111' },
  pills: { paddingHorizontal: 12, paddingBottom: 8, gap: 6 },
  pill: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  pillActive:     { backgroundColor: '#111', borderColor: '#111' },
  pillText:       { fontSize: 12, fontWeight: '600', color: '#555' },
  pillTextActive: { color: '#fff' },
  countTxt: { fontSize: 11, color: '#999', paddingHorizontal: 16, paddingBottom: 4, fontWeight: '500' },
  list: { padding: 12, paddingTop: 4 },
});
