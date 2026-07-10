import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, RefreshControl, Platform, StatusBar,
  Modal, Animated, Easing, useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { http } from '../utils/api';
import { Empty } from '../components/UI';

import { useLang } from '../utils/i18n';
import { useDistrict } from '../context/DistrictContext';
import NativeAdCard from '../components/ads/NativeAdCard';
import BannerAd from '../components/ads/BannerAd';
import { ADS_SUPPORTED, NATIVE_AD_FREQUENCY } from '../components/ads/adConfig';
import { useIsPremium } from '../hooks/useIsPremium';

const ORANGE = '#f97316';
const TEAL   = '#0d9488';
const IS_WEB = Platform.OS === 'web';

const SKILL_CATEGORIES = [
  'All', 'Mason', 'Electrician', 'Plumber', 'Painter', 'Carpenter', 'Welder', 'Helper',
];
const SKILL_ICONS = {
  All: 'apps-outline',
  Mason: 'construct-outline',
  Electrician: 'flash-outline',
  Plumber: 'water-outline',
  Painter: 'color-palette-outline',
  Carpenter: 'hammer-outline',
  Welder: 'flame-outline',
  Helper: 'people-outline',
};

const WAGE_RANGES = [
  { label: 'Any',           min: 0,    max: Infinity },
  { label: 'Under ₹500',   min: 0,    max: 500 },
  { label: '₹500–₹800',   min: 500,  max: 800 },
  { label: '₹800–₹1,200', min: 800,  max: 1200 },
  { label: 'Above ₹1,200', min: 1200, max: Infinity },
];
const AVAILABILITY_OPTIONS = ['All', 'At Chowk Today', 'Available Now', 'Busy this week'];

function parseWage(raw) {
  const n = parseInt(String(raw || '').replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

// ── Fade-in wrapper ─────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0 }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty      = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 340, delay, easing: Easing.out(Easing.quad), useNativeDriver: !IS_WEB }),
      Animated.timing(ty,      { toValue: 0, duration: 340, delay, easing: Easing.out(Easing.quad), useNativeDriver: !IS_WEB }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY: ty }] }}>{children}</Animated.View>;
}

// ── Web: sidebar building blocks (match Jobs / Rooms / Cars) ───────────────
function SideCard({ children, style }) {
  return <View style={[ws.sideCard, style]}>{children}</View>;
}
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

// ── Labour profile card — mirrors JobCard's look (accent bar + inner pad) ──
function LabourCard({ item, onPress, index = 0 }) {
  const hasRating = !!item.rating_count && Number(item.rating_count) > 0;
  const isBusy = item.availability === 'busy';
  const atChowk = !!item.checked_in_today;

  return (
    <FadeIn delay={Math.min(index, 8) * 60}>
      <TouchableOpacity style={cs.card} onPress={onPress} activeOpacity={0.9}>
        <View style={[cs.accentBar, { backgroundColor: atChowk ? '#16a34a' : isBusy ? '#9ca3af' : ORANGE }]} />
        <View style={cs.cardInner}>
          {atChowk ? (
            <View style={[cs.badge, { backgroundColor: '#16a34a' }]}>
              <Ionicons name="walk" size={9} color="#fff" />
              <Text style={cs.badgeTxt}>AT THE CHOWK TODAY</Text>
            </View>
          ) : isBusy ? (
            <View style={[cs.badge, { backgroundColor: '#9ca3af' }]}>
              <Ionicons name="time-outline" size={9} color="#fff" />
              <Text style={cs.badgeTxt}>BUSY THIS WEEK</Text>
            </View>
          ) : hasRating && Number(item.rating_avg) >= 4.5 ? (
            <View style={[cs.badge, { backgroundColor: ORANGE }]}>
              <Ionicons name="star" size={9} color="#fff" />
              <Text style={cs.badgeTxt}>TOP RATED</Text>
            </View>
          ) : null}

          <View style={cs.titleRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={cs.title} numberOfLines={1}>{item.full_name}</Text>
                {!!item.id_verified && <Ionicons name="shield-checkmark" size={14} color="#2563eb" />}
              </View>
            </View>
            <Text style={cs.wage}>
              {item.daily_wage ? `₹${item.daily_wage}/day` : 'Contact for rate'}
            </Text>
          </View>

          <View style={cs.subtitleRow}>
            <View style={cs.tradeChip}>
              <Ionicons name={SKILL_ICONS[item.skill_category] || 'briefcase-outline'} size={11} color={ORANGE} />
              <Text style={cs.tradeChipTxt}>{item.skill_category}</Text>
            </View>
            {!!item.experience_years && (
              <Text style={cs.subtitle}>{item.experience_years} yrs experience</Text>
            )}
            {hasRating ? (
              <View style={cs.ratingWrap}>
                <Ionicons name="star" size={11} color="#f59e0b" />
                <Text style={cs.ratingTxt}>{Number(item.rating_avg).toFixed(1)} ({item.rating_count})</Text>
              </View>
            ) : (
              <View style={cs.newPill}><Text style={cs.newPillTxt}>New</Text></View>
            )}
          </View>

          <View style={cs.footer}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={cs.hireBtn} onPress={onPress} activeOpacity={0.85}>
              <Text style={cs.hireTxt}>Hire now</Text>
              <Ionicons name="arrow-forward" size={13} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </FadeIn>
  );
}

const cs = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#ebebeb',
    marginBottom: 12, overflow: 'hidden', flexDirection: 'row',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  accentBar: { width: 4, alignSelf: 'stretch' },
  cardInner: { flex: 1, padding: 16 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8, marginBottom: 8,
  },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '700', color: '#111', flexShrink: 1 },
  wage: { fontSize: 13, fontWeight: '700', color: ORANGE, paddingTop: 2, textAlign: 'right' },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  tradeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff7f0', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 7,
  },
  tradeChipTxt: { fontSize: 11, fontWeight: '700', color: ORANGE },
  subtitle: { fontSize: 12, color: '#888', fontWeight: '500' },
  ratingWrap: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  ratingTxt: { fontSize: 11, fontWeight: '700', color: '#111' },
  newPill: { backgroundColor: '#ecfdf5', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginLeft: 'auto' },
  newPillTxt: { fontSize: 10, fontWeight: '700', color: '#059669' },
  footer: { flexDirection: 'row', alignItems: 'center' },
  hireBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: ORANGE, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
  },
  hireTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
});

// ── Main screen ─────────────────────────────────────────────────────────────
export default function LabourScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const { currentDistrict } = useDistrict();
  const { width } = useWindowDimensions();

  const [labourers, setLabourers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeSkill, setActiveSkill] = useState('All');
  const [wageRange, setWageRange] = useState(WAGE_RANGES[0]);
  const [availability, setAvailability] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState(null);

  const showSidebar = IS_WEB && width >= 900;

  // Fetch the full list once (per district) — everything else filters client-side,
  // same pattern as the Jobs / Rooms / Cars boards.
  const load = useCallback(async (opts = {}) => {
    try {
      if (!opts.silent) setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (currentDistrict?.id) params.set('district', currentDistrict.id);
      const res = await http('GET', `/api/labour?${params.toString()}`);
      if (res?.ok) {
        setLabourers(res.labourers || []);
      } else {
        setError('Could not load labour profiles right now.');
      }
    } catch (e) {
      setError('Could not load labour profiles right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentDistrict]);

  useEffect(() => { load(); }, [currentDistrict]);

  const onRefresh = () => { setRefreshing(true); load({ silent: true }); };

  const filtered = useMemo(() => {
    return labourers.filter(l => {
      if (activeSkill !== 'All' && l.skill_category !== activeSkill) return false;
      const wage = parseWage(l.daily_wage);
      if (l.daily_wage && (wage < wageRange.min || wage > wageRange.max)) return false;
      if (!l.daily_wage && wageRange.label !== 'Any') return false;
      if (availability === 'At Chowk Today' && !l.checked_in_today) return false;
      if (availability === 'Available Now' && l.availability === 'busy') return false;
      if (availability === 'Busy this week' && l.availability !== 'busy') return false;
      if (search.trim()) {
        const hay = [l.full_name, l.skill_category].join(' ').toLowerCase();
        if (!hay.includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [labourers, activeSkill, wageRange, availability, search]);

  const isPremium = useIsPremium();

  // Insert one native ad card after every NATIVE_AD_FREQUENCY real profiles —
  // skipped for premium users and on web (ADS_SUPPORTED is native-only).
  const feedWithAds = useMemo(() => {
    if (!ADS_SUPPORTED || isPremium) return filtered;
    const withAds = [];
    let sinceLastAd = 0;
    filtered.forEach(item => {
      withAds.push(item);
      sinceLastAd++;
      if (sinceLastAd >= NATIVE_AD_FREQUENCY) {
        withAds.push({ __isAd: true, id: 'ad_' + withAds.length });
        sinceLastAd = 0;
      }
    });
    return withAds;
  }, [filtered, isPremium]);

  const activeFiltersCount =
    (wageRange.label !== 'Any' ? 1 : 0) + (availability !== 'All' ? 1 : 0);

  const tradeCounts = SKILL_CATEGORIES.map(cat => ({
    label: cat,
    count: cat === 'All' ? labourers.length : labourers.filter(l => l.skill_category === cat).length,
  })).filter(c => c.label === 'All' || c.count > 0);

  const sheetY = useRef(new Animated.Value(600)).current;
  useEffect(() => {
    Animated.timing(sheetY, {
      toValue: showFilters ? 0 : 600, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: !IS_WEB,
    }).start();
  }, [showFilters]);

  // ── Header (shared mobile + web) ───────────────────────────────────────────
  const Header = (
    <View style={IS_WEB ? ws.header : s.header}>
      <View style={s.titleRow}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={() => nav.navigate('Home')} activeOpacity={0.8}>
            <Text style={IS_WEB ? ws.pageTitle : s.pageTitle}>
              Find <Text style={{ color: ORANGE }}>Skilled Labour</Text>
            </Text>
          </TouchableOpacity>
          <Text style={IS_WEB ? ws.pageCount : s.pageCount}>
            {filtered.length} profile{filtered.length === 1 ? '' : 's'} found
            {currentDistrict?.name ? ` in ${currentDistrict.name}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[s.iconBtn, activeFiltersCount > 0 && s.iconBtnActive, IS_WEB && ws.iconBtn]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={18} color={activeFiltersCount > 0 ? '#fff' : '#444'} />
          {activeFiltersCount > 0 && (
            <View style={s.filterBadge}><Text style={s.filterBadgeTxt}>{activeFiltersCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      <View style={[s.searchWrap, IS_WEB && ws.searchWrap]}>
        <Ionicons name="search-outline" size={18} color="#bbb" style={{ marginLeft: 14 }} />
        <TextInput
          style={[s.searchInput, IS_WEB && ws.searchInput]}
          placeholder="Search mason, electrician, plumber..."
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
        <TouchableOpacity style={[s.searchFilterBtn, IS_WEB && ws.searchFilterBtn]} onPress={() => setShowFilters(true)}>
          <Ionicons name="filter-outline" size={17} color={ORANGE} />
          {IS_WEB && <Text style={ws.filterBtnTxt}>Filters</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.pillsRow, IS_WEB && ws.pillsRow]}
        style={{ maxHeight: 52 }}
      >
        {SKILL_CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            onPress={() => setActiveSkill(cat)}
            style={[s.pill, IS_WEB && ws.pill, activeSkill === cat && s.pillActive]}
          >
            <Ionicons name={SKILL_ICONS[cat]} size={13} color={activeSkill === cat ? '#fff' : '#777'} style={{ marginRight: 5 }} />
            <Text style={[s.pillTxt, activeSkill === cat && s.pillTxtActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {IS_WEB && activeFiltersCount > 0 && (
        <View style={ws.activeFiltersRow}>
          <Text style={ws.activeFiltersLabel}>Active filters:</Text>
          {wageRange.label !== 'Any' && (
            <TouchableOpacity style={ws.activeChip} onPress={() => setWageRange(WAGE_RANGES[0])}>
              <Text style={ws.activeChipTxt}>{wageRange.label}</Text>
              <Ionicons name="close" size={11} color={ORANGE} />
            </TouchableOpacity>
          )}
          {availability !== 'All' && (
            <TouchableOpacity style={ws.activeChip} onPress={() => setAvailability('All')}>
              <Text style={ws.activeChipTxt}>{availability}</Text>
              <Ionicons name="close" size={11} color={ORANGE} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  // ── Filter modal (wage range + availability) ───────────────────────────────
  const FilterModal = (
    <Modal visible={showFilters} transparent animationType="none" onRequestClose={() => setShowFilters(false)}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowFilters(false)} />
      <Animated.View style={[s.filterSheet, IS_WEB && ws.centeredModal, { transform: [{ translateY: IS_WEB ? 0 : sheetY }] }]}>
        <View style={s.sheetHandle} />
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>Filters</Text>
          <TouchableOpacity onPress={() => { setWageRange(WAGE_RANGES[0]); setAvailability('All'); }}>
            <Text style={s.resetTxt}>Reset All</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.filterLabel}>Daily Wage</Text>
        {WAGE_RANGES.map(r => (
          <TouchableOpacity
            key={r.label}
            style={[s.rangeRow, wageRange.label === r.label && s.rangeActive]}
            onPress={() => setWageRange(r)}
          >
            <Text style={[s.rangeTxt, wageRange.label === r.label && { color: ORANGE, fontWeight: '700' }]}>{r.label}</Text>
            {wageRange.label === r.label && <Ionicons name="checkmark-circle" size={18} color={ORANGE} />}
          </TouchableOpacity>
        ))}

        <Text style={[s.filterLabel, { marginTop: 20 }]}>Availability</Text>
        {AVAILABILITY_OPTIONS.map(a => (
          <TouchableOpacity
            key={a}
            style={[s.rangeRow, availability === a && s.rangeActive]}
            onPress={() => setAvailability(a)}
          >
            <Text style={[s.rangeTxt, availability === a && { color: ORANGE, fontWeight: '700' }]}>{a}</Text>
            {availability === a && <Ionicons name="checkmark-circle" size={18} color={ORANGE} />}
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={s.applyFilterBtn} onPress={() => setShowFilters(false)}>
          <Text style={s.applyFilterTxt}>Show {filtered.length} Profiles</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );

  const renderCard = ({ item, index }) => {
    if (item.__isAd) return <NativeAdCard />;
    return <LabourCard item={item} index={index} onPress={() => nav.navigate('LabourDetail', { id: item.id })} />;
  };

  const EmptyState = (
    <Empty
      icon="construct-outline"
      title={activeSkill === 'All' ? 'No labour profiles found' : `No ${activeSkill.toLowerCase()}s listed yet`}
      sub={search || activeFiltersCount > 0 ? 'Try different filters' : 'Be the first to post a profile in this area.'}
      action={() => nav.navigate('PostLabourProfile')}
      actionLabel="Post your profile"
    />
  );

  // ── WEB LAYOUT ─────────────────────────────────────────────────────────────
  if (IS_WEB) {
    return (
      <View style={ws.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        <View style={ws.topBar}>
          <TouchableOpacity onPress={() => nav.navigate('Home')} style={ws.topBarBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#111" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => nav.navigate('Home')} activeOpacity={0.8}>
            <Text style={ws.topBarTitle}>Labour</Text>
          </TouchableOpacity>
        </View>

        <View style={ws.body}>
          {showSidebar && (
            <View style={ws.leftSidebar}>
              <SideCard style={ws.ctaCard}>
                <View style={ws.ctaCircle1} />
                <View style={ws.ctaCircle2} />
                <Text style={ws.ctaEyebrow}>FOR WORKERS</Text>
                <Text style={ws.ctaTitle}>Post Your Profile Free</Text>
                <Text style={ws.ctaSub}>Get hired by employers across Nanded instantly.</Text>
                <TouchableOpacity style={ws.ctaBtn} onPress={() => nav.navigate('PostLabourProfile')} activeOpacity={0.88}>
                  <Ionicons name="add-circle-outline" size={15} color="#fff" />
                  <Text style={ws.ctaBtnTxt}>Post a Profile</Text>
                </TouchableOpacity>
              </SideCard>

              <SideCard>
                <Text style={ws.sideTitle}>Browse Trades</Text>
                {tradeCounts.map(({ label, count }) => (
                  <TouchableOpacity
                    key={label}
                    style={ws.catRow}
                    onPress={() => setActiveSkill(label)}
                    activeOpacity={0.75}
                  >
                    <View style={ws.catIconWrap}>
                      <Ionicons name={SKILL_ICONS[label]} size={14} color={ORANGE} />
                    </View>
                    <Text style={ws.catLabel}>{label}</Text>
                    <View style={ws.catCount}><Text style={ws.catCountTxt}>{count}</Text></View>
                  </TouchableOpacity>
                ))}
              </SideCard>

              <SideCard>
                <Text style={ws.sideTitle}>Explore More</Text>
                <QuickAction icon="briefcase-outline"  label="Find a Job"      color={ORANGE}  onPress={() => nav.navigate('Jobs')} />
                <QuickAction icon="home-outline"       label="Find a Room"     color={TEAL}    onPress={() => nav.navigate('Rooms')} />
                <QuickAction icon="car-sport-outline"  label="Rent a Vehicle"  color="#9333ea" onPress={() => nav.navigate('Cars')} />
                <QuickAction icon="pricetag-outline"   label="Buy & Sell"      color="#0ea5e9" onPress={() => nav.navigate('BuySell')} />
              </SideCard>
            </View>
          )}

          <View style={[ws.mainCol, !showSidebar && { marginLeft: 0, marginRight: 0 }]}>
            <FlatList
              data={feedWithAds}
              keyExtractor={item => item.__isAd ? item.id : String(item.id)}
              contentContainerStyle={ws.list}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ORANGE]} tintColor={ORANGE} />}
              ListHeaderComponent={Header}
              renderItem={renderCard}
              ListEmptyComponent={!loading && EmptyState}
            />
          </View>

          {showSidebar && (
            <View style={ws.rightSidebar}>
              <SideCard>
                <Text style={ws.sideTitle}>Daily Wage</Text>
                {WAGE_RANGES.map(r => (
                  <TouchableOpacity
                    key={r.label}
                    style={[ws.sortRow, wageRange.label === r.label && ws.sortRowActive]}
                    onPress={() => setWageRange(r)}
                  >
                    <Text style={[ws.sortTxt, wageRange.label === r.label && ws.sortTxtActive]}>{r.label}</Text>
                    {wageRange.label === r.label && <Ionicons name="checkmark-circle" size={16} color={ORANGE} />}
                  </TouchableOpacity>
                ))}
              </SideCard>

              <SideCard>
                <Text style={ws.sideTitle}>Availability</Text>
                {AVAILABILITY_OPTIONS.map(a => (
                  <TouchableOpacity
                    key={a}
                    style={[ws.sortRow, availability === a && ws.sortRowActive]}
                    onPress={() => setAvailability(a)}
                  >
                    <Text style={[ws.sortTxt, availability === a && ws.sortTxtActive]}>{a}</Text>
                    {availability === a && <Ionicons name="checkmark-circle" size={16} color={ORANGE} />}
                  </TouchableOpacity>
                ))}
              </SideCard>

              <SideCard style={ws.tipCard}>
                <Text style={ws.tipTitle}>💡 Hiring Tips</Text>
                {[
                  'Complete profiles get 3x more calls',
                  'Add your daily wage to get hired faster',
                  'ID verification builds trust with employers',
                ].map((tip, i) => (
                  <View key={i} style={ws.tipRow}>
                    <View style={ws.tipDot} />
                    <Text style={ws.tipTxt}>{tip}</Text>
                  </View>
                ))}
                <TouchableOpacity style={ws.tipBtn} onPress={() => nav.navigate('PostLabourProfile')} activeOpacity={0.85}>
                  <Ionicons name="add-circle-outline" size={14} color={ORANGE} />
                  <Text style={ws.tipBtnTxt}>Post Your Profile</Text>
                </TouchableOpacity>
              </SideCard>
            </View>
          )}
        </View>

        {FilterModal}
      </View>
    );
  }

  // ── MOBILE (native app) LAYOUT ──────────────────────────────────────────────
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f7f7" />
      <FlatList
        data={feedWithAds}
        keyExtractor={item => item.__isAd ? item.id : String(item.id)}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ORANGE]} tintColor={ORANGE} />}
        ListHeaderComponent={Header}
        renderItem={renderCard}
        ListEmptyComponent={!loading && EmptyState}
        ListFooterComponent={
          !isPremium && feedWithAds.length > 0 ? <BannerAd /> : null
        }
      />
      {FilterModal}
    </View>
  );
}

// ── MOBILE STYLES ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f7f7' },

  header: { backgroundColor: '#f7f7f7', paddingHorizontal: 16, paddingBottom: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 20, paddingBottom: 10, gap: 10 },
  pageTitle: { fontSize: 24, fontWeight: '900', color: '#111', letterSpacing: -0.5 },
  pageCount: { fontSize: 13, color: '#999', fontWeight: '500', marginTop: 4 },

  iconBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#ececec',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  iconBtnActive: { backgroundColor: '#111' },
  filterBadge: {
    position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: 8,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e8e8e8', marginTop: 4, marginBottom: 14, height: 52,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  searchInput: { flex: 1, paddingHorizontal: 10, fontSize: 14, color: '#111' },
  searchFilterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, height: 48, paddingHorizontal: 16,
    backgroundColor: '#fff7f0', borderLeftWidth: 1, borderLeftColor: '#ebebeb',
  },

  pillsRow: { paddingBottom: 14, gap: 8, alignItems: 'center' },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#d8d8d8', backgroundColor: '#fff',
    paddingVertical: 7, paddingHorizontal: 16, borderRadius: 24,
  },
  pillActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  pillTxt: { fontSize: 13, fontWeight: '600', color: '#555' },
  pillTxtActive: { color: '#fff', fontWeight: '700' },

  list: { paddingHorizontal: 14, paddingTop: 0, paddingBottom: 40 },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  filterSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff',
    borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 44,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: -4 }, elevation: 24,
  },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 18 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  resetTxt: { fontSize: 13, fontWeight: '700', color: ORANGE },
  filterLabel: { fontSize: 11, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 12 },
  rangeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#ececec', marginBottom: 8,
  },
  rangeActive: { borderColor: ORANGE, backgroundColor: '#fff8f3' },
  rangeTxt: { fontSize: 14, fontWeight: '600', color: '#333' },
  applyFilterBtn: { backgroundColor: '#111', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  applyFilterTxt: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
});

// ── WEB STYLES ────────────────────────────────────────────────────────────────
const ws = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },

  body: {
    flex: 1, flexDirection: 'row', maxWidth: 1400, width: '100%', alignSelf: 'center',
    paddingTop: 12, paddingHorizontal: 16, gap: 16,
  },
  leftSidebar: {
    width: 220, flexShrink: 0, gap: 12, alignSelf: 'flex-start',
    position: 'sticky', top: 70, maxHeight: 'calc(100vh - 82px)', overflowY: 'auto', paddingBottom: 16,
  },
  mainCol: { flex: 1, minWidth: 0, flexShrink: 1 },
  rightSidebar: {
    width: 220, flexShrink: 0, gap: 12, alignSelf: 'flex-start',
    position: 'sticky', top: 70, maxHeight: 'calc(100vh - 82px)', overflowY: 'auto', paddingBottom: 16,
  },

  header: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },

  topBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingVertical: 12, paddingHorizontal: 20,
    gap: 12, position: 'sticky', top: 0, zIndex: 100,
  },
  topBarBack: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: '#f9f9f9',
  },
  topBarTitle: { fontSize: 15, fontWeight: '800', color: '#111' },

  pageTitle: { fontSize: 24, fontWeight: '900', color: '#111', letterSpacing: -0.5, marginBottom: 2 },
  pageCount: { fontSize: 13, color: '#999', fontWeight: '500', marginBottom: 16 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 12, height: 48,
    borderWidth: 1.5, borderColor: '#ebebeb', marginBottom: 14, overflow: 'hidden',
  },
  searchInput: { flex: 1, height: 48, paddingHorizontal: 10, fontSize: 14, color: '#111', outlineStyle: 'none' },
  searchFilterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, height: 48, paddingHorizontal: 16,
    backgroundColor: '#fff7f0', borderLeftWidth: 1, borderLeftColor: '#ebebeb',
  },
  filterBtnTxt: { fontSize: 13, fontWeight: '700', color: ORANGE },

  pillsRow: { gap: 8, paddingBottom: 14, alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: '#fff', paddingVertical: 7, paddingHorizontal: 18, borderRadius: 100 },

  activeFiltersRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  activeFiltersLabel: { fontSize: 11, color: '#bbb', fontWeight: '600' },
  activeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff7f0', borderRadius: 100,
    borderWidth: 1, borderColor: '#fed7aa', paddingVertical: 4, paddingHorizontal: 10,
  },
  activeChipTxt: { fontSize: 11, color: ORANGE, fontWeight: '700' },

  iconBtn: { height: 40, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e8e8e8', alignItems: 'center', justifyContent: 'center' },

  list: { paddingTop: 0, paddingBottom: 48 },

  sideCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f0f0f0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2, overflow: 'hidden', position: 'relative',
  },
  sideTitle: { fontSize: 13, fontWeight: '800', color: '#111', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  ctaCard: { backgroundColor: ORANGE },
  ctaCircle1: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.12)', top: -30, right: -20 },
  ctaCircle2: { position: 'absolute', width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.08)', bottom: -15, right: 30 },
  ctaEyebrow: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 1, marginBottom: 4, position: 'relative' },
  ctaTitle: { fontSize: 17, fontWeight: '900', color: '#fff', marginBottom: 5, position: 'relative' },
  ctaSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)', lineHeight: 16, marginBottom: 14, position: 'relative' },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14,
    alignSelf: 'flex-start', position: 'relative',
  },
  ctaBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 10, marginBottom: 2 },
  catIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#fff7f0', alignItems: 'center', justifyContent: 'center' },
  catLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: '#333' },
  catCount: { backgroundColor: '#f3f4f6', borderRadius: 20, paddingVertical: 2, paddingHorizontal: 7 },
  catCountTxt: { fontSize: 11, fontWeight: '700', color: '#888' },

  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, paddingHorizontal: 10, borderRadius: 10, marginBottom: 2 },
  sortRowActive: { backgroundColor: '#fff7f0' },
  sortTxt: { fontSize: 13, fontWeight: '600', color: '#444' },
  sortTxtActive: { color: ORANGE, fontWeight: '700' },

  quickAction: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 6, borderRadius: 10, marginBottom: 2 },
  quickIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 13, fontWeight: '600', color: '#222' },

  tipCard: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  tipTitle: { fontSize: 13, fontWeight: '800', color: '#15803d', marginBottom: 10 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  tipDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#16a34a', marginTop: 6, flexShrink: 0 },
  tipTxt: { fontSize: 12, color: '#166534', lineHeight: 18, flex: 1 },
  tipBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: '#bbf7d0', paddingVertical: 8, paddingHorizontal: 12, marginTop: 4, alignSelf: 'flex-start',
  },
  tipBtnTxt: { fontSize: 12, fontWeight: '700', color: ORANGE },

  centeredModal: {
    position: 'absolute', top: '50%', left: '50%',
    transform: [{ translateX: -180 }, { translateY: -200 }],
    width: 360, borderRadius: 20, bottom: 'auto',
  },
});
