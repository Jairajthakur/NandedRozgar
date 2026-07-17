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
import NearbyRadar from '../components/labour/NearbyRadar';
import JobHeatmap from '../components/labour/JobHeatmap';

import { useLang } from '../utils/i18n';
import { useDistrict } from '../context/DistrictContext';
import NativeAdCard from '../components/ads/NativeAdCard';
import BannerAd from '../components/ads/BannerAd';
import { ADS_SUPPORTED, NATIVE_AD_FREQUENCY } from '../components/ads/adConfig';
import { useIsPremium } from '../hooks/useIsPremium';
import { LABOUR_COLORS, SKILL_ICONS, getSkillGradient } from '../constants/labourTheme';
import { AutoTranslate } from '../utils/translate';
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

// Friendly emoji glyphs for the category tiles — matches the softer,
// illustrated-icon-on-neutral-card look used elsewhere in the app.
const SKILL_EMOJI = {
  All: '🛠️', Mason: '🧱', Electrician: '⚡', Plumber: '🚰',
  Painter: '🎨', Carpenter: '🪚', Welder: '🔥', Helper: '🙋',
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
  return <Animated.View style={{ width: '100%', opacity, transform: [{ translateY: ty }] }}>{children}</Animated.View>;
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
  const { t } = useLang();
  const hasRating = !!item.rating_count && Number(item.rating_count) > 0;
  const isBusy = item.availability === 'busy';
  const atChowk = !!item.checked_in_today;
  const isTeam = item.profile_type === 'team';
  const initials = (item.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const [gradStart, gradEnd] = getSkillGradient(item.skill_category);
  const trustedCount = parseInt(item.trusted_count) || 0;

  // One meta line (plain text, not chips) so the card never grows extra
  // rows or wraps unpredictably — e.g. "6 yrs exp   ·   ★ 4.6 (18)".
  const metaParts = [];
  if (isTeam && item.team_composition) {
    metaParts.push(item.team_composition);
  } else if (!isTeam && item.experience_years) {
    metaParts.push(`${item.experience_years} ${t('lbYrsExperience')}`);
  }
  if (trustedCount > 0) {
    metaParts.push((trustedCount === 1 ? t('lbTrustedByOne') : t('lbTrustedByMany')).replace('{N}', trustedCount));
  } else if (hasRating) {
    metaParts.push(`★ ${Number(item.rating_avg).toFixed(1)} (${item.rating_count})`);
  }
  const metaLine = metaParts.join('   ·   ');

  // Exactly one status pill (never more) — priority: at-chowk > top-rated >
  // busy > available — so every card ends with the same number of rows.
  const pill = atChowk
    ? { bg: '#16a34a', bgTint: '#f0fdf4', icon: 'walk', label: t('lbAtChowkToday') }
    : hasRating && Number(item.rating_avg) >= 4.5
    ? { bg: ORANGE, bgTint: '#fff7f0', icon: 'star', label: t('lbTopRated') }
    : isBusy
    ? { bg: '#9ca3af', bgTint: '#f4f4f5', icon: 'time-outline', label: t('lbBusy') }
    : { bg: '#16a34a', bgTint: '#f0fdf4', icon: 'checkmark-circle', label: t('lbAvailableToday') };

  return (
    <FadeIn delay={Math.min(index, 8) * 60}>
      <TouchableOpacity style={cs.card} onPress={selectMode ? onToggleSelect : onPress} activeOpacity={0.8}>
        {selectMode && (
          <View style={[cs.checkbox, selected && cs.checkboxChecked]}>
            {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        )}
        {!selectMode && <Ionicons name="chevron-forward" size={15} color="#c4c4cc" style={cs.cardChevron} />}

        <View style={cs.cardTop}>
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
                <Ionicons name="people" size={9} color="#fff" />
                <Text style={cs.teamBadgeTxt}>{item.team_size}</Text>
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, minWidth: 0, marginTop: 8 }}>
            <Text style={cs.rowTitle} numberOfLines={2}>{item.full_name}</Text>
            {!!item.id_verified && <Ionicons name="shield-checkmark" size={12} color="#2563eb" style={{ marginTop: 1 }} />}
          </View>

          <View style={[cs.tradeChip, { backgroundColor: gradStart + '18', marginTop: 6, alignSelf: 'flex-start' }]}>
            <TradeIcon name={item.skill_category} size={11} color={gradStart} />
            <Text style={[cs.tradeChipTxt, { color: gradStart }]} numberOfLines={1}>{item.skill_category}</Text>
          </View>
        </View>

        {!!metaLine && <Text style={cs.metaLine} numberOfLines={1}>{metaLine}</Text>}

        <View style={[cs.statusPill, { backgroundColor: pill.bgTint, alignSelf: 'flex-start' }]}>
          <Ionicons name={pill.icon} size={10} color={pill.bg} />
          <Text style={[cs.statusPillTxt, { color: pill.bg }]} numberOfLines={1}>{pill.label}</Text>
        </View>
      </TouchableOpacity>
    </FadeIn>
  );
}

// ── Project tile — surfaces contractor-posted Projects in the same feed so
// both workers ("users") and hirers ("contractors") see open project slots
// alongside individual profiles, not just on the separate Projects tab.
function ProjectGridCard({ item, onPress, index = 0 }) {
  const { t, lang } = useLang();
  const [gradStart, gradEnd] = getSkillGradient(item.skill_category);
  const spotsLeft = item.spots_left;
  const almostFull = spotsLeft != null && spotsLeft <= 2;
  const isFull = spotsLeft === 0;

  return (
    <FadeIn delay={Math.min(index, 8) * 60}>
      <TouchableOpacity style={cs.projectCard} onPress={onPress} activeOpacity={0.8}>
        <View style={cs.projectEyebrowRow}>
          <View style={cs.projectEyebrow}>
            <Ionicons name="briefcase" size={10} color={ORANGE} />
            <Text style={cs.projectEyebrowTxt}>PROJECT</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#c4c4cc" />
        </View>

        <View style={cs.cardTop}>
          <View style={[cs.projectIconWrap, { backgroundColor: gradStart + '1a' }]}>
            <Ionicons name={SKILL_ICONS[item.skill_category] || 'briefcase-outline'} size={20} color={gradStart} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AutoTranslate text={item.title} lang={lang} style={cs.rowTitle} numberOfLines={1} />
            <Text style={cs.projectMeta} numberOfLines={1}>
              {item.contractor_name ? `${item.contractor_name} · ` : ''}{item.location || item.district || ''}
            </Text>
          </View>
        </View>

        <View style={cs.chipRow}>
          {!!item.daily_wage && (
            <View style={[cs.tradeChip, { backgroundColor: gradStart + '18' }]}>
              <Ionicons name="cash-outline" size={11} color={gradStart} />
              <Text style={[cs.tradeChipTxt, { color: gradStart }]} numberOfLines={1}>
                ₹{item.daily_wage}{t('projPerDaySuffix')}
              </Text>
            </View>
          )}
          {!!item.duration_days && (
            <View style={cs.plainChip}>
              <Ionicons name="calendar-outline" size={9} color="#666" />
              <Text style={cs.plainChipTxt} numberOfLines={1}>
                {' '}{item.duration_days} {item.duration_days > 1 ? t('projDayPlural') : t('projDaySingular')}
              </Text>
            </View>
          )}
          {spotsLeft != null && (
            <View style={[cs.plainChip, isFull ? null : almostFull ? cs.busyChip : cs.availableChip]}>
              <Ionicons name="people-outline" size={9} color={isFull ? '#999' : almostFull ? '#b45309' : '#16a34a'} />
              <Text style={cs.plainChipTxt} numberOfLines={1}>
                {' '}{spotsLeft > 0
                  ? t(spotsLeft > 1 ? 'projSpotPlural' : 'projSpotSingular').replace('{N}', spotsLeft)
                  : t('projFull')}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </FadeIn>
  );
}

// ── Full-width Project card — big banner + location pin + bold title +
// contractor name + a rounded category tag, matching the single-column
// "tender listing" look the user asked to match. No photo_url exists on
// projects yet, so the banner falls back to a skill-tinted gradient with a
// large icon; if a photo_url is ever added server-side this will use it.
function ProjectFullCard({ item, onPress, index = 0 }) {
  const { t, lang } = useLang();
  const [gradStart, gradEnd] = getSkillGradient(item.skill_category);
  const spotsLeft = item.spots_left;
  const isFull = spotsLeft === 0;
  const locationLine = [item.location, item.district].filter(Boolean).map((s, i) => i === 1 ? String(s).toUpperCase() : s).join(', ');

  return (
    <FadeIn delay={Math.min(index, 8) * 60}>
      <TouchableOpacity style={cs.projectFullCard} onPress={onPress} activeOpacity={0.85}>
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={cs.projectFullBanner} />
        ) : (
          <LinearGradient colors={[gradStart, gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cs.projectFullBanner}>
            <Ionicons name={SKILL_ICONS[item.skill_category] || 'briefcase-outline'} size={56} color="rgba(255,255,255,0.45)" />
          </LinearGradient>
        )}

        <View style={cs.projectFullBody}>
          {!!locationLine && (
            <View style={cs.projectFullLocRow}>
              <Ionicons name="location-outline" size={13} color="#999" />
              <Text style={cs.projectFullLocTxt} numberOfLines={1}>{locationLine}</Text>
            </View>
          )}

          <AutoTranslate text={item.title} lang={lang} style={cs.projectFullTitle} numberOfLines={2} />

          {!!item.contractor_name && (
            <Text style={cs.projectFullContractor} numberOfLines={1}>{item.contractor_name}</Text>
          )}

          <View style={cs.projectFullTagRow}>
            {!!item.skill_category && (
              <View style={cs.projectFullTag}>
                <Text style={cs.projectFullTagTxt}>{item.skill_category}</Text>
              </View>
            )}
            {!!item.daily_wage && (
              <View style={cs.projectFullTag}>
                <Text style={cs.projectFullTagTxt}>₹{item.daily_wage}{t('projPerDaySuffix')}</Text>
              </View>
            )}
            {spotsLeft != null && (
              <View style={cs.projectFullTag}>
                <Text style={cs.projectFullTagTxt}>
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

const cs = StyleSheet.create({
  rowWrap: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 8, marginBottom: 12,
  },
  sectionHeaderTxt: { fontSize: 17, fontWeight: '900', color: '#111', letterSpacing: -0.3 },
  sectionHeaderCount: {
    fontSize: 12, fontWeight: '700', color: '#999', backgroundColor: '#eee',
    borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8,
  },
  gridCell: { width: '48.5%' },

  card: {
    width: '100%', alignSelf: 'stretch',
    backgroundColor: '#fff', borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: '#ececec',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
    position: 'relative',
  },
  cardChevron: { position: 'absolute', top: 14, right: 12, zIndex: 2 },
  cardTop: { marginBottom: 8, paddingRight: 16 },
  photoTile: { width: 46, height: 46, borderRadius: 12, overflow: 'hidden', flexShrink: 0 },
  checkbox: {
    position: 'absolute', top: 10, right: 10, zIndex: 5,
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#ccc',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  checkboxChecked: { backgroundColor: ORANGE, borderColor: ORANGE },
  photoImg: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  photoInitials: { fontSize: 15, fontWeight: '800', color: '#fff' },
  teamBadge: {
    position: 'absolute', bottom: 3, right: 3, flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#7c3aed', borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1.5,
  },
  teamBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '800' },
  rowTitle: { fontSize: 13.5, fontWeight: '800', color: '#111', flexShrink: 1, lineHeight: 17 },
  metaLine: { fontSize: 11, fontWeight: '600', color: '#8a8a92', marginBottom: 8 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8,
  },
  statusPillTxt: { fontSize: 10.5, fontWeight: '700' },
  chipRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  tradeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff7f0', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8,
  },
  tradeChipTxt: { fontSize: 11, fontWeight: '700' },
  plainChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f3f4f6', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8,
  },
  availableChip: { backgroundColor: '#f0fdf4' },
  busyChip: { backgroundColor: '#f4f4f5' },
  trustChip: { backgroundColor: '#f0fdfa' },
  plainChipTxt: { fontSize: 10.5, fontWeight: '700', color: '#666' },

  projectCard: {
    width: '100%', alignSelf: 'stretch',
    backgroundColor: '#fffaf5', borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: '#fde3c8',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  projectEyebrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  projectEyebrow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6,
    borderWidth: 1, borderColor: '#fde3c8',
  },
  projectEyebrowTxt: { fontSize: 9, fontWeight: '800', color: ORANGE, letterSpacing: 0.5 },
  projectIconWrap: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  projectMeta: { fontSize: 11, color: '#999', fontWeight: '600', marginTop: 2 },

  projectsEmptyCard: {
    alignItems: 'center', backgroundColor: '#fffaf5', borderRadius: 16, borderWidth: 1,
    borderColor: '#fde3c8', borderStyle: 'dashed', paddingVertical: 24, paddingHorizontal: 16,
    marginBottom: 12,
  },
  projectsEmptyTitle: { fontSize: 14, fontWeight: '800', color: '#111', marginTop: 8 },
  projectsEmptySub: { fontSize: 12, color: '#999', fontWeight: '600', marginTop: 3, textAlign: 'center' },

  optionPillWrap: { paddingHorizontal: IS_WEB ? 0 : 16, marginTop: 16, marginBottom: 4 },
  optionPillRow: {
    flexDirection: 'row', backgroundColor: '#eee', borderRadius: 100, padding: 4,
  },
  optionPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'transparent', borderRadius: 100, paddingVertical: 10,
  },
  optionPillIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  optionPillLabel: { fontSize: 14, fontWeight: '800', color: '#999' },
  optionPillLabelActive: { color: '#fff' },
  optionPillActive: { backgroundColor: ORANGE },

  projectFullCard: {
    backgroundColor: '#fff', borderRadius: 20, marginBottom: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: '#f0f0f0',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  projectFullBanner: { width: '100%', height: 190, alignItems: 'center', justifyContent: 'center' },
  projectFullBody: { padding: 16 },
  projectFullLocRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  projectFullLocTxt: { fontSize: 12.5, color: '#999', fontWeight: '600' },
  projectFullTitle: { fontSize: 19, fontWeight: '800', color: '#111', lineHeight: 24, marginBottom: 6 },
  projectFullContractor: { fontSize: 14, color: '#555', fontWeight: '500', marginBottom: 14 },
  projectFullTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  projectFullTag: { backgroundColor: '#f3f4f6', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
  projectFullTagTxt: { fontSize: 13, fontWeight: '600', color: '#333' },
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
  const [projects, setProjects] = useState([]);
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
  const [activeSection, setActiveSection] = useState('labour'); // 'labour' | 'projects' — which section the pills show
  const listRef = useRef(null);
  const showLabourOnly = () => { setActiveSection('labour'); listRef.current?.scrollToOffset?.({ offset: 0, animated: true }); };
  const showProjectsOnly = () => { setActiveSection('projects'); listRef.current?.scrollToOffset?.({ offset: 0, animated: true }); };


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

  // Translate the fixed English filter-option labels (used as data keys
  // elsewhere in this file) into the active language for display only.
  const wageLabelMap = {
    Any: t('lbFilterAny'), 'Under ₹500': t('lbFilterUnder500'),
    '₹500–₹800': t('lbFilter500to800'), '₹800–₹1,200': t('lbFilter800to1200'),
    'Above ₹1,200': t('lbFilterAbove1200'),
  };
  const availLabelMap = {
    All: t('lbAvailAll'), 'At Chowk Today': t('lbAvailChowkToday'),
    'Available Now': t('lbAvailNow'), 'Busy this week': t('lbAvailBusyWeek'),
  };
  const typeLabelMap = { All: t('lbTypeAll'), Individuals: t('lbTypeIndividuals'), Teams: t('lbTypeTeams') };
  const wageLabel = (label) => wageLabelMap[label] || label;
  const availLabel = (label) => availLabelMap[label] || label;
  const typeLabel = (label) => typeLabelMap[label] || label;

  const showSidebar = IS_WEB && width >= 900;

  // Contractors browsing this screen are the ones who'll need wallet balance
  // for the hire fee once a worker accepts (unlocking contacts is free) —
  // surface it right in the header instead of burying it in Profile, so
  // topping up doesn't require hitting an error first.
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
        setError(t('lbLoadError'));
      }
    } catch (e) {
      setError(t('lbLoadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentDistrict]);

  useEffect(() => { load(); }, [currentDistrict]);

  // Open Projects (contractor-posted, instant-hire slots) shown alongside
  // individual profiles here — visible to both workers ("users") looking
  // for work and hirers ("contractors") browsing, not gated by labour_role.
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams();
        if (currentDistrict?.id) params.set('district', currentDistrict.id);
        const res = await http('GET', `/api/projects?${params.toString()}`);
        if (res?.ok) setProjects(res.projects || []);
      } catch {
        // non-fatal — the main labour feed still works without projects
      }
    })();
  }, [currentDistrict]);

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

  // Projects relevant to whatever category is currently active, so a
  // contractor/worker filtering to "Electrician" also sees Electrician
  // project openings, not unrelated ones.
  const filteredProjects = useMemo(() => {
    return activeSkill === 'All' ? projects : projects.filter(p => p.skill_category === activeSkill);
  }, [projects, activeSkill]);

  const isPremium = useIsPremium();

  // Chunk a flat list of cards into 2-up rows for the grid.
  const chunkIntoRows = (arr, rowPrefix) =>
    arr.reduce((rows, item, i) => {
      if (i % 2 === 0) rows.push({ type: 'cards', id: `${rowPrefix}_row_${i}`, items: [item] });
      else rows[rows.length - 1].items.push(item);
      return rows;
    }, []);

  // Two distinct sections, each in its own labelled 2-column grid: Labour
  // profiles first, then open Projects — rather than mixing the two types
  // of card together in one feed.
  //
  // Ads are NOT mixed into the card-pairing step — an ad slot that fails
  // to fill (e.g. AdMob not yet verified, or on Expo Go without the native
  // module) renders nothing, and if it had taken one half of a 2-up row,
  // the real profile next to it would be stranded next to a blank gap.
  // Instead every NATIVE_AD_FREQUENCY real profiles we insert a dedicated
  // full-width "adRow" between pair-rows — if it doesn't fill, that row
  // just collapses to nothing instead of leaving a broken-looking grid.
  const sectionedFeed = useMemo(() => {
    const out = [];
    if (activeSection === 'labour') {
      out.push({ type: 'sectionHeader', id: 'section_labour', title: 'Labour', count: filtered.length, alwaysShow: true });
      const rows = chunkIntoRows(filtered, 'labour');
      const showAds = ADS_SUPPORTED && !isPremium;
      let sinceLastAd = 0;
      rows.forEach((row, ri) => {
        out.push(row);
        sinceLastAd += row.items.length;
        if (showAds && sinceLastAd >= NATIVE_AD_FREQUENCY) {
          out.push({ type: 'adRow', id: `labour_adrow_${ri}` });
          sinceLastAd = 0;
        }
      });
    } else {
      out.push({ type: 'sectionHeader', id: 'section_projects', title: 'Projects', count: filteredProjects.length, alwaysShow: true });
      if (filteredProjects.length > 0) {
        filteredProjects.forEach(p => out.push({ type: 'projectFull', id: `project_${p.id}`, item: p }));
      } else {
        out.push({ type: 'projectsEmpty', id: 'projects_empty' });
      }
    }
    return out;
  }, [activeSection, filtered, filteredProjects, isPremium]);

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
    <>
    <View style={IS_WEB ? ws.header : s.header}>
      <View style={s.titleRow}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={() => nav.navigate('Home')} activeOpacity={0.8}>
            <Text style={IS_WEB ? ws.pageTitle : s.pageTitle}>
              {t('lbFind')} <Text style={{ color: ORANGE }}>{t('lbSkilledLabour')}</Text>
            </Text>
          </TouchableOpacity>
          <Text style={IS_WEB ? ws.pageCount : s.pageCount}>
            {filtered.length} {filtered.length === 1 ? t('lbProfile') : t('lbProfiles')} {t('lbFound')}
            {currentDistrict?.name ? ` ${t('lbIn')} ${currentDistrict.name}` : ''}
          </Text>
          <TouchableOpacity style={s.localityBtn} onPress={() => setShowLocalityPicker(true)} activeOpacity={0.8}>
            <Ionicons name="location-outline" size={13} color={ORANGE} />
            <Text style={s.localityBtnTxt} numberOfLines={1}>
              {localityFilter === 'All' ? t('lbAllAreas') : localityFilter}
            </Text>
            <Ionicons name="chevron-down" size={13} color={ORANGE} />
          </TouchableOpacity>
        </View>
        {/* Wallet gets the row to itself now — it was getting squeezed
            between the filter and select-mode icons and was hard to read. */}
        {!!user && (
          <TouchableOpacity style={s.walletChip} onPress={() => nav.navigate('Wallet')} activeOpacity={0.8}>
            <Ionicons name="wallet-outline" size={14} color={ORANGE} />
            <Text style={s.walletChipTxt}>₹{(walletBalance ?? 0).toFixed(0)}</Text>
          </TouchableOpacity>
        )}
      </View>

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
          placeholder={t('lbSearchPlaceholder')}
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
            <Text style={ws.filterBtnTxt}>{t('lbFilters')}</Text>
          </TouchableOpacity>
        )}
        {IS_WEB && !!user && (
          <TouchableOpacity
            style={[ws.searchFilterBtn, selectMode && s.pillBtnActive, { marginLeft: 8 }]}
            onPress={toggleSelectMode}
          >
            <Ionicons name="checkbox-outline" size={17} color={selectMode ? '#fff' : ORANGE} />
            <Text style={[ws.filterBtnTxt, selectMode && s.pillBtnTxtActive]}>
              {selectMode ? t('cancel') : t('lbSelectMultiple')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filters and "select multiple" now live here as clearly labelled
          pills instead of unlabeled icons crammed into the title row. */}
      {!IS_WEB && (
        <View style={s.toolbarRow}>
          <TouchableOpacity
            style={[s.pillBtn, activeFiltersCount > 0 && s.pillBtnActive]}
            onPress={() => setShowFilters(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={16} color={activeFiltersCount > 0 ? '#fff' : '#444'} />
            <Text style={[s.pillBtnTxt, activeFiltersCount > 0 && s.pillBtnTxtActive]}>
              {t('lbFilters')}{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
            </Text>
          </TouchableOpacity>
          {!!user && (
            <TouchableOpacity
              style={[s.pillBtn, selectMode && s.pillBtnActive]}
              onPress={toggleSelectMode}
              activeOpacity={0.8}
            >
              <Ionicons name="checkbox-outline" size={16} color={selectMode ? '#fff' : '#444'} />
              <Text style={[s.pillBtnTxt, selectMode && s.pillBtnTxtActive]}>
                {selectMode ? t('cancel') : t('lbSelectMultiple')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

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
              <View
                style={[
                  s.categoryIconBox,
                  active && { borderWidth: 2, borderColor: catStart, backgroundColor: catStart + '10' },
                ]}
              >
                <Text style={s.categoryEmoji}>{SKILL_EMOJI[cat] || '🛠️'}</Text>
                {active && (
                  <View style={[s.categoryCheck, { backgroundColor: catStart }]}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                )}
              </View>
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
          <Text style={s.subSkillLabel}>{t('lbNarrowDown')}</Text>
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
          <Text style={ws.activeFiltersLabel}>{t('lbActiveFilters')}</Text>
          {wageRange.label !== 'Any' && (
            <TouchableOpacity style={ws.activeChip} onPress={() => setWageRange(WAGE_RANGES[0])}>
              <Text style={ws.activeChipTxt}>{wageLabel(wageRange.label)}</Text>
              <Ionicons name="close" size={11} color={ORANGE} />
            </TouchableOpacity>
          )}
          {availability !== 'All' && (
            <TouchableOpacity style={ws.activeChip} onPress={() => setAvailability('All')}>
              <Text style={ws.activeChipTxt}>{availLabel(availability)}</Text>
              <Ionicons name="close" size={11} color={ORANGE} />
            </TouchableOpacity>
          )}
          {profileTypeFilter !== 'All' && (
            <TouchableOpacity style={ws.activeChip} onPress={() => setProfileTypeFilter('All')}>
              <Text style={ws.activeChipTxt}>{typeLabel(profileTypeFilter)}</Text>
              <Ionicons name="close" size={11} color={ORANGE} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>

    <View style={cs.optionPillWrap}>
      <View style={cs.optionPillRow}>
        <TouchableOpacity style={[cs.optionPill, activeSection === 'labour' && cs.optionPillActive]} onPress={showLabourOnly} activeOpacity={0.85}>
          <LinearGradient colors={['#5eead4', '#0d9488']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cs.optionPillIcon}>
            <Ionicons name="hammer" size={14} color="#fff" />
          </LinearGradient>
          <Text style={[cs.optionPillLabel, activeSection === 'labour' && cs.optionPillLabelActive]}>{t('labour')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[cs.optionPill, activeSection === 'projects' && cs.optionPillActive]} onPress={showProjectsOnly} activeOpacity={0.85}>
          <LinearGradient colors={['#93c5fd', '#2563eb']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cs.optionPillIcon}>
            <Ionicons name="briefcase" size={14} color="#fff" />
          </LinearGradient>
          <Text style={[cs.optionPillLabel, activeSection === 'projects' && cs.optionPillLabelActive]}>{t('projTopBarTitle')}</Text>
        </TouchableOpacity>
      </View>
    </View>
    </>
  );

  // ── Filter modal (wage range + availability) ───────────────────────────────
  const FilterModal = (
    <Modal visible={showFilters} transparent animationType="none" onRequestClose={() => setShowFilters(false)}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowFilters(false)} />
      <Animated.View style={[s.filterSheet, IS_WEB && ws.centeredModal, { transform: [{ translateY: IS_WEB ? 0 : sheetY }] }]}>
        <View style={s.sheetHandle} />
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>{t('lbFilters')}</Text>
          <TouchableOpacity onPress={() => { setWageRange(WAGE_RANGES[0]); setAvailability('All'); setProfileTypeFilter('All'); }}>
            <Text style={s.resetTxt}>{t('lbResetAll')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.filterLabel}>{t('lbListingType')}</Text>
        <View style={s.prefList}>
          {['Individuals', 'Teams'].map((pt, idx) => {
            const meta = PROFILE_TYPE_META[pt];
            const active = profileTypeFilter === pt;
            const chipLabels = pt === 'Individuals'
              ? [t('lbTypeIndivChip1'), t('lbTypeIndivChip2')]
              : [t('lbTypeTeamChip1'), t('lbTypeTeamChip2')];
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
                    <Text style={[s.prefTitle, active && { color: meta.color }]}>{typeLabel(pt)}</Text>
                    <View style={s.prefChipRow}>
                      {chipLabels.map(c => (
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

        <Text style={[s.filterLabel, { marginTop: 20 }]}>{t('lbDailyWage')}</Text>
        {WAGE_RANGES.map(r => (
          <TouchableOpacity
            key={r.label}
            style={[s.rangeRow, wageRange.label === r.label && s.rangeActive]}
            onPress={() => setWageRange(r)}
          >
            <Text style={[s.rangeTxt, wageRange.label === r.label && { color: ORANGE, fontWeight: '700' }]}>{wageLabel(r.label)}</Text>
            {wageRange.label === r.label && <Ionicons name="checkmark-circle" size={18} color={ORANGE} />}
          </TouchableOpacity>
        ))}

        <Text style={[s.filterLabel, { marginTop: 20 }]}>{t('lbAvailability')}</Text>
        {AVAILABILITY_OPTIONS.map(a => (
          <TouchableOpacity
            key={a}
            style={[s.rangeRow, availability === a && s.rangeActive]}
            onPress={() => setAvailability(a)}
          >
            <Text style={[s.rangeTxt, availability === a && { color: ORANGE, fontWeight: '700' }]}>{availLabel(a)}</Text>
            {availability === a && <Ionicons name="checkmark-circle" size={18} color={ORANGE} />}
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={s.applyFilterBtn} onPress={() => setShowFilters(false)}>
          <Text style={s.applyFilterTxt}>{t('lbShowNProfiles').replace('{N}', filtered.length)}</Text>
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
        <Text style={s.sheetTitle}>{t('lbChooseArea')}</Text>
        <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={[s.rangeRow, localityFilter === 'All' && s.rangeActive]}
            onPress={() => { setLocalityFilter('All'); setShowLocalityPicker(false); }}
          >
            <Text style={[s.rangeTxt, localityFilter === 'All' && { color: ORANGE, fontWeight: '700' }]}>{t('lbAllAreas')}</Text>
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
              {t('lbNoAreaData')}
            </Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  // Renders a single labour-profile card into a grid cell.
  const renderCell = (item, index) => {
    return (
      <View key={item.id} style={cs.gridCell}>
        <LabourCard
          item={item}
          index={index}
          selectMode={selectMode}
          selected={selectedIds.includes(item.id)}
          onPress={() => nav.navigate('LabourDetail', { id: item.id })}
          onToggleSelect={() => toggleSelectId(item.id)}
        />
      </View>
    );
  };

  // Renders one entry of `sectionedFeed` — either a full-width section
  // title ("Labour" / "Projects") or a 2-up row of cards.
  const renderRow = ({ item: row, index }) => {
    if (row.type === 'sectionHeader') {
      if (row.count === 0 && !row.alwaysShow) return null;
      return (
        <View style={cs.sectionHeaderRow}>
          <Text style={cs.sectionHeaderTxt}>{row.title}</Text>
          <Text style={cs.sectionHeaderCount}>{row.count}</Text>
        </View>
      );
    }
    if (row.type === 'adRow') {
      return <NativeAdCard />;
    }
    if (row.type === 'projectsEmpty') {
      return (
        <TouchableOpacity style={cs.projectsEmptyCard} onPress={() => nav.navigate('PostProject')} activeOpacity={0.85}>
          <Ionicons name="briefcase-outline" size={22} color={ORANGE} />
          <Text style={cs.projectsEmptyTitle}>{t('lbNoProjectsYet')}</Text>
          <Text style={cs.projectsEmptySub}>{t('lbPostProjectCta')}</Text>
        </TouchableOpacity>
      );
    }
    if (row.type === 'projectFull') {
      return (
        <ProjectFullCard
          item={row.item}
          index={index}
          onPress={() => nav.navigate('ProjectDetail', { id: row.item.id })}
        />
      );
    }
    return (
      <View style={cs.rowWrap}>
        {row.items.map((it, i) => renderCell(it, index * 2 + i))}
      </View>
    );
  };

  const EmptyState = (
    <Empty
      icon="construct-outline"
      title={activeSkill === 'All' ? t('lbNoProfilesFound') : t('lbNoSkillListed').replace('{SKILL}', activeSkill.toLowerCase())}
      sub={search || activeFiltersCount > 0 ? t('lbTryDifferentFilters') : t('lbBeFirstToPost')}
      action={() => nav.navigate('PostLabourProfile')}
      actionLabel={t('lbPostYourProfile')}
    />
  );

  const selectedWorkers = labourers.filter(w => selectedIds.includes(w.id));

  const SelectBar = selectMode && selectedIds.length > 0 ? (
    <View style={s.selectBar}>
      <Text style={s.selectBarTxt}>{selectedIds.length} {t('lbSelected')}</Text>
      <TouchableOpacity style={s.selectBarBtn} onPress={() => setShowBulkModal(true)} activeOpacity={0.85}>
        <Ionicons name="briefcase-outline" size={15} color="#fff" />
        <Text style={s.selectBarBtnTxt}>{t('lbHireN').replace('{N}', selectedIds.length)}</Text>
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
            <Text style={ws.topBarTitle}>{t('labour')}</Text>
          </TouchableOpacity>
        </View>

        <View style={ws.body}>
          {showSidebar && (
            <View style={ws.leftSidebar}>
              <SideCard style={ws.ctaCard}>
                <View style={ws.ctaCircle1} />
                <View style={ws.ctaCircle2} />
                <Text style={ws.ctaEyebrow}>{t('lbForWorkers')}</Text>
                <Text style={ws.ctaTitle}>{t('lbPostProfileFreeTitle')}</Text>
                <Text style={ws.ctaSub}>{t('lbPostProfileFreeSub')}</Text>
                <TouchableOpacity style={ws.ctaBtn} onPress={() => nav.navigate('PostLabourProfile')} activeOpacity={0.88}>
                  <Ionicons name="add-circle-outline" size={15} color="#fff" />
                  <Text style={ws.ctaBtnTxt}>{t('lbPostAProfile')}</Text>
                </TouchableOpacity>
              </SideCard>

              <SideCard>
                <Text style={ws.sideTitle}>{t('lbBrowseTrades')}</Text>
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
                <Text style={ws.sideTitle}>{t('lbExploreMore')}</Text>
                <QuickAction icon="hammer-outline"     label={t('lbBrowseProjects')} color={ORANGE}  onPress={() => nav.navigate('Projects')} />
                <QuickAction icon="briefcase-outline"  label={t('lbFindAJob')}       color={ORANGE}  onPress={() => nav.navigate('Jobs')} />
                <QuickAction icon="home-outline"       label={t('lbFindARoom')}      color={TEAL}    onPress={() => nav.navigate('Rooms')} />
                <QuickAction icon="car-sport-outline"  label={t('lbRentAVehicle')}   color="#9333ea" onPress={() => nav.navigate('Cars')} />
                <QuickAction icon="pricetag-outline"   label={t('lbBuyAndSell')}     color="#0ea5e9" onPress={() => nav.navigate('BuySell')} />
              </SideCard>
            </View>
          )}

          <View style={[ws.mainCol, !showSidebar && { marginLeft: 0, marginRight: 0 }]}>
            <FlatList
              ref={listRef}
              data={sectionedFeed}
              keyExtractor={row => row.id}
              style={{ width: '100%' }}
              contentContainerStyle={[ws.list, { width: '100%' }]}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ORANGE]} tintColor={ORANGE} />}
              ListHeaderComponent={Header}
              renderItem={renderRow}
              ListEmptyComponent={!loading && EmptyState}
            />
          </View>

          {showSidebar && (
            <View style={ws.rightSidebar}>
              <SideCard>
                <Text style={ws.sideTitle}>{t('lbDailyWage')}</Text>
                {WAGE_RANGES.map(r => (
                  <TouchableOpacity
                    key={r.label}
                    style={[ws.sortRow, wageRange.label === r.label && ws.sortRowActive]}
                    onPress={() => setWageRange(r)}
                  >
                    <Text style={[ws.sortTxt, wageRange.label === r.label && ws.sortTxtActive]}>{wageLabel(r.label)}</Text>
                    {wageRange.label === r.label && <Ionicons name="checkmark-circle" size={16} color={ORANGE} />}
                  </TouchableOpacity>
                ))}
              </SideCard>

              <SideCard>
                <Text style={ws.sideTitle}>{t('lbAvailability')}</Text>
                {AVAILABILITY_OPTIONS.map(a => (
                  <TouchableOpacity
                    key={a}
                    style={[ws.sortRow, availability === a && ws.sortRowActive]}
                    onPress={() => setAvailability(a)}
                  >
                    <Text style={[ws.sortTxt, availability === a && ws.sortTxtActive]}>{availLabel(a)}</Text>
                    {availability === a && <Ionicons name="checkmark-circle" size={16} color={ORANGE} />}
                  </TouchableOpacity>
                ))}
              </SideCard>

              <SideCard style={ws.tipCard}>
                <Text style={ws.tipTitle}>{t('lbHiringTips')}</Text>
                {[t('lbTip1'), t('lbTip2'), t('lbTip3')].map((tip, i) => (
                  <View key={i} style={ws.tipRow}>
                    <View style={ws.tipDot} />
                    <Text style={ws.tipTxt}>{tip}</Text>
                  </View>
                ))}
                <TouchableOpacity style={ws.tipBtn} onPress={() => nav.navigate('PostLabourProfile')} activeOpacity={0.85}>
                  <Ionicons name="add-circle-outline" size={14} color={ORANGE} />
                  <Text style={ws.tipBtnTxt}>{t('lbPostYourProfile')}</Text>
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
        ref={listRef}
        data={sectionedFeed}
        keyExtractor={row => row.id}
        style={{ width: '100%' }}
        contentContainerStyle={[s.list, { width: '100%' }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ORANGE]} tintColor={ORANGE} />}
        ListHeaderComponent={Header}
        renderItem={renderRow}
        ListEmptyComponent={!loading && EmptyState}
        ListFooterComponent={
          !isPremium && filtered.length > 0 ? <BannerAd /> : null
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
    height: 40, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: ORANGE + '15', borderWidth: 1, borderColor: ORANGE + '33',
    alignSelf: 'flex-start', marginTop: 20,
  },
  walletChipTxt: { fontSize: 13, fontWeight: '800', color: ORANGE },

  // Labelled pills for Filters / Select-multiple, replacing the old unlabeled
  // icon buttons that used to crowd the title row alongside the wallet chip.
  toolbarRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  pillBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 38, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e8e8e8',
  },
  pillBtnActive: { backgroundColor: '#111', borderColor: '#111' },
  pillBtnTxt: { fontSize: 13, fontWeight: '700', color: '#444' },
  pillBtnTxtActive: { color: '#fff' },

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
    width: 64, height: 64, borderRadius: 18, backgroundColor: '#f2f2f4',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    borderWidth: 2, borderColor: 'transparent',
  },
  categoryEmoji: { fontSize: 28 },
  categoryCheck: {
    position: 'absolute', bottom: -4, right: -4, width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
  },
  categoryIconBoxActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  categoryTileTxt: { fontSize: 12, fontWeight: '700', color: '#222', textAlign: 'center', lineHeight: 15 },
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
