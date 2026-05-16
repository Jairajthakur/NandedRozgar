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
import { PRICING } from '../utils/constants';
import GeometricBg from '../components/GeometricBg';

const ORANGE = '#f97316';
const INDIGO = '#6366f1';
const CYAN   = '#22d3ee';
const PURPLE = '#8b5cf6';

export default function ProfileScreen() {
  const nav = useNavigation();
  const { user, role, jobs, signOut } = useAuth();
  const { t } = useLang();
  const [tab, setTab] = React.useState('jobs');

  if (!user) return null;

  const myJobs      = jobs.filter(j => j.posted_by === user.id && j.status !== 'deleted');
  const appliedJobs = jobs.filter(j => (j.applicants || []).includes(user.id));
  const savedJobs   = jobs.filter(j => (j.saved || []).includes(user.id));
  const totalViews  = myJobs.reduce((a, j) => a + (j.views || 0), 0);
  const totalApps   = myJobs.reduce((a, j) => a + (j.applicant_count || 0), 0);

  const tabs = role === 'user' || role === 'admin'
    ? [['jobs', `My Jobs (${myJobs.length})`], ['stats', 'Analytics']]
    : role === 'user'
    ? [['jobs', `Applied (${appliedJobs.length})`], ['saved', `Saved (${savedJobs.length})`]]
    : [];

  function renderContent() {
    if (role === 'admin') return (
      <Card>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 12 }}>
          You are the platform administrator.
        </Text>
        <Btn label="Go to Admin Panel" onPress={() => nav.navigate('AdminPanel')} variant="orange" />
      </Card>
    );

    const listJobs = tab === 'saved' ? savedJobs : tab === 'jobs' && role === 'user' ? appliedJobs : myJobs;

    if (tab === 'stats') return (
      <View>
        <View style={s.statsGrid}>
          {[
            { icon: 'clipboard-outline', val: myJobs.length, label: 'Posted', color: ORANGE },
            { icon: 'eye-outline', val: totalViews, label: 'Views', color: INDIGO },
            { icon: 'people-outline', val: totalApps, label: 'Applied', color: CYAN },
          ].map(({ icon, val, label, color }) => (
            <View key={label} style={[s.statCard, { borderColor: color + '25' }]}>
              <View style={[s.statIconWrap, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon} size={20} color={color} />
              </View>
              <Text style={[s.statVal, { color }]}>{val}</Text>
              <Text style={s.statLbl}>{label}</Text>
            </View>
          ))}
        </View>
        {myJobs.length === 0
          ? <Empty icon="bar-chart-outline" title="No jobs posted yet" />
          : myJobs.map(j => <JobCard key={j.id} job={j} onPress={() => nav.navigate('JobDetail', { job: j })} />)
        }
      </View>
    );

    return listJobs.length === 0
      ? <Empty
          icon={tab === 'saved' ? 'bookmark-outline' : 'clipboard-outline'}
          title={tab === 'saved' ? 'No saved jobs' : role === 'user' || role === 'admin' ? 'No jobs posted yet' : 'No applications yet'}
          action={() => nav.navigate('Jobs')}
          actionLabel="Browse Jobs"
        />
      : <View>{listJobs.map(j =>
          <JobCard key={j.id} job={j} onPress={() => nav.navigate('JobDetail', { job: j })} />
        )}</View>;
  }

  const initial = user.name?.[0]?.toUpperCase() || '?';

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 14 }}>

      {/* ── Profile Hero ── */}
      <View style={s.profileHero}>
        <GeometricBg />
        <View style={s.heroShine} />

        {/* Background geo shapes */}
        <View style={[s.geoDiamond, { backgroundColor: ORANGE + '12', borderColor: ORANGE + '20' }]} />
        <View style={[s.geoCircle, { borderColor: INDIGO + '18' }]} />
        <View style={[s.geoTri, { borderBottomColor: PURPLE + '15' }]} />

        {/* Avatar */}
        <View style={s.avatarWrap}>
          <View style={[s.avatarRing, { borderColor: ORANGE + '50' }]} />
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
          {/* Geometric corner accents */}
          <View style={[s.avatarCorner1, { backgroundColor: ORANGE }]} />
          <View style={[s.avatarCorner2, { backgroundColor: INDIGO }]} />
        </View>

        <View style={{ flex: 1, marginLeft: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={s.name}>{user.name}</Text>
            {user.premium
              ? <View style={s.proPill}><Text style={s.proPillTxt}>PRO</Text></View>
              : <View style={s.starterPill}><Text style={s.starterTxt}>FREE</Text></View>
            }
          </View>
          <Text style={s.email}>{user.email}{user.phone ? ` · ${user.phone}` : ''}</Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {user.location && <Chip label={user.location} iconName="location-sharp" variant="orange" />}
            {user.company  && <Chip label={user.company} iconName="business" variant="blue" />}
          </View>
        </View>
      </View>

      {/* ── Upgrade / Free Banner ── */}
      {role === 'user' && !user.premium && (
        <View style={[s.banner, { borderColor: ORANGE + '40', backgroundColor: ORANGE + '08' }]}>
          <View style={s.bannerShine} />
          <View style={{ flex: 1 }}>
            <Text style={[s.bannerTitle, { color: ORANGE }]}>Upgrade to PRO — ₹{PRICING.pro_monthly}/mo</Text>
            <Text style={s.bannerSub}>Unlimited posts · Priority placement · Analytics</Text>
          </View>
          <Btn label="Upgrade" variant="orange" size="sm" onPress={() => {}} />
        </View>
      )}
      {role === 'user' && (
        <View style={[s.banner, { borderColor: '#4ade8040', backgroundColor: 'rgba(74,222,128,0.06)' }]}>
          <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#4ade80', flex: 1 }}>
            Job Seeker Account — Always FREE!
          </Text>
        </View>
      )}

      {/* ── Tabs ── */}
      {tabs.length > 0 && (
        <View style={s.tabs}>
          {tabs.map(([tk, label]) => (
            <TouchableOpacity key={tk} onPress={() => setTab(tk)}
              style={[s.tab, tab === tk && s.tabActive]}
            >
              {tab === tk && <View style={[s.tabGlow, { backgroundColor: ORANGE + '20' }]} />}
              <Text style={[s.tabText, tab === tk && s.tabTextActive]}>{label}</Text>
              {tab === tk && <View style={[s.tabBar, { backgroundColor: ORANGE }]} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {renderContent()}

      {/* ── Referral Card ── */}
      <TouchableOpacity style={s.referral} onPress={() => nav.navigate('Referral')} activeOpacity={0.85}>
        <View style={s.referralShine} />
        <View style={[s.referralIcon, { backgroundColor: ORANGE + '18' }]}>
          <Ionicons name="gift-outline" size={18} color={ORANGE} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.referralTitle}>Invite a Friend & Earn</Text>
          <Text style={s.referralSub}>Get a FREE Boosted listing when they join</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
      </TouchableOpacity>

      <Btn label={t('signOut')} variant="outline" onPress={signOut} style={{ marginTop: 14, marginBottom: 8 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080812' },

  profileHero: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
    padding: 18, marginBottom: 14, overflow: 'hidden',
  },
  heroShine: { position: 'absolute', top: 0, left: 32, right: 32, height: 1, backgroundColor: 'rgba(255,255,255,0.14)' },
  geoDiamond: { position: 'absolute', bottom: -12, right: 16, width: 44, height: 44, transform: [{ rotate: '45deg' }], borderWidth: 1 },
  geoCircle: { position: 'absolute', top: -16, right: 52, width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, backgroundColor: 'transparent' },
  geoTri: { position: 'absolute', top: 10, right: 20, width: 0, height: 0, borderLeftWidth: 14, borderRightWidth: 14, borderBottomWidth: 24, borderLeftColor: 'transparent', borderRightColor: 'transparent' },

  avatarWrap: { position: 'relative', width: 66, height: 66 },
  avatarRing: { position: 'absolute', inset: -4, width: 74, height: 74, borderRadius: 37, borderWidth: 2, backgroundColor: 'transparent' },
  avatar: { width: 66, height: 66, borderRadius: 18, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', shadowColor: ORANGE, shadowOpacity: 0.45, shadowRadius: 12, elevation: 8 },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '900' },
  avatarCorner1: { position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: 2, transform: [{ rotate: '45deg' }] },
  avatarCorner2: { position: 'absolute', top: -2, left: -2, width: 8, height: 8, borderRadius: 2, transform: [{ rotate: '45deg' }] },

  name:  { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 0.2 },
  email: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 3 },
  proPill: { backgroundColor: ORANGE, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 },
  proPillTxt: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  starterPill: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  starterTxt: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 12, overflow: 'hidden' },
  bannerShine: { position: 'absolute', top: 0, left: 20, right: 20, height: 1, backgroundColor: ORANGE + '40' },
  bannerTitle: { fontWeight: '700', fontSize: 13 },
  bannerSub: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', marginBottom: 16 },
  tab: { paddingVertical: 10, paddingHorizontal: 18, position: 'relative', overflow: 'hidden' },
  tabActive: {},
  tabGlow: { position: 'absolute', inset: 0, borderRadius: 6 },
  tabBar: { position: 'absolute', bottom: 0, left: 8, right: 8, height: 2.5, borderRadius: 2 },
  tabText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.3)' },
  tabTextActive: { fontWeight: '800', color: '#fff' },

  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center', gap: 4 },
  statIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statVal: { fontSize: 22, fontWeight: '900' },
  statLbl: { fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  referral: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(249,115,22,0.07)', borderRadius: 14, borderWidth: 1.5, borderColor: ORANGE + '30', padding: 16, marginTop: 18, overflow: 'hidden' },
  referralShine: { position: 'absolute', top: 0, left: 20, right: 20, height: 1, backgroundColor: ORANGE + '30' },
  referralIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  referralTitle: { fontSize: 13, fontWeight: '700', color: '#fff' },
  referralSub: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
});
