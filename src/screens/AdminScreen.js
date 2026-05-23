import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  FlatList,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Config ──────────────────────────────────────────────────────────────────
const API_BASE = 'https://localloops-production.up.railway.app';
const PROMO_PLANS = {
  basic: { price: 99, days: 7 },
  popular: { price: 249, days: 15 },
  premium: { price: 499, days: 30 },
};

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#f4f4f0',
  surface: '#ffffff',
  surface2: '#f9f9f7',
  border: '#e8e8e2',
  border2: '#d4d4cc',
  text: '#111110',
  text2: '#6b6b65',
  text3: '#a0a09a',
  orange: '#f97316',
  orangeLight: '#fff4ed',
  orangeBorder: '#fed7aa',
  green: '#16a34a',
  greenLight: '#f0fdf4',
  greenBorder: '#bbf7d0',
  red: '#dc2626',
  redLight: '#fef2f2',
  redBorder: '#fecaca',
  blue: '#2563eb',
  blueLight: '#eff6ff',
  blueBorder: '#bfdbfe',
  purple: '#7c3aed',
  purpleLight: '#f5f3ff',
  purpleBorder: '#ddd6fe',
  gold: '#d97706',
  goldLight: '#fffbeb',
  goldBorder: '#fde68a',
  teal: '#0891b2',
  tealLight: '#ecfeff',
  tealBorder: '#a5f3fc',
  dark: '#111110',
};

const AVATAR_COLORS = [
  '#f97316', '#2563eb', '#16a34a', '#7c3aed',
  '#d97706', '#dc2626', '#0891b2', '#db2777',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function avatarColor(name) {
  const c = (name || '?')[0].toUpperCase();
  return AVATAR_COLORS[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_COLORS.length];
}

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function fmtCurrency(val) {
  return '₹' + parseInt(val || 0).toLocaleString('en-IN');
}

// ─── API ─────────────────────────────────────────────────────────────────────
let _token = '';

async function apiCall(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (_token) opts.headers['Authorization'] = `Bearer ${_token}`;
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(API_BASE + path, opts);
  return r.json();
}

// ─── Sub-components ──────────────────────────────────────────────────────────

// Chip
function Chip({ label, type = 'gray' }) {
  const chipStyles = {
    green:  { bg: C.greenLight,  text: C.green,  border: C.greenBorder },
    red:    { bg: C.redLight,    text: C.red,    border: C.redBorder },
    blue:   { bg: C.blueLight,   text: C.blue,   border: C.blueBorder },
    orange: { bg: C.orangeLight, text: C.orange, border: C.orangeBorder },
    purple: { bg: C.purpleLight, text: C.purple, border: C.purpleBorder },
    gold:   { bg: C.goldLight,   text: C.gold,   border: C.goldBorder },
    teal:   { bg: C.tealLight,   text: C.teal,   border: C.tealBorder },
    gray:   { bg: C.surface2,    text: C.text2,  border: C.border },
    pending:{ bg: '#fffbeb',     text: '#b45309',border: '#fde68a' },
  };
  const s = chipStyles[type] || chipStyles.gray;
  return (
    <View style={[styles.chip, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[styles.chipText, { color: s.text }]}>{label}</Text>
    </View>
  );
}

// KPI Card
function KpiCard({ icon, value, label, sub, color, bg }) {
  return (
    <View style={[styles.kpiCard, { borderTopColor: color }]}>
      <View style={[styles.kpiIcon, { backgroundColor: bg }]}>
        <Text style={[styles.kpiIconText, { color }]}>{icon}</Text>
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

// Progress Bar
function ProgressBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressMeta}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={[styles.progressValue, { color }]}>{value} / {total}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.progressPct}>{pct}%</Text>
    </View>
  );
}

// Section Card
function Card({ title, icon, iconColor, iconBg, children, action, onAction }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          {icon ? (
            <View style={[styles.cardTitleIcon, { backgroundColor: iconBg || C.orangeLight }]}>
              <Text style={{ color: iconColor || C.orange, fontSize: 13 }}>{icon}</Text>
            </View>
          ) : null}
          <Text style={styles.cardTitleText}>{title}</Text>
        </View>
        {action ? (
          <TouchableOpacity onPress={onAction}>
            <Text style={styles.cardAction}>{action}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

// Listing Card
function ListingCard({ item, type, onPress, onToggle, onFeature }) {
  const typeConfig = {
    job: { bg: C.orangeLight, color: C.orange, icon: '💼' },
    room: { bg: C.blueLight, color: C.blue, icon: '🏠' },
    vehicle: { bg: C.tealLight, color: C.teal, icon: '🚗' },
    buysell: { bg: C.redLight, color: C.red, icon: '🛍' },
  }[type] || { bg: C.surface2, color: C.text2, icon: '📋' };

  return (
    <TouchableOpacity style={styles.listingCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.listingTop}>
        <View style={[styles.listingTypeBadge, { backgroundColor: typeConfig.bg }]}>
          <Text style={{ fontSize: 16 }}>{typeConfig.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.listingTitle} numberOfLines={1}>
            {item.title || item.room_type || item.name || item.vehicle_type || '—'}
          </Text>
          <Text style={styles.listingMeta} numberOfLines={1}>
            {type === 'job' ? `${item.company || '—'} · ${item.category}` : ''}
            {type === 'room' ? `${item.for_gender || 'Any'} · ${item.area || '—'}` : ''}
            {type === 'vehicle' ? `${item.vehicle_type || '—'} · ${item.area || '—'}` : ''}
            {type === 'buysell' ? `${item.category || '—'} · ${item.condition || '—'}` : ''}
          </Text>
        </View>
        <Chip label={item.status} type={item.status === 'active' ? 'green' : 'red'} />
      </View>
      <View style={styles.listingBottom}>
        <View style={styles.listingStats}>
          {item.featured ? <Chip label="★ Featured" type="gold" /> : null}
          {item.urgent ? <Chip label="🔥 Urgent" type="red" /> : null}
          {item.rent ? <Text style={[styles.listingPrice, { color: C.orange }]}>{fmtCurrency(item.rent)}/mo</Text> : null}
          {item.price ? <Text style={[styles.listingPrice, { color: C.orange }]}>{fmtCurrency(item.price)}</Text> : null}
          <Text style={styles.listingStat}>📅 {fmtDate(item.created_at)}</Text>
        </View>
        <View style={styles.listingActions}>
          {onToggle ? (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => onToggle(item)}
            >
              <Text style={{ fontSize: 14, color: item.status === 'active' ? C.red : C.green }}>
                {item.status === 'active' ? '🚫' : '✅'}
              </Text>
            </TouchableOpacity>
          ) : null}
          {onFeature ? (
            <TouchableOpacity style={styles.iconBtn} onPress={() => onFeature(item)}>
              <Text style={{ fontSize: 14, color: item.featured ? C.gold : C.text3 }}>⭐</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// User Row
function UserRow({ user, onPress, onToggle, onGrant }) {
  return (
    <TouchableOpacity style={styles.userRow} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.miniAvatar, { backgroundColor: avatarColor(user.name) }]}>
        <Text style={styles.miniAvatarText}>{(user.name || '?')[0].toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.userName}>{user.name || 'Unknown'}</Text>
        <Text style={styles.userEmail} numberOfLines={1}>{user.email || '—'}</Text>
      </View>
      <View style={styles.userChips}>
        <Chip label={user.premium ? 'PRO' : 'Free'} type={user.premium ? 'gold' : 'gray'} />
        <Chip label={user.active ? 'Active' : 'Banned'} type={user.active ? 'green' : 'red'} />
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => onToggle(user)}>
          <Text style={{ fontSize: 13, color: user.active ? C.red : C.green }}>
            {user.active ? '🚫' : '✅'}
          </Text>
        </TouchableOpacity>
        {!user.premium ? (
          <TouchableOpacity style={styles.iconBtn} onPress={() => onGrant(user)}>
            <Text style={{ fontSize: 13 }}>💎</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// Payment Row
function PaymentRow({ payment }) {
  const amt = parseInt(payment.amount || 0);
  return (
    <View style={styles.paymentRow}>
      <View style={[styles.payIcon, { backgroundColor: C.orangeLight }]}>
        <Text style={{ fontSize: 16 }}>💳</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.payPlan}>{payment.plan || 'Payment'}</Text>
        <Text style={styles.payMeta} numberOfLines={1}>
          {payment.user_name || 'Unknown'} · {fmtDate(payment.created_at)}
        </Text>
        {payment.razorpay_payment_id ? (
          <Text style={styles.payId}>{payment.razorpay_payment_id}</Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.payAmount}>{fmtCurrency(amt)}</Text>
        <Chip label={payment.status} type={payment.status === 'paid' ? 'green' : 'gray'} />
      </View>
    </View>
  );
}

// Filter Pills
function FilterPills({ filters, active, onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterStrip}>
      {filters.map(([f, label, count]) => (
        <TouchableOpacity
          key={f}
          style={[styles.filterPill, active === f && styles.filterPillActive]}
          onPress={() => onSelect(f)}
        >
          <Text style={[styles.filterPillText, active === f && styles.filterPillTextActive]}>
            {label} ({count})
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('admin@cityplus.app');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function doLogin() {
    if (!email || !password) { setError('Enter email and password'); return; }
    setLoading(true); setError('');
    try {
      const data = await apiCall('POST', '/api/auth/login', { email, password });
      if (!data.ok || !data.token) throw new Error(data.error || 'Login failed');
      if (data.user.role !== 'admin') throw new Error('Admin access required');
      _token = data.token;
      onLogin(data.user, data.token);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.loginScreen}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <View style={styles.loginBox}>
        <View style={styles.loginLogo}>
          <View style={styles.loginLogoIcon}>
            <Text style={{ color: '#fff', fontSize: 22 }}>📍</Text>
          </View>
          <View>
            <Text style={styles.loginLogoText}>NandedRozgar</Text>
            <Text style={styles.loginLogoSub}>ADMIN PORTAL</Text>
          </View>
        </View>
        <Text style={styles.loginTitle}>Welcome back</Text>
        <Text style={styles.loginSub}>Sign in to access the live admin dashboard</Text>

        <Text style={styles.loginFieldLabel}>EMAIL</Text>
        <TextInput
          style={styles.loginInput}
          value={email}
          onChangeText={setEmail}
          placeholder="admin@nandedrozgar.com"
          placeholderTextColor="#555"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={styles.loginFieldLabel}>PASSWORD</Text>
        <TextInput
          style={styles.loginInput}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#555"
          secureTextEntry
          onSubmitEditing={doLogin}
        />
        {error ? <Text style={styles.loginError}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.loginBtn, loading && { opacity: 0.6 }]}
          onPress={doLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginBtnText}>Sign in to Dashboard</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── User Detail Modal ────────────────────────────────────────────────────────
function UserModal({ user, visible, onClose, onToggle, onGrant, onVerify, onMakeAdmin }) {
  if (!user) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>User details</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={{ fontSize: 18, color: C.text2 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.modalAvatar, { backgroundColor: avatarColor(user.name) }]}>
            <Text style={styles.modalAvatarText}>{(user.name || '?')[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.modalName}>{user.name || 'Unknown'}</Text>
          <Text style={styles.modalEmail}>{user.email || '—'}</Text>
          <View style={styles.modalChips}>
            <Chip label={user.role === 'admin' ? 'Admin' : 'User'} type={user.role === 'admin' ? 'red' : 'blue'} />
            <Chip label={user.premium ? 'PRO' : 'Free'} type={user.premium ? 'gold' : 'gray'} />
            <Chip label={user.active ? 'Active' : 'Banned'} type={user.active ? 'green' : 'red'} />
            <Chip label={user.verified ? '✓ Verified' : 'Unverified'} type={user.verified ? 'green' : 'gray'} />
          </View>
          <View style={styles.infoTable}>
            {[
              ['Joined', fmtDate(user.created_at)],
              ['Role', user.role],
              ['Plan', user.premium ? 'PRO' : 'Free'],
              ['Company', user.company || '—'],
              ['Phone', user.phone || '—'],
            ].map(([k, v]) => (
              <View key={k} style={styles.infoRow}>
                <Text style={styles.infoKey}>{k}</Text>
                <Text style={styles.infoVal}>{v}</Text>
              </View>
            ))}
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, user.active ? styles.modalBtnDanger : styles.modalBtnGreen]}
              onPress={() => { onToggle(user); onClose(); }}
            >
              <Text style={[styles.modalBtnText, { color: user.active ? C.red : C.green }]}>
                {user.active ? 'Ban user' : 'Unban user'}
              </Text>
            </TouchableOpacity>
            {!user.premium ? (
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnOrange]}
                onPress={() => { onGrant(user); onClose(); }}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Grant PRO access</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnGray]}
              onPress={() => { onVerify(user); onClose(); }}
            >
              <Text style={[styles.modalBtnText, { color: C.text2 }]}>
                {user.verified ? 'Remove verified badge' : 'Mark as verified employer'}
              </Text>
            </TouchableOpacity>
            {user.role !== 'admin' ? (
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnGray]}
                onPress={() => { onMakeAdmin(user); onClose(); }}
              >
                <Text style={[styles.modalBtnText, { color: C.text2 }]}>Make admin</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Notify Modal ─────────────────────────────────────────────────────────────
function NotifyModal({ visible, onClose, onSend }) {
  const [target, setTarget] = useState('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!title || !body) { Alert.alert('Error', 'Fill in title and message'); return; }
    setLoading(true);
    await onSend(title, body, target);
    setLoading(false);
    setTitle(''); setBody('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Send Notification</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={{ fontSize: 18, color: C.text2 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.fieldLabel}>Target audience</Text>
          <View style={styles.segGroup}>
            {[['all', 'All Users'], ['pro', 'PRO Only'], ['free', 'Free Only']].map(([k, l]) => (
              <TouchableOpacity
                key={k}
                style={[styles.segBtn, target === k && styles.segBtnActive]}
                onPress={() => setTarget(k)}
              >
                <Text style={[styles.segBtnText, target === k && { color: '#fff' }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            style={styles.fieldInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Notification title…"
            placeholderTextColor={C.text3}
          />
          <Text style={styles.fieldLabel}>Message</Text>
          <TextInput
            style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]}
            value={body}
            onChangeText={setBody}
            placeholder="Write your message…"
            placeholderTextColor={C.text3}
            multiline
          />
          <TouchableOpacity
            style={[styles.modalBtn, styles.modalBtnOrange, loading && { opacity: 0.6 }]}
            onPress={send}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text style={[styles.modalBtnText, { color: '#fff' }]}>Send Notification</Text>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, visible, isError }) {
  if (!visible) return null;
  return (
    <View style={[styles.toast, { backgroundColor: isError ? C.redLight : C.dark, borderColor: isError ? C.red : 'transparent' }]}>
      <Text style={{ fontSize: 15 }}>{isError ? '⚠️' : '✅'}</Text>
      <Text style={[styles.toastText, { color: isError ? C.red : '#fff' }]}>{message}</Text>
    </View>
  );
}

// ─── MAIN ADMIN SCREEN ────────────────────────────────────────────────────────
export default function AdminScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true); // true = splash/loading
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [buysell, setBuysell] = useState([]);
  const [banners, setBanners] = useState([]);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);

  // UI state
  const [jobFilter, setJobFilter] = useState('all');
  const [roomFilter, setRoomFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [buysellFilter, setBuysellFilter] = useState('all');
  const [bannerFilter, setBannerFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');

  const [jobSearch, setJobSearch] = useState('');
  const [roomSearch, setRoomSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [buysellSearch, setBuysellSearch] = useState('');
  const [bannerSearch, setBannerSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Modals
  const [selectedUser, setSelectedUser] = useState(null);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [notifyModalVisible, setNotifyModalVisible] = useState(false);

  // Toast
  const [toast, setToast] = useState({ visible: false, message: '', isError: false });
  const toastTimer = useRef(null);

  function showToast(message, isError = false) {
    clearTimeout(toastTimer.current);
    setToast({ visible: true, message, isError });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }

  // ── Auto-login on mount: restore saved token ──
  useEffect(() => {
    async function restoreSession() {
      try {
        const savedToken = await AsyncStorage.getItem('nr_token');
        if (savedToken) {
          _token = savedToken;
          try {
            const d = await apiCall('GET', '/api/auth/me');
            if (d.ok && d.user?.role === 'admin') {
              setCurrentUser(d.user);
              setIsLoggedIn(true);
              setCheckingAuth(false);
              refreshAll();
              return;
            }
          } catch (_) {}
          // Token invalid or expired — clear it
          await AsyncStorage.multiRemove(['nr_token', 'nr_user']);
          _token = '';
        }
      } catch (_) {}
      // No token or failed — show login
      setCheckingAuth(false);
    }
    restoreSession();
  }, []);

  async function handleLogin(user, token) {
    _token = token;
    await AsyncStorage.setItem('nr_token', token);
    await AsyncStorage.setItem('nr_user', JSON.stringify(user));
    setCurrentUser(user);
    setIsLoggedIn(true);
    refreshAll();
  }

  async function handleLogout() {
    _token = '';
    await AsyncStorage.multiRemove(['nr_token', 'nr_user']);
    setIsLoggedIn(false);
    setCurrentUser(null);
  }

  async function refreshAll() {
    setRefreshing(true);
    try {
      const ENDPOINTS = [
        { key: 'stats',    url: '/api/admin/stats' },
        { key: 'jobs',     url: '/api/admin/jobs' },
        { key: 'rooms',    url: '/api/rooms' },
        { key: 'vehicles', url: '/api/vehicles' },
        { key: 'buysell',  url: '/api/admin/buysell' },
        { key: 'banners',  url: '/api/promotions/all' },
        { key: 'users',    url: '/api/admin/users' },
        { key: 'payments', url: '/api/admin/payments' },
      ];
      const results = await Promise.allSettled(
        ENDPOINTS.map(e => apiCall('GET', e.url))
      );
      const [sRes, jRes, rRes, vRes, bsRes, bnRes, uRes, pRes] = results.map(r =>
        r.status === 'fulfilled' ? r.value : {}
      );

      // Log which endpoints failed for debugging
      const failedEndpoints = results
        .map((r, i) => r.status === 'rejected' || !results[i].value?.ok
          ? `${ENDPOINTS[i].key}(${r.status === 'rejected' ? r.reason?.message : results[i].value?.error || 'not ok'})`
          : null)
        .filter(Boolean);

      if (sRes.ok) setStats(sRes.stats);
      // If admin endpoints return 401, token is invalid — force logout
      if (jRes.error === 'Unauthorized' || uRes.error === 'Unauthorized') {
        showToast('Session expired. Please log in again.', true);
        await handleLogout();
        return;
      }
      if (jRes.ok) setJobs(jRes.jobs || []);
      if (rRes.ok) setRooms(rRes.rooms || []);
      if (vRes.ok) setVehicles(vRes.vehicles || []);
      if (bsRes.ok) setBuysell(bsRes.items || bsRes.buysell || []);
      if (bnRes.ok) setBanners(bnRes.promotions || []);
      if (uRes.ok) setUsers(uRes.users || []);
      if (pRes.ok) setPayments(pRes.payments || []);

      if (failedEndpoints.length > 0) {
        showToast(`Failed: ${failedEndpoints.join(', ')}`, true);
      }
    } catch (e) {
      showToast('Network error: ' + (e.message || 'Check your connection'), true);
    } finally {
      setRefreshing(false);
    }
  }

  // ── Filtered data ──
  const filteredJobs = jobs
    .filter(j => jobFilter === 'all' ? true : jobFilter === 'active' ? j.status === 'active' : jobFilter === 'inactive' ? j.status === 'inactive' : jobFilter === 'featured' ? j.featured : j.urgent)
    .filter(j => !jobSearch || (j.title || '').toLowerCase().includes(jobSearch.toLowerCase()) || (j.company || '').toLowerCase().includes(jobSearch.toLowerCase()));

  const filteredRooms = rooms
    .filter(r => roomFilter === 'all' ? true : roomFilter === 'active' ? r.status === 'active' : roomFilter === 'inactive' ? r.status === 'inactive' : r.plan_label === 'Featured')
    .filter(r => !roomSearch || (r.area || '').toLowerCase().includes(roomSearch.toLowerCase()));

  const filteredVehicles = vehicles
    .filter(v => vehicleFilter === 'all' ? true : vehicleFilter === 'active' ? v.status === 'active' : v.status === 'inactive')
    .filter(v => !vehicleSearch || (v.name || v.vehicle_type || '').toLowerCase().includes(vehicleSearch.toLowerCase()));

  const filteredBuySell = buysell
    .filter(b => buysellFilter === 'all' ? true : buysellFilter === 'active' ? b.status === 'active' : buysellFilter === 'inactive' ? b.status === 'inactive' : b.plan_label === 'Featured')
    .filter(b => !buysellSearch || (b.title || '').toLowerCase().includes(buysellSearch.toLowerCase()));

  const filteredBanners = banners
    .filter(b => bannerFilter === 'all' ? true : bannerFilter === 'active' ? b.status === 'active' : bannerFilter === 'pending' ? b.status === 'pending' : bannerFilter === 'expired' ? (b.status === 'expired' || b.status === 'rejected') : b.plan === bannerFilter)
    .filter(b => !bannerSearch || (b.biz_name || '').toLowerCase().includes(bannerSearch.toLowerCase()));

  const filteredUsers = users
    .filter(u => userFilter === 'all' ? true : userFilter === 'pro' ? u.premium : userFilter === 'banned' ? !u.active : u.role === 'admin')
    .filter(u => !userSearch || (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) || (u.email || '').toLowerCase().includes(userSearch.toLowerCase()));

  // ── Admin actions ──
  async function toggleJobStatus(job) {
    const newStatus = job.status === 'active' ? 'inactive' : 'active';
    const d = await apiCall('PATCH', `/api/admin/jobs/${job.id}/status`, { status: newStatus });
    if (d.ok) {
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: newStatus } : j));
      showToast(`Job ${newStatus}`);
    } else showToast(d.error || 'Failed', true);
  }

  async function toggleJobFeatured(job) {
    const d = await apiCall('PATCH', `/api/admin/jobs/${job.id}/feature`, { featured: !job.featured });
    if (d.ok) {
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, featured: !job.featured } : j));
      showToast(job.featured ? 'Feature removed' : 'Job featured!');
    } else showToast(d.error || 'Failed', true);
  }

  async function toggleUserStatus(user) {
    const d = await apiCall('PATCH', `/api/admin/users/${user.id}/toggle`);
    if (d.ok) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: d.user.active } : u));
      showToast(d.user.active ? 'User unbanned' : 'User banned');
    } else showToast(d.error || 'Failed', true);
  }

  async function grantPro(user) {
    const d = await apiCall('PATCH', `/api/admin/users/${user.id}/grant-pro`);
    if (d.ok) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, premium: true } : u));
      showToast('PRO access granted!');
    } else showToast(d.error || 'Failed', true);
  }

  async function verifyUser(user) {
    const endpoint = user.verified ? 'unverify' : 'verify';
    const d = await apiCall('PATCH', `/api/admin/users/${user.id}/${endpoint}`);
    if (d.ok) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, verified: !user.verified } : u));
      showToast(!user.verified ? 'Employer verified!' : 'Badge removed');
    } else showToast(d.error || 'Failed', true);
  }

  async function makeAdmin(user) {
    const d = await apiCall('PATCH', `/api/admin/users/${user.id}/role`, { role: 'admin' });
    if (d.ok) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: 'admin' } : u));
      showToast('Admin role granted!');
    } else showToast(d.error || 'Failed', true);
  }

  async function sendNotification(title, body, target) {
    const d = await apiCall('POST', '/api/admin/notifications', { title, body, target });
    if (d.ok) showToast(`Sent to ${d.sent_to} users!`);
    else showToast(d.error || 'Failed to send', true);
  }

  // ── Revenue calculations ──
  const paidPayments = payments.filter(p => p.status === 'paid');
  const totalRevenue = paidPayments.reduce((a, p) => a + parseInt(p.amount || 0), 0);
  const proUsers = users.filter(u => u.premium).length;

  // ── Tab navigation ──
  const TABS = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'jobs', label: `💼 Jobs (${jobs.length})` },
    { id: 'rooms', label: `🏠 Rooms (${rooms.length})` },
    { id: 'vehicles', label: `🚗 Vehicles (${vehicles.length})` },
    { id: 'buysell', label: `🛍 Buy & Sell (${buysell.length})` },
    { id: 'banners', label: `📣 Banners (${banners.length})` },
    { id: 'users', label: `👥 Users (${users.length})` },
    { id: 'revenue', label: '₹ Revenue' },
    { id: 'payments', label: '🧾 Payments' },
  ];

  // Show splash while checking saved token
  if (checkingAuth) {
    return (
      <SafeAreaView style={[styles.loginScreen, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={styles.loginLogoIcon}>
          <Text style={{ color: '#fff', fontSize: 28 }}>📍</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 16 }}>NandedRozgar</Text>
        <Text style={{ color: '#555', fontSize: 12, marginTop: 4, marginBottom: 32 }}>ADMIN PORTAL</Text>
        <ActivityIndicator color={C.orange} size="large" />
      </SafeAreaView>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} />

      {/* Topbar */}
      <View style={styles.topbar}>
        <View style={styles.topbarLogo}>
          <Text style={{ color: '#fff', fontSize: 14 }}>📍</Text>
        </View>
        <Text style={styles.topbarTitle}>NandedRozgar Admin</Text>
        <TouchableOpacity style={styles.topbarBtn} onPress={() => setNotifyModalVisible(true)}>
          <Text style={{ fontSize: 18 }}>🔔</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.topbarBtn} onPress={refreshAll}>
          <Text style={{ fontSize: 18 }}>🔄</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.topbarBtn} onPress={handleLogout}>
          <Text style={{ fontSize: 18 }}>🚪</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBarWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabItemText, activeTab === tab.id && styles.tabItemTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={C.orange} />}
      >

        {/* ═══ OVERVIEW ═══ */}
        {activeTab === 'overview' && (
          <View>
            {/* KPI Grid */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={styles.kpiRow}>
                <KpiCard icon="💼" value={jobs.length} label="Total Jobs" color={C.orange} bg={C.orangeLight} sub={`${stats?.active_jobs || 0} active`} />
                <KpiCard icon="🏠" value={rooms.length} label="Rooms / PG" color={C.blue} bg={C.blueLight} sub={`${rooms.filter(r => r.status === 'active').length} active`} />
                <KpiCard icon="🚗" value={vehicles.length} label="Vehicles" color={C.teal} bg={C.tealLight} sub={`${vehicles.filter(v => v.status === 'active').length} active`} />
                <KpiCard icon="🛍" value={buysell.length} label="Buy & Sell" color={C.red} bg={C.redLight} sub={`${buysell.filter(b => b.status === 'active').length} active`} />
                <KpiCard icon="📣" value={banners.length} label="Banners" color={C.gold} bg={C.goldLight} sub={`${banners.filter(b => b.status === 'active').length} active`} />
                <KpiCard icon="👥" value={users.length} label="Total Users" color={C.purple} bg={C.purpleLight} sub={`${proUsers} PRO`} />
                <KpiCard icon="👁" value={parseInt(stats?.total_views || 0).toLocaleString('en-IN')} label="Total Views" color={C.blue} bg={C.blueLight} />
                <KpiCard icon="₹" value={fmtCurrency(totalRevenue)} label="Real Revenue" color={C.green} bg={C.greenLight} sub={`${paidPayments.length} payments`} />
              </View>
            </ScrollView>

            {/* Alerts */}
            {users.filter(u => !u.active).length > 0 && (
              <View style={[styles.alert, { borderLeftColor: C.red }]}>
                <Text style={{ color: C.red, fontWeight: '700', fontSize: 13 }}>
                  ⚠️ {users.filter(u => !u.active).length} banned user(s) on platform
                </Text>
              </View>
            )}

            {/* Health Bars */}
            <Card title="Platform Health" icon="⚡" iconColor={C.purple} iconBg={C.purpleLight}>
              <ProgressBar label="Active Jobs" value={parseInt(stats?.active_jobs || 0)} total={jobs.length} color={C.orange} />
              <ProgressBar label="Active Rooms" value={rooms.filter(r => r.status === 'active').length} total={rooms.length} color={C.blue} />
              <ProgressBar label="Active Vehicles" value={vehicles.filter(v => v.status === 'active').length} total={vehicles.length} color={C.teal} />
              <ProgressBar label="Active Buy&Sell" value={buysell.filter(b => b.status === 'active').length} total={buysell.length} color={C.red} />
              <ProgressBar label="Active Banners" value={banners.filter(b => b.status === 'active').length} total={banners.length} color={C.gold} />
              <ProgressBar label="PRO Users" value={proUsers} total={users.length} color={C.purple} />
            </Card>

            {/* Quick Actions */}
            <Card title="Quick Actions" icon="⚡" iconColor={C.orange} iconBg={C.orangeLight} style={{ marginTop: 14 }}>
              <View style={styles.quickActionsGrid}>
                {[
                  { emoji: '🔔', label: 'Notify', color: C.purple, onPress: () => setNotifyModalVisible(true) },
                  { emoji: '💼', label: 'Jobs', color: C.orange, onPress: () => setActiveTab('jobs') },
                  { emoji: '👥', label: 'Users', color: C.blue, onPress: () => setActiveTab('users') },
                  { emoji: '₹', label: 'Revenue', color: C.green, onPress: () => setActiveTab('revenue') },
                  { emoji: '📣', label: 'Banners', color: C.gold, onPress: () => setActiveTab('banners') },
                  { emoji: '🧾', label: 'Payments', color: C.teal, onPress: () => setActiveTab('payments') },
                ].map(({ emoji, label, color, onPress }) => (
                  <TouchableOpacity key={label} style={[styles.quickAction, { borderTopColor: color }]} onPress={onPress}>
                    <Text style={{ fontSize: 22, marginBottom: 5 }}>{emoji}</Text>
                    <Text style={styles.quickActionLabel}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            {/* Recent Listings */}
            <Card title="Recent Listings" icon="🕐" iconColor={C.orange} iconBg={C.orangeLight} action="See all →" onAction={() => setActiveTab('jobs')} style={{ marginTop: 14 }}>
              {jobs.slice(0, 5).map(j => (
                <View key={j.id} style={styles.listRow}>
                  <View style={[styles.listIcon, { backgroundColor: C.orangeLight }]}>
                    <Text style={{ fontSize: 14 }}>💼</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listName} numberOfLines={1}>{j.title}</Text>
                    <Text style={styles.listSub}>{j.company || '—'} · {j.category}</Text>
                  </View>
                  <Chip label={j.status} type={j.status === 'active' ? 'green' : 'red'} />
                </View>
              ))}
            </Card>

            {/* Recent Users */}
            <Card title="Recently Joined" icon="👤" iconColor={C.green} iconBg={C.greenLight} action="See all →" onAction={() => setActiveTab('users')} style={{ marginTop: 14, marginBottom: 30 }}>
              {users.slice(0, 5).map(u => (
                <View key={u.id} style={styles.listRow}>
                  <View style={[styles.listAvatar, { backgroundColor: avatarColor(u.name) }]}>
                    <Text style={styles.listAvatarText}>{(u.name || '?')[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listName}>{u.name || 'Unknown'}</Text>
                    <Text style={styles.listSub} numberOfLines={1}>{u.email || '—'}</Text>
                  </View>
                  <Chip label={u.premium ? 'PRO' : 'Free'} type={u.premium ? 'gold' : 'gray'} />
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* ═══ JOBS ═══ */}
        {activeTab === 'jobs' && (
          <View>
            <TextInput style={styles.searchBox} value={jobSearch} onChangeText={setJobSearch} placeholder="🔍 Search by title, company…" placeholderTextColor={C.text3} />
            <FilterPills
              filters={[['all', 'All', jobs.length], ['active', 'Active', jobs.filter(j => j.status === 'active').length], ['inactive', 'Inactive', jobs.filter(j => j.status === 'inactive').length], ['featured', '★ Featured', jobs.filter(j => j.featured).length], ['urgent', '🔥 Urgent', jobs.filter(j => j.urgent).length]]}
              active={jobFilter} onSelect={setJobFilter}
            />
            <Text style={styles.resultCount}>{filteredJobs.length} listings</Text>
            {filteredJobs.map(j => (
              <ListingCard key={j.id} item={j} type="job"
                onPress={() => { /* open job detail */ }}
                onToggle={toggleJobStatus}
                onFeature={toggleJobFeatured}
              />
            ))}
            <View style={{ height: 30 }} />
          </View>
        )}

        {/* ═══ ROOMS ═══ */}
        {activeTab === 'rooms' && (
          <View>
            <TextInput style={styles.searchBox} value={roomSearch} onChangeText={setRoomSearch} placeholder="🔍 Search by area, type…" placeholderTextColor={C.text3} />
            <FilterPills
              filters={[['all', 'All', rooms.length], ['active', 'Active', rooms.filter(r => r.status === 'active').length], ['inactive', 'Inactive', rooms.filter(r => r.status === 'inactive').length]]}
              active={roomFilter} onSelect={setRoomFilter}
            />
            <Text style={styles.resultCount}>{filteredRooms.length} rooms</Text>
            {filteredRooms.map(r => (
              <ListingCard key={r.id} item={r} type="room" onPress={() => { }} />
            ))}
            <View style={{ height: 30 }} />
          </View>
        )}

        {/* ═══ VEHICLES ═══ */}
        {activeTab === 'vehicles' && (
          <View>
            <TextInput style={styles.searchBox} value={vehicleSearch} onChangeText={setVehicleSearch} placeholder="🔍 Search vehicles…" placeholderTextColor={C.text3} />
            <FilterPills
              filters={[['all', 'All', vehicles.length], ['active', 'Active', vehicles.filter(v => v.status === 'active').length], ['inactive', 'Inactive', vehicles.filter(v => v.status === 'inactive').length]]}
              active={vehicleFilter} onSelect={setVehicleFilter}
            />
            <Text style={styles.resultCount}>{filteredVehicles.length} vehicles</Text>
            {filteredVehicles.map(v => (
              <ListingCard key={v.id} item={v} type="vehicle" onPress={() => { }} />
            ))}
            <View style={{ height: 30 }} />
          </View>
        )}

        {/* ═══ BUY & SELL ═══ */}
        {activeTab === 'buysell' && (
          <View>
            <TextInput style={styles.searchBox} value={buysellSearch} onChangeText={setBuysellSearch} placeholder="🔍 Search items…" placeholderTextColor={C.text3} />
            <FilterPills
              filters={[['all', 'All', buysell.length], ['active', 'Active', buysell.filter(b => b.status === 'active').length], ['inactive', 'Inactive', buysell.filter(b => b.status === 'inactive').length]]}
              active={buysellFilter} onSelect={setBuysellFilter}
            />
            <Text style={styles.resultCount}>{filteredBuySell.length} items</Text>
            {filteredBuySell.map(b => (
              <ListingCard key={b.id} item={b} type="buysell" onPress={() => { }} />
            ))}
            <View style={{ height: 30 }} />
          </View>
        )}

        {/* ═══ BANNERS ═══ */}
        {activeTab === 'banners' && (
          <View>
            <TextInput style={styles.searchBox} value={bannerSearch} onChangeText={setBannerSearch} placeholder="🔍 Search banners…" placeholderTextColor={C.text3} />
            <FilterPills
              filters={[['all', 'All', banners.length], ['active', 'Active', banners.filter(b => b.status === 'active').length], ['pending', 'Pending', banners.filter(b => b.status === 'pending').length], ['expired', 'Expired', banners.filter(b => b.status === 'expired').length], ['premium', 'Premium', banners.filter(b => b.plan === 'premium').length]]}
              active={bannerFilter} onSelect={setBannerFilter}
            />
            <Text style={styles.resultCount}>{filteredBanners.length} promotions</Text>
            {filteredBanners.map(b => {
              const planColor = { basic: C.blue, popular: C.orange, premium: C.purple }[b.plan] || C.orange;
              const pm = PROMO_PLANS[b.plan] || { price: 0, days: 0 };
              return (
                <View key={b.id} style={[styles.promoCard, { borderLeftColor: b.accent_color || C.orange }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.promoBiz}>{b.biz_name}</Text>
                    <Text style={styles.promoTag}>{b.tagline || b.category || ''}</Text>
                    <View style={styles.promoMeta}>
                      <Chip label={b.status} type={b.status === 'active' ? 'green' : b.status === 'pending' ? 'pending' : 'red'} />
                      <Chip label={b.plan} type="gray" />
                      <Chip label={b.category || '—'} type="gray" />
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.promoPlanPrice, { color: planColor }]}>
                      ₹{b.plan_price || pm.price}
                    </Text>
                    <Text style={{ fontSize: 10, color: C.text3 }}>{b.plan_days || pm.days} days</Text>
                    <Text style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>
                      Exp: {b.expires_at ? new Date(b.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                    </Text>
                  </View>
                </View>
              );
            })}
            <View style={{ height: 30 }} />
          </View>
        )}

        {/* ═══ USERS ═══ */}
        {activeTab === 'users' && (
          <View>
            <TextInput style={styles.searchBox} value={userSearch} onChangeText={setUserSearch} placeholder="🔍 Search by name, email…" placeholderTextColor={C.text3} />
            <FilterPills
              filters={[['all', 'All', users.length], ['pro', '💎 PRO', users.filter(u => u.premium).length], ['banned', 'Banned', users.filter(u => !u.active).length], ['admin', 'Admin', users.filter(u => u.role === 'admin').length]]}
              active={userFilter} onSelect={setUserFilter}
            />
            <Text style={styles.resultCount}>{filteredUsers.length} users</Text>
            {filteredUsers.map(u => (
              <UserRow
                key={u.id}
                user={u}
                onPress={() => { setSelectedUser(u); setUserModalVisible(true); }}
                onToggle={toggleUserStatus}
                onGrant={grantPro}
              />
            ))}
            <View style={{ height: 30 }} />
          </View>
        )}

        {/* ═══ REVENUE ═══ */}
        {activeTab === 'revenue' && (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={styles.kpiRow}>
                <KpiCard icon="₹" value={fmtCurrency(totalRevenue)} label="Total Revenue" color={C.green} bg={C.greenLight} sub={`${paidPayments.length} payments`} />
                <KpiCard icon="⭐" value={fmtCurrency(paidPayments.filter(p => p.plan === 'featured').reduce((a, p) => a + parseInt(p.amount || 0), 0))} label="Featured Boosts" color={C.gold} bg={C.goldLight} />
                <KpiCard icon="🔥" value={fmtCurrency(paidPayments.filter(p => p.plan === 'urgent').reduce((a, p) => a + parseInt(p.amount || 0), 0))} label="Urgent Badges" color={C.red} bg={C.redLight} />
                <KpiCard icon="📣" value={fmtCurrency(paidPayments.filter(p => ['basic', 'popular', 'premium'].includes(p.plan)).reduce((a, p) => a + parseInt(p.amount || 0), 0))} label="Promo Banners" color={C.orange} bg={C.orangeLight} />
                <KpiCard icon="💎" value={fmtCurrency(paidPayments.filter(p => p.plan === 'pro' || p.plan === 'pro_monthly').reduce((a, p) => a + parseInt(p.amount || 0), 0))} label="PRO Subs" color={C.purple} bg={C.purpleLight} />
              </View>
            </ScrollView>

            <Card title="Pricing Plans" icon="🏷" iconColor={C.blue} iconBg={C.blueLight}>
              {[
                { label: 'Free', price: 0, desc: 'Standard listing — 30 days' },
                { label: 'Featured', price: 99, desc: 'Top placement + badge' },
                { label: 'Urgent', price: 49, desc: 'Urgent tag + priority listing' },
              ].map(p => (
                <View key={p.label} style={styles.planRow}>
                  <View>
                    <Text style={styles.planName}>{p.label}</Text>
                    <Text style={styles.planDesc}>{p.desc}</Text>
                  </View>
                  <Text style={[styles.planPrice, { color: C.orange }]}>{p.price > 0 ? `₹${p.price}` : 'Free'}</Text>
                </View>
              ))}
              <View style={styles.sectionDivider} />
              <Text style={styles.planSectionLabel}>PROMO BANNER PLANS</Text>
              {Object.entries(PROMO_PLANS).map(([k, v]) => (
                <View key={k} style={styles.planRow}>
                  <View>
                    <Text style={styles.planName}>{k.charAt(0).toUpperCase() + k.slice(1)}</Text>
                    <Text style={styles.planDesc}>{v.days} days promotion</Text>
                  </View>
                  <Text style={[styles.planPrice, { color: C.orange }]}>₹{v.price}</Text>
                </View>
              ))}
            </Card>

            <Card title="Revenue Projections" icon="📈" iconColor={C.green} iconBg={C.greenLight} style={{ marginTop: 14, marginBottom: 30 }}>
              {[
                { label: '20 featured jobs/month', proj: '₹1,980/mo', color: C.gold },
                { label: '30 urgent badges/month', proj: '₹1,470/mo', color: C.red },
                { label: '100 PRO employers', proj: '₹49,900/mo', color: C.purple },
                { label: '50 promo banners/month', proj: '₹12,450/mo', color: C.orange },
                { label: 'Combined potential', proj: '₹1,35,000+/mo', color: C.green, bold: true },
              ].map(r => (
                <View key={r.label} style={styles.planRow}>
                  <Text style={{ fontSize: 13, color: C.text2, fontWeight: r.bold ? '800' : '400' }}>{r.label}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: r.color }}>{r.proj}</Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* ═══ PAYMENTS ═══ */}
        {activeTab === 'payments' && (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={styles.kpiRow}>
                <KpiCard icon="₹" value={fmtCurrency(totalRevenue)} label="Total Collected" color={C.green} bg={C.greenLight} sub={`${paidPayments.length} transactions`} />
                <KpiCard icon="📅" value={fmtCurrency(paidPayments.filter(p => new Date(p.created_at) >= new Date(new Date().setHours(0, 0, 0, 0))).reduce((a, p) => a + parseInt(p.amount || 0), 0))} label="Today's Revenue" color={C.blue} bg={C.blueLight} />
                <KpiCard icon="🧾" value={payments.length} label="Total Payments" color={C.orange} bg={C.orangeLight} />
                <KpiCard icon="📊" value={paidPayments.length > 0 ? fmtCurrency(Math.round(totalRevenue / paidPayments.length)) : '₹0'} label="Avg. Transaction" color={C.purple} bg={C.purpleLight} />
              </View>
            </ScrollView>
            <Card title={`All Payments (${payments.length})`} icon="🧾" iconColor={C.teal} iconBg={C.tealLight}>
              {payments.length === 0 ? (
                <Text style={styles.emptyText}>No payment records yet.</Text>
              ) : (
                payments.map((p, i) => <PaymentRow key={p.id || i} payment={p} />)
              )}
            </Card>
            <View style={{ height: 30 }} />
          </View>
        )}

      </ScrollView>

      {/* Modals */}
      <UserModal
        user={selectedUser}
        visible={userModalVisible}
        onClose={() => setUserModalVisible(false)}
        onToggle={toggleUserStatus}
        onGrant={grantPro}
        onVerify={verifyUser}
        onMakeAdmin={makeAdmin}
      />
      <NotifyModal
        visible={notifyModalVisible}
        onClose={() => setNotifyModalVisible(false)}
        onSend={sendNotification}
      />

      {/* Toast */}
      <Toast message={toast.message} visible={toast.visible} isError={toast.isError} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  // Login
  loginScreen: { flex: 1, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center', padding: 20 },
  loginBox: { backgroundColor: '#1a1a18', borderWidth: 1, borderColor: '#2a2a28', borderRadius: 20, padding: 32, width: '100%', maxWidth: 400 },
  loginLogo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28 },
  loginLogoIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' },
  loginLogoText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  loginLogoSub: { color: '#555', fontSize: 10, fontWeight: '600', letterSpacing: 0.8 },
  loginTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  loginSub: { fontSize: 13, color: '#666', marginBottom: 24 },
  loginFieldLabel: { fontSize: 11, fontWeight: '700', color: '#888', marginBottom: 5, letterSpacing: 0.5 },
  loginInput: { backgroundColor: '#111110', borderWidth: 1.5, borderColor: '#2a2a28', borderRadius: 10, padding: 12, fontSize: 14, color: '#fff', marginBottom: 14 },
  loginError: { fontSize: 12, color: C.red, marginBottom: 10, fontWeight: '600' },
  loginBtn: { backgroundColor: C.orange, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  loginBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Topbar
  topbar: { height: 56, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
  topbarLogo: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' },
  topbarTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: C.text },
  topbarBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },

  // Tabs
  tabBarWrap: { backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border },
  tabBar: { padding: 6, gap: 4 },
  tabItem: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 7, borderWidth: 1, borderColor: 'transparent' },
  tabItemActive: { backgroundColor: C.dark },
  tabItemText: { fontSize: 12, fontWeight: '600', color: C.text2, whiteSpace: 'nowrap' },
  tabItemTextActive: { color: '#fff' },

  // Content
  content: { flex: 1, padding: 14 },

  // KPI
  kpiRow: { flexDirection: 'row', gap: 10, paddingRight: 14 },
  kpiCard: { backgroundColor: C.surface, borderRadius: 12, padding: 14, width: 140, borderTopWidth: 3, borderWidth: 1, borderColor: C.border },
  kpiIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiIconText: { fontSize: 16 },
  kpiValue: { fontSize: 20, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'] },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: C.text2, marginTop: 2 },
  kpiSub: { fontSize: 10, color: C.text3, marginTop: 2 },

  // Progress
  progressRow: { marginBottom: 12 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: 12, fontWeight: '600', color: C.text2 },
  progressValue: { fontSize: 12, fontWeight: '800' },
  progressTrack: { height: 6, backgroundColor: C.bg, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressPct: { fontSize: 10, color: C.text3, marginTop: 2 },

  // Card
  card: { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 14, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitleIcon: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  cardTitleText: { fontSize: 13, fontWeight: '700', color: C.text },
  cardAction: { fontSize: 12, fontWeight: '700', color: C.orange },
  cardBody: { padding: 14 },

  // Quick Actions
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickAction: { width: '30%', backgroundColor: C.bg, borderRadius: 10, borderWidth: 1, borderColor: C.border, borderTopWidth: 3, padding: 12, alignItems: 'center' },
  quickActionLabel: { fontSize: 11, fontWeight: '700', color: C.text },

  // Alert
  alert: { backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border, borderLeftWidth: 4, padding: 12, marginBottom: 12 },

  // List rows
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  listIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  listAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  listAvatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  listName: { fontSize: 13, fontWeight: '700', color: C.text },
  listSub: { fontSize: 11, color: C.text2, marginTop: 1 },

  // Chip
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 10, fontWeight: '700' },

  // Filter
  filterStrip: { marginBottom: 12 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface, marginRight: 6 },
  filterPillActive: { backgroundColor: C.dark, borderColor: C.dark },
  filterPillText: { fontSize: 12, fontWeight: '600', color: C.text2 },
  filterPillTextActive: { color: '#fff' },

  // Search
  searchBox: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 9, padding: 10, fontSize: 13, color: C.text, marginBottom: 12 },
  resultCount: { fontSize: 11, color: C.text3, fontWeight: '600', marginBottom: 10 },

  // Listing Card
  listingCard: { backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10 },
  listingTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  listingTypeBadge: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  listingTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  listingMeta: { fontSize: 11, color: C.text2, marginTop: 2 },
  listingBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listingStats: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 },
  listingPrice: { fontSize: 13, fontWeight: '800' },
  listingStat: { fontSize: 11, color: C.text3 },
  listingActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 28, height: 28, borderRadius: 7, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },

  // Promo Card
  promoCard: { backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border, borderLeftWidth: 4, padding: 14, marginBottom: 10, flexDirection: 'row', gap: 10 },
  promoBiz: { fontSize: 14, fontWeight: '700', color: C.text },
  promoTag: { fontSize: 11, color: C.text2, marginTop: 2 },
  promoMeta: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  promoPlanPrice: { fontSize: 15, fontWeight: '800' },

  // User row
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 8 },
  miniAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  miniAvatarText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  userName: { fontSize: 13, fontWeight: '700', color: C.text },
  userEmail: { fontSize: 11, color: C.text2 },
  userChips: { flexDirection: 'column', gap: 3 },

  // Payment row
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  payIcon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  payPlan: { fontSize: 13, fontWeight: '700', color: C.text, textTransform: 'capitalize' },
  payMeta: { fontSize: 11, color: C.text2, marginTop: 1 },
  payId: { fontSize: 10, color: C.text3, fontFamily: 'monospace', marginTop: 1 },
  payAmount: { fontSize: 15, fontWeight: '800', color: C.green },

  // Revenue/Plan
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  planName: { fontSize: 13, fontWeight: '700', color: C.text },
  planDesc: { fontSize: 11, color: C.text3 },
  planPrice: { fontSize: 14, fontWeight: '800' },
  planSectionLabel: { fontSize: 11, fontWeight: '700', color: C.text3, letterSpacing: 0.5, marginBottom: 8 },
  sectionDivider: { height: 1, backgroundColor: C.border, marginVertical: 12 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  modalAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 },
  modalAvatarText: { color: '#fff', fontSize: 26, fontWeight: '900' },
  modalName: { fontSize: 17, fontWeight: '800', color: C.text, textAlign: 'center' },
  modalEmail: { fontSize: 12, color: C.text2, textAlign: 'center', marginTop: 2 },
  modalChips: { flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginVertical: 14 },
  infoTable: { backgroundColor: C.surface2, borderRadius: 9, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: C.border },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  infoKey: { color: C.text2, fontWeight: '600', fontSize: 13 },
  infoVal: { color: C.text, fontWeight: '700', fontSize: 13 },
  modalActions: { gap: 8 },
  modalBtn: { padding: 12, borderRadius: 9, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  modalBtnOrange: { backgroundColor: C.orange, borderColor: C.orange },
  modalBtnGreen: { backgroundColor: C.greenLight, borderColor: C.greenBorder },
  modalBtnDanger: { backgroundColor: C.redLight, borderColor: C.redBorder },
  modalBtnGray: { backgroundColor: C.surface2, borderColor: C.border },
  modalBtnText: { fontSize: 13, fontWeight: '700' },

  // Notify
  fieldLabel: { fontSize: 12, fontWeight: '700', color: C.text2, marginBottom: 5 },
  fieldInput: { borderWidth: 1.5, borderColor: C.border, borderRadius: 9, padding: 10, fontSize: 13, color: C.text, backgroundColor: C.surface2, marginBottom: 14 },
  segGroup: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  segBtn: { flex: 1, padding: 8, borderRadius: 8, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface2, alignItems: 'center' },
  segBtnActive: { backgroundColor: C.dark, borderColor: C.dark },
  segBtnText: { fontSize: 12, fontWeight: '600', color: C.text2 },

  // Toast
  toast: { position: 'absolute', bottom: 24, right: 16, left: 16, borderRadius: 12, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 },
  toastText: { fontSize: 13, fontWeight: '600', flex: 1 },

  // Empty
  emptyText: { textAlign: 'center', color: C.text3, fontSize: 13, padding: 24 },
});
