/**
 * LabourEarningsScreen.js — a labourer's earnings dashboard: held vs
 * withdrawable commission balance, a ledger of individual ₹5 commissions per
 * completed hire, UPI ID entry (KYC), and a withdraw-to-UPI action.
 *
 * Backed entirely by src/routes/labour.js's /payouts/* endpoints:
 *   GET   /api/labour/payouts/mine      — balances + ledger + withdrawal history
 *   PATCH /api/labour/payouts/upi       — save/update UPI ID
 *   POST  /api/labour/payouts/withdraw  — claim available balance as a withdrawal request
 *
 * Entry point: a teaser row on HireRequestsScreen's dashboard header links
 * here via nav.navigate('LabourEarnings').
 *
 * Place at: src/screens/LabourEarningsScreen.js
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';

import { http, getToken } from '../utils/api';
import { BASE_URL } from '../utils/constants';
import { LABOUR_COLORS } from '../constants/labourTheme';
import ExpenseLog from '../components/labour/ExpenseLog';
import InsuranceToggle from '../components/labour/InsuranceToggle';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const ORANGE  = LABOUR_COLORS.primary;
const LABOUR  = LABOUR_COLORS.worker;
const BG      = '#f4f4f6';
const SURFACE = LABOUR_COLORS.surface;
const TEXT    = LABOUR_COLORS.text;
const MUTED   = LABOUR_COLORS.textMuted;
const BORDER  = 'rgba(0,0,0,0.07)';
const GREEN   = LABOUR_COLORS.success;

const PAYOUT_STATUS_META = {
  pending:   { label: 'Processing', bg: '#fef3c7', fg: '#b45309' },
  available: { label: 'Ready to withdraw', bg: '#dcfce7', fg: '#15803d' },
  requested: { label: 'Withdrawal requested', bg: '#dbeafe', fg: '#1d4ed8' },
  paid:      { label: 'Paid', bg: '#f1f1f4', fg: '#71717a' },
};

const WITHDRAWAL_STATUS_META = {
  requested:  { label: 'Requested', bg: '#dbeafe', fg: '#1d4ed8', icon: 'time-outline' },
  processing: { label: 'Processing', bg: '#fef3c7', fg: '#b45309', icon: 'sync-outline' },
  paid:       { label: 'Paid', bg: '#dcfce7', fg: '#15803d', icon: 'checkmark-circle-outline' },
  rejected:   { label: 'Rejected', bg: '#fee2e2', fg: '#b91c1c', icon: 'close-circle-outline' },
};

function formatDateTime(d) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  } catch {
    return null;
  }
}

function Badge({ meta, label }) {
  if (!meta) return null;
  return (
    <View style={[st.badge, { backgroundColor: meta.bg }]}>
      <Text style={[st.badgeTxt, { color: meta.fg }]}>{label || meta.label}</Text>
    </View>
  );
}

export default function LabourEarningsScreen() {
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);
  const [data, setData]             = useState(null);

  const [editingUpi, setEditingUpi] = useState(false);
  const [upiInput, setUpiInput]     = useState('');
  const [savingUpi, setSavingUpi]   = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  // Expense log is a secondary tool, not part of the daily earnings check —
  // collapsed by default so it doesn't compete with balance/withdraw for
  // attention, but still one tap away for anyone who wants it.
  const [showExpenseLog, setShowExpenseLog] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);

  const load = useCallback(async () => {
    const res = await http('GET', '/api/labour/payouts/mine');
    if (res?.ok) {
      setData(res);
      setUpiInput(res.upiId || '');
      setError(null);
    } else {
      setError(res?.error || 'Could not load your earnings right now.');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const saveUpi = async () => {
    const trimmed = upiInput.trim();
    if (!trimmed) return;
    setSavingUpi(true);
    const res = await http('PATCH', '/api/labour/payouts/upi', { upiId: trimmed });
    setSavingUpi(false);
    if (res?.ok) {
      setData(d => ({ ...d, upiId: res.upiId }));
      setEditingUpi(false);
      Toast.show({ type: 'success', text1: 'UPI ID saved' });
    } else {
      Toast.show({ type: 'error', text1: 'Could not save UPI ID', text2: res?.error || 'Check the ID and try again.' });
    }
  };

  const requestWithdrawal = () => {
    if (!data) return;
    Alert.alert(
      'Withdraw earnings?',
      `₹${data.availableBalance.toFixed(2)} will be sent to ${data.upiId}. This can take a little while to process.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          onPress: async () => {
            setWithdrawing(true);
            const res = await http('POST', '/api/labour/payouts/withdraw');
            setWithdrawing(false);
            if (res?.ok) {
              Toast.show({ type: 'success', text1: 'Withdrawal requested', text2: `₹${res.withdrawal.amount} to ${res.withdrawal.upi_id}` });
              load();
            } else {
              Toast.show({ type: 'error', text1: 'Could not request withdrawal', text2: res?.error || 'Please try again.' });
            }
          },
        },
      ]
    );
  };

  const downloadCertificate = async () => {
    setDownloadingCert(true);
    try {
      const token = await getToken();
      const fileUri = `${FileSystem.cacheDirectory}earnings-certificate.pdf`;
      const result = await FileSystem.downloadAsync(
        `${BASE_URL}/api/labour/payouts/certificate`,
        fileUri,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (result.status !== 200) throw new Error('Server could not generate the certificate');

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: 'Earnings Certificate' });
      } else {
        Toast.show({ type: 'success', text1: 'Certificate downloaded', text2: result.uri });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Could not download certificate', text2: e.message });
    }
    setDownloadingCert(false);
  };

  if (loading) {
    return (
      <View style={st.center}>
        <ActivityIndicator size="large" color={LABOUR} />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={st.center}>
        <Ionicons name="alert-circle-outline" size={40} color={MUTED} />
        <Text style={st.emptyTxt}>{error}</Text>
        <TouchableOpacity style={st.emptyBtn} onPress={load}>
          <Text style={st.emptyBtnTxt}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canWithdraw = data.upiId && data.availableBalance >= data.minWithdrawal;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={st.root}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[LABOUR]} />}
      >
        {/* ── Balance summary ─────────────────────────────────────────── */}
        <LinearGradient colors={[LABOUR, '#92400e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.hero}>
          <Text style={st.heroLabel}>Available to withdraw</Text>
          <Text style={st.heroAmount}>₹{data.availableBalance.toFixed(2)}</Text>

          <View style={st.heroStatsRow}>
            <View style={st.heroStat}>
              <Text style={st.heroStatValue}>₹{data.heldBalance.toFixed(2)}</Text>
              <Text style={st.heroStatLabel}>Processing</Text>
            </View>
            <View style={st.heroStatDivider} />
            <View style={st.heroStat}>
              <Text style={st.heroStatValue}>₹{data.requestedBalance.toFixed(2)}</Text>
              <Text style={st.heroStatLabel}>Withdrawal pending</Text>
            </View>
            <View style={st.heroStatDivider} />
            <View style={st.heroStat}>
              <Text style={st.heroStatValue}>₹{data.lifetimePaid.toFixed(2)}</Text>
              <Text style={st.heroStatLabel}>Lifetime paid</Text>
            </View>
          </View>

          {data.heldBalance > 0 && (
            <Text style={st.heroNote}>
              New commissions become withdrawable {data.holdHours}h after a job is marked completed.
            </Text>
          )}
        </LinearGradient>

        {/* ── UPI / withdraw ───────────────────────────────────────────── */}
        <View style={st.card}>
          <Text style={st.cardTitle}>Payout UPI ID</Text>
          {editingUpi || !data.upiId ? (
            <View style={{ marginTop: 10 }}>
              <TextInput
                style={st.input}
                value={upiInput}
                onChangeText={setUpiInput}
                placeholder="yourname@bank"
                placeholderTextColor={MUTED}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                {!!data.upiId && (
                  <TouchableOpacity style={[st.actionBtn, st.actionBtnGhost, { flex: 1 }]} onPress={() => { setEditingUpi(false); setUpiInput(data.upiId); }}>
                    <Text style={st.actionBtnGhostTxt}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[st.actionBtn, st.actionBtnPrimary, { flex: 1 }]} disabled={savingUpi} onPress={saveUpi}>
                  {savingUpi ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.actionBtnPrimaryTxt}>Save UPI ID</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={st.upiRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                <Text style={st.upiValue}>{data.upiId}</Text>
              </View>
              <TouchableOpacity onPress={() => setEditingUpi(true)}>
                <Text style={st.changeTxt}>Change</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[st.withdrawBtn, !canWithdraw && st.withdrawBtnDisabled]}
            disabled={!canWithdraw || withdrawing}
            onPress={requestWithdrawal}
          >
            {withdrawing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="arrow-down-circle-outline" size={16} color="#fff" />
                <Text style={st.withdrawBtnTxt}>Withdraw ₹{data.availableBalance.toFixed(2)}</Text>
              </>
            )}
          </TouchableOpacity>
          {!canWithdraw && (
            <Text style={st.withdrawHint}>
              {!data.upiId
                ? 'Add a UPI ID to withdraw.'
                : `Minimum withdrawal is ₹${data.minWithdrawal}. You have ₹${data.availableBalance.toFixed(2)} available.`}
            </Text>
          )}
        </View>

        {/* ── Withdrawal history ───────────────────────────────────────── */}
        {data.withdrawals.length > 0 && (
          <View style={st.card}>
            <Text style={st.cardTitle}>Withdrawal history</Text>
            {data.withdrawals.map(w => {
              const meta = WITHDRAWAL_STATUS_META[w.status];
              return (
                <View key={w.id} style={st.rowItem}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={st.rowAmount}>₹{parseFloat(w.amount).toFixed(2)}</Text>
                    <Text style={st.rowMeta}>{formatDateTime(w.requested_at)}</Text>
                    {w.status === 'paid' && !!w.utr_reference && <Text style={st.rowMeta}>UTR: {w.utr_reference}</Text>}
                    {w.status === 'rejected' && !!w.admin_note && <Text style={st.rowMetaWarn}>{w.admin_note}</Text>}
                  </View>
                  <Badge meta={meta} />
                </View>
              );
            })}
          </View>
        )}

        {/* ── Commission ledger ────────────────────────────────────────── */}
        <View style={st.card}>
          <Text style={st.cardTitle}>Recent commissions</Text>
          {data.ledger.length === 0 ? (
            <Text style={st.emptyInlineTxt}>Complete a hire to start earning — you get ₹5 per completed job.</Text>
          ) : (
            data.ledger.map(item => {
              const meta = PAYOUT_STATUS_META[item.status];
              return (
                <View key={item.id} style={st.rowItem}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={st.rowAmount}>+₹{parseFloat(item.amount).toFixed(2)}</Text>
                    <Text style={st.rowMeta} numberOfLines={1}>
                      From {item.contractor_name} · {item.source === 'contact_unlock' ? 'Contact unlock' : 'Hire completed'}
                    </Text>
                    <Text style={st.rowMeta}>{formatDateTime(item.created_at)}</Text>
                  </View>
                  <Badge meta={meta} />
                </View>
              );
            })
          )}
        </View>
        {/* ── Formal earnings certificate ─────────────────────────────── */}
        <TouchableOpacity style={st.certBtn} onPress={downloadCertificate} disabled={downloadingCert}>
          {downloadingCert ? (
            <ActivityIndicator size="small" color={LABOUR} />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={16} color={LABOUR} />
              <Text style={st.certBtnTxt}>Download earnings certificate (PDF)</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={st.certHint}>Use this as income proof for bank loans or government schemes.</Text>

        {/* ── Micro-insurance toggle ───────────────────────────────────── */}
        <View style={{ marginTop: 4 }}>
          <InsuranceToggle />
        </View>

        {/* ── Digital expense log — collapsed by default ─────────────────── */}
        <View style={{ marginTop: 12, marginBottom: 8 }}>
          <TouchableOpacity
            style={st.expenseLogToggle}
            activeOpacity={0.8}
            onPress={() => setShowExpenseLog(v => !v)}
          >
            <Ionicons name="receipt-outline" size={16} color={LABOUR_COLORS.textMuted} />
            <Text style={st.expenseLogToggleTxt}>
              {showExpenseLog ? 'Hide expense log' : 'Track your daily expenses (optional)'}
            </Text>
            <Ionicons name={showExpenseLog ? 'chevron-up' : 'chevron-down'} size={16} color={LABOUR_COLORS.textMuted} />
          </TouchableOpacity>
          {showExpenseLog && <ExpenseLog />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  expenseLogToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 4,
  },
  expenseLogToggleTxt: { flex: 1, fontSize: 13.5, fontWeight: '700', color: LABOUR_COLORS.textMuted },
  root: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: BG },

  hero: {
    borderRadius: 20, padding: 18,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
    marginBottom: 12,
  },
  heroLabel: { fontSize: 12.5, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  heroAmount: { fontSize: 32, fontWeight: '900', color: '#fff', marginTop: 4 },

  heroStatsRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 14, paddingVertical: 10,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 14, fontWeight: '900', color: '#fff' },
  heroStatLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 2, textAlign: 'center' },
  heroStatDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.25)' },
  heroNote: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 12 },

  card: {
    backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 14, marginBottom: 12,
  },
  cardTitle: { fontSize: 14.5, fontWeight: '800', color: TEXT },

  input: {
    backgroundColor: '#fafafa', borderWidth: 1.5, borderColor: '#ebebeb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#111',
  },

  upiRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 10, paddingVertical: 6,
  },
  upiValue: { fontSize: 14, fontWeight: '700', color: TEXT },
  changeTxt: { fontSize: 12.5, fontWeight: '700', color: ORANGE },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10,
  },
  actionBtnGhost: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e8e8e8' },
  actionBtnGhostTxt: { fontSize: 13, fontWeight: '700', color: '#666' },
  actionBtnPrimary: { backgroundColor: LABOUR },
  actionBtnPrimaryTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },

  withdrawBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: GREEN, borderRadius: 12, paddingVertical: 13, marginTop: 14,
  },
  withdrawBtnDisabled: { backgroundColor: '#d1d5db' },
  withdrawBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  withdrawHint: { fontSize: 11.5, color: MUTED, fontWeight: '600', textAlign: 'center', marginTop: 8 },

  rowItem: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: BORDER, marginTop: 4,
  },
  rowAmount: { fontSize: 14, fontWeight: '800', color: TEXT },
  rowMeta: { fontSize: 11.5, color: MUTED, fontWeight: '600', marginTop: 2 },
  rowMetaWarn: { fontSize: 11.5, color: '#b91c1c', fontWeight: '600', marginTop: 2 },

  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 100 },
  badgeTxt: { fontSize: 10.5, fontWeight: '800' },

  emptyTxt: { fontSize: 13, color: MUTED, fontWeight: '600', textAlign: 'center', paddingHorizontal: 30 },
  emptyBtn: { marginTop: 4, backgroundColor: ORANGE, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  emptyBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  emptyInlineTxt: { fontSize: 12.5, color: MUTED, fontWeight: '600', marginTop: 10, lineHeight: 18 },

  certBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    paddingVertical: 13, marginBottom: 4,
  },
  certBtnTxt: { fontSize: 13, fontWeight: '800', color: LABOUR },
  certHint: { fontSize: 11, color: MUTED, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
});
