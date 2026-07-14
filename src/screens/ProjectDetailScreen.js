/**
 * ProjectDetailScreen.js — view a contractor's Project posting and apply.
 *
 * Reads GET /api/projects/:id — the owning contractor gets budget/roster,
 * everyone else (including a worker deciding whether to apply) gets the
 * public view: title, description, wage, duration, slots left.
 *
 * Applying is instant: POST /api/projects/:id/apply hires the worker on the
 * spot (first-come-first-served) and charges the contractor's wallet the
 * hire fee right there — there's no separate accept/review step, so a
 * successful apply here IS a confirmed hire. Handles the known outcomes the
 * route can return: already applied (409), fully staffed (409), and the
 * poster's wallet being too low to accept right now (402).
 *
 * Place at: src/screens/ProjectDetailScreen.js
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { http } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../utils/i18n';
import { LABOUR_COLORS, SPACING, RADIUS, SKILL_ICONS, getSkillGradient } from '../constants/labourTheme';
import { SectionCard, SectionTitle, Badge } from '../components/labour/LabourUI';

const ORANGE = LABOUR_COLORS.primary;

// Skill category values are stored/sent in English; translate only the
// display label shown to the person.
const SKILL_T_KEYS = {
  All: 'skillAll', Mason: 'skillMason', Electrician: 'skillElectrician', Plumber: 'skillPlumber',
  Painter: 'skillPainter', Carpenter: 'skillCarpenter', Welder: 'skillWelder', Helper: 'skillHelper',
};

function formatDate(d) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return null;
  }
}

export default function ProjectDetailScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useLang();
  const { id } = route.params || {};

  const [project, setProject] = useState(null);
  const [spotsLeft, setSpotsLeft] = useState(null);
  const [spotsFilled, setSpotsFilled] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  // Owner-only fields — populated only when the API's `isOwner` flag is true.
  const [isOwnerView, setIsOwnerView] = useState(false);
  const [budget, setBudget] = useState(null);
  const [spend, setSpend] = useState(null);
  const [overBudget, setOverBudget] = useState(false);
  const [roster, setRoster] = useState([]);
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await http('GET', `/api/projects/${id}`);
      if (res?.ok) {
        setProject(res.project);
        setSpotsLeft(res.spotsLeft);
        setSpotsFilled(res.spotsFilled);
        setIsOwnerView(!!res.isOwner);
        if (res.isOwner) {
          setBudget(res.budget);
          setSpend(res.spend);
          setOverBudget(!!res.overBudget);
          setRoster(res.roster || []);
        }
      } else {
        setError(res?.error || t('projNotFound'));
      }
    } catch (e) {
      setError(t('projLoadError'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const apply = async () => {
    if (!user) {
      Toast.show({ type: 'info', text1: t('projLoginRequired'), text2: t('projLoginToApply') });
      nav.navigate('Login');
      return;
    }
    setApplying(true);
    const res = await http('POST', `/api/projects/${id}/apply`);
    setApplying(false);

    if (res?.ok) {
      setApplied(true);
      setSpotsLeft(res.spotsLeft);
      Toast.show({
        type: 'success',
        text1: t('projHiredToastTitle'),
        text2: t('projHiredToastSub'),
      });
      return;
    }

    // Known outcomes from the route: no worker profile yet, already applied,
    // project fully staffed, or the contractor's wallet is too low right now.
    if (res?.status === 400 && /post your own worker profile/i.test(res.error || '')) {
      Toast.show({ type: 'error', text1: t('projPostProfileFirst'), text2: t('projNeedProfile') });
      nav.navigate('PostLabourProfile');
      return;
    }
    if (res?.status === 409) {
      Toast.show({ type: 'error', text1: t('projCouldNotApply'), text2: res.error || t('projNotOpenAnymore') });
      load(); // refresh spots — someone else likely just filled the last slot
      return;
    }
    Toast.show({ type: 'error', text1: t('projCouldNotApply'), text2: res?.error || t('projPleaseTryAgain') });
  };

  // Owner-only: stop accepting new applicants without deleting the posting —
  // existing hires on it are untouched, it just drops off the public list.
  const closeProject = async () => {
    setClosing(true);
    const res = await http('PATCH', `/api/projects/${id}`, { status: 'closed' });
    setClosing(false);
    if (res?.ok) {
      setProject(res.project);
      Toast.show({ type: 'success', text1: t('projClosedToastTitle'), text2: t('projClosedToastSub') });
    } else {
      Toast.show({ type: 'error', text1: t('projCouldNotClose'), text2: res?.error || t('projPleaseTryAgain') });
    }
  };

  if (loading) {
    return (
      <View style={[s.root, s.center, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  if (error || !project) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#111" />
          </TouchableOpacity>
          <Text style={s.topBarTitle}>{t('projDetailTopBarTitle')}</Text>
          <View style={s.backBtn} />
        </View>
        <View style={[s.center, { flex: 1 }]}>
          <Ionicons name="alert-circle-outline" size={40} color="#ddd" />
          <Text style={s.errorTitle}>{error || t('projNotFound')}</Text>
          <TouchableOpacity onPress={load} style={s.retryBtn}>
            <Text style={s.retryTxt}>{t('projRetry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const [gradStart, gradEnd] = getSkillGradient(project.skill_category);
  const isOwner = isOwnerView || user?.id === project.contractor_id;
  const filled = project.status === 'filled' || (spotsLeft != null && spotsLeft <= 0);
  const canApply = !isOwner && !filled && !applied && project.status === 'active';

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.topBar}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#111" />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>{t('projDetailTopBarTitle')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <SectionCard>
          <View style={s.headRow}>
            <View style={[s.iconWrap, { backgroundColor: gradStart + '1a' }]}>
              <Ionicons name={SKILL_ICONS[project.skill_category] || 'briefcase-outline'} size={22} color={gradStart} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.title}>{project.title}</Text>
              <Text style={s.contractor} numberOfLines={1}>
                {t('projPostedBy').replace('{NAME}', project.contractor_name || t('projAContractor'))}
              </Text>
            </View>
          </View>

          <View style={s.chipRow}>
            {!!project.skill_category && (
              <Badge icon="pricetag-outline" label={t(SKILL_T_KEYS[project.skill_category]) || project.skill_category} tone="worker" />
            )}
            {(project.location || project.district) && (
              <Badge icon="location-outline" label={project.location || project.district} tone="neutral" />
            )}
          </View>
        </SectionCard>

        <SectionCard>
          <SectionTitle>{t('projTheOffer')}</SectionTitle>
          <View style={s.statRow}>
            <View style={s.stat}>
              <Text style={s.statValue}>{project.daily_wage ? `₹${project.daily_wage}` : '—'}</Text>
              <Text style={s.statLabel}>{t('projPerDayLabel')}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text style={s.statValue}>{project.duration_days || '—'}</Text>
              <Text style={s.statLabel}>{project.duration_days === 1 ? t('projDayLabel') : t('projDaysLabel')}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text style={s.statValue}>{project.workers_needed}</Text>
              <Text style={s.statLabel}>{t('projWorkersNeeded')}</Text>
            </View>
          </View>

          <View style={s.slotsBar}>
            <View style={[s.slotsFill, { width: `${Math.min(100, ((spotsFilled || 0) / (project.workers_needed || 1)) * 100)}%` }]} />
          </View>
          <Text style={s.slotsTxt}>
            {filled
              ? t('projFullyStaffed')
              : t(project.workers_needed > 1 ? 'projSpotsOpenPlural' : 'projSpotsOpenSingular')
                  .replace('{LEFT}', spotsLeft).replace('{TOTAL}', project.workers_needed)}
          </Text>
        </SectionCard>

        {!!project.description && (
          <SectionCard>
            <SectionTitle>{t('projDescription')}</SectionTitle>
            <Text style={s.desc}>{project.description}</Text>
          </SectionCard>
        )}

        {isOwner ? (
          <>
            {/* ── Budget vs spend — owner-only, computed live by the backend ── */}
            <SectionCard>
              <SectionTitle>{t('projBudgetSpend')}</SectionTitle>
              <View style={s.statRow}>
                <View style={s.stat}>
                  <Text style={s.statValue}>{budget != null ? `₹${budget}` : '—'}</Text>
                  <Text style={s.statLabel}>{t('projBudget')}</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.stat}>
                  <Text style={[s.statValue, overBudget && { color: LABOUR_COLORS.danger }]}>
                    ₹{Math.round(spend?.totalSpent || 0)}
                  </Text>
                  <Text style={s.statLabel}>{t('projSpentSoFar')}</Text>
                </View>
              </View>
              <Text style={s.hint}>
                {t('projFeesWagesHint')
                  .replace('{FEES}', spend?.hireFees || 0)
                  .replace('{WAGES}', Math.round(spend?.wagesPaid || 0))}
              </Text>
              {overBudget && (
                <View style={[s.noteRow, { marginTop: 8 }]}>
                  <Ionicons name="warning-outline" size={16} color={LABOUR_COLORS.danger} />
                  <Text style={[s.noteTxt, { color: LABOUR_COLORS.danger }]}>{t('projOverBudget')}</Text>
                </View>
              )}
            </SectionCard>

            {/* ── Roster — everyone hired under this project ──────────────── */}
            <SectionCard>
              <SectionTitle>{t('projRoster').replace('{COUNT}', roster.length)}</SectionTitle>
              {roster.length === 0 ? (
                <Text style={s.hint}>{t('projNoApplicants')}</Text>
              ) : (
                roster.map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    style={s.rosterRow}
                    onPress={() => nav.navigate('LabourDetail', { id: w.labour_id })}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.rosterName} numberOfLines={1}>{w.full_name}</Text>
                      <Text style={s.rosterMeta}>{w.skill_category}{w.proposed_wage ? ` · ₹${w.proposed_wage}/day` : ''}</Text>
                    </View>
                    <Badge label={w.status} tone={w.status === 'completed' ? 'success' : w.status === 'accepted' ? 'info' : 'neutral'} />
                  </TouchableOpacity>
                ))
              )}
            </SectionCard>
          </>
        ) : (
          <SectionCard>
            <View style={s.noteRow}>
              <Ionicons name="flash-outline" size={16} color={ORANGE} />
              <Text style={s.noteTxt}>{t('projInstantHireNote')}</Text>
            </View>
          </SectionCard>
        )}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {isOwner ? (
          project.status === 'closed' ? (
            <Text style={s.footerNote}>{t('projClosedNote')}</Text>
          ) : (
            <TouchableOpacity
              style={[s.closeBtn, closing && s.applyBtnDisabled]}
              onPress={closeProject}
              disabled={closing}
              activeOpacity={0.85}
            >
              {closing
                ? <ActivityIndicator size="small" color={LABOUR_COLORS.danger} />
                : <Text style={s.closeBtnTxt}>{t('projStopAccepting')}</Text>}
            </TouchableOpacity>
          )
        ) : applied ? (
          <View style={s.appliedBtn}>
            <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
            <Text style={s.appliedTxt}>{t('projHiredOnProject')}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[s.applyBtn, (!canApply || applying) && s.applyBtnDisabled]}
            onPress={apply}
            disabled={!canApply || applying}
            activeOpacity={0.85}
          >
            {applying ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
                <Text style={s.applyBtnTxt}>{filled ? t('projFullyStaffedBtn') : t('projApplyBtn')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e8e8e8',
  },
  topBarTitle: { fontSize: 16, fontWeight: '800', color: '#111' },

  errorTitle: { fontSize: 14, fontWeight: '700', color: '#999' },
  retryBtn: { marginTop: 4, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: ORANGE, borderRadius: 10 },
  retryTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  headRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  iconWrap: {
    width: 48, height: 48, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  title: { fontSize: 17, fontWeight: '800', color: LABOUR_COLORS.text },
  contractor: { fontSize: 12.5, color: LABOUR_COLORS.textMuted, marginTop: 2, fontWeight: '500' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  statRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 17, fontWeight: '800', color: LABOUR_COLORS.text },
  statLabel: { fontSize: 11, color: LABOUR_COLORS.textFaint, fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: LABOUR_COLORS.border },

  slotsBar: { height: 8, borderRadius: 4, backgroundColor: '#f1f1f4', marginTop: SPACING.lg, overflow: 'hidden' },
  slotsFill: { height: 8, borderRadius: 4, backgroundColor: LABOUR_COLORS.success },
  slotsTxt: { fontSize: 12, fontWeight: '600', color: LABOUR_COLORS.textMuted, marginTop: 8, textAlign: 'center' },

  desc: { fontSize: 13.5, color: '#333', lineHeight: 20 },

  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noteTxt: { flex: 1, fontSize: 12.5, color: LABOUR_COLORS.textMuted, lineHeight: 18, fontWeight: '500' },

  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0',
    paddingHorizontal: SPACING.lg, paddingTop: 12,
  },
  applyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: ORANGE, borderRadius: RADIUS.md, paddingVertical: 14,
  },
  applyBtnDisabled: { backgroundColor: '#d4d4d8' },
  applyBtnTxt: { color: '#fff', fontSize: 14.5, fontWeight: '800' },

  appliedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: LABOUR_COLORS.successBg, borderRadius: RADIUS.md, paddingVertical: 14,
    borderWidth: 1, borderColor: LABOUR_COLORS.successBorder,
  },
  appliedTxt: { color: '#15803d', fontSize: 14, fontWeight: '800' },

  footerNote: { textAlign: 'center', fontSize: 12.5, color: LABOUR_COLORS.textFaint, fontWeight: '600', paddingVertical: 10 },

  hint: { fontSize: 11.5, color: LABOUR_COLORS.textFaint, marginTop: 8, lineHeight: 16 },

  rosterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: LABOUR_COLORS.border,
  },
  rosterName: { fontSize: 13.5, fontWeight: '700', color: LABOUR_COLORS.text },
  rosterMeta: { fontSize: 11.5, color: LABOUR_COLORS.textMuted, marginTop: 2, fontWeight: '500' },

  closeBtn: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.md, paddingVertical: 14,
    backgroundColor: LABOUR_COLORS.dangerBg, borderWidth: 1, borderColor: '#fecaca',
  },
  closeBtnTxt: { color: LABOUR_COLORS.danger, fontSize: 14, fontWeight: '800' },
});
