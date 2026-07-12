/**
 * CrewManager.js — Group/Crew Team Creator
 *
 * Lets a worker (lead Mistri) create a crew and add regular teammates by
 * their labour profile id, so a contractor can hire the whole crew with one
 * tap instead of hiring each person one at a time.
 *
 * Backend: src/routes/crews.js, mounted at /api/crews.
 * Place at: src/components/labour/CrewManager.js
 *
 * Usage (on a worker's own dashboard):
 *   <CrewManager />
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { http } from '../../utils/api';
import { LABOUR_COLORS as C, SPACING, RADIUS } from '../../constants/labourTheme';

function CrewCard({ crew, onOpen }) {
  return (
    <TouchableOpacity style={st.crewCard} onPress={() => onOpen(crew)}>
      <View style={st.crewIconWrap}>
        <Ionicons name="people" size={18} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.crewName}>{crew.name}</Text>
        <Text style={st.crewSub}>{crew.member_count} member{crew.member_count === 1 ? '' : 's'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.textFaint} />
    </TouchableOpacity>
  );
}

function CrewDetail({ crew, onBack, onChanged }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLabourId, setNewLabourId] = useState('');
  const [newRole, setNewRole] = useState('Helper');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await http('GET', `/api/crews/${crew.id}`);
    if (res.ok) setMembers(res.members || []);
    setLoading(false);
  }, [crew.id]);

  useEffect(() => { load(); }, [load]);

  const addMember = async () => {
    const labourId = parseInt(newLabourId, 10);
    if (!labourId) return Toast.show({ type: 'error', text1: "Enter the teammate's worker profile ID" });
    setAdding(true);
    const res = await http('POST', `/api/crews/${crew.id}/members`, { labourId, roleLabel: newRole });
    setAdding(false);
    if (res.ok) {
      Toast.show({ type: 'success', text1: 'Teammate added to crew' });
      setNewLabourId('');
      load();
      onChanged?.();
    } else {
      Toast.show({ type: 'error', text1: res.error || 'Could not add teammate' });
    }
  };

  const removeMember = async (labourId) => {
    const res = await http('DELETE', `/api/crews/${crew.id}/members/${labourId}`);
    if (res.ok) { load(); onChanged?.(); }
    else Toast.show({ type: 'error', text1: res.error || 'Could not remove teammate' });
  };

  return (
    <View style={{ gap: SPACING.md }}>
      <TouchableOpacity style={st.backRow} onPress={onBack}>
        <Ionicons name="arrow-back" size={16} color={C.text} />
        <Text style={st.backTxt}>All crews</Text>
      </TouchableOpacity>

      <Text style={st.title}>{crew.name}</Text>
      {!!crew.description && <Text style={st.hint}>{crew.description}</Text>}

      {loading ? <ActivityIndicator color={C.primary} /> : (
        <FlatList
          data={members}
          keyExtractor={(m) => String(m.labour_id)}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={st.memberRow}>
              <View style={{ flex: 1 }}>
                <Text style={st.memberName}>{item.full_name}</Text>
                <Text style={st.memberRole}>{item.role_label} · {item.skill_category} · ₹{item.daily_wage}/day</Text>
              </View>
              {item.role_label !== 'Lead Mistri' && (
                <TouchableOpacity onPress={() => removeMember(item.labour_id)} hitSlop={8}>
                  <Ionicons name="close-circle-outline" size={20} color={C.danger} />
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}

      <View style={st.addRow}>
        <TextInput
          style={st.input}
          placeholder="Teammate's worker profile ID"
          keyboardType="number-pad"
          value={newLabourId}
          onChangeText={setNewLabourId}
        />
        <TextInput
          style={[st.input, { flex: 1 }]}
          placeholder="Role (e.g. Helper)"
          value={newRole}
          onChangeText={setNewRole}
        />
        <TouchableOpacity style={st.addBtn} onPress={addMember} disabled={adding}>
          {adding ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="add" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
      <Text style={st.hintSmall}>
        Ask your teammate for their worker profile ID from their "My Profile" screen.
      </Text>
    </View>
  );
}

export default function CrewManager() {
  const [crews, setCrews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [selectedCrew, setSelectedCrew] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await http('GET', '/api/crews/mine');
    if (res.ok) setCrews(res.crews || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createCrew = async () => {
    if (!name.trim()) return Toast.show({ type: 'error', text1: 'Give your crew a name' });
    setCreating(true);
    const res = await http('POST', '/api/crews', { name });
    setCreating(false);
    if (res.ok) {
      Toast.show({ type: 'success', text1: 'Crew created — add your teammates below' });
      setName('');
      load();
    } else {
      Toast.show({ type: 'error', text1: res.error || 'Could not create crew' });
    }
  };

  if (selectedCrew) {
    return <CrewDetail crew={selectedCrew} onBack={() => setSelectedCrew(null)} onChanged={load} />;
  }

  return (
    <View style={{ gap: SPACING.md }}>
      <View style={st.headerRow}>
        <Ionicons name="people-outline" size={16} color={C.team} />
        <Text style={st.title}>Your crews</Text>
      </View>
      <Text style={st.hint}>Bring your regular helpers along — contractors can hire the whole crew in one tap.</Text>

      {loading ? <ActivityIndicator color={C.primary} /> : crews.length === 0 ? (
        <Text style={st.empty}>You haven't created a crew yet.</Text>
      ) : (
        <FlatList
          data={crews}
          keyExtractor={(c) => String(c.id)}
          scrollEnabled={false}
          renderItem={({ item }) => <CrewCard crew={item} onOpen={setSelectedCrew} />}
        />
      )}

      <View style={st.addRow}>
        <TextInput style={[st.input, { flex: 1 }]} placeholder="New crew name (e.g. Ramesh's Plastering Team)" value={name} onChangeText={setName} />
        <TouchableOpacity style={st.addBtn} onPress={createCrew} disabled={creating}>
          {creating ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="add" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 15, fontWeight: '700', color: C.text },
  hint: { fontSize: 12, color: C.textMuted },
  hintSmall: { fontSize: 11, color: C.textFaint },
  empty: { fontSize: 12.5, color: C.textMuted, fontStyle: 'italic' },
  crewCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: C.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  crewIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.team, alignItems: 'center', justifyContent: 'center' },
  crewName: { fontSize: 13.5, fontWeight: '700', color: C.text },
  crewSub: { fontSize: 11.5, color: C.textMuted, marginTop: 2 },
  addRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: 12, fontSize: 13, minWidth: 90 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backTxt: { fontSize: 13, fontWeight: '600', color: C.text },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  memberName: { fontSize: 13, fontWeight: '700', color: C.text },
  memberRole: { fontSize: 11.5, color: C.textMuted, marginTop: 2 },
});
