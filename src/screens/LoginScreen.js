import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Input, Btn, Spinner } from '../components/UI';
import { C } from '../utils/constants';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    email: '', password: '', name: '', phone: '', company: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit() {
    setError('');
    if (mode === 'login') {
      if (!form.email || !form.password) { setError('Enter email and password'); return; }
      setLoading(true);
      const r = await login(form.email, form.password);
      setLoading(false);
      if (!r.ok) setError(r.error || 'Login failed');
    } else {
      if (!form.name || !form.email || !form.password) { setError('Fill all required fields'); return; }
      if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
      setLoading(true);
      const r = await register({
        name: form.name, email: form.email, password: form.password,
        role: 'giver',
        phone: form.phone, company: form.company,
      });
      setLoading(false);
      if (!r.ok) setError(r.error || 'Registration failed');
    }
  }

  return (
    <View style={styles.gradient}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <View style={styles.logoMark}>
              <Text style={{ fontSize: 26 }}>🏙️</Text>
            </View>
            <Text style={styles.logoText}>NandedRozgar</Text>
            <Text style={styles.logoSub}>Local Jobs · Local Life · Nanded</Text>
          </View>

          <View style={styles.box}>
            <View style={styles.modeRow}>
              {['login','register'].map(m => (
                <TouchableOpacity key={m} onPress={() => { setMode(m); setError(''); }}
                  style={[styles.modeBtn, mode === m && styles.modeBtnActive]}>
                  <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                    {m === 'login' ? 'Sign In' : 'Register'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {mode === 'register' && (
              <>
                <Input label="Full Name *" value={form.name}
                  onChangeText={v => set('name', v)} placeholder="Your full name" />
                <Input label="Company / Business Name" value={form.company}
                  onChangeText={v => set('company', v)} placeholder="e.g. Patil Builders (optional)" />
                <Input label="Phone Number" value={form.phone}
                  onChangeText={v => set('phone', v)} placeholder="9XXXXXXXXX"
                  keyboardType="phone-pad" maxLength={10} />
              </>
            )}

            <Input label="Email Address" value={form.email}
              onChangeText={v => set('email', v)} placeholder="you@email.com"
              keyboardType="email-address" autoCapitalize="none" />
            <Input label="Password" value={form.password}
              onChangeText={v => set('password', v)}
              placeholder={mode === 'register' ? 'Create a password (min 6 chars)' : 'Your password'}
              secureTextEntry />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {loading
              ? <Spinner size="small" />
              : <Btn label={mode === 'login' ? 'Sign In →' : 'Create Account →'}
                  onPress={handleSubmit} size="lg" style={{ marginTop: 4 }} />
            }

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              </Text>
              <TouchableOpacity onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
                <Text style={styles.switchLink}>
                  {mode === 'login' ? 'Register Free' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.benefits}>
            {['💼 Post Jobs', '🚗 List Vehicles', '🏠 List Rooms'].map(b => (
              <View key={b} style={styles.benefitItem}>
                <Text style={styles.benefitText}>{b}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1, backgroundColor: '#111111' },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  logoWrap: { alignItems: 'center', marginBottom: 28 },
  logoMark: {
    width: 60, height: 60, backgroundColor: '#222', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoText: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: 0.3 },
  logoSub:  { color: '#888', fontSize: 12, marginTop: 3 },
  box: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    width: '100%', maxWidth: 400,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
  },
  modeRow: { flexDirection: 'row', borderRadius: 10, backgroundColor: C.grayLight,
    marginBottom: 20, padding: 3 },
  modeBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  modeBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1,
    shadowRadius: 4, elevation: 2 },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: C.muted },
  modeBtnTextActive: { color: C.text, fontWeight: '700' },
  error: { color: '#e55', fontSize: 12, fontWeight: '500', marginBottom: 10,
    backgroundColor: '#fff0f0', padding: 10, borderRadius: 8 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16,
    paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border },
  switchText: { fontSize: 12, color: C.muted },
  switchLink: { fontSize: 12, fontWeight: '700', color: C.dark },
  benefits: {
    flexDirection: 'row', marginTop: 20, gap: 8, flexWrap: 'wrap', justifyContent: 'center',
  },
  benefitItem: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 14,
  },
  benefitText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' },
});
