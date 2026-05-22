/**
 * CityPlus — ProfileScreen.js
 * Redesigned: Dark luxury aesthetic, animated hero, floating orbs,
 * staggered entrance, glowing avatar ring, animated stat counters, rich micro-interactions
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, Platform, Animated, Easing, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { http } from '../utils/api';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Design tokens ─────────────────────────────────────────────────────────────
const ORANGE   = '#f97316';
const ORANGE2  = '#fb923c';
const AMBER    = '#f59e0b';
const BG       = '#f4f4f6';
const SURFACE  = '#ffffff';
const CARD     = '#ffffff';
const BORDER   = 'rgba(0,0,0,0.07)';
const TEXT     = '#111118';
const MUTED    = '#8e8ea0';
const GREEN    = '#16a34a';

// ── Animated stat counter ─────────────────────────────────────────────────────
function AnimatedNumber({ value, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: value,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    const id = anim.addListener(({ value: v }) => setDisplay(Math.floor(v)));
    return () => anim.removeListener(id);
  }, [value]);

  return <Text style={style}>{display}</Text>;
}

// ── Floating orb ─────────────────────────────────────────────────────────────
function FloatingOrb({ size, color, x, y, delay, duration }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true, delay }),
        Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const opacity    = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.18, 0.38, 0.18] });

  return (
    <Animated.View
      style={{
        position: 'absolute', left: x, top: y,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color,
        transform: [{ translateY }],
        opacity,
      }}
    />
  );
}

// ── Menu row with press animation ─────────────────────────────────────────────
function MenuRow({ item, isLast, index }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 320,
        delay: 600 + index * 55,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0, duration: 320,
        delay: 600 + index * 55,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onPressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 20 }).start();

  // Icon bg colors per category
  const iconColors = {
    'person-outline':           { bg: 'rgba(249,115,22,0.12)', icon: ORANGE },
    'checkmark-circle-outline': { bg: 'rgba(34,197,94,0.12)',  icon: GREEN  },
    'bookmark-outline':         { bg: 'rgba(251,191,36,0.12)', icon: AMBER  },
    'notifications-outline':    { bg: 'rgba(99,102,241,0.12)', icon: '#818cf8' },
    'chatbubbles-outline':      { bg: 'rgba(14,165,233,0.12)', icon: '#38bdf8' },
    'briefcase-outline':        { bg: 'rgba(249,115,22,0.12)', icon: ORANGE },
    'bar-chart-outline':        { bg: 'rgba(34,197,94,0.12)',  icon: GREEN  },
    'star-outline':             { bg: 'rgba(251,191,36,0.12)', icon: AMBER  },
    'shield-checkmark-outline': { bg: 'rgba(249,115,22,0.12)', icon: ORANGE },
    'people-outline':           { bg: 'rgba(99,102,241,0.12)', icon: '#818cf8' },
    'share-social-outline':     { bg: 'rgba(251,191,36,0.12)', icon: AMBER  },
    'help-circle-outline':      { bg: 'rgba(107,114,128,0.15)', icon: '#9ca3af' },
    'information-circle-outline':{ bg: 'rgba(107,114,128,0.15)', icon: '#9ca3af' },
  };
  const { bg: iconBg, icon: iconColor } = iconColors[item.icon] || { bg: 'rgba(249,115,22,0.12)', icon: ORANGE };

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      <TouchableOpacity
        style={[styles.menuItem, !isLast && styles.menuItemBorder]}
        onPress={item.onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={item.icon} size={18} color={iconColor} />
        </View>
        <Text style={styles.menuLabel}>{item.label}</Text>
        <View style={{ flex: 1 }} />
        {item.badge > 0 && (
          <View style={[styles.badge, { backgroundColor: iconColor }]}>
            <Text style={styles.badgeTxt}>{item.badge}</Text>
          </View>
        )}
        <View style={styles.menuArrow}>
          <Ionicons name="chevron-forward" size={13} color={MUTED} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const nav = useNavigation();
  const { user, signOut, jobs } = useAuth();
  const [stats,      setStats]      = useState({ applied: 0, saved: 0 });
  const [loading,    setLoading]    = useState(true);
  const [logoutModal, setLogoutModal] = useState(false);

  const myJobs   = jobs?.filter(j => String(j.posted_by) === String(user?.id)) || [];
  const isSeeker = !user?.company || user.company.trim() === '';
  const isAdmin  = user?.role === 'admin';

  // ── Entrance animations ───────────────────────────────────────────────────
  const heroScale    = useRef(new Animated.Value(0.92)).current;
  const heroOpacity  = useRef(new Animated.Value(0)).current;
  const avatarScale  = useRef(new Animated.Value(0.5)).current;
  const avatarOpacity= useRef(new Animated.Value(0)).current;
  const ringScale    = useRef(new Animated.Value(0.6)).current;
  const ringOpacity  = useRef(new Animated.Value(0)).current;
  const statsY       = useRef(new Animated.Value(24)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const ringRotate   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Hero fade in
    Animated.parallel([
      Animated.timing(heroOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(heroScale,   { toValue: 1, damping: 18, stiffness: 120, useNativeDriver: true }),
    ]).start();

    // Avatar pop in
    Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.spring(avatarScale,   { toValue: 1, damping: 12, stiffness: 180, useNativeDriver: true }),
        Animated.timing(avatarOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]),
    ]).start();

    // Glowing ring
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.spring(ringScale,   { toValue: 1, damping: 10, stiffness: 100, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    // Stats slide up
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(statsOpacity, { toValue: 1, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(statsY,       { toValue: 0, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start();

    // Pulse ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Slow ring rotation
    Animated.loop(
      Animated.timing(ringRotate, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  useEffect(() => {
    http('GET', '/api/analytics/seeker').then(r => {
      if (r?.ok) setStats({ applied: parseInt(r.applications?.total) || 0, saved: r.savedCount || 0 });
      setLoading(false);
    });
  }, []);

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

  const seekerMenu = [
    { icon: 'person-outline',           label: 'Upload Resume',   onPress: () => nav.navigate('SeekerProfile') },
    { icon: 'checkmark-circle-outline', label: 'My Applications',     badge: stats.applied, onPress: () => nav.navigate('MyApplications') },
    { icon: 'bookmark-outline',         label: 'Saved Jobs',          badge: stats.saved,   onPress: () => nav.navigate('Jobs') },
    { icon: 'notifications-outline',    label: 'Job Alerts',          onPress: () => nav.navigate('Alerts') },
    { icon: 'chatbubbles-outline',      label: 'My Messages',         onPress: () => nav.navigate('ChatList') },
  ];
  const employerMenu = [
    { icon: 'briefcase-outline',        label: 'My Job Posts',        badge: myJobs.length, onPress: () => nav.navigate('Jobs') },
    { icon: 'bar-chart-outline',        label: 'Analytics Dashboard', onPress: () => nav.navigate('Analytics') },
    { icon: 'chatbubbles-outline',      label: 'My Messages',         onPress: () => nav.navigate('ChatList') },
    { icon: 'star-outline',             label: 'My Reviews',          onPress: () => nav.navigate('ChatList') },
  ];
  const adminMenu = [
    { icon: 'shield-checkmark-outline', label: 'Admin Dashboard',     onPress: () => nav.navigate('Admin') },
    { icon: 'people-outline',           label: 'Manage Users',        onPress: () => nav.navigate('Admin') },
    { icon: 'bar-chart-outline',        label: 'Analytics',           onPress: () => nav.navigate('Analytics') },
    { icon: 'chatbubbles-outline',      label: 'My Messages',         onPress: () => nav.navigate('ChatList') },
  ];
  const commonMenu = [
    { icon: 'share-social-outline',       label: 'Refer & Earn',      onPress: () => nav.navigate('Referral') },
    { icon: 'help-circle-outline',        label: 'Help & Support',    onPress: () => nav.navigate('HelpSupport') },
    { icon: 'information-circle-outline', label: 'About CityPlus',    onPress: () => nav.navigate('About') },
  ];

  const roleMenu  = isAdmin ? adminMenu : isSeeker ? seekerMenu : employerMenu;
  const menuItems = [...roleMenu, ...commonMenu];

  const roleLabel = isAdmin ? 'Admin' : isSeeker ? 'Job Seeker' : 'Employer';
  const roleIcon  = isAdmin ? 'shield-checkmark' : isSeeker ? 'person' : 'business';
  const roleColor = isAdmin ? '#f59e0b' : isSeeker ? ORANGE : '#38bdf8';
  const initials  = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const ringRotateDeg = ringRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero Section ───────────────────────────────────────── */}
        <Animated.View style={[styles.hero, { opacity: heroOpacity, transform: [{ scale: heroScale }] }]}>

          {/* Floating orbs */}
          <FloatingOrb size={120} color={'#ea580c'}  x={-30}          y={-20}  delay={0}    duration={3200} />
          <FloatingOrb size={80}  color={'#d97706'}  x={SCREEN_W-60}  y={10}   delay={800}  duration={2800} />
          <FloatingOrb size={60}  color={'#4f46e5'}  x={SCREEN_W*0.5} y={60}   delay={400}  duration={3600} />
          <FloatingOrb size={40}  color={'#c2410c'}  x={SCREEN_W*0.2} y={120}  delay={1200} duration={2400} />

          {/* Mesh gradient overlay */}
          <View style={styles.heroGradient} />
          <View style={styles.heroGradient2} />

          {/* Decorative grid lines */}
          <View style={styles.gridLine1} />
          <View style={styles.gridLine2} />

          {/* Avatar with glow ring */}
          <View style={styles.avatarSection}>
            {/* Outer pulse ring */}
            <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />

            {/* Rotating dashed ring */}
            <Animated.View style={[styles.rotatingRing, { opacity: ringOpacity, transform: [{ scale: ringScale }, { rotate: ringRotateDeg }] }]}>
              {[...Array(12)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.ringDot,
                    {
                      transform: [
                        { rotate: `${i * 30}deg` },
                        { translateY: -54 },
                      ],
                      opacity: i % 2 === 0 ? 1 : 0.4,
                    },
                  ]}
                />
              ))}
            </Animated.View>

            {/* Avatar */}
            <Animated.View style={[styles.avatarWrap, { opacity: avatarOpacity, transform: [{ scale: avatarScale }] }]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarTxt}>{initials}</Text>
              </View>
              {/* Online dot */}
              <View style={styles.onlineDot}>
                <View style={styles.onlineDotInner} />
              </View>
            </Animated.View>
          </View>

          {/* Name & info */}
          <Text style={styles.name}>{user?.name || 'User'}</Text>
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
          {user?.phone ? <Text style={styles.phone}>+91 {user.phone}</Text> : null}

          {/* Member since */}
          <Text style={styles.memberSince}>
            Member since {user?.created_at
              ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
              : 'recently'}
          </Text>
        </Animated.View>

        {/* ── Stats ──────────────────────────────────────────────── */}
        <Animated.View style={[styles.statsCard, { opacity: statsOpacity, transform: [{ translateY: statsY }] }]}>
          {loading ? (
            <ActivityIndicator color={ORANGE} size="small" style={{ padding: 20 }} />
          ) : (
            <>
              <TouchableOpacity style={styles.statItem} onPress={() => nav.navigate('Jobs')} activeOpacity={0.7}>
                <View style={[styles.statIconWrap, { backgroundColor: 'rgba(249,115,22,0.12)' }]}>
                  <Ionicons name="briefcase" size={16} color={ORANGE} />
                </View>
                <AnimatedNumber value={myJobs.length} style={styles.statNum} />
                <Text style={styles.statLbl}>{isSeeker ? 'Posts' : 'Posted'}</Text>
              </TouchableOpacity>

              <View style={styles.statSep} />

              <TouchableOpacity style={styles.statItem} onPress={() => isSeeker && nav.navigate('MyApplications')} activeOpacity={0.7}>
                <View style={[styles.statIconWrap, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
                  <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                </View>
                <AnimatedNumber value={stats.applied} style={styles.statNum} />
                <Text style={styles.statLbl}>Applied</Text>
              </TouchableOpacity>

              <View style={styles.statSep} />

              <TouchableOpacity style={styles.statItem} activeOpacity={0.7}>
                <View style={[styles.statIconWrap, { backgroundColor: 'rgba(251,191,36,0.12)' }]}>
                  <Ionicons name="bookmark" size={16} color={AMBER} />
                </View>
                <AnimatedNumber value={stats.saved} style={styles.statNum} />
                <Text style={styles.statLbl}>Saved</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

        {/* ── Menu sections ──────────────────────────────────────── */}
        <View style={styles.inner}>

          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>My Account</Text>
            </View>
            <View style={styles.menuCard}>
              {menuItems.map((item, i) => (
                <MenuRow
                  key={i}
                  item={item}
                  isLast={i === menuItems.length - 1}
                  index={i}
                />
              ))}
            </View>
          </View>

          {/* ── Sign Out ── */}
          <View style={[styles.sectionWrap, { marginTop: 8 }]}>
            <SignOutButton onPress={confirmLogout} />
          </View>

          <Text style={styles.version}>CityPlus v1.2.0</Text>
        </View>

      </ScrollView>

      {/* ── Logout Modal ─────────────────────────────────────────── */}
      <Modal
        visible={logoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <LogoutModalCard
            onCancel={() => setLogoutModal(false)}
            onConfirm={() => { setLogoutModal(false); signOut(); }}
          />
        </View>
      </Modal>
    </View>
  );
}

// ── Sign out button ───────────────────────────────────────────────────────────
function SignOutButton({ onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow  = useRef(new Animated.Value(0)).current;

  const onIn  = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }),
      Animated.timing(glow,  { toValue: 1, duration: 200, useNativeDriver: false }),
    ]).start();
  };
  const onOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }),
      Animated.timing(glow,  { toValue: 0, duration: 300, useNativeDriver: false }),
    ]).start();
  };

  const borderColor = glow.interpolate({ inputRange: [0, 1], outputRange: ['rgba(239,68,68,0.25)', 'rgba(239,68,68,0.65)'] });
  const bgColor     = glow.interpolate({ inputRange: [0, 1], outputRange: ['rgba(239,68,68,0.03)', 'rgba(239,68,68,0.08)'] });

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity onPress={onPress} onPressIn={onIn} onPressOut={onOut} activeOpacity={1}>
        <Animated.View style={[styles.signOutBtn, { borderColor, backgroundColor: bgColor }]}>
          <View style={styles.signOutIconWrap}>
            <Ionicons name="log-out-outline" size={17} color="#ef4444" />
          </View>
          <Text style={styles.signOutTxt}>Sign Out</Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(239,68,68,0.5)" style={{ marginLeft: 'auto' }} />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Logout modal card ─────────────────────────────────────────────────────────
function LogoutModalCard({ onCancel, onConfirm }) {
  const scale   = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, damping: 16, stiffness: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.modalCard, { opacity, transform: [{ scale }] }]}>
      {/* Icon */}
      <View style={styles.modalIconRing}>
        <View style={styles.modalIconInner}>
          <Ionicons name="log-out-outline" size={26} color="#ef4444" />
        </View>
      </View>
      <Text style={styles.modalTitle}>Sign Out?</Text>
      <Text style={styles.modalSub}>You'll need to sign back in to access your account.</Text>
      <View style={styles.modalBtns}>
        <TouchableOpacity style={styles.modalCancelBtn} onPress={onCancel} activeOpacity={0.8}>
          <Text style={styles.modalCancelTxt}>Stay</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.modalLogoutBtn} onPress={onConfirm} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={15} color="#fff" />
          <Text style={styles.modalLogoutTxt}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: BG },
  scroll:       { flex: 1 },
  scrollContent:{ flexGrow: 1, alignItems: 'stretch', paddingBottom: 48 },

  // ── Hero
  hero: {
    alignItems: 'center',
    paddingTop: 44, paddingBottom: 36,
    backgroundColor: SURFACE,
    overflow: 'hidden',
    width: '100%',
    position: 'relative',
    ...Platform.select({
      web: { boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
      default: { elevation: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16 },
    }),
  },

  heroGradient: {
    position: 'absolute', top: -80, left: -80,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(249,115,22,0.10)',
  },
  heroGradient2: {
    position: 'absolute', bottom: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(99,102,241,0.07)',
  },
  gridLine1: {
    position: 'absolute', top: 0, bottom: 0,
    left: '25%', width: 1,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  gridLine2: {
    position: 'absolute', top: 0, bottom: 0,
    left: '75%', width: 1,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },

  // ── Avatar
  avatarSection: {
    width: 120, height: 120,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
  },
  pulseRing: {
    position: 'absolute',
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 1.5,
    borderColor: 'rgba(249,115,22,0.25)',
  },
  rotatingRing: {
    position: 'absolute',
    width: 120, height: 120,
    alignItems: 'center', justifyContent: 'center',
  },
  ringDot: {
    position: 'absolute',
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: ORANGE,
  },
  avatarWrap: {
    position: 'relative',
    width: 88, height: 88,
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(249,115,22,0.4)',
    ...Platform.select({
      web: { boxShadow: '0 0 24px rgba(249,115,22,0.28), 0 4px 16px rgba(249,115,22,0.18)' },
      default: { elevation: 10, shadowColor: ORANGE, shadowOpacity: 0.35, shadowRadius: 14 },
    }),
  },
  avatarTxt: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: SURFACE,
    alignItems: 'center', justifyContent: 'center',
  },
  onlineDotInner: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: GREEN,
  },

  name:        { fontSize: 24, fontWeight: '900', color: TEXT, letterSpacing: 0.3, marginBottom: 4 },
  email:       { fontSize: 13, color: MUTED, marginBottom: 2, letterSpacing: 0.1 },
  phone:       { fontSize: 12, color: MUTED, marginBottom: 10 },

  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 5, paddingHorizontal: 14,
    borderRadius: 20, borderWidth: 1,
    marginBottom: 10, marginTop: 2,
  },
  roleTxt:     { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  memberSince: { fontSize: 11, color: 'rgba(0,0,0,0.3)', letterSpacing: 0.2 },

  // ── Stats card
  statsCard: {
    flexDirection: 'row',
    backgroundColor: CARD,
    marginHorizontal: 16, marginTop: -1,
    borderRadius: 20,
    paddingVertical: 18,
    borderWidth: 1, borderColor: BORDER,
    ...Platform.select({
      web: { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
      default: { elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10 },
    }),
  },
  statItem:     { flex: 1, alignItems: 'center', gap: 4 },
  statIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statNum:      { fontSize: 22, fontWeight: '900', color: TEXT },
  statLbl:      { fontSize: 10, color: MUTED, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  statSep:      { width: 1, backgroundColor: BORDER, marginVertical: 4 },

  // ── Inner container
  inner:        { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 16 },

  // ── Section
  sectionWrap:  { marginTop: 20 },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, paddingHorizontal: 2 },
  sectionDot:   { width: 4, height: 4, borderRadius: 2, backgroundColor: ORANGE },
  sectionTitle: { fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 1.5, textTransform: 'uppercase' },

  // ── Menu
  menuCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
      default: { elevation: 2, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8 },
    }),
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  menuIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 13,
  },
  menuLabel:  { fontSize: 14, fontWeight: '600', color: TEXT },
  menuArrow:  {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2,
    marginRight: 8,
  },
  badgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },

  // ── Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 12,
  },
  signOutIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  signOutTxt:   { fontSize: 14, fontWeight: '700', color: '#ef4444' },

  version: { textAlign: 'center', fontSize: 10, color: 'rgba(0,0,0,0.2)', marginTop: 24, letterSpacing: 0.5 },

  // ── Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
    padding: 28,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    width: '100%', maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1, borderColor: BORDER,
    ...Platform.select({
      web: { boxShadow: '0 24px 80px rgba(0,0,0,0.18)' },
      default: { elevation: 20, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24 },
    }),
  },
  modalIconRing: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
  },
  modalIconInner: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: 'rgba(239,68,68,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: { fontSize: 21, fontWeight: '900', color: TEXT, marginBottom: 8 },
  modalSub:   { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  modalBtns:  { flexDirection: 'row', gap: 10, width: '100%' },
  modalCancelBtn: {
    flex: 1, paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER,
    alignItems: 'center',
    backgroundColor: '#f4f4f6',
  },
  modalCancelTxt:  { fontSize: 14, fontWeight: '700', color: '#555' },
  modalLogoutBtn:  {
    flex: 1.2, paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 7,
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(239,68,68,0.4)' },
      default: { elevation: 6, shadowColor: '#ef4444', shadowOpacity: 0.4, shadowRadius: 10 },
    }),
  },
  modalLogoutTxt:  { fontSize: 14, fontWeight: '800', color: '#fff' },
});
