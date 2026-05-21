import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking } from 'react-native';

/* ─── Layout routing ─── */
const LAYOUT_MAP = {
  firesale:     ['retail','fashion','shopping','clothing','accessories','boutique'],
  darkneon:     ['transport','auto','automobile','logistics','courier','electronics'],
  freshteal:    ['salon','beauty','parlour','parlor','food','catering','bakery'],
  prestige:     ['jewellery','jewelry','insurance'],
  sunset:       ['restaurant','cafe','dining','dhaba','hotel restaurant','tiffin','food court'],
  skyacademy:   ['education','coaching','school','college','tuition','academy','classes'],
  crimsonfit:   ['gym','fitness','sports','crossfit','martial','karate','cricket','yoga studio'],
  blossom:      ['wedding','florist','event decor','bridal','mehendi','mandap'],
  midnight:     ['photography','photo','studio','videography','filmmaker'],
  terracotta:   ['real estate','realestate','construction','property','builder','architect'],
  electric:     ['digital marketing','social media','seo','advertising','branding','media'],
  purplehealth: ['hospital','pharmacy','clinic','medical','doctor','diagnostic','dental'],
  forest:       ['agriculture','organic','nursery','eco','farm','seeds','fertilizer'],
  cocoa:        ['coffee','patisserie','sweet','dessert','cake','ice cream','juice'],
  steel:        ['engineering','manufacturing','hardware','fabrication','welding','tools'],
  navylegal:    ['legal','lawyer','advocate','ca','chartered','consulting','finance'],
  silvertech:   ['software','it','startup','app','web development','technology'],
  golden:       ['hotel','resort','lodge','homestay','travel','tourism','motel'],
  neongaming:   ['gaming','entertainment','club','pub','lounge','nightclub','event'],
  rosewellness: ['spa','wellness','meditation','ayurveda','massage','naturopathy'],
};

function getLayout(category = '') {
  const key = (category || '').toLowerCase().replace(/\s+/g, ' ').trim();
  for (const [layout, cats] of Object.entries(LAYOUT_MAP)) {
    if (cats.some(c => key.includes(c) || c.includes(key))) return layout;
  }
  return 'freshteal';
}

function callBusiness(phone) {
  if (phone) Linking.openURL(`tel:${phone}`);
}

/* ─── Shared components ─── */
function Pill({ bg, color, text }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginBottom: 4 }}>
      <Text style={{ color, fontSize: 10, fontWeight: '800', letterSpacing: 0.3 }}>{text}</Text>
    </View>
  );
}

function Avatar({ name, size = 56, bg, color, fontSize = 24 }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize, fontWeight: '900', color }}>{(name || 'B').charAt(0).toUpperCase()}</Text>
    </View>
  );
}

/* ═══ LAYOUT 1 — FIRE SALE (Retail / Fashion) ═══ */
function LayoutFireSale({ data }) {
  return (
    <View style={s.card}>
      <View style={[s.sideBar, { backgroundColor: '#dc2626' }]} />
      <View style={[s.iconBox, { backgroundColor: '#fee2e2' }]}>
        <Text style={{ fontSize: 28 }}>🛍️</Text>
        <Avatar name={data.name} size={40} bg="#dc2626" color="#fff" fontSize={18} />
      </View>
      <View style={s.body}>
        <View style={s.pillRow}>
          {!!data.category && <Pill bg="#fee2e2" color="#dc2626" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Pill bg="#fef3c7" color="#b45309" text="⭐ POPULAR" />}
        </View>
        <Text style={[s.bizName, { color: '#111' }]} numberOfLines={1}>{data.name}</Text>
        {!!data.tagline     && <Text style={[s.tagline, { color: '#dc2626' }]} numberOfLines={1}>{data.tagline}</Text>}
        {!!data.description && <Text style={s.desc} numberOfLines={2}>{data.description}</Text>}
        <View style={s.footer}>
          <View>
            {!!data.phone    && <Text style={s.meta}>📞 {data.phone}</Text>}
            {!!data.location && <Text style={s.meta}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#dc2626' }]} onPress={() => callBusiness(data.phone)}>
            <Text style={s.btnTxt}>Shop Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══ LAYOUT 2 — DARK NEON (Transport / Auto) ═══ */
function LayoutDarkNeon({ data }) {
  return (
    <View style={[s.card, { backgroundColor: '#0f172a', borderColor: '#6d28d9' }]}>
      <View style={[s.sideBar, { backgroundColor: '#6d28d9' }]} />
      <View style={[s.iconBox, { backgroundColor: '#1e1b4b' }]}>
        <Text style={{ fontSize: 28 }}>🚛</Text>
        <Avatar name={data.name} size={40} bg="#6d28d9" color="#fff" fontSize={18} />
      </View>
      <View style={s.body}>
        <View style={s.pillRow}>
          {!!data.category && <Pill bg="#3730a3" color="#c4b5fd" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Pill bg="#ca8a04" color="#fef9c3" text="⭐ POPULAR" />}
        </View>
        <Text style={[s.bizName, { color: '#fff' }]} numberOfLines={1}>{data.name}</Text>
        {!!data.tagline     && <Text style={[s.tagline, { color: '#a78bfa' }]} numberOfLines={1}>{data.tagline}</Text>}
        {!!data.description && <Text style={[s.desc, { color: '#94a3b8' }]} numberOfLines={2}>{data.description}</Text>}
        <View style={s.footer}>
          <View>
            {!!data.phone    && <Text style={[s.meta, { color: '#94a3b8' }]}>📞 {data.phone}</Text>}
            {!!data.location && <Text style={[s.meta, { color: '#94a3b8' }]}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#6d28d9' }]} onPress={() => callBusiness(data.phone)}>
            <Text style={s.btnTxt}>Connect</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══ LAYOUT 3 — FRESH TEAL (Salon / Beauty) ═══ */
function LayoutFreshTeal({ data }) {
  return (
    <View style={[s.card, { backgroundColor: '#f0fdfa', borderColor: '#99f6e4' }]}>
      <View style={[s.sideBar, { backgroundColor: '#0d9488' }]} />
      <View style={[s.iconBox, { backgroundColor: '#ccfbf1' }]}>
        <Text style={{ fontSize: 28 }}>💅</Text>
        <Avatar name={data.name} size={40} bg="#0d9488" color="#fff" fontSize={18} />
      </View>
      <View style={s.body}>
        <View style={s.pillRow}>
          {!!data.category && <Pill bg="#ccfbf1" color="#0f766e" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Pill bg="#fef3c7" color="#b45309" text="⭐ POPULAR" />}
        </View>
        <Text style={[s.bizName, { color: '#134e4a' }]} numberOfLines={1}>{data.name}</Text>
        {!!data.tagline     && <Text style={[s.tagline, { color: '#0d9488' }]} numberOfLines={1}>{data.tagline}</Text>}
        {!!data.description && <Text style={[s.desc, { color: '#374151' }]} numberOfLines={2}>{data.description}</Text>}
        <View style={s.footer}>
          <View>
            {!!data.phone    && <Text style={s.meta}>📞 {data.phone}</Text>}
            {!!data.location && <Text style={s.meta}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#0d9488' }]} onPress={() => callBusiness(data.phone)}>
            <Text style={s.btnTxt}>Book Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══ LAYOUT 4 — PRESTIGE GOLD (Finance / Jewellery) ═══ */
function LayoutPrestigeGold({ data }) {
  return (
    <View style={[s.card, { backgroundColor: '#1c1917', borderColor: '#ca8a04' }]}>
      <View style={[s.sideBar, { backgroundColor: '#ca8a04' }]} />
      <View style={[s.iconBox, { backgroundColor: '#292524' }]}>
        <Text style={{ fontSize: 28 }}>💎</Text>
        <Avatar name={data.name} size={40} bg="#ca8a04" color="#1c1917" fontSize={18} />
      </View>
      <View style={s.body}>
        <View style={s.pillRow}>
          {!!data.category && <Pill bg="#44403c" color="#fbbf24" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Pill bg="#78350f" color="#fde68a" text="⭐ PREMIUM" />}
        </View>
        <Text style={[s.bizName, { color: '#fbbf24' }]} numberOfLines={1}>{data.name}</Text>
        {!!data.tagline     && <Text style={[s.tagline, { color: '#d97706' }]} numberOfLines={1}>{data.tagline}</Text>}
        {!!data.description && <Text style={[s.desc, { color: '#a8a29e' }]} numberOfLines={2}>{data.description}</Text>}
        <View style={s.footer}>
          <View>
            {!!data.phone    && <Text style={[s.meta, { color: '#a8a29e' }]}>📞 {data.phone}</Text>}
            {!!data.location && <Text style={[s.meta, { color: '#a8a29e' }]}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#ca8a04' }]} onPress={() => callBusiness(data.phone)}>
            <Text style={[s.btnTxt, { color: '#1c1917' }]}>Visit Us</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══ LAYOUT 5 — SUNSET ORANGE (Restaurant / Cafe) ═══ */
function LayoutSunsetOrange({ data }) {
  return (
    <View style={[s.card, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
      <View style={[s.sideBar, { backgroundColor: '#ea580c' }]} />
      <View style={[s.iconBox, { backgroundColor: '#ffedd5' }]}>
        <Text style={{ fontSize: 28 }}>🍽️</Text>
        <Avatar name={data.name} size={40} bg="#ea580c" color="#fff" fontSize={18} />
      </View>
      <View style={s.body}>
        <View style={s.pillRow}>
          {!!data.category && <Pill bg="#ffedd5" color="#ea580c" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Pill bg="#fef9c3" color="#ca8a04" text="⭐ TOP RATED" />}
        </View>
        <Text style={[s.bizName, { color: '#7c2d12' }]} numberOfLines={1}>{data.name}</Text>
        {!!data.tagline     && <Text style={[s.tagline, { color: '#ea580c' }]} numberOfLines={1}>{data.tagline}</Text>}
        {!!data.description && <Text style={[s.desc, { color: '#374151' }]} numberOfLines={2}>{data.description}</Text>}
        <View style={s.footer}>
          <View>
            {!!data.phone    && <Text style={s.meta}>📞 {data.phone}</Text>}
            {!!data.location && <Text style={s.meta}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#ea580c' }]} onPress={() => callBusiness(data.phone)}>
            <Text style={s.btnTxt}>Order Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══ LAYOUT 6 — SKY ACADEMY (Education) ═══ */
function LayoutSkyAcademy({ data }) {
  return (
    <View style={[s.card, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
      <View style={[s.sideBar, { backgroundColor: '#2563eb' }]} />
      <View style={[s.iconBox, { backgroundColor: '#dbeafe' }]}>
        <Text style={{ fontSize: 28 }}>🎓</Text>
        <Avatar name={data.name} size={40} bg="#2563eb" color="#fff" fontSize={18} />
      </View>
      <View style={s.body}>
        <View style={s.pillRow}>
          {!!data.category && <Pill bg="#dbeafe" color="#1d4ed8" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Pill bg="#fef9c3" color="#ca8a04" text="⭐ POPULAR" />}
        </View>
        <Text style={[s.bizName, { color: '#1e3a8a' }]} numberOfLines={1}>{data.name}</Text>
        {!!data.tagline     && <Text style={[s.tagline, { color: '#2563eb' }]} numberOfLines={1}>{data.tagline}</Text>}
        {!!data.description && <Text style={[s.desc, { color: '#374151' }]} numberOfLines={2}>{data.description}</Text>}
        <View style={s.footer}>
          <View>
            {!!data.phone    && <Text style={s.meta}>📞 {data.phone}</Text>}
            {!!data.location && <Text style={s.meta}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#2563eb' }]} onPress={() => callBusiness(data.phone)}>
            <Text style={s.btnTxt}>Enroll Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══ LAYOUT 7 — CRIMSON FIT (Gym / Fitness) ═══ */
function LayoutCrimsonFit({ data }) {
  return (
    <View style={[s.card, { backgroundColor: '#0f0a0a', borderColor: '#dc2626' }]}>
      <View style={[s.sideBar, { backgroundColor: '#dc2626' }]} />
      <View style={[s.iconBox, { backgroundColor: '#1c0505' }]}>
        <Text style={{ fontSize: 28 }}>💪</Text>
        <Avatar name={data.name} size={40} bg="#dc2626" color="#fff" fontSize={18} />
      </View>
      <View style={s.body}>
        <View style={s.pillRow}>
          {!!data.category && <Pill bg="#450a0a" color="#fca5a5" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Pill bg="#78350f" color="#fde68a" text="⭐ POPULAR" />}
        </View>
        <Text style={[s.bizName, { color: '#fff' }]} numberOfLines={1}>{data.name}</Text>
        {!!data.tagline     && <Text style={[s.tagline, { color: '#f87171' }]} numberOfLines={1}>{data.tagline}</Text>}
        {!!data.description && <Text style={[s.desc, { color: '#9ca3af' }]} numberOfLines={2}>{data.description}</Text>}
        <View style={s.footer}>
          <View>
            {!!data.phone    && <Text style={[s.meta, { color: '#9ca3af' }]}>📞 {data.phone}</Text>}
            {!!data.location && <Text style={[s.meta, { color: '#9ca3af' }]}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#dc2626' }]} onPress={() => callBusiness(data.phone)}>
            <Text style={s.btnTxt}>Join Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══ LAYOUT 8 — BLOSSOM PINK (Wedding / Events) ═══ */
function LayoutBlossomPink({ data }) {
  return (
    <View style={[s.card, { backgroundColor: '#fdf2f8', borderColor: '#f9a8d4' }]}>
      <View style={[s.sideBar, { backgroundColor: '#db2777' }]} />
      <View style={[s.iconBox, { backgroundColor: '#fce7f3' }]}>
        <Text style={{ fontSize: 28 }}>💐</Text>
        <Avatar name={data.name} size={40} bg="#db2777" color="#fff" fontSize={18} />
      </View>
      <View style={s.body}>
        <View style={s.pillRow}>
          {!!data.category && <Pill bg="#fce7f3" color="#be185d" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Pill bg="#fef9c3" color="#ca8a04" text="⭐ POPULAR" />}
        </View>
        <Text style={[s.bizName, { color: '#831843' }]} numberOfLines={1}>{data.name}</Text>
        {!!data.tagline     && <Text style={[s.tagline, { color: '#db2777' }]} numberOfLines={1}>{data.tagline}</Text>}
        {!!data.description && <Text style={[s.desc, { color: '#374151' }]} numberOfLines={2}>{data.description}</Text>}
        <View style={s.footer}>
          <View>
            {!!data.phone    && <Text style={s.meta}>📞 {data.phone}</Text>}
            {!!data.location && <Text style={s.meta}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#db2777' }]} onPress={() => callBusiness(data.phone)}>
            <Text style={s.btnTxt}>Enquire</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══ LAYOUT 9 — MIDNIGHT PHOTO (Photography) ═══ */
function LayoutMidnightPhoto({ data }) {
  return (
    <View style={[s.card, { backgroundColor: '#030712', borderColor: '#374151' }]}>
      <View style={[s.sideBar, { backgroundColor: '#f59e0b' }]} />
      <View style={[s.iconBox, { backgroundColor: '#111827' }]}>
        <Text style={{ fontSize: 28 }}>📸</Text>
        <Avatar name={data.name} size={40} bg="#f59e0b" color="#000" fontSize={18} />
      </View>
      <View style={s.body}>
        <View style={s.pillRow}>
          {!!data.category && <Pill bg="#1f2937" color="#d1d5db" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Pill bg="#78350f" color="#fde68a" text="⭐ POPULAR" />}
        </View>
        <Text style={[s.bizName, { color: '#fff' }]} numberOfLines={1}>{data.name}</Text>
        {!!data.tagline     && <Text style={[s.tagline, { color: '#f59e0b' }]} numberOfLines={1}>{data.tagline}</Text>}
        {!!data.description && <Text style={[s.desc, { color: '#9ca3af' }]} numberOfLines={2}>{data.description}</Text>}
        <View style={s.footer}>
          <View>
            {!!data.phone    && <Text style={[s.meta, { color: '#9ca3af' }]}>📞 {data.phone}</Text>}
            {!!data.location && <Text style={[s.meta, { color: '#9ca3af' }]}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#f59e0b' }]} onPress={() => callBusiness(data.phone)}>
            <Text style={[s.btnTxt, { color: '#000' }]}>Book Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══ LAYOUT 10 — TERRACOTTA REALTY (Real Estate) ═══ */
function LayoutTerracottaRealty({ data }) {
  return (
    <View style={[s.card, { backgroundColor: '#fff7f0', borderColor: '#fed7aa' }]}>
      <View style={[s.sideBar, { backgroundColor: '#c2410c' }]} />
      <View style={[s.iconBox, { backgroundColor: '#ffedd5' }]}>
        <Text style={{ fontSize: 28 }}>🏠</Text>
        <Avatar name={data.name} size={40} bg="#c2410c" color="#fff" fontSize={18} />
      </View>
      <View style={s.body}>
        <View style={s.pillRow}>
          {!!data.category && <Pill bg="#ffedd5" color="#c2410c" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Pill bg="#fef9c3" color="#ca8a04" text="⭐ POPULAR" />}
        </View>
        <Text style={[s.bizName, { color: '#7c2d12' }]} numberOfLines={1}>{data.name}</Text>
        {!!data.tagline     && <Text style={[s.tagline, { color: '#c2410c' }]} numberOfLines={1}>{data.tagline}</Text>}
        {!!data.description && <Text style={[s.desc, { color: '#374151' }]} numberOfLines={2}>{data.description}</Text>}
        <View style={s.footer}>
          <View>
            {!!data.phone    && <Text style={s.meta}>📞 {data.phone}</Text>}
            {!!data.location && <Text style={s.meta}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#c2410c' }]} onPress={() => callBusiness(data.phone)}>
            <Text style={s.btnTxt}>Site Visit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══ LAYOUT 11 — ELECTRIC DIGITAL (Digital Marketing / IT) ═══ */
function LayoutElectricDigital({ data }) {
  return (
    <View style={[s.card, { backgroundColor: '#0c1a2e', borderColor: '#0ea5e9' }]}>
      <View style={[s.sideBar, { backgroundColor: '#0ea5e9' }]} />
      <View style={[s.iconBox, { backgroundColor: '#0f2744' }]}>
        <Text style={{ fontSize: 28 }}>⚡</Text>
        <Avatar name={data.name} size={40} bg="#0ea5e9" color="#fff" fontSize={18} />
      </View>
      <View style={s.body}>
        <View style={s.pillRow}>
          {!!data.category && <Pill bg="#0c4a6e" color="#7dd3fc" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Pill bg="#ca8a04" color="#fef9c3" text="⭐ POPULAR" />}
        </View>
        <Text style={[s.bizName, { color: '#fff' }]} numberOfLines={1}>{data.name}</Text>
        {!!data.tagline     && <Text style={[s.tagline, { color: '#38bdf8' }]} numberOfLines={1}>{data.tagline}</Text>}
        {!!data.description && <Text style={[s.desc, { color: '#94a3b8' }]} numberOfLines={2}>{data.description}</Text>}
        <View style={s.footer}>
          <View>
            {!!data.phone    && <Text style={[s.meta, { color: '#94a3b8' }]}>📞 {data.phone}</Text>}
            {!!data.location && <Text style={[s.meta, { color: '#94a3b8' }]}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#0ea5e9' }]} onPress={() => callBusiness(data.phone)}>
            <Text style={s.btnTxt}>Get Quote</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══ LAYOUT 12 — PURPLE HEALTH (Medical / Clinic) ═══ */
function LayoutPurpleHealth({ data }) {
  return (
    <View style={[s.card, { backgroundColor: '#faf5ff', borderColor: '#d8b4fe' }]}>
      <View style={[s.sideBar, { backgroundColor: '#7c3aed' }]} />
      <View style={[s.iconBox, { backgroundColor: '#ede9fe' }]}>
        <Text style={{ fontSize: 28 }}>🏥</Text>
        <Avatar name={data.name} size={40} bg="#7c3aed" color="#fff" fontSize={18} />
      </View>
      <View style={s.body}>
        <View style={s.pillRow}>
          {!!data.category && <Pill bg="#ede9fe" color="#6d28d9" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Pill bg="#fef9c3" color="#ca8a04" text="⭐ TRUSTED" />}
        </View>
        <Text style={[s.bizName, { color: '#3b0764' }]} numberOfLines={1}>{data.name}</Text>
        {!!data.tagline     && <Text style={[s.tagline, { color: '#7c3aed' }]} numberOfLines={1}>{data.tagline}</Text>}
        {!!data.description && <Text style={[s.desc, { color: '#374151' }]} numberOfLines={2}>{data.description}</Text>}
        <View style={s.footer}>
          <View>
            {!!data.phone    && <Text style={s.meta}>📞 {data.phone}</Text>}
            {!!data.location && <Text style={s.meta}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#7c3aed' }]} onPress={() => callBusiness(data.phone)}>
            <Text style={s.btnTxt}>Book Appt</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══ LAYOUT 13 — FOREST ECO (Agriculture / Organic) ═══ */
function LayoutForestEco({ data }) {
  return (
    <View style={[s.card, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
      <View style={[s.sideBar, { backgroundColor: '#16a34a' }]} />
      <View style={[s.iconBox, { backgroundColor: '#dcfce7' }]}>
        <Text style={{ fontSize: 28 }}>🌿</Text>
        <Avatar name={data.name} size={40} bg="#16a34a" color="#fff" fontSize={18} />
      </View>
      <View style={s.body}>
        <View style={s.pillRow}>
          {!!data.category && <Pill bg="#dcfce7" color="#166534" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Pill bg="#fef9c3" color="#ca8a04" text="⭐ ORGANIC" />}
        </View>
        <Text style={[s.bizName, { color: '#14532d' }]} numberOfLines={1}>{data.name}</Text>
        {!!data.tagline     && <Text style={[s.tagline, { color: '#16a34a' }]} numberOfLines={1}>{data.tagline}</Text>}
        {!!data.description && <Text style={[s.desc, { color: '#374151' }]} numberOfLines={2}>{data.description}</Text>}
        <View style={s.footer}>
          <View>
            {!!data.phone    && <Text style={s.meta}>📞 {data.phone}</Text>}
            {!!data.location && <Text style={s.meta}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#16a34a' }]} onPress={() => callBusiness(data.phone)}>
            <Text style={s.btnTxt}>Order Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══ LAYOUT 14 — COCOA SWEET (Bakery / Coffee) ═══ */
function LayoutCocoaSweet({ data }) {
  return (
    <View style={[s.card, { backgroundColor: '#fdf8f0', borderColor: '#d6b896' }]}>
      <View style={[s.sideBar, { backgroundColor: '#92400e' }]} />
      <View style={[s.iconBox, { backgroundColor: '#fef3c7' }]}>
        <Text style={{ fontSize: 28 }}>☕</Text>
        <Avatar name={data.name} size={40} bg="#92400e" color="#fff" fontSize={18} />
      </View>
      <View style={s.body}>
        <View style={s.pillRow}>
          {!!data.category && <Pill bg="#fef3c7" color="#92400e" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Pill bg="#fce7f3" color="#9d174d" text="⭐ FAN FAV" />}
        </View>
        <Text style={[s.bizName, { color: '#451a03' }]} numberOfLines={1}>{data.name}</Text>
        {!!data.tagline     && <Text style={[s.tagline, { color: '#92400e' }]} numberOfLines={1}>{data.tagline}</Text>}
        {!!data.description && <Text style={[s.desc, { color: '#374151' }]} numberOfLines={2}>{data.description}</Text>}
        <View style={s.footer}>
          <View>
            {!!data.phone    && <Text style={s.meta}>📞 {data.phone}</Text>}
            {!!data.location && <Text style={s.meta}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#92400e' }]} onPress={() => callBusiness(data.phone)}>
            <Text style={s.btnTxt}>Visit Us</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══ LAYOUT 15 — STEEL INDUSTRIAL (Engineering / Hardware) ═══ */
function LayoutSteelIndustrial({ data }) {
  return (
    <View style={[s.card, { backgroundColor: '#0f172a', borderColor: '#475569' }]}>
      <View style={[s.sideBar, { backgroundColor: '#64748b' }]} />
      <View style={[s.iconBox, { backgroundColor: '#1e293b' }]}>
        <Text style={{ fontSize: 28 }}>⚙️</Text>
        <Avatar name={data.name} size={40} bg="#64748b" color="#fff" fontSize={18} />
      </View>
      <View style={s.body}>
        <View style={s.pillRow}>
          {!!data.category && <Pill bg="#1e293b" color="#94a3b8" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Pill bg="#78350f" color="#fde68a" text="⭐ TRUSTED" />}
        </View>
        <Text style={[s.bizName, { color: '#f1f5f9' }]} numberOfLines={1}>{data.name}</Text>
        {!!data.tagline     && <Text style={[s.tagline, { color: '#94a3b8' }]} numberOfLines={1}>{data.tagline}</Text>}
        {!!data.description && <Text style={[s.desc, { color: '#64748b' }]} numberOfLines={2}>{data.description}</Text>}
        <View style={s.footer}>
          <View>
            {!!data.phone    && <Text style={[s.meta, { color: '#64748b' }]}>📞 {data.phone}</Text>}
            {!!data.location && <Text style={[s.meta, { color: '#64748b' }]}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#64748b' }]} onPress={() => callBusiness(data.phone)}>
            <Text style={s.btnTxt}>Get Quote</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══ LAYOUT 16 — NAVY LEGAL (Legal / Finance / CA) ═══ */
function LayoutNavyLegal({ data }) {
  return (
    <View style={[s.card, { backgroundColor: '#f8fafc', borderColor: '#bfdbfe' }]}>
      <View style={[s.sideBar, { backgroundColor: '#1e3a8a' }]} />
      <View style={[s.iconBox, { backgroundColor: '#dbeafe' }]}>
        <Text style={{ fontSize: 28 }}>⚖️</Text>
        <Avatar name={data.name} size={40} bg="#1e3a8a" color="#fff" fontSize={18} />
      </View>
      <View style={s.body}>
        <View style={s.pillRow}>
          {!!data.category && <Pill bg="#dbeafe" color="#1e3a8a" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Pill bg="#fef9c3" color="#ca8a04" text="⭐ TRUSTED" />}
        </View>
        <Text style={[s.bizName, { color: '#1e3a8a' }]} numberOfLines={1}>{data.name}</Text>
        {!!data.tagline     && <Text style={[s.tagline, { color: '#2563eb' }]} numberOfLines={1}>{data.tagline}</Text>}
        {!!data.description && <Text style={[s.desc, { color: '#374151' }]} numberOfLines={2}>{data.description}</Text>}
        <View style={s.footer}>
          <View>
            {!!data.phone    && <Text style={s.meta}>📞 {data.phone}</Text>}
            {!!data.location && <Text style={s.meta}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#1e3a8a' }]} onPress={() => callBusiness(data.phone)}>
            <Text style={s.btnTxt}>Consult</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══ LAYOUT 17 — SILVER TECH (Software / IT Startup) ═══ */
function LayoutSilverTech({ data }) {
  return (
    <View style={[s.card, { backgroundColor: '#020617', borderColor: '#1e40af' }]}>
      <View style={[s.sideBar, { backgroundColor: '#3b82f6' }]} />
      <View style={[s.iconBox, { backgroundColor: '#0f172a' }]}>
        <Text style={{ fontSize: 28 }}>💻</Text>
        <Avatar name={data.name} size={40} bg="#3b82f6" color="#fff" fontSize={18} />
      </View>
      <View style={s.body}>
        <View style={s.pillRow}>
          {!!data.category && <Pill bg="#1e3a8a" color="#93c5fd" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Pill bg="#ca8a04" color="#fef9c3" text="⭐ TOP PICK" />}
        </View>
        <Text style={[s.bizName, { color: '#f1f5f9' }]} numberOfLines={1}>{data.name}</Text>
        {!!data.tagline     && <Text style={[s.tagline, { color: '#60a5fa' }]} numberOfLines={1}>{data.tagline}</Text>}
        {!!data.description && <Text style={[s.desc, { color: '#94a3b8' }]} numberOfLines={2}>{data.description}</Text>}
        <View style={s.footer}>
          <View>
            {!!data.phone    && <Text style={[s.meta, { color: '#94a3b8' }]}>📞 {data.phone}</Text>}
            {!!data.location && <Text style={[s.meta, { color: '#94a3b8' }]}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#3b82f6' }]} onPress={() => callBusiness(data.phone)}>
            <Text style={s.btnTxt}>Let's Talk</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══ LAYOUT 18 — GOLDEN HOTEL (Hotel / Travel) ═══ */
function LayoutGoldenHotel({ data }) {
  return (
    <View style={[s.card, { backgroundColor: '#1a1200', borderColor: '#b45309' }]}>
      <View style={[s.sideBar, { backgroundColor: '#d97706' }]} />
      <View style={[s.iconBox, { backgroundColor: '#271d00' }]}>
        <Text style={{ fontSize: 28 }}>🏨</Text>
        <Avatar name={data.name} size={40} bg="#d97706" color="#1a1200" fontSize={18} />
      </View>
      <View style={s.body}>
        <View style={s.pillRow}>
          {!!data.category && <Pill bg="#44370a" color="#fbbf24" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Pill bg="#1e3a8a" color="#93c5fd" text="⭐ PREMIUM" />}
        </View>
        <Text style={[s.bizName, { color: '#fbbf24' }]} numberOfLines={1}>{data.name}</Text>
        {!!data.tagline     && <Text style={[s.tagline, { color: '#d97706' }]} numberOfLines={1}>{data.tagline}</Text>}
        {!!data.description && <Text style={[s.desc, { color: '#a8a29e' }]} numberOfLines={2}>{data.description}</Text>}
        <View style={s.footer}>
          <View>
            {!!data.phone    && <Text style={[s.meta, { color: '#a8a29e' }]}>📞 {data.phone}</Text>}
            {!!data.location && <Text style={[s.meta, { color: '#a8a29e' }]}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#d97706' }]} onPress={() => callBusiness(data.phone)}>
            <Text style={[s.btnTxt, { color: '#1a1200' }]}>Book Room</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══ LAYOUT 19 — NEON GAMING (Gaming / Entertainment) ═══ */
function LayoutNeonGaming({ data }) {
  return (
    <View style={[s.card, { backgroundColor: '#030712', borderColor: '#a855f7' }]}>
      <View style={[s.sideBar, { backgroundColor: '#a855f7' }]} />
      <View style={[s.iconBox, { backgroundColor: '#120620' }]}>
        <Text style={{ fontSize: 28 }}>🎮</Text>
        <Avatar name={data.name} size={40} bg="#a855f7" color="#fff" fontSize={18} />
      </View>
      <View style={s.body}>
        <View style={s.pillRow}>
          {!!data.category && <Pill bg="#2e1065" color="#d8b4fe" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Pill bg="#0c4a6e" color="#7dd3fc" text="⭐ HOT" />}
        </View>
        <Text style={[s.bizName, { color: '#fff' }]} numberOfLines={1}>{data.name}</Text>
        {!!data.tagline     && <Text style={[s.tagline, { color: '#c084fc' }]} numberOfLines={1}>{data.tagline}</Text>}
        {!!data.description && <Text style={[s.desc, { color: '#9ca3af' }]} numberOfLines={2}>{data.description}</Text>}
        <View style={s.footer}>
          <View>
            {!!data.phone    && <Text style={[s.meta, { color: '#9ca3af' }]}>📞 {data.phone}</Text>}
            {!!data.location && <Text style={[s.meta, { color: '#9ca3af' }]}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#a855f7' }]} onPress={() => callBusiness(data.phone)}>
            <Text style={s.btnTxt}>Play Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══ LAYOUT 20 — ROSE WELLNESS (Spa / Wellness) ═══ */
function LayoutRoseWellness({ data }) {
  return (
    <View style={[s.card, { backgroundColor: '#fff0f6', borderColor: '#fda4af' }]}>
      <View style={[s.sideBar, { backgroundColor: '#be185d' }]} />
      <View style={[s.iconBox, { backgroundColor: '#fce7f3' }]}>
        <Text style={{ fontSize: 28 }}>🧘</Text>
        <Avatar name={data.name} size={40} bg="#be185d" color="#fff" fontSize={18} />
      </View>
      <View style={s.body}>
        <View style={s.pillRow}>
          {!!data.category && <Pill bg="#fce7f3" color="#9d174d" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Pill bg="#fef9c3" color="#ca8a04" text="⭐ POPULAR" />}
        </View>
        <Text style={[s.bizName, { color: '#831843' }]} numberOfLines={1}>{data.name}</Text>
        {!!data.tagline     && <Text style={[s.tagline, { color: '#be185d' }]} numberOfLines={1}>{data.tagline}</Text>}
        {!!data.description && <Text style={[s.desc, { color: '#374151' }]} numberOfLines={2}>{data.description}</Text>}
        <View style={s.footer}>
          <View>
            {!!data.phone    && <Text style={s.meta}>📞 {data.phone}</Text>}
            {!!data.location && <Text style={s.meta}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#be185d' }]} onPress={() => callBusiness(data.phone)}>
            <Text style={s.btnTxt}>Book Spa</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   BANNER CARD — maps API promo object → PromoBanner
═══════════════════════════════════════════════════════ */
export function BannerCard({ promo }) {
  if (!promo) return null;
  const data = {
    name:          promo.bizName      || promo.businessName || promo.name || '',
    tagline:       promo.tagline      || '',
    description:   promo.description  || '',
    category:      promo.category     || '',
    phone:         promo.phone        || '',
    location:      promo.location     || '',
    address:       promo.address      || '',
    website:       promo.website      || '',
    plan:          promo.plan         || '',
    isPopular:     promo.plan === 'premium' || promo.plan === 'popular',
  };
  return <PromoBanner data={data} />;
}

/* ═══════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════ */
export default function PromoBanner({ data }) {
  if (!data || !data.name) return null;
  const layout = getLayout(data.category);
  switch (layout) {
    case 'firesale':     return <LayoutFireSale data={data} />;
    case 'darkneon':     return <LayoutDarkNeon data={data} />;
    case 'prestige':     return <LayoutPrestigeGold data={data} />;
    case 'sunset':       return <LayoutSunsetOrange data={data} />;
    case 'skyacademy':   return <LayoutSkyAcademy data={data} />;
    case 'crimsonfit':   return <LayoutCrimsonFit data={data} />;
    case 'blossom':      return <LayoutBlossomPink data={data} />;
    case 'midnight':     return <LayoutMidnightPhoto data={data} />;
    case 'terracotta':   return <LayoutTerracottaRealty data={data} />;
    case 'electric':     return <LayoutElectricDigital data={data} />;
    case 'purplehealth': return <LayoutPurpleHealth data={data} />;
    case 'forest':       return <LayoutForestEco data={data} />;
    case 'cocoa':        return <LayoutCocoaSweet data={data} />;
    case 'steel':        return <LayoutSteelIndustrial data={data} />;
    case 'navylegal':    return <LayoutNavyLegal data={data} />;
    case 'silvertech':   return <LayoutSilverTech data={data} />;
    case 'golden':       return <LayoutGoldenHotel data={data} />;
    case 'neongaming':   return <LayoutNeonGaming data={data} />;
    case 'rosewellness': return <LayoutRoseWellness data={data} />;
    default:             return <LayoutFreshTeal data={data} />;
  }
}

/* ═══════════════════════════════════════════════════════
   SHARED STYLES
═══════════════════════════════════════════════════════ */
const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: 2,
    minHeight: 130,
  },
  sideBar: {
    width: 6,
    flexShrink: 0,
  },
  iconBox: {
    width: 90,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  body: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    justifyContent: 'space-between',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  bizName: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  desc: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 17,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  meta: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  btn: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTxt: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
});
