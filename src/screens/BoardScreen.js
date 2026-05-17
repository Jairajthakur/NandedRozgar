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

const ORANGE  = '#f97316';
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

// ── Fade-in header ─────────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0 }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty      = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 340, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(ty,      { toValue: 0, duration: 340, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
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
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <TouchableOpacity style={s.hiringBanner} onPress={onPress} activeOpacity={0.85}>
      <Animated.View style={[s.hiringIconWrap, { transform: [{ scale: pulse }] }]}>
        <Ionicons name="trending-up" size={18} color={ORANGE} />
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
  const nav   = useNavigation();
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

  // Filter sheet slide animation
  const sheetY = useRef(new Animated.Value(400)).current;
  useEffect(() => {
    Animated.timing(sheetY, {
      toValue: showFilters ? 0 : 400,
      duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, [showFilters]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

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
            <Ionicons name="options-outline" size={20} color={activeFiltersCount > 0 ? '#fff' : '#555'} />
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
          <Ionicons name="search-outline" size={17} color="#aaa" style={{ marginLeft: 12 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search job title, company..."
            placeholderTextColor="#bbb"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ paddingRight: 12 }}>
              <Ionicons name="close-circle" size={18} color="#ccc" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.searchFilterBtn} onPress={() => setShowFilters(true)}>
            <Ionicons name="options-outline" size={17} color="#555" />
          </TouchableOpacity>
        </View>
      </FadeIn>

      {/* ── Job Type Pills ── */}
      <FadeIn delay={120}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pillsRow}
          style={{ maxHeight: 50 }}
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
  root: { flex: 1, backgroundColor: '#fff' },

  // Header
  pageHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6, backgroundColor: '#fff',
  },
  pageTitle:  { fontSize: 24, fontWeight: '800', color: '#111', letterSpacing: -0.3 },
  pageCount:  { fontSize: 12, color: '#999', fontWeight: '500', marginTop: 3 },
  filterIconBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#f5f5f5', borderWidth: 0,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  filterIconBtnActive: { backgroundColor: '#111' },
  filterBadge: {
    position: 'absolute', top: -3, right: -3,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#e8e8e8',
    marginHorizontal: 16, marginTop: 8, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  searchInput: { flex: 1, paddingVertical: 13, paddingHorizontal: 8, fontSize: 14, color: '#111' },
  searchFilterBtn: {
    width: 46, height: 46, alignItems: 'center', justifyContent: 'center',
    borderLeftWidth: 1, borderLeftColor: '#f0f0f0',
  },

  // Pills
  pillsRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8, alignItems: 'center' },
  pill: {
    borderWidth: 1.5, borderColor: '#e0e0e0',
    backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 24,
  },
  pillActive:   { backgroundColor: '#111', borderColor: '#111' },
  pillTxt:      { fontSize: 13, fontWeight: '600', color: '#555' },
  pillTxtActive:{ color: '#fff', fontWeight: '700' },

  // Hiring Banner
  hiringBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff8f3', borderRadius: 14, borderWidth: 1, borderColor: '#fed7aa',
    padding: 14, marginBottom: 12, gap: 12,
  },
  hiringIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center',
  },
  hiringTitle: { fontSize: 14, fontWeight: '700', color: '#111' },
  hiringSub:   { fontSize: 12, color: '#999', marginTop: 2 },

  // List
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },

  // Filter Modal
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  filterSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 }, elevation: 20,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  sheetTitle:  { fontSize: 18, fontWeight: '800', color: '#111' },
  resetTxt:    { fontSize: 13, fontWeight: '700', color: ORANGE },
  filterLabel: { fontSize: 11, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  rangeRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#ebebeb', marginBottom: 8 },
  rangeActive: { borderColor: ORANGE, backgroundColor: '#fff8f3' },
  rangeTxt:    { fontSize: 13, fontWeight: '600', color: '#333' },
  applyFilterBtn: { backgroundColor: '#111', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 10 },
  applyFilterTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
