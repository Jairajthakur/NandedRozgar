import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, StatusBar, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Switch, Modal, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { useDistrict } from '../context/DistrictContext';
import { http } from '../utils/api';
import { useRazorpayCheckout } from '../utils/cashfree';
import CouponInput from '../components/CouponInput';
import MonthlyPlanBanner, { useMonthlyPlan } from '../components/MonthlyPlanBanner';
import VoicePostAssistant from '../components/VoicePostAssistant';

const ORANGE = '#f97316';
const TOTAL_STEPS = 3;

// ── Static Data ───────────────────────────────────────────────────────────────

// ── Grouped job categories for Tier-2/3 cities ───────────────────────────────
// Each sector has an emoji icon + label + array of specific job roles.
// Users tap a role chip; the sector name is stored as the category.
const JOB_SECTORS = [
  {
    sector: 'Food & Hospitality',
    icon: '🍽️',
    roles: [
      'Cafe / Tea Stall Boy', 'Hotel Waiter', 'Cook / Chef', 'Kitchen Helper',
      'Dhaba Worker', 'Bakery Staff', 'Sweet Shop Worker', 'Tiffin Service',
      'Canteen Staff', 'Bar / Restaurant Staff',
    ],
  },
  {
    sector: 'Security & Facility',
    icon: '🛡️',
    roles: [
      'Security Guard', 'Night Watchman', 'Bouncer', 'Parking Attendant',
      'Housekeeping / Cleaner', 'Sweeper', 'Gardener / Mali', 'Pest Control',
    ],
  },
  {
    sector: 'Delivery & Logistics',
    icon: '🚚',
    roles: [
      'Delivery Boy (2-Wheeler)', 'Courier Executive', 'Loader / Unloader',
      'Warehouse Helper', 'Packing Staff', 'Godown Worker', 'Supply Boy',
    ],
  },
  {
    sector: 'Driver & Transport',
    icon: '🚗',
    roles: [
      'Auto Driver', 'Car Driver', 'Truck Driver', 'Bus / Tempo Driver',
      'Cab Driver (Ola/Uber)', 'School Van Driver', 'Tractor Operator',
    ],
  },
  {
    sector: 'Shop & Retail',
    icon: '🏪',
    roles: [
      'Shop Assistant / Helper', 'Salesman', 'Cashier', 'Billing Operator',
      'Showroom Staff', 'Medical Shop Assistant', 'Kiryana Store Helper',
      'Cloth / Garment Shop', 'Mobile Shop Assistant', 'Furniture Shop',
    ],
  },
  {
    sector: 'Construction & Labour',
    icon: '🏗️',
    roles: [
      'Mason / Contractor', 'Painter', 'Electrician', 'Plumber',
      'Carpenter', 'Welder / Fabricator', 'Helper / Mazdoor',
      'Tile Fitter', 'AC Technician', 'Civil Site Worker',
    ],
  },
  {
    sector: 'Beauty & Salon',
    icon: '💇',
    roles: [
      'Hair Stylist', 'Barber / Naai', 'Beautician', 'Mehendi Artist',
      'Nail Art Technician', 'Spa / Massage Therapist', 'Makeup Artist',
    ],
  },
  {
    sector: 'Healthcare & Pharma',
    icon: '🏥',
    roles: [
      'Hospital Ward Boy / Attender', 'Nursing Assistant', 'Compounder',
      'Medical Shop Staff', 'Lab Technician', 'Ambulance Driver',
      'Physiotherapy Assistant', 'Dental Assistant',
    ],
  },
  {
    sector: 'Office & Admin',
    icon: '💼',
    roles: [
      'Data Entry Operator', 'Office Boy / Peon', 'Receptionist',
      'Accountant', 'Computer Operator', 'Clerk', 'Tally Operator',
      'Office Helper', 'HR Assistant', 'Back Office Executive',
    ],
  },
  {
    sector: 'Sales & Marketing',
    icon: '📢',
    roles: [
      'Field Sales Executive', 'TeleCaller', 'Marketing Agent',
      'Insurance Agent', 'Loan Agent', 'Real Estate Agent',
      'MR / Medical Rep', 'Door-to-Door Sales',
    ],
  },
  {
    sector: 'Teaching & Coaching',
    icon: '📚',
    roles: [
      'School Teacher', 'Home Tutor', 'Coaching Class Faculty',
      'Anganwadi Worker', 'Computer Trainer', 'Spoken English Trainer',
    ],
  },
  {
    sector: 'Domestic & Household',
    icon: '🏠',
    roles: [
      'Maid / Househelp', 'Cook (Home)', 'Baby Sitter / Nanny',
      'Watchman (Residential)', 'Driver (Personal)', 'Elder Care / Patient Care',
    ],
  },
  {
    sector: 'Agriculture & Farming',
    icon: '🌾',
    roles: [
      'Farm Worker / Shetkari Kamgar', 'Tractor Driver', 'Irrigation Worker',
      'Nursery Worker', 'Pesticide Sprayer', 'Dairy / Milk Collection',
    ],
  },
  {
    sector: 'IT & Digital',
    icon: '💻',
    roles: [
      'Computer Repair Technician', 'Mobile Repair Technician',
      'Graphic Designer', 'Social Media Manager', 'Video Editor',
      'DTP Operator', 'Software Developer',
    ],
  },
  {
    sector: 'Other',
    icon: '🔧',
    roles: ['Other / Custom'],
  },
];

// Flat list of all roles for backward compat (used in dropdowns elsewhere)
const INDUSTRIES = JOB_SECTORS.flatMap(s => s.roles);
const INDUSTRY_TO_CAT = Object.fromEntries(
  JOB_SECTORS.flatMap(s => s.roles.map(r => [r, s.sector]))
);

const JOB_TYPES = [
  { id: 'Full-time',        label: 'Full-time',       sub: 'Regular fixed hours, 5–6 days/week' },
  { id: 'Part-time',        label: 'Part-time',        sub: 'Flexible hours, fewer days' },
  { id: 'Contract',         label: 'Contract / Temp',  sub: 'Short-term project work' },
  { id: 'Freshers Welcome', label: 'Freshers Welcome', sub: 'No prior experience required' },
];

const OPENINGS_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '10+'];

const LOCATIONS_BY_DISTRICT = {
  nanded: [
    // ── Nanded City localities ──
    'Nanded City', 'Vazirabad', 'Shivajinagar', 'Vishnupuri', 'Taroda Naka',
    'Cidco', 'Old Nanded', 'Naigaon', 'New Mondha', 'Novena Colony',
    'Kasturba Nagar', 'Santnagar', 'Padampur', 'Shantinagar',
    'Guru Nanak Colony', 'Aurangpura', 'Subhash Nagar',
    'SRTMU Area', 'Station Road',
    // ── Nanded District Talukas ──
    'Nanded (Taluka)', 'Ardhapur', 'Mukhed', 'Hadgaon', 'Bhokar',
    'Kinwat', 'Deglur', 'Biloli', 'Naigaon (Taluka)', 'Loha',
    'Kandhar', 'Umri', 'Dharmabad', 'Himayatnagar', 'Mahur',
    'Mudkhed', 'Other',
  ],
  latur: [
    // ── Latur City localities ──
    'Latur City', 'Ashok Chowk', 'Vikas Nagar', 'Shivaji Nagar', 'MIDC Area',
    'Sub Jail Road', 'Barshi Road', 'Station Road', 'Chandra Nagar',
    'Anand Nagar', 'Gandhi Chowk', 'Ganj Chauk', 'Nehru Road',
    'Ausa Road', 'Kalambeshwar', 'Ram Nagar',
    // ── Latur District Talukas ──
    'Latur (Taluka)', 'Ausa', 'Nilanga', 'Udgir', 'Ahmadpur',
    'Chakur', 'Renapur', 'Deoni', 'Shirur Anantpal', 'Jalkot',
    'Other',
  ],
};

const EDUCATION_OPTIONS = [
  { id: 'none',     label: 'No Minimum',       sub: 'Any educational background' },
  { id: '10th',     label: '10th Pass (SSC)',   sub: '' },
  { id: '12th',     label: '12th Pass (HSC)',   sub: '' },
  { id: 'graduate', label: 'Graduate / Degree', sub: '' },
  { id: 'diploma',  label: 'Diploma / ITI',     sub: '' },
];

const EXPERIENCE_OPTIONS = [
  'Fresher (0 yr)', '6 Months', '1 Year', '2 Years', '3 Years', '5+ Years',
];

const WORKING_HOURS_OPTIONS = [
  '9 AM – 6 PM', '10 AM – 7 PM', '8 AM – 5 PM', '6 AM – 2 PM',
  '2 PM – 10 PM', 'Night Shift', 'Flexible',
];

const SKILLS_LIST = [
  // Languages
  'Marathi', 'Hindi', 'English',
  // Tech / Computer
  'MS Excel', 'Tally', 'Typing', 'Computer Basics', 'DTP',
  // Driving
  'Driving Licence', '2-Wheeler', '4-Wheeler', 'Heavy Vehicle',
  // Work skills
  'Customer Service', 'Billing / POS', 'Cooking', 'First Aid',
  'Cash Handling', 'Unarmed Security', 'Stitching / Tailoring',
  'Welding', 'Electrical Work', 'Plumbing',
];

const PLANS = [
  { id: '7days',  days: '7 Days',  price: 49,  sub: 'featured listing – pay once' },
  { id: '15days', days: '15 Days', price: 79,  sub: 'featured listing – pay once' },
  { id: '30days', days: '30 Days', price: 119, sub: 'featured listing – pay once' },
];

// ── CategoryPicker: grouped sector → role chips ──────────────────────────────
function CategoryPicker({ selected, onSelect }) {
  const [expanded, setExpanded] = React.useState(
    selected
      ? (JOB_SECTORS.find(s => s.roles.includes(selected))?.sector || null)
      : null
  );

  return (
    <View style={{ gap: 6 }}>
      {JOB_SECTORS.map(({ sector, icon, roles }) => {
        const isOpen     = expanded === sector;
        const hasActive  = roles.includes(selected);
        return (
          <View key={sector}
            style={{
              borderWidth: 1.5,
              borderColor: hasActive ? ORANGE : '#e5e7eb',
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: hasActive ? '#fff7ed' : '#fff',
            }}
          >
            {/* Sector header row */}
            <TouchableOpacity
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                paddingHorizontal: 14, paddingVertical: 12,
              }}
              onPress={() => setExpanded(isOpen ? null : sector)}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 20 }}>{icon}</Text>
              <Text style={{
                flex: 1, fontSize: 14, fontWeight: '700',
                color: hasActive ? ORANGE : '#1f2937',
              }}>
                {sector}
              </Text>
              {hasActive && (
                <Text style={{ fontSize: 11, color: ORANGE, fontWeight: '600', marginRight: 4 }}>
                  {selected}
                </Text>
              )}
              <Ionicons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={hasActive ? ORANGE : '#9ca3af'}
              />
            </TouchableOpacity>

            {/* Role chips — shown when expanded */}
            {isOpen && (
              <View style={{
                flexDirection: 'row', flexWrap: 'wrap', gap: 8,
                paddingHorizontal: 12, paddingBottom: 14,
              }}>
                {roles.map(role => {
                  const active = selected === role;
                  return (
                    <TouchableOpacity
                      key={role}
                      style={{
                        paddingVertical: 7, paddingHorizontal: 13,
                        borderRadius: 20, borderWidth: 1.5,
                        borderColor: active ? ORANGE : '#d1d5db',
                        backgroundColor: active ? ORANGE + '15' : '#f9fafb',
                      }}
                      onPress={() => { onSelect(role); setExpanded(null); }}
                      activeOpacity={0.75}
                    >
                      <Text style={{
                        fontSize: 13, fontWeight: active ? '700' : '500',
                        color: active ? ORANGE : '#374151',
                      }}>
                        {role}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ── Reusable: Section Label ───────────────────────────────────────────────────

function SectionLabel({ text, required }) {
  return (
    <Text style={s.sectionLabel}>
      {text}
      {required ? <Text style={{ color: '#ef4444' }}> *</Text> : null}
    </Text>
  );
}

// ── Reusable: Text Input ──────────────────────────────────────────────────────

function StyledInput({ value, onChangeText, placeholder, keyboardType, multiline, numberOfLines, maxLength, prefix }) {
  const height = multiline ? (numberOfLines || 5) * 24 : 50;
  return (
    <View style={[s.inputWrap, multiline && { height, alignItems: 'flex-start' }]}>
      {prefix ? <Text style={s.inputPrefix}>{prefix}</Text> : null}
      <TextInput
        style={[s.inputText, multiline && { textAlignVertical: 'top', paddingTop: 10 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#ccc"
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        numberOfLines={numberOfLines}
        maxLength={maxLength}
      />
    </View>
  );
}

// ── Reusable: Dropdown ────────────────────────────────────────────────────────

function Dropdown({ value, options, placeholder, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={s.dropdown} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={[s.dropdownTxt, !value && { color: '#bbb' }]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#999" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setOpen(false)}>
          <Pressable style={s.modalBox} onPress={() => {}}>
            <Text style={s.modalTitle}>{placeholder}</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              {options.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[s.modalRow, value === opt && s.modalRowActive]}
                  onPress={() => { onSelect(opt); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.modalRowTxt, value === opt && { color: ORANGE, fontWeight: '700' }]}>
                    {opt}
                  </Text>
                  {value === opt && <Ionicons name="checkmark" size={16} color={ORANGE} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ── Reusable: Radio Row ───────────────────────────────────────────────────────

function RadioRow({ label, sub, active, onPress }) {
  return (
    <TouchableOpacity
      style={[s.radioRow, active && s.radioRowActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[s.radioOuter, active && s.radioOuterActive]}>
        {active && <View style={s.radioInner} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.radioLabel, active && { color: ORANGE }]}>{label}</Text>
        {!!sub && <Text style={s.radioSub}>{sub}</Text>}
      </View>
    </TouchableOpacity>
  );
}

// ── Step Header Banner ────────────────────────────────────────────────────────

function StepBanner({ step, title, subtitle, onBack }) {
  return (
    <View style={s.banner}>
      <View style={s.dotsRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View key={i} style={[s.dot, i < step && s.dotFilled]} />
        ))}
        <Text style={s.stepBadge}>Step {step} of {TOTAL_STEPS}</Text>
      </View>
      <TouchableOpacity style={s.bannerBack} onPress={onBack} activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={18} color="#fff" />
      </TouchableOpacity>
      <Text style={s.bannerTitle}>{title}</Text>
      <Text style={s.bannerSub}>{subtitle}</Text>
      <View style={s.deco1} pointerEvents="none" />
      <View style={s.deco2} pointerEvents="none" />
    </View>
  );
}

// ── Review Row ────────────────────────────────────────────────────────────────

function ReviewRow({ label, value }) {
  return (
    <View style={s.revRow}>
      <Text style={s.revLabel}>{label}</Text>
      <Text style={s.revValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Screen
// ══════════════════════════════════════════════════════════════════════════════

export default function PostJobScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, loadJobs } = useAuth();
  const { district, currentDistrict } = useDistrict();
  const LOCATIONS = LOCATIONS_BY_DISTRICT[currentDistrict?.id] || LOCATIONS_BY_DISTRICT.nanded;
  const scrollRef = useRef(null);
  const { RazorpayCheckout, initiatePayment } = useRazorpayCheckout({ http, user });
  const { active: hasMonthlyPlan } = useMonthlyPlan();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [multiplePos, setMultiplePos] = useState(false);
  const [company,     setCompany]     = useState(user?.company || '');
  const [industry,    setIndustry]    = useState('');
  const [customIndustry, setCustomIndustry] = useState('');
  const [title,       setTitle]       = useState('');
  const [jobType,     setJobType]     = useState('Full-time');
  const [openings,    setOpenings]    = useState('1');

  // Multiple positions list (used when multiplePos === true)
  const [positions, setPositions] = useState([
    { id: 1, title: '', vacancies: '1', salaryMin: '', salaryMax: '' },
  ]);
  const addPosition = () =>
    setPositions(p => [...p, { id: Date.now(), title: '', vacancies: '1', salaryMin: '', salaryMax: '' }]);
  const removePosition = id =>
    setPositions(p => p.filter(x => x.id !== id));
  const updatePosition = (id, key, val) =>
    setPositions(p => p.map(x => x.id === id ? { ...x, [key]: val } : x));

  const handleMultiToggle = val => {
    setMultiplePos(val);
    // seed with current single title if switching on
    if (val && title.trim()) {
      setPositions([{ id: Date.now(), title: title.trim(), vacancies: openings, salaryMin: salaryMin, salaryMax: salaryMax }]);
    } else if (!val) {
      // restore first position back to single fields
      if (positions[0]) { setTitle(positions[0].title); setOpenings(positions[0].vacancies); }
    }
  };

  // Step 1 – address
  const [address, setAddress] = useState('');

  // Step 2
  const [location,   setLocation]   = useState(() => (LOCATIONS_BY_DISTRICT[currentDistrict?.id] || LOCATIONS_BY_DISTRICT.nanded)[0]);
  const [salaryMin,  setSalaryMin]  = useState('');
  const [salaryMax,  setSalaryMax]  = useState('');
  const [education,  setEducation]  = useState('10th');
  const [experience, setExperience] = useState('Fresher (0 yr)');
  const [workHours,  setWorkHours]  = useState('9 AM – 6 PM');

  // Step 3
  const [skills,        setSkills]        = useState([]);
  const [description,   setDescription]   = useState('');
  const [requirements,  setRequirements]  = useState('');
  const [whatsapp,      setWhatsapp]      = useState(user?.phone || '');
  const [email,         setEmail]         = useState('');

  // Step 4
  const [plan, setPlan] = useState('7days');
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  function toggleSkill(skill) {
    setSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  }

  function scrollTop() {
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 50);
  }

  function goNext() {
    if (step === 1) {
      if (multiplePos) {
        const empty = positions.find(p => !p.title.trim());
        if (empty) return Alert.alert('Required', 'Please enter a job title for every position.');
      } else {
        if (!title.trim()) return Alert.alert('Required', 'Please enter a job title.');
      }
      if (!whatsapp.trim()) return Alert.alert('Required', 'Please enter your WhatsApp number.');
    }
    setStep(s => s + 1);
    scrollTop();
  }

  function goBack() {
    if (step > 1) { setStep(s => s - 1); scrollTop(); }
    else nav.goBack();
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const selectedPlan = PLANS.find(p => p.id === plan);
      const planPrice    = selectedPlan?.price ?? 79;
      const planDays     = selectedPlan ? parseInt(selectedPlan.days) : 15;
      const planLabel    = selectedPlan?.days || '15 Days';

      // Apply coupon discount if present
      const discountedPrice = appliedCoupon ? appliedCoupon.finalAmount : planPrice;
      const amountPaise     = discountedPrice * 100; // convert ₹ → paise

      const salaryStr = salaryMin
        ? salaryMax ? `₹${salaryMin}–₹${salaryMax}/mo` : `₹${salaryMin}/mo`
        : '';

      const basePayload = {
        company:     company.trim(),
        address:     address.trim(),
        category:    industry === 'Other' ? customIndustry.trim() : (INDUSTRY_TO_CAT[industry] || industry),
        type:        jobType,
        location,
        salary:      salaryStr,
        phone:       whatsapp.trim(),
        whatsapp:    whatsapp.trim(),
        email:       email.trim(),
        description: description.trim(),
        skills:      skills.join(', '),
        requirements: requirements.trim(),
        experience,
        education:   EDUCATION_OPTIONS.find(e => e.id === education)?.label || '',
        workHours,
        featured:    false,
        urgent:      false,
        planDays,
        planLabel,
        planPrice,
        district:    district || 'nanded',
      };

      // ── Step 1: Razorpay payment (skipped if user has active Monthly Plan) ──
      let payResult;
      if (hasMonthlyPlan) {
        payResult = { success: true, free: true };
      } else {
        payResult = await initiatePayment({
          amount:      amountPaise,
          description: `Job Listing – ${planLabel}`,
          listingType: 'job',
          plan:        planLabel,
          couponId:    appliedCoupon?.id || null,
        });
      }

      if (!payResult.success) {
        if (!payResult.cancelled) {
          Alert.alert('Payment Failed', payResult.error || 'Payment was not completed. Please try again.');
        }
        return; // user cancelled or payment failed — don't post
      }

      // ── Step 2: Verify payment & create job on backend ────────────────────
      const jobs = multiplePos
        ? positions.map(p => {
            const posMin = p.salaryMin;
            const posMax = p.salaryMax;
            const posSalaryStr = posMin
              ? posMax ? `₹${posMin}–₹${posMax}/mo` : `₹${posMin}/mo`
              : '';
            return { title: p.title.trim(), openings: p.vacancies, salary: posSalaryStr };
          })
        : [{ title: title.trim(), openings, salary: salaryStr }];

      let allOk = true;
      for (const job of jobs) {
        const res = await http('POST', '/api/payments/verify', {
          // Razorpay verification fields (null for free plan)
          cashfree_order_id: payResult.free ? undefined : payResult.cashfree_order_id,
          // Job data
          job:    { ...basePayload, title: job.title, openings: job.openings, salary: job.salary ?? basePayload.salary },
          plan:   planLabel,
          amount: amountPaise,
          days:   planDays,
          couponId: appliedCoupon?.id || null,
        });
        if (!res?.ok) { allOk = false; Alert.alert('Error', res?.error || 'Failed to post job.'); break; }
      }

      if (allOk) {
        await loadJobs?.();
        const count = jobs.length;
        Toast.show({ type: 'success', text1: count > 1 ? `✅ ${count} jobs posted!` : '✅ Job posted!', text2: 'Your listing is now live.' });
        nav.navigate('Main', { screen: 'Board' });
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const eduLabel = EDUCATION_OPTIONS.find(e => e.id === education)?.label || '';
  const selPlan  = PLANS.find(p => p.id === plan);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f2f2f2' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {RazorpayCheckout}
      <StatusBar barStyle="light-content" backgroundColor={ORANGE} />
      <View style={{ height: insets.top, backgroundColor: ORANGE }} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 50 }}
      >

        {/* ══════════ STEP 1 – ESSENTIALS ══════════ */}
        {step === 1 && <>
          <StepBanner step={1} title="Job Basics" subtitle="Title, salary & contact — that's it!" onBack={goBack} />
          <View style={s.card}>

            {/* ── Voice Post Assistant ── */}
            <VoicePostAssistant
              screenType="job"
              onFill={(fields) => {
                const {
                  positions: voicePositions, title: t, company: co,
                  salaryMin: smin, salaryMax: smax,
                  industry: ind, jobType: jt, experience: exp,
                  workHours: wh, education: edu, skills: sk,
                  description: desc, requirements: req, address: addr,
                } = fields;

                // ── Multi-position handling ─────────────────────────────────
                if (Array.isArray(voicePositions) && voicePositions.length > 0) {
                  if (voicePositions.length === 1) {
                    // Single position — fill the normal single-job fields
                    const p = voicePositions[0];
                    if (p.title)     setTitle(p.title);
                    if (p.vacancies) setOpenings(p.vacancies);
                    if (p.salaryMin) setSalaryMin(p.salaryMin);
                    if (p.salaryMax) setSalaryMax(p.salaryMax);
                  } else {
                    // Multiple positions — switch to multi-pos mode and populate array
                    setMultiplePos(true);
                    setPositions(voicePositions.map((p, i) => ({
                      id: Date.now() + i,
                      title:     p.title     || '',
                      vacancies: p.vacancies || '1',
                      salaryMin: p.salaryMin || smin || '',
                      salaryMax: p.salaryMax || smax || '',
                    })));
                  }
                } else {
                  // Fallback: no positions array — fill legacy single fields
                  if (t)    setTitle(t);
                  if (smin) setSalaryMin(smin);
                  if (smax) setSalaryMax(smax);
                }

                // ── Shared fields (same for all positions) ──────────────────
                if (co)   setCompany(co);
                if (ind)  setIndustry(ind);
                if (jt)   setJobType(jt);
                if (exp)  setExperience(exp);
                if (wh)   setWorkHours(wh);
                if (edu)  setEducation(edu);
                if (sk?.length) setSkills(sk);
                if (desc) setDescription(desc);
                if (req)  setRequirements(req);
                if (addr) setAddress(addr);

                const posCount = voicePositions?.length || 0;
                Toast.show({
                  type: 'success',
                  text1: posCount > 1 ? `✅ ${posCount} positions filled by voice!` : '✅ Form filled by voice!',
                  text2: 'Check karo aur edit kar sakte ho',
                });
              }}
            />

            {/* Multiple positions toggle */}
            <View style={s.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.toggleLabel}>Post Multiple Positions?</Text>
                <Text style={s.toggleHint}>Hire for different roles in one go</Text>
              </View>
              <Switch
                value={multiplePos}
                onValueChange={handleMultiToggle}
                trackColor={{ false: '#e0e0e0', true: '#fed7aa' }}
                thumbColor={multiplePos ? ORANGE : '#ddd'}
              />
            </View>
            <View style={s.divider} />

            {/* Single position */}
            {!multiplePos && <>
              <SectionLabel text="JOB TITLE" required />
              <StyledInput value={title} onChangeText={setTitle} placeholder="e.g. Delivery Executive, Telecaller" maxLength={100} />
            </>}

            {/* Multiple positions */}
            {multiplePos && <>
              <SectionLabel text="POSITIONS (JOB TITLE + VACANCIES)" required />
              {positions.map((pos, idx) => (
                <View key={pos.id} style={s.posCard}>
                  <View style={s.posHeader}>
                    <Text style={s.posIndex}>Position {idx + 1}</Text>
                    {positions.length > 1 && (
                      <TouchableOpacity onPress={() => removePosition(pos.id)} style={s.posRemove}>
                        <Ionicons name="close-circle" size={20} color="#f87171" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <StyledInput
                    value={pos.title}
                    onChangeText={v => updatePosition(pos.id, 'title', v)}
                    placeholder="e.g. Delivery Executive, Telecaller"
                    maxLength={100}
                  />
                  <View style={{ height: 10 }} />
                  <Text style={s.posVacLbl}>VACANCIES</Text>
                  <View style={s.posVacRow}>
                    {OPENINGS_OPTIONS.map(n => (
                      <TouchableOpacity
                        key={n}
                        style={[s.posVacBtn, pos.vacancies === n && s.posVacBtnOn]}
                        onPress={() => updatePosition(pos.id, 'vacancies', n)}>
                        <Text style={[s.posVacTxt, pos.vacancies === n && s.posVacTxtOn]}>{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={{ height: 12 }} />
                  <Text style={s.posVacLbl}>SALARY (₹ / month, optional)</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <StyledInput
                        value={pos.salaryMin}
                        onChangeText={v => updatePosition(pos.id, 'salaryMin', v)}
                        placeholder="Min e.g. 10000"
                        keyboardType="number-pad"
                        prefix="₹"
                        maxLength={8}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <StyledInput
                        value={pos.salaryMax}
                        onChangeText={v => updatePosition(pos.id, 'salaryMax', v)}
                        placeholder="Max e.g. 15000"
                        keyboardType="number-pad"
                        prefix="₹"
                        maxLength={8}
                      />
                    </View>
                  </View>
                </View>
              ))}
              <TouchableOpacity style={s.addPosBtn} onPress={addPosition}>
                <Ionicons name="add-circle-outline" size={20} color={ORANGE} />
                <Text style={s.addPosTxt}>Add Another Position</Text>
              </TouchableOpacity>
            </>}

            <View style={{ height: 18 }} />
            {!multiplePos && <>
              <SectionLabel text="SALARY (₹ / month, optional)" />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <StyledInput value={salaryMin} onChangeText={setSalaryMin} placeholder="Min e.g. 10000" keyboardType="number-pad" prefix="₹" maxLength={8} />
                </View>
                <View style={{ flex: 1 }}>
                  <StyledInput value={salaryMax} onChangeText={setSalaryMax} placeholder="Max e.g. 15000" keyboardType="number-pad" prefix="₹" maxLength={8} />
                </View>
              </View>
              <View style={{ height: 18 }} />
            </>}
            <SectionLabel text="WHATSAPP NUMBER" required />
            <StyledInput value={whatsapp} onChangeText={setWhatsapp} placeholder="+91 98765 43210" keyboardType="phone-pad" maxLength={15} />

            {/* Hint to next step */}
            <View style={{ marginTop: 16, padding: 12, backgroundColor: '#fff7ed', borderRadius: 10, borderWidth: 1, borderColor: '#fed7aa', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="information-circle-outline" size={18} color={ORANGE} />
              <Text style={{ fontSize: 12, color: '#92400e', flex: 1, lineHeight: 18 }}>
                Next: add more details like location, company & skills (optional but recommended).
              </Text>
            </View>
          </View>
        </>}

        {/* ══════════ STEP 2 – OPTIONAL DETAILS ══════════ */}
        {step === 2 && <>
          <StepBanner step={2} title="More Details" subtitle="Optional — improves your listing quality" onBack={goBack} />
          <View style={s.card}>

            <SectionLabel text="COMPANY / EMPLOYER NAME" />
            <StyledInput value={company} onChangeText={setCompany} placeholder="e.g. Sharma & Sons Pvt. Ltd." maxLength={100} />

            <View style={{ height: 18 }} />
            <SectionLabel text="JOB CATEGORY" />
            <CategoryPicker
              selected={industry}
              onSelect={v => { setIndustry(v); if (v !== 'Other / Custom') setCustomIndustry(''); }}
            />
            {(industry === 'Other / Custom' || industry === 'Other') && (
              <StyledInput
                value={customIndustry}
                onChangeText={setCustomIndustry}
                placeholder="Type your category (e.g. Photography, Farming…)"
                maxLength={60}
                style={{ marginTop: 10 }}
              />
            )}

            <View style={{ height: 18 }} />
            <SectionLabel text="WORK LOCATION" />
            {currentDistrict && (
              <TouchableOpacity
                onPress={() => nav.navigate('Home')}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: '#fff7ed', borderRadius: 10,
                  paddingHorizontal: 12, paddingVertical: 8,
                  borderWidth: 1, borderColor: '#fed7aa', marginBottom: 10,
                }}
              >
                <Ionicons name="location" size={14} color={ORANGE} />
                <Text style={{ fontSize: 13, color: '#92400e', fontWeight: '600', flex: 1 }}>
                  Posting in <Text style={{ color: ORANGE }}>{currentDistrict.name}</Text> district
                </Text>
                <Text style={{ fontSize: 11, color: ORANGE }}>Change ›</Text>
              </TouchableOpacity>
            )}
            <Dropdown value={location} options={LOCATIONS} placeholder="Select location" onSelect={setLocation} />

            <View style={{ height: 18 }} />
            <SectionLabel text="JOB TYPE" />
            {JOB_TYPES.map(jt => (
              <RadioRow key={jt.id} label={jt.label} sub={jt.sub} active={jobType === jt.id} onPress={() => setJobType(jt.id)} />
            ))}

            <View style={{ height: 18 }} />
            <SectionLabel text="EXPERIENCE REQUIRED" />
            <Dropdown value={experience} options={EXPERIENCE_OPTIONS} placeholder="Select experience" onSelect={setExperience} />

            <View style={{ height: 18 }} />
            <SectionLabel text="EDUCATION REQUIRED" />
            {EDUCATION_OPTIONS.map(opt => (
              <RadioRow
                key={opt.id}
                label={opt.label}
                sub={opt.sub || null}
                active={education === opt.id}
                onPress={() => setEducation(opt.id)}
              />
            ))}

            <View style={{ height: 18 }} />
            <SectionLabel text="WORKING HOURS" />
            <View style={s.chipsWrap}>
              {WORKING_HOURS_OPTIONS.map(wh => {
                const on = workHours === wh;
                return (
                  <TouchableOpacity key={wh} style={[s.chip, on && s.chipOn]} onPress={() => setWorkHours(wh)} activeOpacity={0.8}>
                    <Text style={[s.chipTxt, on && s.chipTxtOn]}>{wh}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ height: 18 }} />
            <SectionLabel text="SKILLS REQUIRED" />
            <View style={s.chipsWrap}>
              {SKILLS_LIST.map(skill => {
                const on = skills.includes(skill);
                return (
                  <TouchableOpacity key={skill} style={[s.chip, on && s.chipOn]} onPress={() => toggleSkill(skill)} activeOpacity={0.8}>
                    <Text style={[s.chipTxt, on && s.chipTxtOn]}>{skill}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ height: 18 }} />
            <SectionLabel text="REQUIREMENTS / ELIGIBILITY" />
            <StyledInput
              value={requirements}
              onChangeText={setRequirements}
              placeholder="e.g. Must have own bike, Age 18–35, Local candidate preferred…"
              multiline
              numberOfLines={3}
              maxLength={500}
            />

            <View style={{ height: 18 }} />
            <SectionLabel text="JOB DESCRIPTION" />
            <StyledInput value={description} onChangeText={setDescription} placeholder="Describe responsibilities, daily tasks, shift timings, perks…" multiline numberOfLines={4} maxLength={1000} />

            <View style={{ height: 18 }} />
            <SectionLabel text="EMAIL ADDRESS (OPTIONAL)" />
            <StyledInput value={email} onChangeText={setEmail} placeholder="yourname@email.com" keyboardType="email-address" maxLength={100} />
          </View>
        </>}

        {/* ══════════ STEP 3 – PLAN + REVIEW ══════════ */}
        {step === 3 && <>
          <StepBanner step={3} title="Choose Plan & Post" subtitle="Pick a plan, review & go live" onBack={goBack} />
          <MonthlyPlanBanner navigation={nav} compact />
          <View style={s.card}>
            <Text style={s.planQ}>How long should your listing stay live?</Text>
            <Text style={s.planHint}>Your listing is automatically removed after the selected period.</Text>

            {PLANS.map(p => (
              <TouchableOpacity key={p.id} style={[s.planCard, plan === p.id && s.planCardOn]} onPress={() => { setPlan(p.id); setAppliedCoupon(null); }} activeOpacity={0.85}>
                <View style={s.planLeft}>
                  <Ionicons name="calendar-outline" size={22} color={plan === p.id ? ORANGE : '#aaa'} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[s.planDays, plan === p.id && { color: ORANGE }]}>{p.days}</Text>
                    <Text style={s.planSub}>{p.sub}</Text>
                  </View>
                </View>
                <View style={s.planRight}>
                  <Text style={[s.planPrice, plan === p.id && { color: ORANGE }]}>{p.price === 0 ? 'Free' : `₹${p.price}`}</Text>
                  <View style={[s.planRadio, plan === p.id && s.planRadioOn]}>
                    {plan === p.id && <View style={s.planDot} />}
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {/* Feature strip */}
            <View style={s.featureStrip}>
              {[
                { icon: 'flash-outline',            label: 'INSTANT\nACTIVATION' },
                { icon: 'shield-checkmark-outline',  label: 'SECURE UPI\n/ CARD' },
                { icon: 'refresh-outline',           label: 'RENEWABLE\nANYTIME' },
              ].map((f, i) => (
                <React.Fragment key={f.label}>
                  {i > 0 && <View style={s.featureSep} />}
                  <View style={s.featureItem}>
                    <Ionicons name={f.icon} size={20} color={ORANGE} />
                    <Text style={s.featureTxt}>{f.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>

            {/* Coupon */}
            <View style={{ marginTop: 16 }}>
              <Text style={[s.planSub, { fontWeight: '700', color: '#333', marginBottom: 8, fontSize: 13 }]}>
                Have a coupon code?
              </Text>
              <CouponInput
                listingType="job"
                originalAmount={PLANS.find(p => p.id === plan)?.price ?? 79}
                onApplied={c => setAppliedCoupon(c)}
              />
              {appliedCoupon && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, padding: 10, backgroundColor: '#f0fdf4', borderRadius: 8 }}>
                  <Text style={{ color: '#374151', fontSize: 13 }}>Original: <Text style={{ textDecorationLine: 'line-through' }}>₹{PLANS.find(p => p.id === plan)?.price}</Text></Text>
                  <Text style={{ color: '#16a34a', fontWeight: '700', fontSize: 13 }}>You pay: ₹{appliedCoupon.finalAmount}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Quick review summary */}
          <View style={[s.card, { marginTop: 12 }]}>
            <Text style={s.revHead}>Quick Review</Text>
            <View style={s.revGroup}>
              {multiplePos
                ? positions.map((p, i) => (
                    <ReviewRow key={p.id} label={`POSITION ${i+1}`} value={`${p.title || 'Untitled'} — ${p.vacancies} opening${p.vacancies === '1' ? '' : 's'}${p.salaryMin ? ` | ₹${p.salaryMin}${p.salaryMax ? `–₹${p.salaryMax}` : ''}/mo` : ''}`} />
                  ))
                : <>
                    <ReviewRow label="TITLE" value={title || 'Not set'} />
                    <ReviewRow label="SALARY" value={salaryMin ? `₹${salaryMin}${salaryMax ? `–₹${salaryMax}` : ''}/mo` : 'Not specified'} />
                  </>
              }
              <ReviewRow label="WHATSAPP"  value={whatsapp || 'Not set'} />
              {!!company    && <ReviewRow label="COMPANY"  value={company} />}
              {!!location   && <ReviewRow label="LOCATION" value={location} />}
              {skills.length > 0      && <ReviewRow label="SKILLS"       value={skills.join(', ')} />}
              {!!education && education !== 'none' && <ReviewRow label="EDUCATION"    value={eduLabel} />}
              {!!workHours               && <ReviewRow label="WORK HOURS"   value={workHours} />}
              {!!requirements            && <ReviewRow label="REQUIREMENTS" value={requirements} />}
            </View>
            <View style={s.planSummaryBox}>
              <Ionicons name="calendar-outline" size={18} color={ORANGE} />
              <Text style={s.planSummaryTxt}>
                {selPlan?.days} plan — ₹{selPlan?.price}
              </Text>
            </View>
          </View>
        </>}

        {/* ══════════ BOTTOM BUTTONS ══════════ */}
        <View style={s.btnRow}>
          {step > 1 && (
            <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.8}>
              <Text style={s.backBtnTxt}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.continueBtn, step === 1 && { flex: 1 }, submitting && { opacity: 0.7 }]}
            onPress={step === TOTAL_STEPS ? handleSubmit : goNext}
            activeOpacity={0.85}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.continueTxt}>{step === TOTAL_STEPS ? 'Post Job' : 'Continue'}</Text>
            }
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Banner
  banner: {
    backgroundColor: ORANGE,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
    overflow: 'hidden',
  },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  dot:      { flex: 1, height: 3, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotFilled:{ backgroundColor: '#fff' },
  stepBadge:{
    fontSize: 11, fontWeight: '700', color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.18)', paddingHorizontal: 10,
    paddingVertical: 3, borderRadius: 20, overflow: 'hidden',
  },
  bannerBack:{
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  bannerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  bannerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  deco1: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.08)', right: -20, top: -20,
  },
  deco2: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)', right: 55, bottom: -30,
  },

  // Card
  card: {
    backgroundColor: '#fff', marginHorizontal: 14, marginTop: -16,
    borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },

  // Section label
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#aaa',
    letterSpacing: 0.8, marginBottom: 8,
  },

  // Input
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8f8f8', borderRadius: 10,
    borderWidth: 1, borderColor: '#ececec',
    paddingHorizontal: 14, minHeight: 50,
  },
  inputPrefix: { fontSize: 16, color: '#888', marginRight: 6 },
  inputText:   { flex: 1, fontSize: 14, color: '#111', paddingVertical: 0 },

  // Dropdown
  dropdown: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8f8f8', borderRadius: 10,
    borderWidth: 1, borderColor: '#ececec',
    paddingHorizontal: 14, height: 50, justifyContent: 'space-between',
  },
  dropdownTxt: { fontSize: 14, color: '#111', flex: 1 },

  // Modal
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-end' },
  modalBox:  { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingBottom: 34 },
  modalTitle:{ fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 0.8, paddingHorizontal: 20, marginBottom: 8 },
  modalRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  modalRowActive: { backgroundColor: '#fff7ed' },
  modalRowTxt: { fontSize: 15, color: '#333' },

  // Toggle
  toggleRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  toggleLabel: { fontSize: 15, fontWeight: '700', color: '#111' },
  toggleHint:  { fontSize: 12, color: '#aaa', marginTop: 2 },
  divider:     { height: 1, backgroundColor: '#f2f2f2', marginBottom: 16 },

  // Radio
  radioRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#ececec', borderRadius: 12,
    padding: 14, marginBottom: 10, backgroundColor: '#fafafa', gap: 12,
  },
  radioRowActive: { borderColor: ORANGE, backgroundColor: '#fff7ed' },
  radioOuter:     { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
  radioOuterActive:{ borderColor: ORANGE },
  radioInner:     { width: 10, height: 10, borderRadius: 5, backgroundColor: ORANGE },
  radioLabel:     { fontSize: 14, fontWeight: '700', color: '#333' },
  radioSub:       { fontSize: 12, color: '#aaa', marginTop: 2 },

  // Skill chips
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:    { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e5e5e5' },
  chipOn:  { backgroundColor: '#fff7ed', borderColor: ORANGE },
  chipTxt: { fontSize: 13, fontWeight: '600', color: '#666' },
  chipTxtOn:{ color: ORANGE },

  // Plan cards
  planQ:    { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 4 },
  planHint: { fontSize: 12, color: '#aaa', marginBottom: 16 },
  planCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: '#ececec', borderRadius: 14,
    padding: 16, marginBottom: 10, backgroundColor: '#fafafa',
  },
  planCardOn: { borderColor: ORANGE, backgroundColor: '#fff7ed' },
  planLeft:   { flexDirection: 'row', alignItems: 'center', flex: 1 },
  planRight:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  planDays:   { fontSize: 16, fontWeight: '800', color: '#333' },
  planSub:    { fontSize: 11, color: '#aaa', marginTop: 2 },
  planPrice:  { fontSize: 18, fontWeight: '800', color: '#333' },
  planRadio:  { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
  planRadioOn:{ borderColor: ORANGE },
  planDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: ORANGE },

  // Feature strip
  featureStrip: {
    flexDirection: 'row', backgroundColor: '#fff8f3',
    borderRadius: 12, borderWidth: 1, borderColor: '#ffe4cc',
    padding: 14, marginTop: 4, alignItems: 'center',
  },
  featureItem: { flex: 1, alignItems: 'center', gap: 6 },
  featureTxt:  { fontSize: 10, fontWeight: '700', color: '#888', textAlign: 'center', letterSpacing: 0.2 },
  featureSep:  { width: 1, height: 36, backgroundColor: '#f0ddd0', marginHorizontal: 4 },

  // Review
  revHead:  { fontSize: 14, color: '#555', marginBottom: 14 },
  revGroup: { backgroundColor: '#f9f9f9', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#f0f0f0' },
  revRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  revLabel: { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 0.5 },
  revValue: { fontSize: 13, fontWeight: '600', color: '#333', flex: 1, textAlign: 'right', marginLeft: 8 },
  revDesc:  { fontSize: 13, color: '#555', paddingHorizontal: 14, paddingBottom: 14, lineHeight: 20 },

  planSummaryBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14,
    backgroundColor: '#fff7ed', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#fed7aa',
  },
  planSummaryTxt: { fontSize: 14, fontWeight: '700', color: ORANGE },

  // Bottom buttons
  btnRow:      { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 18, gap: 12 },
  backBtn:     { flex: 1, height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  backBtnTxt:  { fontSize: 15, fontWeight: '700', color: '#555' },
  continueBtn: {
    flex: 2, height: 52, borderRadius: 12, backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ORANGE, shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  continueTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },

  // Multiple positions
  posCard:    { backgroundColor: '#fafafa', borderWidth: 1.5, borderColor: '#ececec', borderRadius: 14, padding: 14, marginBottom: 12 },
  posHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  posIndex:   { fontSize: 12, fontWeight: '800', color: ORANGE, letterSpacing: 0.5, textTransform: 'uppercase' },
  posRemove:  { padding: 2 },
  posVacLbl:  { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 0.6, marginBottom: 8 },
  posVacRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  posVacBtn:  { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#f0f0f0', borderWidth: 1.5, borderColor: '#e0e0e0' },
  posVacBtnOn:{ backgroundColor: '#fff7ed', borderColor: ORANGE },
  posVacTxt:  { fontSize: 13, fontWeight: '700', color: '#666' },
  posVacTxtOn:{ color: ORANGE },
  addPosBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 4, justifyContent: 'center', borderWidth: 1.5, borderColor: ORANGE, borderStyle: 'dashed', borderRadius: 12, marginTop: 2, backgroundColor: '#fff8f3' },
  addPosTxt:  { fontSize: 14, fontWeight: '700', color: ORANGE },
});
