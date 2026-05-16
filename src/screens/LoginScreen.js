import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, StatusBar, Animated,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Input, Btn } from '../components/UI';
import GeometricBg from '../components/GeometricBg';

const ORANGE = '#f97316';
const INDIGO = '#6366f1';
const CYAN   = '#22d3ee';

function GeoDecor() {
  return (
    <>
      {/* Top-right cube wireframe */}
      <View style={[d.abs, { top: 80, right: 20 }]}>
        <View style={[d.cubeOuter, { borderColor: ORANGE + '25' }]}>
          <View style={[d.cubeInner, { borderColor: ORANGE + '18' }]} />
        </View>
      </View>
      {/* Top-left triangle */}
      <View style={[d.abs, { top: 110, left: 16,
        width: 0, height: 0,
        borderLeftWidth: 22, borderRightWidth: 22, borderBottomWidth: 38,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderBottomColor: INDIGO + '25',
      }]} />
      {/* Bottom diamond */}
      <View style={[d.abs, { bottom: 110, left: 30,
        width: 28, height: 28,
        backgroundColor: CYAN + '12',
        borderWidth: 1, borderColor: CYAN + '30',
        transform: [{ rotate: '45deg' }],
      }]} />
      {/* Circle ring bottom right */}
      <View style={[d.abs, { bottom: 140, right: 24,
        width: 55, height: 55, borderRadius: 27.5,
        borderWidth: 1.5, borderColor: ORANGE + '20',
        backgroundColor: 'transparent',
      }]} />
      {/* Small diamonds scattered */}
      <View style={[d.abs, { top: 200, left: 28,
        width: 10, height: 10,
        backgroundColor: ORANGE + '40',
        transform: [{ rotate: '45deg' }],
      }]} />
      <View style={[d.abs, { top: 320, right: 40,
        width: 8, height: 8,
        backgroundColor: CYAN + '50',
        transform: [{ rotate: '45deg' }],
      }]} />
    </>
  );
}

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

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
        role: 'user', phone: form.phone,
      });
      setLoading(false);
      if (!r.ok) setError(r.error || 'Registration failed');
    }
  }

  return (
    <View style={s.bg}>
      <StatusBar barStyle="light-content" backgroundColor="#080812" />
      <GeometricBg />
      <GeoDecor />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <Animated.View style={[s.logoWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={s.logoMark}>
              {/* 3D cube icon */}
              <View style={s.cubeIcon}>
                <MaterialIcons name="location-city" size={26} color={ORANGE} />
              </View>
              {/* Glow ring */}
              <View style={s.logoGlow} />
            </View>
            <Text style={s.logoText}>
              <Text style={{ color: '#fff' }}>Nanded</Text>
              <Text style={{ color: ORANGE }}>Rozgar</Text>
            </Text>
            <View style={s.tagRow}>
              <View style={s.tagDot} />
              <Text style={s.logoSub}>Local Jobs · Local Life · Nanded</Text>
              <View style={s.tagDot} />
            </View>
          </Animated.View>

          {/* Form card */}
          <Animated.View style={[s.box, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* Shimmer top edge */}
            <View style={s.shimmerLine} />

            {/* Mode switcher */}
            <View style={s.modeRow}>
              {['login','register'].map(m => (
                <TouchableOpacity key={m} onPress={() => { setMode(m); setError(''); }}
                  style={[s.modeBtn, mode === m && s.modeBtnActive]}
                  activeOpacity={0.8}
                >
                  {mode === m && <View style={s.modeBtnGlow} />}
                  <Text style={[s.modeBtnText, mode === m && s.modeBtnTextActive]}>
                    {m === 'login' ? 'Sign In' : 'Register'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {mode === 'register' && (
              <>
                <Input label="Full Name" value={form.name}
                  onChangeText={v => set('name', v)} placeholder="Your full name" />
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
              placeholder={mode === 'register' ? 'Min 6 characters' : 'Your password'}
              secureTextEntry />

            {error ? (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle" size={14} color="#f87171" />
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            ) : null}

            {loading ? (
              <View style={s.loadingRow}>
                <View style={s.loadingDot} />
                <Text style={s.loadingTxt}>Please wait…</Text>
              </View>
            ) : (
              <Btn
                label={mode === 'login' ? 'Sign In' : 'Create Account'}
                onPress={handleSubmit} variant="orange" size="lg"
                style={{ marginTop: 4 }}
              />
            )}

            <View style={s.switchRow}>
              <Text style={s.switchText}>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              </Text>
              <TouchableOpacity onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
                <Text style={s.switchLink}>
                  {mode === 'login' ? 'Register Free' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Feature pills */}
          <View style={s.benefits}>
            {[
              { icon: 'briefcase', label: 'Post Jobs', color: ORANGE },
              { icon: 'car-sport', label: 'List Vehicles', color: INDIGO },
              { icon: 'business', label: 'List Rooms', color: CYAN },
            ].map(b => (
              <View key={b.label} style={[s.benefitItem, { borderColor: b.color + '30' }]}>
                <Ionicons name={b.icon} size={12} color={b.color} />
                <Text style={[s.benefitText, { color: b.color }]}>{b.label}</Text>
              </View>
            ))}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const d = StyleSheet.create({
  abs: { position: 'absolute' },
  cubeOuter: { width: 48, height: 48, borderWidth: 1.5, borderRadius: 8, transform: [{ rotate: '20deg' }, { rotateX: '20deg' }] },
  cubeInner: { position: 'absolute', width: 30, height: 30, borderWidth: 1, borderRadius: 5, top: 8, left: 8 },
});

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#080812' },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20, paddingVertical: 40 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoMark: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  cubeIcon: {
    width: 68, height: 68,
    backgroundColor: 'rgba(249,115,22,0.12)',
    borderRadius: 20, borderWidth: 1.5,
    borderColor: 'rgba(249,115,22,0.35)',
    alignItems: 'center', justifyContent: 'center',
    transform: [{ perspective: 400 }, { rotateX: '8deg' }, { rotateY: '8deg' }],
    shadowColor: ORANGE, shadowOpacity: 0.35, shadowRadius: 20, elevation: 10,
  },
  logoGlow: {
    position: 'absolute',
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: ORANGE + '08',
    shadowColor: ORANGE, shadowOpacity: 0.4, shadowRadius: 20, elevation: 0,
  },
  logoText: { fontSize: 30, fontWeight: '900', letterSpacing: 0.5, color: '#fff' },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  tagDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: ORANGE + '60' },
  logoSub: { color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '500' },
  box: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20, padding: 24,
    width: '100%', maxWidth: 400,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 24, elevation: 14,
  },
  shimmerLine: { position: 'absolute', top: 0, left: 32, right: 32, height: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  modeRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, marginBottom: 22, padding: 3, gap: 3 },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, overflow: 'hidden' },
  modeBtnActive: { backgroundColor: 'rgba(249,115,22,0.18)', borderWidth: 1, borderColor: ORANGE + '40' },
  modeBtnGlow: { position: 'absolute', inset: 0, backgroundColor: ORANGE + '10' },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.35)' },
  modeBtnTextActive: { color: ORANGE, fontWeight: '800' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', borderRadius: 10, padding: 12, marginBottom: 12 },
  errorTxt: { color: '#f87171', fontSize: 12, fontWeight: '500', flex: 1 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14 },
  loadingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ORANGE },
  loadingTxt: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  switchText: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  switchLink: { fontSize: 12, fontWeight: '700', color: ORANGE },
  benefits: { flexDirection: 'row', marginTop: 24, gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1 },
  benefitText: { fontSize: 11, fontWeight: '700' },
});
