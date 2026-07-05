import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, RefreshControl, Platform, StatusBar,
  Animated, Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { http } from '../utils/api';

import { useLang } from '../utils/i18n';
import { useDistrict } from '../context/DistrictContext';

// ── Trade identity system ───────────────────────────────────────────────────
// Every trade gets its own accent so a person's badge, the active filter chip,
// and the card border all speak the same colour language across the screen.
const DEEP    = '#78350f';
const AMBER   = '#b45309';
const ORANGE  = '#f97316';
const CANVAS  = '#faf8f5';

const SKILL_CATEGORIES = [
  'All', 'Mason', 'Electrician', 'Plumber', 'Painter', 'Carpenter', 'Welder', 'Helper',
];

const TRADES = {
  All:         { icon: 'grid-outline',            color: AMBER },
  Mason:       { icon: 'business-outline',        color: '#6b7280' },
  Electrician: { icon: 'flash-outline',            color: '#ca8a04' },
  Plumber:     { icon: 'water-outline',            color: '#0284c7' },
  Painter:     { icon: 'color-palette-outline',    color: '#9333ea' },
  Carpenter:   { icon: 'hammer-outline',           color: '#92400e' },
  Welder:      { icon: 'flame-outline',            color: '#dc2626' },
  Helper:      { icon: 'people-outline',           color: '#059669' },
};
const tradeOf = (name) => TRADES[name] || TRADES.Helper;

// ── Skeleton placeholder shown while the list loads ────────────────────────
function SkeletonCard() {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 650, easing: Easing.ease, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={[s.card, { opacity: pulse }]}>
      <View style={s.cardTop}>
        <View style={[s.avatar, { backgroundColor: '#eee' }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ height: 12, width: '55%', backgroundColor: '#eee', borderRadius: 4 }} />
          <View style={{ height: 9, width: '35%', backgroundColor: '#f1f1f1', borderRadius: 4 }} />
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: '#f5f5f5', marginVertical: 12 }} />
      <View style={{ height: 20, width: '40%', backgroundColor: '#eee', borderRadius: 4 }} />
    </Animated.View>
  );
}

// ── Labour profile card ────────────────────────────────────────────────────
function LabourCard({ item, onPress }) {
  const trade = tradeOf(item.skill_category);
  const hasRating = !!item.rating_count && Number(item.rating_count) > 0;

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      {item.availability === 'busy' && (
        <View style={s.busyBadge}>
          <Text style={s.busyBadgeTxt}>Busy this week</Text>
        </View>
      )}

      <View style={s.cardTop}>
        <View style={[s.avatar, { backgroundColor: trade.color + '17' }]}>
          <Ionicons name={trade.icon} size={18} color={trade.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={s.name} numberOfLines={1}>{item.full_name}</Text>
            {!!item.id_verified && (
              <Ionicons name="shield-checkmark" size={13} color="#2563eb" />
            )}
          </View>
          <Text style={s.meta} numberOfLines={1}>
            {item.skill_category}{item.experience_years ? ` \u00b7 ${item.experience_years} yrs experience` : ''}
          </Text>
        </View>

        {hasRating ? (
          <View style={s.ratingPill}>
            <Ionicons name="star" size={11} color="#f59e0b" />
            <Text style={s.ratingTxt}>{Number(item.rating_avg).toFixed(1)}</Text>
          </View>
        ) : (
          <View style={s.newPill}>
            <Text style={s.newPillTxt}>New</Text>
          </View>
        )}
      </View>

      <View style={s.cardBottom}>
        <View>
          <Text style={s.wageLabel}>DAILY WAGE</Text>
          <Text style={s.wageValue}>
            {item.daily_wage ? `\u20b9${item.daily_wage}/day` : 'Contact for rate'}
          </Text>
        </View>
        <TouchableOpacity style={[s.hireBtn, { backgroundColor: trade.color }]} onPress={onPress} activeOpacity={0.85}>
          <Text style={s.hireBtnTxt}>Hire now</Text>
          <Ionicons name="arrow-forward" size={13} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────
export default function LabourScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const { currentDistrict } = useDistrict();

  const [labourers, setLabourers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeSkill, setActiveSkill] = useState('All');
  const [error, setError] = useState(null);

  const load = useCallback(async (opts = {}) => {
    try {
      if (!opts.silent) setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (currentDistrict?.id) params.set('district', currentDistrict.id);
      if (activeSkill !== 'All') params.set('skill_category', activeSkill);
      if (search.trim()) params.set('q', search.trim());

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
  }, [currentDistrict, activeSkill, search]);

  useEffect(() => { load(); }, [activeSkill, currentDistrict]);

  const onRefresh = () => {
    setRefreshing(true);
    load({ silent: true });
  };

  const onSubmitSearch = () => load();

  const barH = 58;

  return (
    <View style={[s.root, { paddingTop: Platform.OS === 'web' ? 0 : insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={DEEP} />

      {/* Hero */}
      <LinearGradient colors={[DEEP, AMBER]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <View style={s.heroTopRow}>
          <View style={s.heroBadge}>
            <Ionicons name="hammer-outline" size={13} color="#fff" />
          </View>
          <Text style={s.heroKicker}>NANDED ROZGAR</Text>
        </View>
        <Text style={s.heroTitle}>Find Skilled Labour</Text>
        <Text style={s.heroSub}>
          {currentDistrict?.name ? `Verified profiles in ${currentDistrict.name}` : 'Verified profiles near you'}
        </Text>
      </LinearGradient>

      {/* Search card, floated over the hero/list seam */}
      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={17} color="#b0a89e" />
          <TextInput
            style={s.searchInput}
            placeholder="Search mason, electrician, plumber..."
            placeholderTextColor="#b0a89e"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={onSubmitSearch}
            returnKeyType="search"
          />
          {!!search && (
            <TouchableOpacity onPress={() => { setSearch(''); load(); }}>
              <Ionicons name="close-circle" size={16} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.chipRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}
      >
        {SKILL_CATEGORIES.map(cat => {
          const trade = tradeOf(cat === 'All' ? undefined : cat);
          const active = activeSkill === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveSkill(cat)}
              style={[
                s.chip,
                active && { backgroundColor: trade.color + '17', borderColor: trade.color + '55' },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons name={trade.icon} size={13} color={active ? trade.color : '#8a8a8a'} />
              <Text style={[s.chipTxt, active && { color: trade.color, fontWeight: '700' }]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {error && (
        <View style={s.errorBox}>
          <Text style={s.errorTxt}>{error}</Text>
          <TouchableOpacity onPress={() => load()}>
            <Text style={s.errorRetry}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={{ padding: 16, paddingBottom: barH + insets.bottom + 24 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={labourers}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: barH + insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ORANGE} />}
          renderItem={({ item }) => (
            <LabourCard
              item={item}
              onPress={() => nav.navigate('LabourDetail', { id: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="construct-outline" size={30} color={AMBER} />
              </View>
              <Text style={s.emptyTitle}>
                {activeSkill === 'All' ? 'No labour profiles yet' : `No ${activeSkill.toLowerCase()}s listed yet`}
              </Text>
              <Text style={s.emptySub}>Be the first to post a profile in this area.</Text>
              <TouchableOpacity style={s.emptyCta} onPress={() => nav.navigate('PostLabourProfile')} activeOpacity={0.85}>
                <Ionicons name="add" size={15} color="#fff" />
                <Text style={s.emptyCtaTxt}>Post your profile</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Docked action bar — sits above content, never overlaps the last card */}
      <View style={[s.dockBar, { height: barH + insets.bottom, paddingBottom: insets.bottom }]}>
        <TouchableOpacity
          style={s.dockBtn}
          onPress={() => nav.navigate('PostLabourProfile')}
          activeOpacity={0.9}
        >
          <Ionicons name="add-circle" size={18} color="#fff" />
          <Text style={s.dockBtnTxt}>Post your profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: CANVAS },

  hero: {
    paddingTop: 18, paddingHorizontal: 18, paddingBottom: 34,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  heroBadge: {
    width: 22, height: 22, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroKicker: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.75)', letterSpacing: 1.2 },
  heroTitle: { fontSize: 23, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 12.5, color: 'rgba(255,255,255,0.85)', fontWeight: '500', marginTop: 4 },

  searchWrap: { marginTop: -20, marginHorizontal: 16, marginBottom: 4 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
    shadowColor: '#3d2b12', shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#1c1410' },

  chipRow: { height: 50, marginTop: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100,
    backgroundColor: '#fff', borderWidth: 1.3, borderColor: '#ece5da',
  },
  chipTxt: { fontSize: 11, fontWeight: '600', color: '#777' },

  errorBox: {
    marginHorizontal: 16, marginTop: 6, padding: 12, borderRadius: 10,
    backgroundColor: '#fef2f2', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  errorTxt: { fontSize: 12, color: '#991b1b', flex: 1 },
  errorRetry: { fontSize: 12, fontWeight: '700', color: '#991b1b' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1ece3',
    padding: 14, marginBottom: 12,
    shadowColor: '#3d2b12', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 14, fontWeight: '800', color: '#1c1410', flexShrink: 1 },
  meta: { fontSize: 11, color: '#9a9088', fontWeight: '500', marginTop: 2 },
  ratingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#fef9ee', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4,
  },
  ratingTxt: { fontSize: 11, fontWeight: '700', color: '#1c1410' },
  newPill: {
    backgroundColor: '#ecfdf5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  newPillTxt: { fontSize: 10, fontWeight: '700', color: '#059669' },

  cardBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f5f1ea',
  },
  wageLabel: { fontSize: 9.5, fontWeight: '700', color: '#a89f96', letterSpacing: 0.4 },
  wageValue: { fontSize: 14, fontWeight: '800', color: '#1c1410', marginTop: 2 },
  hireBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
  },
  hireBtnTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },

  busyBadge: {
    position: 'absolute', top: -1, right: 14,
    backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
    transform: [{ translateY: -10 }],
  },
  busyBadgeTxt: { fontSize: 9, fontWeight: '700', color: '#92400e' },

  empty: { alignItems: 'center', paddingTop: 56, gap: 4, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: AMBER + '14',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#4a4038', textAlign: 'center' },
  emptySub: { fontSize: 12, color: '#a89f96', textAlign: 'center', marginTop: 2, marginBottom: 16 },
  emptyCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: AMBER, borderRadius: 100, paddingHorizontal: 16, paddingVertical: 10,
  },
  emptyCtaTxt: { fontSize: 12.5, fontWeight: '700', color: '#fff' },

  dockBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1ece3',
    paddingHorizontal: 16, paddingTop: 8,
    shadowColor: '#3d2b12', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: -3 },
    elevation: 10,
  },
  dockBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: AMBER, borderRadius: 12, paddingVertical: 11,
  },
  dockBtnTxt: { fontSize: 13.5, fontWeight: '700', color: '#fff' },
});
