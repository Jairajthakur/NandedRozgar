/**
 * WalletScreen.js — the one place in the app a user can proactively add
 * money to their in-app wallet. Before this screen, top-up only existed
 * reactively inside LabourDetailScreen's unlock flow (insufficient-balance
 * prompt) — there was no way to top up ahead of time or see wallet history.
 *
 * Reuses the same Cashfree top-up hook and endpoints as that reactive flow:
 *   GET  /api/payments/wallet/balance
 *   GET  /api/payments/wallet/transactions
 *   POST /api/payments/wallet/topup/order   (via useRazorpayCheckout)
 *   POST /api/payments/wallet/topup/verify
 *
 * Entry point: Profile → My Wallet (nav.navigate('Wallet')).
 *
 * Place at: src/screens/WalletScreen.js
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import { http } from '../utils/api';
import { useRazorpayCheckout } from '../utils/cashfree';

const ORANGE  = '#f97316';
const BG      = '#f4f4f6';
const SURFACE = '#ffffff';
const TEXT    = '#111118';
const MUTED   = '#8e8ea0';
const BORDER  = 'rgba(0,0,0,0.07)';
const GREEN   = '#16a34a';
const RED     = '#dc2626';

const QUICK_AMOUNTS = [20, 50, 100, 200];

const REASON_LABELS = {
  wallet_topup:            'Wallet top-up',
  labour_contact_unlock:   'Unlocked a contact',
  labour_hire_fee:         'Hire fee',
};

function formatDateTime(d) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  } catch {
    return null;
  }
}

export default function WalletScreen() {
  const route = useRoute();
  const suggestedAmount = route.params?.suggestedAmount;
  const { RazorpayCheckout, initiatePayment } = useRazorpayCheckout({ http });

  const [balance, setBalance]         = useState(null);
  const [transactions, setTxns]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState(null);

  const [customAmount, setCustomAmount] = useState(suggestedAmount ? String(suggestedAmount) : '');
  const [toppingUp, setToppingUp]       = useState(false);

  const load = useCallback(async () => {
    const [balRes, txnRes] = await Promise.all([
      http('GET', '/api/payments/wallet/balance'),
      http('GET', '/api/payments/wallet/transactions'),
    ]);
    if (balRes?.ok) setBalance(balRes.balance);
    if (txnRes?.ok) setTxns(txnRes.transactions || []);
    setError(!balRes?.ok ? (balRes?.error || 'Could not load your wallet right now.') : null);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const topUp = async (amount) => {
    if (!amount || amount < 20) {
      Toast.show({ type: 'error', text1: 'Minimum top-up is ₹20' });
      return;
    }
    setToppingUp(true);
    const payResult = await initiatePayment({
      description:   `Wallet top-up — ₹${amount}`,
      orderEndpoint: '/api/payments/wallet/topup/order',
      orderBody:     { amount },
    });
    if (!payResult.success) {
      setToppingUp(false);
      if (!payResult.cancelled) {
        Toast.show({ type: 'error', text1: 'Top-up failed', text2: payResult.error || 'Please try again.' });
      }
      return;
    }
    const verifyRes = await http('POST', '/api/payments/wallet/topup/verify', {
      cashfree_order_id: payResult.cashfree_order_id,
    });
    setToppingUp(false);
    if (verifyRes?.ok) {
      setBalance(verifyRes.balance);
      setCustomAmount('');
      Toast.show({ type: 'success', text1: 'Wallet topped up!', text2: `₹${verifyRes.credited} added.` });
      load(); // refresh transaction history
    } else {
      Toast.show({ type: 'error', text1: 'Could not verify top-up', text2: verifyRes?.error || 'Please contact support.' });
    }
  };

  if (loading) {
    return (
      <View style={st.center}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {RazorpayCheckout}
      <ScrollView
        style={st.root}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ORANGE]} />}
      >
        {!!error && (
          <View style={st.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#b91c1c" />
            <Text style={st.errorBannerTxt}>{error}</Text>
          </View>
        )}

        {/* ── Balance card ─────────────────────────────────────────────── */}
        <LinearGradient colors={[ORANGE, '#c2410c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.hero}>
          <Text style={st.heroLabel}>Wallet balance</Text>
          <Text style={st.heroAmount}>₹{(balance ?? 0).toFixed(2)}</Text>
          <Text style={st.heroNote}>Used to unlock worker contacts & pay hire fees.</Text>
        </LinearGradient>

        {!!suggestedAmount && (
          <View style={st.suggestBanner}>
            <Ionicons name="information-circle" size={16} color="#1d4ed8" />
            <Text style={st.suggestBannerTxt}>Add ₹{suggestedAmount} to have enough for what you were about to pay for.</Text>
          </View>
        )}

        {/* ── Add money ────────────────────────────────────────────────── */}
        <View style={st.card}>
          <Text style={st.cardTitle}>Add money</Text>
          <View style={st.quickRow}>
            {QUICK_AMOUNTS.map(amt => (
              <TouchableOpacity
                key={amt}
                style={st.quickBtn}
                disabled={toppingUp}
                onPress={() => topUp(amt)}
              >
                <Text style={st.quickBtnTxt}>₹{amt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={st.customRow}>
            <TextInput
              style={st.customInput}
              value={customAmount}
              onChangeText={t => setCustomAmount(t.replace(/[^0-9]/g, ''))}
              placeholder="Custom amount"
              placeholderTextColor={MUTED}
              keyboardType="number-pad"
            />
            <TouchableOpacity
              style={[st.customBtn, (!customAmount || toppingUp) && st.customBtnDisabled]}
              disabled={!customAmount || toppingUp}
              onPress={() => topUp(parseInt(customAmount))}
            >
              {toppingUp ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.customBtnTxt}>Add</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Transaction history ─────────────────────────────────────── */}
        <View style={st.card}>
          <Text style={st.cardTitle}>Recent activity</Text>
          {transactions.length === 0 ? (
            <Text style={st.emptyInlineTxt}>No transactions yet.</Text>
          ) : (
            transactions.map(txn => {
              const isCredit = txn.type === 'credit';
              return (
                <View key={txn.id} style={st.rowItem}>
                  <View style={[st.txnIconWrap, { backgroundColor: isCredit ? '#f0fdf4' : '#fef2f2' }]}>
                    <Ionicons
                      name={isCredit ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
                      size={18}
                      color={isCredit ? GREEN : RED}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={st.rowTitle}>{REASON_LABELS[txn.reason] || txn.reason || (isCredit ? 'Credit' : 'Debit')}</Text>
                    <Text style={st.rowMeta}>{formatDateTime(txn.created_at)}</Text>
                  </View>
                  <Text style={[st.rowAmount, { color: isCredit ? GREEN : RED }]}>
                    {isCredit ? '+' : '-'}₹{parseFloat(txn.amount).toFixed(2)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 10, padding: 10,
    backgroundColor: '#fee2e2', borderRadius: 12, borderWidth: 1, borderColor: '#fecaca',
  },
  errorBannerTxt: { flex: 1, fontSize: 12.5, color: '#b91c1c', fontWeight: '600' },

  suggestBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 10, padding: 10,
    backgroundColor: '#eff6ff', borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe',
  },
  suggestBannerTxt: { flex: 1, fontSize: 12.5, color: '#1d4ed8', fontWeight: '600' },

  hero: {
    borderRadius: 20, padding: 18,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
    marginBottom: 12,
  },
  heroLabel: { fontSize: 12.5, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  heroAmount: { fontSize: 32, fontWeight: '900', color: '#fff', marginTop: 4 },
  heroNote: { fontSize: 11.5, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 10 },

  card: {
    backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 14, marginBottom: 12,
  },
  cardTitle: { fontSize: 14.5, fontWeight: '800', color: TEXT },

  quickRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  quickBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
    backgroundColor: ORANGE + '15', borderWidth: 1, borderColor: ORANGE + '33',
  },
  quickBtnTxt: { fontSize: 14, fontWeight: '800', color: ORANGE },

  customRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  customInput: {
    flex: 1, backgroundColor: '#fafafa', borderWidth: 1.5, borderColor: '#ebebeb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#111',
  },
  customBtn: { backgroundColor: ORANGE, borderRadius: 12, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  customBtnDisabled: { backgroundColor: '#d1d5db' },
  customBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },

  rowItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: BORDER, marginTop: 4,
  },
  txnIconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 13.5, fontWeight: '700', color: TEXT },
  rowMeta: { fontSize: 11.5, color: MUTED, fontWeight: '600', marginTop: 2 },
  rowAmount: { fontSize: 14, fontWeight: '800' },

  emptyInlineTxt: { fontSize: 12.5, color: MUTED, fontWeight: '600', marginTop: 10, lineHeight: 18 },
});
