import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, KeyboardAvoidingView, Platform, Image,
  Modal, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { C, ROOM_PLANS } from '../utils/constants';
import { useLang } from '../utils/i18n';

// ─── Plan card ────────────────────────────────────────────────────────────────
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
      <Text style={[pc.planLabel, selected && { color: '#fff' }]}>{plan.label}</Text>
      <Text style={[pc.planPrice, selected && { color: '#fff' }]}>₹{plan.price}</Text>
      <View style={pc.meta}>
        <Ionicons name="time-outline" size={12} color={selected ? 'rgba(255,255,255,0.7)' : '#999'} />
        <Text style={[pc.days, selected && { color: 'rgba(255,255,255,0.7)' }]}>{plan.days} days</Text>
      </View>
      {selected && (
        <View style={pc.check}>
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────
function Section({ emoji, title, children }) {
  return (
    <View style={sc.card}>
      <View style={sc.header}>
        <Text style={sc.emoji}>{emoji}</Text>
        <Text style={sc.title}>{title}</Text>
      </View>
      <View style={sc.body}>{children}</View>
    </View>
  );
}

// ─── Chip row ─────────────────────────────────────────────────────────────────
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

// ─── Vacancy stepper ──────────────────────────────────────────────────────────
function BedStepper({ value, onChange }) {
  return (
    <View style={bs.wrap}>
      <TouchableOpacity
        style={[bs.btn, value <= 1 && { opacity: 0.35 }]}
        onPress={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
      >
        <Text style={bs.btnTxt}>−</Text>
      </TouchableOpacity>
      <View style={bs.mid}>
        <Text style={bs.num}>{value}</Text>
        <Text style={bs.lbl}>{value === 1 ? 'bed / room' : 'beds / rooms'}</Text>
      </View>
      <TouchableOpacity
        style={[bs.btn, value >= 50 && { opacity: 0.35 }]}
        onPress={() => onChange(Math.min(50, value + 1))}
        disabled={value >= 50}
      >
        <Text style={bs.btnTxt}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Photo Picker bottom sheet ────────────────────────────────────────────────
function PhotoPickerModal({ visible, onClose, onCamera, onGallery }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pm.overlay} onPress={onClose}>
        <Pressable style={pm.sheet}>
          <View style={pm.handle} />
          <Text style={pm.title}>Add Room Photo</Text>

          <TouchableOpacity style={pm.option} onPress={onCamera} activeOpacity={0.8}>
            <View style={[pm.iconWrap, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="camera" size={22} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={pm.optionTitle}>Take a Photo</Text>
              <Text style={pm.optionSub}>Open camera to capture</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity style={pm.option} onPress={onGallery} activeOpacity={0.8}>
            <View style={[pm.iconWrap, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="images" size={22} color="#16a34a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={pm.optionTitle}>Choose from Gallery</Text>
              <Text style={pm.optionSub}>Select multiple photos at once</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity style={pm.cancelBtn} onPress={onClose}>
            <Text style={pm.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
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

export default function PostRoomScreen() {
  const nav = useNavigation();
  const { t } = useLang();

  const [form, setForm] = useState({
    roomType: 'PG', forGender: 'Boys', furnished: 'Semi-furnished',
    floor: '', facing: '', totalFloors: '', bhkSize: '',
    rent: '', deposit: '', maintenance: '', brokerFree: true,
    area: '', address: '', landmark: '', whatsapp: '', ownerName: '',
    description: '', availableFrom: 'Immediately', tenantPref: 'Any', vacancies: 1,
    rules: [],
  });

  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(
    ROOM_PLANS.find(p => p.popular) || ROOM_PLANS[0]
  );

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleAmenity = a => setSelectedAmenities(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);
  const toggleRule = r => setForm(f => ({ ...f, rules: f.rules.includes(r) ? f.rules.filter(x => x !== r) : [...f.rules, r] }));

  const isPG = ['PG', 'Hostel', 'Shared room'].includes(form.roomType);

  // ── Image picker ──────────────────────────────────────────────────────────
  async function openCamera() {
    setPickerVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access in your device Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.82,
    });
    if (!result.canceled && result.assets?.length) {
      if (photos.length >= 10) { Alert.alert('Limit reached', 'You can upload up to 10 photos.'); return; }
      setPhotos(p => [...p, result.assets[0].uri]);
    }
  }

  async function openGallery() {
    setPickerVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access in your device Settings.');
      return;
    }
    const remaining = 10 - photos.length;
    if (remaining <= 0) { Alert.alert('Limit reached', 'You can upload up to 10 photos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.82,
    });
    if (!result.canceled && result.assets?.length) {
      setPhotos(p => [...p, ...result.assets.map(a => a.uri)].slice(0, 10));
    }
  }

  function removePhoto(i) {
    setPhotos(p => p.filter((_, idx) => idx !== i));
  }

  function handleSubmit() {
    if (!form.rent || !form.area || !form.whatsapp) {
      Alert.alert('Missing fields', 'Please fill monthly rent, area and WhatsApp number.');
      return;
    }
    if (photos.length === 0) {
      Alert.alert('Add photos', 'Listings with real room photos get 5× more enquiries!');
      return;
    }
    Alert.alert(
      'Confirm & Pay',
      `List your ${form.roomType} for ₹${selectedPlan.price}?\n\nPlan: ${selectedPlan.label} (${selectedPlan.days} days)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Pay ₹${selectedPlan.price}`,
          onPress: () => {
            setLoading(true);
            setTimeout(() => {
              setLoading(false);
              Alert.alert('Listed! 🎉', `Your ${form.roomType} has been listed for ${selectedPlan.days} days.`, [
                { text: 'View Listings', onPress: () => nav.navigate('Rooms') },
              ]);
            }, 1200);
          },
        },
      ]
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <PhotoPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onCamera={openCamera}
        onGallery={openGallery}
      />

      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => nav.goBack()}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>List Your Room / PG</Text>
            <Text style={s.headerSub}>Reach thousands of house seekers</Text>
          </View>
        </View>

        <View style={s.body}>

          {/* ── SECTION 1: Photos ── */}
          <Section emoji="📷" title="Room Photos">
            <View style={s.tipBox}>
              <Ionicons name="information-circle" size={15} color="#2563eb" />
              <Text style={s.tipTxt}>Listings with real photos get <Text style={{ fontWeight: '800' }}>5× more enquiries</Text>. Add bedroom, kitchen &amp; bathroom.</Text>
            </View>

            {/* Photo tips */}
            <View style={s.photoTipsBox}>
              <Text style={s.photoTipsTitle}>📸 Photo Tips for Better Results</Text>
              {[
                'Use natural light — open curtains/windows',
                'Show the full room, not just a corner',
                'Add kitchen, bathroom & outside photos',
                'Avoid blurry or dark photos',
              ].map((tip, i) => (
                <View key={i} style={s.tipRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                  <Text style={s.tipItem}>{tip}</Text>
                </View>
              ))}
            </View>

            {photos.length === 0 ? (
              <TouchableOpacity style={s.uploadArea} onPress={() => setPickerVisible(true)} activeOpacity={0.8}>
                <View style={s.uploadIconWrap}>
                  <Ionicons name="home-outline" size={30} color="#6366f1" />
                </View>
                <Text style={s.uploadMain}>Tap to add room photos</Text>
                <Text style={s.uploadSub}>Bedroom · Kitchen · Bathroom · Outside</Text>
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
                      <TouchableOpacity style={s.removeBtn} onPress={() => removePhoto(i)}>
                        <Ionicons name="close" size={11} color="#fff" />
                      </TouchableOpacity>
                      {i === 0 && <View style={s.mainBadge}><Text style={s.mainBadgeTxt}>Cover</Text></View>}
                    </View>
                  ))}
                  {photos.length < 10 && (
                    <TouchableOpacity style={s.addMoreBox} onPress={() => setPickerVisible(true)}>
                      <Ionicons name="add" size={22} color="#9ca3af" />
                      <Text style={s.addMoreTxt}>{10 - photos.length} more</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={s.photoCount}>{photos.length} / 10 photos added</Text>
              </>
            )}
          </Section>

          {/* ── SECTION 2: Property Details ── */}
          <Section emoji="🏠" title="Property Details">
            <Text style={s.label}>Room / Property type <Text style={s.req}>*</Text></Text>
            <ChipRow options={ROOM_TYPES} value={form.roomType} onSelect={v => set('roomType', v)} />

            <Text style={s.label}>Suitable for</Text>
            <ChipRow options={FOR_OPTIONS} value={form.forGender} onSelect={v => set('forGender', v)} />

            <Text style={s.label}>Furnishing</Text>
            <ChipRow options={FURNISH_OPTS} value={form.furnished} onSelect={v => set('furnished', v)} />

            <Text style={s.label}>Floor</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 14 }}>
              {FLOOR_OPTS.map(f => (
                <TouchableOpacity key={f} onPress={() => set('floor', f)} style={[s.chip, form.floor === f && s.chipOn]}>
                  <Text style={[s.chipTxt, form.floor === f && { color: '#fff' }]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={s.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Total floors in building</Text>
                <TextInput style={s.input} placeholder="e.g. 4" placeholderTextColor="#bbb" keyboardType="numeric" value={form.totalFloors} onChangeText={v => set('totalFloors', v)} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.label}>Carpet area (sq ft)</Text>
                <TextInput style={s.input} placeholder="e.g. 450" placeholderTextColor="#bbb" keyboardType="numeric" value={form.bhkSize} onChangeText={v => set('bhkSize', v)} />
              </View>
            </View>

            <Text style={s.label}>Facing direction</Text>
            <ChipRow options={FACING_OPTS} value={form.facing} onSelect={v => set('facing', v)} />
          </Section>

          {/* ── SECTION 3: Vacancies ── */}
          <Section emoji="🛏️" title={isPG ? 'Available Beds / Rooms' : 'Vacancies'}>
            <Text style={s.fieldSub}>How many {isPG ? 'beds or rooms' : 'units'} are currently available?</Text>
            <BedStepper value={form.vacancies} onChange={v => set('vacancies', v)} />
            {form.vacancies > 1 && (
              <View style={s.vacancyNote}>
                <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                <Text style={s.vacancyNoteTxt}>Will show "{form.vacancies} {isPG ? 'beds' : 'units'} available"</Text>
              </View>
            )}
          </Section>

          {/* ── SECTION 4: Pricing ── */}
          <Section emoji="💰" title="Pricing">
            <View style={s.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Monthly rent (₹) <Text style={s.req}>*</Text></Text>
                <TextInput style={s.input} placeholder="4500" placeholderTextColor="#bbb" keyboardType="numeric" value={form.rent} onChangeText={v => set('rent', v)} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.label}>Security deposit (₹)</Text>
                <TextInput style={s.input} placeholder="9000" placeholderTextColor="#bbb" keyboardType="numeric" value={form.deposit} onChangeText={v => set('deposit', v)} />
              </View>
            </View>

            <View style={s.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Maintenance (₹/mo)</Text>
                <TextInput style={s.input} placeholder="0" placeholderTextColor="#bbb" keyboardType="numeric" value={form.maintenance} onChangeText={v => set('maintenance', v)} />
              </View>
              <View style={{ flex: 1, marginLeft: 10, justifyContent: 'flex-end', paddingBottom: 14 }}>
                <TouchableOpacity onPress={() => set('brokerFree', !form.brokerFree)} style={s.checkRow}>
                  <View style={[s.checkbox, form.brokerFree && s.checkboxOn]}>
                    {form.brokerFree && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  <Text style={s.checkLabel}>Broker-free</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Section>

          {/* ── SECTION 5: Availability & Tenant ── */}
          <Section emoji="📅" title="Availability & Tenant">
            <Text style={s.label}>Available from</Text>
            <ChipRow options={AVAIL_OPTS} value={form.availableFrom} onSelect={v => set('availableFrom', v)} />

            <Text style={s.label}>Preferred tenant</Text>
            <ChipRow options={TENANT_PREFS} value={form.tenantPref} onSelect={v => set('tenantPref', v)} />
          </Section>

          {/* ── SECTION 6: Amenities ── */}
          <Section emoji="✨" title="Amenities">
            <ChipRow options={AMENITIES_LIST} value={selectedAmenities} onSelect={toggleAmenity} multi />
          </Section>

          {/* ── SECTION 7: House Rules ── */}
          <Section emoji="📜" title="House Rules">
            <ChipRow options={RULES_LIST} value={form.rules} onSelect={toggleRule} multi />
          </Section>

          {/* ── SECTION 8: Location & Contact ── */}
          <Section emoji="📍" title="Location & Contact">
            <Text style={s.label}>Your area in Nanded <Text style={s.req}>*</Text></Text>
            <TextInput style={s.input} placeholder="e.g. Station Road, Cidco…" placeholderTextColor="#bbb" value={form.area} onChangeText={v => set('area', v)} />

            <Text style={s.label}>Full address</Text>
            <TextInput style={s.input} placeholder="e.g. Plot No 12, Behind SBI Bank" placeholderTextColor="#bbb" value={form.address} onChangeText={v => set('address', v)} />

            <Text style={s.label}>Nearby landmark</Text>
            <TextInput style={s.input} placeholder="e.g. Near Rajiv Gandhi Chowk" placeholderTextColor="#bbb" value={form.landmark} onChangeText={v => set('landmark', v)} />

            <View style={s.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Owner / contact name</Text>
                <TextInput style={s.input} placeholder="Your name" placeholderTextColor="#bbb" value={form.ownerName} onChangeText={v => set('ownerName', v)} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.label}>WhatsApp number <Text style={s.req}>*</Text></Text>
                <TextInput style={s.input} placeholder="9876543210" placeholderTextColor="#bbb" keyboardType="phone-pad" value={form.whatsapp} onChangeText={v => set('whatsapp', v)} />
              </View>
            </View>

            <Text style={s.label}>Description <Text style={s.labelSub}>(optional)</Text></Text>
            <TextInput
              style={[s.input, { height: 90, textAlignVertical: 'top' }]}
              placeholder="Nearby transport, special features, extra rules…"
              placeholderTextColor="#bbb"
              multiline
              value={form.description}
              onChangeText={v => set('description', v)}
            />
          </Section>

          {/* ── SECTION 9: Listing Plan ── */}
          <Section emoji="📋" title="Choose Listing Plan">
            <Text style={s.planNote}>Listing auto-expires after the plan period. One flat fee covers everything.</Text>
            <View style={s.plansGrid}>
              {ROOM_PLANS.map(plan => (
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
          </Section>

          {/* ── Payment summary ── */}
          <View style={s.totalBox}>
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

          <TouchableOpacity
            style={[s.submitBtn, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={s.submitTxt}>
              {loading ? 'Processing…' : `🏠  List ${form.vacancies > 1 ? `${form.vacancies} Rooms` : 'My Room'}`}
            </Text>
            {!loading && <Text style={s.submitSub}>Pay ₹{selectedPlan?.price || 0}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f5' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingTop: 52, backgroundColor: '#111' },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 1 },

  body: { padding: 14, gap: 12 },

  tipBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#eff6ff', borderRadius: 10, padding: 11, marginBottom: 12 },
  tipTxt: { fontSize: 12, color: '#1d4ed8', flex: 1, lineHeight: 18 },

  photoTipsBox: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 10, padding: 12, marginBottom: 14 },
  photoTipsTitle: { fontSize: 12, fontWeight: '800', color: '#15803d', marginBottom: 8 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 },
  tipItem: { fontSize: 12, color: '#374151', flex: 1 },

  uploadArea: { borderWidth: 1.5, borderColor: '#d1d5db', borderStyle: 'dashed', borderRadius: 14, padding: 28, alignItems: 'center', backgroundColor: '#fafafa', gap: 6 },
  uploadIconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  uploadMain: { fontSize: 14, fontWeight: '700', color: '#374151' },
  uploadSub: { fontSize: 12, color: '#9ca3af' },
  uploadBadges: { flexDirection: 'row', gap: 8, marginTop: 6 },
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
  fieldSub: { fontSize: 12, color: '#6b7280', marginBottom: 14, marginTop: -2 },
  input: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 11, paddingHorizontal: 13, fontSize: 13, color: '#111', backgroundColor: '#fff', marginBottom: 14 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  chip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb' },
  chipOn: { backgroundColor: '#111', borderColor: '#111' },
  chipTxt: { fontSize: 12, fontWeight: '600', color: '#555' },
  twoCol: { flexDirection: 'row' },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: '#111', borderColor: '#111' },
  checkLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },

  vacancyNote: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 10, padding: 10, marginTop: 12 },
  vacancyNoteTxt: { fontSize: 12, color: '#15803d', fontWeight: '600', flex: 1 },

  planNote: { fontSize: 12, color: '#6b7280', lineHeight: 18, marginBottom: 14 },
  plansGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  planChosen: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 10, padding: 10 },
  planChosenTxt: { fontSize: 12, color: '#166534', flex: 1 },

  totalBox: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: '#e5e7eb' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  totalLabel: { fontSize: 13, color: '#6b7280' },
  totalVal: { fontSize: 13, color: '#111', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 10 },
  grandLabel: { fontSize: 15, fontWeight: '800', color: '#111' },
  grandVal: { fontSize: 20, fontWeight: '900', color: '#111' },
  sslNote: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginVertical: 10 },

  submitBtn: { backgroundColor: '#111', borderRadius: 14, paddingVertical: 16, alignItems: 'center', gap: 2 },
  submitTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  submitSub: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },
});

const sc = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: '#e5e7eb' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#fafafa' },
  emoji: { fontSize: 16 },
  title: { fontSize: 14, fontWeight: '800', color: '#111' },
  body: { padding: 16 },
});

const pc = StyleSheet.create({
  card: { borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, backgroundColor: '#fff', position: 'relative', flex: 1 },
  cardSelected: { borderColor: '#111', backgroundColor: '#111' },
  popularBadge: { position: 'absolute', top: -1, right: 8, backgroundColor: '#f97316', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 },
  popularTxt: { fontSize: 9, fontWeight: '800', color: '#fff' },
  planLabel: { fontSize: 12, fontWeight: '700', color: '#111', marginBottom: 2 },
  planPrice: { fontSize: 22, fontWeight: '900', color: '#111', marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  days: { fontSize: 11, color: '#999' },
  check: { position: 'absolute', top: 10, right: 10 },
});

const bs = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  btn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#fff', fontSize: 24, fontWeight: '700', lineHeight: 28 },
  mid: { paddingHorizontal: 28, alignItems: 'center' },
  num: { fontSize: 32, fontWeight: '900', color: '#111' },
  lbl: { fontSize: 11, color: '#9ca3af', fontWeight: '500', marginTop: 1 },
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
