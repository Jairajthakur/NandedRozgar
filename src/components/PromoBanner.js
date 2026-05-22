import React from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Linking,
} from 'react-native';

/* ─────────────────────────────────────────────
   THEME MAP  — category keywords → theme object
───────────────────────────────────────────────*/
const THEMES = {
  /* Retail / Fashion */
  firesale: {
    cats: ['retail','fashion','shopping','clothing','accessories','boutique'],
    bg: '#1a0a00', accent: '#f97316', light: '#431407',
    text: '#fff', sub: '#fdba74', badge: 'SALE',
    emoji: '🛍️', cta: 'Shop Now',
  },
  /* Transport / Auto */
  darkneon: {
    cats: ['transport','auto','automobile','logistics','courier','electronics'],
    bg: '#0f0b1a', accent: '#7c3aed', light: '#2e1065',
    text: '#fff', sub: '#c4b5fd', badge: 'FAST',
    emoji: '🚛', cta: 'Book Ride',
  },
  /* Salon / Beauty */
  freshteal: {
    cats: ['salon','beauty','parlour','parlor'],
    bg: '#022c22', accent: '#10b981', light: '#064e3b',
    text: '#fff', sub: '#6ee7b7', badge: 'BEAUTY',
    emoji: '💅', cta: 'Book Now',
  },
  /* Food / Catering */
  foodie: {
    cats: ['food','catering','bakery','tiffin'],
    bg: '#1c0a00', accent: '#f59e0b', light: '#451a03',
    text: '#fff', sub: '#fcd34d', badge: 'TASTY',
    emoji: '🍱', cta: 'Order Now',
  },
  /* Jewellery / Finance */
  prestige: {
    cats: ['jewellery','jewelry','insurance','finance','chartered','ca'],
    bg: '#12100a', accent: '#d97706', light: '#292524',
    text: '#fbbf24', sub: '#a8a29e', badge: 'PREMIUM',
    emoji: '💎', cta: 'Visit Us',
  },
  /* Restaurant / Cafe / Dining */
  sunset: {
    cats: ['restaurant','cafe','dining','dhaba','hotel restaurant','food court'],
    bg: '#1f0900', accent: '#ea580c', light: '#431407',
    text: '#fff', sub: '#fdba74', badge: 'DINE',
    emoji: '🍽️', cta: 'Reserve',
  },
  /* Education */
  skyacademy: {
    cats: ['education','coaching','school','college','tuition','academy','classes'],
    bg: '#0a1628', accent: '#3b82f6', light: '#1e3a8a',
    text: '#fff', sub: '#93c5fd', badge: 'LEARN',
    emoji: '🎓', cta: 'Enroll',
  },
  /* Gym / Fitness */
  crimsonfit: {
    cats: ['gym','fitness','sports','crossfit','martial','karate','cricket','yoga studio'],
    bg: '#0f0000', accent: '#dc2626', light: '#1c0505',
    text: '#fff', sub: '#f87171', badge: 'FIT',
    emoji: '💪', cta: 'Join Now',
  },
  /* Wedding / Events */
  blossom: {
    cats: ['wedding','florist','event decor','bridal','mehendi','mandap'],
    bg: '#1a0010', accent: '#ec4899', light: '#500724',
    text: '#fff', sub: '#f9a8d4', badge: 'EVENTS',
    emoji: '💐', cta: 'Enquire',
  },
  /* Photography */
  midnight: {
    cats: ['photography','photo','studio','videography','filmmaker'],
    bg: '#030712', accent: '#f59e0b', light: '#111827',
    text: '#fff', sub: '#d1d5db', badge: 'SHOOT',
    emoji: '📸', cta: 'Book Now',
  },
  /* Real Estate */
  terracotta: {
    cats: ['real estate','realestate','construction','property','builder','architect'],
    bg: '#170800', accent: '#c2410c', light: '#3c1407',
    text: '#fff', sub: '#fdba74', badge: 'PROPERTY',
    emoji: '🏠', cta: 'Enquire',
  },
  /* Digital Marketing */
  electric: {
    cats: ['digital marketing','social media','seo','advertising','branding','media'],
    bg: '#020617', accent: '#06b6d4', light: '#0c4a6e',
    text: '#fff', sub: '#67e8f9', badge: 'DIGITAL',
    emoji: '📣', cta: 'Connect',
  },
  /* Healthcare */
  purplehealth: {
    cats: ['hospital','pharmacy','clinic','medical','doctor','diagnostic','dental'],
    bg: '#0d0020', accent: '#8b5cf6', light: '#2e1065',
    text: '#fff', sub: '#c4b5fd', badge: 'HEALTH',
    emoji: '🏥', cta: 'Consult',
  },
  /* Agriculture / Eco */
  forest: {
    cats: ['agriculture','organic','nursery','eco','farm','seeds','fertilizer'],
    bg: '#052e16', accent: '#16a34a', light: '#14532d',
    text: '#fff', sub: '#86efac', badge: 'ORGANIC',
    emoji: '🌿', cta: 'Contact',
  },
  /* Coffee / Sweets */
  cocoa: {
    cats: ['coffee','patisserie','sweet','dessert','cake','ice cream','juice'],
    bg: '#1c1000', accent: '#92400e', light: '#292524',
    text: '#fff', sub: '#d6b07a', badge: 'SWEET',
    emoji: '☕', cta: 'Visit',
  },
  /* Engineering / Industrial */
  steel: {
    cats: ['engineering','manufacturing','hardware','fabrication','welding','tools'],
    bg: '#0a0c0f', accent: '#475569', light: '#1e293b',
    text: '#e2e8f0', sub: '#94a3b8', badge: 'INDUS.',
    emoji: '⚙️', cta: 'Get Quote',
  },
  /* Legal / Consulting */
  navylegal: {
    cats: ['legal','lawyer','advocate','consulting'],
    bg: '#010b1e', accent: '#1d4ed8', light: '#1e3a8a',
    text: '#fff', sub: '#93c5fd', badge: 'LEGAL',
    emoji: '⚖️', cta: 'Consult',
  },
  /* Software / IT */
  silvertech: {
    cats: ['software','it','startup','app','web development','technology'],
    bg: '#04080f', accent: '#0ea5e9', light: '#0c4a6e',
    text: '#fff', sub: '#7dd3fc', badge: 'TECH',
    emoji: '💻', cta: 'Get Demo',
  },
  /* Hotel / Travel */
  golden: {
    cats: ['hotel','resort','lodge','homestay','travel','tourism','motel'],
    bg: '#0c0900', accent: '#ca8a04', light: '#292524',
    text: '#fbbf24', sub: '#a8a29e', badge: 'STAY',
    emoji: '🏨', cta: 'Book Room',
  },
  /* Gaming / Entertainment */
  neongaming: {
    cats: ['gaming','entertainment','club','pub','lounge','nightclub','event'],
    bg: '#04001a', accent: '#a855f7', light: '#2e1065',
    text: '#fff', sub: '#c084fc', badge: 'HOT',
    emoji: '🎮', cta: 'Play Now',
  },
  /* Spa / Wellness */
  rosewellness: {
    cats: ['spa','wellness','meditation','ayurveda','massage','naturopathy'],
    bg: '#1a0010', accent: '#be185d', light: '#500724',
    text: '#fff', sub: '#f9a8d4', badge: 'RELAX',
    emoji: '🧘', cta: 'Book Spa',
  },
};

const DEFAULT_THEME = THEMES.freshteal;

function getTheme(category = '') {
  const key = (category || '').toLowerCase().trim();
  for (const theme of Object.values(THEMES)) {
    if (theme.cats.some(c => key.includes(c) || c.includes(key))) return theme;
  }
  return DEFAULT_THEME;
}

function callBusiness(phone) {
  if (phone) Linking.openURL(`tel:${phone}`);
}

function openWebsite(url) {
  if (!url) return;
  const link = url.startsWith('http') ? url : `https://${url}`;
  Linking.openURL(link);
}

/* ─────────────────────────────────────────────
   HELPER — Arrow-shaped category tag (matches screenshot)
───────────────────────────────────────────────*/
function CategoryTag({ label, accent, bg }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
      {/* Arrow left part */}
      <View style={{
        width: 0, height: 0,
        borderTopWidth: 11, borderBottomWidth: 11,
        borderRightWidth: 12,
        borderTopColor: 'transparent', borderBottomColor: 'transparent',
        borderRightColor: accent,
      }} />
      <View style={{
        backgroundColor: accent,
        paddingHorizontal: 10, paddingVertical: 4,
        borderTopRightRadius: 4, borderBottomRightRadius: 4,
      }}>
        <Text style={{ color: bg === '#fff' ? '#111' : '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>
          {(label || '').toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────
   HELPER — Avatar circle
───────────────────────────────────────────────*/
function AvatarCircle({ name, size, accent, bg }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: accent,
      borderWidth: 3, borderColor: bg,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: accent, shadowOpacity: 0.7, shadowRadius: 10, elevation: 8,
    }}>
      <Text style={{ color: '#fff', fontSize: size * 0.42, fontWeight: '900' }}>
        {(name || 'B').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

/* ─────────────────────────────────────────────
   HELPER — Rating stars
───────────────────────────────────────────────*/
function Stars({ rating, accent }) {
  if (!rating) return null;
  const stars = Math.round(parseFloat(rating));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
      {[1,2,3,4,5].map(i => (
        <Text key={i} style={{ fontSize: 11, color: i <= stars ? '#f59e0b' : '#374151' }}>★</Text>
      ))}
      <Text style={{ fontSize: 10, color: accent, fontWeight: '700', marginLeft: 4 }}>
        {parseFloat(rating).toFixed(1)}
      </Text>
    </View>
  );
}

/* ─────────────────────────────────────────────
   MAIN SPLIT-PANEL BANNER
   Left: details | Right: diagonal accent + avatar + badge
───────────────────────────────────────────────*/
function SplitBanner({ data, theme }) {
  const { bg, accent, light, text, sub, badge, emoji, cta } = theme;

  return (
    <View style={[bs.card, { backgroundColor: bg, borderColor: accent }]}>
      {/* ── LEFT PANEL ── */}
      <View style={bs.leftPanel}>

        {/* Category tag */}
        {!!data.category && (
          <CategoryTag label={data.category} accent={accent} bg={bg} />
        )}

        {/* Business name */}
        <Text style={[bs.bizName, { color: text }]} numberOfLines={1}>
          {data.name}
        </Text>

        {/* Rating */}
        {!!data.rating && <Stars rating={data.rating} accent={accent} />}

        {/* Tagline / Offer */}
        {!!data.tagline && (
          <Text style={[bs.tagline, { color: accent }]} numberOfLines={1}>
            {data.tagline}
          </Text>
        )}

        {/* Description */}
        {!!data.description && (
          <Text style={[bs.desc, { color: sub }]} numberOfLines={2}>
            {data.description}
          </Text>
        )}

        {/* Info rows */}
        <View style={bs.infoBlock}>
          {!!data.location && (
            <View style={bs.infoRow}>
              <Text style={bs.infoIcon}>📍</Text>
              <Text style={[bs.infoText, { color: sub }]} numberOfLines={1}>{data.location}</Text>
            </View>
          )}
          {!!data.address && (
            <View style={bs.infoRow}>
              <Text style={bs.infoIcon}>🏢</Text>
              <Text style={[bs.infoText, { color: sub }]} numberOfLines={1}>{data.address}</Text>
            </View>
          )}
          {!!data.timing && (
            <View style={bs.infoRow}>
              <Text style={bs.infoIcon}>🕐</Text>
              <Text style={[bs.infoText, { color: sub }]} numberOfLines={1}>{data.timing}</Text>
            </View>
          )}
          {!!data.website && (
            <TouchableOpacity onPress={() => openWebsite(data.website)}>
              <View style={bs.infoRow}>
                <Text style={bs.infoIcon}>🌐</Text>
                <Text style={[bs.infoText, { color: accent }]} numberOfLines={1}>{data.website}</Text>
              </View>
            </TouchableOpacity>
          )}
          {!!data.phone && (
            <View style={bs.infoRow}>
              <Text style={bs.infoIcon}>📞</Text>
              <Text style={[bs.infoText, { color: sub }]}>{data.phone}</Text>
            </View>
          )}
        </View>

        {/* CTA button */}
        <TouchableOpacity
          style={[bs.ctaBtn, { backgroundColor: accent }]}
          onPress={() => callBusiness(data.phone)}
          activeOpacity={0.8}
        >
          <Text style={bs.ctaIcon}>📲 </Text>
          <Text style={bs.ctaTxt}>{cta.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* ── RIGHT PANEL — diagonal accent background ── */}
      <View style={[bs.rightPanel, { backgroundColor: light }]}>
        {/* Diagonal overlay lines for depth (decorative) */}
        <View style={[bs.diagLine, { top: 20, right: -10, backgroundColor: accent, opacity: 0.18 }]} />
        <View style={[bs.diagLine, { top: 50, right: 5, backgroundColor: accent, opacity: 0.1 }]} />
        <View style={[bs.diagLine, { top: 80, right: -5, backgroundColor: accent, opacity: 0.14 }]} />

        {/* Avatar */}
        <AvatarCircle name={data.name} size={60} accent={accent} bg={bg} />

        {/* Emoji icon below avatar */}
        <View style={[bs.emojiBox, { borderColor: accent }]}>
          <Text style={{ fontSize: 16 }}>{emoji}</Text>
        </View>

        {/* Badge */}
        <View style={[bs.badge, { backgroundColor: accent }]}>
          <Text style={[bs.badgeTxt, { color: bg }]}>
            {data.tagline ? 'OFFER' : (data.isPopular ? '★ TOP' : badge)}
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────
   BannerCard — maps API promo object → PromoBanner
───────────────────────────────────────────────*/
export function BannerCard({ promo }) {
  if (!promo) return null;
  const data = {
    name:        promo.bizName       || promo.businessName || promo.name     || '',
    tagline:     promo.tagline       || promo.offer        || '',
    description: promo.description   || '',
    category:    promo.category      || '',
    phone:       promo.phone         || '',
    location:    promo.location      || promo.city         || '',
    address:     promo.address       || '',
    website:     promo.website       || '',
    timing:      promo.timing        || promo.hours        || '',
    rating:      promo.rating        || '',
    isPopular:   promo.plan === 'premium' || promo.plan === 'popular',
  };
  return <PromoBanner data={data} />;
}

/* ─────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────*/
export default function PromoBanner({ data }) {
  if (!data || !data.name) return null;
  const theme = getTheme(data.category);
  return <SplitBanner data={data} theme={theme} />;
}

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────────*/
const bs = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 4,
    minHeight: 160,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  /* LEFT */
  leftPanel: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  bizName: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '700',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  desc: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
    opacity: 0.9,
  },
  infoBlock: {
    marginBottom: 10,
    gap: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 11,
    marginRight: 5,
    width: 16,
  },
  infoText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    paddingVertical: 9,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
  },
  ctaIcon: {
    fontSize: 13,
  },
  ctaTxt: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  /* RIGHT */
  rightPanel: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
    overflow: 'hidden',
  },
  diagLine: {
    position: 'absolute',
    width: 3,
    height: '120%',
    transform: [{ rotate: '15deg' }],
  },
  emojiBox: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 6,
    opacity: 0.85,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  badgeTxt: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
