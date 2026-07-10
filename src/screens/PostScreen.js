/**
 * CityPlus — PostScreen.js
 * "What do you want to post?" hub — shown on the center Post tab.
 * Routes into the individual posting flows (Job / Room / Car / Item / Labour).
 */
import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../utils/i18n';
import { FEATURES } from '../utils/constants';

const ORANGE = '#f97316';
const GRAY   = '#f5f5f5';
const BORDER = '#ebebeb';

export default function PostScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useLang();
  const { user } = useAuth();

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
      subtitle: 'Hire seekers for work near you',
      onPress: () => go('PostJob'),
    },
    {
      key: 'room',
      icon: 'business-outline',
      color: '#0ea5e9',
      title: t('postARoom') || 'Post Property',
      subtitle: 'List a room, flat, or PG for rent',
      onPress: () => go('PostRoom'),
    },
    {
      key: 'car',
      icon: 'car-sport-outline',
      color: '#8b5cf6',
      title: t('postAVehicle') || 'Post a Vehicle',
      subtitle: 'Sell or rent out a car / bike',
      onPress: () => go('PostCar'),
    },
    {
      key: 'item',
      icon: 'pricetag-outline',
      color: '#22c55e',
      title: t('postAnItem') || 'Post an Item',
      subtitle: 'Sell something in Buy & Sell',
      onPress: () => go('PostItem'),
    },
    {
      key: 'labour',
      icon: 'hammer-outline',
      color: '#e11d48',
      title: 'Post Labour Profile',
      subtitle: FEATURES.LABOUR_ENABLED
        ? 'List your skills and get hired'
        : 'Coming soon 🚧',
      onPress: () => go('PostLabourProfile'),
    },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>What would you like to post?</Text>
        <Text style={styles.headerSub}>Pick a category to get started — it's free.</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={styles.card}
            activeOpacity={0.85}
            onPress={c.onPress}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${c.color}1a` }]}>
              <Ionicons name={c.icon} size={24} color={c.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{c.title}</Text>
              <Text style={styles.cardSub}>{c.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1f2937' },
  headerSub: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  list: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: GRAY, borderWidth: 1, borderColor: BORDER,
    borderRadius: 16, padding: 16,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  cardSub: { fontSize: 12.5, color: '#6b7280', marginTop: 2 },
});
