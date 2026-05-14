import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { C, CAR_PLANS, PRICING } from '../utils/constants';
import { useLang } from '../utils/i18n';

// ─── Plan card component ───────────────────────────────────────────────────────
function PlanCard({ plan, selected, onSelect }) {
  return (
    <TouchableOpacity
      onPress={() => onSelect(plan)}
      style={[pc.card, selected && pc.cardSelected]}
      activeOpacity={0.8}
    >
      {plan.popular && (
        <View style={pc.popularBadge}>
          <Text style={pc.popularTxt}>MOST POPULAR</Text>
        </View>
      )}
      <View style={pc.top}>
        <Text style={[pc.label, selected && { color: '#fff' }]}>{plan.label}</Text>
        <Text style={[pc.price, selected && { color: '#fff' }]}>₹{plan.price}</Text>
      </View>
      <View style={pc.meta}>
        <Ionicons name="time-outline" size={12} color={selected ? 'rgba(255,255,255,0.75)' : '#999'} />
        <Text style={[pc.days, selected && { color: 'rgba(255,255,255,0.75)' }]}>
          Active for {plan.days} days
        </Text>
      </View>
      {selected && (
        <View style={pc.check}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const VEHICLE_TYPES  = ['Car', 'Bike / Scooter', 'Auto', 'Mini Truck', 'Bus / Tempo', 'Tractor'];
const FUEL_TYPES     = ['Petrol', 'Diesel', 'Electric', 'CNG'];
const SEAT_OPTIONS   = ['1', '2', '4', '5', '7', '8+'];
const TRANSMISSION   = ['Manual', 'Automatic'];
const AC_OPTIONS     = ['AC', 'Non-AC'];
const COLOR_OPTIONS  = ['White', 'Silver', 'Black', 'Red', 'Blue', 'Grey', 'Other'];
const PURPOSE_OPTS   = ['Self-drive rental', 'With driver (hire)', 'Outstation trips', 'Local daily use'];
const YEAR_OPTIONS   = ['2024', '2023', '2022', '2021', '2020', '2019', '2018', 'Older'];
const AVAIL_OPTIONS  = ['Available now', 'Weekends only', 'Weekdays only', 'By appointment'];
const INCLUDE_OPTS   = ['Fuel included', 'GPS', 'Music system', 'First aid kit', 'Child seat', 'Insurance'];

const PHOTO_SLOTS = [
  { icon: 'car-sport', label: 'Front', color: '#2d3a4a' },
  { icon: 'car',       label: 'Side',  color: '#1e3a2f' },
  { icon: '🛞',        label: 'Interior', color: '#2a1e3a' },
  { icon: 'car',       label: 'Back',  color: '#2e1a1a' },
];

export default function PostCarScreen() {
  const nav = useNavigation();
  const { t } = useLang();

  const [form, setForm] = useState({
    vehicleType:  'Car',
    fuelType:     'Petrol',
    transmission: 'Manual',
    acType:       'AC',
    seats:        '5',
    name:         '',
    year:         '',
    color:        '',
    dailyRate:    '',
    hourlyRate:   '',
    kmLimit:      '',
    extraKmRate:  '',
    purpose:      [],
    includes:     [],
    availability: 'Available now',
    area:         '',
    address:      '',
    whatsapp:     '',
    ownerName:    '',
    description:  '',
    minBooking:   '',
    advanceAmt:   '',
  });

  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(
    CAR_PLANS.find(p => p.popular) || CAR_PLANS[0]
  );

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function toggle(field, val) {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(val) ? f[field].filter(x => x !== val) : [...f[field], val],
    }));
  }

  function simulatePhotoUpload() {
    if (uploadedPhotos.length >= 8) {
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
    if (!selectedPlan) {
      Alert.alert('Select a plan', 'Please select a listing plan to continue.');
      return;
    }
    Alert.alert(
      'Confirm & Pay',
      `List your vehicle for ₹${selectedPlan.price}?\n\nPlan: ${selectedPlan.label} (${selectedPlan.days} days)\n\nYour listing will be automatically removed after ${selectedPlan.days} days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Pay ₹${selectedPlan.price}`,
          onPress: () => {
            setLoading(true);
            setTimeout(() => {
              setLoading(false);
              Alert.alert('Listed!', `Your vehicle has been listed successfully for ${selectedPlan.days} days.`, [
                { text: 'View Listings', onPress: () => nav.navigate('Cars') },
              ]);
            }, 1200);
          },
        },
      ]
    );
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
          {/* Notice */}
          <View style={s.notice}>
            <Text style={s.noticeIcon}>ℹ️</Text>
            <Text style={s.noticeTxt}>Listings with 3+ photos get <Text style={{ fontWeight: '700' }}>4× more bookings</Text>. Add front, side, interior & back.</Text>
          </View>

          {/* PHOTOS */}
          <Text style={s.sectionHead}>📷 Vehicle Photos</Text>
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

          {/* VEHICLE DETAILS */}
          <Text style={s.sectionHead}>🚗 Vehicle Details</Text>

          <Text style={s.label}>Vehicle type *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 14 }}>
            {VEHICLE_TYPES.map(tp => (
              <TouchableOpacity key={tp} onPress={() => set('vehicleType', tp)} style={[s.chip, form.vehicleType === tp && s.chipOn]}>
                <Text style={[s.chipTxt, form.vehicleType === tp && { color: '#fff' }]}>{tp}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.label}>Vehicle name / model *</Text>
          <TextInput style={s.input} placeholder="e.g. Maruti Swift Dzire 2020" placeholderTextColor='#bbb' value={form.name} onChangeText={v => set('name', v)} />

          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Year</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5 }}>
                {YEAR_OPTIONS.map(y => (
                  <TouchableOpacity key={y} onPress={() => set('year', y)} style={[s.chip, form.year === y && s.chipOn]}>
                    <Text style={[s.chipTxt, form.year === y && { color: '#fff' }]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          <View style={{ height: 14 }} />

          <Text style={s.label}>Colour</Text>
          <View style={s.pillRow}>
            {COLOR_OPTIONS.map(c => (
              <TouchableOpacity key={c} onPress={() => set('color', c)} style={[s.chip, form.color === c && s.chipOn]}>
                <Text style={[s.chipTxt, form.color === c && { color: '#fff' }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Fuel type</Text>
          <View style={s.pillRow}>
            {FUEL_TYPES.map(f => (
              <TouchableOpacity key={f} onPress={() => set('fuelType', f)} style={[s.chip, form.fuelType === f && s.chipOn]}>
                <Text style={[s.chipTxt, form.fuelType === f && { color: '#fff' }]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Transmission</Text>
              <View style={s.pillRow}>
                {TRANSMISSION.map(t => (
                  <TouchableOpacity key={t} onPress={() => set('transmission', t)} style={[s.chip, form.transmission === t && s.chipOn]}>
                    <Text style={[s.chipTxt, form.transmission === t && { color: '#fff' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.label}>AC</Text>
              <View style={s.pillRow}>
                {AC_OPTIONS.map(a => (
                  <TouchableOpacity key={a} onPress={() => set('acType', a)} style={[s.chip, form.acType === a && s.chipOn]}>
                    <Text style={[s.chipTxt, form.acType === a && { color: '#fff' }]}>{a}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Text style={s.label}>Seats</Text>
          <View style={s.pillRow}>
            {SEAT_OPTIONS.map(o => (
              <TouchableOpacity key={o} onPress={() => set('seats', o)} style={[s.chip, form.seats === o && s.chipOn]}>
                <Text style={[s.chipTxt, form.seats === o && { color: '#fff' }]}>{o}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* RENTAL DETAILS */}
          <Text style={s.sectionHead}>💰 Pricing & Booking</Text>

          <Text style={s.label}>Purpose of listing</Text>
          <View style={s.pillRow}>
            {PURPOSE_OPTS.map(p => (
              <TouchableOpacity key={p} onPress={() => toggle('purpose', p)} style={[s.chip, form.purpose.includes(p) && s.chipOn]}>
                <Text style={[s.chipTxt, form.purpose.includes(p) && { color: '#fff' }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Daily rate (₹) *</Text>
              <TextInput style={s.input} placeholder="600" placeholderTextColor='#bbb' keyboardType="numeric" value={form.dailyRate} onChangeText={v => set('dailyRate', v)} />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Hourly rate (₹)</Text>
              <TextInput style={s.input} placeholder="80" placeholderTextColor='#bbb' keyboardType="numeric" value={form.hourlyRate} onChangeText={v => set('hourlyRate', v)} />
            </View>
          </View>

          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>KM limit / day</Text>
              <TextInput style={s.input} placeholder="100" placeholderTextColor='#bbb' keyboardType="numeric" value={form.kmLimit} onChangeText={v => set('kmLimit', v)} />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Extra KM rate (₹)</Text>
              <TextInput style={s.input} placeholder="10/km" placeholderTextColor='#bbb' value={form.extraKmRate} onChangeText={v => set('extraKmRate', v)} />
            </View>
          </View>

          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Min booking (days)</Text>
              <TextInput style={s.input} placeholder="1" placeholderTextColor='#bbb' keyboardType="numeric" value={form.minBooking} onChangeText={v => set('minBooking', v)} />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Advance required (₹)</Text>
              <TextInput style={s.input} placeholder="500" placeholderTextColor='#bbb' keyboardType="numeric" value={form.advanceAmt} onChangeText={v => set('advanceAmt', v)} />
            </View>
          </View>

          <Text style={s.label}>What's included</Text>
          <View style={s.pillRow}>
            {INCLUDE_OPTS.map(inc => (
              <TouchableOpacity key={inc} onPress={() => toggle('includes', inc)} style={[s.chip, form.includes.includes(inc) && s.chipOn]}>
                <Text style={[s.chipTxt, form.includes.includes(inc) && { color: '#fff' }]}>{inc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Availability</Text>
          <View style={s.pillRow}>
            {AVAIL_OPTIONS.map(a => (
              <TouchableOpacity key={a} onPress={() => set('availability', a)} style={[s.chip, form.availability === a && s.chipOn]}>
                <Text style={[s.chipTxt, form.availability === a && { color: '#fff' }]}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* CONTACT & LOCATION */}
          <Text style={s.sectionHead}>📍 Location & Contact</Text>

          <Text style={s.label}>Your area in Nanded *</Text>
          <TextInput style={s.input} placeholder="e.g. Shivaji Nagar, Cidco…" placeholderTextColor='#bbb' value={form.area} onChangeText={v => set('area', v)} />

          <Text style={s.label}>Full pickup address</Text>
          <TextInput style={s.input} placeholder="e.g. Near Shivaji Putla, Station Road" placeholderTextColor='#bbb' value={form.address} onChangeText={v => set('address', v)} />

          <Text style={s.label}>Owner name</Text>
          <TextInput style={s.input} placeholder="Your name" placeholderTextColor='#bbb' value={form.ownerName} onChangeText={v => set('ownerName', v)} />

          <Text style={s.label}>WhatsApp number *</Text>
          <TextInput style={s.input} placeholder="9876543210" placeholderTextColor='#bbb' keyboardType="phone-pad" value={form.whatsapp} onChangeText={v => set('whatsapp', v)} />

          <Text style={s.label}>Additional description <Text style={s.labelSub}>(optional)</Text></Text>
          <TextInput
            style={[s.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Any special conditions, rules, or information for renters…"
            placeholderTextColor='#bbb'
            multiline
            value={form.description}
            onChangeText={v => set('description', v)}
          />

          {/* LISTING PLAN */}
          <Text style={s.sectionHead}>📅 Choose Your Listing Plan</Text>
          <View style={s.planNotice}>
            <Text style={s.planNoticeTxt}>Your listing is automatically removed after the plan period ends. One flat fee covers your full vehicle listing.</Text>
          </View>
          <View style={s.plansGrid}>
            {CAR_PLANS.map(plan => (
              <PlanCard
                key={plan.days}
                plan={plan}
                selected={selectedPlan?.days === plan.days}
                onSelect={setSelectedPlan}
              />
            ))}
          </View>
          {selectedPlan && (
            <View style={s.planSelectedNote}>
              <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
              <Text style={s.planSelectedNoteTxt}>
                Selected: <Text style={{ fontWeight: '800' }}>{selectedPlan.label}</Text> · ₹{selectedPlan.price} · Active for {selectedPlan.days} days
              </Text>
            </View>
          )}

          {/* PAYMENT SUMMARY */}
          <View style={s.totalBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Listing plan ({selectedPlan?.label})</Text>
              <Text style={s.totalVal}>₹{selectedPlan?.price || 0}</Text>
            </View>
            <View style={s.totalDivider} />
            <View style={s.totalRow}>
              <Text style={s.grandLabel}>Total</Text>
              <Text style={s.grandVal}>₹{selectedPlan?.price || 0}</Text>
            </View>
          </View>
          <Text style={s.sslNote}>🔒 256-bit SSL · Powered by Razorpay · PCI DSS</Text>

          <TouchableOpacity style={[s.submitBtn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
            <Text style={s.submitTxt}>{loading ? 'Processing...' : `🚗 List My Vehicle · Pay ₹${selectedPlan?.price || 0}`}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingTop: 52, backgroundColor: '#111' },
  backBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  body: { padding: 14 },
  notice: { flexDirection: 'row', gap: 8, backgroundColor: '#f0f0f0', borderRadius: 9, padding: 11, marginBottom: 14, alignItems: 'flex-start' },
  noticeIcon: { fontSize: 15 },
  noticeTxt: { flex: 1, fontSize: 12, color: '#555', lineHeight: 18 },
  sectionHead: { fontSize: 13, fontWeight: '800', color: '#111', marginBottom: 8, marginTop: 8 },
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 6, letterSpacing: 0.2 },
  labelSub: { fontWeight: '400', color: C.muted },
  uploadArea: { borderWidth: 1.5, borderColor: '#ebebeb', borderStyle: 'dashed', borderRadius: 10, padding: 22, alignItems: 'center', backgroundColor: '#f8f8f8', marginBottom: 14, gap: 5 },
  uploadMain: { fontSize: 13, fontWeight: '600', color: '#555' },
  uploadSub: { fontSize: 11, color: C.muted },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  photoBox: { width: '30%', aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  photoIcon: { fontSize: 22, opacity: 0.5 },
  photoLabel: { fontSize: 9, color: 'rgba(255,255,255,0.8)', marginTop: 3, fontWeight: '500' },
  removeBtn: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  addMoreBox: { width: '30%', aspectRatio: 1, borderRadius: 8, borderWidth: 1.5, borderColor: '#ebebeb', borderStyle: 'dashed', backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  row2: { flexDirection: 'row', alignItems: 'flex-start' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  chip: { paddingVertical: 5, paddingHorizontal: 11, borderRadius: 20, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#ebebeb' },
  chipOn: { backgroundColor: '#111', borderColor: C.dark },
  chipTxt: { fontSize: 11, fontWeight: '600', color: '#555' },
  input: { borderWidth: 1, borderColor: '#ebebeb', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, fontSize: 13, color: C.text, backgroundColor: '#fff', marginBottom: 14 },
  submitBtn: { backgroundColor: '#111', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  planNotice: { backgroundColor: '#f0f0f0', borderRadius: 9, padding: 11, marginBottom: 12 },
  planNoticeTxt: { fontSize: 12, color: '#555', lineHeight: 18 },
  plansGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  planSelectedNote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 9, padding: 10, marginBottom: 14 },
  planSelectedNoteTxt: { fontSize: 12, color: '#166534', flex: 1 },
  totalBox: { backgroundColor: '#f8f8f8', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#ebebeb' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  totalLabel: { fontSize: 13, color: '#555' },
  totalVal: { fontSize: 13, color: '#111', fontWeight: '600' },
  totalDivider: { height: 1, backgroundColor: '#ebebeb', marginVertical: 8 },
  grandLabel: { fontSize: 15, fontWeight: '800', color: '#111' },
  grandVal: { fontSize: 18, fontWeight: '900', color: '#111' },
  sslNote: { fontSize: 11, color: '#aaa', textAlign: 'center', marginBottom: 12 },
});

const pc = StyleSheet.create({
  card: { borderWidth: 2, borderColor: '#ebebeb', borderRadius: 12, padding: 14, backgroundColor: '#fff', position: 'relative', minWidth: '47%', flex: 1 },
  cardSelected: { borderColor: '#111', backgroundColor: '#111' },
  popularBadge: { position: 'absolute', top: -1, right: 10, backgroundColor: '#f97316', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 },
  popularTxt: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  top: { gap: 2, marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '700', color: '#111' },
  price: { fontSize: 20, fontWeight: '900', color: '#111' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  days: { fontSize: 11, color: '#999' },
  check: { position: 'absolute', top: 10, right: 10 },
});
