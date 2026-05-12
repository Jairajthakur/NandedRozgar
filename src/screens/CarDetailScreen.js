import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Linking, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { C } from '../utils/constants';

const GALLERY_TABS = ['Front', 'Side', 'Interior', 'Back'];

const PLACEHOLDER_CAR = {
  name: 'Maruti Swift Dzire',
  subtitle: 'White · 2020 · Petrol · 5 seats',
  price: '₹600',
  rating: '4.8',
  reviews: '38',
  specs: { Fuel: 'Petrol', Transmission: 'Manual', Seats: '5 persons', Year: '2020' },
  includes: ['AC', 'Music system', 'GPS', '100 km/day', 'Fuel not included'],
  owner: { name: 'Mahesh Kulkarni', initials: 'MK', area: 'Shivaji Nagar · Responds fast', color: '#185fa5', bg: '#e6f1fb' },
  verified: true,
  iconColor: '#2d3a4a',
  icon: '🚗',
  photos: 4,
};

const GALLERY_COLORS = ['#2d3a4a', '#1e3a2f', '#2a1e3a', '#2e1a1a'];
const GALLERY_ICONS = ['🚗', '🚙', '🛞', '🚗'];

export default function CarDetailScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const car = route.params?.car || PLACEHOLDER_CAR;

  const [activeImg, setActiveImg] = useState(0);
  const tabs = GALLERY_TABS.slice(0, car.photos || 4);

  function openWhatsApp() {
    const msg = `Hi, I'm interested in renting your ${car.name} listed on NandedRozgar.`;
    Linking.openURL(`https://wa.me/91XXXXXXXXXX?text=${encodeURIComponent(msg)}`).catch(() =>
      Alert.alert('WhatsApp not installed', 'Please contact via call.')
    );
  }

  return (
    <View style={s.container}>
      {/* Gallery */}
      <View style={[s.gallery, { backgroundColor: GALLERY_COLORS[activeImg] }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => nav.goBack()}>
          <Text style={{ color: '#fff', fontSize: 18 }}>‹</Text>
        </TouchableOpacity>
        <Text style={s.galleryIcon}>{GALLERY_ICONS[activeImg]}</Text>
        {/* Thumbnail Nav */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.galNav} contentContainerStyle={{ gap: 5, padding: 8 }}>
          {tabs.map((lbl, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setActiveImg(i)}
              style={[s.galThumb, i === activeImg && s.galThumbActive]}
            >
              <Text style={s.galThumbTxt}>{lbl}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Title + Price */}
        <View style={s.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{car.name}</Text>
            <Text style={s.subtitle}>{car.subtitle}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.price}>{car.price}<Text style={s.perDay}>/day</Text></Text>
            <Text style={s.rating}>⭐ {car.rating} · {car.reviews} trips</Text>
          </View>
        </View>

        {/* Specs */}
        <Text style={s.sectionTitle}>VEHICLE DETAILS</Text>
        <View style={s.specGrid}>
          {Object.entries(car.specs || {}).map(([k, v]) => (
            <View key={k} style={s.specItem}>
              <Text style={s.specLabel}>{k}</Text>
              <Text style={s.specVal}>{v}</Text>
            </View>
          ))}
        </View>

        {/* Includes */}
        <Text style={s.sectionTitle}>INCLUDES</Text>
        <View style={s.tagsWrap}>
          {(car.includes || []).map((t, i) => (
            <View key={i} style={s.tag}><Text style={s.tagTxt}>{t}</Text></View>
          ))}
        </View>

        {/* Owner */}
        <Text style={s.sectionTitle}>OWNER</Text>
        <View style={s.ownerBox}>
          <View style={[s.ownerAvatar, { backgroundColor: car.owner?.bg || '#eee' }]}>
            <Text style={[s.ownerInitials, { color: car.owner?.color || '#333' }]}>
              {car.owner?.initials || '??'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.ownerName}>{car.owner?.name || 'Owner'}</Text>
            <Text style={s.ownerSub}>{car.owner?.area || ''}</Text>
          </View>
          {car.verified && (
            <View style={s.verifiedBadge}>
              <Text style={s.verifiedTxt}>✓ ID verified</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* CTA Bar */}
      <View style={s.ctaBar}>
        <TouchableOpacity style={s.ctaMain} onPress={() => Alert.alert('Booking', 'Contact the owner to book.')}>
          <Text style={s.ctaMainTxt}>Book This Car</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.ctaIcon} onPress={openWhatsApp}>
          <Text style={{ fontSize: 20 }}>💬</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.ctaIcon} onPress={() => Alert.alert('Saved', 'Added to your saved listings.')}>
          <Text style={{ fontSize: 20 }}>🔖</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  gallery: { height: 200, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  backBtn: {
    position: 'absolute', top: 44, left: 12,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  galleryIcon: { fontSize: 60, opacity: 0.25 },
  galNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  galThumb: {
    width: 56, height: 36, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  galThumbActive: { borderColor: '#fff' },
  galThumbTxt: { fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  body: { flex: 1 },
  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', padding: 14, paddingBottom: 8,
  },
  name: { fontSize: 17, fontWeight: '700', color: C.text },
  subtitle: { fontSize: 12, color: C.muted, marginTop: 2 },
  price: { fontSize: 17, fontWeight: '700', color: C.text },
  perDay: { fontSize: 11, fontWeight: '400', color: C.muted },
  rating: { fontSize: 11, color: '#9a6200', marginTop: 2, fontWeight: '600' },

  sectionTitle: {
    fontSize: 9, fontWeight: '600', color: C.muted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 7,
  },
  specGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 7,
    paddingHorizontal: 14,
  },
  specItem: {
    backgroundColor: '#f0f0f0', borderRadius: 8,
    padding: 10, width: '47%',
  },
  specLabel: { fontSize: 9, color: C.muted, marginBottom: 2 },
  specVal: { fontSize: 13, fontWeight: '700', color: C.text },

  tagsWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 5,
    paddingHorizontal: 14,
  },
  tag: { backgroundColor: '#f0f0f0', borderRadius: 5, paddingVertical: 4, paddingHorizontal: 9 },
  tagTxt: { fontSize: 11, color: '#555' },

  ownerBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f0f0f0', borderRadius: 10,
    padding: 11, marginHorizontal: 14,
  },
  ownerAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  ownerInitials: { fontSize: 13, fontWeight: '700' },
  ownerName: { fontSize: 13, fontWeight: '700', color: C.text },
  ownerSub: { fontSize: 10, color: C.muted, marginTop: 1 },
  verifiedBadge: { backgroundColor: '#e1f5ee', borderRadius: 5, paddingVertical: 3, paddingHorizontal: 7 },
  verifiedTxt: { fontSize: 10, color: '#0f6e56', fontWeight: '600' },

  ctaBar: {
    flexDirection: 'row', gap: 7, padding: 12,
    backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border,
  },
  ctaMain: {
    flex: 1, backgroundColor: '#111', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  ctaMainTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  ctaIcon: {
    backgroundColor: '#f0f0f0', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center',
  },
});
