/**
 * CityPlus — AuthContext.js
 * OTP (sendOTP / verifyOTP) removed.
 * Keeps: login, register, loginWithGoogle, loginWithBiometrics, forgotPassword, resetPassword.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { http, loadToken, saveToken, clearToken } from '../utils/api';
import { registerForPushNotifications, savePushTokenToServer } from '../utils/notifications';

const AuthContext = createContext(null);

const BIOMETRIC_EMAIL_KEY = 'cityplus_bio_email';
const BIOMETRIC_TOKEN_KEY = 'cityplus_bio_token';

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [jobs,    setJobs]    = useState([]);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  const [sessionPending, setSessionPending] = useState(false);

  const [jobPage,       setJobPage]       = useState(1);
  const [jobPagination, setJobPagination] = useState(null);

  const fetchingRef = useRef(false);

  useEffect(() => {
    const fallback = setTimeout(() => {
      setLoading(false);
      setSessionPending(false);
    }, 10000);
    init().finally(() => { clearTimeout(fallback); setLoading(false); });
  }, []);

  async function init() {
    try {
      const token = await loadToken();
      if (!token) return;

      setSessionPending(true);

      const r = await http('GET', '/api/auth/me');

      if (r?.ok && r.user) {
        setUser(r.user);
        setSessionPending(false);
        await loadJobs(1);
        if (r.user.role === 'admin') await loadUsers();
      } else if (r?.status === 401 || r?.status === 403) {
        await clearToken();
        setSessionPending(false);
        setUser(null);
      } else {
        setSessionPending(false);
      }
    } catch (e) {
      console.warn('init error:', e.message);
      setSessionPending(false);
    }
  }

  async function loadJobs(page = 1, category = null, search = null, district = null) {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      let path = `/api/jobs?page=${page}&limit=20`;
      if (category && category !== 'All') path += `&category=${encodeURIComponent(category)}`;
      if (search) path += `&search=${encodeURIComponent(search)}`;
      if (district) path += `&district=${encodeURIComponent(district)}`;
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
      await _registerAndSavePushToken(r.token);
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
      await _registerAndSavePushToken(r.token);
      setUser(r.user);
      await loadJobs(1);
      return r;
    } catch { return { ok: false, error: 'Registration failed. Try again.' }; }
  }

  // ── Google OAuth login ────────────────────────────────────────────────────
  async function loginWithGoogle(idToken) {
    try {
      const r = await http('POST', '/api/auth/google', { idToken });
      if (!r?.ok) return r ?? { ok: false, error: 'Google sign-in failed.' };
      await saveToken(r.token);
      await _saveBiometricCredentials(r.user.email, r.token);
      await _registerAndSavePushToken(r.token);
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

  // Register device for push notifications and persist the token to the server.
  // Called after every successful login/register so the token stays current.
  async function _registerAndSavePushToken(authToken) {
    try {
      const pushToken = await registerForPushNotifications();
      if (pushToken) await savePushTokenToServer(authToken, pushToken);
    } catch {}
  }

  return (
    <AuthContext.Provider value={{
      user, setUser,
      role: user?.role ?? null,
      jobs, setJobs, loadJobs, loadMoreJobs,
      jobPagination, jobPage,
      users, setUsers, loading,
      sessionPending,
      login, register, signOut, loadUsers,
      loginWithGoogle,
      loginWithBiometrics,
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
