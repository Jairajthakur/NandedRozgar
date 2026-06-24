import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Linking, Alert, Image, Animated, Easing, Share,
  FlatList, Dimensions, Platform, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLang } from '../utils/i18n';
import { AutoTranslate } from '../utils/translate';

const ORANGE   = '#f97316';
const GREEN_WA = '#25d366';
const { width: SW } = Dimensions.get('window');
const IS_WEB    = Platform.OS === 'web';
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
function ActionBtn({ label, icon, color, onPress, outline = false, delay = 0, disabled = false }) {
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
        onPress={press} activeOpacity={1} disabled={disabled}
        style={[
          s.actionBtn,
          outline
            ? { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e5e5' }
            : { backgroundColor: color },
          disabled && { opacity: 0.55 },
        ]}
      >
        {icon && <Ionicons name={icon} size={19} color={outline ? '#555' : '#fff'} />}
        <Text style={[s.actionBtnTxt, outline && { color: '#555' }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ─── Feature chip ─── */
function FeatureChip({ label, icon, index }) {
  const op    = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.75)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op,    { toValue: 1, duration: 300, delay: index * 60, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(scale, { toValue: 1, delay: index * 60, useNativeDriver: Platform.OS !== 'web', damping: 12 }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[s.featureChip, { opacity: op, transform: [{ scale }] }]}>
      <Ionicons name={icon || 'checkmark-circle'} size={14} color={ORANGE} />
      <Text style={s.featureChipTxt}>{label}</Text>
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
function ImageGallery({ photos, vehicleType }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const flatRef  = useRef(null);
  const dotScale = useRef(photos.map(() => new Animated.Value(1))).current;
  const pulse    = useRef(new Animated.Value(1)).current;

  const iconName = vehicleType === 'Bike' || vehicleType === 'Bike / Scooter' ? 'bicycle'
    : vehicleType === 'Auto' ? 'car-outline' : 'car-sport';

  const onScroll = useCallback((e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
    if (idx !== activeIdx) {
      setActiveIdx(idx);
      photos.forEach((_, i) => {
        Animated.spring(dotScale[i], { toValue: i === idx ? 1.4 : 1, useNativeDriver: Platform.OS !== 'web', speed: 20 }).start();
      });
    }
  }, [activeIdx, photos]);

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

  if (!photos || photos.length === 0) {
    return (
      <View style={[s.gallery, { backgroundColor: '#1a2a3a', overflow: 'hidden' }]}>
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
        data={photos} horizontal pagingEnabled
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
export default function CarDetailScreen() {
  const nav    = useNavigation();
  const route  = useRoute();
  const insets = useSafeAreaInsets();
  const { lang, t } = useLang();
  const car    = route.params?.car || {};
  const isSell = car.isSell || false;

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

  function toggleSaved() {
    setSaved(v => !v);
    Animated.sequence([
      Animated.spring(savedScale, { toValue: 1.4, useNativeDriver: Platform.OS !== 'web', speed: 25, bounciness: 12 }),
      Animated.spring(savedScale, { toValue: 1,   useNativeDriver: Platform.OS !== 'web', speed: 25 }),
    ]).start();
  }

  function callOwner() {
    const phone = car.whatsapp || car.phone || '';
    if (phone) Linking.openURL(`tel:${phone}`);
    else Alert.alert('Contact', 'Please contact via WhatsApp.');
  }

  function openWhatsApp() {
    const phone = car.whatsapp || car.phone || '';
    const msg   = isSell
      ? `Hi, I'm interested in buying your ${car.name} listed on CityPlus. Is it still available?`
      : `Hi, I'm interested in renting your ${car.name} listed on CityPlus.`;
    if (phone)
      Linking.openURL(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`).catch(() =>
        Alert.alert('WhatsApp not installed', 'Please contact via call.')
      );
    else Alert.alert('Contact', 'WhatsApp number not available.');
  }

  async function shareVehicle() {
    try {
      await Share.share({
        message: isSell
          ? `Check out this vehicle for sale on CityPlus!\n${car.name} - ${car.price}\nLocation: ${car.location || 'Nanded'}`
          : `Check out this vehicle on CityPlus!\n${car.name} - ${car.price}/day\nLocation: ${car.location || 'Nanded'}`,
      });
    } catch {}
  }

  const features    = car.features?.length ? car.features : (car.subtitle || '').split(' · ').filter(Boolean);
  const rentalTerms = car.rentalTerms || [];
  const photoUrls   = car.photoUrls || [];
  const featureIcons = ['color-palette-outline', 'flame-outline', 'snow-outline', 'people-outline', 'speedometer-outline', 'settings-outline'];

  const vehicleIcon = car.type === 'Bike' || car.type === 'Bike / Scooter' ? 'bicycle' : car.type === 'Auto' ? 'car-outline' : 'car-sport';

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
                <Ionicons name={saved ? 'heart' : 'heart-outline'} size={18} color={saved ? '#ef4444' : '#fff'} />
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity style={s.navBtn} onPress={shareVehicle} activeOpacity={0.85}>
              <Ionicons name="share-social-outline" size={17} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Hero icon */}
          <View style={s.iconContainer}>
            <Animated.View style={[s.iconRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
            <Animated.View style={[s.heroIconWrap, { transform: [{ scale: Animated.multiply(iconScale, pulseAnim) }] }]}>
              <Ionicons name={vehicleIcon} size={34} color={ORANGE} />
            </Animated.View>
          </View>

          <AutoTranslate text={car.name || 'Vehicle'} lang={lang} style={s.heroTitle} numberOfLines={2} />

          {/* Sub-title row */}
          {!!car.location && (
            <View style={s.heroSubRow}>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={s.heroSubTxt}>{car.location}</Text>
              {isSell ? (
                <View style={s.heroBadge}>
                  <Ionicons name="pricetag" size={10} color="#4ade80" />
                  <Text style={s.heroBadgeTxt}>For Sale</Text>
                </View>
              ) : car.available !== false && (
                <View style={s.heroBadge}>
                  <Ionicons name="checkmark-circle" size={10} color="#4ade80" />
                  <Text style={s.heroBadgeTxt}>Available</Text>
                </View>
              )}
            </View>
          )}

          {/* Stat pills */}
          <View style={s.statsRow}>
            <StatPill icon="cash-outline"       value={car.price || '—'}                         label={isSell ? 'Price' : 'Per Day'}   delay={300} />
            <StatPill icon="car-outline"         value={car.type || 'Vehicle'}                    label="Type"                           delay={380} />
            {!!car.fuel && <StatPill icon="flame-outline" value={car.fuel}                        label="Fuel"                           delay={460} />}
            {!isSell && !!car.deposit && <StatPill icon="card-outline" value={car.deposit}        label="Deposit"                        delay={540} />}
            {isSell && !!car.kmDriven && <StatPill icon="speedometer-outline" value={`${Number(car.kmDriven).toLocaleString('en-IN')} km`} label="KM Driven" delay={540} />}
          </View>
        </Animated.View>

        {/* ── Photo Gallery ── */}
        {photoUrls.length > 0 && (
          <FadeSection delay={80}>
            <ImageGallery photos={photoUrls} vehicleType={car.type} />
          </FadeSection>
        )}

        {/* ── Quick Info card ── */}
        <FadeSection delay={100}>
          <View style={s.quickInfoCard}>
            {!!car.price && (
              <InfoRow icon={isSell ? 'cash-outline' : 'cash-outline'} label={isSell ? 'Sale Price' : 'Rent / Day'} value={car.price} color="#16a34a" />
            )}
            {!isSell && !!car.deposit && (
              <InfoRow icon="card-outline"       label="Security Deposit"  value={car.deposit}                                          color="#0891b2" />
            )}
            {!!car.type && (
              <InfoRow icon="car-outline"        label="Vehicle Type"      value={car.type}                                             color="#7c3aed" />
            )}
            {!!car.fuel && (
              <InfoRow icon="flame-outline"      label="Fuel Type"         value={car.fuel}                                             color={ORANGE}  />
            )}
            {!!car.location && (
              <InfoRow icon="location-outline"   label="Location"          value={car.location}                                         color="#7c3aed" />
            )}
            {isSell && !!car.kmDriven && (
              <InfoRow icon="speedometer-outline" label="KM Driven"        value={`${Number(car.kmDriven).toLocaleString('en-IN')} km`} color="#64748b" />
            )}
            {isSell && !!car.numberOfOwners && (
              <InfoRow icon="people-outline"     label="Number of Owners"  value={`${car.numberOfOwners} owner${car.numberOfOwners > 1 ? 's' : ''}`} color="#0891b2" />
            )}
          </View>
        </FadeSection>

        {/* ── Features / Specifications ── */}
        {features.length > 0 && (
          <FadeSection delay={160}>
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={[s.cardHeaderDot, { backgroundColor: '#8b5cf6' }]} />
                <Text style={s.cardTitle}>SPECIFICATIONS</Text>
              </View>
              <View style={s.chipsRow}>
                {features.map((f, i) => (
                  <FeatureChip key={i} label={f} icon={featureIcons[i % featureIcons.length]} index={i} />
                ))}
              </View>
            </View>
          </FadeSection>
        )}

        {/* ── Rental Terms / Sale Conditions ── */}
        {rentalTerms.length > 0 && (
          <FadeSection delay={220}>
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={[s.cardHeaderDot, { backgroundColor: '#0891b2' }]} />
                <Text style={s.cardTitle}>{isSell ? 'SALE CONDITIONS' : 'RENTAL TERMS'}</Text>
              </View>
              {rentalTerms.map((term, i) => (
                <View key={i} style={s.reqRow}>
                  <View style={s.reqDot} />
                  <Text style={s.reqTxt}>{term}</Text>
                </View>
              ))}
            </View>
          </FadeSection>
        )}

        {/* ── Owner / Agency card ── */}
        <FadeSection delay={280}>
          <View style={s.ownerCard}>
            <View style={s.ownerIconWrap}>
              <Text style={s.ownerInitial}>
                {(car.owner?.initials || (car.owner?.name?.[0]) || 'O').toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.ownerName}>{car.owner?.name || 'Owner'}</Text>
              {!!car.location && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                  <Ionicons name="location-outline" size={11} color="#888" />
                  <Text style={s.ownerLoc}>{car.location}</Text>
                </View>
              )}
            </View>
            {car.owner?.verified && (
              <View style={s.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={15} color="#16a34a" />
                <View>
                  <Text style={s.verifiedTxt}>✓ {car.owner?.isAgency ? 'Verified Agency' : 'Verified Owner'}</Text>
                  <Text style={s.verifiedSub}>ID & phone confirmed</Text>
                </View>
              </View>
            )}
          </View>
        </FadeSection>

        {/* ── Safety Tips card ── */}
        <FadeSection delay={320}>
          <View style={s.safetyCard}>
            <View style={s.safetyHeader}>
              <Ionicons name="information-circle-outline" size={16} color="#0369a1" />
              <Text style={s.safetyTitle}>Safety Tips</Text>
            </View>
            {(isSell
              ? ['Verify RC book and insurance documents', 'Inspect vehicle thoroughly before payment', 'Prefer bank transfer after paperwork is complete']
              : ['Verify documents before handing over payment', 'Inspect vehicle condition before driving', 'Prefer meeting in public places']
            ).map((tip, i) => (
              <View key={i} style={s.reqRow}>
                <View style={s.reqDot} />
                <Text style={s.reqTxt}>{tip}</Text>
              </View>
            ))}
          </View>
        </FadeSection>

        {/* ── Action Buttons ── */}
        <View style={s.actionsBlock}>
          <ActionBtn label="Call Owner"           icon="call"                color={ORANGE}    onPress={callOwner}    delay={0}  />
          <ActionBtn label={isSell ? 'Chat on WhatsApp — Buy Enquiry' : 'Chat on WhatsApp — Rent Enquiry'}
                                                   icon="logo-whatsapp"      color={GREEN_WA}  onPress={openWhatsApp} delay={80} />
          <ActionBtn label="Share Listing"        icon="share-social-outline" outline           onPress={shareVehicle} delay={160} />
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

  /* ── Feature chips ── */
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  featureChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff7ed', borderRadius: 20,
    borderWidth: 1, borderColor: '#fed7aa',
    paddingVertical: 7, paddingHorizontal: 14,
  },
  featureChipTxt: { fontSize: 12, fontWeight: '700', color: '#c2410c' },

  /* ── Req rows (terms / tips) ── */
  reqRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 9 },
  reqDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ORANGE, marginTop: 8, flexShrink: 0 },
  reqTxt: { fontSize: 14, color: '#334155', lineHeight: 22, flex: 1 },

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
