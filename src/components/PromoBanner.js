import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ScrollView, Linking,
} from 'react-native';

/* ═══════════════════════════════════════════════════════════════
   20 TEMPLATES  — all share the exact same screenshot layout,
   each with a distinct color personality.
═══════════════════════════════════════════════════════════════ */
export const TEMPLATES = [
  {
    id: 1,  name: 'Crimson',
    bg: '#110000', stripe: '#2a0000', accent: '#e11d48',
    sub: '#fda4af', text: '#fff', cta: 'CALL NOW',
  },
  {
    id: 2,  name: 'Ocean',
    bg: '#00091c', stripe: '#001433', accent: '#0ea5e9',
    sub: '#7dd3fc', text: '#fff', cta: 'CALL NOW',
  },
  {
    id: 3,  name: 'Emerald',
    bg: '#001409', stripe: '#00260f', accent: '#10b981',
    sub: '#6ee7b7', text: '#fff', cta: 'CALL NOW',
  },
  {
    id: 4,  name: 'Royal Purple',
    bg: '#0b0018', stripe: '#1a0030', accent: '#8b5cf6',
    sub: '#c4b5fd', text: '#fff', cta: 'CALL NOW',
  },
  {
    id: 5,  name: 'Sunset',
    bg: '#160800', stripe: '#2c1000', accent: '#f97316',
    sub: '#fdba74', text: '#fff', cta: 'CALL NOW',
  },
  {
    id: 6,  name: 'Gold',
    bg: '#110e00', stripe: '#211b00', accent: '#d97706',
    sub: '#fcd34d', text: '#fff', cta: 'CALL NOW',
  },
  {
    id: 7,  name: 'Hot Pink',
    bg: '#160010', stripe: '#2c0020', accent: '#ec4899',
    sub: '#f9a8d4', text: '#fff', cta: 'CALL NOW',
  },
  {
    id: 8,  name: 'Teal',
    bg: '#001416', stripe: '#002428', accent: '#14b8a6',
    sub: '#99f6e4', text: '#fff', cta: 'CALL NOW',
  },
  {
    id: 9,  name: 'Neon Cyan',
    bg: '#000d14', stripe: '#001a24', accent: '#06b6d4',
    sub: '#67e8f9', text: '#fff', cta: 'CALL NOW',
  },
  {
    id: 10, name: 'Violet',
    bg: '#080012', stripe: '#100024', accent: '#7c3aed',
    sub: '#a78bfa', text: '#fff', cta: 'CALL NOW',
  },
  {
    id: 11, name: 'Lime',
    bg: '#040d00', stripe: '#0a1a00', accent: '#84cc16',
    sub: '#bef264', text: '#fff', cta: 'CALL NOW',
  },
  {
    id: 12, name: 'Rose',
    bg: '#130008', stripe: '#260010', accent: '#f43f5e',
    sub: '#fda4af', text: '#fff', cta: 'CALL NOW',
  },
  {
    id: 13, name: 'Copper',
    bg: '#0e0700', stripe: '#1c0e00', accent: '#b45309',
    sub: '#fcd34d', text: '#fff', cta: 'CALL NOW',
  },
  {
    id: 14, name: 'Sky',
    bg: '#000e16', stripe: '#001b28', accent: '#38bdf8',
    sub: '#bae6fd', text: '#fff', cta: 'CALL NOW',
  },
  {
    id: 15, name: 'Magenta',
    bg: '#110016', stripe: '#20002c', accent: '#c026d3',
    sub: '#e879f9', text: '#fff', cta: 'CALL NOW',
  },
  {
    id: 16, name: 'Mint',
    bg: '#00120e', stripe: '#00241c', accent: '#34d399',
    sub: '#a7f3d0', text: '#fff', cta: 'CALL NOW',
  },
  {
    id: 17, name: 'Amber',
    bg: '#100800', stripe: '#1f1000', accent: '#f59e0b',
    sub: '#fde68a', text: '#fff', cta: 'CALL NOW',
  },
  {
    id: 18, name: 'Indigo',
    bg: '#04001a', stripe: '#09003a', accent: '#4f46e5',
    sub: '#a5b4fc', text: '#fff', cta: 'CALL NOW',
  },
  {
    id: 19, name: 'Coral',
    bg: '#130400', stripe: '#240800', accent: '#fb7185',
    sub: '#fecdd3', text: '#fff', cta: 'CALL NOW',
  },
  {
    id: 20, name: 'Steel',
    bg: '#060a10', stripe: '#0d1520', accent: '#64748b',
    sub: '#cbd5e1', text: '#fff', cta: 'CALL NOW',
  },
];

function getTemplateById(id) {
  return TEMPLATES.find(t => t.id === id) || TEMPLATES[0];
}

/* ─── Auto-pick template from category ─── */
const CATEGORY_TEMPLATE = {
  salon: 1, beauty: 1, parlour: 1,
  retail: 5, fashion: 7, clothing: 7, shopping: 5,
  transport: 9, auto: 2, automobile: 2, logistics: 9,
  electronics: 2, courier: 9,
  food: 17, catering: 17, bakery: 13, tiffin: 6,
  jewellery: 6, jewelry: 6, insurance: 13, finance: 6,
  restaurant: 5, cafe: 13, dining: 17, dhaba: 5,
  education: 2, coaching: 2, school: 2, college: 2,
  tuition: 2, academy: 14, classes: 14,
  gym: 12, fitness: 12, sports: 1, yoga: 3,
  wedding: 7, florist: 7, bridal: 7, mehendi: 15, event: 15,
  photography: 6, photo: 6, videography: 6, studio: 20,
  'real estate': 5, realestate: 5, property: 5, builder: 5,
  'digital marketing': 9, 'social media': 15, seo: 18, advertising: 4,
  hospital: 4, pharmacy: 4, clinic: 4, medical: 4, doctor: 4,
  agriculture: 3, organic: 3, nursery: 11, farm: 3,
  coffee: 13, sweet: 6, dessert: 6, cake: 7, 'ice cream': 8,
  engineering: 20, manufacturing: 20, hardware: 20, welding: 20,
  legal: 18, lawyer: 18, advocate: 18, consulting: 18,
  software: 9, technology: 14, startup: 14, app: 9,
  hotel: 6, resort: 6, travel: 14, tourism: 8,
  gaming: 10, entertainment: 15, club: 15,
  spa: 7, wellness: 16, meditation: 16, ayurveda: 3,
};

function autoTemplate(category = '') {
  const key = (category || '').toLowerCase().trim();
  for (const [cat, id] of Object.entries(CATEGORY_TEMPLATE)) {
    if (key.includes(cat) || cat.includes(key)) return id;
  }
  return 1;
}

function callBusiness(phone) {
  if (phone) Linking.openURL(`tel:${phone}`);
}

/* ─────────────────────────────────────────────────────────────
   SHARED BANNER — screenshot-exact layout, colour-themed
───────────────────────────────────────────────────────────────
  Left  : arrow category tag · business name · tagline ·
           location · CALL NOW · phone
  Right : diagonal stripes · avatar circle · icon badge ·
           offer badge · lightning bolt
───────────────────────────────────────────────────────────────*/
function Banner({ data, tmpl }) {
  const { bg, stripe, accent, sub, text, cta } = tmpl;

  return (
    <View style={[bn.card, { backgroundColor: bg, borderColor: accent + '55' }]}>

      {/* ── LEFT PANEL ─────────────────────────────────── */}
      <View style={bn.left}>

        {/* Arrow category tag */}
        {!!data.category && (
          <View style={bn.tagRow}>
            {/* arrow head */}
            <View style={[bn.arrowHead, { borderRightColor: accent }]} />
            <View style={[bn.tagBody, { backgroundColor: accent }]}>
              <Text style={[bn.tagTxt, { color: bg }]}>
                {data.category.toUpperCase()}
              </Text>
            </View>
          </View>
        )}

        {/* Business name */}
        <Text style={[bn.bizName, { color: text }]} numberOfLines={1}>
          {data.name}
        </Text>

        {/* Tagline */}
        {!!data.tagline && (
          <Text style={[bn.tagline, { color: accent }]} numberOfLines={1}>
            {data.tagline}
          </Text>
        )}

        {/* Description */}
        {!!data.description && (
          <Text style={[bn.desc, { color: sub }]} numberOfLines={2}>
            {data.description}
          </Text>
        )}

        {/* Location */}
        {!!data.location && (
          <View style={bn.locRow}>
            <Text style={bn.locPin}>📍</Text>
            <Text style={[bn.locTxt, { color: sub }]} numberOfLines={1}>
              {data.location}
            </Text>
          </View>
        )}

        {/* Address */}
        {!!data.address && (
          <View style={bn.locRow}>
            <Text style={bn.locPin}>🏢</Text>
            <Text style={[bn.locTxt, { color: sub }]} numberOfLines={1}>
              {data.address}
            </Text>
          </View>
        )}

        {/* Timing */}
        {!!data.timing && (
          <View style={bn.locRow}>
            <Text style={bn.locPin}>🕐</Text>
            <Text style={[bn.locTxt, { color: sub }]} numberOfLines={1}>
              {data.timing}
            </Text>
          </View>
        )}

        {/* CALL NOW button */}
        <TouchableOpacity
          style={[bn.callBtn, { backgroundColor: accent }]}
          onPress={() => callBusiness(data.phone)}
          activeOpacity={0.8}
        >
          <Text style={[bn.callIcon, { color: bg }]}>📞 </Text>
          <Text style={[bn.callTxt, { color: bg }]}>{cta}</Text>
        </TouchableOpacity>

        {/* Phone number */}
        {!!data.phone && (
          <Text style={[bn.phone, { color: sub }]}>{data.phone}</Text>
        )}
      </View>

      {/* ── RIGHT PANEL — diagonal accent ──────────────── */}
      <View style={[bn.right, { backgroundColor: stripe }]}>

        {/* Diagonal decorative stripes */}
        <View style={[bn.stripe, { backgroundColor: accent, top: 10, right: 14, opacity: 0.22 }]} />
        <View style={[bn.stripe, { backgroundColor: accent, top: 36, right: 26, opacity: 0.12 }]} />
        <View style={[bn.stripe, { backgroundColor: accent, top: 62, right: 10, opacity: 0.18 }]} />
        <View style={[bn.stripe, { backgroundColor: accent, top: 88, right: 30, opacity: 0.10 }]} />

        {/* Avatar circle — large */}
        <View style={[bn.avatar, { backgroundColor: accent, shadowColor: accent }]}>
          <Text style={[bn.avatarTxt, { color: bg }]}>
            {(data.name || 'B').charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Small icon badge below avatar */}
        <View style={[bn.iconBadge, { borderColor: accent }]}>
          <Text style={{ fontSize: 12 }}>📲</Text>
        </View>

        {/* "Exclusive Offer" or tagline badge */}
        <View style={[bn.offerBadge, { backgroundColor: accent }]}>
          <Text style={[bn.offerTxt, { color: bg }]}>
            {data.tagline ? 'OFFER' : data.isPopular ? '★ TOP' : 'AD'}
          </Text>
        </View>

        {/* Lightning bolt — bottom right corner */}
        <Text style={[bn.bolt, { color: accent }]}>⚡</Text>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TEMPLATE PICKER — horizontal scrollable colour swatches
   Usage:
     <TemplatePicker selected={id} onSelect={id => setId(id)} />
═══════════════════════════════════════════════════════════════ */
export function TemplatePicker({ selected, onSelect }) {
  return (
    <View style={pk.wrap}>
      <Text style={pk.heading}>Choose Banner Style</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={pk.row}
      >
        {TEMPLATES.map(t => {
          const active = selected === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => onSelect(t.id)}
              style={[pk.swatch, { backgroundColor: t.bg, borderColor: active ? t.accent : t.accent + '44' }]}
              activeOpacity={0.75}
            >
              {/* Mini accent bar */}
              <View style={[pk.bar, { backgroundColor: t.accent }]} />
              {/* Mini avatar dot */}
              <View style={[pk.dot, { backgroundColor: t.accent }]}>
                <Text style={[pk.dotTxt, { color: t.bg }]}>A</Text>
              </View>
              {/* Template name */}
              <Text style={[pk.label, { color: t.sub }]} numberOfLines={1}>
                {t.name}
              </Text>
              {/* Active checkmark */}
              {active && (
                <View style={[pk.check, { backgroundColor: t.accent }]}>
                  <Text style={[pk.checkTxt, { color: t.bg }]}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RICH PROMO CARD — Category-aware, colour-coded sponsored card
   Matches the image-2 design: coloured bg, category pill, badge,
   emoji icon, avatar, phone/location, category-specific CTA.
═══════════════════════════════════════════════════════════════ */

const CAT_MAP = {
  // beauty
  salon:         { bg:'#e0faf5', accent:'#0d9488', dark:'#065f46', label:'SALON / BEAUTY',        emoji:'💅', cta:'Book Now'   },
  beauty:        { bg:'#e0faf5', accent:'#0d9488', dark:'#065f46', label:'SALON / BEAUTY',        emoji:'💄', cta:'Book Now'   },
  parlour:       { bg:'#e0faf5', accent:'#0d9488', dark:'#065f46', label:'SALON / BEAUTY',        emoji:'✂️', cta:'Book Now'   },
  spa:           { bg:'#f0fdf4', accent:'#16a34a', dark:'#14532d', label:'WELLNESS / SPA',        emoji:'🧖', cta:'Book Now'   },
  gym:           { bg:'#fff0f5', accent:'#e11d48', dark:'#881337', label:'FITNESS / GYM',         emoji:'🏋️', cta:'Book Now'   },
  fitness:       { bg:'#fff0f5', accent:'#e11d48', dark:'#881337', label:'FITNESS / GYM',         emoji:'💪', cta:'Book Now'   },
  yoga:          { bg:'#f0fdf4', accent:'#16a34a', dark:'#14532d', label:'YOGA / WELLNESS',       emoji:'🧘', cta:'Book Now'   },
  // food
  restaurant:    { bg:'#fff7ed', accent:'#ea580c', dark:'#7c2d12', label:'FOOD / RESTAURANT',     emoji:'🍽️', cta:'Order Now'  },
  food:          { bg:'#fff7ed', accent:'#ea580c', dark:'#7c2d12', label:'FOOD / CATERING',       emoji:'🍱', cta:'Order Now'  },
  catering:      { bg:'#fff7ed', accent:'#ea580c', dark:'#7c2d12', label:'CATERING',              emoji:'🍛', cta:'Order Now'  },
  cafe:          { bg:'#fef3c7', accent:'#d97706', dark:'#78350f', label:'CAFÉ / BAKERY',         emoji:'☕', cta:'Visit Us'   },
  bakery:        { bg:'#fef3c7', accent:'#d97706', dark:'#78350f', label:'BAKERY',                emoji:'🥐', cta:'Order Now'  },
  tiffin:        { bg:'#fef3c7', accent:'#d97706', dark:'#78350f', label:'TIFFIN SERVICE',        emoji:'🥗', cta:'Subscribe'  },
  // real estate
  'real estate': { bg:'#fff7ed', accent:'#c2410c', dark:'#7c2d12', label:'REAL ESTATE',           emoji:'🏠', cta:'Site Visit' },
  realestate:    { bg:'#fff7ed', accent:'#c2410c', dark:'#7c2d12', label:'REAL ESTATE',           emoji:'🏘️', cta:'Site Visit' },
  property:      { bg:'#fff7ed', accent:'#c2410c', dark:'#7c2d12', label:'REAL ESTATE',           emoji:'🏗️', cta:'Site Visit' },
  builder:       { bg:'#fff7ed', accent:'#c2410c', dark:'#7c2d12', label:'REAL ESTATE',           emoji:'🏢', cta:'Site Visit' },
  // transport
  transport:     { bg:'#eff6ff', accent:'#2563eb', dark:'#1e3a8a', label:'TRANSPORT / LOGISTICS', emoji:'🚛', cta:'Connect'    },
  logistics:     { bg:'#eff6ff', accent:'#2563eb', dark:'#1e3a8a', label:'TRANSPORT / LOGISTICS', emoji:'📦', cta:'Connect'    },
  auto:          { bg:'#eff6ff', accent:'#2563eb', dark:'#1e3a8a', label:'AUTO / VEHICLE',        emoji:'🛺', cta:'Book Now'   },
  automobile:    { bg:'#eff6ff', accent:'#2563eb', dark:'#1e3a8a', label:'AUTO / VEHICLE',        emoji:'🚗', cta:'Connect'    },
  courier:       { bg:'#eff6ff', accent:'#2563eb', dark:'#1e3a8a', label:'COURIER',               emoji:'📮', cta:'Connect'    },
  // education
  education:     { bg:'#eff6ff', accent:'#1d4ed8', dark:'#1e3a8a', label:'EDUCATION',             emoji:'📚', cta:'Enroll Now' },
  coaching:      { bg:'#eff6ff', accent:'#1d4ed8', dark:'#1e3a8a', label:'COACHING',              emoji:'🎓', cta:'Enroll Now' },
  tuition:       { bg:'#eff6ff', accent:'#1d4ed8', dark:'#1e3a8a', label:'TUITION',               emoji:'✏️', cta:'Enroll Now' },
  academy:       { bg:'#eff6ff', accent:'#1d4ed8', dark:'#1e3a8a', label:'ACADEMY',               emoji:'🏫', cta:'Enroll Now' },
  // medical
  hospital:      { bg:'#f0fdf4', accent:'#16a34a', dark:'#14532d', label:'HEALTHCARE',            emoji:'🏥', cta:'Book Now'   },
  clinic:        { bg:'#f0fdf4', accent:'#16a34a', dark:'#14532d', label:'CLINIC',                emoji:'⚕️', cta:'Book Now'   },
  pharmacy:      { bg:'#f0fdf4', accent:'#16a34a', dark:'#14532d', label:'PHARMACY',              emoji:'💊', cta:'Contact'    },
  // fashion / retail
  fashion:       { bg:'#fdf4ff', accent:'#9333ea', dark:'#581c87', label:'FASHION',               emoji:'👗', cta:'Shop Now'   },
  clothing:      { bg:'#fdf4ff', accent:'#9333ea', dark:'#581c87', label:'FASHION / CLOTHING',    emoji:'👕', cta:'Shop Now'   },
  retail:        { bg:'#fdf4ff', accent:'#9333ea', dark:'#581c87', label:'RETAIL',                emoji:'🛍️', cta:'Shop Now'   },
  jewellery:     { bg:'#fef9c3', accent:'#ca8a04', dark:'#713f12', label:'JEWELLERY',             emoji:'💍', cta:'Visit Us'   },
  jewelry:       { bg:'#fef9c3', accent:'#ca8a04', dark:'#713f12', label:'JEWELLERY',             emoji:'💎', cta:'Visit Us'   },
  // tech
  software:      { bg:'#f0f9ff', accent:'#0284c7', dark:'#0c4a6e', label:'TECH / SOFTWARE',       emoji:'💻', cta:'Connect'    },
  technology:    { bg:'#f0f9ff', accent:'#0284c7', dark:'#0c4a6e', label:'TECHNOLOGY',            emoji:'🖥️', cta:'Connect'    },
  // events
  wedding:       { bg:'#fdf4ff', accent:'#c026d3', dark:'#701a75', label:'WEDDING / EVENTS',      emoji:'💒', cta:'Book Now'   },
  photography:   { bg:'#fdf4ff', accent:'#c026d3', dark:'#701a75', label:'PHOTOGRAPHY',           emoji:'📸', cta:'Book Now'   },
  event:         { bg:'#fdf4ff', accent:'#c026d3', dark:'#701a75', label:'EVENTS',                emoji:'🎉', cta:'Book Now'   },
  // default
  default:       { bg:'#f8fafc', accent:'#f97316', dark:'#7c2d12', label:'BUSINESS',              emoji:'🏪', cta:'Contact'    },
};

function getCatConfig(category) {
  const key = (category || '').toLowerCase().trim();
  // exact match first
  if (CAT_MAP[key]) return CAT_MAP[key];
  // partial match
  for (const [k, v] of Object.entries(CAT_MAP)) {
    if (k === 'default') continue;
    if (key.includes(k) || k.includes(key)) return v;
  }
  return CAT_MAP.default;
}

export function BannerCard({ promo }) {
  if (!promo) return null;

  const name        = promo.bizName || promo.businessName || promo.name || '';
  const tagline     = promo.tagline || promo.offer || '';
  const description = promo.description || '';
  const category    = promo.category || '';
  const phone       = promo.phone || '';
  const location    = promo.location || promo.city || '';
  const address     = promo.address || '';
  const isPopular   = promo.plan === 'premium' || promo.plan === 'popular';

  const cfg    = getCatConfig(category);
  const avatar = (name || 'B').charAt(0).toUpperCase();

  return (
    <View style={[rc.card, { backgroundColor: cfg.bg, borderColor: cfg.accent + '33' }]}>

      {/* ── Top row: category pill + plan badge ── */}
      <View style={rc.topRow}>
        {/* Arrow-shaped category pill */}
        <View style={rc.pillWrap}>
          <View style={[rc.pillArrow, { borderRightColor: cfg.accent }]} />
          <View style={[rc.pillBody, { backgroundColor: cfg.accent }]}>
            <Text style={rc.pillTxt}>{(category || cfg.label).toUpperCase()}</Text>
          </View>
        </View>

        {/* Plan badge */}
        <View style={[rc.planBadge, { backgroundColor: isPopular ? '#fbbf24' : cfg.accent + '22',
                                       borderColor: isPopular ? '#f59e0b' : cfg.accent + '55' }]}>
          <Text style={[rc.planTxt, { color: isPopular ? '#78350f' : cfg.dark }]}>
            {isPopular ? '★ POPULAR' : 'AD'}
          </Text>
        </View>
      </View>

      {/* ── Body: left content + right avatar ── */}
      <View style={rc.body}>
        <View style={rc.left}>
          {/* Emoji icon */}
          <Text style={rc.emoji}>{cfg.emoji}</Text>

          {/* Business name */}
          <Text style={[rc.name, { color: cfg.dark }]} numberOfLines={1}>{name}</Text>

          {/* Tagline */}
          {!!tagline && (
            <Text style={[rc.tagline, { color: cfg.accent }]} numberOfLines={1}>{tagline}</Text>
          )}

          {/* Description */}
          {!!description && (
            <Text style={[rc.desc, { color: cfg.dark + 'cc' }]} numberOfLines={2}>{description}</Text>
          )}

          {/* Phone */}
          {!!phone && (
            <View style={rc.infoRow}>
              <Text style={rc.infoIcon}>📞</Text>
              <Text style={[rc.infoTxt, { color: cfg.dark }]}>{phone}</Text>
            </View>
          )}

          {/* Location */}
          {!!location && (
            <View style={rc.infoRow}>
              <Text style={rc.infoIcon}>📍</Text>
              <Text style={[rc.infoTxt, { color: cfg.accent }]} numberOfLines={1}>{location}</Text>
            </View>
          )}

          {/* Address */}
          {!!address && (
            <View style={rc.infoRow}>
              <Text style={rc.infoIcon}>🏢</Text>
              <Text style={[rc.infoTxt, { color: cfg.dark }]} numberOfLines={1}>{address}</Text>
            </View>
          )}

          {/* CTA button */}
          <TouchableOpacity
            style={[rc.ctaBtn, { backgroundColor: cfg.accent }]}
            onPress={() => phone && Linking.openURL(`tel:${phone}`)}
            activeOpacity={0.82}
          >
            <Text style={[rc.ctaTxt, { color: '#fff' }]}>{cfg.cta}</Text>
          </TouchableOpacity>
        </View>

        {/* Right: avatar */}
        <View style={rc.right}>
          <View style={[rc.avatar, { backgroundColor: cfg.accent, shadowColor: cfg.accent }]}>
            <Text style={[rc.avatarTxt, { color: '#fff' }]}>{avatar}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/* BannerCard styles */
const rc = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  pillWrap: { flexDirection: 'row', alignItems: 'center' },
  pillArrow: {
    width: 0, height: 0,
    borderTopWidth: 9, borderBottomWidth: 9, borderRightWidth: 10,
    borderTopColor: 'transparent', borderBottomColor: 'transparent',
  },
  pillBody: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderTopRightRadius: 4, borderBottomRightRadius: 4,
  },
  pillTxt: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.8 },
  planBadge: {
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  planTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  body: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 6,
    alignItems: 'flex-start',
  },
  left: { flex: 1, gap: 4 },
  right: { marginLeft: 12, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4 },
  emoji: { fontSize: 22, marginBottom: 2 },
  name: { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  tagline: { fontSize: 12, fontWeight: '700' },
  desc: { fontSize: 11, lineHeight: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  infoIcon: { fontSize: 11 },
  infoTxt: { fontSize: 12, fontWeight: '500', flex: 1 },
  ctaBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 24,
  },
  ctaTxt: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowOpacity: 0.3, shadowRadius: 6,
  },
  avatarTxt: { fontSize: 24, fontWeight: '900' },
});

/* ═══════════════════════════════════════════════════════════════
   BannerWithPicker — self-contained banner + template picker
   Usage anywhere you want users to pick a style before posting:
     <BannerWithPicker data={bizData} onTemplateChange={id => ...} />
═══════════════════════════════════════════════════════════════ */
export function BannerWithPicker({ data, defaultTemplateId, onTemplateChange }) {
  const initId = defaultTemplateId
    ? Number(defaultTemplateId)
    : autoTemplate(data?.category);
  const [selectedId, setSelectedId] = useState(initId);

  function handleSelect(id) {
    setSelectedId(id);
    if (onTemplateChange) onTemplateChange(id);
  }

  if (!data?.name) return null;
  const tmpl = getTemplateById(selectedId);

  return (
    <View>
      <Banner data={data} tmpl={tmpl} />
      <TemplatePicker selected={selectedId} onSelect={handleSelect} />
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN DEFAULT EXPORT — simple banner, no picker
   Pass templateId prop to override auto-selection.
═══════════════════════════════════════════════════════════════ */
export default function PromoBanner({ data }) {
  if (!data || !data.name) return null;
  // Reuse the rich BannerCard design for consistency — wrap data as a promo-shaped object
  return <BannerCard promo={{
    bizName:     data.name,
    tagline:     data.tagline     || '',
    description: data.description || '',
    category:    data.category    || '',
    phone:       data.phone       || '',
    location:    data.location    || '',
    address:     data.address     || '',
    plan:        data.plan        || 'popular',
  }} />;
}

/* ═══════════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════════ */
const bn = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 155,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  /* ── left panel ── */
  left: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'center',
    gap: 3,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderRightWidth: 11,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  tagBody: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  tagTxt: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  bizName: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '700',
  },
  desc: {
    fontSize: 10,
    lineHeight: 14,
    opacity: 0.85,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locPin: {
    fontSize: 11,
    marginRight: 4,
  },
  locTxt: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  callIcon: {
    fontSize: 13,
  },
  callTxt: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  phone: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 5,
    opacity: 0.75,
  },
  /* ── right panel ── */
  right: {
    width: 105,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  stripe: {
    position: 'absolute',
    width: 2.5,
    height: '130%',
    transform: [{ rotate: '15deg' }],
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  avatarTxt: {
    fontSize: 28,
    fontWeight: '900',
  },
  iconBadge: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 5,
  },
  offerBadge: {
    borderRadius: 22,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  offerTxt: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bolt: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    fontSize: 16,
    opacity: 0.6,
  },
});

const pk = StyleSheet.create({
  wrap: {
    marginTop: 10,
  },
  heading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  swatch: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 6,
  },
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  dotTxt: {
    fontSize: 13,
    fontWeight: '900',
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  check: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkTxt: {
    fontSize: 9,
    fontWeight: '900',
  },
});
