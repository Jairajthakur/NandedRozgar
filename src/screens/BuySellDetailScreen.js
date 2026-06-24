import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Linking, Alert, Image, Animated, Easing, Share,
  FlatList, Dimensions, Platform, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '../utils/i18n';
import { AutoTranslate } from '../utils/translate';

const ORANGE   = '#f97316';
const GREEN_WA = '#25d366';
const { width: SW } = Dimensions.get('window');
const IS_WEB    = Platform.OS === 'web';
const GALLERY_H = IS_WEB ? 320 : 260;

const CATEGORY_ICONS = {
  Electronics: 'phone-portrait-outline',
  Furniture:   'bed-outline',
  Vehicles:    'bicycle-outline',
  Clothes:     'shirt-outline',
  Books:       'book-outline',
  Other:       'pricetag-outline',
};

/* ─── Floating particle dot ─── */
function Particle({ delay, x, size, color }) {
  const y  = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(y,  { toValue: -60, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
          Animated.sequence([
            Animated.timing(op, { toValue: 0.55, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(op, { toValue: 0,    duration: 1600, useNativeDriver: Platform.OS !== 'web' }),
          ]),
        ]),
        Animated.parallel([
          Animated.timing(y,  { toValue: 0, duration: 0, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(op, { toValue: 0, duration: 0, useNativeDriver: Platform.OS !== 'web' }),
        ]),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        position: 'absolute', bottom: 16, left: x,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color, opacity: op,
        transform: [{ translateY: y }],
      }}
    />
  );
}

/* ─── Animated stat pill ─── */
function StatPill({ icon, value, label, delay }) {
  const scale = useRef(new Animated.Value(0.7)).current;
  const op    = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, delay, useNativeDriver: Platform.OS !== 'web', damping: 11, stiffness: 130 }),
      Animated.timing(op,    { toValue: 1, duration: 320, delay, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[s.statPill, { opacity: op, transform: [{ scale }] }]}>
      <Ionicons name={icon} size={14} color={ORANGE} />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </Animated.View>
  );
}

/* ─── Section fade-in ─── */
function FadeSection({ children, delay = 0 }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 400, delay, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(ty, { toValue: 0, duration: 380, delay, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: op, transform: [{ translateY: ty }] }}>{children}</Animated.View>;
}

/* ─── Action button ─── */
function ActionBtn({ label, icon, color, onPress, outline = false, delay = 0 }) {
  const scale  = useRef(new Animated.Value(1)).current;
  const slideY = useRef(new Animated.Value(20)).current;
  const op     = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op,     { toValue: 1, duration: 360, delay, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideY, { toValue: 0, duration: 360, delay, easing: Easing.out(Easing.back(1.1)), useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 65, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: Platform.OS !== 'web', damping: 8, stiffness: 200 }),
    ]).start();
    onPress?.();
  };
  return (
    <Animated.View style={{ opacity: op, transform: [{ translateY: slideY }, { scale }] }}>
      <TouchableOpacity
        onPress={press} activeOpacity={1}
        style={[
          s.actionBtn,
          outline
            ? { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e5e5' }
            : { backgroundColor: color },
        ]}
      >
        {icon && <Ionicons name={icon} size={19} color={outline ? '#555' : '#fff'} />}
        <Text style={[s.actionBtnTxt, outline && { color: '#555' }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ─── Skill chip (tag) ─── */
function TagChip({ label, index }) {
  const op    = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.75)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op,    { toValue: 1, duration: 300, delay: index * 60, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(scale, { toValue: 1, delay: index * 60, useNativeDriver: Platform.OS !== 'web', damping: 12 }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[s.tagChip, { opacity: op, transform: [{ scale }] }]}>
      <Ionicons name="star" size={11} color={ORANGE} />
      <Text style={s.tagTxt}>{label}</Text>
    </Animated.View>
  );
}

/* ─── Info row ─── */
function InfoRow({ icon, label, value, color }) {
  return (
    <View style={s.infoRow}>
      <View style={[s.infoIconBox, { backgroundColor: (color || ORANGE) + '18' }]}>
        <Ionicons name={icon} size={15} color={color || ORANGE} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoRowLabel}>{label}</Text>
        <Text style={s.infoRowValue}>{value}</Text>
      </View>
    </View>
  );
}

/* ─── Image Gallery ─── */
function ImageGallery({ photos, category }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const flatRef  = useRef(null);
  const dotScale = useRef(photos.map(() => new Animated.Value(1))).current;
  const pulse    = useRef(new Animated.Value(1)).current;
  const float    = useRef(new Animated.Value(0)).current;
  const iconName = CATEGORY_ICONS[category] || 'pricetag-outline';

  useEffect(() => {
    if (!photos || photos.length === 0) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 1400, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 1,    duration: 1400, useNativeDriver: Platform.OS !== 'web' }),
      ])).start();
      Animated.loop(Animated.sequence([
        Animated.timing(float, { toValue: -8, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(float, { toValue:  0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      ])).start();
    }
  }, []);

  const onScroll = useCallback((e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
    if (idx !== activeIdx) {
      setActiveIdx(idx);
      photos.forEach((_, i) => {
        Animated.spring(dotScale[i], { toValue: i === idx ? 1.4 : 1, useNativeDriver: Platform.OS !== 'web', speed: 20 }).start();
      });
    }
  }, [activeIdx, photos]);

  if (!photos || photos.length === 0) {
    return (
      <View style={[s.gallery, { backgroundColor: '#fff7ed', overflow: 'hidden' }]}>
        <View style={s.galleryRing1} />
        <View style={s.galleryRing2} />
        <Animated.View style={{ transform: [{ scale: pulse }, { translateY: float }], alignItems: 'center' }}>
          <View style={s.noPhotoIconWrap}>
            <Ionicons name={iconName} size={64} color={ORANGE} />
          </View>
        </Animated.View>
        <Text style={s.noPhotoTxt}>No photos uploaded</Text>
      </View>
    );
  }

  return (
    <View style={s.gallery}>
      <FlatList
        ref={flatRef} data={photos} horizontal pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll} scrollEventThrottle={16}
        keyExtractor={(url, i) => url || String(i)}
        renderItem={({ item }) => (
          <View style={{ width: SW, height: GALLERY_H }}>
            <Image source={{ uri: item }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
            <View style={s.imgOverlay} />
          </View>
        )}
      />
      {photos.length > 1 && (
        <View style={s.dotsRow}>
          {photos.map((_, i) => (
            <Animated.View key={i} style={[s.dot, i === activeIdx && s.dotActive, { transform: [{ scale: dotScale[i] }] }]} />
          ))}
        </View>
      )}
      <View style={s.photoBadge}>
        <Ionicons name="images-outline" size={11} color="#fff" style={{ marginRight: 4 }} />
        <Text style={s.photoBadgeTxt}>{activeIdx + 1}/{photos.length}</Text>
      </View>
    </View>
  );
}

/* ════════════════════════════ MAIN SCREEN ════════════════════════════ */
export default function BuySellDetailScreen() {
  const nav    = useNavigation();
  const route  = useRoute();
  const insets = useSafeAreaInsets();
  const { lang, t } = useLang();
  const item   = route.params?.item;

  const [saved, setSaved] = useState(false);
  const savedScale = useRef(new Animated.Value(1)).current;

  // Hero animation refs
  const iconScale   = useRef(new Animated.Value(0)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const ringScale   = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(iconScale,   { toValue: 1, delay: 120, damping: 10, stiffness: 110, useNativeDriver: Platform.OS !== 'web' }),
      Animated.parallel([
        Animated.timing(ringOpacity, { toValue: 1, duration: 400, delay: 200, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(ringScale,   { toValue: 1, delay: 200, damping: 12, stiffness: 90, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, []);

  if (!item) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
        <Ionicons name="cube-outline" size={48} color="#ddd" />
        <Text style={{ color: '#aaa', marginTop: 10, fontSize: 15, fontWeight: '600' }}>Item not found</Text>
        <TouchableOpacity onPress={() => nav.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ color: ORANGE, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function toggleSaved() {
    setSaved(v => !v);
    Animated.sequence([
      Animated.spring(savedScale, { toValue: 1.4, useNativeDriver: Platform.OS !== 'web', speed: 25, bounciness: 12 }),
      Animated.spring(savedScale, { toValue: 1,   useNativeDriver: Platform.OS !== 'web', speed: 25 }),
    ]).start();
  }

  function callSeller() {
    const phone = item?.phone || item?.whatsapp || '';
    if (phone) Linking.openURL(`tel:${phone}`);
    else Alert.alert('Contact', 'Please contact via WhatsApp.');
  }

  function openWhatsApp() {
    const phone = item?.phone || item?.whatsapp || '';
    const msg   = `Hi, I'm interested in your "${item?.title}" listed on CityPlus for ${item?.price}.`;
    if (phone)
      Linking.openURL(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`).catch(() =>
        Alert.alert('WhatsApp not installed', 'Please contact via call.')
      );
    else Alert.alert('Contact', 'WhatsApp number not available.');
  }

  async function shareItem() {
    try {
      await Share.share({
        message: `Check out this item on CityPlus!\n${item?.title} — ${item?.price}\n📍 ${item?.loc}\nCondition: ${item?.condition}`,
        title: `${item?.title} — CityPlus`,
      });
    } catch {}
  }

  const photoUrls = item.photoUrls || [];
  const catIcon   = CATEGORY_ICONS[item.cat] || 'pricetag-outline';

  // Build spec tags
  const specTags = [
    item.brand    && `Brand: ${item.brand}`,
    item.age      && `Age: ${item.age}`,
    item.warranty && `Warranty: ${item.warranty}`,
    item.condition,
  ].filter(Boolean);

  const PARTICLES = [
    { x: SW * 0.12, size: 7,  color: 'rgba(255,255,255,0.6)', delay: 0 },
    { x: SW * 0.28, size: 5,  color: 'rgba(255,255,255,0.4)', delay: 400 },
    { x: SW * 0.45, size: 9,  color: 'rgba(255,200,100,0.5)', delay: 800 },
    { x: SW * 0.62, size: 5,  color: 'rgba(255,255,255,0.35)', delay: 200 },
    { x: SW * 0.78, size: 7,  color: 'rgba(255,255,255,0.55)', delay: 600 },
    { x: SW * 0.90, size: 4,  color: 'rgba(255,200,100,0.4)', delay: 1000 },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      <StatusBar barStyle="light-content" backgroundColor={ORANGE} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ══════════ HERO HEADER ══════════ */}
        <Animated.View style={[s.hero, { paddingTop: insets.top + 52, opacity: heroOpacity }]}>
          <View style={s.arcTop} />
          <View style={s.arcBottom} />
          {PARTICLES.map((p, i) => <Particle key={i} x={p.x} size={p.size} color={p.color} delay={p.delay} />)}

          {/* Top nav */}
          <View style={[s.heroNav, { top: insets.top + 10 }]}>
            <TouchableOpacity style={s.navBtn} onPress={() => nav.goBack()} activeOpacity={0.85}>
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </TouchableOpacity>
            <Animated.View style={{ transform: [{ scale: savedScale }] }}>
              <TouchableOpacity style={s.navBtn} onPress={toggleSaved} activeOpacity={0.85}>
                <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={saved ? '#fde68a' : '#fff'} />
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity style={s.navBtn} onPress={shareItem} activeOpacity={0.85}>
              <Ionicons name="share-social-outline" size={17} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Hero icon */}
          <View style={s.iconContainer}>
            <Animated.View style={[s.iconRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
            <Animated.View style={[s.heroIconWrap, { transform: [{ scale: Animated.multiply(iconScale, pulseAnim) }] }]}>
              <Ionicons name={catIcon} size={34} color={ORANGE} />
            </Animated.View>
          </View>

          <AutoTranslate text={item.title || 'Item'} lang={lang} style={s.heroTitle} numberOfLines={2} />

          <View style={s.heroSubRow}>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={s.heroSubTxt}>{item.loc || 'Nanded'}</Text>
            {item.seller?.verified && (
              <View style={s.heroBadge}>
                <Ionicons name="checkmark-circle" size={10} color="#4ade80" />
                <Text style={s.heroBadgeTxt}>Verified</Text>
              </View>
            )}
          </View>

          {/* Stat pills */}
          <View style={s.statsRow}>
            <StatPill icon="cash-outline"      value={item.price || '—'}                label="Price"      delay={300} />
            <StatPill icon="layers-outline"    value={item.cat || 'Other'}              label="Category"   delay={380} />
            <StatPill icon="star-outline"      value={item.condition || 'Used'}         label="Condition"  delay={460} />
            {!!item.time && <StatPill icon="time-outline" value={item.time}             label="Posted"     delay={540} />}
          </View>

          {/* Negotiable tag */}
          {item.negotiable && (
            <View style={s.negotiableBanner}>
              <Ionicons name="pricetag" size={13} color="#fff" />
              <Text style={s.negotiableTxt}>Price Negotiable</Text>
            </View>
          )}
        </Animated.View>

        {/* ── Photo Gallery ── */}
        <FadeSection delay={80}>
          <ImageGallery photos={photoUrls} category={item.cat} />
        </FadeSection>

        {/* ── Quick Info card ── */}
        <FadeSection delay={100}>
          <View style={s.quickInfoCard}>
            <InfoRow icon="cash-outline"     label="Price"      value={item.price || '—'}                    color="#16a34a" />
            <InfoRow icon="layers-outline"   label="Category"   value={item.cat || 'Other'}                  color="#7c3aed" />
            <InfoRow icon="star-outline"     label="Condition"  value={item.condition || 'Used'}             color={ORANGE}  />
            <InfoRow icon="location-outline" label="Location"   value={item.loc || 'Nanded'}                 color="#0891b2" />
            {!!item.time && <InfoRow icon="time-outline" label="Posted" value={item.time}                    color="#64748b" />}
            {item.negotiable && <InfoRow icon="pricetag-outline" label="Price Type" value="Negotiable"       color="#16a34a" />}
          </View>
        </FadeSection>

        {/* ── Description ── */}
        <FadeSection delay={160}>
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.cardHeaderDot} />
              <Text style={s.cardTitle}>DESCRIPTION</Text>
            </View>
            <AutoTranslate
              text={item.description ||
                `This ${item.title} is listed in ${item.condition} condition. Located in ${item.loc}. Contact the seller for more details or to negotiate the price.`}
              lang={lang}
              style={s.descText}
            />
          </View>
        </FadeSection>

        {/* ── Specifications ── */}
        {specTags.length > 0 && (
          <FadeSection delay={220}>
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={[s.cardHeaderDot, { backgroundColor: '#8b5cf6' }]} />
                <Text style={s.cardTitle}>SPECIFICATIONS</Text>
              </View>
              <View style={s.chipsRow}>
                {specTags.map((tag, i) => <TagChip key={i} label={tag} index={i} />)}
              </View>
            </View>
          </FadeSection>
        )}

        {/* ── Extra detail grid (brand / age / warranty) ── */}
        {(item.brand || item.age || item.warranty) && (
          <FadeSection delay={260}>
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={[s.cardHeaderDot, { backgroundColor: '#0891b2' }]} />
                <Text style={s.cardTitle}>ITEM DETAILS</Text>
              </View>
              <View style={s.detailGrid}>
                {item.brand    && <View style={s.detailItem}><Text style={s.detailLabel}>BRAND</Text><Text style={s.detailVal}>{item.brand}</Text></View>}
                {item.age      && <View style={s.detailItem}><Text style={s.detailLabel}>AGE</Text><Text style={s.detailVal}>{item.age}</Text></View>}
                {item.warranty && <View style={s.detailItem}><Text style={s.detailLabel}>WARRANTY</Text><Text style={s.detailVal}>{item.warranty}</Text></View>}
                <View style={s.detailItem}><Text style={s.detailLabel}>PRICE TYPE</Text><Text style={s.detailVal}>{item.negotiable ? 'Negotiable' : 'Fixed'}</Text></View>
              </View>
            </View>
          </FadeSection>
        )}

        {/* ── Seller card ── */}
        <FadeSection delay={300}>
          <View style={s.ownerCard}>
            <View style={s.ownerIconWrap}>
              <Text style={s.ownerInitial}>
                {(item.seller?.name || item.sellerName || 'S')[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.ownerName}>{item.seller?.name || item.sellerName || 'Seller'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                <Ionicons name="location-outline" size={11} color="#888" />
                <Text style={s.ownerLoc}>{item.loc} · {item.time}</Text>
              </View>
            </View>
            {(item.seller?.verified || item.verified) && (
              <View style={s.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={15} color="#16a34a" />
                <View>
                  <Text style={s.verifiedTxt}>✓ Verified Seller</Text>
                  <Text style={s.verifiedSub}>ID & phone confirmed</Text>
                </View>
              </View>
            )}
          </View>
        </FadeSection>

        {/* ── Buying tips ── */}
        <FadeSection delay={340}>
          <View style={s.safetyCard}>
            <View style={s.safetyHeader}>
              <Ionicons name="information-circle-outline" size={16} color="#0369a1" />
              <Text style={s.safetyTitle}>BUYING TIPS</Text>
            </View>
            {[
              'Inspect item in person before making payment',
              'Prefer meeting in public places',
              'Verify item condition matches listing',
            ].map((tip, i) => (
              <View key={i} style={s.reqRow}>
                <View style={s.reqDot} />
                <Text style={s.reqTxt}>{tip}</Text>
              </View>
            ))}
          </View>
        </FadeSection>

        {/* ── Action Buttons ── */}
        <View style={s.actionsBlock}>
          <ActionBtn label="Call Seller"       icon="call"                  color={ORANGE}   onPress={callSeller}    delay={0}   />
          <ActionBtn label="Chat on WhatsApp"  icon="logo-whatsapp"         color={GREEN_WA} onPress={openWhatsApp}  delay={80}  />
          <ActionBtn label="Share Listing"     icon="share-social-outline"  outline          onPress={shareItem}     delay={160} />
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  /* ── Hero ── */
  hero: {
    backgroundColor: ORANGE,
    paddingHorizontal: 18,
    paddingBottom: 28,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  arcTop: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  arcBottom: {
    position: 'absolute', bottom: -80, left: -40,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(0,0,0,0.07)',
  },
  heroNav: {
    position: 'absolute', right: 16,
    flexDirection: 'row', gap: 8,
    zIndex: 10,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconContainer: {
    width: 100, height: 100,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, marginTop: 8,
  },
  iconRing: {
    position: 'absolute',
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroIconWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  heroTitle: {
    fontSize: 22, fontWeight: '900', color: '#fff',
    textAlign: 'center', lineHeight: 28, letterSpacing: -0.3,
    marginBottom: 8, paddingHorizontal: 10,
  },
  heroSubRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 18,
  },
  heroSubTxt: { fontSize: 13, color: 'rgba(255,255,255,0.88)', fontWeight: '600' },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10,
    paddingVertical: 2, paddingHorizontal: 7,
  },
  heroBadgeTxt: { fontSize: 10, color: '#4ade80', fontWeight: '700' },
  statsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    justifyContent: 'center', marginBottom: 6,
  },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  statValue: { fontSize: 13, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  negotiableBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#16a34a', borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 14, marginTop: 10,
  },
  negotiableTxt: { fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 1 },

  /* ── Gallery ── */
  gallery: { height: GALLERY_H, width: '100%', backgroundColor: '#fff7ed', position: 'relative', alignItems: 'center', justifyContent: 'center' },
  galleryRing1: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    borderWidth: 1.5, borderColor: 'rgba(249,115,22,0.15)', top: -60, right: -50,
  },
  galleryRing2: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    borderWidth: 1.5, borderColor: 'rgba(249,115,22,0.1)', bottom: -40, left: -30,
  },
  noPhotoIconWrap: {
    width: 110, height: 110, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  noPhotoTxt: { color: ORANGE, fontSize: 12, marginTop: 12, fontWeight: '600', opacity: 0.65 },
  imgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)' },
  dotsRow: { position: 'absolute', bottom: 14, flexDirection: 'row', alignSelf: 'center', gap: 5 },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: '#fff', width: 18, borderRadius: 3 },
  photoBadge: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10,
  },
  photoBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '600' },

  /* ── Quick Info ── */
  quickInfoCard: {
    backgroundColor: '#fff', marginHorizontal: 14, marginTop: 12,
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  infoIconBox: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  infoRowLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', letterSpacing: 0.4 },
  infoRowValue: { fontSize: 14, color: '#0f172a', fontWeight: '700', marginTop: 1 },

  /* ── Cards ── */
  card: {
    backgroundColor: '#fff', marginHorizontal: 14, marginTop: 10,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardHeaderDot: { width: 4, height: 18, borderRadius: 2, backgroundColor: ORANGE },
  cardTitle: { fontSize: 11, fontWeight: '800', color: '#64748b', letterSpacing: 1.2 },
  descText:  { fontSize: 14, lineHeight: 23, color: '#334155' },

  /* ── Tags / spec chips ── */
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fff7ed', borderRadius: 20,
    borderWidth: 1, borderColor: '#fed7aa',
    paddingVertical: 7, paddingHorizontal: 14,
  },
  tagTxt: { fontSize: 12, fontWeight: '700', color: '#c2410c' },

  /* ── Detail grid ── */
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  detailItem: {
    backgroundColor: '#f8fafc', borderRadius: 10,
    padding: 12, minWidth: '45%', flex: 1,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  detailLabel: { fontSize: 10, color: '#94a3b8', marginBottom: 4, fontWeight: '700', letterSpacing: 0.4 },
  detailVal:   { fontSize: 13, fontWeight: '800', color: '#0f172a' },

  /* ── Req rows ── */
  reqRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 9 },
  reqDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ORANGE, marginTop: 8, flexShrink: 0 },
  reqTxt: { fontSize: 14, color: '#334155', lineHeight: 22, flex: 1 },

  /* ── Owner/Seller card ── */
  ownerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', marginHorizontal: 14, marginTop: 10,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  ownerIconWrap: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
  },
  ownerInitial: { fontSize: 22, fontWeight: '900', color: '#fff' },
  ownerName:    { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  ownerLoc:     { fontSize: 12, color: '#64748b' },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f0fdf4', borderRadius: 12, borderWidth: 1.5, borderColor: '#86efac',
    paddingVertical: 8, paddingHorizontal: 12,
  },
  verifiedTxt: { fontSize: 12, color: '#16a34a', fontWeight: '800' },
  verifiedSub: { fontSize: 10, color: '#4ade80', fontWeight: '500', marginTop: 1 },

  /* ── Safety card ── */
  safetyCard: {
    backgroundColor: '#eff6ff', marginHorizontal: 14, marginTop: 10,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  safetyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  safetyTitle:  { fontSize: 11, fontWeight: '800', color: '#1d4ed8', letterSpacing: 1.2 },

  /* ── Actions ── */
  actionsBlock: { paddingHorizontal: 14, paddingTop: 16, gap: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 9, borderRadius: 14, paddingVertical: 16,
  },
  actionBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

export {};
