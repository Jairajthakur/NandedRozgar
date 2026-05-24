/**
 * CityPlus — AuthContext.js
 * Adds: loginWithGoogle, sendOTP, verifyOTP, forgotPassword, loginWithBiometrics
 * Fixed: Google OAuth web support, Firebase OTP platform detection
 * Fixed: Refresh sign-out issue — keeps session on server errors/cold starts
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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

  // When true, we know a token exists but haven't confirmed with server yet.
  // The app should show a loading/splash screen rather than the login screen.
  const [sessionPending, setSessionPending] = useState(false);

  // Pagination state
  const [jobPage,       setJobPage]       = useState(1);
  const [jobPagination, setJobPagination] = useState(null);

  // Guard against concurrent/redundant loadJobs calls
  const fetchingRef = useRef(false);

  useEffect(() => {
    const fallback = setTimeout(() => {
      // If server never responded, keep sessionPending false but stop spinner
      setLoading(false);
      setSessionPending(false);
    }, 10000);
    init().finally(() => { clearTimeout(fallback); setLoading(false); });
  }, []);

  async function init() {
    try {
      const token = await loadToken();
      if (!token) return; // No token → not logged in, show login screen normally

      // Token exists — signal that we have a session to restore.
      // The app should show a loading/splash screen, NOT the login screen.
      setSessionPending(true);

      const r = await http('GET', '/api/auth/me');

      if (r?.ok && r.user) {
        // ✅ Server confirmed the session
        setUser(r.user);
        setSessionPending(false);
        await loadJobs(1);
        if (r.user.role === 'admin') await loadUsers();
      } else if (r?.status === 401 || r?.status === 403) {
        // ❌ Server explicitly rejected the token (expired or invalid)
        // Only NOW should we clear it and send the user to login
        await clearToken();
        setSessionPending(false);
        setUser(null);
      } else {
        // ⚠️  Server error / cold start / network issue — keep the token!
        // Leave sessionPending = false and user = null for now.
        // The token is preserved; next app open will retry.
        // Optionally: set a "offline mode" flag here to show a banner.
        setSessionPending(false);
      }
    } catch (e) {
      console.warn('init error:', e.message);
      // Do NOT clear token on exceptions — could be a temporary network issue
      setSessionPending(false);
    }
  }

  async function loadJobs(page = 1, category = null, search = null) {
    if (fetchingRef.current && page === 1) return;
    fetchingRef.current = true;
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
    finally { fetchingRef.current = false; }
  }

  const loadMoreJobs = useCallback(async () => {
    if (jobPagination?.hasNext) await loadJobs(jobPage + 1);
  }, [jobPagination, jobPage]);

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
        try {
          await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
          await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
        } catch {}
        setUser(null);
        return { ok: false, error: 'Session expired. Please sign in again.', requiresLogin: true };
      }
      setUser(r.user);
      await loadJobs(1);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Biometric sign-in failed.' };
    }
  }

  // ── Phone OTP via Firebase ────────────────────────────────────────────────
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
      const credential = await confirmation.confirm(String(otp).trim());
      const idToken = await credential.user.getIdToken();
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
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
    } catch {}
    setUser(null); setJobs([]); setUsers([]);
    setJobPage(1); setJobPagination(null);
    setSessionPending(false);
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
      sessionPending,   // ← expose this so App.js can show a splash instead of login
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
