/**
 * ComingSoonScreen.js
 * ─────────────────────────────────────────────────────────────────
 * Generic "Under Construction" placeholder for any feature that is
 * built but not yet launched. Point a nav route at this component
 * (via a feature flag in src/utils/constants.js → FEATURES) instead
 * of the real screen, and swap it back in the moment you're ready
 * to go live — no other code needs to change.
 *
 * Usage (see App.js):
 *   const Comp = FEATURES.LABOUR_ENABLED
 *     ? LabourScreen
 *     : (props) => (
 *         <ComingSoonScreen
 *           {...props}
 *           title="Labour Marketplace"
 *           subtitle="Hire skilled workers near you — launching soon!"
 *         />
 *       );
 * ─────────────────────────────────────────────────────────────────
 */

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ORANGE = '#f97316';

export default function ComingSoonScreen({
  navigation,
  title = 'Coming Soon',
  subtitle = "We're building something great here. Check back soon!",
  icon = 'construct-outline',
}) {
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    try {
      if (navigation?.canGoBack?.()) navigation.goBack();
      else navigation?.navigate?.('Home');
    } catch {
      /* no-op */
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <TouchableOpacity style={styles.backBtn} onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Ionicons name="arrow-back" size={22} color="#111" />
      </TouchableOpacity>

      <View style={styles.center}>
        <View style={styles.iconRing}>
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={44} color={ORANGE} />
          </View>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>🚧 UNDER CONSTRUCTION</Text>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <TouchableOpacity style={styles.homeBtn} onPress={handleBack} activeOpacity={0.85}>
          <Ionicons name="home-outline" size={16} color="#fff" />
          <Text style={styles.homeBtnTxt}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  backBtn: {
    marginLeft: 16, marginTop: 8, width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
  },
  iconRing: {
    width: 110, height: 110, borderRadius: 55, backgroundColor: '#fff7ed',
    alignItems: 'center', justifyContent: 'center', marginBottom: 22,
  },
  iconWrap: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: '#ffedd5',
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    backgroundColor: '#fff3e8', borderWidth: 1, borderColor: '#ffd8aa',
    borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, marginBottom: 16,
  },
  badgeTxt: { fontSize: 11, fontWeight: '800', color: '#c2410c', letterSpacing: 0.4 },
  title: { fontSize: 22, fontWeight: '800', color: '#1f2937', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 21, maxWidth: 320 },
  homeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: ORANGE, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 26,
    marginTop: 30,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  homeBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
