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

const TYPES = ['Full-time', 'Part-time', 'Contract', 'Daily Wage', 'Gig'];

export default function PostScreen({ navigation }) {
  const { user, role, loadJobs } = useAuth();

  // Seekers should never reach this screen (tab is hidden), but guard anyway
  if (role === 'seeker') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>🎉</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 8, textAlign: 'center' }}>
          You're a Job Seeker — browsing is FREE!
        </Text>
        <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center' }}>
          Job posting is only available for employers.
        </Text>
        <Btn
          label="Browse Jobs →"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 20 }}
        />
      </View>
    );
  }

  const [form, setForm] = useState({
    title: '',
    company: user?.company || '',
    category: 'Construction',
    type: 'Full-time',
    location: '',
    salary: '',
    phone: user?.phone || '',
    description: '',
    featured: false,
    urgent: false,
  });
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm]       = useState({
    card: '', expiry: '', cvv: '', name: user?.name || '',
  });

  const set  = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setP = (k, v) => setPayForm(f => ({ ...f, [k]: v }));

  const boostPrice =
    form.featured && form.urgent ? PRICING.bundle
    : form.featured ? PRICING.featured
    : form.urgent   ? PRICING.urgent
    : 0;
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
    const boostLabel =
      form.featured && form.urgent ? ' + Featured + Urgent'
      : form.featured ? ' + Featured'
      : form.urgent   ? ' + Urgent'
      : '';
    const r = await http('POST', '/api/payments', {
      plan: 'boost',
      amount: total,
      description: `Post Job${boostLabel}`,
      jobData: form,
    });
    setLoading(false);
    if (r.ok) {
      await loadJobs();
      setShowPayModal(false);
      navigation.navigate('Board');
      Toast.show({ type: 'success', text1: '✅ Job posted successfully! Now live.' });
    } else {
      setError(r.error || 'Payment failed. Try again.');
    }
  }

  // ── Payment modal ────────────────────────────────────────────
  if (showPayModal) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: C.bg }}
          contentContainerStyle={{ padding: 16 }}
        >
          <View style={styles.payHeader}>
            <Text style={styles.payTitle}>Secure Checkout</Text>
            <Text style={styles.payAmt}>₹{total}</Text>
            <Text style={styles.paySub}>
              Base ₹{PRICING.basic}{boostPrice ? ` + Boost ₹${boostPrice}` : ''}
            </Text>
          </View>

          <Card style={{ marginBottom: 16 }}>
            <Input
              label="Cardholder Name"
              value={payForm.name}
              onChangeText={v => setP('name', v)}
              placeholder="Name on card"
            />
            <Input
              label="Card Number"
              value={payForm.card}
              onChangeText={v => setP('card', v)}
              placeholder="1234 5678 9012 3456"
              keyboardType="number-pad"
              maxLength={19}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Expiry (MM/YY)"
                  value={payForm.expiry}
                  onChangeText={v => setP('expiry', v)}
                  placeholder="MM/YY"
                  maxLength={5}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="CVV"
                  value={payForm.cvv}
                  onChangeText={v => setP('cvv', v)}
                  placeholder="•••"
                  maxLength={3}
                  secureTextEntry
                />
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Btn
              label={loading ? 'Processing…' : `🔒 Pay ₹${total} Securely`}
              onPress={processPayment}
              disabled={loading}
              size="lg"
              style={{ marginTop: 4 }}
            />
            <Text style={styles.sslText}>🔒 256-bit SSL · Powered by Razorpay · PCI DSS</Text>
            <Btn
              label="Cancel"
              variant="outline"
              onPress={() => setShowPayModal(false)}
              style={{ marginTop: 8 }}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Post form ────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <SectionTitle
          title="Post a Job"
          sub="Reach thousands of local job seekers in Nanded"
          style={{ marginBottom: 16 }}
        />

        <Card style={{ marginBottom: 16 }}>
          <Input
            label="Job Title *"
            value={form.title}
            onChangeText={v => set('title', v)}
            placeholder="e.g. Security Guard Needed"
          />
          <Input
            label="Company Name *"
            value={form.company}
            onChangeText={v => set('company', v)}
            placeholder="Your company or name"
          />

          {/* Category picker */}
          <Text style={styles.fieldLabel}>Category *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 14 }}
            contentContainerStyle={{ gap: 6 }}
          >
            {CATS.filter(c => c !== 'All').map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => set('category', c)}
                style={[styles.catBtn, form.category === c && styles.catBtnActive]}
              >
                <Text style={[styles.catBtnText, form.category === c && { color: '#fff' }]}>
                  {CAT_ICONS[c]} {c}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Job type */}
          <Text style={styles.fieldLabel}>Job Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 14 }}
            contentContainerStyle={{ gap: 6 }}
          >
            {TYPES.map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => set('type', t)}
                style={[styles.catBtn, form.type === t && styles.catBtnActive]}
              >
                <Text style={[styles.catBtnText, form.type === t && { color: '#fff' }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Input
            label="Location in Nanded *"
            value={form.location}
            onChangeText={v => set('location', v)}
            placeholder="e.g. Cidco, Shivaji Nagar"
          />
          <Input
            label="Salary / Pay *"
            value={form.salary}
            onChangeText={v => set('salary', v)}
            placeholder="e.g. ₹12,000/month or ₹600/day"
          />
          <Input
            label="Contact Phone *"
            value={form.phone}
            onChangeText={v => set('phone', v)}
            placeholder="10-digit mobile"
            keyboardType="phone-pad"
            maxLength={10}
          />
          <Input
            label="Job Description *"
            value={form.description}
            onChangeText={v => set('description', v)}
            placeholder="Describe the job, requirements, timings…"
            multiline
            numberOfLines={4}
            inputStyle={{ minHeight: 100, textAlignVertical: 'top' }}
          />

          {/* Boost options */}
          <Text style={[styles.fieldLabel, { marginBottom: 10 }]}>⚡ Boost Your Post</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            {[
              ['featured', '⭐ Featured', `₹${PRICING.featured}`, '5× more views'],
              ['urgent',   '🔥 Urgent',   `₹${PRICING.urgent}`,   'Red badge'],
            ].map(([key, label, price, sub]) => (
              <TouchableOpacity
                key={key}
                onPress={() => set(key, !form[key])}
                style={[styles.boostBtn, form[key] && styles.boostBtnActive]}
              >
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
              <Text style={{ fontSize: 13 }}>
                Pay <Text style={{ fontWeight: '800' }}>₹{PRICING.bundle}</Text>{' '}
                <Text style={{ color: '#aaa', textDecorationLine: 'line-through' }}>
                  ₹{PRICING.featured + PRICING.urgent}
                </Text>
                {'  '}Save ₹{(PRICING.featured + PRICING.urgent) - PRICING.bundle}
              </Text>
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Btn
            label={`🚀 Post Job & Pay ₹${total}`}
            onPress={handlePost}
            size="lg"
            style={{ marginTop: 4 }}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: '#444',
    marginBottom: 5, letterSpacing: 0.3,
  },
  catBtn: {
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card,
    paddingVertical: 6, paddingHorizontal: 13, borderRadius: 20,
  },
  catBtnActive:  { backgroundColor: C.dark, borderColor: C.dark },
  catBtnText:    { fontSize: 12, fontWeight: '600', color: '#555' },
  boostBtn: {
    flex: 1, borderWidth: 2, borderColor: C.border,
    borderRadius: 11, padding: 12, backgroundColor: '#fff',
  },
  boostBtnActive: { borderColor: C.dark, backgroundColor: C.grayLight },
  boostCheck: {
    width: 19, height: 19, borderRadius: 5, borderWidth: 2,
    borderColor: '#ccc', alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  boostCheckActive: { borderColor: C.dark, backgroundColor: C.dark },
  bundleBanner: {
    backgroundColor: C.grayLight, borderWidth: 1.5, borderColor: '#ccc',
    borderRadius: 9, padding: 11, marginBottom: 14, gap: 2,
  },
  payHeader: {
    backgroundColor: C.dark, borderRadius: 14, padding: 20, marginBottom: 16,
  },
  payTitle: {
    color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6,
  },
  payAmt:  { color: '#fff', fontSize: 32, fontWeight: '800' },
  paySub:  { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  sslText: { textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 10 },
  error: {
    color: '#e55', fontSize: 12, fontWeight: '500', marginBottom: 10,
    backgroundColor: '#fff0f0', padding: 10, borderRadius: 8,
  },
});
