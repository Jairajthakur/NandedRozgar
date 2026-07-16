/**
 * WorkerStatusScreen.js — "Single Screen, Dual-State" worker home (Zero Navigation)
 *
 * The whole point: a worker glancing at their phone for half a second, in
 * bright sunlight, with dirty/sweaty hands, should know their status without
 * reading a single word — purely from the background color — and should
 * never need to hunt through tabs or menus to do the one thing they came
 * here to do.
 *
 * State A — "Looking for Work" (default): background turns bright orange.
 *   Giant swipe control to mark yourself ready, plus any incoming job
 *   alerts (color-coded by wage) to accept/decline.
 * State B — "On a Job" (active): background turns bright green. A big
 *   supervisor card (contractor name + one-tap call) and a giant
 *   "swipe to leave work" control to check out when the job is done.
 *
 * Every consequential action (go-ready, accept job, leave work) is a
 * SwipeSlider, not a tappable button — deliberate, hard to trigger by
 * accident, and needs no reading ability to understand (see SwipeSlider.js).
 *
 * Backend:
 *   GET   /api/labour/mine                      — this worker's profile
 *   GET   /api/labour/minimal-status             — lean state-machine payload
 *   GET   /api/labour/hire-requests/received     — pending job alerts
 *   PATCH /api/labour/:id/live-now               — go ready / go off duty
 *   PATCH /api/labour/hire-requests/:id          — accept / decline / complete
 *
 * Place at: src/screens/WorkerStatusScreen.js
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  ScrollView, RefreshControl, Alert, Linking, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { http } from '../utils/api';
import { useLang } from '../utils/i18n';
import SwipeSlider from '../components/labour/SwipeSlider';
import WageIndicator from '../components/labour/WageIndicator';
import SOSButton from '../components/labour/SOSButton';
import BannerAd from '../components/ads/BannerAd';
import { useIsPremium } from '../hooks/useIsPremium';

const ORANGE = '#f97316';
const ORANGE_DARK = '#c2410c';
const GREEN = '#16a34a';
const GREEN_DARK = '#15803d';
const POLL_MS = 25_000;

// Big local-language status lines — this is the one bit of text a worker
// actually needs to read, so it's shown large, bilingual, and simple.
const COPY = {
  lookingTitle:  { en: 'Looking for work',      mr: 'कामाच्या शोधात',        hi: 'काम की तलाश में' },
  readyTitle:    { en: "You're marked ready",   mr: 'तुम्ही तयार आहात',       hi: 'आप तैयार हैं' },
  waitingSub:    { en: 'Waiting for jobs…',     mr: 'कामाची वाट पाहत आहे…',   hi: 'काम का इंतज़ार…' },
  swipeReady:    { en: 'Swipe — I am ready',     mr: 'स्वाइप करा — मी तयार आहे', hi: 'स्वाइप करें — मैं तैयार हूं' },
  swipeOffDuty:  { en: 'Swipe to go off duty',   mr: 'स्वाइप करा — काम बंद',   hi: 'स्वाइप करें — काम बंद करें' },
  onJobTitle:    { en: 'On a job',               mr: 'कामावर आहात',          hi: 'काम पर हैं' },
  onJobSub:      { en: 'Have a safe, good day at work', mr: 'कामाच्या ठिकाणी सुरक्षित रहा', hi: 'काम पर सुरक्षित रहें' },
  swipeLeave:    { en: 'SWIPE TO LEAVE WORK',    mr: 'स्वाइप करा — काम सोडा',  hi: 'स्वाइप करें — काम छोड़ें' },
  newJob:        { en: 'New job alert',          mr: 'नवीन कामाची संधी',      hi: 'नया काम आया है' },
  swipeAccept:   { en: 'Swipe to accept',        mr: 'स्वाइप करा — स्वीकार',   hi: 'स्वाइप करें — स्वीकार करें' },
  decline:       { en: 'Not now',                mr: 'आत्ता नाही',           hi: 'अभी नहीं' },
  callSupervisor:{ en: 'Call supervisor',        mr: 'कॉल करा',              hi: 'कॉल करें' },
};
function pick(key, lang) { return COPY[key]?.[lang] || COPY[key]?.en || key; }

async function getCoords() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return {};
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch { return {}; }
}

export default function WorkerStatusScreen() {
  const nav = useNavigation();
  const isPremium = useIsPremium();
  const insets = useSafeAreaInsets();
  const { lang } = useLang();

  const [profile, setProfile]   = useState(null);
  const [status, setStatus]     = useState(null);
  const [pending, setPending]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState(null);
  const pollRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading((prev) => prev && true);
    const [mineRes, statusRes] = await Promise.all([
      http('GET', '/api/labour/mine'),
      http('GET', '/api/labour/minimal-status'),
    ]);
    if (mineRes?.ok) setProfile(mineRes.profile || null);
    if (statusRes?.ok) {
      setStatus(statusRes);
      setError(null);
      if (statusRes.pendingRequests > 0) {
        const recvRes = await http('GET', '/api/labour/hire-requests/received');
        if (recvRes?.ok) setPending((recvRes.hireRequests || []).filter(r => r.status === 'pending'));
      } else {
        setPending([]);
      }
    } else if (!silent) {
      setError(statusRes?.error || 'Could not load your status right now.');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [load]);

  useFocusEffect(useCallback(() => { load(true); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  // ── Go ready / go off duty (live-now toggle) ───────────────────────────
  const toggleReady = async (next) => {
    if (!profile?.id) return false;
    const coords = await getCoords();
    const res = await http('PATCH', `/api/labour/${profile.id}/live-now`, { isAvailable: next, ...coords });
    if (res?.ok) {
      Toast.show({ type: 'success', text1: next ? "You're now visible as ready 🟢" : 'Marked off duty' });
      load(true);
      return true;
    }
    Toast.show({ type: 'error', text1: res?.error || 'Could not update your status' });
    return false;
  };

  // ── Leave the current job (mark completed) ─────────────────────────────
  const leaveJob = async () => {
    const job = status?.activeJob;
    if (!job?.id) return false;
    const res = await http('PATCH', `/api/labour/hire-requests/${job.id}`, { status: 'completed' });
    if (res?.ok) {
      Toast.show({ type: 'success', text1: 'Checked out — nice work today!' });
      load(true);
      return true;
    }
    Toast.show({ type: 'error', text1: res?.error || 'Could not check out' });
    return false;
  };

  // ── Accept / decline an incoming job alert ──────────────────────────────
  const acceptJob = async (hr) => {
    const res = await http('PATCH', `/api/labour/hire-requests/${hr.id}`, { status: 'accepted' });
    if (res?.ok) {
      Toast.show({ type: 'success', text1: 'Job accepted!' });
      load(true);
      return true;
    }
    Toast.show({ type: 'error', text1: res?.error || 'Could not accept this job' });
    return false;
  };
  const declineJob = (hr) => {
    Alert.alert(pick('decline', lang), 'Decline this job offer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline', style: 'destructive',
        onPress: async () => {
          const res = await http('PATCH', `/api/labour/hire-requests/${hr.id}`, { status: 'declined' });
          if (res?.ok) load(true);
          else Toast.show({ type: 'error', text1: res?.error || 'Could not decline' });
        },
      },
    ]);
  };

  const callNumber = (number) => {
    if (!number) return;
    Linking.openURL(`tel:${number}`).catch(() =>
      Alert.alert('Could not open dialer', `Please dial ${number} directly.`)
    );
  };

  // ── Loading / no-profile-yet states ─────────────────────────────────────
  if (loading) {
    return (
      <View style={[st.root, st.center, { backgroundColor: '#fafafa' }]}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[st.root, st.center, { backgroundColor: '#fafafa', paddingTop: insets.top }]}>
        <Ionicons name="construct-outline" size={64} color={ORANGE} />
        <Text style={st.noProfileTitle}>Post your worker profile</Text>
        <Text style={st.noProfileSub}>Set up your trade once — then this screen does all the work.</Text>
        <TouchableOpacity style={st.noProfileBtn} onPress={() => nav.navigate('PostLabourProfile')}>
          <Text style={st.noProfileBtnTxt}>Get started</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const onJob = !!status?.hasActiveJob && !!status?.activeJob;
  const isReady = !!status?.isAvailable;
  const bg = onJob ? GREEN : ORANGE;
  const bgDark = onJob ? GREEN_DARK : ORANGE_DARK;

  return (
    <ScrollView
      style={[st.root, { backgroundColor: bg }]}
      contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 14, paddingBottom: insets.bottom + 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
    >
      {/* ── Top bar: today's earnings + tiny safety/dashboard links ─────── */}
      <View style={st.topBar}>
        <View style={st.earningsPill}>
          <Ionicons name="wallet-outline" size={14} color="#fff" />
          <Text style={st.earningsTxt}>{status?.todayEarnings || '₹0'} today</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <SOSButton hireRequestId={status?.activeJob?.id} />
          <TouchableOpacity style={st.dashBtn} onPress={() => nav.navigate('HireRequests')}>
            <Ionicons name="menu-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={st.errorBanner}>
          <Ionicons name="alert-circle" size={16} color="#fff" />
          <Text style={st.errorTxt}>{error}</Text>
        </View>
      )}

      {onJob ? (
        // ── STATE B — On a Job (green) ──────────────────────────────────
        <View style={st.stateWrap}>
          <View style={st.statusIconWrap}>
            <Ionicons name="briefcase" size={54} color="#fff" />
          </View>
          <Text style={st.bigTitle}>{pick('onJobTitle', lang)}</Text>
          <Text style={st.bigSub}>{pick('onJobSub', lang)}</Text>

          {/* Supervisor card */}
          <View style={st.supervisorCard}>
            <View style={st.supervisorAvatar}>
              <Ionicons name="person" size={30} color={GREEN_DARK} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.supervisorLabel}>Contractor</Text>
              <Text style={st.supervisorName} numberOfLines={1}>
                {status.activeJob.contractor_name || 'Your contractor'}
              </Text>
              {!!status.activeJob.work_description && (
                <Text style={st.supervisorMeta} numberOfLines={1}>{status.activeJob.work_description}</Text>
              )}
            </View>
            <TouchableOpacity
              style={st.callBtn}
              onPress={() => callNumber(status.activeJob.contractor_phone)}
              accessibilityLabel={pick('callSupervisor', lang)}
            >
              <Ionicons name="call" size={30} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={st.sliderWrap}>
            <SwipeSlider
              label={pick('swipeLeave', lang)}
              confirmedLabel="✓"
              icon="log-out-outline"
              color={GREEN_DARK}
              height={78}
              onConfirm={leaveJob}
            />
          </View>
        </View>
      ) : (
        // ── STATE A — Looking for Work (orange) ─────────────────────────
        <View style={st.stateWrap}>
          <View style={st.statusIconWrap}>
            <Ionicons name={isReady ? 'radio' : 'mic'} size={54} color="#fff" />
          </View>
          <Text style={st.bigTitle}>{pick(isReady ? 'readyTitle' : 'lookingTitle', lang)}</Text>
          <Text style={st.bigSub}>{pick('waitingSub', lang)}</Text>

          <View style={st.sliderWrap}>
            <SwipeSlider
              key={isReady ? 'ready' : 'notready'}
              label={pick(isReady ? 'swipeOffDuty' : 'swipeReady', lang)}
              confirmedLabel="✓"
              icon={isReady ? 'pause' : 'checkmark'}
              color={isReady ? '#9a3412' : ORANGE_DARK}
              height={78}
              onConfirm={() => toggleReady(!isReady)}
            />
          </View>

          {/* Incoming job alerts */}
          {pending.length > 0 && (
            <View style={st.alertsWrap}>
              {pending.map((hr) => (
                <View key={hr.id} style={st.alertCard}>
                  <View style={st.alertTop}>
                    <Text style={st.alertTitle} numberOfLines={2}>{pick('newJob', lang)}</Text>
                    <WageIndicator wage={hr.proposed_wage} size="lg" />
                  </View>
                  {!!hr.work_description && <Text style={st.alertDesc} numberOfLines={2}>{hr.work_description}</Text>}
                  {!!hr.contractor_name && <Text style={st.alertContractor}>From {hr.contractor_name}</Text>}

                  <SwipeSlider
                    label={pick('swipeAccept', lang)}
                    confirmedLabel="✓"
                    icon="checkmark"
                    color={GREEN}
                    height={62}
                    onConfirm={() => acceptJob(hr)}
                  />
                  <TouchableOpacity style={st.declineBtn} onPress={() => declineJob(hr)}>
                    <Text style={st.declineTxt}>{pick('decline', lang)}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {!isPremium && (
        <View style={st.adWrap}>
          <BannerAd />
        </View>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },

  noProfileTitle: { fontSize: 20, fontWeight: '900', color: '#111', marginTop: 16 },
  noProfileSub: { fontSize: 13.5, color: '#777', marginTop: 6, textAlign: 'center', paddingHorizontal: 30 },
  noProfileBtn: { marginTop: 22, backgroundColor: ORANGE, borderRadius: 100, paddingVertical: 14, paddingHorizontal: 30 },
  noProfileBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 6,
  },
  earningsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 100, paddingVertical: 6, paddingHorizontal: 12,
  },
  earningsTxt: { color: '#fff', fontWeight: '800', fontSize: 12.5 },
  dashBtn: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 10,
    padding: 10, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.15)',
  },
  errorTxt: { color: '#fff', fontSize: 12.5, fontWeight: '600', flex: 1 },

  stateWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: 24 },
  statusIconWrap: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  bigTitle: { fontSize: 30, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: -0.5 },
  bigSub: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginTop: 6, textAlign: 'center' },

  sliderWrap: { width: '100%', marginTop: 32 },

  supervisorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%',
    backgroundColor: '#fff', borderRadius: 22, padding: 16, marginTop: 30,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5,
  },
  supervisorAvatar: {
    width: 58, height: 58, borderRadius: 29, backgroundColor: '#dcfce7',
    alignItems: 'center', justifyContent: 'center',
  },
  supervisorLabel: { fontSize: 11, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.4 },
  supervisorName: { fontSize: 18, fontWeight: '900', color: '#111', marginTop: 1 },
  supervisorMeta: { fontSize: 12.5, color: '#777', fontWeight: '600', marginTop: 2 },
  callBtn: {
    width: 58, height: 58, borderRadius: 29, backgroundColor: GREEN,
    alignItems: 'center', justifyContent: 'center',
  },

  alertsWrap: { width: '100%', marginTop: 28, gap: 14 },
  alertCard: {
    backgroundColor: '#fff', borderRadius: 22, padding: 18, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5,
  },
  alertTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  alertTitle: { flex: 1, fontSize: 16, fontWeight: '900', color: '#111' },
  alertDesc: { fontSize: 13.5, color: '#555', lineHeight: 19 },
  alertContractor: { fontSize: 12, color: '#999', fontWeight: '600' },
  declineBtn: { alignItems: 'center', paddingVertical: 6 },
  declineTxt: { fontSize: 13, fontWeight: '700', color: '#999' },

  adWrap: {
    width: '100%', marginTop: 28, paddingHorizontal: 20,
  },
});
