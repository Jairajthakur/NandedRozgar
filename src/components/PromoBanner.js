/**
 * CityPlus — PromoBanner.js
 * 18 banner layouts · user must select (no auto-pick)
 * Same structural layout as screenshots — only colors & style change
 */

import React, { useRef, useState } from 'react';
import {
  Platform,
  Animated, Linking, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ORANGE = '#f97316';

/* ═══════════════════════════════════════════════════════════════
   18 BANNER LAYOUTS
   Each has: id, name, bg, stripe, accent, sub, textColor,
             ctaLabel, ctaBg, ctaText, badgeLabel, badgeBg, badgeText
═══════════════════════════════════════════════════════════════ */
export const BANNER_LAYOUTS = [
  {
    id: 'bold_dark',      name: 'Bold Dark',
    bg: '#1a1a1a',        stripe: '#2a0000',
    accent: '#e82828',    sub: '#fca5a5',
    ctaLabel: 'CONTACT NOW', ctaBg: '#fff',    ctaText: '#e82828',
    badgeLabel: 'SPECIAL',   badgeBg: '#e82828', badgeText: '#fff',
    divider: '#333',
  },
  {
    id: 'clean_white',    name: 'Clean White',
    bg: '#f8f8f8',        stripe: '#e5e5e5',
    accent: '#f97316',    sub: '#9a3412',
    ctaLabel: 'SHOP NOW', ctaBg: '#f97316',  ctaText: '#fff',
    badgeLabel: 'LIMITED OFFER', badgeBg: '#fff7ed', badgeText: '#c2410c',
    divider: '#e5e5e5',
  },
  {
    id: 'vivid_orange',   name: 'Vivid Orange',
    bg: '#f97316',        stripe: '#ea580c',
    accent: '#1a1a1a',    sub: '#fff',
    ctaLabel: 'GET IN TOUCH', ctaBg: 'rgba(0,0,0,0.25)', ctaText: '#fff',
    badgeLabel: 'MEGA OFFER',  badgeBg: '#1a1a1a', badgeText: '#f97316',
    divider: 'rgba(255,255,255,0.25)',
  },
  {
    id: 'royal_blue',     name: 'Royal Blue',
    bg: '#0f172a',        stripe: '#1e3a5f',
    accent: '#3b82f6',    sub: '#bfdbfe',
    ctaLabel: 'LEARN MORE', ctaBg: '#3b82f6', ctaText: '#fff',
    badgeLabel: 'FEATURED',  badgeBg: '#3b82f6', badgeText: '#fff',
    divider: '#1e3a5f',
  },
  {
    id: 'emerald',        name: 'Emerald',
    bg: '#052e16',        stripe: '#14532d',
    accent: '#10b981',    sub: '#6ee7b7',
    ctaLabel: 'BOOK NOW', ctaBg: '#10b981', ctaText: '#052e16',
    badgeLabel: 'OFFER',   badgeBg: '#10b981', badgeText: '#052e16',
    divider: '#14532d',
  },
  {
    id: 'royal_purple',   name: 'Royal Purple',
    bg: '#1e0036',        stripe: '#3b0073',
    accent: '#a855f7',    sub: '#e9d5ff',
    ctaLabel: 'ENQUIRE',  ctaBg: '#a855f7', ctaText: '#fff',
    badgeLabel: 'PREMIUM', badgeBg: '#a855f7', badgeText: '#fff',
    divider: '#3b0073',
  },
  {
    id: 'gold_luxury',    name: 'Gold Luxury',
    bg: '#1c1200',        stripe: '#3d2800',
    accent: '#d97706',    sub: '#fde68a',
    ctaLabel: 'VISIT US', ctaBg: '#d97706', ctaText: '#1c1200',
    badgeLabel: 'LUXURY',  badgeBg: '#d97706', badgeText: '#1c1200',
    divider: '#3d2800',
  },
  {
    id: 'hot_pink',       name: 'Hot Pink',
    bg: '#1f001a',        stripe: '#3d0033',
    accent: '#ec4899',    sub: '#fbcfe8',
    ctaLabel: 'BOOK NOW', ctaBg: '#ec4899', ctaText: '#fff',
    badgeLabel: 'TRENDING', badgeBg: '#ec4899', badgeText: '#fff',
    divider: '#3d0033',
  },
  {
    id: 'ocean_teal',     name: 'Ocean Teal',
    bg: '#001f1e',        stripe: '#003d3a',
    accent: '#14b8a6',    sub: '#99f6e4',
    ctaLabel: 'CONNECT',  ctaBg: '#14b8a6', ctaText: '#001f1e',
    badgeLabel: 'DEAL',    badgeBg: '#14b8a6', badgeText: '#001f1e',
    divider: '#003d3a',
  },
  {
    id: 'sunset_red',     name: 'Sunset Red',
    bg: '#fff',           stripe: '#fff5f5',
    accent: '#dc2626',    sub: '#7f1d1d',
    ctaLabel: 'CALL NOW', ctaBg: '#dc2626', ctaText: '#fff',
    badgeLabel: 'HOT DEAL', badgeBg: '#dc2626', badgeText: '#fff',
    divider: '#fecaca',
  },
  {
    id: 'midnight_cyan',  name: 'Midnight Cyan',
    bg: '#001520',        stripe: '#002b40',
    accent: '#06b6d4',    sub: '#a5f3fc',
    ctaLabel: 'ORDER NOW', ctaBg: '#06b6d4', ctaText: '#001520',
    badgeLabel: 'NEW',      badgeBg: '#06b6d4', badgeText: '#001520',
    divider: '#002b40',
  },
  {
    id: 'lime_fresh',     name: 'Lime Fresh',
    bg: '#f7fee7',        stripe: '#d9f99d',
    accent: '#65a30d',    sub: '#3f6212',
    ctaLabel: 'SHOP NOW', ctaBg: '#65a30d', ctaText: '#fff',
    badgeLabel: 'FRESH',   badgeBg: '#65a30d', badgeText: '#fff',
    divider: '#d9f99d',
  },
  {
    id: 'rose_bloom',     name: 'Rose Bloom',
    bg: '#fff1f2',        stripe: '#ffe4e6',
    accent: '#f43f5e',    sub: '#9f1239',
    ctaLabel: 'BOOK NOW', ctaBg: '#f43f5e', ctaText: '#fff',
    badgeLabel: 'SPECIAL', badgeBg: '#f43f5e', badgeText: '#fff',
    divider: '#fecdd3',
  },
  {
    id: 'steel_modern',   name: 'Steel Modern',
    bg: '#0f172a',        stripe: '#1e293b',
    accent: '#64748b',    sub: '#cbd5e1',
    ctaLabel: 'CONTACT',  ctaBg: '#64748b', ctaText: '#fff',
    badgeLabel: 'PRO',     badgeBg: '#64748b', badgeText: '#fff',
    divider: '#1e293b',
  },
  {
    id: 'amber_warm',     name: 'Amber Warm',
    bg: '#fffbeb',        stripe: '#fef3c7',
    accent: '#f59e0b',    sub: '#78350f',
    ctaLabel: 'ORDER NOW', ctaBg: '#f59e0b', ctaText: '#fff',
    badgeLabel: 'TODAY',   badgeBg: '#f59e0b', badgeText: '#fff',
    divider: '#fde68a',
  },
  {
    id: 'indigo_pro',     name: 'Indigo Pro',
    bg: '#0d0b2e',        stripe: '#1a1760',
    accent: '#4f46e5',    sub: '#c7d2fe',
    ctaLabel: 'GET QUOTE', ctaBg: '#4f46e5', ctaText: '#fff',
    badgeLabel: 'VERIFIED', badgeBg: '#4f46e5', badgeText: '#fff',
    divider: '#1a1760',
  },
  {
    id: 'coral_pop',      name: 'Coral Pop',
    bg: '#fff',           stripe: '#fff5f0',
    accent: '#fb7185',    sub: '#9f1239',
    ctaLabel: 'EXPLORE',  ctaBg: '#fb7185', ctaText: '#fff',
    badgeLabel: 'HOT',     badgeBg: '#fb7185', badgeText: '#fff',
    divider: '#fecdd3',
  },
  {
    id: 'forest_green',   name: 'Forest Green',
    bg: '#fff',           stripe: '#f0fdf4',
    accent: '#16a34a',    sub: '#14532d',
    ctaLabel: 'VISIT',    ctaBg: '#16a34a', ctaText: '#fff',
    badgeLabel: 'NATURAL', badgeBg: '#16a34a', badgeText: '#fff',
    divider: '#bbf7d0',
  },
];

/* ═══════════════════════════════════════════════════════════════
   BANNER RENDERER — exact layout from screenshots
   Left: category tag · biz name · tagline · location · CTA · phone
   Right: stripes · avatar circle · badge · bolt
═══════════════════════════════════════════════════════════════ */
export function BannerPreview({ layout, biz = 'Your Business', offer = 'Big Sale!', loc = 'Nanded', phone = '', category = '' }) {
  const L = layout;
  const initial = (biz || 'B').charAt(0).toUpperCase();

  /* Determine text colour for biz name based on bg brightness */
  const isDark = ['#1a1a1a','#0f172a','#052e16','#1e0036','#1c1200',
    '#1f001a','#001f1e','#001520','#0d0b2e','#0b0028'].includes(L.bg);
  const bizColor = isDark ? '#fff' : L.sub;

  return (
    <View style={[pb.card, { backgroundColor: L.bg, borderColor: L.accent + '44' }]}>

      {/* LEFT */}
      <View style={pb.left}>
        {/* Arrow category pill */}
        <View style={pb.tagRow}>
          <View style={[pb.arrowHead, { borderRightColor: L.accent }]} />
          <View style={[pb.tagBody, { backgroundColor: L.accent }]}>
            <Text style={[pb.tagTxt, { color: L.ctaBg === '#fff' ? L.bg : '#fff' }]}>
              {(category || 'BUSINESS').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Business name */}
        <Text style={[pb.bizName, { color: bizColor }]} numberOfLines={1}>{biz}</Text>

        {/* Offer / tagline */}
        <Text style={[pb.tagline, { color: L.accent }]} numberOfLines={1}>{offer}</Text>

        {/* Location */}
        <View style={pb.locRow}>
          <Text style={pb.pin}>📍</Text>
          <Text style={[pb.locTxt, { color: L.sub }]} numberOfLines={1}>{loc}</Text>
        </View>

        {/* CTA button */}
        <View style={[pb.callBtn, { backgroundColor: L.ctaBg }]}>
          <Text style={[pb.callTxt, { color: L.ctaText }]}>📞 {L.ctaLabel}</Text>
        </View>

        {/* Phone */}
        {!!phone && <Text style={[pb.phone, { color: L.sub }]}>{phone}</Text>}
      </View>

      {/* RIGHT */}
      <View style={[pb.right, { backgroundColor: L.stripe }]}>
        {/* Diagonal decorative lines */}
        <View style={[pb.stripe, { backgroundColor: L.accent, top: 8,  right: 16, opacity: 0.22 }]} />
        <View style={[pb.stripe, { backgroundColor: L.accent, top: 32, right: 28, opacity: 0.13 }]} />
        <View style={[pb.stripe, { backgroundColor: L.accent, top: 56, right: 12, opacity: 0.18 }]} />
        <View style={[pb.stripe, { backgroundColor: L.accent, top: 80, right: 32, opacity: 0.10 }]} />

        {/* Avatar circle */}
        <View style={[pb.avatar, { backgroundColor: L.accent, shadowColor: L.accent }]}>
          <Text style={[pb.avatarTxt, { color: L.ctaText === '#fff' ? L.ctaBg : '#fff' }]}>{initial}</Text>
        </View>

        {/* Small icon badge */}
        <View style={[pb.iconBadge, { borderColor: L.accent }]}>
          <Text style={{ fontSize: 11 }}>📲</Text>
        </View>

        {/* Offer badge */}
        <View style={[pb.offerBadge, { backgroundColor: L.badgeBg }]}>
          <Text style={[pb.offerTxt, { color: L.badgeText }]}>{L.badgeLabel}</Text>
        </View>

        {/* Bolt */}
        <Text style={[pb.bolt, { color: L.accent }]}>⚡</Text>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BANNER STYLE PICKER
   — shows all 18 layouts as selectable preview cards
   — user MUST tap one; nothing is auto-selected
   — `selected` is null until user picks
═══════════════════════════════════════════════════════════════ */
export function BannerStylePicker({ form, selected, onSelect }) {
  const biz    = form?.bizName   || 'Your Business';
  const offer  = form?.tagline   || 'Big Sale!';
  const loc    = form?.location  || 'Nanded';
  const phone  = form?.phone     || '';
  const cat    = form?.category  || '';

  return (
    <View style={sp.wrap}>
      <View style={sp.head}>
        <Ionicons name="image-outline" size={17} color={ORANGE} />
        <Text style={sp.title}>Choose Banner Style</Text>
      </View>
      <Text style={sp.sub}>Select a design for your promotion banner</Text>

      {/* Required hint */}
      {!selected && (
        <View style={sp.requiredHint}>
          <Ionicons name="alert-circle-outline" size={14} color={ORANGE} />
          <Text style={sp.requiredTxt}>Please select a banner style to continue</Text>
        </View>
      )}

      <View style={sp.list}>
        {BANNER_LAYOUTS.map(layout => (
          <BannerSelectCard
            key={layout.id}
            layout={layout}
            biz={biz}
            offer={offer}
            loc={loc}
            phone={phone}
            category={cat}
            selected={selected === layout.id}
            onSelect={() => onSelect(layout.id)}
          />
        ))}
      </View>
    </View>
  );
}

function BannerSelectCard({ layout, biz, offer, loc, phone, category, selected, onSelect }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: Platform.OS !== 'web', speed: 40, bounciness: 0 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: Platform.OS !== 'web', speed: 22, bounciness: 6 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }], marginBottom: 14 }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onSelect}
        onPressIn={onIn}
        onPressOut={onOut}
        style={[sc.wrap, selected && { borderColor: ORANGE, borderWidth: 2.5 }]}
      >
        <BannerPreview
          layout={layout}
          biz={biz}
          offer={offer}
          loc={loc}
          phone={phone}
          category={category}
        />

        {/* Selected overlay checkmark */}
        {selected && (
          <View style={sc.checkWrap}>
            <Ionicons name="checkmark-circle" size={24} color={ORANGE} />
          </View>
        )}

        {/* Layout name label */}
        <Text style={[sc.label, selected && { color: ORANGE, fontWeight: '800' }]}>
          {layout.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DEFAULT EXPORT — renders the live banner given a layout id
   Used in home feed / promo cards
═══════════════════════════════════════════════════════════════ */
export default function PromoBanner({ data, promo: promoAlias }) {
  const src = data || promoAlias;
  if (!src) return null;

  const name     = src.bizName || src.businessName || src.biz_name || src.name || '';
  const offer    = src.tagline || src.offer || '';
  const loc      = src.location || src.city || '';
  const phone    = src.phone || src.contact || '';
  const category = src.category || src.biz_category || '';
  const styleId  = src.bannerStyle || src.banner_style || 'bold_dark';

  if (!name) return null;

  const layout = BANNER_LAYOUTS.find(l => l.id === styleId) || BANNER_LAYOUTS[0];

  return (
    <BannerPreview
      layout={layout}
      biz={name}
      offer={offer}
      loc={loc}
      phone={phone}
      category={category}
    />
  );
}

/* ─── BannerPreview styles ─────────────────────────────────── */
const pb = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 150,
  },
  left: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'center',
    gap: 3,
  },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  arrowHead: {
    width: 0, height: 0,
    borderTopWidth: 9, borderBottomWidth: 9, borderRightWidth: 10,
    borderTopColor: 'transparent', borderBottomColor: 'transparent',
  },
  tagBody: {
    paddingHorizontal: 9, paddingVertical: 3,
    borderTopRightRadius: 4, borderBottomRightRadius: 4,
  },
  tagTxt:  { fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  bizName: { fontSize: 21, fontWeight: '900', letterSpacing: -0.3, marginBottom: 1 },
  tagline: { fontSize: 12, fontWeight: '700' },
  locRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  pin:     { fontSize: 11, marginRight: 4 },
  locTxt:  { fontSize: 11, fontWeight: '500', flex: 1 },
  callBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 22, paddingVertical: 7, paddingHorizontal: 14,
    alignSelf: 'flex-start', marginTop: 8,
  },
  callTxt: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  phone:   { fontSize: 10, fontWeight: '500', marginTop: 4, opacity: 0.7 },
  right: {
    width: 100,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, gap: 7,
    overflow: 'hidden', position: 'relative',
  },
  stripe: {
    position: 'absolute', width: 2.5, height: '130%',
    transform: [{ rotate: '15deg' }],
  },
  avatar: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
    elevation: 5, shadowOpacity: 0.4, shadowRadius: 7,
  },
  avatarTxt: { fontSize: 26, fontWeight: '900' },
  iconBadge: { borderWidth: 1.5, borderRadius: 13, padding: 4 },
  offerBadge: {
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5,
    alignItems: 'center',
  },
  offerTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 0.4, textAlign: 'center' },
  bolt: { position: 'absolute', bottom: 5, right: 5, fontSize: 15, opacity: 0.55 },
});

/* ─── BannerStylePicker styles ─────────────────────────────── */
const sp = StyleSheet.create({
  wrap: { marginTop: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  title: { fontSize: 15, fontWeight: '800', color: '#1a1a18' },
  sub:   { fontSize: 12, color: '#888780', marginBottom: 12 },
  requiredHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff7ed', borderRadius: 10, padding: 10,
    marginBottom: 14, borderWidth: 1, borderColor: '#fed7aa',
  },
  requiredTxt: { fontSize: 12, color: '#c2410c', fontWeight: '600', flex: 1 },
  list: { gap: 0 },
});

/* ─── BannerSelectCard styles ──────────────────────────────── */
const sc = StyleSheet.create({
  wrap: {
    borderRadius: 16, borderWidth: 1.5, borderColor: '#e8e4dd',
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  checkWrap: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: '#fff', borderRadius: 12, padding: 1,
  },
  label: {
    textAlign: 'center', paddingVertical: 10,
    fontSize: 13, fontWeight: '600', color: '#5f5e5a',
    backgroundColor: '#fafaf9',
    borderTopWidth: 0.5, borderTopColor: '#e8e4dd',
  },
});

// ─── Compatibility aliases ────────────────────────────────────────────────────
export const BannerCard       = PromoBanner;
export const BannerWithPicker = BannerStylePicker;
export const TemplatePicker   = BannerStylePicker;
