/**
 * MyProjectsScreen.js — a contractor's own posted Projects.
 *
 * Reads GET /api/projects/mine — each project comes back with spotsFilled
 * and a live-computed spend (hire fees + wages paid), so budget-vs-spent
 * never drifts out of sync with what actually happened.
 *
 * Tapping a project opens ProjectDetail, which shows the full roster and
 * budget breakdown when the viewer is the owner (isOwner: true from the API).
 *
 * Place at: src/screens/MyProjectsScreen.js
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { http } from '../utils/api';
import { Empty } from '../components/UI';
import { LABOUR_COLORS, SPACING, RADIUS, SKILL_ICONS, getSkillGradient } from '../constants/labourTheme';
import { Badge } from '../components/labour/LabourUI';

const ORANGE = LABOUR_COLORS.primary;

const STATUS_TONE = {
  active: { label: 'Open', tone: 'success' },
  filled: { label: 'Fully staffed', tone: 'info' },
  closed: { label: 'Closed', tone: 'neutral' },
};

function MyProjectCard({ item, onPress }) {
  const [gradStart] = getSkillGradient(item.skill_category);
  const statusMeta = STATUS_TONE[item.status] || STATUS_TONE.active;

  return (
    <TouchableOpacity style={cs.row} onPress={onPress} activeOpacity={0.75}>
      <View style={[cs.iconWrap, { backgroundColor: gradStart + '1a' }]}>
        <Ionicons name={SKILL_ICONS[item.skill_category] || 'briefcase-outline'} size={20} color={gradStart} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={cs.title} numberOfLines={1}>{item.title}</Text>
        <Text style={cs.meta}>
          {item.spotsFilled}/{item.workers_needed} filled · Spent ₹{Math.round(item.spend?.totalSpent || 0)}
        </Text>
        <View style={cs.chipRow}>
          <Badge label={statusMeta.label} tone={statusMeta.tone} />
          {!!item.daily_wage && <Badge icon="cash-outline" label={`₹${item.daily_wage}/day`} tone="primary" />}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#ccc" />
    </TouchableOpacity>
  );
}

export default function MyProjectsScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (opts = {}) => {
    try {
      if (!opts.silent) setLoading(true);
      setError(null);
      const res = await http('GET', '/api/projects/mine');
      if (res?.ok) {
        setProjects(res.projects || []);
      } else {
        setError('Could not load your projects right now.');
      }
    } catch (e) {
      setError('Could not load your projects right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  // Refresh whenever this screen regains focus — e.g. after posting a new
  // project or returning from a detail page where slots may have filled.
  useFocusEffect(useCallback(() => { load({ silent: true }); }, [load]));

  const onRefresh = () => { setRefreshing(true); load({ silent: true }); };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.topBar}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#111" />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>My Projects</Text>
        <TouchableOpacity onPress={() => nav.navigate('PostProject')} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="add" size={22} color={ORANGE} />
        </TouchableOpacity>
      </View>

      {!!error && (
        <View style={s.errorBanner}>
          <Ionicons name="alert-circle" size={16} color="#b91c1c" />
          <Text style={s.errorBannerTxt}>{error}</Text>
          <TouchableOpacity onPress={() => load()} style={s.errorBannerBtn}>
            <Text style={s.errorBannerBtnTxt}>Retry</Text>
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
            <MyProjectCard item={item} onPress={() => nav.navigate('ProjectDetail', { id: item.id })} />
          )}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ORANGE]} tintColor={ORANGE} />}
          ListEmptyComponent={(
            <Empty
              icon="briefcase-outline"
              title="You haven't posted any projects yet"
              sub="Post a multi-worker project to fill several slots at once — workers apply and get hired instantly."
              action={() => nav.navigate('PostProject')}
              actionLabel="Post a Project"
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

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fee2e2', paddingHorizontal: 14, paddingVertical: 10,
  },
  errorBannerTxt: { flex: 1, fontSize: 12.5, color: '#b91c1c', fontWeight: '600' },
  errorBannerBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#b91c1c', borderRadius: 8 },
  errorBannerBtnTxt: { color: '#fff', fontSize: 11.5, fontWeight: '700' },
});
