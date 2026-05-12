import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { C } from '../utils/constants';

const GALLERY_TABS = ['Front', 'Side', 'Interior', 'Back'];
const GALLERY_COLORS = ['#2d3a4a', '#1e3a2f', '#2a1e3a', '#2e1a1a'];
const GALLERY_ICONS = ['🚗', '🚙', '🛞', '🚗'];

const PLACEHOLDER_CAR = {
  name: 'Maruti Swift 2022', subtitle: 'Hatchback · Shivaji Nagar',
  price: '₹800', rating: '4.8', reviews: '38',
  specs: { Seats: '5', Fuel: 'Petrol', Transmission: 'Manual', Features: 'AC + Music' },
  includes: ['AC', 'Music system', 'GPS', '100 km/day', 'Fuel not included'],
  owner: { name: 'Rahul Patil', initials: 'RP', area: 'Shivaji Nagar · Responds fast', color: '#185fa5', bg: '#e6f1fb' },
  verified: true, iconColor: '#2d3a4a', icon: '🚗', photos: 4,
  weeklyPrice: '₹5,000/week', monthlyPrice: '₹18k/month',
};

export default function CarDetailScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const car = route.params?.car || PLACEHOLDER_CAR;
  const [activeImg, setActiveImg] = useState(0);
  const tabs = GALLERY_TABS.slice(0, car.photos || 4);

  function openWhatsApp() {
    const msg = `Hi, I'm interested in renting your ${car.name} listed on NandedRozgar.`;
    Linking.openURL(`https://wa.me/91XXXXXXXXXX?text=${encodeURIComponent(msg)}`).catch(() =>
      Alert.alert('WhatsApp not installed', 'Please contact via call.'));
  }

  return (
    <View style={s.container}>
      {/* Gallery */}
      <View style={[s.gallery, { backgroundColor: GALLERY_COLORS[activeImg] }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => nav.goBack()}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '300' }}>‹</Text>
        </TouchableOpacity>
        <Text style={s.galleryIcon}>{GALLERY_ICONS[activeImg]}</Text>
        <View style={s.dotsRow}>
          {tabs.map((_, i) => (
            <View key={i} style={[s.dot, i === activeImg && s.dotActive]} />
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.galNav} contentContainerStyle={{ gap: 5, padding: 8 }}>
          {tabs.map((lbl, i) => (
            <TouchableOpacity key={i} onPress={() => setActiveImg(i)} style={[s.galThumb, i === activeImg && s.galThumbActive]}>
              <Text style={s.galThumbTxt}>{lbl}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Title + Price */}
        <View style={s.priceRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={s.name}>{car.name}</Text>
              <View style={s.typeBadge}><Text style={s.typeBadgeTxt}>Hatchback</Text></View>
            </View>
            <Text style={s.meta}>📍 {car.subtitle || car.location} · {car.owner?.name}</Text>
          </View>
        </View>

        <View style={s.priceBox}>
          <View>
            <Text style={s.priceVal}>{car.price}<Text style={s.priceUnit}>/day</Text></Text>
            {(car.weeklyPrice || car.monthlyPrice) && (
              <Text style={s.priceSub}>Also {car.weeklyPrice} · {car.monthlyPrice}</Text>
            )}
          </View>
          <View style={s.availPill}><Text style={s.availPillTxt}>Available</Text></View>
        </View>

        {/* Specs */}
        <Text style={s.sec}>SPECIFICATIONS</Text>
        <View style={s.specGrid}>
          {Object.entries(car.specs || {}).map(([k, v]) => (
            <View key={k} style={s.specBox}>
              <Text style={s.specVal}>{v}</Text>
              <Text style={s.specLbl}>{k}</Text>
            </View>
          ))}
        </View>

        {/* Includes */}
        <Text style={s.sec}>INCLUDES</Text>
        <View style={s.tagsWrap}>
          {(car.includes || []).map((t, i) => (
            <View key={i} style={s.tag}><Text style={s.tagTxt}>{t}</Text></View>
          ))}
        </View>

        {/* Owner */}
        <Text style={s.sec}>OWNER</Text>
        <View style={s.ownerBox}>
          <View style={[s.ownerAvatar, { backgroundColor: car.owner?.bg || '#eee' }]}>
            <Text style={[s.ownerInitials, { color: car.owner?.color || '#333' }]}>{car.owner?.initials || '??'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.ownerName}>{car.owner?.name || 'Owner'}</Text>
            <Text style={s.ownerSub}>{car.owner?.area || ''}</Text>
          </View>
          {car.verified && <View style={s.verifiedBadge}><Text style={s.verifiedTxt}>✓ Verified</Text></View>}
          <Text style={{ fontSize: 16, color: '#ccc' }}>›</Text>
        </View>
      </ScrollView>

      {/* CTA Bar */}
      <View style={s.ctaBar}>
        <TouchableOpacity style={s.ctaOut} onPress={openWhatsApp}>
          <Text style={s.ctaOutTxt}>💬 WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.ctaMain} onPress={() => Alert.alert('Booking', 'Contact the owner to book.')}>
          <Text style={s.ctaMainTxt}>Book Now →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  gallery: { height: 200, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  backBtn: { position: 'absolute', top: 44, left: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  galleryIcon: { fontSize: 60, opacity: 0.2 },
  dotsRow: { position: 'absolute', bottom: 52, flexDirection: 'row', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: '#fff' },
  galNav: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  galThumb: { width: 56, height: 36, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  galThumbActive: { borderColor: '#fff' },
  galThumbTxt: { fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  body: { flex: 1 },
  priceRow: { padding: 16, paddingBottom: 0 },
  name: { fontSize: 17, fontWeight: '800', color: '#111', flex: 1 },
  typeBadge: { backgroundColor: '#F4F4F4', borderRadius: 7, paddingVertical: 4, paddingHorizontal: 9 },
  typeBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#333' },
  meta: { fontSize: 11, color: '#888', marginTop: 4 },

  priceBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F4F4F4', borderRadius: 12, padding: 14, margin: 16, marginTop: 12 },
  priceVal: { fontSize: 20, fontWeight: '800', color: '#111' },
  priceUnit: { fontSize: 13, fontWeight: '500', color: '#888' },
  priceSub: { fontSize: 10, color: '#888', marginTop: 1 },
  availPill: { backgroundColor: '#111', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  availPillTxt: { fontSize: 11, color: '#fff', fontWeight: '700' },

  sec: { fontSize: 10, fontWeight: '700', color: '#aaa', letterSpacing: 0.6, textTransform: 'uppercase', paddingHorizontal: 16, marginTop: 14, marginBottom: 8 },
  specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingHorizontal: 16 },
  specBox: { backgroundColor: '#F4F4F4', borderRadius: 10, padding: 10, width: '47%' },
  specVal: { fontSize: 13, fontWeight: '700', color: '#111' },
  specLbl: { fontSize: 10, color: '#888', marginTop: 2 },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16 },
  tag: { backgroundColor: '#F4F4F4', borderRadius: 5, paddingVertical: 4, paddingHorizontal: 10 },
  tagTxt: { fontSize: 11, color: '#555' },

  ownerBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F4F4F4', borderRadius: 12, padding: 13, marginHorizontal: 16 },
  ownerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ownerInitials: { fontSize: 13, fontWeight: '700' },
  ownerName: { fontSize: 13, fontWeight: '700', color: '#111' },
  ownerSub: { fontSize: 10, color: '#888', marginTop: 1 },
  verifiedBadge: { backgroundColor: '#e1f5ee', borderRadius: 5, paddingVertical: 3, paddingHorizontal: 7 },
  verifiedTxt: { fontSize: 10, color: '#0f6e56', fontWeight: '600' },

  ctaBar: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  ctaOut: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff' },
  ctaOutTxt: { color: '#111', fontSize: 13, fontWeight: '700' },
  ctaMain: { flex: 1, backgroundColor: '#111', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  ctaMainTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
