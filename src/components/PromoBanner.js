import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';

/**
 * PromoBanner — 4 graphic ad-style layouts mapped by business category
 *
 * Layout 1 — FireSale    : Retail, Fashion, Events, Shopping
 * Layout 2 — DarkNeon    : Transport, Tech, Auto, Electronics
 * Layout 3 — FreshTeal   : Salon, Food, Healthcare, Gym, Bakery
 * Layout 4 — PrestigeGold: Finance, Jewellery, Legal, Real Estate
 *
 * USAGE:
 *   <PromoBanner data={{
 *     name: "Jairaj Salon",
 *     category: "Salon",
 *     phone: "8625888869",
 *     location: "Nanded City, Pune",
 *     website: "jairajsalon.in",
 *     tagline: "Premium beauty experience",
 *     description: "Award-winning unisex salon.",
 *     features: ["Walk-ins welcome", "Bridal packages available"],
 *     discountOffer: 20,
 *     isPopular: true,
 *     plan: "Pro",
 *     verified: true,
 *     rating: 4.8,
 *     reviewCount: 312,
 *     photoUrl: "https://...",
 *   }} />
 */

/* ─── Layout routing ─── */
const LAYOUT_MAP = {
  firesale: ['retail', 'fashion', 'events', 'shopping', 'clothing'],
  darkneon: ['transport', 'tech', 'auto', 'electronics', 'logistics'],
  freshteal: ['salon', 'beauty', 'food', 'healthcare', 'gym', 'bakery', 'catering'],
  prestige: ['finance', 'jewellery', 'jewelry', 'legal', 'realestate', 'insurance'],
};

function getLayout(category = '') {
  const key = (category || '').toLowerCase().replace(/\s+/g, '');
  for (const [layout, cats] of Object.entries(LAYOUT_MAP)) {
    if (cats.some(c => key.includes(c) || c.includes(key))) return layout;
  }
  return 'freshteal';
}

function callBusiness(phone) {
  if (phone) Linking.openURL(`tel:${phone}`);
}

/* ─── Shared mini-components ─── */
function Badge({ bg, color, text }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginRight: 6 }}>
      <Text style={{ color, fontSize: 10, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

function CheckItem({ text, color = '#c4b5fd' }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
      <Text style={{ color, fontSize: 12, marginRight: 5 }}>✓</Text>
      <Text style={{ color, fontSize: 12, flex: 1 }}>{text}</Text>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT 1 — FIRE SALE
   Deep red · big typography · starburst · circle photo
═══════════════════════════════════════════════════════ */
function LayoutFireSale({ data }) {
  return (
    <View style={s.b1Outer}>
      {/* Background decorative circles */}
      <View style={s.b1Blob1} />
      <View style={s.b1Blob2} />

      {/* Left: typography + CTA */}
      <View style={s.b1Left}>
        <Text style={s.b1Pre}>Limited Time Only</Text>
        <Text style={s.b1T1}>Biggest</Text>
        <Text style={s.b1T2}>Sale!</Text>
        {!!data.tagline && <Text style={s.b1Tagline}>{data.tagline}</Text>}
        <View style={s.b1BottomRow}>
          <TouchableOpacity
            style={s.b1Btn}
            onPress={() => callBusiness(data.phone)}
            activeOpacity={0.8}
          >
            <Text style={s.b1BtnTxt}>Shop Now</Text>
          </TouchableOpacity>
          <View style={s.b1ContactWrap}>
            {!!data.website && <Text style={s.b1Contact}>{data.website}</Text>}
            {!!data.phone  && <Text style={s.b1Contact}>{data.phone}</Text>}
          </View>
        </View>
      </View>

      {/* Starburst badge */}
      {!!data.discountOffer && (
        <View style={s.b1Starburst}>
          <Text style={s.b1StarPct}>{data.discountOffer}%</Text>
          <Text style={s.b1StarOff}>OFF</Text>
        </View>
      )}

      {/* Right: circle photo frame */}
      <View style={s.b1PhotoCol}>
        <View style={s.b1Frame}>
          <Text style={s.b1FrameLetter}>
            {(data.name || 'B').charAt(0).toUpperCase()}
          </Text>
          {/* Swap with: <Image source={{ uri: data.photoUrl }} style={s.fillCircle} /> */}
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT 2 — DARK NEON SPLIT
   Near-black · purple accents · split right panel
═══════════════════════════════════════════════════════ */
function LayoutDarkNeon({ data }) {
  return (
    <View style={s.b2Outer}>
      {/* Left panel */}
      <View style={s.b2Left}>
        <View style={s.b2GlowCircle} />

        {/* Badges */}
        <View style={s.row}>
          {!!data.category && <Badge bg="#6d28d9" color="#ede9fe" text={data.category.toUpperCase()} />}
          {!!data.plan     && <Badge bg="#ca8a04" color="#fef9c3" text={data.plan.toUpperCase()} />}
        </View>

        {/* Name + tagline */}
        <Text style={s.b2Name}>{data.name || ''}</Text>
        {!!data.tagline && <Text style={s.b2Tagline}>{data.tagline}</Text>}

        {/* Features */}
        <View style={s.featureList}>
          {(data.features || []).slice(0, 2).map((f, i) => (
            <CheckItem key={i} text={f} color="#c4b5fd" />
          ))}
        </View>

        {/* Footer: contacts + CTA */}
        <View style={s.b2Footer}>
          <View>
            {!!data.phone    && <Text style={s.b2Con}>{data.phone}</Text>}
            {!!data.location && <Text style={s.b2Con}>{data.location}</Text>}
          </View>
          <TouchableOpacity
            style={s.b2Btn}
            onPress={() => callBusiness(data.phone)}
            activeOpacity={0.8}
          >
            <Text style={s.b2BtnTxt}>Connect</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Right panel */}
      <View style={s.b2Right}>
        <View style={s.b2RightAccent} />
        <View style={s.b2PhotoCirc}>
          <Text style={s.b2PhotoLetter}>
            {(data.name || 'B').charAt(0).toUpperCase()}
          </Text>
          {/* Swap: <Image source={{ uri: data.photoUrl }} style={s.fillCircle} /> */}
        </View>
        {!!data.discountOffer && (
          <View style={s.b2DiscBadge}>
            <Text style={s.b2DiscPct}>{data.discountOffer}%</Text>
            <Text style={s.b2DiscOff}>OFF</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT 3 — FRESH TEAL
   Teal left · organic blobs · white info right
═══════════════════════════════════════════════════════ */
function LayoutFreshTeal({ data }) {
  return (
    <View style={s.b3Outer}>
      {/* Left: teal panel */}
      <View style={s.b3Left}>
        <View style={s.b3Blob1} />
        <View style={s.b3Blob2} />

        {/* Starburst */}
        {!!data.discountOffer && (
          <View style={s.b3Star}>
            <Text style={s.b3StarPct}>{data.discountOffer}%</Text>
            <Text style={s.b3StarOff}>OFF</Text>
          </View>
        )}

        {/* Circle photo, top-right of panel */}
        <View style={s.b3PhotoWrap}>
          <View style={s.b3Photo}>
            <Text style={s.b3PhotoLetter}>
              {(data.name || 'B').charAt(0).toUpperCase()}
            </Text>
            {/* Swap: <Image source={{ uri: data.photoUrl }} style={s.fillCircle} /> */}
          </View>
        </View>

        {/* Business name at bottom */}
        <View style={s.b3NameWrap}>
          <Text style={s.b3Name} numberOfLines={1}>{data.name || ''}</Text>
          {!!data.location && <Text style={s.b3Sub}>{data.location}</Text>}
        </View>
      </View>

      {/* Right: info panel */}
      <View style={s.b3Right}>
        {/* Badges */}
        <View style={s.row}>
          {!!data.category && <Badge bg="#ccfbf1" color="#0f766e" text={data.category} />}
          {data.isPopular  && <Badge bg="#fef3c7" color="#92400e" text="Popular" />}
        </View>

        {/* Description */}
        {!!data.description && (
          <Text style={s.b3Desc} numberOfLines={2}>{data.description}</Text>
        )}

        {/* Features */}
        <View style={s.featureList}>
          {(data.features || []).slice(0, 2).map((f, i) => (
            <CheckItem key={i} text={f} color="#1e293b" />
          ))}
        </View>

        {/* Footer */}
        <View style={s.b3Footer}>
          <View>
            {!!data.phone   && <Text style={s.b3Con}>{data.phone}</Text>}
            {!!data.website && <Text style={s.b3Con}>{data.website}</Text>}
          </View>
          <TouchableOpacity
            style={s.b3Btn}
            onPress={() => callBusiness(data.phone)}
            activeOpacity={0.8}
          >
            <Text style={s.b3BtnTxt}>Call Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT 4 — PRESTIGE GOLD
   Dark brown · gold accents · diamond frame
═══════════════════════════════════════════════════════ */
function LayoutPrestigeGold({ data }) {
  return (
    <View style={s.b4Outer}>
      {/* Left panel */}
      <View style={s.b4Left}>
        {/* Decorative vertical lines */}
        <View style={s.b4Line1} />
        <View style={s.b4Line2} />
        {/* Corner brackets */}
        <View style={s.b4CornerTL} />
        <View style={s.b4CornerBR} />

        {/* Badges */}
        <View style={s.row}>
          {!!data.category && <Badge bg="#78350f" color="#fde68a" text={data.category.toUpperCase()} />}
          {data.verified   && <Badge bg="#14532d" color="#bbf7d0" text="✓ Verified" />}
        </View>

        {/* Name + tagline */}
        <Text style={s.b4Name}>{data.name || ''}</Text>
        {!!data.tagline && <Text style={s.b4Tagline}>{data.tagline}</Text>}

        {/* Features */}
        <View style={s.featureList}>
          {(data.features || []).slice(0, 2).map((f, i) => (
            <CheckItem key={i} text={f} color="#d6d3d1" />
          ))}
        </View>

        {/* Footer */}
        <View style={s.b4Footer}>
          <View>
            {!!data.phone    && <Text style={s.b4Con}>{data.phone}</Text>}
            {!!data.location && <Text style={s.b4Con}>{data.location}</Text>}
          </View>
          <TouchableOpacity
            style={s.b4Btn}
            onPress={() => callBusiness(data.phone)}
            activeOpacity={0.8}
          >
            <Text style={s.b4BtnTxt}>Enquire →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Right: diamond photo + rating */}
      <View style={s.b4Right}>
        {!!data.plan && (
          <View style={s.b4PlanPill}>
            <Text style={s.b4PlanTxt}>{data.plan.toUpperCase()}</Text>
          </View>
        )}
        <View style={s.b4DiamondOuter}>
          <View style={s.b4DiamondRing} />
          <View style={s.b4DiamondInner}>
            <Text style={s.b4PhotoLetter}>
              {(data.name || 'B').charAt(0).toUpperCase()}
            </Text>
            {/* Swap: <Image source={{ uri: data.photoUrl }} style={s.fillCircle} /> */}
          </View>
        </View>
        {!!data.rating && (
          <Text style={s.b4Rating}>
            ★ {data.rating}
            {data.reviewCount ? ` · ${data.reviewCount} reviews` : ''}
          </Text>
        )}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════ */
export default function PromoBanner({ data }) {
  if (!data || !data.name) return null;
  const layout = getLayout(data.category);
  if (layout === 'firesale') return <LayoutFireSale data={data} />;
  if (layout === 'darkneon') return <LayoutDarkNeon data={data} />;
  if (layout === 'prestige') return <LayoutPrestigeGold data={data} />;
  return <LayoutFreshTeal data={data} />;
}

/* ═══════════════════════════════════════════════════════
   STYLES
   NOTE: No `gap` (unsupported in older RN) — use margin instead.
         No `inset` shorthand — use top/left/right/bottom explicitly.
         No `position:'relative'` on flex children (default).
═══════════════════════════════════════════════════════ */
const s = StyleSheet.create({
  /* Shared */
  row: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  featureList: { marginBottom: 4 },
  fillCircle: { width: '100%', height: '100%', borderRadius: 999 },

  /* ── LAYOUT 1: FIRE SALE ── */
  b1Outer: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 200,
    backgroundColor: '#9f1239',
    flexDirection: 'row',
    alignItems: 'center',
  },
  b1Blob1: {
    position: 'absolute',
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: '#7f1d1d',
    top: -80, left: -60,
  },
  b1Blob2: {
    position: 'absolute',
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: '#991b1b',
    bottom: -60, right: 100,
  },
  b1Left: {
    flex: 1,
    paddingLeft: 22,
    paddingVertical: 18,
    zIndex: 2,
  },
  b1Pre: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
    color: '#fca5a5', textTransform: 'uppercase', marginBottom: 2,
  },
  b1T1: {
    fontSize: 36, fontWeight: '900', color: '#ffffff',
    lineHeight: 38, textTransform: 'uppercase',
  },
  b1T2: {
    fontSize: 48, fontWeight: '900', color: '#fbbf24',
    lineHeight: 50, textTransform: 'uppercase',
  },
  b1Tagline: { fontSize: 11, color: '#fca5a5', fontStyle: 'italic', marginTop: 4 },
  b1BottomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  b1Btn: {
    backgroundColor: '#fbbf24', borderRadius: 24,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 10,
  },
  b1BtnTxt: { color: '#7c2d12', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  b1ContactWrap: {},
  b1Contact: { fontSize: 10, color: '#fca5a5', lineHeight: 16 },
  b1Starburst: {
    position: 'absolute',
    right: 162, top: 65,
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#fbbf24',
    borderWidth: 3, borderColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 3,
  },
  b1StarPct: { fontSize: 20, fontWeight: '900', color: '#7c2d12', lineHeight: 22 },
  b1StarOff: { fontSize: 8, fontWeight: '700', color: '#92400e', textTransform: 'uppercase' },
  b1PhotoCol: {
    width: 160,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 14,
    zIndex: 2,
  },
  b1Frame: {
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: '#7f1d1d',
    borderWidth: 3, borderColor: '#fbbf24',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  b1FrameLetter: { fontSize: 48, fontWeight: '900', color: '#fca5a5' },

  /* ── LAYOUT 2: DARK NEON ── */
  b2Outer: {
    borderRadius: 16, overflow: 'hidden',
    height: 200, flexDirection: 'row',
    backgroundColor: '#0f172a',
  },
  b2Left: {
    flex: 1, padding: 18,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  b2GlowCircle: {
    position: 'absolute',
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: '#6d28d9', opacity: 0.18,
    top: -70, right: -30,
  },
  b2Name: {
    fontSize: 26, fontWeight: '900',
    color: '#ffffff', lineHeight: 28, marginBottom: 2,
  },
  b2Tagline: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginBottom: 6 },
  b2Footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  b2Con: { fontSize: 11, color: '#94a3b8', lineHeight: 17 },
  b2Btn: {
    backgroundColor: '#7c3aed', borderRadius: 24,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  b2BtnTxt: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  b2Right: {
    width: 175, backgroundColor: '#1e1b4b',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  b2RightAccent: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: '#312e81',
    // Diagonal cut via clip is not available in RN; solid bg suffices
  },
  b2PhotoCirc: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#4338ca',
    borderWidth: 2, borderColor: '#7c3aed',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 1,
    overflow: 'hidden',
  },
  b2PhotoLetter: { fontSize: 40, fontWeight: '900', color: '#a5b4fc' },
  b2DiscBadge: {
    position: 'absolute', top: 10, right: 10,
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#f59e0b',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 2,
  },
  b2DiscPct: { fontSize: 14, fontWeight: '900', color: '#7c2d12', lineHeight: 16 },
  b2DiscOff: { fontSize: 8, fontWeight: '700', color: '#92400e', textTransform: 'uppercase' },

  /* ── LAYOUT 3: FRESH TEAL ── */
  b3Outer: {
    borderRadius: 16, overflow: 'hidden',
    height: 200, flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  b3Left: {
    width: 210, backgroundColor: '#0d9488',
    padding: 16, justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  b3Blob1: {
    position: 'absolute',
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: '#0f766e',
    top: -45, right: -40,
  },
  b3Blob2: {
    position: 'absolute',
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#115e59',
    bottom: -25, left: -20,
  },
  b3Star: {
    position: 'absolute', left: 12, top: 12, zIndex: 2,
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#f59e0b',
    borderWidth: 2, borderColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
  },
  b3StarPct: { fontSize: 14, fontWeight: '900', color: '#7c2d12', lineHeight: 16 },
  b3StarOff: { fontSize: 7, fontWeight: '700', color: '#92400e', textTransform: 'uppercase' },
  b3PhotoWrap: {
    position: 'absolute', top: 12, right: 12, zIndex: 1,
  },
  b3Photo: {
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: '#0f766e',
    borderWidth: 3, borderColor: '#5eead4',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  b3PhotoLetter: { fontSize: 28, fontWeight: '900', color: '#99f6e4' },
  b3NameWrap: { zIndex: 1 },
  b3Name: { fontSize: 19, fontWeight: '900', color: '#ffffff', lineHeight: 21 },
  b3Sub: { fontSize: 11, color: '#99f6e4', marginTop: 2 },
  b3Right: { flex: 1, padding: 14, justifyContent: 'space-between' },
  b3Desc: { fontSize: 12, color: '#475569', lineHeight: 18, marginBottom: 4 },
  b3Footer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  b3Con: { fontSize: 11, color: '#64748b', lineHeight: 17 },
  b3Btn: {
    backgroundColor: '#0d9488', borderRadius: 24,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  b3BtnTxt: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

  /* ── LAYOUT 4: PRESTIGE GOLD ── */
  b4Outer: {
    borderRadius: 16, overflow: 'hidden',
    height: 200, flexDirection: 'row',
    backgroundColor: '#1c1917',
  },
  b4Left: {
    flex: 1, padding: 18,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  b4Line1: {
    position: 'absolute', top: 0, bottom: 0,
    left: 70, width: 1,
    backgroundColor: 'rgba(251,191,36,0.12)',
  },
  b4Line2: {
    position: 'absolute', top: 0, bottom: 0,
    left: 140, width: 1,
    backgroundColor: 'rgba(251,191,36,0.07)',
  },
  b4CornerTL: {
    position: 'absolute', top: 12, left: 12,
    width: 22, height: 22,
    borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#d97706',
  },
  b4CornerBR: {
    position: 'absolute', bottom: 12, right: 12,
    width: 22, height: 22,
    borderBottomWidth: 2, borderRightWidth: 2, borderColor: '#d97706',
  },
  b4Name: {
    fontSize: 24, fontWeight: '900', color: '#fbbf24', lineHeight: 26,
  },
  b4Tagline: { fontSize: 11, color: '#a8a29e', fontStyle: 'italic', marginBottom: 4 },
  b4Footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  b4Con: { fontSize: 11, color: '#a8a29e', lineHeight: 17 },
  b4Btn: {
    backgroundColor: '#d97706', borderRadius: 24,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  b4BtnTxt: { color: '#fff8e1', fontSize: 12, fontWeight: '700' },
  b4Right: {
    width: 190, backgroundColor: '#292524',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  b4PlanPill: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: '#d97706', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  b4PlanTxt: { fontSize: 10, fontWeight: '700', color: '#fff8e1', letterSpacing: 0.6 },
  b4DiamondOuter: {
    width: 100, height: 100,
    alignItems: 'center', justifyContent: 'center',
  },
  b4DiamondRing: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 2, borderColor: '#d97706',
    transform: [{ rotate: '45deg' }],
    borderRadius: 6,
  },
  b4DiamondInner: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#44403c',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 1,
  },
  b4PhotoLetter: { fontSize: 26, fontWeight: '900', color: '#d97706' },
  b4Rating: {
    fontSize: 12, fontWeight: '700', color: '#fbbf24', marginTop: 8,
  },
});
