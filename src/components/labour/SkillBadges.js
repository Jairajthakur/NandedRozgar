/**
 * SkillBadges.js — Micro-Skill Verification Badges
 *
 * Shows a worker's verified skill badges (e.g. "Tiling ✓ verified"), earned
 * once 3 distinct contractors have endorsed the same named skill. Also
 * renders a small "endorse a skill" form for a contractor viewing a
 * completed hire, so they can vouch for what the worker was actually good at.
 *
 * Backend: src/routes/labour.js — POST /:id/endorse-skill, GET /:id/badges
 * Place at: src/components/labour/SkillBadges.js
 *
 * Usage (public profile display):
 *   <SkillBadges labourId={profile.id} />
 *
 * Usage (contractor endorsing after a completed hire):
 *   <SkillBadges labourId={profile.id} hireRequestId={hr.id} canEndorse />
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { http } from '../../utils/api';
import { LABOUR_COLORS as C, SPACING, RADIUS } from '../../constants/labourTheme';

const SUGGESTED_SKILLS = ['Tiling', 'Centering', 'Plastering', 'Painting', 'Electrical', 'Plumbing', 'Carpentry'];

export default function SkillBadges({ labourId, hireRequestId, canEndorse = false }) {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skillName, setSkillName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await http('GET', `/api/labour/${labourId}/badges`);
    if (res.ok) setBadges(res.badges || []);
    setLoading(false);
  }, [labourId]);

  useEffect(() => { if (labourId) load(); }, [labourId, load]);

  const endorse = async (skill) => {
    if (!skill?.trim()) return;
    setSubmitting(true);
    const res = await http('POST', `/api/labour/${labourId}/endorse-skill`, { skillName: skill.trim(), hireRequestId });
    setSubmitting(false);
    if (res.ok) {
      Toast.show({
        type: 'success',
        text1: res.badge.is_verified ? `${skill} is now a verified badge! 🏅` : `Endorsed ${skill}`,
      });
      setSkillName('');
      load();
    } else {
      Toast.show({ type: 'error', text1: res.error || 'Could not endorse this skill' });
    }
  };

  return (
    <View style={{ gap: SPACING.sm }}>
      {loading ? (
        <ActivityIndicator size="small" color={C.primary} />
      ) : badges.length > 0 ? (
        <View style={st.badgeRow}>
          {badges.map((b) => (
            <View key={b.skill_name} style={st.badge}>
              <Ionicons name="ribbon" size={12} color={C.success} />
              <Text style={st.badgeTxt}>{b.skill_name} verified</Text>
            </View>
          ))}
        </View>
      ) : (
        !canEndorse && <Text style={st.empty}>No verified skill badges yet.</Text>
      )}

      {canEndorse && (
        <View style={st.endorseBox}>
          <Text style={st.endorseTitle}>Endorse a skill this worker was great at</Text>
          <View style={st.chipRow}>
            {SUGGESTED_SKILLS.map((s) => (
              <TouchableOpacity key={s} style={st.chip} onPress={() => endorse(s)} disabled={submitting}>
                <Text style={st.chipTxt}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={st.customRow}>
            <TextInput
              style={st.input}
              placeholder="Or type a custom skill"
              value={skillName}
              onChangeText={setSkillName}
            />
            <TouchableOpacity style={st.submitBtn} onPress={() => endorse(skillName)} disabled={submitting}>
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.successBg, borderRadius: RADIUS.pill, paddingVertical: 5, paddingHorizontal: 10,
    borderWidth: 1, borderColor: C.successBorder,
  },
  badgeTxt: { fontSize: 11.5, fontWeight: '700', color: C.success },
  empty: { fontSize: 12, color: C.textMuted, fontStyle: 'italic' },
  endorseBox: {
    backgroundColor: C.bg, borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.sm,
    borderWidth: 1, borderColor: C.border,
  },
  endorseTitle: { fontSize: 12.5, fontWeight: '700', color: C.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: RADIUS.pill, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  chipTxt: { fontSize: 11.5, color: C.text, fontWeight: '600' },
  customRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md, paddingVertical: 8, paddingHorizontal: 10, fontSize: 12.5, backgroundColor: C.surface },
  submitBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.success, alignItems: 'center', justifyContent: 'center' },
});
