import { useLang } from '../utils/i18n';
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { http } from '../utils/api';
import { Input, Btn, Card, SectionTitle } from '../components/UI';
import { C, CATS, CAT_ICONS, PRICING } from '../utils/constants';

const TYPES        = ['Full-time', 'Part-time', 'Contract', 'Daily Wage', 'Gig'];
const SHIFTS       = ['Day (6am–2pm)', 'Evening (2pm–10pm)', 'Night (10pm–6am)', 'Flexible', 'Rotational'];
const EXP_OPTIONS  = ['Fresher OK', '0–1 year', '1–2 years', '2–5 years', '5+ years'];
const GENDER_PREFS = ['Any', 'Male only', 'Female only'];
const QUALIFS      = ['No requirement', '10th Pass', '12th Pass', 'Diploma', 'Graduate', 'Post-Graduate'];
const LANGUAGES    = ['Marathi', 'Hindi', 'English', 'Urdu'];

function VacancyStepper({ value, onChange }) {
  return (
    <View style={ss.stepperWrap}>
      <TouchableOpacity
        style={[ss.stepBtn, value <= 1 && { opacity: 0.35 }]}
        onPress={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
      >
        <Text style={ss.stepTxt}>−</Text>
      </TouchableOpacity>
      <View style={ss.stepCount}>
        <Text style={ss.stepNum}>{value}</Text>
        <Text style={ss.stepLabel}>{value === 1 ? 'vacancy' : 'vacancies'}</Text>
      </View>
      <TouchableOpacity
        style={[ss.stepBtn, value >= 50 && { opacity: 0.35 }]}
        onPress={() => onChange(Math.min(50, value + 1))}
        disabled={value >= 50}
      >
        <Text style={ss.stepTxt}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function PostScreen({ navigation }) {
  const { user, role, loadJobs } = useAuth();
  const { t } = useLang();

  const [form, setForm] = useState({
    title: '', company: '', category: 'Construction',
    type: 'Full-time', location: '', salary: '', phone: '',
    description: '', featured: false, urgent: false,
    vacancies: 1, shift: 'Flexible', experience: 'Fresher OK',
    qualification: 'No requirement', gender_pref: 'Any',
    age_min: '', age_max: '', languages: [], skills: '',
    perks: '', interview_mode: '', address: '', last_date: '',
  });
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm]           = useState({ card: '', expiry: '', cvv: '', name: '' });

  React.useEffect(() => {
    if (user) {
      setForm(f => ({ ...f, company: f.company || user.company || '', phone: f.phone || user.phone || '' }));
      setPayForm(p => ({ ...p, name: p.name || user.name || '' }));
    }
  }, [user?.id]);

  if (!role || role === 'unknown') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>🎉</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 8, textAlign: 'center' }}>
          You're a Job Seeker — browsing is FREE!
        </Text>
        <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center' }}>
          Job posting is only available for employers.
        </Text>
        <Btn label="Browse Jobs →" onPress={() => navigation.goBack()} style={{ marginTop: 20 }} />
      </View>
    );
  }

  const set  = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setP = (k, v) => setPayForm(f => ({ ...f, [k]: v }));

  function toggleLanguage(lang) {
    setForm(f => ({
      ...f,
      languages: f.languages.includes(lang)
        ? f.languages.filter(l => l !== lang)
        : [...f.languages, lang],
    }));
  }

  const boostPrice =
    form.featured && form.urgent ? PRICING.bundle
    : form.featured ? PRICING.featured
    : form.urgent   ? PRICING.urgent : 0;
  const total = PRICING.basic + boostPrice;

  function handlePost() {
    if (!form.title || !form.company || !form.location || !form.phone || !form.description || !form.salary) {
      setError('Please fill all required fields.');
      return;
    }
    setError('');
    setShowPayModal(true);
  }

  async function processPayment() {
    if (!payForm.name || !payForm.card || !payForm.expiry || !payForm.cvv) {
      setError('Please fill all payment fields.');
      return;
    }
    setLoading(true);
    const boostLabel = form.featured && form.urgent ? ' + Featured + Urgent' : form.featured ? ' + Featured' : form.urgent ? ' + Urgent' : '';
    const r = await http('POST', '/api/payments', { plan: 'boost', amount: total, description: `Post Job${boostLabel}`, jobData: form });
    setLoading(false);
    if (r.ok) {
      await loadJobs();
      setShowPayModal(false);
      navigation.navigate('Main', { screen: 'Jobs' });
      Toast.show({ type: 'success', text1: `✅ Job posted! ${form.vacancies} vacanc${form.vacancies === 1 ? 'y' : 'ies'} now live.` });
    } else {
      setError(r.error || 'Payment failed. Try again.');
    }
  }

  if (showPayModal) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }} contentContainerStyle={{ padding: 16 }}>
          <View style={styles.payHeader}>
            <Text style={styles.payTitle}>Secure Checkout</Text>
            <Text style={styles.payAmt}>₹{total}</Text>
            <Text style={styles.paySub}>Base ₹{PRICING.basic}{boostPrice ? ` + Boost ₹${boostPrice}` : ''}</Text>
          </View>
          <Card style={{ marginBottom: 16 }}>
            <Input label="Cardholder Name" value={payForm.name} onChangeText={v => setP('name', v)} placeholder="Name on card" />
            <Input label="Card Number" value={payForm.card} onChangeText={v => setP('card', v)} placeholder="1234 5678 9012 3456" keyboardType="number-pad" maxLength={19} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Input label="Expiry (MM/YY)" value={payForm.expiry} onChangeText={v => setP('expiry', v)} placeholder="MM/YY" maxLength={5} /></View>
              <View style={{ flex: 1 }}><Input label="CVV" value={payForm.cvv} onChangeText={v => setP('cvv', v)} placeholder="•••" maxLength={3} secureTextEntry /></View>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Btn label={loading ? t('paying') : `🔒 Pay ₹${total} Securely`} onPress={processPayment} disabled={loading} size="lg" style={{ marginTop: 4 }} />
            <Text style={styles.sslText}>🔒 256-bit SSL · Powered by Razorpay · PCI DSS</Text>
            <Btn label="Cancel" variant="outline" onPress={() => setShowPayModal(false)} style={{ marginTop: 8 }} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <SectionTitle title={t('postAJobTitle')} sub="Reach thousands of local job seekers in Nanded" style={{ marginBottom: 16 }} />

        {/* SECTION 1: Basic Info */}
        <Text style={styles.sectionHead}>📋 Basic Information</Text>
        <Card style={{ marginBottom: 16 }}>
          <Input label={`${t('jobTitle')} *`} value={form.title} onChangeText={v => set('title', v)} placeholder="e.g. Security Guard Needed" />
          <Input label={`${t('company')} *`} value={form.company} onChangeText={v => set('company', v)} placeholder="Your company or name" />

          <Text style={styles.fieldLabel}>{t('category')} *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 6 }}>
            {CATS.filter(c => c !== 'All').map(c => (
              <TouchableOpacity key={c} onPress={() => set('category', c)} style={[styles.pill, form.category === c && styles.pillOn]}>
                <Text style={[styles.pillTxt, form.category === c && { color: '#fff' }]}>{CAT_ICONS[c]} {c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.fieldLabel}>{t('jobType')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 6 }}>
            {TYPES.map(tp => (
              <TouchableOpacity key={tp} onPress={() => set('type', tp)} style={[styles.pill, form.type === tp && styles.pillOn]}>
                <Text style={[styles.pillTxt, form.type === tp && { color: '#fff' }]}>{tp}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Input label={`${t('location')} / Area *`} value={form.location} onChangeText={v => set('location', v)} placeholder="e.g. Cidco, Shivaji Nagar" />
          <Input label="Full Address (optional)" value={form.address} onChangeText={v => set('address', v)} placeholder="e.g. Near ST Bus Stand, Nanded" />
          <Input label={`${t('salary')} *`} value={form.salary} onChangeText={v => set('salary', v)} placeholder="e.g. ₹12,000/month or ₹600/day" />
          <Input label={`${t('phone')} *`} value={form.phone} onChangeText={v => set('phone', v)} placeholder="10-digit mobile" keyboardType="phone-pad" maxLength={10} />
        </Card>

        {/* SECTION 2: Vacancies */}
        <Text style={styles.sectionHead}>👥 Number of Vacancies</Text>
        <Card style={{ marginBottom: 16 }}>
          <Text style={styles.fieldLabel}>How many people are you hiring?</Text>
          <Text style={styles.fieldSub}>Post multiple openings in one ad — no extra charge.</Text>
          <VacancyStepper value={form.vacancies} onChange={v => set('vacancies', v)} />
          {form.vacancies > 1 && (
            <View style={styles.vacancyNote}>
              <Text style={styles.vacancyNoteTxt}>
                🎉 Your ad will show "{form.vacancies} vacancies available" to job seekers.
              </Text>
            </View>
          )}
        </Card>

        {/* SECTION 3: Work Details */}
        <Text style={styles.sectionHead}>⏰ Work Details</Text>
        <Card style={{ marginBottom: 16 }}>
          <Text style={styles.fieldLabel}>Work Shift</Text>
          <View style={styles.pillWrap}>
            {SHIFTS.map(sh => (
              <TouchableOpacity key={sh} onPress={() => set('shift', sh)} style={[styles.pill, form.shift === sh && styles.pillOn]}>
                <Text style={[styles.pillTxt, form.shift === sh && { color: '#fff' }]}>{sh}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Input label="Interview Mode" value={form.interview_mode} onChangeText={v => set('interview_mode', v)} placeholder="e.g. Walk-in, Phone call, WhatsApp" />
          <Input label="Last Date to Apply" value={form.last_date} onChangeText={v => set('last_date', v)} placeholder="e.g. 30 Jun 2026 (leave blank = open)" />
        </Card>

        {/* SECTION 4: Candidate Requirements */}
        <Text style={styles.sectionHead}>🎯 Candidate Requirements</Text>
        <Card style={{ marginBottom: 16 }}>
          <Text style={styles.fieldLabel}>Experience Required</Text>
          <View style={styles.pillWrap}>
            {EXP_OPTIONS.map(ex => (
              <TouchableOpacity key={ex} onPress={() => set('experience', ex)} style={[styles.pill, form.experience === ex && styles.pillOn]}>
                <Text style={[styles.pillTxt, form.experience === ex && { color: '#fff' }]}>{ex}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Minimum Qualification</Text>
          <View style={styles.pillWrap}>
            {QUALIFS.map(q => (
              <TouchableOpacity key={q} onPress={() => set('qualification', q)} style={[styles.pill, form.qualification === q && styles.pillOn]}>
                <Text style={[styles.pillTxt, form.qualification === q && { color: '#fff' }]}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Gender Preference</Text>
          <View style={styles.pillWrap}>
            {GENDER_PREFS.map(g => (
              <TouchableOpacity key={g} onPress={() => set('gender_pref', g)} style={[styles.pill, form.gender_pref === g && styles.pillOn]}>
                <Text style={[styles.pillTxt, form.gender_pref === g && { color: '#fff' }]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Input label="Min Age" value={form.age_min} onChangeText={v => set('age_min', v)} placeholder="18" keyboardType="numeric" /></View>
            <View style={{ flex: 1 }}><Input label="Max Age" value={form.age_max} onChangeText={v => set('age_max', v)} placeholder="45" keyboardType="numeric" /></View>
          </View>

          <Text style={styles.fieldLabel}>Language Preference</Text>
          <View style={styles.pillWrap}>
            {LANGUAGES.map(lang => (
              <TouchableOpacity key={lang} onPress={() => toggleLanguage(lang)} style={[styles.pill, form.languages.includes(lang) && styles.pillOn]}>
                <Text style={[styles.pillTxt, form.languages.includes(lang) && { color: '#fff' }]}>{lang}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input label="Skills Required" value={form.skills} onChangeText={v => set('skills', v)} placeholder="e.g. Driving licence, MS Office (comma separated)" />
        </Card>

        {/* SECTION 5: Description & Perks */}
        <Text style={styles.sectionHead}>📝 Description & Perks</Text>
        <Card style={{ marginBottom: 16 }}>
          <Input
            label={`${t('description')} *`}
            value={form.description}
            onChangeText={v => set('description', v)}
            placeholder="Describe responsibilities, timings, dress code, location landmark…"
            multiline numberOfLines={5}
            inputStyle={{ minHeight: 110, textAlignVertical: 'top' }}
          />
          <Input
            label="Perks & Benefits"
            value={form.perks}
            onChangeText={v => set('perks', v)}
            placeholder="e.g. Free meals, PF/ESI, Accommodation, Bonus"
            multiline numberOfLines={2}
            inputStyle={{ minHeight: 60, textAlignVertical: 'top' }}
          />
        </Card>

        {/* SECTION 6: Boost */}
        <Text style={styles.sectionHead}>⚡ Boost Your Post</Text>
        <Card style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            {[['featured','Featured',`₹${PRICING.featured}`,'5× more views'],['urgent','Urgent',`₹${PRICING.urgent}`,'Red badge']].map(([key,label,price,sub]) => (
              <TouchableOpacity key={key} onPress={() => set(key, !form[key])} style={[styles.boostBtn, form[key] && styles.boostBtnActive]}>
                <View style={[styles.boostCheck, form[key] && styles.boostCheckActive]}>
                  {form[key] && <Text style={{ color: '#fff', fontSize: 11 }}>✓</Text>}
                </View>
                <Text style={{ fontWeight: '700', fontSize: 13, color: C.text }}>{label}</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: C.text }}>{price}</Text>
                <Text style={{ fontSize: 11, color: C.muted }}>{sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {form.featured && form.urgent && (
            <View style={styles.bundleBanner}>
              <Text style={{ fontWeight: '700', fontSize: 13 }}>🎉 Bundle Deal!</Text>
              <Text style={{ fontSize: 13 }}>Pay <Text style={{ fontWeight: '800' }}>₹{PRICING.bundle}</Text> <Text style={{ color: '#aaa', textDecorationLine: 'line-through' }}>₹{PRICING.featured + PRICING.urgent}</Text>  Save ₹{(PRICING.featured + PRICING.urgent) - PRICING.bundle}</Text>
            </View>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Btn
            label={`🚀 Post ${form.vacancies > 1 ? `${form.vacancies} Vacancies` : 'Job'} & Pay ₹${total}`}
            onPress={handlePost} size="lg" style={{ marginTop: 4 }}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const ss = StyleSheet.create({
  stepperWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0, marginVertical: 10 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  stepTxt: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },
  stepCount: { paddingHorizontal: 28, alignItems: 'center' },
  stepNum: { fontSize: 32, fontWeight: '900', color: '#111' },
  stepLabel: { fontSize: 11, color: '#888', fontWeight: '500' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  sectionHead: { fontSize: 13, fontWeight: '800', color: '#111', marginBottom: 8, marginTop: 4, letterSpacing: 0.2 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 5, letterSpacing: 0.3 },
  fieldSub: { fontSize: 11, color: '#888', marginBottom: 10, marginTop: -2 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  pill: { borderWidth: 1.5, borderColor: '#ebebeb', backgroundColor: C.card, paddingVertical: 5, paddingHorizontal: 11, borderRadius: 20 },
  pillOn:  { backgroundColor: '#111', borderColor: C.dark },
  pillTxt: { fontSize: 12, fontWeight: '600', color: '#555' },
  vacancyNote: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 10, padding: 12, marginTop: 6 },
  vacancyNoteTxt: { fontSize: 12, color: '#c2410c', fontWeight: '600' },
  boostBtn: { flex: 1, borderWidth: 2, borderColor: '#ebebeb', borderRadius: 11, padding: 12, backgroundColor: '#fff' },
  boostBtnActive: { borderColor: C.dark, backgroundColor: C.grayLight },
  boostCheck: { width: 19, height: 19, borderRadius: 5, borderWidth: 2, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  boostCheckActive: { borderColor: C.dark, backgroundColor: '#111' },
  bundleBanner: { backgroundColor: C.grayLight, borderWidth: 1.5, borderColor: '#ccc', borderRadius: 9, padding: 11, marginBottom: 14, gap: 2 },
  payHeader: { backgroundColor: '#111', borderRadius: 14, padding: 20, marginBottom: 16 },
  payTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  payAmt:   { color: '#fff', fontSize: 32, fontWeight: '800' },
  paySub:   { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  sslText:  { textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 10 },
  error: { color: '#e55', fontSize: 12, fontWeight: '500', marginBottom: 10, backgroundColor: '#fff0f0', padding: 10, borderRadius: 8 },
});
