import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, StatusBar, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { http } from '../utils/api';
import { CATS, CAT_ICONS, JOB_PLANS } from '../utils/constants';

const ORANGE = '#f97316';
const CATS_NO_ALL = CATS.filter(c => c !== 'All');

// ── Small reusable components ─────────────────────────────────────────────────
function Label({ text, required }) {
  return (
    <Text style={s.label}>
      {text}{required ? <Text style={{ color: '#ef4444' }}> *</Text> : null}
    </Text>
  );
}

function Field({ label, required, children }) {
  return (
    <View style={s.fieldWrap}>
      <Label text={label} required={required} />
      {children}
    </View>
  );
}

function Input({ value, onChangeText, placeholder, keyboardType, multiline, numberOfLines, maxLength }) {
  return (
    <TextInput
      style={[s.input, multiline && { height: (numberOfLines || 4) * 22, textAlignVertical: 'top', paddingTop: 12 }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#bbb"
      keyboardType={keyboardType || 'default'}
      multiline={multiline}
      numberOfLines={numberOfLines}
      maxLength={maxLength}
    />
  );
}

function Pill({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[s.pill, active && s.pillActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[s.pillTxt, active && s.pillTxtActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function PostJobScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, loadJobs } = useAuth();

  // Form fields
  const [title,       setTitle]       = useState('');
  const [company,     setCompany]     = useState(user?.company || '');
  const [category,    setCategory]    = useState('');
  const [jobType,     setJobType]     = useState('Full-time');
  const [location,    setLocation]    = useState('Nanded');
  const [salary,      setSalary]      = useState('');
  const [phone,       setPhone]       = useState(user?.phone || '');
  const [whatsapp,    setWhatsapp]    = useState(user?.phone || '');
  const [description, setDescription] = useState('');
  const [skills,      setSkills]      = useState('');
  const [experience,  setExperience]  = useState('');
  const [education,   setEducation]   = useState('');
  const [openings,    setOpenings]    = useState('1');
  const [plan,        setPlan]        = useState('free');

  const [submitting, setSubmitting] = useState(false);

  const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'];

  async function handleSubmit() {
    if (!title.trim())    return Alert.alert('Required', 'Please enter a job title.');
    if (!category)        return Alert.alert('Required', 'Please select a category.');
    if (!location.trim()) return Alert.alert('Required', 'Please enter a location.');
    if (!phone.trim())    return Alert.alert('Required', 'Please enter a contact number.');

    setSubmitting(true);
    try {
      const selectedPlan = JOB_PLANS.find(p => p.id === plan);
      const res = await http('POST', '/api/jobs', {
        title:       title.trim(),
        company:     company.trim(),
        category,
        type:        jobType,
        location:    location.trim(),
        salary:      salary.trim(),
        phone:       phone.trim(),
        whatsapp:    whatsapp.trim() || phone.trim(),
        description: description.trim(),
        skills:      skills.trim(),
        experience:  experience.trim(),
        education:   education.trim(),
        openings:    openings.trim() || '1',
        featured:    plan === 'featured',
        urgent:      plan === 'urgent',
        planDays:    30,
        planLabel:   selectedPlan?.label || 'Free',
        planPrice:   selectedPlan?.price || 0,
      });

      if (res?.ok) {
        await loadJobs();
        Toast.show({ type: 'success', text1: '✅ Job posted successfully!', text2: 'Your listing is now live.' });
        nav.goBack();
      } else {
        Alert.alert('Error', res?.error || 'Failed to post job. Please try again.');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f5f5f5' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => nav.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#111" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Post a Job</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Basic Details ── */}
        <View style={s.section}>
          <Text style={s.sectionHead}>Basic Details</Text>

          <Field label="Job Title" required>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Delivery Boy, Security Guard"
              maxLength={100}
            />
          </Field>

          <Field label="Company / Employer Name">
            <Input
              value={company}
              onChangeText={setCompany}
              placeholder="e.g. Swiggy, Cybex Solutions"
              maxLength={100}
            />
          </Field>

          <Field label="Category" required>
            <View style={s.pillsWrap}>
              {CATS_NO_ALL.map(cat => (
                <Pill
                  key={cat}
                  label={cat}
                  active={category === cat}
                  onPress={() => setCategory(cat)}
                />
              ))}
            </View>
          </Field>

          <Field label="Job Type">
            <View style={s.pillsWrap}>
              {JOB_TYPES.map(jt => (
                <Pill
                  key={jt}
                  label={jt}
                  active={jobType === jt}
                  onPress={() => setJobType(jt)}
                />
              ))}
            </View>
          </Field>
        </View>

        {/* ── Location & Salary ── */}
        <View style={s.section}>
          <Text style={s.sectionHead}>Location & Salary</Text>

          <Field label="Location" required>
            <Input
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Nanded, Vazirabad"
              maxLength={100}
            />
          </Field>

          <Field label="Salary / Wages">
            <Input
              value={salary}
              onChangeText={setSalary}
              placeholder="e.g. ₹12,000/mo, ₹500/day"
              maxLength={60}
            />
          </Field>

          <Field label="Number of Openings">
            <Input
              value={openings}
              onChangeText={setOpenings}
              placeholder="1"
              keyboardType="number-pad"
              maxLength={3}
            />
          </Field>
        </View>

        {/* ── Contact ── */}
        <View style={s.section}>
          <Text style={s.sectionHead}>Contact</Text>

          <Field label="Phone Number" required>
            <Input
              value={phone}
              onChangeText={setPhone}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              maxLength={15}
            />
          </Field>

          <Field label="WhatsApp Number">
            <Input
              value={whatsapp}
              onChangeText={setWhatsapp}
              placeholder="Same as phone or different"
              keyboardType="phone-pad"
              maxLength={15}
            />
          </Field>
        </View>

        {/* ── Job Details ── */}
        <View style={s.section}>
          <Text style={s.sectionHead}>Job Details</Text>

          <Field label="Job Description">
            <Input
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the role, responsibilities, timings..."
              multiline
              numberOfLines={5}
              maxLength={1000}
            />
          </Field>

          <Field label="Required Skills">
            <Input
              value={skills}
              onChangeText={setSkills}
              placeholder="e.g. Driving, Marathi, MS Excel (comma separated)"
              maxLength={300}
            />
          </Field>

          <Field label="Experience Required">
            <Input
              value={experience}
              onChangeText={setExperience}
              placeholder="e.g. Fresher OK, 1 year, 2+ years"
              maxLength={60}
            />
          </Field>

          <Field label="Education / Qualification">
            <Input
              value={education}
              onChangeText={setEducation}
              placeholder="e.g. 10th pass, Graduate, Any"
              maxLength={100}
            />
          </Field>
        </View>

        {/* ── Listing Plan ── */}
        <View style={s.section}>
          <Text style={s.sectionHead}>Listing Plan</Text>
          <Text style={s.planNote}>Choose how you want your job to appear</Text>

          {JOB_PLANS.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[s.planCard, plan === p.id && s.planCardActive]}
              onPress={() => setPlan(p.id)}
              activeOpacity={0.85}
            >
              <View style={s.planRadio}>
                {plan === p.id && <View style={s.planRadioDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={s.planLabel}>{p.label}</Text>
                  {p.price > 0 && (
                    <View style={s.planPriceBadge}>
                      <Text style={s.planPriceTxt}>₹{p.price}</Text>
                    </View>
                  )}
                  {p.price === 0 && (
                    <View style={[s.planPriceBadge, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
                      <Text style={[s.planPriceTxt, { color: '#16a34a' }]}>FREE</Text>
                    </View>
                  )}
                </View>
                <Text style={s.planDesc}>{p.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Submit ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <TouchableOpacity
            style={[s.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="briefcase-outline" size={18} color="#fff" />
                  <Text style={s.submitTxt}>Post Job Now</Text>
                </>
            }
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#111' },

  // Section card
  section: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, padding: 18,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  sectionHead: {
    fontSize: 11, fontWeight: '800', color: '#999',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16,
  },

  // Fields
  fieldWrap: { marginBottom: 14 },
  label:     { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 6 },
  input: {
    backgroundColor: '#f8f8f8', borderRadius: 10,
    borderWidth: 1, borderColor: '#ebebeb',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#111',
  },

  // Pills
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e5e5e5',
  },
  pillActive:    { backgroundColor: '#fff7ed', borderColor: ORANGE },
  pillTxt:       { fontSize: 12, fontWeight: '600', color: '#666' },
  pillTxtActive: { color: ORANGE },

  // Plans
  planNote: { fontSize: 12, color: '#aaa', marginBottom: 12, marginTop: -8 },
  planCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: '#ebebeb', borderRadius: 12,
    padding: 14, marginBottom: 10, backgroundColor: '#f9f9f9',
  },
  planCardActive: { borderColor: ORANGE, backgroundColor: '#fff7ed' },
  planRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#ccc',
    alignItems: 'center', justifyContent: 'center',
  },
  planRadioDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: ORANGE },
  planLabel:       { fontSize: 14, fontWeight: '700', color: '#111' },
  planDesc:        { fontSize: 12, color: '#888', marginTop: 2 },
  planPriceBadge:  { backgroundColor: '#fff7ed', borderRadius: 20, borderWidth: 1, borderColor: '#fed7aa', paddingVertical: 2, paddingHorizontal: 8 },
  planPriceTxt:    { fontSize: 11, fontWeight: '700', color: ORANGE },

  // Submit
  submitBtn: {
    backgroundColor: ORANGE, borderRadius: 14,
    height: 52, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: ORANGE, shadowOpacity: 0.35, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  submitTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
