import React, { createContext, useContext, useState, useEffect } from 'react';
import { http, loadToken, saveToken, clearToken } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [jobs,    setJobs]    = useState([]);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination state for job board
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
        // Append on load-more, replace on fresh load
        if (page === 1) {
          setJobs(normalised);
        } else {
          setJobs(prev => [...prev, ...normalised]);
        }
        if (r.pagination) setJobPagination(r.pagination);
        setJobPage(page);
      }
    } catch (e) { console.warn('loadJobs:', e.message); }
  }

  async function loadMoreJobs() {
    if (jobPagination?.hasNext) {
      await loadJobs(jobPage + 1);
    }
  }

  async function loadUsers() {
    try {
      const r = await http('GET', '/api/admin/users');
      if (r?.ok && Array.isArray(r.users)) setUsers(r.users);
    } catch (e) { console.warn('loadUsers:', e.message); }
  }

  async function login(email, password) {
    try {
      const r = await http('POST', '/api/auth/login', { email, password });
      if (!r?.ok) return r ?? { ok: false, error: 'Login failed. Try again.' };
      await saveToken(r.token);
      setUser(r.user);
      await loadJobs(1);
      if (r.user.role === 'admin') await loadUsers();
      return r;
    } catch { return { ok: false, error: 'Login failed. Try again.' }; }
  }

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

  async function signOut() {
    try { await clearToken(); } catch {}
    setUser(null); setJobs([]); setUsers([]);
    setJobPage(1); setJobPagination(null);
  }

  return (
    <AuthContext.Provider value={{
      user, setUser,
      jobs, setJobs, loadJobs, loadMoreJobs,
      jobPagination, jobPage,
      users, setUsers, loading,
      login, register, signOut, loadUsers,
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
