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
  ActivityIndicator, RefreshControl, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import { http } from '../utils/api';

const ORANGE  = '#f97316';
const LABOUR  = '#b45309';
const BG      = '#f4f4f6';
const SURFACE = '#ffffff';
const TEXT    = '#111118';
const MUTED   = '#8e8ea0';
const BORDER  = 'rgba(0,0,0,0.07)';

const STATUS_META = {
  pending:   { label: 'Pending',   bg: '#fef3c7', fg: '#b45309' },
  accepted:  { label: 'Accepted',  bg: '#dbeafe', fg: '#1d4ed8' },
  declined:  { label: 'Declined',  bg: '#fee2e2', fg: '#b91c1c' },
  completed: { label: 'Completed', bg: '#dcfce7', fg: '#15803d' },
  cancelled: { label: 'Cancelled', bg: '#f1f1f4', fg: '#71717a' },
};

function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return (
    <View style={[st.pill, { backgroundColor: meta.bg }]}>
      <Text style={[st.pillTxt, { color: meta.fg }]}>{meta.label}</Text>
    </View>
  );
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

  // Rating modal
  const [rateTarget, setRateTarget]   = useState(null); // the hire request being rated
  const [rateStars, setRateStars]     = useState(0);
  const [rateComment, setRateComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const load = useCallback(async () => {
    const [sentRes, receivedRes] = await Promise.all([
      http('GET', '/api/labour/hire-requests/sent'),
      http('GET', '/api/labour/hire-requests/received'),
    ]);
    if (sentRes?.ok) setSent(sentRes.hireRequests || []);
    if (receivedRes?.ok) setReceived(receivedRes.hireRequests || []);
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

  return (
    <View style={st.root}>
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
                <TouchableOpacity style={st.emptyBtn} onPress={() => nav.navigate('Labour')}>
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

  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  pillTxt: { fontSize: 11, fontWeight: '800' },

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
