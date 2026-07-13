import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, Image, FlatList, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, RefreshControl, Platform, StatusBar,
  Modal, Animated, Easing, useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { http } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Empty } from '../components/UI';
import WageBoardStrip from '../components/WageBoardStrip';
import LeaderboardStrip from '../components/labour/LeaderboardStrip';
import NearbyRadar from '../components/labour/NearbyRadar';
import JobHeatmap from '../components/labour/JobHeatmap';

import { useLang } from '../utils/i18n';
import { useDistrict } from '../context/DistrictContext';
import NativeAdCard from '../components/ads/NativeAdCard';
import BannerAd from '../components/ads/BannerAd';
import { ADS_SUPPORTED, NATIVE_AD_FREQUENCY } from '../components/ads/adConfig';
import { useIsPremium } from '../hooks/useIsPremium';
import { LABOUR_COLORS, getSkillGradient } from '../constants/labourTheme';
import TradeIcon from '../components/TradeIcon';
import BulkHireModal from '../components/labour/BulkHireModal';

const ORANGE = LABOUR_COLORS.primary;
const TEAL   = '#0d9488';
const IS_WEB = Platform.OS === 'web';

const SKILL_CATEGORIES = [
  'All', 'Mason', 'Electrician', 'Plumber', 'Painter', 'Carpenter', 'Welder', 'Helper',
];

// Bilingual labels for the micro-skill grid — shown as English / मराठी so the
// grid reads for both audiences without needing a language switch.
const SKILL_LABELS_MR = {
  All: 'सर्व', Mason: 'गवंडी', Electrician: 'इलेक्ट्रीशियन', Plumber: 'प्लंबर',
  Painter: 'पेंटर', Carpenter: 'सुतार', Welder: 'वेल्डर', Helper: 'मदतनीस',
};

const WAGE_RANGES = [
  { label: 'Any',           min: 0,    max: Infinity },
  { label: 'Under ₹500',   min: 0,    max: 500 },
  { label: '₹500–₹800',   min: 500,  max: 800 },
  { label: '₹800–₹1,200', min: 800,  max: 1200 },
  { label: 'Above ₹1,200', min: 1200, max: Infinity },
];
const AVAILABILITY_OPTIONS = ['All', 'At Chowk Today', 'Available Now', 'Busy this week'];
const PROFILE_TYPE_OPTIONS = ['All', 'Individuals', 'Teams'];

// Rich metadata for the "Listing Type" preference cards in the filter sheet —
// icon + accent color + a couple of descriptive chips per tier, so the
// picker reads like a real choice instead of a plain text list.
const PROFILE_TYPE_META = {
  Individuals: { icon: 'person-outline', color: LABOUR_COLORS.worker, chips: ['Solo hire', 'Direct rate'] },
  Teams:       { icon: 'people-outline', color: LABOUR_COLORS.team,   chips: ['Crew hire', 'Group rate'] },
};

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
function LabourCard({ item, onPress, index = 0, selectMode = false, selected = false, onToggleSelect }) {
  const hasRating = !!item.rating_count && Number(item.rating_count) > 0;
  const isBusy = item.availability === 'busy';
  const atChowk = !!item.checked_in_today;
  const isTeam = item.profile_type === 'team';
  const initials = (item.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const [gradStart, gradEnd] = getSkillGradient(item.skill_category);

  const statusChip = atChowk
    ? { bg: '#16a34a', icon: 'walk', label: 'At the chowk today' }
    : hasRating && Number(item.rating_avg) >= 4.5
    ? { bg: ORANGE, icon: 'star', label: 'Top rated' }
    : null;

  const trustedCount = parseInt(item.trusted_count) || 0;

  return (
    <FadeIn delay={Math.min(index, 8) * 60}>
      <TouchableOpacity style={cs.row} onPress={selectMode ? onToggleSelect : onPress} activeOpacity={0.7}>
        {selectMode && (
          <View style={[cs.checkbox, selected && cs.checkboxChecked]}>
            {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        )}
        <View style={cs.photoTile}>
          {item.photo_url ? (
            <Image source={{ uri: item.photo_url }} style={cs.photoImg} />
          ) : (
            <LinearGradient colors={[gradStart, gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cs.photoImg}>
              <Text style={cs.photoInitials}>{initials}</Text>
            </LinearGradient>
          )}
          {isTeam && (
            <View style={cs.teamBadge}>
              <Ionicons name="people" size={10} color="#fff" />
              <Text style={cs.teamBadgeTxt}>{item.team_size}</Text>
            </View>
          )}
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={cs.rowTitleLine}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
              <Text style={cs.rowTitle} numberOfLines={1}>{item.full_name}</Text>
              {!!item.id_verified && <Ionicons name="shield-checkmark" size={14} color="#2563eb" />}
            </View>
            {!selectMode && <Ionicons name="chevron-forward" size={19} color="#c4c4cc" />}
          </View>

          <View style={cs.chipRow}>
            <View style={[cs.tradeChip, { backgroundColor: gradStart + '18' }]}>
              <TradeIcon name={item.skill_category} size={13} color={gradStart} />
              <Text style={[cs.tradeChipTxt, { color: gradStart }]}>{item.skill_category}</Text>
            </View>
            {Array.isArray(item.skills) && item.skills.slice(0, 2).map((sk, i) => (
              <View key={`${sk}-${i}`} style={cs.plainChip}>
                <Text style={cs.plainChipTxt} numberOfLines={1}>{sk}</Text>
              </View>
            ))}
            {isTeam && !!item.team_composition ? (
              <View style={cs.plainChip}><Text style={cs.plainChipTxt} numberOfLines={1}>{item.team_composition}</Text></View>
            ) : !isTeam && !!item.experience_years ? (
              <View style={cs.plainChip}><Text style={cs.plainChipTxt}>{item.experience_years} yrs experience</Text></View>
            ) : null}
            <View style={[cs.plainChip, isBusy ? cs.busyChip : cs.availableChip]}>
              <Text style={cs.plainChipTxt}>{isBusy ? '🔴 Busy' : '🟢 Available Today'}</Text>
            </View>
            {trustedCount > 0 ? (
              <View style={[cs.plainChip, cs.trustChip]}>
                <Ionicons name="people" size={10} color="#0d9488" />
                <Text style={[cs.plainChipTxt, { color: '#0d9488' }]}> Trusted by {trustedCount} {trustedCount === 1 ? 'family' : 'families'} in your area</Text>
              </View>
            ) : hasRating ? (
              <View style={cs.plainChip}>
                <Ionicons name="star" size={10} color="#f59e0b" />
                <Text style={cs.plainChipTxt}> {Number(item.rating_avg).toFixed(1)} ({item.rating_count})</Text>
              </View>
            ) : null}
            {statusChip && (
              <View style={[cs.plainChip, { backgroundColor: statusChip.bg + '18' }]}>
                <Ionicons name={statusChip.icon} size={10} color={statusChip.bg} />
                <Text style={[cs.plainChipTxt, { color: statusChip.bg }]}> {statusChip.label}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </FadeIn>
  );
}

const cs = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    paddingVertical: 16, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#ececec',
  },
  photoTile: { width: 84, height: 84, borderRadius: 16, overflow: 'hidden', flexShrink: 0 },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#ccc',
    alignItems: 'center', justifyContent: 'center', marginTop: 30, flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: ORANGE, borderColor: ORANGE },
  photoImg: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
  photoInitials: { fontSize: 22, fontWeight: '800', color: '#fff' },
  teamBadge: {
    position: 'absolute', bottom: 4, right: 4, flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#7c3aed', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2,
  },
  teamBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingTop: 4 },
  rowTitle: { fontSize: 16, fontWeight: '800', color: '#111', flexShrink: 1 },
  chipRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  tradeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff7f0', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10,
  },
  tradeChipTxt: { fontSize: 12, fontWeight: '700' },
  plainChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f3f4f6', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10,
  },
  availableChip: { backgroundColor: '#f0fdf4' },
  busyChip: { backgroundColor: '#f4f4f5' },
  trustChip: { backgroundColor: '#f0fdfa' },
  plainChipTxt: { fontSize: 11, fontWeight: '700', color: '#666' },
});

// ── Main screen ─────────────────────────────────────────────────────────────
export default function LabourScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const { currentDistrict } = useDistrict();
  const { width } = useWindowDimensions();
  const { user } = useAuth();

  const [labourers, setLabourers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeSkill, setActiveSkill] = useState('All');
  const [activeSubSkills, setActiveSubSkills] = useState([]); // e.g. ['house wiring', 'AC repair']
  const [wageRange, setWageRange] = useState(WAGE_RANGES[0]);
  const [availability, setAvailability] = useState('All');
  const [profileTypeFilter, setProfileTypeFilter] = useState('All');
  const [localityFilter, setLocalityFilter] = useState('All');
  const [showLocalityPicker, setShowLocalityPicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);

  // ── Ad-hoc multi-select hire ── contractor picks any workers while
  // browsing (not necessarily part of a pre-formed Crew) and hires them
  // all in one action via POST /api/labour/hire-bulk.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const toggleSelectMode = () => {
    setSelectMode(m => !m);
    setSelectedIds([]);
  };
  const toggleSelectId = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const showSidebar = IS_WEB && width >= 900;

  // Contractors browsing this screen are the ones who need wallet balance to
  // unlock contacts — surface it right in the header instead of burying it
  // in Profile, so topping up doesn't require hitting an error first.
  useEffect(() => {
    if (!user) return;
    http('GET', '/api/payments/wallet/balance').then((res) => {
      if (res?.ok) setWalletBalance(res.balance);
    });
  }, [user?.id]);


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

  // Sub-skill chip selection is scoped to the active category — reset it
  // whenever the category changes so stale chips don't silently filter results.
  useEffect(() => { setActiveSubSkills([]); }, [activeSkill]);

  const onRefresh = () => { setRefreshing(true); load({ silent: true }); };

  // Sub-skill chips ("house wiring", "AC repair" for Electrician, etc.) —
  // derived from the free-text skills[] array every profile already has,
  // scoped to whatever main category is currently active so the chip list
  // stays relevant instead of showing every sub-skill in the district.
  const subSkillOptions = useMemo(() => {
    const pool = activeSkill === 'All' ? labourers : labourers.filter(l => l.skill_category === activeSkill);
    const counts = {};
    pool.forEach(l => {
      (Array.isArray(l.skills) ? l.skills : []).forEach(raw => {
        const tag = String(raw || '').trim();
        if (!tag) return;
        const key = tag.toLowerCase();
        if (!counts[key]) counts[key] = { label: tag, count: 0 };
        counts[key].count++;
      });
    });
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 14);
  }, [labourers, activeSkill]);

  const toggleSubSkill = (label) => {
    const key = label.toLowerCase();
    setActiveSubSkills(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  };

  const filtered = useMemo(() => {
    return labourers.filter(l => {
      if (activeSkill !== 'All' && l.skill_category !== activeSkill) return false;
      const wage = parseWage(l.daily_wage);
      if (l.daily_wage && (wage < wageRange.min || wage > wageRange.max)) return false;
      if (!l.daily_wage && wageRange.label !== 'Any') return false;
      if (availability === 'At Chowk Today' && !l.checked_in_today) return false;
      if (availability === 'Available Now' && l.availability === 'busy') return false;
      if (availability === 'Busy this week' && l.availability !== 'busy') return false;
      if (profileTypeFilter === 'Teams' && l.profile_type !== 'team') return false;
      if (profileTypeFilter === 'Individuals' && l.profile_type === 'team') return false;
      if (localityFilter !== 'All' && l.location !== localityFilter) return false;
      if (activeSubSkills.length > 0) {
        const lowerSkills = (Array.isArray(l.skills) ? l.skills : []).map(s => String(s).toLowerCase());
        const hasAll = activeSubSkills.every(tag => lowerSkills.includes(tag));
        if (!hasAll) return false;
      }
      if (search.trim()) {
        const hay = [l.full_name, l.skill_category, ...(Array.isArray(l.skills) ? l.skills : [])]
          .join(' ').toLowerCase();
        if (!hay.includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [labourers, activeSkill, activeSubSkills, wageRange, availability, profileTypeFilter, localityFilter, search]);

  // Micro-neighbourhoods with active listings, most common first — powers the
  // "hyper-local discovery" area dropdown in the header.
  const localityOptions = useMemo(() => {
    const counts = {};
    labourers.forEach(l => { if (l.location) counts[l.location] = (counts[l.location] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }));
  }, [labourers]);

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
    (wageRange.label !== 'Any' ? 1 : 0) + (availability !== 'All' ? 1 : 0) + (profileTypeFilter !== 'All' ? 1 : 0)
    + activeSubSkills.length;

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
          <TouchableOpacity style={s.localityBtn} onPress={() => setShowLocalityPicker(true)} activeOpacity={0.8}>
            <Ionicons name="location-outline" size={13} color={ORANGE} />
            <Text style={s.localityBtnTxt} numberOfLines={1}>
              {localityFilter === 'All' ? 'All areas' : localityFilter}
            </Text>
            <Ionicons name="chevron-down" size={13} color={ORANGE} />
          </TouchableOpacity>
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
        {!!user && (
          <TouchableOpacity
            style={[s.iconBtn, selectMode && s.iconBtnActive, IS_WEB && ws.iconBtn]}
            onPress={toggleSelectMode}
          >
            <Ionicons name="checkbox-outline" size={18} color={selectMode ? '#fff' : '#444'} />
          </TouchableOpacity>
        )}
        {!!user && (
          <TouchableOpacity style={s.walletChip} onPress={() => nav.navigate('Wallet')} activeOpacity={0.8}>
            <Ionicons name="wallet-outline" size={14} color={ORANGE} />
            <Text style={s.walletChipTxt}>₹{(walletBalance ?? 0).toFixed(0)}</Text>
          </TouchableOpacity>
        )}
      </View>

      <WageBoardStrip
        district={currentDistrict?.id}
        onPressSkill={(skill) => setActiveSkill(SKILL_CATEGORIES.includes(skill) ? skill : 'All')}
      />

      <LeaderboardStrip
        district={currentDistrict?.id}
        onPressWorker={(id) => nav.navigate('LabourDetail', { id })}
      />

      {user?.labour_role === 'worker' && (
        <View style={{ paddingHorizontal: 14, marginTop: 4, marginBottom: 10 }}>
          <JobHeatmap />
        </View>
      )}
      {user?.labour_role === 'hirer' && (
        <View style={{ paddingHorizontal: 14, marginTop: 4, marginBottom: 10 }}>
          <NearbyRadar onSelectWorker={(w) => nav.navigate('LabourDetail', { id: w.id })} />
        </View>
      )}

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
        {IS_WEB && (
          <TouchableOpacity style={ws.searchFilterBtn} onPress={() => setShowFilters(true)}>
            <Ionicons name="filter-outline" size={17} color={ORANGE} />
            <Text style={ws.filterBtnTxt}>Filters</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[s.categoryGrid, IS_WEB && ws.categoryGrid]}>
        {SKILL_CATEGORIES.map(cat => {
          const active = activeSkill === cat;
          const [catStart, catEnd] = getSkillGradient(cat);
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveSkill(cat)}
              style={[s.categoryTile, IS_WEB && ws.categoryTile]}
              activeOpacity={0.8}
            >
              {active ? (
                <LinearGradient
                  colors={[catStart, catEnd]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[s.categoryIconBox, { shadowColor: catStart, shadowOpacity: 0.35 }]}
                >
                  <TradeIcon name={cat} size={26} color="#fff" />
                </LinearGradient>
              ) : (
                <View style={[s.categoryIconBox, { backgroundColor: catStart + '14' }]}>
                  <TradeIcon name={cat} size={26} color={catStart} />
                </View>
              )}
              <Text style={[s.categoryTileTxt, active && { color: catStart, fontWeight: '800' }]} numberOfLines={1}>
                {cat}
              </Text>
              <Text style={[s.categoryTileTxtMr, active && { color: catStart }]} numberOfLines={1}>
                {SKILL_LABELS_MR[cat] || ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {subSkillOptions.length > 0 && (
        <View>
          <Text style={s.subSkillLabel}>Narrow it down</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.subSkillRow}
          >
            {subSkillOptions.map(opt => {
              const key = opt.label.toLowerCase();
              const active = activeSubSkills.includes(key);
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => toggleSubSkill(opt.label)}
                  style={[s.subSkillChip, active && s.subSkillChipActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[s.subSkillChipTxt, active && s.subSkillChipTxtActive]} numberOfLines={1}>
                    {opt.label}
                  </Text>
                  {active && <Ionicons name="close" size={12} color="#fff" style={{ marginLeft: 4 }} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

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
          {profileTypeFilter !== 'All' && (
            <TouchableOpacity style={ws.activeChip} onPress={() => setProfileTypeFilter('All')}>
              <Text style={ws.activeChipTxt}>{profileTypeFilter}</Text>
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
          <TouchableOpacity onPress={() => { setWageRange(WAGE_RANGES[0]); setAvailability('All'); setProfileTypeFilter('All'); }}>
            <Text style={s.resetTxt}>Reset All</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.filterLabel}>Listing Type</Text>
        <View style={s.prefList}>
          {['Individuals', 'Teams'].map((pt, idx) => {
            const meta = PROFILE_TYPE_META[pt];
            const active = profileTypeFilter === pt;
            return (
              <React.Fragment key={pt}>
                <TouchableOpacity
                  style={s.prefRow}
                  activeOpacity={0.7}
                  onPress={() => setProfileTypeFilter(active ? 'All' : pt)}
                >
                  <View style={[s.prefIconBox, { backgroundColor: meta.color + '18' }, active && { backgroundColor: meta.color }]}>
                    <Ionicons name={meta.icon} size={28} color={active ? '#fff' : meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.prefTitle, active && { color: meta.color }]}>{pt}</Text>
                    <View style={s.prefChipRow}>
                      {meta.chips.map(c => (
                        <View key={c} style={s.prefChip}>
                          <Text style={s.prefChipTxt}>{c}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <Ionicons
                    name={active ? 'checkmark-circle' : 'chevron-forward'}
                    size={20}
                    color={active ? meta.color : '#c4c4cc'}
                  />
                </TouchableOpacity>
                {idx === 0 && <View style={s.prefDivider} />}
              </React.Fragment>
            );
          })}
        </View>

        <Text style={[s.filterLabel, { marginTop: 20 }]}>Daily Wage</Text>
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

  // ── Locality picker (micro-neighbourhood dropdown) ─────────────────────────
  const LocalityModal = (
    <Modal visible={showLocalityPicker} transparent animationType="fade" onRequestClose={() => setShowLocalityPicker(false)}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowLocalityPicker(false)} />
      <View style={[s.localitySheet, IS_WEB && ws.centeredModal]}>
        <View style={s.sheetHandle} />
        <Text style={s.sheetTitle}>Choose your area</Text>
        <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={[s.rangeRow, localityFilter === 'All' && s.rangeActive]}
            onPress={() => { setLocalityFilter('All'); setShowLocalityPicker(false); }}
          >
            <Text style={[s.rangeTxt, localityFilter === 'All' && { color: ORANGE, fontWeight: '700' }]}>All areas</Text>
            {localityFilter === 'All' && <Ionicons name="checkmark-circle" size={18} color={ORANGE} />}
          </TouchableOpacity>
          {localityOptions.map(loc => (
            <TouchableOpacity
              key={loc.name}
              style={[s.rangeRow, localityFilter === loc.name && s.rangeActive]}
              onPress={() => { setLocalityFilter(loc.name); setShowLocalityPicker(false); }}
            >
              <Text style={[s.rangeTxt, localityFilter === loc.name && { color: ORANGE, fontWeight: '700' }]}>{loc.name}</Text>
              <Text style={s.localityCount}>{loc.count}</Text>
            </TouchableOpacity>
          ))}
          {localityOptions.length === 0 && (
            <Text style={{ color: '#999', fontSize: 13, paddingVertical: 20, textAlign: 'center' }}>
              No area data yet for this district.
            </Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderCard = ({ item, index }) => {
    if (item.__isAd) return <NativeAdCard />;
    return (
      <LabourCard
        item={item}
        index={index}
        selectMode={selectMode}
        selected={selectedIds.includes(item.id)}
        onPress={() => nav.navigate('LabourDetail', { id: item.id })}
        onToggleSelect={() => toggleSelectId(item.id)}
      />
    );
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

  const selectedWorkers = labourers.filter(w => selectedIds.includes(w.id));

  const SelectBar = selectMode && selectedIds.length > 0 ? (
    <View style={s.selectBar}>
      <Text style={s.selectBarTxt}>{selectedIds.length} selected</Text>
      <TouchableOpacity style={s.selectBarBtn} onPress={() => setShowBulkModal(true)} activeOpacity={0.85}>
        <Ionicons name="briefcase-outline" size={15} color="#fff" />
        <Text style={s.selectBarBtnTxt}>Hire {selectedIds.length}</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  const BulkModal = (
    <BulkHireModal
      visible={showBulkModal}
      workers={selectedWorkers}
      onClose={() => setShowBulkModal(false)}
      onSuccess={() => {
        setShowBulkModal(false);
        setSelectMode(false);
        setSelectedIds([]);
        nav.navigate('HireRequests');
      }}
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
                {tradeCounts.map(({ label, count }) => {
                  const [tStart] = getSkillGradient(label);
                  return (
                    <TouchableOpacity
                      key={label}
                      style={ws.catRow}
                      onPress={() => setActiveSkill(label)}
                      activeOpacity={0.75}
                    >
                      <View style={[ws.catIconWrap, { backgroundColor: tStart + '18' }]}>
                        <TradeIcon name={label} size={16} color={tStart} />
                      </View>
                      <Text style={ws.catLabel}>{label}</Text>
                      <View style={ws.catCount}><Text style={ws.catCountTxt}>{count}</Text></View>
                    </TouchableOpacity>
                  );
                })}
              </SideCard>

              <SideCard>
                <Text style={ws.sideTitle}>Explore More</Text>
                <QuickAction icon="hammer-outline"     label="Browse Projects" color={ORANGE}  onPress={() => nav.navigate('Projects')} />
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
        {LocalityModal}
        {SelectBar}
        {BulkModal}
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
      {LocalityModal}
      {SelectBar}
      {BulkModal}
    </View>
  );
}

// ── MOBILE STYLES ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f7f7' },

  selectBar: {
    position: 'absolute', left: 16, right: 16, bottom: 20,
    backgroundColor: '#111', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 10,
  },
  selectBarTxt: { color: '#fff', fontSize: 13.5, fontWeight: '700' },
  selectBarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: ORANGE, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14,
  },
  selectBarBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },

  header: { backgroundColor: '#f7f7f7', paddingHorizontal: 16, paddingBottom: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 20, paddingBottom: 10, gap: 10 },
  pageTitle: { fontSize: 24, fontWeight: '900', color: '#111', letterSpacing: -0.5 },
  pageCount: { fontSize: 13, color: '#999', fontWeight: '500', marginTop: 4 },
  localityBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: '#fff7f0', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, marginTop: 10,
  },
  localityBtnTxt: { fontSize: 12.5, fontWeight: '700', color: ORANGE, maxWidth: 160 },

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

  walletChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    height: 44, paddingHorizontal: 12, borderRadius: 22,
    backgroundColor: ORANGE + '15', borderWidth: 1, borderColor: ORANGE + '33',
  },
  walletChipTxt: { fontSize: 13, fontWeight: '800', color: ORANGE },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e8e8e8', marginTop: 4, marginBottom: 14, height: 52,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  searchInput: { flex: 1, paddingHorizontal: 10, fontSize: 14, color: '#111' },

  categoryGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 18, gap: 14,
  },
  categoryTile: { width: '21%', alignItems: 'center' },
  categoryIconBox: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  categoryIconBoxActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  categoryTileTxt: { fontSize: 12, fontWeight: '600', color: '#555', textAlign: 'center', lineHeight: 15 },
  categoryTileTxtMr: { fontSize: 10.5, fontWeight: '500', color: '#999', textAlign: 'center', lineHeight: 13 },
  categoryTileTxtActive: { color: ORANGE, fontWeight: '800' },

  subSkillLabel: {
    fontSize: 11, fontWeight: '700', color: '#aaa', textTransform: 'uppercase',
    letterSpacing: 0.7, marginBottom: 8, paddingHorizontal: 2,
  },
  subSkillRow: { flexDirection: 'row', gap: 8, paddingBottom: 16 },
  subSkillChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ebebeb',
  },
  subSkillChipActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  subSkillChipTxt: { fontSize: 12, fontWeight: '600', color: '#555' },
  subSkillChipTxtActive: { color: '#fff', fontWeight: '800' },

  list: { paddingHorizontal: 14, paddingTop: 0, paddingBottom: 40 },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  filterSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff',
    borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 44,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: -4 }, elevation: 24,
  },
  localitySheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff',
    borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 32,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: -4 }, elevation: 24,
  },
  localityCount: { fontSize: 12, fontWeight: '700', color: '#bbb' },
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

  prefList: { marginBottom: 4 },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  prefIconBox: {
    width: 64, height: 64, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  prefTitle: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 7 },
  prefChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  prefChip: { backgroundColor: '#f3f4f6', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  prefChipTxt: { fontSize: 11, fontWeight: '700', color: '#666' },
  prefDivider: { height: 1, backgroundColor: '#ececec' },
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

  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
    columnGap: 18,
    rowGap: 22,
    paddingBottom: 20,
  },
  categoryTile: { width: 'auto', justifySelf: 'center' },

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
