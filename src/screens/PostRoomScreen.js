import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, KeyboardAvoidingView, Platform, Image,
  Modal, Pressable, Animated, Dimensions, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { C, ROOM_PLANS } from '../utils/constants';
import { useLang } from '../utils/i18n';
import { http } from '../utils/api';

const { width: SW } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────
const ROOM_TYPES     = ['Single Room', '1 BHK Flat', '2 BHK Flat', '3 BHK Flat', 'PG / Hostel', 'Studio', 'Shared Room'];
const FOR_OPTIONS    = ['Anyone', 'Male only', 'Female only', 'Family preferred'];
const FURNISH_OPTS   = ['Fully Furnished', 'Semi Furnished', 'Unfurnished'];
const FLOOR_OPTS     = ['Ground', '1st', '2nd', '3rd', '4th', '5th+'];
const AVAIL_OPTS     = ['Immediately', 'Within 7 Days', 'This Month', 'Next Month'];
const AMENITIES_LIST = ['WiFi / Broadband', 'AC', 'Meals Included', 'Parking', 'Power Backup', '24/7 Security', 'Lift', 'Water 24/7', 'CCTV', 'Geyser', 'Laundry', 'Cook Available'];
const AREAS          = ['Vazirabad', 'Cidco', 'Station Road', 'Shivaji Nagar', 'Naregaon', 'Vishnupuri', 'Milind Nagar', 'Other'];

const TEAL = '#00B09B';
const TEAL2 = '#007A6B';
const ORANGE = '#FF6B2B';

const STEPS = [
  { id: 1, icon: 'home-outline',      label: 'Room Details' },
  { id: 2, icon: 'location-outline',  label: 'Location & Rent' },
  { id: 3, icon: 'star-outline',      label: 'Amenities & Photos' },
  { id: 4, icon: 'card-outline',      label: 'Choose Plan' },
  { id: 5, icon: 'checkmark-circle-outline', label: 'Review & Post' },
];

// ─── Animated Step Header ─────────────────────────────────────────────────────
function StepHeader({ step, total }) {
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
    return () => { scaleAnim.setValue(0.92); fadeAnim.setValue(0); };
  }, [step]);

  const progress = (step - 1) / (total - 1);
  const progressAnim = useRef(new Animated.Value(progress)).current;
  useEffect(() => {
    Animated.spring(progressAnim, { toValue: progress, friction: 8, tension: 60, useNativeDriver: false }).start();
  }, [step]);

  const info = STEPS[step - 1];

  return (
    <LinearGradient colors={[TEAL, TEAL2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={sh.wrap}>
      <Animated.View style={[sh.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={sh.topRow}>
          <View style={sh.stepBadge}>
            <Text style={sh.stepBadgeTxt}>Step {step} of {total}</Text>
          </View>
          {/* Dot indicators */}
          <View style={sh.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[sh.dot, i < step && sh.dotActive, i === step - 1 && sh.dotCurrent]} />
            ))}
          </View>
        </View>
        <Text style={sh.title}>{info.label}</Text>
        <Text style={sh.subtitle}>
          {step === 1 ? 'Tell us about the room type' :
           step === 2 ? 'Set area, rent and availability' :
           step === 3 ? 'Add amenities, photos and contact' :
           step === 4 ? 'How long should your listing stay live?' :
           'Confirm your listing before going live'}
        </Text>
        {/* Progress bar */}
        <View style={sh.progressTrack}>
          <Animated.View style={[sh.progressFill, {
            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
          }]} />
        </View>
      </Animated.View>
      {/* Decorative circles */}
      <View style={sh.deco1} />
      <View style={sh.deco2} />
    </LinearGradient>
  );
}

// ─── Animated Radio / Chip Row ────────────────────────────────────────────────
function RadioList({ options, value, onSelect, descriptions }) {
  return (
    <View style={{ gap: 8, marginBottom: 16 }}>
      {options.map(opt => {
        const active = value === opt;
        const scale  = useRef(new Animated.Value(1)).current;
        const press  = () => {
          Animated.sequence([
            Animated.spring(scale, { toValue: 0.97, friction: 10, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1,    friction: 10, useNativeDriver: true }),
          ]).start();
          onSelect(opt);
        };
        return (
          <Animated.View key={opt} style={{ transform: [{ scale }] }}>
            <TouchableOpacity
              onPress={press}
              activeOpacity={0.9}
              style={[rl.row, active && rl.rowActive]}
            >
              <View style={[rl.radio, active && rl.radioActive]}>
                {active && <View style={rl.radioDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[rl.optTxt, active && rl.optTxtActive]}>{opt}</Text>
                {descriptions?.[opt] && (
                  <Text style={[rl.optDesc, active && { color: ORANGE + 'cc' }]}>{descriptions[opt]}</Text>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
}

function ChipRow({ options, value, onSelect, multi = false }) {
  return (
    <View style={s.pillRow}>
      {options.map(opt => {
        const active = multi ? value.includes(opt) : value === opt;
        const scale  = useRef(new Animated.Value(1)).current;
        const press  = () => {
          Animated.sequence([
            Animated.spring(scale, { toValue: 0.9, friction: 10, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1,   friction: 8,  useNativeDriver: true }),
          ]).start();
          onSelect(opt);
        };
        return (
          <Animated.View key={opt} style={{ transform: [{ scale }] }}>
            <TouchableOpacity onPress={press} style={[s.chip, active && s.chipOn]} activeOpacity={0.8}>
              {active && multi && <Ionicons name="checkmark" size={11} color="#fff" style={{ marginRight: 3 }} />}
              <Text style={[s.chipTxt, active && { color: '#fff' }]}>{opt}</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────
function Dropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const rotAnim = useRef(new Animated.Value(0)).current;
  const toggle = () => {
    setOpen(v => !v);
    Animated.spring(rotAnim, { toValue: open ? 0 : 1, friction: 8, useNativeDriver: true }).start();
  };
  return (
    <View style={dd.wrap}>
      <TouchableOpacity onPress={toggle} style={dd.btn} activeOpacity={0.85}>
        <Text style={dd.val}>{value || label}</Text>
        <Animated.View style={{ transform: [{ rotate: rotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
          <Ionicons name="chevron-down" size={16} color="#555" />
        </Animated.View>
      </TouchableOpacity>
      {open && (
        <View style={dd.list}>
          {options.map(o => (
            <TouchableOpacity key={o} style={[dd.option, value === o && dd.optionActive]} onPress={() => { onChange(o); setOpen(false); }}>
              <Text style={[dd.optTxt, value === o && { color: TEAL, fontWeight: '700' }]}>{o}</Text>
              {value === o && <Ionicons name="checkmark" size={14} color={TEAL} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({ plan, selected, onSelect }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.95, friction: 10, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1,    friction: 8,  useNativeDriver: true }),
    ]).start();
    onSelect(plan);
  };
  return (
    <Animated.View style={[{ width: '48%' }, { transform: [{ scale }] }]}>
      <TouchableOpacity onPress={press} activeOpacity={0.9} style={[pc.card, selected && pc.cardSel, plan.popular && pc.cardPop]}>
        {plan.popular && (
          <View style={pc.badge}><Text style={pc.badgeTxt}>★ POPULAR</Text></View>
        )}
        <View style={pc.calIcon}>
          <Ionicons name="calendar" size={22} color={selected ? '#fff' : (plan.popular ? TEAL : '#6b7280')} />
        </View>
        <Text style={[pc.duration, selected && { color: '#fff' }]}>{plan.label}</Text>
        <Text style={[pc.sub, selected && { color: 'rgba(255,255,255,0.7)' }]}>listing</Text>
        <Text style={[pc.price, selected && { color: '#fff' }]}>₹{plan.price}</Text>
        {selected && (
          <View style={pc.selCheck}>
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Photo Picker Modal ───────────────────────────────────────────────────────
function PhotoPickerModal({ visible, onClose, onCamera, onGallery }) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  useEffect(() => {
    if (visible) Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }).start();
    else slideAnim.setValue(300);
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={pm.overlay} onPress={onClose}>
        <Animated.View style={[pm.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={pm.handle} />
          <Text style={pm.title}>Add Room Photo</Text>
          {[
            { icon: 'camera', bg: '#eff6ff', color: '#2563eb', title: 'Take a Photo', sub: 'Open camera to capture', action: onCamera },
            { icon: 'images', bg: '#f0fdf4', color: '#16a34a', title: 'Choose from Gallery', sub: 'Select multiple photos at once', action: onGallery },
          ].map(item => (
            <TouchableOpacity key={item.title} style={pm.option} onPress={item.action} activeOpacity={0.8}>
              <View style={[pm.iconWrap, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={pm.optTitle}>{item.title}</Text>
                <Text style={pm.optSub}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={pm.cancelBtn} onPress={onClose}>
            <Text style={pm.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ─── Field Label ──────────────────────────────────────────────────────────────
function Label({ text, required }) {
  return (
    <Text style={s.label}>
      {text} {required && <Text style={{ color: ORANGE }}>*</Text>}
    </Text>
  );
}

// ─── Animated Input ───────────────────────────────────────────────────────────
function AnimInput({ prefix, ...props }) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const focus = () => { setFocused(true);  Animated.spring(borderAnim, { toValue: 1, friction: 6, useNativeDriver: false }).start(); };
  const blur  = () => { setFocused(false); Animated.spring(borderAnim, { toValue: 0, friction: 6, useNativeDriver: false }).start(); };
  const borderColor = borderAnim.interpolate({ inputRange: [0, 1], outputRange: ['#e5e7eb', TEAL] });
  return (
    <Animated.View style={[s.inputWrap, { borderColor }]}>
      {prefix && <Text style={s.inputPrefix}>{prefix}</Text>}
      <TextInput
        {...props}
        onFocus={focus}
        onBlur={blur}
        placeholderTextColor="#bbb"
        style={[s.input, props.style]}
      />
    </Animated.View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHead({ icon, title, sub }) {
  return (
    <View style={s.secHead}>
      <View style={s.secIconWrap}>
        <Ionicons name={icon} size={16} color={TEAL} />
      </View>
      <View>
        <Text style={s.secTitle}>{title}</Text>
        {sub && <Text style={s.secSub}>{sub}</Text>}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PostRoomScreen() {
  const nav = useNavigation();
  const { t } = useLang();
  const [step, setStep] = useState(1);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(1)).current;

  const [form, setForm] = useState({
    roomType: '1 BHK Flat', forGender: 'Anyone', furnished: 'Fully Furnished',
    floor: 'Ground', bathrooms: '1', rent: '', deposit: '', availableFrom: 'Immediately',
    area: 'Vazirabad', landmark: '', whatsapp: '', notes: '',
    amenities: [], photos: [],
  });
  const [photos, setPhotos]               = useState([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loading, setLoading]             = useState(false);
  const [selectedPlan, setSelectedPlan]   = useState(ROOM_PLANS.find(p => p.popular) || ROOM_PLANS[0]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleAmenity = a => setForm(f => ({
    ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a]
  }));

  // Step transition animation
  const animateStep = (nextStep) => {
    const dir = nextStep > step ? 1 : -1;
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: dir * -30, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(dir * 30);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
      ]).start();
    });
  };

  async function openCamera() {
    setPickerVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow camera access.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.82, allowsEditing: true, aspect: [4, 3] });
    if (!result.canceled && result.assets?.length) {
      if (photos.length >= 10) { Alert.alert('Limit', 'Max 10 photos.'); return; }
      setPhotos(p => [...p, result.assets[0].uri]);
    }
  }

  async function openGallery() {
    setPickerVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo library access.'); return; }
    const rem = 10 - photos.length;
    if (rem <= 0) { Alert.alert('Limit', 'Max 10 photos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, selectionLimit: rem, quality: 0.82 });
    if (!result.canceled && result.assets?.length) setPhotos(p => [...p, ...result.assets.map(a => a.uri)].slice(0, 10));
  }

  function removePhoto(i) {
    setPhotos(p => p.filter((_, idx) => idx !== i));
  }

  function validateStep() {
    if (step === 2 && !form.rent) { Alert.alert('Required', 'Please enter the monthly rent.'); return false; }
    if (step === 3 && !form.whatsapp) { Alert.alert('Required', 'Please enter your WhatsApp number.'); return false; }
    return true;
  }

  function goNext() { if (!validateStep()) return; animateStep(Math.min(step + 1, STEPS.length)); }
  function goBack() { animateStep(Math.max(step - 1, 1)); }

  async function handleSubmit() {
    Alert.alert('Confirm & Pay', `List your ${form.roomType} for ₹${selectedPlan.price}?\nPlan: ${selectedPlan.label}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: `Pay ₹${selectedPlan.price}`, onPress: async () => {
          setLoading(true);
          try {
            const res = await http('POST', '/api/rooms', {
              ...form, photos, amenities: form.amenities,
              planDays: selectedPlan.days, planLabel: selectedPlan.label, planPrice: selectedPlan.price,
            });
            if (res.ok) {
              Alert.alert('Listed! 🎉', `Your ${form.roomType} is live for ${selectedPlan.days} days.`, [
                { text: 'View Listings', onPress: () => nav.navigate('Rooms') },
              ]);
            } else Alert.alert('Error', res.error || 'Failed. Please try again.');
          } catch { Alert.alert('Error', 'Network error. Check your connection.'); }
          finally { setLoading(false); }
        },
      },
    ]);
  }

  // ── Review rows helper ─────────────────────────────────────────────────────
  function ReviewRow({ label, value }) {
    return (
      <View style={rv.row}>
        <Text style={rv.label}>{label}</Text>
        <Text style={rv.value}>{value || '—'}</Text>
      </View>
    );
  }

  function renderStep() {
    switch (step) {
      // ── Step 1: Room Details ─────────────────────────────────────────────
      case 1: return (
        <View>
          <Label text="ROOM / ACCOMMODATION TYPE" required />
          <RadioList
            options={ROOM_TYPES}
            value={form.roomType}
            onSelect={v => set('roomType', v)}
            descriptions={{
              'Single Room': '1 room, shared or private bathroom',
              '1 BHK Flat': '1 Bedroom + Hall + Kitchen',
              '2 BHK Flat': '2 Bedrooms + Hall + Kitchen',
              '3 BHK Flat': '3 Bedrooms + Hall + Kitchen',
              'PG / Hostel': 'Shared accommodation with meals',
            }}
          />
          <Label text="FURNISHING" />
          <RadioList
            options={FURNISH_OPTS}
            value={form.furnished}
            onSelect={v => set('furnished', v)}
            descriptions={{
              'Fully Furnished': 'Bed, wardrobe, fridge, TV included',
              'Semi Furnished': 'Basic furniture only',
              'Unfurnished': 'Empty flat, tenant furnishes',
            }}
          />
          <View style={s.twoCol}>
            <View style={{ flex: 1 }}>
              <Label text="FLOOR" />
              <Dropdown label="Select floor" value={form.floor} options={FLOOR_OPTS} onChange={v => set('floor', v)} />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Label text="BATHROOMS" />
              <Dropdown label="Count" value={form.bathrooms} options={['1', '2', '3', '4+']} onChange={v => set('bathrooms', v)} />
            </View>
          </View>
          <Label text="SUITABLE FOR" />
          <RadioList
            options={FOR_OPTIONS}
            value={form.forGender}
            onSelect={v => set('forGender', v)}
            descriptions={{
              'Anyone': 'Male or female tenants',
              'Male only': '',
              'Female only': '',
              'Family preferred': '',
            }}
          />
        </View>
      );

      // ── Step 2: Location & Rent ──────────────────────────────────────────
      case 2: return (
        <View>
          <Label text="AREA / LOCALITY" required />
          <Dropdown label="Select area" value={form.area} options={AREAS} onChange={v => set('area', v)} />

          <Label text="NEARBY LANDMARK" />
          <AnimInput
            placeholder="e.g. Near Bus Stand, Behind HDFC Bank"
            value={form.landmark}
            onChangeText={v => set('landmark', v)}
          />

          <Label text="MONTHLY RENT (₹)" required />
          <AnimInput
            prefix="₹"
            placeholder="e.g. 5500"
            value={form.rent}
            onChangeText={v => set('rent', v)}
            keyboardType="numeric"
          />

          <Label text="SECURITY DEPOSIT (₹)" />
          <AnimInput
            prefix="₹"
            placeholder="e.g. 11000 (2 months)"
            value={form.deposit}
            onChangeText={v => set('deposit', v)}
            keyboardType="numeric"
          />

          <Label text="AVAILABLE FROM" />
          <RadioList
            options={AVAIL_OPTS}
            value={form.availableFrom}
            onSelect={v => set('availableFrom', v)}
            descriptions={{
              'Immediately': 'Ready to move in right now',
              'Within 7 Days': '',
              'This Month': '',
              'Next Month': '',
            }}
          />
        </View>
      );

      // ── Step 3: Amenities & Photos ───────────────────────────────────────
      case 3: return (
        <View>
          <SectionHead icon="flash" title="AMENITIES AVAILABLE" />
          <ChipRow options={AMENITIES_LIST} value={form.amenities} onSelect={toggleAmenity} multi />

          <SectionHead icon="camera" title="ROOM PHOTOS" sub="Listings with photos rent 4× faster" />
          {/* Photo grid slots */}
          <View style={ph.grid}>
            {['Living Area', 'Bedroom', 'Kitchen', 'Bathroom'].map((slot, i) => {
              const uri = photos[i];
              return (
                <TouchableOpacity key={slot} onPress={() => setPickerVisible(true)} style={ph.slot} activeOpacity={0.8}>
                  {uri ? (
                    <>
                      <Image source={{ uri }} style={ph.img} />
                      <TouchableOpacity style={ph.remove} onPress={() => removePhoto(i)}>
                        <Ionicons name="close" size={10} color="#fff" />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={22} color={TEAL} />
                      <Text style={ph.slotTxt}>{slot}</Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Upload more */}
          <TouchableOpacity style={ph.uploadMore} onPress={() => setPickerVisible(true)} activeOpacity={0.85}>
            <Ionicons name="cloud-upload-outline" size={22} color={TEAL} />
            <Text style={ph.uploadTxt}>Upload room photos</Text>
            <Text style={ph.uploadSub}>Listings with photos rent 4× faster</Text>
          </TouchableOpacity>

          {photos.length > 4 && (
            <Text style={ph.count}>{photos.length} / 10 photos added</Text>
          )}

          <Label text="ADDITIONAL NOTES" />
          <AnimInput
            placeholder="Rules (no pets, no cooking), nearby facilities, transport access..."
            value={form.notes}
            onChangeText={v => set('notes', v)}
            multiline
            style={{ height: 80, textAlignVertical: 'top' }}
          />

          <Label text="WHATSAPP NUMBER" required />
          <AnimInput
            placeholder="+91 98765 43210"
            value={form.whatsapp}
            onChangeText={v => set('whatsapp', v)}
            keyboardType="phone-pad"
          />
        </View>
      );

      // ── Step 4: Choose Plan ──────────────────────────────────────────────
      case 4: return (
        <View>
          <Text style={s.planQ}>How long should your listing stay live?</Text>
          <Text style={s.planHint}>Your listing is automatically removed after the selected period.</Text>
          <View style={s.plansGrid}>
            {ROOM_PLANS.map(plan => (
              <PlanCard key={plan.days} plan={plan} selected={selectedPlan?.days === plan.days} onSelect={setSelectedPlan} />
            ))}
          </View>
          {/* Trust badges */}
          <View style={s.trustRow}>
            {[
              { icon: 'flash', label: 'INSTANT ACTIVATION' },
              { icon: 'shield-checkmark', label: 'SECURE UPI / CARD' },
              { icon: 'refresh', label: 'RENEWABLE ANYTIME' },
            ].map(b => (
              <View key={b.label} style={s.trustBadge}>
                <Ionicons name={b.icon} size={18} color={TEAL} />
                <Text style={s.trustTxt}>{b.label}</Text>
              </View>
            ))}
          </View>
        </View>
      );

      // ── Step 5: Review & Post ────────────────────────────────────────────
      case 5: return (
        <View>
          <Text style={rv.intro}>Review your room listing:</Text>
          <View style={rv.card}>
            <ReviewRow label="TYPE"       value={form.roomType} />
            <ReviewRow label="FURNISHING" value={form.furnished} />
            <ReviewRow label="FLOOR"      value={form.floor} />
            <ReviewRow label="BATHROOMS"  value={form.bathrooms} />
            <ReviewRow label="FOR"        value={form.forGender} />
          </View>
          <View style={rv.card}>
            <ReviewRow label="AREA"      value={form.area} />
            <ReviewRow label="LANDMARK"  value={form.landmark} />
            <ReviewRow label="RENT"      value={form.rent ? `₹${form.rent}/mo` : 'Not set'} />
            <ReviewRow label="DEPOSIT"   value={form.deposit ? `₹${form.deposit}` : undefined} />
            <ReviewRow label="AVAILABLE" value={form.availableFrom} />
          </View>
          <View style={rv.card}>
            <ReviewRow label="AMENITIES" value={form.amenities.length > 0 ? form.amenities.slice(0, 3).join(', ') + (form.amenities.length > 3 ? ` +${form.amenities.length - 3}` : '') : 'None'} />
            <ReviewRow label="PHOTOS"    value={`${photos.length} photo${photos.length !== 1 ? 's' : ''}`} />
            <ReviewRow label="WHATSAPP"  value={form.whatsapp || 'Not set'} />
          </View>
          <View style={rv.card}>
            <ReviewRow label="PLAN"      value={`${selectedPlan?.label} — ₹${selectedPlan?.price}`} />
            <ReviewRow label="DURATION"  value={`${selectedPlan?.days} days active`} />
          </View>
          <Text style={rv.ssl}>🔒 Secured by Razorpay · 256-bit SSL · PCI DSS</Text>
        </View>
      );

      default: return null;
    }
  }

  const isLast = step === STEPS.length;

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f8' }}>
      <StatusBar barStyle="light-content" />
      <PhotoPickerModal visible={pickerVisible} onClose={() => setPickerVisible(false)} onCamera={openCamera} onGallery={openGallery} />

      {/* Header with back */}
      <View style={{ position: 'relative' }}>
        <StepHeader step={step} total={STEPS.length} />
        <TouchableOpacity style={s.backBtn} onPress={() => step > 1 ? goBack() : nav.goBack()}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
            {renderStep()}
          </Animated.View>
        </ScrollView>

        {/* Bottom navigation bar */}
        <View style={s.bottomBar}>
          <View style={s.navRow}>
            {step > 1 && (
              <TouchableOpacity style={s.backNavBtn} onPress={goBack} activeOpacity={0.85}>
                <Text style={s.backNavTxt}>Back</Text>
              </TouchableOpacity>
            )}
            {isLast ? (
              <TouchableOpacity
                style={[s.continueBtn, { flex: 1 }, loading && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[TEAL, TEAL2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.continueBtnInner}>
                  <Text style={s.continueTxt}>{loading ? 'Processing…' : `Post Listing  ·  Pay ₹${selectedPlan?.price}`}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.continueBtn, step === 1 && { flex: 1 }]}
                onPress={goNext}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[TEAL, TEAL2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.continueBtnInner}>
                  <Text style={s.continueTxt}>Continue</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  backBtn: {
    position: 'absolute', top: 44, left: 16,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: 11, fontWeight: '700', color: '#888', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 },
  secIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: TEAL + '18', alignItems: 'center', justifyContent: 'center' },
  secTitle: { fontSize: 11, fontWeight: '700', color: '#555', letterSpacing: 0.5 },
  secSub: { fontSize: 11, color: '#aaa', marginTop: 1 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, backgroundColor: '#fff', marginBottom: 14, paddingHorizontal: 12, paddingVertical: 2 },
  inputPrefix: { fontSize: 15, color: '#555', marginRight: 6, fontWeight: '600' },
  input: { flex: 1, fontSize: 14, color: '#111', paddingVertical: 12 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb' },
  chipOn: { backgroundColor: TEAL, borderColor: TEAL },
  chipTxt: { fontSize: 12, fontWeight: '600', color: '#555' },
  twoCol: { flexDirection: 'row', marginBottom: 4 },
  plansGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  planQ: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 4 },
  planHint: { fontSize: 12, color: '#888', marginBottom: 16 },
  trustRow: { flexDirection: 'row', backgroundColor: '#f8fffe', borderRadius: 14, borderWidth: 1, borderColor: TEAL + '30', padding: 14, justifyContent: 'space-around', marginTop: 8 },
  trustBadge: { alignItems: 'center', gap: 6 },
  trustTxt: { fontSize: 9, fontWeight: '700', color: '#555', textAlign: 'center', letterSpacing: 0.3 },
  bottomBar: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', paddingHorizontal: 16, paddingVertical: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 12 },
  navRow: { flexDirection: 'row', gap: 10 },
  backNavBtn: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', justifyContent: 'center' },
  backNavTxt: { fontSize: 14, fontWeight: '700', color: '#555' },
  continueBtn: { borderRadius: 14, overflow: 'hidden' },
  continueBtnInner: { paddingVertical: 15, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  continueTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

const sh = StyleSheet.create({
  wrap: { paddingTop: 50, paddingBottom: 22, paddingHorizontal: 20, overflow: 'hidden' },
  content: { zIndex: 2 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  stepBadge: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12 },
  stepBadgeTxt: { fontSize: 11, color: '#fff', fontWeight: '700', letterSpacing: 0.3 },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { backgroundColor: 'rgba(255,255,255,0.65)' },
  dotCurrent: { width: 18, backgroundColor: '#fff' },
  title: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 18 },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: '#fff', borderRadius: 2 },
  deco1: { position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.08)' },
  deco2: { position: 'absolute', right: 50, bottom: -40, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.06)' },
});

const rl = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#eee', marginBottom: 8 },
  rowActive: { borderColor: ORANGE, backgroundColor: '#fff9f5' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: ORANGE },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: ORANGE },
  optTxt: { fontSize: 14, fontWeight: '600', color: '#374151' },
  optTxtActive: { color: '#111' },
  optDesc: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
});

const dd = StyleSheet.create({
  wrap: { marginBottom: 14 },
  btn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  val: { fontSize: 14, color: '#111', fontWeight: '500' },
  list: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, marginTop: 4, overflow: 'hidden' },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  optionActive: { backgroundColor: TEAL + '0d' },
  optTxt: { fontSize: 13, color: '#374151', fontWeight: '500' },
});

const pc = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, borderColor: '#e5e7eb', padding: 16, alignItems: 'center', gap: 4, position: 'relative' },
  cardSel: { borderColor: TEAL, backgroundColor: TEAL },
  cardPop: { borderColor: TEAL },
  badge: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: TEAL, borderTopLeftRadius: 14, borderTopRightRadius: 14, paddingVertical: 4, alignItems: 'center' },
  badgeTxt: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  calIcon: { marginTop: 8 },
  duration: { fontSize: 15, fontWeight: '800', color: '#111' },
  sub: { fontSize: 11, color: '#9ca3af' },
  price: { fontSize: 22, fontWeight: '900', color: '#111', marginTop: 2 },
  selCheck: { position: 'absolute', top: 10, right: 10 },
});

const ph = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  slot: { width: '47%', aspectRatio: 1.3, borderRadius: 12, borderWidth: 1.5, borderColor: TEAL + '55', borderStyle: 'dashed', backgroundColor: '#f8fffe', alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden' },
  slotTxt: { fontSize: 11, color: TEAL, fontWeight: '600' },
  img: { width: '100%', height: '100%', resizeMode: 'cover' },
  remove: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  uploadMore: { backgroundColor: '#f8fffe', borderRadius: 14, borderWidth: 1.5, borderColor: TEAL + '40', borderStyle: 'dashed', padding: 20, alignItems: 'center', gap: 6, marginBottom: 16 },
  uploadTxt: { fontSize: 14, fontWeight: '700', color: TEAL },
  uploadSub: { fontSize: 11, color: '#9ca3af' },
  count: { fontSize: 11, color: '#9ca3af', textAlign: 'right', marginBottom: 8 },
});

const rv = StyleSheet.create({
  intro: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, gap: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  label: { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 0.4 },
  value: { fontSize: 13, fontWeight: '600', color: '#111' },
  ssl: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 8 },
});

const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 38 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 20 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  iconWrap: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  optTitle: { fontSize: 14, fontWeight: '700', color: '#111' },
  optSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  cancelBtn: { marginTop: 18, backgroundColor: '#f3f4f6', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelTxt: { fontSize: 14, fontWeight: '700', color: '#374151' },
});
