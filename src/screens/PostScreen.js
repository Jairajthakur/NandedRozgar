/**
 * CityPlus — PostScreen.js
 * "What do you want to post?" hub — shown on the center Post tab.
 * Routes into the individual posting flows (Job / Room / Vehicle / Item /
 * Project / Promote Business / Labour Profile).
 */
import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useDistrict } from '../context/DistrictContext';
import { useLang } from '../utils/i18n';
import { FEATURES } from '../utils/constants';
import MonthlyPlanBanner from '../components/MonthlyPlanBanner';

const ORANGE = '#f97316';
const GRAY   = '#f5f5f5';
const BORDER = '#ebebeb';
const DARK   = '#111827';

export default function PostScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const { user } = useAuth();
  const { currentDistrict } = useDistrict();

  const go = (route) => {
    if (!user) {
      nav.navigate('Login');
      return;
    }
    nav.navigate(route);
  };

  const CATEGORIES = [
    {
      key: 'job',
      icon: 'briefcase-outline',
      color: '#f97316',
      title: t('postAJob') || 'Post a Job',
      subtitle: 'Hire staff, workers, delivery partners',
      badge: { label: 'HOT', tone: 'orange' },
      onPress: () => go('PostJob'),
    },
    {
      key: 'room',
      icon: 'home-outline',
      color: '#16a34a',
      title: t('postARoom') || 'List a Room / PG',
      subtitle: 'Find tenants for your flat or hostel',
      badge: { label: '34 listed', tone: 'green' },
      onPress: () => go('PostRoom'),
    },
    {
      key: 'car',
      icon: 'car-sport-outline',
      color: '#0ea5e9',
      title: t('postAVehicle') || 'Rent your Vehicle',
      subtitle: 'List your car, bike or auto',
      onPress: () => go('PostCar'),
    },
    {
      key: 'item',
      icon: 'pricetag-outline',
      color: '#8b5cf6',
      title: t('postAnItem') || 'Sell an Item',
      subtitle: 'Sell electronics, furniture, books',
      onPress: () => go('PostItem'),
    },
    {
      key: 'project',
      icon: 'construct-outline',
      color: '#6366f1',
      title: 'Post a Project',
      subtitle: FEATURES.LABOUR_ENABLED
        ? 'Need a team of workers? Post the job site'
        : 'Coming soon 🚧',
      badge: FEATURES.LABOUR_ENABLED ? { label: 'NEW', tone: 'indigo' } : { label: 'Coming Soon', tone: 'amber' },
      onPress: () => go('PostProject'),
    },
    {
      key: 'business',
      icon: 'megaphone-outline',
      color: '#db2777',
      title: 'Promote Business',
      subtitle: 'Advertise your shop, clinic or service',
      badge: { label: 'NEW', tone: 'pink' },
      onPress: () => go('PromoteBusiness'),
    },
    {
      key: 'labour',
      icon: 'hammer-outline',
      color: '#b45309',
      title: 'Post Labour Profile',
      subtitle: FEATURES.LABOUR_ENABLED
        ? 'List your skills and get hired by contractors'
        : 'Coming soon 🚧',
      badge: !FEATURES.LABOUR_ENABLED ? { label: 'Coming Soon', tone: 'amber' } : null,
      onPress: () => go('PostLabourProfile'),
    },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => (nav.canGoBack() ? nav.goBack() : null)}
          style={styles.topBarBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Post</Text>
        <View style={styles.topBarBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>
            {(currentDistrict?.name || 'Nanded').toUpperCase()} · REACH 10,000+
          </Text>
          <Text style={styles.heroTitle}>
            What do you want{'\n'}to <Text style={{ color: ORANGE }}>post?</Text>
          </Text>
          <Text style={styles.heroSub}>Hire, rent, list or sell — reach your city in minutes.</Text>

          <View style={styles.statsRow}>
            <View style={[styles.statPill, styles.statPillOrange]}>
              <View style={[styles.statDot, { backgroundColor: ORANGE }]} />
              <Text style={styles.statPillTxt}><Text style={styles.statPillNum}>247</Text> posts today</Text>
            </View>
            <View style={[styles.statPill, styles.statPillGreen]}>
              <View style={[styles.statDot, { backgroundColor: '#16a34a' }]} />
              <Text style={styles.statPillTxt}><Text style={styles.statPillNum}>12k+</Text> active users</Text>
            </View>
          </View>
        </View>

        <MonthlyPlanBanner navigation={nav} />

        <View style={styles.list}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={styles.card}
              activeOpacity={0.85}
              onPress={c.onPress}
            >
              <View style={[styles.cardBar, { backgroundColor: c.color }]} />
              <View style={[styles.iconWrap, { backgroundColor: `${c.color}1a` }]}>
                <Ionicons name={c.icon} size={22} color={c.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>{c.title}</Text>
                  {!!c.badge && (
                    <View style={[styles.badge, badgeTone(c.badge.tone).wrap]}>
                      <Text style={[styles.badgeTxt, badgeTone(c.badge.tone).txt]}>{c.badge.label}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardSub}>{c.subtitle}</Text>
              </View>
              <View style={styles.chevronWrap}>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function badgeTone(tone) {
  switch (tone) {
    case 'orange': return { wrap: { backgroundColor: '#fff7ed' }, txt: { color: '#c2410c' } };
    case 'green':  return { wrap: { backgroundColor: '#f0fdf4' }, txt: { color: '#15803d' } };
    case 'pink':   return { wrap: { backgroundColor: '#fdf2f8' }, txt: { color: '#be185d' } };
    case 'indigo': return { wrap: { backgroundColor: '#eef2ff' }, txt: { color: '#4338ca' } };
    case 'amber':  return { wrap: { backgroundColor: '#fffbeb' }, txt: { color: '#b45309' } };
    default:       return { wrap: { backgroundColor: GRAY },      txt: { color: '#374151' } };
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  topBarBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: BORDER,
  },
  topBarTitle: { fontSize: 16, fontWeight: '800', color: DARK },

  hero: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  heroEyebrow: { fontSize: 12, fontWeight: '800', color: ORANGE, letterSpacing: 0.5 },
  heroTitle: { fontSize: 28, fontWeight: '900', color: DARK, marginTop: 8, lineHeight: 34 },
  heroSub: { fontSize: 13.5, color: '#6b7280', marginTop: 10, lineHeight: 19 },

  statsRow: { flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap' },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100,
  },
  statPillOrange: { backgroundColor: '#fff7ed' },
  statPillGreen:  { backgroundColor: '#f0fdf4' },
  statDot: { width: 6, height: 6, borderRadius: 3 },
  statPillTxt: { fontSize: 12, color: '#4b5563', fontWeight: '600' },
  statPillNum: { fontWeight: '900', color: DARK },

  list: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: GRAY, borderWidth: 1, borderColor: BORDER,
    borderRadius: 16, padding: 16, paddingLeft: 0, overflow: 'hidden',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  cardBar: { width: 4, alignSelf: 'stretch', borderRadius: 2, marginRight: 0 },
  iconWrap: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginLeft: 12,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: DARK },
  cardSub: { fontSize: 12.5, color: '#6b7280', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 100 },
  badgeTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  chevronWrap: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER,
    marginRight: 12,
  },
});
