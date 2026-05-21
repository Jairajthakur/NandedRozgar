import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking } from 'react-native';

/**
 * PromoBanner — 4 graphic ad-style layouts mapped by business category
 *
 * Layout 1 — FireSale    : Retail, Fashion, Events, Shopping
 * Layout 2 — DarkNeon    : Transport, Tech, Auto, Electronics
 * Layout 3 — FreshTeal   : Salon, Food, Healthcare, Gym, Bakery
 * Layout 4 — PrestigeGold: Finance, Jewellery, Legal, Real Estate
 */

const LAYOUT_MAP = {
  firesale: ['retail', 'fashion', 'events', 'shopping', 'clothing'],
  darkneon: ['transport', 'tech', 'auto', 'electronics', 'logistics'],
  freshteal: ['salon', 'beauty', 'food', 'healthcare', 'gym', 'bakery', 'catering'],
  prestige: ['finance', 'jewellery', 'jewelry', 'legal', 'realestate', 'insurance'],
};

function getLayout(category = '') {
  const key = category.toLowerCase().replace(/\s+/g, '');
  for (const [layout, cats] of Object.entries(LAYOUT_MAP)) {
    if (cats.some(c => key.includes(c) || c.includes(key))) return layout;
  }
  return 'freshteal';
}

function callBusiness(phone) {
  Linking.openURL(`tel:${phone}`);
}

/* ─────────────────────────────────────────────
   LAYOUT 1: FIRE SALE
   Red background · starburst discount · circle photo frame
───────────────────────────────────────────── */
function LayoutFireSale({ data }) {
  return (
    <View style={s.b1}>
      {/* Decorative blobs */}
      <View style={s.b1Circle1} />
      <View style={s.b1Circle2} />

      {/* Left: text content */}
      <View style={s.b1Left}>
        <Text style={s.b1PreTitle}>Limited Time Only</Text>
        <Text style={s.b1Title1}>Biggest</Text>
        <Text style={s.b1Title2}>Sale!</Text>
        {data.tagline ? (
          <Text style={s.b1Tagline}>{data.tagline}</Text>
        ) : null}
        <View style={s.b1Bottom}>
          <TouchableOpacity style={s.b1Btn} onPress={() => callBusiness(data.phone)}>
            <Text style={s.b1BtnTxt}>Shop Now</Text>
          </TouchableOpacity>
          <View>
            {data.website ? <Text style={s.b1Contact}>{data.website}</Text> : null}
            {data.phone ? <Text style={s.b1Contact}>{data.phone}</Text> : null}
          </View>
        </View>
      </View>

      {/* Starburst discount badge */}
      {data.discountOffer ? (
        <View style={s.b1Starburst}>
          <Text style={s.b1StarPct}>{data.discountOffer}</Text>
          <Text style={s.b1StarOff}>OFF</Text>
        </View>
      ) : null}

      {/* Right: circle photo frame */}
      <View style={s.b1Photo}>
        <View style={s.b1Frame}>
          {/* Replace with <Image source={{ uri: data.photoUrl }} style={s.b1FrameImg} /> */}
          <Text style={s.b1FrameLabel}>Photo</Text>
        </View>
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────
   LAYOUT 2: DARK NEON SPLIT
   Dark left panel · purple accents · blob photo on right
───────────────────────────────────────────── */
function LayoutDarkNeon({ data }) {
  return (
    <View style={s.b2}>
      {/* Left: all info */}
      <View style={s.b2Left}>
        <View style={s.b2Glow} />
        <View style={s.badgeRow}>
          {data.category ? (
            <View style={[s.badge, s.b2CatBadge]}>
              <Text style={s.b2CatTxt}>{data.category}</Text>
            </View>
          ) : null}
          {data.plan ? (
            <View style={[s.badge, s.b2PlanBadge]}>
              <Text style={s.b2PlanTxt}>{data.plan}</Text>
            </View>
          ) : null}
        </View>
        <Text style={s.b2Name}>{data.name}</Text>
        {data.tagline ? <Text style={s.b2Tagline}>{data.tagline}</Text> : null}
        <View style={s.checkList}>
          {(data.features || []).slice(0, 2).map((f, i) => (
            <Text key={i} style={s.b2Check}>✓ {f}</Text>
          ))}
        </View>
        <View style={s.b2Footer}>
          <View style={s.contactRow}>
            {data.phone ? <Text style={s.b2Con}>{data.phone}</Text> : null}
            {data.location ? <Text style={s.b2Con}>{data.location}</Text> : null}
          </View>
          <TouchableOpacity style={s.b2Btn} onPress={() => callBusiness(data.phone)}>
            <Text style={s.b2BtnTxt}>Connect</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Right: photo panel */}
      <View style={s.b2Right}>
        <View style={s.b2RightAccent} />
        <View style={s.b2PhotoCirc}>
          {/* <Image source={{ uri: data.photoUrl }} style={s.circleImg} /> */}
          <Text style={s.b2PhotoLabel}>{data.name?.charAt(0)}</Text>
        </View>
        {data.discountOffer ? (
          <View style={s.b2DiscBadge}>
            <Text style={s.b2DiscTxt}>{data.discountOffer}%</Text>
            <Text style={s.b2DiscOff}>OFF</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────
   LAYOUT 3: FRESH TEAL
   Teal left panel · starburst · white info right
───────────────────────────────────────────── */
function LayoutFreshTeal({ data }) {
  return (
    <View style={s.b3}>
      {/* Left: colored panel */}
      <View style={s.b3Left}>
        <View style={s.b3Blob1} />
        <View style={s.b3Blob2} />
        {data.discountOffer ? (
          <View style={s.b3Starburst}>
            <Text style={s.b3StarPct}>{data.discountOffer}%</Text>
            <Text style={s.b3StarOff}>OFF</Text>
          </View>
        ) : null}
        <View style={s.b3PhotoFrame}>
          {/* <Image source={{ uri: data.photoUrl }} style={s.circleImg} /> */}
          <Text style={s.b3PhotoPlaceholder}>{data.name?.charAt(0)}</Text>
        </View>
        <View style={s.b3NameWrap}>
          <Text style={s.b3Name}>{data.name}</Text>
          {data.location ? <Text style={s.b3Sub}>{data.location}</Text> : null}
        </View>
      </View>

      {/* Right: info */}
      <View style={s.b3Right}>
        <View style={s.badgeRow}>
          {data.category ? (
            <View style={[s.badge, s.b3CatBadge]}>
              <Text style={s.b3CatTxt}>{data.category}</Text>
            </View>
          ) : null}
          {data.isPopular ? (
            <View style={[s.badge, s.b3PopBadge]}>
              <Text style={s.b3PopTxt}>Popular</Text>
            </View>
          ) : null}
        </View>
        {data.description ? (
          <Text style={s.b3Desc} numberOfLines={2}>{data.description}</Text>
        ) : null}
        <View style={s.checkList}>
          {(data.features || []).slice(0, 2).map((f, i) => (
            <Text key={i} style={s.b3Check}>✓ {f}</Text>
          ))}
        </View>
        <View style={s.b3Footer}>
          <View style={s.contactRow}>
            {data.phone ? <Text style={s.b3Con}>{data.phone}</Text> : null}
            {data.website ? <Text style={s.b3Con}>{data.website}</Text> : null}
          </View>
          <TouchableOpacity style={s.b3Btn} onPress={() => callBusiness(data.phone)}>
            <Text style={s.b3BtnTxt}>Call Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────
   LAYOUT 4: PRESTIGE GOLD
   Dark background · gold accents · diamond frame
───────────────────────────────────────────── */
function LayoutPrestigeGold({ data }) {
  return (
    <View style={s.b4}>
      {/* Left: info */}
      <View style={s.b4Left}>
        <View style={s.b4DecorLine1} />
        <View style={s.b4DecorLine2} />
        <View style={s.b4CornerTL} />
        <View style={s.b4CornerBR} />
        <View style={s.badgeRow}>
          {data.category ? (
            <View style={[s.badge, s.b4CatBadge]}>
              <Text style={s.b4CatTxt}>{data.category}</Text>
            </View>
          ) : null}
          {data.verified ? (
            <View style={[s.badge, s.b4VerBadge]}>
              <Text style={s.b4VerTxt}>✓ Verified</Text>
            </View>
          ) : null}
        </View>
        <Text style={s.b4Name}>{data.name}</Text>
        {data.tagline ? <Text style={s.b4Tagline}>{data.tagline}</Text> : null}
        <View style={s.checkList}>
          {(data.features || []).slice(0, 2).map((f, i) => (
            <Text key={i} style={s.b4Check}>✓ {f}</Text>
          ))}
        </View>
        <View style={s.b4Footer}>
          <View style={s.contactRow}>
            {data.phone ? <Text style={s.b4Con}>{data.phone}</Text> : null}
            {data.location ? <Text style={s.b4Con}>{data.location}</Text> : null}
          </View>
          <TouchableOpacity style={s.b4Btn} onPress={() => callBusiness(data.phone)}>
            <Text style={s.b4BtnTxt}>Enquire →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Right: diamond photo frame */}
      <View style={s.b4Right}>
        {data.plan ? (
          <View style={s.b4PlanPill}>
            <Text style={s.b4PlanTxt}>{data.plan}</Text>
          </View>
        ) : null}
        <View style={s.b4DiamondWrap}>
          <View style={s.b4DiamondBorder} />
          <View style={s.b4DiamondInner}>
            {/* <Image source={{ uri: data.photoUrl }} style={s.circleImg} /> */}
            <Text style={s.b4PhotoLabel}>{data.name?.charAt(0)}</Text>
          </View>
        </View>
        {data.rating ? (
          <Text style={s.b4Rating}>★ {data.rating} · {data.reviewCount} reviews</Text>
        ) : null}
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────── */
export default function PromoBanner({ data }) {
  const layout = getLayout(data?.category);
  if (!data) return null;
  switch (layout) {
    case 'firesale':  return <LayoutFireSale data={data} />;
    case 'darkneon':  return <LayoutDarkNeon data={data} />;
    case 'prestige':  return <LayoutPrestigeGold data={data} />;
    default:          return <LayoutFreshTeal data={data} />;
  }
}

/* ─────────────────────────────────────────────
   EXAMPLE USAGE:

   <PromoBanner data={{
     name: "Jairaj Salon",
     category: "Salon",
     phone: "8625888869",
     location: "Nanded City, Pune",
     website: "jairajsalon.in",
     tagline: "Premium beauty experience",
     description: "Award-winning unisex salon. Certified stylists.",
     features: ["Walk-ins welcome", "Bridal packages available"],
     discountOffer: 20,
     isPopular: true,
     plan: "Pro",
     verified: true,
     rating: 4.8,
     reviewCount: 312,
     photoUrl: "https://...",
   }} />

   DATA FIELDS (all optional except name + phone):
   name          string   Business name
   category      string   Used for layout selection
   phone         string   Phone number (used for CTA call)
   location      string   City / area
   website       string   Website URL
   tagline       string   Italic subtitle under name
   description   string   Short description (2 lines max)
   features      string[] Up to 3 bullet checkmarks
   discountOffer number   Discount % for starburst badge
   isPopular     boolean  Shows "Popular" badge
   plan          string   "Basic" | "Pro" | "Premium" | "Gold"
   verified      boolean  Shows verified badge
   rating        number   Star rating e.g. 4.8
   reviewCount   number   Number of reviews
   photoUrl      string   Business photo URL
───────────────────────────────────────────── */

const s = StyleSheet.create({
  /* ── shared ── */
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  contactRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  checkList: { gap: 4 },
  circleImg: { width: '100%', height: '100%', borderRadius: 999 },

  /* ── LAYOUT 1: FIRE SALE ── */
  b1: {
    borderRadius: 18, overflow: 'hidden', height: 200,
    backgroundColor: '#9f1239', flexDirection: 'row', alignItems: 'center', position: 'relative',
  },
  b1Circle1: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    backgroundColor: '#7f1d1d', top: -80, left: -60,
  },
  b1Circle2: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: '#991b1b', bottom: -60, right: 120,
  },
  b1Left: { flex: 1, paddingLeft: 24, paddingVertical: 20, zIndex: 2 },
  b1PreTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, color: '#fca5a5', textTransform: 'uppercase', marginBottom: 2 },
  b1Title1: { fontSize: 38, fontWeight: '900', color: '#fff', lineHeight: 40, textTransform: 'uppercase' },
  b1Title2: { fontSize: 50, fontWeight: '900', color: '#fbbf24', lineHeight: 50, textTransform: 'uppercase' },
  b1Tagline: { fontSize: 11, color: '#fca5a5', marginTop: 4, fontStyle: 'italic' },
  b1Bottom: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  b1Btn: { backgroundColor: '#fbbf24', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8 },
  b1BtnTxt: { color: '#7c2d12', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  b1Contact: { fontSize: 10, color: '#fca5a5', lineHeight: 16 },
  b1Starburst: {
    position: 'absolute', right: 175, top: '50%', marginTop: -36,
    width: 72, height: 72, backgroundColor: '#fbbf24', zIndex: 3,
    alignItems: 'center', justifyContent: 'center', borderRadius: 36,
    borderWidth: 3, borderColor: '#fff',
  },
  b1StarPct: { fontSize: 20, fontWeight: '900', color: '#7c2d12', lineHeight: 22 },
  b1StarOff: { fontSize: 8, fontWeight: '700', color: '#92400e', textTransform: 'uppercase' },
  b1Photo: { width: 170, alignItems: 'center', justifyContent: 'center', paddingRight: 16, zIndex: 2 },
  b1Frame: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: '#7f1d1d', borderWidth: 3, borderColor: '#fbbf24',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  b1FrameLabel: { fontSize: 11, color: '#fca5a5', fontWeight: '600' },

  /* ── LAYOUT 2: DARK NEON ── */
  b2: { borderRadius: 18, overflow: 'hidden', height: 200, flexDirection: 'row', backgroundColor: '#0f172a' },
  b2Left: { flex: 1, padding: 20, justifyContent: 'space-between', position: 'relative', overflow: 'hidden' },
  b2Glow: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: '#6d28d9', opacity: 0.18, top: -70, right: -30,
  },
  b2CatBadge: { backgroundColor: '#6d28d9' },
  b2CatTxt: { fontSize: 10, fontWeight: '700', color: '#ede9fe', textTransform: 'uppercase', letterSpacing: 0.6 },
  b2PlanBadge: { backgroundColor: '#ca8a04' },
  b2PlanTxt: { fontSize: 10, fontWeight: '700', color: '#fef9c3', textTransform: 'uppercase', letterSpacing: 0.6 },
  b2Name: { fontSize: 28, fontWeight: '900', color: '#fff', lineHeight: 30 },
  b2Tagline: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' },
  b2Check: { fontSize: 12, color: '#c4b5fd' },
  b2Footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  b2Con: { fontSize: 11, color: '#94a3b8' },
  b2Btn: { backgroundColor: '#7c3aed', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8 },
  b2BtnTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  b2Right: { width: 180, backgroundColor: '#1e1b4b', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  b2RightAccent: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: '#312e81',
  },
  b2PhotoCirc: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#4338ca', borderWidth: 2, borderColor: '#7c3aed',
    alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  b2PhotoLabel: { fontSize: 36, fontWeight: '900', color: '#a5b4fc' },
  b2DiscBadge: {
    position: 'absolute', top: 10, right: 10, width: 46, height: 46,
    borderRadius: 23, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },
  b2DiscTxt: { fontSize: 14, fontWeight: '900', color: '#7c2d12', lineHeight: 16 },
  b2DiscOff: { fontSize: 8, fontWeight: '700', color: '#92400e', textTransform: 'uppercase' },

  /* ── LAYOUT 3: FRESH TEAL ── */
  b3: {
    borderRadius: 18, overflow: 'hidden', height: 200,
    flexDirection: 'row', backgroundColor: '#fff',
    borderWidth: 0.5, borderColor: '#e2e8f0',
  },
  b3Left: { width: 220, backgroundColor: '#0d9488', padding: 18, justifyContent: 'flex-end', position: 'relative', overflow: 'hidden' },
  b3Blob1: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: '#0f766e', top: -40, right: -40 },
  b3Blob2: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: '#115e59', bottom: -20, left: -20 },
  b3Starburst: {
    position: 'absolute', left: 14, top: 14, zIndex: 2,
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#f59e0b',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  b3StarPct: { fontSize: 14, fontWeight: '900', color: '#7c2d12', lineHeight: 16 },
  b3StarOff: { fontSize: 7, fontWeight: '700', color: '#92400e', textTransform: 'uppercase' },
  b3PhotoFrame: {
    position: 'absolute', top: 14, right: 14, width: 80, height: 80,
    borderRadius: 40, backgroundColor: '#0f766e', borderWidth: 3, borderColor: '#5eead4',
    alignItems: 'center', justifyContent: 'center', zIndex: 1, overflow: 'hidden',
  },
  b3PhotoPlaceholder: { fontSize: 28, fontWeight: '900', color: '#99f6e4' },
  b3NameWrap: { zIndex: 1 },
  b3Name: { fontSize: 20, fontWeight: '900', color: '#fff', lineHeight: 22 },
  b3Sub: { fontSize: 11, color: '#99f6e4', marginTop: 2 },
  b3Right: { flex: 1, padding: 16, justifyContent: 'space-between' },
  b3CatBadge: { backgroundColor: '#ccfbf1' },
  b3CatTxt: { fontSize: 11, fontWeight: '700', color: '#0f766e' },
  b3PopBadge: { backgroundColor: '#fef3c7' },
  b3PopTxt: { fontSize: 11, fontWeight: '700', color: '#92400e' },
  b3Desc: { fontSize: 12, color: '#475569', lineHeight: 18 },
  b3Check: { fontSize: 12, color: '#1e293b' },
  b3Footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 0.5, borderTopColor: '#e2e8f0' },
  b3Con: { fontSize: 11, color: '#64748b' },
  b3Btn: { backgroundColor: '#0d9488', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8 },
  b3BtnTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  /* ── LAYOUT 4: PRESTIGE GOLD ── */
  b4: { borderRadius: 18, overflow: 'hidden', height: 200, flexDirection: 'row', backgroundColor: '#1c1917' },
  b4Left: { flex: 1, padding: 20, justifyContent: 'space-between', position: 'relative', overflow: 'hidden' },
  b4DecorLine1: { position: 'absolute', top: 0, left: 70, width: 1, height: '100%', backgroundColor: 'rgba(251,191,36,0.12)' },
  b4DecorLine2: { position: 'absolute', top: 0, left: 140, width: 1, height: '100%', backgroundColor: 'rgba(251,191,36,0.07)' },
  b4CornerTL: { position: 'absolute', top: 14, left: 14, width: 24, height: 24, borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#d97706' },
  b4CornerBR: { position: 'absolute', bottom: 14, right: 14, width: 24, height: 24, borderBottomWidth: 2, borderRightWidth: 2, borderColor: '#d97706' },
  b4CatBadge: { backgroundColor: '#78350f', borderWidth: 0.5, borderColor: '#d97706' },
  b4CatTxt: { fontSize: 10, fontWeight: '700', color: '#fde68a', textTransform: 'uppercase', letterSpacing: 0.8 },
  b4VerBadge: { backgroundColor: '#14532d' },
  b4VerTxt: { fontSize: 10, fontWeight: '700', color: '#bbf7d0' },
  b4Name: { fontSize: 26, fontWeight: '900', color: '#fbbf24', lineHeight: 28 },
  b4Tagline: { fontSize: 11, color: '#a8a29e', fontStyle: 'italic' },
  b4Check: { fontSize: 12, color: '#d6d3d1' },
  b4Footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  b4Con: { fontSize: 11, color: '#a8a29e' },
  b4Btn: { backgroundColor: '#d97706', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8 },
  b4BtnTxt: { color: '#fff8e1', fontSize: 12, fontWeight: '700' },
  b4Right: { width: 200, backgroundColor: '#292524', alignItems: 'center', justifyContent: 'center', gap: 10, position: 'relative' },
  b4PlanPill: { position: 'absolute', top: 12, right: 12, backgroundColor: '#d97706', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  b4PlanTxt: { fontSize: 10, fontWeight: '700', color: '#fff8e1', textTransform: 'uppercase', letterSpacing: 0.6 },
  b4DiamondWrap: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  b4DiamondBorder: { position: 'absolute', inset: 0, borderWidth: 2, borderColor: '#d97706', transform: [{ rotate: '45deg' }], borderRadius: 4 },
  b4DiamondInner: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#44403c', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  b4PhotoLabel: { fontSize: 28, fontWeight: '900', color: '#d97706' },
  b4Rating: { fontSize: 12, fontWeight: '700', color: '#fbbf24' },
});
