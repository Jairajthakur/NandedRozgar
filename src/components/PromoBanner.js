/**
 * PromoBanner.js — Rich Business Banner System v4.0
 *
 * Every banner now shows:
 *  - Business name + category badge
 *  - Tagline / offer headline
 *  - Description snippet (up to 2 lines)
 *  - Phone, website, address chips
 *  - Plan badge (Premium / Popular / Basic)
 *  - Strong CTA button
 *  - Background image per category (Unsplash)
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, Linking, Platform,
  ImageBackground, Image, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { http } from '../utils/api';

const IS_WEB = Platform.OS === 'web';
const { width: SCREEN_W } = Dimensions.get('window');

// ─── Category palettes ────────────────────────────────────────────────────────
const CAT_PALETTES = {
  'Salon / Beauty': {
    primary: '#e91e8c', dark: '#4a004a', accent: '#ffb3e0', emoji: '✂️',
    gradient: ['#e91e8c', '#9c27b0'],
    images: [
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80',
    ],
  },
  'Real Estate': {
    primary: '#0d47a1', dark: '#01193a', accent: '#64b5f6', emoji: '🏠',
    gradient: ['#0d47a1', '#1565c0'],
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80',
    ],
  },
  'Food / Restaurant': {
    primary: '#e53935', dark: '#3e0000', accent: '#ffcc02', emoji: '🍽️',
    gradient: ['#e53935', '#bf360c'],
    images: [
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80',
    ],
  },
  'Retail / Shop': {
    primary: '#f57c00', dark: '#3e2000', accent: '#ffea00', emoji: '🛍️',
    gradient: ['#f57c00', '#e65100'],
    images: [
      'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80',
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80',
    ],
  },
  'Technology': {
    primary: '#3d5afe', dark: '#000051', accent: '#00e5ff', emoji: '💻',
    gradient: ['#1a237e', '#3d5afe'],
    images: [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80',
      'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600&q=80',
    ],
  },
  'Education': {
    primary: '#00897b', dark: '#00251a', accent: '#69f0ae', emoji: '📚',
    gradient: ['#00695c', '#00897b'],
    images: [
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&q=80',
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80',
    ],
  },
  'Healthcare': {
    primary: '#0288d1', dark: '#01579b', accent: '#80d8ff', emoji: '🏥',
    gradient: ['#01579b', '#0288d1'],
    images: [
      'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=600&q=80',
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80',
    ],
  },
  'Automobile': {
    primary: '#c62828', dark: '#1a0000', accent: '#ff5252', emoji: '🚗',
    gradient: ['#1a0000', '#c62828'],
    images: [
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=80',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80',
    ],
  },
  'Finance': {
    primary: '#2e7d32', dark: '#1b5e20', accent: '#69f0ae', emoji: '💰',
    gradient: ['#1b5e20', '#2e7d32'],
    images: [
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80',
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80',
    ],
  },
  'Gym / Fitness': {
    primary: '#e64a19', dark: '#1a0800', accent: '#ffab40', emoji: '💪',
    gradient: ['#1a0800', '#e64a19'],
    images: [
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80',
    ],
  },
  'Hotel / Travel': {
    primary: '#00838f', dark: '#006064', accent: '#80deea', emoji: '🏨',
    gradient: ['#006064', '#00838f'],
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80',
    ],
  },
  'Clothing / Fashion': {
    primary: '#6a1b9a', dark: '#1a0030', accent: '#ea80fc', emoji: '👗',
    gradient: ['#1a0030', '#6a1b9a'],
    images: [
      'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&q=80',
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80',
    ],
  },
  'Jewellery': {
    primary: '#ff8f00', dark: '#1a0d00', accent: '#ffe57f', emoji: '💎',
    gradient: ['#1a0d00', '#ff8f00'],
    images: [
      'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600&q=80',
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=80',
    ],
  },
  'Electronics': {
    primary: '#283593', dark: '#0d0d3b', accent: '#40c4ff', emoji: '📱',
    gradient: ['#0d0d3b', '#283593'],
    images: [
      'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&q=80',
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&q=80',
    ],
  },
  'Catering': {
    primary: '#ad1457', dark: '#3e0020', accent: '#ff80ab', emoji: '🍱',
    gradient: ['#3e0020', '#ad1457'],
    images: [
      'https://images.unsplash.com/photo-1555244162-803834f70033?w=600&q=80',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
    ],
  },
  'Event Management': {
    primary: '#7b1fa2', dark: '#1a003a', accent: '#ea80fc', emoji: '🎉',
    gradient: ['#1a003a', '#7b1fa2'],
    images: [
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80',
      'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80',
    ],
  },
  'Photography': {
    primary: '#212121', dark: '#000000', accent: '#ffcc00', emoji: '📸',
    gradient: ['#000000', '#424242'],
    images: [
      'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=600&q=80',
      'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?w=600&q=80',
    ],
  },
  'Plumber / Electrician': {
    primary: '#00695c', dark: '#00251a', accent: '#1de9b6', emoji: '🔧',
    gradient: ['#00251a', '#00695c'],
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&q=80',
    ],
  },
  'Pharmacy': {
    primary: '#01579b', dark: '#002f6c', accent: '#4fc3f7', emoji: '💊',
    gradient: ['#002f6c', '#01579b'],
    images: [
      'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600&q=80',
      'https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=600&q=80',
    ],
  },
  'Bakery / Sweets': {
    primary: '#e65100', dark: '#3e1000', accent: '#ffd740', emoji: '🎂',
    gradient: ['#3e1000', '#e65100'],
    images: [
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80',
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80',
    ],
  },
  'Agriculture / Farm': {
    primary: '#33691e', dark: '#1a3500', accent: '#b2ff59', emoji: '🌾',
    gradient: ['#1a3500', '#33691e'],
    images: [
      'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&q=80',
      'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=600&q=80',
    ],
  },
  'Yoga / Wellness': {
    primary: '#6d4c41', dark: '#3e2723', accent: '#ffcc80', emoji: '🧘',
    gradient: ['#3e2723', '#6d4c41'],
    images: [
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80',
      'https://images.unsplash.com/photo-1545389336-cf090694435e?w=600&q=80',
    ],
  },
  'Legal / Lawyer': {
    primary: '#37474f', dark: '#102027', accent: '#90a4ae', emoji: '⚖️',
    gradient: ['#102027', '#37474f'],
    images: [
      'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80',
      'https://images.unsplash.com/photo-1575505586569-646b2ca898fc?w=600&q=80',
    ],
  },
  'Transport / Logistics': {
    primary: '#1565c0', dark: '#003c8f', accent: '#82b1ff', emoji: '🚚',
    gradient: ['#003c8f', '#1565c0'],
    images: [
      'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&q=80',
      'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=600&q=80',
    ],
  },
  'Pest Control': {
    primary: '#558b2f', dark: '#1b5e20', accent: '#ccff90', emoji: '🐛',
    gradient: ['#1b5e20', '#558b2f'],
    images: [
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
      'https://images.unsplash.com/photo-1592417817038-d13fd7342585?w=600&q=80',
    ],
  },
};

const DEFAULT_PALETTE = {
  primary: '#e53935', dark: '#1a0000', accent: '#ffeb3b', emoji: '⚡',
  gradient: ['#1a0000', '#e53935'],
  images: [
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80',
    'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&q=80',
  ],
};

function getPalette(category) {
  if (!category) return DEFAULT_PALETTE;
  for (const key of Object.keys(CAT_PALETTES)) {
    const parts = key.toLowerCase().split(/[\\/,&]/);
    for (const part of parts) {
      if (category.toLowerCase().includes(part.trim())) return CAT_PALETTES[key];
    }
  }
  const fallbacks = Object.values(CAT_PALETTES);
  const idx = category.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % fallbacks.length;
  return fallbacks[idx];
}

function getImage(promo, palette) {
  const imgs = palette.images || DEFAULT_PALETTE.images;
  const hash = (promo.bizName || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return imgs[hash % imgs.length];
}

// ─── Plan badge ───────────────────────────────────────────────────────────────
const PLAN_META = {
  premium: { label: '⭐ PREMIUM', bg: '#ff8f00', text: '#fff' },
  popular: { label: '🔥 POPULAR', bg: '#7b1fa2', text: '#fff' },
  basic:   { label: 'BASIC',      bg: 'rgba(255,255,255,0.18)', text: '#fff' },
};
function PlanBadge({ plan, style }) {
  const meta = PLAN_META[plan] || PLAN_META.basic;
  return (
    <View style={[pb.wrap, { backgroundColor: meta.bg }, style]}>
      <Text style={[pb.txt, { color: meta.text }]}>{meta.label}</Text>
    </View>
  );
}
const pb = StyleSheet.create({
  wrap: { borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10, alignSelf: 'flex-start' },
  txt:  { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
});

// ─── Info chips row (phone / website / address) ───────────────────────────────
function InfoChips({ promo, accentColor, dark = false }) {
  const textColor = dark ? '#333' : 'rgba(255,255,255,0.85)';
  const chips = [];
  if (promo.phone)   chips.push({ icon: 'call',              label: promo.phone,   onPress: () => Linking.openURL(`tel:${promo.phone}`) });
  if (promo.website) chips.push({ icon: 'globe-outline',     label: promo.website.replace(/^https?:\/\//, ''), onPress: () => Linking.openURL(promo.website.startsWith('http') ? promo.website : `https://${promo.website}`) });
  if (promo.address) chips.push({ icon: 'map-outline',       label: promo.address, onPress: null });
  return (
    <View style={ic.row}>
      {chips.map((c, i) => (
        <TouchableOpacity key={i} onPress={c.onPress || undefined} activeOpacity={c.onPress ? 0.7 : 1} style={[ic.chip, { borderColor: accentColor + '50' }]}>
          <Ionicons name={c.icon} size={10} color={accentColor} />
          <Text style={[ic.label, { color: textColor }]} numberOfLines={1}>{c.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const ic = StyleSheet.create({
  row:   { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip:  { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: 'rgba(255,255,255,0.08)' },
  label: { fontSize: 9, fontWeight: '600', maxWidth: 110 },
});

// ─── LAYOUT A: FULL IMAGE — glam magazine style ────────────────────────────────
// Used for: Salon, Fashion, Photography, Clothing
function LayoutFullImage({ promo, palette, onCall }) {
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onCall} style={la.card}>
      <ImageBackground source={{ uri: getImage(promo, palette) }} style={la.img} imageStyle={{ borderRadius: 20 }}>
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.25)', palette.dark + 'f2']} style={la.overlay}>
          <View style={la.top}>
            <View style={[la.catBadge, { backgroundColor: palette.primary }]}>
              <Text style={la.catTxt}>{palette.emoji} {promo.category?.toUpperCase()}</Text>
            </View>
            <PlanBadge plan={promo.plan} />
          </View>
          <View style={la.bottom}>
            <Text style={la.biz} numberOfLines={1}>{promo.bizName}</Text>
            {!!promo.tagline && (
              <Text style={[la.tagline, { color: palette.accent }]} numberOfLines={2}>{promo.tagline}</Text>
            )}
            {!!promo.description && (
              <Text style={la.desc} numberOfLines={2}>{promo.description}</Text>
            )}
            <InfoChips promo={promo} accentColor={palette.accent} />
            <View style={la.footer}>
              <View style={la.locRow}>
                <Ionicons name="location-sharp" size={11} color="rgba(255,255,255,0.6)" />
                <Text style={la.locTxt}>{promo.location}</Text>
              </View>
              <TouchableOpacity style={[la.cta, { backgroundColor: palette.primary }]} onPress={onCall}>
                <Ionicons name="call" size={12} color="#fff" />
                <Text style={la.ctaTxt}>CALL NOW</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
}
const la = StyleSheet.create({
  card:    { borderRadius: 20, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  img:     { minHeight: 220 },
  overlay: { flex: 1, padding: 14, justifyContent: 'space-between', minHeight: 220 },
  top:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge:{ borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12 },
  catTxt:  { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  bottom:  { gap: 6 },
  biz:     { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  tagline: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  desc:    { fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 16 },
  footer:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  locRow:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locTxt:  { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  cta:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 25 },
  ctaTxt:  { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
});

// ─── LAYOUT B: SPLIT LEFT/RIGHT — dark card with image panel ─────────────────
// Used for: Technology, Transport, Legal, Finance, Real Estate
function LayoutSplit({ promo, palette, onCall }) {
  const glowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
      Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
    ])).start();
  }, []);
  const borderColor = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [palette.primary + '55', palette.accent] });
  return (
    <Animated.View style={[lb.outer, { borderColor }]}>
      <TouchableOpacity activeOpacity={0.92} onPress={onCall} style={[lb.card, { backgroundColor: palette.dark }]}>
        {/* Grid lines */}
        <View style={lb.grid} pointerEvents="none">
          {[0,1,2,3].map(i => <View key={i} style={[lb.gridH, { top: i * 46 + 14 }]} />)}
          {[0,1,2].map(i => <View key={i} style={[lb.gridV, { left: i * 90 + 30 }]} />)}
        </View>
        {/* Image panel */}
        <View style={lb.imgPanel}>
          <Image source={{ uri: getImage(promo, palette) }} style={lb.img} />
          <LinearGradient colors={[palette.dark, 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={lb.fade} />
        </View>
        {/* Content */}
        <View style={lb.content}>
          <View style={lb.topRow}>
            <View style={[lb.badge, { borderColor: palette.accent + '70', backgroundColor: palette.accent + '15' }]}>
              <View style={[lb.dot, { backgroundColor: palette.accent }]} />
              <Text style={[lb.badgeTxt, { color: palette.accent }]}>{palette.emoji} {promo.category}</Text>
            </View>
            <PlanBadge plan={promo.plan} />
          </View>
          <Text style={lb.biz} numberOfLines={1}>{promo.bizName}</Text>
          {!!promo.tagline && (
            <Text style={[lb.tagline, { color: palette.accent + 'cc' }]} numberOfLines={2}>{promo.tagline}</Text>
          )}
          {!!promo.description && (
            <Text style={lb.desc} numberOfLines={2}>{promo.description}</Text>
          )}
          <InfoChips promo={promo} accentColor={palette.accent} />
          <View style={lb.footer}>
            <View style={lb.locRow}>
              <Ionicons name="location" size={10} color={palette.accent + '80'} />
              <Text style={[lb.locTxt, { color: palette.accent + '80' }]}>{promo.location}</Text>
            </View>
            <TouchableOpacity style={[lb.cta, { backgroundColor: palette.primary, shadowColor: palette.primary }]} onPress={onCall}>
              <Ionicons name="call" size={12} color="#fff" />
              <Text style={lb.ctaTxt}>CONNECT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const lb = StyleSheet.create({
  outer:   { borderRadius: 20, borderWidth: 1.5, elevation: 10, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  card:    { borderRadius: 18, overflow: 'hidden', flexDirection: 'row', minHeight: 195 },
  grid:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  gridH:   { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  gridV:   { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  imgPanel:{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '45%' },
  img:     { flex: 1, resizeMode: 'cover' },
  fade:    { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 },
  content: { flex: 1, padding: 16, gap: 6, zIndex: 2 },
  topRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge:   { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
  dot:     { width: 5, height: 5, borderRadius: 3 },
  badgeTxt:{ fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  biz:     { fontSize: 21, fontWeight: '900', color: '#fff', letterSpacing: -0.4 },
  tagline: { fontSize: 12, fontWeight: '700', lineHeight: 17 },
  desc:    { fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 16 },
  footer:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  locRow:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locTxt:  { fontSize: 10 },
  cta:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 25, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  ctaTxt:  { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
});

// ─── LAYOUT C: WHITE CARD — clean professional ────────────────────────────────
// Used for: Healthcare, Education, Service, Legal, Pharmacy
function LayoutWhiteCard({ promo, palette, onCall }) {
  const features = ['Quick Service', '24/7 Available', 'Best Rates'];
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onCall} style={[lc.card]}>
      {/* Coloured header */}
      <LinearGradient colors={[palette.primary, palette.dark]} style={lc.header}>
        <View style={lc.headerRow}>
          <View>
            <Text style={lc.headCat}>{palette.emoji} {promo.category?.toUpperCase()}</Text>
            <Text style={lc.headBiz} numberOfLines={1}>{promo.bizName}</Text>
          </View>
          <View style={lc.headerRight}>
            <PlanBadge plan={promo.plan} />
            <View style={lc.imgCircle}>
              <Image source={{ uri: getImage(promo, palette) }} style={lc.img} />
            </View>
          </View>
        </View>
      </LinearGradient>
      {/* White body */}
      <View style={lc.body}>
        {!!promo.tagline && (
          <Text style={[lc.tagline, { color: palette.primary }]} numberOfLines={1}>"{promo.tagline}"</Text>
        )}
        {!!promo.description && (
          <Text style={lc.desc} numberOfLines={2}>{promo.description}</Text>
        )}
        <View style={lc.checkList}>
          {features.map((f, i) => (
            <View key={i} style={lc.checkRow}>
              <Ionicons name="checkmark-circle" size={13} color={palette.primary} />
              <Text style={lc.checkTxt}>{f}</Text>
            </View>
          ))}
        </View>
        <InfoChips promo={promo} accentColor={palette.primary} dark />
        <View style={lc.footer}>
          <View style={lc.locRow}>
            <Ionicons name="location" size={10} color="#aaa" />
            <Text style={lc.locTxt}>{promo.location}</Text>
          </View>
          <TouchableOpacity style={[lc.cta, { backgroundColor: palette.primary }]} onPress={onCall}>
            <Ionicons name="call" size={12} color="#fff" />
            <Text style={lc.ctaTxt}>CALL NOW</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={[lc.sideAccent, { backgroundColor: palette.primary }]} />
    </TouchableOpacity>
  );
}
const lc = StyleSheet.create({
  card:       { borderRadius: 20, overflow: 'hidden', backgroundColor: '#fff', elevation: 6, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  header:     { paddingHorizontal: 16, paddingVertical: 14 },
  headerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerRight:{ alignItems: 'flex-end', gap: 6 },
  headCat:    { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.75)', letterSpacing: 1.2 },
  headBiz:    { fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 2 },
  imgCircle:  { width: 54, height: 54, borderRadius: 27, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  img:        { width: '100%', height: '100%', resizeMode: 'cover' },
  body:       { padding: 14, gap: 8 },
  tagline:    { fontSize: 13, fontWeight: '700', fontStyle: 'italic' },
  desc:       { fontSize: 12, color: '#555', lineHeight: 17 },
  checkList:  { gap: 3 },
  checkRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkTxt:   { fontSize: 11, color: '#444', fontWeight: '500' },
  footer:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  locRow:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locTxt:     { fontSize: 10, color: '#aaa' },
  cta:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 25 },
  ctaTxt:     { color: '#fff', fontSize: 11, fontWeight: '900' },
  sideAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
});

// ─── LAYOUT D: FOOD / FIRE ────────────────────────────────────────────────────
// Used for: Food, Bakery, Catering, Agriculture
function LayoutFoodFire({ promo, palette, onCall }) {
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onCall} style={ld.card}>
      <ImageBackground source={{ uri: getImage(promo, palette) }} style={ld.bg} imageStyle={{ borderRadius: 20, resizeMode: 'cover' }}>
        <LinearGradient colors={[palette.dark + 'ee', palette.primary + 'bb', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={ld.side}>
          <View style={ld.content}>
            <View style={ld.topRow}>
              <View style={[ld.catBadge, { backgroundColor: palette.accent }]}>
                <Text style={[ld.catTxt, { color: palette.dark }]}>{palette.emoji} {promo.category}</Text>
              </View>
              <PlanBadge plan={promo.plan} />
            </View>
            <Text style={ld.biz} numberOfLines={1}>{promo.bizName}</Text>
            {!!promo.tagline && (
              <Text style={[ld.tagline, { color: palette.accent }]} numberOfLines={2}>{promo.tagline}</Text>
            )}
            {!!promo.description && (
              <Text style={ld.desc} numberOfLines={2}>{promo.description}</Text>
            )}
            <InfoChips promo={promo} accentColor={palette.accent} />
            <View style={ld.footer}>
              <View style={ld.locRow}>
                <Ionicons name="location" size={10} color="rgba(255,255,255,0.6)" />
                <Text style={ld.locTxt}>{promo.location}</Text>
              </View>
              <TouchableOpacity style={[ld.cta, { backgroundColor: palette.primary }]} onPress={onCall}>
                <Ionicons name="call-outline" size={12} color="#fff" />
                <Text style={ld.ctaTxt}>ORDER NOW</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
}
const ld = StyleSheet.create({
  card:    { borderRadius: 20, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  bg:      { minHeight: 205 },
  side:    { flex: 1, minHeight: 205 },
  content: { padding: 16, gap: 7, flex: 1, justifyContent: 'center' },
  topRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge:{ borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12 },
  catTxt:  { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  biz:     { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  tagline: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  desc:    { fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 16 },
  footer:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  locRow:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locTxt:  { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  cta:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 25 },
  ctaTxt:  { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
});

// ─── LAYOUT E: PRESTIGE DARK — gold / finance / jewellery ─────────────────────
function LayoutPrestige({ promo, palette, onCall }) {
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onCall} style={[le.card, { backgroundColor: palette.dark }]}>
      {/* Image strip top */}
      <View style={le.imgStrip}>
        <Image source={{ uri: getImage(promo, palette) }} style={le.img} />
        <LinearGradient colors={['transparent', palette.dark]} style={le.imgFade} />
      </View>
      <View style={le.content}>
        <View style={le.topRow}>
          <View style={[le.pill, { borderColor: palette.accent + '60' }]}>
            <Text style={[le.pillTxt, { color: palette.accent }]}>{palette.emoji} {promo.category}</Text>
          </View>
          <PlanBadge plan={promo.plan} />
          <View style={[le.verified, { backgroundColor: palette.accent + '20' }]}>
            <Ionicons name="checkmark-circle" size={11} color={palette.accent} />
            <Text style={[le.verTxt, { color: palette.accent }]}>VERIFIED</Text>
          </View>
        </View>
        <Text style={le.biz} numberOfLines={1}>{promo.bizName}</Text>
        {!!promo.tagline && (
          <Text style={[le.tagline, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={2}>{promo.tagline}</Text>
        )}
        {!!promo.description && (
          <Text style={le.desc} numberOfLines={2}>{promo.description}</Text>
        )}
        <InfoChips promo={promo} accentColor={palette.accent} />
        <View style={[le.divider, { backgroundColor: palette.accent + '30' }]} />
        <View style={le.footer}>
          <View style={le.locRow}>
            <Ionicons name="location" size={10} color={palette.accent + '80'} />
            <Text style={[le.locTxt, { color: palette.accent + '80' }]}>{promo.location}</Text>
          </View>
          <TouchableOpacity style={[le.cta, { backgroundColor: palette.primary }]} onPress={onCall}>
            <Ionicons name="call" size={13} color="#fff" />
            <Text style={le.ctaTxt}>CONSULT FREE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
const le = StyleSheet.create({
  card:    { borderRadius: 20, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  imgStrip:{ height: 90, overflow: 'hidden' },
  img:     { width: '100%', height: '100%', resizeMode: 'cover' },
  imgFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 55 },
  content: { padding: 14, gap: 7 },
  topRow:  { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  pill:    { borderWidth: 1, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
  pillTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  verified:{ flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 12, paddingVertical: 3, paddingHorizontal: 8 },
  verTxt:  { fontSize: 8, fontWeight: '900' },
  biz:     { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.4 },
  tagline: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  desc:    { fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 16 },
  divider: { height: 1, marginVertical: 2 },
  footer:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locRow:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locTxt:  { fontSize: 10 },
  cta:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 25 },
  ctaTxt:  { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
});

// ─── Layout routing ───────────────────────────────────────────────────────────
const LAYOUT_BY_CATEGORY = {
  'salon':      'fullImage',
  'fashion':    'fullImage',
  'clothing':   'fullImage',
  'photograph': 'fullImage',
  'gym':        'fullImage',
  'fitness':    'fullImage',
  'hotel':      'fullImage',
  'travel':     'fullImage',
  'event':      'fullImage',
  'tech':       'split',
  'transport':  'split',
  'logistics':  'split',
  'automobile': 'split',
  'car':        'split',
  'real estate':'split',
  'property':   'split',
  'electronic': 'split',
  'health':     'whiteCard',
  'hospital':   'whiteCard',
  'pharma':     'whiteCard',
  'doctor':     'whiteCard',
  'education':  'whiteCard',
  'school':     'whiteCard',
  'plumber':    'whiteCard',
  'electrician':'whiteCard',
  'pest':       'whiteCard',
  'service':    'whiteCard',
  'yoga':       'whiteCard',
  'food':       'foodFire',
  'restaurant': 'foodFire',
  'bakery':     'foodFire',
  'catering':   'foodFire',
  'sweets':     'foodFire',
  'agri':       'foodFire',
  'farm':       'foodFire',
  'retail':     'foodFire',
  'shop':       'foodFire',
  'finance':    'prestige',
  'jewel':      'prestige',
  'gold':       'prestige',
  'legal':      'prestige',
  'lawyer':     'prestige',
  'law':        'prestige',
};

function pickLayoutKey(promo) {
  const cat = (promo.category || '').toLowerCase();
  for (const [keyword, layout] of Object.entries(LAYOUT_BY_CATEGORY)) {
    if (cat.includes(keyword)) return layout;
  }
  // Deterministic fallback
  const keys = ['fullImage', 'split', 'whiteCard', 'foodFire', 'prestige'];
  const hash = (promo.bizName || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return keys[hash % keys.length];
}

const LAYOUT_COMPONENTS = {
  fullImage: LayoutFullImage,
  split:     LayoutSplit,
  whiteCard: LayoutWhiteCard,
  foodFire:  LayoutFoodFire,
  prestige:  LayoutPrestige,
};

// ─── Public BannerCard export ─────────────────────────────────────────────────
export function BannerCard({ promo, onCall }) {
  const palette = getPalette(promo.category);
  const layoutKey = pickLayoutKey(promo);
  const Layout = LAYOUT_COMPONENTS[layoutKey] || LayoutSplit;
  const handleCall = () => {
    if (promo.phone && !promo.isDummy) Linking.openURL(`tel:${promo.phone}`);
  };
  return <Layout promo={promo} palette={palette} onCall={onCall || handleCall} />;
}

// ─── Pulse dot ────────────────────────────────────────────────────────────────
function PulseDot({ color }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: 1.9, duration: 750, useNativeDriver: !IS_WEB, easing: Easing.out(Easing.ease) }),
      Animated.timing(scale, { toValue: 1,   duration: 750, useNativeDriver: !IS_WEB, easing: Easing.in(Easing.ease)  }),
    ])).start();
  }, []);
  return <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, transform: [{ scale }] }} />;
}

// ─── Dot row ──────────────────────────────────────────────────────────────────
function DotRow({ total, active, color }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[
          { height: 6, borderRadius: 3 },
          i === active ? { backgroundColor: color, width: 16 } : { backgroundColor: color + '40', width: 6 },
        ]} />
      ))}
    </View>
  );
}

// ─── Main PromoBanner ─────────────────────────────────────────────────────────
export default function PromoBanner({ style: propStyle, promo: inlineProp, inline = false }) {
  const nav    = useNavigation();
  const fadeO  = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(20)).current;
  const [promos,  setPromos]  = useState([]);
  const [current, setCurrent] = useState(0);
  const [ready,   setReady]   = useState(false);

  useEffect(() => {
    if (inline && inlineProp) { setPromos([inlineProp]); setReady(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await http('GET', '/api/promotions/all');
        if (!cancelled) {
          setPromos(res.ok && Array.isArray(res.promotions) ? res.promotions : []);
          setReady(true);
        }
      } catch {
        if (!cancelled) { setPromos([]); setReady(true); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    Animated.parallel([
      Animated.timing(fadeO,  { toValue: 1, duration: 500, delay: 100, useNativeDriver: !IS_WEB, easing: Easing.out(Easing.ease) }),
      Animated.timing(slideY, { toValue: 0, duration: 450, delay: 100, useNativeDriver: !IS_WEB, easing: Easing.out(Easing.back(1.1)) }),
    ]).start();
  }, [ready]);

  useEffect(() => {
    if (promos.length < 2) return;
    const id = setInterval(() => setCurrent(prev => (prev + 1) % promos.length), 6000);
    return () => clearInterval(id);
  }, [promos]);

  if (!ready || promos.length === 0) return null;

  const promo   = promos[current];
  const palette = getPalette(promo.category);
  const handleCall = () => {
    if (promo.phone && !promo.isDummy) Linking.openURL(`tel:${promo.phone}`);
  };

  if (inline) {
    return (
      <Animated.View style={[{ marginHorizontal: 12, marginVertical: 6, opacity: fadeO, transform: [{ translateY: slideY }] }, propStyle]}>
        <BannerCard promo={promo} onCall={handleCall} />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[s.wrap, propStyle, { opacity: fadeO, transform: [{ translateY: slideY }] }]}>
      <View style={s.topRow}>
        <View style={[s.sponsoredTag, { borderColor: palette.primary + '35' }]}>
          <PulseDot color={palette.primary} />
          <Text style={[s.sponsoredTxt, { color: palette.primary }]}>Sponsored</Text>
        </View>
        <TouchableOpacity onPress={() => nav.navigate('PromoteBusiness')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.advertiseLink}>Advertise here →</Text>
        </TouchableOpacity>
      </View>

      <BannerCard promo={promo} onCall={handleCall} />

      {promos.length > 1 && (
        <View style={s.navRow}>
          <TouchableOpacity onPress={() => setCurrent(prev => (prev - 1 + promos.length) % promos.length)} style={s.navBtn}>
            <Ionicons name="chevron-back" size={14} color="#bbb" />
          </TouchableOpacity>
          <DotRow total={promos.length} active={current} color={palette.primary} />
          <TouchableOpacity onPress={() => setCurrent(prev => (prev + 1) % promos.length)} style={s.navBtn}>
            <Ionicons name="chevron-forward" size={14} color="#bbb" />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap:          { marginHorizontal: 12, marginBottom: 12, marginTop: 4 },
  topRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7, paddingHorizontal: 2 },
  sponsoredTag:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 9, borderWidth: 1 },
  sponsoredTxt:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  advertiseLink: { fontSize: 10, fontWeight: '700', color: '#aaa', textDecorationLine: 'underline' },
  navRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 },
  navBtn:        { padding: 4 },
});
