import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C } from '../utils/constants';

const VEHICLE_TYPES = ['Car', 'Bike / Scooter', 'Auto', 'Mini Truck'];
const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'CNG'];
const SEAT_OPTIONS = ['2', '4', '5', '7', '8+'];

const PHOTO_SLOTS = [
  { icon: '🚗', label: 'Front', color: '#2d3a4a' },
  { icon: '🚙', label: 'Side', color: '#1e3a2f' },
  { icon: '🛞', label: 'Interior', color: '#2a1e3a' },
  { icon: '🚗', label: 'Back', color: '#2e1a1a' },
];

export default function PostCarScreen() {
  const nav = useNavigation();
  const [form, setForm] = useState({
    vehicleType: 'Car',
    fuelType: 'Petrol',
    seats: '5',
    name: '',
    dailyRate: '',
    area: '',
    whatsapp: '',
  });
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function simulatePhotoUpload() {
    if (uploadedPhotos.length >= 4) {
      Alert.alert('Limit reached', 'You can upload up to 8 photos.');
      return;
    }
    const next = PHOTO_SLOTS[uploadedPhotos.length % PHOTO_SLOTS.length];
    setUploadedPhotos(p => [...p, next]);
  }

  function removePhoto(i) {
    setUploadedPhotos(p => p.filter((_, idx) => idx !== i));
  }

  function handleSubmit() {
    if (!form.name || !form.dailyRate || !form.area || !form.whatsapp) {
      Alert.alert('Missing fields', 'Please fill all required fields before submitting.');
      return;
    }
    if (uploadedPhotos.length === 0) {
      Alert.alert('Add photos', 'Please add at least 1 vehicle photo for better visibility.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Listed!', 'Your vehicle has been listed successfully.', [
        { text: 'View Listings', onPress: () => nav.navigate('Cars') },
      ]);
    }, 1200);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => nav.goBack()}>
            <Text style={{ fontSize: 18 }}>‹</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>List Your Vehicle</Text>
        </View>

        <View style={s.body}>
          {/* Info notice */}
          <View style={s.notice}>
            <Text style={s.noticeIcon}>ℹ️</Text>
            <Text style={s.noticeTxt}>Add clear photos — listings with 3+ photos get <Text style={{ fontWeight: '700' }}>4× more bookings</Text>.</Text>
          </View>

          {/* Photo upload */}
          <Text style={s.label}>Vehicle photos <Text style={s.labelSub}>(up to 8 images)</Text></Text>

          {uploadedPhotos.length === 0 ? (
            <TouchableOpacity style={s.uploadArea} onPress={simulatePhotoUpload}>
              <Text style={{ fontSize: 32 }}>📷</Text>
              <Text style={s.uploadMain}>Tap to add photos</Text>
              <Text style={s.uploadSub}>Front, side, interior, back · JPG or PNG</Text>
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
              {uploadedPhotos.length < 8 && (
                <TouchableOpacity style={s.addMoreBox} onPress={simulatePhotoUpload}>
                  <Text style={{ fontSize: 22, color: '#aaa' }}>+</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Vehicle Type + Fuel */}
          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Vehicle type</Text>
              <View style={s.selectWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {VEHICLE_TYPES.map(t => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => set('vehicleType', t)}
                      style={[s.selectPill, form.vehicleType === t && s.selectPillOn]}
                    >
                      <Text style={[s.selectPillTxt, form.vehicleType === t && { color: '#fff' }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>

          <Text style={s.label}>Fuel type</Text>
          <View style={s.pillRow}>
            {FUEL_TYPES.map(f => (
              <TouchableOpacity
                key={f}
                onPress={() => set('fuelType', f)}
                style={[s.chip, form.fuelType === f && s.chipOn]}
              >
                <Text style={[s.chipTxt, form.fuelType === f && { color: '#fff' }]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Vehicle name / model</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Maruti Swift Dzire 2020"
            placeholderTextColor='#bbb'
            value={form.name}
            onChangeText={v => set('name', v)}
          />

          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Daily rate (₹)</Text>
              <TextInput
                style={s.input}
                placeholder="600"
                placeholderTextColor='#bbb'
                keyboardType="numeric"
                value={form.dailyRate}
                onChangeText={v => set('dailyRate', v)}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Seats</Text>
              <View style={s.pillRow}>
                {SEAT_OPTIONS.map(o => (
                  <TouchableOpacity
                    key={o}
                    onPress={() => set('seats', o)}
                    style={[s.chip, form.seats === o && s.chipOn]}
                  >
                    <Text style={[s.chipTxt, form.seats === o && { color: '#fff' }]}>{o}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Text style={s.label}>Your area in Nanded</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Shivaji Nagar, Cidco…"
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

          <TouchableOpacity
            style={[s.submitBtn, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={s.submitTxt}>{loading ? 'Listing…' : 'List My Vehicle 🚗'}</Text>
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
    width: 30, height: 30, borderRadius: 15,
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
  selectWrap: { marginBottom: 14 },
  selectPill: {
    paddingVertical: 5, paddingHorizontal: 11, borderRadius: 20,
    backgroundColor: '#f0f0f0', marginRight: 6,
    borderWidth: 1, borderColor: '#ebebeb',
  },
  selectPillOn: { backgroundColor: '#111', borderColor: C.dark },
  selectPillTxt: { fontSize: 11, fontWeight: '600', color: '#555' },

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
