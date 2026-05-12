import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, StatusBar, TextInput,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/UI';
import { C } from '../utils/constants';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '', company: '' });
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
      const r = await register({ name: form.name, email: form.email, password: form.password, role: 'giver', phone: form.phone, company: form.company });
      setLoading(false);
      if (!r.ok) setError(r.error || 'Registration failed');
    }
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.logoWrap}>
            <View style={s.logoRing}><Text style={{ fontSize: 28 }}>🏙️</Text></View>
            <Text style={s.logoName}>NandedRozgar</Text>
            <Text style={s.logoSub}>Jobs · Cars · Rooms · Nanded</Text>
          </View>
          <View style={s.box}>
            <View style={s.toggle}>
              {['login', 'register'].map(m => (
                <TouchableOpacity key={m} onPress={() => { setMode(m); setError(''); }}
                  style={[s.toggleBtn, mode === m && s.toggleBtnOn]}>
                  <Text style={[s.toggleTxt, mode === m && s.toggleTxtOn]}>
                    {m === 'login' ? 'Sign In' : 'Register'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {mode === 'register' && (
              <>
                <Text style={s.label}>Full Name *</Text>
                <TextInput style={s.input} value={form.name} onChangeText={v => set('name', v)} placeholder="Your full name" placeholderTextColor="#bbb" />
                <Text style={s.label}>Company / Business Name</Text>
                <TextInput style={s.input} value={form.company} onChangeText={v => set('company', v)} placeholder="e.g. Patil Builders (optional)" placeholderTextColor="#bbb" />
                <Text style={s.label}>Phone Number</Text>
                <TextInput style={s.input} value={form.phone} onChangeText={v => set('phone', v)} placeholder="9XXXXXXXXX" placeholderTextColor="#bbb" keyboardType="phone-pad" maxLength={10} />
              </>
            )}
            <Text style={s.label}>Email Address</Text>
            <TextInput style={s.input} value={form.email} onChangeText={v => set('email', v)} placeholder="you@email.com" placeholderTextColor="#bbb" keyboardType="email-address" autoCapitalize="none" />
            <Text style={s.label}>Password</Text>
            <TextInput style={s.input} value={form.password} onChangeText={v => set('password', v)} placeholder={mode === 'register' ? 'Create a password (min 6 chars)' : 'Your password'} placeholderTextColor="#bbb" secureTextEntry />
            {error ? <Text style={s.error}>{error}</Text> : null}
            {loading ? <Spinner size="small" /> : (
              <TouchableOpacity style={s.btn} onPress={handleSubmit}>
                <Text style={s.btnTxt}>{mode === 'login' ? 'Sign In →' : 'Create Account →'}</Text>
              </TouchableOpacity>
            )}
            <View style={s.switchRow}>
              <Text style={s.switchTxt}>{mode === 'login' ? "Don't have an account? " : 'Already have an account? '}</Text>
              <TouchableOpacity onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
                <Text style={s.switchLink}>{mode === 'login' ? 'Register Free' : 'Sign In'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={s.pills}>
            {['💼 Post Jobs', '🚗 List Vehicles', '🏠 List Rooms'].map(b => (
              <View key={b} style={s.pill}><Text style={s.pillTxt}>{b}</Text></View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111' },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20, paddingVertical: 40 },
  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logoRing: { width: 66, height: 66, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoName: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  logoSub: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 3 },
  box: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 400 },
  toggle: { flexDirection: 'row', backgroundColor: '#f2f2f2', borderRadius: 10, padding: 3, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  toggleBtnOn: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleTxt: { fontSize: 12, fontWeight: '600', color: '#888' },
  toggleTxtOn: { color: '#111', fontWeight: '700' },
  label: { fontSize: 11, fontWeight: '600', color: '#555', marginBottom: 4, marginTop: 10 },
  input: { width: '100%', borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 9, paddingVertical: 10, paddingHorizontal: 12, fontSize: 13, color: '#111' },
  error: { color: '#e55', fontSize: 12, fontWeight: '500', marginTop: 10, backgroundColor: '#fff0f0', padding: 10, borderRadius: 8 },
  btn: { backgroundColor: '#111', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  btnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  switchTxt: { fontSize: 12, color: '#888' },
  switchLink: { fontSize: 12, fontWeight: '700', color: '#111' },
  pills: { flexDirection: 'row', marginTop: 20, gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  pill: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12 },
  pillTxt: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600' },
});
