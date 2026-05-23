import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, TextInput, Modal, Alert, Dimensions, FlatList,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { http } from '../utils/api';
import { Card, Btn, Chip } from '../components/UI';
import { PRICING, JOB_PLANS, CAR_PLANS, ROOM_PLANS, BUYSELL_PLANS } from '../utils/constants';

// ── Palette ──────────────────────────────────────────────────────────────────
const ORANGE = '#f97316';
const GREEN  = '#22c55e';
const RED    = '#ef4444';
const BLUE   = '#3b82f6';
const PURPLE = '#8b5cf6';
const GOLD   = '#eab308';
const DARK   = '#111111';
const BG     = '#f8f8f8';

const PROMO_PLANS = {
  basic:   { price: 99,  days: 7  },
  popular: { price: 249, days: 15 },
  premium: { price: 499, days: 30 },
};

const AVATAR_PALETTE = [ORANGE, BLUE, GREEN, PURPLE, GOLD, RED, '#0891b2', '#db2777'];
function avatarColor(char = 'A') {
  const idx = (char.toUpperCase().charCodeAt(0) - 65) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[Math.max(0, idx)];
}
function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}
function fmtINR(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }

const { width: SW } = Dimensions.get('window');

// ─── Reusable sub-components ─────────────────────────────────────────────────

function StatCard({ icon, value, label, color = ORANGE, sub }) {
  return (
    <View style={[ss.statCard, { borderTopColor: color }]}>
      <View style={[ss.iconBox, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={ss.statVal}>{value}</Text>
      <Text style={ss.statLbl}>{label}</Text>
      {sub ? <Text style={ss.statSub}>{sub}</Text> : null}
    </View>
  );
}

function SectionHdr({ title, icon, count, color = ORANGE, onAction, actionLabel }) {
  return (
    <View style={ss.sectionHdr}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[ss.iconBox, { width: 28, height: 28, borderRadius: 8, backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={14} color={color} />
        </View>
        <Text style={ss.sectionTitle}>{title}</Text>
        {count != null && (
          <View style={[ss.badge, { backgroundColor: color }]}>
            <Text style={ss.badgeTxt}>{count}</Text>
          </View>
        )}
      </View>
      {onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={{ fontSize: 12, color: ORANGE, fontWeight: '700' }}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <View style={ss.searchBar}>
      <Ionicons name="search" size={15} color="#aaa" />
      <TextInput
        value={value} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor="#bbb"
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

function FilterPills({ options, active, onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
      {options.map(([f, l, c]) => (
        <TouchableOpacity key={f} onPress={() => onSelect(f)}
          style={[ss.pill, active === f && ss.pillActive]}>
          <Text style={[ss.pillTxt, active === f && ss.pillTxtActive]}>{l} ({c})</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function ProgressBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#555' }}>{label}</Text>
        <Text style={{ fontSize: 12, fontWeight: '800', color }}>{value} / {total} ({pct}%)</Text>
      </View>
      <View style={{ height: 5, backgroundColor: '#efefef', borderRadius: 3 }}>
        <View style={{ height: 5, width: `${Math.min(pct, 100)}%`, backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

function InfoTable({ rows }) {
  return (
    <View style={ss.infoTable}>
      {rows.map(([k, v]) => (
        <View key={k} style={ss.infoRow}>
          <Text style={ss.infoKey}>{k}</Text>
          <Text style={ss.infoVal}>{String(v ?? '—')}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── MODALS ──────────────────────────────────────────────────────────────────

function UserModal({ user, visible, onClose, onToggle, onGrantPro, onMakeAdmin, onVerify }) {
  if (!user) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ss.overlay}>
        <View style={ss.sheet}>
          <View style={ss.sheetHdr}>
            <Text style={ss.sheetTitle}>User Details</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={DARK} /></TouchableOpacity>
          </View>
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <View style={[ss.avatar, { backgroundColor: avatarColor(user.name?.[0]) }]}>
              <Text style={ss.avatarTxt}>{(user.name || 'U')[0].toUpperCase()}</Text>
            </View>
            <Text style={{ fontSize: 17, fontWeight: '800', color: DARK, marginTop: 10 }}>{user.name}</Text>
            <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{user.email}</Text>
            {user.company ? <Text style={{ fontSize: 12, color: ORANGE, marginTop: 2, fontWeight: '600' }}>{user.company}</Text> : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <Chip label={user.role === 'admin' ? '🔑 Admin' : '👤 User'} variant={user.role === 'admin' ? 'red' : 'blue'} />
            <Chip label={user.premium ? '💎 PRO' : 'Free'} variant={user.premium ? 'green' : 'gray'} />
            <Chip label={user.active ? '✅ Active' : '🚫 Banned'} variant={user.active ? 'green' : 'red'} />
            <Chip label={user.verified ? '✔ Verified' : 'Unverified'} variant={user.verified ? 'green' : 'gray'} />
          </View>
          <InfoTable rows={[
            ['Joined', fmtDate(user.created_at)],
            ['Role', user.role],
            ['Plan', user.premium ? 'PRO' : 'Free'],
            ['Company', user.company || '—'],
          ]} />
          <View style={{ gap: 10 }}>
            <Btn label={user.active ? '🚫 Ban User' : '✅ Unban User'}
              variant={user.active ? 'danger' : 'outline'}
              onPress={() => { onToggle(user.id); onClose(); }} />
            {!user.premium && (
              <Btn label="💎 Grant PRO Access" variant="orange"
                onPress={() => { onGrantPro(user.id); onClose(); }} />
            )}
            <Btn
              label={user.verified ? '🔲 Remove Verified Badge' : '✔ Mark as Verified Employer'}
              variant={user.verified ? 'gray' : 'green'}
              onPress={() => { onVerify?.(user.id, !user.verified); onClose(); }} />
            {user.role !== 'admin' && (
              <Btn label="🔑 Make Admin" variant="gray"
                onPress={() => { onMakeAdmin?.(user.id); onClose(); }} />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function JobModal({ job, visible, onClose, onToggle, onFeature, onUrgent, onDelete }) {
  if (!job) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ss.overlay}>
        <View style={ss.sheet}>
          <View style={ss.sheetHdr}>
            <Text style={ss.sheetTitle}>Job Details</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={DARK} /></TouchableOpacity>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '800', color: DARK, marginTop: 8 }}>{job.title}</Text>
          <Text style={{ fontSize: 13, color: '#888', marginTop: 3, marginBottom: 10 }}>{job.company} · {job.category}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <Chip label={job.status} variant={job.status === 'active' ? 'green' : 'red'} />
            <Chip label={job.category} variant="blue" />
            {job.featured && <Chip label="⭐ Featured" variant="orange" />}
            {job.urgent   && <Chip label="🔥 Urgent"  variant="red" />}
          </View>
          <InfoTable rows={[
            ['Location', job.location || '—'],
            ['Salary', job.salary || '—'],
            ['Views', job.views || 0],
            ['Applicants', job.applicant_count || 0],
            ['Posted', fmtDate(job.created_at)],
            ['Expires', fmtDate(job.expires_at)],
          ]} />
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Btn label={job.status === 'active' ? 'Remove' : 'Restore'}
                variant={job.status === 'active' ? 'danger' : 'outline'} style={{ flex: 1 }}
                onPress={() => { onToggle(job.id, job.status === 'active' ? 'inactive' : 'active'); onClose(); }} />
              <Btn label={job.featured ? 'Unfeature' : '⭐ Feature'}
                variant={job.featured ? 'gray' : 'orange'} style={{ flex: 1 }}
                onPress={() => { onFeature(job.id, !job.featured); onClose(); }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Btn label={job.urgent ? 'Remove Urgent' : '🔥 Urgent'}
                variant={job.urgent ? 'gray' : 'primary'} style={{ flex: 1 }}
                onPress={() => { onUrgent(job.id, !job.urgent); onClose(); }} />
              <Btn label="🗑 Delete" variant="danger" style={{ flex: 1 }}
                onPress={() => {
                  onClose();
                  Alert.alert('Delete Job', `Delete "${job.title}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => onDelete(job.id) },
                  ]);
                }} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RoomModal({ room, visible, onClose, onToggle }) {
  if (!room) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ss.overlay}>
        <View style={ss.sheet}>
          <View style={ss.sheetHdr}>
            <Text style={ss.sheetTitle}>Room / PG Details</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={DARK} /></TouchableOpacity>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '800', color: DARK, marginTop: 8 }}>
            {room.room_type || room.roomType} — {room.area}
          </Text>
          <Text style={{ fontSize: 13, color: '#888', marginTop: 3, marginBottom: 10 }}>
            {room.for_gender || room.forGender} · {room.furnished}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <Chip label={room.status} variant={room.status === 'active' ? 'green' : 'red'} />
            <Chip label={room.plan_label || room.planLabel || 'Free'} variant="blue" />
          </View>
          <InfoTable rows={[
            ['Rent', fmtINR(room.rent) + '/month'],
            ['Gender', room.for_gender || room.forGender || '—'],
            ['Vacancies', room.vacancies ?? '—'],
            ['Furnished', room.furnished || '—'],
            ['WhatsApp', room.whatsapp || '—'],
            ['Area', room.area || '—'],
            ['Plan', room.plan_label || room.planLabel || 'Free'],
            ['Posted', fmtDate(room.created_at)],
          ]} />
          <Btn label={room.status === 'active' ? '🚫 Remove Listing' : '✅ Restore Listing'}
            variant={room.status === 'active' ? 'danger' : 'outline'}
            onPress={() => { onToggle(room.id, room.status === 'active' ? 'inactive' : 'active'); onClose(); }} />
        </View>
      </View>
    </Modal>
  );
}

function ItemModal({ item, visible, onClose, onToggle }) {
  if (!item) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ss.overlay}>
        <View style={ss.sheet}>
          <View style={ss.sheetHdr}>
            <Text style={ss.sheetTitle}>Buy & Sell Item</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={DARK} /></TouchableOpacity>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '800', color: DARK, marginTop: 8 }}>{item.title}</Text>
          <Text style={{ fontSize: 13, color: '#888', marginTop: 3, marginBottom: 10 }}>
            {item.category} · {item.condition}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <Chip label={item.status} variant={item.status === 'active' ? 'green' : 'red'} />
            <Chip label={item.category} variant="blue" />
            {item.featured && <Chip label="⭐ Featured" variant="orange" />}
          </View>
          <InfoTable rows={[
            ['Price', fmtINR(item.price)],
            ['Condition', item.condition || '—'],
            ['Seller', item.seller_name || item.seller || '—'],
            ['Posted', fmtDate(item.created_at)],
          ]} />
          <Btn label={item.status === 'active' ? '🚫 Remove Item' : '✅ Restore Item'}
            variant={item.status === 'active' ? 'danger' : 'outline'}
            onPress={() => { onToggle(item.id, item.status === 'active' ? 'inactive' : 'active'); onClose(); }} />
        </View>
      </View>
    </Modal>
  );
}

function BannerModal({ banner, visible, onClose, onToggle }) {
  if (!banner) return null;
  const plan = PROMO_PLANS[banner.plan] || { price: 0, days: 0 };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ss.overlay}>
        <View style={ss.sheet}>
          <View style={ss.sheetHdr}>
            <Text style={ss.sheetTitle}>Promo Banner</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={DARK} /></TouchableOpacity>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '800', color: DARK, marginTop: 8 }}>{banner.biz_name || banner.bizName}</Text>
          <Text style={{ fontSize: 13, color: '#888', marginTop: 3, marginBottom: 10 }}>{banner.tagline || banner.category}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <Chip label={banner.status} variant={banner.status === 'active' ? 'green' : 'red'} />
            <Chip label={banner.plan || 'basic'} variant="orange" />
          </View>
          <InfoTable rows={[
            ['Business', banner.biz_name || banner.bizName || '—'],
            ['Category', banner.category || '—'],
            ['Location', banner.location || '—'],
            ['Phone', banner.phone || '—'],
            ['Plan', `${banner.plan} (${fmtINR(plan.price)} / ${plan.days} days)`],
            ['Expires', fmtDate(banner.expires_at)],
          ]} />
          <Btn label={banner.status === 'active' ? '🚫 Deactivate Banner' : '✅ Activate Banner'}
            variant={banner.status === 'active' ? 'danger' : 'outline'}
            onPress={() => { onToggle(banner.id, banner.status === 'active' ? 'inactive' : 'active'); onClose(); }} />
        </View>
      </View>
    </Modal>
  );
}

function NotifyModal({ visible, onClose, onSend }) {
  const [title, setTitle] = useState('');
  const [body, setBody]   = useState('');
  const [target, setTarget] = useState('all');
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ss.overlay}>
        <View style={ss.sheet}>
          <View style={ss.sheetHdr}>
            <Text style={ss.sheetTitle}>📣 Send Notification</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={DARK} /></TouchableOpacity>
          </View>
          <Text style={ss.fldLabel}>Target Audience</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {[['all','All Users'],['pro','PRO Only'],['free','Free Only']].map(([v,l]) => (
              <TouchableOpacity key={v} onPress={() => setTarget(v)}
                style={[ss.seg, target === v && ss.segActive]}>
                <Text style={[ss.segTxt, target === v && { color: '#fff' }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={ss.fldLabel}>Title</Text>
          <TextInput value={title} onChangeText={setTitle} style={ss.fldInput}
            placeholder="Notification title" placeholderTextColor="#bbb" />
          <Text style={ss.fldLabel}>Message</Text>
          <TextInput value={body} onChangeText={setBody}
            style={[ss.fldInput, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Write your message…" placeholderTextColor="#bbb" multiline />
          <Btn label="Send Notification" variant="orange" disabled={!title || !body}
            onPress={() => { onSend({ title, body, target }); setTitle(''); setBody(''); onClose(); }} />
        </View>
      </View>
    </Modal>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const { user, jobs = [], users = [], loadJobs, loadUsers } = useAuth();

  // ── Data state ────────────────────────────────────────────────────────────
  const [rooms,    setRooms]    = useState([]);
  const [items,    setItems]    = useState([]);   // buy & sell
  const [banners,  setBanners]  = useState([]);   // promo
  const [payments, setPayments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [tab, setTab] = useState('overview');

  // searches
  const [jobSearch,    setJobSearch]    = useState('');
  const [roomSearch,   setRoomSearch]   = useState('');
  const [itemSearch,   setItemSearch]   = useState('');
  const [bannerSearch, setBannerSearch] = useState('');
  const [userSearch,   setUserSearch]   = useState('');

  // filters
  const [jobFilter,    setJobFilter]    = useState('all');
  const [roomFilter,   setRoomFilter]   = useState('all');
  const [itemFilter,   setItemFilter]   = useState('all');
  const [bannerFilter, setBannerFilter] = useState('all');
  const [userFilter,   setUserFilter]   = useState('all');

  // modals
  const [selJob,    setSelJob]    = useState(null);
  const [selRoom,   setSelRoom]   = useState(null);
  const [selItem,   setSelItem]   = useState(null);
  const [selBanner, setSelBanner] = useState(null);
  const [selUser,   setSelUser]   = useState(null);
  const [notifyVis, setNotifyVis] = useState(false);

  // Access guard
  if (user?.role !== 'admin') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG }}>
        <Ionicons name="lock-closed" size={48} color="#ddd" />
        <Text style={{ fontSize: 16, fontWeight: '700', color: DARK, marginTop: 14 }}>Access Denied</Text>
        <Text style={{ fontSize: 12, color: '#888', marginTop: 6 }}>Admin only area</Text>
      </View>
    );
  }

  // ── Loaders ───────────────────────────────────────────────────────────────
  const loadRooms = useCallback(async () => {
    try {
      const r = await http('GET', '/api/admin/rooms');
      if (r?.ok && Array.isArray(r.rooms)) { setRooms(r.rooms); return; }
      // Fallback to public route if admin route doesn't exist yet
      const r2 = await http('GET', '/api/rooms');
      if (r2?.ok && Array.isArray(r2.rooms)) setRooms(r2.rooms);
    } catch {}
  }, []);

  const loadItems = useCallback(async () => {
    try {
      const r = await http('GET', '/api/admin/buysell');
      if (r?.ok && Array.isArray(r.items)) { setItems(r.items); return; }
      const r2 = await http('GET', '/api/buysell');
      if (r2?.ok && Array.isArray(r2.items)) setItems(r2.items);
    } catch {}
  }, []);

  const loadBanners = useCallback(async () => {
    try {
      const r = await http('GET', '/api/promotions/all');
      if (r?.ok && Array.isArray(r.promotions)) setBanners(r.promotions);
    } catch {}
  }, []);

  const loadPayments = useCallback(async () => {
    try {
      const r = await http('GET', '/api/admin/payments');
      if (r?.ok && Array.isArray(r.payments)) setPayments(r.payments);
    } catch {}
  }, []);

  useEffect(() => {
    loadRooms();
    loadItems();
    loadBanners();
    loadPayments();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([loadJobs(), loadUsers(), loadRooms(), loadItems(), loadBanners(), loadPayments()]);
    setRefreshing(false);
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const activeJobs    = jobs.filter(j => j.status === 'active');
  const inactiveJobs  = jobs.filter(j => j.status === 'inactive');
  const featuredJobs  = jobs.filter(j => j.featured);
  const urgentJobs    = jobs.filter(j => j.urgent);
  const proUsers      = users.filter(u => u.premium);
  const bannedUsers   = users.filter(u => !u.active);
  const adminUsers    = users.filter(u => u.role === 'admin');
  const totalViews    = jobs.reduce((a, j) => a + (j.views || 0), 0);
  const totalApps     = jobs.reduce((a, j) => a + (Number(j.applicant_count) || 0), 0);
  const activeRooms   = rooms.filter(r => r.status === 'active');
  const activeItems   = items.filter(i => i.status === 'active');
  const activeBanners = banners.filter(b => b.status === 'active');

  const promoRevenue  = activeBanners.reduce((a, b) => a + (PROMO_PLANS[b.plan]?.price || 0), 0);
  const rev = {
    featured: featuredJobs.length * (PRICING.featured || 99),
    urgent:   urgentJobs.length   * (PRICING.urgent   || 49),
    pro:      proUsers.length      * 499,
    promo:    promoRevenue,
  };
  rev.total = rev.featured + rev.urgent + rev.pro + rev.promo;

  const catBreakdown = activeJobs.reduce((acc, j) => {
    acc[j.category] = (acc[j.category] || 0) + 1; return acc;
  }, {});

  // ── Filtered lists ────────────────────────────────────────────────────────
  const filteredJobs = jobs.filter(j => {
    if (jobFilter === 'active')   return j.status === 'active';
    if (jobFilter === 'inactive') return j.status === 'inactive';
    if (jobFilter === 'featured') return j.featured;
    if (jobFilter === 'urgent')   return j.urgent;
    return true;
  }).filter(j => !jobSearch ||
    (j.title || '').toLowerCase().includes(jobSearch.toLowerCase()) ||
    (j.company || '').toLowerCase().includes(jobSearch.toLowerCase()) ||
    (j.category || '').toLowerCase().includes(jobSearch.toLowerCase())
  );

  const filteredRooms = rooms.filter(r => {
    if (roomFilter === 'active')   return r.status === 'active';
    if (roomFilter === 'inactive') return r.status === 'inactive';
    if (roomFilter === 'featured') return r.plan_label === 'Featured' || r.planLabel === 'Featured';
    return true;
  }).filter(r => !roomSearch ||
    (r.area || '').toLowerCase().includes(roomSearch.toLowerCase()) ||
    (r.room_type || r.roomType || '').toLowerCase().includes(roomSearch.toLowerCase()) ||
    (r.for_gender || r.forGender || '').toLowerCase().includes(roomSearch.toLowerCase())
  );

  const filteredItems = items.filter(i => {
    if (itemFilter === 'active')   return i.status === 'active';
    if (itemFilter === 'inactive') return i.status === 'inactive';
    if (itemFilter === 'featured') return i.featured;
    return true;
  }).filter(i => !itemSearch ||
    (i.title || '').toLowerCase().includes(itemSearch.toLowerCase()) ||
    (i.category || '').toLowerCase().includes(itemSearch.toLowerCase()) ||
    (i.seller_name || i.seller || '').toLowerCase().includes(itemSearch.toLowerCase())
  );

  const filteredBanners = banners.filter(b => {
    if (bannerFilter === 'active')   return b.status === 'active';
    if (bannerFilter === 'inactive') return b.status === 'inactive';
    if (['basic','popular','premium'].includes(bannerFilter)) return b.plan === bannerFilter;
    return true;
  }).filter(b => !bannerSearch ||
    (b.biz_name || b.bizName || '').toLowerCase().includes(bannerSearch.toLowerCase()) ||
    (b.category || '').toLowerCase().includes(bannerSearch.toLowerCase())
  );

  const filteredUsers = users.filter(u => {
    if (userFilter === 'pro')    return u.premium;
    if (userFilter === 'banned') return !u.active;
    if (userFilter === 'admin')  return u.role === 'admin';
    return true;
  }).filter(u => !userSearch ||
    (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.company || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  // ── Job actions ───────────────────────────────────────────────────────────
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

  // ── Room actions ──────────────────────────────────────────────────────────
  async function toggleRoom(id, status) {
    try {
      await http('PATCH', `/api/admin/rooms/${id}/status`, { status });
      await loadRooms();
      Toast.show({ type: 'success', text1: `Room ${status === 'active' ? 'restored ✅' : 'removed 🚫'}` });
    } catch {
      Toast.show({ type: 'error', text1: 'Action failed' });
    }
  }

  // ── Item actions ──────────────────────────────────────────────────────────
  async function toggleItem(id, status) {
    try {
      await http('PATCH', `/api/admin/buysell/${id}/status`, { status });
      await loadItems();
      Toast.show({ type: 'success', text1: `Item ${status === 'active' ? 'restored ✅' : 'removed 🚫'}` });
    } catch {
      Toast.show({ type: 'error', text1: 'Action failed' });
    }
  }

  // ── Banner actions ────────────────────────────────────────────────────────
  async function toggleBanner(id, status) {
    try {
      await http('PATCH', `/api/admin/promotions/${id}/status`, { status });
      await loadBanners();
      Toast.show({ type: 'success', text1: status === 'active' ? 'Banner activated ✅' : 'Banner deactivated 🚫' });
    } catch {
      Toast.show({ type: 'error', text1: 'Action failed' });
    }
  }

  // ── User actions ──────────────────────────────────────────────────────────
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
  async function verifyUser(id, shouldVerify) {
    const r = await http('PATCH', `/api/admin/users/${id}/${shouldVerify ? 'verify' : 'unverify'}`);
    if (r?.ok) {
      await loadUsers();
      Toast.show({ type: 'success', text1: shouldVerify ? '✔ Employer verified!' : '🔲 Badge removed.' });
    }
  }
  async function sendNotification({ title, body, target }) {
    await http('POST', '/api/admin/notifications', { title, body, target });
    Toast.show({ type: 'success', text1: '📣 Notification sent!' });
  }

  // ── Tabs config ───────────────────────────────────────────────────────────
  const TABS = [
    { key: 'overview', label: 'Overview', icon: 'grid'         },
    { key: 'jobs',     label: 'Jobs',     icon: 'briefcase',   count: jobs.length   },
    { key: 'rooms',    label: 'Rooms',    icon: 'home',        count: rooms.length  },
    { key: 'buysell',  label: 'Buy&Sell', icon: 'pricetag',    count: items.length  },
    { key: 'banners',  label: 'Banners',  icon: 'megaphone',   count: banners.length},
    { key: 'users',    label: 'Users',    icon: 'people'       },
    { key: 'revenue',  label: 'Revenue',  icon: 'cash'         },
    { key: 'activity', label: 'Analytics',icon: 'bar-chart'    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>

      {/* ── Top bar ── */}
      <View style={ss.topBar}>
        <View>
          <Text style={ss.topTitle}>NandedRozgar</Text>
          <Text style={ss.topSub}>Admin Dashboard</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={ss.iconBtn} onPress={() => setNotifyVis(true)}>
            <Ionicons name="notifications" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={ss.iconBtn} onPress={onRefresh}>
            <Ionicons name="refresh" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Tab bar ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ss.tabRow}
        contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
            style={[ss.tabPill, tab === t.key && ss.tabPillActive]}>
            <Ionicons name={t.icon} size={13} color={tab === t.key ? '#fff' : '#888'} />
            <Text style={[ss.tabPillTxt, tab === t.key && { color: '#fff' }]}>{t.label}</Text>
            {t.count != null && t.count > 0 && (
              <View style={ss.tabBadge}><Text style={ss.tabBadgeTxt}>{t.count}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Content ── */}
      <ScrollView style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ORANGE]} />}
        showsVerticalScrollIndicator={false}>

        {/* ═══════════════════ OVERVIEW ═══════════════════ */}
        {tab === 'overview' && (
          <>
            {/* KPI grid */}
            <View style={ss.kpiGrid}>
              <StatCard icon="briefcase"    value={jobs.length}   label="Total Jobs"    color={ORANGE} sub={`${activeJobs.length} active`} />
              <StatCard icon="home"         value={rooms.length}  label="Rooms / PG"    color={BLUE}   sub={`${activeRooms.length} active`} />
              <StatCard icon="pricetag"     value={items.length}  label="Buy & Sell"    color={RED}    sub={`${activeItems.length} active`} />
              <StatCard icon="megaphone"    value={banners.length}label="Promo Banners" color={GOLD}   sub={`${activeBanners.length} active`} />
              <StatCard icon="people"       value={users.length}  label="Total Users"   color={PURPLE} sub={`${proUsers.length} PRO`} />
              <StatCard icon="eye"          value={totalViews}    label="Total Views"   color={BLUE}   />
              <StatCard icon="cash"         value={fmtINR(rev.total)} label="Est. Revenue" color={GREEN} />
              <StatCard icon="star"         value={featuredJobs.length} label="Featured Jobs" color={GOLD} />
            </View>

            {/* Alerts */}
            {bannedUsers.length > 0 && (
              <View style={[ss.alert, { borderLeftColor: RED }]}>
                <Ionicons name="alert-circle" size={16} color={RED} />
                <Text style={[ss.alertTxt, { color: RED }]}>{bannedUsers.length} banned user{bannedUsers.length > 1 ? 's' : ''} on platform</Text>
              </View>
            )}
            {inactiveJobs.length > 0 && (
              <View style={[ss.alert, { borderLeftColor: GOLD }]}>
                <Ionicons name="warning" size={16} color={GOLD} />
                <Text style={[ss.alertTxt, { color: GOLD }]}>{inactiveJobs.length} inactive listing{inactiveJobs.length > 1 ? 's' : ''} need review</Text>
              </View>
            )}
            {banners.filter(b => b.status === 'inactive').length > 0 && (
              <View style={[ss.alert, { borderLeftColor: BLUE }]}>
                <Ionicons name="megaphone" size={16} color={BLUE} />
                <Text style={[ss.alertTxt, { color: BLUE }]}>{banners.filter(b => b.status === 'inactive').length} promo banner{banners.filter(b => b.status === 'inactive').length > 1 ? 's' : ''} expired / inactive</Text>
              </View>
            )}

            {/* Platform health */}
            <SectionHdr title="Platform Health" icon="pulse" color={PURPLE} />
            <Card style={{ marginBottom: 16, padding: 16 }}>
              <ProgressBar label="Active Jobs"     value={activeJobs.length}    total={jobs.length}    color={ORANGE} />
              <ProgressBar label="Active Rooms"    value={activeRooms.length}   total={rooms.length}   color={BLUE} />
              <ProgressBar label="Active Buy&Sell" value={activeItems.length}   total={items.length}   color={RED} />
              <ProgressBar label="Active Banners"  value={activeBanners.length} total={banners.length} color={GOLD} />
              <ProgressBar label="PRO Users"       value={proUsers.length}      total={users.length}   color={PURPLE} />
            </Card>

            {/* Quick actions */}
            <SectionHdr title="Quick Actions" icon="flash" color={ORANGE} />
            <View style={ss.actGrid}>
              {[
                { label:'Send Notification', icon:'notifications', color:PURPLE, onPress: () => setNotifyVis(true)   },
                { label:'Manage Jobs',       icon:'briefcase',     color:ORANGE, onPress: () => setTab('jobs')       },
                { label:'Manage Users',      icon:'people',        color:BLUE,   onPress: () => setTab('users')      },
                { label:'View Revenue',      icon:'cash',          color:GREEN,  onPress: () => setTab('revenue')    },
                { label:'Rooms / PG',        icon:'home',          color:BLUE,   onPress: () => setTab('rooms')      },
                { label:'Promo Banners',     icon:'megaphone',     color:GOLD,   onPress: () => setTab('banners')    },
              ].map(({ label, icon, color, onPress }) => (
                <TouchableOpacity key={label} style={[ss.actBtn, { borderTopColor: color }]} onPress={onPress}>
                  <View style={[ss.iconBox, { backgroundColor: color + '20' }]}>
                    <Ionicons name={icon} size={20} color={color} />
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: DARK, marginTop: 8, textAlign: 'center' }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recent listings */}
            <SectionHdr title="Recent Listings" icon="time" color={ORANGE} onAction={() => setTab('jobs')} actionLabel="See all →" />
            <Card style={{ marginBottom: 16, padding: 0 }}>
              {jobs.slice(0, 5).map(j => (
                <View key={j.id} style={ss.recentRow}>
                  <View style={[ss.miniAv, { backgroundColor: ORANGE + '20' }]}>
                    <Ionicons name="briefcase" size={14} color={ORANGE} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={ss.recentName} numberOfLines={1}>{j.title}</Text>
                    <Text style={ss.recentSub}>{j.company} · {j.category}</Text>
                  </View>
                  <Chip label={j.status} variant={j.status === 'active' ? 'green' : 'red'} />
                </View>
              ))}
              {jobs.length === 0 && <Text style={ss.emptyTxt}>No listings yet.</Text>}
            </Card>

            {/* Recent users */}
            <SectionHdr title="Recently Joined" icon="person-add" color={GREEN} onAction={() => setTab('users')} actionLabel="See all →" />
            <Card style={{ marginBottom: 16, padding: 0 }}>
              {users.slice(0, 5).map(u => (
                <View key={u.id} style={ss.recentRow}>
                  <View style={[ss.miniAv, { backgroundColor: avatarColor(u.name?.[0]) }]}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>{(u.name || 'U')[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={ss.recentName}>{u.name}</Text>
                    <Text style={ss.recentSub}>{u.email}</Text>
                  </View>
                  <Chip label={u.premium ? '💎' : 'Free'} variant={u.premium ? 'green' : 'gray'} />
                </View>
              ))}
              {users.length === 0 && <Text style={ss.emptyTxt}>No users yet.</Text>}
            </Card>
          </>
        )}

        {/* ═══════════════════ JOBS ═══════════════════ */}
        {tab === 'jobs' && (
          <>
            <SearchBar value={jobSearch} onChange={setJobSearch} placeholder="Search by title, company, category…" />
            <FilterPills active={jobFilter} onSelect={setJobFilter} options={[
              ['all',      'All',         jobs.length          ],
              ['active',   'Active',      activeJobs.length    ],
              ['inactive', 'Inactive',    inactiveJobs.length  ],
              ['featured', '⭐ Featured', featuredJobs.length  ],
              ['urgent',   '🔥 Urgent',  urgentJobs.length    ],
            ]} />
            <Text style={ss.resultsCnt}>{filteredJobs.length} listing{filteredJobs.length !== 1 ? 's' : ''}</Text>
            {filteredJobs.length === 0
              ? <Card><Text style={ss.emptyTxt}>No listings found.</Text></Card>
              : filteredJobs.map(j => (
                <TouchableOpacity key={j.id} onPress={() => setSelJob(j)}>
                  <Card style={ss.listCard}>
                    <View style={ss.listTop}>
                      <View style={[ss.listTypeIcon, { backgroundColor: ORANGE + '18' }]}>
                        <Ionicons name="briefcase" size={16} color={ORANGE} />
                      </View>
                      <View style={{ flex: 1, marginHorizontal: 10 }}>
                        <Text style={ss.listTitle} numberOfLines={1}>{j.title}</Text>
                        <Text style={ss.listSub}>{j.company} · {j.category} · {j.location}</Text>
                      </View>
                      <Chip label={j.status} variant={j.status === 'active' ? 'green' : 'red'} />
                    </View>
                    <View style={ss.listBottom}>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        {j.featured && <Ionicons name="star"  size={13} color={GOLD} />}
                        {j.urgent   && <Ionicons name="flame" size={13} color={RED}  />}
                        <Ionicons name="eye"    size={13} color="#bbb" />
                        <Text style={ss.metaTxt}>{j.views || 0}</Text>
                        <Ionicons name="people" size={13} color="#bbb" />
                        <Text style={ss.metaTxt}>{j.applicant_count || 0}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 5 }}>
                        <TouchableOpacity style={ss.smBtn} onPress={() => toggleJob(j.id, j.status === 'active' ? 'inactive' : 'active')}>
                          <Ionicons name={j.status === 'active' ? 'eye-off' : 'eye'} size={14} color={j.status === 'active' ? RED : GREEN} />
                        </TouchableOpacity>
                        <TouchableOpacity style={ss.smBtn} onPress={() => featureJob(j.id, !j.featured)}>
                          <Ionicons name="star" size={14} color={j.featured ? GOLD : '#ccc'} />
                        </TouchableOpacity>
                        <TouchableOpacity style={ss.smBtn} onPress={() => setSelJob(j)}>
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

        {/* ═══════════════════ ROOMS ═══════════════════ */}
        {tab === 'rooms' && (
          <>
            <SearchBar value={roomSearch} onChange={setRoomSearch} placeholder="Search by area, type, gender…" />
            <FilterPills active={roomFilter} onSelect={setRoomFilter} options={[
              ['all',      'All',         rooms.length],
              ['active',   'Active',      activeRooms.length],
              ['inactive', 'Inactive',    rooms.filter(r => r.status === 'inactive').length],
              ['featured', '⭐ Featured', rooms.filter(r => r.plan_label === 'Featured' || r.planLabel === 'Featured').length],
            ]} />
            <Text style={ss.resultsCnt}>{filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''}</Text>
            {filteredRooms.length === 0
              ? <Card><Text style={ss.emptyTxt}>No rooms found.</Text></Card>
              : filteredRooms.map(r => (
                <TouchableOpacity key={r.id} onPress={() => setSelRoom(r)}>
                  <Card style={ss.listCard}>
                    <View style={ss.listTop}>
                      <View style={[ss.listTypeIcon, { backgroundColor: BLUE + '18' }]}>
                        <Ionicons name="home" size={16} color={BLUE} />
                      </View>
                      <View style={{ flex: 1, marginHorizontal: 10 }}>
                        <Text style={ss.listTitle}>{r.room_type || r.roomType} — {r.area}</Text>
                        <Text style={ss.listSub}>{r.for_gender || r.forGender} · {r.furnished} · {r.vacancies} vacanc{r.vacancies === 1 ? 'y' : 'ies'}</Text>
                      </View>
                      <Chip label={r.status} variant={r.status === 'active' ? 'green' : 'red'} />
                    </View>
                    <View style={ss.listBottom}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: ORANGE }}>{fmtINR(r.rent)}/mo</Text>
                      <View style={{ flexDirection: 'row', gap: 5 }}>
                        {(r.plan_label === 'Featured' || r.planLabel === 'Featured') && (
                          <Ionicons name="star" size={13} color={GOLD} />
                        )}
                        <TouchableOpacity style={ss.smBtn} onPress={() => toggleRoom(r.id, r.status === 'active' ? 'inactive' : 'active')}>
                          <Ionicons name={r.status === 'active' ? 'eye-off' : 'eye'} size={14} color={r.status === 'active' ? RED : GREEN} />
                        </TouchableOpacity>
                        <TouchableOpacity style={ss.smBtn} onPress={() => setSelRoom(r)}>
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

        {/* ═══════════════════ BUY & SELL ═══════════════════ */}
        {tab === 'buysell' && (
          <>
            <SearchBar value={itemSearch} onChange={setItemSearch} placeholder="Search items, category, seller…" />
            <FilterPills active={itemFilter} onSelect={setItemFilter} options={[
              ['all',      'All',         items.length],
              ['active',   'Active',      activeItems.length],
              ['inactive', 'Inactive',    items.filter(i => i.status === 'inactive').length],
              ['featured', '⭐ Featured', items.filter(i => i.featured).length],
            ]} />
            <Text style={ss.resultsCnt}>{filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}</Text>
            {filteredItems.length === 0
              ? <Card><Text style={ss.emptyTxt}>No items found.</Text></Card>
              : filteredItems.map(i => (
                <TouchableOpacity key={i.id} onPress={() => setSelItem(i)}>
                  <Card style={ss.listCard}>
                    <View style={ss.listTop}>
                      <View style={[ss.listTypeIcon, { backgroundColor: RED + '18' }]}>
                        <Ionicons name="pricetag" size={16} color={RED} />
                      </View>
                      <View style={{ flex: 1, marginHorizontal: 10 }}>
                        <Text style={ss.listTitle}>{i.title}</Text>
                        <Text style={ss.listSub}>{i.category} · {i.condition} · {i.seller_name || i.seller || 'Unknown'}</Text>
                      </View>
                      <Chip label={i.status} variant={i.status === 'active' ? 'green' : 'red'} />
                    </View>
                    <View style={ss.listBottom}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: ORANGE }}>{fmtINR(i.price)}</Text>
                      <View style={{ flexDirection: 'row', gap: 5 }}>
                        <TouchableOpacity style={ss.smBtn} onPress={() => toggleItem(i.id, i.status === 'active' ? 'inactive' : 'active')}>
                          <Ionicons name={i.status === 'active' ? 'eye-off' : 'eye'} size={14} color={i.status === 'active' ? RED : GREEN} />
                        </TouchableOpacity>
                        <TouchableOpacity style={ss.smBtn} onPress={() => setSelItem(i)}>
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

        {/* ═══════════════════ BANNERS ═══════════════════ */}
        {tab === 'banners' && (
          <>
            <SearchBar value={bannerSearch} onChange={setBannerSearch} placeholder="Search by business name, category…" />
            <FilterPills active={bannerFilter} onSelect={setBannerFilter} options={[
              ['all',      'All',            banners.length],
              ['active',   'Active',         activeBanners.length],
              ['inactive', 'Expired/Off',    banners.filter(b => b.status === 'inactive').length],
              ['premium',  'Premium',        banners.filter(b => b.plan === 'premium').length],
              ['popular',  'Popular',        banners.filter(b => b.plan === 'popular').length],
              ['basic',    'Basic',          banners.filter(b => b.plan === 'basic').length],
            ]} />
            <Text style={ss.resultsCnt}>{filteredBanners.length} promotion{filteredBanners.length !== 1 ? 's' : ''}</Text>
            {filteredBanners.length === 0
              ? <Card><Text style={ss.emptyTxt}>No banners found.</Text></Card>
              : filteredBanners.map(b => {
                const planInfo = PROMO_PLANS[b.plan] || { price: 0, days: 7 };
                const planColor = b.plan === 'premium' ? PURPLE : b.plan === 'popular' ? ORANGE : BLUE;
                return (
                  <TouchableOpacity key={b.id} onPress={() => setSelBanner(b)}>
                    <Card style={[ss.listCard, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                      <View style={{ width: 4, alignSelf: 'stretch', backgroundColor: planColor, borderRadius: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={ss.listTitle}>{b.biz_name || b.bizName}</Text>
                        <Text style={ss.listSub}>{b.tagline || b.category}</Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                          <Chip label={b.status} variant={b.status === 'active' ? 'green' : 'red'} />
                          <Chip label={b.plan || 'basic'} variant="orange" />
                          <Chip label={b.category || '—'} variant="blue" />
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: planColor }}>{fmtINR(planInfo.price)}</Text>
                        <Text style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{planInfo.days} days</Text>
                        <Text style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>Exp: {fmtDate(b.expires_at)}</Text>
                        <TouchableOpacity style={[ss.smBtn, { marginTop: 6 }]}
                          onPress={() => toggleBanner(b.id, b.status === 'active' ? 'inactive' : 'active')}>
                          <Ionicons name={b.status === 'active' ? 'eye-off' : 'eye'} size={14} color={b.status === 'active' ? RED : GREEN} />
                        </TouchableOpacity>
                      </View>
                    </Card>
                  </TouchableOpacity>
                );
              })
            }
          </>
        )}

        {/* ═══════════════════ USERS ═══════════════════ */}
        {tab === 'users' && (
          <>
            <SearchBar value={userSearch} onChange={setUserSearch} placeholder="Search by name, email, company…" />
            <FilterPills active={userFilter} onSelect={setUserFilter} options={[
              ['all',    'All',        users.length      ],
              ['pro',    '💎 PRO',    proUsers.length    ],
              ['banned', '🚫 Banned', bannedUsers.length ],
              ['admin',  '🔑 Admin',  adminUsers.length  ],
            ]} />
            <Text style={ss.resultsCnt}>{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</Text>
            {filteredUsers.length === 0
              ? <Card><Text style={ss.emptyTxt}>No users found.</Text></Card>
              : filteredUsers.map(u => (
                <TouchableOpacity key={u.id} onPress={() => setSelUser(u)}>
                  <Card style={ss.listCard}>
                    <View style={ss.listTop}>
                      <View style={[ss.miniAv, { backgroundColor: avatarColor(u.name?.[0]) }]}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>{(u.name || 'U')[0].toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={ss.listTitle}>{u.name}</Text>
                        <Text style={ss.listSub}>{u.email}</Text>
                        {u.company && <Text style={{ fontSize: 11, color: ORANGE, marginTop: 1, fontWeight: '600' }}>{u.company}</Text>}
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Chip label={u.role} variant={u.role === 'admin' ? 'red' : 'blue'} />
                        <Chip label={u.premium ? '💎' : 'Free'} variant={u.premium ? 'green' : 'gray'} />
                      </View>
                    </View>
                    <View style={ss.listBottom}>
                      <Chip label={u.active ? 'Active' : 'Banned'} variant={u.active ? 'green' : 'red'} />
                      <View style={{ flexDirection: 'row', gap: 5 }}>
                        <TouchableOpacity style={ss.smBtn} onPress={() => toggleUser(u.id)}>
                          <Ionicons name={u.active ? 'ban' : 'checkmark-circle'} size={14} color={u.active ? RED : GREEN} />
                        </TouchableOpacity>
                        {!u.premium && (
                          <TouchableOpacity style={ss.smBtn} onPress={() => grantPro(u.id)}>
                            <Ionicons name="diamond" size={14} color={GOLD} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={ss.smBtn} onPress={() => setSelUser(u)}>
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

        {/* ═══════════════════ REVENUE ═══════════════════ */}
        {tab === 'revenue' && (
          <>
            <View style={ss.kpiGrid}>
              <StatCard icon="star"       value={fmtINR(rev.featured)} label="Featured Jobs"    color={GOLD}   sub={`${featuredJobs.length} jobs`} />
              <StatCard icon="flame"      value={fmtINR(rev.urgent)}   label="Urgent Badges"   color={RED}    sub={`${urgentJobs.length} jobs`} />
              <StatCard icon="diamond"    value={fmtINR(rev.pro)}      label="PRO Subs"         color={PURPLE} sub={`${proUsers.length} users`} />
              <StatCard icon="megaphone"  value={fmtINR(rev.promo)}    label="Promo Banners"    color={ORANGE} sub={`${activeBanners.length} active`} />
              <StatCard icon="trending-up" value={fmtINR(rev.total)}   label="Total Estimated"  color={GREEN}  />
            </View>

            {/* Revenue bars */}
            <SectionHdr title="Revenue Breakdown" icon="pie-chart" color={ORANGE} />
            <Card style={{ marginBottom: 16, padding: 16 }}>
              {[
                { label: 'Featured Boosts',    amount: rev.featured, color: GOLD   },
                { label: 'Urgent Badges',      amount: rev.urgent,   color: RED    },
                { label: 'PRO Subscriptions',  amount: rev.pro,      color: PURPLE },
                { label: 'Promo Banners',      amount: rev.promo,    color: ORANGE },
              ].map(({ label, amount, color }) => {
                const pct = rev.total > 0 ? ((amount / rev.total) * 100).toFixed(1) : 0;
                return (
                  <View key={label} style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#555' }}>{label}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color }}>{fmtINR(amount)}</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: '#efefef', borderRadius: 3 }}>
                      <View style={{ height: 6, width: `${Math.min(Number(pct), 100)}%`, backgroundColor: color, borderRadius: 3 }} />
                    </View>
                    <Text style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{pct}% of total</Text>
                  </View>
                );
              })}
            </Card>

            {/* Pricing plans */}
            <SectionHdr title="Pricing Plans" icon="pricetag" color={BLUE} />
            <Card style={{ marginBottom: 16, padding: 16 }}>
              {[
                { sectionLabel: 'Job Plans', plans: JOB_PLANS },
                { sectionLabel: 'Room Plans', plans: ROOM_PLANS },
                { sectionLabel: 'Buy & Sell Plans', plans: BUYSELL_PLANS },
                { sectionLabel: 'Promo Banner Plans', plans: Object.entries(PROMO_PLANS).map(([k, v]) => ({ id: k, label: k.charAt(0).toUpperCase() + k.slice(1), price: v.price, description: `${v.days} days` })) },
              ].map(({ sectionLabel, plans }, si) => (
                <View key={sectionLabel}>
                  {si > 0 && <View style={{ height: 1, backgroundColor: '#ebebeb', marginVertical: 12 }} />}
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#999', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>{sectionLabel}</Text>
                  {plans.map(p => (
                    <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9 }}>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: DARK }}>{p.label}</Text>
                        <Text style={{ fontSize: 11, color: '#aaa' }}>{p.description}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: ORANGE, fontVariant: ['tabular-nums'] }}>
                        {p.price > 0 ? fmtINR(p.price) : 'Free'}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </Card>

            {/* Projections */}
            <SectionHdr title="Revenue Projections" icon="trending-up" color={GREEN} />
            <Card style={{ marginBottom: 16, padding: 16 }}>
              {[
                { label: '20 featured jobs/day',   proj: '₹29,400/month', color: GOLD   },
                { label: '30 urgent badges/day',    proj: '₹26,100/month', color: RED    },
                { label: '100 PRO employers',        proj: '₹49,900/month', color: PURPLE },
                { label: '50 promo banners/month',  proj: '₹12,450/month', color: ORANGE },
                { label: 'Combined potential',       proj: '₹1,35,000+/mo', color: GREEN, bold: true },
              ].map(({ label, proj, color, bold }) => (
                <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' }}>
                  <Text style={{ fontSize: 13, color: '#555', fontWeight: bold ? '800' : '500' }}>{label}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color }}>{proj}</Text>
                </View>
              ))}
            </Card>

            {/* Recent payments */}
            <SectionHdr title="Recent Payments" icon="receipt" color={BLUE} count={payments.length} />
            <Card style={{ marginBottom: 16, padding: payments.length === 0 ? 0 : undefined }}>
              {payments.length === 0
                ? <Text style={ss.emptyTxt}>No payment records yet.</Text>
                : payments.slice(0, 10).map(p => (
                  <View key={p.id} style={ss.recentRow}>
                    <View style={[ss.miniAv, { backgroundColor: GREEN + '20' }]}>
                      <Ionicons name="cash" size={14} color={GREEN} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={ss.recentName}>{p.plan || 'Payment'} — {fmtINR(p.amount)}</Text>
                      <Text style={ss.recentSub}>{fmtDate(p.created_at)}</Text>
                    </View>
                    <Chip label={p.status || 'paid'} variant="green" />
                  </View>
                ))
              }
            </Card>
          </>
        )}

        {/* ═══════════════════ ANALYTICS ═══════════════════ */}
        {tab === 'activity' && (
          <>
            <SectionHdr title="Platform Stats" icon="stats-chart" color={PURPLE} />
            <Card style={{ marginBottom: 16, padding: 16 }}>
              {[
                { label: 'Total Jobs',         value: jobs.length,           icon: 'briefcase',        color: ORANGE  },
                { label: 'Active Jobs',         value: activeJobs.length,     icon: 'checkmark-circle', color: GREEN   },
                { label: 'Featured Jobs',       value: featuredJobs.length,   icon: 'star',             color: GOLD    },
                { label: 'Total Rooms / PG',    value: rooms.length,          icon: 'home',             color: BLUE    },
                { label: 'Active Rooms',        value: activeRooms.length,    icon: 'home',             color: BLUE    },
                { label: 'Total Buy & Sell',    value: items.length,          icon: 'pricetag',         color: RED     },
                { label: 'Active Promo Banners',value: activeBanners.length,  icon: 'megaphone',        color: PURPLE  },
                { label: 'Total Users',         value: users.length,          icon: 'people',           color: BLUE    },
                { label: 'PRO Users',           value: proUsers.length,       icon: 'diamond',          color: PURPLE  },
                { label: 'Banned Users',        value: bannedUsers.length,    icon: 'ban',              color: RED     },
                { label: 'Total Views',         value: totalViews,            icon: 'eye',              color: PURPLE  },
                { label: 'Total Applications',  value: totalApps,             icon: 'paper-plane',      color: BLUE    },
              ].map(({ label, value, icon, color }) => (
                <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[ss.iconBox, { width: 28, height: 28, borderRadius: 8, backgroundColor: color + '20' }]}>
                      <Ionicons name={icon} size={13} color={color} />
                    </View>
                    <Text style={{ fontSize: 13, color: '#555', fontWeight: '500' }}>{label}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: DARK }}>{value}</Text>
                </View>
              ))}
            </Card>

            {/* User breakdown */}
            <SectionHdr title="User Breakdown" icon="pie-chart" color={BLUE} />
            <Card style={{ marginBottom: 16, padding: 16 }}>
              <ProgressBar label="Free Users"   value={users.length - proUsers.length} total={users.length} color="#999" />
              <ProgressBar label="PRO Users"    value={proUsers.length}                total={users.length} color={PURPLE} />
              <ProgressBar label="Admin Users"  value={adminUsers.length}              total={users.length} color={ORANGE} />
              <ProgressBar label="Banned Users" value={bannedUsers.length}             total={users.length} color={RED} />
            </Card>

            {/* Listing categories */}
            <SectionHdr title="Listings by Category" icon="list" color={ORANGE} />
            <Card style={{ marginBottom: 16, padding: 16 }}>
              {Object.entries(catBreakdown).length === 0
                ? <Text style={ss.emptyTxt}>No data yet.</Text>
                : Object.entries(catBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, count]) => {
                      const pct = activeJobs.length > 0 ? Math.round((count / activeJobs.length) * 100) : 0;
                      return (
                        <View key={cat} style={{ marginBottom: 12 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#555' }}>{cat}</Text>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: ORANGE }}>{count} ({pct}%)</Text>
                          </View>
                          <View style={{ height: 5, backgroundColor: '#efefef', borderRadius: 3 }}>
                            <View style={{ height: 5, width: `${pct}%`, backgroundColor: ORANGE, borderRadius: 3 }} />
                          </View>
                        </View>
                      );
                    })
              }
            </Card>
          </>
        )}

      </ScrollView>

      {/* ── Modals ── */}
      <JobModal
        job={selJob} visible={!!selJob}
        onClose={() => setSelJob(null)}
        onToggle={toggleJob} onFeature={featureJob}
        onUrgent={urgentJob} onDelete={deleteJob}
      />
      <RoomModal
        room={selRoom} visible={!!selRoom}
        onClose={() => setSelRoom(null)}
        onToggle={toggleRoom}
      />
      <ItemModal
        item={selItem} visible={!!selItem}
        onClose={() => setSelItem(null)}
        onToggle={toggleItem}
      />
      <BannerModal
        banner={selBanner} visible={!!selBanner}
        onClose={() => setSelBanner(null)}
        onToggle={toggleBanner}
      />
      <UserModal
        user={selUser} visible={!!selUser}
        onClose={() => setSelUser(null)}
        onToggle={toggleUser} onGrantPro={grantPro}
        onMakeAdmin={makeAdmin} onVerify={verifyUser}
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
    backgroundColor: DARK, paddingHorizontal: 16, paddingVertical: 14, paddingTop: 20,
  },
  topTitle: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
  topSub:   { fontSize: 11, color: '#666', marginTop: 1 },
  iconBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1f1f1f', alignItems: 'center', justifyContent: 'center' },

  // Tab bar
  tabRow:        { backgroundColor: DARK, flexGrow: 0 },
  tabPill:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 13, borderRadius: 20, backgroundColor: '#1f1f1f' },
  tabPillActive: { backgroundColor: ORANGE },
  tabPillTxt:    { fontSize: 12, fontWeight: '600', color: '#888' },
  tabBadge:      { backgroundColor: RED, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: 'center' },
  tabBadgeTxt:   { fontSize: 9, fontWeight: '800', color: '#fff' },

  // KPI
  kpiGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: (SW - 48) / 2, backgroundColor: '#fff', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#ebebeb', borderTopWidth: 3,
  },
  statVal: { fontSize: 21, fontWeight: '900', color: DARK },
  statLbl: { fontSize: 11, color: '#888', marginTop: 2, fontWeight: '600' },
  statSub: { fontSize: 10, color: '#bbb', marginTop: 2 },

  // Shared icon box
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },

  // Alerts
  alert:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderLeftWidth: 4, marginBottom: 10, borderWidth: 1, borderColor: '#ebebeb' },
  alertTxt: { fontSize: 13, fontWeight: '600', flex: 1 },

  // Section header
  sectionHdr:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: DARK },
  badge:        { backgroundColor: ORANGE, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTxt:     { fontSize: 10, fontWeight: '800', color: '#fff' },

  // Quick action grid
  actGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  actBtn: {
    width: (SW - 48) / 3, backgroundColor: '#fff', borderRadius: 12,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ebebeb', borderTopWidth: 3,
  },

  // Recent rows
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  recentName: { fontSize: 13, fontWeight: '700', color: DARK },
  recentSub:  { fontSize: 11, color: '#888', marginTop: 1 },

  // Mini avatar
  miniAv: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  // Full avatar (modal)
  avatar:    { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 26, fontWeight: '900', color: '#fff' },

  // Search bar
  searchBar:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ebebeb', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  searchInput:{ flex: 1, fontSize: 13, color: DARK, padding: 0 },

  // Filter pills
  pill:        { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ebebeb' },
  pillActive:  { backgroundColor: DARK, borderColor: DARK },
  pillTxt:     { fontSize: 12, fontWeight: '600', color: '#888' },
  pillTxtActive: { color: '#fff' },

  resultsCnt: { fontSize: 11, color: '#aaa', fontWeight: '600', marginBottom: 10, letterSpacing: 0.3 },
  emptyTxt:   { color: '#bbb', fontSize: 13, textAlign: 'center', padding: 24 },

  // List cards
  listCard:     { marginBottom: 10, padding: 14 },
  listTop:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  listTypeIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  listTitle:    { fontSize: 14, fontWeight: '700', color: DARK },
  listSub:      { fontSize: 11, color: '#888', marginTop: 2 },
  listBottom:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaTxt:      { fontSize: 11, color: '#aaa' },
  smBtn:        { width: 30, height: 30, borderRadius: 8, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },

  // Modal sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '92%' },
  sheetHdr:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: DARK },

  // Info table
  infoTable: { backgroundColor: '#f8f8f8', borderRadius: 10, overflow: 'hidden', marginBottom: 16 },
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#efefef' },
  infoKey:   { fontSize: 12, color: '#888', fontWeight: '600' },
  infoVal:   { fontSize: 12, color: DARK, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },

  // Notify modal fields
  fldLabel: { fontSize: 12, fontWeight: '700', color: '#444', marginBottom: 5 },
  fldInput: { borderWidth: 1.5, borderColor: '#ebebeb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: DARK, backgroundColor: '#fafafa', marginBottom: 14 },
  seg:      { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f0f0f0', alignItems: 'center' },
  segActive:{ backgroundColor: DARK },
  segTxt:   { fontSize: 12, fontWeight: '600', color: '#888' },
});
