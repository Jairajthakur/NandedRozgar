/**
 * CityPlus — LoginScreen.js
 * FIX: Google Sign-In now works on BOTH web (Firebase popup) and native Android/iOS.
 * FIXED: loginWithGoogle now receives explicit isIdToken flag — no more dot-count heuristic.
 *   Native path: loginWithGoogle(idToken, true)   → backend uses idToken verification
 *   Web path:    loginWithGoogle(accessToken, false) → backend uses userinfo verification
 * Root cause: @react-native-google-signin/google-signin requires Google Play Services
 * which is not available in web browsers — replaced with Firebase web signInWithPopup.
 *
 * FIX 2: firebaseConfig now reads authDomain and projectId from env vars instead of
 * hardcoded wrong values ('cityplus' projectId caused silent Firebase init failure).
 * Also requires:
 *   1. Add thecityplus.in to Firebase Console → Authentication → Settings → Authorized Domains
 *   2. Add https://thecityplus.in to Google Cloud Console → Credentials → Authorized JS Origins
 *   3. Add https://thecityplus.in/__/auth/handler to Authorized Redirect URIs
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, StatusBar,
  Animated, Easing, Modal, TextInput, ActivityIndicator,
  Dimensions, Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

import { useAuth } from '../context/AuthContext';

// ── Native Google Sign-In (Android/iOS only — NOT imported on web) ─────────────
// We do a lazy conditional import so the web bundle never tries to load the
// native module (which would crash the web build immediately).
let GoogleSignin = null;
let statusCodes  = null;
if (Platform.OS !== 'web') {
  const gsModule = require('@react-native-google-signin/google-signin');
  GoogleSignin   = gsModule.GoogleSignin;
  statusCodes    = gsModule.statusCodes;
}

// ── Firebase Web SDK (web only) ───────────────────────────────────────────────
// Only initialised when running in a browser. Tree-shaken on native.
let _webAuth            = null;
let GoogleAuthProvider  = null;
let signInWithPopup     = null;
let signInWithRedirect    = null;
let getRedirectResult     = null;
let setPersistence        = null;
let browserLocalPersistence = null;

// FIX v5: Firebase is NOT initialized on web.
// Firebase Auth on web internally registers its own Google OAuth client
// (project 947711...) via the firebaseapp.com auth domain, which conflicts
// with our client ID and causes 'deleted_client' errors.
// On web we use Google Identity Services (GSI) directly — no Firebase needed.
// Firebase is only used on native (Android/iOS) via @react-native-google-signin.
if (Platform.OS !== 'web') {
  // Native only — Firebase not needed on web
}

WebBrowser.maybeCompleteAuthSession();

// Read from env vars set in eas.json (fallback to hardcoded for local dev)
const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  '1012993473745-iiur989ghkd2pjsu9uuoc6ckqupkevoc.apps.googleusercontent.com';

// ── Brand tokens ──────────────────────────────────────────────────────────────
const ORANGE      = '#f97316';
const ORANGE_SOFT = '#fff7ed';
const BG          = '#fbf9f6';
const CARD        = '#ffffff';
const BORDER      = '#e8e4dd';
const BORDER_FOC  = '#f97316';
const TEXT        = '#1a1a18';
const TEXT_DIM    = '#888780';
const TEXT_MID    = '#5f5e5a';
const SURFACE     = '#f4f2ee';
const SUCCESS     = '#16a34a';
const DANGER      = '#dc2626';

const { width: SW, height: SH } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'login',    label: 'Sign In',  icon: 'log-in-outline' },
  { key: 'register', label: 'Register', icon: 'person-add-outline' },
];

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
          Animated.timing(y,  { toValue: -18,  duration, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(y,  { toValue: 0,    duration, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
        ]),
        Animated.sequence([
          Animated.timing(x,  { toValue: 10,   duration: duration * 1.3, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(x,  { toValue: 0,    duration: duration * 1.3, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
        ]),
        Animated.sequence([
          Animated.timing(sc, { toValue: 1.08, duration: duration * 0.9, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(sc, { toValue: 1,    duration: duration * 0.9, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
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

// ── Field ─────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const {
    login, register, loginWithGoogle,
    forgotPassword,
  } = useAuth();

  const [tab, setTab]                     = useState('login');
  const [form, setForm]                   = useState({ email: '', password: '', name: '', phone: '', confirmPassword: '' });
  const [loading, setLoading]             = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]                 = useState('');
  const [showPass, setShowPass]           = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotEmail, setForgotEmail]     = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotDone, setForgotDone]       = useState(false);
  const [focusedField, setFocusedField]   = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Entrance animations ───────────────────────────────────────────────────
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoY       = useRef(new Animated.Value(-24)).current;
  const logoScale   = useRef(new Animated.Value(0.85)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardY       = useRef(new Animated.Value(40)).current;
  const shake       = useRef(new Animated.Value(0)).current;
  const tabX        = useRef(new Animated.Value(0)).current;
  const pulse       = useRef(new Animated.Value(1)).current;
  const pulseOp     = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale,   { toValue: 1, damping: 13, stiffness: 130, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(logoY,       { toValue: 0, duration: 380, easing: Easing.out(Easing.back(1.1)), useNativeDriver: Platform.OS !== 'web' }),
      ]),
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(cardY,       { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse,   { toValue: 1.7, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(pulseOp, { toValue: 0,   duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        ]),
        Animated.parallel([
          Animated.timing(pulse,   { toValue: 1, duration: 0, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(pulseOp, { toValue: 0.6, duration: 0, useNativeDriver: Platform.OS !== 'web' }),
        ]),
        Animated.delay(800),
      ])
    ).start();

    // Configure native Google Sign-In on Android/iOS only
    if (!IS_WEB && GoogleSignin) {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        offlineAccess: false,
      });
    }
  }, []);

  // ── Google Sign-In via GIS (Google Identity Services) on web ────────────────
  // FIX v4: Neither Firebase signInWithPopup nor signInWithRedirect work reliably
  // on deployed web (popup blocked by Brave/Chrome shields; redirect broken by
  // cross-origin iframe restrictions in Chrome 115+).
  //
  // Solution: Use Google Identity Services (GSI) tokenClient directly.
  // GSI opens Google's OWN first-party popup — browsers never block it.
  // The access token is returned directly in a JS callback, no redirect needed.
  //
  // On mount, inject the GSI script and initialise the token client.
  // handleGooglePress() calls tokenClient.requestAccessToken() to open the popup.
  const gsiClientRef = useRef(null);

  useEffect(() => {
    if (!IS_WEB) return;

    // Inject GSI script if not already present
    if (!document.getElementById('gsi-script')) {
      const script = document.createElement('script');
      script.id  = 'gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => initGsiClient();
      document.head.appendChild(script);
    } else if (window.google?.accounts?.oauth2) {
      initGsiClient();
    }

    function initGsiClient() {
      gsiClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_WEB_CLIENT_ID,
        scope: 'openid profile email',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            setError('Google sign-in failed: ' + tokenResponse.error);
            triggerShake();
            setGoogleLoading(false);
            return;
          }
          const accessToken = tokenResponse.access_token;
          if (!accessToken) {
            setError('Google sign-in failed: no token returned.');
            triggerShake();
            setGoogleLoading(false);
            return;
          }
          console.log('[GSI] got access token, sending to backend...');
          const r = await loginWithGoogle(accessToken, false);
          setGoogleLoading(false);
          if (!r?.ok) { setError(r?.error || 'Google sign-in failed'); triggerShake(); }
        },
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function triggerShake() {
    shake.setValue(0);
    Animated.sequence(
      [-10, 10, -7, 7, -4, 4, 0].map(v =>
        Animated.timing(shake, { toValue: v, duration: 48, useNativeDriver: Platform.OS !== 'web' })
      )
    ).start();
  }

  function switchTab(t) {
    const idx = TABS.findIndex(x => x.key === t);
    Animated.spring(tabX, { toValue: idx, damping: 18, stiffness: 220, useNativeDriver: false }).start();
    setTab(t); setError(''); setFocusedField(null);
  }

  const tabCount = TABS.length;
  const tabLeft  = tabX.interpolate({
    inputRange:  TABS.map((_, i) => i),
    outputRange: TABS.map((_, i) => `${(i / tabCount) * 100}%`),
  });

  // ── Google Sign-In handler ────────────────────────────────────────────────
  // Routes to Firebase popup on web, native GoogleSignin SDK on Android/iOS.
  async function handleGooglePress() {
    setError('');
    setGoogleLoading(true);

    try {
      // ── WEB: Google Identity Services (GSI) token client ──────────────────────
      // FIX v4: Uses GSI initTokenClient which opens Google's own first-party
      // popup — never blocked by browser shields. No Firebase, no redirect.
      if (IS_WEB) {
        if (!gsiClientRef.current) {
          setError('Google Sign-In is not ready yet. Please try again in a moment.');
          triggerShake();
          setGoogleLoading(false);
          return;
        }
        // requestAccessToken() opens Google's first-party account picker popup.
        // The callback set in useEffect handles the token and calls loginWithGoogle.
        gsiClientRef.current.requestAccessToken({ prompt: 'select_account' });
        return;
      }

      // ── NATIVE: @react-native-google-signin (Android/iOS only) ───────────
      if (!GoogleSignin) {
        setError('Google Sign-In is not available on this platform.');
        triggerShake();
        setGoogleLoading(false);
        return;
      }

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      // v14 API: signIn() returns { type, data } instead of throwing for cancel
      if (!response || response.type === 'cancelled' || response.type === 'noSavedCredentialFound') {
        setGoogleLoading(false);
        return; // silent — user dismissed the picker
      }

      if (response.type !== 'success') {
        setError(`Sign-in failed (type: ${response.type})`);
        triggerShake();
        setGoogleLoading(false);
        return;
      }

      const idToken = response?.data?.idToken ?? response?.idToken;
      if (!idToken) {
        setError('Google config error: no ID token. Check webClientId in eas.json.');
        triggerShake();
        setGoogleLoading(false);
        return;
      }

      // Explicitly pass true (isIdToken) so AuthContext sends { idToken } to the backend.
      const r = await loginWithGoogle(idToken, true);
      setGoogleLoading(false);
      if (!r?.ok) {
        setError(r?.error || 'Google sign-in failed');
        triggerShake();
      }

    } catch (e) {
      const code = e.code ?? 'unknown';
      const msg  = e.message ?? 'Unknown error';
      console.warn('[Google SignIn Error]', 'code:', code, 'message:', msg);

      // Web popup errors
      if (IS_WEB) {
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          // User closed popup — silent
        } else if (code === 'auth/popup-blocked') {
          setError('Popup was blocked by your browser. Please allow popups for this site and try again.');
          triggerShake();
        } else if (code === 'auth/unauthorized-domain') {
          setError('This domain is not authorised for Google Sign-In. Please contact support.');
          triggerShake();
        } else {
          setError(`Google sign-in failed: ${msg}`);
          triggerShake();
        }
        setGoogleLoading(false);
        return;
      }

      // Native errors
      if (statusCodes) {
        if (e.code === statusCodes.SIGN_IN_CANCELLED) {
          // silent
        } else if (e.code === statusCodes.IN_PROGRESS) {
          setError('Sign-in already in progress.');
          triggerShake();
        } else if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          setError('Google Play Services not available. Please update Google Play Services.');
          triggerShake();
        } else if (String(e.code) === '10' || String(msg).includes('DEVELOPER_ERROR')) {
          setError('Google config error (code 10): SHA-1 fingerprint or package name mismatch. Rebuild required.');
          triggerShake();
        } else {
          setError(`Google sign-in failed (code: ${code}). ${msg}`);
          triggerShake();
        }
      } else {
        setError(`Google sign-in failed: ${msg}`);
        triggerShake();
      }
      setGoogleLoading(false);
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setError('');
    if (tab === 'login') {
      if (!form.email || !form.password) { setError('Enter email and password'); triggerShake(); return; }
      setLoading(true);
      const r = await login(form.email.trim().toLowerCase(), form.password);
      setLoading(false);
      if (!r?.ok) { setError(r?.error || 'Login failed'); triggerShake(); }
    } else {
      if (!form.name || !form.email || !form.password) { setError('Fill all required fields'); triggerShake(); return; }
      if (form.password.length < 8)                    { setError('Password must be at least 8 characters'); triggerShake(); return; }
      if (form.password !== form.confirmPassword)       { setError('Passwords do not match'); triggerShake(); return; }
      if (!termsAccepted)                              { setError('Please accept Terms & Privacy Policy'); triggerShake(); return; }
      if (getPasswordStrength(form.password).score < 2) { setError('Password too weak — add numbers & symbols'); triggerShake(); return; }
      setLoading(true);
      const r = await register({
        name:     form.name.trim(),
        email:    form.email.trim().toLowerCase(),
        password: form.password,
        role:     'user',
        phone:    form.phone || undefined,
      });
      setLoading(false);
      if (!r?.ok) { setError(r?.error || 'Registration failed'); triggerShake(); }
    }
  }

  // ── Forgot password ───────────────────────────────────────────────────────
  async function handleForgotPassword() {
    if (!forgotEmail) { setError('Please enter your email address'); return; }
    setForgotLoading(true);
    const r = await forgotPassword(forgotEmail.trim().toLowerCase());
    setForgotLoading(false);
    if (r?.ok === false) {
      setError(r.error || 'Failed to send reset email. Please try again.');
    } else {
      setForgotDone(true);
    }
  }

  const pwStrength = getPasswordStrength(form.password);
  const tabW = `${100 / tabCount}%`;
  const isGoogleBusy = googleLoading || loading;

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
                <Image
                  source={require('../../assets/icon.png')}
                  style={{ width: 52, height: 52, borderRadius: 14 }}
                  resizeMode="contain"
                />
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
            <TouchableOpacity
              style={[S.googleBtn, isGoogleBusy && { opacity: 0.55 }]}
              onPress={handleGooglePress}
              disabled={isGoogleBusy}
              activeOpacity={0.82}
            >
              {googleLoading
                ? <ActivityIndicator size="small" color="#EA4335" />
                : <MaterialCommunityIcons name="google" size={18} color="#EA4335" />
              }
              <Text style={S.googleTxt}>
                {googleLoading
                  ? 'Connecting…'
                  : tab === 'login' ? 'Continue with Google' : 'Sign up with Google'
                }
              </Text>
            </TouchableOpacity>

            {/* DIVIDER */}
            <View style={S.divRow}>
              <View style={S.divLine} /><Text style={S.divTxt}>or with email</Text><View style={S.divLine} />
            </View>

            {/* Register name */}
            {tab === 'register' && (
              <Field fkey="name" label="Full Name *" icon="person-outline" value={form.name} onChange={v => set('name', v)} placeholder="Your full name" focusedField={focusedField} setFocusedField={setFocusedField} />
            )}

            {/* Email */}
            <Field fkey="email" label="Email Address *" icon="mail-outline" value={form.email} onChange={v => set('email', v)} placeholder="you@email.com" keyboard="email-address" focusedField={focusedField} setFocusedField={setFocusedField} />

            {/* Password */}
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
              <TouchableOpacity style={S.submitBtn} onPress={handleSubmit} activeOpacity={0.87} disabled={isGoogleBusy}>
                <Text style={S.submitTxt}>{tab === 'login' ? 'Sign In' : 'Create Account'}</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            )}

            {/* Switch tab link */}
            <View style={S.switchRow}>
              {tab === 'login' ? (
                <><Text style={S.switchTxt}>New here? </Text><TouchableOpacity onPress={() => switchTab('register')}><Text style={S.switchLink}>Create account →</Text></TouchableOpacity></>
              ) : (
                <><Text style={S.switchTxt}>Have an account? </Text><TouchableOpacity onPress={() => switchTab('login')}><Text style={S.switchLink}>Sign in →</Text></TouchableOpacity></>
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

  logoWrap:  { alignItems: 'center', marginBottom: 28 },
  pulseWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  pulseRing: { position: 'absolute', width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: 'rgba(249,115,22,0.5)' },
  logoMark:  { width: 72, height: 72, borderRadius: 22, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', shadowColor: ORANGE, shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12, overflow: 'hidden' },
  logoName:  { fontSize: 30, fontWeight: '900', letterSpacing: 0.3, marginBottom: 6 },
  tagRow:    { flexDirection: 'row', alignItems: 'center', gap: 7 },
  tagDot:    { width: 4, height: 4, borderRadius: 2, backgroundColor: ORANGE },
  tagline:   { color: TEXT_DIM, fontSize: 12, fontWeight: '500', letterSpacing: 0.4 },

  card: { backgroundColor: CARD, borderRadius: 24, width: '100%', maxWidth: 440, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  accentBar: { height: 3, backgroundColor: ORANGE },

  tabRow:    { flexDirection: 'row', backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER, position: 'relative', paddingTop: 4 },
  tabSlider: { position: 'absolute', bottom: 0, height: 2.5, backgroundColor: ORANGE, borderRadius: 2 },
  tabBtn:    { flex: 1, paddingVertical: 12, alignItems: 'center', gap: 3 },
  tabTxt:    { fontSize: 11.5, fontWeight: '600', color: TEXT_DIM },
  tabTxtOn:  { color: TEXT, fontWeight: '800' },

  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingVertical: 13, backgroundColor: CARD, marginHorizontal: 20, marginTop: 20 },
  googleTxt: { fontSize: 14, fontWeight: '700', color: TEXT },

  divRow:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginVertical: 14, gap: 10 },
  divLine: { flex: 1, height: 1, backgroundColor: BORDER },
  divTxt:  { fontSize: 11, color: TEXT_DIM, fontWeight: '500' },

  fw:           { marginHorizontal: 20, marginBottom: 14 },
  flabel:       { fontSize: 12, fontWeight: '700', color: TEXT_MID, marginBottom: 7, letterSpacing: 0.2 },
  passLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  forgotLink:   { fontSize: 12, fontWeight: '700', color: ORANGE },
  irow:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BORDER, borderRadius: 13, backgroundColor: '#fff', paddingHorizontal: 13, minHeight: 50 },
  irowF:  { borderColor: BORDER_FOC, backgroundColor: ORANGE_SOFT },
  ficon:  { marginRight: 9 },
  tinput: { flex: 1, paddingVertical: 12, fontSize: 14, color: TEXT },
  eyeBtn: { padding: 5 },

  strTrack: { flexDirection: 'row', gap: 4, marginTop: 5 },
  strSeg:   { flex: 1, height: 3, borderRadius: 2 },
  strLabel: { fontSize: 10.5, fontWeight: '700', marginTop: 4 },

  termsRow:  { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 20, marginBottom: 16, gap: 10 },
  chk:       { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', marginTop: 1, backgroundColor: '#fff' },
  chkOn:     { backgroundColor: ORANGE, borderColor: ORANGE },
  termsTxt:  { fontSize: 12, color: TEXT_DIM, flex: 1, lineHeight: 18 },
  termsLink: { color: ORANGE, fontWeight: '700' },

  errBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef2f2', borderRadius: 12, padding: 12, marginHorizontal: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(220,38,38,0.2)' },
  errTxt: { color: DANGER, fontSize: 13, fontWeight: '600', flex: 1 },

  loadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, marginHorizontal: 20 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 15, marginHorizontal: 20, shadowColor: ORANGE, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  submitTxt: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },


  switchRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 18, marginBottom: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: BORDER, marginHorizontal: 20 },
  switchTxt:  { fontSize: 13, color: TEXT_DIM },
  switchLink: { fontSize: 13, fontWeight: '800', color: ORANGE },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: CARD, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 44, borderTopWidth: 1, borderColor: BORDER },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 22 },
  modalClose:   { position: 'absolute', top: 20, right: 22, zIndex: 10 },
  modalIcon:    { width: 56, height: 56, backgroundColor: ORANGE_SOFT, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)' },
  modalTitle:   { fontSize: 22, fontWeight: '900', color: TEXT, marginBottom: 6 },
  modalSub:     { fontSize: 13, color: TEXT_DIM, lineHeight: 19, marginBottom: 4 },
  successRing:  { width: 68, height: 68, borderRadius: 34, backgroundColor: '#f0fdf4', borderWidth: 2, borderColor: 'rgba(22,163,74,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
});
