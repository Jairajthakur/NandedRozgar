/**
 * CityPlus — LoginScreen.js  (Light Theme, Animated)
 * Warm light brand identity · staggered entrance animations
 * · floating orbs · polished form card
 * Works on web + Android APK (React Native / Expo).
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, StatusBar,
  Animated, Easing, Modal, TextInput, ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

// ── Brand tokens (Light Theme) ────────────────────────────────────────────────
const ORANGE     = '#f97316';
const ORANGE2    = '#fb923c';
const ORANGE_SOFT= '#fff7ed';
const BG         = '#fbf9f6';
const CARD       = '#ffffff';
const BORDER     = '#e8e4dd';
const BORDER_FOC = '#f97316';
const TEXT       = '#1a1a18';
const TEXT_DIM   = '#888780';
const TEXT_MID   = '#5f5e5a';
const SURFACE    = '#f4f2ee';
const SUCCESS    = '#16a34a';
const DANGER     = '#dc2626';

const { width: SW, height: SH } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';

// ── Google discovery ──────────────────────────────────────────────────────────
const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint:         'https://oauth2.googleapis.com/token',
  revocationEndpoint:    'https://oauth2.googleapis.com/revoke',
};

const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

// ── Tabs ──────────────────────────────────────────────────────────────────────
const ALL_TABS = [
  { key: 'login',    label: 'Sign In',   icon: 'log-in-outline' },
  { key: 'register', label: 'Register',  icon: 'person-add-outline' },
  { key: 'phone',    label: 'Phone OTP', icon: 'phone-portrait-outline' },
];
const TABS = IS_WEB ? ALL_TABS.filter(t => t.key !== 'phone') : ALL_TABS;

// ── Password strength ─────────────────────────────────────────────────────────
function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: BORDER };
  let score = 0;
  if (pw.length >= 8)           score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: 'Very Weak',   color: '#dc2626' },
    { label: 'Weak',        color: '#f97316' },
    { label: 'Fair',        color: '#ca8a04' },
    { label: 'Strong',      color: '#16a34a' },
    { label: 'Very Strong', color: '#15803d' },
  ];
  return { score, ...map[score] };
}

// ── Floating orb ──────────────────────────────────────────────────────────────
function Orb({ size, color, top, left, right, bottom, duration = 4500 }) {
  const y  = useRef(new Animated.Value(0)).current;
  const x  = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(y,  { toValue: -18, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(y,  { toValue: 0,   duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(x,  { toValue: 10,  duration: duration * 1.3, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(x,  { toValue: 0,   duration: duration * 1.3, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(sc, { toValue: 1.08, duration: duration * 0.9, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(sc, { toValue: 1,    duration: duration * 0.9, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        position: 'absolute', width: size, height: size,
        borderRadius: size / 2, backgroundColor: color,
        top, left, right, bottom,
        transform: [{ translateY: y }, { translateX: x }, { scale: sc }],
      }}
      pointerEvents="none"
    />
  );
}

// ── Dot grid (native only) ────────────────────────────────────────────────────
function GridDots() {
  if (IS_WEB) return null;
  const items = [];
  const cols = 7, rows = 10;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      items.push(
        <View key={`${r}-${c}`} style={{
          position: 'absolute', width: 2, height: 2, borderRadius: 1,
          backgroundColor: 'rgba(249,115,22,0.12)',
          left: (SW / cols) * c + 24, top: (SH / rows) * r + 24,
        }} />
      );
    }
  }
  return <View style={StyleSheet.absoluteFill} pointerEvents="none">{items}</View>;
}

// ── Main screen ───────────────────────────────────────────────────────────────
// ── Field — defined outside LoginScreen to prevent remount on every keystroke ──
const Field = ({ label, icon, value, onChange, placeholder, secure, rightIcon, rightPress, keyboard, maxLen, editable = true, fkey, focusedField, setFocusedField }) => {
  const focused = focusedField === fkey;
  return (
    <View style={S.fw}>
      <Text style={S.flabel}>{label}</Text>
      <View style={[S.irow, focused && S.irowF]}>
        <Ionicons name={icon} size={16} color={focused ? ORANGE : TEXT_DIM} style={S.ficon} />
        <TextInput
          style={S.tinput}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#c5c3bb"
          secureTextEntry={!!secure}
          keyboardType={keyboard || 'default'}
          autoCapitalize="none"
          maxLength={maxLen}
          editable={editable !== false}
          onFocus={() => setFocusedField(fkey)}
          onBlur={() => setFocusedField(null)}
        />
        {rightIcon && (
          <TouchableOpacity onPress={rightPress} style={S.eyeBtn}>
            <Ionicons name={rightIcon} size={17} color={TEXT_DIM} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function LoginScreen() {
  const {
    login, register, loginWithGoogle,
    sendOTP, verifyOTP, forgotPassword, loginWithBiometrics,
  } = useAuth();

  const [tab, setTab]             = useState('login');
  const [form, setForm]           = useState({ email: '', password: '', name: '', phone: '', confirmPassword: '' });
  const [otpPhone, setOtpPhone]   = useState('');
  const [otp, setOtp]             = useState('');
  const [otpSent, setOtpSent]     = useState(false);
  const [otpConfirmation, setOtpConfirmation] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [forgotVisible, setForgotVisible]   = useState(false);
  const [forgotEmail, setForgotEmail]       = useState('');
  const [forgotLoading, setForgotLoading]   = useState(false);
  const [forgotDone, setForgotDone]         = useState(false);
  const [focusedField, setFocusedField]     = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Entrance animations ───────────────────────────────────────────────────
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoY       = useRef(new Animated.Value(-24)).current;
  const logoScale   = useRef(new Animated.Value(0.85)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardY       = useRef(new Animated.Value(40)).current;
  const footOpacity = useRef(new Animated.Value(0)).current;
  const shake       = useRef(new Animated.Value(0)).current;
  const tabX        = useRef(new Animated.Value(0)).current;
  const pulse       = useRef(new Animated.Value(1)).current;
  const pulseOp     = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale,   { toValue: 1, damping: 13, stiffness: 130, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(logoY,       { toValue: 0, duration: 380, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(cardY,       { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.timing(footOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse,   { toValue: 1.7, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulseOp, { toValue: 0,   duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulse,   { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(pulseOp, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
        Animated.delay(800),
      ])
    ).start();

    checkBiometrics();
  }, []);

  async function checkBiometrics() {
    if (IS_WEB) return;
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled   = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
    } catch {}
  }

  function triggerShake() {
    shake.setValue(0);
    Animated.sequence(
      [-10, 10, -7, 7, -4, 4, 0].map(v =>
        Animated.timing(shake, { toValue: v, duration: 48, useNativeDriver: true })
      )
    ).start();
  }

  function switchTab(t) {
    const idx = TABS.findIndex(x => x.key === t);
    Animated.spring(tabX, { toValue: idx, damping: 18, stiffness: 220, useNativeDriver: false }).start();
    setTab(t); setError(''); setOtpSent(false); setFocusedField(null);
  }

  const tabCount = TABS.length;
  const tabLeft  = tabX.interpolate({
    inputRange:  TABS.map((_, i) => i),
    outputRange: TABS.map((_, i) => `${(i / tabCount) * 100}%`),
  });

  // ── Google ────────────────────────────────────────────────────────────────
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'cityplus', useProxy: true });
  const [googleRequest, googleResponse, promptGoogleAsync] = AuthSession.useAuthRequest(
    { clientId: GOOGLE_CLIENT_ID, redirectUri, scopes: ['openid', 'profile', 'email'], responseType: AuthSession.ResponseType.Token, usePKCE: false },
    GOOGLE_DISCOVERY
  );
  useEffect(() => {
    if (googleResponse?.type === 'success') handleGoogleSuccess(googleResponse.authentication.accessToken);
  }, [googleResponse]);

  async function handleGoogleSuccess(accessToken) {
    setLoading(true); setError('');
    const r = await loginWithGoogle(accessToken);
    setLoading(false);
    if (!r.ok) { setError(r.error || 'Google sign-in failed'); triggerShake(); }
  }

  function handleGooglePress() {
    if (!GOOGLE_CLIENT_ID) { setError('Google sign-in not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'); return; }
    promptGoogleAsync();
  }

  // ── Biometric ─────────────────────────────────────────────────────────────
  async function handleBiometric() {
    const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Verify your identity', fallbackLabel: 'Use password' });
    if (res.success) {
      setLoading(true);
      const r = await loginWithBiometrics();
      setLoading(false);
      if (!r.ok) setError(r.error || 'Biometric sign-in failed');
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setError('');
    if (tab === 'login') {
      if (!form.email || !form.password) { setError('Enter email and password'); triggerShake(); return; }
      setLoading(true);
      const r = await login(form.email, form.password);
      setLoading(false);
      if (!r.ok) { setError(r.error || 'Login failed'); triggerShake(); }
    } else {
      if (!form.name || !form.email || !form.password) { setError('Fill all required fields'); triggerShake(); return; }
      if (form.password.length < 8) { setError('Password must be at least 8 characters'); triggerShake(); return; }
      if (form.password !== form.confirmPassword) { setError('Passwords do not match'); triggerShake(); return; }
      if (!termsAccepted) { setError('Please accept Terms & Privacy Policy'); triggerShake(); return; }
      if (getPasswordStrength(form.password).score < 2) { setError('Password too weak — add numbers & symbols'); triggerShake(); return; }
      setLoading(true);
      const r = await register({ name: form.name, email: form.email, password: form.password, role: 'user', phone: form.phone });
      setLoading(false);
      if (!r.ok) { setError(r.error || 'Registration failed'); triggerShake(); }
    }
  }

  // ── OTP ───────────────────────────────────────────────────────────────────
  async function handleSendOTP() {
    if (!otpPhone || otpPhone.length < 10) { setError('Enter a valid 10-digit number'); triggerShake(); return; }
    setLoading(true); setError('');
    const r = await sendOTP(otpPhone);
    setLoading(false);
    if (r.ok) { setOtpSent(true); setOtpConfirmation(r.confirmation); }
    else { setError(r.error || 'Failed to send OTP'); triggerShake(); }
  }

  async function handleVerifyOTP() {
    if (!otp || otp.length < 4) { setError('Enter the OTP'); triggerShake(); return; }
    if (!otpConfirmation) { setError('Please request a new OTP'); triggerShake(); return; }
    setLoading(true); setError('');
    const r = await verifyOTP(otpConfirmation, otp);
    setLoading(false);
    if (!r.ok) { setError(r.error || 'Invalid OTP'); triggerShake(); }
  }

  // ── Forgot ────────────────────────────────────────────────────────────────
  async function handleForgotPassword() {
    if (!forgotEmail) return;
    setForgotLoading(true);
    await forgotPassword(forgotEmail);
    setForgotLoading(false);
    setForgotDone(true);
  }

  const pwStrength = getPasswordStrength(form.password);
  const tabW = `${100 / tabCount}%`;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={S.bg}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* BG orbs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Orb size={300} color="rgba(249,115,22,0.07)"  top={-80}  right={-60} duration={5200} />
        <Orb size={220} color="rgba(249,115,22,0.055)" bottom={60} left={-50}  duration={4100} />
        <Orb size={140} color="rgba(251,146,60,0.045)" top={SH * 0.38} right={-20} duration={3700} />
        <View style={S.dline1} />
        <View style={S.dline2} />
      </View>

      <GridDots />

      <KeyboardAvoidingView
        behavior={IS_WEB ? undefined : (Platform.OS === 'ios' ? 'padding' : undefined)}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={S.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── LOGO ── */}
          <Animated.View style={[S.logoWrap, { opacity: logoOpacity, transform: [{ translateY: logoY }, { scale: logoScale }] }]}>
            <View style={S.pulseWrap}>
              <Animated.View style={[S.pulseRing, { transform: [{ scale: pulse }], opacity: pulseOp }]} />
              <View style={S.logoMark}>
                {/* Network graph lines */}
                <View style={[S.netLine, { width: 21, left: 15, top: 20, transform: [{ rotate: '-18deg' }] }]} />
                <View style={[S.netLine, { width: 16, left: 27, top: 21, transform: [{ rotate: '66deg' }] }]} />
                <View style={[S.netLine, { width: 19, left: 18, top: 35, transform: [{ rotate: '148deg' }] }]} />
                <View style={[S.netLine, { width: 22, left: 13, top: 26, transform: [{ rotate: '65deg' }] }]} />
                {/* Network graph nodes */}
                <View style={[S.netNode, { left: 11, top: 16 }]} />
                <View style={[S.netNode, { left: 31, top: 10 }]} />
                <View style={[S.netNode, { left: 39, top: 26 }]} />
                <View style={[S.netNode, { left: 20, top: 38 }]} />
                {/* Accent dots on top nodes */}
                <View style={[S.netAccent, { left: 14, top: 19 }]} />
                <View style={[S.netAccent, { left: 34, top: 13 }]} />
              </View>
            </View>
            <Text style={S.logoName}>
              <Text style={{ color: TEXT }}>City</Text>
              <Text style={{ color: ORANGE }}>Plus</Text>
            </Text>
            <View style={S.tagRow}>
              <View style={S.tagDot} />
              <Text style={S.tagline}>Local Jobs · Local Life · Your City</Text>
              <View style={S.tagDot} />
            </View>
          </Animated.View>

          {/* ── CARD ── */}
          <Animated.View style={[S.card, { opacity: cardOpacity, transform: [{ translateY: cardY }, { translateX: shake }] }]}>

            <View style={S.accentBar} />

            {/* TABS */}
            <View style={S.tabRow}>
              <Animated.View style={[S.tabSlider, { left: tabLeft, width: tabW }]} />
              {TABS.map(t => (
                <TouchableOpacity key={t.key} onPress={() => switchTab(t.key)} style={S.tabBtn} activeOpacity={0.75}>
                  <Ionicons name={t.icon} size={13} color={tab === t.key ? ORANGE : TEXT_DIM} />
                  <Text style={[S.tabTxt, tab === t.key && S.tabTxtOn]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* GOOGLE */}
            {tab !== 'phone' && (
              <TouchableOpacity
                style={[S.googleBtn, !GOOGLE_CLIENT_ID && { opacity: 0.4 }]}
                onPress={handleGooglePress}
                disabled={(!googleRequest && !!GOOGLE_CLIENT_ID) || loading}
                activeOpacity={0.82}
              >
                <MaterialCommunityIcons name="google" size={18} color="#EA4335" />
                <Text style={S.googleTxt}>{tab === 'login' ? 'Continue with Google' : 'Sign up with Google'}</Text>
              </TouchableOpacity>
            )}

            {/* DIVIDER */}
            {tab !== 'phone' && (
              <View style={S.divRow}>
                <View style={S.divLine} /><Text style={S.divTxt}>or with email</Text><View style={S.divLine} />
              </View>
            )}

            {/* Register name */}
            {tab === 'register' && (
              <Field fkey="name" label="Full Name *" icon="person-outline" value={form.name} onChange={v => set('name', v)} placeholder="Your full name" focusedField={focusedField} setFocusedField={setFocusedField} />
            )}

            {/* Email */}
            {tab !== 'phone' && (
              <Field fkey="email" label="Email Address *" icon="mail-outline" value={form.email} onChange={v => set('email', v)} placeholder="you@email.com" keyboard="email-address" focusedField={focusedField} setFocusedField={setFocusedField} />
            )}

            {/* Password */}
            {tab !== 'phone' && (
              <View style={S.fw}>
                <View style={S.passLabelRow}>
                  <Text style={S.flabel}>Password *</Text>
                  {tab === 'login' && (
                    <TouchableOpacity onPress={() => setForgotVisible(true)}>
                      <Text style={S.forgotLink}>Forgot?</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={[S.irow, focusedField === 'pass' && S.irowF]}>
                  <Ionicons name="lock-closed-outline" size={16} color={focusedField === 'pass' ? ORANGE : TEXT_DIM} style={S.ficon} />
                  <TextInput
                    style={S.tinput}
                    value={form.password}
                    onChangeText={v => set('password', v)}
                    placeholder="Enter password"
                    placeholderTextColor="#c5c3bb"
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                    onFocus={() => setFocusedField('pass')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity onPress={() => setShowPass(p => !p)} style={S.eyeBtn}>
                    <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={17} color={TEXT_DIM} />
                  </TouchableOpacity>
                </View>
                {tab === 'register' && form.password.length > 0 && (
                  <View style={{ marginTop: 6 }}>
                    <View style={S.strTrack}>
                      {[0,1,2,3].map(i => (
                        <View key={i} style={[S.strSeg, { backgroundColor: i < pwStrength.score ? pwStrength.color : BORDER }]} />
                      ))}
                    </View>
                    <Text style={[S.strLabel, { color: pwStrength.color }]}>{pwStrength.label}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Register extras */}
            {tab === 'register' && (
              <>
                <View style={S.fw}>
                  <Text style={S.flabel}>Confirm Password *</Text>
                  <View style={[S.irow, focusedField === 'conf' && S.irowF]}>
                    <Ionicons name="shield-checkmark-outline" size={16} color={focusedField === 'conf' ? ORANGE : TEXT_DIM} style={S.ficon} />
                    <TextInput
                      style={S.tinput}
                      value={form.confirmPassword}
                      onChangeText={v => set('confirmPassword', v)}
                      placeholder="Re-enter password"
                      placeholderTextColor="#c5c3bb"
                      secureTextEntry={!showConfirm}
                      autoCapitalize="none"
                      onFocus={() => setFocusedField('conf')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TouchableOpacity onPress={() => setShowConfirm(p => !p)} style={S.eyeBtn}>
                      <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={17} color={TEXT_DIM} />
                    </TouchableOpacity>
                  </View>
                  {form.confirmPassword.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
                      <Ionicons
                        name={form.password === form.confirmPassword ? 'checkmark-circle' : 'close-circle'}
                        size={13}
                        color={form.password === form.confirmPassword ? SUCCESS : DANGER}
                      />
                      <Text style={{ fontSize: 11, color: form.password === form.confirmPassword ? SUCCESS : DANGER, marginLeft: 4 }}>
                        {form.password === form.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                      </Text>
                    </View>
                  )}
                </View>

                <Field fkey="regPhone" label="Phone (optional)" icon="call-outline" value={form.phone} onChange={v => set('phone', v)} placeholder="+91 XXXXXXXXXX" keyboard="phone-pad" focusedField={focusedField} setFocusedField={setFocusedField} />

                <TouchableOpacity style={S.termsRow} onPress={() => setTermsAccepted(p => !p)} activeOpacity={0.8}>
                  <View style={[S.chk, termsAccepted && S.chkOn]}>
                    {termsAccepted && <Ionicons name="checkmark" size={11} color="#fff" />}
                  </View>
                  <Text style={S.termsTxt}>
                    I agree to the <Text style={S.termsLink}>Terms of Service</Text> and <Text style={S.termsLink}>Privacy Policy</Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Phone OTP */}
            {tab === 'phone' && (
              <View>
                <View style={S.fw}>
                  <Text style={S.flabel}>Mobile Number *</Text>
                  <View style={[S.irow, focusedField === 'otpPhone' && S.irowF]}>
                    <Text style={S.flagPfx}>🇮🇳 +91</Text>
                    <TextInput
                      style={[S.tinput, { paddingLeft: 4 }]}
                      value={otpPhone}
                      onChangeText={v => { setOtpPhone(v); setOtpSent(false); setOtp(''); setOtpConfirmation(null); }}
                      placeholder="10-digit number"
                      placeholderTextColor="#c5c3bb"
                      keyboardType="phone-pad"
                      maxLength={10}
                      editable={!otpSent}
                      onFocus={() => setFocusedField('otpPhone')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>
                {otpSent && (
                  <View style={S.fw}>
                    <Text style={S.flabel}>Enter OTP</Text>
                    <View style={[S.irow, focusedField === 'otpCode' && S.irowF]}>
                      <Ionicons name="keypad-outline" size={16} color={focusedField === 'otpCode' ? ORANGE : TEXT_DIM} style={S.ficon} />
                      <TextInput
                        style={S.tinput}
                        value={otp}
                        onChangeText={setOtp}
                        placeholder="4–6 digit OTP"
                        placeholderTextColor="#c5c3bb"
                        keyboardType="number-pad"
                        maxLength={6}
                        onFocus={() => setFocusedField('otpCode')}
                        onBlur={() => setFocusedField(null)}
                      />
                    </View>
                    <TouchableOpacity onPress={handleSendOTP} style={{ marginTop: 4 }}>
                      <Text style={S.resendTxt}>Didn't receive? <Text style={{ color: ORANGE, fontWeight: '700' }}>Resend OTP</Text></Text>
                    </TouchableOpacity>
                  </View>
                )}
                <View style={S.otpInfo}>
                  <Ionicons name="shield-checkmark-outline" size={14} color={SUCCESS} style={{ marginRight: 8 }} />
                  <Text style={S.otpInfoTxt}>OTP sent via SMS · Powered by Firebase</Text>
                </View>
              </View>
            )}

            {/* Error */}
            {!!error && (
              <View style={S.errBox}>
                <Ionicons name="alert-circle" size={15} color={DANGER} />
                <Text style={S.errTxt}>{error}</Text>
              </View>
            )}

            {/* Submit */}
            {loading ? (
              <View style={S.loadRow}>
                <ActivityIndicator size="small" color={ORANGE} />
                <Text style={{ color: TEXT_MID, fontSize: 13, marginLeft: 10 }}>Please wait…</Text>
              </View>
            ) : (
              <>
                {tab === 'login' && (
                  <TouchableOpacity style={S.submitBtn} onPress={handleSubmit} activeOpacity={0.87}>
                    <Text style={S.submitTxt}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </TouchableOpacity>
                )}
                {tab === 'register' && (
                  <TouchableOpacity style={S.submitBtn} onPress={handleSubmit} activeOpacity={0.87}>
                    <Text style={S.submitTxt}>Create Account</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </TouchableOpacity>
                )}
                {tab === 'phone' && (
                  <TouchableOpacity style={S.submitBtn} onPress={otpSent ? handleVerifyOTP : handleSendOTP} activeOpacity={0.87}>
                    <Ionicons name={otpSent ? 'checkmark-circle-outline' : 'send-outline'} size={18} color="#fff" />
                    <Text style={S.submitTxt}>{otpSent ? 'Verify OTP' : 'Send OTP'}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Biometric */}
            {tab === 'login' && biometricAvailable && !IS_WEB && (
              <TouchableOpacity style={S.bioBtn} onPress={handleBiometric} activeOpacity={0.8}>
                <Ionicons name="finger-print-outline" size={20} color={ORANGE} />
                <Text style={S.bioTxt}>Sign in with Biometrics</Text>
              </TouchableOpacity>
            )}

            {/* Switch tab link */}
            <View style={S.switchRow}>
              {tab === 'login' && (
                <><Text style={S.switchTxt}>New here? </Text><TouchableOpacity onPress={() => switchTab('register')}><Text style={S.switchLink}>Create account →</Text></TouchableOpacity></>
              )}
              {tab === 'register' && (
                <><Text style={S.switchTxt}>Have an account? </Text><TouchableOpacity onPress={() => switchTab('login')}><Text style={S.switchLink}>Sign in →</Text></TouchableOpacity></>
              )}
              {tab === 'phone' && (
                <><Text style={S.switchTxt}>Prefer email? </Text><TouchableOpacity onPress={() => switchTab('login')}><Text style={S.switchLink}>Sign in with email →</Text></TouchableOpacity></>
              )}
            </View>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── FORGOT PASSWORD MODAL ── */}
      <Modal
        visible={forgotVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setForgotVisible(false); setForgotDone(false); setForgotEmail(''); }}
      >
        <View style={S.modalOverlay}>
          <View style={S.modalCard}>
            <View style={S.modalHandle} />
            <TouchableOpacity style={S.modalClose} onPress={() => { setForgotVisible(false); setForgotDone(false); setForgotEmail(''); }}>
              <Ionicons name="close" size={20} color={TEXT_DIM} />
            </TouchableOpacity>

            {forgotDone ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <View style={S.successRing}>
                  <Ionicons name="checkmark" size={30} color={SUCCESS} />
                </View>
                <Text style={S.modalTitle}>Email Sent!</Text>
                <Text style={S.modalSub}>Check your inbox for a password reset link. Expires in 1 hour.</Text>
                <TouchableOpacity
                  style={[S.submitBtn, { marginTop: 24, marginHorizontal: 0, width: '100%' }]}
                  onPress={() => { setForgotVisible(false); setForgotDone(false); setForgotEmail(''); }}
                >
                  <Text style={S.submitTxt}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={S.modalIcon}>
                  <Ionicons name="key-outline" size={26} color={ORANGE} />
                </View>
                <Text style={S.modalTitle}>Reset Password</Text>
                <Text style={S.modalSub}>Enter your registered email and we'll send a reset link.</Text>
                <View style={[S.fw, { marginHorizontal: 0, marginTop: 18 }]}>
                  <Text style={S.flabel}>Email Address</Text>
                  <View style={[S.irow, focusedField === 'fgEmail' && S.irowF]}>
                    <Ionicons name="mail-outline" size={16} color={focusedField === 'fgEmail' ? ORANGE : TEXT_DIM} style={S.ficon} />
                    <TextInput
                      style={S.tinput}
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      placeholder="you@email.com"
                      placeholderTextColor="#c5c3bb"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onFocus={() => setFocusedField('fgEmail')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>
                {forgotLoading ? (
                  <ActivityIndicator size="small" color={ORANGE} style={{ marginTop: 14 }} />
                ) : (
                  <TouchableOpacity style={[S.submitBtn, { marginTop: 6, marginHorizontal: 0 }]} onPress={handleForgotPassword} activeOpacity={0.87}>
                    <Ionicons name="paper-plane-outline" size={17} color="#fff" />
                    <Text style={S.submitTxt}>Send Reset Link</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── StyleSheet ────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  bg:     { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: IS_WEB ? 24 : 18 },

  dline1: { position: 'absolute', width: 1.5, height: '50%', backgroundColor: 'rgba(249,115,22,0.07)', top: '10%', left: '10%', transform: [{ rotate: '18deg' }] },
  dline2: { position: 'absolute', width: 1,   height: '34%', backgroundColor: 'rgba(249,115,22,0.05)', bottom: '6%', right: '16%', transform: [{ rotate: '-22deg' }] },

  // Logo
  logoWrap:  { alignItems: 'center', marginBottom: 28 },
  pulseWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  pulseRing: {
    position: 'absolute', width: 88, height: 88, borderRadius: 44,
    borderWidth: 2, borderColor: 'rgba(249,115,22,0.5)',
  },
  logoMark: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ORANGE, shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  netLine: {
    position: 'absolute', height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 1,
  },
  netNode: {
    position: 'absolute', width: 9, height: 9, borderRadius: 4.5,
    backgroundColor: '#fff',
  },
  netAccent: {
    position: 'absolute', width: 3.5, height: 3.5, borderRadius: 2,
    backgroundColor: ORANGE2,
  },
  logoName:  { fontSize: 30, fontWeight: '900', letterSpacing: 0.3, marginBottom: 6 },
  tagRow:    { flexDirection: 'row', alignItems: 'center', gap: 7 },
  tagDot:    { width: 4, height: 4, borderRadius: 2, backgroundColor: ORANGE },
  tagline:   { color: TEXT_DIM, fontSize: 12, fontWeight: '500', letterSpacing: 0.4 },

  // Card
  card: {
    backgroundColor: CARD, borderRadius: 24, width: '100%', maxWidth: 440,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12,
  },
  accentBar: { height: 3, backgroundColor: ORANGE },

  // Tabs
  tabRow:    { flexDirection: 'row', backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER, position: 'relative', paddingTop: 4 },
  tabSlider: { position: 'absolute', bottom: 0, height: 2.5, backgroundColor: ORANGE, borderRadius: 2 },
  tabBtn:    { flex: 1, paddingVertical: 12, alignItems: 'center', gap: 3 },
  tabTxt:    { fontSize: 11.5, fontWeight: '600', color: TEXT_DIM },
  tabTxtOn:  { color: TEXT, fontWeight: '800' },

  // Google
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingVertical: 13,
    backgroundColor: CARD, marginHorizontal: 20, marginTop: 20,
  },
  googleTxt: { fontSize: 14, fontWeight: '700', color: TEXT },

  // Divider
  divRow:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginVertical: 14, gap: 10 },
  divLine: { flex: 1, height: 1, backgroundColor: BORDER },
  divTxt:  { fontSize: 11, color: TEXT_DIM, fontWeight: '500' },

  // Fields
  fw:          { marginHorizontal: 20, marginBottom: 14 },
  flabel:      { fontSize: 12, fontWeight: '700', color: TEXT_MID, marginBottom: 7, letterSpacing: 0.2 },
  passLabelRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  forgotLink:  { fontSize: 12, fontWeight: '700', color: ORANGE },
  irow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 13,
    backgroundColor: '#fff', paddingHorizontal: 13, minHeight: 50,
  },
  irowF:   { borderColor: BORDER_FOC, backgroundColor: ORANGE_SOFT },
  ficon:   { marginRight: 9 },
  tinput:  { flex: 1, paddingVertical: 12, fontSize: 14, color: TEXT },
  eyeBtn:  { padding: 5 },
  flagPfx: { fontSize: 14, color: TEXT_MID, fontWeight: '600', marginRight: 8 },

  // Password strength
  strTrack: { flexDirection: 'row', gap: 4, marginTop: 5 },
  strSeg:   { flex: 1, height: 3, borderRadius: 2 },
  strLabel: { fontSize: 10.5, fontWeight: '700', marginTop: 4 },

  // Terms
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 20, marginBottom: 16, gap: 10 },
  chk:      { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', marginTop: 1, backgroundColor: '#fff' },
  chkOn:    { backgroundColor: ORANGE, borderColor: ORANGE },
  termsTxt: { fontSize: 12, color: TEXT_DIM, flex: 1, lineHeight: 18 },
  termsLink:{ color: ORANGE, fontWeight: '700' },

  // OTP
  otpInfo:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, marginHorizontal: 20, marginBottom: 14 },
  otpInfoTxt: { fontSize: 12, color: '#15803d', flex: 1 },
  resendTxt:  { fontSize: 12, color: TEXT_DIM, marginTop: 4 },

  // Error
  errBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef2f2', borderRadius: 12, padding: 12,
    marginHorizontal: 20, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(220,38,38,0.2)',
  },
  errTxt: { color: DANGER, fontSize: 13, fontWeight: '600', flex: 1 },

  // Loading
  loadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, marginHorizontal: 20 },

  // Submit
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: TEXT, borderRadius: 14, paddingVertical: 15, marginHorizontal: 20,
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 8,
  },
  submitTxt: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },

  // Biometric
  bioBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: 'rgba(249,115,22,0.3)',
    backgroundColor: ORANGE_SOFT,
    borderRadius: 14, paddingVertical: 12, marginHorizontal: 20, marginTop: 12,
  },
  bioTxt: { color: ORANGE, fontWeight: '700', fontSize: 13 },

  // Switch
  switchRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 18, marginBottom: 20, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: BORDER, marginHorizontal: 20,
  },
  switchTxt:  { fontSize: 13, color: TEXT_DIM },
  switchLink: { fontSize: 13, fontWeight: '800', color: ORANGE },

  // Trust badges
  badgeRow: { flexDirection: 'row', marginTop: 22, gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  badge:    { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(249,115,22,0.06)', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 13, borderWidth: 1, borderColor: 'rgba(249,115,22,0.14)' },
  badgeTxt: { color: TEXT_MID, fontSize: 11, fontWeight: '600' },

  footerTxt: { color: TEXT_DIM, fontSize: 11, marginTop: 12, letterSpacing: 0.4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: CARD, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 44, borderTopWidth: 1, borderColor: BORDER },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 22 },
  modalClose:   { position: 'absolute', top: 20, right: 22, zIndex: 10 },
  modalIcon:    { width: 56, height: 56, backgroundColor: ORANGE_SOFT, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)' },
  modalTitle:   { fontSize: 22, fontWeight: '900', color: TEXT, marginBottom: 6 },
  modalSub:     { fontSize: 13, color: TEXT_DIM, lineHeight: 19, marginBottom: 4 },
  successRing:  { width: 68, height: 68, borderRadius: 34, backgroundColor: '#f0fdf4', borderWidth: 2, borderColor: 'rgba(22,163,74,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
});
