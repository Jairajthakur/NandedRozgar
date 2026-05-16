import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const ORANGE = '#f97316';

export default function ProfileScreen() {
  const nav = useNavigation();
  const { user, signOut, jobs } = useAuth();

  const myJobs = jobs?.filter(j => j.posted_by === user?.id) || [];

  function confirmLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  const menuItems = [
    { icon: 'briefcase-outline', label: 'My Job Posts', badge: myJobs.length, onPress: () => nav.navigate('Jobs') },
    { icon: 'notifications-outline', label: 'Notifications', onPress: () => {} },
    { icon: 'share-social-outline', label: 'Refer & Earn', onPress: () => nav.navigate('Referral') },
    { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => {} },
    { icon: 'information-circle-outline', label: 'About NandedRozgar', onPress: () => {} },
  ];

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
          <Text style={styles.roleTxt}>{user?.role === 'admin' ? '⚡ Admin' : '👤 Member'}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{myJobs.length}</Text>
          <Text style={styles.statLbl}>Jobs Posted</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNum}>0</Text>
          <Text style={styles.statLbl}>Applied</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNum}>0</Text>
          <Text style={styles.statLbl}>Saved</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {menuItems.map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuItem} onPress={item.onPress} activeOpacity={0.8}>
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
        <Text style={styles.signOutTxt}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>NandedRozgar v1.0.1 · Nanded, Maharashtra</Text>
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
