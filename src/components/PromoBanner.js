import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
} from 'react-native';

/**
 * PromoBanner — 20 graphic ad-style layouts mapped by business category
 *
 * Layout  1 — FireSale      : Retail, Fashion, Events, Shopping
 * Layout  2 — DarkNeon      : Transport, Tech, Auto, Electronics
 * Layout  3 — FreshTeal     : Salon, Beauty, Healthcare, Gym, Bakery
 * Layout  4 — PrestigeGold  : Finance, Jewellery, Legal, Real Estate
 * Layout  5 — SunsetOrange  : Restaurant, Cafe, Dining, Catering
 * Layout  6 — SkyAcademy    : Education, Coaching, School, Tuition
 * Layout  7 — CrimsonFit    : Gym, Fitness, Sports, Yoga, Martial Arts
 * Layout  8 — BlossomPink   : Wedding, Florist, Events, Decor
 * Layout  9 — MidnightPhoto : Photography, Studio, Videography
 * Layout 10 — TerracottaRealty: Real Estate, Construction, Property
 * Layout 11 — ElectricDigital: Digital Marketing, Social Media, IT
 * Layout 12 — PurpleHealth  : Hospital, Pharmacy, Clinic, Medical
 * Layout 13 — ForestEco     : Agriculture, Organic, Nursery, Eco
 * Layout 14 — CocoaSweet    : Bakery, Coffee, Dessert, Patisserie
 * Layout 15 — SteelIndustrial: Engineering, Manufacturing, Hardware
 * Layout 16 — NavyLegal     : Legal, CA, Consulting, Corporate
 * Layout 17 — SilverTech    : Software, IT, Startup, App Dev
 * Layout 18 — GoldenHotel   : Hotel, Travel, Tourism, Homestay
 * Layout 19 — NeonGaming    : Gaming, Entertainment, Club, Pub
 * Layout 20 — RoseWellness  : Spa, Wellness, Meditation, Yoga
 */

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
function StarBadge({ value, bg = '#fbbf24', textColor = '#7c2d12' }) {
  return (
    <View style={{ position: 'absolute', top: 10, right: 10, width: 48, height: 48, borderRadius: 24, backgroundColor: bg, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
      <Text style={{ fontSize: 16, fontWeight: '900', color: textColor, lineHeight: 18 }}>{value}%</Text>
      <Text style={{ fontSize: 8, fontWeight: '700', color: textColor, textTransform: 'uppercase' }}>OFF</Text>
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
      <View style={s.b1Blob1} />
      <View style={s.b1Blob2} />
      <View style={s.b1Left}>
        <Text style={s.b1Pre}>Limited Time Only</Text>
        <Text style={s.b1T1}>Biggest</Text>
        <Text style={s.b1T2}>Sale!</Text>
        {!!data.tagline && <Text style={s.b1Tagline}>{data.tagline}</Text>}
        <View style={s.b1BottomRow}>
          <TouchableOpacity style={s.b1Btn} onPress={() => callBusiness(data.phone)} activeOpacity={0.8}>
            <Text style={s.b1BtnTxt}>Shop Now</Text>
          </TouchableOpacity>
          <View>
            {!!data.website && <Text style={s.b1Contact}>{data.website}</Text>}
            {!!data.phone   && <Text style={s.b1Contact}>{data.phone}</Text>}
          </View>
        </View>
      </View>
      {!!data.discountOffer && (
        <View style={s.b1Starburst}>
          <Text style={s.b1StarPct}>{data.discountOffer}%</Text>
          <Text style={s.b1StarOff}>OFF</Text>
        </View>
      )}
      <View style={s.b1PhotoCol}>
        <View style={s.b1Frame}>
          <Text style={s.b1FrameLetter}>{(data.name || 'B').charAt(0).toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT 2 — DARK NEON
   Near-black · purple accents · split right panel
═══════════════════════════════════════════════════════ */
function LayoutDarkNeon({ data }) {
  return (
    <View style={s.b2Outer}>
      <View style={s.b2Left}>
        <View style={s.b2GlowCircle} />
        <View style={s.row}>
          {!!data.category && <Badge bg="#6d28d9" color="#ede9fe" text={data.category.toUpperCase()} />}
          {!!data.plan     && <Badge bg="#ca8a04" color="#fef9c3" text={data.plan.toUpperCase()} />}
        </View>
        <Text style={s.b2Name}>{data.name || ''}</Text>
        {!!data.tagline && <Text style={s.b2Tagline}>{data.tagline}</Text>}
        <View style={s.featureList}>
          {(data.features || []).slice(0, 2).map((f, i) => <CheckItem key={i} text={f} color="#c4b5fd" />)}
        </View>
        <View style={s.b2Footer}>
          <View>
            {!!data.phone    && <Text style={s.b2Con}>{data.phone}</Text>}
            {!!data.location && <Text style={s.b2Con}>{data.location}</Text>}
          </View>
          <TouchableOpacity style={s.b2Btn} onPress={() => callBusiness(data.phone)} activeOpacity={0.8}>
            <Text style={s.b2BtnTxt}>Connect</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={s.b2Right}>
        <View style={s.b2PhotoCirc}>
          <Text style={s.b2PhotoLetter}>{(data.name || 'B').charAt(0).toUpperCase()}</Text>
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
      <View style={s.b3Left}>
        <View style={s.b3Blob1} />
        <View style={s.b3Blob2} />
        {!!data.discountOffer && (
          <View style={s.b3Star}>
            <Text style={s.b3StarPct}>{data.discountOffer}%</Text>
            <Text style={s.b3StarOff}>OFF</Text>
          </View>
        )}
        <View style={s.b3PhotoWrap}>
          <View style={s.b3Photo}>
            <Text style={s.b3PhotoLetter}>{(data.name || 'B').charAt(0).toUpperCase()}</Text>
          </View>
        </View>
        <View style={s.b3NameWrap}>
          <Text style={s.b3Name} numberOfLines={1}>{data.name || ''}</Text>
          {!!data.location && <Text style={s.b3Sub}>{data.location}</Text>}
        </View>
      </View>
      <View style={s.b3Right}>
        <View style={s.row}>
          {!!data.category && <Badge bg="#ccfbf1" color="#0f766e" text={data.category} />}
          {data.isPopular   && <Badge bg="#fef3c7" color="#92400e" text="Popular" />}
        </View>
        {!!data.description && <Text style={s.b3Desc} numberOfLines={2}>{data.description}</Text>}
        <View style={s.featureList}>
          {(data.features || []).slice(0, 2).map((f, i) => <CheckItem key={i} text={f} color="#1e293b" />)}
        </View>
        <View style={s.b3Footer}>
          <View>
            {!!data.phone   && <Text style={s.b3Con}>{data.phone}</Text>}
            {!!data.website && <Text style={s.b3Con}>{data.website}</Text>}
          </View>
          <TouchableOpacity style={s.b3Btn} onPress={() => callBusiness(data.phone)} activeOpacity={0.8}>
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
      <View style={s.b4Left}>
        <View style={s.b4Line1} />
        <View style={s.b4Line2} />
        <View style={s.b4CornerTL} />
        <View style={s.b4CornerBR} />
        <View style={s.row}>
          {!!data.category && <Badge bg="#78350f" color="#fde68a" text={data.category.toUpperCase()} />}
          {data.verified   && <Badge bg="#14532d" color="#bbf7d0" text="✓ Verified" />}
        </View>
        <Text style={s.b4Name}>{data.name || ''}</Text>
        {!!data.tagline && <Text style={s.b4Tagline}>{data.tagline}</Text>}
        <View style={s.featureList}>
          {(data.features || []).slice(0, 2).map((f, i) => <CheckItem key={i} text={f} color="#d6d3d1" />)}
        </View>
        <View style={s.b4Footer}>
          <View>
            {!!data.phone    && <Text style={s.b4Con}>{data.phone}</Text>}
            {!!data.location && <Text style={s.b4Con}>{data.location}</Text>}
          </View>
          <TouchableOpacity style={s.b4Btn} onPress={() => callBusiness(data.phone)} activeOpacity={0.8}>
            <Text style={s.b4BtnTxt}>Enquire →</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={s.b4Right}>
        {!!data.plan && <View style={s.b4PlanPill}><Text style={s.b4PlanTxt}>{data.plan.toUpperCase()}</Text></View>}
        <View style={s.b4DiamondOuter}>
          <View style={s.b4DiamondRing} />
          <View style={s.b4DiamondInner}>
            <Text style={s.b4PhotoLetter}>{(data.name || 'B').charAt(0).toUpperCase()}</Text>
          </View>
        </View>
        {!!data.rating && (
          <Text style={s.b4Rating}>★ {data.rating}{data.reviewCount ? ` · ${data.reviewCount} reviews` : ''}</Text>
        )}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT 5 — SUNSET ORANGE
   Restaurant · Cafe · Dining · Warm orange gradient
═══════════════════════════════════════════════════════ */
function LayoutSunsetOrange({ data }) {
  return (
    <View style={s.b5Outer}>
      <View style={s.b5Arc1} />
      <View style={s.b5Arc2} />
      <View style={s.b5Left}>
        <View style={s.row}>
          {!!data.category && <Badge bg="rgba(255,255,255,0.25)" color="#fff" text={data.category.toUpperCase()} />}
        </View>
        <Text style={s.b5Name}>{data.name || ''}</Text>
        {!!data.tagline && <Text style={s.b5Tagline}>{data.tagline}</Text>}
        {!!data.discountOffer && (
          <View style={s.b5OfferRow}>
            <Text style={s.b5OfferPct}>{data.discountOffer}%</Text>
            <Text style={s.b5OfferOff}> OFF Today</Text>
          </View>
        )}
        <TouchableOpacity style={s.b5Btn} onPress={() => callBusiness(data.phone)} activeOpacity={0.8}>
          <Text style={s.b5BtnTxt}>🍽  Order Now</Text>
        </TouchableOpacity>
        {!!data.phone && <Text style={s.b5Phone}>{data.phone}</Text>}
      </View>
      <View style={s.b5Right}>
        <View style={s.b5Circle}>
          <Text style={s.b5Letter}>{(data.name || 'R').charAt(0).toUpperCase()}</Text>
        </View>
        {!!data.location && (
          <View style={s.b5LocRow}>
            <Text style={s.b5LocTxt}>📍 {data.location}</Text>
          </View>
        )}
        {data.isPopular && <View style={s.b5PopPill}><Text style={s.b5PopTxt}>🔥 Trending</Text></View>}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT 6 — SKY ACADEMY
   Education · Coaching · School · Blue knowledge theme
═══════════════════════════════════════════════════════ */
function LayoutSkyAcademy({ data }) {
  return (
    <View style={s.b6Outer}>
      <View style={s.b6TopBar} />
      <View style={s.b6Content}>
        <View style={s.b6IconWrap}>
          <Text style={s.b6Icon}>🎓</Text>
        </View>
        <View style={s.b6Mid}>
          <View style={s.row}>
            {!!data.category && <Badge bg="#dbeafe" color="#1d4ed8" text={data.category.toUpperCase()} />}
            {data.verified   && <Badge bg="#dcfce7" color="#15803d" text="✓ Certified" />}
          </View>
          <Text style={s.b6Name}>{data.name || ''}</Text>
          {!!data.tagline && <Text style={s.b6Tagline}>{data.tagline}</Text>}
          <View style={s.featureList}>
            {(data.features || []).slice(0, 2).map((f, i) => <CheckItem key={i} text={f} color="#1e40af" />)}
          </View>
        </View>
        <View style={s.b6Right}>
          <View style={s.b6Avatar}>
            <Text style={s.b6AvatarLetter}>{(data.name || 'A').charAt(0).toUpperCase()}</Text>
          </View>
          <TouchableOpacity style={s.b6Btn} onPress={() => callBusiness(data.phone)} activeOpacity={0.8}>
            <Text style={s.b6BtnTxt}>Enroll</Text>
          </TouchableOpacity>
          {!!data.phone && <Text style={s.b6Phone}>{data.phone}</Text>}
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT 7 — CRIMSON FIT
   Gym · Fitness · Sports · Dark + red diagonal split
═══════════════════════════════════════════════════════ */
function LayoutCrimsonFit({ data }) {
  return (
    <View style={s.b7Outer}>
      <View style={s.b7DiagBg} />
      <View style={s.b7Left}>
        <Text style={s.b7Pre}>POWER UP</Text>
        <Text style={s.b7Name}>{data.name || ''}</Text>
        {!!data.tagline && <Text style={s.b7Tagline}>{data.tagline}</Text>}
        {!!data.discountOffer && (
          <View style={s.b7OfferPill}>
            <Text style={s.b7OfferTxt}>{data.discountOffer}% OFF Membership</Text>
          </View>
        )}
        <View style={s.b7Footer}>
          <TouchableOpacity style={s.b7Btn} onPress={() => callBusiness(data.phone)} activeOpacity={0.8}>
            <Text style={s.b7BtnTxt}>JOIN NOW</Text>
          </TouchableOpacity>
          {!!data.phone && <Text style={s.b7Phone}>{data.phone}</Text>}
        </View>
      </View>
      <View style={s.b7Right}>
        <View style={s.b7GlowDot} />
        <View style={s.b7Avatar}>
          <Text style={s.b7AvatarLetter}>{(data.name || 'G').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={s.featureList}>
          {(data.features || []).slice(0, 2).map((f, i) => <CheckItem key={i} text={f} color="#fca5a5" />)}
        </View>
        {!!data.location && <Text style={s.b7Loc}>📍 {data.location}</Text>}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT 8 — BLOSSOM PINK
   Wedding · Florist · Events · Rose pink romantic
═══════════════════════════════════════════════════════ */
function LayoutBlossomPink({ data }) {
  return (
    <View style={s.b8Outer}>
      <View style={s.b8PetalTL} />
      <View style={s.b8PetalBR} />
      <View style={s.b8Left}>
        <View style={s.b8FloralCircle}>
          <Text style={s.b8FloralLetter}>{(data.name || 'W').charAt(0).toUpperCase()}</Text>
        </View>
        {!!data.discountOffer && <StarBadge value={data.discountOffer} bg="#f43f5e" textColor="#fff" />}
      </View>
      <View style={s.b8Right}>
        <View style={s.row}>
          {!!data.category && <Badge bg="#ffe4e6" color="#9f1239" text={data.category.toUpperCase()} />}
          {data.verified   && <Badge bg="#f0fdf4" color="#166534" text="✓ Verified" />}
        </View>
        <Text style={s.b8Name}>{data.name || ''}</Text>
        {!!data.tagline && <Text style={s.b8Tagline}>{data.tagline}</Text>}
        {!!data.description && <Text style={s.b8Desc} numberOfLines={2}>{data.description}</Text>}
        <View style={s.b8Footer}>
          <View>
            {!!data.phone    && <Text style={s.b8Con}>{data.phone}</Text>}
            {!!data.location && <Text style={s.b8Con}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={s.b8Btn} onPress={() => callBusiness(data.phone)} activeOpacity={0.8}>
            <Text style={s.b8BtnTxt}>Book Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT 9 — MIDNIGHT PHOTO
   Photography · Studio · Videography · Dark amber cinematic
═══════════════════════════════════════════════════════ */
function LayoutMidnightPhoto({ data }) {
  return (
    <View style={s.b9Outer}>
      <View style={s.b9VignetteL} />
      <View style={s.b9VignetteR} />
      <View style={s.b9Left}>
        <View style={s.b9ApertureRing}>
          <View style={s.b9ApertureInner}>
            <Text style={s.b9ApertureLetter}>{(data.name || 'P').charAt(0).toUpperCase()}</Text>
          </View>
        </View>
      </View>
      <View style={s.b9Right}>
        <View style={s.row}>
          {!!data.category && <Badge bg="rgba(251,191,36,0.2)" color="#fbbf24" text={data.category.toUpperCase()} />}
          {data.verified   && <Badge bg="rgba(255,255,255,0.1)" color="#e2e8f0" text="✓ Pro" />}
        </View>
        <Text style={s.b9Name}>{data.name || ''}</Text>
        {!!data.tagline && <Text style={s.b9Tagline}>{data.tagline}</Text>}
        <View style={s.featureList}>
          {(data.features || []).slice(0, 2).map((f, i) => <CheckItem key={i} text={f} color="#fbbf24" />)}
        </View>
        {!!data.discountOffer && (
          <View style={s.b9OfferPill}>
            <Text style={s.b9OfferTxt}>🎬 {data.discountOffer}% OFF for New Clients</Text>
          </View>
        )}
        <View style={s.b9Footer}>
          {!!data.phone && <Text style={s.b9Con}>{data.phone}</Text>}
          <TouchableOpacity style={s.b9Btn} onPress={() => callBusiness(data.phone)} activeOpacity={0.8}>
            <Text style={s.b9BtnTxt}>Book Session</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT 10 — TERRACOTTA REALTY
   Real Estate · Construction · Property · Earthy warm
═══════════════════════════════════════════════════════ */
function LayoutTerracottaRealty({ data }) {
  return (
    <View style={s.b10Outer}>
      <View style={s.b10Stripe1} />
      <View style={s.b10Stripe2} />
      <View style={s.b10Left}>
        <View style={s.b10TopRow}>
          {!!data.category && <Badge bg="rgba(255,255,255,0.2)" color="#fff" text={data.category.toUpperCase()} />}
          {data.verified   && <Badge bg="#166534" color="#bbf7d0" text="✓ RERA" />}
        </View>
        <Text style={s.b10Name}>{data.name || ''}</Text>
        {!!data.tagline && <Text style={s.b10Tagline}>{data.tagline}</Text>}
        <View style={s.featureList}>
          {(data.features || []).slice(0, 2).map((f, i) => <CheckItem key={i} text={f} color="#fde8d8" />)}
        </View>
        <TouchableOpacity style={s.b10Btn} onPress={() => callBusiness(data.phone)} activeOpacity={0.8}>
          <Text style={s.b10BtnTxt}>📞 Site Visit</Text>
        </TouchableOpacity>
      </View>
      <View style={s.b10Right}>
        <View style={s.b10HouseFrame}>
          <View style={s.b10Roof} />
          <View style={s.b10Wall}>
            <Text style={s.b10WallLetter}>{(data.name || 'R').charAt(0).toUpperCase()}</Text>
          </View>
        </View>
        {!!data.phone    && <Text style={s.b10Phone}>{data.phone}</Text>}
        {!!data.location && <Text style={s.b10Loc}>📍 {data.location}</Text>}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT 11 — ELECTRIC DIGITAL
   Digital Marketing · Social Media · IT · Cyan on dark
═══════════════════════════════════════════════════════ */
function LayoutElectricDigital({ data }) {
  return (
    <View style={s.b11Outer}>
      <View style={s.b11GridH1} />
      <View style={s.b11GridH2} />
      <View style={s.b11GridV1} />
      <View style={s.b11GlowBlob} />
      <View style={s.b11Left}>
        <View style={s.row}>
          {!!data.category && <Badge bg="rgba(6,182,212,0.2)" color="#06b6d4" text={data.category.toUpperCase()} />}
          {!!data.plan     && <Badge bg="rgba(251,191,36,0.15)" color="#fbbf24" text={data.plan.toUpperCase()} />}
        </View>
        <Text style={s.b11Name}>{data.name || ''}</Text>
        {!!data.tagline && <Text style={s.b11Tagline}>{data.tagline}</Text>}
        <View style={s.featureList}>
          {(data.features || []).slice(0, 2).map((f, i) => <CheckItem key={i} text={f} color="#67e8f9" />)}
        </View>
        <View style={s.b11Footer}>
          {!!data.phone && <Text style={s.b11Con}>{data.phone}</Text>}
          <TouchableOpacity style={s.b11Btn} onPress={() => callBusiness(data.phone)} activeOpacity={0.8}>
            <Text style={s.b11BtnTxt}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={s.b11Right}>
        <View style={s.b11HexWrap}>
          <View style={s.b11Hex}>
            <Text style={s.b11HexLetter}>{(data.name || 'D').charAt(0).toUpperCase()}</Text>
          </View>
        </View>
        {!!data.discountOffer && (
          <View style={s.b11DiscPill}>
            <Text style={s.b11DiscTxt}>{data.discountOffer}% OFF</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT 12 — PURPLE HEALTH
   Hospital · Pharmacy · Clinic · Clinical purple/white
═══════════════════════════════════════════════════════ */
function LayoutPurpleHealth({ data }) {
  return (
    <View style={s.b12Outer}>
      <View style={s.b12Left}>
        <View style={s.b12Cross}>
          <View style={s.b12CrossH} />
          <View style={s.b12CrossV} />
        </View>
        <View style={s.b12Avatar}>
          <Text style={s.b12AvatarLetter}>{(data.name || 'H').charAt(0).toUpperCase()}</Text>
        </View>
        {data.verified && (
          <View style={s.b12VerPill}><Text style={s.b12VerTxt}>✓ NABH</Text></View>
        )}
      </View>
      <View style={s.b12Right}>
        <View style={s.row}>
          {!!data.category && <Badge bg="#ede9fe" color="#6d28d9" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Badge bg="#fef3c7" color="#92400e" text="★ Top Rated" />}
        </View>
        <Text style={s.b12Name}>{data.name || ''}</Text>
        {!!data.tagline && <Text style={s.b12Tagline}>{data.tagline}</Text>}
        {!!data.description && <Text style={s.b12Desc} numberOfLines={2}>{data.description}</Text>}
        <View style={s.b12Footer}>
          <View>
            {!!data.phone    && <Text style={s.b12Con}>📞 {data.phone}</Text>}
            {!!data.location && <Text style={s.b12Con}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={s.b12Btn} onPress={() => callBusiness(data.phone)} activeOpacity={0.8}>
            <Text style={s.b12BtnTxt}>Consult</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT 13 — FOREST ECO
   Agriculture · Organic · Nursery · Deep forest greens
═══════════════════════════════════════════════════════ */
function LayoutForestEco({ data }) {
  return (
    <View style={s.b13Outer}>
      <View style={s.b13WaveTop} />
      <View style={s.b13Left}>
        <Text style={s.b13Leaf}>🌿</Text>
        <View style={s.b13CircleFrame}>
          <Text style={s.b13CircleLetter}>{(data.name || 'F').charAt(0).toUpperCase()}</Text>
        </View>
        {!!data.discountOffer && (
          <View style={s.b13OfferBadge}>
            <Text style={s.b13OfferTxt}>{data.discountOffer}%{'\n'}OFF</Text>
          </View>
        )}
      </View>
      <View style={s.b13Right}>
        <View style={s.row}>
          {!!data.category && <Badge bg="#dcfce7" color="#166534" text={data.category.toUpperCase()} />}
          {data.verified   && <Badge bg="#fef9c3" color="#854d0e" text="✓ Organic" />}
        </View>
        <Text style={s.b13Name}>{data.name || ''}</Text>
        {!!data.tagline && <Text style={s.b13Tagline}>{data.tagline}</Text>}
        <View style={s.featureList}>
          {(data.features || []).slice(0, 2).map((f, i) => <CheckItem key={i} text={f} color="#166534" />)}
        </View>
        <View style={s.b13Footer}>
          <View>
            {!!data.phone    && <Text style={s.b13Con}>{data.phone}</Text>}
            {!!data.location && <Text style={s.b13Con}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={s.b13Btn} onPress={() => callBusiness(data.phone)} activeOpacity={0.8}>
            <Text style={s.b13BtnTxt}>Call Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT 14 — COCOA SWEET
   Bakery · Coffee · Dessert · Warm cocoa & cream
═══════════════════════════════════════════════════════ */
function LayoutCocoaSweet({ data }) {
  return (
    <View style={s.b14Outer}>
      <View style={s.b14DotPatternTR} />
      <View style={s.b14Left}>
        <View style={s.b14PlateOuter}>
          <View style={s.b14PlateInner}>
            <Text style={s.b14PlateLetter}>{(data.name || 'C').charAt(0).toUpperCase()}</Text>
          </View>
        </View>
        {!!data.discountOffer && (
          <View style={s.b14OfferFlag}>
            <Text style={s.b14OfferFlagTxt}>{data.discountOffer}% OFF</Text>
          </View>
        )}
      </View>
      <View style={s.b14Right}>
        <View style={s.row}>
          {!!data.category && <Badge bg="#fef3c7" color="#92400e" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Badge bg="#fce7f3" color="#9d174d" text="★ Fan Fav" />}
        </View>
        <Text style={s.b14Name}>{data.name || ''}</Text>
        {!!data.tagline && <Text style={s.b14Tagline}>{data.tagline}</Text>}
        {!!data.description && <Text style={s.b14Desc} numberOfLines={2}>{data.description}</Text>}
        <View style={s.b14Footer}>
          <View>
            {!!data.phone    && <Text style={s.b14Con}>{data.phone}</Text>}
            {!!data.location && <Text style={s.b14Con}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={s.b14Btn} onPress={() => callBusiness(data.phone)} activeOpacity={0.8}>
            <Text style={s.b14BtnTxt}>Order</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT 15 — STEEL INDUSTRIAL
   Engineering · Manufacturing · Hardware · Steel gray
═══════════════════════════════════════════════════════ */
function LayoutSteelIndustrial({ data }) {
  return (
    <View style={s.b15Outer}>
      <View style={s.b15TopAccent} />
      <View style={s.b15GearBg} />
      <View style={s.b15Left}>
        <View style={s.b15BoltFrame}>
          <Text style={s.b15BoltLetter}>{(data.name || 'I').charAt(0).toUpperCase()}</Text>
        </View>
        {!!data.discountOffer && (
          <View style={s.b15DiscBadge}>
            <Text style={s.b15DiscTxt}>{data.discountOffer}%{'\n'}OFF</Text>
          </View>
        )}
      </View>
      <View style={s.b15Right}>
        <View style={s.row}>
          {!!data.category && <Badge bg="rgba(148,163,184,0.2)" color="#cbd5e1" text={data.category.toUpperCase()} />}
          {data.verified   && <Badge bg="rgba(251,191,36,0.2)" color="#fbbf24" text="✓ ISO Certified" />}
        </View>
        <Text style={s.b15Name}>{data.name || ''}</Text>
        {!!data.tagline && <Text style={s.b15Tagline}>{data.tagline}</Text>}
        <View style={s.featureList}>
          {(data.features || []).slice(0, 2).map((f, i) => <CheckItem key={i} text={f} color="#94a3b8" />)}
        </View>
        <View style={s.b15Footer}>
          <View>
            {!!data.phone    && <Text style={s.b15Con}>{data.phone}</Text>}
            {!!data.location && <Text style={s.b15Con}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={s.b15Btn} onPress={() => callBusiness(data.phone)} activeOpacity={0.8}>
            <Text style={s.b15BtnTxt}>Get Quote</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT 16 — NAVY LEGAL
   Legal · CA · Consulting · Corporate navy & white
═══════════════════════════════════════════════════════ */
function LayoutNavyLegal({ data }) {
  return (
    <View style={s.b16Outer}>
      <View style={s.b16SideLine} />
      <View style={s.b16Left}>
        <View style={s.b16SealOuter}>
          <View style={s.b16SealInner}>
            <Text style={s.b16SealLetter}>{(data.name || 'L').charAt(0).toUpperCase()}</Text>
          </View>
        </View>
        {data.verified && (
          <View style={s.b16VerPill}><Text style={s.b16VerTxt}>Bar Council</Text></View>
        )}
      </View>
      <View style={s.b16Right}>
        <View style={s.row}>
          {!!data.category && <Badge bg="#dbeafe" color="#1e3a8a" text={data.category.toUpperCase()} />}
          {!!data.plan     && <Badge bg="#fef9c3" color="#92400e" text={data.plan.toUpperCase()} />}
        </View>
        <Text style={s.b16Name}>{data.name || ''}</Text>
        {!!data.tagline && <Text style={s.b16Tagline}>{data.tagline}</Text>}
        <View style={s.featureList}>
          {(data.features || []).slice(0, 2).map((f, i) => <CheckItem key={i} text={f} color="#1e3a8a" />)}
        </View>
        <View style={s.b16Footer}>
          <View>
            {!!data.phone    && <Text style={s.b16Con}>{data.phone}</Text>}
            {!!data.location && <Text style={s.b16Con}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={s.b16Btn} onPress={() => callBusiness(data.phone)} activeOpacity={0.8}>
            <Text style={s.b16BtnTxt}>Consult →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT 17 — SILVER TECH
   Software · IT · Startup · Dark silver gradient
═══════════════════════════════════════════════════════ */
function LayoutSilverTech({ data }) {
  return (
    <View style={s.b17Outer}>
      <View style={s.b17GlowTop} />
      <View style={s.b17Left}>
        <View style={s.row}>
          {!!data.category && <Badge bg="rgba(148,163,184,0.15)" color="#94a3b8" text={data.category.toUpperCase()} />}
          {!!data.plan     && <Badge bg="rgba(99,102,241,0.3)" color="#a5b4fc" text={data.plan.toUpperCase()} />}
        </View>
        <Text style={s.b17Name}>{data.name || ''}</Text>
        {!!data.tagline && <Text style={s.b17Tagline}>{data.tagline}</Text>}
        <View style={s.featureList}>
          {(data.features || []).slice(0, 2).map((f, i) => <CheckItem key={i} text={f} color="#a5b4fc" />)}
        </View>
        <View style={s.b17Footer}>
          {!!data.phone && <Text style={s.b17Con}>{data.phone}</Text>}
          <TouchableOpacity style={s.b17Btn} onPress={() => callBusiness(data.phone)} activeOpacity={0.8}>
            <Text style={s.b17BtnTxt}>Contact Us</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={s.b17Right}>
        <View style={s.b17RingOuter}>
          <View style={s.b17RingMid}>
            <View style={s.b17RingInner}>
              <Text style={s.b17RingLetter}>{(data.name || 'T').charAt(0).toUpperCase()}</Text>
            </View>
          </View>
        </View>
        {!!data.discountOffer && (
          <View style={s.b17Disc}>
            <Text style={s.b17DiscTxt}>{data.discountOffer}% OFF</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT 18 — GOLDEN HOTEL
   Hotel · Resort · Travel · Warm amber & ivory
═══════════════════════════════════════════════════════ */
function LayoutGoldenHotel({ data }) {
  return (
    <View style={s.b18Outer}>
      <View style={s.b18GoldStripe} />
      <View style={s.b18Left}>
        <View style={s.b18EmblemOuter}>
          <View style={s.b18Emblem}>
            <Text style={s.b18EmblemLetter}>{(data.name || 'H').charAt(0).toUpperCase()}</Text>
          </View>
        </View>
        {!!data.rating && (
          <View style={s.b18Stars}>
            <Text style={s.b18StarsTxt}>{'★'.repeat(Math.round(data.rating))}</Text>
          </View>
        )}
        {!!data.discountOffer && <StarBadge value={data.discountOffer} bg="#d97706" textColor="#fff8e1" />}
      </View>
      <View style={s.b18Right}>
        <View style={s.row}>
          {!!data.category && <Badge bg="#fef3c7" color="#92400e" text={data.category.toUpperCase()} />}
          {data.verified   && <Badge bg="#dcfce7" color="#15803d" text="✓ Verified" />}
        </View>
        <Text style={s.b18Name}>{data.name || ''}</Text>
        {!!data.tagline && <Text style={s.b18Tagline}>{data.tagline}</Text>}
        <View style={s.featureList}>
          {(data.features || []).slice(0, 2).map((f, i) => <CheckItem key={i} text={f} color="#78350f" />)}
        </View>
        <View style={s.b18Footer}>
          <View>
            {!!data.phone    && <Text style={s.b18Con}>{data.phone}</Text>}
            {!!data.location && <Text style={s.b18Con}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={s.b18Btn} onPress={() => callBusiness(data.phone)} activeOpacity={0.8}>
            <Text style={s.b18BtnTxt}>Book Room</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT 19 — NEON GAMING
   Gaming · Entertainment · Club · Neon on pitch black
═══════════════════════════════════════════════════════ */
function LayoutNeonGaming({ data }) {
  return (
    <View style={s.b19Outer}>
      <View style={s.b19GlowGreen} />
      <View style={s.b19GlowPink} />
      <View style={s.b19Left}>
        <View style={s.b19NeonFrame}>
          <Text style={s.b19NeonLetter}>{(data.name || 'G').charAt(0).toUpperCase()}</Text>
        </View>
      </View>
      <View style={s.b19Right}>
        <View style={s.row}>
          {!!data.category && <Badge bg="rgba(16,185,129,0.2)" color="#34d399" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Badge bg="rgba(236,72,153,0.2)" color="#f472b6" text="🔥 HOT" />}
        </View>
        <Text style={s.b19Name}>{data.name || ''}</Text>
        {!!data.tagline && <Text style={s.b19Tagline}>{data.tagline}</Text>}
        {!!data.discountOffer && (
          <View style={s.b19OfferPill}>
            <Text style={s.b19OfferTxt}>⚡ {data.discountOffer}% OFF Tonight!</Text>
          </View>
        )}
        <View style={s.b19Footer}>
          <View>
            {!!data.phone    && <Text style={s.b19Con}>{data.phone}</Text>}
            {!!data.location && <Text style={s.b19Con}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={s.b19Btn} onPress={() => callBusiness(data.phone)} activeOpacity={0.8}>
            <Text style={s.b19BtnTxt}>Join Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   LAYOUT 20 — ROSE WELLNESS
   Spa · Wellness · Meditation · Soft blush & lavender
═══════════════════════════════════════════════════════ */
function LayoutRoseWellness({ data }) {
  return (
    <View style={s.b20Outer}>
      <View style={s.b20CircleBg} />
      <View style={s.b20Left}>
        <View style={s.b20LotusFrame}>
          <Text style={s.b20LotusLetter}>{(data.name || 'W').charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={s.b20SubIcon}>🪷</Text>
        {!!data.discountOffer && (
          <View style={s.b20DiscPill}>
            <Text style={s.b20DiscTxt}>{data.discountOffer}% OFF</Text>
          </View>
        )}
      </View>
      <View style={s.b20Right}>
        <View style={s.row}>
          {!!data.category && <Badge bg="#fce7f3" color="#9d174d" text={data.category.toUpperCase()} />}
          {data.isPopular  && <Badge bg="#f3e8ff" color="#7e22ce" text="★ Premium" />}
        </View>
        <Text style={s.b20Name}>{data.name || ''}</Text>
        {!!data.tagline && <Text style={s.b20Tagline}>{data.tagline}</Text>}
        {!!data.description && <Text style={s.b20Desc} numberOfLines={2}>{data.description}</Text>}
        <View style={s.b20Footer}>
          <View>
            {!!data.phone    && <Text style={s.b20Con}>{data.phone}</Text>}
            {!!data.location && <Text style={s.b20Con}>📍 {data.location}</Text>}
          </View>
          <TouchableOpacity style={s.b20Btn} onPress={() => callBusiness(data.phone)} activeOpacity={0.8}>
            <Text style={s.b20BtnTxt}>Book Spa</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════ */
/**
 * BannerCard — renders a promo banner from a raw promotion object
 * (as returned by /api/promotions/all). Adapts the API shape to
 * the PromoBanner `data` prop format.
 */
export function BannerCard({ promo }) {
  if (!promo) return null;
  // API returns: bizName, tagline, phone, category, location, address, website, description, plan
  const data = {
    name:          promo.bizName      || promo.businessName || promo.name || '',
    tagline:       promo.tagline      || '',
    description:   promo.description  || '',
    category:      promo.category     || '',
    phone:         promo.phone        || '',
    whatsapp:      promo.phone        || '',
    location:      promo.location     || promo.address || '',
    plan:          promo.plan         || '',
    verified:      false,
    isPopular:     promo.plan === 'premium' || promo.plan === 'popular',
    discountOffer: '',
    features:      promo.website ? [promo.website] : [],
  };
  return <PromoBanner data={data} />;
}

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
   STYLES
   NOTE: No `gap`, no `inset`, no `position:'relative'` on flex children
═══════════════════════════════════════════════════════ */
const s = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  featureList: { marginBottom: 4 },
  fillCircle: { width: '100%', height: '100%', borderRadius: 999 },

  /* ── L1: FIRE SALE ── */
  b1Outer: { borderRadius: 16, overflow: 'hidden', height: 200, backgroundColor: '#9f1239', flexDirection: 'row', alignItems: 'center' },
  b1Blob1: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#7f1d1d', top: -80, left: -60 },
  b1Blob2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#991b1b', bottom: -60, right: 100 },
  b1Left: { flex: 1, paddingLeft: 22, paddingVertical: 18, zIndex: 2 },
  b1Pre: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: '#fca5a5', textTransform: 'uppercase', marginBottom: 2 },
  b1T1: { fontSize: 36, fontWeight: '900', color: '#ffffff', lineHeight: 38, textTransform: 'uppercase' },
  b1T2: { fontSize: 48, fontWeight: '900', color: '#fbbf24', lineHeight: 50, textTransform: 'uppercase' },
  b1Tagline: { fontSize: 11, color: '#fca5a5', fontStyle: 'italic', marginTop: 4 },
  b1BottomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  b1Btn: { backgroundColor: '#fbbf24', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8, marginRight: 10 },
  b1BtnTxt: { color: '#7c2d12', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  b1Contact: { fontSize: 10, color: '#fca5a5', lineHeight: 16 },
  b1Starburst: { position: 'absolute', right: 162, top: 65, width: 68, height: 68, borderRadius: 34, backgroundColor: '#fbbf24', borderWidth: 3, borderColor: '#ffffff', alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  b1StarPct: { fontSize: 20, fontWeight: '900', color: '#7c2d12', lineHeight: 22 },
  b1StarOff: { fontSize: 8, fontWeight: '700', color: '#92400e', textTransform: 'uppercase' },
  b1PhotoCol: { width: 160, alignItems: 'center', justifyContent: 'center', paddingRight: 14, zIndex: 2 },
  b1Frame: { width: 130, height: 130, borderRadius: 65, backgroundColor: '#7f1d1d', borderWidth: 3, borderColor: '#fbbf24', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  b1FrameLetter: { fontSize: 48, fontWeight: '900', color: '#fca5a5' },

  /* ── L2: DARK NEON ── */
  b2Outer: { borderRadius: 16, overflow: 'hidden', height: 200, flexDirection: 'row', backgroundColor: '#0f172a' },
  b2Left: { flex: 1, padding: 18, justifyContent: 'space-between', overflow: 'hidden' },
  b2GlowCircle: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#6d28d9', opacity: 0.18, top: -70, right: -30 },
  b2Name: { fontSize: 26, fontWeight: '900', color: '#ffffff', lineHeight: 28, marginBottom: 2 },
  b2Tagline: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginBottom: 6 },
  b2Footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  b2Con: { fontSize: 11, color: '#94a3b8', lineHeight: 17 },
  b2Btn: { backgroundColor: '#7c3aed', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8 },
  b2BtnTxt: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  b2Right: { width: 175, backgroundColor: '#1e1b4b', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  b2PhotoCirc: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#4338ca', borderWidth: 2, borderColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', zIndex: 1, overflow: 'hidden' },
  b2PhotoLetter: { fontSize: 40, fontWeight: '900', color: '#a5b4fc' },
  b2DiscBadge: { position: 'absolute', top: 10, right: 10, width: 46, height: 46, borderRadius: 23, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  b2DiscPct: { fontSize: 14, fontWeight: '900', color: '#7c2d12', lineHeight: 16 },
  b2DiscOff: { fontSize: 8, fontWeight: '700', color: '#92400e', textTransform: 'uppercase' },

  /* ── L3: FRESH TEAL ── */
  b3Outer: { borderRadius: 16, overflow: 'hidden', height: 200, flexDirection: 'row', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  b3Left: { width: 210, backgroundColor: '#0d9488', padding: 16, justifyContent: 'flex-end', overflow: 'hidden' },
  b3Blob1: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: '#0f766e', top: -45, right: -40 },
  b3Blob2: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: '#115e59', bottom: -25, left: -20 },
  b3Star: { position: 'absolute', left: 12, top: 12, zIndex: 2, width: 50, height: 50, borderRadius: 25, backgroundColor: '#f59e0b', borderWidth: 2, borderColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  b3StarPct: { fontSize: 14, fontWeight: '900', color: '#7c2d12', lineHeight: 16 },
  b3StarOff: { fontSize: 7, fontWeight: '700', color: '#92400e', textTransform: 'uppercase' },
  b3PhotoWrap: { position: 'absolute', top: 12, right: 12, zIndex: 1 },
  b3Photo: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#0f766e', borderWidth: 3, borderColor: '#5eead4', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  b3PhotoLetter: { fontSize: 28, fontWeight: '900', color: '#99f6e4' },
  b3NameWrap: { zIndex: 1 },
  b3Name: { fontSize: 19, fontWeight: '900', color: '#ffffff', lineHeight: 21 },
  b3Sub: { fontSize: 11, color: '#99f6e4', marginTop: 2 },
  b3Right: { flex: 1, padding: 14, justifyContent: 'space-between' },
  b3Desc: { fontSize: 12, color: '#475569', lineHeight: 18, marginBottom: 4 },
  b3Footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  b3Con: { fontSize: 11, color: '#64748b', lineHeight: 17 },
  b3Btn: { backgroundColor: '#0d9488', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8 },
  b3BtnTxt: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

  /* ── L4: PRESTIGE GOLD ── */
  b4Outer: { borderRadius: 16, overflow: 'hidden', height: 200, flexDirection: 'row', backgroundColor: '#1c1917' },
  b4Left: { flex: 1, padding: 18, justifyContent: 'space-between', overflow: 'hidden' },
  b4Line1: { position: 'absolute', top: 0, bottom: 0, left: 70, width: 1, backgroundColor: 'rgba(251,191,36,0.12)' },
  b4Line2: { position: 'absolute', top: 0, bottom: 0, left: 140, width: 1, backgroundColor: 'rgba(251,191,36,0.07)' },
  b4CornerTL: { position: 'absolute', top: 12, left: 12, width: 22, height: 22, borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#d97706' },
  b4CornerBR: { position: 'absolute', bottom: 12, right: 12, width: 22, height: 22, borderBottomWidth: 2, borderRightWidth: 2, borderColor: '#d97706' },
  b4Name: { fontSize: 24, fontWeight: '900', color: '#fbbf24', lineHeight: 26 },
  b4Tagline: { fontSize: 11, color: '#a8a29e', fontStyle: 'italic', marginBottom: 4 },
  b4Footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  b4Con: { fontSize: 11, color: '#a8a29e', lineHeight: 17 },
  b4Btn: { backgroundColor: '#d97706', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8 },
  b4BtnTxt: { color: '#fff8e1', fontSize: 12, fontWeight: '700' },
  b4Right: { width: 190, backgroundColor: '#292524', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  b4PlanPill: { position: 'absolute', top: 10, right: 10, backgroundColor: '#d97706', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  b4PlanTxt: { fontSize: 10, fontWeight: '700', color: '#fff8e1', letterSpacing: 0.6 },
  b4DiamondOuter: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  b4DiamondRing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 2, borderColor: '#d97706', transform: [{ rotate: '45deg' }], borderRadius: 6 },
  b4DiamondInner: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#44403c', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', zIndex: 1 },
  b4PhotoLetter: { fontSize: 26, fontWeight: '900', color: '#d97706' },
  b4Rating: { fontSize: 12, fontWeight: '700', color: '#fbbf24', marginTop: 8 },

  /* ── L5: SUNSET ORANGE ── */
  b5Outer: { borderRadius: 16, overflow: 'hidden', height: 200, flexDirection: 'row', backgroundColor: '#ea580c' },
  b5Arc1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#c2410c', top: -120, left: -80 },
  b5Arc2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#9a3412', bottom: -80, right: 120 },
  b5Left: { flex: 1, padding: 18, paddingVertical: 16, justifyContent: 'space-between', zIndex: 2 },
  b5Name: { fontSize: 24, fontWeight: '900', color: '#ffffff', lineHeight: 26, marginBottom: 2 },
  b5Tagline: { fontSize: 11, color: '#fed7aa', fontStyle: 'italic' },
  b5OfferRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 },
  b5OfferPct: { fontSize: 32, fontWeight: '900', color: '#fef08a', lineHeight: 34 },
  b5OfferOff: { fontSize: 14, fontWeight: '700', color: '#fef08a', marginBottom: 2 },
  b5Btn: { backgroundColor: '#ffffff', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start', marginTop: 8 },
  b5BtnTxt: { color: '#c2410c', fontSize: 13, fontWeight: '800' },
  b5Phone: { fontSize: 11, color: '#fed7aa', marginTop: 4 },
  b5Right: { width: 150, alignItems: 'center', justifyContent: 'center', paddingRight: 12, zIndex: 2 },
  b5Circle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#7c2d12', borderWidth: 3, borderColor: '#fef08a', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  b5Letter: { fontSize: 38, fontWeight: '900', color: '#fed7aa' },
  b5LocRow: { marginTop: 8 },
  b5LocTxt: { fontSize: 10, color: '#fed7aa', textAlign: 'center' },
  b5PopPill: { marginTop: 6, backgroundColor: '#fef08a', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  b5PopTxt: { fontSize: 10, fontWeight: '700', color: '#9a3412' },

  /* ── L6: SKY ACADEMY ── */
  b6Outer: { borderRadius: 16, overflow: 'hidden', height: 200, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  b6TopBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 5, backgroundColor: '#1d4ed8' },
  b6Content: { flex: 1, flexDirection: 'row', padding: 16, paddingTop: 18 },
  b6IconWrap: { width: 50, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2 },
  b6Icon: { fontSize: 32 },
  b6Mid: { flex: 1, paddingHorizontal: 8 },
  b6Name: { fontSize: 20, fontWeight: '900', color: '#1e3a8a', lineHeight: 22, marginBottom: 2 },
  b6Tagline: { fontSize: 11, color: '#3b82f6', fontStyle: 'italic', marginBottom: 6 },
  b6Right: { width: 120, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  b6Avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1d4ed8', borderWidth: 2, borderColor: '#93c5fd', alignItems: 'center', justifyContent: 'center' },
  b6AvatarLetter: { fontSize: 28, fontWeight: '900', color: '#ffffff' },
  b6Btn: { backgroundColor: '#1d4ed8', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  b6BtnTxt: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  b6Phone: { fontSize: 10, color: '#3b82f6', textAlign: 'center' },

  /* ── L7: CRIMSON FIT ── */
  b7Outer: { borderRadius: 16, overflow: 'hidden', height: 200, flexDirection: 'row', backgroundColor: '#0f0f0f' },
  b7DiagBg: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#7f1d1d', opacity: 0.35 },
  b7Left: { flex: 1, padding: 18, justifyContent: 'space-between', zIndex: 2 },
  b7Pre: { fontSize: 10, fontWeight: '800', letterSpacing: 3, color: '#f87171', textTransform: 'uppercase' },
  b7Name: { fontSize: 26, fontWeight: '900', color: '#ffffff', lineHeight: 28 },
  b7Tagline: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  b7OfferPill: { alignSelf: 'flex-start', backgroundColor: '#dc2626', borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4 },
  b7OfferTxt: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  b7Footer: { flexDirection: 'row', alignItems: 'center' },
  b7Btn: { backgroundColor: '#dc2626', borderRadius: 6, paddingHorizontal: 16, paddingVertical: 8, marginRight: 10 },
  b7BtnTxt: { color: '#ffffff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  b7Phone: { fontSize: 11, color: '#9ca3af' },
  b7Right: { width: 160, alignItems: 'center', justifyContent: 'center', paddingRight: 16, zIndex: 2 },
  b7GlowDot: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#dc2626', opacity: 0.15, top: 20, left: 10 },
  b7Avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#1f2937', borderWidth: 2, borderColor: '#dc2626', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  b7AvatarLetter: { fontSize: 36, fontWeight: '900', color: '#f87171' },
  b7Loc: { fontSize: 10, color: '#6b7280', textAlign: 'center' },

  /* ── L8: BLOSSOM PINK ── */
  b8Outer: { borderRadius: 16, overflow: 'hidden', height: 200, flexDirection: 'row', backgroundColor: '#fff1f2' },
  b8PetalTL: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#fda4af', opacity: 0.4, top: -40, left: -30 },
  b8PetalBR: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: '#fb7185', opacity: 0.2, bottom: -60, right: -40 },
  b8Left: { width: 170, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  b8FloralCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#fb7185', borderWidth: 5, borderColor: '#ffffff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  b8FloralLetter: { fontSize: 46, fontWeight: '900', color: '#ffffff' },
  b8Right: { flex: 1, padding: 16, justifyContent: 'space-between' },
  b8Name: { fontSize: 22, fontWeight: '900', color: '#881337', lineHeight: 24 },
  b8Tagline: { fontSize: 11, color: '#e11d48', fontStyle: 'italic', marginBottom: 2 },
  b8Desc: { fontSize: 12, color: '#6b7280', lineHeight: 18 },
  b8Footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#fecdd3' },
  b8Con: { fontSize: 10, color: '#9f1239', lineHeight: 16 },
  b8Btn: { backgroundColor: '#f43f5e', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8 },
  b8BtnTxt: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

  /* ── L9: MIDNIGHT PHOTO ── */
  b9Outer: { borderRadius: 16, overflow: 'hidden', height: 200, flexDirection: 'row', backgroundColor: '#0a0a0a' },
  b9VignetteL: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 160, backgroundColor: '#1c1310', opacity: 0.8 },
  b9VignetteR: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 80, backgroundColor: '#0a0a0a', opacity: 0.6 },
  b9Left: { width: 150, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  b9ApertureRing: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#d97706', alignItems: 'center', justifyContent: 'center' },
  b9ApertureInner: { width: 85, height: 85, borderRadius: 43, backgroundColor: '#292524', borderWidth: 1, borderColor: '#78350f', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  b9ApertureLetter: { fontSize: 32, fontWeight: '900', color: '#d97706' },
  b9Right: { flex: 1, padding: 16, justifyContent: 'space-between', zIndex: 2 },
  b9Name: { fontSize: 22, fontWeight: '900', color: '#ffffff', lineHeight: 24 },
  b9Tagline: { fontSize: 11, color: '#a8a29e', fontStyle: 'italic', marginBottom: 4 },
  b9OfferPill: { alignSelf: 'flex-start', backgroundColor: '#292524', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#d97706' },
  b9OfferTxt: { fontSize: 11, color: '#fbbf24', fontWeight: '600' },
  b9Footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  b9Con: { fontSize: 11, color: '#78716c' },
  b9Btn: { backgroundColor: '#d97706', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8 },
  b9BtnTxt: { color: '#0a0a0a', fontSize: 12, fontWeight: '800' },

  /* ── L10: TERRACOTTA REALTY ── */
  b10Outer: { borderRadius: 16, overflow: 'hidden', height: 200, flexDirection: 'row', backgroundColor: '#9a3412' },
  b10Stripe1: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#7c2d12', opacity: 0.5 },
  b10Stripe2: { position: 'absolute', width: 3, top: 0, bottom: 0, left: '40%', backgroundColor: 'rgba(255,255,255,0.08)' },
  b10Left: { flex: 1, padding: 18, justifyContent: 'space-between', zIndex: 2 },
  b10TopRow: { flexDirection: 'row', flexWrap: 'wrap' },
  b10Name: { fontSize: 22, fontWeight: '900', color: '#ffffff', lineHeight: 24 },
  b10Tagline: { fontSize: 11, color: '#fed7aa', fontStyle: 'italic', marginBottom: 4 },
  b10Btn: { alignSelf: 'flex-start', backgroundColor: '#ffffff', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 8 },
  b10BtnTxt: { color: '#9a3412', fontSize: 12, fontWeight: '800' },
  b10Right: { width: 160, alignItems: 'center', justifyContent: 'center', paddingRight: 14, zIndex: 2 },
  b10HouseFrame: { alignItems: 'center' },
  b10Roof: { width: 0, height: 0, borderLeftWidth: 50, borderRightWidth: 50, borderBottomWidth: 40, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#fbbf24' },
  b10Wall: { width: 80, height: 65, backgroundColor: '#fde8d8', borderWidth: 2, borderColor: '#fbbf24', borderTopWidth: 0, alignItems: 'center', justifyContent: 'center' },
  b10WallLetter: { fontSize: 30, fontWeight: '900', color: '#9a3412' },
  b10Phone: { fontSize: 11, color: '#fed7aa', marginTop: 8, textAlign: 'center' },
  b10Loc: { fontSize: 10, color: '#fca5a5', textAlign: 'center' },

  /* ── L11: ELECTRIC DIGITAL ── */
  b11Outer: { borderRadius: 16, overflow: 'hidden', height: 200, flexDirection: 'row', backgroundColor: '#020617' },
  b11GridH1: { position: 'absolute', top: 66, left: 0, right: 0, height: 1, backgroundColor: 'rgba(6,182,212,0.08)' },
  b11GridH2: { position: 'absolute', top: 133, left: 0, right: 0, height: 1, backgroundColor: 'rgba(6,182,212,0.08)' },
  b11GridV1: { position: 'absolute', top: 0, bottom: 0, left: '60%', width: 1, backgroundColor: 'rgba(6,182,212,0.08)' },
  b11GlowBlob: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#0e7490', opacity: 0.12, top: -60, right: -30 },
  b11Left: { flex: 1, padding: 18, justifyContent: 'space-between', zIndex: 2 },
  b11Name: { fontSize: 22, fontWeight: '900', color: '#ffffff', lineHeight: 24 },
  b11Tagline: { fontSize: 11, color: '#64748b', fontStyle: 'italic', marginBottom: 4 },
  b11Footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  b11Con: { fontSize: 11, color: '#475569' },
  b11Btn: { backgroundColor: '#0e7490', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8 },
  b11BtnTxt: { color: '#67e8f9', fontSize: 12, fontWeight: '700' },
  b11Right: { width: 170, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  b11HexWrap: { alignItems: 'center', justifyContent: 'center' },
  b11Hex: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#0c4a6e', borderWidth: 2, borderColor: '#06b6d4', alignItems: 'center', justifyContent: 'center' },
  b11HexLetter: { fontSize: 38, fontWeight: '900', color: '#06b6d4' },
  b11DiscPill: { marginTop: 10, backgroundColor: '#164e63', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#06b6d4' },
  b11DiscTxt: { fontSize: 11, fontWeight: '700', color: '#67e8f9' },

  /* ── L12: PURPLE HEALTH ── */
  b12Outer: { borderRadius: 16, overflow: 'hidden', height: 200, flexDirection: 'row', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#ddd6fe' },
  b12Left: { width: 160, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', paddingBottom: 12 },
  b12Cross: { position: 'absolute', top: 18, left: 18, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  b12CrossH: { position: 'absolute', width: 30, height: 8, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  b12CrossV: { position: 'absolute', width: 8, height: 30, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  b12Avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#5b21b6', borderWidth: 3, borderColor: '#ddd6fe', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  b12AvatarLetter: { fontSize: 34, fontWeight: '900', color: '#ddd6fe' },
  b12VerPill: { backgroundColor: '#dcfce7', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  b12VerTxt: { fontSize: 10, fontWeight: '700', color: '#166534' },
  b12Right: { flex: 1, padding: 16, justifyContent: 'space-between' },
  b12Name: { fontSize: 20, fontWeight: '900', color: '#4c1d95', lineHeight: 22 },
  b12Tagline: { fontSize: 11, color: '#7c3aed', fontStyle: 'italic', marginBottom: 2 },
  b12Desc: { fontSize: 12, color: '#6b7280', lineHeight: 18 },
  b12Footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#ede9fe' },
  b12Con: { fontSize: 10, color: '#6b21a8', lineHeight: 16 },
  b12Btn: { backgroundColor: '#7c3aed', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8 },
  b12BtnTxt: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

  /* ── L13: FOREST ECO ── */
  b13Outer: { borderRadius: 16, overflow: 'hidden', height: 200, flexDirection: 'row', backgroundColor: '#f0fdf4' },
  b13WaveTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 6, backgroundColor: '#16a34a' },
  b13Left: { width: 160, backgroundColor: '#15803d', alignItems: 'center', justifyContent: 'center', paddingTop: 8 },
  b13Leaf: { position: 'absolute', top: 14, left: 10, fontSize: 22, opacity: 0.5 },
  b13CircleFrame: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#166534', borderWidth: 3, borderColor: '#86efac', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  b13CircleLetter: { fontSize: 34, fontWeight: '900', color: '#86efac' },
  b13OfferBadge: { backgroundColor: '#fbbf24', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' },
  b13OfferTxt: { fontSize: 11, fontWeight: '900', color: '#7c2d12', textAlign: 'center', lineHeight: 14 },
  b13Right: { flex: 1, padding: 16, justifyContent: 'space-between' },
  b13Name: { fontSize: 20, fontWeight: '900', color: '#14532d', lineHeight: 22 },
  b13Tagline: { fontSize: 11, color: '#16a34a', fontStyle: 'italic', marginBottom: 4 },
  b13Footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#bbf7d0' },
  b13Con: { fontSize: 10, color: '#166534', lineHeight: 16 },
  b13Btn: { backgroundColor: '#15803d', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8 },
  b13BtnTxt: { color: '#ffffff', fontSize: 12, fontWeight: '700' },

  /* ── L14: COCOA SWEET ── */
  b14Outer: { borderRadius: 16, overflow: 'hidden', height: 200, flexDirection: 'row', backgroundColor: '#fdf6f0' },
  b14DotPatternTR: { position: 'absolute', top: 0, right: 0, width: 100, height: 100, backgroundColor: '#fde8d8', borderBottomLeftRadius: 100 },
  b14Left: { width: 160, backgroundColor: '#78350f', alignItems: 'center', justifyContent: 'center', paddingBottom: 12 },
  b14PlateOuter: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#92400e', borderWidth: 4, borderColor: '#fde68a', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  b14PlateInner: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#7c2d12', alignItems: 'center', justifyContent: 'center' },
  b14PlateLetter: { fontSize: 28, fontWeight: '900', color: '#fde68a' },
  b14OfferFlag: { backgroundColor: '#ef4444', borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4 },
  b14OfferFlagTxt: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  b14Right: { flex: 1, padding: 16, justifyContent: 'space-between' },
  b14Name: { fontSize: 20, fontWeight: '900', color: '#451a03', lineHeight: 22 },
  b14Tagline: { fontSize: 11, color: '#92400e', fontStyle: 'italic', marginBottom: 2 },
  b14Desc: { fontSize: 12, color: '#78716c', lineHeight: 18 },
  b14Footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#fde8d8' },
  b14Con: { fontSize: 10, color: '#92400e', lineHeight: 16 },
  b14Btn: { backgroundColor: '#92400e', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8 },
  b14BtnTxt: { color: '#fde68a', fontSize: 12, fontWeight: '700' },

  /* ── L15: STEEL INDUSTRIAL ── */
  b15Outer: { borderRadius: 16, overflow: 'hidden', height: 200, flexDirection: 'row', backgroundColor: '#0f172a' },
  b15TopAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#f59e0b' },
  b15GearBg: { position: 'absolute', right: 160, top: -20, width: 120, height: 120, borderRadius: 60, borderWidth: 12, borderColor: 'rgba(148,163,184,0.06)' },
  b15Left: { width: 160, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#334155' },
  b15BoltFrame: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#0f172a', borderWidth: 3, borderColor: '#f59e0b', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  b15BoltLetter: { fontSize: 34, fontWeight: '900', color: '#f59e0b' },
  b15DiscBadge: { backgroundColor: '#dc2626', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' },
  b15DiscTxt: { fontSize: 11, fontWeight: '900', color: '#ffffff', textAlign: 'center', lineHeight: 14 },
  b15Right: { flex: 1, padding: 16, justifyContent: 'space-between' },
  b15Name: { fontSize: 20, fontWeight: '900', color: '#e2e8f0', lineHeight: 22 },
  b15Tagline: { fontSize: 11, color: '#64748b', fontStyle: 'italic', marginBottom: 4 },
  b15Footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  b15Con: { fontSize: 10, color: '#64748b', lineHeight: 16 },
  b15Btn: { backgroundColor: '#f59e0b', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 8 },
  b15BtnTxt: { color: '#0f172a', fontSize: 12, fontWeight: '800' },

  /* ── L16: NAVY LEGAL ── */
  b16Outer: { borderRadius: 16, overflow: 'hidden', height: 200, flexDirection: 'row', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#bfdbfe' },
  b16SideLine: { position: 'absolute', top: 0, bottom: 0, left: 165, width: 1, backgroundColor: '#dbeafe' },
  b16Left: { width: 160, backgroundColor: '#1e3a8a', alignItems: 'center', justifyContent: 'center', paddingBottom: 12 },
  b16SealOuter: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: '#93c5fd', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  b16SealInner: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#1e40af', alignItems: 'center', justifyContent: 'center' },
  b16SealLetter: { fontSize: 30, fontWeight: '900', color: '#bfdbfe' },
  b16VerPill: { backgroundColor: '#fef9c3', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  b16VerTxt: { fontSize: 10, fontWeight: '700', color: '#92400e' },
  b16Right: { flex: 1, padding: 16, justifyContent: 'space-between' },
  b16Name: { fontSize: 20, fontWeight: '900', color: '#1e3a8a', lineHeight: 22 },
  b16Tagline: { fontSize: 11, color: '#3b82f6', fontStyle: 'italic', marginBottom: 4 },
  b16Footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#dbeafe' },
  b16Con: { fontSize: 10, color: '#1d4ed8', lineHeight: 16 },
  b16Btn: { backgroundColor: '#1e3a8a', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8 },
  b16BtnTxt: { color: '#bfdbfe', fontSize: 12, fontWeight: '700' },

  /* ── L17: SILVER TECH ── */
  b17Outer: { borderRadius: 16, overflow: 'hidden', height: 200, flexDirection: 'row', backgroundColor: '#0f172a' },
  b17GlowTop: { position: 'absolute', top: -60, left: '30%', width: 200, height: 200, borderRadius: 100, backgroundColor: '#6366f1', opacity: 0.12 },
  b17Left: { flex: 1, padding: 18, justifyContent: 'space-between', zIndex: 2 },
  b17Name: { fontSize: 22, fontWeight: '900', color: '#e2e8f0', lineHeight: 24 },
  b17Tagline: { fontSize: 11, color: '#475569', fontStyle: 'italic', marginBottom: 4 },
  b17Footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  b17Con: { fontSize: 11, color: '#475569' },
  b17Btn: { backgroundColor: '#6366f1', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8 },
  b17BtnTxt: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  b17Right: { width: 170, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  b17RingOuter: { width: 110, height: 110, borderRadius: 55, borderWidth: 1, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  b17RingMid: { width: 90, height: 90, borderRadius: 45, borderWidth: 1, borderColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  b17RingInner: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#1e1b4b', alignItems: 'center', justifyContent: 'center' },
  b17RingLetter: { fontSize: 26, fontWeight: '900', color: '#a5b4fc' },
  b17Disc: { marginTop: 10, backgroundColor: '#312e81', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  b17DiscTxt: { fontSize: 11, fontWeight: '700', color: '#a5b4fc' },

  /* ── L18: GOLDEN HOTEL ── */
  b18Outer: { borderRadius: 16, overflow: 'hidden', height: 200, flexDirection: 'row', backgroundColor: '#fffbeb' },
  b18GoldStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 6, backgroundColor: '#d97706' },
  b18Left: { width: 160, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef3c7', borderRightWidth: 1, borderRightColor: '#fde68a' },
  b18EmblemOuter: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#d97706', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  b18Emblem: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#92400e', alignItems: 'center', justifyContent: 'center' },
  b18EmblemLetter: { fontSize: 30, fontWeight: '900', color: '#fde68a' },
  b18Stars: { marginBottom: 4 },
  b18StarsTxt: { fontSize: 16, color: '#d97706', letterSpacing: 2 },
  b18Right: { flex: 1, padding: 16, justifyContent: 'space-between' },
  b18Name: { fontSize: 20, fontWeight: '900', color: '#78350f', lineHeight: 22 },
  b18Tagline: { fontSize: 11, color: '#d97706', fontStyle: 'italic', marginBottom: 4 },
  b18Footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#fde68a' },
  b18Con: { fontSize: 10, color: '#92400e', lineHeight: 16 },
  b18Btn: { backgroundColor: '#d97706', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8 },
  b18BtnTxt: { color: '#fff8e1', fontSize: 12, fontWeight: '700' },

  /* ── L19: NEON GAMING ── */
  b19Outer: { borderRadius: 16, overflow: 'hidden', height: 200, flexDirection: 'row', backgroundColor: '#030712' },
  b19GlowGreen: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#10b981', opacity: 0.1, top: -60, left: -40 },
  b19GlowPink: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: '#ec4899', opacity: 0.1, bottom: -50, right: 100 },
  b19Left: { width: 150, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  b19NeonFrame: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#111827', borderWidth: 2, borderColor: '#10b981', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  b19NeonLetter: { fontSize: 38, fontWeight: '900', color: '#34d399' },
  b19Right: { flex: 1, padding: 16, justifyContent: 'space-between', zIndex: 2 },
  b19Name: { fontSize: 22, fontWeight: '900', color: '#ffffff', lineHeight: 24 },
  b19Tagline: { fontSize: 11, color: '#6b7280', fontStyle: 'italic', marginBottom: 4 },
  b19OfferPill: { alignSelf: 'flex-start', backgroundColor: '#111827', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#10b981' },
  b19OfferTxt: { fontSize: 11, color: '#34d399', fontWeight: '700' },
  b19Footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  b19Con: { fontSize: 10, color: '#4b5563', lineHeight: 16 },
  b19Btn: { backgroundColor: '#10b981', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8 },
  b19BtnTxt: { color: '#030712', fontSize: 12, fontWeight: '800' },

  /* ── L20: ROSE WELLNESS ── */
  b20Outer: { borderRadius: 16, overflow: 'hidden', height: 200, flexDirection: 'row', backgroundColor: '#fff7f7' },
  b20CircleBg: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#fce7f3', top: -80, left: -60 },
  b20Left: { width: 160, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  b20LotusFrame: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#f9a8d4', borderWidth: 4, borderColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  b20LotusLetter: { fontSize: 36, fontWeight: '900', color: '#831843' },
  b20SubIcon: { fontSize: 20, marginBottom: 4 },
  b20DiscPill: { backgroundColor: '#be185d', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  b20DiscTxt: { fontSize: 10, fontWeight: '700', color: '#fce7f3' },
  b20Right: { flex: 1, padding: 16, justifyContent: 'space-between', zIndex: 2 },
  b20Name: { fontSize: 20, fontWeight: '900', color: '#831843', lineHeight: 22 },
  b20Tagline: { fontSize: 11, color: '#db2777', fontStyle: 'italic', marginBottom: 2 },
  b20Desc: { fontSize: 12, color: '#6b7280', lineHeight: 18 },
  b20Footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#fce7f3' },
  b20Con: { fontSize: 10, color: '#9d174d', lineHeight: 16 },
  b20Btn: { backgroundColor: '#be185d', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8 },
  b20BtnTxt: { color: '#fce7f3', fontSize: 12, fontWeight: '700' },
});
