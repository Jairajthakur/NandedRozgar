import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { C } from '../utils/constants';

const GALLERY_COLORS = ['#1e2a3a', '#1a2e1e', '#2e1a1a', '#2a1e3a'];
const GALLERY_TABS = ['Bedroom', 'Kitchen', 'Bathroom', 'Outside'];
const GALLERY_ICONS = ['🛏️', '🍳', '🚿', '🌳'];

export default function RoomDetailScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const room = route.params?.room;
  const [activeImg, setActiveImg] = useState(0);
  const tabs = GALLERY_TABS.slice(0, room?.photos || 4);

  if (!room) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.muted }}>Room not found</Text>
      </View>
    );
  }

  function openWhatsApp() {
    const msg = `Hi, I'm interested in the room "${room.name}" on NandedRozgar.`;
    Linking.openURL(`https://wa.me/91XXXXXXXXXX?text=${encodeURIComponent(msg)}`).catch(() =>
      Alert.alert('WhatsApp not installed', 'Please contact via call.'));
  }

  return (
    <View style={s.container}>
      {/* Gallery */}
      <View style={[s.gallery, { backgroundColor: GALLERY_COLORS[activeImg % GALLERY_COLORS.length] }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => nav.goBack()}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '300' }}>‹</Text>
        </TouchableOpacity>
        <Text style={s.galleryIcon}>{GALLERY_ICONS[activeImg]}</Text>
        <View style={s.dotsRow}>
          {tabs.map((_, i) => (
            <View key={i} style={[s.dot, i === activeImg && s.dotActive]} />
          ))}
        </View>
        <View style={s.photoCountBadge}>
          <Text style={s.photoCountTxt}>{tabs.length} photos</Text>
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
        {/* Title */}
        <View style={s.titleSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <Text style={s.name}>{room.name}</Text>
            <View style={s.genderBadge}>
              <Text style={s.genderBadgeTxt}>{room.forGender === 'Girls' ? 'Girls Only' : room.forGender === 'Boys' ? 'Boys Only' : 'Family OK'}</Text>
            </View>
          </View>
          <Text style={s.meta}>📍 {room.subtitle} · {room.owner?.name}</Text>
        </View>

        {/* Price Row */}
        <View style={s.priceBox}>
          <View>
            <Text style={s.priceVal}>{room.price.split('/')[0]}<Text style={s.priceUnit}>/mo</Text></Text>
            <Text style={s.priceSub}>Deposit: {room.specs?.Deposit || '2 months'}</Text>
          </View>
          <View style={[s.availPill, { backgroundColor: room.available ? '#111' : '#c4881a' }]}>
            <Text style={s.availPillTxt}>{room.availableLabel}</Text>
          </View>
        </View>

        {/* Room Details */}
        <Text style={s.sec}>ROOM DETAILS</Text>
        <View style={s.specGrid}>
          {Object.entries(room.specs || {}).map(([k, v]) => (
            <View key={k} style={s.specBox}>
              <Text style={s.specVal}>{v}</Text>
              <Text style={s.specLbl}>{k}</Text>
            </View>
          ))}
        </View>

        {/* Amenities */}
        <Text style={s.sec}>AMENITIES</Text>
        <View style={s.tagsWrap}>
          {(room.amenities || []).map((t, i) => (
            <View key={i} style={s.tag}><Text style={s.tagTxt}>{t}</Text></View>
          ))}
        </View>

        {/* Description */}
        <Text style={s.sec}>DESCRIPTION</Text>
        <Text style={s.desc}>{room.subtitle}. Contact owner for more details and to schedule a visit.</Text>

        {/* Owner */}
        <Text style={s.sec}>OWNER / LANDLORD</Text>
        <View style={s.ownerBox}>
          <View style={[s.ownerAvatar, { backgroundColor: room.owner?.bg || '#eee' }]}>
            <Text style={[s.ownerInitials, { color: room.owner?.color || '#333' }]}>{room.owner?.initials || '??'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.ownerName}>{room.owner?.name || 'Owner'}</Text>
            <Text style={s.ownerSub}>{room.owner?.area || ''}</Text>
          </View>
          {room.verified && <View style={s.verifiedBadge}><Text style={s.verifiedTxt}>✓ Verified</Text></View>}
          <Text style={{ fontSize: 16, color: '#ccc' }}>›</Text>
        </View>
      </ScrollView>

      {/* CTA Bar */}
      <View style={s.ctaBar}>
        <TouchableOpacity style={s.ctaOut} onPress={openWhatsApp}>
          <Text style={s.ctaOutTxt}>💬 WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.ctaMain} onPress={() => Alert.alert('Visit', 'We will connect you with the owner to schedule a visit.')}>
          <Text style={s.ctaMainTxt}>Contact Owner →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  gallery: { height: 200, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  backBtn: { position: 'absolute', top: 44, left: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  galleryIcon: { fontSize: 60, opacity: 0.25 },
  dotsRow: { position: 'absolute', bottom: 52, flexDirection: 'row', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: '#fff' },
  photoCountBadge: { position: 'absolute', bottom: 45, left: 16, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 7, paddingVertical: 4, paddingHorizontal: 10 },
  photoCountTxt: { fontSize: 11, color: '#fff', fontWeight: '700' },
  galNav: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  galThumb: { width: 66, height: 36, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  galThumbActive: { borderColor: '#fff' },
  galThumbTxt: { fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  body: { flex: 1 },
  titleSection: { padding: 16, paddingBottom: 0 },
  name: { fontSize: 17, fontWeight: '800', color: '#111', flex: 1, marginRight: 8 },
  genderBadge: { backgroundColor: '#111', borderRadius: 7, paddingVertical: 4, paddingHorizontal: 9 },
  genderBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#fff' },
  meta: { fontSize: 11, color: '#888', marginTop: 4 },

  priceBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F4F4F4', borderRadius: 12, padding: 14, margin: 16, marginTop: 12 },
  priceVal: { fontSize: 20, fontWeight: '800', color: '#111' },
  priceUnit: { fontSize: 13, fontWeight: '500', color: '#888' },
  priceSub: { fontSize: 10, color: '#888', marginTop: 1 },
  availPill: { borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  availPillTxt: { fontSize: 11, color: '#fff', fontWeight: '700' },

  sec: { fontSize: 10, fontWeight: '700', color: '#aaa', letterSpacing: 0.6, textTransform: 'uppercase', paddingHorizontal: 16, marginTop: 14, marginBottom: 8 },
  specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingHorizontal: 16 },
  specBox: { backgroundColor: '#F4F4F4', borderRadius: 10, padding: 10, width: '47%' },
  specVal: { fontSize: 13, fontWeight: '700', color: '#111' },
  specLbl: { fontSize: 10, color: '#888', marginTop: 2 },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16 },
  tag: { backgroundColor: '#F4F4F4', borderRadius: 5, paddingVertical: 4, paddingHorizontal: 10 },
  tagTxt: { fontSize: 11, color: '#555' },

  desc: { fontSize: 12, color: '#555', lineHeight: 19, paddingHorizontal: 16 },

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
