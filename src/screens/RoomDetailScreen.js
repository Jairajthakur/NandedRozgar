import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Linking,
  StyleSheet, Share, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ORANGE = '#f97316';
const DARK_NAVY = '#1a2a3a';
const GREEN_WA = '#25d366';

/* ─── CTA Button ─── */
function CTAButton({ label, onPress, color, icon, delay }) {
  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0, duration: 400, delay,
        easing: Easing.out(Easing.back(1.2)), useNativeDriver: true,
      }),
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

/* ─── Amenity Chip ─── */
function AmenityChip({ label, delay }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, delay, useNativeDriver: true, speed: 14 }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[s.amenityChip, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <Ionicons name="checkmark-circle" size={12} color="#16a34a" style={{ marginRight: 4 }} />
      <Text style={s.amenityTxt}>{label}</Text>
    </Animated.View>
  );
}

/* ─── Main Screen ─── */
export default function RoomDetailScreen({ route, navigation }) {
  const { room } = route.params;
  const insets = useSafeAreaInsets();

  const [saved, setSaved] = useState(false);
  const savedScale = useRef(new Animated.Value(1)).current;

  // Content entrance animation
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentFade, { toValue: 1, duration: 450, delay: 100, useNativeDriver: true }),
      Animated.timing(contentSlide, {
        toValue: 0, duration: 400, delay: 100,
        easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
    ]).start();
  }, []);

  function toggleSaved() {
    setSaved(v => !v);
    Animated.sequence([
      Animated.spring(savedScale, { toValue: 1.4, useNativeDriver: true, speed: 25 }),
      Animated.spring(savedScale, { toValue: 1, useNativeDriver: true, speed: 25 }),
    ]).start();
  }

  function callOwner() {
    if (room.phone) Linking.openURL(`tel:${room.phone}`);
  }

  function whatsapp() {
    const phone = room.phone || '';
    const msg = encodeURIComponent(
      `Hi, I saw your room listing on NandedRozgar: ${room.title}. Is it still available?`
    );
    if (phone) Linking.openURL(`https://wa.me/91${phone}?text=${msg}`);
  }

  async function shareListing() {
    try {
      await Share.share({
        message: `Room for Rent: ${room.title}\n${room.location} | ${room.rent}\n\nFind on NandedRozgar!`,
      });
    } catch {}
  }

  const amenities = room.amenities || [];
  const cardBg = room.cardBg || DARK_NAVY;

  return (
    <View style={s.container}>
      {/* Hero Image */}
      <View style={[s.hero, { backgroundColor: cardBg }]}>
        <Ionicons name="home-outline" size={64} color="#fff" style={{ opacity: 0.14 }} />

        {/* Photo count */}
        <View style={s.photoBadge}>
          <Text style={s.photoBadgeTxt}>1/4 Photos</Text>
        </View>

        {/* Back button */}
        <TouchableOpacity
          style={[s.backBtn, { top: (insets.top || 0) + 10 }]}
          onPress={() => navigation.goBack()}
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
        <Animated.View style={{ opacity: contentFade, transform: [{ translateY: contentSlide }] }}>
          {/* Title + Price */}
          <View style={s.titleSection}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{room.title}</Text>
              <View style={s.locationRow}>
                <Ionicons name="location-outline" size={12} color="#888" />
                <Text style={s.locationTxt}>
                  {room.location}
                  {room.listedDaysAgo ? ` · Listed ${room.listedDaysAgo} days ago` : ''}
                </Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.rent}>{room.rent}</Text>
              {room.deposit && <Text style={s.depositTxt}>Deposit: {room.deposit}</Text>}
            </View>
          </View>

          {/* Tag chips */}
          <View style={s.chipRow}>
            {room.type && <View style={s.chip}><Text style={s.chipTxt}>{room.type}</Text></View>}
            {room.for && (
              <View style={s.chip}>
                <Ionicons name="people-outline" size={11} color="#555" />
                <Text style={s.chipTxt}> {room.for}</Text>
              </View>
            )}
            {room.available !== false && (
              <View style={[s.chip, { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="checkmark-circle" size={11} color="#16a34a" />
                <Text style={[s.chipTxt, { color: '#16a34a', marginLeft: 2 }]}>Available</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {!!room.description && (
            <>
              <Text style={s.sectionTitle}>DESCRIPTION</Text>
              <View style={s.descCard}>
                <Text style={s.descTxt}>{room.description}</Text>
              </View>
            </>
          )}

          {/* Amenities */}
          {amenities.length > 0 && (
            <>
              <Text style={s.sectionTitle}>AMENITIES</Text>
              <View style={s.amenitiesWrap}>
                {amenities.map((a, i) => (
                  <AmenityChip key={i} label={a} delay={i * 70} />
                ))}
              </View>
            </>
          )}

          {/* Owner card */}
          <View style={s.ownerCard}>
            <View style={s.ownerAvatar}>
              <Ionicons name="person" size={22} color="#0e7490" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.ownerName}>{room.owner?.name || 'Owner'}</Text>
              {room.owner?.verified && (
                <View style={s.verifiedRow}>
                  <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                  <Text style={s.verifiedTxt}>Verified Owner</Text>
                </View>
              )}
            </View>
          </View>

          {/* CTA Buttons */}
          <View style={s.ctaSection}>
            <CTAButton
              label="Call Owner"
              onPress={callOwner}
              color={GREEN_WA}
              icon="call"
              delay={0}
            />
            <CTAButton
              label="Chat on WhatsApp"
              onPress={whatsapp}
              color={GREEN_WA}
              icon="logo-whatsapp"
              delay={80}
            />

            {/* Share listing */}
            <Animated.View style={{ opacity: contentFade }}>
              <TouchableOpacity onPress={shareListing} style={s.shareBtn}>
                <Ionicons name="share-social-outline" size={16} color="#555" style={{ marginRight: 6 }} />
                <Text style={s.shareBtnTxt}>Share Listing</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  /* Hero */
  hero: {
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

  scrollView: { flex: 1 },

  /* Title section */
  titleSection: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  title: { fontSize: 19, fontWeight: '800', color: '#111' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  locationTxt: { fontSize: 11, color: '#888' },
  rent: { fontSize: 18, fontWeight: '800', color: '#111' },
  depositTxt: { fontSize: 11, color: '#888', marginTop: 2 },

  /* Tag chips */
  chipRow: {
    flexDirection: 'row', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 14,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 6, borderWidth: 1, borderColor: '#e5e5e5',
    paddingVertical: 4, paddingHorizontal: 10,
  },
  chipTxt: { fontSize: 12, color: '#555', fontWeight: '500' },

  /* Section title */
  sectionTitle: {
    fontSize: 10, fontWeight: '700', color: '#999',
    letterSpacing: 0.8, paddingHorizontal: 16,
    paddingTop: 18, paddingBottom: 10,
    backgroundColor: '#f5f5f5',
  },

  /* Description */
  descCard: {
    backgroundColor: '#fff', marginHorizontal: 14,
    borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#ebebeb',
  },
  descTxt: { fontSize: 13, color: '#333', lineHeight: 21 },

  /* Amenities */
  amenitiesWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16,
  },
  amenityChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0fdf4', borderRadius: 8,
    borderWidth: 1, borderColor: '#bbf7d0',
    paddingVertical: 6, paddingHorizontal: 10,
  },
  amenityTxt: { fontSize: 12, color: '#16a34a', fontWeight: '600' },

  /* Owner */
  ownerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', marginHorizontal: 14, marginTop: 14,
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#ebebeb',
  },
  ownerAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#ecfeff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#a5f3fc',
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
