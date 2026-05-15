import { useLang } from '../utils/i18n';
import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { http } from '../utils/api';
import { Input, Btn, Card, SectionTitle } from '../components/UI';
import { C, CATS, CAT_ICONS, PRICING, JOB_PLANS, FREE_TEST_PLAN } from '../utils/constants';

const TYPES        = ['Full-time', 'Part-time', 'Contract', 'Daily Wage', 'Gig'];
const SHIFTS       = ['Day (6am–2pm)', 'Evening (2pm–10pm)', 'Night (10pm–6am)', 'Flexible', 'Rotational'];
const EXP_OPTIONS  = ['Fresher OK', '0–1 year', '1–2 years', '2–5 years', '5+ years'];
const GENDER_PREFS = ['Any', 'Male only', 'Female only'];
const QUALIFS      = ['No requirement', '10th Pass', '12th Pass', 'Diploma', 'Graduate', 'Post-Graduate'];
const LANGUAGES    = ['Marathi', 'Hindi', 'English', 'Urdu'];

const STEPS = [
  { id: 1, label: 'Roles',        emoji: '👔' },
  { id: 2, label: 'Company',      emoji: '📋' },
  { id: 3, label: 'Work',         emoji: '⏰' },
  { id: 4, label: 'Requirements', emoji: '🎯' },
  { id: 5, label: 'Details',      emoji: '📝' },
  { id: 6, label: 'Plan & Pay',   emoji: '💳' },
];

// ─── Step progress bar ────────────────────────────────────────────────────────
function StepBar({ current, onStepPress }) {
  return (
    <View style={sb.wrap}>
      {STEPS.map((step, idx) => {
        const done   = step.id < current;
        const active = step.id === current;
        return (
          <React.Fragment key={step.id}>
            <TouchableOpacity
              onPress={() => done && onStepPress(step.id)}
              style={sb.stepCol}
              activeOpacity={done ? 0.7 : 1}
            >
              <View style={[sb.circle, active && sb.circleActive, done && sb.circleDone]}>
                {done
                  ? <Ionicons name="checkmark" size={11} color="#fff" />
                  : <Text style={[sb.circleNum, active && { color: '#fff' }]}>{step.id}</Text>}
              </View>
              <Text style={[sb.label, active && sb.labelActive, done && sb.labelDone]} numberOfLines={1}>
                {step.label}
              </Text>
            </TouchableOpacity>
            {idx < STEPS.length - 1 && (
              <View style={[sb.line, done && sb.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── Mini stepper ─────────────────────────────────────────────────────────────
function MiniStepper({ value, onChange, min = 1, max = 50 }) {
  return (
    <View style={ss.miniStepWrap}>
      <TouchableOpacity style={[ss.miniBtn, value <= min && { opacity: 0.3 }]} onPress={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
        <Text style={ss.miniBtnTxt}>−</Text>
      </TouchableOpacity>
      <View style={ss.miniCount}>
        <Text style={ss.miniNum}>{value}</Text>
        <Text style={ss.miniLabel}>{value === 1 ? 'vacancy' : 'vacancies'}</Text>
      </View>
      <TouchableOpacity style={[ss.miniBtn, value >= max && { opacity: 0.3 }]} onPress={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
        <Text style={ss.miniBtnTxt}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Plan card ────────────────────────────────────────────────────────────────
function PlanCard({ plan, selected, onSelect, boostPrice }) {
  const total = plan.price + boostPrice;
  return (
    <TouchableOpacity onPress={() => onSelect(plan)} style={[ss.planCard, selected && ss.planCardSelected]} activeOpacity={0.8}>
      {plan.popular && (
        <View style={ss.popularBadge}><Text style={ss.popularTxt}>MOST POPULAR</Text></View>
      )}
      <View style={ss.planTop}>
        <Text style={[ss.planLabel, selected && { color: '#fff' }]}>{plan.label}</Text>
        <View style={ss.planPriceRow}>
          <Text style={[ss.planPrice, selected && { color: '#fff' }]}>₹{plan.price}</Text>
          {boostPrice > 0 && <Text style={[ss.planBoostNote, selected && { color: 'rgba(255,255,255,0.75)' }]}>+₹{boostPrice} boost</Text>}
        </View>
        {boostPrice > 0 && <Text style={[ss.planTotal, selected && { color: 'rgba(255,255,255,0.9)' }]}>Total ₹{total}</Text>}
      </View>
      <View style={ss.planMeta}>
        <Ionicons name="time-outline" size={12} color={selected ? 'rgba(255,255,255,0.75)' : '#999'} />
        <Text style={[ss.planDays, selected && { color: 'rgba(255,255,255,0.75)' }]}>Active for {plan.days} days, then auto-removed</Text>
      </View>
      {selected && <View style={ss.planCheck}><Ionicons name="checkmark-circle" size={20} color="#fff" /></View>}
    </TouchableOpacity>
  );
}

// ─── Role row ────────────────────────────────────────────────────────────────
function RoleRow({ role, index, total, onChange, onRemove }) {
  return (
    <View style={ss.roleRow}>
      <View style={ss.roleHeader}>
        <View style={ss.roleIndex}><Text style={ss.roleIndexTxt}>{index + 1}</Text></View>
        <Text style={ss.roleHeading}>Role {index + 1}</Text>
        {total > 1 && (
          <TouchableOpacity onPress={onRemove} style={ss.roleRemoveBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={20} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
      <Input label="Job Title *" value={role.title} onChangeText={v => onChange('title', v)} placeholder="e.g. Security Guard, Driver, Cook" style={{ marginBottom: 10 }} />
      <Text style={ss.roleVacancyLabel}>Number of Vacancies</Text>
      <MiniStepper value={role.vacancies} onChange={v => onChange('vacancies', v)} />
      {role.vacancies > 1 && (
        <View style={ss.vacancyNote}>
          <Text style={ss.vacancyNoteTxt}>🎉 Will show "{role.vacancies} vacancies" to job seekers</Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PostJobScreen({ navigation }) {
  const { user, role, loadJobs } = useAuth();
  const { t } = useLang();
  const scrollRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [roles, setRoles] = useState([{ id: Date.now(), title: '', vacancies: 1 }]);
  const [form, setForm] = useState({
    company: '', category: 'Construction',
    type: 'Full-time', location: '', salary: '', phone: '',
    description: '', featured: false, urgent: false,
    shift: 'Flexible', experience: 'Fresher OK',
    qualification: 'No requirement', gender_pref: 'Any',
    age_min: '', age_max: '', languages: [], skills: '',
    perks: '', interview_mode: '', address: '', last_date: '',
  });
  const isFreeUser = user?.premium === true || user?.role === 'admin';
  const availablePlans = isFreeUser ? [FREE_TEST_PLAN, ...JOB_PLANS] : JOB_PLANS;
  const [selectedPlan, setSelectedPlan] = useState(
    isFreeUser ? FREE_TEST_PLAN : (JOB_PLANS.find(p => p.popular) || JOB_PLANS[0])
  );
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user) setForm(f => ({ ...f, company: f.company || user.company || '', phone: f.phone || user.phone || '' }));
  }, [user?.id]);

  if (!role || role === 'unknown') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>🎉</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 8, textAlign: 'center' }}>You're a Job Seeker — browsing is FREE!</Text>
        <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center' }}>Job posting is only available for employers.</Text>
        <Btn label="Browse Jobs →" onPress={() => navigation.goBack()} style={{ marginTop: 20 }} />
      </View>
    );
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function toggleLanguage(lang) {
    setForm(f => ({
      ...f,
      languages: f.languages.includes(lang) ? f.languages.filter(l => l !== lang) : [...f.languages, lang],
    }));
  }

  function addRole() {
    if (roles.length >= 8) { Toast.show({ type: 'info', text1: 'Maximum 8 roles per post.' }); return; }
    setRoles(r => [...r, { id: Date.now(), title: '', vacancies: 1 }]);
  }
  function updateRole(id, key, value) { setRoles(r => r.map(item => item.id === id ? { ...item, [key]: value } : item)); }
  function removeRole(id) { setRoles(r => r.filter(item => item.id !== id)); }

  const boostPrice = form.featured && form.urgent ? PRICING.bundle : form.featured ? PRICING.featured : form.urgent ? PRICING.urgent : 0;
  const totalVacancies = roles.reduce((s, r) => s + r.vacancies, 0);
  const grandTotal = (selectedPlan?.price || 0) + boostPrice;

  function validateStep(step) {
    if (step === 1) {
      if (roles.filter(r => !r.title.trim()).length > 0) { setError('Please fill in all job role titles.'); return false; }
    }
    if (step === 2) {
      if (!form.company || !form.location || !form.phone || !form.salary) { setError('Please fill all required fields (Company, Location, Salary, Phone).'); return false; }
    }
    if (step === 5) {
      if (!form.description) { setError('Please add a job description.'); return false; }
    }
    setError(''); return true;
  }

  function goToStep(step) {
    setError('');
    setCurrentStep(step);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function nextStep() { if (!validateStep(currentStep)) return; goToStep(Math.min(STEPS.length, currentStep + 1)); }
  function prevStep() { setError(''); goToStep(Math.max(1, currentStep - 1)); }

  async function handlePost() {
    if (!form.description) { setError('Please add a job description.'); return; }
    if (!selectedPlan) { setError('Please select a listing plan.'); return; }
    setError('');
    Alert.alert(
      'Confirm & Pay',
      `Post ${roles.length} role${roles.length > 1 ? 's' : ''} (${totalVacancies} total vacanc${totalVacancies === 1 ? 'y' : 'ies'}) for ₹${grandTotal}?\n\nPlan: ${selectedPlan.label} (${selectedPlan.days} days)`,
      [{ text: 'Cancel', style: 'cancel' }, { text: `Pay ₹${grandTotal}`, onPress: processPayment }]
    );
  }

  async function processPayment() {
    setLoading(true);
    const jobsPayload = roles.map(r => ({ ...form, title: r.title, vacancies: r.vacancies }));

    // ── Free bypass for premium / test users ─────────────────────────────────
    if (isFreeUser || selectedPlan.free) {
      const r = await http('POST', '/api/jobs', { ...jobsPayload[0] });
      setLoading(false);
      if (r.ok) {
        await loadJobs();
        navigation.navigate('Main', { screen: 'Jobs' });
        Toast.show({ type: 'success', text1: `✅ Job posted for free (test mode)! Live for ${selectedPlan.days} days.` });
      } else {
        setError(r.error || 'Failed to post. Try again.');
      }
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────

    const boostLabel = form.featured && form.urgent ? ' + Featured + Urgent' : form.featured ? ' + Featured' : form.urgent ? ' + Urgent' : '';
    const r = await http('POST', '/api/payments', {
      plan: selectedPlan.label, days: selectedPlan.days, amount: grandTotal,
      description: `Post Job${boostLabel} – ${selectedPlan.label}`,
      jobsData: jobsPayload, jobData: jobsPayload[0],
    });
    setLoading(false);
    if (r.ok) {
      await loadJobs();
      navigation.navigate('Main', { screen: 'Jobs' });
      Toast.show({ type: 'success', text1: `✅ ${roles.length} role${roles.length > 1 ? 's' : ''} posted! ${totalVacancies} vacanc${totalVacancies === 1 ? 'y' : 'ies'} live for ${selectedPlan.days} days.` });
    } else {
      setError(r.error || 'Payment failed. Try again.');
    }
  }

  function renderStep() {
    switch (currentStep) {
      case 1:
        return (
          <Card style={{ marginBottom: 16 }}>
            <Text style={styles.fieldSub}>Add one or more roles you're hiring for. Each role has its own vacancy count.</Text>
            {roles.map((roleItem, idx) => (
              <View key={roleItem.id}>
                {idx > 0 && <View style={styles.roleDivider} />}
                <RoleRow role={roleItem} index={idx} total={roles.length} onChange={(key, val) => updateRole(roleItem.id, key, val)} onRemove={() => removeRole(roleItem.id)} />
              </View>
            ))}
            <TouchableOpacity style={ss.addRoleBtn} onPress={addRole}>
              <Ionicons name="add-circle-outline" size={18} color="#f97316" />
              <Text style={ss.addRoleTxt}>Add Another Role</Text>
            </TouchableOpacity>
            {(roles.length > 1 || totalVacancies > 1) && (
              <View style={ss.summaryBox}>
                <Text style={ss.summaryTxt}>📊 {roles.length} role{roles.length > 1 ? 's' : ''} · {totalVacancies} total vacanc{totalVacancies === 1 ? 'y' : 'ies'}</Text>
              </View>
            )}
          </Card>
        );

      case 2:
        return (
          <Card style={{ marginBottom: 16 }}>
            <Input label={`${t('company')} *`} value={form.company} onChangeText={v => set('company', v)} placeholder="Your company or name" />
            <Input label={`${t('location')} / Area *`} value={form.location} onChangeText={v => set('location', v)} placeholder="e.g. Cidco, Shivaji Nagar" />
            <Input label="Full Address (optional)" value={form.address} onChangeText={v => set('address', v)} placeholder="e.g. Near ST Bus Stand, Nanded" />
            <Input label={`${t('salary')} *`} value={form.salary} onChangeText={v => set('salary', v)} placeholder="e.g. ₹12,000/month or ₹600/day" />
            <Input label={`${t('phone')} *`} value={form.phone} onChangeText={v => set('phone', v)} placeholder="10-digit mobile" keyboardType="phone-pad" maxLength={10} />
            <Text style={styles.fieldLabel}>{t('category')} *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 6 }}>
              {CATS.filter(c => c !== 'All').map(c => (
                <TouchableOpacity key={c} onPress={() => set('category', c)} style={[styles.pill, form.category === c && styles.pillOn]}>
                  <Text style={[styles.pillTxt, form.category === c && { color: '#fff' }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.fieldLabel}>{t('jobType')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {TYPES.map(tp => (
                <TouchableOpacity key={tp} onPress={() => set('type', tp)} style={[styles.pill, form.type === tp && styles.pillOn]}>
                  <Text style={[styles.pillTxt, form.type === tp && { color: '#fff' }]}>{tp}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Card>
        );

      case 3:
        return (
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
        );

      case 4:
        return (
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
        );

      case 5:
        return (
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
        );

      case 6:
        return (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Text style={styles.sectionHead}>📅 Choose Your Listing Plan</Text>
              <Text style={styles.fieldSub}>Your listing is automatically removed after the plan period ends. One flat fee covers all roles in this post.</Text>
              <View style={ss.plansWrap}>
                {availablePlans.map(plan => (
                  <PlanCard key={plan.days} plan={plan} selected={selectedPlan?.days === plan.days} onSelect={setSelectedPlan} boostPrice={boostPrice} />
                ))}
              </View>
              {selectedPlan && (
                <View style={ss.planSelectedNote}>
                  <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                  <Text style={ss.planSelectedNoteTxt}>Selected: <Text style={{ fontWeight: '800' }}>{selectedPlan.label}</Text> · ₹{selectedPlan.price} · Active for {selectedPlan.days} days</Text>
                </View>
              )}
            </Card>

            <Card style={{ marginBottom: 24 }}>
              <Text style={styles.sectionHead}>⚡ Boost Your Post (optional)</Text>
              <Text style={styles.fieldSub}>These charges are added on top of your selected plan.</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                {[
                  ['featured', 'Featured', `₹${PRICING.featured}`, '⭐ 5× more views'],
                  ['urgent',   'Urgent',   `₹${PRICING.urgent}`,   '🔥 Red badge'],
                ].map(([key, label, price, sub]) => (
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
                  <Text style={{ fontSize: 13 }}>Pay <Text style={{ fontWeight: '800' }}>₹{PRICING.bundle}</Text>{' '}<Text style={{ color: '#aaa', textDecorationLine: 'line-through' }}>₹{PRICING.featured + PRICING.urgent}</Text>{'  '}Save ₹{(PRICING.featured + PRICING.urgent) - PRICING.bundle}</Text>
                </View>
              )}
              <View style={ss.totalBox}>
                <View style={ss.totalRow}>
                  <Text style={ss.totalLabel}>Listing plan ({selectedPlan?.label})</Text>
                  <Text style={ss.totalVal}>₹{selectedPlan?.price || 0}</Text>
                </View>
                {boostPrice > 0 && (
                  <View style={ss.totalRow}>
                    <Text style={ss.totalLabel}>Boost ({form.featured && form.urgent ? 'Bundle' : form.featured ? 'Featured' : 'Urgent'})</Text>
                    <Text style={ss.totalVal}>₹{boostPrice}</Text>
                  </View>
                )}
                <View style={ss.totalDivider} />
                <View style={ss.totalRow}>
                  <Text style={ss.grandLabel}>Grand Total</Text>
                  <Text style={ss.grandVal}>₹{grandTotal}</Text>
                </View>
                {roles.length > 1 && <Text style={ss.totalMeta}>* One flat fee covers all {roles.length} roles ({totalVacancies} total vacancies)</Text>}
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Btn
                label={loading ? 'Processing…' : `🚀 Post ${roles.length > 1 ? `${roles.length} Roles` : 'Job'} · Pay ₹${grandTotal}`}
                onPress={handlePost}
                disabled={loading}
                size="lg"
                style={{ marginTop: 4 }}
              />
              <Text style={ss.sslNote}>🔒 256-bit SSL · Powered by Razorpay · PCI DSS</Text>
            </Card>
          </>
        );

      default: return null;
    }
  }

  const stepInfo = STEPS[currentStep - 1];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={styles.stepBarContainer}>
        <StepBar current={currentStep} onStepPress={goToStep} />
      </View>

      <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.stepTitleRow}>
          <Text style={styles.stepEmoji}>{stepInfo.emoji}</Text>
          <View>
            <Text style={styles.stepMeta}>Step {currentStep} of {STEPS.length}</Text>
            <Text style={styles.stepName}>{stepInfo.label}</Text>
          </View>
        </View>

        {error && currentStep < 6 ? <Text style={styles.error}>{error}</Text> : null}

        {renderStep()}

        <View style={styles.navRow}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.backBtn} onPress={prevStep}>
              <Ionicons name="arrow-back" size={16} color="#555" />
              <Text style={styles.backBtnTxt}>Back</Text>
            </TouchableOpacity>
          )}
          {currentStep < STEPS.length && (
            <TouchableOpacity style={[styles.nextBtn, currentStep === 1 && { flex: 1 }]} onPress={nextStep}>
              <Text style={styles.nextBtnTxt}>Next</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Step bar styles ──────────────────────────────────────────────────────────
const sb = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  stepCol: { alignItems: 'center', minWidth: 40 },
  circle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#ddd', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  circleActive: { borderColor: '#111', backgroundColor: '#111' },
  circleDone:   { borderColor: '#16a34a', backgroundColor: '#16a34a' },
  circleNum:    { fontSize: 10, fontWeight: '800', color: '#aaa' },
  label:        { fontSize: 8.5, color: '#bbb', fontWeight: '600', textAlign: 'center', letterSpacing: 0.2 },
  labelActive:  { color: '#111', fontWeight: '800' },
  labelDone:    { color: '#16a34a' },
  line: { flex: 1, height: 2, backgroundColor: '#e5e5e5', marginTop: 10, marginHorizontal: 2 },
  lineDone: { backgroundColor: '#16a34a' },
});

const ss = StyleSheet.create({
  miniStepWrap: { flexDirection: 'row', alignItems: 'center', gap: 0, marginVertical: 8, alignSelf: 'flex-start' },
  miniBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  miniBtnTxt: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 24 },
  miniCount: { paddingHorizontal: 18, alignItems: 'center' },
  miniNum: { fontSize: 26, fontWeight: '900', color: '#111' },
  miniLabel: { fontSize: 10, color: '#888', fontWeight: '500' },
  roleRow: { paddingVertical: 4 },
  roleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  roleIndex: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  roleIndexTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  roleHeading: { flex: 1, fontSize: 13, fontWeight: '700', color: '#333' },
  roleRemoveBtn: { padding: 2 },
  roleVacancyLabel: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 0, letterSpacing: 0.3 },
  vacancyNote: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 8, padding: 8, marginTop: 4 },
  vacancyNoteTxt: { fontSize: 11, color: '#166534', fontWeight: '600' },
  addRoleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#f97316', borderRadius: 10, borderStyle: 'dashed', justifyContent: 'center' },
  addRoleTxt: { fontSize: 13, fontWeight: '700', color: '#f97316' },
  summaryBox: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 9, padding: 10, marginTop: 12 },
  summaryTxt: { fontSize: 12, color: '#c2410c', fontWeight: '700', textAlign: 'center' },
  plansWrap: { gap: 10, marginTop: 6, marginBottom: 10 },
  planCard: { borderWidth: 2, borderColor: '#ebebeb', borderRadius: 12, padding: 14, backgroundColor: '#fff', position: 'relative' },
  planCardSelected: { borderColor: '#111', backgroundColor: '#111' },
  popularBadge: { position: 'absolute', top: -1, right: 12, backgroundColor: '#f97316', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 },
  popularTxt: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  planTop: { gap: 2, marginBottom: 6 },
  planLabel: { fontSize: 14, fontWeight: '700', color: '#111' },
  planPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  planPrice: { fontSize: 26, fontWeight: '900', color: '#111' },
  planBoostNote: { fontSize: 12, color: '#999', fontWeight: '600' },
  planTotal: { fontSize: 11, color: '#555', fontWeight: '600' },
  planMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  planDays: { fontSize: 11, color: '#999', fontWeight: '500' },
  planCheck: { position: 'absolute', top: 14, right: 14 },
  planSelectedNote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 8, padding: 10 },
  planSelectedNoteTxt: { fontSize: 12, color: '#166534' },
  totalBox: { backgroundColor: '#f9f9f9', borderRadius: 10, padding: 14, marginBottom: 14, gap: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 13, color: '#555' },
  totalVal: { fontSize: 13, fontWeight: '700', color: '#111' },
  totalDivider: { height: 1, backgroundColor: '#e5e5e5', marginVertical: 4 },
  grandLabel: { fontSize: 14, fontWeight: '800', color: '#111' },
  grandVal: { fontSize: 18, fontWeight: '900', color: '#111' },
  totalMeta: { fontSize: 11, color: '#999', marginTop: 2 },
  sslNote: { textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 10 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  stepBarContainer: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 2 },
  stepEmoji: { fontSize: 30 },
  stepMeta: { fontSize: 11, color: '#999', fontWeight: '600', letterSpacing: 0.3 },
  stepName:  { fontSize: 18, fontWeight: '800', color: '#111', letterSpacing: 0.1 },
  sectionHead: { fontSize: 13, fontWeight: '800', color: '#111', marginBottom: 8, marginTop: 4, letterSpacing: 0.2 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 5, letterSpacing: 0.3 },
  fieldSub: { fontSize: 11, color: '#888', marginBottom: 12, marginTop: -2 },
  roleDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 14 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  pill: { borderWidth: 1.5, borderColor: '#ebebeb', backgroundColor: C.card, paddingVertical: 5, paddingHorizontal: 11, borderRadius: 20 },
  pillOn:  { backgroundColor: '#111', borderColor: C.dark },
  pillTxt: { fontSize: 12, fontWeight: '600', color: '#555' },
  boostBtn: { flex: 1, borderWidth: 2, borderColor: '#ebebeb', borderRadius: 11, padding: 12, backgroundColor: '#fff' },
  boostBtnActive: { borderColor: C.dark, backgroundColor: C.grayLight },
  boostCheck: { width: 19, height: 19, borderRadius: 5, borderWidth: 2, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  boostCheckActive: { borderColor: C.dark, backgroundColor: '#111' },
  bundleBanner: { backgroundColor: C.grayLight, borderWidth: 1.5, borderColor: '#ccc', borderRadius: 9, padding: 11, marginBottom: 14, gap: 2 },
  error: { color: '#e55', fontSize: 12, fontWeight: '500', marginBottom: 10, backgroundColor: '#fff0f0', padding: 10, borderRadius: 8 },
  navRow: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 13, paddingHorizontal: 18, borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12, backgroundColor: '#fff' },
  backBtnTxt: { fontSize: 14, fontWeight: '700', color: '#555' },
  nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, paddingHorizontal: 18, backgroundColor: '#111', borderRadius: 12 },
  nextBtnTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
