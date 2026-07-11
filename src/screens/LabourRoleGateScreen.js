/**
 * LabourRoleGateScreen.js — first-time gate for the Labour tab.
 *
 * Asks a simple question: "I Want to Hire" (contractor/customer) or
 * "I Want to Find Work" (labourer). The choice is saved permanently to
 * users.labour_role via AuthContext.setLabourRole, so this screen only
 * shows once per account — LabourEntryScreen routes straight past it on
 * every future tap of the Labour tab. It can be reopened any time from
 * Profile > Switch mode.
 *
 * Place at: src/screens/LabourRoleGateScreen.js
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { LABOUR_COLORS } from '../constants/labourTheme';

const ORANGE = LABOUR_COLORS.primary;

const OPTIONS = [
  {
    role: 'hirer',
    icon: 'search-outline',
    color: ORANGE,
    title: 'I Want to Hire',
    sub: 'Find masons, electricians, plumbers and more near you, and hire them directly.',
  },
  {
    role: 'worker',
    icon: 'hammer-outline',
    color: LABOUR_COLORS.worker,
    title: 'I Want to Find Work',
    sub: 'List your skills so contractors and families nearby can find and hire you.',
  },
];

export default function LabourRoleGateScreen({ onChoose }) {
  const { setLabourRole } = useAuth();
  const [saving, setSaving] = useState(null); // which role is currently saving

  async function choose(role) {
    if (saving) return;
    setSaving(role);
    try {
      const r = await setLabourRole(role);
      if (r?.ok) {
        onChoose?.(role);
      } else {
        Toast.show({ type: 'error', text1: 'Could not save your choice', text2: r?.error || 'Please try again.' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Network error', text2: 'Please check your connection and try again.' });
    } finally {
      setSaving(null);
    }
  }

  return (
    <View style={g.root}>
      <View style={g.header}>
        <Text style={g.title}>Welcome to Labour</Text>
        <Text style={g.sub}>Tell us why you're here — you can switch this later from Settings.</Text>
      </View>

      <View style={g.cards}>
        {OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.role}
            style={g.card}
            activeOpacity={0.85}
            disabled={!!saving}
            onPress={() => choose(opt.role)}
          >
            <View style={[g.iconBox, { backgroundColor: opt.color + '18' }]}>
              {saving === opt.role
                ? <ActivityIndicator color={opt.color} />
                : <Ionicons name={opt.icon} size={30} color={opt.color} />}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={g.cardTitle}>{opt.title}</Text>
              <Text style={g.cardSub}>{opt.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#c4c4cc" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const g = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 40 },
  header: { marginBottom: 28 },
  title: { fontSize: 24, fontWeight: '900', color: '#111', marginBottom: 8 },
  sub: { fontSize: 14, color: '#888', lineHeight: 20 },
  cards: { gap: 14 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: '#ececec', borderRadius: 16, padding: 16,
  },
  iconBox: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 4 },
  cardSub: { fontSize: 12.5, color: '#888', lineHeight: 17 },
});
