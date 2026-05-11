import React, { createContext, useContext, useState, useEffect } from 'react';
import { http, loadToken, saveToken, clearToken } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [role, setRole]   = useState(null);
  const [jobs, setJobs]   = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wrap in a timeout fallback — if init() hangs for any reason
    // (e.g. SecureStore crash on first install), we still clear the spinner
    const fallback = setTimeout(() => setLoading(false), 10000);
    init().finally(() => {
      clearTimeout(fallback);
      setLoading(false);
    });
  }, []);

  async function init() {
    try {
      const token = await loadToken();
      if (token) {
        const r = await http('GET', '/api/auth/me');
        if (r.ok) {
          setUser(r.user);
          setRole(r.user.role);
          await loadJobs();
          if (r.user.role === 'admin') await loadUsers();
        } else {
          // Token expired or invalid — clear it silently
          await clearToken().catch(() => {});
        }
      }
    } catch (e) {
      console.warn('App init error:', e);
      try { await clearToken(); } catch {}
    }
  }

  async function loadJobs() {
    try {
      const r = await http('GET', '/api/jobs');
      if (r.ok) {
        setJobs(r.jobs.map(j => ({
          ...j,
          id: String(j.id),
          postedBy: j.posted_by,
          timestamp: new Date(j.created_at).getTime(),
          applicants: [],
          saved: [],
        })));
      }
    } catch (e) {
      console.warn('loadJobs error:', e);
    }
  }

  async function loadUsers() {
    try {
      const r = await http('GET', '/api/admin/users');
      if (r.ok) setUsers(r.users);
    } catch (e) {
      console.warn('loadUsers error:', e);
    }
  }

  async function login(email, password) {
    try {
      const r = await http('POST', '/api/auth/login', { email, password });
      if (!r.ok) return r;
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
      if (!r.ok) return r;
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
      user, setUser, role, jobs, setJobs, users, setUsers,
      loading, login, register, signOut, loadJobs, loadUsers,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
