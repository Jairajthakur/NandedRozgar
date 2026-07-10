/**
 * LabourUI.js — shared building blocks for the four Labour screens
 * (LabourScreen, LabourDetailScreen, PostLabourProfileScreen, HireRequestsScreen).
 *
 * These exist so the same visual pattern — a numbered form step, a status
 * pill, a section card — looks and behaves identically no matter which
 * Labour screen it's used on, instead of every screen reinventing its own
 * version of the same thing.
 *
 * Place at: src/components/labour/LabourUI.js
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LABOUR_COLORS, SPACING, RADIUS, STATUS_META, HIRE_FLOW_STEPS } from '../../constants/labourTheme';

// ── SectionCard ──────────────────────────────────────────────────────────────
// The one white-card-with-border-and-shadow wrapper every screen should use
// instead of redeclaring `card: { backgroundColor: '#fff', borderRadius: 16, ... }`.
export function SectionCard({ children, style }) {
  return <View style={[st.card, style]}>{children}</View>;
}

// ── StepHeader ───────────────────────────────────────────────────────────────
// A numbered circle + title + optional subtitle, marking one step of a
// multi-step form (e.g. PostLabourProfileScreen) so a long form reads as a
// clear, ordered sequence instead of one flat wall of fields.
export function StepHeader({ number, title, subtitle, icon }) {
  return (
    <View style={st.stepHeaderRow}>
      <View style={st.stepCircle}>
        {icon
          ? <Ionicons name={icon} size={14} color="#fff" />
          : <Text style={st.stepCircleTxt}>{number}</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.stepTitle}>{title}</Text>
        {!!subtitle && <Text style={st.stepSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

// ── Badge ────────────────────────────────────────────────────────────────────
// Generic small pill with an icon + label. `tone` picks a preset color pair
// so callers don't hand-roll bg/fg combinations.
const TONE_MAP = {
  primary: { bg: '#fff7f0', fg: LABOUR_COLORS.primary },
  worker:  { bg: '#fef3e2', fg: LABOUR_COLORS.worker },
  team:    { bg: '#f5f3ff', fg: LABOUR_COLORS.team },
  success: { bg: LABOUR_COLORS.successBg, fg: LABOUR_COLORS.success },
  warning: { bg: LABOUR_COLORS.warningBg, fg: LABOUR_COLORS.warning },
  info:    { bg: LABOUR_COLORS.infoBg, fg: LABOUR_COLORS.info },
  neutral: { bg: '#f3f4f6', fg: '#666' },
};

export function Badge({ icon, label, tone = 'neutral', solid = false }) {
  const t = TONE_MAP[tone] || TONE_MAP.neutral;
  const bg = solid ? t.fg : t.bg;
  const fg = solid ? '#fff' : t.fg;
  return (
    <View style={[st.badge, { backgroundColor: bg }]}>
      {!!icon && <Ionicons name={icon} size={11} color={fg} />}
      <Text style={[st.badgeTxt, { color: fg }]}>{label}</Text>
    </View>
  );
}

// ── StatusPill ───────────────────────────────────────────────────────────────
// Renders a hire-request status (pending / accepted / declined / completed /
// cancelled) using the single STATUS_META table in labourTheme.js.
export function StatusPill({ status, size = 'md' }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const small = size === 'sm';
  return (
    <View style={[st.statusPill, { backgroundColor: meta.bg }, small && st.statusPillSm]}>
      <Ionicons name={meta.icon} size={small ? 10 : 12} color={meta.fg} />
      <Text style={[st.statusPillTxt, { color: meta.fg }, small && { fontSize: 10 }]}>{meta.label}</Text>
    </View>
  );
}

// ── HireFlowSteps ────────────────────────────────────────────────────────────
// Horizontal 3-stage indicator (Unlock contact → Send request → Track status)
// so a contractor always knows where they are in the hire journey, and so
// that journey reads identically on the detail page as it does implicitly
// on the hire-requests list.
export function HireFlowSteps({ activeKey }) {
  const activeIdx = HIRE_FLOW_STEPS.findIndex(s => s.key === activeKey);
  return (
    <View style={st.flowRow}>
      {HIRE_FLOW_STEPS.map((step, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        const stateColor = done || active ? LABOUR_COLORS.primary : '#d4d4d8';
        return (
          <React.Fragment key={step.key}>
            <View style={st.flowStep}>
              <View style={[
                st.flowDot,
                { borderColor: stateColor, backgroundColor: done ? LABOUR_COLORS.primary : '#fff' },
              ]}>
                {done
                  ? <Ionicons name="checkmark" size={12} color="#fff" />
                  : <Ionicons name={step.icon} size={12} color={active ? LABOUR_COLORS.primary : '#b5b5bd'} />}
              </View>
              <Text style={[st.flowLabel, (done || active) && st.flowLabelActive]} numberOfLines={1}>
                {step.label}
              </Text>
            </View>
            {i < HIRE_FLOW_STEPS.length - 1 && (
              <View style={[st.flowLine, { backgroundColor: i < activeIdx ? LABOUR_COLORS.primary : '#e4e4e7' }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ── SectionTitle ─────────────────────────────────────────────────────────────
// The small uppercase eyebrow used above card content (e.g. "WAGE", "ABOUT").
export function SectionTitle({ children, style }) {
  return <Text style={[st.sectionTitle, style]}>{children}</Text>;
}

const st = StyleSheet.create({
  card: {
    backgroundColor: LABOUR_COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: LABOUR_COLORS.border,
    padding: SPACING.lg, marginBottom: SPACING.md,
  },

  stepHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: LABOUR_COLORS.primary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepCircleTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
  stepTitle: { fontSize: 15, fontWeight: '800', color: LABOUR_COLORS.text },
  stepSubtitle: { fontSize: 12, color: LABOUR_COLORS.textFaint, fontWeight: '500', marginTop: 1 },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    borderRadius: RADIUS.sm, paddingVertical: 4, paddingHorizontal: 9,
  },
  badgeTxt: { fontSize: 11, fontWeight: '700' },

  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    borderRadius: RADIUS.pill, paddingVertical: 5, paddingHorizontal: 10,
  },
  statusPillSm: { paddingVertical: 3, paddingHorizontal: 8 },
  statusPillTxt: { fontSize: 11.5, fontWeight: '800' },

  flowRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: SPACING.sm },
  flowStep: { alignItems: 'center', width: 78 },
  flowDot: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginBottom: 5,
  },
  flowLabel: { fontSize: 10, fontWeight: '600', color: '#b5b5bd', textAlign: 'center' },
  flowLabelActive: { color: LABOUR_COLORS.text, fontWeight: '700' },
  flowLine: { flex: 1, height: 1.5, marginTop: 13, marginHorizontal: -6 },

  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: '#999',
    marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.3,
  },
});
