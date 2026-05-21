/**
 * PromoBanner.js — Production-level promotional banner
 *
 * Features:
 * - 8 distinct banner layouts (no two look the same)
 * - Category-aware design (Salon, Real Estate, Food, Tech, Retail, etc.)
 * - Geometric shapes, gradients-via-layering, bold typography
 * - Used standalone OR as an inline feed item via <PromoBanner promo={promo} inline />
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, Linking, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { http } from '../utils/api';

const IS_WEB = Platform.OS === 'web';

// ─── Category → design palette mapping ────────────────────────────────────────
const CAT_PALETTES = {
  'Salon / Beauty':   { layout: 'glam',    primary: '#c026d3', secondary: '#f5d0fe', dark: '#4a044e', emoji: '✂️' },
  'Real Estate':      { layout: 'property',primary: '#0369a1', secondary: '#e0f2fe', dark: '#082f49', emoji: '🏠' },
  'Food / Restaurant':{ layout: 'food',    primary: '#dc2626', secondary: '#fef2f2', dark: '#450a0a', emoji: '🍽️' },
  'Retail / Shop':    { layout: 'retail',  primary: '#d97706', secondary: '#fef3c7', dark: '#451a03', emoji: '🛍️' },
  'Technology':       { layout: 'tech',    primary: '#4f46e5', secondary: '#ede9fe', dark: '#1e1b4b', emoji: '💻' },
  'Education':        { layout: 'edu',     primary: '#059669', secondary: '#d1fae5', dark: '#022c22', emoji: '📚' },
  'Healthcare':       { layout: 'health',  primary: '#0891b2', secondary: '#cffafe', dark: '#083344', emoji: '🏥' },
  'Automobile':       { layout: 'auto',    primary: '#b91c1c', secondary: '#fee2e2', dark: '#3b0000', emoji: '🚗' },
  'Finance':          { layout: 'finance', primary: '#15803d', secondary: '#dcfce7', dark: '#052e16', emoji: '💰' },
  'Gym / Fitness':    { layout: 'fitness', primary: '#ea580c', secondary: '#ffedd5', dark: '#431407', emoji: '💪' },
};

function getPalette(category) {
  if (!category) return { layout: 'bold', primary: '#e82828', secondary: '#fee2e2', dark: '#1a1a1a', emoji: '⚡' };
  for (const key of Object.keys(CAT_PALETTES)) {
    if (category.toLowerCase().includes(key.toLowerCase().split('/')[0].trim())) {
      return CAT_PALETTES[key];
    }
  }
  // Default by hash
  const fallbacks = Object.values(CAT_PALETTES);
  const idx = category.charCodeAt(0) % fallbacks.length;
  return fallbacks[idx];
}

// ─── Layout: DIAGONAL SPLIT ───────────────────────────────────────────────────
function LayoutDiagonal({ promo, palette, onCall }) {
  const letter = promo.bizName?.[0]?.toUpperCase() || '?';
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onCall} style={[ld.card, { backgroundColor: palette.dark }]}>
      {/* Right colored block */}
      <View style={[ld.rightBlock, { backgroundColor: palette.primary }]} pointerEvents="none" />
      {/* Diagonal cut overlay */}
      <View style={[ld.diagCut, { backgroundColor: palette.dark }]} pointerEvents="none" />

      {/* Left content */}
      <View style={ld.left}>
        <View style={[ld.catBadge, { borderColor: palette.primary + '80' }]}>
          <Text style={[ld.catTxt, { color: palette.primary }]}>{palette.emoji} {promo.category}</Text>
        </View>
        <Text style={ld.biz} numberOfLines={1}>{promo.bizName}</Text>
        <Text style={[ld.offer, { color: palette.primary }]} numberOfLines={2}>{promo.tagline || 'Exclusive Offer'}</Text>
        <View style={ld.locRow}>
          <Ionicons name="location-sharp" size={10} color="rgba(255,255,255,0.5)" />
          <Text style={ld.locTxt} numberOfLines={1}>{promo.location}</Text>
        </View>
        <TouchableOpacity style={[ld.cta, { backgroundColor: palette.primary }]} onPress={onCall} activeOpacity={0.82}>
          <Ionicons name="call" size={12} color="#fff" />
          <Text style={ld.ctaTxt}>CALL NOW</Text>
        </TouchableOpacity>
      </View>

      {/* Right logo */}
      <View style={ld.right} pointerEvents="none">
        <View style={[ld.logoRing, { borderColor: 'rgba(255,255,255,0.35)' }]}>
          <Text style={ld.logoLetter}>{letter}</Text>
        </View>
        <View style={[ld.offerBubble, { backgroundColor: palette.dark }]}>
          <Text style={[ld.bubbleTxt, { color: palette.primary }]}>
            {(promo.tagline || 'Exclusive Offer').slice(0, 18)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const ld = StyleSheet.create({
  card:      { borderRadius: 18, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', minHeight: 168, paddingLeft: 18, elevation: 6, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  rightBlock:{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '48%' },
  diagCut:   { position: 'absolute', right: '30%', top: 0, bottom: 0, width: 80, transform: [{ skewX: '-12deg' }] },
  left:      { flex: 1, gap: 5, zIndex: 2, paddingVertical: 18, paddingRight: 8 },
  right:     { width: 130, alignItems: 'center', gap: 8, zIndex: 2, paddingRight: 10 },
  catBadge:  { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingVertical: 2, paddingHorizontal: 9 },
  catTxt:    { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  biz:       { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  offer:     { fontSize: 11, fontWeight: '700', lineHeight: 15 },
  locRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locTxt:    { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
  cta:       { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingVertical: 7, paddingHorizontal: 14, borderRadius: 25, marginTop: 4 },
  ctaTxt:    { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  logoRing:  { width: 72, height: 72, borderRadius: 36, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  logoLetter:{ fontSize: 30, fontWeight: '900', color: '#fff' },
  offerBubble:{ borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7, maxWidth: 110, alignItems: 'center' },
  bubbleTxt: { fontSize: 9.5, fontWeight: '800', textAlign: 'center', lineHeight: 13 },
});

// ─── Layout: BOLD HORIZONTAL STRIPE ──────────────────────────────────────────
function LayoutStripe({ promo, palette, onCall }) {
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onCall} style={[ls.card, { backgroundColor: palette.primary }]}>
      {/* Top stripe */}
      <View style={[ls.topStripe, { backgroundColor: 'rgba(255,255,255,0.12)' }]} pointerEvents="none" />
      {/* Bottom dark section */}
      <View style={[ls.bottomSection, { backgroundColor: palette.dark }]} pointerEvents="none" />

      {/* Emoji watermark */}
      <Text style={ls.watermark} pointerEvents="none">{palette.emoji}</Text>

      {/* Main content row */}
      <View style={ls.row}>
        <View style={ls.leftCol}>
          <Text style={ls.catLabel}>{promo.category?.toUpperCase()}</Text>
          <Text style={ls.biz} numberOfLines={1}>{promo.bizName}</Text>
        </View>
        <View style={[ls.pricePill, { borderColor: 'rgba(255,255,255,0.4)' }]}>
          <Text style={ls.pillTop}>🔥 HOT</Text>
          <Text style={ls.pillBot}>DEAL</Text>
        </View>
      </View>

      {/* Bottom row */}
      <View style={ls.bottomRow}>
        <View style={ls.tagRow}>
          <Ionicons name="sparkles" size={12} color="rgba(255,255,255,0.9)" />
          <Text style={ls.tagTxt} numberOfLines={1}>{promo.tagline || 'Exclusive Offer'}</Text>
        </View>
        <TouchableOpacity style={ls.cta} onPress={onCall} activeOpacity={0.82}>
          <Ionicons name="call" size={11} color={palette.primary} />
          <Text style={[ls.ctaTxt, { color: palette.primary }]}>CALL</Text>
        </TouchableOpacity>
      </View>

      <View style={ls.phoneRow}>
        <Ionicons name="location-sharp" size={10} color="rgba(255,255,255,0.5)" />
        <Text style={ls.phoneTxt}>{promo.location} · {promo.phone}</Text>
      </View>
    </TouchableOpacity>
  );
}

const ls = StyleSheet.create({
  card:        { borderRadius: 18, overflow: 'hidden', minHeight: 148, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12, elevation: 6, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  topStripe:   { position: 'absolute', top: 0, left: 0, right: 0, height: 70 },
  bottomSection:{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 42 },
  watermark:   { position: 'absolute', right: 14, top: 10, fontSize: 64, opacity: 0.15 },
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  leftCol:     { flex: 1 },
  catLabel:    { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, marginBottom: 2 },
  biz:         { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.6 },
  pricePill:   { borderWidth: 2, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
  pillTop:     { fontSize: 11, fontWeight: '900', color: '#fff' },
  pillBot:     { fontSize: 9,  fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 2 },
  bottomRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  tagRow:      { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  tagTxt:      { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600', flex: 1 },
  cta:         { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  ctaTxt:      { fontSize: 11, fontWeight: '900' },
  phoneRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  phoneTxt:    { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
});

// ─── Layout: CARD WITH LEFT ACCENT BAR ───────────────────────────────────────
function LayoutCard({ promo, palette, onCall }) {
  const letter = promo.bizName?.[0]?.toUpperCase() || '?';
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onCall}
      style={[lc.card, { backgroundColor: '#fff', borderLeftColor: palette.primary }]}>

      {/* Background pattern dots */}
      {[0,1,2,3,4,5].map(i => (
        <View key={i} style={[lc.dot, { backgroundColor: palette.primary + '18',
          top: (i % 3) * 40 + 10, right: Math.floor(i / 3) * 36 + 12 }]} pointerEvents="none" />
      ))}

      <View style={lc.inner}>
        {/* Logo + info */}
        <View style={lc.topRow}>
          <View style={[lc.logo, { backgroundColor: palette.primary }]}>
            <Text style={lc.logoLetter}>{letter}</Text>
          </View>
          <View style={lc.info}>
            <Text style={[lc.cat, { color: palette.primary }]}>{palette.emoji} {promo.category}</Text>
            <Text style={lc.biz} numberOfLines={1}>{promo.bizName}</Text>
            <View style={lc.locRow}>
              <Ionicons name="location-sharp" size={10} color="#999" />
              <Text style={lc.locTxt}>{promo.location}</Text>
            </View>
          </View>
          <View style={[lc.badge, { backgroundColor: palette.primary + '15', borderColor: palette.primary + '40' }]}>
            <Text style={[lc.badgeTxt, { color: palette.primary }]}>AD</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={[lc.divider, { backgroundColor: palette.primary + '25' }]} />

        {/* Offer + CTA */}
        <View style={lc.bottomRow}>
          <Text style={[lc.offer, { color: palette.dark }]} numberOfLines={2}>
            {promo.tagline || 'Special Offer for You!'}
          </Text>
          <TouchableOpacity style={[lc.cta, { backgroundColor: palette.primary }]} onPress={onCall}>
            <Ionicons name="call" size={13} color="#fff" />
            <Text style={lc.ctaTxt}>CALL NOW</Text>
          </TouchableOpacity>
        </View>

        <Text style={lc.phone}>{promo.phone}</Text>
      </View>
    </TouchableOpacity>
  );
}

const lc = StyleSheet.create({
  card:   { borderRadius: 18, overflow: 'hidden', borderLeftWidth: 5, backgroundColor: '#fff', elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  dot:    { position: 'absolute', width: 32, height: 32, borderRadius: 16 },
  inner:  { padding: 16, gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo:   { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { fontSize: 22, fontWeight: '900', color: '#fff' },
  info:   { flex: 1 },
  cat:    { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  biz:    { fontSize: 18, fontWeight: '900', color: '#111', letterSpacing: -0.3 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  locTxt: { fontSize: 10, color: '#999' },
  badge:  { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt:{ fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  divider:{ height: 1 },
  bottomRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  offer:  { flex: 1, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  cta:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 25 },
  ctaTxt: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  phone:  { fontSize: 10, color: '#bbb', fontWeight: '600' },
});

// ─── Layout: DARK PREMIUM ─────────────────────────────────────────────────────
function LayoutPremium({ promo, palette, onCall }) {
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onCall} style={[lp.card, { backgroundColor: '#0a0a0a' }]}>
      {/* Glow orb */}
      <View style={[lp.orb, { backgroundColor: palette.primary + '30' }]} pointerEvents="none" />
      <View style={[lp.orb2, { backgroundColor: palette.primary + '15' }]} pointerEvents="none" />

      <View style={lp.content}>
        {/* Top */}
        <View style={lp.topRow}>
          <View style={[lp.catPill, { backgroundColor: palette.primary + '20', borderColor: palette.primary + '50' }]}>
            <Text style={lp.emojiTxt}>{palette.emoji}</Text>
            <Text style={[lp.catTxt, { color: palette.primary }]}>{promo.category}</Text>
          </View>
          <View style={[lp.liveBadge, { borderColor: palette.primary + '60' }]}>
            <View style={[lp.liveDot, { backgroundColor: palette.primary }]} />
            <Text style={[lp.liveTxt, { color: palette.primary }]}>LIVE</Text>
          </View>
        </View>

        {/* Business name */}
        <Text style={lp.biz} numberOfLines={1}>{promo.bizName}</Text>

        {/* Offer line */}
        <View style={[lp.offerBar, { borderLeftColor: palette.primary }]}>
          <Text style={lp.offerTxt} numberOfLines={2}>{promo.tagline || 'Exclusive Offer'}</Text>
        </View>

        {/* Bottom */}
        <View style={lp.bottomRow}>
          <View>
            <View style={lp.locRow}>
              <Ionicons name="location-sharp" size={10} color="rgba(255,255,255,0.4)" />
              <Text style={lp.locTxt}>{promo.location}</Text>
            </View>
            <Text style={lp.phoneTxt}>{promo.phone}</Text>
          </View>
          <TouchableOpacity style={[lp.cta, { backgroundColor: palette.primary }]} onPress={onCall}>
            <Ionicons name="call" size={13} color="#fff" />
            <Text style={lp.ctaTxt}>CALL NOW</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const lp = StyleSheet.create({
  card:    { borderRadius: 20, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  orb:     { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: -80, right: -50 },
  orb2:    { position: 'absolute', width: 140, height: 140, borderRadius: 70, bottom: -40, left: -30 },
  content: { padding: 18, gap: 10 },
  topRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
  emojiTxt:{ fontSize: 12 },
  catTxt:  { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  liveBadge:{ flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 9 },
  liveDot: { width: 5, height: 5, borderRadius: 3 },
  liveTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  biz:     { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.8 },
  offerBar:{ borderLeftWidth: 3, paddingLeft: 10 },
  offerTxt:{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '600', lineHeight: 18 },
  bottomRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  locRow:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locTxt:  { fontSize: 10, color: 'rgba(255,255,255,0.4)' },
  phoneTxt:{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 },
  cta:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 25 },
  ctaTxt:  { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.6 },
});

// ─── Layout: GLAM (Salon/Beauty) ─────────────────────────────────────────────
function LayoutGlam({ promo, palette, onCall }) {
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onCall}
      style={[lg.card, { backgroundColor: palette.secondary }]}>
      {/* Top colored header */}
      <View style={[lg.header, { backgroundColor: palette.primary }]}>
        <Text style={lg.headerEmoji}>{palette.emoji}</Text>
        <View style={lg.headerText}>
          <Text style={lg.headerCat}>{promo.category?.toUpperCase()}</Text>
          <Text style={lg.headerBiz} numberOfLines={1}>{promo.bizName}</Text>
        </View>
        <View style={[lg.headerBadge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
          <Text style={lg.headerBadgeTxt}>✨ SPECIAL</Text>
        </View>
      </View>

      {/* Body */}
      <View style={lg.body}>
        <Text style={[lg.offer, { color: palette.dark }]} numberOfLines={2}>
          {promo.tagline || 'Book your appointment today!'}
        </Text>
        <View style={lg.metaRow}>
          <View style={lg.metaItem}>
            <Ionicons name="location-sharp" size={12} color={palette.primary} />
            <Text style={[lg.metaTxt, { color: palette.dark }]}>{promo.location}</Text>
          </View>
          <View style={lg.metaItem}>
            <Ionicons name="call" size={12} color={palette.primary} />
            <Text style={[lg.metaTxt, { color: palette.dark }]}>{promo.phone}</Text>
          </View>
        </View>
        <TouchableOpacity style={[lg.cta, { backgroundColor: palette.primary }]} onPress={onCall}>
          <Ionicons name="call" size={13} color="#fff" />
          <Text style={lg.ctaTxt}>BOOK NOW</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const lg = StyleSheet.create({
  card:   { borderRadius: 18, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  headerEmoji: { fontSize: 28 },
  headerText: { flex: 1 },
  headerCat: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.75)', letterSpacing: 1.5 },
  headerBiz: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.4 },
  headerBadge:{ borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 },
  headerBadgeTxt:{ fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  body:   { padding: 14, gap: 10 },
  offer:  { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  metaRow:{ flexDirection: 'row', gap: 18 },
  metaItem:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt:{ fontSize: 11, fontWeight: '600' },
  cta:    { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 9, paddingHorizontal: 20, borderRadius: 25 },
  ctaTxt: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
});

// ─── Pick layout by category/hash ────────────────────────────────────────────
function pickLayout(promo, palette) {
  const layouts = ['diagonal', 'stripe', 'card', 'premium', 'glam'];
  if (palette.layout === 'glam')    return 'glam';
  if (palette.layout === 'property') return 'premium';
  if (palette.layout === 'tech')    return 'premium';
  if (palette.layout === 'finance') return 'card';
  // Hash by bizName for consistent but varied assignment
  const hash = (promo.bizName || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return layouts[hash % layouts.length];
}

// ─── Banner renderer ──────────────────────────────────────────────────────────
export function BannerCard({ promo, onCall }) {
  const palette = getPalette(promo.category);
  const layout  = pickLayout(promo, palette);
  const handleCall = () => {
    if (promo.phone && !promo.isDummy) Linking.openURL(`tel:${promo.phone}`);
  };
  const callFn = onCall || handleCall;

  if (layout === 'glam')    return <LayoutGlam    promo={promo} palette={palette} onCall={callFn} />;
  if (layout === 'stripe')  return <LayoutStripe  promo={promo} palette={palette} onCall={callFn} />;
  if (layout === 'card')    return <LayoutCard    promo={promo} palette={palette} onCall={callFn} />;
  if (layout === 'premium') return <LayoutPremium promo={promo} palette={palette} onCall={callFn} />;
  return <LayoutDiagonal promo={promo} palette={palette} onCall={callFn} />;
}

// ─── Dummy ads ────────────────────────────────────────────────────────────────
const DUMMY_ADS = [
  { id: 'dummy_1', bizName: 'Sharma Electronics', tagline: '20% Off on all TVs & ACs this week!', phone: '9876543210', category: 'Retail / Shop',    location: 'Nanded City', bannerStyle: 'bold',  accentColor: '#d97706', isDummy: true, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'dummy_2', bizName: 'Priya Beauty Salon',  tagline: 'Bridal packages starting ₹1,999 only', phone: '8765432109', category: 'Salon / Beauty',  location: 'Vazirabad',   bannerStyle: 'clean', accentColor: '#c026d3', isDummy: true, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'dummy_3', bizName: 'Nanded Properties',   tagline: 'Flats & Plots — Book your dream home', phone: '7654321098', category: 'Real Estate',     location: 'Cidco',       bannerStyle: 'vivid', accentColor: '#0369a1', isDummy: true, createdAt: new Date(Date.now() - 10800000).toISOString() },
];

// ─── Pulse dot ────────────────────────────────────────────────────────────────
function PulseDot({ color }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: 1.9, duration: 750, useNativeDriver: !IS_WEB, easing: Easing.out(Easing.ease) }),
      Animated.timing(scale, { toValue: 1,   duration: 750, useNativeDriver: !IS_WEB, easing: Easing.in(Easing.ease) }),
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

// ─── Standalone PromoBanner (shown as header on listing screens) ──────────────
export default function PromoBanner({ style: propStyle, promo: inlineProp, inline = false }) {
  const nav    = useNavigation();
  const fadeO  = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(16)).current;
  const [promos,  setPromos]  = useState([]);
  const [current, setCurrent] = useState(0);
  const [ready,   setReady]   = useState(false);

  useEffect(() => {
    if (inline && inlineProp) { setPromos([inlineProp]); setReady(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await http('GET', '/api/promotions/active');
        if (!cancelled) {
          const live = (res.ok && res.promotion) ? [res.promotion] : [];
          const needed = Math.max(0, 3 - live.length);
          setPromos([...live, ...DUMMY_ADS.slice(0, needed)]);
          setReady(true);
        }
      } catch {
        if (!cancelled) { setPromos(DUMMY_ADS); setReady(true); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    Animated.parallel([
      Animated.timing(fadeO,  { toValue: 1, duration: 450, delay: 80, useNativeDriver: !IS_WEB, easing: Easing.out(Easing.ease) }),
      Animated.timing(slideY, { toValue: 0, duration: 400, delay: 80, useNativeDriver: !IS_WEB, easing: Easing.out(Easing.back(1.1)) }),
    ]).start();
  }, [ready]);

  useEffect(() => {
    if (promos.length < 2) return;
    const id = setInterval(() => setCurrent(prev => (prev + 1) % promos.length), 5000);
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
      {/* Top row */}
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
  sponsoredTag:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 9, borderWidth: 1 },
  sponsoredTxt:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  advertiseLink: { fontSize: 10, fontWeight: '700', color: '#aaa', textDecorationLine: 'underline' },
  navRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 },
  navBtn:        { padding: 4 },
});
