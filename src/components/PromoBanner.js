/**
 * PromoBanner.js — Ultra-Premium Promotional Banner System v3.0
 *
 * Features:
 * - 15 completely UNIQUE banner layouts — no two are ever the same
 * - Real background images via Unsplash (category-specific)
 * - 25+ business categories fully supported
 * - Every banner has a distinct visual identity
 * - Animated entrance, shimmer, pulse effects
 * - Image overlays, glassmorphism, bold typography
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, Linking, Platform, ImageBackground,
  Image, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { http } from '../utils/api';

const IS_WEB = Platform.OS === 'web';
const { width: SCREEN_W } = Dimensions.get('window');

// ─── 25+ Category palettes with Unsplash images ───────────────────────────────
const CAT_PALETTES = {
  'Salon / Beauty': {
    layout: 'glam_magazine',
    primary: '#e91e8c', secondary: '#fce4f5', dark: '#4a004a',
    accent: '#ffb3e0', emoji: '✂️', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80',
      'https://images.unsplash.com/photo-1527799820374-87591a0919f2?w=600&q=80',
    ],
    gradient: ['#e91e8c', '#9c27b0'],
  },
  'Real Estate': {
    layout: 'luxury_property',
    primary: '#0d47a1', secondary: '#e3f2fd', dark: '#01193a',
    accent: '#64b5f6', emoji: '🏠', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80',
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80',
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80',
    ],
    gradient: ['#0d47a1', '#1565c0'],
  },
  'Food / Restaurant': {
    layout: 'food_fever',
    primary: '#e53935', secondary: '#fce4e4', dark: '#3e0000',
    accent: '#ffcc02', emoji: '🍽️', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
    ],
    gradient: ['#e53935', '#bf360c'],
  },
  'Retail / Shop': {
    layout: 'sale_blast',
    primary: '#f57c00', secondary: '#fff8e1', dark: '#3e2000',
    accent: '#ffea00', emoji: '🛍️', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80',
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80',
      'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&q=80',
    ],
    gradient: ['#f57c00', '#e65100'],
  },
  'Technology': {
    layout: 'tech_neon',
    primary: '#3d5afe', secondary: '#e8eaf6', dark: '#000051',
    accent: '#00e5ff', emoji: '💻', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80',
      'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600&q=80',
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&q=80',
    ],
    gradient: ['#1a237e', '#3d5afe'],
  },
  'Education': {
    layout: 'edu_bright',
    primary: '#00897b', secondary: '#e0f2f1', dark: '#00251a',
    accent: '#69f0ae', emoji: '📚', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&q=80',
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80',
      'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&q=80',
    ],
    gradient: ['#00695c', '#00897b'],
  },
  'Healthcare': {
    layout: 'health_trust',
    primary: '#0288d1', secondary: '#e1f5fe', dark: '#01579b',
    accent: '#80d8ff', emoji: '🏥', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=600&q=80',
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80',
      'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&q=80',
    ],
    gradient: ['#01579b', '#0288d1'],
  },
  'Automobile': {
    layout: 'auto_speed',
    primary: '#c62828', secondary: '#ffebee', dark: '#1a0000',
    accent: '#ff5252', emoji: '🚗', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=80',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80',
      'https://images.unsplash.com/photo-1542362567-b07e54358753?w=600&q=80',
    ],
    gradient: ['#1a0000', '#c62828'],
  },
  'Finance': {
    layout: 'finance_elite',
    primary: '#2e7d32', secondary: '#e8f5e9', dark: '#1b5e20',
    accent: '#69f0ae', emoji: '💰', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80',
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80',
      'https://images.unsplash.com/photo-1579621970588-a35d0e7ab9b6?w=600&q=80',
    ],
    gradient: ['#1b5e20', '#2e7d32'],
  },
  'Gym / Fitness': {
    layout: 'fitness_fire',
    primary: '#e64a19', secondary: '#fbe9e7', dark: '#1a0800',
    accent: '#ffab40', emoji: '💪', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
    ],
    gradient: ['#1a0800', '#e64a19'],
  },
  'Hotel / Travel': {
    layout: 'travel_luxe',
    primary: '#00838f', secondary: '#e0f7fa', dark: '#006064',
    accent: '#80deea', emoji: '🏨', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80',
      'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80',
    ],
    gradient: ['#006064', '#00838f'],
  },
  'Clothing / Fashion': {
    layout: 'fashion_edge',
    primary: '#6a1b9a', secondary: '#f3e5f5', dark: '#1a0030',
    accent: '#ea80fc', emoji: '👗', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&q=80',
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80',
      'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&q=80',
    ],
    gradient: ['#1a0030', '#6a1b9a'],
  },
  'Jewellery': {
    layout: 'jewel_glow',
    primary: '#ff8f00', secondary: '#fff8e1', dark: '#1a0d00',
    accent: '#ffe57f', emoji: '💎', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600&q=80',
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=80',
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&q=80',
    ],
    gradient: ['#1a0d00', '#ff8f00'],
  },
  'Electronics': {
    layout: 'tech_neon',
    primary: '#283593', secondary: '#e8eaf6', dark: '#0d0d3b',
    accent: '#40c4ff', emoji: '📱', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&q=80',
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&q=80',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80',
    ],
    gradient: ['#0d0d3b', '#283593'],
  },
  'Catering': {
    layout: 'food_fever',
    primary: '#ad1457', secondary: '#fce4ec', dark: '#3e0020',
    accent: '#ff80ab', emoji: '🍱', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1555244162-803834f70033?w=600&q=80',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
      'https://images.unsplash.com/photo-1530554764233-e79e16c91d08?w=600&q=80',
    ],
    gradient: ['#3e0020', '#ad1457'],
  },
  'Event Management': {
    layout: 'event_pop',
    primary: '#7b1fa2', secondary: '#f3e5f5', dark: '#1a003a',
    accent: '#ea80fc', emoji: '🎉', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80',
      'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80',
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80',
    ],
    gradient: ['#1a003a', '#7b1fa2'],
  },
  'Photography': {
    layout: 'photo_art',
    primary: '#212121', secondary: '#f5f5f5', dark: '#000000',
    accent: '#ffcc00', emoji: '📸', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=600&q=80',
      'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?w=600&q=80',
      'https://images.unsplash.com/photo-1471341971476-ae15ff5dd4ea?w=600&q=80',
    ],
    gradient: ['#000000', '#424242'],
  },
  'Plumber / Electrician': {
    layout: 'service_bold',
    primary: '#00695c', secondary: '#e0f2f1', dark: '#00251a',
    accent: '#1de9b6', emoji: '🔧', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
      'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=600&q=80',
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&q=80',
    ],
    gradient: ['#00251a', '#00695c'],
  },
  'Pest Control': {
    layout: 'service_bold',
    primary: '#558b2f', secondary: '#f1f8e9', dark: '#1b5e20',
    accent: '#ccff90', emoji: '🐛', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
      'https://images.unsplash.com/photo-1592417817038-d13fd7342585?w=600&q=80',
      'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&q=80',
    ],
    gradient: ['#1b5e20', '#558b2f'],
  },
  'Pharmacy': {
    layout: 'health_trust',
    primary: '#01579b', secondary: '#e1f5fe', dark: '#002f6c',
    accent: '#4fc3f7', emoji: '💊', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600&q=80',
      'https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=600&q=80',
      'https://images.unsplash.com/photo-1563213126-a4273aed2016?w=600&q=80',
    ],
    gradient: ['#002f6c', '#01579b'],
  },
  'Bakery / Sweets': {
    layout: 'sweet_spot',
    primary: '#e65100', secondary: '#fff3e0', dark: '#3e1000',
    accent: '#ffd740', emoji: '🎂', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80',
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80',
      'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=600&q=80',
    ],
    gradient: ['#3e1000', '#e65100'],
  },
  'Agriculture / Farm': {
    layout: 'agri_fresh',
    primary: '#33691e', secondary: '#f1f8e9', dark: '#1a3500',
    accent: '#b2ff59', emoji: '🌾', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&q=80',
      'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=600&q=80',
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
    ],
    gradient: ['#1a3500', '#33691e'],
  },
  'Yoga / Wellness': {
    layout: 'wellness_zen',
    primary: '#6d4c41', secondary: '#efebe9', dark: '#3e2723',
    accent: '#ffcc80', emoji: '🧘', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80',
      'https://images.unsplash.com/photo-1545389336-cf090694435e?w=600&q=80',
      'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=600&q=80',
    ],
    gradient: ['#3e2723', '#6d4c41'],
  },
  'Legal / Lawyer': {
    layout: 'law_prestige',
    primary: '#37474f', secondary: '#eceff1', dark: '#102027',
    accent: '#90a4ae', emoji: '⚖️', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80',
      'https://images.unsplash.com/photo-1575505586569-646b2ca898fc?w=600&q=80',
      'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=600&q=80',
    ],
    gradient: ['#102027', '#37474f'],
  },
  'Printing / Stationery': {
    layout: 'creative_burst',
    primary: '#00897b', secondary: '#e0f2f1', dark: '#004d40',
    accent: '#64ffda', emoji: '🖨️', textLight: true,
    images: [
      'https://images.unsplash.com/photo-1502700807168-484a3e7889d0?w=600&q=80',
      'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=600&q=80',
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&q=80',
    ],
    gradient: ['#004d40', '#00897b'],
  },
};

const DEFAULT_PALETTE = {
  layout: 'bold_splash', primary: '#e53935', secondary: '#fff5f5',
  dark: '#1a0000', accent: '#ffeb3b', emoji: '⚡', textLight: true,
  images: [
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80',
    'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&q=80',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80',
  ],
  gradient: ['#1a0000', '#e53935'],
};

function getPalette(category) {
  if (!category) return DEFAULT_PALETTE;
  for (const key of Object.keys(CAT_PALETTES)) {
    const parts = key.toLowerCase().split(/[\/,&]/);
    for (const part of parts) {
      if (category.toLowerCase().includes(part.trim())) {
        return CAT_PALETTES[key];
      }
    }
  }
  const fallbacks = Object.values(CAT_PALETTES);
  const idx = category.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % fallbacks.length;
  return fallbacks[idx];
}

function getImageForPromo(promo, palette) {
  const imgs = palette.images || DEFAULT_PALETTE.images;
  const hash = (promo.bizName || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return imgs[hash % imgs.length];
}

// ─── LAYOUT 1: GLAM MAGAZINE ─────────────────────────────────────────────────
// Split layout: strong image right, solid branded left panel — professional ad style
function LayoutGlamMagazine({ promo, palette, onCall }) {
  const imageUri = getImageForPromo(promo, palette);
  return (
    <TouchableOpacity activeOpacity={0.93} onPress={onCall} style={[l1.card, { backgroundColor: palette.dark }]}>
      {/* Right: image with fade */}
      <View style={l1.imagePanel}>
        <Image source={{ uri: imageUri }} style={l1.image} />
        <LinearGradient
          colors={[palette.dark, palette.dark + 'aa', 'transparent']}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={l1.imageFade}
        />
      </View>

      {/* Left: content panel */}
      <View style={l1.contentPanel}>
        {/* Category pill */}
        <View style={[l1.catPill, { backgroundColor: palette.primary }]}>
          <Text style={l1.catPillTxt}>{palette.emoji}  {promo.category?.toUpperCase()}</Text>
        </View>

        {/* Business name */}
        <Text style={l1.biz} numberOfLines={1}>{promo.bizName}</Text>

        {/* Tagline / offer */}
        <View style={[l1.offerBox, { borderLeftColor: palette.accent, borderLeftWidth: 3 }]}>
          <Text style={[l1.tagline, { color: palette.accent }]} numberOfLines={2}>
            {promo.tagline || 'Exclusive Offer For You!'}
          </Text>
        </View>

        {/* Location */}
        <View style={l1.locRow}>
          <Ionicons name="location-sharp" size={11} color="rgba(255,255,255,0.5)" />
          <Text style={l1.locTxt}>{promo.location}</Text>
        </View>

        {/* CTA */}
        <TouchableOpacity style={[l1.cta, { backgroundColor: palette.primary }]} onPress={onCall}>
          <Ionicons name="call" size={14} color="#fff" />
          <Text style={l1.ctaTxt}>CALL NOW</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
const l1 = StyleSheet.create({
  card:        { borderRadius: 18, overflow: 'hidden', height: 210, flexDirection: 'row', elevation: 10, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 7 } },
  imagePanel:  { position: 'absolute', top: 0, right: 0, bottom: 0, width: '55%' },
  image:       { flex: 1, resizeMode: 'cover' },
  imageFade:   { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 },
  contentPanel:{ flex: 1, paddingHorizontal: 18, paddingVertical: 18, justifyContent: 'center', gap: 10, zIndex: 2 },
  catPill:     { alignSelf: 'flex-start', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 },
  catPillTxt:  { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 1.2 },
  biz:         { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5, lineHeight: 27 },
  offerBox:    { paddingLeft: 8 },
  tagline:     { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  locRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locTxt:      { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
  cta:         { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  ctaTxt:      { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
});

// ─── LAYOUT 2: LUXURY PROPERTY ───────────────────────────────────────────────
// Split: left glass card + right image
function LayoutLuxuryProperty({ promo, palette, onCall }) {
  const imageUri = getImageForPromo(promo, palette);
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onCall} style={[l2.card, { backgroundColor: palette.dark }]}>
      {/* Left content */}
      <View style={l2.left}>
        <View style={[l2.tag, { backgroundColor: palette.primary + '30', borderColor: palette.primary + '60' }]}>
          <Text style={[l2.tagTxt, { color: palette.accent }]}>{palette.emoji} PREMIUM</Text>
        </View>
        <Text style={l2.biz} numberOfLines={2}>{promo.bizName}</Text>
        <Text style={[l2.tagline, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={2}>
          {promo.tagline || 'Your Dream Awaits'}
        </Text>
        <View style={l2.locRow}>
          <Ionicons name="location" size={10} color={palette.accent} />
          <Text style={[l2.locTxt, { color: palette.accent }]}>{promo.location}</Text>
        </View>
        <TouchableOpacity style={[l2.cta, { borderColor: palette.primary }]} onPress={onCall}>
          <Ionicons name="call" size={12} color={palette.primary} />
          <Text style={[l2.ctaTxt, { color: palette.primary }]}>ENQUIRE NOW</Text>
        </TouchableOpacity>
      </View>

      {/* Right image */}
      <View style={l2.right}>
        <Image source={{ uri: imageUri }} style={l2.img} />
        <LinearGradient colors={[palette.dark, 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={l2.imgFade} />
        <View style={[l2.priceBadge, { backgroundColor: palette.primary }]}>
          <Text style={l2.priceTxt}>🔥 HOT</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
const l2 = StyleSheet.create({
  card:      { borderRadius: 20, overflow: 'hidden', flexDirection: 'row', minHeight: 170, elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  left:      { flex: 1.1, padding: 16, gap: 7, justifyContent: 'center', zIndex: 2 },
  right:     { flex: 0.9, position: 'relative' },
  img:       { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, resizeMode: 'cover' },
  imgFade:   { position: 'absolute', top: 0, left: 0, bottom: 0, width: '60%' },
  tag:       { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
  tagTxt:    { fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  biz:       { fontSize: 21, fontWeight: '900', color: '#fff', letterSpacing: -0.4, lineHeight: 25 },
  tagline:   { fontSize: 11, fontWeight: '600', lineHeight: 15 },
  locRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locTxt:    { fontSize: 10, fontWeight: '600' },
  cta:       { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 25, paddingVertical: 7, paddingHorizontal: 14 },
  ctaTxt:    { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  priceBadge:{ position: 'absolute', top: 14, right: 10, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  priceTxt:  { fontSize: 10, fontWeight: '900', color: '#fff' },
});

// ─── LAYOUT 3: FOOD FEVER ─────────────────────────────────────────────────────
// Full-bleed image with a strong gradient + bold content overlay
function LayoutFoodFever({ promo, palette, onCall }) {
  const imageUri = getImageForPromo(promo, palette);
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onCall} style={l3.card}>
      <ImageBackground source={{ uri: imageUri }} style={l3.bg} imageStyle={{ resizeMode: 'cover' }}>
        {/* Strong gradient so text is always readable */}
        <LinearGradient
          colors={[palette.dark + 'f5', palette.dark + 'cc', 'transparent']}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={l3.grad}
        >
          <View style={l3.content}>
            <View style={[l3.catBadge, { backgroundColor: palette.accent }]}>
              <Text style={[l3.catTxt, { color: palette.dark }]}>{palette.emoji}  {promo.category}</Text>
            </View>
            <Text style={l3.biz} numberOfLines={1}>{promo.bizName}</Text>
            <Text style={l3.tagline} numberOfLines={2}>{promo.tagline || 'Order Now & Enjoy!'}</Text>

            <View style={l3.bottom}>
              <TouchableOpacity style={[l3.cta, { backgroundColor: palette.primary }]} onPress={onCall}>
                <Ionicons name="call" size={13} color="#fff" />
                <Text style={l3.ctaTxt}>CALL NOW</Text>
              </TouchableOpacity>
              <View style={l3.locRow}>
                <Ionicons name="location" size={10} color="rgba(255,255,255,0.5)" />
                <Text style={l3.phoneTxt}>{promo.location}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
}
const l3 = StyleSheet.create({
  card:      { borderRadius: 18, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  bg:        { minHeight: 185 },
  grad:      { flex: 1, padding: 0 },
  content:   { flex: 1, padding: 18, gap: 9, zIndex: 2, maxWidth: '65%' },
  catBadge:  { alignSelf: 'flex-start', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 },
  catTxt:    { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  biz:       { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  tagline:   { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)', lineHeight: 18 },
  bottom:    { gap: 8, marginTop: 2 },
  locRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cta:       { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  ctaTxt:    { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  phoneTxt:  { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
});

// ─── LAYOUT 4: SALE BLAST ─────────────────────────────────────────────────────
// Strong retail layout — image backdrop with a bold left content zone
function LayoutSaleBlast({ promo, palette, onCall }) {
  const imageUri = getImageForPromo(promo, palette);
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onCall} style={l4.card}>
      <ImageBackground source={{ uri: imageUri }} style={l4.bg} imageStyle={{ resizeMode: 'cover' }}>
        {/* Stronger two-stop gradient: solid dark left, fading right */}
        <LinearGradient
          colors={[palette.dark + 'f8', palette.dark + 'cc', 'transparent']}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={l4.grad}
        >
          {/* Fire badge top-right */}
          <View style={[l4.burst, { backgroundColor: palette.accent }]}>
            <Text style={[l4.burstLine1]}>🔥</Text>
            <Text style={[l4.burstLine2, { color: palette.dark }]}>SALE</Text>
          </View>

          <View style={l4.content}>
            <Text style={l4.cat}>{promo.category?.toUpperCase()}</Text>
            <Text style={l4.biz} numberOfLines={1}>{promo.bizName}</Text>
            <View style={[l4.tagBox, { borderLeftColor: palette.accent, borderLeftWidth: 3 }]}>
              <Text style={l4.tagline} numberOfLines={2}>{promo.tagline || 'Best Deals in Town!'}</Text>
            </View>
            <View style={l4.row}>
              <TouchableOpacity style={[l4.cta, { backgroundColor: palette.primary }]} onPress={onCall}>
                <Ionicons name="call" size={13} color="#fff" />
                <Text style={l4.ctaTxt}>CALL NOW</Text>
              </TouchableOpacity>
              <View style={l4.loc}>
                <Ionicons name="location" size={10} color="rgba(255,255,255,0.5)" />
                <Text style={l4.locTxt}>{promo.location}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
}
const l4 = StyleSheet.create({
  card:    { borderRadius: 18, overflow: 'hidden', height: 190, elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  bg:      { flex: 1 },
  grad:    { flex: 1, paddingHorizontal: 18, paddingVertical: 18 },
  burst:   { position: 'absolute', top: 16, right: 16, width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', zIndex: 3, transform: [{ rotate: '12deg' }] },
  burstLine1:{ fontSize: 18 },
  burstLine2:{ fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  content: { flex: 1, justifyContent: 'flex-end', gap: 7, maxWidth: '65%' },
  cat:     { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.55)', letterSpacing: 1.8 },
  biz:     { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.6 },
  tagBox:  { paddingLeft: 8 },
  tagline: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)', lineHeight: 17 },
  row:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  cta:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
  ctaTxt:  { fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 0.8 },
  loc:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locTxt:  { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
});

// ─── LAYOUT 5: TECH NEON ─────────────────────────────────────────────────────
// Dark glassmorphism with neon glow border + image
function LayoutTechNeon({ promo, palette, onCall }) {
  const imageUri = getImageForPromo(promo, palette);
  const glowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: false }),
      Animated.timing(glowAnim, { toValue: 0, duration: 1800, useNativeDriver: false }),
    ])).start();
  }, []);
  const borderColor = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [palette.primary + '60', palette.accent] });

  return (
    <Animated.View style={[l5.outerCard, { borderColor }]}>
      <TouchableOpacity activeOpacity={0.92} onPress={onCall} style={[l5.card, { backgroundColor: palette.dark }]}>
        {/* Grid lines background */}
        <View style={l5.grid} pointerEvents="none">
          {[0,1,2,3].map(i => <View key={i} style={[l5.gridLine, { top: i * 42 + 10 }]} />)}
          {[0,1,2].map(i => <View key={i} style={[l5.gridLineV, { left: i * 80 + 40 }]} />)}
        </View>

        {/* Image right */}
        <View style={l5.imgWrap}>
          <Image source={{ uri: imageUri }} style={l5.img} />
          <LinearGradient colors={[palette.dark, 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={l5.imgFade} />
        </View>

        <View style={l5.content}>
          <View style={[l5.badge, { borderColor: palette.accent + '80', backgroundColor: palette.accent + '15' }]}>
            <View style={[l5.dot, { backgroundColor: palette.accent }]} />
            <Text style={[l5.badgeTxt, { color: palette.accent }]}>{palette.emoji} {promo.category}</Text>
          </View>
          <Text style={l5.biz} numberOfLines={1}>{promo.bizName}</Text>
          <Text style={[l5.tagline, { color: palette.accent + 'cc' }]} numberOfLines={2}>
            {promo.tagline || 'Next-Gen Solutions'}
          </Text>
          <View style={l5.locRow}>
            <Ionicons name="location" size={10} color={palette.accent + '80'} />
            <Text style={[l5.locTxt, { color: palette.accent + '80' }]}>{promo.location}</Text>
          </View>
          <TouchableOpacity style={[l5.cta, { backgroundColor: palette.primary, shadowColor: palette.primary }]} onPress={onCall}>
            <Ionicons name="call" size={12} color="#fff" />
            <Text style={l5.ctaTxt}>CONNECT</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const l5 = StyleSheet.create({
  outerCard: { borderRadius: 20, borderWidth: 1.5, elevation: 10, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  card:      { borderRadius: 18, overflow: 'hidden', flexDirection: 'row', minHeight: 168 },
  grid:      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  gridLine:  { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  imgWrap:   { position: 'absolute', right: 0, top: 0, bottom: 0, width: '48%' },
  img:       { flex: 1, resizeMode: 'cover' },
  imgFade:   { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 },
  content:   { flex: 1, padding: 16, gap: 7, zIndex: 2 },
  badge:     { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
  dot:       { width: 5, height: 5, borderRadius: 3 },
  badgeTxt:  { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  biz:       { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.4 },
  tagline:   { fontSize: 11, fontWeight: '600', lineHeight: 16 },
  locRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locTxt:    { fontSize: 10 },
  cta:       { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 25, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  ctaTxt:    { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
});

// ─── LAYOUT 6: EDU BRIGHT ─────────────────────────────────────────────────────
// Clean white card with image header strip + colorful accents
function LayoutEduBright({ promo, palette, onCall }) {
  const imageUri = getImageForPromo(promo, palette);
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onCall} style={l6.card}>
      {/* Header image */}
      <View style={l6.header}>
        <Image source={{ uri: imageUri }} style={l6.headerImg} />
        <LinearGradient colors={['transparent', palette.primary + 'dd']} style={l6.headerOverlay}>
          <Text style={l6.headerCat}>{palette.emoji} {promo.category?.toUpperCase()}</Text>
        </LinearGradient>
      </View>

      {/* Body */}
      <View style={l6.body}>
        <Text style={[l6.biz, { color: palette.dark }]} numberOfLines={1}>{promo.bizName}</Text>
        <Text style={l6.tagline} numberOfLines={2}>{promo.tagline || 'Enroll Today!'}</Text>
        <View style={l6.footer}>
          <View style={l6.locRow}>
            <Ionicons name="location" size={11} color={palette.primary} />
            <Text style={l6.locTxt}>{promo.location}</Text>
          </View>
          <TouchableOpacity style={[l6.cta, { backgroundColor: palette.primary }]} onPress={onCall}>
            <Ionicons name="call" size={12} color="#fff" />
            <Text style={l6.ctaTxt}>CALL</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={[l6.sideBar, { backgroundColor: palette.primary }]} />
    </TouchableOpacity>
  );
}
const l6 = StyleSheet.create({
  card:        { borderRadius: 20, overflow: 'hidden', backgroundColor: '#fff', elevation: 6, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  header:      { height: 100, overflow: 'hidden' },
  headerImg:   { width: '100%', height: '100%', resizeMode: 'cover' },
  headerOverlay:{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, justifyContent: 'flex-end', paddingHorizontal: 14, paddingBottom: 8 },
  headerCat:   { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  body:        { padding: 14, gap: 8 },
  biz:         { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  tagline:     { fontSize: 13, color: '#555', lineHeight: 18, fontWeight: '500' },
  footer:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  locRow:      { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locTxt:      { fontSize: 11, color: '#888' },
  cta:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 25 },
  ctaTxt:      { color: '#fff', fontSize: 11, fontWeight: '900' },
  sideBar:     { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
});

// ─── LAYOUT 7: HEALTH TRUST ───────────────────────────────────────────────────
// Clean medical layout with image + blue trust indicators
function LayoutHealthTrust({ promo, palette, onCall }) {
  const imageUri = getImageForPromo(promo, palette);
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onCall} style={[l7.card, { backgroundColor: '#f8fdff' }]}>
      <View style={l7.top}>
        {/* Image circle */}
        <View style={[l7.imgCircle, { borderColor: palette.primary }]}>
          <Image source={{ uri: imageUri }} style={l7.img} />
        </View>
        {/* Info */}
        <View style={l7.info}>
          <View style={[l7.catBadge, { backgroundColor: palette.primary + '15' }]}>
            <Text style={[l7.catTxt, { color: palette.primary }]}>{palette.emoji} {promo.category}</Text>
          </View>
          <Text style={[l7.biz, { color: palette.dark }]} numberOfLines={1}>{promo.bizName}</Text>
          <View style={l7.locRow}>
            <Ionicons name="location" size={10} color={palette.primary} />
            <Text style={l7.locTxt}>{promo.location}</Text>
          </View>
        </View>
        <View style={[l7.trustBadge, { backgroundColor: palette.primary }]}>
          <Ionicons name="shield-checkmark" size={16} color="#fff" />
          <Text style={l7.trustTxt}>TRUSTED</Text>
        </View>
      </View>

      <View style={[l7.divider, { backgroundColor: palette.primary + '20' }]} />

      <View style={l7.bottom}>
        <Text style={l7.tagline} numberOfLines={2}>{promo.tagline || 'Your Health, Our Priority'}</Text>
        <TouchableOpacity style={[l7.cta, { backgroundColor: palette.primary }]} onPress={onCall}>
          <Ionicons name="call" size={13} color="#fff" />
          <Text style={l7.ctaTxt}>BOOK APPOINTMENT</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
const l7 = StyleSheet.create({
  card:      { borderRadius: 20, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  top:       { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  imgCircle: { width: 70, height: 70, borderRadius: 35, borderWidth: 2.5, overflow: 'hidden' },
  img:       { width: '100%', height: '100%', resizeMode: 'cover' },
  info:      { flex: 1, gap: 4 },
  catBadge:  { alignSelf: 'flex-start', borderRadius: 12, paddingVertical: 3, paddingHorizontal: 9 },
  catTxt:    { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  biz:       { fontSize: 17, fontWeight: '900', letterSpacing: -0.2 },
  locRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locTxt:    { fontSize: 10, color: '#888' },
  trustBadge:{ alignItems: 'center', gap: 2, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12 },
  trustTxt:  { color: '#fff', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  divider:   { height: 1, marginHorizontal: 14 },
  bottom:    { padding: 14, gap: 10 },
  tagline:   { fontSize: 13, color: '#444', lineHeight: 18, fontWeight: '600' },
  cta:       { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 25 },
  ctaTxt:    { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.4 },
});

// ─── LAYOUT 8: AUTO SPEED ─────────────────────────────────────────────────────
// Full-bleed dark with image + speed lines + angled badge
function LayoutAutoSpeed({ promo, palette, onCall }) {
  const imageUri = getImageForPromo(promo, palette);
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onCall} style={l8.card}>
      <ImageBackground source={{ uri: imageUri }} style={l8.bg} imageStyle={{ resizeMode: 'cover' }}>
        <LinearGradient colors={['rgba(0,0,0,0.1)', palette.dark + 'f0']} style={l8.overlay}>
          {/* Speed lines */}
          <View style={l8.lines} pointerEvents="none">
            {[0,1,2].map(i => (
              <View key={i} style={[l8.line, { top: 40 + i * 18, width: 60 + i * 30 }]} />
            ))}
          </View>

          {/* Angled top badge */}
          <View style={[l8.topBadge, { backgroundColor: palette.primary }]}>
            <Text style={l8.topBadgeTxt}>{palette.emoji} {promo.category}</Text>
          </View>

          <View style={l8.content}>
            <Text style={l8.biz} numberOfLines={1}>{promo.bizName}</Text>
            <View style={[l8.offerTag, { backgroundColor: palette.accent }]}>
              <Text style={[l8.offerTxt, { color: palette.dark }]}>
                {promo.tagline || 'Drive Your Dream'}
              </Text>
            </View>
            <View style={l8.footer}>
              <View style={l8.loc}>
                <Ionicons name="location" size={10} color="rgba(255,255,255,0.6)" />
                <Text style={l8.locTxt}>{promo.location}</Text>
              </View>
              <TouchableOpacity style={[l8.cta, { backgroundColor: palette.primary }]} onPress={onCall}>
                <Ionicons name="call" size={12} color="#fff" />
                <Text style={l8.ctaTxt}>CALL NOW</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
}
const l8 = StyleSheet.create({
  card:      { borderRadius: 20, overflow: 'hidden', height: 185, elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  bg:        { flex: 1 },
  overlay:   { flex: 1 },
  lines:     { position: 'absolute', left: 14, top: 0 },
  line:      { height: 2, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 1, marginBottom: 2 },
  topBadge:  { position: 'absolute', top: 14, right: -8, paddingVertical: 5, paddingHorizontal: 18, transform: [{ rotate: '3deg' }] },
  topBadgeTxt:{ fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  content:   { flex: 1, justifyContent: 'flex-end', padding: 16, gap: 8 },
  biz:       { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.8, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  offerTag:  { alignSelf: 'flex-start', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 12 },
  offerTxt:  { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  footer:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  loc:       { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locTxt:    { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  cta:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 25 },
  ctaTxt:    { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
});

// ─── LAYOUT 9: FINANCE ELITE ─────────────────────────────────────────────────
// Dark prestige layout with gold accents + image strip
function LayoutFinanceElite({ promo, palette, onCall }) {
  const imageUri = getImageForPromo(promo, palette);
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onCall} style={[l9.card, { backgroundColor: palette.dark }]}>
      {/* Top image strip */}
      <View style={l9.imgStrip}>
        <Image source={{ uri: imageUri }} style={l9.img} />
        <LinearGradient colors={['transparent', palette.dark]} style={l9.imgFade} />
      </View>

      <View style={l9.content}>
        <View style={l9.topRow}>
          <View style={[l9.catPill, { borderColor: palette.accent + '60' }]}>
            <Text style={[l9.catTxt, { color: palette.accent }]}>{palette.emoji} {promo.category}</Text>
          </View>
          <View style={[l9.verifiedBadge, { backgroundColor: palette.accent + '20' }]}>
            <Ionicons name="checkmark-circle" size={12} color={palette.accent} />
            <Text style={[l9.verifiedTxt, { color: palette.accent }]}>VERIFIED</Text>
          </View>
        </View>
        <Text style={l9.biz} numberOfLines={1}>{promo.bizName}</Text>
        <Text style={[l9.tagline, { color: 'rgba(255,255,255,0.65)' }]} numberOfLines={2}>
          {promo.tagline || 'Your Trusted Financial Partner'}
        </Text>
        <View style={[l9.divider, { backgroundColor: palette.accent + '30' }]} />
        <View style={l9.footer}>
          <View>
            <View style={l9.locRow}>
              <Ionicons name="location" size={10} color={palette.accent + '80'} />
              <Text style={[l9.locTxt, { color: palette.accent + '80' }]}>{promo.location}</Text>
            </View>
            <Text style={[l9.phone, { color: 'rgba(255,255,255,0.3)' }]}>{promo.phone}</Text>
          </View>
          <TouchableOpacity style={[l9.cta, { backgroundColor: palette.primary }]} onPress={onCall}>
            <Ionicons name="call" size={13} color="#fff" />
            <Text style={l9.ctaTxt}>CONSULT FREE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
const l9 = StyleSheet.create({
  card:      { borderRadius: 20, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  imgStrip:  { height: 80, overflow: 'hidden' },
  img:       { width: '100%', height: '100%', resizeMode: 'cover' },
  imgFade:   { position: 'absolute', bottom: 0, left: 0, right: 0, height: 50 },
  content:   { padding: 14, gap: 8 },
  topRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catPill:   { borderWidth: 1, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
  catTxt:    { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  verifiedBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, paddingVertical: 3, paddingHorizontal: 9 },
  verifiedTxt:{ fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  biz:       { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.4 },
  tagline:   { fontSize: 12, fontWeight: '500', lineHeight: 17 },
  divider:   { height: 1 },
  footer:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locTxt:    { fontSize: 10 },
  phone:     { fontSize: 10, marginTop: 2 },
  cta:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 25 },
  ctaTxt:    { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
});

// ─── LAYOUT 10: FITNESS FIRE ──────────────────────────────────────────────────
// High energy with image + diagonal overlay
function LayoutFitnessFire({ promo, palette, onCall }) {
  const imageUri = getImageForPromo(promo, palette);
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onCall} style={l10.card}>
      <ImageBackground source={{ uri: imageUri }} style={l10.bg} imageStyle={{ resizeMode: 'cover' }}>
        {/* Diagonal overlay */}
        <View style={[l10.diagLeft, { backgroundColor: palette.dark + 'e8' }]} />
        <View style={[l10.diagMid, { backgroundColor: palette.primary + '60' }]} />

        <View style={l10.content}>
          <Text style={[l10.emoji, { color: palette.accent }]}>{palette.emoji}</Text>
          <Text style={l10.cat}>{promo.category?.toUpperCase()}</Text>
          <Text style={l10.biz} numberOfLines={1}>{promo.bizName}</Text>
          <Text style={[l10.tagline, { color: palette.accent }]} numberOfLines={2}>
            {promo.tagline || 'Transform Your Body Today!'}
          </Text>
          <TouchableOpacity style={[l10.cta, { backgroundColor: palette.primary }]} onPress={onCall}>
            <Ionicons name="call" size={13} color="#fff" />
            <Text style={l10.ctaTxt}>JOIN NOW</Text>
          </TouchableOpacity>
          <View style={l10.locRow}>
            <Ionicons name="location" size={10} color="rgba(255,255,255,0.5)" />
            <Text style={l10.locTxt}>{promo.location}</Text>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}
const l10 = StyleSheet.create({
  card:     { borderRadius: 20, overflow: 'hidden', height: 195, elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  bg:       { flex: 1 },
  diagLeft: { position: 'absolute', top: 0, left: 0, bottom: 0, width: '65%', transform: [{ skewX: '0deg' }] },
  diagMid:  { position: 'absolute', top: 0, left: '50%', bottom: 0, width: 80, transform: [{ skewX: '-15deg' }] },
  content:  { flex: 1, padding: 18, gap: 5, zIndex: 2 },
  emoji:    { fontSize: 28 },
  cat:      { fontSize: 8, fontWeight: '900', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.8 },
  biz:      { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  tagline:  { fontSize: 12, fontWeight: '700', lineHeight: 17 },
  cta:      { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 25, marginTop: 4 },
  ctaTxt:   { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  locRow:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locTxt:   { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
});

// ─── LAYOUT 11: JEWEL GLOW ───────────────────────────────────────────────────
// Opulent dark gold with image + sparkling effect
function LayoutJewelGlow({ promo, palette, onCall }) {
  const imageUri = getImageForPromo(promo, palette);
  const sparkle = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(sparkle, { toValue: 1, duration: 1200, useNativeDriver: false }),
      Animated.timing(sparkle, { toValue: 0, duration: 1200, useNativeDriver: false }),
    ])).start();
  }, []);
  const bgColor = sparkle.interpolate({ inputRange: [0, 1], outputRange: [palette.dark, '#1a1000'] });

  return (
    <Animated.View style={[l11.card, { backgroundColor: bgColor }]}>
      <TouchableOpacity activeOpacity={0.92} onPress={onCall} style={{ flex: 1 }}>
        {/* Stars */}
        {['★', '✦', '✧', '✩'].map((s, i) => (
          <Text key={i} style={[l11.star, { top: [10,25,40,15][i], right: [130,170,145,110][i], opacity: 0.3 + i * 0.1, fontSize: [10,14,8,12][i] }]}>{s}</Text>
        ))}

        <View style={l11.inner}>
          <View style={l11.left}>
            <Text style={[l11.cat, { color: palette.accent }]}>{palette.emoji} {promo.category}</Text>
            <Text style={l11.biz} numberOfLines={1}>{promo.bizName}</Text>
            <Text style={[l11.tagline, { color: palette.accent + 'cc' }]} numberOfLines={2}>
              {promo.tagline || 'Exquisite Craftsmanship'}
            </Text>
            <View style={l11.locRow}>
              <Ionicons name="location" size={10} color={palette.accent + '80'} />
              <Text style={[l11.locTxt, { color: palette.accent + '80' }]}>{promo.location}</Text>
            </View>
            <TouchableOpacity style={[l11.cta, { borderColor: palette.accent, backgroundColor: palette.accent + '20' }]} onPress={onCall}>
              <Ionicons name="call" size={12} color={palette.accent} />
              <Text style={[l11.ctaTxt, { color: palette.accent }]}>VISIT STORE</Text>
            </TouchableOpacity>
          </View>
          <View style={l11.right}>
            <View style={[l11.imgFrame, { borderColor: palette.accent + '60' }]}>
              <Image source={{ uri: imageUri }} style={l11.img} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const l11 = StyleSheet.create({
  card:      { borderRadius: 20, overflow: 'hidden', minHeight: 160, elevation: 10, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  star:      { position: 'absolute', color: '#ffd700' },
  inner:     { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  left:      { flex: 1, gap: 7 },
  right:     { width: 110 },
  imgFrame:  { width: 100, height: 120, borderRadius: 16, borderWidth: 2, overflow: 'hidden' },
  img:       { width: '100%', height: '100%', resizeMode: 'cover' },
  cat:       { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  biz:       { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
  tagline:   { fontSize: 11, fontWeight: '600', lineHeight: 16 },
  locRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locTxt:    { fontSize: 10 },
  cta:       { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 25, paddingVertical: 7, paddingHorizontal: 14 },
  ctaTxt:    { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
});

// ─── LAYOUT 12: EVENT POP ─────────────────────────────────────────────────────
// Festive confetti-style with image
function LayoutEventPop({ promo, palette, onCall }) {
  const imageUri = getImageForPromo(promo, palette);
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onCall} style={[l12.card, { backgroundColor: palette.secondary }]}>
      {/* Confetti dots */}
      {[...Array(8)].map((_, i) => (
        <View key={i} style={[l12.confetti, {
          backgroundColor: [palette.primary, palette.accent, '#fff', palette.dark][i % 4],
          width: [8,6,10,7,9,6,8,7][i], height: [8,6,10,7,9,6,8,7][i],
          borderRadius: [4,3,5,3.5,4.5,3,4,3.5][i],
          top: [8,20,5,30,15,25,10,35][i], left: [10,30,55,75,100,130,160,185][i],
          transform: [{ rotate: `${i * 25}deg` }],
        }]} />
      ))}

      <View style={l12.inner}>
        <View style={l12.left}>
          <View style={[l12.badge, { backgroundColor: palette.primary }]}>
            <Text style={l12.badgeTxt}>{palette.emoji} EVENT</Text>
          </View>
          <Text style={[l12.biz, { color: palette.dark }]} numberOfLines={1}>{promo.bizName}</Text>
          <Text style={[l12.tagline, { color: '#555' }]} numberOfLines={2}>
            {promo.tagline || 'Make Every Moment Special!'}
          </Text>
          <View style={l12.locRow}>
            <Ionicons name="location" size={10} color={palette.primary} />
            <Text style={l12.locTxt}>{promo.location}</Text>
          </View>
          <TouchableOpacity style={[l12.cta, { backgroundColor: palette.primary }]} onPress={onCall}>
            <Ionicons name="call" size={12} color="#fff" />
            <Text style={l12.ctaTxt}>BOOK EVENT</Text>
          </TouchableOpacity>
        </View>
        <View style={l12.right}>
          <Image source={{ uri: imageUri }} style={l12.img} />
        </View>
      </View>
    </TouchableOpacity>
  );
}
const l12 = StyleSheet.create({
  card:      { borderRadius: 20, overflow: 'hidden', elevation: 6, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  confetti:  { position: 'absolute', opacity: 0.5 },
  inner:     { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14, paddingTop: 40 },
  left:      { flex: 1, gap: 7 },
  right:     { width: 110 },
  img:       { width: 100, height: 110, borderRadius: 16, resizeMode: 'cover' },
  badge:     { alignSelf: 'flex-start', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12 },
  badgeTxt:  { fontSize: 8, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  biz:       { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  tagline:   { fontSize: 12, lineHeight: 17, fontWeight: '500' },
  locRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locTxt:    { fontSize: 10, color: '#888' },
  cta:       { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 25 },
  ctaTxt:    { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
});

// ─── LAYOUT 13: PHOTO ART ────────────────────────────────────────────────────
// Editorial B&W + pop color style
function LayoutPhotoArt({ promo, palette, onCall }) {
  const imageUri = getImageForPromo(promo, palette);
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onCall} style={[l13.card, { backgroundColor: '#0a0a0a' }]}>
      {/* Full image with tint */}
      <Image source={{ uri: imageUri }} style={l13.img} />
      <View style={[l13.tint, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />

      {/* Content */}
      <View style={l13.content}>
        <View style={l13.topRow}>
          <Text style={[l13.cat, { color: palette.accent }]}>{palette.emoji} {promo.category?.toUpperCase()}</Text>
          <View style={[l13.adBadge, { backgroundColor: palette.accent }]}>
            <Text style={[l13.adTxt, { color: palette.dark }]}>AD</Text>
          </View>
        </View>
        <View style={l13.mid}>
          <Text style={l13.biz} numberOfLines={2}>{promo.bizName}</Text>
          <View style={[l13.accentLine, { backgroundColor: palette.accent }]} />
          <Text style={[l13.tagline, { color: 'rgba(255,255,255,0.8)' }]} numberOfLines={2}>
            {promo.tagline || 'Capturing Precious Moments'}
          </Text>
        </View>
        <View style={l13.footer}>
          <View style={l13.locRow}>
            <Ionicons name="location" size={10} color="rgba(255,255,255,0.5)" />
            <Text style={l13.locTxt}>{promo.location}</Text>
          </View>
          <TouchableOpacity style={[l13.cta, { backgroundColor: palette.accent }]} onPress={onCall}>
            <Ionicons name="call" size={12} color={palette.dark} />
            <Text style={[l13.ctaTxt, { color: palette.dark }]}>BOOK SESSION</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
const l13 = StyleSheet.create({
  card:    { borderRadius: 20, overflow: 'hidden', height: 200, elevation: 8, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  img:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, resizeMode: 'cover' },
  tint:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  content: { flex: 1, padding: 16, justifyContent: 'space-between' },
  topRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cat:     { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  adBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  adTxt:   { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  mid:     { gap: 6 },
  biz:     { fontSize: 28, fontWeight: '900', color: '#fff', lineHeight: 30 },
  accentLine:{ height: 3, width: 40, borderRadius: 2 },
  tagline: { fontSize: 12, fontWeight: '500', lineHeight: 17 },
  footer:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locRow:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locTxt:  { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
  cta:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 25 },
  ctaTxt:  { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
});

// ─── LAYOUT 14: SERVICE BOLD ──────────────────────────────────────────────────
// Strong orange/teal service card with image + checkmarks
function LayoutServiceBold({ promo, palette, onCall }) {
  const imageUri = getImageForPromo(promo, palette);
  const features = ['Quick Service', '24/7 Available', 'Best Rates'];
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onCall} style={[l14.card, { backgroundColor: '#fff' }]}>
      {/* Colored top strip */}
      <LinearGradient colors={[palette.primary, palette.dark]} style={l14.topStrip}>
        <View style={l14.stripContent}>
          <Text style={l14.stripCat}>{palette.emoji} {promo.category?.toUpperCase()}</Text>
          <View style={l14.imgCircle}>
            <Image source={{ uri: imageUri }} style={l14.img} />
          </View>
        </View>
      </LinearGradient>

      <View style={l14.body}>
        <Text style={[l14.biz, { color: palette.dark }]} numberOfLines={1}>{promo.bizName}</Text>
        <View style={l14.features}>
          {features.map((f, i) => (
            <View key={i} style={l14.featureRow}>
              <Ionicons name="checkmark-circle" size={13} color={palette.primary} />
              <Text style={l14.featureTxt}>{f}</Text>
            </View>
          ))}
        </View>
        <Text style={l14.tagline} numberOfLines={1}>{promo.tagline || 'Professional & Reliable'}</Text>
        <View style={l14.footer}>
          <View style={l14.locRow}>
            <Ionicons name="location" size={10} color="#aaa" />
            <Text style={l14.locTxt}>{promo.location}</Text>
          </View>
          <TouchableOpacity style={[l14.cta, { backgroundColor: palette.primary }]} onPress={onCall}>
            <Ionicons name="call" size={12} color="#fff" />
            <Text style={l14.ctaTxt}>CALL NOW</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
const l14 = StyleSheet.create({
  card:       { borderRadius: 20, overflow: 'hidden', elevation: 6, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  topStrip:   { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20 },
  stripContent:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stripCat:   { fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  imgCircle:  { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  img:        { width: '100%', height: '100%', resizeMode: 'cover' },
  body:       { padding: 14, paddingTop: 12, gap: 8 },
  biz:        { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  features:   { gap: 3 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureTxt: { fontSize: 11, color: '#555', fontWeight: '500' },
  tagline:    { fontSize: 12, color: '#888', fontWeight: '500' },
  footer:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locRow:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locTxt:     { fontSize: 10, color: '#aaa' },
  cta:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 25 },
  ctaTxt:     { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
});

// ─── LAYOUT 15: BOLD SPLASH (Default / Fallback) ─────────────────────────────
// Clean split: branded left with gradient, image right — works for any category
function LayoutBoldSplash({ promo, palette, onCall }) {
  const imageUri = getImageForPromo(promo, palette);
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onCall} style={[l15.card, { backgroundColor: palette.dark }]}>
      {/* Decorative circles for depth */}
      <View style={[l15.circle1, { borderColor: 'rgba(255,255,255,0.06)' }]} />
      <View style={[l15.circle2, { borderColor: 'rgba(255,255,255,0.04)' }]} />

      {/* Image panel — right half */}
      <View style={l15.imgWrap}>
        <Image source={{ uri: imageUri }} style={l15.img} />
        <LinearGradient
          colors={[palette.dark, palette.dark + 'bb', 'transparent']}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={l15.imgFade}
        />
      </View>

      {/* Content — left panel */}
      <View style={l15.content}>
        <View style={[l15.catBadge, { backgroundColor: palette.primary }]}>
          <Text style={l15.catTxt}>{palette.emoji}  {promo.category?.toUpperCase()}</Text>
        </View>
        <Text style={l15.biz} numberOfLines={1}>{promo.bizName}</Text>
        <View style={[l15.accentBar, { backgroundColor: palette.accent }]} />
        <Text style={[l15.tagline, { color: 'rgba(255,255,255,0.75)' }]} numberOfLines={2}>
          {promo.tagline || 'Exclusive Offer Just For You!'}
        </Text>
        <View style={l15.footer}>
          <View style={l15.locRow}>
            <Ionicons name="location" size={10} color="rgba(255,255,255,0.4)" />
            <Text style={l15.locTxt}>{promo.location}</Text>
          </View>
          <TouchableOpacity style={[l15.cta, { backgroundColor: palette.primary }]} onPress={onCall}>
            <Ionicons name="call" size={13} color="#fff" />
            <Text style={l15.ctaTxt}>CALL</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
const l15 = StyleSheet.create({
  card:      { borderRadius: 18, overflow: 'hidden', minHeight: 185, elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  circle1:   { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 35, top: -80, right: -50 },
  circle2:   { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 25, bottom: -50, left: -30 },
  imgWrap:   { position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%' },
  img:       { flex: 1, resizeMode: 'cover' },
  imgFade:   { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 },
  content:   { padding: 18, gap: 9, zIndex: 2, maxWidth: '60%', justifyContent: 'center', minHeight: 185 },
  catBadge:  { alignSelf: 'flex-start', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 },
  catTxt:    { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 1.2 },
  biz:       { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5, lineHeight: 27 },
  accentBar: { height: 3, width: 32, borderRadius: 2 },
  tagline:   { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  footer:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingRight: 8 },
  locRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locTxt:    { fontSize: 10, color: 'rgba(255,255,255,0.4)' },
  cta:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 10 },
  ctaTxt:    { fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 0.8 },
});

// ─── Layout routing ───────────────────────────────────────────────────────────
const LAYOUT_MAP = {
  glam_magazine:   LayoutGlamMagazine,
  luxury_property: LayoutLuxuryProperty,
  food_fever:      LayoutFoodFever,
  sale_blast:      LayoutSaleBlast,
  tech_neon:       LayoutTechNeon,
  edu_bright:      LayoutEduBright,
  health_trust:    LayoutHealthTrust,
  auto_speed:      LayoutAutoSpeed,
  finance_elite:   LayoutFinanceElite,
  fitness_fire:    LayoutFitnessFire,
  jewel_glow:      LayoutJewelGlow,
  event_pop:       LayoutEventPop,
  photo_art:       LayoutPhotoArt,
  service_bold:    LayoutServiceBold,
  wellness_zen:    LayoutBoldSplash,
  law_prestige:    LayoutFinanceElite,
  agri_fresh:      LayoutFoodFever,
  sweet_spot:      LayoutSaleBlast,
  creative_burst:  LayoutTechNeon,
  fashion_edge:    LayoutGlamMagazine,
  travel_luxe:     LayoutLuxuryProperty,
  bold_splash:     LayoutBoldSplash,
};

function pickLayout(promo, palette) {
  // Use the palette-defined layout
  if (palette.layout && LAYOUT_MAP[palette.layout]) return LAYOUT_MAP[palette.layout];
  // Hash fallback for variety
  const allLayouts = Object.values(LAYOUT_MAP);
  const hash = (promo.bizName || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return allLayouts[hash % allLayouts.length];
}

// ─── Public BannerCard export ─────────────────────────────────────────────────
export function BannerCard({ promo, onCall }) {
  const palette = getPalette(promo.category);
  const Layout  = pickLayout(promo, palette);
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
    const id = setInterval(() => setCurrent(prev => (prev + 1) % promos.length), 5500);
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
