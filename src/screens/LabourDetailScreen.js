/**
 * LabourDetailScreen.js — view a labourer's profile + send a hire request
 *
 * Reads GET /api/labour/:id and posts to /api/labour/:id/hire.
 * Place at: src/screens/LabourDetailScreen.js
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated, Easing, Platform, StatusBar,
  TextInput, Linking, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { http } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const ORANGE = '#f97316';
const LABOUR_COLOR = '#b45309';

function FadeSlide({ children, delay = 0, style }) {
  const o = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(o, { toValue: 1, duration: 380, delay, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(y, { toValue: 0, duration: 380, delay, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);
  return <Animated.View style={[style, { opacity: o, transform: [{ translateY: y }] }]}>{children}</Animated.View>;
}

export default function LabourDetailScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { id } = route.params || {};

  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [hireOpen, setHireOpen] = useState(false);
  const [workDesc, setWorkDesc] = useState('');
  const [wage, setWage]         = useState('');
  const [sending, setSending]   = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await http('GET', `/api/labour/${id}`);
    if (res?.ok) setProfile(res.profile);
    else setError(res?.error || 'Could not load this profile.');
    setLoading(false);
  };

  useEffect(() => { if (id) load(); }, [id]);

  const sendHireRequest = async () => {
    if (!user) {
      Alert.alert('Login required', 'Please log in to send a hire request.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log in', onPress: () => nav.navigate('Login') },
      ]);
      return;
    }
    setSending(true);
    const res = await http('POST', `/api/labour/${id}/hire`, {
      work_description: workDesc.trim() || null,
      proposed_wage: wage ? parseInt(wage, 10) : null,
    });
    setSending(false);
    if (res?.ok) {
      Toast.show({ type: 'success', text1: 'Request sent!', text2: `${profile?.full_name || 'The worker'} will be notified.` });
      setHireOpen(false);
      setWorkDesc('');
      setWage('');
    } else {
      Toast.show({ type: 'error', text1: 'Could not send request', text2: res?.error || 'Please try again.' });
    }
  };

  const callPhone = () => {
    if (profile?.user_phone) Linking.openURL(`tel:${profile.user_phone}`);
  };

  if (loading) {
    return (
      <View style={[s.root, s.center]}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[s.root, s.center, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Ionicons name="alert-circle-outline" size={40} color="#ddd" />
        <Text style={s.errorTitle}>{error || 'Profile not found'}</Text>
        <TouchableOpacity onPress={load} style={s.retryBtn}>
          <Text style={s.retryTxt}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initials = (profile.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.topBar}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#111" />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>Labour Profile</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <FadeSlide delay={40} style={s.card}>
          <View style={s.headRow}>
            <View style={s.avatar}>
              {profile.photo_url ? (
                <Animated.Image source={{ uri: profile.photo_url }} style={s.avatarImg} />
              ) : (
                <Text style={s.avatarTxt}>{initials}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{profile.full_name}</Text>
              <Text style={s.meta}>
                {profile.skill_category}
                {profile.experience_years ? ` · ${profile.experience_years} yrs experience` : ''}
              </Text>
              {!!profile.rating_avg && (
                <View style={s.ratingRow}>
                  <Ionicons name="star" size={12} color="#f59e0b" />
                  <Text style={s.ratingTxt}>{Number(profile.rating_avg).toFixed(1)} ({profile.rating_count || 0})</Text>
                </View>
              )}
            </View>
          </View>

          <View style={s.badgeRow}>
            <View style={[s.availBadge, { backgroundColor: profile.availability === 'busy' ? '#fef3c7' : '#f0fdf4' }]}>
              <View style={[s.availDot, { backgroundColor: profile.availability === 'busy' ? '#d97706' : '#16a34a' }]} />
              <Text style={[s.availTxt, { color: profile.availability === 'busy' ? '#92400e' : '#166534' }]}>
                {profile.availability === 'busy' ? 'Busy this week' : 'Available now'}
              </Text>
            </View>
            {profile.id_verified && (
              <View style={s.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#2563eb" />
                <Text style={s.verifiedTxt}>ID Verified</Text>
              </View>
            )}
          </View>
        </FadeSlide>

        <FadeSlide delay={90} style={s.card}>
          <Text style={s.sectionTitle}>Daily wage</Text>
          <Text style={s.wageValue}>
            {profile.daily_wage ? `₹${profile.daily_wage}/day` : 'Contact for rate'}
          </Text>
        </FadeSlide>

        {Array.isArray(profile.skills) && profile.skills.length > 0 && (
          <FadeSlide delay={120} style={s.card}>
            <Text style={s.sectionTitle}>Other skills</Text>
            <View style={s.chipRow}>
              {profile.skills.map((sk, i) => (
                <View key={i} style={s.skillPill}><Text style={s.skillPillTxt}>{sk}</Text></View>
              ))}
            </View>
          </FadeSlide>
        )}

        {!!profile.bio && (
          <FadeSlide delay={150} style={s.card}>
            <Text style={s.sectionTitle}>About</Text>
            <Text style={s.bioTxt}>{profile.bio}</Text>
          </FadeSlide>
        )}

        {!!profile.location && (
          <FadeSlide delay={180} style={s.card}>
            <Text style={s.sectionTitle}>Location</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="location-outline" size={15} color="#888" />
              <Text style={s.bioTxt}>{profile.location}</Text>
            </View>
          </FadeSlide>
        )}

        {hireOpen && (
          <FadeSlide style={s.card}>
            <Text style={s.sectionTitle}>Send a hire request</Text>
            <TextInput
              style={s.input}
              value={workDesc}
              onChangeText={setWorkDesc}
              placeholder="Describe the work"
              placeholderTextColor="#bbb"
            />
            <TextInput
              style={[s.input, { marginTop: 8 }]}
              value={wage}
              onChangeText={setWage}
              placeholder="Proposed wage (₹)"
              placeholderTextColor="#bbb"
              keyboardType="number-pad"
            />
            <TouchableOpacity
              style={[s.hireSendBtn, sending && { opacity: 0.7 }]}
              onPress={sendHireRequest}
              disabled={sending}
              activeOpacity={0.88}
            >
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={s.hireSendTxt}>Send request</Text>}
            </TouchableOpacity>
          </FadeSlide>
        )}
      </ScrollView>

      {/* Sticky action bar */}
      <View style={[s.actionBar, { paddingBottom: insets.bottom + 12 }]}>
        {profile.user_phone && (
          <TouchableOpacity style={s.callBtn} onPress={callPhone} activeOpacity={0.85}>
            <Ionicons name="call" size={18} color={LABOUR_COLOR} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={s.hireBtn}
          onPress={() => setHireOpen(o => !o)}
          activeOpacity={0.88}
        >
          <Text style={s.hireBtnTxt}>{hireOpen ? 'Cancel' : 'Hire now'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e8e8e8',
  },
  topBarTitle: { fontSize: 16, fontWeight: '800', color: '#111' },

  errorTitle: { fontSize: 14, fontWeight: '700', color: '#999' },
  retryBtn: { marginTop: 4, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: ORANGE, borderRadius: 10 },
  retryTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f0f0f0',
    padding: 16, marginBottom: 12,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: LABOUR_COLOR + '18',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: 58, height: 58, borderRadius: 29 },
  avatarTxt: { fontSize: 18, fontWeight: '800', color: LABOUR_COLOR },
  name: { fontSize: 17, fontWeight: '800', color: '#111' },
  meta: { fontSize: 12, color: '#999', fontWeight: '500', marginTop: 3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  ratingTxt: { fontSize: 12, fontWeight: '700', color: '#111' },

  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  availBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 },
  availDot: { width: 7, height: 7, borderRadius: 4 },
  availTxt: { fontSize: 11, fontWeight: '700' },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100,
  },
  verifiedTxt: { fontSize: 11, fontWeight: '700', color: '#2563eb' },

  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#999', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 },
  wageValue: { fontSize: 20, fontWeight: '900', color: '#111' },
  bioTxt: { fontSize: 13, color: '#444', lineHeight: 19 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillPill: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6 },
  skillPillTxt: { fontSize: 12, fontWeight: '600', color: '#555' },

  input: {
    backgroundColor: '#fafafa', borderWidth: 1.5, borderColor: '#ebebeb',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#111',
  },
  hireSendBtn: {
    marginTop: 12, backgroundColor: LABOUR_COLOR, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', justifyContent: 'center',
  },
  hireSendTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },

  actionBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', gap: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0',
    paddingHorizontal: 16, paddingTop: 12,
  },
  callBtn: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: LABOUR_COLOR + '18', borderWidth: 1.5, borderColor: LABOUR_COLOR + '33',
  },
  hireBtn: {
    flex: 1, backgroundColor: ORANGE, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ORANGE, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  hireBtnTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
