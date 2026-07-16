/**
 * HireRequestsScreen.js — manage labour hire requests from both sides:
 *  - "Sent"     tab: requests I made as a contractor (GET /api/labour/hire-requests/sent)
 *  - "Received" tab: requests made to my own labour profile, if I have one
 *                (GET /api/labour/hire-requests/received)
 *
 * Status transitions go through PATCH /api/labour/hire-requests/:id.
 * Once a request I sent reaches 'completed', I can rate the worker via
 * POST /api/ratings/labour — this is the screen that actually closes the
 * "rate the labourer" loop, since nothing else in the app surfaces hire
 * requests at all.
 *
 * Place at: src/screens/HireRequestsScreen.js
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput, Alert, Image, Switch, Platform,
  Linking, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import { http } from '../utils/api';
import { LABOUR_COLORS, STATUS_META, SKILL_ICONS, getSkillGradient } from '../constants/labourTheme';
import { StatusPill } from '../components/labour/LabourUI';
import LabourAttendance from '../components/LabourAttendance';
import DisputePanel from '../components/labour/DisputePanel';
import RewardsProgress from '../components/labour/RewardsProgress';

const ORANGE  = LABOUR_COLORS.primary;
const LABOUR  = LABOUR_COLORS.worker;
const BG      = '#f4f4f6';
const SURFACE = LABOUR_COLORS.surface;
const TEXT    = LABOUR_COLORS.text;
const MUTED   = LABOUR_COLORS.textMuted;
const BORDER  = 'rgba(0,0,0,0.07)';

// India's unified emergency helpline (police / fire / ambulance).
const EMERGENCY_NUMBER = '112';

async function callSOS() {
  try {
    await Linking.openURL(`tel:${EMERGENCY_NUMBER}`);
  } catch {
    Alert.alert('Could not open dialer', `Please dial ${EMERGENCY_NUMBER} directly.`);
  }
}

function callNumber(number) {
  if (!number) return;
  Linking.openURL(`tel:${number}`).catch(() =>
    Alert.alert('Could not open dialer', `Please dial ${number} directly.`)
  );
}

// Lets a worker send the job location/contractor phone to a family member
// before heading out — plain-text share sheet so it works over WhatsApp,
// SMS, or any other app the person already has installed.
async function shareHireDetails(item) {
  const lines = [
    'Heading for a job — sharing details via NandedRozgar:',
    item.contractor_name ? `Contractor: ${item.contractor_name}` : null,
    item.contractor_phone ? `Contact number: ${item.contractor_phone}` : null,
    item.work_description ? `Work: ${item.work_description}` : null,
    item.proposed_wage ? `Wage: ₹${item.proposed_wage}/day` : null,
    formatDate(item.work_date) ? `Date: ${formatDate(item.work_date)}` : null,
  ].filter(Boolean).join('\n');
  try {
    await Share.share({ message: lines });
  } catch {
    // user cancelled the share sheet — nothing to do
  }
}

function formatDate(d) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return null;
  }
}

export default function HireRequestsScreen() {
  const nav = useNavigation();

  const [tab, setTab]             = useState('sent'); // 'sent' | 'received'
  const [sent, setSent]           = useState([]);
  const [received, setReceived]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId]       = useState(null); // hire request currently being updated
  const [error, setError]         = useState(null); // set when any of the 3 initial loads fail

  const [myProfile, setMyProfile]       = useState(null);
  const [profileBusy, setProfileBusy]   = useState(null); // 'availability' | 'checkin' | null

  // Rating modal
  const [rateTarget, setRateTarget]   = useState(null); // the hire request being rated
  const [rateStars, setRateStars]     = useState(0);
  const [rateComment, setRateComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [expandedId, setExpandedId] = useState(null); // hire request currently showing attendance/dispute
  // Milestone rewards are a nice-to-have, not part of "what do I do today" —
  // collapsed by default so the dashboard leads with duty status and
  // earnings, not a progress bar.
  const [showRewards, setShowRewards] = useState(false);

  const load = useCallback(async () => {
    const [sentRes, receivedRes, mineRes] = await Promise.all([
      http('GET', '/api/labour/hire-requests/sent'),
      http('GET', '/api/labour/hire-requests/received'),
      http('GET', '/api/labour/mine'),
    ]);

    let failed = false;
    if (sentRes?.ok) setSent(sentRes.hireRequests || []);
    else failed = true;
    if (receivedRes?.ok) setReceived(receivedRes.hireRequests || []);
    else failed = true;
    if (mineRes?.ok) setMyProfile(mineRes.profile || null);
    else failed = true;

    // Surface load failures instead of letting the screen quietly fall back
    // to its "no requests yet" empty state, which would otherwise look
    // identical to a genuinely empty inbox.
    setError(failed ? (sentRes?.error || receivedRes?.error || mineRes?.error || 'Could not load your dashboard right now.') : null);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const updateStatus = async (hireRequest, status, confirmMsg) => {
    const doUpdate = async () => {
      setBusyId(hireRequest.id);
      const res = await http('PATCH', `/api/labour/hire-requests/${hireRequest.id}`, { status });
      setBusyId(null);
      if (res?.ok) {
        setSent(list => list.map(r => (r.id === hireRequest.id ? { ...r, status } : r)));
        setReceived(list => list.map(r => (r.id === hireRequest.id ? { ...r, status } : r)));
        Toast.show({ type: 'success', text1: `Marked as ${STATUS_META[status]?.label || status}` });
      } else {
        Toast.show({ type: 'error', text1: 'Could not update request', text2: res?.error || 'Please try again.' });
      }
    };

    if (confirmMsg) {
      Alert.alert('Are you sure?', confirmMsg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', style: status === 'cancelled' || status === 'declined' ? 'destructive' : 'default', onPress: doUpdate },
      ]);
    } else {
      doUpdate();
    }
  };

  const confirmSOS = (hireRequest) => {
    Alert.alert(
      'Emergency SOS',
      `This will call ${EMERGENCY_NUMBER} (police / fire / ambulance) and alert your emergency contact with your live location.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SOS',
          style: 'destructive',
          onPress: async () => {
            callSOS();
            try {
              const { status } = await Location.requestForegroundPermissionsAsync();
              let lat, lng;
              if (status === 'granted') {
                const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                lat = pos.coords.latitude; lng = pos.coords.longitude;
              }
              const res = await http('POST', '/api/sos/trigger', {
                hireRequestId: hireRequest?.id,
                lat, lng,
                message: hireRequest ? `SOS raised during hire #${hireRequest.id}` : 'SOS raised',
              });
              if (res?.ok) {
                const contact = res.emergencyContacts?.phone;
                Toast.show({
                  type: 'success',
                  text1: 'SOS alert sent',
                  text2: contact ? `Your emergency contact will be notified.` : 'Add an emergency contact in Profile for faster help.',
                });
              }
            } catch (e) { /* dialing 112 already happened — alert logging is best-effort */ }
          },
        },
      ]
    );
  };

  const openRateModal = (hireRequest) => {
    setRateTarget(hireRequest);
    setRateStars(0);
    setRateComment('');
  };

  const submitRating = async () => {
    if (!rateTarget || !rateStars) return;
    setSubmittingRating(true);
    const res = await http('POST', '/api/ratings/labour', {
      hireRequestId: rateTarget.id,
      stars: rateStars,
      comment: rateComment.trim() || undefined,
    });
    setSubmittingRating(false);
    if (res?.ok) {
      setSent(list => list.map(r => (r.id === rateTarget.id ? { ...r, already_rated: true } : r)));
      Toast.show({ type: 'success', text1: '⭐ Rating submitted!' });
      setRateTarget(null);
    } else {
      Toast.show({ type: 'error', text1: 'Could not submit rating', text2: res?.error || 'Please try again.' });
    }
  };

  const toggleAvailability = async () => {
    if (!myProfile || profileBusy) return;
    const next = myProfile.availability === 'available' ? 'busy' : 'available';
    setProfileBusy('availability');
    const res = await http('PATCH', `/api/labour/${myProfile.id}/availability`, { availability: next });
    setProfileBusy(null);
    if (res?.ok) {
      setMyProfile(p => ({ ...p, availability: next }));
    } else {
      Toast.show({ type: 'error', text1: 'Could not update availability', text2: res?.error || 'Please try again.' });
    }
  };

  const toggleCheckin = async () => {
    if (!myProfile || profileBusy) return;
    setProfileBusy('checkin');
    const res = myProfile.checked_in_today
      ? await http('DELETE', `/api/labour/${myProfile.id}/checkin`)
      : await http('POST', `/api/labour/${myProfile.id}/checkin`);
    setProfileBusy(null);
    if (res?.ok && res.profile) {
      setMyProfile(p => ({
        ...p,
        checked_in_today: res.profile.checked_in_today,
        availability: res.profile.availability || p.availability,
      }));
      Toast.show({ type: 'success', text1: res.profile.checked_in_today ? "You're checked in for today" : 'Checked out' });
    } else {
      Toast.show({ type: 'error', text1: 'Could not update check-in', text2: res?.error || 'Please try again.' });
    }
  };

  const renderSentActions = (item) => {
    const busy = busyId === item.id;
    if (item.status === 'pending') {
      return (
        <TouchableOpacity
          style={[st.actionBtn, st.actionBtnGhost]}
          disabled={busy}
          onPress={() => updateStatus(item, 'cancelled', 'Cancel this hire request?')}
        >
          {busy ? <ActivityIndicator size="small" color={MUTED} /> : <Text style={st.actionBtnGhostTxt}>Cancel request</Text>}
        </TouchableOpacity>
      );
    }
    if (item.status === 'accepted') {
      return (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[st.actionBtn, st.actionBtnGhost, { flex: 1 }]}
            disabled={busy}
            onPress={() => updateStatus(item, 'cancelled', 'Cancel this hire request?')}
          >
            <Text style={st.actionBtnGhostTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.actionBtn, st.actionBtnPrimary, { flex: 1 }]}
            disabled={busy}
            onPress={() => updateStatus(item, 'completed', 'Mark this work as completed? You\'ll be able to rate the worker next.')}
          >
            {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.actionBtnPrimaryTxt}>Mark completed</Text>}
          </TouchableOpacity>
        </View>
      );
    }
    if (item.status === 'completed' && !item.already_rated) {
      return (
        <TouchableOpacity style={[st.actionBtn, st.actionBtnRate]} onPress={() => openRateModal(item)}>
          <Ionicons name="star" size={15} color="#fff" />
          <Text style={st.actionBtnPrimaryTxt}>Rate worker</Text>
        </TouchableOpacity>
      );
    }
    if (item.status === 'completed' && item.already_rated) {
      return (
        <View style={st.ratedRow}>
          <Ionicons name="checkmark-circle" size={15} color="#15803d" />
          <Text style={st.ratedTxt}>You rated this worker</Text>
        </View>
      );
    }
    return null;
  };

  const renderReceivedActions = (item) => {
    const busy = busyId === item.id;
    if (item.status === 'pending') {
      return (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[st.actionBtn, st.actionBtnGhost, { flex: 1 }]}
            disabled={busy}
            onPress={() => updateStatus(item, 'declined', 'Decline this hire request?')}
          >
            <Text style={st.actionBtnGhostTxt}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.actionBtn, st.actionBtnPrimary, { flex: 1 }]}
            disabled={busy}
            onPress={() => updateStatus(item, 'accepted')}
          >
            {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.actionBtnPrimaryTxt}>Accept</Text>}
          </TouchableOpacity>
        </View>
      );
    }
    if (item.status === 'accepted') {
      return (
        <View>
          {!!item.contractor_phone && (
            <TouchableOpacity style={st.phoneRow} onPress={() => callNumber(item.contractor_phone)} activeOpacity={0.8}>
              <Ionicons name="call" size={14} color={LABOUR} />
              <Text style={st.phoneRowTxt}>{item.contractor_phone}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[st.actionBtn, st.actionBtnPrimary]}
            disabled={busy}
            onPress={() => updateStatus(item, 'completed', 'Mark this work as completed?')}
          >
            {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.actionBtnPrimaryTxt}>Mark completed</Text>}
          </TouchableOpacity>

          {/* ── Safety row: before heading to the job ─────────────────────── */}
          <View style={st.safetyRow}>
            <TouchableOpacity style={st.safetyBtn} onPress={() => shareHireDetails(item)} activeOpacity={0.8}>
              <Ionicons name="share-social-outline" size={14} color={LABOUR} />
              <Text style={st.safetyBtnTxt}>Share job details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.safetyBtn, st.sosBtn]} onPress={() => confirmSOS(item)} activeOpacity={0.8}>
              <Ionicons name="alert-circle" size={14} color="#dc2626" />
              <Text style={[st.safetyBtnTxt, st.sosBtnTxt]}>SOS</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return null;
  };

  const renderItem = ({ item }) => {
    const isSent = tab === 'sent';
    return (
      <View style={st.card}>
        <View style={st.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={st.cardTitle} numberOfLines={1}>
              {isSent ? item.labour_name : item.contractor_name}
            </Text>
            {isSent && !!item.skill_category && <Text style={st.cardMeta}>{item.skill_category}</Text>}
          </View>
          <StatusPill status={item.status} />
        </View>

        {!!item.work_description && <Text style={st.desc}>{item.work_description}</Text>}

        <View style={st.metaRow}>
          {!!item.proposed_wage && (
            <View style={st.metaItem}>
              <Ionicons name="cash-outline" size={13} color={MUTED} />
              <Text style={st.metaTxt}>₹{item.proposed_wage}/day</Text>
            </View>
          )}
          {!!formatDate(item.work_date) && (
            <View style={st.metaItem}>
              <Ionicons name="calendar-outline" size={13} color={MUTED} />
              <Text style={st.metaTxt}>{formatDate(item.work_date)}</Text>
            </View>
          )}
        </View>

        <View style={{ marginTop: 10 }}>
          {isSent ? renderSentActions(item) : renderReceivedActions(item)}
        </View>

        {['accepted', 'completed'].includes(item.status) && (
          <>
            <TouchableOpacity
              style={st.manageToggle}
              onPress={() => setExpandedId(id => (id === item.id ? null : item.id))}
            >
              <Ionicons name={expandedId === item.id ? 'chevron-up' : 'chevron-down'} size={14} color={LABOUR} />
              <Text style={st.manageToggleTxt}>
                {expandedId === item.id ? 'Hide attendance & dispute' : 'Attendance & dispute'}
              </Text>
            </TouchableOpacity>

            {expandedId === item.id && (
              <View style={{ marginTop: 10, gap: 10 }}>
                <LabourAttendance hireRequestId={item.id} isContractor={isSent} />
                <DisputePanel hireRequestId={item.id} isContractor={isSent} />
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  const data = tab === 'sent' ? sent : received;

  const completedCount = received.filter(r => r.status === 'completed').length;

  const initials = (myProfile?.full_name || '')
    .split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const renderDashboardHeader = () => {
    if (!myProfile) return null;
    const [gradStart, gradEnd] = getSkillGradient(myProfile.skill_category);
    const available = myProfile.availability === 'available';
    const checkedIn = myProfile.checked_in_today;
    const isTeam = myProfile.profile_type === 'team';
    const perPersonWage = isTeam && myProfile.daily_wage && myProfile.team_size
      ? Math.round(myProfile.daily_wage / myProfile.team_size)
      : null;

    return (
      <View style={st.dashWrap}>
        {/* ── Hero identity card ─────────────────────────────────────────── */}
        <LinearGradient colors={[gradStart, gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.hero}>
          <TouchableOpacity
            style={st.heroTop}
            activeOpacity={0.85}
            onPress={() => myProfile.id && nav.navigate('LabourDetail', { id: myProfile.id })}
          >
            {myProfile.photo_url ? (
              <Image source={{ uri: myProfile.photo_url }} style={st.heroAvatar} />
            ) : (
              <View style={st.heroAvatarFallback}>
                <Text style={st.heroInitials}>{initials || '?'}</Text>
              </View>
            )}

            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={st.heroName} numberOfLines={1}>{myProfile.full_name}</Text>
                {!!myProfile.id_verified && <Ionicons name="shield-checkmark" size={15} color="#fff" />}
              </View>
              <View style={st.heroBadgeRow}>
                <View style={st.heroSkillPill}>
                  <Ionicons name={SKILL_ICONS[myProfile.skill_category] || 'briefcase-outline'} size={11} color="#fff" />
                  <Text style={st.heroSkillTxt}>{myProfile.skill_category}</Text>
                </View>
                {isTeam && (
                  <View style={st.heroSkillPill}>
                    <Ionicons name="people" size={11} color="#fff" />
                    <Text style={st.heroSkillTxt}>Team of {myProfile.team_size}</Text>
                  </View>
                )}
                {myProfile.rating_count > 0 && (
                  <View style={st.heroSkillPill}>
                    <Ionicons name="star" size={11} color="#fde68a" />
                    <Text style={st.heroSkillTxt}>{myProfile.rating_avg} ({myProfile.rating_count})</Text>
                  </View>
                )}
              </View>
              {isTeam && !!myProfile.team_composition && (
                <Text style={st.heroTeamComp} numberOfLines={1}>{myProfile.team_composition}</Text>
              )}
            </View>

            <TouchableOpacity
              style={st.heroSosBtn}
              onPress={() => confirmSOS(null)}
              activeOpacity={0.8}
            >
              <Ionicons name="alert-circle" size={17} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={st.heroEditBtn}
              onPress={() => nav.navigate('PostLabourProfile')}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={17} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>

          <View style={st.heroStatsRow}>
            <View style={st.heroStat}>
              <Text style={st.heroStatValue}>{completedCount}</Text>
              <Text style={st.heroStatLabel}>Jobs done</Text>
            </View>
            <View style={st.heroStatDivider} />
            <View style={st.heroStat}>
              <Text style={st.heroStatValue}>{received.length}</Text>
              <Text style={st.heroStatLabel}>Requests</Text>
            </View>
            <View style={st.heroStatDivider} />
            <View style={st.heroStat}>
              <Text style={st.heroStatValue}>{myProfile.daily_wage ? `₹${myProfile.daily_wage}` : '—'}</Text>
              <Text style={st.heroStatLabel}>{isTeam ? 'Team/day' : 'Per day'}</Text>
            </View>
          </View>

          {perPersonWage != null && (
            <Text style={st.heroPerPersonTxt}>
              ≈ ₹{perPersonWage}/day per person · {myProfile.team_size} people
            </Text>
          )}

          <TouchableOpacity
            style={st.heroViewProfileRow}
            activeOpacity={0.8}
            onPress={() => myProfile.id && nav.navigate('LabourDetail', { id: myProfile.id })}
          >
            <Text style={st.heroViewProfileTxt}>View your public profile & today's chowk stats</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Duty status card (Uber/Ola-style toggle) ───────────────────── */}
        <View style={st.statusCard}>
          <View style={st.statusRow}>
            <View style={[st.statusIconWrap, { backgroundColor: available ? '#f0fdf4' : '#fef3c7' }]}>
              <View style={[st.statusDot, { backgroundColor: available ? '#16a34a' : '#d97706' }]} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.statusLabel}>{available ? "You're Available" : "You're marked Busy"}</Text>
              <Text style={st.statusSub}>
                {available ? 'Contractors can find and hire you' : 'You won\u2019t show up in urgent searches'}
              </Text>
            </View>
            {profileBusy === 'availability' ? (
              <ActivityIndicator size="small" color={LABOUR} />
            ) : (
              <Switch
                value={available}
                onValueChange={toggleAvailability}
                disabled={!!profileBusy}
                trackColor={{ false: '#e5e7eb', true: '#bbf7d0' }}
                thumbColor={Platform.OS === 'android' ? (available ? '#16a34a' : '#f4f4f5') : undefined}
                ios_backgroundColor="#e5e7eb"
              />
            )}
          </View>

          <View style={st.statusDivider} />

          <TouchableOpacity style={st.statusRow} onPress={toggleCheckin} activeOpacity={0.75} disabled={!!profileBusy}>
            <View style={[st.statusIconWrap, { backgroundColor: checkedIn ? LABOUR + '22' : '#f5f5f5' }]}>
              <Ionicons name="location" size={16} color={checkedIn ? LABOUR : MUTED} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.statusLabel}>{checkedIn ? "Checked in for today" : 'Check in at the chowk'}</Text>
              <Text style={st.statusSub}>
                {checkedIn ? 'You\u2019re boosted to the top until midnight' : 'Boost your visibility for today'}
              </Text>
            </View>
            {profileBusy === 'checkin' ? (
              <ActivityIndicator size="small" color={LABOUR} />
            ) : (
              <View style={[st.checkinBtn, checkedIn && st.checkinBtnActive]}>
                <Text style={[st.checkinBtnTxt, checkedIn && st.checkinBtnTxtActive]}>
                  {checkedIn ? 'Check out' : 'Check in'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Earnings teaser ─────────────────────────────────────────── */}
        <TouchableOpacity style={st.statusCard} activeOpacity={0.85} onPress={() => nav.navigate('LabourEarnings')}>
          <View style={st.statusRow}>
            <View style={[st.statusIconWrap, { backgroundColor: LABOUR + '15' }]}>
              <Ionicons name="wallet-outline" size={16} color={LABOUR} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.statusLabel}>My Earnings</Text>
              <Text style={st.statusSub}>₹5 per completed hire — view balance & withdraw</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={MUTED} />
          </View>
        </TouchableOpacity>

        {/* ── Browse Projects — contractors' fixed-slot postings, instant-hire ── */}
        <TouchableOpacity style={st.statusCard} activeOpacity={0.85} onPress={() => nav.navigate('Projects')}>
          <View style={st.statusRow}>
            <View style={[st.statusIconWrap, { backgroundColor: ORANGE + '15' }]}>
              <Ionicons name="briefcase-outline" size={16} color={ORANGE} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.statusLabel}>Browse Projects</Text>
              <Text style={st.statusSub}>Multi-worker jobs from contractors — apply and get hired instantly</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={MUTED} />
          </View>
        </TouchableOpacity>

        {/* ── Milestone rewards (ID card @ 5, T-shirt @ 10 bookings) ──── */}
        <TouchableOpacity
          style={st.rewardsToggle}
          activeOpacity={0.8}
          onPress={() => setShowRewards(v => !v)}
        >
          <Ionicons name="ribbon-outline" size={16} color={MUTED} />
          <Text style={st.rewardsToggleTxt}>
            {showRewards ? 'Hide rewards progress' : 'See your rewards progress'}
          </Text>
          <Ionicons name={showRewards ? 'chevron-up' : 'chevron-down'} size={16} color={MUTED} />
        </TouchableOpacity>
        {showRewards && <RewardsProgress />}
      </View>
    );
  };

  const renderListHeader = () => (
    <>
      {renderDashboardHeader()}

      {!!error && (
        <View style={st.errorBanner}>
          <Ionicons name="alert-circle" size={16} color="#b91c1c" />
          <Text style={st.errorBannerTxt}>{error}</Text>
          <TouchableOpacity onPress={() => { setLoading(true); load(); }} style={st.errorBannerBtn}>
            <Text style={st.errorBannerBtnTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={st.tabBar}>
        <TouchableOpacity
          style={[st.tabBtn, tab === 'sent' && st.tabBtnActive]}
          onPress={() => setTab('sent')}
        >
          <Text style={[st.tabTxt, tab === 'sent' && st.tabTxtActive]}>Sent ({sent.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.tabBtn, tab === 'received' && st.tabBtnActive]}
          onPress={() => setTab('received')}
        >
          <Text style={[st.tabTxt, tab === 'received' && st.tabTxtActive]}>Received ({received.length})</Text>
        </TouchableOpacity>

        {tab === 'sent' && !myProfile && (
          <TouchableOpacity style={st.myProjectsBtn} onPress={() => nav.navigate('MyProjects')} activeOpacity={0.8}>
            <Ionicons name="briefcase-outline" size={13} color={ORANGE} />
            <Text style={st.myProjectsBtnTxt}>My Projects</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  return (
    <View style={st.root}>
      {loading ? (
        <>
          {renderListHeader()}
          <View style={st.center}>
            <ActivityIndicator size="large" color={ORANGE} />
          </View>
        </>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ORANGE]} tintColor={ORANGE} />}
          ListEmptyComponent={(
            <View style={st.empty}>
              <Ionicons name="hammer-outline" size={36} color="#ddd" />
              <Text style={st.emptyTxt}>
                {tab === 'sent'
                  ? "You haven't sent any hire requests yet."
                  : "No one has sent you a hire request yet."}
              </Text>
              {tab === 'sent' && (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <TouchableOpacity style={st.emptyBtn} onPress={() => nav.navigate('Labour', { forceBrowse: true })}>
                    <Text style={st.emptyBtnTxt}>Browse workers</Text>
                  </TouchableOpacity>
                  {!myProfile && (
                    <TouchableOpacity style={[st.emptyBtn, st.emptyBtnOutline]} onPress={() => nav.navigate('PostProject')}>
                      <Text style={[st.emptyBtnTxt, st.emptyBtnOutlineTxt]}>Post a Project</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* ── Rate worker modal ── */}
      {rateTarget && (
        <View style={st.modalOverlay}>
          <View style={st.modalBox}>
            <Ionicons name="star" size={36} color="#f59e0b" style={{ alignSelf: 'center', marginBottom: 8 }} />
            <Text style={st.modalTitle}>Rate {rateTarget.labour_name || 'this worker'}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 16 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRateStars(star)}>
                  <Ionicons
                    name={star <= rateStars ? 'star' : 'star-outline'}
                    size={34}
                    color={star <= rateStars ? '#f59e0b' : '#ddd'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={st.textArea}
              placeholder="Leave a comment (optional)"
              placeholderTextColor="#bbb"
              value={rateComment}
              onChangeText={setRateComment}
              multiline
            />
            <TouchableOpacity
              style={[st.modalPrimaryBtn, { backgroundColor: rateStars ? '#f59e0b' : '#e5e7eb' }]}
              onPress={submitRating}
              disabled={!rateStars || submittingRating}
            >
              <Text style={[st.modalPrimaryBtnTxt, !rateStars && { color: '#9ca3af' }]}>
                {submittingRating ? 'Submitting…' : 'Submit rating'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.modalCancelBtn} onPress={() => setRateTarget(null)}>
              <Text style={st.modalCancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  rewardsToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 4,
  },
  rewardsToggleTxt: { flex: 1, fontSize: 13.5, fontWeight: '700', color: MUTED },
  root: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  dashWrap: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 6, gap: 12 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginTop: 10, padding: 10,
    backgroundColor: '#fee2e2', borderRadius: 12, borderWidth: 1, borderColor: '#fecaca',
  },
  errorBannerTxt: { flex: 1, fontSize: 12.5, color: '#b91c1c', fontWeight: '600' },
  errorBannerBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#b91c1c' },
  errorBannerBtnTxt: { fontSize: 11.5, fontWeight: '800', color: '#fff' },

  hero: {
    borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  heroAvatarFallback: {
    width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
  },
  heroInitials: { fontSize: 18, fontWeight: '800', color: '#fff' },
  heroName: { fontSize: 17, fontWeight: '900', color: '#fff' },
  heroBadgeRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  heroSkillPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 100,
    paddingHorizontal: 9, paddingVertical: 3.5,
  },
  heroSkillTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },
  heroEditBtn: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  heroSosBtn: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(220,38,38,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
    marginRight: 8,
  },

  heroStatsRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 14, paddingVertical: 10,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 15, fontWeight: '900', color: '#fff' },
  heroStatLabel: { fontSize: 10.5, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  heroStatDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.25)' },

  heroTeamComp: { fontSize: 10.5, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 4 },
  heroPerPersonTxt: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 8, textAlign: 'center' },
  heroViewProfileRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12,
  },
  heroViewProfileTxt: { fontSize: 11.5, color: 'rgba(255,255,255,0.9)', fontWeight: '700' },

  statusCard: {
    backgroundColor: SURFACE, borderRadius: 18, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 4,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  statusIconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: 13.5, fontWeight: '800', color: TEXT },
  statusSub: { fontSize: 11.5, color: MUTED, fontWeight: '500', marginTop: 1 },
  statusDivider: { height: 1, backgroundColor: BORDER },

  checkinBtn: {
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 9,
    backgroundColor: LABOUR + '15', borderWidth: 1, borderColor: LABOUR + '33',
  },
  checkinBtnActive: { backgroundColor: LABOUR, borderColor: LABOUR },
  checkinBtnTxt: { fontSize: 12, fontWeight: '800', color: LABOUR },
  checkinBtnTxtActive: { color: '#fff' },

  tabBar: {
    flexDirection: 'row', backgroundColor: SURFACE,
    borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10,
  },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 4, marginRight: 22, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: ORANGE },
  tabTxt: { fontSize: 14, fontWeight: '700', color: MUTED },
  tabTxtActive: { color: ORANGE },
  myProjectsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginLeft: 'auto', marginBottom: 8, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 100, backgroundColor: '#fff7f0', borderWidth: 1, borderColor: '#fed7aa',
  },
  myProjectsBtnTxt: { fontSize: 12, fontWeight: '700', color: ORANGE },

  card: {
    backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 14, marginBottom: 12, marginHorizontal: 14,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: TEXT },
  cardMeta: { fontSize: 12, color: MUTED, fontWeight: '600', marginTop: 2, textTransform: 'capitalize' },
  desc: { fontSize: 13, color: '#444', marginTop: 8, lineHeight: 18 },

  metaRow: { flexDirection: 'row', gap: 14, marginTop: 10, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { fontSize: 12, color: MUTED, fontWeight: '600' },


  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10,
  },
  actionBtnGhost: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e8e8e8' },
  actionBtnGhostTxt: { fontSize: 13, fontWeight: '700', color: '#666' },
  actionBtnPrimary: { backgroundColor: LABOUR },
  actionBtnPrimaryTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
  actionBtnRate: { backgroundColor: '#f59e0b' },

  ratedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 6 },
  ratedTxt: { fontSize: 13, fontWeight: '700', color: '#15803d' },

  phoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 8,
  },
  phoneRowTxt: { fontSize: 13, fontWeight: '800', color: '#15803d' },

  safetyRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  safetyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER,
  },
  safetyBtnTxt: { fontSize: 12, fontWeight: '700', color: LABOUR },
  sosBtn: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  sosBtnTxt: { color: '#dc2626' },
  manageToggle: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, alignSelf: 'flex-start' },
  manageToggleTxt: { fontSize: 12, fontWeight: '700', color: LABOUR },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyTxt: { fontSize: 13, color: MUTED, fontWeight: '600', textAlign: 'center', paddingHorizontal: 30 },
  emptyBtn: { marginTop: 4, backgroundColor: ORANGE, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  emptyBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  emptyBtnOutline: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: ORANGE },
  emptyBtnOutlineTxt: { color: ORANGE },

  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalBox: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 22 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: TEXT, textAlign: 'center' },
  textArea: {
    backgroundColor: '#fafafa', borderWidth: 1.5, borderColor: '#ebebeb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#111', minHeight: 70, textAlignVertical: 'top',
  },
  modalPrimaryBtn: { marginTop: 14, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  modalPrimaryBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  modalCancelBtn: { marginTop: 10, alignItems: 'center', paddingVertical: 6 },
  modalCancelTxt: { color: '#999', fontWeight: '700', fontSize: 13 },
});
