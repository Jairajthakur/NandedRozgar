import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Linking,
  StyleSheet, Share, Animated, Easing, Image,
  Dimensions, FlatList, Modal, StatusBar, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '../utils/i18n';
import { AutoTranslate } from '../utils/translate';

const ORANGE   = '#f97316';
const GREEN_WA = '#25d366';
const { width: SW, height: SH } = Dimensions.get('window');
const IS_WEB   = Platform.OS === 'web';
const GALLERY_H = IS_WEB ? 320 : 260;

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

/* ─── Amenity chip ─── */
function AmenityChip({ label, index }) {
  const op    = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.75)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op,    { toValue: 1, duration: 300, delay: index * 60, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(scale, { toValue: 1, delay: index * 60, useNativeDriver: Platform.OS !== 'web', damping: 12 }),
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
    <Animated.View style={[s.amenityChip, { opacity: op, transform: [{ scale }] }]}>
      <Ionicons name={icon} size={14} color={ORANGE} />
      <Text style={s.amenityTxt}>{label}</Text>
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

/* ─── Full-screen image viewer ─── */
function ImageViewer({ visible, images, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);
  const flatRef = useRef(null);
  useEffect(() => {
    setCurrent(startIndex);
    if (visible && flatRef.current) {
      setTimeout(() => flatRef.current?.scrollToIndex({ index: startIndex, animated: false }), 50);
    }
  }, [visible, startIndex]);
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <StatusBar hidden />
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <TouchableOpacity
          style={{ position: 'absolute', top: 50, right: 16, zIndex: 10, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}
          onPress={onClose}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ position: 'absolute', top: 56, left: 0, right: 0, zIndex: 10, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{current + 1} / {images.length}</Text>
        </View>
        <FlatList
          ref={flatRef} data={images} horizontal pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={startIndex}
          getItemLayout={(_, index) => ({ length: SW, offset: SW * index, index })}
          keyExtractor={(url, i) => url || String(i)}
          onMomentumScrollEnd={e => setCurrent(Math.round(e.nativeEvent.contentOffset.x / SW))}
          renderItem={({ item }) => (
            <View style={{ width: SW, height: SH, alignItems: 'center', justifyContent: 'center' }}>
              <Image source={{ uri: item }} style={{ width: SW, height: SH }} resizeMode="contain" />
            </View>
          )}
        />
      </View>
    </Modal>
  );
}

/* ─── Photo gallery ─── */
function ImageGallery({ photos, onImagePress }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const flatRef  = useRef(null);
  const dotScale = useRef(photos.map(() => new Animated.Value(1))).current;
  const pulse    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!photos || photos.length === 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.08, duration: 1200, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(pulse, { toValue: 1,    duration: 1200, useNativeDriver: Platform.OS !== 'web' }),
        ])
      ).start();
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
      <View style={[s.gallery, { overflow: 'hidden' }]}>
        <View style={s.galleryRing1} />
        <View style={s.galleryRing2} />
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Ionicons name="home-outline" size={90} color="rgba(255,255,255,0.18)" />
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
        renderItem={({ item, index }) => (
          <TouchableOpacity activeOpacity={0.95} onPress={() => onImagePress?.(index)} style={{ width: SW, height: GALLERY_H }}>
            <Image source={{ uri: item }} style={{ width: SW, height: GALLERY_H, resizeMode: 'cover' }} />
            <View style={s.imgOverlay} />
            <View style={s.expandHint}>
              <Ionicons name="expand-outline" size={11} color="rgba(255,255,255,0.85)" />
              <Text style={s.expandHintTxt}>Tap to expand</Text>
            </View>
          </TouchableOpacity>
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
export default function RoomDetailScreen({ route, navigation }) {
  const { room } = route.params;
  const insets = useSafeAreaInsets();
  const { lang, t } = useLang();

  const [saved, setSaved]           = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIdx, setViewerIdx]   = useState(0);
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

  function toggleSaved() {
    setSaved(v => !v);
    Animated.sequence([
      Animated.spring(savedScale, { toValue: 1.4, useNativeDriver: Platform.OS !== 'web', speed: 25, bounciness: 12 }),
      Animated.spring(savedScale, { toValue: 1,   useNativeDriver: Platform.OS !== 'web', speed: 25 }),
    ]).start();
  }

  function callOwner() { if (room.phone) Linking.openURL(`tel:${room.phone}`); }

  function openWhatsApp() {
    const phone = room.phone || '';
    const msg   = encodeURIComponent(`Hi, I saw your room listing: ${room.title}. Is it still available?`);
    if (phone) Linking.openURL(`https://wa.me/91${phone}?text=${msg}`);
  }

  async function shareListing() {
    try {
      await Share.share({ message: `Room for Rent: ${room.title}\n${room.location} | ${room.rent}\n\nFind on CityPlus!` });
    } catch {}
  }

  const photos    = room.photos || [];
  const amenities = room.amenities || [];

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

      <ImageViewer
        visible={viewerOpen}
        images={photos}
        startIndex={viewerIdx}
        onClose={() => setViewerOpen(false)}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ══════════ HERO HEADER ══════════ */}
        <Animated.View style={[s.hero, { paddingTop: insets.top + 52, opacity: heroOpacity }]}>
          <View style={s.arcTop} />
          <View style={s.arcBottom} />
          {PARTICLES.map((p, i) => <Particle key={i} x={p.x} size={p.size} color={p.color} delay={p.delay} />)}

          {/* Top nav */}
          <View style={[s.heroNav, { top: insets.top + 10 }]}>
            <TouchableOpacity style={s.navBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </TouchableOpacity>
            <Animated.View style={{ transform: [{ scale: savedScale }] }}>
              <TouchableOpacity style={s.navBtn} onPress={toggleSaved} activeOpacity={0.85}>
                <Ionicons name={saved ? 'heart' : 'heart-outline'} size={18} color={saved ? '#ef4444' : '#fff'} />
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity style={s.navBtn} onPress={shareListing} activeOpacity={0.85}>
              <Ionicons name="share-social-outline" size={17} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Hero icon */}
          <View style={s.iconContainer}>
            <Animated.View style={[s.iconRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
            <Animated.View style={[s.heroIconWrap, { transform: [{ scale: Animated.multiply(iconScale, pulseAnim) }] }]}>
              <Ionicons name={room.isSale ? 'business-outline' : 'home-outline'} size={34} color={ORANGE} />
            </Animated.View>
          </View>

          <AutoTranslate text={room.title || 'Room'} lang={lang} style={s.heroTitle} numberOfLines={2} />

          {!!room.location && (
            <View style={s.heroSubRow}>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={s.heroSubTxt}>{room.location}</Text>
              {room.isSale ? (
                <View style={s.heroBadge}>
                  <Ionicons name="pricetag" size={10} color="#4ade80" />
                  <Text style={s.heroBadgeTxt}>For Sale</Text>
                </View>
              ) : room.available !== false && (
                <View style={s.heroBadge}>
                  <Ionicons name="checkmark-circle" size={10} color="#4ade80" />
                  <Text style={s.heroBadgeTxt}>Available</Text>
                </View>
              )}
            </View>
          )}

          {/* Stat pills */}
          <View style={s.statsRow}>
            <StatPill icon="cash-outline"      value={room.rent || '—'}                    label={room.isSale ? 'Price' : 'Rent'}  delay={300} />
            {!!room.type && <StatPill icon="business-outline" value={room.type}             label="Type"                             delay={380} />}
            {!!room.for  && <StatPill icon="people-outline"   value={room.for}              label="For"                              delay={460} />}
            {!room.isSale && !!room.deposit && <StatPill icon="card-outline" value={room.deposit} label="Deposit"                   delay={540} />}
          </View>
        </Animated.View>

        {/* ── Photo Gallery ── */}
        {photos.length > 0 && (
          <FadeSection delay={80}>
            <ImageGallery photos={photos} onImagePress={(idx) => { setViewerIdx(idx); setViewerOpen(true); }} />
          </FadeSection>
        )}

        {/* ── Quick Info card ── */}
        <FadeSection delay={100}>
          <View style={s.quickInfoCard}>
            {!!room.rent && (
              <InfoRow icon="cash-outline"      label={room.isSale ? 'Sale Price' : 'Monthly Rent'}  value={room.rent}                  color="#16a34a" />
            )}
            {!room.isSale && !!room.deposit && (
              <InfoRow icon="card-outline"      label="Security Deposit"  value={room.deposit}                                            color="#0891b2" />
            )}
            {!!room.type && (
              <InfoRow icon="business-outline"  label="Room Type"         value={room.type}                                               color="#7c3aed" />
            )}
            {!!room.for && (
              <InfoRow icon="people-outline"    label="Suitable For"      value={room.for}                                                color={ORANGE}  />
            )}
            {!!room.location && (
              <InfoRow icon="location-outline"  label="Location"          value={room.location}                                           color="#7c3aed" />
            )}
            {!!room.area && (
              <InfoRow icon="resize-outline"    label="Area"              value={room.area}                                               color="#64748b" />
            )}
            {room.isSale && !!room.carpetArea && (
              <InfoRow icon="resize-outline"    label="Carpet Area"       value={room.carpetArea}                                         color="#64748b" />
            )}
            {room.isSale && !!room.propertyAge && (
              <InfoRow icon="construct-outline" label="Property Age"      value={room.propertyAge}                                        color="#64748b" />
            )}
            {!!room.listedDaysAgo && (
              <InfoRow icon="calendar-outline"  label="Listed"            value={`${room.listedDaysAgo} days ago`}                        color="#94a3b8" />
            )}
          </View>
        </FadeSection>

        {/* ── Description ── */}
        {!!room.description && (
          <FadeSection delay={160}>
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.cardHeaderDot} />
                <Text style={s.cardTitle}>DESCRIPTION</Text>
              </View>
              <AutoTranslate text={room.description} lang={lang} style={s.descText} />
            </View>
          </FadeSection>
        )}

        {/* ── Amenities ── */}
        {amenities.length > 0 && (
          <FadeSection delay={220}>
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={[s.cardHeaderDot, { backgroundColor: '#8b5cf6' }]} />
                <Text style={s.cardTitle}>AMENITIES</Text>
              </View>
              <View style={s.chipsRow}>
                {amenities.map((a, i) => <AmenityChip key={i} label={a} index={i} />)}
              </View>
            </View>
          </FadeSection>
        )}

        {/* ── Photo thumbnail strip ── */}
        {photos.length > 1 && (
          <FadeSection delay={260}>
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={[s.cardHeaderDot, { backgroundColor: '#0891b2' }]} />
                <Text style={s.cardTitle}>ALL PHOTOS ({photos.length})</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {photos.map((uri, i) => (
                  <TouchableOpacity key={i} onPress={() => { setViewerIdx(i); setViewerOpen(true); }} activeOpacity={0.8}>
                    <Image source={{ uri }} style={s.thumb} resizeMode="cover" />
                    <View style={s.thumbOverlay}>
                      <Ionicons name="expand-outline" size={14} color="#fff" />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </FadeSection>
        )}

        {/* ── Owner card ── */}
        <FadeSection delay={300}>
          <View style={s.ownerCard}>
            <View style={s.ownerIconWrap}>
              <Ionicons name="person" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.ownerName}>{room.owner?.name || 'Owner'}</Text>
              {!!room.phone && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                  <Ionicons name="call-outline" size={11} color="#888" />
                  <Text style={s.ownerLoc}>+91 {room.phone}</Text>
                </View>
              )}
            </View>
            {room.owner?.verified && (
              <View style={s.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={15} color="#16a34a" />
                <View>
                  <Text style={s.verifiedTxt}>✓ Verified Owner</Text>
                  <Text style={s.verifiedSub}>ID & phone confirmed</Text>
                </View>
              </View>
            )}
          </View>
        </FadeSection>

        {/* ── Action Buttons ── */}
        <View style={s.actionsBlock}>
          <ActionBtn label="Call Owner"        icon="call"                  color={ORANGE}    onPress={callOwner}    delay={0}   />
          <ActionBtn label="Chat on WhatsApp"  icon="logo-whatsapp"         color={GREEN_WA}  onPress={openWhatsApp} delay={80}  />
          <ActionBtn label="Share Listing"     icon="share-social-outline"  outline           onPress={shareListing} delay={160} />
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

  /* ── Gallery ── */
  gallery: { height: GALLERY_H, width: '100%', backgroundColor: '#1a2a3a', position: 'relative' },
  galleryRing1: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', top: -60, right: -60,
  },
  galleryRing2: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    borderWidth: 1, borderColor: 'rgba(249,115,22,0.15)', bottom: -40, left: -40,
  },
  noPhotoTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 10 },
  imgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },
  expandHint: {
    position: 'absolute', bottom: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  expandHintTxt: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '500' },
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

  /* ── Amenity / feature chips ── */
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff7ed', borderRadius: 20,
    borderWidth: 1, borderColor: '#fed7aa',
    paddingVertical: 7, paddingHorizontal: 14,
  },
  amenityTxt: { fontSize: 12, fontWeight: '700', color: '#c2410c' },

  /* ── Thumbnails ── */
  thumb: { width: 90, height: 68, borderRadius: 10, backgroundColor: '#e2e8f0' },
  thumbOverlay: {
    position: 'absolute', inset: 0, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.20)',
    alignItems: 'center', justifyContent: 'center',
  },

  /* ── Owner card ── */
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
  ownerName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  ownerLoc:  { fontSize: 12, color: '#64748b' },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f0fdf4', borderRadius: 12, borderWidth: 1.5, borderColor: '#86efac',
    paddingVertical: 8, paddingHorizontal: 12,
  },
  verifiedTxt: { fontSize: 12, color: '#16a34a', fontWeight: '800' },
  verifiedSub: { fontSize: 10, color: '#4ade80', fontWeight: '500', marginTop: 1 },

  /* ── Actions ── */
  actionsBlock: { paddingHorizontal: 14, paddingTop: 16, gap: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 9, borderRadius: 14, paddingVertical: 16,
  },
  actionBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

export {};
