import { useLang } from '../utils/i18n';
import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import JobCard from '../components/JobCard';
import { Card, Btn, Chip, Empty } from '../components/UI';
import { C, PRICING } from '../utils/constants';

const ORANGE = '#f97316';

export default function ProfileScreen() {
  const nav = useNavigation();
  const { user, role, jobs, signOut } = useAuth();
  const { t } = useLang();
  const [tab, setTab] = React.useState('jobs');

  if (!user) return null;

  const myJobs      = jobs.filter(j => j.posted_by === user.id && j.status !== 'deleted');
  const appliedJobs = jobs.filter(j => (j.applicants || []).includes(user.id));
  const savedJobs   = jobs.filter(j => (j.saved   || []).includes(user.id));

  const totalViews = myJobs.reduce((a, j) => a + (j.views || 0), 0);
  const totalApps  = myJobs.reduce((a, j) => a + (j.applicant_count || 0), 0);

  const tabs = role === 'user' || role === 'admin'
    ? [['jobs',`My Jobs (${myJobs.length})`], ['stats','Analytics']]
    : role === 'user' // user
    ? [['jobs',`Applied (${appliedJobs.length})`], ['saved',`Saved (${savedJobs.length})`]]
    : [];

  function renderContent() {
    if (role === 'admin') return (
      <Card>
        <Text style={{ color: '#999', fontSize: 13, marginBottom: 12 }}>
          You are the platform administrator.
        </Text>
        <Btn label="Go to Admin Panel →" onPress={() => nav.navigate('Admin')} variant="orange" />
      </Card>
    );

    const listJobs = tab === 'saved' ? savedJobs : tab === 'jobs' && role === 'user' ? appliedJobs : myJobs;

    if (tab === 'stats') return (
      <View>
        <View style={styles.statsGrid}>
          {[['clipboard', myJobs.length,'Total Posted'],['eye', totalViews,'Total Views'],['person', totalApps,'Applications']].map(([i,v,l]) => (
            <View key={l} style={styles.statCard}>
              <Ionicons name={i} size={22} color="#f97316" />
              <Text style={styles.statVal}>{v}</Text>
              <Text style={styles.statLbl}>{l}</Text>
            </View>
          ))}
        </View>
        {myJobs.length === 0
          ? <Empty icon="📊" title="No jobs posted yet" />
          : myJobs.map(j => <JobCard key={j.id} job={j} onPress={() => nav.navigate('JobDetail', { job: j })} />)
        }
      </View>
    );

    return listJobs.length === 0
      ? <Empty
          icon={tab === 'saved' ? 'bookmark' : 'clipboard'}
          title={tab === 'saved' ? 'No saved jobs' : role === 'user' || role === 'admin' ? 'No jobs posted yet' : 'No applications yet'}
          action={() => nav.navigate('Jobs')}
          actionLabel="Browse Jobs"
        />
      : <View>{listJobs.map(j =>
          <JobCard key={j.id} job={j} onPress={() => nav.navigate('JobDetail', { job: j })} />
        )}</View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>

      {/* Profile card */}
      <Card style={{ marginBottom: 14 }}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>
              {user.name?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={styles.name}>{user.name}</Text>
              {user.premium
                ? <View style={styles.proPill}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>💎 PRO</Text></View>
                : <Chip label="Starter" variant="gray" />}
            </View>
            <Text style={styles.email}>{user.email}{user.phone ? ` · ${user.phone}` : ''}</Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {user.location && <Chip label={user.location} iconName="location-sharp" />}
              {user.company && <Chip label={user.company} iconName="business" variant="orange" />}
            </View>
          </View>
        </View>

        {role === 'user' && !user.premium && (
          <View style={styles.upgradeBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.upgradeTitle}>💎 Upgrade to PRO — ₹{PRICING.pro_monthly}/month</Text>
              <Text style={styles.upgradeSub}>Unlimited posts · Priority placement · Analytics</Text>
            </View>
            <Btn label="Upgrade" variant="orange" size="sm" onPress={() => {}} />
          </View>
        )}

        {role === 'user' && (
          <View style={[styles.upgradeBanner, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
            <Text style={{ fontWeight: '700', fontSize: 13, color: '#166534' }}>
              🎉 Job Seeker Account — Always FREE!
            </Text>
          </View>
        )}
      </Card>

      {/* Tabs */}
      {tabs.length > 0 && (
        <View style={styles.tabs}>
          {tabs.map(([t, label]) => (
            <TouchableOpacity key={t} onPress={() => setTab(t)}
              style={[styles.tab, tab === t && styles.tabActive]}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {renderContent()}

      {/* Referral */}
      <TouchableOpacity style={referralStyle} onPress={() => nav.navigate('Referral')} activeOpacity={0.85}>
        <Ionicons name="gift-outline" size={18} color="#f97316" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#111' }}>Invite a Friend & Earn</Text>
          <Text style={{ fontSize: 11, color: '#888' }}>Get a FREE Boosted listing when they join</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#aaa" />
      </TouchableOpacity>

      <Btn label={t('signOut')} variant="outline" onPress={signOut} style={{ marginTop: 12, marginBottom: 8 }} />
    </ScrollView>
  );
}

const referralStyle = {
  flexDirection: 'row', alignItems: 'center',
  backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#f97316',
  padding: 14, marginTop: 16,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  profileRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 66, height: 66, borderRadius: 33, backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center',
  },
  name:  { fontSize: 18, fontWeight: '800', color: '#111' },
  email: { fontSize: 13, color: '#999', marginTop: 2 },
  proPill: { backgroundColor: '#111', borderRadius: 20, paddingVertical: 3,
    paddingHorizontal: 10 },
  upgradeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff7ed', borderWidth: 1.5, borderColor: '#fdba74',
    borderRadius: 10, padding: 12, marginTop: 14,
  },
  upgradeTitle: { fontWeight: '700', fontSize: 13, color: '#c2410c' },
  upgradeSub:   { fontSize: 11, color: '#999', marginTop: 2 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ebebeb', marginBottom: 14 },
  tab: { paddingVertical: 9, paddingHorizontal: 16 },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: ORANGE },
  tabText:       { fontSize: 13, fontWeight: '500', color: '#999' },
  tabTextActive: { fontSize: 13, fontWeight: '700', color: '#111' },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#ebebeb', padding: 12, alignItems: 'center',
  },
  statVal: { fontSize: 22, fontWeight: '800', color: '#111', marginTop: 2 },
  statLbl: { fontSize: 10, color: '#999', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
});
