/**
 * CityPlus — AuthContext.js
 * Adds: loginWithGoogle, sendOTP, verifyOTP, forgotPassword, loginWithBiometrics
 * Fixed: Google OAuth web support, Firebase OTP platform detection
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { http, loadToken, saveToken, clearToken } from '../utils/api';

const AuthContext = createContext(null);

const BIOMETRIC_EMAIL_KEY = 'cityplus_bio_email';
const BIOMETRIC_TOKEN_KEY = 'cityplus_bio_token';

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [jobs,    setJobs]    = useState([]);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [jobPage,       setJobPage]       = useState(1);
  const [jobPagination, setJobPagination] = useState(null);

  useEffect(() => {
    const fallback = setTimeout(() => setLoading(false), 8000);
    init().finally(() => { clearTimeout(fallback); setLoading(false); });
  }, []);

  async function init() {
    try {
      const token = await loadToken();
      if (!token) return;
      const r = await http('GET', '/api/auth/me');
      if (r?.ok && r.user) {
        setUser(r.user);
        await loadJobs(1);
        if (r.user.role === 'admin') await loadUsers();
      } else {
        await clearToken();
      }
    } catch (e) {
      console.warn('init error:', e.message);
      try { await clearToken(); } catch {}
    }
  }

  async function loadJobs(page = 1, category = null, search = null) {
    try {
      let path = `/api/jobs?page=${page}&limit=20`;
      if (category && category !== 'All') path += `&category=${encodeURIComponent(category)}`;
      if (search) path += `&search=${encodeURIComponent(search)}`;
      const r = await http('GET', path);
      if (r?.ok && Array.isArray(r.jobs)) {
        const normalised = r.jobs.map(j => ({
          ...j,
          id:         String(j.id ?? Math.random()),
          postedBy:   j.posted_by,
          timestamp:  j.created_at ? new Date(j.created_at).getTime() : Date.now(),
          applicants: j.applicants ?? [],
          saved:      j.saved      ?? [],
        }));
        if (page === 1) setJobs(normalised);
        else setJobs(prev => [...prev, ...normalised]);
        if (r.pagination) setJobPagination(r.pagination);
        setJobPage(page);
      }
    } catch (e) { console.warn('loadJobs:', e.message); }
  }

  async function loadMoreJobs() {
    if (jobPagination?.hasNext) await loadJobs(jobPage + 1);
  }

  async function loadUsers() {
    try {
      const r = await http('GET', '/api/admin/users');
      if (r?.ok && Array.isArray(r.users)) setUsers(r.users);
    } catch (e) { console.warn('loadUsers:', e.message); }
  }

  // ── Email / password login ────────────────────────────────────────────────
  async function login(email, password) {
    try {
      const r = await http('POST', '/api/auth/login', { email, password });
      if (!r?.ok) return r ?? { ok: false, error: 'Login failed. Try again.' };
      await saveToken(r.token);
      await _saveBiometricCredentials(email, r.token);
      setUser(r.user);
      await loadJobs(1);
      if (r.user.role === 'admin') await loadUsers();
      return r;
    } catch { return { ok: false, error: 'Login failed. Try again.' }; }
  }

  // ── Register ──────────────────────────────────────────────────────────────
  async function register(data) {
    try {
      const r = await http('POST', '/api/auth/register', data);
      if (!r?.ok) return r ?? { ok: false, error: 'Registration failed. Try again.' };
      await saveToken(r.token);
      setUser(r.user);
      await loadJobs(1);
      return r;
    } catch { return { ok: false, error: 'Registration failed. Try again.' }; }
  }

  // ── Google OAuth login ────────────────────────────────────────────────────
  // accessToken comes from expo-auth-session (all platforms)
  async function loginWithGoogle(accessToken) {
    try {
      const r = await http('POST', '/api/auth/google', { accessToken });
      if (!r?.ok) return r ?? { ok: false, error: 'Google sign-in failed.' };
      await saveToken(r.token);
      await _saveBiometricCredentials(r.user.email, r.token);
      setUser(r.user);
      await loadJobs(1);
      if (r.user.role === 'admin') await loadUsers();
      return r;
    } catch (e) {
      console.warn('loginWithGoogle:', e.message);
      return { ok: false, error: 'Google sign-in failed. Try again.' };
    }
  }

  // ── Biometric re-authentication ───────────────────────────────────────────
  async function loginWithBiometrics() {
    try {
      const storedToken = await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);
      if (!storedToken) return { ok: false, error: 'No stored session. Please sign in with email first.' };
      await saveToken(storedToken);
      const r = await http('GET', '/api/auth/me');
      if (!r?.ok) {
        await clearToken();
        return { ok: false, error: 'Session expired. Please sign in again.' };
      }
      setUser(r.user);
      await loadJobs(1);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Biometric sign-in failed.' };
    }
  }

  // ── Phone OTP via Firebase (free · 10 K/month · no KYC needed) ──────────
  // Firebase sends the SMS on the client — backend only validates the idToken
  // via firebase-admin at /api/auth/verify-firebase-otp.
  async function sendOTP(phone) {
    try {
      const auth = require('@react-native-firebase/auth').default;
      const e164 = phone.startsWith('+') ? phone : `+91${phone.trim()}`;
      const confirmation = await auth().signInWithPhoneNumber(e164);
      return { ok: true, confirmation };
    } catch (e) {
      console.warn('sendOTP error:', e.message);
      if (e.code === 'auth/invalid-phone-number')
        return { ok: false, error: 'Invalid phone number. Please check and try again.' };
      if (e.code === 'auth/too-many-requests')
        return { ok: false, error: 'Too many attempts. Please try again later.' };
      return { ok: false, error: 'Failed to send OTP. Please check your connection.' };
    }
  }

  async function verifyOTP(confirmation, otp) {
    try {
      // confirmation is the Firebase ConfirmationResult from signInWithPhoneNumber
      const credential = await confirmation.confirm(String(otp).trim());
      const idToken = await credential.user.getIdToken();
      // Exchange Firebase idToken for our app JWT
      const r = await http('POST', '/api/auth/verify-firebase-otp', { idToken });
      if (!r?.ok) return r ?? { ok: false, error: 'OTP verification failed. Please try again.' };
      await saveToken(r.token);
      setUser(r.user);
      await loadJobs(1);
      return r;
    } catch (e) {
      console.warn('verifyOTP error:', e.message);
      if (e.code === 'auth/invalid-verification-code')
        return { ok: false, error: 'Incorrect OTP. Please try again.' };
      if (e.code === 'auth/session-expired')
        return { ok: false, error: 'OTP expired. Please request a new one.' };
      return { ok: false, error: 'OTP verification failed. Please try again.' };
    }
  }

  // ── Forgot password ───────────────────────────────────────────────────────
  async function forgotPassword(email) {
    try {
      const r = await http('POST', '/api/auth/forgot-password', { email });
      return r ?? { ok: false, error: 'Failed to send reset email.' };
    } catch { return { ok: false, error: 'Failed to send reset email.' }; }
  }

  // ── Reset password (with token) ───────────────────────────────────────────
  async function resetPassword(resetToken, newPassword) {
    try {
      const r = await http('POST', '/api/auth/reset-password', { token: resetToken, password: newPassword });
      return r ?? { ok: false, error: 'Password reset failed.' };
    } catch { return { ok: false, error: 'Password reset failed.' }; }
  }

  // ── Sign out ──────────────────────────────────────────────────────────────
  async function signOut() {
    try { await clearToken(); } catch {}
    setUser(null); setJobs([]); setUsers([]);
    setJobPage(1); setJobPagination(null);
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  async function _saveBiometricCredentials(email, token) {
    try {
      await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email);
      await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, token);
    } catch {}
  }

  return (
    <AuthContext.Provider value={{
      user, setUser,
      role: user?.role ?? null,
      jobs, setJobs, loadJobs, loadMoreJobs,
      jobPagination, jobPage,
      users, setUsers, loading,
      login, register, signOut, loadUsers,
      loginWithGoogle,
      loginWithBiometrics,
      sendOTP, verifyOTP,
      forgotPassword, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
