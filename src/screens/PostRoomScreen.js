import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { C, ROOM_PLANS } from '../utils/constants';
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

const ROOM_TYPES     = ['PG', '1 BHK', '2 BHK', '3 BHK', 'Studio', 'Hostel', 'Shared room', 'Bungalow'];
const FOR_OPTIONS    = ['Boys', 'Girls', 'Family', 'Any'];
const FURNISH_OPTS   = ['Fully furnished', 'Semi-furnished', 'Unfurnished'];
const FLOOR_OPTS     = ['Ground', '1st', '2nd', '3rd', '4th', '5th+', 'Top floor'];
const FACING_OPTS    = ['East', 'West', 'North', 'South', 'Road-facing', 'Garden-facing'];
const AMENITIES_LIST = ['WiFi', 'Meals', 'AC', 'Parking', 'CCTV', 'Laundry', 'RO Water', 'Power backup', 'Gym', 'Swimming pool', 'Lift', 'Security guard', 'Separate entrance', 'Balcony'];
const RULES_LIST     = ['No smoking', 'No alcohol', 'No non-veg', 'No pets', 'No loud music', 'Night curfew', 'Visitors allowed', 'Working professionals only'];
const AVAIL_OPTS     = ['Immediately', 'Within 1 week', 'Within 1 month', 'From specific date'];
const TENANT_PREFS   = ['Students', 'Working professionals', 'Couples', 'Bachelors', 'Any'];

// Vacancy stepper for PG / hostel beds
function BedStepper({ value, onChange }) {
  return (
    <View style={bs.wrap}>
      <TouchableOpacity style={[bs.btn, value <= 1 && { opacity: 0.35 }]} onPress={() => onChange(Math.max(1, value - 1))} disabled={value <= 1}>
        <Text style={bs.btnTxt}>−</Text>
      </TouchableOpacity>
      <View style={bs.mid}>
        <Text style={bs.num}>{value}</Text>
        <Text style={bs.lbl}>{value === 1 ? 'bed / room' : 'beds / rooms'}</Text>
      </View>
      <TouchableOpacity style={[bs.btn, value >= 50 && { opacity: 0.35 }]} onPress={() => onChange(Math.min(50, value + 1))} disabled={value >= 50}>
        <Text style={bs.btnTxt}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const PHOTO_SLOTS = [
  { icon: '🛏️', label: 'Bedroom',  color: '#1e2a3a' },
  { icon: '🍳', label: 'Kitchen',  color: '#1a2e1e' },
  { icon: '🚿', label: 'Bathroom', color: '#2e1a1a' },
  { icon: '🌳', label: 'Outside',  color: '#2a1e3a' },
  { icon: '🛋️', label: 'Hall',     color: '#2a2a1e' },
  { icon: '🪟', label: 'View',     color: '#1e2e2a' },
];

export default function PostRoomScreen() {
  const nav = useNavigation();
  const { t } = useLang();

  const [form, setForm] = useState({
    roomType:      'PG',
    forGender:     'Boys',
    furnished:     'Semi-furnished',
    floor:         '',
    facing:        '',
    totalFloors:   '',
    bhkSize:       '',
    rent:          '',
    deposit:       '',
    maintenance:   '',
    brokerFree:    true,
    area:          '',
    address:       '',
    landmark:      '',
    whatsapp:      '',
    ownerName:     '',
    description:   '',
    availableFrom: 'Immediately',
    tenantPref:    'Any',
    vacancies:     1,
    rules:         [],
  });

  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(
    ROOM_PLANS.find(p => p.popular) || ROOM_PLANS[0]
  );

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function toggleAmenity(a) {
    setSelectedAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  }
  function toggleRule(r) {
    setForm(f => ({ ...f, rules: f.rules.includes(r) ? f.rules.filter(x => x !== r) : [...f.rules, r] }));
  }

  function simulatePhotoUpload() {
    if (uploadedPhotos.length >= 10) { Alert.alert('Limit reached', 'You can upload up to 10 photos.'); return; }
    const next = PHOTO_SLOTS[uploadedPhotos.length % PHOTO_SLOTS.length];
    setUploadedPhotos(p => [...p, next]);
  }
  function removePhoto(i) { setUploadedPhotos(p => p.filter((_, idx) => idx !== i)); }

  function handleSubmit() {
    if (!form.rent || !form.area || !form.whatsapp) {
      Alert.alert('Missing fields', 'Please fill rent, area and WhatsApp number.'); return;
    }
    if (uploadedPhotos.length === 0) {
      Alert.alert('Add photos', 'Listings with real room photos get 5× more enquiries!'); return;
    }
    if (!selectedPlan) {
      Alert.alert('Select a plan', 'Please select a listing plan to continue.'); return;
    }
    Alert.alert(
      'Confirm & Pay',
      `List your ${form.roomType} for ₹${selectedPlan.price}?\n\nPlan: ${selectedPlan.label} (${selectedPlan.days} days)\n\nYour listing will be automatically removed after ${selectedPlan.days} days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Pay ₹${selectedPlan.price}`,
          onPress: () => {
            setLoading(true);
            setTimeout(() => {
              setLoading(false);
              Alert.alert('Listed!', `Your ${form.roomType} has been listed for ${selectedPlan.days} days.`, [
                { text: 'View Listings', onPress: () => nav.navigate('Rooms') },
              ]);
            }, 1200);
          },
        },
      ]
    );
  }

  const isPG = form.roomType === 'PG' || form.roomType === 'Hostel' || form.roomType === 'Shared room';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => nav.goBack()}>
            <Text style={{ fontSize: 18 }}>‹</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>List Your Room / PG</Text>
        </View>

        <View style={s.body}>
          {/* Notice */}
          <View style={s.notice}>
            <Text style={s.noticeIcon}>ℹ️</Text>
            <Text style={s.noticeTxt}>Listings with real room photos get <Text style={{ fontWeight: '700' }}>5× more enquiries</Text>. Add kitchen, bathroom too.</Text>
          </View>

          {/* PHOTOS */}
          <Text style={s.sectionHead}>📷 Room Photos</Text>
          <View style={s.photoTipsBox}>
            <Text style={s.photoTipsTitle}>📸 Photo Tips for Better Results</Text>
            {['Use natural light — open curtains/windows', 'Show the full room, not just a corner', 'Add kitchen, bathroom & outside photos', 'Avoid blurry or dark photos'].map((tip, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Text style={{ color: '#16a34a', fontSize: 12 }}>✓</Text>
                <Text style={{ fontSize: 12, color: '#555' }}>{tip}</Text>
              </View>
            ))}
          </View>

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

          {/* PROPERTY DETAILS */}
          <Text style={s.sectionHead}>🏠 Property Details</Text>

          <Text style={s.label}>Room / Property type *</Text>
          <View style={s.pillRow}>
            {ROOM_TYPES.map(tp => (
              <TouchableOpacity key={tp} onPress={() => set('roomType', tp)} style={[s.chip, form.roomType === tp && s.chipOn]}>
                <Text style={[s.chipTxt, form.roomType === tp && { color: '#fff' }]}>{tp}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Suitable for</Text>
          <View style={s.pillRow}>
            {FOR_OPTIONS.map(o => (
              <TouchableOpacity key={o} onPress={() => set('forGender', o)} style={[s.chip, form.forGender === o && s.chipOn]}>
                <Text style={[s.chipTxt, form.forGender === o && { color: '#fff' }]}>{o}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Furnishing</Text>
          <View style={s.pillRow}>
            {FURNISH_OPTS.map(f => (
              <TouchableOpacity key={f} onPress={() => set('furnished', f)} style={[s.chip, form.furnished === f && s.chipOn]}>
                <Text style={[s.chipTxt, form.furnished === f && { color: '#fff' }]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Floor</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5 }}>
                {FLOOR_OPTS.map(f => (
                  <TouchableOpacity key={f} onPress={() => set('floor', f)} style={[s.chip, form.floor === f && s.chipOn]}>
                    <Text style={[s.chipTxt, form.floor === f && { color: '#fff' }]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          <View style={{ height: 14 }} />

          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Total floors in building</Text>
              <TextInput style={s.input} placeholder="e.g. 4" placeholderTextColor='#bbb' keyboardType="numeric" value={form.totalFloors} onChangeText={v => set('totalFloors', v)} />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Carpet area (sq ft)</Text>
              <TextInput style={s.input} placeholder="e.g. 450" placeholderTextColor='#bbb' keyboardType="numeric" value={form.bhkSize} onChangeText={v => set('bhkSize', v)} />
            </View>
          </View>

          <Text style={s.label}>Facing direction</Text>
          <View style={s.pillRow}>
            {FACING_OPTS.map(f => (
              <TouchableOpacity key={f} onPress={() => set('facing', f)} style={[s.chip, form.facing === f && s.chipOn]}>
                <Text style={[s.chipTxt, form.facing === f && { color: '#fff' }]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* VACANCIES (especially useful for PG/Hostel) */}
          <Text style={s.sectionHead}>🛏️ {isPG ? 'Available Beds / Rooms' : 'Vacancies'}</Text>
          <Text style={s.fieldSub}>How many {isPG ? 'beds or rooms' : 'units'} are currently available?</Text>
          <BedStepper value={form.vacancies} onChange={v => set('vacancies', v)} />
          {form.vacancies > 1 && (
            <View style={s.vacancyNote}>
              <Text style={s.vacancyNoteTxt}>🎉 Listing will show "{form.vacancies} {isPG ? 'beds' : 'units'} available"</Text>
            </View>
          )}
          <View style={{ height: 14 }} />

          {/* PRICING */}
          <Text style={s.sectionHead}>💰 Pricing</Text>

          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Monthly rent (₹) *</Text>
              <TextInput style={s.input} placeholder="4500" placeholderTextColor='#bbb' keyboardType="numeric" value={form.rent} onChangeText={v => set('rent', v)} />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Deposit (₹)</Text>
              <TextInput style={s.input} placeholder="9000" placeholderTextColor='#bbb' keyboardType="numeric" value={form.deposit} onChangeText={v => set('deposit', v)} />
            </View>
          </View>

          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Maintenance (₹/mo)</Text>
              <TextInput style={s.input} placeholder="0" placeholderTextColor='#bbb' keyboardType="numeric" value={form.maintenance} onChangeText={v => set('maintenance', v)} />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1, justifyContent: 'center', paddingTop: 18 }}>
              <TouchableOpacity onPress={() => set('brokerFree', !form.brokerFree)} style={s.checkRow}>
                <View style={[s.checkbox, form.brokerFree && s.checkboxOn]}>
                  {form.brokerFree && <Text style={{ color: '#fff', fontSize: 11 }}>✓</Text>}
                </View>
                <Text style={s.checkLabel}>Broker-free</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* AVAILABILITY */}
          <Text style={s.sectionHead}>📅 Availability & Tenant</Text>

          <Text style={s.label}>Available from</Text>
          <View style={s.pillRow}>
            {AVAIL_OPTS.map(a => (
              <TouchableOpacity key={a} onPress={() => set('availableFrom', a)} style={[s.chip, form.availableFrom === a && s.chipOn]}>
                <Text style={[s.chipTxt, form.availableFrom === a && { color: '#fff' }]}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Preferred tenant</Text>
          <View style={s.pillRow}>
            {TENANT_PREFS.map(tp => (
              <TouchableOpacity key={tp} onPress={() => set('tenantPref', tp)} style={[s.chip, form.tenantPref === tp && s.chipOn]}>
                <Text style={[s.chipTxt, form.tenantPref === tp && { color: '#fff' }]}>{tp}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* AMENITIES */}
          <Text style={s.sectionHead}>✨ Amenities</Text>
          <View style={s.pillRow}>
            {AMENITIES_LIST.map(a => (
              <TouchableOpacity key={a} onPress={() => toggleAmenity(a)} style={[s.chip, selectedAmenities.includes(a) && s.chipOn]}>
                <Text style={[s.chipTxt, selectedAmenities.includes(a) && { color: '#fff' }]}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* RULES */}
          <Text style={s.sectionHead}>📜 House Rules</Text>
          <View style={s.pillRow}>
            {RULES_LIST.map(r => (
              <TouchableOpacity key={r} onPress={() => toggleRule(r)} style={[s.chip, form.rules.includes(r) && s.chipOn]}>
                <Text style={[s.chipTxt, form.rules.includes(r) && { color: '#fff' }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* LOCATION */}
          <Text style={s.sectionHead}>📍 Location & Contact</Text>

          <Text style={s.label}>Your area in Nanded *</Text>
          <TextInput style={s.input} placeholder="e.g. Station Road, Cidco…" placeholderTextColor='#bbb' value={form.area} onChangeText={v => set('area', v)} />

          <Text style={s.label}>Full address</Text>
          <TextInput style={s.input} placeholder="e.g. Plot No 12, Behind SBI Bank" placeholderTextColor='#bbb' value={form.address} onChangeText={v => set('address', v)} />

          <Text style={s.label}>Nearby landmark</Text>
          <TextInput style={s.input} placeholder="e.g. Near Rajiv Gandhi Chowk" placeholderTextColor='#bbb' value={form.landmark} onChangeText={v => set('landmark', v)} />

          <Text style={s.label}>Owner / contact name</Text>
          <TextInput style={s.input} placeholder="Your name" placeholderTextColor='#bbb' value={form.ownerName} onChangeText={v => set('ownerName', v)} />

          <Text style={s.label}>WhatsApp number *</Text>
          <TextInput style={s.input} placeholder="9876543210" placeholderTextColor='#bbb' keyboardType="phone-pad" value={form.whatsapp} onChangeText={v => set('whatsapp', v)} />

          <Text style={s.label}>Description <Text style={s.labelSub}>(optional)</Text></Text>
          <TextInput
            style={[s.input, { height: 90, textAlignVertical: 'top' }]}
            placeholder="Describe the room, nearby transport, special features, rules…"
            placeholderTextColor='#bbb'
            multiline
            value={form.description}
            onChangeText={v => set('description', v)}
          />

          {/* LISTING PLAN */}
          <Text style={s.sectionHead}>📅 Choose Your Listing Plan</Text>
          <View style={s.planNotice}>
            <Text style={s.planNoticeTxt}>Your listing is automatically removed after the plan period ends. One flat fee covers your full room/PG listing.</Text>
          </View>
          <View style={s.plansGrid}>
            {ROOM_PLANS.map(plan => (
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
            <Text style={s.submitTxt}>{loading ? 'Processing...' : `🏠 List ${form.vacancies > 1 ? `${form.vacancies} Rooms` : 'My Room'} · Pay ₹${selectedPlan?.price || 0}`}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const bs = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  btn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },
  mid: { paddingHorizontal: 24, alignItems: 'center' },
  num: { fontSize: 30, fontWeight: '900', color: '#111' },
  lbl: { fontSize: 11, color: '#888', fontWeight: '500' },
});

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
  fieldSub: { fontSize: 11, color: '#888', marginBottom: 8, marginTop: -4 },
  uploadArea: { borderWidth: 1.5, borderColor: '#ebebeb', borderStyle: 'dashed', borderRadius: 10, padding: 22, alignItems: 'center', backgroundColor: '#f8f8f8', marginBottom: 14, gap: 5 },
  uploadMain: { fontSize: 13, fontWeight: '600', color: '#555' },
  uploadSub: { fontSize: 11, color: C.muted },
  photoTipsBox: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 10, padding: 12, marginBottom: 10 },
  photoTipsTitle: { fontSize: 12, fontWeight: '700', color: '#15803d', marginBottom: 4 },
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
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: '#111', borderColor: '#111' },
  checkLabel: { fontSize: 12, fontWeight: '600', color: '#444' },
  vacancyNote: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 10, padding: 10, marginBottom: 4 },
  vacancyNoteTxt: { fontSize: 12, color: '#15803d', fontWeight: '600' },
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
