import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { http } from '../utils/api';
import { Card, Btn, Chip, SectionTitle } from '../components/UI';
import { C, PRICING } from '../utils/constants';

export default function AdminScreen() {
  const { role, jobs, users, loadJobs, loadUsers } = useAuth();
  const [tab, setTab] = useState('jobs');
  const [refreshing, setRefreshing] = useState(false);

  if (role !== 'admin') return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 40 }}>🔐</Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, marginTop: 12 }}>Access Denied</Text>
    </View>
  );

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([loadJobs(), loadUsers()]);
    setRefreshing(false);
  }

  async function toggleJob(id, status) {
    await http('PATCH', `/api/admin/jobs/${id}/status`, { status });
    await loadJobs();
    Toast.show({ type: 'success', text1: `Job ${status === 'active' ? 'restored' : 'removed'}.` });
  }

  async function toggleUser(id) {
    const r = await http('PATCH', `/api/admin/users/${id}/toggle`);
    await loadUsers();
    Toast.show({ type: 'success', text1: r.user?.active ? 'User unbanned.' : 'User banned.' });
  }

  async function grantPro(id) {
    await http('PATCH', `/api/admin/users/${id}/grant-pro`);
    await loadUsers();
    Toast.show({ type: 'success', text1: '💎 PRO granted to user!' });
  }

  const totalViews = jobs.reduce((a, j) => a + (j.views || 0), 0);
  const TABS = [['jobs','All Jobs'],['users','Users'],['revenue','Revenue']];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.dark]} />}>
      <SectionTitle title="Admin Panel" sub="Platform overview" style={{ marginBottom: 14 }} />

      {/* Stats */}
      <View style={styles.statsGrid}>
        {[['📋',jobs.length,'Jobs'],['👥',users.length,'Users'],['👁',totalViews,'Views']].map(([i,v,l]) => (
          <View key={l} style={styles.statCard}>
            <Text style={{ fontSize: 20 }}>{i}</Text>
            <Text style={styles.statVal}>{v}</Text>
            <Text style={styles.statLbl}>{l}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(([t, l]) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'jobs' && jobs.map(j => (
        <Card key={j.id} style={styles.rowCard}>
          <View style={styles.rowTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{j.title}</Text>
              <Text style={styles.rowSub}>{j.company}</Text>
            </View>
            <Chip label={j.status} variant={j.status === 'active' ? 'green' : 'red'} />
          </View>
          <View style={styles.rowMeta}>
            <Text style={styles.metaText}>{j.featured ? '⭐' : ''}{j.urgent ? '🔥' : ''} · 👁{j.views||0} · 👤{j.applicant_count||0}</Text>
            {j.status === 'active'
              ? <Btn label="Remove" variant="danger" size="sm" onPress={() => toggleJob(j.id, 'inactive')} />
              : <Btn label="Restore" variant="outline" size="sm" onPress={() => toggleJob(j.id, 'active')} />}
          </View>
        </Card>
      ))}

      {tab === 'users' && users.map(u => (
        <Card key={u.id} style={styles.rowCard}>
          <View style={styles.rowTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{u.name}</Text>
              <Text style={styles.rowSub}>{u.email}</Text>
            </View>
            <Chip label={u.role} variant={u.role === 'admin' ? 'red' : u.role === 'giver' ? 'gold' : 'blue'} />
          </View>
          <View style={styles.rowMeta}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Chip label={u.premium ? '💎 PRO' : 'Free'} variant={u.premium ? 'green' : 'gray'} />
              <Chip label={u.active ? 'Active' : 'Banned'} variant={u.active ? 'green' : 'red'} />
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Btn label={u.active ? 'Ban' : 'Unban'} variant={u.active ? 'danger' : 'outline'}
                size="sm" onPress={() => toggleUser(u.id)} />
              {!u.premium && <Btn label="💎 PRO" variant="gold" size="sm" onPress={() => grantPro(u.id)} />}
            </View>
          </View>
        </Card>
      ))}

      {tab === 'revenue' && (
        <Card>
          <Text style={styles.rowTitle}>Revenue Analytics</Text>
          <View style={{ marginTop: 12 }}>
            {[
              ['Featured Boosts', `₹${jobs.filter(j=>j.featured).length * PRICING.featured}`, `${jobs.filter(j=>j.featured).length} jobs @ ₹${PRICING.featured}`],
              ['Urgent Badges',   `₹${jobs.filter(j=>j.urgent).length * PRICING.urgent}`,     `${jobs.filter(j=>j.urgent).length} jobs @ ₹${PRICING.urgent}`],
              ['PRO Users',       `₹${users.filter(u=>u.premium).length * PRICING.pro_monthly}`, `${users.filter(u=>u.premium).length} users @ ₹${PRICING.pro_monthly}/mo`],
            ].map(([l, v, d]) => (
              <View key={l} style={styles.revenueRow}>
                <View>
                  <Text style={{ fontWeight: '700', fontSize: 13, color: C.text }}>{l}</Text>
                  <Text style={{ fontSize: 11, color: C.muted }}>{d}</Text>
                </View>
                <Text style={{ fontWeight: '800', fontSize: 16, color: C.dark }}>{v}</Text>
              </View>
            ))}
          </View>
          <View style={styles.projBox}>
            <Text style={{ fontWeight: '700', fontSize: 13, marginBottom: 8 }}>📈 Revenue Projections</Text>
            {['At 20 featured jobs/day → ₹29,400/month',
              'At 30 urgent badges/day → ₹26,100/month',
              'At 100 PRO employers → ₹49,900/month',
            ].map(t => <Text key={t} style={{ fontSize: 12, color: '#555', lineHeight: 22 }}>{t}</Text>)}
            <Text style={{ fontWeight: '800', fontSize: 15, color: C.dark, marginTop: 8 }}>
              Potential: ₹1,35,000+/month
            </Text>
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: C.card, borderRadius: 10, borderWidth: 1,
    borderColor: C.border, padding: 12, alignItems: 'center',
  },
  statVal: { fontSize: 20, fontWeight: '800', color: C.text, marginTop: 2 },
  statLbl: { fontSize: 10, color: C.muted, marginTop: 2, textTransform: 'uppercase' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: C.border, marginBottom: 14 },
  tab: { paddingVertical: 9, paddingHorizontal: 14 },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: C.dark },
  tabText: { fontSize: 13, fontWeight: '500', color: C.muted },
  tabTextActive: { fontSize: 13, fontWeight: '700', color: C.text },
  rowCard: { marginBottom: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  rowSub: { fontSize: 11, color: C.muted, marginTop: 2 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaText: { fontSize: 11, color: C.muted },
  revenueRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  projBox: { backgroundColor: C.grayLight, borderRadius: 10, padding: 14, marginTop: 14 },
});
