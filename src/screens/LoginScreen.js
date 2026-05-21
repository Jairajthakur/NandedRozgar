/**
 * LokalLoop — LoginScreen.js
 * Secure auth: Email/Password + Google OAuth + Phone OTP + Biometrics + Forgot Password
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, StatusBar,
  Animated, Easing, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '../context/AuthContext';
import { Input, Btn, Spinner } from '../components/UI';

WebBrowser.maybeCompleteAuthSession();

// ── Constants ────────────────────────────────────────────────────────────────
const ORANGE = '#f97316';
const BG     = '#0f0f0f';
const CARD   = '#1a1a1a';

// Google OAuth discovery
const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint:         'https://oauth2.googleapis.com/token',
  revocationEndpoint:    'https://oauth2.googleapis.com/revoke',
};

// Password strength helper
function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '#e5e5e5' };
  let score = 0;
  if (pw.length >= 8)              score++;
  if (/[A-Z]/.test(pw))           score++;
  if (/[0-9]/.test(pw))           score++;
  if (/[^A-Za-z0-9]/.test(pw))   score++;
  const map = [
    { label: 'Very Weak', color: '#ef4444' },
    { label: 'Weak',      color: '#f97316' },
    { label: 'Fair',      color: '#eab308' },
    { label: 'Strong',    color: '#22c55e' },
    { label: 'Very Strong', color: '#16a34a' },
  ];
  return { score, ...map[score] };
}

// ── Tab values ────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'login',    label: 'Sign In' },
  { key: 'register', label: 'Register' },
  { key: 'phone',    label: 'Phone OTP' },
];

export default function LoginScreen() {
  const { login, register, loginWithGoogle, sendOTP, verifyOTP, forgotPassword, loginWithBiometrics } = useAuth();
  const [tab, setTab]       = useState('login');
  const [form, setForm]     = useState({ email: '', password: '', name: '', phone: '', confirmPassword: '' });
  const [otpPhone, setOtpPhone] = useState('');
  const [otp, setOtp]       = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpConfirmation, setOtpConfirmation] = useState(null); // Firebase confirmation object
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  // Forgot password modal
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotEmail, setForgotEmail]     = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotDone, setForgotDone]       = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Animations ───────────────────────────────────────────────────────────
  const logoScale   = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoY       = useRef(new Animated.Value(-24)).current;
  const boxY        = useRef(new Animated.Value(40)).current;
  const boxOpacity  = useRef(new Animated.Value(0)).current;
  const floatY      = useRef(new Animated.Value(0)).current;
  const shake       = useRef(new Animated.Value(0)).current;
  const tabX        = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale,   { toValue: 1, damping: 10, stiffness: 100, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(logoY,       { toValue: 0, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(boxY,       { toValue: 0, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(boxOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -7, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0,  duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    checkBiometrics();
  }, []);

  async function checkBiometrics() {
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
        Animated.timing(shake, { toValue: v, duration: 52, useNativeDriver: true })
      )
    ).start();
  }

  function switchTab(t) {
    const idx = TABS.findIndex(x => x.key === t);
    Animated.spring(tabX, { toValue: idx, damping: 16, stiffness: 200, useNativeDriver: false }).start();
    setTab(t);
    setError('');
    setOtpSent(false);
  }

  const tabLeft = tabX.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['0%', '33.33%', '66.66%'],
  });

  // ── Google OAuth ─────────────────────────────────────────────────────────
  // In Expo Go / development: useProxy=true routes through auth.expo.io
  // In production builds: uses the app scheme (nandedrozgar://)
  const redirectUri = AuthSession.makeRedirectUri({
    scheme:   'nandedrozgar',
    useProxy: __DEV__,
  });
  const [googleRequest, googleResponse, promptGoogleAsync] = AuthSession.useAuthRequest(
    {
      clientId:     process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      redirectUri,
      scopes:       ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Token,
    },
    GOOGLE_DISCOVERY
  );

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      handleGoogleSuccess(googleResponse.authentication.accessToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleResponse]);

  async function handleGoogleSuccess(accessToken) {
    setLoading(true);
    setError('');
    const r = await loginWithGoogle(accessToken);
    setLoading(false);
    if (!r.ok) { setError(r.error || 'Google sign-in failed'); triggerShake(); }
  }

  // ── Biometric login ───────────────────────────────────────────────────────
  async function handleBiometric() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Verify your identity to sign in',
      fallbackLabel: 'Use password',
      cancelLabel:   'Cancel',
    });
    if (result.success) {
      setLoading(true);
      const r = await loginWithBiometrics();
      setLoading(false);
      if (!r.ok) setError(r.error || 'Biometric sign-in failed');
    }
  }

  // ── Email / Password submit ───────────────────────────────────────────────
  async function handleSubmit() {
    setError('');
    if (tab === 'login') {
      if (!form.email || !form.password) { setError('Enter email and password'); triggerShake(); return; }
      setLoading(true);
      const r = await login(form.email, form.password);
      setLoading(false);
      if (!r.ok) { setError(r.error || 'Login failed'); triggerShake(); }

    } else if (tab === 'register') {
      if (!form.name || !form.email || !form.password) { setError('Fill all required fields'); triggerShake(); return; }
      if (form.password.length < 8) { setError('Password must be at least 8 characters'); triggerShake(); return; }
      if (form.password !== form.confirmPassword) { setError('Passwords do not match'); triggerShake(); return; }
      if (!termsAccepted) { setError('Please accept Terms & Privacy Policy'); triggerShake(); return; }
      const strength = getPasswordStrength(form.password);
      if (strength.score < 2) { setError('Password is too weak — add numbers & symbols'); triggerShake(); return; }
      setLoading(true);
      const r = await register({ name: form.name, email: form.email, password: form.password, role: 'user', phone: form.phone });
      setLoading(false);
      if (!r.ok) { setError(r.error || 'Registration failed'); triggerShake(); }
    }
  }

  // ── OTP flow ──────────────────────────────────────────────────────────────
  async function handleSendOTP() {
    if (!otpPhone || otpPhone.length < 10) { setError('Enter a valid 10-digit phone number'); triggerShake(); return; }
    setLoading(true); setError('');
    const r = await sendOTP(otpPhone);
    setLoading(false);
    if (r.ok) {
      setOtpSent(true);
      setOtpConfirmation(r.confirmation); // store Firebase confirmation object
    } else {
      setError(r.error || 'Failed to send OTP');
      triggerShake();
    }
  }

  async function handleVerifyOTP() {
    if (!otp || otp.length < 4) { setError('Enter the OTP'); triggerShake(); return; }
    if (!otpConfirmation) { setError('Please request a new OTP'); triggerShake(); return; }
    setLoading(true); setError('');
    const r = await verifyOTP(otpConfirmation, otp); // pass confirmation, not phone
    setLoading(false);
    if (!r.ok) { setError(r.error || 'Invalid OTP'); triggerShake(); }
  }

  // ── Forgot password ───────────────────────────────────────────────────────
  async function handleForgotPassword() {
    if (!forgotEmail) return;
    setForgotLoading(true);
    await forgotPassword(forgotEmail);
    setForgotLoading(false);
    setForgotDone(true);
  }

  const pwStrength = getPasswordStrength(form.password);

  return (
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* ── Logo ── */}
          <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }, { translateY: logoY }] }]}>
            <Animated.View style={[styles.logoMark, { transform: [{ translateY: floatY }] }]}>
              <Text style={styles.logoEmoji}>📍</Text>
            </Animated.View>
            <Text style={styles.logoText}>
              <Text style={{ color: '#fff' }}>lokal</Text>
              <Text style={{ color: ORANGE }}>loop</Text>
            </Text>
            <Text style={styles.logoSub}>Local Jobs · Local Life · Your City</Text>
          </Animated.View>

          {/* ── Form Card ── */}
          <Animated.View style={[styles.box, { opacity: boxOpacity, transform: [{ translateY: boxY }, { translateX: shake }] }]}>

            {/* ── Tab switcher ── */}
            <View style={styles.tabRow}>
              <Animated.View style={[styles.tabIndicator, { left: tabLeft }]} />
              {TABS.map(t => (
                <TouchableOpacity key={t.key} onPress={() => switchTab(t.key)} style={styles.tabBtn} activeOpacity={0.8}>
                  <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Social login (shown on sign-in and register) ── */}
            {tab !== 'phone' && (
              <View style={styles.socialRow}>
                <TouchableOpacity
                  style={[styles.socialBtn, !process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID && { opacity: 0.4 }]}
                  onPress={() => {
                    if (!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID) {
                      setError('Google sign-in not configured. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in .env');
                      return;
                    }
                    promptGoogleAsync();
                  }}
                  disabled={(!googleRequest && !!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID) || loading}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="google" size={18} color="#EA4335" />
                  <Text style={styles.socialBtnText}>
                    {tab === 'login' ? 'Sign in with Google' : 'Continue with Google'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── OR divider ── */}
            {tab !== 'phone' && (
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with email</Text>
                <View style={styles.dividerLine} />
              </View>
            )}

            {/* ── Register: extra fields ── */}
            {tab === 'register' && (
              <>
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Full Name *</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="person-outline" size={16} color="#999" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={form.name}
                      onChangeText={v => set('name', v)}
                      placeholder="Your full name"
                      placeholderTextColor="#aaa"
                    />
                  </View>
                </View>
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={styles.inputRow}>
                    <Text style={styles.flagPrefix}>🇮🇳 +91</Text>
                    <TextInput
                      style={[styles.input, { paddingLeft: 4 }]}
                      value={form.phone}
                      onChangeText={v => set('phone', v)}
                      placeholder="9XXXXXXXXX"
                      placeholderTextColor="#aaa"
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                </View>
              </>
            )}

            {/* ── Email / Password (login & register tabs) ── */}
            {tab !== 'phone' && (
              <>
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Email Address *</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="mail-outline" size={16} color="#999" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={form.email}
                      onChangeText={v => set('email', v)}
                      placeholder="you@email.com"
                      placeholderTextColor="#aaa"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <View style={styles.fieldWrap}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <Text style={styles.label}>Password *</Text>
                    {tab === 'login' && (
                      <TouchableOpacity onPress={() => setForgotVisible(true)}>
                        <Text style={styles.forgotLink}>Forgot password?</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.inputRow}>
                    <Ionicons name="lock-closed-outline" size={16} color="#999" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={form.password}
                      onChangeText={v => set('password', v)}
                      placeholder={tab === 'register' ? 'Min 8 chars, mix letters & numbers' : 'Your password'}
                      placeholderTextColor="#aaa"
                      secureTextEntry={!showPass}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowPass(p => !p)} style={styles.eyeBtn}>
                      <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="#999" />
                    </TouchableOpacity>
                  </View>
                  {/* Password strength bar (register only) */}
                  {tab === 'register' && form.password.length > 0 && (
                    <View style={{ marginTop: 6 }}>
                      <View style={styles.strengthTrack}>
                        {[0,1,2,3].map(i => (
                          <View
                            key={i}
                            style={[styles.strengthSegment, { backgroundColor: i < pwStrength.score ? pwStrength.color : '#e5e5e5' }]}
                          />
                        ))}
                      </View>
                      <Text style={[styles.strengthLabel, { color: pwStrength.color }]}>{pwStrength.label}</Text>
                    </View>
                  )}
                </View>

                {/* Confirm password (register) */}
                {tab === 'register' && (
                  <View style={styles.fieldWrap}>
                    <Text style={styles.label}>Confirm Password *</Text>
                    <View style={styles.inputRow}>
                      <Ionicons name="shield-checkmark-outline" size={16} color="#999" style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={form.confirmPassword}
                        onChangeText={v => set('confirmPassword', v)}
                        placeholder="Re-enter password"
                        placeholderTextColor="#aaa"
                        secureTextEntry={!showConfirm}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity onPress={() => setShowConfirm(p => !p)} style={styles.eyeBtn}>
                        <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color="#999" />
                      </TouchableOpacity>
                    </View>
                    {form.confirmPassword.length > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                        <Ionicons
                          name={form.password === form.confirmPassword ? 'checkmark-circle' : 'close-circle'}
                          size={13}
                          color={form.password === form.confirmPassword ? '#22c55e' : '#ef4444'}
                        />
                        <Text style={{ fontSize: 11, color: form.password === form.confirmPassword ? '#22c55e' : '#ef4444' }}>
                          {form.password === form.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Terms checkbox (register) */}
                {tab === 'register' && (
                  <TouchableOpacity style={styles.termsRow} onPress={() => setTermsAccepted(p => !p)} activeOpacity={0.8}>
                    <View style={[styles.checkbox, termsAccepted && styles.checkboxActive]}>
                      {termsAccepted && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    <Text style={styles.termsText}>
                      I agree to the{' '}
                      <Text style={styles.termsLink}>Terms of Service</Text>
                      {' '}and{' '}
                      <Text style={styles.termsLink}>Privacy Policy</Text>
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* ── Phone OTP tab ── */}
            {tab === 'phone' && (
              <View>
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Mobile Number *</Text>
                  <View style={styles.inputRow}>
                    <Text style={styles.flagPrefix}>🇮🇳 +91</Text>
                    <TextInput
                      style={[styles.input, { flex: 1, paddingLeft: 4 }]}
                      value={otpPhone}
                      onChangeText={v => { setOtpPhone(v); setOtpSent(false); setOtp(''); setOtpConfirmation(null); }}
                      placeholder="10-digit mobile number"
                      placeholderTextColor="#aaa"
                      keyboardType="phone-pad"
                      maxLength={10}
                      editable={!otpSent}
                    />
                  </View>
                </View>

                {otpSent && (
                  <View style={styles.fieldWrap}>
                    <Text style={styles.label}>Enter OTP</Text>
                    <View style={styles.inputRow}>
                      <Ionicons name="keypad-outline" size={16} color="#999" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={otp}
                        onChangeText={setOtp}
                        placeholder="4–6 digit OTP"
                        placeholderTextColor="#aaa"
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>
                    <TouchableOpacity onPress={handleSendOTP} style={{ marginTop: 4 }}>
                      <Text style={styles.resendText}>Didn't receive OTP? <Text style={{ color: ORANGE, fontWeight: '700' }}>Resend</Text></Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.otpInfoBox}>
                  <Ionicons name="shield-checkmark-outline" size={14} color="#22c55e" style={{ marginRight: 6 }} />
                  <Text style={styles.otpInfoText}>A one-time password will be sent to your number via SMS. Powered by Firebase — completely free.</Text>
                </View>
              </View>
            )}

            {/* ── Error ── */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={14} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* ── Submit button ── */}
            {loading ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={ORANGE} />
              </View>
            ) : (
              <>
                {tab === 'login' && (
                  <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.88}>
                    <Ionicons name="log-in-outline" size={18} color="#fff" />
                    <Text style={styles.submitText}>Sign In</Text>
                  </TouchableOpacity>
                )}
                {tab === 'register' && (
                  <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.88}>
                    <Ionicons name="person-add-outline" size={18} color="#fff" />
                    <Text style={styles.submitText}>Create Account</Text>
                  </TouchableOpacity>
                )}
                {tab === 'phone' && (
                  <TouchableOpacity style={styles.submitBtn} onPress={otpSent ? handleVerifyOTP : handleSendOTP} activeOpacity={0.88}>
                    <Ionicons name={otpSent ? 'checkmark-circle-outline' : 'send-outline'} size={18} color="#fff" />
                    <Text style={styles.submitText}>{otpSent ? 'Verify OTP' : 'Send OTP'}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* ── Biometric button (login tab only, if available) ── */}
            {tab === 'login' && biometricAvailable && (
              <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometric} activeOpacity={0.8}>
                <Ionicons name="finger-print-outline" size={20} color={ORANGE} />
                <Text style={styles.biometricText}>Sign in with Biometrics</Text>
              </TouchableOpacity>
            )}

            {/* ── Switch tab link ── */}
            <View style={styles.switchRow}>
              {tab === 'login' && (
                <>
                  <Text style={styles.switchText}>New to LokalLoop? </Text>
                  <TouchableOpacity onPress={() => switchTab('register')}>
                    <Text style={styles.switchLink}>Create account</Text>
                  </TouchableOpacity>
                </>
              )}
              {tab === 'register' && (
                <>
                  <Text style={styles.switchText}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => switchTab('login')}>
                    <Text style={styles.switchLink}>Sign in</Text>
                  </TouchableOpacity>
                </>
              )}
              {tab === 'phone' && (
                <>
                  <Text style={styles.switchText}>Prefer email? </Text>
                  <TouchableOpacity onPress={() => switchTab('login')}>
                    <Text style={styles.switchLink}>Sign in with email</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Animated.View>

          {/* ── Trust badges ── */}
          <View style={styles.trustRow}>
            {[
              { icon: 'shield-checkmark', label: 'Secure Auth' },
              { icon: 'lock-closed',      label: 'Encrypted' },
              { icon: 'people',           label: '50K+ Users' },
            ].map(b => (
              <View key={b.label} style={styles.trustItem}>
                <Ionicons name={b.icon} size={12} color={ORANGE} style={{ marginRight: 4 }} />
                <Text style={styles.trustText}>{b.label}</Text>
              </View>
            ))}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Forgot Password Modal ── */}
      <Modal
        visible={forgotVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setForgotVisible(false); setForgotDone(false); setForgotEmail(''); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TouchableOpacity style={styles.modalClose} onPress={() => { setForgotVisible(false); setForgotDone(false); setForgotEmail(''); }}>
              <Ionicons name="close" size={22} color="#555" />
            </TouchableOpacity>

            {forgotDone ? (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <View style={styles.successCircle}>
                  <Ionicons name="checkmark" size={32} color="#22c55e" />
                </View>
                <Text style={styles.modalTitle}>Email Sent!</Text>
                <Text style={styles.modalSub}>Check your inbox for a password reset link. It expires in 1 hour.</Text>
                <TouchableOpacity
                  style={[styles.submitBtn, { marginTop: 20, backgroundColor: '#111' }]}
                  onPress={() => { setForgotVisible(false); setForgotDone(false); setForgotEmail(''); }}
                >
                  <Text style={styles.submitText}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.modalIconWrap}>
                  <Ionicons name="key-outline" size={28} color={ORANGE} />
                </View>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <Text style={styles.modalSub}>Enter your registered email and we'll send you a reset link.</Text>

                <View style={[styles.fieldWrap, { marginTop: 16 }]}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="mail-outline" size={16} color="#999" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      placeholder="you@email.com"
                      placeholderTextColor="#aaa"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {forgotLoading ? (
                  <ActivityIndicator size="small" color={ORANGE} style={{ marginTop: 8 }} />
                ) : (
                  <TouchableOpacity style={styles.submitBtn} onPress={handleForgotPassword} activeOpacity={0.88}>
                    <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                    <Text style={styles.submitText}>Send Reset Link</Text>
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

const styles = StyleSheet.create({
  bg:     { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 20 },

  // Logo
  logoWrap: { alignItems: 'center', marginBottom: 28 },
  logoMark: { width: 70, height: 70, backgroundColor: '#1e1e1e', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1.5, borderColor: '#2e2e2e' },
  logoEmoji: { fontSize: 30 },
  logoText:  { fontSize: 28, fontWeight: '900', letterSpacing: 0.5 },
  logoSub:   { color: '#666', fontSize: 12, marginTop: 5 },

  // Card
  box: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 420, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24, elevation: 12 },

  // Tabs
  tabRow:       { flexDirection: 'row', borderRadius: 12, backgroundColor: '#f4f4f4', marginBottom: 22, padding: 3, position: 'relative', overflow: 'hidden' },
  tabIndicator: { position: 'absolute', top: 3, bottom: 3, width: '33.33%', backgroundColor: '#fff', borderRadius: 9, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 2 },
  tabBtn:       { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9, zIndex: 1 },
  tabText:      { fontSize: 12, fontWeight: '600', color: '#aaa' },
  tabTextActive: { color: '#111', fontWeight: '800' },

  // Social
  socialRow:     { gap: 10 },
  socialBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 12, paddingVertical: 12, backgroundColor: '#fff' },
  socialBtnText: { fontSize: 13, fontWeight: '700', color: '#111' },

  // Divider
  dividerRow:  { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#ebebeb' },
  dividerText: { fontSize: 11, color: '#bbb', fontWeight: '500' },

  // Fields
  fieldWrap:  { marginBottom: 14 },
  label:      { fontSize: 12, fontWeight: '700', color: '#444', marginBottom: 6, letterSpacing: 0.2 },
  inputRow:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 12, backgroundColor: '#fdfdfd', paddingHorizontal: 12 },
  inputIcon:  { marginRight: 8 },
  input:      { flex: 1, paddingVertical: 12, fontSize: 14, color: '#111' },
  eyeBtn:     { padding: 4 },
  flagPrefix: { fontSize: 13, color: '#555', fontWeight: '600', marginRight: 6 },

  // Password strength
  strengthTrack:   { flexDirection: 'row', gap: 3 },
  strengthSegment: { flex: 1, height: 3, borderRadius: 2 },
  strengthLabel:   { fontSize: 10, fontWeight: '700', marginTop: 3 },

  // Terms
  termsRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  checkbox:     { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  termsText:    { fontSize: 12, color: '#666', flex: 1, lineHeight: 18 },
  termsLink:    { color: ORANGE, fontWeight: '700' },

  // OTP
  otpInfoBox:   { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, marginBottom: 14 },
  otpInfoText:  { fontSize: 12, color: '#166534', flex: 1, lineHeight: 17 },
  resendText:   { fontSize: 12, color: '#888', textAlign: 'right' },

  // Error
  errorBox:  { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#fef2f2', borderRadius: 10, padding: 11, marginBottom: 12 },
  errorText: { color: '#ef4444', fontSize: 12, fontWeight: '600', flex: 1 },

  // Submit
  submitBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ORANGE, borderRadius: 12, paddingVertical: 14, marginTop: 2 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },

  // Biometric
  biometricBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: '#ffe8d6', backgroundColor: '#fff7f0', borderRadius: 12, paddingVertical: 12, marginTop: 12 },
  biometricText: { color: ORANGE, fontWeight: '700', fontSize: 13 },

  // Switch
  switchRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f5f5f5' },
  switchText: { fontSize: 12, color: '#999' },
  switchLink: { fontSize: 12, fontWeight: '800', color: ORANGE },

  // Forgot
  forgotLink: { fontSize: 12, fontWeight: '700', color: ORANGE },

  // Trust badges
  trustRow:  { flexDirection: 'row', marginTop: 20, gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  trustItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  trustText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40 },
  modalClose:   { position: 'absolute', top: 18, right: 20, zIndex: 10 },
  modalIconWrap: { width: 56, height: 56, backgroundColor: '#fff7f0', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#111', marginBottom: 6 },
  modalSub:   { fontSize: 13, color: '#888', lineHeight: 19, marginBottom: 4 },
  successCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
});
