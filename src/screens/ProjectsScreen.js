/**
 * ProjectsScreen.js — browse contractor-posted Projects.
 *
 * A "project" is a fixed-slot posting a contractor creates — e.g. "10 Mason
 * helpers needed, ₹500/day, 5 days" — the same way they'd post a Job, except
 * hiring off it is instant: a worker taps Apply and is hired on the spot
 * (first-come-first-served until the slots fill), no review/approval step.
 *
 * Reads GET /api/projects (public, only 'active' projects — a project drops
 * off this list the moment it's fully staffed). Filters by district
 * (via DistrictContext, matching every other board in the app) and skill
 * category client-side-friendly server params, same pattern as LabourScreen.
 *
 * Navigates to ProjectDetail (id) for the full posting + Apply button.
 *
 * Place at: src/screens/ProjectsScreen.js
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  StyleSheet, RefreshControl, ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { http, timeAgo } from '../utils/api';
import { useDistrict } from '../context/DistrictContext';
import { useLang } from '../utils/i18n';
import { Empty } from '../components/UI';
import { LABOUR_COLORS, SPACING, RADIUS, SKILL_ICONS, getSkillGradient } from '../constants/labourTheme';
import { SectionCard, Badge } from '../components/labour/LabourUI';

const ORANGE = LABOUR_COLORS.primary;

// Canonical (English) skill values — these match what's stored in the DB /
// sent to the API. Display labels are translated separately via SKILL_T_KEYS.
const SKILL_CATEGORIES = [
  'All', 'Mason', 'Electrician', 'Plumber', 'Painter', 'Carpenter', 'Welder', 'Helper',
];
const SKILL_T_KEYS = {
  All: 'skillAll', Mason: 'skillMason', Electrician: 'skillElectrician', Plumber: 'skillPlumber',
  Painter: 'skillPainter', Carpenter: 'skillCarpenter', Welder: 'skillWelder', Helper: 'skillHelper',
};

// ── Project card ─────────────────────────────────────────────────────────────
function ProjectCard({ item, onPress, t }) {
  const [gradStart, gradEnd] = getSkillGradient(item.skill_category);
  const spotsLeft = item.spots_left;
  const almostFull = spotsLeft != null && spotsLeft <= 2;

  return (
    <TouchableOpacity style={cs.row} onPress={onPress} activeOpacity={0.75}>
      <View style={[cs.iconWrap, { backgroundColor: gradStart + '1a' }]}>
        <Ionicons name={SKILL_ICONS[item.skill_category] || 'briefcase-outline'} size={20} color={gradStart} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={cs.title} numberOfLines={1}>{item.title}</Text>
        <Text style={cs.meta} numberOfLines={1}>
          {item.contractor_name ? `${item.contractor_name} · ` : ''}
          {item.location || item.district}
        </Text>

        <View style={cs.chipRow}>
          {!!item.daily_wage && (
            <Badge icon="cash-outline" label={`₹${item.daily_wage}${t('projPerDaySuffix')}`} tone="primary" />
          )}
          {!!item.duration_days && (
            <Badge
              icon="calendar-outline"
              label={`${item.duration_days} ${item.duration_days > 1 ? t('projDayPlural') : t('projDaySingular')}`}
              tone="neutral"
            />
          )}
          {spotsLeft != null && (
            <Badge
              icon="people-outline"
              label={spotsLeft > 0
                ? t(spotsLeft > 1 ? 'projSpotPlural' : 'projSpotSingular').replace('{N}', spotsLeft)
                : t('projFull')}
              tone={spotsLeft === 0 ? 'neutral' : almostFull ? 'warning' : 'success'}
            />
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#ccc" />
    </TouchableOpacity>
  );
}

export default function ProjectsScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { currentDistrict } = useDistrict();
  const { t } = useLang();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeSkill, setActiveSkill] = useState('All');

  const load = useCallback(async (opts = {}) => {
    try {
      if (!opts.silent) setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (currentDistrict?.id) params.set('district', currentDistrict.id);
      if (activeSkill !== 'All') params.set('skillCategory', activeSkill);
      const res = await http('GET', `/api/projects?${params.toString()}`);
      if (res?.ok) {
        setProjects(res.projects || []);
      } else {
        setError(t('projLoadError'));
      }
    } catch (e) {
      setError(t('projLoadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentDistrict, activeSkill]);

  useEffect(() => { load(); }, [currentDistrict, activeSkill]);

  const onRefresh = () => { setRefreshing(true); load({ silent: true }); };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.topBar}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#111" />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>{t('projTopBarTitle')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipScroll}
        style={s.chipScrollWrap}
      >
        {SKILL_CATEGORIES.map((skill) => {
          const active = activeSkill === skill;
          return (
            <TouchableOpacity
              key={skill}
              style={[s.chip, active && s.chipActive]}
              onPress={() => setActiveSkill(skill)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={SKILL_ICONS[skill] || 'briefcase-outline'}
                size={13}
                color={active ? '#fff' : LABOUR_COLORS.textMuted}
              />
              <Text style={[s.chipTxt, active && s.chipTxtActive]}>{t(SKILL_T_KEYS[skill])}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {!!error && (
        <View style={s.errorBanner}>
          <Ionicons name="alert-circle" size={16} color="#b91c1c" />
          <Text style={s.errorBannerTxt}>{error}</Text>
          <TouchableOpacity onPress={() => load()} style={s.errorBannerBtn}>
            <Text style={s.errorBannerBtnTxt}>{t('projRetry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={ORANGE} />
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ProjectCard item={item} t={t} onPress={() => nav.navigate('ProjectDetail', { id: item.id })} />
          )}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ORANGE]} tintColor={ORANGE} />}
          ListEmptyComponent={(
            <Empty
              icon="briefcase-outline"
              title={t('projEmptyTitle')}
              sub={activeSkill === 'All'
                ? t('projEmptyAllSub')
                : t('projEmptySkillSub').replace('{SKILL}', t(SKILL_T_KEYS[activeSkill]))}
            />
          )}
        />
      )}
    </View>
  );
}

const cs = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: LABOUR_COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: LABOUR_COLORS.border,
    padding: SPACING.md, marginBottom: SPACING.md,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  title: { fontSize: 14.5, fontWeight: '800', color: LABOUR_COLORS.text },
  meta: { fontSize: 12, color: LABOUR_COLORS.textMuted, marginTop: 2, fontWeight: '500' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e8e8e8',
  },
  topBarTitle: { fontSize: 16, fontWeight: '800', color: '#111' },

  chipScrollWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  chipScroll: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.pill,
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#eee',
  },
  chipActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  chipTxt: { fontSize: 12.5, fontWeight: '700', color: LABOUR_COLORS.textMuted },
  chipTxtActive: { color: '#fff' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fee2e2', paddingHorizontal: 14, paddingVertical: 10,
  },
  errorBannerTxt: { flex: 1, fontSize: 12.5, color: '#b91c1c', fontWeight: '600' },
  errorBannerBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#b91c1c', borderRadius: 8 },
  errorBannerBtnTxt: { color: '#fff', fontSize: 11.5, fontWeight: '700' },
});
