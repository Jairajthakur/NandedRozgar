import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
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

const PURPLE   = '#9333ea';
const GREEN_WA = '#25d366';
const { width: SCREEN_W } = Dimensions.get('window');
const IS_WEB   = Platform.OS === 'web';
const GALLERY_H = IS_WEB ? 320 : 260;

const CATEGORY_ICONS = {
  Electronics: 'phone-portrait-outline',
  Furniture:   'bed-outline',
  Vehicles:    'bicycle-outline',
  Clothes:     'shirt-outline',
  Books:       'book-outline',
  Other:       'pricetag-outline',
};
const CATEGORY_COLORS = {
  Electronics: { bg: '#f3e8ff', icon: '#9333ea', accent: '#a855f7' },
  Furniture:   { bg: '#fef9c3', icon: '#ca8a04', accent: '#eab308' },
  Vehicles:    { bg: '#dcfce7', icon: '#16a34a', accent: '#22c55e' },
  Clothes:     { bg: '#fee2e2', icon: '#dc2626', accent: '#ef4444' },
  Books:       { bg: '#dbeafe', icon: '#2563eb', accent: '#3b82f6' },
  Other:       { bg: '#f3f4f6', icon: '#555',    accent: '#888' },
};
const CONDITION_COLORS = {
  'New':      { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  'Like new': { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  'Good':     { bg: '#fefce8', text: '#854d0e', border: '#fef08a' },
  'Used':     { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
};

/* ─── Slide-in wrapper ─── */
function SlideIn({ children, delay = 0, from = 20 }) {
  const slide = useRef(new Animated.Value(from)).current;
  const fade  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 420, delay, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(fade,  { toValue: 1, duration: 380, delay, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>{children}</Animated.View>;
}

/* ─── Stat Box ─── */
function StatBox({ icon, label, value, color, delay }) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const fade  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, delay, useNativeDriver: Platform.OS !== 'web', speed: 12, bounciness: 10 }),
      Animated.timing(fade,  { toValue: 1, duration: 300, delay, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[s.statBox, { opacity: fade, transform: [{ scale }] }]}>
      <View style={[s.statIconWrap, { backgroundColor: (color || PURPLE) + '18' }]}>
        <Ionicons name={icon} size={17} color={color || PURPLE} />
      </View>
      <Text style={s.statValue} numberOfLines={1}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </Animated.View>
  );
}

/* ─── CTA Button ─── */
function CTAButton({ label, onPress, color, icon, delay, outline }) {
  const slide = useRef(new Animated.Value(30)).current;
  const fade  = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 400, delay, easing: Easing.out(Easing.back(1.2)), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(fade,  { toValue: 1, duration: 350, delay, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);
  const pressIn  = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: Platform.OS !== 'web', speed: 30 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: Platform.OS !== 'web', speed: 30 }).start();
  return (
    <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: slide }, { scale }] }}>
      <TouchableOpacity
        activeOpacity={1} onPressIn={pressIn} onPressOut={pressOut} onPress={onPress}
        style={[s.ctaBtn, outline
          ? { backgroundColor: '#fff', borderWidth: 1.5, borderColor: color }
          : { backgroundColor: color }]}
      >
        {icon && <Ionicons name={icon} size={18} color={outline ? color : '#fff'} style={{ marginRight: 8 }} />}
        <Text style={[s.ctaBtnTxt, outline && { color }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ─── Image Gallery ─── */
function ImageGallery({ photos, category }) {
  const { t } = useLang();
  const [activeIdx, setActiveIdx] = useState(0);
  const flatRef = useRef(null);
  const dotScale = useRef(photos.map(() => new Animated.Value(1))).current;
  const catColor = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
  const iconName = CATEGORY_ICONS[category] || 'pricetag-outline';

  const onScroll = useCallback((e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx !== activeIdx) {
      setActiveIdx(idx);
      photos.forEach((_, i) => {
        Animated.spring(dotScale[i], { toValue: i === idx ? 1.4 : 1, useNativeDriver: Platform.OS !== 'web', speed: 20 }).start();
      });
    }
  }, [activeIdx, photos]);

  if (!photos || photos.length === 0) {
    const pulse = useRef(new Animated.Value(1)).current;
    const float = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 1400, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 1,    duration: 1400, useNativeDriver: Platform.OS !== 'web' }),
      ])).start();
      Animated.loop(Animated.sequence([
        Animated.timing(float, { toValue: -8, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(float, { toValue:  0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      ])).start();
    }, []);
    return (
      <View style={[s.gallery, { backgroundColor: catColor.bg, overflow: 'hidden' }]}>
          {/* Glossy sheen */}
          <LinearGradient colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']} pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', zIndex: 1 }} />
          <LinearGradient colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']} pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, zIndex: 2 }} />
        <View style={s.galleryRing1} />
        <View style={s.galleryRing2} />
        <Animated.View style={{ transform: [{ scale: pulse }, { translateY: float }], alignItems: 'center' }}>
          <View style={[s.noPhotoIconWrap, { backgroundColor: catColor.bg }]}>
            <Ionicons name={iconName} size={64} color={catColor.icon} />
          </View>
        </Animated.View>
        <Text style={[s.noPhotoTxt, { color: catColor.icon }]}>{t('noPhotosAvailable')}</Text>
      </View>
    );
  }

  return (
    <View style={s.gallery}>
      <FlatList
        ref={flatRef}
        data={photos}
        horizontal pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(url, i) => url || String(i)}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_W, height: GALLERY_H }}>
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

/* ─── Main Screen ─── */
export default function BuySellDetailScreen() {
  const nav    = useNavigation();
  const route  = useRoute();
  const insets = useSafeAreaInsets();
  const { lang, t } = useLang();
  const item   = route.params?.item;

  const [saved, setSaved]   = useState(false);
  const savedScale = useRef(new Animated.Value(1)).current;
  const scrollY    = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [GALLERY_H - 80, GALLERY_H - 40],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

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

  if (!item) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
        <Ionicons name="cube-outline" size={48} color="#ddd" />
        <Text style={{ color: '#aaa', marginTop: 10, fontSize: 15, fontWeight: '600' }}>Item not found</Text>
        <TouchableOpacity onPress={() => nav.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ color: PURPLE, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const catColor  = CATEGORY_COLORS[item.cat]  || CATEGORY_COLORS.Other;
  const condStyle = CONDITION_COLORS[item.condition] || CONDITION_COLORS['Used'];
  const photoUrls = item.photoUrls || [];

  const quickStats = [
    { icon: 'layers-outline',    label: 'Category',  value: item.cat || 'Other',       color: catColor.accent },
    { icon: 'star-outline',      label: 'Condition',  value: item.condition || 'Used',  color: '#f59e0b' },
    { icon: 'location-outline',  label: 'Location',   value: item.loc || 'Nanded',      color: PURPLE },
    { icon: 'time-outline',      label: 'Posted',     value: item.time || 'Recent',     color: '#64748b' },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle={photoUrls.length > 0 ? 'light-content' : 'dark-content'} />

      {/* Floating bar */}
      <View style={[s.floatingBar, { top: (insets.top || 0) + 6 }]}>
        <TouchableOpacity style={[s.floatBtn, photoUrls.length === 0 && s.floatBtnDark]} onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={18} color={photoUrls.length === 0 ? '#333' : '#fff'} />
        </TouchableOpacity>
        <Animated.View style={{ opacity: headerOpacity, flex: 1, alignItems: 'center' }}>
          <Text style={s.floatTitle} numberOfLines={1}>{item.title}</Text>
        </Animated.View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[s.floatBtn, photoUrls.length === 0 && s.floatBtnDark]} onPress={shareItem}>
            <Ionicons name="share-social-outline" size={17} color={photoUrls.length === 0 ? '#333' : '#fff'} />
          </TouchableOpacity>
          <Animated.View style={{ transform: [{ scale: savedScale }] }}>
            <TouchableOpacity style={[s.floatBtn, photoUrls.length === 0 && s.floatBtnDark]} onPress={toggleSaved}>
              <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={saved ? PURPLE : (photoUrls.length === 0 ? '#333' : '#fff')} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      <Animated.ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Gallery */}
        <ImageGallery photos={photoUrls} category={item.cat} />

        {/* ── Title + Price ── */}
        <SlideIn delay={60}>
          <View style={s.titleCard}>
            <View style={{ flex: 1 }}>
              <AutoTranslate text={item.title} lang={lang} style={s.itemTitle} />
              <View style={s.tagsRow}>
                <View style={[s.catTag, { backgroundColor: catColor.bg }]}>
                  <Ionicons name={CATEGORY_ICONS[item.cat] || 'pricetag-outline'} size={12} color={catColor.icon} style={{ marginRight: 4 }} />
                  <Text style={[s.catTagTxt, { color: catColor.icon }]}>{item.cat || 'Other'}</Text>
                </View>
                <View style={[s.condTag, { backgroundColor: condStyle.bg, borderColor: condStyle.border }]}>
                  <Text style={[s.condTagTxt, { color: condStyle.text }]}>{item.condition}</Text>
                </View>
                {item.seller?.verified && (
                  <View style={s.verifiedTag}>
                    <Ionicons name="shield-checkmark" size={11} color="#16a34a" style={{ marginRight: 3 }} />
                    <Text style={s.verifiedTagTxt}>{t('verified')}</Text>
                  </View>
                )}
                {photoUrls.length > 0 && (
                  <View style={s.photoTag}>
                    <Ionicons name="images-outline" size={11} color="#0ea5e9" style={{ marginRight: 3 }} />
                    <Text style={s.photoTagTxt}>{photoUrls.length} Photos</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={s.priceBlock}>
              <Text style={s.priceAmt}>{item.price}</Text>
              {item.negotiable && <Text style={s.negotiableTxt}>{t('makeOffer')}</Text>}
            </View>
          </View>
        </SlideIn>

        {/* ── Quick Stats ── */}
        <SlideIn delay={120}>
          <View style={s.statsSection}>
            <Text style={s.sectionTitle}>{t('itemDetails')}</Text>
            <View style={s.statsGrid}>
              {quickStats.map((stat, i) => (
                <StatBox key={i} {...stat} delay={i * 55} />
              ))}
            </View>
          </View>
        </SlideIn>

        {/* ── Description ── */}
        <SlideIn delay={180}>
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('description')}</Text>
            <View style={s.descBox}>
              <AutoTranslate
                text={item.description ||
                  `This ${item.title} is listed in ${item.condition} condition. Located in ${item.loc}. Contact the seller for more details or to negotiate the price.`}
                lang={lang}
                style={s.descTxt}
              />
            </View>
          </View>
        </SlideIn>

        {/* ── Extra Details ── */}
        {(item.brand || item.age || item.warranty) && (
          <SlideIn delay={220}>
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t('specifications')}</Text>
              <View style={s.detailGrid}>
                {item.brand    && <View style={s.detailItem}><Text style={s.detailLabel}>{t('brand') || 'Brand'}</Text><Text style={s.detailVal}>{item.brand}</Text></View>}
                {item.age      && <View style={s.detailItem}><Text style={s.detailLabel}>{t('age') || 'Age'}</Text><Text style={s.detailVal}>{item.age}</Text></View>}
                {item.warranty && <View style={s.detailItem}><Text style={s.detailLabel}>{t('warranty') || 'Warranty'}</Text><Text style={s.detailVal}>{item.warranty}</Text></View>}
                <View style={s.detailItem}><Text style={s.detailLabel}>{t('price') || 'Price'}</Text><Text style={s.detailVal}>{item.negotiable ? 'Negotiable' : 'Fixed'}</Text></View>
              </View>
            </View>
          </SlideIn>
        )}

        {/* ── Seller ── */}
        <SlideIn delay={260}>
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('seller')}</Text>
            <View style={s.sellerCard}>
              <View style={[s.sellerAvatar, { backgroundColor: catColor.bg }]}>
                <Text style={[s.sellerInitial, { color: catColor.icon }]}>
                  {(item.seller?.name || item.sellerName || 'S')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.sellerName}>{item.seller?.name || item.sellerName || 'Seller'}</Text>
                <Text style={s.sellerSub}>{item.loc} · {item.time}</Text>
              </View>
              {(item.seller?.verified || item.verified) && (
                <View style={s.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={13} color="#16a34a" />
                  <Text style={s.verifiedBadgeTxt}>{t('verified')}</Text>
                </View>
              )}
            </View>
          </View>
        </SlideIn>

        {/* ── Safety Tips ── */}
        <SlideIn delay={300}>
          <View style={s.safetyCard}>
            <View style={s.safetyHeader}>
              <Ionicons name="information-circle-outline" size={16} color="#0369a1" style={{ marginRight: 6 }} />
              <Text style={s.safetyTitle}>{t('buyingTips')}</Text>
            </View>
            {['Inspect item in person before making payment', 'Prefer meeting in public places', 'Verify item condition matches listing'].map((tip, i) => (
              <Text key={i} style={s.safetyTip}>· {tip}</Text>
            ))}
          </View>
        </SlideIn>
      </Animated.ScrollView>

      {/* ── Sticky CTA Bar ── */}
      <SlideIn delay={380} from={40}>
        <View style={[s.stickyBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <CTAButton label={t('callSeller')}  onPress={callSeller}    color={PURPLE}    icon="call"           delay={0} />
          <CTAButton label="WhatsApp"     onPress={openWhatsApp}  color={GREEN_WA}  icon="logo-whatsapp"  delay={60} />
        </View>
      </SlideIn>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flex: 1 },

  /* Floating bar */
  floatingBar: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, gap: 8, zIndex: 100,
  },
  floatBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.50)',
    alignItems: 'center', justifyContent: 'center',
  },
  floatBtnDark: { backgroundColor: 'rgba(255,255,255,0.85)' },
  floatTitle: { fontSize: 14, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },

  /* Gallery */
  gallery:    { height: GALLERY_H, width: '100%', backgroundColor: '#f3f4f6', position: 'relative' },
  galleryRing1: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.06)', top: -60, right: -50,
  },
  galleryRing2: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.05)', bottom: -40, left: -30,
  },
  noPhotoIconWrap: {
    width: 110, height: 110, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  noPhotoTxt: { fontSize: 12, marginTop: 12, fontWeight: '600', opacity: 0.65 },
  imgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)' },

  dotsRow: {
    position: 'absolute', bottom: 14,
    flexDirection: 'row', alignSelf: 'center', gap: 5,
  },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: '#fff', width: 18, borderRadius: 3 },
  photoBadge: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10,
  },
  photoBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '600' },

  /* Title card */
  titleCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  itemTitle: { fontSize: 20, fontWeight: '900', color: '#111', letterSpacing: -0.3, marginBottom: 8 },
  tagsRow:   { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  catTag: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10,
  },
  catTagTxt: { fontSize: 12, fontWeight: '700' },
  condTag: {
    borderWidth: 1.5, borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 10,
  },
  condTagTxt: { fontSize: 12, fontWeight: '700' },
  verifiedTag: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#bbf7d0', backgroundColor: '#f0fdf4',
    borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10,
  },
  verifiedTagTxt: { fontSize: 12, color: '#16a34a', fontWeight: '700' },
  photoTag: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#bae6fd', backgroundColor: '#f0f9ff',
    borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10,
  },
  photoTagTxt: { fontSize: 12, color: '#0369a1', fontWeight: '700' },
  priceBlock:     { alignItems: 'flex-end', marginLeft: 8 },
  priceAmt:       { fontSize: 26, fontWeight: '900', color: PURPLE },
  negotiableTxt:  { fontSize: 11, color: '#a78bfa', marginTop: 2, fontWeight: '600' },

  /* Stats */
  statsSection: { backgroundColor: '#fff', marginTop: 10, paddingBottom: 14 },
  sectionTitle: {
    fontSize: 10, fontWeight: '800', color: '#bbb',
    letterSpacing: 1.2, paddingHorizontal: 16,
    paddingTop: 16, paddingBottom: 10, backgroundColor: '#f5f5f5',
  },
  statsGrid: { flexDirection: 'row', paddingHorizontal: 14, gap: 10 },
  statBox: {
    flex: 1, backgroundColor: '#f9f9f9', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center',
    borderWidth: 1, borderColor: '#f0f0f0',
  },
  statIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  statValue: { fontSize: 12, fontWeight: '800', color: '#111', textAlign: 'center' },
  statLabel: { fontSize: 10, color: '#aaa', fontWeight: '600', marginTop: 2, textAlign: 'center' },

  /* Section */
  section: { backgroundColor: '#fff', marginTop: 10, paddingBottom: 6 },

  /* Description */
  descBox: { marginHorizontal: 14, marginBottom: 8 },
  descTxt: { fontSize: 14, color: '#444', lineHeight: 22 },

  /* Detail grid */
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 14, paddingBottom: 8 },
  detailItem: {
    backgroundColor: '#f5f5f5', borderRadius: 10,
    padding: 12, minWidth: '45%', flex: 1,
  },
  detailLabel: { fontSize: 10, color: '#aaa', marginBottom: 4, fontWeight: '600', textTransform: 'uppercase' },
  detailVal:   { fontSize: 13, fontWeight: '800', color: '#111' },

  /* Seller */
  sellerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 14, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#ebebeb', backgroundColor: '#fafafa',
  },
  sellerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  sellerInitial: { fontSize: 18, fontWeight: '900' },
  sellerName:    { fontSize: 15, fontWeight: '800', color: '#111' },
  sellerSub:     { fontSize: 11, color: '#aaa', marginTop: 2 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac',
    borderRadius: 20, paddingVertical: 4, paddingHorizontal: 8,
  },
  verifiedBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#16a34a' },

  /* Safety card */
  safetyCard: {
    margin: 14, borderRadius: 12, padding: 14,
    backgroundColor: '#faf5ff', borderWidth: 1, borderColor: '#e9d5ff',
  },
  safetyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  safetyTitle:  { fontSize: 13, fontWeight: '800', color: '#7e22ce' },
  safetyTip:    { fontSize: 12, color: '#6b21a8', lineHeight: 20, fontWeight: '500' },

  /* Sticky CTA */
  stickyBar: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 14, paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, paddingVertical: 14,
  },
  ctaBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
