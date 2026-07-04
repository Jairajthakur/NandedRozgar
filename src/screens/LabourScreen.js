import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, RefreshControl, Platform, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { http } from '../utils/api';

import { useLang } from '../utils/i18n';
import { useDistrict } from '../context/DistrictContext';

const ORANGE = '#f97316';
const LABOUR_COLOR = '#b45309';

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

// ── Labour profile card ────────────────────────────────────────────────────
function LabourCard({ item, onPress }) {
  const initials = (item.full_name || '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      <View style={s.cardTop}>
        <View style={s.avatar}>
          <Text style={s.avatarTxt}>{initials}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.name} numberOfLines={1}>{item.full_name}</Text>
          <Text style={s.meta} numberOfLines={1}>
            {item.skill_category}{item.experience_years ? ` \u00b7 ${item.experience_years} yrs experience` : ''}
          </Text>
        </View>
        {!!item.rating_avg && (
          <View style={s.ratingPill}>
            <Ionicons name="star" size={11} color="#f59e0b" />
            <Text style={s.ratingTxt}>{Number(item.rating_avg).toFixed(1)}</Text>
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
        <TouchableOpacity style={s.hireBtn} onPress={onPress} activeOpacity={0.85}>
          <Text style={s.hireBtnTxt}>Hire now</Text>
        </TouchableOpacity>
      </View>

      {item.availability === 'busy' && (
        <View style={s.busyBadge}>
          <Text style={s.busyBadgeTxt}>Busy this week</Text>
        </View>
      )}
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
      if (currentDistrict?.slug) params.set('district', currentDistrict.slug);
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

  return (
    <View style={[s.root, { paddingTop: Platform.OS === 'web' ? 0 : insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.header}>
        <Text style={s.headerTitle}>Find <Text style={{ color: LABOUR_COLOR }}>Skilled Labour</Text></Text>
        <Text style={s.headerSub}>
          {currentDistrict?.name ? `Verified profiles in ${currentDistrict.name}` : 'Verified profiles near you'}
        </Text>

        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={16} color="#bbb" />
          <TextInput
            style={s.searchInput}
            placeholder="Search mason, electrician, plumber..."
            placeholderTextColor="#bbb"
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
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {SKILL_CATEGORIES.map(cat => {
          const active = activeSkill === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveSkill(cat)}
              style={[s.chip, active && s.chipActive]}
              activeOpacity={0.8}
            >
              <Ionicons
                name={SKILL_ICONS[cat] || 'construct-outline'}
                size={13}
                color={active ? LABOUR_COLOR : '#666'}
              />
              <Text style={[s.chipTxt, active && s.chipTxtActive]}>{cat}</Text>
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

      <FlatList
        data={labourers}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ORANGE} />}
        renderItem={({ item }) => (
          <LabourCard
            item={item}
            onPress={() => nav.navigate('LabourDetail', { id: item.id })}
          />
        )}
        ListEmptyComponent={
          !loading && (
            <View style={s.empty}>
              <Ionicons name="construct-outline" size={40} color="#ddd" />
              <Text style={s.emptyTitle}>No labour profiles found</Text>
              <Text style={s.emptySub}>Try a different skill or check back soon.</Text>
            </View>
          )
        }
      />

      <TouchableOpacity
        style={s.postFab}
        onPress={() => nav.navigate('PostLabourProfile')}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={s.postFabTxt}>Post your profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },

  header: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerTitle: { fontSize: 19, fontWeight: '800', color: '#111' },
  headerSub: { fontSize: 12, color: '#999', fontWeight: '500', marginTop: 4, marginBottom: 12 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f8f8f8', borderWidth: 1.5, borderColor: '#ebebeb',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#111' },

  chipRow: { backgroundColor: '#fff', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e0e0e0',
  },
  chipActive: { backgroundColor: '#fef3e2', borderColor: '#fcd9a8' },
  chipTxt: { fontSize: 11, fontWeight: '600', color: '#666' },
  chipTxtActive: { color: LABOUR_COLOR, fontWeight: '700' },

  errorBox: {
    margin: 16, marginBottom: 0, padding: 12, borderRadius: 10,
    backgroundColor: '#fef2f2', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  errorTxt: { fontSize: 12, color: '#991b1b', flex: 1 },
  errorRetry: { fontSize: 12, fontWeight: '700', color: '#991b1b' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f0f0f0',
    padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: LABOUR_COLOR + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontSize: 14, fontWeight: '800', color: LABOUR_COLOR },
  name: { fontSize: 14, fontWeight: '800', color: '#111' },
  meta: { fontSize: 11, color: '#999', fontWeight: '500', marginTop: 2 },
  ratingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#f9f9f9', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
  },
  ratingTxt: { fontSize: 11, fontWeight: '700', color: '#111' },

  cardBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f5f5f5',
  },
  wageLabel: { fontSize: 10, fontWeight: '700', color: '#999' },
  wageValue: { fontSize: 14, fontWeight: '800', color: '#111', marginTop: 2 },
  hireBtn: { backgroundColor: ORANGE, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  hireBtnTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },

  busyBadge: {
    position: 'absolute', top: 12, right: 14,
    backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  busyBadgeTxt: { fontSize: 9, fontWeight: '700', color: '#92400e' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#999' },
  emptySub: { fontSize: 12, color: '#bbb' },

  postFab: {
    position: 'absolute', bottom: 16, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: LABOUR_COLOR, borderRadius: 100, paddingHorizontal: 18, paddingVertical: 12,
    shadowColor: LABOUR_COLOR, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  postFabTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
