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
import { CATS, CAT_ICONS } from '../utils/constants';

const ORANGE = '#f97316';
const INDIGO = '#6366f1';
const CYAN   = '#22d3ee';

const JOB_TYPES    = ['All', 'Full-time', 'Part-time', 'Contract', 'Daily Wage', 'Gig'];
const SALARY_RANGES = [
  { label: 'Any',        min: 0,     max: Infinity },
  { label: 'Under ₹10k', min: 0,     max: 10000 },
  { label: '₹10k–₹20k',  min: 10000, max: 20000 },
  { label: '₹20k–₹40k',  min: 20000, max: 40000 },
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
      .sort((a, b) =>
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
    <View style={s.container}>

      {/* ── Search + filter bar ── */}
      <View style={s.searchBar}>
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.3)" style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder={t('searchPlaceholder') || 'Search jobs, companies…'}
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ paddingRight: 4 }}>
              <Ionicons name="close-circle" size={17} color="rgba(255,255,255,0.25)" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[s.filterBtn, activeFiltersCount > 0 && s.filterBtnActive]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={18} color={activeFiltersCount > 0 ? '#fff' : 'rgba(255,255,255,0.4)'} />
          {activeFiltersCount > 0 && (
            <View style={s.filterBadge}>
              <Text style={s.filterBadgeTxt}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Category pills ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.pillsWrap}
        style={{ maxHeight: 50 }}
      >
        {CATS.map(c => (
          <TouchableOpacity
            key={c}
            onPress={() => setCat(c)}
            style={[s.pill, cat === c && s.pillActive]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {c !== 'All' && (
                <Ionicons name={CAT_ICONS[c]} size={11} color={cat === c ? '#fff' : 'rgba(255,255,255,0.35)'} />
              )}
              <Text style={[s.pillTxt, cat === c && s.pillTxtActive]}>{c}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Count ── */}
      {filtered.length > 0 && (
        <View style={s.countRow}>
          <View style={s.countDot} />
          <Text style={s.countTxt}>{filtered.length} jobs found</Text>
        </View>
      )}

      {/* ── Job list ── */}
      <FlatList
        data={filtered}
        keyExtractor={j => j.id}
        contentContainerStyle={s.list}
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
            icon="search-outline"
            title="No jobs found"
            sub={search || cat !== 'All' ? 'Try different filters' : 'Check back later for new listings'}
            action={isGiver ? () => nav.navigate('Post') : null}
            actionLabel={t('postAJob')}
          />
        }
      />

      {/* ── Filter Modal ── */}
      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.sheetHandle} />
            <View style={m.sheetTop} />

            <View style={m.header}>
              <Text style={m.title}>Filters</Text>
              <TouchableOpacity onPress={() => { setCat('All'); setJobType('All'); setSalaryRange(SALARY_RANGES[0]); }}>
                <Text style={m.reset}>Reset All</Text>
              </TouchableOpacity>
            </View>

            <Text style={m.label}>Job Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {JOB_TYPES.map(jt => (
                <TouchableOpacity key={jt}
                  style={[s.pill, jobType === jt && s.pillActive]}
                  onPress={() => setJobType(jt)}>
                  <Text style={[s.pillTxt, jobType === jt && s.pillTxtActive]}>{jt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[m.label, { marginTop: 20 }]}>Salary Range</Text>
            {SALARY_RANGES.map(range => (
              <TouchableOpacity key={range.label}
                style={[m.rangeRow, salaryRange.label === range.label && m.rangeActive]}
                onPress={() => setSalaryRange(range)}>
                <Text style={[m.rangeTxt, salaryRange.label === range.label && { color: ORANGE, fontWeight: '700' }]}>
                  {range.label}
                </Text>
                {salaryRange.label === range.label && (
                  <Ionicons name="checkmark-circle" size={18} color={ORANGE} />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={m.applyBtn} onPress={() => setShowFilters(false)} activeOpacity={0.85}>
              <Text style={m.applyTxt}>Show {filtered.length} Jobs</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080812' },

  searchBar: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingLeft: 14, paddingRight: 10, paddingVertical: 2,
  },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 13, color: '#fff' },
  filterBtn: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  filterBtnActive: { backgroundColor: ORANGE + '20', borderColor: ORANGE + '50' },
  filterBadge: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  filterBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },

  pillsWrap: { paddingHorizontal: 12, paddingBottom: 10, gap: 7 },
  pill: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20 },
  pillActive: { backgroundColor: ORANGE + '25', borderColor: ORANGE + '60' },
  pillTxt: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.35)' },
  pillTxtActive: { color: ORANGE, fontWeight: '700' },

  countRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingBottom: 6 },
  countDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#4ade80' },
  countTxt: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },

  list: { padding: 12, paddingTop: 4 },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0a0a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  sheetHandle: { width: 36, height: 3, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTop: { position: 'absolute', top: 0, left: 40, right: 40, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '800', color: '#fff' },
  reset: { color: ORANGE, fontWeight: '700', fontSize: 13 },
  label: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  rangeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.03)' },
  rangeActive: { borderColor: ORANGE + '50', backgroundColor: ORANGE + '10' },
  rangeTxt: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  applyBtn: { backgroundColor: ORANGE, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 10, shadowColor: ORANGE, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  applyTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
