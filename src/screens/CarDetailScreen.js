import React, { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Linking, Alert, Image, Animated, Easing, Share,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../utils/constants';
import { useLang } from '../utils/i18n';

const ORANGE = '#f97316';
const DARK_NAVY = '#1a2a3a';
const GREEN_WA = '#25d366';

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
  photos: 5,
};

/* ─── Feature Chip ─── */
function FeatureChip({ label, delay }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, delay, useNativeDriver: true, speed: 14 }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[s.featureChip, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <Ionicons name="checkmark-circle" size={14} color="#22c55e" style={{ marginRight: 4 }} />
      <Text style={s.featureChipTxt}>{label}</Text>
    </Animated.View>
  );
}

/* ─── CTA Button ─── */
function CTAButton({ label, onPress, color, icon, delay }) {
  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const pressIn = () => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start();
  const pressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
        style={[s.ctaBtn, { backgroundColor: color }]}
      >
        {icon && <Ionicons name={icon} size={18} color="#fff" style={{ marginRight: 8 }} />}
        <Text style={s.ctaBtnTxt}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ─── Share Button ─── */
function ShareButton({ onPress, delay }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity onPress={onPress} style={s.shareBtn}>
        <Ionicons name="share-social-outline" size={16} color="#555" style={{ marginRight: 6 }} />
        <Text style={s.shareBtnTxt}>Share Vehicle</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ─── Main Screen ─── */
export default function CarDetailScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const car = route.params?.car || PLACEHOLDER_CAR;
  const { t } = useLang();

  const [saved, setSaved] = useState(false);
  const savedScale = useRef(new Animated.Value(1)).current;

  // Content fade-in
  const contentAnim = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentAnim, { toValue: 1, duration: 450, delay: 100, useNativeDriver: true }),
      Animated.timing(contentSlide, { toValue: 0, duration: 400, delay: 100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  function toggleSaved() {
    setSaved(v => !v);
    Animated.sequence([
      Animated.spring(savedScale, { toValue: 1.35, useNativeDriver: true, speed: 25 }),
      Animated.spring(savedScale, { toValue: 1, useNativeDriver: true, speed: 25 }),
    ]).start();
  }

  function callOwner() {
    const phone = car.whatsapp || car.phone || '';
    if (phone) Linking.openURL(`tel:${phone}`);
    else Alert.alert('Contact', 'Please contact via WhatsApp.');
  }

  function openWhatsApp() {
    const phone = car.whatsapp || car.phone || '';
    const msg = `Hi, I'm interested in renting your ${car.name} listed on NandedRozgar.`;
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

  const features = car.features || [
    ...(car.subtitle || '').split(' · ').filter(Boolean),
  ];
  const rentalTerms = car.rentalTerms || [];

  const photoCount = car.photos || car.photoUrls?.length || 0;

  return (
    <View style={s.container}>
      {/* Gallery */}
      <View style={[s.gallery, { backgroundColor: DARK_NAVY }]}>
        <Ionicons name="car-sport" size={80} color="#fff" style={{ opacity: 0.14 }} />

        {/* Photo count badge */}
        {photoCount > 0 && (
          <View style={s.photoBadge}>
            <Text style={s.photoBadgeTxt}>1/{photoCount} Photos</Text>
          </View>
        )}

        {/* Back button */}
        <TouchableOpacity
          style={[s.backBtn, { top: (insets.top || 0) + 10 }]}
          onPress={() => nav.goBack()}
        >
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </TouchableOpacity>

        {/* Save button */}
        <Animated.View style={[s.saveBtn, { top: (insets.top || 0) + 10, transform: [{ scale: savedScale }] }]}>
          <TouchableOpacity onPress={toggleSaved}>
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={20}
              color={saved ? '#ef4444' : '#fff'}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: contentAnim, transform: [{ translateY: contentSlide }] }}>
          {/* Title + Price */}
          <View style={s.titleSection}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{car.name}</Text>
              <View style={s.locationRow}>
                <Ionicons name="location-outline" size={12} color="#888" />
                <Text style={s.locationTxt}>
                  {car.location || 'Nanded'}{car.listedDaysAgo ? ` · Listed ${car.listedDaysAgo} days ago` : ''}
                </Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.price}>{car.price}<Text style={s.perDay}>/day</Text></Text>
              {car.deposit && <Text style={s.deposit}>Deposit: {car.deposit}</Text>}
            </View>
          </View>

          {/* Tags row */}
          <View style={s.chipRow}>
            {car.type && <View style={s.typeChip}><Text style={s.typeChipTxt}>{car.type}</Text></View>}
            {car.available !== false && (
              <View style={s.availChip}>
                <Ionicons name="checkmark-circle" size={12} color="#16a34a" style={{ marginRight: 3 }} />
                <Text style={s.availChipTxt}>Available</Text>
              </View>
            )}
          </View>

          {/* Features */}
          {features.length > 0 && (
            <>
              <Text style={s.sectionTitle}>FEATURES</Text>
              <View style={s.featuresGrid}>
                {features.map((f, i) => (
                  <FeatureChip key={i} label={f} delay={i * 60} />
                ))}
              </View>
            </>
          )}

          {/* Rental Terms */}
          {rentalTerms.length > 0 && (
            <>
              <Text style={s.sectionTitle}>RENTAL TERMS</Text>
              <View style={s.termsBox}>
                {rentalTerms.map((term, i) => (
                  <Text key={i} style={s.termTxt}>{term}</Text>
                ))}
              </View>
            </>
          )}

          {/* Owner */}
          <View style={s.ownerCard}>
            <View style={[s.ownerAvatar, { backgroundColor: car.owner?.bg || '#e8edf2' }]}>
              <Ionicons name="person" size={20} color={car.owner?.color || '#555'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.ownerName}>{car.owner?.name || 'Owner'}</Text>
              {car.owner?.verified && (
                <View style={s.verifiedRow}>
                  <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                  <Text style={s.verifiedTxt}>
                    {car.owner?.isAgency ? 'Verified Agency' : 'Verified Owner'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* CTA Buttons */}
          <View style={s.ctaSection}>
            <CTAButton
              label="Call Owner"
              onPress={callOwner}
              color={DARK_NAVY}
              icon="call"
              delay={0}
            />
            <CTAButton
              label="WhatsApp"
              onPress={openWhatsApp}
              color={GREEN_WA}
              icon="logo-whatsapp"
              delay={80}
            />
            <ShareButton onPress={shareVehicle} delay={160} />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  /* Gallery */
  gallery: {
    height: 220, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  photoBadge: {
    position: 'absolute', bottom: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 7, paddingVertical: 4, paddingHorizontal: 10,
  },
  photoBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '600' },
  backBtn: {
    position: 'absolute', left: 14,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  saveBtn: {
    position: 'absolute', right: 14,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },

  /* Scroll */
  scrollView: { flex: 1 },

  /* Title section */
  titleSection: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  name: { fontSize: 19, fontWeight: '800', color: '#111' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  locationTxt: { fontSize: 11, color: '#888' },
  price: { fontSize: 18, fontWeight: '800', color: '#111' },
  perDay: { fontSize: 12, fontWeight: '400', color: '#888' },
  deposit: { fontSize: 11, color: '#888', marginTop: 2 },

  /* Tags */
  chipRow: {
    flexDirection: 'row', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 14,
  },
  typeChip: {
    borderRadius: 6, borderWidth: 1, borderColor: '#e5e5e5',
    paddingVertical: 4, paddingHorizontal: 10,
  },
  typeChipTxt: { fontSize: 12, color: '#555', fontWeight: '500' },
  availChip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 6, borderWidth: 1, borderColor: '#bbf7d0',
    paddingVertical: 4, paddingHorizontal: 10,
    backgroundColor: '#f0fdf4',
  },
  availChipTxt: { fontSize: 12, color: '#16a34a', fontWeight: '600' },

  /* Section title */
  sectionTitle: {
    fontSize: 10, fontWeight: '700', color: '#999',
    letterSpacing: 0.8, paddingHorizontal: 16,
    paddingTop: 18, paddingBottom: 10,
    backgroundColor: '#f5f5f5',
  },

  /* Features */
  featuresGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 0,
    backgroundColor: '#fff', paddingVertical: 12,
  },
  featureChip: {
    flexDirection: 'row', alignItems: 'center',
    width: '50%', paddingVertical: 5,
  },
  featureChipTxt: { fontSize: 13, color: '#111', fontWeight: '500' },

  /* Rental terms */
  termsBox: {
    backgroundColor: '#fff', marginHorizontal: 14,
    borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#ebebeb', gap: 5,
  },
  termTxt: { fontSize: 12, color: '#444', lineHeight: 20 },

  /* Owner */
  ownerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', marginHorizontal: 14, marginTop: 14,
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#ebebeb',
  },
  ownerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  ownerName: { fontSize: 14, fontWeight: '700', color: '#111' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  verifiedTxt: { fontSize: 11, color: '#16a34a', fontWeight: '500' },

  /* CTA section */
  ctaSection: {
    paddingHorizontal: 14, paddingTop: 18, gap: 10,
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, paddingVertical: 15,
  },
  ctaBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, paddingVertical: 14,
    borderWidth: 1, borderColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  shareBtnTxt: { fontSize: 13, fontWeight: '600', color: '#555' },
});
