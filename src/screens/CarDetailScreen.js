import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Linking, Alert, Image, Animated, Easing, Share,
  FlatList, Dimensions, Platform, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ORANGE = '#f97316';
const DARK_NAVY = '#1a2a3a';
const GREEN_WA = '#25d366';
const { width: SCREEN_W } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';
const GALLERY_H = IS_WEB ? 320 : 260;

const PLACEHOLDER_CAR = {
  name: 'Maruti Swift 2020',
  subtitle: 'White · Petrol · AC · 4 seats',
  price: '₹800',
  deposit: '₹2k',
  location: 'CIDCO',
  listedDaysAgo: 8,
  type: 'Car',
  available: true,
  features: ['White', 'Petrol', 'AC', '4 seats'],
  rentalTerms: [
    'Valid Driving License required',
    'Aadhar/Voter ID original for deposit',
    'Fuel to be paid by renter',
    'Limit: 250km/day (Extra ₹8/km)',
  ],
  owner: {
    name: 'Nanded Travels',
    initials: 'NT',
    isAgency: true,
    verified: true,
    color: '#1a2a3a',
    bg: '#e8edf2',
  },
  whatsapp: '',
  photoUrls: [],
  photos: 0,
};

/* ─── Animated section entry ─── */
function SlideIn({ children, delay = 0, from = 20 }) {
  const slide = useRef(new Animated.Value(from)).current;
  const fade  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 420, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(fade,  { toValue: 1, duration: 380, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>{children}</Animated.View>;
}

/* ─── Feature Chip ─── */
function FeatureChip({ label, icon, delay }) {
  const fade  = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.82)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 350, delay, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, delay, useNativeDriver: true, speed: 14, bounciness: 8 }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[s.featureChip, { opacity: fade, transform: [{ scale }] }]}>
      <Ionicons name={icon || 'checkmark-circle'} size={15} color={ORANGE} style={{ marginRight: 6 }} />
      <Text style={s.featureChipTxt}>{label}</Text>
    </Animated.View>
  );
}

/* ─── Stat Box ─── */
function StatBox({ icon, label, value, delay }) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const fade  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, delay, useNativeDriver: true, speed: 12, bounciness: 10 }),
      Animated.timing(fade,  { toValue: 1, duration: 300, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[s.statBox, { opacity: fade, transform: [{ scale }] }]}>
      <View style={s.statIconWrap}>
        <Ionicons name={icon} size={18} color={ORANGE} />
      </View>
      <Text style={s.statValue}>{value}</Text>
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
      Animated.timing(slide, { toValue: 0, duration: 400, delay, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
      Animated.timing(fade,  { toValue: 1, duration: 350, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const pressIn  = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 30 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  return (
    <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: slide }, { scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
        style={[s.ctaBtn, outline ? { backgroundColor: '#fff', borderWidth: 1.5, borderColor: color } : { backgroundColor: color }]}
      >
        {icon && <Ionicons name={icon} size={18} color={outline ? color : '#fff'} style={{ marginRight: 8 }} />}
        <Text style={[s.ctaBtnTxt, outline && { color }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ─── Image Gallery ─── */
function ImageGallery({ photos, vehicleType }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef(null);
  const dotScale = useRef(photos.map(() => new Animated.Value(1))).current;

  const iconName = vehicleType === 'Bike' || vehicleType === 'Bike / Scooter' ? 'bicycle'
                 : vehicleType === 'Auto' ? 'car-outline' : 'car-sport';

  const onScroll = useCallback((e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx !== activeIndex) {
      setActiveIndex(idx);
      // Animate dots
      photos.forEach((_, i) => {
        Animated.spring(dotScale[i], {
          toValue: i === idx ? 1.4 : 1,
          useNativeDriver: true,
          speed: 20,
        }).start();
      });
    }
  }, [activeIndex, photos]);

  if (!photos || photos.length === 0) {
    // No photos — show styled gradient placeholder with car icon
    const pulse = useRef(new Animated.Value(1)).current;
    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,    duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    }, []);
    return (
      <View style={[s.gallery, { backgroundColor: DARK_NAVY, overflow: 'hidden' }]}>
        {/* Background rings */}
        <View style={s.galleryRing1} />
        <View style={s.galleryRing2} />
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Ionicons name={iconName} size={90} color="rgba(255,255,255,0.18)" />
        </Animated.View>
        <Text style={s.noPhotoTxt}>No photos uploaded</Text>
      </View>
    );
  }

  return (
    <View style={s.gallery}>
      <FlatList
        ref={flatRef}
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_W, height: GALLERY_H }}>
            <Image
              source={{ uri: item }}
              style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
            />
            <View style={s.imgOverlay} />
          </View>
        )}
      />
      {/* Dot indicators */}
      {photos.length > 1 && (
        <View style={s.dotsRow}>
          {photos.map((_, i) => (
            <Animated.View
              key={i}
              style={[
                s.dot,
                i === activeIndex && s.dotActive,
                { transform: [{ scale: dotScale[i] }] },
              ]}
            />
          ))}
        </View>
      )}
      {/* Photo counter badge */}
      <View style={s.photoBadge}>
        <Ionicons name="images-outline" size={11} color="#fff" style={{ marginRight: 4 }} />
        <Text style={s.photoBadgeTxt}>{activeIndex + 1}/{photos.length}</Text>
      </View>
    </View>
  );
}

/* ─── Main Screen ─── */
export default function CarDetailScreen() {
  const nav    = useNavigation();
  const route  = useRoute();
  const insets = useSafeAreaInsets();
  const car    = route.params?.car || PLACEHOLDER_CAR;

  const [saved, setSaved] = useState(false);
  const savedScale = useRef(new Animated.Value(1)).current;

  // Parallax / scroll animation
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [GALLERY_H - 80, GALLERY_H - 40],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  function toggleSaved() {
    setSaved(v => !v);
    Animated.sequence([
      Animated.spring(savedScale, { toValue: 1.4, useNativeDriver: true, speed: 25, bounciness: 12 }),
      Animated.spring(savedScale, { toValue: 1,   useNativeDriver: true, speed: 25 }),
    ]).start();
  }

  function callOwner() {
    const phone = car.whatsapp || car.phone || '';
    if (phone) Linking.openURL(`tel:${phone}`);
    else Alert.alert('Contact', 'Please contact via WhatsApp.');
  }

  function openWhatsApp() {
    const phone = car.whatsapp || car.phone || '';
    const msg   = `Hi, I'm interested in renting your ${car.name} listed on NandedRozgar.`;
    if (phone)
      Linking.openURL(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`).catch(() =>
        Alert.alert('WhatsApp not installed', 'Please contact via call.')
      );
    else Alert.alert('Contact', 'WhatsApp number not available.');
  }

  async function shareVehicle() {
    try {
      await Share.share({
        message: `Check out this vehicle on NandedRozgar!\n${car.name} - ${car.price}/day\nLocation: ${car.location || 'Nanded'}`,
      });
    } catch {}
  }

  const features = car.features?.length
    ? car.features
    : (car.subtitle || '').split(' · ').filter(Boolean);

  const rentalTerms = car.rentalTerms || [];
  const photoUrls   = car.photoUrls || [];

  const featureIcons = ['color-palette-outline', 'flame-outline', 'snow-outline', 'people-outline', 'speedometer-outline', 'settings-outline'];

  // Build quick stats from features
  const quickStats = [
    { icon: 'car-outline',         label: 'Type',   value: car.type || 'Car' },
    { icon: 'flame-outline',       label: 'Fuel',   value: car.fuel || features.find(f => ['Petrol','Diesel','CNG','Electric'].includes(f)) || '—' },
    { icon: 'people-outline',      label: 'Seats',  value: features.find(f => f.includes('seat')) || '5 seats' },
    { icon: 'calendar-outline',    label: 'Listed', value: car.listedDaysAgo ? `${car.listedDaysAgo}d ago` : 'Recent' },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* Floating back / save bar — always visible */}
      <View style={[s.floatingBar, { top: (insets.top || 0) + 6 }]}>
        <TouchableOpacity style={s.floatBtn} onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </TouchableOpacity>
        <Animated.View style={{ opacity: headerOpacity, flex: 1, alignItems: 'center' }}>
          <Text style={s.floatTitle} numberOfLines={1}>{car.name}</Text>
        </Animated.View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={s.floatBtn} onPress={shareVehicle}>
            <Ionicons name="share-social-outline" size={17} color="#fff" />
          </TouchableOpacity>
          <Animated.View style={{ transform: [{ scale: savedScale }] }}>
            <TouchableOpacity style={s.floatBtn} onPress={toggleSaved}>
              <Ionicons name={saved ? 'heart' : 'heart-outline'} size={18} color={saved ? '#ef4444' : '#fff'} />
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
        <ImageGallery photos={photoUrls} vehicleType={car.type} />

        {/* ── Title Card ── */}
        <SlideIn delay={60}>
          <View style={s.titleCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.carName}>{car.name}</Text>
              <View style={s.locationRow}>
                <Ionicons name="location-outline" size={13} color="#888" />
                <Text style={s.locationTxt}>
                  {car.location || 'Nanded'}
                  {car.listedDaysAgo ? ` · ${car.listedDaysAgo} days ago` : ''}
                </Text>
              </View>
            </View>
            <View style={s.priceBlock}>
              <Text style={s.priceAmt}>{car.price}</Text>
              <Text style={s.perDay}>/day</Text>
              {car.deposit ? <Text style={s.deposit}>Dep: {car.deposit}</Text> : null}
            </View>
          </View>

          {/* Tags */}
          <View style={s.tagsRow}>
            {car.type && (
              <View style={s.typeTag}>
                <Ionicons name="car-sport-outline" size={12} color={ORANGE} style={{ marginRight: 4 }} />
                <Text style={s.typeTagTxt}>{car.type}</Text>
              </View>
            )}
            {car.available !== false && (
              <View style={s.availTag}>
                <Ionicons name="checkmark-circle" size={12} color="#16a34a" style={{ marginRight: 4 }} />
                <Text style={s.availTagTxt}>Available Now</Text>
              </View>
            )}
            {photoUrls.length > 0 && (
              <View style={s.photoTag}>
                <Ionicons name="images-outline" size={12} color="#0ea5e9" style={{ marginRight: 4 }} />
                <Text style={s.photoTagTxt}>{photoUrls.length} Photos</Text>
              </View>
            )}
          </View>
        </SlideIn>

        {/* ── Quick Stats ── */}
        <SlideIn delay={120}>
          <View style={s.statsSection}>
            <Text style={s.sectionTitle}>QUICK SPECS</Text>
            <View style={s.statsGrid}>
              {quickStats.map((stat, i) => (
                <StatBox key={i} {...stat} delay={i * 55} />
              ))}
            </View>
          </View>
        </SlideIn>

        {/* ── Features ── */}
        {features.length > 0 && (
          <SlideIn delay={180}>
            <View style={s.section}>
              <Text style={s.sectionTitle}>FEATURES & SPECS</Text>
              <View style={s.featuresGrid}>
                {features.map((f, i) => (
                  <FeatureChip key={i} label={f} icon={featureIcons[i % featureIcons.length]} delay={i * 55} />
                ))}
              </View>
            </View>
          </SlideIn>
        )}

        {/* ── Rental Terms ── */}
        {rentalTerms.length > 0 && (
          <SlideIn delay={240}>
            <View style={s.section}>
              <Text style={s.sectionTitle}>RENTAL TERMS</Text>
              <View style={s.termsBox}>
                {rentalTerms.map((term, i) => (
                  <View key={i} style={s.termRow}>
                    <View style={s.termDot} />
                    <Text style={s.termTxt}>{term}</Text>
                  </View>
                ))}
              </View>
            </View>
          </SlideIn>
        )}

        {/* ── Owner Card ── */}
        <SlideIn delay={300}>
          <View style={s.section}>
            <Text style={s.sectionTitle}>OWNER / AGENCY</Text>
            <View style={s.ownerCard}>
              <View style={[s.ownerAvatar, { backgroundColor: car.owner?.bg || '#fff3e0' }]}>
                {car.owner?.initials
                  ? <Text style={[s.ownerInitials, { color: car.owner?.color || ORANGE }]}>{car.owner.initials}</Text>
                  : <Ionicons name="person" size={22} color={ORANGE} />
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.ownerName}>{car.owner?.name || 'Owner'}</Text>
                {car.owner?.verified && (
                  <View style={s.verifiedRow}>
                    <Ionicons name="checkmark-circle" size={13} color="#16a34a" />
                    <Text style={s.verifiedTxt}>{car.owner?.isAgency ? 'Verified Agency' : 'Verified Owner'}</Text>
                  </View>
                )}
              </View>
              <View style={s.ownerBadge}>
                <Ionicons name="shield-checkmark-outline" size={14} color={ORANGE} />
              </View>
            </View>
          </View>
        </SlideIn>

        {/* ── Safety Tips ── */}
        <SlideIn delay={340}>
          <View style={s.safetyCard}>
            <View style={s.safetyHeader}>
              <Ionicons name="information-circle-outline" size={16} color="#0369a1" style={{ marginRight: 6 }} />
              <Text style={s.safetyTitle}>Safety Tips</Text>
            </View>
            {['Verify documents before handing over payment', 'Inspect vehicle condition before driving', 'Prefer meeting in public places'].map((tip, i) => (
              <Text key={i} style={s.safetyTip}>· {tip}</Text>
            ))}
          </View>
        </SlideIn>
      </Animated.ScrollView>

      {/* ── Sticky CTA Bar ── */}
      <SlideIn delay={400} from={40}>
        <View style={[s.stickyBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <CTAButton label="Call Owner"  onPress={callOwner}    color={DARK_NAVY} icon="call"           delay={0} />
          <CTAButton label="WhatsApp"    onPress={openWhatsApp} color={GREEN_WA}  icon="logo-whatsapp"  delay={60} />
        </View>
      </SlideIn>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flex: 1 },

  /* Floating back/save bar */
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
  floatTitle: { fontSize: 14, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },

  /* Gallery */
  gallery: { height: GALLERY_H, width: '100%', backgroundColor: DARK_NAVY, position: 'relative' },
  galleryRing1: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    top: -60, right: -60,
  },
  galleryRing2: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    borderWidth: 1, borderColor: 'rgba(249,115,22,0.15)',
    bottom: -40, left: -40,
  },
  imgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },
  noPhotoTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 10 },

  dotsRow: {
    position: 'absolute', bottom: 14,
    flexDirection: 'row', alignSelf: 'center', gap: 5,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
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
    backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  carName: { fontSize: 20, fontWeight: '900', color: '#111', letterSpacing: -0.3, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationTxt:  { fontSize: 12, color: '#888', fontWeight: '500' },
  priceBlock:   { alignItems: 'flex-end' },
  priceAmt:     { fontSize: 24, fontWeight: '900', color: ORANGE },
  perDay:       { fontSize: 12, color: '#888', marginTop: 1 },
  deposit:      { fontSize: 11, color: '#aaa', marginTop: 2 },

  tagsRow: {
    flexDirection: 'row', gap: 7, flexWrap: 'wrap',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 14,
  },
  typeTag: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#fed7aa', backgroundColor: '#fff7f0',
    borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12,
  },
  typeTagTxt: { fontSize: 12, color: ORANGE, fontWeight: '700' },
  availTag: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#bbf7d0', backgroundColor: '#f0fdf4',
    borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12,
  },
  availTagTxt: { fontSize: 12, color: '#16a34a', fontWeight: '700' },
  photoTag: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#bae6fd', backgroundColor: '#f0f9ff',
    borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12,
  },
  photoTagTxt: { fontSize: 12, color: '#0369a1', fontWeight: '700' },

  /* Sections */
  section:  { backgroundColor: '#fff', marginTop: 10, paddingBottom: 6 },
  sectionTitle: {
    fontSize: 10, fontWeight: '800', color: '#bbb',
    letterSpacing: 1.2, paddingHorizontal: 16,
    paddingTop: 16, paddingBottom: 10, backgroundColor: '#f5f5f5',
  },

  /* Stats */
  statsSection: { backgroundColor: '#fff', marginTop: 10, paddingBottom: 14 },
  statsGrid: { flexDirection: 'row', paddingHorizontal: 14, gap: 10 },
  statBox: {
    flex: 1, backgroundColor: '#f9f9f9', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#f0f0f0',
  },
  statIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#fff7f0', alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  statValue: { fontSize: 13, fontWeight: '800', color: '#111', textAlign: 'center' },
  statLabel: { fontSize: 10, color: '#aaa', fontWeight: '600', marginTop: 2, textAlign: 'center' },

  /* Features */
  featuresGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 14, paddingBottom: 6, gap: 8,
    backgroundColor: '#fff', paddingTop: 2,
  },
  featureChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9f9f9', borderRadius: 10,
    borderWidth: 1, borderColor: '#f0f0f0',
    paddingVertical: 8, paddingHorizontal: 12,
    minWidth: '45%',
  },
  featureChipTxt: { fontSize: 13, color: '#222', fontWeight: '600' },

  /* Rental terms */
  termsBox: {
    marginHorizontal: 14, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fffbeb',
  },
  termRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, paddingHorizontal: 14 },
  termDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ORANGE, marginTop: 6, flexShrink: 0 },
  termTxt: { fontSize: 13, color: '#78350f', lineHeight: 20, flex: 1, fontWeight: '500' },

  /* Owner */
  ownerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 14, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#ebebeb', backgroundColor: '#fafafa',
  },
  ownerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  ownerInitials: { fontSize: 18, fontWeight: '900' },
  ownerName:  { fontSize: 15, fontWeight: '800', color: '#111' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  verifiedTxt: { fontSize: 11, color: '#16a34a', fontWeight: '600' },
  ownerBadge: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#fff7f0', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#fed7aa',
  },

  /* Safety card */
  safetyCard: {
    margin: 14, borderRadius: 12, padding: 14,
    backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe',
  },
  safetyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  safetyTitle:  { fontSize: 13, fontWeight: '800', color: '#1d4ed8' },
  safetyTip:    { fontSize: 12, color: '#1e40af', lineHeight: 20, fontWeight: '500' },

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
