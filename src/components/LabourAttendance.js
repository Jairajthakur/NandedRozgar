/**
 * LabourAttendance.js — Daily Wage Attendance & Timekeeping
 *
 * A digital muster-roll for one hire_request: the contractor punches a
 * worker in when they show up on site and punches out at day's end, and can
 * see the full day-by-day sheet for that hire. Both sides (contractor and
 * labourer) can view the same sheet; only the contractor can mark it.
 *
 * Backend: src/routes/attendance.js, mounted at /api/attendance.
 * Place at: src/components/LabourAttendance.js
 *
 * Usage:
 *   <LabourAttendance hireRequestId={hr.id} isContractor={hr.contractor_id === user.id} />
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';

import { http } from '../utils/api';
import { LABOUR_COLORS as C, SPACING, RADIUS } from '../constants/labourTheme';

// Best-effort GPS fix — attendance still works without location permission,
// it just won't record a punch coordinate. Never blocks the punch action.
async function tryGetLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

const STATUS_TONE = {
  present:  { color: C.success, icon: 'checkmark-circle', label: 'Present' },
  absent:   { color: C.danger,  icon: 'close-circle',      label: 'Absent' },
  half_day: { color: C.warning, icon: 'time',              label: 'Half Day' },
};

function AttendanceRow({ row }) {
  const tone = STATUS_TONE[row.status] || STATUS_TONE.present;
  const inTime = row.punch_in_at ? new Date(row.punch_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  const outTime = row.punch_out_at ? new Date(row.punch_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <View style={st.row}>
      <View style={{ flex: 1 }}>
        <Text style={st.rowDate}>{new Date(row.work_date).toLocaleDateString([], { day: '2-digit', month: 'short' })}</Text>
        <Text style={st.rowTimes}>In {inTime}  ·  Out {outTime}</Text>
        {!!row.notes && <Text style={st.rowNotes}>{row.notes}</Text>}
      </View>
      <View style={[st.statusPill, { backgroundColor: `${tone.color}18` }]}>
        <Ionicons name={tone.icon} size={12} color={tone.color} />
        <Text style={[st.statusTxt, { color: tone.color }]}>{tone.label}</Text>
      </View>
    </View>
  );
}

export default function LabourAttendance({ hireRequestId, isContractor = false }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // 'in' | 'out' | null
  const [rows, setRows] = useState([]);
  const [todayRow, setTodayRow] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await http('GET', `/api/attendance/hire/${hireRequestId}`);
    if (res.ok) {
      setRows(res.attendance || []);
      const today = new Date().toISOString().slice(0, 10);
      setTodayRow((res.attendance || []).find(r => r.work_date?.slice(0, 10) === today) || null);
    }
    setLoading(false);
  }, [hireRequestId]);

  useEffect(() => { load(); }, [load]);

  const punch = async (direction) => {
    setBusy(direction);
    const coords = await tryGetLocation();
    const res = await http('POST', `/api/attendance/${hireRequestId}/punch-${direction === 'in' ? 'in' : 'out'}`, coords || {});
    setBusy(null);
    if (res.ok) {
      Toast.show({ type: 'success', text1: direction === 'in' ? 'Punched in ✅' : 'Punched out ✅' });
      load();
    } else {
      Toast.show({ type: 'error', text1: res.error || 'Something went wrong' });
    }
  };

  if (loading) {
    return <View style={st.card}><ActivityIndicator color={C.primary} /></View>;
  }

  return (
    <View style={st.card}>
      <View style={st.headerRow}>
        <Ionicons name="calendar-outline" size={16} color={C.primary} />
        <Text style={st.title}>Attendance</Text>
      </View>

      {isContractor && (
        <View style={st.punchRow}>
          <TouchableOpacity
            style={[st.punchBtn, { backgroundColor: C.successBg, borderColor: C.successBorder }]}
            onPress={() => punch('in')}
            disabled={busy !== null}
          >
            {busy === 'in'
              ? <ActivityIndicator size="small" color={C.success} />
              : <Ionicons name="log-in-outline" size={16} color={C.success} />}
            <Text style={[st.punchTxt, { color: C.success }]}>
              {todayRow?.punch_in_at ? 'Punched in' : 'Punch in'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.punchBtn, { backgroundColor: '#fff7f0', borderColor: '#fed7aa' }]}
            onPress={() => punch('out')}
            disabled={busy !== null || !todayRow?.punch_in_at}
          >
            {busy === 'out'
              ? <ActivityIndicator size="small" color={C.primary} />
              : <Ionicons name="log-out-outline" size={16} color={C.primary} />}
            <Text style={[st.punchTxt, { color: C.primary }]}>
              {todayRow?.punch_out_at ? 'Punched out' : 'Punch out'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {rows.length === 0 ? (
        <Text style={st.empty}>No attendance marked yet for this hire.</Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => String(r.id)}
          renderItem={({ item }) => <AttendanceRow row={item} />}
          scrollEnabled={false}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    backgroundColor: C.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.border,
    padding: SPACING.lg, gap: SPACING.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '700', color: C.text },
  punchRow: { flexDirection: 'row', gap: SPACING.sm },
  punchBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1,
  },
  punchTxt: { fontSize: 13, fontWeight: '700' },
  empty: { fontSize: 12.5, color: C.textMuted, fontStyle: 'italic' },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: C.border, gap: SPACING.sm,
  },
  rowDate: { fontSize: 13, fontWeight: '700', color: C.text },
  rowTimes: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  rowNotes: { fontSize: 11.5, color: C.textFaint, marginTop: 2, fontStyle: 'italic' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: RADIUS.pill },
  statusTxt: { fontSize: 11, fontWeight: '700' },
});
