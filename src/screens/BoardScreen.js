import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, RefreshControl, Modal,
  Animated, Easing, StatusBar, Platform, useWindowDimensions,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import JobCard from '../components/JobCard';
import { Empty } from '../components/UI';
import { CAT_ICONS } from '../utils/constants';
import { useLang } from '../utils/i18n';

const ORANGE = '#f97316';
const TEAL   = '#0d9488';
const IS_WEB = Platform.OS === 'web';

const JOB_TYPES = ['All', 'Full-time', 'Part-time', 'Fresher', 'Work from Home'];
const SALARY_RANGES = [
  { label: 'Any',         min: 0,     max: Infinity },
  { label: 'Under ₹10k', min: 0,     max: 10000 },
  { label: '₹10k–₹20k', min: 10000, max: 20000 },
  { label: '₹20k–₹40k', min: 20000, max: 40000 },
  { label: 'Above ₹40k', min: 40000, max: Infinity },
];
const SORT_OPTIONS = [
  { label: 'Most Recent',    value: 'recent' },
  { label: 'Highest Salary', value: 'salary' },
  { label: 'Featured First', value: 'featured' },
];

function parseSalary(s = '') {
  const n = parseInt((s || '').replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

// ── Fade-in wrapper ─────────────────────────────────────────────────────────
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

// ── Pulsing dot ──────────────────────────────────────────────────────────────
function PulseDot() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.7, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{
      width: 7, height: 7, borderRadius: 4,
      backgroundColor: '#16a34a',
      transform: [{ scale }],
    }} />
  );
}

// ── Hiring Banner ────────────────────────────────────────────────────────────
function HiringBanner({ onPress }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 900, useNativeDriver: true }),
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
      <View style={s.hiringLiveBadge}>
        <PulseDot />
        <Text style={s.hiringLiveTxt}>LIVE</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Web: Stat pill for the header strip ─────────────────────────────────────
function StatPill({ icon, value, label, color }) {
  return (
    <View style={ws.statPill}>
      <View style={[ws.statIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <Text style={ws.statValue}>{value}</Text>
      <Text style={ws.statLabel}>{label}</Text>
    </View>
  );
}

// ── Web: Right-side sidebar card ─────────────────────────────────────────────
function SideCard({ children, style }) {
  return <View style={[ws.sideCard, style]}>{children}</View>;
}

// ── Web Quick Action ─────────────────────────────────────────────────────────
function QuickAction({ icon, label, color, onPress }) {
  return (
    <TouchableOpacity style={ws.quickAction} onPress={onPress} activeOpacity={0.8}>
      <View style={[ws.quickIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={ws.quickLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={13} color="#ccc" style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function BoardScreen({ route }) {
  const { jobs, loadJobs, role } = useAuth();
  const { t } = useLang();
  const nav    = useNavigation();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();

  const [search,      setSearch]      = useState(route?.params?.searchQuery || '');
  const [jobType,     setJobType]     = useState('All');
  const [salaryRange, setSalaryRange] = useState(SALARY_RANGES[0]);
  const [sortBy,      setSortBy]      = useState('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort,    setShowSort]    = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);

  const isGiver    = role === 'user' || role === 'admin';
  const showSidebar = IS_WEB && winW >= 900;

  // FlatList ref — used to scroll to top when filters change
  const flatListRef = useRef(null);
  useEffect(() => {
    flatListRef.current?.scrollToOffset?.({ offset: 0, animated: true });
  }, [jobType, salaryRange, search, sortBy]);

  // ── Scroll animation ──────────────────────────────────────────────────────
  const scrollY = useRef(new Animated.Value(0)).current;

  // Title shrinks/fades slightly as user scrolls
  const titleScale = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0.88],
    extrapolate: 'clamp',
  });
  const titleOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.6],
    extrapolate: 'clamp',
  });
  // Search bar gently slides up and fades as it scrolls away
  const searchTranslate = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, -4],
    extrapolate: 'clamp',
  });
  const searchOpacity = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [1, 0.85],
    extrapolate: 'clamp',
  });
  // Stats strip fades out quickly
  const statsOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // ── Sticky mini-header: slides in after scrolling past ~160px ─────────────
  const STICKY_THRESHOLD = 160;
  const stickyOpacity = scrollY.interpolate({
    inputRange: [STICKY_THRESHOLD, STICKY_THRESHOLD + 40],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const stickyTranslate = scrollY.interpolate({
    inputRange: [STICKY_THRESHOLD, STICKY_THRESHOLD + 40],
    outputRange: [-56, 0],
    extrapolate: 'clamp',
  });

  const filtered = useMemo(() => {
    const base = jobs.filter(j => {
      if (j.status !== 'active') return false;

      // Type filter — handle special cases
      if (jobType !== 'All') {
        if (jobType === 'Fresher') {
          // Accept jobs with fresher_ok flag OR type containing 'fresher'
          const typeLower = (j.type || '').toLowerCase();
          if (!j.fresher_ok && !typeLower.includes('fresher')) return false;
        } else if (jobType === 'Work from Home') {
          const typeLower = (j.type || '').toLowerCase();
          if (!typeLower.includes('work from home') && !typeLower.includes('wfh') && !typeLower.includes('remote')) return false;
        } else {
          if (j.type !== jobType) return false;
        }
      }

      if (parseSalary(j.salary) < salaryRange.min) return false;
      if (parseSalary(j.salary) > salaryRange.max) return false;

      if (search !== '') {
        const hay = [j.title, j.location, j.company, j.description || '', ...(Array.isArray(j.skills) ? j.skills : [])]
          .join(' ').toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }

      return true;
    });
    if (sortBy === 'salary') {
      return base.sort((a, b) => parseSalary(b.salary) - parseSalary(a.salary));
    }
    return base.sort((a, b) =>
      ((b.featured ? 2 : 0) + (b.urgent ? 1 : 0)) -
      ((a.featured ? 2 : 0) + (a.urgent ? 1 : 0)) ||
      b.timestamp - a.timestamp
    );
  }, [jobs, search, jobType, salaryRange, sortBy]);

  const activeFiltersCount =
    (jobType !== 'All' ? 1 : 0) +
    (salaryRange.label !== 'Any' ? 1 : 0);

  async function onRefresh() {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  }

  const sheetY = useRef(new Animated.Value(600)).current;
  useEffect(() => {
    Animated.timing(sheetY, {
      toValue: showFilters ? 0 : 600,
      duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, [showFilters]);

  // ── Header (shared mobile + web) ───────────────────────────────────────────
  const Header = (
    <View style={IS_WEB ? ws.header : s.header}>
      {/* Title row — animates on scroll */}
      <Animated.View style={[s.titleRow, {
        transform: [{ scale: titleScale }],
        opacity: titleOpacity,
        transformOrigin: 'left center',
      }]}>
        <View>
          <Text style={IS_WEB ? ws.pageTitle : s.pageTitle}>
            Jobs in{' '}
            <Text style={{ color: ORANGE }}>Nanded</Text>
          </Text>
          <Text style={IS_WEB ? ws.pageCount : s.pageCount}>
            {filtered.length} jobs found
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {/* Sort button */}
          <TouchableOpacity
            style={[s.iconBtn, IS_WEB && ws.iconBtn]}
            onPress={() => setShowSort(true)}
          >
            <Ionicons name="swap-vertical-outline" size={18} color="#444" />
          </TouchableOpacity>
          {/* Filter button */}
          <TouchableOpacity
            style={[s.iconBtn, activeFiltersCount > 0 && s.iconBtnActive, IS_WEB && ws.iconBtn]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={activeFiltersCount > 0 ? '#fff' : '#444'}
            />
            {activeFiltersCount > 0 && (
              <View style={s.filterBadge}>
                <Text style={s.filterBadgeTxt}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Search — animates on scroll */}
      <Animated.View style={[
        s.searchWrap, IS_WEB && ws.searchWrap,
        { transform: [{ translateY: searchTranslate }], opacity: searchOpacity },
      ]}>
        <Ionicons name="search-outline" size={18} color="#bbb" style={{ marginLeft: 14 }} />
        <TextInput
          style={[s.searchInput, IS_WEB && ws.searchInput]}
          placeholder="Search job title, company, skill..."
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
        <TouchableOpacity
          style={[s.searchFilterBtn, IS_WEB && ws.searchFilterBtn]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="filter-outline" size={17} color={ORANGE} />
          {IS_WEB && <Text style={ws.filterBtnTxt}>Filters</Text>}
        </TouchableOpacity>
      </Animated.View>

      {/* Type pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.pillsRow, IS_WEB && ws.pillsRow]}
        style={{ maxHeight: 52 }}
      >
        {JOB_TYPES.map(jt => (
          <TouchableOpacity
            key={jt}
            onPress={() => setJobType(jt)}
            style={[
              s.pill,
              IS_WEB && ws.pill,
              jobType === jt && s.pillActive,
            ]}
          >
            <Text style={[s.pillTxt, jobType === jt && s.pillTxtActive]}>{jt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Web: active filter chips */}
      {IS_WEB && activeFiltersCount > 0 && (
        <View style={ws.activeFiltersRow}>
          <Text style={ws.activeFiltersLabel}>Active filters:</Text>
          {jobType !== 'All' && (
            <TouchableOpacity style={ws.activeChip} onPress={() => setJobType('All')}>
              <Text style={ws.activeChipTxt}>{jobType}</Text>
              <Ionicons name="close" size={11} color={ORANGE} />
            </TouchableOpacity>
          )}
          {salaryRange.label !== 'Any' && (
            <TouchableOpacity style={ws.activeChip} onPress={() => setSalaryRange(SALARY_RANGES[0])}>
              <Text style={ws.activeChipTxt}>{salaryRange.label}</Text>
              <Ionicons name="close" size={11} color={ORANGE} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  // ── Hiring banner (as list header) ─────────────────────────────────────────
  const ListHeader = (
    <FadeIn delay={180}>
      <HiringBanner onPress={() => {}} />
    </FadeIn>
  );

  // ── Sort Modal ─────────────────────────────────────────────────────────────
  const SortModal = (
    <Modal visible={showSort} transparent animationType="fade" onRequestClose={() => setShowSort(false)}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowSort(false)} />
      <View style={[s.sortSheet, IS_WEB && ws.centeredModal]}>
        <View style={s.sheetHandle} />
        <Text style={s.sheetTitle}>Sort By</Text>
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[s.rangeRow, sortBy === opt.value && s.rangeActive]}
            onPress={() => { setSortBy(opt.value); setShowSort(false); }}
          >
            <Text style={[s.rangeTxt, sortBy === opt.value && { color: ORANGE, fontWeight: '700' }]}>
              {opt.label}
            </Text>
            {sortBy === opt.value && <Ionicons name="checkmark-circle" size={18} color={ORANGE} />}
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );

  // ── Filter Modal ───────────────────────────────────────────────────────────
  const FilterModal = (
    <Modal visible={showFilters} transparent animationType="none" onRequestClose={() => setShowFilters(false)}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowFilters(false)} />
      <Animated.View style={[s.filterSheet, IS_WEB && ws.centeredModal, { transform: [{ translateY: IS_WEB ? 0 : sheetY }] }]}>
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
  );

  // ── Category counts for sidebar ────────────────────────────────────────────
  const activeJobsList = jobs.filter(j => j.status === 'active');
  const catCounts = ['All', 'Delivery', 'Security', 'Data Entry', 'TeleCaller', 'Teaching', 'Driver', 'Other'].map(cat => ({
    label: cat,
    count: cat === 'All' ? activeJobsList.length : activeJobsList.filter(j => j.category === cat).length,
  })).filter(c => c.label === 'All' || c.count > 0);

  // ── Sticky mini-header (floats above scroll) ───────────────────────────────
  const StickyHeader = (
    <Animated.View
      pointerEvents="box-none"
      style={[
        IS_WEB ? ws.stickyBar : s.stickyBar,
        !IS_WEB && { top: insets.top },
        { opacity: stickyOpacity, transform: [{ translateY: stickyTranslate }] },
      ]}
    >
      <View style={IS_WEB ? ws.stickyInner : s.stickyInner}>
        {/* Title */}
        <Text style={IS_WEB ? ws.stickyTitle : s.stickyTitle}>
          Jobs in <Text style={{ color: ORANGE }}>Nanded</Text>
        </Text>

        {/* Search */}
        <View style={IS_WEB ? ws.stickySearch : s.stickySearch}>
          <Ionicons name="search-outline" size={15} color="#bbb" style={{ marginLeft: 10 }} />
          <TextInput
            style={IS_WEB ? ws.stickyInput : s.stickyInput}
            placeholder="Search jobs..."
            placeholderTextColor="#bbb"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ paddingHorizontal: 6 }}>
              <Ionicons name="close-circle" size={15} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );

  // ── WEB LAYOUT ─────────────────────────────────────────────────────────────
  if (IS_WEB) {
    return (
      <View style={ws.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        {/* Sticky mini-header — overlays on scroll */}
        {StickyHeader}

        {/* Web body: left sidebar + main + right sidebar */}
        <View style={ws.body}>

          {/* ── LEFT SIDEBAR (desktop only) ── */}
          {showSidebar && (
            <View style={ws.leftSidebar}>

              {/* Post CTA */}
              <SideCard style={ws.ctaCard}>
                <View style={ws.ctaCircle1} />
                <View style={ws.ctaCircle2} />
                <Text style={ws.ctaEyebrow}>FOR EMPLOYERS</Text>
                <Text style={ws.ctaTitle}>Post Jobs Free</Text>
                <Text style={ws.ctaSub}>Reach thousands of job seekers in Nanded instantly.</Text>
                <TouchableOpacity style={ws.ctaBtn} onPress={() => nav.navigate('Post')} activeOpacity={0.88}>
                  <Ionicons name="add-circle-outline" size={15} color="#fff" />
                  <Text style={ws.ctaBtnTxt}>Post an Ad</Text>
                </TouchableOpacity>
              </SideCard>

              {/* Browse by Category */}
              <SideCard>
                <Text style={ws.sideTitle}>Browse Categories</Text>
                {catCounts.map(({ label, count }) => (
                  <TouchableOpacity
                    key={label}
                    style={ws.catRow}
                    onPress={() => label === 'All' ? setSearch('') : setSearch(label)}
                    activeOpacity={0.75}
                  >
                    <View style={ws.catIconWrap}>
                      <Ionicons name={CAT_ICONS[label] || 'briefcase-outline'} size={14} color={ORANGE} />
                    </View>
                    <Text style={ws.catLabel}>{label}</Text>
                    <View style={ws.catCount}><Text style={ws.catCountTxt}>{count}</Text></View>
                  </TouchableOpacity>
                ))}
              </SideCard>

              {/* Quick Actions */}
              <SideCard>
                <Text style={ws.sideTitle}>Explore More</Text>
                <QuickAction icon="home-outline"      label="Find a Room"    color={TEAL}    onPress={() => nav.navigate('Rooms')} />
                <QuickAction icon="car-sport-outline" label="Rent a Vehicle" color="#9333ea" onPress={() => nav.navigate('Cars')} />
                <QuickAction icon="pricetag-outline"  label="Buy & Sell"     color="#0ea5e9" onPress={() => nav.navigate('BuySell')} />
                <QuickAction icon="sparkles-outline"  label="AI Career Help" color={ORANGE}  onPress={() => nav.navigate('AIMatch')} />
              </SideCard>

            </View>
          )}

          {/* ── MAIN COLUMN ── */}
          <View style={[ws.mainCol, !showSidebar && { marginLeft: 0, marginRight: 0 }]}>
            <FlatList
              ref={flatListRef}
              data={filtered}
              keyExtractor={j => String(j.id)}
              numColumns={winW >= 1280 ? 2 : 1}
              key={winW >= 1280 ? 'two-col' : 'one-col'}
              columnWrapperStyle={winW >= 1280 ? { gap: 12 } : null}
              contentContainerStyle={ws.list}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              horizontal={false}
              bounces={false}
              overScrollMode="never"
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={16}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ORANGE]} tintColor={ORANGE} />
              }
              ListHeaderComponent={
                <>
                  {Header}
                  {ListHeader}
                </>
              }
              renderItem={({ item, index }) => (
                <View style={winW >= 1280 ? { flex: 1 } : {}}>
                  <JobCard
                    job={item}
                    index={index}
                    onPress={() => nav.navigate('JobDetail', { job: item })}
                  />
                </View>
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
          </View>

          {/* ── RIGHT SIDEBAR (desktop only) ── */}
          {showSidebar && (
            <View style={ws.rightSidebar}>

              {/* Sort */}
              <SideCard>
                <Text style={ws.sideTitle}>Sort By</Text>
                {SORT_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[ws.sortRow, sortBy === opt.value && ws.sortRowActive]}
                    onPress={() => setSortBy(opt.value)}
                  >
                    <Text style={[ws.sortTxt, sortBy === opt.value && ws.sortTxtActive]}>
                      {opt.label}
                    </Text>
                    {sortBy === opt.value && <Ionicons name="checkmark-circle" size={16} color={ORANGE} />}
                  </TouchableOpacity>
                ))}
              </SideCard>

              {/* Salary filter */}
              <SideCard>
                <Text style={ws.sideTitle}>Salary Range</Text>
                {SALARY_RANGES.map(r => (
                  <TouchableOpacity
                    key={r.label}
                    style={[ws.sortRow, salaryRange.label === r.label && ws.sortRowActive]}
                    onPress={() => setSalaryRange(r)}
                  >
                    <Text style={[ws.sortTxt, salaryRange.label === r.label && ws.sortTxtActive]}>
                      {r.label}
                    </Text>
                    {salaryRange.label === r.label && <Ionicons name="checkmark-circle" size={16} color={ORANGE} />}
                  </TouchableOpacity>
                ))}
              </SideCard>

              {/* Job Type quick filter */}
              <SideCard>
                <Text style={ws.sideTitle}>Job Type</Text>
                {JOB_TYPES.map(jt => (
                  <TouchableOpacity
                    key={jt}
                    style={[ws.sortRow, jobType === jt && ws.sortRowActive]}
                    onPress={() => setJobType(jt)}
                  >
                    <Text style={[ws.sortTxt, jobType === jt && ws.sortTxtActive]}>{jt}</Text>
                    {jobType === jt && <Ionicons name="checkmark-circle" size={16} color={ORANGE} />}
                  </TouchableOpacity>
                ))}
              </SideCard>

              {/* Tips card */}
              <SideCard style={ws.tipCard}>
                <Text style={ws.tipTitle}>💡 Job Search Tips</Text>
                {[
                  'Update your profile to get noticed',
                  'Apply within 24h of posting for best chance',
                  'Use AI Career Help for salary insights',
                ].map((tip, i) => (
                  <View key={i} style={ws.tipRow}>
                    <View style={ws.tipDot} />
                    <Text style={ws.tipTxt}>{tip}</Text>
                  </View>
                ))}
                <TouchableOpacity style={ws.tipBtn} onPress={() => nav.navigate('AIMatch')} activeOpacity={0.85}>
                  <Ionicons name="sparkles-outline" size={14} color={ORANGE} />
                  <Text style={ws.tipBtnTxt}>Try AI Career Help</Text>
                </TouchableOpacity>
              </SideCard>

            </View>
          )}
        </View>

        {SortModal}
        {FilterModal}
      </View>
    );
  }

  // ── MOBILE LAYOUT ──────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f7f7" />
      {/* Sticky mini-header — overlays on scroll */}
      {StickyHeader}
      <FlatList
        ref={flatListRef}
        data={filtered}
        keyExtractor={j => j.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        horizontal={false}
        bounces={false}
        overScrollMode="never"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ORANGE]} tintColor={ORANGE} />
        }
        ListHeaderComponent={
          <>
            {Header}
            {ListHeader}
          </>
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
      {SortModal}
      {FilterModal}
    </View>
  );
}

// ── WEB STYLES ────────────────────────────────────────────────────────────────
const ws = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },

  // 3-column body: left sidebar | main | right sidebar
  body: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    paddingTop: 12,
    paddingHorizontal: 16,
    gap: 16,
  },

  // Left sidebar — sticky so it stays in view while jobs scroll
  leftSidebar: {
    width: 220,
    flexShrink: 0,
    gap: 12,
    alignSelf: 'flex-start',
    position: 'sticky',
    top: 70,
    maxHeight: 'calc(100vh - 82px)',
    overflowY: 'auto',
    paddingBottom: 16,
  },

  // Main column — fills all remaining space
  mainCol: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },

  // Right sidebar — sticky so filters stay in view
  rightSidebar: {
    width: 220,
    flexShrink: 0,
    gap: 12,
    alignSelf: 'flex-start',
    position: 'sticky',
    top: 70,
    maxHeight: 'calc(100vh - 82px)',
    overflowY: 'auto',
    paddingBottom: 16,
  },

  header: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  pageCount: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
    marginBottom: 16,
  },

  // Stats strip
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f9f9f9',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  statIcon: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: 13, fontWeight: '800', color: '#111' },
  statLabel: { fontSize: 11, color: '#999', fontWeight: '500' },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12, height: 48,
    borderWidth: 1.5, borderColor: '#ebebeb',
    marginBottom: 14,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1, height: 48,
    paddingHorizontal: 10, fontSize: 14, color: '#111',
    outlineStyle: 'none',
  },
  searchFilterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    height: 48, paddingHorizontal: 16,
    backgroundColor: '#fff7f0',
    borderLeftWidth: 1, borderLeftColor: '#ebebeb',
  },
  filterBtnTxt: { fontSize: 13, fontWeight: '700', color: ORANGE },

  // Pills
  pillsRow: { gap: 8, paddingBottom: 14, alignItems: 'center' },
  pill: {
    borderWidth: 1.5, borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    paddingVertical: 7, paddingHorizontal: 18, borderRadius: 100,
  },

  // Active filter chips
  activeFiltersRow: {
    flexDirection: 'row', alignItems: 'center',
    flexWrap: 'wrap', gap: 6, marginTop: 4,
  },
  activeFiltersLabel: { fontSize: 11, color: '#bbb', fontWeight: '600' },
  activeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff7f0', borderRadius: 100,
    borderWidth: 1, borderColor: '#fed7aa',
    paddingVertical: 4, paddingHorizontal: 10,
  },
  activeChipTxt: { fontSize: 11, color: ORANGE, fontWeight: '700' },

  // Icon buttons
  iconBtn: {
    height: 40, paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    borderWidth: 1, borderColor: '#e8e8e8',
    alignItems: 'center', justifyContent: 'center',
  },

  list: { paddingTop: 0, paddingBottom: 48 },

  // Shared side card
  sideCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  sideTitle: {
    fontSize: 13, fontWeight: '800', color: '#111', marginBottom: 12,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  // Post CTA card
  ctaCard: { backgroundColor: ORANGE },
  ctaCircle1: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)', top: -30, right: -20,
  },
  ctaCircle2: {
    position: 'absolute', width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.08)', bottom: -15, right: 30,
  },
  ctaEyebrow: {
    fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1, marginBottom: 4, position: 'relative',
  },
  ctaTitle: {
    fontSize: 17, fontWeight: '900', color: '#fff',
    marginBottom: 5, position: 'relative',
  },
  ctaSub: {
    fontSize: 11, color: 'rgba(255,255,255,0.85)',
    lineHeight: 16, marginBottom: 14, position: 'relative',
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14,
    alignSelf: 'flex-start', position: 'relative',
  },
  ctaBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Category rows in left sidebar
  catRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10,
    marginBottom: 2,
  },
  catIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#fff7f0',
    alignItems: 'center', justifyContent: 'center',
  },
  catLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: '#333' },
  catCount: {
    backgroundColor: '#f3f4f6', borderRadius: 20,
    paddingVertical: 2, paddingHorizontal: 7,
  },
  catCountTxt: { fontSize: 11, fontWeight: '700', color: '#888' },

  // Sort rows in right sidebar
  sortRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 9, paddingHorizontal: 10, borderRadius: 10,
    marginBottom: 2,
  },
  sortRowActive: { backgroundColor: '#fff7f0' },
  sortTxt:      { fontSize: 13, fontWeight: '600', color: '#444' },
  sortTxtActive:{ color: ORANGE, fontWeight: '700' },

  // Quick actions
  quickAction: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 9, paddingHorizontal: 6,
    borderRadius: 10, marginBottom: 2,
  },
  quickIcon: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  quickLabel: { fontSize: 13, fontWeight: '600', color: '#222' },

  // Tips card
  tipCard: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  tipTitle: { fontSize: 13, fontWeight: '800', color: '#15803d', marginBottom: 10 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  tipDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#16a34a', marginTop: 6, flexShrink: 0 },
  tipTxt: { fontSize: 12, color: '#166534', lineHeight: 18, flex: 1 },
  tipBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#bbf7d0',
    paddingVertical: 8, paddingHorizontal: 12, marginTop: 4, alignSelf: 'flex-start',
  },
  tipBtnTxt: { fontSize: 12, fontWeight: '700', color: ORANGE },

  // Centered modal for web
  centeredModal: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -180 }, { translateY: -200 }],
    width: 360,
    borderRadius: 20,
    bottom: 'auto',
  },

  // Sticky mini-header
  stickyBar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  stickyInner: {
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  stickyTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111',
    letterSpacing: -0.3,
    flexShrink: 0,
  },
  stickySearch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    height: 38,
    borderWidth: 1.5,
    borderColor: '#ebebeb',
    overflow: 'hidden',
  },
  stickyInput: {
    flex: 1,
    height: 38,
    paddingHorizontal: 8,
    fontSize: 13,
    color: '#111',
    outlineStyle: 'none',
  },
});

// ── MOBILE STYLES ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f7f7', overflow: 'hidden' },

  // Header
  header: {
    backgroundColor: '#f7f7f7',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 10,
  },
  pageTitle: {
    fontSize: 26, fontWeight: '900', color: '#111', letterSpacing: -0.5,
  },
  pageCount: {
    fontSize: 13, color: '#999', fontWeight: '500', marginTop: 2,
  },

  // Icon buttons
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#ececec',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  iconBtnActive: { backgroundColor: '#111' },
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
    marginTop: 4, marginBottom: 14, height: 52,
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
  pillsRow: {
    paddingBottom: 14, gap: 8, alignItems: 'center',
  },
  pill: {
    borderWidth: 1.5, borderColor: '#d8d8d8',
    backgroundColor: '#fff',
    paddingVertical: 7, paddingHorizontal: 18, borderRadius: 24,
  },
  pillActive:    { backgroundColor: '#111', borderColor: '#111' },
  pillTxt:       { fontSize: 13, fontWeight: '600', color: '#555' },
  pillTxtActive: { color: '#fff', fontWeight: '700' },

  // Hiring Banner
  hiringBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff9f3', borderRadius: 16,
    borderWidth: 1, borderColor: '#fddcb5',
    marginBottom: 12, overflow: 'hidden',
    paddingVertical: 14, paddingRight: 14,
  },
  hiringAccent: {
    width: 5, alignSelf: 'stretch',
    backgroundColor: ORANGE,
    borderTopLeftRadius: 14, borderBottomLeftRadius: 14,
    marginRight: 10,
  },
  hiringIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#fff3e0',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  hiringTitle:   { fontSize: 14, fontWeight: '800', color: ORANGE },
  hiringSub:     { fontSize: 11, color: '#999', marginTop: 2 },
  hiringLiveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#f0fdf4', borderRadius: 20,
    paddingVertical: 4, paddingHorizontal: 10,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  hiringLiveTxt: { fontSize: 10, fontWeight: '800', color: '#16a34a' },

  // List
  list: { paddingHorizontal: 14, paddingTop: 0, paddingBottom: 40 },

  // Modals
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  filterSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 22, paddingBottom: 44,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 }, elevation: 24,
  },
  sortSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 22, paddingBottom: 44,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 }, elevation: 24,
  },
  sheetHandle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 18,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  sheetTitle:  { fontSize: 18, fontWeight: '800', color: '#111' },
  resetTxt:    { fontSize: 13, fontWeight: '700', color: ORANGE },
  filterLabel: {
    fontSize: 11, fontWeight: '700', color: '#aaa',
    textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 12,
  },
  rangeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#ececec', marginBottom: 8,
  },
  rangeActive:    { borderColor: ORANGE, backgroundColor: '#fff8f3' },
  rangeTxt:       { fontSize: 14, fontWeight: '600', color: '#333' },
  applyFilterBtn: {
    backgroundColor: '#111', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 12,
  },
  applyFilterTxt: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },

  // Sticky mini-header (mobile)
  stickyBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  stickyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stickyTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111',
    letterSpacing: -0.2,
    flexShrink: 0,
  },
  stickySearch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    height: 36,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    overflow: 'hidden',
  },
  stickyInput: {
    flex: 1,
    height: 36,
    paddingHorizontal: 8,
    fontSize: 13,
    color: '#111',
  },
});
