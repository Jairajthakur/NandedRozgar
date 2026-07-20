/**
 * LabourScreen.js — the Labour marketplace: browse workers + a preview of
 * contractor-posted Projects.
 *
 * This is what LabourEntryScreen shows to everyone who is NOT a worker with
 * an existing profile (guests, and logged-in hirers who haven't posted a
 * profile yet). Workers with a profile land on HireRequestsScreen instead
 * and can still reach this screen via Profile > "Browse workers"
 * (forceBrowse route param).
 *
 * Reads:
 *   GET /api/labour    — paginated worker listing, filterable by district
 *                         (DistrictContext), skill category, and search text.
 *   GET /api/projects  — active contractor-posted Projects, shown as a
 *                         horizontal preview strip up top; "See all" opens
 *                         the full ProjectsScreen.
 *
 * A "Post my profile" banner is shown to any logged-in user who hasn't
 * posted a worker profile yet, so hirers can become workers whenever
 * they're ready — the very next time they open the Labour tab they land on
 * their dashboard automatically (see LabourEntryScreen).
 *
 * Place at: src/screens/LabourScreen.js
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, Image, FlatList, TouchableOpacity, ScrollView,
  StyleSheet, RefreshControl, ActivityIndicator, TextInput, Platform, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { http } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useDistrict } from '../context/DistrictContext';
import { useLang } from '../utils/i18n';
import { AutoTranslate } from '../utils/translate';
import { Empty } from '../components/UI';
import {
  LABOUR_COLORS, SPACING, RADIUS, SKILL_ICONS, getSkillGradient,
} from '../constants/labourTheme';
import BannerAd from '../components/ads/BannerAd';
import { ADS_SUPPORTED } from '../components/ads/adConfig';
import { useIsPremium } from '../hooks/useIsPremium';

const ORANGE  = LABOUR_COLORS.primary;
const LABOUR  = LABOUR_COLORS.worker;
const BG      = LABOUR_COLORS.bg;
const SURFACE = LABOUR_COLORS.surface;
const TEXT    = LABOUR_COLORS.text;
const MUTED   = LABOUR_COLORS.textMuted;
const BORDER  = LABOUR_COLORS.border;

const SKILL_CATEGORIES = [
  'All', 'Mason', 'Electrician', 'Plumber', 'Painter', 'Carpenter', 'Welder', 'Helper',
];

const AVAILABILITY_FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'busy',       label: 'Busy' },
];

// ── Worker card — photo/initials avatar, trade, rate, trust signals ────────
function WorkerCard({ item, onPress, lang }) {
  const [gradStart, gradEnd] = getSkillGradient(item.skill_category);
  const initials = (item.full_name || '?').trim().charAt(0).toUpperCase();
  const isTeam = item.profile_type === 'team';

  return (
    <TouchableOpacity style={ws.card} onPress={onPress} activeOpacity={0.85}>
      {item.photo_url ? (
        <Image source={{ uri: item.photo_url }} style={ws.avatar} />
      ) : (
        <LinearGradient colors={[gradStart, gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ws.avatar}>
          <Text style={ws.avatarInitial}>{initials}</Text>
        </LinearGradient>
      )}

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={ws.nameRow}>
          <AutoTranslate text={item.full_name} lang={lang} style={ws.name} numberOfLines={1} />
          {item.id_verified && <Ionicons name="checkmark-circle" size={15} color="#2563eb" />}
        </View>

        <View style={ws.metaRow}>
          <Ionicons name={SKILL_ICONS[item.skill_category] || 'briefcase-outline'} size={12.5} color={MUTED} />
          <Text style={ws.metaTxt} numberOfLines={1}>
            {item.skill_category}{isTeam ? ` · Team of ${item.team_size || '?'}` : ''}
          </Text>
        </View>

        {!!item.location && (
          <View style={ws.metaRow}>
            <Ionicons name="location-outline" size={12.5} color={MUTED} />
            <Text style={ws.metaTxt} numberOfLines={1}>{item.location}</Text>
          </View>
        )}

        <View style={ws.bottomRow}>
          {!!item.daily_wage && <Text style={ws.wage}>₹{item.daily_wage}/day</Text>}
          {item.rating_count > 0 && (
            <View style={ws.ratingPill}>
              <Ionicons name="star" size={11} color="#b45309" />
              <Text style={ws.ratingTxt}>{parseFloat(item.rating_avg).toFixed(1)}</Text>
            </View>
          )}
          {item.trusted_count > 0 && (
            <View style={ws.trustPill}>
              <Text style={ws.trustTxt}>{item.trusted_count} completed</Text>
            </View>
          )}
        </View>
      </View>

      <View style={[ws.availDot, { backgroundColor: item.availability === 'available' ? LABOUR_COLORS.success : '#d1d5db' }]} />
    </TouchableOpacity>
  );
}

// ── Small horizontal Project preview card ───────────────────────────────────
function ProjectPreviewCard({ item, onPress }) {
  const [gradStart, gradEnd] = getSkillGradient(item.skill_category);
  return (
    <TouchableOpacity style={ps.card} onPress={onPress} activeOpacity={0.85}>
      {item.photo_url ? (
        <Image source={{ uri: item.photo_url }} style={ps.banner} />
      ) : (
        <LinearGradient colors={[gradStart, gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ps.banner}>
          <Ionicons name={SKILL_ICONS[item.skill_category] || 'briefcase-outline'} size={30} color="rgba(255,255,255,0.5)" />
        </LinearGradient>
      )}
      <View style={ps.body}>
        <Text style={ps.title} numberOfLines={2}>{item.title}</Text>
        <View style={ps.tagRow}>
          {!!item.daily_wage && <Text style={ps.tagTxt}>₹{item.daily_wage}/day</Text>}
          {item.spots_left != null && (
            <Text style={ps.tagTxt}>
              {item.spots_left > 0 ? `${item.spots_left} spot${item.spots_left > 1 ? 's' : ''} left` : 'Full'}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function LabourScreen(props) {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { currentDistrict } = useDistrict();
  const { t, lang } = useLang();
  const isPremium = useIsPremium();

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [activeSkill, setActiveSkill] = useState('All');
  const [activeAvailability, setActiveAvailability] = useState('all');
  const [search, setSearch] = useState('');

  const hasProfile = !!user?.has_labour_profile;

  const loadWorkers = useCallback(async (opts = {}) => {
    try {
      if (!opts.silent) setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', '1');
      if (currentDistrict?.id) params.set('district', currentDistrict.id);
      if (activeSkill !== 'All') params.set('skill_category', activeSkill);
      if (search.trim()) params.set('q', search.trim());
      const res = await http('GET', `/api/labour?${params.toString()}`);
      if (res?.ok) {
        setWorkers(res.labourers || []);
        setHasMore(!!res.hasMore);
        setPage(1);
      } else {
        setError(res?.error || 'Could not load workers');
      }
    } catch (e) {
      setError('Could not load workers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentDistrict, activeSkill, search]);

  const loadMoreWorkers = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const params = new URLSearchParams();
      params.set('page', String(nextPage));
      if (currentDistrict?.id) params.set('district', currentDistrict.id);
      if (activeSkill !== 'All') params.set('skill_category', activeSkill);
      if (search.trim()) params.set('q', search.trim());
      const res = await http('GET', `/api/labour?${params.toString()}`);
      if (res?.ok) {
        setWorkers(w => [...w, ...(res.labourers || [])]);
        setHasMore(!!res.hasMore);
        setPage(nextPage);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore, currentDistrict, activeSkill, search]);

  const loadProjects = useCallback(async () => {
    try {
      setProjectsLoading(true);
      const params = new URLSearchParams();
      if (currentDistrict?.id) params.set('district', currentDistrict.id);
      const res = await http('GET', `/api/projects?${params.toString()}`);
      if (res?.ok) setProjects(res.projects || []);
    } finally {
      setProjectsLoading(false);
    }
  }, [currentDistrict]);

  useEffect(() => { loadWorkers(); }, [currentDistrict, activeSkill]);
  useEffect(() => { loadProjects(); }, [currentDistrict]);

  const onRefresh = () => { setRefreshing(true); loadWorkers({ silent: true }); loadProjects(); };

  const filteredWorkers = useMemo(() => {
    if (activeAvailability === 'all') return workers;
    return workers.filter(w =>
      activeAvailability === 'available' ? w.availability === 'available' : w.availability !== 'available'
    );
  }, [workers, activeAvailability]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <FlatList
        data={filteredWorkers}
        keyExtractor={(item) => String(item.id)}
        onEndReachedThreshold={0.4}
        onEndReached={loadMoreWorkers}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ORANGE]} tintColor={ORANGE} />}
        renderItem={({ item }) => (
          <WorkerCard item={item} lang={lang} onPress={() => nav.navigate('LabourDetail', { id: item.id })} />
        )}
        ListHeaderComponent={
          <View>
            {/* ── Post-my-profile banner (hirers / guests only) ───────────── */}
            {!hasProfile && (
              <TouchableOpacity
                style={s.postBanner}
                activeOpacity={0.9}
                onPress={() => nav.navigate('PostLabourProfile')}
              >
                <LinearGradient colors={[ORANGE, '#c2410c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.postBannerGrad}>
                  <Ionicons name="hammer-outline" size={22} color="#fff" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.postBannerTitle}>Looking for work?</Text>
                    <Text style={s.postBannerSub}>Post your profile and start getting hired</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* ── Search ───────────────────────────────────────────────────── */}
            <View style={s.searchWrap}>
              <Ionicons name="search" size={16} color={MUTED} />
              <TextInput
                style={s.searchInput}
                placeholder="Search by name or trade"
                placeholderTextColor={MUTED}
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={() => loadWorkers()}
                returnKeyType="search"
              />
            </View>

            {/* ── Projects preview strip ──────────────────────────────────── */}
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionTitle}>Projects</Text>
              {projects.length > 0 && (
                <View style={s.countBadge}><Text style={s.countBadgeTxt}>{projects.length}</Text></View>
              )}
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => nav.navigate('Projects')}>
                <Text style={s.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>

            {projectsLoading ? (
              <ActivityIndicator size="small" color={ORANGE} style={{ marginVertical: 20 }} />
            ) : projects.length === 0 ? (
              <Text style={s.emptyStripTxt}>No open projects right now</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: SPACING.lg, gap: 12 }}>
                {projects.map(p => (
                  <ProjectPreviewCard key={p.id} item={p} onPress={() => nav.navigate('ProjectDetail', { id: p.id })} />
                ))}
              </ScrollView>
            )}

            {/* ── Availability filter ─────────────────────────────────────── */}
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionTitle}>Workers</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipScroll}>
              {AVAILABILITY_FILTERS.map(f => {
                const active = activeAvailability === f.key;
                return (
                  <TouchableOpacity key={f.key} style={[s.chip, active && s.chipActive]} onPress={() => setActiveAvailability(f.key)}>
                    <Text style={[s.chipTxt, active && s.chipTxtActive]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ── Skill filter ─────────────────────────────────────────────── */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipScroll}>
              {SKILL_CATEGORIES.map(skill => {
                const active = activeSkill === skill;
                return (
                  <TouchableOpacity key={skill} style={[s.chip, active && s.chipActive]} onPress={() => setActiveSkill(skill)}>
                    <Ionicons name={SKILL_ICONS[skill] || 'briefcase-outline'} size={13} color={active ? '#fff' : MUTED} />
                    <Text style={[s.chipTxt, active && s.chipTxtActive]}>{skill}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {!!error && (
              <View style={s.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#b91c1c" />
                <Text style={s.errorBannerTxt}>{error}</Text>
                <TouchableOpacity onPress={() => loadWorkers()} style={s.errorBannerBtn}>
                  <Text style={s.errorBannerBtnTxt}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {loading && (
              <ActivityIndicator size="large" color={ORANGE} style={{ marginVertical: 30 }} />
            )}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <Empty
              icon="people-outline"
              title="No workers found"
              sub={activeSkill === 'All' ? 'Check back soon, or try another district.' : `No ${activeSkill.toLowerCase()}s available right now.`}
            />
          ) : null
        }
        ListFooterComponent={
          <>
            {loadingMore && <ActivityIndicator size="small" color={ORANGE} style={{ marginVertical: 16 }} />}
            {!isPremium && ADS_SUPPORTED && filteredWorkers.length > 0 && <BannerAd style={{ marginTop: 8 }} />}
          </>
        }
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 32, flexGrow: 1 }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  postBanner: { borderRadius: 16, overflow: 'hidden', marginBottom: 14 },
  postBannerGrad: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  postBannerTitle: { fontSize: 14.5, fontWeight: '800', color: '#fff' },
  postBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginTop: 2 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 14, color: TEXT, padding: 0 },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: TEXT },
  countBadge: { backgroundColor: '#f1f1f4', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeTxt: { fontSize: 11.5, fontWeight: '800', color: MUTED },
  seeAll: { fontSize: 13, fontWeight: '700', color: ORANGE },
  emptyStripTxt: { fontSize: 12.5, color: MUTED, fontWeight: '600', marginBottom: 16 },

  chipScroll: { gap: 8, paddingVertical: 4, marginBottom: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.pill,
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#eee',
  },
  chipActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  chipTxt: { fontSize: 12.5, fontWeight: '700', color: MUTED },
  chipTxtActive: { color: '#fff' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fee2e2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  errorBannerTxt: { flex: 1, fontSize: 12.5, color: '#b91c1c', fontWeight: '600' },
  errorBannerBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#b91c1c', borderRadius: 8 },
  errorBannerBtnTxt: { color: '#fff', fontSize: 11.5, fontWeight: '700' },
});

// ── Worker card styles ───────────────────────────────────────────────────────
const ws = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 12, marginBottom: 10,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 20, fontWeight: '900', color: '#fff' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { fontSize: 15, fontWeight: '800', color: TEXT, flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaTxt: { fontSize: 12, color: MUTED, fontWeight: '600', flexShrink: 1 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  wage: { fontSize: 13.5, fontWeight: '800', color: LABOUR },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fef3c7', borderRadius: 100, paddingHorizontal: 7, paddingVertical: 2 },
  ratingTxt: { fontSize: 11, fontWeight: '800', color: '#b45309' },
  trustPill: { backgroundColor: '#f0fdf4', borderRadius: 100, paddingHorizontal: 7, paddingVertical: 2 },
  trustTxt: { fontSize: 11, fontWeight: '700', color: LABOUR_COLORS.success },
  availDot: { width: 10, height: 10, borderRadius: 5 },
});

// ── Project preview card styles ─────────────────────────────────────────────
const ps = StyleSheet.create({
  card: {
    width: 180, backgroundColor: SURFACE, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
  },
  banner: { width: '100%', height: 80, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 10 },
  title: { fontSize: 13, fontWeight: '800', color: TEXT, lineHeight: 17, minHeight: 34 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  tagTxt: { fontSize: 11, fontWeight: '700', color: MUTED },
});
