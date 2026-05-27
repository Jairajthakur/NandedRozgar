/**
 * DistrictPickerScreen.js
 * Shown when user hasn't selected a district yet (first launch or after clearing).
 * Also accessible from HomeScreen header to switch districts.
 */
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, Dimensions, Platform, StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useDistrict, DISTRICTS } from '../context/DistrictContext';

const { width: SW, height: SH } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';

const ORANGE = '#f97316';
const BG     = '#fbf9f6';
const CARD   = '#ffffff';
const TEXT   = '#1a1a18';
const DIM    = '#888780';
const BORDER = '#e8e4dd';

// Floating animated orb
function Orb({ size, color, top, left, right, bottom, dur = 4000 }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -14, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(y, { toValue: 0,   duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={{ position: 'absolute', width: size, height: size, borderRadius: size/2, backgroundColor: color, top, left, right, bottom, opacity: 0.18, transform: [{ translateY: y }] }}
      pointerEvents="none"
    />
  );
}

function DistrictCard({ district, onSelect, delay = 0 }) {
  const scale  = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(scale,   { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.back(1.3)), useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(pressScale, { toValue: 0.96, duration: 80, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(pressScale, { toValue: 1,    duration: 120, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(() => onSelect(district.id));
  };

  return (
    <Animated.View style={{ opacity, transform: [{ scale: Animated.multiply(scale, pressScale) }] }}>
      <TouchableOpacity onPress={handlePress} activeOpacity={1}>
        <View style={[styles.districtCard, { borderColor: district.color + '33' }]}>
          {/* Color accent bar */}
          <View style={[styles.cardAccent, { backgroundColor: district.color }]} />
          
          <View style={styles.cardInner}>
            {/* Emoji + name row */}
            <View style={styles.cardHeader}>
              <Text style={styles.cardEmoji}>{district.emoji}</Text>
              <View style={styles.cardNameWrap}>
                <Text style={styles.cardName}>{district.name}</Text>
                <Text style={styles.cardMarathi}>{district.nameMarathi}</Text>
              </View>
              <View style={[styles.cardBadge, { backgroundColor: district.color + '15', borderColor: district.color + '40' }]}>
                <Text style={[styles.cardBadgeTxt, { color: district.color }]}>{district.state}</Text>
              </View>
            </View>

            <Text style={styles.cardDesc}>{district.description}</Text>

            {/* CTA */}
            <View style={[styles.cardCta, { backgroundColor: district.color }]}>
              <Text style={styles.cardCtaTxt}>Select {district.name}</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 6 }} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function DistrictPickerScreen({ onDone, isSwitch = false }) {
  const { selectDistrict } = useDistrict();
  const titleY = useRef(new Animated.Value(30)).current;
  const titleOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(titleOp, { toValue: 1, duration: 600, delay: 100, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(titleY,  { toValue: 0, duration: 600, delay: 100, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);

  async function handleSelect(id) {
    await selectDistrict(id);
    onDone?.();
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      
      {/* Background orbs */}
      <Orb size={220} color={ORANGE}   top={-60}  left={-60}  dur={5000} />
      <Orb size={160} color="#7c3aed"  bottom={80} right={-40} dur={4200} />
      <Orb size={100} color={ORANGE}   top={SH*0.4} right={20} dur={3800} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View style={[styles.headerWrap, { opacity: titleOp, transform: [{ translateY: titleY }] }]}>
          {/* App logo area */}
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <MaterialCommunityIcons name="map-marker-radius" size={26} color={ORANGE} />
            </View>
            <Text style={styles.logoText}>
              <Text style={{ color: TEXT }}>City</Text>
              <Text style={{ color: ORANGE }}>Plus</Text>
            </Text>
          </View>

          <Text style={styles.headline}>
            {isSwitch ? 'Switch District' : 'Choose Your District'}
          </Text>
          <Text style={styles.sub}>
            {isSwitch
              ? 'All listings will update for your selected district'
              : 'Select your district to see jobs, rooms & more near you'}
          </Text>
        </Animated.View>

        {/* District cards */}
        <View style={styles.cardsWrap}>
          {DISTRICTS.map((d, i) => (
            <DistrictCard
              key={d.id}
              district={d}
              onSelect={handleSelect}
              delay={250 + i * 120}
            />
          ))}
        </View>

        {/* Footer note */}
        <Animated.View style={[styles.footerNote, { opacity: titleOp }]}>
          <Ionicons name="information-circle-outline" size={15} color={DIM} style={{ marginRight: 5 }} />
          <Text style={styles.footerTxt}>
            You can switch district anytime from the home screen
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: IS_WEB ? 40 : 60,
    paddingBottom: 40,
    minHeight: SH,
  },
  headerWrap: {
    marginBottom: 32,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 15,
    color: DIM,
    lineHeight: 22,
  },
  cardsWrap: {
    gap: 16,
  },
  districtCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 4,
  },
  cardAccent: {
    height: 4,
    width: '100%',
  },
  cardInner: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  cardEmoji: {
    fontSize: 32,
  },
  cardNameWrap: {
    flex: 1,
  },
  cardName: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: -0.3,
  },
  cardMarathi: {
    fontSize: 14,
    color: DIM,
    fontWeight: '500',
    marginTop: 1,
  },
  cardBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  cardBadgeTxt: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardDesc: {
    fontSize: 14,
    color: DIM,
    lineHeight: 20,
    marginBottom: 16,
  },
  cardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
  },
  cardCtaTxt: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    paddingHorizontal: 20,
  },
  footerTxt: {
    fontSize: 13,
    color: DIM,
    textAlign: 'center',
    lineHeight: 18,
  },
});
