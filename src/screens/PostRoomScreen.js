import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C } from '../utils/constants';

const ROOM_TYPES = ['PG', '1 BHK', '2 BHK', '3 BHK', 'Studio', 'Hostel'];
const FOR_OPTIONS = ['Boys', 'Girls', 'Family', 'Any'];
const AMENITIES_LIST = ['WiFi', 'Meals', 'AC', 'Parking', 'CCTV', 'Laundry', 'RO Water', 'Power backup'];

const PHOTO_SLOTS = [
  { icon: '🛏️', label: 'Bedroom', color: '#1e2a3a' },
  { icon: '🍳', label: 'Kitchen', color: '#1a2e1e' },
  { icon: '🚿', label: 'Bathroom', color: '#2e1a1a' },
  { icon: '🌳', label: 'Outside', color: '#2a1e3a' },
];

export default function PostRoomScreen() {
  const nav = useNavigation();
  const [form, setForm] = useState({
    roomType: 'PG',
    forGender: 'Boys',
    rent: '',
    deposit: '',
    area: '',
    whatsapp: '',
    description: '',
  });
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function toggleAmenity(a) {
    setSelectedAmenities(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    );
  }

  function simulatePhotoUpload() {
    if (uploadedPhotos.length >= 6) {
      Alert.alert('Limit reached', 'You can upload up to 10 photos.');
      return;
    }
    const next = PHOTO_SLOTS[uploadedPhotos.length % PHOTO_SLOTS.length];
    setUploadedPhotos(p => [...p, next]);
  }

  function removePhoto(i) {
    setUploadedPhotos(p => p.filter((_, idx) => idx !== i));
  }

  function handleSubmit() {
    if (!form.rent || !form.area || !form.whatsapp) {
      Alert.alert('Missing fields', 'Please fill all required fields.');
      return;
    }
    if (uploadedPhotos.length === 0) {
      Alert.alert('Add photos', 'Listings with real room photos get 5× more enquiries!');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Listed!', 'Your room has been listed successfully.', [
        { text: 'View Listings', onPress: () => nav.navigate('Rooms') },
      ]);
    }, 1200);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => nav.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>List Your Room / PG</Text>
        </View>

        <View style={s.body}>
          {/* Notice */}
          <View style={s.notice}>
            <Text style={s.noticeIcon}>ℹ️</Text>
            <Text style={s.noticeTxt}>Listings with real room photos get <Text style={{ fontWeight: '700' }}>5× more enquiries</Text>. Add kitchen, bathroom too.</Text>
          </View>

          {/* Photo upload */}
          <Text style={s.label}>Room photos <Text style={s.labelSub}>(up to 10 images)</Text></Text>

          {uploadedPhotos.length === 0 ? (
            <TouchableOpacity style={s.uploadArea} onPress={simulatePhotoUpload}>
              <Ionicons name="home" size={32} color="#6366f1" />
              <Text style={s.uploadMain}>Tap to add room photos</Text>
              <Text style={s.uploadSub}>Bedroom, kitchen, bathroom, outside · JPG or PNG</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.photoGrid}>
              {uploadedPhotos.map((p, i) => (
                <View key={i} style={[s.photoBox, { backgroundColor: p.color }]}>
                  <Text style={s.photoIcon}>{p.icon}</Text>
                  <Text style={s.photoLabel}>{p.label}</Text>
                  <TouchableOpacity style={s.removeBtn} onPress={() => removePhoto(i)}>
                    <Text style={{ color: '#fff', fontSize: 10 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {uploadedPhotos.length < 10 && (
                <TouchableOpacity style={s.addMoreBox} onPress={simulatePhotoUpload}>
                  <Text style={{ fontSize: 22, color: '#aaa' }}>+</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Room Type */}
          <Text style={s.label}>Room type</Text>
          <View style={s.pillRow}>
            {ROOM_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => set('roomType', t)}
                style={[s.chip, form.roomType === t && s.chipOn]}
              >
                <Text style={[s.chipTxt, form.roomType === t && { color: '#fff' }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* For */}
          <Text style={s.label}>Suitable for</Text>
          <View style={s.pillRow}>
            {FOR_OPTIONS.map(o => (
              <TouchableOpacity
                key={o}
                onPress={() => set('forGender', o)}
                style={[s.chip, form.forGender === o && s.chipOn]}
              >
                <Text style={[s.chipTxt, form.forGender === o && { color: '#fff' }]}>{o}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Rent + Deposit */}
          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Monthly rent (₹)</Text>
              <TextInput
                style={s.input}
                placeholder="4500"
                placeholderTextColor='#bbb'
                keyboardType="numeric"
                value={form.rent}
                onChangeText={v => set('rent', v)}
              />
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Deposit (₹)</Text>
              <TextInput
                style={s.input}
                placeholder="9000"
                placeholderTextColor='#bbb'
                keyboardType="numeric"
                value={form.deposit}
                onChangeText={v => set('deposit', v)}
              />
            </View>
          </View>

          {/* Amenities */}
          <Text style={s.label}>Amenities available</Text>
          <View style={s.pillRow}>
            {AMENITIES_LIST.map(a => (
              <TouchableOpacity
                key={a}
                onPress={() => toggleAmenity(a)}
                style={[s.chip, selectedAmenities.includes(a) && s.chipOn]}
              >
                <Text style={[s.chipTxt, selectedAmenities.includes(a) && { color: '#fff' }]}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Your area in Nanded</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Station Road, Cidco…"
            placeholderTextColor='#bbb'
            value={form.area}
            onChangeText={v => set('area', v)}
          />

          <Text style={s.label}>WhatsApp number</Text>
          <TextInput
            style={s.input}
            placeholder="9876543210"
            placeholderTextColor='#bbb'
            keyboardType="phone-pad"
            value={form.whatsapp}
            onChangeText={v => set('whatsapp', v)}
          />

          <Text style={s.label}>Description <Text style={s.labelSub}>(optional)</Text></Text>
          <TextInput
            style={[s.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Describe the room, rules, nearby landmarks…"
            placeholderTextColor='#bbb'
            multiline
            value={form.description}
            onChangeText={v => set('description', v)}
          />

          <TouchableOpacity
            style={[s.submitBtn, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={s.submitTxt}>{loading ? 'Listing…' : 'List My Room'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, paddingTop: 52, backgroundColor: '#111',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },

  body: { padding: 14 },

  notice: {
    flexDirection: 'row', gap: 8,
    backgroundColor: '#f0f0f0', borderRadius: 9,
    padding: 11, marginBottom: 14, alignItems: 'flex-start',
  },
  noticeIcon: { fontSize: 15 },
  noticeTxt: { flex: 1, fontSize: 12, color: '#555', lineHeight: 18 },

  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 6, letterSpacing: 0.2 },
  labelSub: { fontWeight: '400', color: C.muted },

  uploadArea: {
    borderWidth: 1.5, borderColor: '#ebebeb', borderStyle: 'dashed',
    borderRadius: 10, padding: 22, alignItems: 'center',
    backgroundColor: '#f8f8f8', marginBottom: 14, gap: 5,
  },
  uploadMain: { fontSize: 13, fontWeight: '600', color: '#555' },
  uploadSub: { fontSize: 11, color: C.muted },

  photoGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14,
  },
  photoBox: {
    width: '30%', aspectRatio: 1, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  photoIcon: { fontSize: 22, opacity: 0.5 },
  photoLabel: { fontSize: 9, color: 'rgba(255,255,255,0.8)', marginTop: 3, fontWeight: '500' },
  removeBtn: {
    position: 'absolute', top: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  addMoreBox: {
    width: '30%', aspectRatio: 1, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#ebebeb', borderStyle: 'dashed',
    backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center',
  },

  row2: { flexDirection: 'row', alignItems: 'flex-start' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  chip: {
    paddingVertical: 5, paddingHorizontal: 11, borderRadius: 20,
    backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#ebebeb',
  },
  chipOn: { backgroundColor: '#111', borderColor: C.dark },
  chipTxt: { fontSize: 11, fontWeight: '600', color: '#555' },

  input: {
    borderWidth: 1, borderColor: '#ebebeb', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 12,
    fontSize: 13, color: C.text, backgroundColor: '#fff',
    marginBottom: 14,
  },

  submitBtn: {
    backgroundColor: '#111', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  submitTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
