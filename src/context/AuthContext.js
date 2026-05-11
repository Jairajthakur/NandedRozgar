import React, { createContext, useContext, useState, useEffect } from 'react';
import { http, loadToken, saveToken, clearToken } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [role,    setRole]    = useState(null);
  const [jobs,    setJobs]    = useState([]);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hard 8-second fallback — if init() hangs for any reason the spinner clears
    const fallback = setTimeout(() => {
      console.warn('Auth init timed out — clearing loader');
      setLoading(false);
    }, 8000);

    init().finally(() => {
      clearTimeout(fallback);
      setLoading(false);
    });
  }, []);

  async function init() {
    try {
      const token = await loadToken();
      if (!token) return; // No saved session — go straight to login

      const r = await http('GET', '/api/auth/me');
      if (r && r.ok && r.user) {
        setUser(r.user);
        setRole(r.user.role);
        await loadJobs();
        if (r.user.role === 'admin') await loadUsers();
      } else {
        // Token expired / invalid — clear silently
        await clearToken();
      }
    } catch (e) {
      console.warn('App init error:', e.message);
      try { await clearToken(); } catch {}
    }
  }

  async function loadJobs() {
    try {
      const r = await http('GET', '/api/jobs');
      if (r && r.ok && Array.isArray(r.jobs)) {
        setJobs(
          r.jobs.map(j => ({
            ...j,
            id:        String(j.id ?? Math.random()),
            postedBy:  j.posted_by,
            timestamp: j.created_at ? new Date(j.created_at).getTime() : Date.now(),
            applicants: j.applicants ?? [],
            saved:      j.saved ?? [],
          }))
        );
      }
    } catch (e) {
      console.warn('loadJobs error:', e.message);
    }
  }

  async function loadUsers() {
    try {
      const r = await http('GET', '/api/admin/users');
      if (r && r.ok && Array.isArray(r.users)) setUsers(r.users);
    } catch (e) {
      console.warn('loadUsers error:', e.message);
    }
  }

  async function login(email, password) {
    try {
      const r = await http('POST', '/api/auth/login', { email, password });
      if (!r || !r.ok) return r ?? { ok: false, error: 'Login failed. Please try again.' };
      await saveToken(r.token);
      setUser(r.user);
      setRole(r.user.role);
      await loadJobs();
      if (r.user.role === 'admin') await loadUsers();
      return r;
    } catch (e) {
      return { ok: false, error: 'Login failed. Please try again.' };
    }
  }

  async function register(data) {
    try {
      const r = await http('POST', '/api/auth/register', data);
      if (!r || !r.ok) return r ?? { ok: false, error: 'Registration failed. Please try again.' };
      await saveToken(r.token);
      setUser(r.user);
      setRole(r.user.role);
      await loadJobs();
      return r;
    } catch (e) {
      return { ok: false, error: 'Registration failed. Please try again.' };
    }
  }

  async function signOut() {
    try { await clearToken(); } catch {}
    setUser(null);
    setRole(null);
    setJobs([]);
    setUsers([]);
  }

  return (
    <AuthContext.Provider value={{
      user, setUser, role, jobs, setJobs,
      users, setUsers, loading,
      login, register, signOut, loadJobs, loadUsers,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
