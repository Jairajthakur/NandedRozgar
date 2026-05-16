import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, KeyboardAvoidingView, Platform, Image,
  Modal, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { C, CAR_PLANS } from '../utils/constants';
import { useLang } from '../utils/i18n';
import { http } from '../utils/api';

const VEHICLE_TYPES = ['Car', 'Bike / Scooter', 'Auto', 'Mini Truck', 'Bus / Tempo', 'Tractor'];
const FUEL_TYPES    = ['Petrol', 'Diesel', 'Electric', 'CNG'];
const SEAT_OPTIONS  = ['1', '2', '4', '5', '7', '8+'];
const TRANSMISSION  = ['Manual', 'Automatic'];
const AC_OPTIONS    = ['AC', 'Non-AC'];
const COLOR_OPTIONS = ['White', 'Silver', 'Black', 'Red', 'Blue', 'Grey', 'Other'];
const PURPOSE_OPTS  = ['Self-drive rental', 'With driver (hire)', 'Outstation trips', 'Local daily use'];
const YEAR_OPTIONS  = ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', 'Older'];
const AVAIL_OPTIONS = ['Available now', 'Weekends only', 'Weekdays only', 'By appointment'];
const INCLUDE_OPTS  = ['Fuel included', 'GPS', 'Music system', 'First aid kit', 'Child seat', 'Insurance'];

const STEPS = [
  { id: 1, icon: 'camera',    label: 'Photos' },
  { id: 2, icon: 'car',       label: 'Vehicle' },
  { id: 3, icon: 'cash',      label: 'Pricing' },
  { id: 4, icon: 'location',  label: 'Location' },
  { id: 5, icon: 'calendar',  label: 'Plan' },
];

function StepIndicator({ current }) {
  return (
    <View style={si.wrap}>
      {STEPS.map((step, i) => {
        const done   = current > step.id;
        const active = current === step.id;
        return (
          <React.Fragment key={step.id}>
            <View style={si.stepCol}>
              <View style={[si.circle, done && si.circleDone, active && si.circleActive]}>
                {done
                  ? <Ionicons name="checkmark" size={13} color="#fff" />
                  : <Ionicons name={step.icon} size={13} color={active ? '#fff' : '#888'} />}
              </View>
              <Text style={[si.stepLbl, active && { color: '#111', fontWeight: '800' }]} numberOfLines={1}>
                {step.label}
              </Text>
            </View>
            {i < STEPS.length - 1 && <View style={[si.line, done && si.lineDone]} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function PlanCard({ plan, selected, onSelect }) {
  return (
    <TouchableOpacity
      onPress={() => onSelect(plan)}
      style={[pc.card, selected && pc.cardSelected, plan.popular && pc.cardWithBadge]}
      activeOpacity={0.8}
    >
      {plan.popular && (
        <View style={pc.popularBadge}><Text style={pc.popularTxt}>MOST POPULAR</Text></View>
      )}
      <Text style={[pc.planLabel, selected && { color: '#fff' }]}>{plan.label}</Text>
      <Text style={[pc.planPrice, selected && { color: '#fff' }]}>₹{plan.price}</Text>
      <View style={pc.meta}>
        <Ionicons name="time-outline" size={12} color={selected ? 'rgba(255,255,255,0.7)' : '#999'} />
        <Text style={[pc.days, selected && { color: 'rgba(255,255,255,0.7)' }]}>{plan.days} days</Text>
      </View>
      {selected && <View style={pc.check}><Ionicons name="checkmark-circle" size={18} color="#fff" /></View>}
    </TouchableOpacity>
  );
}

function ChipRow({ options, value, onSelect, multi = false }) {
  return (
    <View style={s.pillRow}>
      {options.map(opt => {
        const active = multi ? value.includes(opt) : value === opt;
        return (
          <TouchableOpacity key={opt} onPress={() => onSelect(opt)} style={[s.chip, active && s.chipOn]}>
            <Text style={[s.chipTxt, active && { color: '#fff' }]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function PhotoPickerModal({ visible, onClose, onCamera, onGallery }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pm.overlay} onPress={onClose}>
        <Pressable style={pm.sheet}>
          <View style={pm.handle} />
          <Text style={pm.title}>Add Vehicle Photo</Text>
          <TouchableOpacity style={pm.option} onPress={onCamera} activeOpacity={0.8}>
            <View style={[pm.iconWrap, { backgroundColor: '#eff6ff' }]}><Ionicons name="camera" size={22} color="#2563eb" /></View>
            <View style={{ flex: 1 }}>
              <Text style={pm.optionTitle}>Take a Photo</Text>
              <Text style={pm.optionSub}>Open camera to capture</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
          </TouchableOpacity>
          <TouchableOpacity style={pm.option} onPress={onGallery} activeOpacity={0.8}>
            <View style={[pm.iconWrap, { backgroundColor: '#f0fdf4' }]}><Ionicons name="images" size={22} color="#16a34a" /></View>
            <View style={{ flex: 1 }}>
              <Text style={pm.optionTitle}>Choose from Gallery</Text>
              <Text style={pm.optionSub}>Select multiple photos at once</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
          </TouchableOpacity>
          <TouchableOpacity style={pm.cancelBtn} onPress={onClose}><Text style={pm.cancelTxt}>Cancel</Text></TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SectionTitle({ icon, title, subtitle }) {
  return (
    <View style={s.sectionTitle}>
      <Ionicons name={icon} size={20} color="#111" style={{ marginRight: 8, marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={s.sectionTitleTxt}>{title}</Text>
        {subtitle ? <Text style={s.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export default function PostCarScreen() {
  const nav = useNavigation();
  const { t } = useLang();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    vehicleType: 'Car', fuelType: 'Petrol', transmission: 'Manual',
    acType: 'AC', seats: '5', name: '', year: '', color: '',
    dailyRate: '', hourlyRate: '', kmLimit: '', extraKmRate: '',
    purpose: [], includes: [], availability: 'Available now',
    area: '', address: '', whatsapp: '', ownerName: '', description: '',
    minBooking: '', advanceAmt: '',
  });
  const [photos, setPhotos]               = useState([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loading, setLoading]             = useState(false);
  const [selectedPlan, setSelectedPlan]   = useState(CAR_PLANS.find(p => p.popular) || CAR_PLANS[0]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggle = (field, val) =>
    setForm(f => ({ ...f, [field]: f[field].includes(val) ? f[field].filter(x => x !== val) : [...f[field], val] }));

  async function openCamera() {
    setPickerVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow camera access in Settings.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.82 });
    if (!result.canceled && result.assets?.length) {
      if (photos.length >= 8) { Alert.alert('Limit reached', 'Max 8 photos.'); return; }
      setPhotos(p => [...p, result.assets[0].uri]);
    }
  }

  async function openGallery() {
    setPickerVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo library access in Settings.'); return; }
    const remaining = 8 - photos.length;
    if (remaining <= 0) { Alert.alert('Limit reached', 'Max 8 photos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.82 });
    if (!result.canceled && result.assets?.length) setPhotos(p => [...p, ...result.assets.map(a => a.uri)].slice(0, 8));
  }

  function removePhoto(i) { setPhotos(p => p.filter((_, idx) => idx !== i)); }

  function validateStep() {
    if (step === 1 && photos.length === 0) { Alert.alert('Add photos', 'Please add at least 1 vehicle photo.'); return false; }
    if (step === 2 && !form.name) { Alert.alert('Missing field', 'Please enter the vehicle name / model.'); return false; }
    if (step === 3 && !form.dailyRate) { Alert.alert('Missing field', 'Please enter the daily rate.'); return false; }
    if (step === 4 && (!form.area || !form.whatsapp)) { Alert.alert('Missing fields', 'Please fill area and WhatsApp number.'); return false; }
    return true;
  }

  function goNext() { if (!validateStep()) return; setStep(s => Math.min(s + 1, STEPS.length)); }
  function goBack() { setStep(s => Math.max(s - 1, 1)); }

  async function handleSubmit() {
    Alert.alert('Confirm & Pay', `List your vehicle for ₹${selectedPlan.price}?\n\nPlan: ${selectedPlan.label} (${selectedPlan.days} days)`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: `Pay ₹${selectedPlan.price}`, onPress: async () => {
          setLoading(true);
          try {
            const res = await http('POST', '/api/vehicles', {
              vehicleType: form.vehicleType,
              name: form.name,
              year: form.year,
              color: form.color,
              fuelType: form.fuelType,
              transmission: form.transmission,
              acType: form.acType,
              seats: form.seats,
              dailyRate: form.dailyRate,
              hourlyRate: form.hourlyRate,
              kmLimit: form.kmLimit,
              extraKmRate: form.extraKmRate,
              minBooking: form.minBooking,
              advanceAmt: form.advanceAmt,
              purpose: form.purpose,
              includes: form.includes,
              availability: form.availability,
              area: form.area,
              address: form.address,
              ownerName: form.ownerName,
              whatsapp: form.whatsapp,
              description: form.description,
              photos,
              planDays: selectedPlan.days,
              planLabel: selectedPlan.label,
              planPrice: selectedPlan.price,
            });
            if (res.ok) {
              Alert.alert('Listed! 🎉', `Your vehicle is live for ${selectedPlan.days} days. It will be auto-removed after the plan expires.`, [
                { text: 'View Listings', onPress: () => nav.navigate('Cars') },
              ]);
            } else {
              Alert.alert('Error', res.error || 'Failed to post listing. Please try again.');
            }
          } catch (e) {
            Alert.alert('Error', 'Network error. Please check your connection.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  function renderStep() {
    switch (step) {
      case 1: return (
        <>
          <SectionTitle icon="camera" title="Vehicle Photos" subtitle="Listings with 3+ photos get 4× more bookings" />
          <View style={s.tipBox}>
            <Ionicons name="information-circle" size={15} color="#2563eb" />
            <Text style={s.tipTxt}>Add front, side, interior &amp; back views for best results.</Text>
          </View>
          {photos.length === 0 ? (
            <TouchableOpacity style={s.uploadArea} onPress={() => setPickerVisible(true)} activeOpacity={0.8}>
              <View style={s.uploadIconWrap}><Ionicons name="camera-outline" size={30} color="#6366f1" /></View>
              <Text style={s.uploadMain}>Tap to add vehicle photos</Text>
              <Text style={s.uploadSub}>Front · Side · Interior · Back</Text>
              <View style={s.uploadBadges}>
                <View style={s.badge}><Ionicons name="camera" size={11} color="#2563eb" /><Text style={s.badgeTxt}> Camera</Text></View>
                <View style={s.badge}><Ionicons name="images" size={11} color="#16a34a" /><Text style={s.badgeTxt}> Gallery</Text></View>
              </View>
            </TouchableOpacity>
          ) : (
            <>
              <View style={s.photoGrid}>
                {photos.map((uri, i) => (
                  <View key={i} style={s.photoThumb}>
                    <Image source={{ uri }} style={s.photoImg} />
                    <TouchableOpacity style={s.removeBtn} onPress={() => removePhoto(i)}><Ionicons name="close" size={11} color="#fff" /></TouchableOpacity>
                    {i === 0 && <View style={s.mainBadge}><Text style={s.mainBadgeTxt}>Cover</Text></View>}
                  </View>
                ))}
                {photos.length < 8 && (
                  <TouchableOpacity style={s.addMoreBox} onPress={() => setPickerVisible(true)}>
                    <Ionicons name="add" size={22} color="#9ca3af" />
                    <Text style={s.addMoreTxt}>{8 - photos.length} more</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={s.photoCount}>{photos.length} / 8 photos added</Text>
            </>
          )}
        </>
      );

      case 2: return (
        <>
          <SectionTitle icon="car" title="Vehicle Details" />
          <Text style={s.label}>Vehicle type <Text style={s.req}>*</Text></Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 14 }}>
            {VEHICLE_TYPES.map(tp => (
              <TouchableOpacity key={tp} onPress={() => set('vehicleType', tp)} style={[s.chip, form.vehicleType === tp && s.chipOn]}>
                <Text style={[s.chipTxt, form.vehicleType === tp && { color: '#fff' }]}>{tp}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={s.label}>Vehicle name / model <Text style={s.req}>*</Text></Text>
          <TextInput style={s.input} placeholder="e.g. Maruti Swift Dzire 2020" placeholderTextColor="#bbb" value={form.name} onChangeText={v => set('name', v)} />
          <Text style={s.label}>Year</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 14 }}>
            {YEAR_OPTIONS.map(y => (
              <TouchableOpacity key={y} onPress={() => set('year', y)} style={[s.chip, form.year === y && s.chipOn]}>
                <Text style={[s.chipTxt, form.year === y && { color: '#fff' }]}>{y}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={s.label}>Colour</Text>
          <ChipRow options={COLOR_OPTIONS} value={form.color} onSelect={v => set('color', v)} />
          <Text style={s.label}>Fuel type</Text>
          <ChipRow options={FUEL_TYPES} value={form.fuelType} onSelect={v => set('fuelType', v)} />
          <View style={s.twoCol}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Transmission</Text>
              <ChipRow options={TRANSMISSION} value={form.transmission} onSelect={v => set('transmission', v)} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.label}>AC</Text>
              <ChipRow options={AC_OPTIONS} value={form.acType} onSelect={v => set('acType', v)} />
            </View>
          </View>
          <Text style={s.label}>Seats</Text>
          <ChipRow options={SEAT_OPTIONS} value={form.seats} onSelect={v => set('seats', v)} />
        </>
      );

      case 3: return (
        <>
          <SectionTitle icon="cash" title="Pricing & Booking" />
          <Text style={s.label}>Purpose of listing</Text>
          <ChipRow options={PURPOSE_OPTS} value={form.purpose} onSelect={v => toggle('purpose', v)} multi />
          <View style={s.twoCol}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Daily rate (₹) <Text style={s.req}>*</Text></Text>
              <TextInput style={s.input} placeholder="600" placeholderTextColor="#bbb" keyboardType="numeric" value={form.dailyRate} onChangeText={v => set('dailyRate', v)} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.label}>Hourly rate (₹)</Text>
              <TextInput style={s.input} placeholder="80" placeholderTextColor="#bbb" keyboardType="numeric" value={form.hourlyRate} onChangeText={v => set('hourlyRate', v)} />
            </View>
          </View>
          <View style={s.twoCol}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>KM limit / day</Text>
              <TextInput style={s.input} placeholder="100 km" placeholderTextColor="#bbb" keyboardType="numeric" value={form.kmLimit} onChangeText={v => set('kmLimit', v)} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.label}>Extra KM rate (₹)</Text>
              <TextInput style={s.input} placeholder="10/km" placeholderTextColor="#bbb" value={form.extraKmRate} onChangeText={v => set('extraKmRate', v)} />
            </View>
          </View>
          <View style={s.twoCol}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Min booking (days)</Text>
              <TextInput style={s.input} placeholder="1" placeholderTextColor="#bbb" keyboardType="numeric" value={form.minBooking} onChangeText={v => set('minBooking', v)} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.label}>Advance required (₹)</Text>
              <TextInput style={s.input} placeholder="500" placeholderTextColor="#bbb" keyboardType="numeric" value={form.advanceAmt} onChangeText={v => set('advanceAmt', v)} />
            </View>
          </View>
          <Text style={s.label}>What's included</Text>
          <ChipRow options={INCLUDE_OPTS} value={form.includes} onSelect={v => toggle('includes', v)} multi />
          <Text style={s.label}>Availability</Text>
          <ChipRow options={AVAIL_OPTIONS} value={form.availability} onSelect={v => set('availability', v)} />
        </>
      );

      case 4: return (
        <>
          <SectionTitle icon="location" title="Location & Contact" />
          <Text style={s.label}>Your area in Nanded <Text style={s.req}>*</Text></Text>
          <TextInput style={s.input} placeholder="e.g. Shivaji Nagar, Cidco…" placeholderTextColor="#bbb" value={form.area} onChangeText={v => set('area', v)} />
          <Text style={s.label}>Full pickup address</Text>
          <TextInput style={s.input} placeholder="e.g. Near Shivaji Putla, Station Road" placeholderTextColor="#bbb" value={form.address} onChangeText={v => set('address', v)} />
          <View style={s.twoCol}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Owner name</Text>
              <TextInput style={s.input} placeholder="Your name" placeholderTextColor="#bbb" value={form.ownerName} onChangeText={v => set('ownerName', v)} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.label}>WhatsApp number <Text style={s.req}>*</Text></Text>
              <TextInput style={s.input} placeholder="9876543210" placeholderTextColor="#bbb" keyboardType="phone-pad" value={form.whatsapp} onChangeText={v => set('whatsapp', v)} />
            </View>
          </View>
          <Text style={s.label}>Description <Text style={s.labelSub}>(optional)</Text></Text>
          <TextInput style={[s.input, { height: 90, textAlignVertical: 'top' }]} placeholder="Special conditions, rules, or extra info…" placeholderTextColor="#bbb" multiline value={form.description} onChangeText={v => set('description', v)} />
        </>
      );

      case 5: return (
        <>
          <SectionTitle icon="calendar" title="Choose Listing Plan" subtitle="One flat fee, auto-expires after plan period" />
          <View style={s.plansGrid}>
            {CAR_PLANS.map(plan => (
              <PlanCard key={plan.days} plan={plan} selected={selectedPlan?.days === plan.days} onSelect={setSelectedPlan} />
            ))}
          </View>
          {selectedPlan && (
            <View style={s.planChosen}>
              <Ionicons name="checkmark-circle" size={15} color="#16a34a" />
              <Text style={s.planChosenTxt}>
                <Text style={{ fontWeight: '800' }}>{selectedPlan.label}</Text> · ₹{selectedPlan.price} · {selectedPlan.days} days active
              </Text>
            </View>
          )}
          <View style={[s.totalBox, { marginTop: 16 }]}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Listing plan ({selectedPlan?.label})</Text>
              <Text style={s.totalVal}>₹{selectedPlan?.price || 0}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.totalRow}>
              <Text style={s.grandLabel}>Total payable</Text>
              <Text style={s.grandVal}>₹{selectedPlan?.price || 0}</Text>
            </View>
          </View>
          <Text style={s.sslNote}>🔒 Secured by Razorpay · 256-bit SSL · PCI DSS</Text>
        </>
      );
      default: return null;
    }
  }

  const isLast = step === STEPS.length;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <PhotoPickerModal visible={pickerVisible} onClose={() => setPickerVisible(false)} onCamera={openCamera} onGallery={openGallery} />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => step > 1 ? goBack() : nav.goBack()}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>List Your Vehicle</Text>
          <Text style={s.headerSub}>Step {step} of {STEPS.length} — {STEPS[step - 1].label}</Text>
        </View>
      </View>

      <StepIndicator current={step} />

      <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {renderStep()}
      </ScrollView>

      <View style={s.bottomBar}>
        <View style={s.navRow}>
          {step > 1 && (
            <TouchableOpacity style={s.backNavBtn} onPress={goBack}>
              <Ionicons name="arrow-back" size={18} color="#555" />
              <Text style={s.backNavTxt}>Back</Text>
            </TouchableOpacity>
          )}
          {isLast ? (
            <TouchableOpacity style={[s.nextBtn, { flex: 1 }, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
              <Text style={s.nextTxt}>{loading ? 'Processing…' : '🚗  List My Vehicle'}</Text>
              {!loading && <Text style={s.nextSub}>Pay ₹{selectedPlan?.price || 0}</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[s.nextBtn, step === 1 && { flex: 1 }]} onPress={goNext} activeOpacity={0.85}>
              <Text style={s.nextTxt}>Continue</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f5' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingTop: 52, backgroundColor: '#111' },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  sectionEmoji: { fontSize: 26 },
  sectionTitleTxt: { fontSize: 17, fontWeight: '800', color: '#111' },
  sectionSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  tipBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#eff6ff', borderRadius: 10, padding: 11, marginBottom: 18 },
  tipTxt: { fontSize: 12, color: '#1d4ed8', flex: 1, lineHeight: 18 },
  uploadArea: { borderWidth: 1.5, borderColor: '#d1d5db', borderStyle: 'dashed', borderRadius: 14, padding: 32, alignItems: 'center', backgroundColor: '#fafafa', gap: 6 },
  uploadIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  uploadMain: { fontSize: 14, fontWeight: '700', color: '#374151' },
  uploadSub: { fontSize: 12, color: '#9ca3af' },
  uploadBadges: { flexDirection: 'row', gap: 8, marginTop: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  badgeTxt: { fontSize: 12, color: '#374151', fontWeight: '600' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: { width: '30%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeBtn: { position: 'absolute', top: 5, right: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  mainBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 3, alignItems: 'center' },
  mainBadgeTxt: { fontSize: 9, color: '#fff', fontWeight: '700', letterSpacing: 0.5 },
  addMoreBox: { width: '30%', aspectRatio: 1, borderRadius: 10, borderWidth: 1.5, borderColor: '#d1d5db', borderStyle: 'dashed', backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center', gap: 3 },
  addMoreTxt: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  photoCount: { fontSize: 11, color: '#9ca3af', marginTop: 8, textAlign: 'right' },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 2 },
  labelSub: { fontWeight: '400', color: '#9ca3af' },
  req: { color: '#ef4444' },
  input: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 11, paddingHorizontal: 13, fontSize: 13, color: '#111', backgroundColor: '#fff', marginBottom: 14 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  chip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb' },
  chipOn: { backgroundColor: '#111', borderColor: '#111' },
  chipTxt: { fontSize: 12, fontWeight: '600', color: '#555' },
  twoCol: { flexDirection: 'row' },
  plansGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  planChosen: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 10, padding: 10 },
  planChosenTxt: { fontSize: 12, color: '#166534', flex: 1 },
  totalBox: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: '#e5e7eb' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  totalLabel: { fontSize: 13, color: '#6b7280' },
  totalVal: { fontSize: 13, color: '#111', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 10 },
  grandLabel: { fontSize: 15, fontWeight: '800', color: '#111' },
  grandVal: { fontSize: 20, fontWeight: '900', color: '#111' },
  sslNote: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 12 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 10 },
  navRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  backNavBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  backNavTxt: { fontSize: 14, fontWeight: '700', color: '#555' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#111', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24 },
  nextTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  nextSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
});

const si = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f5' },
  stepCol: { alignItems: 'center', gap: 4 },
  circle: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center' },
  circleActive: { borderColor: '#111', backgroundColor: '#111' },
  circleDone: { borderColor: '#16a34a', backgroundColor: '#16a34a' },
  circleNum: { fontSize: 14 },
  stepLbl: { fontSize: 10, color: '#9ca3af', fontWeight: '600', maxWidth: 52, textAlign: 'center' },
  line: { flex: 1, height: 2, backgroundColor: '#e5e7eb', marginBottom: 14 },
  lineDone: { backgroundColor: '#16a34a' },
});

const pc = StyleSheet.create({
  card: {
    borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, padding: 14,
    backgroundColor: '#fff', position: 'relative',
    width: '48%',
    minHeight: 100,
  },
  cardSelected: { borderColor: '#111', backgroundColor: '#111' },
  cardWithBadge: { paddingTop: 26 },
  popularBadge: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: '#f97316', borderTopLeftRadius: 10, borderTopRightRadius: 10,
    paddingVertical: 3, alignItems: 'center',
  },
  popularTxt: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  planLabel: { fontSize: 12, fontWeight: '700', color: '#111', marginBottom: 2 },
  planPrice: { fontSize: 20, fontWeight: '900', color: '#111', marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  days: { fontSize: 11, color: '#999' },
  check: { position: 'absolute', bottom: 8, right: 8 },
});

const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 38 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 20 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  iconWrap: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 14, fontWeight: '700', color: '#111' },
  optionSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  cancelBtn: { marginTop: 18, backgroundColor: '#f3f4f6', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelTxt: { fontSize: 14, fontWeight: '700', color: '#374151' },
});
