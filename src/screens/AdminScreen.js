import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, TextInput, Modal, Alert, Animated,
  Dimensions, FlatList, Switch,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { http } from '../utils/api';
import { Card, Btn, Chip } from '../components/UI';
import { C, PRICING, JOB_PLANS, CAR_PLANS, ROOM_PLANS, BUYSELL_PLANS } from '../utils/constants';

const ORANGE  = '#f97316';
const GREEN   = '#22c55e';
const RED     = '#ef4444';
const BLUE    = '#3b82f6';
const PURPLE  = '#8b5cf6';
const GOLD    = '#eab308';
const BG      = '#f8f8f8';
const DARK    = '#111111';

const { width: SW } = Dimensions.get('window');

// ─── Mini stat card ──────────────────────────────────────────────────────────
function StatCard({ icon, value, label, color = ORANGE, trend, sub }) {
  return (
    <View style={[ss.statCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <View style={[ss.statIconBox, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={ss.statVal}>{value}</Text>
      <Text style={ss.statLbl}>{label}</Text>
      {sub ? <Text style={ss.statSub}>{sub}</Text> : null}
      {trend != null && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
          <Ionicons
            name={trend >= 0 ? 'trending-up' : 'trending-down'}
            size={12}
            color={trend >= 0 ? GREEN : RED}
          />
          <Text style={{ fontSize: 10, color: trend >= 0 ? GREEN : RED, fontWeight: '700' }}>
            {Math.abs(trend)}%
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────
function SectionHeader({ title, icon, count, color = ORANGE, action, actionLabel }) {
  return (
    <View style={ss.sectionHeader}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[ss.sectionIconBox, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon} size={15} color={color} />
        </View>
        <Text style={ss.sectionTitle}>{title}</Text>
        {count != null && (
          <View style={[ss.badge, { backgroundColor: color }]}>
            <Text style={ss.badgeText}>{count}</Text>
          </View>
        )}
      </View>
      {action && (
        <TouchableOpacity onPress={action}>
          <Text style={{ fontSize: 12, color: ORANGE, fontWeight: '700' }}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Search bar ──────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }) {
  return (
    <View style={ss.searchBar}>
      <Ionicons name="search" size={15} color="#aaa" />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#bbb"
        style={ss.searchInput}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChange('')}>
          <Ionicons name="close-circle" size={16} color="#bbb" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Revenue bar ─────────────────────────────────────────────────────────────
function RevenueBar({ label, amount, total, color }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: DARK }}>{label}</Text>
        <Text style={{ fontSize: 12, fontWeight: '800', color }}> ₹{amount.toLocaleString('en-IN')}</Text>
      </View>
      <View style={{ height: 6, backgroundColor: '#ebebeb', borderRadius: 3 }}>
        <View style={{ height: 6, width: `${Math.min(pct, 100)}%`, backgroundColor: color, borderRadius: 3 }} />
      </View>
      <Text style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>{pct.toFixed(1)}% of total</Text>
    </View>
  );
}

// ─── User detail modal ───────────────────────────────────────────────────────
function UserModal({ user, visible, onClose, onToggle, onGrantPro, onRevokeRole, onMakeAdmin }) {
  if (!user) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ss.modalOverlay}>
        <View style={ss.modalBox}>
          <View style={ss.modalHeader}>
            <Text style={ss.modalTitle}>User Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={DARK} />
            </TouchableOpacity>
          </View>

          {/* Avatar + name */}
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <View style={ss.avatar}>
              <Text style={ss.avatarText}>{(user.name || 'U')[0].toUpperCase()}</Text>
            </View>
            <Text style={{ fontSize: 17, fontWeight: '800', color: DARK, marginTop: 10 }}>{user.name}</Text>
            <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{user.email}</Text>
            {user.phone ? <Text style={{ fontSize: 12, color: '#888' }}>{user.phone}</Text> : null}
            {user.company ? <Text style={{ fontSize: 12, color: ORANGE, marginTop: 2, fontWeight: '600' }}>{user.company}</Text> : null}
          </View>

          {/* Status chips */}
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <Chip label={user.role === 'admin' ? '🔑 Admin' : '👤 User'} variant={user.role === 'admin' ? 'red' : 'blue'} />
            <Chip label={user.premium ? '💎 PRO' : 'Free'} variant={user.premium ? 'green' : 'gray'} />
            <Chip label={user.active ? '✅ Active' : '🚫 Banned'} variant={user.active ? 'green' : 'red'} />
          </View>

          {/* Info rows */}
          <View style={ss.infoTable}>
            {[
              ['Joined', user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'],
              ['Role',    user.role],
              ['Status',  user.active ? 'Active' : 'Banned'],
              ['Plan',    user.premium ? 'PRO' : 'Free'],
            ].map(([k, v]) => (
              <View key={k} style={ss.infoRow}>
                <Text style={ss.infoKey}>{k}</Text>
                <Text style={ss.infoVal}>{v}</Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={{ gap: 10, marginTop: 8 }}>
            <Btn
              label={user.active ? '🚫 Ban User' : '✅ Unban User'}
              variant={user.active ? 'danger' : 'outline'}
              onPress={() => { onToggle(user.id); onClose(); }}
            />
            {!user.premium && (
              <Btn label="💎 Grant PRO Access" variant="orange" onPress={() => { onGrantPro(user.id); onClose(); }} />
            )}
            {user.role !== 'admin' && (
              <Btn label="🔑 Make Admin" variant="gray" onPress={() => { onMakeAdmin && onMakeAdmin(user.id); onClose(); }} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Job detail modal ────────────────────────────────────────────────────────
function JobModal({ job, visible, onClose, onToggle, onFeature, onUrgent, onDelete }) {
  if (!job) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ss.modalOverlay}>
        <View style={ss.modalBox}>
          <View style={ss.modalHeader}>
            <Text style={ss.modalTitle}>Job Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={DARK} />
            </TouchableOpacity>
          </View>

          <View style={{ paddingVertical: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: DARK }}>{job.title}</Text>
            <Text style={{ fontSize: 13, color: '#888', marginTop: 3 }}>{job.company}</Text>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <Chip label={job.status} variant={job.status === 'active' ? 'green' : 'red'} />
              <Chip label={job.category} variant="blue" />
              {job.featured && <Chip label="⭐ Featured" variant="orange" />}
              {job.urgent && <Chip label="🔥 Urgent" variant="red" />}
            </View>

            <View style={[ss.infoTable, { marginTop: 12 }]}>
              {[
                ['Location',   job.location || '—'],
                ['Salary',     job.salary || '—'],
                ['Type',       job.type || '—'],
                ['Views',      String(job.views || 0)],
                ['Applicants', String(job.applicant_count || 0)],
                ['Posted',     job.created_at ? new Date(job.created_at).toLocaleDateString('en-IN') : '—'],
                ['Expires',    job.expires_at ? new Date(job.expires_at).toLocaleDateString('en-IN') : '—'],
              ].map(([k, v]) => (
                <View key={k} style={ss.infoRow}>
                  <Text style={ss.infoKey}>{k}</Text>
                  <Text style={ss.infoVal}>{v}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Btn
                label={job.status === 'active' ? 'Remove' : 'Restore'}
                variant={job.status === 'active' ? 'danger' : 'outline'}
                style={{ flex: 1 }}
                onPress={() => { onToggle(job.id, job.status === 'active' ? 'inactive' : 'active'); onClose(); }}
              />
              <Btn
                label={job.featured ? 'Unfeature' : '⭐ Feature'}
                variant={job.featured ? 'gray' : 'orange'}
                style={{ flex: 1 }}
                onPress={() => { onFeature(job.id, !job.featured); onClose(); }}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Btn
                label={job.urgent ? 'Remove Urgent' : '🔥 Mark Urgent'}
                variant={job.urgent ? 'gray' : 'primary'}
                style={{ flex: 1 }}
                onPress={() => { onUrgent(job.id, !job.urgent); onClose(); }}
              />
              <Btn
                label="🗑 Delete"
                variant="danger"
                style={{ flex: 1 }}
                onPress={() => {
                  onClose();
                  Alert.alert('Delete Job', `Delete "${job.title}"? This cannot be undone.`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => onDelete(job.id) },
                  ]);
                }}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Notification Composer ───────────────────────────────────────────────────
function NotifyModal({ visible, onClose, onSend }) {
  const [title, setTitle] = useState('');
  const [body, setBody]   = useState('');
  const [target, setTarget] = useState('all'); // all | pro | free

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ss.modalOverlay}>
        <View style={ss.modalBox}>
          <View style={ss.modalHeader}>
            <Text style={ss.modalTitle}>📣 Send Notification</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={DARK} /></TouchableOpacity>
          </View>

          <Text style={ss.fieldLabel}>Target Audience</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {[['all','All Users'],['pro','PRO Only'],['free','Free Only']].map(([v,l]) => (
              <TouchableOpacity key={v} onPress={() => setTarget(v)}
                style={[ss.segBtn, target === v && ss.segBtnActive]}>
                <Text style={[ss.segTxt, target === v && ss.segTxtActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={ss.fieldLabel}>Title</Text>
          <TextInput value={title} onChangeText={setTitle} style={ss.fieldInput}
            placeholder="Notification title" placeholderTextColor="#bbb" />

          <Text style={ss.fieldLabel}>Message</Text>
          <TextInput value={body} onChangeText={setBody} style={[ss.fieldInput, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Notification body…" placeholderTextColor="#bbb" multiline />

          <Btn label="Send Notification" variant="orange" disabled={!title || !body}
            onPress={() => { onSend({ title, body, target }); setTitle(''); setBody(''); onClose(); }} />
        </View>
      </View>
    </Modal>
  );
}

// ─── Main AdminScreen ────────────────────────────────────────────────────────
export default function AdminScreen() {
  const { role, jobs, users, loadJobs, loadUsers } = useAuth();

  const [tab,          setTab]          = useState('overview');
  const [refreshing,   setRefreshing]   = useState(false);
  const [jobSearch,    setJobSearch]    = useState('');
  const [userSearch,   setUserSearch]   = useState('');
  const [jobFilter,    setJobFilter]    = useState('all');  // all|active|inactive|featured|urgent
  const [userFilter,   setUserFilter]   = useState('all'); // all|pro|banned|admin
  const [selectedJob,  setSelectedJob]  = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [jobModalVis,  setJobModalVis]  = useState(false);
  const [userModalVis, setUserModalVis] = useState(false);
  const [notifyVis,    setNotifyVis]    = useState(false);
  const [payments,     setPayments]     = useState([]);

  // Access guard
  if (role !== 'admin') return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG }}>
      <Ionicons name="lock-closed" size={48} color="#ddd" />
      <Text style={{ fontSize: 16, fontWeight: '700', color: DARK, marginTop: 14 }}>Access Denied</Text>
      <Text style={{ fontSize: 12, color: '#888', marginTop: 6 }}>Admin only area</Text>
    </View>
  );

  // ── Load payments ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    try {
      const r = await http('GET', '/api/admin/payments');
      if (r?.ok && Array.isArray(r.payments)) setPayments(r.payments);
    } catch {}
  }

  // ── Refresh ────────────────────────────────────────────────────────────────
  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([loadJobs(), loadUsers(), loadPayments()]);
    setRefreshing(false);
  }

  // ── Job actions ────────────────────────────────────────────────────────────
  async function toggleJob(id, status) {
    await http('PATCH', `/api/admin/jobs/${id}/status`, { status });
    await loadJobs();
    Toast.show({ type: 'success', text1: `Job ${status === 'active' ? 'restored ✅' : 'removed 🚫'}` });
  }

  async function featureJob(id, featured) {
    await http('PATCH', `/api/admin/jobs/${id}/feature`, { featured });
    await loadJobs();
    Toast.show({ type: 'success', text1: featured ? '⭐ Job featured!' : 'Feature removed.' });
  }

  async function urgentJob(id, urgent) {
    await http('PATCH', `/api/admin/jobs/${id}/urgent`, { urgent });
    await loadJobs();
    Toast.show({ type: 'success', text1: urgent ? '🔥 Marked urgent!' : 'Urgent removed.' });
  }

  async function deleteJob(id) {
    await http('DELETE', `/api/admin/jobs/${id}`);
    await loadJobs();
    Toast.show({ type: 'success', text1: '🗑 Job deleted.' });
  }

  // ── User actions ───────────────────────────────────────────────────────────
  async function toggleUser(id) {
    const r = await http('PATCH', `/api/admin/users/${id}/toggle`);
    await loadUsers();
    Toast.show({ type: 'success', text1: r.user?.active ? '✅ User unbanned.' : '🚫 User banned.' });
  }

  async function grantPro(id) {
    await http('PATCH', `/api/admin/users/${id}/grant-pro`);
    await loadUsers();
    Toast.show({ type: 'success', text1: '💎 PRO granted!' });
  }

  async function makeAdmin(id) {
    Alert.alert('Make Admin', 'Grant this user admin privileges?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        await http('PATCH', `/api/admin/users/${id}/role`, { role: 'admin' });
        await loadUsers();
        Toast.show({ type: 'success', text1: '🔑 Admin role granted.' });
      }},
    ]);
  }

  async function sendNotification({ title, body, target }) {
    await http('POST', '/api/admin/notifications', { title, body, target });
    Toast.show({ type: 'success', text1: '📣 Notification sent!' });
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  const activeJobs    = jobs.filter(j => j.status === 'active');
  const inactiveJobs  = jobs.filter(j => j.status === 'inactive');
  const featuredJobs  = jobs.filter(j => j.featured);
  const urgentJobs    = jobs.filter(j => j.urgent);
  const proUsers      = users.filter(u => u.premium);
  const bannedUsers   = users.filter(u => !u.active);
  const adminUsers    = users.filter(u => u.role === 'admin');
  const totalViews    = jobs.reduce((a, j) => a + (j.views || 0), 0);
  const totalApps     = jobs.reduce((a, j) => a + (j.applicant_count || 0), 0);

  // Revenue
  const rev = {
    featured:  featuredJobs.length * PRICING.featured,
    urgent:    urgentJobs.length * PRICING.urgent,
    pro:       proUsers.length * PRICING.pro_monthly,
    payments:  payments.reduce((a, p) => a + (p.amount || 0), 0),
  };
  rev.total = rev.featured + rev.urgent + rev.pro;

  // Filtered jobs
  const filteredJobs = jobs
    .filter(j => {
      if (jobFilter === 'active')   return j.status === 'active';
      if (jobFilter === 'inactive') return j.status === 'inactive';
      if (jobFilter === 'featured') return j.featured;
      if (jobFilter === 'urgent')   return j.urgent;
      return true;
    })
    .filter(j =>
      !jobSearch ||
      (j.title || '').toLowerCase().includes(jobSearch.toLowerCase()) ||
      (j.company || '').toLowerCase().includes(jobSearch.toLowerCase()) ||
      (j.category || '').toLowerCase().includes(jobSearch.toLowerCase())
    );

  // Filtered users
  const filteredUsers = users
    .filter(u => {
      if (userFilter === 'pro')    return u.premium;
      if (userFilter === 'banned') return !u.active;
      if (userFilter === 'admin')  return u.role === 'admin';
      return true;
    })
    .filter(u =>
      !userSearch ||
      (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.company || '').toLowerCase().includes(userSearch.toLowerCase())
    );

  // ── Category breakdown ────────────────────────────────────────────────────
  const catBreakdown = activeJobs.reduce((acc, j) => {
    acc[j.category] = (acc[j.category] || 0) + 1;
    return acc;
  }, {});
  const topCats = Object.entries(catBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const TABS = [
    { key: 'overview',  label: 'Overview',  icon: 'grid'         },
    { key: 'jobs',      label: 'Jobs',      icon: 'briefcase'    },
    { key: 'users',     label: 'Users',     icon: 'people'       },
    { key: 'revenue',   label: 'Revenue',   icon: 'cash'         },
    { key: 'activity',  label: 'Activity',  icon: 'pulse'        },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>

      {/* Top action bar */}
      <View style={ss.topBar}>
        <View>
          <Text style={ss.topGreet}>NandedRozgar</Text>
          <Text style={ss.topSub}>Admin Dashboard</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <TouchableOpacity style={ss.iconBtn} onPress={() => setNotifyVis(true)}>
            <Ionicons name="notifications" size={20} color={DARK} />
          </TouchableOpacity>
          <TouchableOpacity style={ss.iconBtn} onPress={onRefresh}>
            <Ionicons name="refresh" size={20} color={DARK} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ss.tabScroll}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
            style={[ss.tabPill, tab === t.key && ss.tabPillActive]}>
            <Ionicons name={t.icon} size={14} color={tab === t.key ? '#fff' : '#888'} />
            <Text style={[ss.tabPillText, tab === t.key && ss.tabPillTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Main scroll */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ORANGE]} />}
        showsVerticalScrollIndicator={false}>

        {/* ── OVERVIEW TAB ── */}
        {tab === 'overview' && (
          <>
            {/* KPI grid */}
            <View style={ss.kpiGrid}>
              <StatCard icon="briefcase"   value={jobs.length}     label="Total Listings" color={ORANGE}  sub={`${activeJobs.length} active`} />
              <StatCard icon="people"      value={users.length}    label="Total Users"    color={BLUE}    sub={`${proUsers.length} PRO`} />
              <StatCard icon="eye"         value={totalViews}      label="Total Views"    color={PURPLE}  />
              <StatCard icon="paper-plane" value={totalApps}       label="Applications"   color={GREEN}   />
              <StatCard icon="star"        value={featuredJobs.length} label="Featured"  color={GOLD}    />
              <StatCard icon="cash"        value={`₹${rev.total.toLocaleString('en-IN')}`} label="Est. Revenue" color={GREEN} />
            </View>

            {/* Alert banners */}
            {bannedUsers.length > 0 && (
              <View style={[ss.alertBanner, { borderLeftColor: RED }]}>
                <Ionicons name="alert-circle" size={16} color={RED} />
                <Text style={[ss.alertText, { color: RED }]}>
                  {bannedUsers.length} banned user{bannedUsers.length > 1 ? 's' : ''} on platform
                </Text>
              </View>
            )}
            {inactiveJobs.length > 0 && (
              <View style={[ss.alertBanner, { borderLeftColor: GOLD }]}>
                <Ionicons name="warning" size={16} color={GOLD} />
                <Text style={[ss.alertText, { color: GOLD }]}>
                  {inactiveJobs.length} inactive listing{inactiveJobs.length > 1 ? 's' : ''} need review
                </Text>
              </View>
            )}

            {/* Platform health */}
            <SectionHeader title="Platform Health" icon="pulse" color={PURPLE} />
            <Card style={ss.healthCard}>
              {[
                { label: 'Active Jobs',        value: activeJobs.length,    total: jobs.length,   color: ORANGE },
                { label: 'PRO Users',          value: proUsers.length,      total: users.length,  color: GOLD   },
                { label: 'Featured Listings',  value: featuredJobs.length,  total: jobs.length,   color: BLUE   },
                { label: 'Urgent Listings',    value: urgentJobs.length,    total: jobs.length,   color: RED    },
              ].map(({ label, value, total, color }) => {
                const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                return (
                  <View key={label} style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#444' }}>{label}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color }}>{value} / {total} ({pct}%)</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: '#f0f0f0', borderRadius: 3 }}>
                      <View style={{ height: 6, width: `${Math.min(pct, 100)}%`, backgroundColor: color, borderRadius: 3 }} />
                    </View>
                  </View>
                );
              })}
            </Card>

            {/* Top categories */}
            <SectionHeader title="Top Job Categories" icon="list" color={BLUE} />
            <Card style={{ marginBottom: 16 }}>
              {topCats.length === 0
                ? <Text style={{ color: '#aaa', fontSize: 13 }}>No data yet.</Text>
                : topCats.map(([cat, count]) => (
                  <View key={cat} style={ss.catRow}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: DARK, flex: 1 }}>{cat}</Text>
                    <View style={[ss.badge, { backgroundColor: BLUE }]}>
                      <Text style={ss.badgeText}>{count}</Text>
                    </View>
                  </View>
                ))
              }
            </Card>

            {/* Quick actions */}
            <SectionHeader title="Quick Actions" icon="flash" color={ORANGE} />
            <View style={ss.actionsGrid}>
              {[
                { label: 'Send Notification', icon: 'notifications', color: PURPLE, onPress: () => setNotifyVis(true) },
                { label: 'Manage Jobs',       icon: 'briefcase',      color: ORANGE, onPress: () => setTab('jobs')     },
                { label: 'Manage Users',      icon: 'people',         color: BLUE,   onPress: () => setTab('users')    },
                { label: 'View Revenue',      icon: 'cash',           color: GREEN,  onPress: () => setTab('revenue')  },
              ].map(({ label, icon, color, onPress }) => (
                <TouchableOpacity key={label} style={[ss.actionBtn, { borderTopColor: color }]} onPress={onPress}>
                  <View style={[ss.statIconBox, { backgroundColor: color + '18' }]}>
                    <Ionicons name={icon} size={20} color={color} />
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: DARK, marginTop: 8, textAlign: 'center' }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recent users */}
            <SectionHeader title="Recently Joined" icon="person-add" color={GREEN}
              action={() => setTab('users')} actionLabel="See all →" />
            <Card style={{ marginBottom: 16 }}>
              {users.slice(0, 5).map(u => (
                <View key={u.id} style={ss.recentRow}>
                  <View style={ss.miniAvatar}>
                    <Text style={ss.miniAvatarText}>{(u.name || 'U')[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: DARK }}>{u.name}</Text>
                    <Text style={{ fontSize: 11, color: '#888' }}>{u.email}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Chip label={u.premium ? '💎' : 'Free'} variant={u.premium ? 'green' : 'gray'} />
                    {!u.active && <Chip label="Banned" variant="red" />}
                  </View>
                </View>
              ))}
              {users.length === 0 && <Text style={{ color: '#aaa', fontSize: 13 }}>No users yet.</Text>}
            </Card>

            {/* Recent listings */}
            <SectionHeader title="Recent Listings" icon="time" color={ORANGE}
              action={() => setTab('jobs')} actionLabel="See all →" />
            <Card style={{ marginBottom: 16 }}>
              {jobs.slice(0, 5).map(j => (
                <View key={j.id} style={ss.recentRow}>
                  <View style={[ss.miniAvatar, { backgroundColor: ORANGE + '18' }]}>
                    <Ionicons name="briefcase" size={14} color={ORANGE} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: DARK }} numberOfLines={1}>{j.title}</Text>
                    <Text style={{ fontSize: 11, color: '#888' }}>{j.company} · {j.category}</Text>
                  </View>
                  <Chip label={j.status} variant={j.status === 'active' ? 'green' : 'red'} />
                </View>
              ))}
              {jobs.length === 0 && <Text style={{ color: '#aaa', fontSize: 13 }}>No listings yet.</Text>}
            </Card>
          </>
        )}

        {/* ── JOBS TAB ── */}
        {tab === 'jobs' && (
          <>
            <SearchBar value={jobSearch} onChange={setJobSearch} placeholder="Search by title, company, category…" />

            {/* Filter pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8 }}>
              {[
                ['all',      'All',          jobs.length],
                ['active',   'Active',       activeJobs.length],
                ['inactive', 'Inactive',     inactiveJobs.length],
                ['featured', '⭐ Featured',  featuredJobs.length],
                ['urgent',   '🔥 Urgent',   urgentJobs.length],
              ].map(([f, l, c]) => (
                <TouchableOpacity key={f} onPress={() => setJobFilter(f)}
                  style={[ss.filterPill, jobFilter === f && ss.filterPillActive]}>
                  <Text style={[ss.filterPillText, jobFilter === f && ss.filterPillTextActive]}>
                    {l} ({c})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={ss.resultsCount}>{filteredJobs.length} listing{filteredJobs.length !== 1 ? 's' : ''}</Text>

            {filteredJobs.length === 0
              ? <Card><Text style={{ color: '#aaa', fontSize: 13, textAlign: 'center', padding: 20 }}>No listings found.</Text></Card>
              : filteredJobs.map(j => (
                <TouchableOpacity key={j.id} onPress={() => { setSelectedJob(j); setJobModalVis(true); }}>
                  <Card style={ss.listCard}>
                    <View style={ss.listCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={ss.listTitle} numberOfLines={1}>{j.title}</Text>
                        <Text style={ss.listSub}>{j.company} · {j.category}</Text>
                      </View>
                      <Chip label={j.status} variant={j.status === 'active' ? 'green' : 'red'} />
                    </View>
                    <View style={ss.listCardMeta}>
                      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                        {j.featured && <Ionicons name="star" size={13} color={GOLD} />}
                        {j.urgent   && <Ionicons name="flame" size={13} color={RED} />}
                        <Ionicons name="eye" size={13} color="#bbb" />
                        <Text style={ss.metaTxt}>{j.views || 0}</Text>
                        <Ionicons name="people" size={13} color="#bbb" />
                        <Text style={ss.metaTxt}>{j.applicant_count || 0}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity style={ss.smAction} onPress={() => toggleJob(j.id, j.status === 'active' ? 'inactive' : 'active')}>
                          <Ionicons name={j.status === 'active' ? 'eye-off' : 'eye'} size={14} color={j.status === 'active' ? RED : GREEN} />
                        </TouchableOpacity>
                        <TouchableOpacity style={ss.smAction} onPress={() => featureJob(j.id, !j.featured)}>
                          <Ionicons name="star" size={14} color={j.featured ? GOLD : '#ccc'} />
                        </TouchableOpacity>
                        <TouchableOpacity style={ss.smAction} onPress={() => {
                          setSelectedJob(j); setJobModalVis(true);
                        }}>
                          <Ionicons name="ellipsis-horizontal" size={14} color="#888" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))
            }
          </>
        )}

        {/* ── USERS TAB ── */}
        {tab === 'users' && (
          <>
            <SearchBar value={userSearch} onChange={setUserSearch} placeholder="Search by name, email, company…" />

            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8 }}>
              {[
                ['all',    'All',     users.length],
                ['pro',    '💎 PRO', proUsers.length],
                ['banned', '🚫 Banned', bannedUsers.length],
                ['admin',  '🔑 Admin', adminUsers.length],
              ].map(([f, l, c]) => (
                <TouchableOpacity key={f} onPress={() => setUserFilter(f)}
                  style={[ss.filterPill, userFilter === f && ss.filterPillActive]}>
                  <Text style={[ss.filterPillText, userFilter === f && ss.filterPillTextActive]}>
                    {l} ({c})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={ss.resultsCount}>{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</Text>

            {filteredUsers.length === 0
              ? <Card><Text style={{ color: '#aaa', fontSize: 13, textAlign: 'center', padding: 20 }}>No users found.</Text></Card>
              : filteredUsers.map(u => (
                <TouchableOpacity key={u.id} onPress={() => { setSelectedUser(u); setUserModalVis(true); }}>
                  <Card style={ss.listCard}>
                    <View style={ss.listCardTop}>
                      <View style={ss.miniAvatar}>
                        <Text style={ss.miniAvatarText}>{(u.name || 'U')[0].toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={ss.listTitle}>{u.name}</Text>
                        <Text style={ss.listSub}>{u.email}</Text>
                        {u.company && <Text style={{ fontSize: 11, color: ORANGE, marginTop: 2 }}>{u.company}</Text>}
                      </View>
                      <View style={{ gap: 4, alignItems: 'flex-end' }}>
                        <Chip label={u.role} variant={u.role === 'admin' ? 'red' : 'blue'} />
                        <Chip label={u.premium ? '💎' : 'Free'} variant={u.premium ? 'green' : 'gray'} />
                      </View>
                    </View>
                    <View style={ss.listCardMeta}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <Chip label={u.active ? 'Active' : 'Banned'} variant={u.active ? 'green' : 'red'} />
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity style={ss.smAction} onPress={() => toggleUser(u.id)}>
                          <Ionicons name={u.active ? 'ban' : 'checkmark-circle'} size={16}
                            color={u.active ? RED : GREEN} />
                        </TouchableOpacity>
                        {!u.premium && (
                          <TouchableOpacity style={ss.smAction} onPress={() => grantPro(u.id)}>
                            <Ionicons name="diamond" size={16} color={GOLD} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={ss.smAction} onPress={() => { setSelectedUser(u); setUserModalVis(true); }}>
                          <Ionicons name="ellipsis-horizontal" size={14} color="#888" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))
            }
          </>
        )}

        {/* ── REVENUE TAB ── */}
        {tab === 'revenue' && (
          <>
            {/* Revenue KPIs */}
            <View style={ss.kpiGrid}>
              <StatCard icon="cash"    value={`₹${rev.featured.toLocaleString('en-IN')}`} label="Featured"   color={GOLD}   sub={`${featuredJobs.length} jobs`} />
              <StatCard icon="flame"   value={`₹${rev.urgent.toLocaleString('en-IN')}`}   label="Urgent"     color={RED}    sub={`${urgentJobs.length} jobs`} />
              <StatCard icon="diamond" value={`₹${rev.pro.toLocaleString('en-IN')}`}      label="PRO Subs"   color={PURPLE} sub={`${proUsers.length} users`} />
              <StatCard icon="trending-up" value={`₹${rev.total.toLocaleString('en-IN')}`} label="Total Est."  color={GREEN} />
            </View>

            {/* Revenue breakdown bars */}
            <SectionHeader title="Revenue Breakdown" icon="pie-chart" color={ORANGE} />
            <Card style={{ marginBottom: 16 }}>
              <RevenueBar label="Featured Boosts" amount={rev.featured} total={rev.total} color={GOLD} />
              <RevenueBar label="Urgent Badges"   amount={rev.urgent}   total={rev.total} color={RED} />
              <RevenueBar label="PRO Subscriptions" amount={rev.pro}    total={rev.total} color={PURPLE} />
            </Card>

            {/* Pricing plans */}
            <SectionHeader title="Current Pricing Plans" icon="pricetag" color={BLUE} />
            <Card style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#888', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>Job Plans</Text>
              {JOB_PLANS.map(p => (
                <View key={p.days} style={ss.planRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: DARK }}>{p.label}</Text>
                    {p.popular && <Chip label="Popular" variant="orange" />}
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: ORANGE }}>₹{p.price}</Text>
                </View>
              ))}

              <View style={ss.divider} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#888', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>Car Plans</Text>
              {CAR_PLANS.map(p => (
                <View key={p.days} style={ss.planRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: DARK }}>{p.label}</Text>
                    {p.popular && <Chip label="Popular" variant="orange" />}
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: ORANGE }}>₹{p.price}</Text>
                </View>
              ))}

              <View style={ss.divider} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#888', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>Room Plans</Text>
              {ROOM_PLANS.map(p => (
                <View key={p.days} style={ss.planRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: DARK }}>{p.label}</Text>
                    {p.popular && <Chip label="Popular" variant="orange" />}
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: ORANGE }}>₹{p.price}</Text>
                </View>
              ))}

              <View style={ss.divider} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#888', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>Buy & Sell Plans</Text>
              {BUYSELL_PLANS.map(p => (
                <View key={p.days} style={ss.planRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: DARK }}>{p.label}</Text>
                    {p.popular && <Chip label="Popular" variant="orange" />}
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: ORANGE }}>₹{p.price}</Text>
                </View>
              ))}
            </Card>

            {/* Projections */}
            <SectionHeader title="Revenue Projections" icon="trending-up" color={GREEN} />
            <Card style={{ marginBottom: 16 }}>
              {[
                { label: '20 featured jobs/day',   proj: '₹29,400/month',  color: GOLD   },
                { label: '30 urgent badges/day',    proj: '₹26,100/month',  color: RED    },
                { label: '100 PRO employers',        proj: '₹49,900/month',  color: PURPLE },
                { label: 'Combined potential',       proj: '₹1,35,000+/mo', color: GREEN, bold: true },
              ].map(({ label, proj, color, bold }) => (
                <View key={label} style={[ss.planRow, { borderBottomColor: '#f0f0f0', borderBottomWidth: 1, paddingVertical: 12 }]}>
                  <Text style={{ fontSize: 13, color: '#555', fontWeight: bold ? '800' : '500' }}>{label}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color }}>{proj}</Text>
                </View>
              ))}
            </Card>

            {/* Recent payments */}
            <SectionHeader title="Recent Payments" icon="receipt" color={BLUE} count={payments.length} />
            <Card style={{ marginBottom: 16 }}>
              {payments.length === 0
                ? <Text style={{ color: '#aaa', fontSize: 13, textAlign: 'center', padding: 20 }}>No payment records yet.</Text>
                : payments.slice(0, 10).map(p => (
                  <View key={p.id} style={ss.recentRow}>
                    <View style={[ss.miniAvatar, { backgroundColor: GREEN + '18' }]}>
                      <Ionicons name="cash" size={14} color={GREEN} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: DARK }}>
                        {p.plan || 'Payment'} — ₹{p.amount}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#888' }}>
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                      </Text>
                    </View>
                    <Chip label={p.status || 'paid'} variant="green" />
                  </View>
                ))
              }
            </Card>
          </>
        )}

        {/* ── ACTIVITY TAB ── */}
        {tab === 'activity' && (
          <>
            <SectionHeader title="Platform Stats" icon="stats-chart" color={PURPLE} />
            <Card style={{ marginBottom: 16 }}>
              {[
                { label: 'Total Listings',      value: jobs.length,              icon: 'briefcase',    color: ORANGE },
                { label: 'Active Listings',     value: activeJobs.length,        icon: 'checkmark-circle', color: GREEN  },
                { label: 'Inactive/Hidden',     value: inactiveJobs.length,      icon: 'eye-off',      color: RED    },
                { label: 'Featured Listings',   value: featuredJobs.length,      icon: 'star',         color: GOLD   },
                { label: 'Urgent Listings',     value: urgentJobs.length,        icon: 'flame',        color: RED    },
                { label: 'Total Users',         value: users.length,             icon: 'people',       color: BLUE   },
                { label: 'PRO Users',           value: proUsers.length,          icon: 'diamond',      color: PURPLE },
                { label: 'Banned Users',        value: bannedUsers.length,       icon: 'ban',          color: RED    },
                { label: 'Admin Users',         value: adminUsers.length,        icon: 'shield',       color: ORANGE },
                { label: 'Total Views',         value: totalViews,               icon: 'eye',          color: PURPLE },
                { label: 'Total Applications',  value: totalApps,                icon: 'paper-plane',  color: BLUE   },
              ].map(({ label, value, icon, color }) => (
                <View key={label} style={ss.statRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[ss.sectionIconBox, { backgroundColor: color + '18' }]}>
                      <Ionicons name={icon} size={14} color={color} />
                    </View>
                    <Text style={{ fontSize: 13, color: '#555', fontWeight: '500' }}>{label}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: DARK }}>{value}</Text>
                </View>
              ))}
            </Card>

            {/* Category breakdown */}
            <SectionHeader title="Listings by Category" icon="list" color={BLUE} />
            <Card style={{ marginBottom: 16 }}>
              {Object.entries(catBreakdown).length === 0
                ? <Text style={{ color: '#aaa', fontSize: 13, textAlign: 'center', padding: 20 }}>No data yet.</Text>
                : Object.entries(catBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, count]) => {
                      const pct = activeJobs.length > 0 ? Math.round((count / activeJobs.length) * 100) : 0;
                      return (
                        <View key={cat} style={{ marginBottom: 12 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#444' }}>{cat}</Text>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: ORANGE }}>{count} ({pct}%)</Text>
                          </View>
                          <View style={{ height: 5, backgroundColor: '#f0f0f0', borderRadius: 3 }}>
                            <View style={{ height: 5, width: `${pct}%`, backgroundColor: ORANGE, borderRadius: 3 }} />
                          </View>
                        </View>
                      );
                    })
              }
            </Card>

            {/* User growth snapshot */}
            <SectionHeader title="User Breakdown" icon="pie-chart" color={BLUE} />
            <Card style={{ marginBottom: 16 }}>
              {[
                { label: 'Free Users',   count: users.length - proUsers.length, color: '#888'   },
                { label: 'PRO Users',    count: proUsers.length,                 color: PURPLE   },
                { label: 'Admin Users',  count: adminUsers.length,               color: ORANGE   },
                { label: 'Banned Users', count: bannedUsers.length,              color: RED      },
              ].map(({ label, count, color }) => {
                const pct = users.length > 0 ? Math.round((count / users.length) * 100) : 0;
                return (
                  <View key={label} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#444' }}>{label}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color }}>{count} ({pct}%)</Text>
                    </View>
                    <View style={{ height: 5, backgroundColor: '#f0f0f0', borderRadius: 3 }}>
                      <View style={{ height: 5, width: `${pct}%`, backgroundColor: color, borderRadius: 3 }} />
                    </View>
                  </View>
                );
              })}
            </Card>
          </>
        )}

      </ScrollView>

      {/* Modals */}
      <JobModal
        job={selectedJob}
        visible={jobModalVis}
        onClose={() => setJobModalVis(false)}
        onToggle={toggleJob}
        onFeature={featureJob}
        onUrgent={urgentJob}
        onDelete={deleteJob}
      />
      <UserModal
        user={selectedUser}
        visible={userModalVis}
        onClose={() => setUserModalVis(false)}
        onToggle={toggleUser}
        onGrantPro={grantPro}
        onMakeAdmin={makeAdmin}
      />
      <NotifyModal
        visible={notifyVis}
        onClose={() => setNotifyVis(false)}
        onSend={sendNotification}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  // Top bar
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: DARK, paddingHorizontal: 16, paddingVertical: 14,
    paddingTop: 20,
  },
  topGreet: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  topSub:   { fontSize: 11, color: '#888', marginTop: 1 },
  iconBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },

  // Tab bar
  tabScroll:         { backgroundColor: DARK, flexGrow: 0 },
  tabPill:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#222' },
  tabPillActive:     { backgroundColor: ORANGE },
  tabPillText:       { fontSize: 12, fontWeight: '600', color: '#888' },
  tabPillTextActive: { color: '#fff' },

  // KPI grid
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: (SW - 48) / 2,
    backgroundColor: '#fff', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#ebebeb',
  },
  statIconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statVal:     { fontSize: 22, fontWeight: '900', color: DARK },
  statLbl:     { fontSize: 11, color: '#888', marginTop: 2, fontWeight: '600' },
  statSub:     { fontSize: 10, color: '#bbb', marginTop: 2 },

  // Alerts
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    borderLeftWidth: 4, marginBottom: 10,
    borderWidth: 1, borderColor: '#ebebeb',
  },
  alertText: { fontSize: 13, fontWeight: '600' },

  // Section header
  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  sectionIconBox: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionTitle:   { fontSize: 14, fontWeight: '800', color: DARK },

  // Badge
  badge:     { backgroundColor: ORANGE, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  // Health card
  healthCard: { marginBottom: 16 },

  // Category row
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },

  // Quick actions grid
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  actionBtn: {
    width: (SW - 48) / 2,
    backgroundColor: '#fff', borderRadius: 12,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#ebebeb',
    borderTopWidth: 3,
  },

  // Recent rows
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 4 },

  // Avatars
  avatar:         { width: 64, height: 64, borderRadius: 32, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  avatarText:     { fontSize: 26, fontWeight: '900', color: '#fff' },
  miniAvatar:     { width: 36, height: 36, borderRadius: 18, backgroundColor: ORANGE + '22', alignItems: 'center', justifyContent: 'center' },
  miniAvatarText: { fontSize: 15, fontWeight: '800', color: ORANGE },

  // Search bar
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ebebeb',
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 13, color: DARK, padding: 0 },

  // Filter pills
  filterPill:         { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ebebeb' },
  filterPillActive:   { backgroundColor: DARK, borderColor: DARK },
  filterPillText:     { fontSize: 12, fontWeight: '600', color: '#888' },
  filterPillTextActive: { color: '#fff' },

  resultsCount: { fontSize: 11, color: '#aaa', fontWeight: '600', marginBottom: 10, letterSpacing: 0.3 },

  // List cards
  listCard:    { marginBottom: 10 },
  listCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  listTitle:   { fontSize: 14, fontWeight: '700', color: DARK },
  listSub:     { fontSize: 11, color: '#888', marginTop: 2 },
  listCardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaTxt:     { fontSize: 11, color: '#aaa' },
  smAction:    { width: 30, height: 30, borderRadius: 8, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 20, maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle:  { fontSize: 17, fontWeight: '800', color: DARK },

  // Info table
  infoTable: { backgroundColor: '#f8f8f8', borderRadius: 10, overflow: 'hidden', marginBottom: 16 },
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#efefef' },
  infoKey:   { fontSize: 12, color: '#888', fontWeight: '600' },
  infoVal:   { fontSize: 12, color: DARK,   fontWeight: '700' },

  // Notification modal
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#444', marginBottom: 5 },
  fieldInput: {
    borderWidth: 1.5, borderColor: '#ebebeb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: DARK,
    backgroundColor: '#fafafa', marginBottom: 14,
  },
  segBtn:       { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f0f0f0', alignItems: 'center' },
  segBtnActive: { backgroundColor: DARK },
  segTxt:       { fontSize: 12, fontWeight: '600', color: '#888' },
  segTxtActive: { color: '#fff' },

  // Stat row (activity tab)
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },

  // Revenue
  planRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  divider:  { height: 1, backgroundColor: '#ebebeb', marginVertical: 12 },
});
