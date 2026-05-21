/**
 * LokalLoop — ProfileScreen.js
 * Web-ready: responsive layout, no Alert (web-safe modal), platform-safe styles
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { http } from '../utils/api';

const ORANGE  = '#f97316';
const BG      = '#f5f5f5';
const DARK    = '#111';
const CARD    = '#fff';
const BORDER  = '#ebebeb';

export default function ProfileScreen() {
  const nav = useNavigation();
  const { user, signOut, jobs } = useAuth();
  const [stats,   setStats]   = useState({ applied: 0, saved: 0 });
  const [loading, setLoading] = useState(true);
  const [logoutModal, setLogoutModal] = useState(false);

  const myJobs  = jobs?.filter(j => String(j.posted_by) === String(user?.id)) || [];
  const isSeeker   = !user?.company || user.company.trim() === '';
  const isAdmin    = user?.role === 'admin';

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

  // ── Web-safe confirm logout (no Alert on web) ────────────────────────────
  function confirmLogout() {
    if (Platform.OS === 'web') {
      setLogoutModal(true);
    } else {
      const { Alert } = require('react-native');
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]);
    }
  }

  // ── Menu items ────────────────────────────────────────────────────────────
  const seekerMenu = [
    { icon: 'person-outline',           label: 'My Seeker Profile',  onPress: () => nav.navigate('SeekerProfile') },
    { icon: 'checkmark-circle-outline', label: 'My Applications',    badge: stats.applied, onPress: () => nav.navigate('MyApplications') },
    { icon: 'bookmark-outline',         label: 'Saved Jobs',         badge: stats.saved,   onPress: () => nav.navigate('Jobs') },
    { icon: 'notifications-outline',    label: 'Job Alerts',         onPress: () => nav.navigate('Alerts') },
    { icon: 'chatbubbles-outline',      label: 'My Messages',        onPress: () => nav.navigate('ChatList') },
  ];

  const employerMenu = [
    { icon: 'briefcase-outline',        label: 'My Job Posts',       badge: myJobs.length, onPress: () => nav.navigate('Jobs') },
    { icon: 'bar-chart-outline',        label: 'Analytics Dashboard',onPress: () => nav.navigate('Analytics') },
    { icon: 'chatbubbles-outline',      label: 'My Messages',        onPress: () => nav.navigate('ChatList') },
    { icon: 'star-outline',             label: 'My Reviews',         onPress: () => nav.navigate('ChatList') },
  ];

  const adminMenu = [
    { icon: 'shield-checkmark-outline', label: 'Admin Dashboard',    onPress: () => nav.navigate('Admin') },
    { icon: 'people-outline',           label: 'Manage Users',       onPress: () => nav.navigate('Admin') },
    { icon: 'bar-chart-outline',        label: 'Analytics',          onPress: () => nav.navigate('Analytics') },
    { icon: 'chatbubbles-outline',      label: 'My Messages',        onPress: () => nav.navigate('ChatList') },
  ];

  const commonMenu = [
    { icon: 'share-social-outline',     label: 'Refer & Earn',       onPress: () => nav.navigate('Referral') },
    { icon: 'help-circle-outline',      label: 'Help & Support',     onPress: () => {} },
    { icon: 'information-circle-outline', label: 'About LokalLoop', onPress: () => {} },
  ];

  const roleMenu = isAdmin ? adminMenu : isSeeker ? seekerMenu : employerMenu;
  const menuItems = [...roleMenu, ...commonMenu];

  const roleLabel = isAdmin ? '⚡ Admin' : isSeeker ? '👤 Job Seeker' : '🏢 Employer';
  const initials  = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>

          {/* ── Profile Card ── */}
          <View style={styles.profileCard}>
            {/* Background decoration */}
            <View style={styles.cardBg} />

            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarTxt}>{initials}</Text>
              </View>
              <View style={styles.onlineDot} />
            </View>

            <Text style={styles.name}>{user?.name || 'User'}</Text>
            <Text style={styles.email}>{user?.email || ''}</Text>
            {user?.phone ? <Text style={styles.phone}>📱 +91 {user.phone}</Text> : null}

            <View style={styles.roleBadge}>
              <Text style={styles.roleTxt}>{roleLabel}</Text>
            </View>

            {/* Member since */}
            <Text style={styles.memberSince}>
              Member since {user?.created_at
                ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
                : 'recently'}
            </Text>
          </View>

          {/* ── Stats Row ── */}
          {loading ? (
            <View style={styles.statsLoading}>
              <ActivityIndicator color={ORANGE} />
            </View>
          ) : (
            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.statBox} onPress={() => nav.navigate('Jobs')} activeOpacity={0.8}>
                <Text style={styles.statNum}>{myJobs.length}</Text>
                <Text style={styles.statLbl}>{isSeeker ? 'Posts' : 'Jobs Posted'}</Text>
              </TouchableOpacity>
              <View style={styles.statDivider} />
              <TouchableOpacity style={styles.statBox} onPress={() => isSeeker && nav.navigate('MyApplications')} activeOpacity={0.8}>
                <Text style={styles.statNum}>{stats.applied}</Text>
                <Text style={styles.statLbl}>Applied</Text>
              </TouchableOpacity>
              <View style={styles.statDivider} />
              <TouchableOpacity style={styles.statBox} activeOpacity={0.8}>
                <Text style={styles.statNum}>{stats.saved}</Text>
                <Text style={styles.statLbl}>Saved</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Menu ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Account</Text>
            <View style={styles.menuCard}>
              {menuItems.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.menuItem,
                    i === menuItems.length - 1 && styles.menuItemLast,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.75}
                >
                  <View style={styles.menuIcon}>
                    <Ionicons name={item.icon} size={19} color={ORANGE} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <View style={{ flex: 1 }} />
                  {item.badge > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeTxt}>{item.badge}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={15} color="#ccc" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Sign Out ── */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.signOutBtn} onPress={confirmLogout} activeOpacity={0.85}>
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={styles.signOutTxt}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.version}>LokalLoop v1.2.0 · Nanded, Maharashtra</Text>
        </View>
      </ScrollView>

      {/* ── Web-safe Logout Modal ── */}
      <Modal
        visible={logoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="log-out-outline" size={28} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalSub}>Are you sure you want to sign out of your account?</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setLogoutModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalLogoutBtn}
                onPress={() => { setLogoutModal(false); signOut(); }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalLogoutTxt}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: BG },
  scroll:       { flex: 1 },
  scrollContent:{ flexGrow: 1, alignItems: 'center', paddingBottom: 40 },
  inner:        { width: '100%', maxWidth: 640, paddingHorizontal: 0 },

  // ── Profile card
  profileCard:  {
    alignItems: 'center',
    backgroundColor: DARK,
    paddingTop: 40,
    paddingBottom: 28,
    paddingHorizontal: 24,
    marginBottom: 0,
    overflow: 'hidden',
  },
  cardBg: {
    position: 'absolute', top: -40, left: -40, right: -40,
    height: 160,
    backgroundColor: 'rgba(249,115,22,0.07)',
    borderRadius: 100,
    transform: [{ scaleX: 2 }],
  },
  avatarWrap:   { position: 'relative', marginBottom: 14 },
  avatar:       {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.12)',
  },
  avatarTxt:    { fontSize: 28, fontWeight: '900', color: '#fff' },
  onlineDot:    {
    position: 'absolute', bottom: 3, right: 3,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2, borderColor: DARK,
  },
  name:         { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 3 },
  email:        { fontSize: 13, color: '#999', marginBottom: 4 },
  phone:        { fontSize: 12, color: '#777', marginBottom: 8 },
  roleBadge:    {
    backgroundColor: 'rgba(249,115,22,0.15)',
    paddingVertical: 4, paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)',
    marginBottom: 10,
  },
  roleTxt:      { color: ORANGE, fontSize: 12, fontWeight: '700' },
  memberSince:  { fontSize: 11, color: '#555' },

  // ── Stats
  statsLoading: { padding: 20, alignItems: 'center' },
  statsRow:     {
    flexDirection: 'row',
    backgroundColor: CARD,
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1, borderColor: BORDER,
    ...Platform.select({
      web: { boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
      default: { elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
    }),
  },
  statBox:      { flex: 1, alignItems: 'center' },
  statNum:      { fontSize: 22, fontWeight: '900', color: DARK },
  statLbl:      { fontSize: 11, color: '#888', marginTop: 3, fontWeight: '500' },
  statDivider:  { width: 1, backgroundColor: BORDER },

  // ── Section
  section:      { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#999', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },

  // ── Menu
  menuCard:     {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
      default: { elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
    }),
  },
  menuItem:     {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIcon:     {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#fff7ed',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 13,
  },
  menuLabel:    { fontSize: 14, fontWeight: '600', color: DARK },
  badge:        {
    backgroundColor: ORANGE,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
    marginRight: 8,
  },
  badgeTxt:     { color: '#fff', fontSize: 11, fontWeight: '700' },

  // ── Sign out
  signOutBtn:   {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 14,
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1.5, borderColor: '#fca5a5',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(239,68,68,0.08)' },
      default: {},
    }),
  },
  signOutTxt:   { fontSize: 14, fontWeight: '700', color: '#ef4444' },

  version:      { textAlign: 'center', fontSize: 11, color: '#bbb', marginTop: 20 },

  // ── Logout modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
    padding: 24,
  },
  modalCard:    {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 28,
    width: '100%', maxWidth: 360,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
      default: { elevation: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20 },
    }),
  },
  modalIcon:    {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#fef2f2',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle:   { fontSize: 20, fontWeight: '900', color: DARK, marginBottom: 8 },
  modalSub:     { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 19, marginBottom: 24 },
  modalBtns:    { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: {
    flex: 1, padding: 13,
    borderRadius: 12,
    borderWidth: 1.5, borderColor: BORDER,
    alignItems: 'center',
  },
  modalCancelTxt: { fontSize: 14, fontWeight: '700', color: '#555' },
  modalLogoutBtn: {
    flex: 1, padding: 13,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  modalLogoutTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
