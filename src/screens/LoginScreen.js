/**
 * CityPlus — LoginScreen.js
 *
 * Google Sign-In — NATIVE APK FIX via @react-native-google-signin/google-signin
 * ─────────────────────────────────────────────────────────────────────────────
 * Why expo-auth-session kept failing on APK:
 *   It opens a Chrome browser tab. Chrome cannot resolve the nanded:// custom
 *   scheme redirect → ERR_QUIC_PROTOCOL_ERROR.
 *   No browser-based OAuth works on Android APKs with custom schemes.
 *
 * This fix uses the NATIVE Google Sign-In SDK:
 *   • Shows Google's native account picker (no browser, no redirect URI)
 *   • Returns idToken directly to the app
 *   • Works with your existing Android OAuth client + SHA-1 in Google Console
 *
 * ─── ONE-TIME SETUP (must rebuild APK after) ─────────────────────────────────
 *   1.  npm install @react-native-google-signin/google-signin
 *
 *   2.  In app.config.js → plugins array, add:
 *         ["@react-native-google-signin/google-signin"]
 *
 *   3.  eas build --platform android --profile preview
 *
 * ─── GOOGLE CONSOLE — NO CHANGES NEEDED ──────────────────────────────────────
 *   Your Android client is already configured with your package name and
 *   SHA-1 fingerprint in the Google Cloud Console.
 *   Never commit SHA-1 fingerprints to source control — retrieve them with:
 *     eas credentials   (for EAS-managed keystore)
 *     keytool -list -v -keystore your.keystore  (for local keystore)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, StatusBar,
  Animated, Easing, Modal, TextInput, ActivityIndicator,
  Dimensions, Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
// GoogleSignin is a native-only module — guard against web/SSR environments
let GoogleSignin = null;
let statusCodes = {};
if (Platform.OS !== 'web') {
  try {
    const gs = require('@react-native-google-signin/google-signin');
    GoogleSignin = gs.GoogleSignin;
    statusCodes = gs.statusCodes;
  } catch (e) {
    console.warn('GoogleSignin not available:', e.message);
  }
}
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '../context/AuthContext';

// Configure once at module level.
// webClientId (Web Client ID) is required here — it tells Google which audience
// to embed in the idToken so your backend can verify it.
//
// Validates that the Google Web Client ID is real (not a placeholder or empty).
// A placeholder string is truthy, so the old `|| undefined` check didn't catch it,
// causing GoogleSignin.configure() to receive a fake ID → DEVELOPER_ERROR on signIn().
function _isValidClientId(id) {
  return (
    typeof id === 'string' &&
    id.length > 20 &&
    id.endsWith('.apps.googleusercontent.com') &&
    !id.startsWith('your_')
  );
}

if (GoogleSignin) {
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!_isValidClientId(googleWebClientId)) {
    console.warn(
      '[LoginScreen] EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set or is still the placeholder value. ' +
      'Google Sign-In will fail. Add the real Web Client ID to your eas.json env block ' +
      'or EAS Secrets (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxx.apps.googleusercontent.com).'
    );
  }
  GoogleSignin.configure({
    // Pass undefined when ID is missing/placeholder — a fake string causes DEVELOPER_ERROR.
    webClientId: _isValidClientId(googleWebClientId) ? googleWebClientId : undefined,
    offlineAccess: false,
    scopes: ['profile', 'email'],
  });
}

// ── Brand tokens ──────────────────────────────────────────────────────────────
const ORANGE      = '#f97316';
const ORANGE2     = '#fb923c';
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
    forgotPassword, loginWithBiometrics,
  } = useAuth();

  const [tab, setTab]                 = useState('login');
  const [form, setForm]               = useState({ email: '', password: '', name: '', phone: '', confirmPassword: '' });
  const [loading, setLoading]         = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]             = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotEmail, setForgotEmail]     = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotDone, setForgotDone]       = useState(false);
  const [focusedField, setFocusedField]   = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Google Sign-In — native SDK (@react-native-google-signin/google-signin) ─
  // GoogleSignin.configure() is called at module level above.
  // No browser, no redirect URI, no ERR_QUIC_PROTOCOL_ERROR.

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
  // WEB:    GSI script loaded dynamically → One Tap or renderButton popup
  //         → credential (idToken JWT) → backend /api/auth/google { idToken }
  // NATIVE: @react-native-google-signin SDK → idToken JWT → same backend route
  // NO /google/code endpoint needed — idToken works directly.
  async function handleGooglePress() {
    setError('');
    setGoogleLoading(true);

    // ── WEB ───────────────────────────────────────────────────────────────
    if (IS_WEB) {
      try {
        const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
        if (!clientId) {
          setError('Google client ID not configured.');
          setGoogleLoading(false);
          return;
        }

        // Load GSI script dynamically if not already present
        await new Promise((resolve, reject) => {
          if (window.google?.accounts?.id) { resolve(); return; }
          const prev = document.getElementById('gsi-script');
          if (prev) prev.remove();
          const s = document.createElement('script');
          s.id = 'gsi-script';
          s.src = 'https://accounts.google.com/gsi/client';
          s.async = true;
          s.defer = true;
          s.onload = resolve;
          s.onerror = () => reject(new Error('Failed to load Google Sign-In. Check your internet connection.'));
          document.head.appendChild(s);
        });

        // Give GSI a moment to initialise after load
        await new Promise(r => setTimeout(r, 200));

        if (!window.google?.accounts?.id) {
          setError('Google Sign-In failed to load. Please refresh the page.');
          setGoogleLoading(false);
          return;
        }

        // Get idToken via GSI — works for both One Tap and popup
        const idToken = await new Promise((resolve, reject) => {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
              if (response.error || !response.credential) {
                reject(new Error(response.error || 'No credential returned'));
              } else {
                resolve(response.credential); // credential IS the idToken JWT
              }
            },
            cancel_on_tap_outside: false,
            use_fedcm_for_prompt: false, // avoid FedCM deprecation warning
          });

          // Try One Tap prompt first
          window.google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
              // One Tap not available — render an invisible button and click it
              // This opens the full Google account picker popup
              const div = document.createElement('div');
              div.id = '__gsi_btn_container';
              div.style.cssText = 'position:absolute;opacity:0;pointer-events:none;';
              document.body.appendChild(div);

              window.google.accounts.id.renderButton(div, {
                type: 'standard',
                size: 'large',
                theme: 'outline',
                text: 'signin_with',
              });

              // Click the rendered button to open popup
              const btn = div.querySelector('[role="button"], button, div[tabindex]');
              if (btn) {
                btn.click();
              } else {
                document.body.removeChild(div);
                reject(new Error('Google Sign-In popup could not be opened. Try a different browser.'));
              }

              // Clean up container after popup resolves
              setTimeout(() => {
                const el = document.getElementById('__gsi_btn_container');
                if (el) document.body.removeChild(el);
              }, 30000);
            }
          });
        });

        await handleGoogleSuccess(idToken);

      } catch (err) {
        console.error('Web Google Sign-In error:', err);
        setError(err.message || 'Google sign-in failed. Please try again.');
        triggerShake();
        setGoogleLoading(false);
      }
      return;
    }

    // ── NATIVE (Android / iOS) ────────────────────────────────────────────
    if (!GoogleSignin) {
      setError('Google Sign-In is not available on this platform.');
      setGoogleLoading(false);
      return;
    }
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      // idToken is a signed JWT — backend verifies via Google tokeninfo
      const idToken = userInfo?.data?.idToken ?? userInfo?.idToken;
      if (!idToken) {
        setError('Google sign-in failed: no token returned.');
        triggerShake();
        setGoogleLoading(false);
        return;
      }
      await handleGoogleSuccess(idToken);
    } catch (err) {
      setGoogleLoading(false);
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled — silent
      } else if (err.code === statusCodes.IN_PROGRESS) {
        setError('Sign-in already in progress.');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services not available on this device.');
        triggerShake();
      } else if (err.code === 10 || (err.message || '').toLowerCase().includes('developer_error')) {
        // DEVELOPER_ERROR (code 10): SHA-1 fingerprint or package name mismatch in Google Console,
        // or EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is wrong/not set in eas.json env block.
        console.error('GoogleSignin DEVELOPER_ERROR:', err);
        setError('Google Sign-In is not configured correctly. Contact support.');
        triggerShake();
      } else {
        console.error('GoogleSignin error:', err);
        setError('Google sign-in failed. Please try again.');
        triggerShake();
      }
    }
  }

  async function handleGoogleSuccess(idToken) {
    setError('');
    const r = await loginWithGoogle(idToken);
    setGoogleLoading(false);
    if (!r?.ok) {
      setError(r?.error || 'Google sign-in failed');
      triggerShake();
    }
  }

  // ── Biometric ─────────────────────────────────────────────────────────────
  async function handleBiometric() {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Verify your identity',
      fallbackLabel: 'Use password',
    });
    if (res.success) {
      setLoading(true);
      const r = await loginWithBiometrics();
      setLoading(false);
      if (!r?.ok) setError(r?.error || 'Biometric sign-in failed');
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

            {/* Biometric */}
            {tab === 'login' && biometricAvailable && !IS_WEB && (
              <TouchableOpacity style={S.bioBtn} onPress={handleBiometric} activeOpacity={0.8} disabled={isGoogleBusy}>
                <Ionicons name="finger-print-outline" size={20} color={ORANGE} />
                <Text style={S.bioTxt}>Sign in with Biometrics</Text>
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

  termsRow: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 20, marginBottom: 16, gap: 10 },
  chk:      { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', marginTop: 1, backgroundColor: '#fff' },
  chkOn:    { backgroundColor: ORANGE, borderColor: ORANGE },
  termsTxt: { fontSize: 12, color: TEXT_DIM, flex: 1, lineHeight: 18 },
  termsLink: { color: ORANGE, fontWeight: '700' },

  errBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef2f2', borderRadius: 12, padding: 12, marginHorizontal: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(220,38,38,0.2)' },
  errTxt: { color: DANGER, fontSize: 13, fontWeight: '600', flex: 1 },

  loadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, marginHorizontal: 20 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 15, marginHorizontal: 20, shadowColor: ORANGE, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  submitTxt: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },

  bioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: 'rgba(249,115,22,0.3)', backgroundColor: ORANGE_SOFT, borderRadius: 14, paddingVertical: 12, marginHorizontal: 20, marginTop: 12 },
  bioTxt: { color: ORANGE, fontWeight: '700', fontSize: 13 },

  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 18, marginBottom: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: BORDER, marginHorizontal: 20 },
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
