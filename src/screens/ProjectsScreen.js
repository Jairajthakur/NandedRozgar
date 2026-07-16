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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, FlatList, TouchableOpacity, ScrollView,
  StyleSheet, RefreshControl, ActivityIndicator, Platform, StatusBar,
  Animated, Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { http, timeAgo } from '../utils/api';
import { useDistrict } from '../context/DistrictContext';
import { useLang } from '../utils/i18n';
import { AutoTranslate } from '../utils/translate';
import { Empty } from '../components/UI';
import { LABOUR_COLORS, SPACING, RADIUS, SKILL_ICONS, getSkillGradient } from '../constants/labourTheme';

const ORANGE = LABOUR_COLORS.primary;
const IS_WEB = Platform.OS === 'web';

// Same gentle fade-up-in-place used for the Project cards on the Labour
// feed, so this screen's cards animate in the same way.
function FadeIn({ children, delay = 0 }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty      = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 340, delay, easing: Easing.out(Easing.quad), useNativeDriver: !IS_WEB }),
      Animated.timing(ty,      { toValue: 0, duration: 340, delay, easing: Easing.out(Easing.quad), useNativeDriver: !IS_WEB }),
    ]).start();
  }, []);
  return <Animated.View style={{ width: '100%', opacity, transform: [{ translateY: ty }] }}>{children}</Animated.View>;
}

// Canonical (English) skill values — these match what's stored in the DB /
// sent to the API. Display labels are translated separately via SKILL_T_KEYS.
const SKILL_CATEGORIES = [
  'All', 'Mason', 'Electrician', 'Plumber', 'Painter', 'Carpenter', 'Welder', 'Helper',
];
const SKILL_T_KEYS = {
  All: 'skillAll', Mason: 'skillMason', Electrician: 'skillElectrician', Plumber: 'skillPlumber',
  Painter: 'skillPainter', Carpenter: 'skillCarpenter', Welder: 'skillWelder', Helper: 'skillHelper',
};

// ── Full-width Project card — big banner + location pin + bold title +
// contractor name + rounded tags, matching the card style used on the
// Labour tab's Projects feed. No photo_url exists on projects yet, so the
// banner falls back to a skill-tinted gradient with a large icon; if a
// photo_url is ever added server-side this will use it automatically.
function ProjectCard({ item, onPress, t, lang, index = 0 }) {
  const [gradStart, gradEnd] = getSkillGradient(item.skill_category);
  const spotsLeft = item.spots_left;
  const isFull = spotsLeft === 0;
  const locationLine = [item.location, item.district]
    .filter(Boolean)
    .map((v, i) => (i === 1 ? String(v).toUpperCase() : v))
    .join(', ');

  return (
    <FadeIn delay={Math.min(index, 8) * 60}>
      <TouchableOpacity style={cs.card} onPress={onPress} activeOpacity={0.85}>
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={cs.banner} />
        ) : (
          <LinearGradient colors={[gradStart, gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cs.banner}>
            <Ionicons name={SKILL_ICONS[item.skill_category] || 'briefcase-outline'} size={56} color="rgba(255,255,255,0.45)" />
          </LinearGradient>
        )}

        <View style={cs.body}>
          {!!locationLine && (
            <View style={cs.locRow}>
              <Ionicons name="location-outline" size={13} color="#999" />
              <Text style={cs.locTxt} numberOfLines={1}>{locationLine}</Text>
            </View>
          )}

          <AutoTranslate text={item.title} lang={lang} style={cs.title} numberOfLines={2} />

          {!!item.contractor_name && (
            <Text style={cs.contractor} numberOfLines={1}>{item.contractor_name}</Text>
          )}

          <View style={cs.tagRow}>
            {!!item.skill_category && (
              <View style={cs.tag}>
                <Text style={cs.tagTxt}>{item.skill_category}</Text>
              </View>
            )}
            {!!item.daily_wage && (
              <View style={cs.tag}>
                <Text style={cs.tagTxt}>₹{item.daily_wage}{t('projPerDaySuffix')}</Text>
              </View>
            )}
            {spotsLeft != null && (
              <View style={cs.tag}>
                <Text style={cs.tagTxt}>
                  {spotsLeft > 0
                    ? t(spotsLeft > 1 ? 'projSpotPlural' : 'projSpotSingular').replace('{N}', spotsLeft)
                    : t('projFull')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </FadeIn>
  );
}

export default function ProjectsScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { currentDistrict } = useDistrict();
  const { t, lang } = useLang();

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
          renderItem={({ item, index }) => (
            <ProjectCard item={item} t={t} lang={lang} index={index} onPress={() => nav.navigate('ProjectDetail', { id: item.id })} />
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
  card: {
    backgroundColor: '#fff', borderRadius: 20, marginBottom: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: '#f0f0f0',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  banner: { width: '100%', height: 190, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  locTxt: { fontSize: 12.5, color: '#999', fontWeight: '600' },
  title: { fontSize: 19, fontWeight: '800', color: '#111', lineHeight: 24, marginBottom: 6 },
  contractor: { fontSize: 14, color: '#555', fontWeight: '500', marginBottom: 14 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#f3f4f6', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
  tagTxt: { fontSize: 13, fontWeight: '600', color: '#333' },
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
