/**
 * ExpenseLog.js — a labourer's digital expense log: tools, transport, meals,
 * materials logged against a date, netted against paid commission so
 * LabourEarningsScreen can show real take-home profit.
 *
 * Backend: src/routes/expenses.js, mounted at /api/expenses.
 * Place at: src/components/labour/ExpenseLog.js
 *
 * Usage: <ExpenseLog /> — drop into LabourEarningsScreen.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, FlatList, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { http } from '../../utils/api';
import { LABOUR_COLORS as C, SPACING, RADIUS } from '../../constants/labourTheme';

const CATEGORIES = [
  { key: 'tools',     label: 'Tools',     icon: 'construct-outline' },
  { key: 'transport',  label: 'Transport', icon: 'bicycle-outline' },
  { key: 'meals',      label: 'Meals',     icon: 'restaurant-outline' },
  { key: 'materials',  label: 'Materials', icon: 'cube-outline' },
  { key: 'other',      label: 'Other',     icon: 'ellipsis-horizontal-circle-outline' },
];

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function ExpenseLog() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState('transport');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await http('GET', '/api/expenses/mine');
    if (res?.ok) setData(res);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addExpense = async () => {
    const amt = parseFloat(amount);
    if (!(amt > 0)) {
      Toast.show({ type: 'error', text1: 'Enter a valid amount' });
      return;
    }
    setSaving(true);
    const res = await http('POST', '/api/expenses', { category, amount: amt, note: note.trim() || undefined });
    setSaving(false);
    if (res?.ok) {
      Toast.show({ type: 'success', text1: 'Expense logged' });
      setModalOpen(false);
      setAmount(''); setNote(''); setCategory('transport');
      load();
    } else {
      Toast.show({ type: 'error', text1: 'Could not log expense', text2: res?.error });
    }
  };

  const removeExpense = async (id) => {
    const res = await http('DELETE', `/api/expenses/${id}`);
    if (res?.ok) load();
  };

  if (loading) return <View style={st.card}><ActivityIndicator color={C.primary} /></View>;

  return (
    <View style={st.card}>
      <View style={st.headerRow}>
        <View style={st.headerLeft}>
          <Ionicons name="receipt-outline" size={16} color={C.primary} />
          <Text style={st.title}>Expense log</Text>
        </View>
        <TouchableOpacity style={st.addBtn} onPress={() => setModalOpen(true)}>
          <Ionicons name="add" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {data && (
        <View style={st.summaryRow}>
          <View style={st.summaryItem}>
            <Text style={st.summaryValue}>₹{data.total.toFixed(0)}</Text>
            <Text style={st.summaryLabel}>Total spent</Text>
          </View>
          <View style={st.summaryDivider} />
          <View style={st.summaryItem}>
            <Text style={[st.summaryValue, { color: data.netEstimate >= 0 ? C.success : C.danger }]}>
              ₹{data.netEstimate.toFixed(0)}
            </Text>
            <Text style={st.summaryLabel}>Net profit so far</Text>
          </View>
        </View>
      )}

      {!data?.expenses?.length ? (
        <Text style={st.empty}>No expenses logged yet. Tap + to add tools, transport, or meal costs.</Text>
      ) : (
        <FlatList
          data={data.expenses.slice(0, 15)}
          keyExtractor={(e) => String(e.id)}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const cat = CATEGORIES.find(c => c.key === item.category) || CATEGORIES[4];
            return (
              <View style={st.row}>
                <View style={st.rowIcon}><Ionicons name={cat.icon} size={14} color={C.worker} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={st.rowLabel}>{cat.label}{item.note ? ` · ${item.note}` : ''}</Text>
                  <Text style={st.rowDate}>{fmtDate(item.expense_date)}</Text>
                </View>
                <Text style={st.rowAmount}>-₹{parseFloat(item.amount).toFixed(0)}</Text>
                <TouchableOpacity onPress={() => removeExpense(item.id)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={14} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView style={st.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={st.modalCard}>
            <Text style={st.modalTitle}>Log an expense</Text>

            <View style={st.catRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[st.catChip, category === c.key && st.catChipActive]}
                  onPress={() => setCategory(c.key)}
                >
                  <Ionicons name={c.icon} size={13} color={category === c.key ? '#fff' : C.text} />
                  <Text style={[st.catChipTxt, category === c.key && { color: '#fff' }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={st.input} value={amount} onChangeText={setAmount}
              placeholder="Amount (₹)" placeholderTextColor={C.textMuted} keyboardType="numeric"
            />
            <TextInput
              style={st.input} value={note} onChangeText={setNote}
              placeholder="Note (optional)" placeholderTextColor={C.textMuted}
            />

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity style={[st.modalBtn, st.modalBtnGhost]} onPress={() => setModalOpen(false)}>
                <Text style={st.modalBtnGhostTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.modalBtn, st.modalBtnPrimary]} onPress={addExpense} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={st.modalBtnPrimaryTxt}>Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.border, padding: SPACING.lg, gap: SPACING.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '800', color: C.text },
  addBtn: { backgroundColor: C.primary, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  summaryRow: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: RADIUS.md, paddingVertical: 10, marginVertical: 4 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 16, fontWeight: '900', color: C.text },
  summaryLabel: { fontSize: 10.5, color: C.textMuted, fontWeight: '600', marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: C.border },
  empty: { fontSize: 12.5, color: C.textMuted, fontStyle: 'italic', paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border },
  rowIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 12.5, fontWeight: '700', color: C.text },
  rowDate: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  rowAmount: { fontSize: 13, fontWeight: '800', color: C.danger },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18 },
  modalTitle: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 10 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: RADIUS.pill, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  catChipActive: { backgroundColor: C.worker, borderColor: C.worker },
  catChipTxt: { fontSize: 11.5, fontWeight: '700', color: C.text },
  input: { backgroundColor: '#fafafa', borderWidth: 1.5, borderColor: '#ebebeb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13.5, color: C.text, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  modalBtnGhost: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  modalBtnGhostTxt: { fontSize: 13, fontWeight: '700', color: C.text },
  modalBtnPrimary: { backgroundColor: C.primary },
  modalBtnPrimaryTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
});
