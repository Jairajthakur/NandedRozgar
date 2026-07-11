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
  ActivityIndicator, RefreshControl, TextInput, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import { http } from '../utils/api';
import { LABOUR_COLORS, STATUS_META, SKILL_ICONS, getSkillGradient } from '../constants/labourTheme';
import { StatusPill } from '../components/labour/LabourUI';

const ORANGE  = LABOUR_COLORS.primary;
const LABOUR  = LABOUR_COLORS.worker;
const BG      = '#f4f4f6';
const SURFACE = LABOUR_COLORS.surface;
const TEXT    = LABOUR_COLORS.text;
const MUTED   = LABOUR_COLORS.textMuted;
const BORDER  = 'rgba(0,0,0,0.07)';

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

  const [myProfile, setMyProfile]       = useState(null);
  const [profileBusy, setProfileBusy]   = useState(false); // availability/check-in in flight

  // Rating modal
  const [rateTarget, setRateTarget]   = useState(null); // the hire request being rated
  const [rateStars, setRateStars]     = useState(0);
  const [rateComment, setRateComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const load = useCallback(async () => {
    const [sentRes, receivedRes, mineRes] = await Promise.all([
      http('GET', '/api/labour/hire-requests/sent'),
      http('GET', '/api/labour/hire-requests/received'),
      http('GET', '/api/labour/mine'),
    ]);
    if (sentRes?.ok) setSent(sentRes.hireRequests || []);
    if (receivedRes?.ok) setReceived(receivedRes.hireRequests || []);
    if (mineRes?.ok) setMyProfile(mineRes.profile || null);
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
    setProfileBusy(true);
    const res = await http('PATCH', `/api/labour/${myProfile.id}/availability`, { availability: next });
    setProfileBusy(false);
    if (res?.ok) {
      setMyProfile(p => ({ ...p, availability: next }));
    } else {
      Toast.show({ type: 'error', text1: 'Could not update availability', text2: res?.error || 'Please try again.' });
    }
  };

  const toggleCheckin = async () => {
    if (!myProfile || profileBusy) return;
    setProfileBusy(true);
    const res = myProfile.checked_in_today
      ? await http('DELETE', `/api/labour/${myProfile.id}/checkin`)
      : await http('POST', `/api/labour/${myProfile.id}/checkin`);
    setProfileBusy(false);
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
        <TouchableOpacity
          style={[st.actionBtn, st.actionBtnPrimary]}
          disabled={busy}
          onPress={() => updateStatus(item, 'completed', 'Mark this work as completed?')}
        >
          {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.actionBtnPrimaryTxt}>Mark completed</Text>}
        </TouchableOpacity>
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
      </View>
    );
  };

  const data = tab === 'sent' ? sent : received;

  const renderDashboardHeader = () => {
    if (!myProfile) return null;
    const [gradStart, gradEnd] = getSkillGradient(myProfile.skill_category);
    const available = myProfile.availability === 'available';
    return (
      <View style={st.dashCard}>
        <View style={st.dashTop}>
          {myProfile.photo_url ? (
            <Image source={{ uri: myProfile.photo_url }} style={st.dashAvatarImg} />
          ) : (
            <LinearGradient colors={[gradStart, gradEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.dashAvatarImg}>
              <Ionicons name={SKILL_ICONS[myProfile.skill_category] || 'person-outline'} size={22} color="#fff" />
            </LinearGradient>
          )}

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.dashName} numberOfLines={1}>{myProfile.full_name}</Text>
            <Text style={st.dashMeta} numberOfLines={1}>
              {myProfile.skill_category}
              {myProfile.daily_wage ? ` · ₹${myProfile.daily_wage}/day` : ''}
            </Text>
            {myProfile.rating_count > 0 && (
              <View style={st.dashRatingRow}>
                <Ionicons name="star" size={12} color="#f59e0b" />
                <Text style={st.dashRatingTxt}>{myProfile.rating_avg} ({myProfile.rating_count})</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={st.dashEditBtn}
            onPress={() => nav.navigate('PostLabourProfile')}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={16} color={LABOUR} />
          </TouchableOpacity>
        </View>

        <View style={st.dashActionsRow}>
          <TouchableOpacity
            style={[st.dashPill, available ? st.dashPillAvailable : st.dashPillBusy]}
            onPress={toggleAvailability}
            disabled={profileBusy}
            activeOpacity={0.85}
          >
            <View style={[st.dashDot, { backgroundColor: available ? '#16a34a' : '#d97706' }]} />
            <Text style={[st.dashPillTxt, { color: available ? '#16a34a' : '#d97706' }]}>
              {available ? 'Available' : 'Busy this week'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.dashPill, myProfile.checked_in_today ? st.dashPillCheckedIn : st.dashPillGhost]}
            onPress={toggleCheckin}
            disabled={profileBusy}
            activeOpacity={0.85}
          >
            {profileBusy
              ? <ActivityIndicator size="small" color={myProfile.checked_in_today ? '#fff' : LABOUR} />
              : (
                <>
                  <Ionicons name="location" size={13} color={myProfile.checked_in_today ? '#fff' : LABOUR} />
                  <Text style={[st.dashPillTxt, { color: myProfile.checked_in_today ? '#fff' : LABOUR }]}>
                    {myProfile.checked_in_today ? 'Checked in today' : 'Check in'}
                  </Text>
                </>
              )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={st.root}>
      {renderDashboardHeader()}

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
      </View>

      {loading ? (
        <View style={st.center}>
          <ActivityIndicator size="large" color={ORANGE} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 14, paddingBottom: 32 }}
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
                <TouchableOpacity style={st.emptyBtn} onPress={() => nav.navigate('Labour', { forceBrowse: true })}>
                  <Text style={st.emptyBtnTxt}>Browse workers</Text>
                </TouchableOpacity>
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
  root: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  dashCard: {
    backgroundColor: SURFACE, margin: 14, marginBottom: 0, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, padding: 14,
  },
  dashTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dashAvatarImg: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  dashName: { fontSize: 15, fontWeight: '800', color: TEXT },
  dashMeta: { fontSize: 12, color: MUTED, fontWeight: '600', marginTop: 2, textTransform: 'capitalize' },
  dashRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  dashRatingTxt: { fontSize: 12, color: '#b45309', fontWeight: '700' },
  dashEditBtn: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: LABOUR + '15', borderWidth: 1, borderColor: LABOUR + '33',
  },

  dashActionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  dashPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: 10, borderWidth: 1.5,
  },
  dashDot: { width: 7, height: 7, borderRadius: 3.5 },
  dashPillTxt: { fontSize: 12.5, fontWeight: '800' },
  dashPillAvailable: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  dashPillBusy: { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
  dashPillGhost: { backgroundColor: LABOUR + '10', borderColor: LABOUR + '33' },
  dashPillCheckedIn: { backgroundColor: LABOUR, borderColor: LABOUR },

  tabBar: {
    flexDirection: 'row', backgroundColor: SURFACE,
    borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 14, paddingTop: 10,
  },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 4, marginRight: 22, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: ORANGE },
  tabTxt: { fontSize: 14, fontWeight: '700', color: MUTED },
  tabTxtActive: { color: ORANGE },

  card: {
    backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 14, marginBottom: 12,
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

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyTxt: { fontSize: 13, color: MUTED, fontWeight: '600', textAlign: 'center', paddingHorizontal: 30 },
  emptyBtn: { marginTop: 4, backgroundColor: ORANGE, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  emptyBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },

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
