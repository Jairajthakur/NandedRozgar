import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, RefreshControl, Modal,
  Animated, Easing, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import JobCard from '../components/JobCard';
import { Empty } from '../components/UI';
import { CAT_ICONS } from '../utils/constants';
import { useLang } from '../utils/i18n';

const ORANGE    = '#f97316';
const JOB_TYPES = ['All', 'Full-time', 'Part-time', 'Fresher', 'Work from Home'];
const SALARY_RANGES = [
  { label: 'Any',         min: 0,     max: Infinity },
  { label: 'Under ₹10k', min: 0,     max: 10000 },
  { label: '₹10k–₹20k', min: 10000, max: 20000 },
  { label: '₹20k–₹40k', min: 20000, max: 40000 },
  { label: 'Above ₹40k', min: 40000, max: Infinity },
];

function parseSalary(s = '') {
  const n = parseInt((s || '').replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

// ── Fade-in wrapper ────────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0 }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty      = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(ty,      { toValue: 0, duration: 320, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY: ty }] }}>{children}</Animated.View>;
}

// ── Top Hiring Banner ──────────────────────────────────────────────────────────
function HiringBanner({ onPress }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <TouchableOpacity style={s.hiringBanner} onPress={onPress} activeOpacity={0.85}>
      <View style={s.hiringAccent} />
      <Animated.View style={[s.hiringIconWrap, { transform: [{ scale: pulse }] }]}>
        <Ionicons name="trending-up" size={20} color={ORANGE} />
      </Animated.View>
      <View style={{ flex: 1 }}>
        <Text style={s.hiringTitle}>Top Hiring This Week</Text>
        <Text style={s.hiringSub}>Delivery, Data Entry & Security roles in demand</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={ORANGE} />
    </TouchableOpacity>
  );
}

export default function BoardScreen({ route }) {
  const { jobs, loadJobs, role } = useAuth();
  const { t } = useLang();
  const nav    = useNavigation();
  const insets = useSafeAreaInsets();

  const [search,      setSearch]      = useState(route?.params?.searchQuery || '');
  const [jobType,     setJobType]     = useState('All');
  const [salaryRange, setSalaryRange] = useState(SALARY_RANGES[0]);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);

  const isGiver = role === 'user' || role === 'admin';

  const filtered = useMemo(() => {
    return jobs
      .filter(j =>
        j.status === 'active' &&
        (jobType === 'All' || j.type === jobType) &&
        parseSalary(j.salary) >= salaryRange.min &&
        parseSalary(j.salary) <= salaryRange.max &&
        (search === '' ||
          [j.title, j.location, j.company, j.description || '']
            .join(' ').toLowerCase()
            .includes(search.toLowerCase()))
      )
      .sort((a, b) =>
        ((b.featured ? 2 : 0) + (b.urgent ? 1 : 0)) -
        ((a.featured ? 2 : 0) + (a.urgent ? 1 : 0)) ||
        b.timestamp - a.timestamp
      );
  }, [jobs, search, jobType, salaryRange]);

  const activeFiltersCount =
    (jobType !== 'All' ? 1 : 0) +
    (salaryRange.label !== 'Any' ? 1 : 0);

  async function onRefresh() {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  }

  const sheetY = useRef(new Animated.Value(500)).current;
  useEffect(() => {
    Animated.timing(sheetY, {
      toValue: showFilters ? 0 : 500,
      duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, [showFilters]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f7f7" />

      {/* ── Page Header ── */}
      <FadeIn delay={0}>
        <View style={s.pageHeader}>
          <View>
            <Text style={s.pageTitle}>Jobs in Nanded</Text>
            <Text style={s.pageCount}>{filtered.length} jobs found</Text>
          </View>
          <TouchableOpacity
            style={[s.filterIconBtn, activeFiltersCount > 0 && s.filterIconBtnActive]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options-outline" size={20} color={activeFiltersCount > 0 ? '#fff' : '#444'} />
            {activeFiltersCount > 0 && (
              <View style={s.filterBadge}>
                <Text style={s.filterBadgeTxt}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </FadeIn>

      {/* ── Search Bar ── */}
      <FadeIn delay={60}>
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#bbb" style={{ marginLeft: 14 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search job title, company..."
            placeholderTextColor="#bbb"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ paddingHorizontal: 8 }}>
              <Ionicons name="close-circle" size={18} color="#ccc" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.searchFilterBtn} onPress={() => setShowFilters(true)}>
            <Ionicons name="filter-outline" size={18} color="#888" />
          </TouchableOpacity>
        </View>
      </FadeIn>

      {/* ── Job Type Pills ── */}
      <FadeIn delay={120}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pillsRow}
          style={{ maxHeight: 52 }}
        >
          {JOB_TYPES.map(jt => (
            <TouchableOpacity
              key={jt}
              onPress={() => setJobType(jt)}
              style={[s.pill, jobType === jt && s.pillActive]}
            >
              <Text style={[s.pillTxt, jobType === jt && s.pillTxtActive]}>{jt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </FadeIn>

      {/* ── Job List ── */}
      <FlatList
        data={filtered}
        keyExtractor={j => j.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ORANGE]} tintColor={ORANGE} />
        }
        ListHeaderComponent={
          <FadeIn delay={180}>
            <HiringBanner onPress={() => nav.navigate('Jobs')} />
          </FadeIn>
        }
        renderItem={({ item, index }) => (
          <JobCard
            job={item}
            index={index}
            onPress={() => nav.navigate('JobDetail', { job: item })}
          />
        )}
        ListEmptyComponent={
          <Empty
            icon="search"
            title="No jobs found"
            sub={search || jobType !== 'All' ? 'Try different filters' : 'Check back later'}
            action={isGiver ? () => nav.navigate('Post') : null}
            actionLabel={t('postAJob')}
          />
        }
      />

      {/* ── Filter Modal ── */}
      <Modal visible={showFilters} transparent animationType="none" onRequestClose={() => setShowFilters(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowFilters(false)} />
        <Animated.View style={[s.filterSheet, { transform: [{ translateY: sheetY }] }]}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Filters</Text>
            <TouchableOpacity onPress={() => { setJobType('All'); setSalaryRange(SALARY_RANGES[0]); }}>
              <Text style={s.resetTxt}>Reset All</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.filterLabel}>Job Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {JOB_TYPES.map(jt => (
              <TouchableOpacity
                key={jt}
                style={[s.pill, jobType === jt && s.pillActive]}
                onPress={() => setJobType(jt)}
              >
                <Text style={[s.pillTxt, jobType === jt && s.pillTxtActive]}>{jt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[s.filterLabel, { marginTop: 20 }]}>Salary Range</Text>
          {SALARY_RANGES.map(r => (
            <TouchableOpacity
              key={r.label}
              style={[s.rangeRow, salaryRange.label === r.label && s.rangeActive]}
              onPress={() => setSalaryRange(r)}
            >
              <Text style={[s.rangeTxt, salaryRange.label === r.label && { color: ORANGE, fontWeight: '700' }]}>
                {r.label}
              </Text>
              {salaryRange.label === r.label && <Ionicons name="checkmark-circle" size={18} color={ORANGE} />}
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={s.applyFilterBtn} onPress={() => setShowFilters(false)}>
            <Text style={s.applyFilterTxt}>Show {filtered.length} Jobs</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f7f7' },

  // Header
  pageHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 20, paddingBottom: 6,
    backgroundColor: '#f7f7f7',
  },
  pageTitle: { fontSize: 26, fontWeight: '800', color: '#111', letterSpacing: -0.5 },
  pageCount: { fontSize: 13, color: '#999', fontWeight: '500', marginTop: 2 },
  filterIconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#ececec',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  filterIconBtnActive: { backgroundColor: '#111' },
  filterBadge: {
    position: 'absolute', top: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e8e8e8',
    marginHorizontal: 16, marginTop: 6, marginBottom: 14,
    height: 52,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  searchInput: { flex: 1, paddingHorizontal: 10, fontSize: 14, color: '#111' },
  searchFilterBtn: {
    width: 48, height: 52,
    alignItems: 'center', justifyContent: 'center',
    borderLeftWidth: 1, borderLeftColor: '#ececec',
  },

  // Pills
  pillsRow: { paddingHorizontal: 16, paddingBottom: 14, gap: 8, alignItems: 'center' },
  pill: {
    borderWidth: 1.5, borderColor: '#d8d8d8',
    backgroundColor: '#fff', paddingVertical: 7, paddingHorizontal: 18, borderRadius: 24,
  },
  pillActive:    { backgroundColor: '#111', borderColor: '#111' },
  pillTxt:       { fontSize: 13, fontWeight: '600', color: '#555' },
  pillTxtActive: { color: '#fff', fontWeight: '700' },

  // Hiring Banner
  hiringBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff9f3', borderRadius: 14,
    borderWidth: 1, borderColor: '#fddcb5',
    marginBottom: 12, gap: 12, overflow: 'hidden',
    paddingVertical: 14, paddingRight: 14,
  },
  hiringAccent: {
    width: 5, alignSelf: 'stretch',
    backgroundColor: ORANGE,
    borderTopLeftRadius: 14, borderBottomLeftRadius: 14,
    marginRight: 2,
  },
  hiringIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#fff3e0',
    alignItems: 'center', justifyContent: 'center',
  },
  hiringTitle: { fontSize: 14, fontWeight: '800', color: ORANGE },
  hiringSub:   { fontSize: 12, color: '#999', marginTop: 2 },

  // List
  list: { paddingHorizontal: 14, paddingTop: 2, paddingBottom: 40 },

  // Filter Modal
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  filterSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 22, paddingBottom: 44,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 }, elevation: 24,
  },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 18 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle:  { fontSize: 18, fontWeight: '800', color: '#111' },
  resetTxt:    { fontSize: 13, fontWeight: '700', color: ORANGE },
  filterLabel: { fontSize: 11, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 12 },
  rangeRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#ececec', marginBottom: 8 },
  rangeActive: { borderColor: ORANGE, backgroundColor: '#fff8f3' },
  rangeTxt:    { fontSize: 14, fontWeight: '600', color: '#333' },
  applyFilterBtn: { backgroundColor: '#111', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  applyFilterTxt: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
});
