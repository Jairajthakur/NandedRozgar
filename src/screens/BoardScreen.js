import { useLang } from '../utils/i18n';
import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, RefreshControl, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import JobCard from '../components/JobCard';
import { Empty, Btn } from '../components/UI';
import { C, CATS, CAT_ICONS } from '../utils/constants';

const ORANGE = '#f97316';
const JOB_TYPES = ['All', 'Full-time', 'Part-time', 'Contract', 'Daily Wage', 'Gig'];
const SALARY_RANGES = [
  { label: 'Any', min: 0, max: Infinity },
  { label: 'Under ₹10k', min: 0, max: 10000 },
  { label: '₹10k–₹20k', min: 10000, max: 20000 },
  { label: '₹20k–₹40k', min: 20000, max: 40000 },
  { label: 'Above ₹40k', min: 40000, max: Infinity },
];

function parseSalary(s = '') {
  const num = parseInt(s.replace(/[^\d]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

export default function BoardScreen() {
  const { jobs, loadJobs, role } = useAuth();
  const { t } = useLang();
  const nav = useNavigation();
  const [search, setSearch]           = useState('');
  const [cat, setCat]                 = useState('All');
  const [jobType, setJobType]         = useState('All');
  const [salaryRange, setSalaryRange] = useState(SALARY_RANGES[0]);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing]   = useState(false);

  const isGiver = role === 'user' || role === 'admin';

  const filtered = useMemo(() => {
    return jobs
      .filter(j =>
        j.status === 'active' &&
        (cat === 'All' || j.category === cat) &&
        (jobType === 'All' || j.type === jobType) &&
        parseSalary(j.salary) >= salaryRange.min &&
        parseSalary(j.salary) <= salaryRange.max &&
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
  }, [jobs, search, cat, jobType, salaryRange]);

  async function onRefresh() {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  }

  const activeFiltersCount =
    (cat !== 'All' ? 1 : 0) +
    (jobType !== 'All' ? 1 : 0) +
    (salaryRange.label !== 'Any' ? 1 : 0);

  return (
    <View style={styles.container}>
      {/* Search + filter button */}
      <View style={{ flexDirection: 'row', alignItems: 'center', margin: 12, marginBottom: 6, gap: 8 }}>
        <View style={[styles.searchWrap, { flex: 1, margin: 0 }]}>
          <Ionicons name="search" size={16} color="#aaa" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchPlaceholder')}
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
        <TouchableOpacity
          style={[styles.filterBtn, activeFiltersCount > 0 && styles.filterBtnActive]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options" size={18} color={activeFiltersCount > 0 ? '#fff' : '#555'} />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeTxt}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
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
            actionLabel={t('postAJob')}
          />
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterSheet}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filters</Text>
              <TouchableOpacity onPress={() => {
                setCat('All'); setJobType('All'); setSalaryRange(SALARY_RANGES[0]);
              }}>
                <Text style={{ color: ORANGE, fontWeight: '700', fontSize: 13 }}>Reset All</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.filterLabel}>Job Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {JOB_TYPES.map(jt => (
                <TouchableOpacity key={jt}
                  style={[styles.pill, jobType === jt && styles.pillActive]}
                  onPress={() => setJobType(jt)}>
                  <Text style={[styles.pillText, jobType === jt && styles.pillTextActive]}>{jt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.filterLabel, { marginTop: 16 }]}>Salary Range</Text>
            {SALARY_RANGES.map(range => (
              <TouchableOpacity key={range.label}
                style={[styles.rangeRow, salaryRange.label === range.label && styles.rangeActive]}
                onPress={() => setSalaryRange(range)}>
                <Text style={[styles.rangeTxt, salaryRange.label === range.label && { color: ORANGE, fontWeight: '700' }]}>
                  {range.label}
                </Text>
                {salaryRange.label === range.label && (
                  <Ionicons name="checkmark-circle" size={18} color={ORANGE} />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilters(false)}>
              <Text style={styles.applyTxt}>Show {filtered.length} Jobs</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  filterBtn: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e5e5',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  filterBtnActive: { backgroundColor: '#111', borderColor: '#111' },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
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
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  filterSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36,
  },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  filterTitle: { fontSize: 17, fontWeight: '800', color: '#111' },
  filterLabel: { fontSize: 12, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 },
  rangeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 13, borderRadius: 10, borderWidth: 1, borderColor: '#ebebeb', marginBottom: 8 },
  rangeActive: { borderColor: ORANGE, backgroundColor: '#fff7ed' },
  rangeTxt: { fontSize: 13, fontWeight: '600', color: '#333' },
  applyBtn: { backgroundColor: '#111', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 8 },
  applyTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
