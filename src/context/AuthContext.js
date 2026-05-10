import React, { createContext, useContext, useState, useEffect } from 'react';
import { http, loadToken, saveToken, clearToken } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [role, setRole]   = useState(null);
  const [jobs, setJobs]   = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { init(); }, []);

  async function init() {
    const token = await loadToken();
    if (token) {
      const r = await http('GET', '/api/auth/me');
      if (r.ok) {
        setUser(r.user);
        setRole(r.user.role);
        await loadJobs();
        if (r.user.role === 'admin') await loadUsers();
      } else {
        await clearToken();
      }
    }
    setLoading(false);
  }

  async function loadJobs() {
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
  }

  async function loadUsers() {
    const r = await http('GET', '/api/admin/users');
    if (r.ok) setUsers(r.users);
  }

  async function login(email, password) {
    const r = await http('POST', '/api/auth/login', { email, password });
    if (!r.ok) return r;
    await saveToken(r.token);
    setUser(r.user);
    setRole(r.user.role);
    await loadJobs();
    if (r.user.role === 'admin') await loadUsers();
    return r;
  }

  async function register(data) {
    const r = await http('POST', '/api/auth/register', data);
    if (!r.ok) return r;
    await saveToken(r.token);
    setUser(r.user);
    setRole(r.user.role);
    await loadJobs();
    return r;
  }

  async function signOut() {
    await clearToken();
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
