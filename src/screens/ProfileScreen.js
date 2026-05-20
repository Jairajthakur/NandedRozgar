import { useLang } from '../utils/i18n';
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { http } from '../utils/api';

const ORANGE = '#f97316';

export default function ProfileScreen() {
  const nav = useNavigation();
  const { t } = useLang();
  const { user, signOut, jobs } = useAuth();
  const [stats, setStats]   = useState({ applied: 0, saved: 0 });
  const [loading, setLoading] = useState(true);

  const myJobs = jobs?.filter(j => j.posted_by === user?.id) || [];
  const isSeeker = !user?.company || user.company.trim() === '';

  useEffect(() => {
    http('GET', '/api/analytics/seeker').then(r => {
      if (r?.ok) {
        setStats({
          applied: parseInt(r.applications?.total) || 0,
          saved:   r.savedCount || 0,
        });
      }
      setLoading(false);
    });
  }, []);

  function confirmLogout() {
    Alert.alert(t('signOut'), 'Are you sure you want to sign out?', [
      { text: 'Cancel' },
      { text: t('signOut'), style: 'destructive', onPress: signOut },
    ]);
  }

  const seekerMenu = [
    { icon: 'person-outline',          label: t('mySeekerProfile'),   onPress: () => nav.navigate('SeekerProfile') },
    { icon: 'checkmark-circle-outline',label: t('myApplications'),    badge: stats.applied,  onPress: () => nav.navigate('MyApplications') },
    { icon: 'bookmark-outline',        label: t('savedJobs'),         badge: stats.saved,    onPress: () => nav.navigate('Jobs') },
    { icon: 'notifications-outline',   label: t('jobAlerts'),         onPress: () => nav.navigate('Alerts') },
    { icon: 'chatbubbles-outline',     label: t('myMessages'),        onPress: () => nav.navigate('ChatList') },
  ];

  const employerMenu = [
    { icon: 'briefcase-outline',       label: t('myJobPosts'),        badge: myJobs.length,  onPress: () => nav.navigate('Jobs') },
    { icon: 'bar-chart-outline',       label: t('analyticsDashboard'),onPress: () => nav.navigate('Analytics') },
    { icon: 'chatbubbles-outline',     label: t('myMessages'),        onPress: () => nav.navigate('ChatList') },
    { icon: 'star-outline',            label: t('myReviews'),         onPress: () => nav.navigate('ChatList') },
  ];

  const commonMenu = [
    { icon: 'share-social-outline',    label: t('referralTitle'),     onPress: () => nav.navigate('Referral') },
    { icon: 'help-circle-outline',     label: t('helpSupport'),       onPress: () => {} },
    { icon: 'information-circle-outline', label: t('admin'),          onPress: () => {} },
  ];

  const menuItems = [...(isSeeker ? seekerMenu : employerMenu), ...commonMenu];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>{user?.name?.[0]?.toUpperCase() || 'N'}</Text>
        </View>
        <Text style={styles.name}>{user?.name || 'User'}</Text>
        <Text style={styles.email}>{user?.email || ''}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleTxt}>
            {user?.role === 'admin' ? '⚡ Admin' : isSeeker ? '👤 Job Seeker' : '🏢 Employer'}
          </Text>
        </View>
      </View>

      {/* Stats */}
      {loading ? (
        <ActivityIndicator color={ORANGE} style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statBox} onPress={() => nav.navigate('Jobs')}>
            <Text style={styles.statNum}>{myJobs.length}</Text>
            <Text style={styles.statLbl}>{isSeeker ? t('posts') : t('jobsPosted')}</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statBox} onPress={() => isSeeker && nav.navigate('MyApplications')}>
            <Text style={styles.statNum}>{stats.applied}</Text>
            <Text style={styles.statLbl}>{t('jobsApplied')}</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statBox}>
            <Text style={styles.statNum}>{stats.saved}</Text>
            <Text style={styles.statLbl}>{t('jobsSaved')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Menu */}
      <View style={styles.menu}>
        {menuItems.map((item, i) => (
          <TouchableOpacity key={i} style={[styles.menuItem, i === menuItems.length - 1 && { borderBottomWidth: 0 }]} onPress={item.onPress} activeOpacity={0.8}>
            <View style={styles.menuIcon}>
              <Ionicons name={item.icon} size={20} color={ORANGE} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <View style={{ flex: 1 }} />
            {item.badge > 0 && (
              <View style={styles.badge}><Text style={styles.badgeTxt}>{item.badge}</Text></View>
            )}
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={confirmLogout}>
        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        <Text style={styles.signOutTxt}>{t('signOut')}</Text>
      </TouchableOpacity>

      <Text style={styles.version}>LocalLoop v1.2.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  profileCard: { alignItems: 'center', backgroundColor: '#111', paddingVertical: 32, paddingBottom: 28 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarTxt: { fontSize: 28, fontWeight: '800', color: '#fff' },
  name: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  email: { fontSize: 13, color: '#aaa', marginBottom: 10 },
  roleBadge: { backgroundColor: 'rgba(249,115,22,0.15)', paddingVertical: 4, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)' },
  roleTxt: { color: ORANGE, fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#ebebeb' },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: '#111' },
  statLbl: { fontSize: 11, color: '#888', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#ebebeb' },
  menu: { margin: 16, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#ebebeb', overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  menuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuLabel: { fontSize: 14, fontWeight: '600', color: '#111' },
  badge: { backgroundColor: ORANGE, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 16, padding: 14, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#fca5a5' },
  signOutTxt: { fontSize: 14, fontWeight: '700', color: '#ef4444' },
  version: { textAlign: 'center', fontSize: 11, color: '#bbb', marginTop: 4 },
});
