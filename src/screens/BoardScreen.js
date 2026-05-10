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
  const [search, setSearch] = useState('');
  const [cat, setCat]       = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    return jobs
      .filter(j =>
        j.status === 'active' &&
        (cat === 'All' || j.category === cat) &&
        (search === '' || [j.title, j.location, j.company, j.description || '']
          .join(' ').toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a, b) =>
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
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs, area, company…"
          placeholderTextColor={C.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: C.muted, fontSize: 18, paddingRight: 10 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pills} style={{ maxHeight: 46 }}>
        {CATS.map(c => (
          <TouchableOpacity key={c} onPress={() => setCat(c)}
            style={[styles.pill, cat === c && styles.pillActive]}>
            <Text style={[styles.pillText, cat === c && styles.pillTextActive]}>
              {c !== 'All' ? CAT_ICONS[c] + ' ' : ''}{c}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Job list */}
      <FlatList
        data={filtered}
        keyExtractor={j => j.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}
          colors={[C.dark]} tintColor={C.dark} />}
        renderItem={({ item }) => (
          <JobCard job={item} onPress={() => nav.navigate('JobDetail', { job: item })} />
        )}
        ListEmptyComponent={
          <Empty
            icon="🔍"
            title="No jobs found"
            sub={search || cat !== 'All' ? 'Try different filters' : 'Check back later for new listings'}
            action={role === 'giver' ? () => nav.navigate('Post') : null}
            actionLabel="Post a Job"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border,
    borderRadius: 9, margin: 12, marginBottom: 6, paddingLeft: 12,
  },
  searchIcon: { fontSize: 15, marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 13, color: C.text },
  pills: { paddingHorizontal: 12, paddingBottom: 8, gap: 6 },
  pill: {
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card,
    paddingVertical: 5, paddingHorizontal: 13, borderRadius: 20,
  },
  pillActive: { backgroundColor: C.dark, borderColor: C.dark },
  pillText: { fontSize: 12, fontWeight: '600', color: '#555' },
  pillTextActive: { color: '#fff' },
  list: { padding: 12, paddingTop: 8 },
});
