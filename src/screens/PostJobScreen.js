import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { http } from '../utils/api';
import { CATS } from '../utils/constants';

const ORANGE = '#f97316';
const TOTAL_STEPS = 5;

const JOB_TYPES = [
  { id: 'Full-time',        label: 'Full-time',        sub: 'Regular fixed hours, 5–6 days/week' },
  { id: 'Part-time',        label: 'Part-time',        sub: 'Flexible hours, fewer days' },
  { id: 'Contract / Temp',  label: 'Contract / Temp',  sub: 'Short-term project work' },
  { id: 'Freshers Welcome', label: 'Freshers Welcome', sub: 'No prior experience required' },
];

const EDUCATION_LEVELS = ['No Minimum', '10th Pass (SSC)', '12th Pass (HSC)', 'Graduate / Degree', 'Diploma / ITI'];
const EXPERIENCE_OPTIONS = ['Fresher (0 yr)', '6 months+', '1 yr+', '2 yr+', '3 yr+', '5 yr+'];
const HOURS_OPTIONS = ['9 AM – 6 PM', '8 AM – 5 PM', 'Night Shift', 'Rotational', 'Flexible'];
const OPENINGS = ['1', '2', '3', '4', '5', '6-10', '10+'];

export default function PostJobScreen() {
  const nav = useNavigation();
  const { loadJobs } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    company: '', category: 'Delivery & Logistics', title: '',
    type: 'Full-time', openings: '1',
    location: 'Nanded City', minSalary: '', maxSalary: '',
    education: '10th Pass (SSC)', experience: 'Fresher (0 yr)', hours: '9 AM – 6 PM',
    description: '', skills: '', phone: '', whatsapp: '',
    plan: 'free',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  function nextStep() {
    if (step === 1 && !form.title.trim()) {
      Alert.alert('Required', 'Please enter a job title'); return;
    }
    if (step < TOTAL_STEPS) setStep(s => s + 1);
  }
  function prevStep() { if (step > 1) setStep(s => s - 1); }

  async function submit() {
    if (!form.phone.trim()) { Alert.alert('Required', 'Enter contact number'); return; }
    setLoading(true);
    try {
      const salary = form.minSalary ? `${form.minSalary}${form.maxSalary ? `–${form.maxSalary}` : ''}/mo` : '';
      const r = await http('POST', '/api/jobs', {
        title: form.title, company: form.company, category: form.category,
        type: form.type, location: form.location, salary,
        description: form.description,
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
        phone: form.phone, whatsapp: form.whatsapp || form.phone,
        plan: form.plan,
      });
      if (r?.ok) {
        await loadJobs();
        Toast.show({ type: 'success', text1: '✅ Job posted successfully!' });
        nav.goBack();
      } else {
        Alert.alert('Error', r?.error || 'Failed to post job. Try again.');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {/* Step Header */}
        <View style={styles.stepHeader}>
          <TouchableOpacity onPress={prevStep} style={styles.backBtn} disabled={step === 1}>
            <Ionicons name="arrow-back" size={18} color={step === 1 ? '#555' : '#fff'} />
          </TouchableOpacity>
          <View style={styles.stepDots}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View key={i} style={[styles.dot, i < step && styles.dotActive]} />
            ))}
          </View>
          <Text style={styles.stepLabel}>Step {step} of {TOTAL_STEPS}</Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {/* Step 1: Job Basics */}
          {step === 1 && (
            <View>
              <Text style={styles.stepTitle}>Job Basics</Text>
              <Text style={styles.stepSub}>Tell us about the position(s)</Text>

              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.fieldLabel}>Post Multiple Positions?</Text>
                  <Text style={styles.fieldHint}>Hire for different roles in one go</Text>
                </View>
              </View>

              <Field label="COMPANY / EMPLOYER NAME *">
                <TextInput style={styles.input} placeholder="e.g. Dhanraj Enterprises"
                  value={form.company} onChangeText={v => set('company', v)} />
              </Field>

              <Field label="INDUSTRY / CATEGORY *">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {CATS.filter(c => c !== 'All').map(c => (
                    <TouchableOpacity key={c}
                      style={[styles.pill, form.category === c && styles.pillActive]}
                      onPress={() => set('category', c)}>
                      <Text style={[styles.pillTxt, form.category === c && styles.pillTxtActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Field>

              <Field label="JOB TITLE *">
                <TextInput style={styles.input} placeholder="e.g. Delivery Executive, Telecaller"
                  value={form.title} onChangeText={v => set('title', v)} />
              </Field>

              <Field label="JOB TYPE">
                {JOB_TYPES.map(jt => (
                  <TouchableOpacity key={jt.id}
                    style={[styles.radioCard, form.type === jt.id && styles.radioCardActive]}
                    onPress={() => set('type', jt.id)}>
                    <View style={[styles.radio, form.type === jt.id && styles.radioActive]}>
                      {form.type === jt.id && <View style={styles.radioInner} />}
                    </View>
                    <View>
                      <Text style={styles.radioLabel}>{jt.label}</Text>
                      <Text style={styles.radioHint}>{jt.sub}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </Field>

              <Field label="NUMBER OF OPENINGS">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {OPENINGS.map(o => (
                    <TouchableOpacity key={o}
                      style={[styles.pill, form.openings === o && styles.pillActive]}
                      onPress={() => set('openings', o)}>
                      <Text style={[styles.pillTxt, form.openings === o && styles.pillTxtActive]}>{o}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Field>
            </View>
          )}

          {/* Step 2: Location & Pay */}
          {step === 2 && (
            <View>
              <Text style={styles.stepTitle}>Location & Pay</Text>
              <Text style={styles.stepSub}>Set location, salary & requirements</Text>

              <Field label="WORK LOCATION *">
                <TextInput style={styles.input} placeholder="e.g. Nanded City, Vazirabad"
                  value={form.location} onChangeText={v => set('location', v)} />
              </Field>

              <Field label="MINIMUM MONTHLY SALARY (₹)">
                <View style={styles.inputWithIcon}>
                  <Text style={styles.rupee}>₹</Text>
                  <TextInput style={[styles.input, { flex: 1, borderWidth: 0 }]}
                    placeholder="e.g. 10000" keyboardType="numeric"
                    value={form.minSalary} onChangeText={v => set('minSalary', v)} />
                </View>
              </Field>

              <Field label="MAXIMUM MONTHLY SALARY (₹)">
                <View style={styles.inputWithIcon}>
                  <Text style={styles.rupee}>₹</Text>
                  <TextInput style={[styles.input, { flex: 1, borderWidth: 0 }]}
                    placeholder="e.g. 15000" keyboardType="numeric"
                    value={form.maxSalary} onChangeText={v => set('maxSalary', v)} />
                </View>
              </Field>

              <Field label="EDUCATION REQUIRED">
                {EDUCATION_LEVELS.map(edu => (
                  <TouchableOpacity key={edu}
                    style={[styles.radioCard, form.education === edu && styles.radioCardActive]}
                    onPress={() => set('education', edu)}>
                    <View style={[styles.radio, form.education === edu && styles.radioActive]}>
                      {form.education === edu && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioLabel}>{edu}</Text>
                  </TouchableOpacity>
                ))}
              </Field>

              <Field label="EXPERIENCE REQUIRED">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {EXPERIENCE_OPTIONS.map(e => (
                    <TouchableOpacity key={e}
                      style={[styles.pill, form.experience === e && styles.pillActive]}
                      onPress={() => set('experience', e)}>
                      <Text style={[styles.pillTxt, form.experience === e && styles.pillTxtActive]}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Field>

              <Field label="WORKING HOURS">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {HOURS_OPTIONS.map(h => (
                    <TouchableOpacity key={h}
                      style={[styles.pill, form.hours === h && styles.pillActive]}
                      onPress={() => set('hours', h)}>
                      <Text style={[styles.pillTxt, form.hours === h && styles.pillTxtActive]}>{h}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Field>
            </View>
          )}

          {/* Step 3: Description & Skills */}
          {step === 3 && (
            <View>
              <Text style={styles.stepTitle}>Description & Skills</Text>
              <Text style={styles.stepSub}>Help candidates know what you need</Text>

              <Field label="JOB DESCRIPTION">
                <TextInput style={[styles.input, styles.textarea]}
                  placeholder="Describe the role, responsibilities, and what you expect..."
                  multiline numberOfLines={6} textAlignVertical="top"
                  value={form.description} onChangeText={v => set('description', v)} />
              </Field>

              <Field label="SKILLS REQUIRED" hint="Separate with commas e.g. Bike, Marathi, Hindi">
                <TextInput style={styles.input}
                  placeholder="e.g. Bike, Marathi, Hindi"
                  value={form.skills} onChangeText={v => set('skills', v)} />
              </Field>
            </View>
          )}

          {/* Step 4: Contact */}
          {step === 4 && (
            <View>
              <Text style={styles.stepTitle}>Contact Details</Text>
              <Text style={styles.stepSub}>How should candidates reach you?</Text>

              <Field label="PHONE NUMBER *">
                <View style={styles.inputWithIcon}>
                  <Text style={styles.rupee}>+91</Text>
                  <TextInput style={[styles.input, { flex: 1, borderWidth: 0 }]}
                    placeholder="10-digit mobile number" keyboardType="phone-pad"
                    maxLength={10}
                    value={form.phone} onChangeText={v => set('phone', v)} />
                </View>
              </Field>

              <Field label="WHATSAPP NUMBER (optional)">
                <View style={styles.inputWithIcon}>
                  <Ionicons name="logo-whatsapp" size={16} color="#25d366" style={{ marginLeft: 12 }} />
                  <TextInput style={[styles.input, { flex: 1, borderWidth: 0 }]}
                    placeholder="Same as phone or different"
                    keyboardType="phone-pad" maxLength={10}
                    value={form.whatsapp} onChangeText={v => set('whatsapp', v)} />
                </View>
              </Field>

              <View style={styles.infoBox}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#16a34a" />
                <Text style={styles.infoTxt}>Your contact is only shown to verified job seekers.</Text>
              </View>
            </View>
          )}

          {/* Step 5: Plan */}
          {step === 5 && (
            <View>
              <Text style={styles.stepTitle}>Choose a Plan</Text>
              <Text style={styles.stepSub}>Boost your listing for more responses</Text>

              {[
                { id: 'free',     label: 'Free',     price: '₹0',  desc: 'Standard listing for 30 days', badge: null },
                { id: 'featured', label: 'Featured', price: '₹99', desc: 'Top placement + orange badge', badge: 'POPULAR' },
                { id: 'urgent',   label: 'Urgent',   price: '₹49', desc: 'Urgent tag + priority in search', badge: null },
              ].map(plan => (
                <TouchableOpacity key={plan.id}
                  style={[styles.planCard, form.plan === plan.id && styles.planCardActive]}
                  onPress={() => set('plan', plan.id)}>
                  <View style={[styles.radio, form.plan === plan.id && styles.radioActive]}>
                    {form.plan === plan.id && <View style={styles.radioInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.planLabel}>{plan.label}</Text>
                      {plan.badge && (
                        <View style={styles.planBadge}>
                          <Text style={styles.planBadgeTxt}>{plan.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.planDesc}>{plan.desc}</Text>
                  </View>
                  <Text style={styles.planPrice}>{plan.price}</Text>
                </TouchableOpacity>
              ))}

              <View style={[styles.infoBox, { marginTop: 16 }]}>
                <Ionicons name="information-circle-outline" size={16} color={ORANGE} />
                <Text style={styles.infoTxt}>Paid plans activate after payment confirmation.</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Buttons */}
        <View style={styles.footer}>
          {step > 1 && (
            <TouchableOpacity style={styles.backFooterBtn} onPress={prevStep}>
              <Text style={styles.backFooterTxt}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.continueBtn, step === 1 && { flex: 1 }, loading && { opacity: 0.7 }]}
            onPress={step < TOTAL_STEPS ? nextStep : submit}
            disabled={loading}
          >
            <Text style={styles.continueTxt}>
              {step < TOTAL_STEPS ? 'Continue' : loading ? 'Posting…' : 'Post Job'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({ label, hint, children }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint && <Text style={styles.fieldHint}>{hint}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  stepHeader: {
    backgroundColor: ORANGE,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  stepDots: { flexDirection: 'row', gap: 6 },
  dot: { width: 24, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { backgroundColor: '#fff' },
  stepLabel: { color: '#fff', fontSize: 12, fontWeight: '700' },
  scroll: { flex: 1 },
  stepTitle: { fontSize: 22, fontWeight: '800', color: '#111', marginBottom: 4 },
  stepSub: { fontSize: 13, color: '#888', marginBottom: 24 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#888', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  fieldHint: { fontSize: 11, color: '#bbb', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e5e5',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#111',
  },
  textarea: { height: 120, paddingTop: 12 },
  inputWithIcon: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10,
  },
  rupee: { paddingHorizontal: 12, fontSize: 14, color: '#888', fontWeight: '600' },
  pill: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e5e5' },
  pillActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  pillTxt: { fontSize: 13, fontWeight: '600', color: '#555' },
  pillTxtActive: { color: '#fff' },
  radioCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    borderWidth: 1.5, borderColor: '#e5e5e5', marginBottom: 8,
  },
  radioCardActive: { borderColor: ORANGE, backgroundColor: '#fff8f3' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: ORANGE },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: ORANGE },
  radioLabel: { fontSize: 14, fontWeight: '600', color: '#111' },
  radioHint: { fontSize: 11, color: '#888', marginTop: 2 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e5e5e5', marginBottom: 18 },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#bbf7d0' },
  infoTxt: { flex: 1, fontSize: 12, color: '#555' },
  planCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderWidth: 1.5, borderColor: '#e5e5e5', marginBottom: 10,
  },
  planCardActive: { borderColor: ORANGE, backgroundColor: '#fff8f3' },
  planLabel: { fontSize: 15, fontWeight: '700', color: '#111' },
  planDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  planPrice: { fontSize: 16, fontWeight: '800', color: ORANGE },
  planBadge: { backgroundColor: ORANGE, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  planBadgeTxt: { fontSize: 9, fontWeight: '800', color: '#fff' },
  footer: { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#ebebeb' },
  backFooterBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#ddd' },
  backFooterTxt: { fontSize: 14, fontWeight: '700', color: '#555' },
  continueBtn: { flex: 2, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10, backgroundColor: ORANGE },
  continueTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
