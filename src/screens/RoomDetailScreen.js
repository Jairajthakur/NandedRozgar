import React, { useRef, useEffect, useState, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  View, Text, ScrollView, TouchableOpacity, Linking,
  StyleSheet, Share, Animated, Easing, Image,
  Dimensions, FlatList, Modal, StatusBar, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '../utils/i18n';
import { AutoTranslate } from '../utils/translate';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const HERO_H = 280;
const GREEN_WA = '#25d366';
const TEAL = '#0d9488';
const DARK = '#0f172a';

/* ─── Full-screen Image Viewer ─── */
function ImageViewer({ visible, images, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);
  const flatRef = useRef(null);

  useEffect(() => {
    setCurrent(startIndex);
    if (visible && flatRef.current) {
      setTimeout(() => {
        flatRef.current?.scrollToIndex({ index: startIndex, animated: false });
      }, 50);
    }
  }, [visible, startIndex]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <StatusBar hidden />
      <View style={iv.overlay}>
        {/* Close button */}
        <TouchableOpacity style={iv.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Counter */}
        <View style={iv.counter}>
          <Text style={iv.counterTxt}>{current + 1} / {images.length}</Text>
        </View>

        <FlatList
          ref={flatRef}
          data={images}
          keyExtractor={(url, i) => url || String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={startIndex}
          getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
          onMomentumScrollEnd={e => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
            setCurrent(idx);
          }}
          renderItem={({ item }) => (
            <View style={iv.imgWrap}>
              <Image source={{ uri: item }} style={iv.img} resizeMode="contain" />
            </View>
          )}
        />

        {/* Dot indicators */}
        {images.length > 1 && (
          <View style={iv.dotsRow}>
            {images.map((_, i) => (
              <View key={i} style={[iv.dot, i === current && iv.dotActive]} />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

/* ─── Hero Image Carousel ─── */
function HeroCarousel({ photos, cardBg, onImagePress }) {
  const { t } = useLang();
  const [activeIdx, setActiveIdx] = useState(0);
  const flatRef = useRef(null);

  if (!photos || photos.length === 0) {
    return (
      <View style={[hero.wrap, { backgroundColor: cardBg || DARK, height: HERO_H }]}>
        <View style={hero.placeholder}>
          <Ionicons name="home-outline" size={72} color="rgba(255,255,255,0.18)" />
          <Text style={hero.placeholderTxt}>{t('noPhotosAvailable')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[hero.wrap, { height: HERO_H }]}>
      <FlatList
        ref={flatRef}
        data={photos}
        keyExtractor={(url, i) => url || String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
          setActiveIdx(idx);
        }}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => onImagePress(index)}
            style={{ width: SCREEN_W, height: HERO_H }}
          >
            <Image
              source={{ uri: item }}
              style={{ width: SCREEN_W, height: HERO_H }}
              resizeMode="cover"
            />
            {/* Gradient overlay */}
            <View style={hero.gradientOverlay} />
          </TouchableOpacity>
        )}
      />

      {/* Photo count badge */}
      <View style={hero.badge}>
        <Ionicons name="images-outline" size={12} color="#fff" style={{ marginRight: 4 }} />
        <Text style={hero.badgeTxt}>{activeIdx + 1}/{photos.length}</Text>
      </View>

      {/* Dot indicators */}
      {photos.length > 1 && (
        <View style={hero.dotsRow}>
          {photos.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                flatRef.current?.scrollToIndex({ index: i, animated: true });
                setActiveIdx(i);
              }}
            >
              <View style={[hero.dot, i === activeIdx && hero.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Tap to expand hint */}
      <View style={hero.expandHint}>
        <Ionicons name="expand-outline" size={11} color="rgba(255,255,255,0.85)" />
        <Text style={hero.expandHintTxt}>{t('tapToExpand')}</Text>
      </View>
    </View>
  );
}

/* ─── CTA Button ─── */
function CTAButton({ label, onPress, color, icon, delay, outline }) {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 380, delay, easing: Easing.out(Easing.back(1.2)), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 320, delay, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: Platform.OS !== 'web', speed: 30 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 30 }).start()}
        onPress={onPress}
        style={[s.ctaBtn, outline
          ? { backgroundColor: '#fff', borderWidth: 1.5, borderColor: color }
          : { backgroundColor: color }
        ]}
      >
        {icon && <Ionicons name={icon} size={18} color={outline ? color : '#fff'} style={{ marginRight: 8 }} />}
        <Text style={[s.ctaBtnTxt, outline && { color }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ─── Amenity Chip ─── */
function AmenityChip({ label, delay }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 320, delay, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(scaleAnim, { toValue: 1, delay, useNativeDriver: Platform.OS !== 'web', speed: 14 }),
    ]).start();
  }, []);

  const ICONS = {
    'WiFi': 'wifi-outline', 'Parking': 'car-outline', 'AC': 'snow-outline',
    'Meals': 'restaurant-outline', 'Power Backup': 'flash-outline',
    'Lift': 'arrow-up-circle-outline', 'Water 24/7': 'water-outline',
    '24/7 Security': 'shield-checkmark-outline', 'CCTV': 'videocam-outline',
    'Gym': 'barbell-outline', 'Laundry': 'shirt-outline',
  };
  const icon = ICONS[label] || 'checkmark-circle-outline';

  return (
    <Animated.View style={[s.amenityChip, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <Ionicons name={icon} size={14} color="#0d9488" style={{ marginRight: 5 }} />
      <Text style={s.amenityTxt}>{label}</Text>
    </Animated.View>
  );
}

/* ─── Info Row ─── */
function InfoRow({ icon, label, value }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIconWrap}>
        <Ionicons name={icon} size={16} color={TEAL} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

/* ─── Main Screen ─── */
export default function RoomDetailScreen({ route, navigation }) {
  const { room } = route.params;
  const insets = useSafeAreaInsets();
  const { lang, t } = useLang();

  const [saved, setSaved]         = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIdx, setViewerIdx]   = useState(0);
  const savedScale = useRef(new Animated.Value(1)).current;

  const contentFade  = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentFade,  { toValue: 1, duration: 450, delay: 100, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(contentSlide, { toValue: 0, duration: 400, delay: 100, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);

  function toggleSaved() {
    setSaved(v => !v);
    Animated.sequence([
      Animated.spring(savedScale, { toValue: 1.45, useNativeDriver: Platform.OS !== 'web', speed: 25 }),
      Animated.spring(savedScale, { toValue: 1,    useNativeDriver: Platform.OS !== 'web', speed: 25 }),
    ]).start();
  }

  function callOwner() {
    if (room.phone) Linking.openURL(`tel:${room.phone}`);
  }

  function whatsapp() {
    const phone = room.phone || '';
    const msg = encodeURIComponent(`Hi, I saw your room listing: ${room.title}. Is it still available?`);
    if (phone) Linking.openURL(`https://wa.me/91${phone}?text=${msg}`);
  }

  async function shareListing() {
    try {
      await Share.share({
        message: `Room for Rent: ${room.title}\n${room.location} | ${room.rent}\n\nFind on CityPlus!`,
      });
    } catch {}
  }

  const openImageViewer = useCallback((idx) => {
    setViewerIdx(idx);
    setViewerOpen(true);
  }, []);

  const photos    = room.photos || [];
  const amenities = room.amenities || [];
  const cardBg    = room.cardBg || DARK;

  return (
    <View style={s.container}>
      <ImageViewer
        visible={viewerOpen}
        images={photos}
        startIndex={viewerIdx}
        onClose={() => setViewerOpen(false)}
      />

      {/* Floating Back Button */}
      <TouchableOpacity
        style={[s.backBtn, { top: (insets.top || 0) + 10 }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={18} color="#fff" />
      </TouchableOpacity>

      {/* Floating Action Buttons (top-right) */}
      <View style={[s.topActions, { top: (insets.top || 0) + 10 }]}>
        <Animated.View style={{ transform: [{ scale: savedScale }] }}>
          <TouchableOpacity style={s.fabIcon} onPress={toggleSaved}>
            <Ionicons name={saved ? 'heart' : 'heart-outline'} size={19} color={saved ? '#ef4444' : '#fff'} />
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity style={s.fabIcon} onPress={shareListing}>
          <Ionicons name="share-social-outline" size={19} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero Carousel */}
        <HeroCarousel photos={photos} cardBg={cardBg} onImagePress={openImageViewer} />

        <Animated.View style={{ opacity: contentFade, transform: [{ translateY: contentSlide }] }}>

          {/* Title + Price Card */}
          <View style={s.titleCard}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <AutoTranslate text={room.title} lang={lang} style={s.title} />
              <View style={s.locationRow}>
                <Ionicons name="location-outline" size={13} color="#64748b" />
                <Text style={s.locationTxt}>
                  {room.location}{room.listedDaysAgo ? ` · Listed ${room.listedDaysAgo}d ago` : ''}
                </Text>
              </View>
            </View>
            <View style={s.pricePill}>
              <Text style={s.rent}>{room.rent}</Text>
              {room.deposit && <Text style={s.depositTxt}>{t('deposit')}: {room.deposit}</Text>}
            </View>
          </View>

          {/* Status Chips */}
          <View style={s.chipRow}>
            {room.type && (
              <View style={s.chip}>
                <Ionicons name="business-outline" size={11} color="#475569" style={{ marginRight: 3 }} />
                <Text style={s.chipTxt}>{room.type}</Text>
              </View>
            )}
            {room.for && (
              <View style={s.chip}>
                <Ionicons name="people-outline" size={11} color="#475569" style={{ marginRight: 3 }} />
                <Text style={s.chipTxt}>{room.for}</Text>
              </View>
            )}
            <View style={[s.chip, room.available !== false
              ? { borderColor: '#86efac', backgroundColor: '#f0fdf4' }
              : { borderColor: '#fca5a5', backgroundColor: '#fef2f2' }
            ]}>
              <Ionicons
                name={room.available !== false ? 'checkmark-circle' : 'close-circle'}
                size={11}
                color={room.available !== false ? '#16a34a' : '#dc2626'}
              />
              <Text style={[s.chipTxt, { marginLeft: 3, color: room.available !== false ? '#16a34a' : '#dc2626' }]}>
                {room.available !== false ? 'Available' : 'Not Available'}
              </Text>
            </View>
          </View>

          {/* Thumbnail strip (if multiple photos) */}
          {photos.length > 1 && (
            <View style={s.thumbSection}>
              <Text style={s.sectionLabel}>{t('photos')} ({photos.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbRow}>
                {photos.map((uri, i) => (
                  <TouchableOpacity key={i} onPress={() => openImageViewer(i)} activeOpacity={0.8}>
                    <Image source={{ uri }} style={s.thumb} resizeMode="cover" />
                    <View style={s.thumbOverlay}>
                      <Ionicons name="expand-outline" size={14} color="#fff" />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Quick Info */}
          {(room.deposit || room.listedDaysAgo || room.area) && (
            <View style={s.infoCard}>
              {room.deposit     && <InfoRow icon="card-outline"     label="Security Deposit" value={room.deposit} />}
              {room.listedDaysAgo && <InfoRow icon="calendar-outline" label="Listed"  value={`${room.listedDaysAgo} days ago`} />}
              {room.area        && <InfoRow icon="resize-outline"   label="Area"     value={room.area} />}
            </View>
          )}

          {/* Description */}
          {!!room.description && (
            <>
              <Text style={s.sectionLabel}>{t('description')}</Text>
              <View style={s.descCard}>
                <AutoTranslate text={room.description} lang={lang} style={s.descTxt} />
              </View>
            </>
          )}

          {/* Amenities */}
          {amenities.length > 0 && (
            <>
              <Text style={s.sectionLabel}>{t('amenities')}</Text>
              <View style={s.amenitiesWrap}>
                {amenities.map((a, i) => (
                  <AmenityChip key={i} label={a} delay={i * 60} />
                ))}
              </View>
            </>
          )}

          {/* Owner Card */}
          <Text style={s.sectionLabel}>{t('listedBy')}</Text>
          <View style={s.ownerCard}>
            <View style={s.ownerAvatar}>
              <Ionicons name="person" size={24} color={TEAL} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.ownerName}>{room.owner?.name || t('listedBy')}</Text>
              {room.phone && <Text style={s.ownerPhone}>+91 {room.phone}</Text>}
            </View>
            {room.owner?.verified && (
              <View style={s.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#16a34a" />
                <Text style={s.verifiedTxt}>{t('verified')}</Text>
              </View>
            )}
          </View>

          {/* CTA Buttons */}
          <View style={s.ctaSection}>
            <CTAButton label={t('callOwner')}       onPress={callOwner} color={GREEN_WA} icon="call"          delay={0}  />
            <CTAButton label="Chat on WhatsApp" onPress={whatsapp}  color={GREEN_WA} icon="logo-whatsapp" delay={80} />
            <CTAButton label="Share Listing"    onPress={shareListing} color={TEAL} icon="share-social-outline" delay={160} outline />
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

/* ─── Hero Styles ─── */
const hero = StyleSheet.create({
  wrap: { width: SCREEN_W, backgroundColor: DARK, overflow: 'hidden' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  placeholderTxt: { color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '500' },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    background: 'transparent',
    // Bottom fade for readability
    backgroundImage: 'linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.45) 100%)',
  },
  badge: {
    position: 'absolute', bottom: 42, right: 12,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8, paddingVertical: 4, paddingHorizontal: 9,
  },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  dotsRow: {
    position: 'absolute', bottom: 14,
    flexDirection: 'row', gap: 5,
    alignSelf: 'center',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { backgroundColor: '#fff', width: 18, borderRadius: 3 },
  expandHint: {
    position: 'absolute', bottom: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  expandHintTxt: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '500' },
});

/* ─── Image Viewer Styles ─── */
const iv = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000' },
  closeBtn: {
    position: 'absolute', top: 50, right: 16, zIndex: 10,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  counter: {
    position: 'absolute', top: 56, left: 0, right: 0, zIndex: 10,
    alignItems: 'center',
  },
  counterTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },
  imgWrap: { width: SCREEN_W, height: SCREEN_H, alignItems: 'center', justifyContent: 'center' },
  img: { width: SCREEN_W, height: SCREEN_H },
  dotsRow: {
    position: 'absolute', bottom: 50,
    flexDirection: 'row', gap: 7, alignSelf: 'center',
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: '#fff', width: 20, borderRadius: 4 },
});

/* ─── Main Styles ─── */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },

  backBtn: {
    position: 'absolute', left: 14, zIndex: 20,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.50)',
    alignItems: 'center', justifyContent: 'center',
  },
  topActions: {
    position: 'absolute', right: 14, zIndex: 20,
    flexDirection: 'row', gap: 8,
  },
  fabIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.50)',
    alignItems: 'center', justifyContent: 'center',
  },

  /* Title card */
  titleCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a', lineHeight: 26 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5 },
  locationTxt: { fontSize: 12, color: '#64748b' },
  pricePill: {
    backgroundColor: '#0f172a', borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 12,
    alignItems: 'center', minWidth: 90,
  },
  rent: { fontSize: 16, fontWeight: '800', color: '#fff' },
  depositTxt: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  /* Chips */
  chipRow: {
    flexDirection: 'row', gap: 8, flexWrap: 'wrap',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 14,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0',
    paddingVertical: 5, paddingHorizontal: 10,
    backgroundColor: '#f8fafc',
  },
  chipTxt: { fontSize: 12, color: '#475569', fontWeight: '600' },

  /* Thumbnail strip */
  thumbSection: { backgroundColor: '#fff', paddingTop: 14, paddingBottom: 6, marginTop: 8 },
  thumbRow: { paddingHorizontal: 16, gap: 8 },
  thumb: { width: 90, height: 68, borderRadius: 8, backgroundColor: '#e2e8f0' },
  thumbOverlay: {
    position: 'absolute', inset: 0, borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.20)',
    alignItems: 'center', justifyContent: 'center',
  },

  /* Info card */
  infoCard: {
    backgroundColor: '#fff', marginHorizontal: 14, marginTop: 10,
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  infoIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#f0fdfa',
    alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600', letterSpacing: 0.3 },
  infoValue: { fontSize: 13, color: '#0f172a', fontWeight: '700', marginTop: 1 },

  /* Section label */
  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: '#94a3b8',
    letterSpacing: 1.2, paddingHorizontal: 16,
    paddingTop: 20, paddingBottom: 10,
  },

  /* Description */
  descCard: {
    backgroundColor: '#fff', marginHorizontal: 14,
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  descTxt: { fontSize: 14, color: '#334155', lineHeight: 22 },

  /* Amenities */
  amenitiesWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 14,
  },
  amenityChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0fdfa', borderRadius: 10,
    borderWidth: 1, borderColor: '#99f6e4',
    paddingVertical: 8, paddingHorizontal: 12,
  },
  amenityTxt: { fontSize: 12, color: '#0d9488', fontWeight: '700' },

  /* Owner */
  ownerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', marginHorizontal: 14,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  ownerAvatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#f0fdfa',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#99f6e4',
  },
  ownerName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  ownerPhone: { fontSize: 12, color: '#64748b', marginTop: 2 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f0fdf4', borderRadius: 8,
    borderWidth: 1, borderColor: '#86efac',
    paddingVertical: 5, paddingHorizontal: 9,
  },
  verifiedTxt: { fontSize: 11, color: '#16a34a', fontWeight: '700' },

  /* CTA */
  ctaSection: { paddingHorizontal: 14, paddingTop: 20, gap: 10 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, paddingVertical: 16,
  },
  ctaBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
